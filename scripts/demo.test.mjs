import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ON, DEMO_PRICE, FREE_JOURNAL_N, FREE_RUDIMENT, FREE_RUDIMENTS, FREE_STICK_MAX,
  freeView, grooveSaveOpen, noClickOpen, rudimentOpen, stickOpen, unlockCodeOk, viewOpen, withinFreeCount,
} from "../src/lib/demo.js";
import { rerollBar, rollEtude } from "../src/lib/etudeDice.js";

const FREE_IDS = [1, 6, 16, 20, 22, 31];

test("Web/Test ohne Store-Flag: keine Sperre", () => {
  assert.equal(DEMO_ON, false);
  assert.equal(DEMO_PRICE, "12,99 €");
  assert.equal(noClickOpen(), true);
  assert.equal(grooveSaveOpen(), true);
  assert.equal(viewOpen("pyramid", true), true);
});

test("freie Ansichten und volle Kacheln", () => {
  for (const view of ["home", "first", "nostick", "click", "lexicon", "impressum", "datenschutz", "news", "rudiments", "dice", "stick", "diary", "rhythm"]) {
    assert.equal(freeView(view), true, view);
    assert.equal(viewOpen(view, false), true, view);
  }
  for (const view of ["pyramid", "archive"]) {
    assert.equal(freeView(view), false, view);
    assert.equal(viewOpen(view, false), false, view);
    assert.equal(viewOpen(view, true), true, view);
  }
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
