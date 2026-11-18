// „Mein Zugang“: Statustexte, Details aus den Store-Käufen, Footer-Link nur im Store-Build.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessStatus, accessDate } from "../src/lib/accessText.js";
import { entitlementDetail } from "../src/lib/iap.js";
import { SUB_PRODUCT_ID, FULL_PRODUCT_ID, freeView } from "../src/lib/demo.js";

const NOW = Date.parse("2026-11-18T10:00:00Z");
const UNTIL = Date.parse("2027-11-18T10:00:00Z");
const sub = (extra = {}) => ({ transactionId: "1", productIdentifier: SUB_PRODUCT_ID, expirationDate: new Date(UNTIL).toISOString(), isActive: true, subscriptionState: "subscribed", willCancel: false, ...extra });

test("Datum: de 18.11.2027, en 18 Nov 2027", () => {
  assert.equal(accessDate(UNTIL, "de"), "18.11.2027");
  assert.equal(accessDate(UNTIL, "en"), "18 Nov 2027");
  assert.equal(accessDate(NaN, "de"), "");
});

test("Status: nicht frei = Testversion", () => {
  const s = accessStatus({ unlocked: false, lang: "de" });
  assert.equal(s.kind, "test");
  assert.equal(s.title, "Testversion");
  assert.equal(accessStatus({ unlocked: false, lang: "en" }).title, "Trial version");
});

test("Status: Vollversion, auch ohne Details (älterer Stand, Tester-Code)", () => {
  for (const info of [{ via: "full" }, null]) {
    const s = accessStatus({ unlocked: true, source: "full", info, lang: "de" });
    assert.equal(s.kind, "full");
    assert.equal(s.title, "Vollversion");
  }
  assert.equal(accessStatus({ unlocked: true, source: "", info: null, lang: "en" }).title, "Full version");
});

test("Status: Jahresabo mit Verlängerung, gekündigt, ohne Angabe", () => {
  const renew = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, willCancel: false }, lang: "de" });
  assert.equal(renew.title, "Jahresabo aktiv bis 18.11.2027");
  assert.deepEqual(renew.lines, ["Verlängert sich automatisch am 18.11.2027."]);
  const gone = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, willCancel: true }, lang: "de" });
  assert.equal(gone.title, "Jahresabo aktiv bis 18.11.2027");
  assert.match(gone.lines[0], /gekündigt/);
  assert.ok(!gone.lines.join(" ").includes("Verlängert sich"));
  const unknown = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, willCancel: null }, lang: "de" });
  assert.match(unknown.lines[0], /bis du kündigst/);
  const en = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, willCancel: false }, lang: "en" });
  assert.equal(en.title, "Annual subscription active until 18 Nov 2027");
  assert.deepEqual(en.lines, ["Renews automatically on 18 Nov 2027."]);
  // ohne Ablaufdatum, nur Quelle sub
  assert.equal(accessStatus({ unlocked: true, source: "sub", info: null, lang: "de" }).title, "Jahresabo aktiv");
});

test("Status: Testphase und Kulanzzeit", () => {
  const trial = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, trial: true, willCancel: false }, lang: "de" });
  assert.equal(trial.kind, "trial");
  assert.match(trial.lines[0], /Gratis-Testphase läuft bis 18\.11\.2027/);
  const grace = accessStatus({ unlocked: true, info: { via: "sub", until: UNTIL, state: "inGracePeriod" }, lang: "en" });
  assert.equal(grace.kind, "grace");
  assert.equal(grace.tone, "warn");
  assert.match(grace.lines.join(" "), /payment/);
});

test("Details aus den Käufen: Vollversion, Abo (spätestes Ablaufdatum), nichts", () => {
  assert.deepEqual(entitlementDetail([{ productIdentifier: FULL_PRODUCT_ID, transactionId: "f" }, sub()], NOW), { via: "full" });
  assert.deepEqual(entitlementDetail([sub()], NOW), { via: "sub", until: UNTIL, willCancel: false, state: "subscribed", trial: false });
  const old = sub({ isActive: false, expirationDate: "2026-01-01T00:00:00Z", subscriptionState: "expired" });
  assert.equal(entitlementDetail([old, sub({ willCancel: true, isTrialPeriod: true })], NOW).willCancel, true);
  assert.equal(entitlementDetail([old, sub({ isTrialPeriod: true })], NOW).trial, true);
  assert.equal(entitlementDetail([sub({ willCancel: null })], NOW).willCancel, null);
  assert.equal(entitlementDetail([old], NOW), null);
  assert.equal(entitlementDetail(null, NOW), null);
});

test("Ansicht zugang ist auch ohne Freischaltung offen; Link nur im Store-Build", () => {
  assert.equal(freeView("zugang"), true);
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.ok(app.includes('{DEMO_ON ? <button type="button" className="foot-link" onClick={() => open("zugang")}'));
});
