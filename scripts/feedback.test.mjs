// Test-Feedback: Regeln (src/lib/feedbackRules.js) und Server-Funktion (api/feedback.js) mit Arbeitsspeicher.
import test from "node:test";
import assert from "node:assert/strict";
import { THANKS_AFTER, TEST_THANKS_AFTER, addQualified, isExpired, mailtoHref, makeThanksNumber, qualifyKey, thanksAfter, validateFeedback } from "../src/lib/feedbackRules.js";
import { handle } from "../api/feedback.js";
import { memoryStore, storeFromEnv } from "../api/_lib/store.js";
import { PRIVACY, PRIVACY_APP } from "../src/lib/privacyText.js";

const DEV = "0b7c2a4e-1f3d-4c5b-9a8e-123456789abc";

test("Schwelle: 7, im Testmodus 2", () => {
  assert.equal(THANKS_AFTER, 7);
  assert.equal(TEST_THANKS_AFTER, 2);
  assert.equal(thanksAfter(false), 7);
  assert.equal(thanksAfter(true), 2);
});

test("zählt nur mit Text und höchstens einmal pro Übung und Tag", () => {
  assert.equal(qualifyKey({ day: "2026-10-17", ex: "click|", comment: "" }), null);
  assert.equal(qualifyKey({ day: "2026-10-17", ex: "click|", comment: "  ok " }), null); // zu kurz
  let k = addQualified([], { day: "2026-10-17", ex: "click|", comment: "Super Click" });
  k = addQualified(k, { day: "2026-10-17", ex: "click|", comment: "nochmal" });
  k = addQualified(k, { day: "2026-10-17", ex: "rudiments|1", comment: "Gut erklärt" });
  k = addQualified(k, { day: "2026-10-18", ex: "click|", comment: "wieder gut" });
  assert.deepEqual(k, ["2026-10-17#click|", "2026-10-17#rudiments|1", "2026-10-18#click|"]);
});

test("Dankeschön-Nummer, Ablauf, Mail", () => {
  assert.match(makeThanksNumber(), /^SF-\d{4}$/);
  assert.equal(makeThanksNumber(() => 0.3821), "SF-4438");
  const now = new Date(2026, 9, 17, 12).getTime();
  assert.equal(isExpired("2026-10-16", now), true);
  assert.equal(isExpired("2026-10-17", now), false); // gilt bis einschließlich
  assert.equal(isExpired("", now), false);
  const m = mailtoHref({ num: "SF-4821", platform: "ios" });
  assert.match(m, /^mailto:schlagfertig@icloud\.com\?subject=/);
  assert.match(decodeURIComponent(m), /SF-4821[^]*iPhone/);
  assert.match(decodeURIComponent(mailtoHref({ num: "SF-4821", platform: "android", expired: true, code: "X1" })), /abgelaufen[^]*Android/);
});

test("validateFeedback: säubert und lehnt Unsinn ab", () => {
  assert.equal(validateFeedback({ device: "x", rating: "up", ex: "a", day: "2026-10-17" }).ok, false);
  assert.equal(validateFeedback({ device: DEV, rating: "meh", ex: "a", day: "2026-10-17" }).ok, false);
  const v = validateFeedback({ device: DEV, rating: "down", ex: "click|", day: "2026-10-17", comment: "a".repeat(900), quote: "yes" });
  assert.equal(v.ok, true);
  assert.equal(v.value.comment.length, 500);
  assert.equal(v.value.quote, false); // nur echtes true
});

const req = (body, headers = {}) => new Request("http://x/api/feedback", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("ohne Speicher: 503 (App behält das Feedback im Postausgang)", async () => {
  assert.equal(storeFromEnv({}), null);
  const r = await handle(req({ type: "feedback" }), { store: null, env: {} });
  assert.equal(r.status, 503);
});

test("Ablauf: Feedback → Dankeschön (erst ab Schwelle) → Code → Widerruf", async () => {
  const store = memoryStore();
  const env = { FEEDBACK_ADMIN_TOKEN: "geheim" };
  const opt = { store, env, rand: () => 0.4821 };
  const fb = (day, ex, comment) => handle(req({ type: "feedback", device: DEV, rating: "up", ex, day, comment, test: true }), opt).then((r) => r.json());
  assert.equal((await fb("2026-10-17", "click|", "Klasse")).count, 1);
  assert.equal((await fb("2026-10-17", "click|", "Doppelt")).count, 1);
  assert.equal((await fb("2026-10-17", "pyramid|", "")).count, 1);
  // zu früh für den echten Modus
  assert.equal((await handle(req({ type: "thanks", device: DEV, num: "SF-1111" }), opt)).status, 403);
  assert.equal((await fb("2026-10-17", "pyramid|", "Gefällt mir")).count, 2);
  const th = await (await handle(req({ type: "thanks", device: DEV, num: "SF-1111", platform: "android", test: true }), opt)).json();
  assert.equal(th.num, "SF-1111");
  // zweites Gerät will dieselbe Nummer: bekommt eine andere
  const DEV2 = "1b7c2a4e-1f3d-4c5b-9a8e-123456789abc";
  for (const ex of ["a|", "b|"]) await handle(req({ type: "feedback", device: DEV2, rating: "up", ex, day: "2026-10-17", comment: "prima", test: true }), opt);
  const th2 = await (await handle(req({ type: "thanks", device: DEV2, num: "SF-1111", test: true }), opt)).json();
  assert.notEqual(th2.num, "SF-1111");
  // Code nur mit Admin-Token
  assert.equal((await handle(req({ type: "setcode", num: "SF-1111", code: "ABC", validUntil: "2026-12-31" }), opt)).status, 403);
  assert.equal((await handle(req({ type: "setcode", num: "SF-1111", code: "ABC", validUntil: "2026-12-31" }, { authorization: "Bearer geheim" }), opt)).status, 200);
  const st = await (await handle(req({ type: "status", device: DEV }), opt)).json();
  assert.deepEqual([st.num, st.platform, st.code, st.validUntil], ["SF-1111", "android", "ABC", "2026-12-31"]);
  // Special Thanks getrennt, ohne Geräte-Kennung
  await handle(req({ type: "special", id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", name: "Max", contact: "@max" }), opt);
  const all = await (await handle(new Request("http://x/api/feedback", { headers: { authorization: "Bearer geheim" } }), opt)).json();
  assert.equal(all.feedback.length, 6);
  assert.deepEqual(all.special.map((s) => [s.name, s.contact, s.device]), [["Max", "@max", undefined]]);
  assert.equal((await handle(new Request("http://x/api/feedback"), opt)).status, 403);
  // Widerruf: Feedbacks dieses Geräts weg
  await handle(req({ type: "forget", device: DEV }), opt);
  const after = await (await handle(new Request("http://x/api/feedback", { headers: { authorization: "Bearer geheim" } }), opt)).json();
  assert.equal(after.feedback.filter((f) => f.device === DEV).length, 0);
});

test("Datenschutz: Test-Feedback nur in der Web-/Testfassung", () => {
  for (const l of ["de", "en"]) {
    assert.ok(PRIVACY[l].sections.some((s) => /Test/.test(s.h)));
    assert.ok(!PRIVACY_APP[l].sections.some((s) => /Test/.test(s.h)));
  }
  assert.match(JSON.stringify(PRIVACY.de), /spätestens 6 Monate nach Ende der Testphase/);
  assert.match(JSON.stringify(PRIVACY.de), /Art\. 6 Abs\. 1 lit\. a DSGVO/);
  // Abschnitt 2: Ausnahme nur in der Web-/Testfassung
  assert.ok(PRIVACY.de.sections[1].body.join("").includes("Kein Tracking, keine Werbung. Einzige Ausnahme: Wenn du in der Testversion freiwillig beim Test-Feedback mitmachst, wird dein Feedback ohne Namen gespeichert (siehe Abschnitt 7)."));
  assert.ok(PRIVACY.en.sections[1].body.join("").includes("No tracking, no ads. The only exception: if you voluntarily take part in tester feedback in the test version, your feedback is stored without your name (see section 7)."));
  assert.match(PRIVACY_APP.de.sections[1].body.join(""), /kein Tracking und keine Werbung\. Übungsdaten bleiben auf deinem Gerät\.$/);
  assert.doesNotMatch(JSON.stringify(PRIVACY_APP), /Einzige Ausnahme|only exception/);
});

test("middleware: /api/* ohne Einladungs-Cookie → 401 JSON statt Sperrseite", async () => {
  const { default: middleware } = await import("../middleware.js");
  const r = await middleware(new Request("https://x/api/feedback", { method: "POST" }));
  assert.equal(r.status, 401);
  assert.match(r.headers.get("content-type"), /json/);
});
