import { test } from "node:test";
import assert from "node:assert/strict";
import { barInfo, beatInfo, announces, announceLevel, clampSetting, readSettings, PRE_FROM, PRE_TO, DEFAULTS } from "../src/lib/noClick.js";
import { EN } from "../src/lib/en.js";
import { HELP } from "../src/lib/helpCopy.js";

test("NoClick: Phasen im Kreis, Countdown zählt den laufenden Takt mit", () => {
  const s = { click: 8, gap: 8 };
  assert.deepEqual([0, 7, 8, 9, 15, 16].map((b) => barInfo(b, s.click, s.gap).phase), ["click", "click", "gap", "gap", "gap", "click"]);
  assert.equal(barInfo(9, 8, 8).left, 7); // 2. NoClick-Takt von 8 → noch 7 (wie im Entwurf)
  assert.equal(barInfo(15, 8, 8).left, 1);
  assert.ok(barInfo(15, 8, 8).last);
});

test("NoClick: Ton nur in Click-Takten, Akzent auf der ersten 1 nach der Lücke, Blitz auf der 1 der Lücke", () => {
  const s = { click: 2, gap: 2, beats: 4 };
  const all = Array.from({ length: 32 }, (_, n) => beatInfo(n, s));
  assert.deepEqual(all.filter((b) => b.sound).map((b) => b.bar).filter((v, i, a) => a.indexOf(v) === i), [0, 1, 4, 5]);
  assert.deepEqual(all.filter((b) => b.comeback).map((b) => b.bar), [4]); // Bar 0 ist der Start, keine Lücke davor
  assert.deepEqual(all.filter((b) => b.flash1).map((b) => b.bar), [2, 3, 6, 7]);
  assert.ok(all.every((b) => !(b.sound && b.flash1)));
});

test("NoClick: Vorankündigung - Click→NoClick immer, NoClick→Click nur mit Schalter", () => {
  const lastClick = barInfo(1, 2, 2);
  const lastGap = barInfo(3, 2, 2);
  assert.ok(announces(lastClick, true) && announces(lastClick, false));
  assert.ok(announces(lastGap, true));
  assert.ok(!announces(lastGap, false));
  assert.ok(!announces(barInfo(0, 2, 2), true)); // nicht im vorletzten Takt
  // linear von zart bis halb hell
  assert.equal(announceLevel(lastClick, 0, false), PRE_FROM);
  assert.equal(announceLevel(lastClick, 1, false), PRE_TO);
  assert.ok(Math.abs(announceLevel(lastClick, 0.5, false) - (PRE_FROM + PRE_TO) / 2) < 1e-9);
  assert.equal(announceLevel(lastGap, 0.7, false), 0);
});

test("NoClick 1·1: jeder Takt ist der letzte seiner Phase", () => {
  for (let b = 0; b < 6; b++) {
    const i = barInfo(b, 1, 1);
    assert.equal(i.phase, b % 2 ? "gap" : "click");
    assert.ok(i.last);
    assert.equal(i.left, 1);
  }
  assert.ok(beatInfo(2, { click: 1, gap: 1, beats: 1 }).comeback);
  assert.ok(beatInfo(1, { click: 1, gap: 1, beats: 1 }).flash1);
});

test("NoClick: Einstellungen begrenzt, Standard 2·2·4 mit Blinken an", () => {
  assert.equal(clampSetting("click", 0), 1);
  assert.equal(clampSetting("gap", 99), 16);
  assert.equal(clampSetting("beats", 13), 12);
  assert.deepEqual(readSettings({}), { ...DEFAULTS });
  assert.equal(readSettings({ flash: false }).flash, false);
});

test("NoClick: Texte übersetzt, Hilfe endet mit dem Easter Egg, keine Gap-Namen", () => {
  const de = ["Click an, Click aus, du hältst das Tempo.", "Blinken auf der 1", "Takte mit Click", "Takte ohne Click", "pro Takt", "Takte übrig", "Takt übrig"];
  for (const k of de) assert.ok(EN[k], `EN fehlt: ${k}`);
  assert.equal(EN["Click an, Click aus, du hältst das Tempo."], "Click on, click off, you keep the time.");
  assert.equal(EN["Blinken auf der 1"], "Flash on the 1");
  const rows = HELP.click;
  const egg = rows[rows.length - 1];
  assert.equal(egg[0], "");
  assert.equal(egg[1], "Psst… unter uns heißt NoClick eigentlich „Clickn't“. 🤫🥁");
  assert.equal(EN[egg[1]], "Psst… between us, NoClick is really called \"Clickn't\". 🤫🥁");
  for (const [k, v] of rows) for (const s of [k, v, EN[k], EN[v]]) if (s) assert.ok(!/gap ?click|gapclick/i.test(s), s);
  for (const [k, v] of rows) { if (k) assert.ok(EN[k] || /^[A-Za-z ]+$/.test(k), `EN fehlt: ${k}`); assert.ok(EN[v], `EN fehlt: ${v}`); }
});
