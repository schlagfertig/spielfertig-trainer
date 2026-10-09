import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, tempoPlan, planSeconds, waveLevels, waveDir, doneSet, markDone, nextIndex, stepMeta, stepIndex } from "../src/lib/beginner.js";
import { EN } from "../src/lib/en.js";

test("Einstieg: 4–5 kurze, sehr leichte Schritte, Erste Übung zuerst", () => {
  assert.ok(STEPS.length >= 4 && STEPS.length <= 5);
  assert.equal(STEPS[0].id, "puls");
  assert.equal(new Set(STEPS.map((s) => s.id)).size, STEPS.length);
  for (const s of STEPS) {
    const plan = tempoPlan(s);
    assert.ok(plan.every((b) => b >= 60 && b <= 90), `${s.id}: langsames Tempo`);
    const sec = planSeconds(plan);
    assert.ok(sec >= 55 && sec <= 180, `${s.id}: ${sec}s`);
    assert.equal(plan.length % 4, 0, `${s.id}: ganze Takte`);
    assert.equal(plan.length % s.sticking.length, 0, `${s.id}: ganze Handfolge`);
    assert.ok(s.sticking.every((h) => h === "R" || h === "L"));
  }
  assert.deepEqual(STEPS[stepIndex("doppel")].sticking, ["R", "R", "L", "L"]);
});

test("Erste Übung unverändert: 80 BPM, eine Minute", () => {
  const plan = tempoPlan(STEPS[0]);
  assert.equal(plan.length, 80);
  assert.equal(Math.round(planSeconds(plan)), 60);
});

test("Tempo-Welle: 60 → 90 → 60 in kleinen Schritten, Gipfel einmal", () => {
  const w = STEPS[stepIndex("welle")];
  const lv = waveLevels(w.wave);
  assert.equal(lv[0], 60);
  assert.equal(lv[lv.length - 1], 60);
  assert.equal(Math.max(...lv), 90);
  assert.equal(lv.filter((b) => b === 90).length, 1);
  for (let i = 1; i < lv.length; i++) assert.ok(Math.abs(lv[i] - lv[i - 1]) <= 3, "sanft");
  const plan = tempoPlan(w);
  assert.equal(plan.length, lv.length * 8, "2 Takte pro Stufe");
  assert.equal(waveDir(plan, 0), "up");
  assert.equal(waveDir(plan, plan.indexOf(90)), "peak");
  assert.equal(waveDir(plan, plan.length - 1), "down");
  assert.equal(waveDir(tempoPlan(STEPS[0]), 5), null);
  assert.deepEqual(stepMeta(w), { bpm: "60–90", min: "2½" });
  assert.deepEqual(waveLevels({ from: 60, to: 70, step: 4 }), [60, 64, 68, 70, 68, 64, 60]);
});

test("Fortschritt: nächster offener Schritt, alte Erste Übung zählt, Wiederholen schadet nicht", () => {
  assert.equal(nextIndex(doneSet({})), 0);
  assert.equal(nextIndex(doneSet({}, true)), 1);
  assert.equal(nextIndex(doneSet(null)), 0);
  assert.equal(nextIndex(doneSet({ done: "kaputt" })), 0);
  let s = markDone({}, "puls");
  s = markDone(s, "doppel");
  s = markDone(s, "doppel");
  s = markDone(s, "gibtsnicht");
  assert.deepEqual(s, { done: ["puls", "doppel"] });
  assert.equal(nextIndex(doneSet(s)), 2);
  // Lücke (Schritt übersprungen): erst der früheste offene
  assert.equal(nextIndex(doneSet({ done: ["doppel", "welle"] })), 0);
  const all = STEPS.reduce((acc, x) => markDone(acc, x.id), {});
  assert.equal(nextIndex(doneSet(all)), -1);
});

test("Einstieg: alle Texte auf Englisch, keine fremden Markennamen", () => {
  const bad = /stick control|stone/i;
  const keys = ["Einstieg", "Dein Einstieg", "Weiter", "Schritt {n} von {total}", "{m} Min", "Nächste Übung", "Einstieg wiederholen", "Schneller", "Langsamer", "Höchstes Tempo", "Geschafft!", "Nochmal"];
  for (const s of STEPS) keys.push(s.title, s.head, s.text, s.lead, s.done);
  for (const k of keys) {
    assert.ok(EN[k], `EN fehlt: ${k}`);
    assert.notEqual(EN[k], k, `nicht übersetzt: ${k}`);
    assert.ok(!bad.test(k) && !bad.test(EN[k]), k);
  }
  assert.equal(EN["Schritt {n} von {total}"], "Step {n} of {total}");
});
