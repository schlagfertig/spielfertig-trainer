import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  keyPem,
  patchProject,
  certsToRevoke,
  cleanupTargets,
  subjectCn,
  withTransientRetries,
  isTransientHttpStatus,
} from "./iosSigning.mjs";

function derBase64(cn) {
  const dir = mkdtempSync(join(tmpdir(), "sf-cert-"));
  const der = join(dir, "c.der");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048",
    "-keyout", join(dir, "k.pem"), "-out", der, "-outform", "DER",
    "-days", "1", "-nodes", "-subj", `/CN=${cn}/O=Schlagfertig/C=DE`,
  ], { stdio: "ignore" });
  return readFileSync(der).toString("base64");
}

test("keyPem baut PEM mit 64er-Zeilen, auch ohne Umbrüche", () => {
  const body = "A".repeat(150);
  const pem = keyPem(`-----BEGIN PRIVATE KEY----- ${body} -----END PRIVATE KEY-----`);
  const lines = pem.trim().split("\n");
  assert.equal(lines[0], "-----BEGIN PRIVATE KEY-----");
  assert.equal(lines.at(-1), "-----END PRIVATE KEY-----");
  assert.deepEqual(lines.slice(1, -1).map((l) => l.length), [64, 64, 22]);
  assert.throws(() => keyPem(""));
});

test("patchProject ändert nur das App-Ziel", () => {
  const app = "\t\t\tbuildSettings = {\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = de.schlagfertig.app;\n\t\t\t};";
  const other = "\t\t\tbuildSettings = {\n\t\t\t\tCODE_SIGN_IDENTITY = \"iPhone Developer\";\n\t\t\t};";
  const out = patchProject(`${other}\n${app}`, { team: "T1", profile: "P 1", version: "1.4", build: "9" });
  assert.ok(out.startsWith(other));
  assert.match(out, /CODE_SIGN_STYLE = Manual;/);
  assert.doesNotMatch(out, /Automatic/);
  assert.match(out, /DEVELOPMENT_TEAM = T1;/);
  assert.match(out, /PROVISIONING_PROFILE_SPECIFIER = "P 1";/);
  assert.match(out, /CURRENT_PROJECT_VERSION = 9;/);
  assert.match(out, /MARKETING_VERSION = 1\.4;/);
  assert.throws(() => patchProject(other, { team: "T", profile: "P", version: "1", build: "1" }));
});

test("Aufräumen löscht nur das Profil, nicht das Signatur-Zertifikat", () => {
  assert.deepEqual(cleanupTargets({ certId: "CERT", profileId: "PROF" }), [{ kind: "profiles", id: "PROF" }]);
  assert.deepEqual(cleanupTargets({ certId: "CERT" }), []);
});

test("revoke-old: nur ältere CI-Distribution-Zertifikate, nie das aktuelle", () => {
  const ciDer = derBase64("Schlagfertig CI");
  const humanDer = derBase64("Apple Distribution: Schlagfertig");
  assert.equal(subjectCn(ciDer), "Schlagfertig CI");
  assert.equal(subjectCn(humanDer), "Apple Distribution: Schlagfertig");
  const certs = [
    { id: "OLD", attributes: { certificateType: "DISTRIBUTION", name: "Schlagfertig CI" } },
    { id: "BY_SUBJECT", attributes: { certificateType: "DISTRIBUTION", name: "Apple Distribution", certificateContent: ciDer } },
    { id: "KEEP", attributes: { certificateType: "DISTRIBUTION", name: "Schlagfertig CI", serialNumber: "45461991478646459404326450668137136" } },
    { id: "HUMAN", attributes: { certificateType: "DISTRIBUTION", name: "Apple Distribution: Schlagfertig", certificateContent: humanDer, serialNumber: "45461991478646459404326450668137136" } },
    { id: "DEV", attributes: { certificateType: "DEVELOPMENT", name: "Schlagfertig CI" } },
    { id: "IOS_DEV", attributes: { certificateType: "IOS_DEVELOPMENT", displayName: "Schlagfertig CI" } },
  ];
  assert.deepEqual(certsToRevoke(certs, { keepIds: ["KEEP"] }).map((c) => c.id), ["OLD", "BY_SUBJECT"]);
});

test("Warten: HTTP 5xx ein paar Mal wiederholen, 4xx nicht", async () => {
  assert.equal(isTransientHttpStatus(500), true);
  assert.equal(isTransientHttpStatus(503), true);
  assert.equal(isTransientHttpStatus(401), false);
  assert.equal(isTransientHttpStatus("nope"), false);

  let calls = 0;
  const ok = await withTransientRetries(async () => {
    calls += 1;
    if (calls < 3) {
      const e = new Error("GET /v1/builds -> HTTP 500: {}");
      e.status = 500;
      throw e;
    }
    return "VALID";
  }, { retries: 4, sleepFn: async () => {} });
  assert.equal(ok, "VALID");
  assert.equal(calls, 3);

  let denied = 0;
  const e = new Error("HTTP 401");
  e.status = 401;
  await assert.rejects(() => withTransientRetries(async () => {
    denied += 1;
    throw e;
  }, { retries: 4, sleepFn: async () => {} }));
  assert.equal(denied, 1);

  let exhausted = 0;
  await assert.rejects(() => withTransientRetries(async () => {
    exhausted += 1;
    const err = new Error("HTTP 502");
    err.status = 502;
    throw err;
  }, { retries: 2, sleepFn: async () => {} }));
  assert.equal(exhausted, 3);
});
