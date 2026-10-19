// „Neu in Schlagfertig“: Versionsregel, Highlights, ein Start-Popup pro App-Start (Priorität).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideWhatsNew, minorKey } from "../src/lib/whatsNew.js";
import { HIGHLIGHTS } from "../src/lib/changelog.js";
import { APP_VERSION } from "../src/lib/version.js";

const H = { "1.1": {}, "2.0": {} };

test("Version: package.json = APP_VERSION, Highlights für die aktuelle Minor-Version auf DE und EN", () => {
  assert.equal(JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version, APP_VERSION);
  const h = HIGHLIGHTS[minorKey(APP_VERSION)];
  assert.ok(h, "HIGHLIGHTS fehlt");
  for (const l of ["de", "en"]) {
    assert.ok(h[l].title && h[l].lines.length && h[l].go && h[l].later, l);
  }
  assert.equal(h.de.title, "Neu in Schlagfertig 1.4 🥁");
  assert.equal(h.en.title, "New in Schlagfertig 1.4 🥁");
  assert.equal(h.de.lines[0], "📓 Journal: Tagebuch, Hausaufgaben und Karteikasten - alles für dein Üben an einem Ort.");
  assert.equal(h.en.lines[0], "📓 Journal: diary, homework and card box - everything for your practice in one place.");
  assert.equal(h.de.go, "Jetzt ausprobieren");
  assert.equal(h.en.go, "Try it now");
  assert.equal(h.action, "diary");
  assert.equal(h.preset, undefined);
});

test("minorKey", () => {
  assert.equal(minorKey("1.1.0"), "1.1");
  assert.equal(minorKey("10.02.3"), "10.2");
  assert.equal(minorKey("x"), "");
});

test("nur bei Minor/Major, nicht bei Patch, nicht beim ersten Start", () => {
  assert.deepEqual(decideWhatsNew({ lastSeen: "", current: "1.1.0", highlights: H }), { show: false, record: "1.1.0" });
  assert.deepEqual(decideWhatsNew({ lastSeen: "1.0.2", current: "1.1.0", highlights: H }), { show: true, record: null });
  assert.deepEqual(decideWhatsNew({ lastSeen: "1.1.0", current: "1.1.1", highlights: H }), { show: false, record: "1.1.1" });
  assert.deepEqual(decideWhatsNew({ lastSeen: "1.1.0", current: "1.1.0", highlights: H }), { show: false, record: null });
  assert.deepEqual(decideWhatsNew({ lastSeen: "1.9.4", current: "2.0.0", highlights: H }), { show: true, record: null });
  assert.deepEqual(decideWhatsNew({ lastSeen: "1.1.0", current: "1.2.0", highlights: H }), { show: false, record: "1.2.0" }); // ohne Highlights still
});

// Start-Popup mit nachgebautem Browser-Speicher
function fakeBrowser(store, search = "") {
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  globalThis.localStorage = ls;
  globalThis.window = { location: { search }, dispatchEvent() {}, addEventListener() {}, setTimeout };
  globalThis.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o?.detail; } };
}
let n = 0;
async function pick(store, search = "", opts) {
  fakeBrowser(store, search);
  const m = await import(`../src/lib/startModal.js?case=${n++}`);
  return { first: m.startModal(opts), again: m.startModal(opts), m };
}
const J = JSON.stringify;

test("Start-Popup: Erfolg > Einwilligung > Neu; höchstens eins pro Start", async () => {
  // Update von 1.0 (Begrüßung schon gesehen), Einwilligung noch offen → erst Einwilligung, Neu beim nächsten Start
  const s = { "sf.v1.welcomeSeen": J({ seen: true }) };
  let r = await pick(s);
  assert.equal(r.first, "consent");
  assert.equal(r.again, "consent"); // gleiche Entscheidung, kein zweites Popup
  s["sf.v1.feedback"] = J({ consent: false });
  r = await pick(s);
  assert.equal(r.first, "whatsnew");
  r.m.markWhatsNewSeen();
  assert.equal((await pick(s)).first, null);
  // nicht gezeigter Erfolg geht vor
  s["sf.v1.feedback"] = J({ consent: true, thanks: { num: "SF-1234", shown: false } });
  s["sf.v1.lastVersion"] = J({ v: "1.0.2" });
  assert.equal((await pick(s)).first, "achievement");
  // Testhaken ?whatsnew=1
  assert.equal((await pick(s, "?whatsnew=1")).first, "whatsnew");
  // nicht auf der Startseite geöffnet → nichts
  assert.equal((await pick(s, "", { onHome: false })).first, null);
});

test("allererster Start: kein „Neu“-Popup, Version wird nur gemerkt", async () => {
  const s = { "sf.v1.feedback": J({ consent: false }) };
  const r = await pick(s);
  assert.equal(r.first, null);
  assert.equal(JSON.parse(s["sf.v1.lastVersion"]).v, APP_VERSION);
});

test("Erfolg mitten in der Sitzung: danach kein Start-Popup", async () => {
  fakeBrowser({ "sf.v1.welcomeSeen": J({ seen: true }) });
  const m = await import(`../src/lib/startModal.js?case=${n++}`);
  m.takeForAchievement();
  assert.equal(m.startModal(), null);
});
