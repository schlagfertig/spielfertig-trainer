// iOS-Cloud-Build: Signatur über den App-Store-Connect-API-Schlüssel.
// Erzeugt pro Lauf ein Verteilungs-Zertifikat + App-Store-Profil.
// Das Zertifikat bleibt bis zum nächsten Lauf: Apple lehnt den Build ab (ITMS-90721),
// wenn es noch während der Verarbeitung widerrufen wird. revoke-old widerruft vorher
// nur ältere CI-Zertifikate (Name oder Subject-CN „Schlagfertig CI“, der CSR dieses Workflows).
// Der Schlüssel kommt nur aus der Umgebung (ASC_KEY_P8, ASC_KEY_ID, ASC_ISSUER_ID) und wird nie ausgegeben.
//
//   node scripts/iosSigning.mjs pem <datei>                    PEM-Datei aus ASC_KEY_P8 schreiben
//   node scripts/iosSigning.mjs revoke-old [ordner]            ältere CI-Zertifikate widerrufen
//   node scripts/iosSigning.mjs create <csr> <ordner> <bundleId>
//   node scripts/iosSigning.mjs cleanup <ordner>               nur das Profil, nicht das Zertifikat
//   node scripts/iosSigning.mjs project <pbxproj> <team> <profil> <version> <build>
//   node scripts/iosSigning.mjs wait <bundleId> <build> [minuten]

import crypto from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CI_CERT_MARK = "Schlagfertig CI";
// Ein kurzer Apple-5xx beim Warten soll den Lauf nicht beenden. Danach bleibt es ein Fehler.
export const WAIT_5XX_RETRIES = 4;
// Build 11: Apple setzt den Zertifikatsnamen auf den Team-Namen, und das Profil wurde am Ende
// schon gelöscht. Diese eine ID ist das dabei liegen gebliebene CI-Zertifikat.
export const ORPHAN_CI_CERT_IDS = ["RMQ8P8T398"];

export function keyPem(raw) {
  const body = String(raw || "")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  if (!body) throw new Error("ASC_KEY_P8 fehlt oder ist leer");
  return `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`;
}

function token() {
  const { ASC_KEY_P8, ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
  if (!ASC_KEY_ID || !ASC_ISSUER_ID) throw new Error("ASC_KEY_ID / ASC_ISSUER_ID fehlen");
  const key = crypto.createPrivateKey(keyPem(ASC_KEY_P8));
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" });
  const body = enc({ iss: ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: "appstoreconnect-v1" });
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${sig.toString("base64url")}`;
}

async function api(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 800)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientHttpStatus(status) {
  const n = Number(status);
  return Number.isInteger(n) && n >= 500 && n <= 599;
}

// retries = zusätzliche Versuche nach dem ersten Fehlschlag.
export async function withTransientRetries(fn, { retries = WAIT_5XX_RETRIES, sleepFn = () => sleep(15000) } = {}) {
  let left = retries;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (!isTransientHttpStatus(e?.status) || left <= 0) throw e;
      left -= 1;
      console.log(`${String(e.message || e).split("\n")[0]} — neuer Versuch (${left} übrig)`);
      await sleepFn();
    }
  }
}

export function subjectCn(certificateContent) {
  if (!certificateContent) return "";
  try {
    const cert = new crypto.X509Certificate(Buffer.from(String(certificateContent), "base64"));
    const line = String(cert.subject || "").split("\n").map((s) => s.trim()).find((s) => s.startsWith("CN="));
    return line ? line.slice(3).trim() : "";
  } catch {
    return "";
  }
}

function textHasCiMark(value) {
  return String(value || "").includes(CI_CERT_MARK);
}

// Nur Apple-Distribution-Zertifikate dieses Workflows. Fremde Zertifikate (anderer Name, anderer CN) bleiben.
export function isCiDistributionCert(cert) {
  const attrs = cert?.attributes || {};
  const type = String(attrs.certificateType || "");
  if (type !== "DISTRIBUTION" && type !== "IOS_DISTRIBUTION") return false;
  if (textHasCiMark(attrs.name) || textHasCiMark(attrs.displayName)) return true;
  return subjectCn(attrs.certificateContent) === CI_CERT_MARK;
}

export function certsToRevoke(certificates, { keepIds = [] } = {}) {
  const keep = new Set(keepIds.filter(Boolean));
  return (certificates || []).filter((c) => c?.id && !keep.has(c.id) && isCiDistributionCert(c));
}

export function isCiProfileName(name) {
  const n = String(name || "");
  return n === CI_CERT_MARK || n.startsWith(`${CI_CERT_MARK} `);
}

// Apple benennt das Zertifikat um („Apple Distribution: …“). Der CI-Marker steht im Profilnamen.
// keepCertIds/keepProfileIds: das Zertifikat, mit dem dieser Lauf signiert (darf nicht weg).
export function olderCiTargets({ profiles = [], certificates = [], keepCertIds = [], keepProfileIds = [] } = {}) {
  const keepCert = new Set(keepCertIds.filter(Boolean));
  const keepProf = new Set(keepProfileIds.filter(Boolean));
  const certIds = new Set(certsToRevoke(certificates, { keepIds: [...keepCert] }).map((c) => c.id));
  const profileIds = [];
  for (const profile of profiles) {
    if (!profile?.id || keepProf.has(profile.id) || !isCiProfileName(profile.attributes?.name)) continue;
    profileIds.push(profile.id);
    for (const cert of profile.relationships?.certificates?.data || []) {
      if (cert?.id && !keepCert.has(cert.id)) certIds.add(cert.id);
    }
  }
  for (const id of ORPHAN_CI_CERT_IDS) {
    if (!keepCert.has(id)) certIds.add(id);
  }
  return { certIds: [...certIds], profileIds };
}

export function cleanupTargets() {
  // Weder Zertifikat noch Profil: das Profil heißt „Schlagfertig CI <Lauf>“ und ist der Marker
  // für den nächsten Lauf. Beides am Ende zu löschen widerruft die Signatur zu früh (ITMS-90721)
  // bzw. macht das Zertifikat danach unauffindbar.
  return [];
}

function keptFromRun(outDir) {
  if (!outDir) return { certIds: [], profileIds: [] };
  const file = join(outDir, "ids.json");
  if (!existsSync(file)) return { certIds: [], profileIds: [] };
  try {
    const ids = JSON.parse(readFileSync(file, "utf8"));
    return {
      certIds: ids.certId ? [ids.certId] : [],
      profileIds: ids.profileId ? [ids.profileId] : [],
    };
  } catch {
    return { certIds: [], profileIds: [] };
  }
}

async function listAll(path) {
  const all = [];
  let next = path;
  for (let i = 0; next && i < 10; i += 1) {
    const page = await api("GET", next);
    all.push(...(page.data || []));
    const link = page.links?.next || "";
    if (link.startsWith("https://api.appstoreconnect.apple.com")) next = link.slice("https://api.appstoreconnect.apple.com".length);
    else if (link.startsWith("/")) next = link;
    else next = "";
  }
  return all;
}

async function profileCertificates(profile) {
  const inline = profile.relationships?.certificates?.data || [];
  if (inline.length) return inline;
  const listed = await api("GET", `/v1/profiles/${profile.id}/certificates`);
  return (listed.data || []).map((cert) => ({ type: cert.type, id: cert.id }));
}

async function revokeOlderCiCerts(outDir) {
  const keep = keptFromRun(outDir);
  const [profiles, certificates] = await Promise.all([
    listAll("/v1/profiles?limit=200"),
    listAll("/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=200"),
  ]);
  const withCerts = [];
  for (const profile of profiles) {
    if (!isCiProfileName(profile.attributes?.name)) {
      withCerts.push(profile);
      continue;
    }
    withCerts.push({
      ...profile,
      relationships: { ...profile.relationships, certificates: { data: await profileCertificates(profile) } },
    });
  }
  const targets = olderCiTargets({
    profiles: withCerts,
    certificates,
    keepCertIds: keep.certIds,
    keepProfileIds: keep.profileIds,
  });
  if (!targets.certIds.length && !targets.profileIds.length) {
    console.log(keep.certIds.length ? "keine älteren CI-Zertifikate (aktuelles bleibt)" : "keine älteren CI-Zertifikate");
    return;
  }
  for (const profileId of targets.profileIds) {
    try {
      await api("DELETE", `/v1/profiles/${profileId}`);
      console.log(`älteres CI-Profil gelöscht: ${profileId}`);
    } catch (e) {
      if (e.status !== 404) throw e;
      console.log(`Profil bereits weg: ${profileId}`);
    }
  }
  for (const certId of targets.certIds) {
    try {
      await api("DELETE", `/v1/certificates/${certId}`);
      console.log(`älteres CI-Zertifikat widerrufen: ${certId}`);
    } catch (e) {
      if (e.status !== 404) throw e;
      console.log(`Zertifikat bereits weg: ${certId}`);
    }
  }
}

async function bundleIdOf(identifier) {
  const r = await api("GET", `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&limit=20`);
  const hit = (r.data || []).find((b) => b.attributes.identifier === identifier);
  if (!hit) throw new Error(`Bundle-ID ${identifier} nicht gefunden`);
  return hit;
}

async function create(csrPath, outDir, identifier) {
  mkdirSync(outDir, { recursive: true });
  // Noch einmal, falls der Workflow-Schritt fehlt: das neue Zertifikat gibt es hier noch nicht.
  await revokeOlderCiCerts(outDir);
  const csr = readFileSync(csrPath, "utf8");
  const cert = await api("POST", "/v1/certificates", {
    data: { type: "certificates", attributes: { certificateType: "DISTRIBUTION", csrContent: csr } },
  });
  const certId = cert.data.id;
  writeFileSync(join(outDir, "ids.json"), JSON.stringify({ certId }));
  writeFileSync(join(outDir, "dist.cer"), Buffer.from(cert.data.attributes.certificateContent, "base64"));
  const bundle = await bundleIdOf(identifier);
  const name = `Schlagfertig CI ${process.env.GITHUB_RUN_ID || Date.now()}`;
  const prof = await api("POST", "/v1/profiles", {
    data: {
      type: "profiles",
      attributes: { name, profileType: "IOS_APP_STORE" },
      relationships: {
        bundleId: { data: { type: "bundleIds", id: bundle.id } },
        certificates: { data: [{ type: "certificates", id: certId }] },
      },
    },
  });
  const { uuid, profileContent } = prof.data.attributes;
  writeFileSync(join(outDir, `${uuid}.mobileprovision`), Buffer.from(profileContent, "base64"));
  const ids = { certId, profileId: prof.data.id, profileName: name, uuid, teamId: bundle.attributes.seedId };
  writeFileSync(join(outDir, "ids.json"), JSON.stringify(ids));
  const issuedName = cert.data.attributes?.name || "?";
  const issuedCn = subjectCn(cert.data.attributes?.certificateContent);
  console.log(`Zertifikat ${certId} (${issuedName}, CN ${issuedCn || "?"}), Profil "${name}" (${uuid}), Team ${ids.teamId}`);
}

async function cleanup(outDir) {
  const file = join(outDir, "ids.json");
  if (!existsSync(file)) return console.log("nichts aufzuräumen");
  const ids = JSON.parse(readFileSync(file, "utf8"));
  for (const target of cleanupTargets(ids)) {
    try { await api("DELETE", `/v1/${target.kind}/${target.id}`); console.log(`gelöscht: ${target.kind}/${target.id}`); }
    catch (e) { console.log(`Aufräumen ${target.kind}/${target.id}: ${e.message}`); }
  }
  if (ids.certId) console.log(`Zertifikat bleibt bis zum nächsten Lauf: ${ids.certId}`);
  if (ids.profileId) console.log(`Profil bleibt bis zum nächsten Lauf: ${ids.profileId} (${ids.profileName || ""})`);
}

// Nur das App-Ziel (Blöcke mit der Bundle-ID) auf manuelle Signatur stellen; Pods bleiben unberührt.
export function patchProject(text, { team, profile, version, build, bundleId = "de.schlagfertig.app" }) {
  let hits = 0;
  const out = String(text).replace(/buildSettings = \{[\s\S]*?\n\t\t\t\};/g, (block) => {
    if (!block.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};`)) return block;
    hits += 1;
    const b = block
      .replace(/\n\s*(CODE_SIGN_STYLE|DEVELOPMENT_TEAM|PROVISIONING_PROFILE_SPECIFIER|"CODE_SIGN_IDENTITY\[sdk=iphoneos\*\]"|CODE_SIGN_IDENTITY) = [^;]*;/g, "")
      .replace(/CURRENT_PROJECT_VERSION = [^;]*;/, `CURRENT_PROJECT_VERSION = ${build};`)
      .replace(/MARKETING_VERSION = [^;]*;/, `MARKETING_VERSION = ${version};`);
    return b.replace(/buildSettings = \{/, `buildSettings = {\n\t\t\t\tCODE_SIGN_STYLE = Manual;\n\t\t\t\tDEVELOPMENT_TEAM = ${team};\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${profile}";`);
  });
  if (!hits) throw new Error("App-Ziel im Xcode-Projekt nicht gefunden");
  return out;
}

async function waitBuild(identifier, build, minutes = 30) {
  const apps = await withTransientRetries(() => api("GET", `/v1/apps?filter[bundleId]=${encodeURIComponent(identifier)}`));
  const app = apps.data[0];
  if (!app) throw new Error(`App ${identifier} nicht gefunden`);
  const end = Date.now() + minutes * 60000;
  const buildsPath = `/v1/builds?filter[app]=${app.id}&filter[version]=${build}&fields[builds]=version,processingState,uploadedDate`;
  while (Date.now() < end) {
    const r = await withTransientRetries(() => api("GET", buildsPath));
    const b = r.data[0];
    const state = b ? b.attributes.processingState : "NOCH_NICHT_DA";
    console.log(`${new Date().toISOString()} Build ${build}: ${state}`);
    if (state === "VALID") return;
    if (state === "FAILED" || state === "INVALID") throw new Error(`Build ${build}: ${state}`);
    await new Promise((r2) => setTimeout(r2, 30000));
  }
  console.log("Apple verarbeitet noch; Status später in App Store Connect ansehen.");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const [cmd, ...a] = process.argv.slice(2);
  const run = {
    pem: async () => writeFileSync(a[0], keyPem(process.env.ASC_KEY_P8), { mode: 0o600 }),
    "revoke-old": () => revokeOlderCiCerts(a[0]),
    create: () => create(a[0], a[1], a[2]),
    cleanup: () => cleanup(a[0]),
    project: async () => writeFileSync(a[0], patchProject(readFileSync(a[0], "utf8"), { team: a[1], profile: a[2], version: a[3], build: a[4] })),
    wait: () => waitBuild(a[0], a[1], Number(a[2] || 30)),
  }[cmd];
  if (!run) { console.error("Befehl fehlt"); process.exit(2); }
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
