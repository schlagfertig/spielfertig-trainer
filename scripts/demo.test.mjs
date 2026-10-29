import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_ON, DEMO_PRICE, FULL_PRODUCT_ID, FREE_GROOVE_BARS, FREE_JOURNAL_N, FREE_PYRAMID_STAGES, FREE_RUDIMENT, FREE_RUDIMENTS, FREE_STICK_MAX,
  TESTER_UNLOCK, canPrintRudiment, freeView, grooveBarsOpen, grooveSaveOpen, hourCodeMatches, noClickOpen, purchaseFullVersion, pyramidStageOpen, rudimentOpen, stickOpen, unlockCodeOk, viewOpen, withinFreeCount,
} from "../src/lib/demo.js";
import { rerollBar, rollEtude } from "../src/lib/etudeDice.js";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";

const FREE_IDS = [1, 6, 16, 20, 22, 31];

function countLiteral(dir, literal) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) n += countLiteral(path, literal);
    else if (/\.(js|jsx)$/.test(entry.name)) n += readFileSync(path, "utf8").split(literal).length - 1;
  }
  return n;
}

test("Web/Test ohne Store-Flag: keine Sperre", () => {
  assert.equal(DEMO_ON, false);
  assert.equal(DEMO_PRICE, "12,99 €");
  assert.equal(noClickOpen(), true);
  assert.equal(grooveSaveOpen(), true);
  assert.equal(grooveBarsOpen(1), true);
  assert.equal(grooveBarsOpen(4), true);
  assert.equal(viewOpen("pyramid", true), true);
});

test("freie Ansichten und volle Kacheln", () => {
  for (const view of ["home", "first", "nostick", "click", "lexicon", "impressum", "datenschutz", "news", "rudiments", "dice", "stick", "diary", "rhythm", "pyramid"]) {
    assert.equal(freeView(view), true, view);
    assert.equal(viewOpen(view, false), true, view);
  }
  assert.equal(freeView("archive"), false);
  assert.equal(viewOpen("archive", false), false);
  assert.equal(viewOpen("archive", true), true);
});

test("Pyramide: 4tel, 8tel und 16tel frei, schwerere Stufen zu", () => {
  assert.deepEqual(FREE_PYRAMID_STAGES, ["q", "e", "s16"]);
  for (const id of ["q", "e", "s16"]) assert.equal(pyramidStageOpen(id, false), true, id);
  for (const id of ["et", "q5", "sx", "s7", "s32"]) assert.equal(pyramidStageOpen(id, false), false, id);
  assert.equal(pyramidStageOpen("et", true), true);
  assert.equal(pyramidStageOpen("s32", true), true);
});

test("Drucken nur die sechs freien Rudiments", () => {
  for (const id of FREE_IDS) assert.equal(canPrintRudiment(id, false), true, String(id));
  for (const id of [2, 5, 17, 19, 33, 40]) assert.equal(canPrintRudiment(id, false), false, String(id));
  assert.equal(canPrintRudiment(2, true), true);
});

test("sechs freie Rudiments, Hand Control 1–2, zwei Journal-Einträge", () => {
  assert.deepEqual(FREE_RUDIMENTS, FREE_IDS);
  assert.equal(FREE_RUDIMENT, 1);
  assert.equal(FREE_STICK_MAX, 2);
  assert.equal(FREE_JOURNAL_N, 2);
  for (const id of FREE_IDS) assert.equal(rudimentOpen(id, false), true, String(id));
  for (const id of [2, 5, 17, 19, 33, 40]) assert.equal(rudimentOpen(id, false), false, String(id));
  assert.equal(rudimentOpen(2, true), true);
  assert.equal(stickOpen(1, false), true);
  assert.equal(stickOpen(2, false), true);
  assert.equal(stickOpen(3, false), false);
  assert.equal(stickOpen(24, false), false);
  assert.equal(stickOpen(24, true), true);
  assert.equal(withinFreeCount(0, false), true);
  assert.equal(withinFreeCount(1, false), true);
  assert.equal(withinFreeCount(2, false), false);
  assert.equal(withinFreeCount(9, true), true);
});

test("Eigene Grooves: 1 Takt frei, mehr Takte und Speichern volle App", () => {
  assert.equal(FREE_GROOVE_BARS, 1);
  assert.equal(grooveBarsOpen(1, false), true);
  assert.equal(grooveBarsOpen(1, true), true);
  for (const n of [2, 3, 4]) {
    assert.equal(grooveBarsOpen(n, false), false, String(n));
    assert.equal(grooveBarsOpen(n, true), true, String(n));
  }
  assert.equal(grooveSaveOpen(false), false);
  assert.equal(grooveSaveOpen(true), true);
  const free = "Kostenlos bleiben Erste Übung, No-Stick-Challenge, Tempo halten und Tempo steigern, Lexikon und das Tagebuch. Dazu sechs Rudiments (Single Stroke Roll, Double Stroke Open Roll, Single Paradiddle, Flam, Flam Tap, Drag), die du auch drucken kannst, der Würfel aus diesen sechs, Hand Control 1 und 2, die Rhythmuspyramide in Vierteln, Achteln und 16teln, die ersten zwei Hausaufgaben, die ersten zwei Karteikarten und eigene Grooves mit genau einem Takt zum Ausprobieren.";
  const paid = "Danach ist alles offen: Takte ohne Click, alle Rudiments, Hand Control, die schwereren Pyramiden-Stufen, Noten, Drucken der übrigen Übungen, unbegrenzte Hausaufgaben und Karteikarten — eigene Grooves mit mehr als einem Takt, und du speicherst sie.";
  assert.match(EN[free], /exactly one bar/);
  assert.match(EN2[paid], /bars without click/);
  assert.match(EN2[paid], /more than one bar/);
  assert.match(EN2[paid], /save them/);
  assert.doesNotMatch(EN2[paid], /NoClick/);
  assert.doesNotMatch(`${EN[free]} ${EN2[paid]}`, /\bpractice\b/i);
  const sheet = readFileSync(new URL("../src/lib/Paywall.jsx", import.meta.url), "utf8");
  assert.match(sheet, /Takte ohne Click/);
  assert.doesNotMatch(sheet, /NoClick/);
});

test("Vollversion: Produkt-ID aus App Store Connect, Kauf nur in der nativen Hülle", async () => {
  assert.equal(FULL_PRODUCT_ID, "de.schlagfertig.control.full");
  const cap = JSON.parse(readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8"));
  assert.equal(cap.appId, "de.schlagfertig.app");
  assert.notEqual(FULL_PRODUCT_ID, cap.appId);
  const src = readFileSync(new URL("../src/lib/demo.js", import.meta.url), "utf8");
  assert.equal(countLiteral(fileURLToPath(new URL("../src", import.meta.url)), FULL_PRODUCT_ID), 1);
  assert.match(src, /import\("\.\/iap\.js"\)/);
  const res = await purchaseFullVersion();
  assert.deepEqual(res, { ok: false, reason: "not-native", productId: FULL_PRODUCT_ID });
  assert.equal(EN2["Vollversion"], "Full version");
  assert.equal(EN2["Kaufen"], "Buy");
  assert.equal(EN2["Einmalig, kein Abo."], "One-off, no subscription.");
  assert.equal(EN2["Kauf geht nur in der Store-App."], "Buying only works in the store app.");
  assert.doesNotMatch(`${EN2["Kaufen"]} ${EN2["Kauf geht nur in der Store-App."]} ${EN2["Einmalig, kein Abo."]}`, /\bpractice\b/i);
});

test("Store-Build: Code schaltet nicht frei", () => {
  assert.equal(TESTER_UNLOCK, false);
  assert.equal(hourCodeMatches("sf-stunde"), true);
  assert.equal(hourCodeMatches("  SF-Stunde "), true);
  assert.equal(hourCodeMatches("nope"), false);
  assert.equal(hourCodeMatches(""), false);
  assert.equal(unlockCodeOk("sf-stunde"), false);
  assert.equal(unlockCodeOk("  SF-Stunde "), false);
  assert.equal(unlockCodeOk("nope"), false);
  const vite = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
  assert.match(vite, /VITE_SF_TESTER_BUILD/);
  assert.match(vite, /__SF_TESTER__/);
});

test("Gratis-Kacheln nennen sechs, gesperrte Rudiments und NoClick tragen die Schloss-Marke", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const journal = readFileSync(new URL("../src/lib/Journal.jsx", import.meta.url), "utf8");
  const click = readFileSync(new URL("../src/embedded/ClickTrainer.jsx", import.meta.url), "utf8");
  const stick = readFileSync(new URL("../src/embedded/StickControl.jsx", import.meta.url), "utf8");
  const lead = "6 gratis · 40 in der Vollversion";
  assert.equal(EN2[lead], "6 free · 40 in the full version");
  assert.doesNotMatch(EN2[lead], /\bpractice\b/i);
  assert.equal(app.split(`t("${lead}")`).length - 1, 2);
  assert.match(app, /unlocked[\s\S]{0,240}40 berühmten/);
  assert.match(app, /unlocked[\s\S]{0,200}40 Rudiments deine eigene Übung/);
  assert.match(journal, /if \(!rudimentOpen\(id\)\) \{ askUnlock\(\); return; \}/);
  assert.match(journal, /if \(!inBox && !rudimentOpen\(rud\)\) \{ askUnlock\(\); return; \}/);
  assert.match(journal, /locked \? <PaidMark \/> : null/);
  assert.match(click, /noClickOpen\(\) \? null : <PaidMark icon \/>/);
  assert.match(stick, /locked: !stickOpen\(e\.id\)/);
  assert.match(stick, /nextEx && !stickOpen\(nextEx\.id\) \? <PaidMark icon \/> : null/);
  assert.match(stick, /locked \? <PaidMark \/> : null/);
});

test("Würfel bei Sperre nur aus den sechs, auch auf Mittel/Schwer", () => {
  for (const level of ["leicht", "mittel", "schwer"]) {
    for (let k = 0; k < 20; k++) {
      const e = rollEtude({ bars: 8, level, meter: "4/4", only: FREE_IDS });
      assert.equal(e.ids.length, 8);
      for (const id of e.ids) assert.ok(FREE_IDS.includes(id), `${level} ${id}`);
      for (let i = 1; i < e.ids.length; i++) assert.notEqual(e.ids[i], e.ids[i - 1]);
      const r = rerollBar(e, 3, Math.random, FREE_IDS);
      assert.ok(FREE_IDS.includes(r.ids[3]));
      r.ids.forEach((id, i) => { if (i !== 3) assert.equal(id, e.ids[i]); });
    }
  }
});
