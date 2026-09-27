// Signierte Einladungslinks: <id>.<exp>.<sig>
// id = Tester-Kürzel (z. B. "anna-7k"), exp = Ablauf in Unix-Sekunden,
// sig = HMAC-SHA256(ZUGANG_SECRET, "<id>.<exp>"), gekürzt auf 16 Byte, base64url.
const enc = new TextEncoder();
export const ID_RE = /^[a-z0-9-]{1,24}$/;
const TOKEN_RE = /^([a-z0-9-]{1,24})\.(\d{9,11})\.([A-Za-z0-9_-]{22})$/;

// Zu kurzes oder fehlendes Geheimnis = niemand kommt rein (fail closed)
export const secretOk = (secret) => typeof secret === "string" && secret.length >= 32;

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return b64url(mac.slice(0, 16));
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function createToken(secret, id, exp) {
  if (!secretOk(secret)) throw new Error("ZUGANG_SECRET fehlt oder ist kürzer als 32 Zeichen");
  if (!ID_RE.test(id) || !Number.isInteger(exp)) throw new Error("Ungültige id oder exp");
  return `${id}.${exp}.${await sign(secret, `${id}.${exp}`)}`;
}

// { ok: true, id, exp } oder { ok: false, reason: "nosecret" | "malformed" | "signature" | "expired" | "revoked" }
export async function verifyToken(secret, token, revoked = [], now = Date.now()) {
  if (!secretOk(secret)) return { ok: false, reason: "nosecret" };
  const m = typeof token === "string" ? TOKEN_RE.exec(token) : null;
  if (!m) return { ok: false, reason: "malformed" };
  const [, id, expStr, sig] = m;
  const exp = Number(expStr);
  if (!sameString(await sign(secret, `${id}.${exp}`), sig)) return { ok: false, reason: "signature" };
  if (revoked.includes(id)) return { ok: false, reason: "revoked", id, exp };
  if (exp * 1000 <= now) return { ok: false, reason: "expired", id, exp };
  return { ok: true, id, exp };
}
