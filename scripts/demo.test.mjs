import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEMO_ON, DEMO_PRICE, FULL_PRODUCT_ID, FREE_GROOVE_BARS, FREE_JOURNAL_N, FREE_PYRAMID_STAGES, FREE_RUDIMENT, FREE_RUDIMENTS, FREE_STICK_MAX,
  canPrintRudiment, freeView, grooveBarsOpen, grooveSaveOpen, noClickOpen, purchaseFullVersion, pyramidStageOpen, rudimentOpen, stickOpen, unlockCodeOk, viewOpen, withinFreeCount,
} from "../src/lib/demo.js";
import { rerollBar, rollEtude } from "../src/lib/etudeDice.js";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";

const FREE_IDS = [1, 6, 16, 20, 22, 31];

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
  const paid = "Danach ist alles offen: NoClick, alle Rudiments, Hand Control, die schwereren Pyramiden-Stufen, Noten, Drucken der übrigen Übungen, unbegrenzte Hausaufgaben und Karteikarten — eigene Grooves mit mehr als einem Takt, und du speicherst sie.";
  assert.match(EN[free], /exactly one bar/);
  assert.match(EN2[paid], /more than one bar/);
  assert.match(EN2[paid], /save them/);
  assert.doesNotMatch(`${EN[free]} ${EN2[paid]}`, /\bpractice\b/i);
});

test("Vollversion: Produkt-ID folgt der Paket-ID, Kauf noch ohne Store", async () => {
  assert.equal(FULL_PRODUCT_ID, "de.schlagfertig.app.full");
  const src = readFileSync(new URL("../src/lib/demo.js", import.meta.url), "utf8");
  assert.match(src, /de\.schlagfertig\.control\.full/);
  const res = await purchaseFullVersion();
  assert.deepEqual(res, { ok: false, reason: "not-wired", productId: "de.schlagfertig.app.full" });
  assert.equal(EN2["Vollversion"], "Full version");
  assert.equal(EN2["Kaufen"], "Buy");
  assert.equal(EN2["Einmalig, kein Abo."], "One-off, no subscription.");
  assert.equal(EN2["Kauf geht nur in der Store-App."], "Buying only works in the store app.");
  assert.doesNotMatch(`${EN2["Kaufen"]} ${EN2["Kauf geht nur in der Store-App."]} ${EN2["Einmalig, kein Abo."]}`, /\bpractice\b/i);
});

test("Code aus der Stunde", () => {
  assert.equal(unlockCodeOk("sf-stunde"), true);
  assert.equal(unlockCodeOk("  SF-Stunde "), true);
  assert.equal(unlockCodeOk("nope"), false);
  assert.equal(unlockCodeOk(""), false);
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
