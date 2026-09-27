// node --test scripts/  (nutzt nur ein zufälliges Test-Geheimnis)
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createToken, verifyToken } from "../access/token.js";
import { endOfBerlinDay } from "./zugang.mjs";
import middleware from "../middleware.js";
import gesperrt from "../access/gesperrt.json" with { type: "json" };

const SECRET = randomBytes(32).toString("base64url");
const now = Date.now();
const inDays = (d) => Math.floor(now / 1000) + d * 86400;
const req = (path, cookie) => new Request(`https://spielfertig-trainer.vercel.app${path}`, { headers: cookie ? { cookie } : {} });

test("token: gültig", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  assert.deepEqual(await verifyToken(SECRET, t), { ok: true, id: "anna-7k", exp: inDays(21) });
});

test("token: abgelaufen", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(-1));
  assert.equal((await verifyToken(SECRET, t)).reason, "expired");
});

test("token: Signatur manipuliert", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  const last = t.at(-1) === "A" ? "B" : "A";
  assert.equal((await verifyToken(SECRET, t.slice(0, -1) + last)).reason, "signature");
});

test("token: id oder exp manipuliert", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  const [, exp, sig] = t.split(".");
  assert.equal((await verifyToken(SECRET, `ben-7k.${exp}.${sig}`)).reason, "signature");
  assert.equal((await verifyToken(SECRET, `anna-7k.${Number(exp) + 86400 * 365}.${sig}`)).reason, "signature");
});

test("token: falsches Geheimnis", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  assert.equal((await verifyToken(randomBytes(32).toString("base64url"), t)).reason, "signature");
});

test("token: gesperrte id", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  assert.equal((await verifyToken(SECRET, t, ["anna-7k"])).reason, "revoked");
});

test("token: kaputte Eingaben", async () => {
  for (const bad of [undefined, null, "", "abc", "anna.123", "Anna-7k.1793483999.AAAAAAAAAAAAAAAAAAAAAA", "anna-7k.1793483999.AAAA", "a".repeat(500), "anna-7k.1793483999.AAAAAAAAAAAAAAAAAAAAAA.x", 42]) {
    assert.equal((await verifyToken(SECRET, bad)).reason, "malformed", String(bad));
  }
});

test("token: ohne/zu kurzes Geheimnis nie gültig (fail closed)", async () => {
  const t = await createToken(SECRET, "anna-7k", inDays(21));
  for (const s of [undefined, "", "kurz"]) assert.equal((await verifyToken(s, t)).reason, "nosecret");
  await assert.rejects(() => createToken("", "anna-7k", inDays(21)));
});

test("endOfBerlinDay: 23:59:59 Berlin, auch über die Zeitumstellung", () => {
  const fmt = (s) => new Date(s * 1000).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  assert.equal(fmt(endOfBerlinDay(21, Date.UTC(2026, 8, 27, 10))), "18.10.2026, 23:59:59");
  assert.equal(fmt(endOfBerlinDay(30, Date.UTC(2026, 9, 10, 22, 30))), "10.11.2026, 23:59:59"); // 00:30 Berlin am 11.10.
  assert.equal(fmt(endOfBerlinDay(365, Date.UTC(2026, 8, 27, 10))), "27.09.2027, 23:59:59");
});

test("middleware", async (t) => {
  process.env.ZUGANG_SECRET = SECRET;
  const good = await createToken(SECRET, "anna-7k", inDays(21));
  const old = await createToken(SECRET, "anna-7k", inDays(-2));

  await t.test("ohne Cookie: Sperrseite (200, noindex, no-store)", async () => {
    for (const p of ["/", "/impressum", "/datenschutz", "/irgendwas"]) {
      const r = await middleware(req(p));
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type"), /text\/html/);
      assert.equal(r.headers.get("cache-control"), "no-store");
      assert.equal(r.headers.get("x-robots-tag"), "noindex");
      const html = await r.text();
      assert.match(html, /Testphase/);
      assert.match(html, /Testing phase/);
      assert.match(html, /Angaben gemäß § 5 DDG/);
      assert.match(html, /sf_zugang/);
      assert.match(html, /name="zugang"/);
      assert.doesNotMatch(html, /fonts\.googleapis|\/assets\//);
    }
  });

  await t.test("/assets/* ohne Zugang: 401", async () => {
    const r = await middleware(req("/assets/index-abc.js"));
    assert.equal(r.status, 401);
  });

  await t.test("/logo.svg und /favicon.svg frei", async () => {
    assert.equal(await middleware(req("/logo.svg")), undefined);
    assert.equal(await middleware(req("/favicon.svg")), undefined);
  });

  await t.test("gültiger ?zugang= setzt Cookie und leitet auf saubere URL", async () => {
    const r = await middleware(req(`/datenschutz?x=1&zugang=${good}`));
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/datenschutz?x=1");
    const c = r.headers.get("set-cookie");
    assert.match(c, new RegExp(`^sf_zugang=${good.replace(/\./g, "\\.")};`));
    assert.match(c, /; HttpOnly/);
    assert.match(c, /; Secure/);
    assert.match(c, /; SameSite=Lax/);
    assert.match(c, /; Path=\//);
    assert.equal(Date.parse(c.match(/Expires=([^;]+)/)[1]) / 1000, inDays(21));
    assert.equal(r.headers.get("cache-control"), "no-store");
  });

  await t.test("eingefügter ganzer Link (Formular) funktioniert", async () => {
    const full = encodeURIComponent(`https://spielfertig-trainer.vercel.app/?zugang=${good}`);
    const r = await middleware(req(`/?zugang=${full}`));
    assert.equal(r.status, 302);
    assert.equal(r.headers.get("location"), "/");
    assert.match(r.headers.get("set-cookie"), new RegExp(`^sf_zugang=${good.replace(/\./g, "\\.")};`));
  });

  await t.test("ungültiger/abgelaufener ?zugang=: Sperrseite mit Hinweis, kein Cookie", async () => {
    const r1 = await middleware(req("/?zugang=quatsch"));
    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get("set-cookie"), null);
    assert.match(await r1.text(), /ungültig oder nicht mehr gültig/);
    const r2 = await middleware(req(`/?zugang=${old}`));
    assert.match(await r2.text(), /abgelaufen/);
  });

  await t.test("gültiges Cookie: durchlassen (Seiten und Assets)", async () => {
    assert.equal(await middleware(req("/", `foo=1; sf_zugang=${good}`)), undefined);
    assert.equal(await middleware(req("/assets/index-abc.js", `sf_zugang=${good}`)), undefined);
  });

  await t.test("abgelaufenes oder gesperrtes Cookie: gesperrt", async () => {
    const r1 = await middleware(req("/", `sf_zugang=${old}`));
    assert.match(await r1.text(), /abgelaufen/);
    gesperrt.push("anna-7k");
    try {
      const r2 = await middleware(req("/", `sf_zugang=${good}`));
      assert.equal(r2.status, 200);
      assert.match(await r2.text(), /Testphase/);
      assert.equal((await middleware(req("/assets/x.js", `sf_zugang=${good}`))).status, 401);
      assert.equal((await middleware(req(`/?zugang=${good}`))).status, 200);
    } finally { gesperrt.pop(); }
  });

  await t.test("ohne ZUGANG_SECRET: alles gesperrt (fail closed)", async () => {
    delete process.env.ZUGANG_SECRET;
    const r1 = await middleware(req("/", `sf_zugang=${good}`));
    assert.equal(r1.status, 200);
    assert.match(await r1.text(), /Testphase/);
    assert.equal((await middleware(req(`/?zugang=${good}`))).headers.get("set-cookie"), null);
    assert.equal((await middleware(req("/assets/x.js", `sf_zugang=${good}`))).status, 401);
    process.env.ZUGANG_SECRET = "zu-kurz";
    assert.equal((await middleware(req("/assets/x.js", `sf_zugang=${good}`))).status, 401);
    process.env.ZUGANG_SECRET = SECRET;
  });
});
