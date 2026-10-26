import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EN2 } from "../src/lib/en2.js";
import { TRI_LEN } from "../src/lib/handTernary.js";
import {
  BINARY_QUARTERS_PER_REP,
  TERNARY_QUARTERS_PER_REP,
  formatDuration,
  fokusRun,
  remainingSec,
} from "../src/lib/stickDuration.js";

const SRC = readFileSync(new URL("../src/embedded/StickControl.jsx", import.meta.url), "utf8");

test("80 BPM, 4 Wiederholungen, 1 Takt Einzählen, Nr. 1–24 = 9:39", () => {
  const run = fokusRun({ startId: 1, reps: 4, countBars: 1, bpm: 80 });
  assert.equal(run.exercises, 24);
  assert.equal(run.from, 1);
  assert.equal(run.to, 24);
  // 24 Übungen × 4 × 8 Viertel + 4 Viertel Einzählen, bei 80 BPM = 0,75 s
  assert.equal(run.totalSec, 579);
  assert.deepEqual(formatDuration(run.totalSec), { clock: "9:39", unit: "m" });
});

test("Freemium spielt nur bis zur ersten geschlossenen Nummer", () => {
  const open = (id) => id <= 2;
  const both = fokusRun({ startId: 1, reps: 4, countBars: 1, bpm: 80, isOpen: open });
  assert.deepEqual([both.exercises, both.from, both.to, both.totalSec], [2, 1, 2, 51]);
  assert.deepEqual(formatDuration(both.totalSec), { clock: "51", unit: "s" });
  const only2 = fokusRun({ startId: 2, reps: 4, countBars: 1, bpm: 80, isOpen: open });
  assert.equal(only2.exercises, 1);
  assert.equal(only2.totalSec, 27);
  const locked = fokusRun({ startId: 3, reps: 4, countBars: 1, bpm: 80, isOpen: open });
  assert.equal(locked.exercises, 0);
  assert.equal(locked.totalSec, 0);
});

test("eine Wiederholung ohne Einzählen bei 60 BPM dauert 8 Sekunden (2 Takte)", () => {
  const run = fokusRun({ startId: 24, reps: 1, countBars: 0, bpm: 60 });
  assert.equal(run.exercises, 1);
  assert.equal(run.totalSec, 8);
  assert.deepEqual(formatDuration(run.totalSec), { clock: "8", unit: "s" });
});

test("Einzählen kommt nur einmal, nicht zwischen den Nummern", () => {
  const one = fokusRun({ startId: 1, reps: 1, countBars: 2, bpm: 60, total: 1 });
  assert.equal(one.totalSec, 16);
  const two = fokusRun({ startId: 1, reps: 1, countBars: 2, bpm: 60, total: 2 });
  assert.equal(two.totalSec, 24);
});

test("ternär: ein Takt je Wiederholung", () => {
  const run = fokusRun({ startId: 5, reps: 2, countBars: 0, bpm: 90, ternary: true, total: 5 });
  assert.equal(run.exercises, 1);
  assert.ok(Math.abs(run.totalSec - 16 / 3) < 1e-9);
  assert.deepEqual(formatDuration(run.totalSec), { clock: "5", unit: "s" });
});

test("BPM unter 30 zählt wie der Scheduler als 30, Wiederholungen bleiben bei 1–20", () => {
  const slow = fokusRun({ startId: 1, reps: 1, countBars: 0, bpm: 10, total: 1 });
  const at30 = fokusRun({ startId: 1, reps: 1, countBars: 0, bpm: 30, total: 1 });
  assert.equal(slow.totalSec, at30.totalSec);
  assert.equal(at30.totalSec, 16);
  assert.equal(fokusRun({ reps: 0, total: 1, countBars: 0, bpm: 60 }).reps, 1);
  assert.equal(fokusRun({ reps: 99, total: 1, countBars: 0, bpm: 60 }).reps, 20);
  assert.equal(fokusRun({ countBars: 5, total: 1, reps: 1, bpm: 60 }).countBars, 2);
});

test("Restzeit folgt der Audio-Uhr und dem Tempo, das jetzt gilt", () => {
  assert.equal(remainingSec({ cycleStart: 10, now: 10, cyclesDone: 0, cyclesTotal: 4, repSec: 6 }), 24);
  assert.equal(remainingSec({ cycleStart: 10, now: 12, cyclesDone: 0, cyclesTotal: 4, repSec: 6 }), 22);
  assert.equal(remainingSec({ cycleStart: 16, now: 16, cyclesDone: 1, cyclesTotal: 4, repSec: 3 }), 9);
  assert.ok(Math.abs(remainingSec({ cycleStart: 40, now: 39.4, cyclesDone: 4, cyclesTotal: 4, repSec: 6 }) - 0.6) < 1e-9);
  assert.equal(remainingSec({ cycleStart: 40, now: 41, cyclesDone: 4, cyclesTotal: 4, repSec: 6 }), 0);
});

test("Anzeige: Sekunden unter einer Minute, sonst m:ss", () => {
  assert.deepEqual(formatDuration(0), { clock: "0", unit: "s" });
  assert.deepEqual(formatDuration(59.4), { clock: "59", unit: "s" });
  assert.deepEqual(formatDuration(59.6), { clock: "1:00", unit: "m" });
  assert.deepEqual(formatDuration(772), { clock: "12:52", unit: "m" });
});

test("Fokus-Dauer hängt am echten Scheduler (Takte, Wiederholungen, Einzählen einmal)", () => {
  assert.match(SRC, /const CELL_STEPS = 32/);
  assert.match(SRC, /const Q_PER_BAR = 4/);
  assert.match(SRC, /const clicks = barsIn \* Q_PER_BAR/);
  assert.match(SRC, /cycleStart \+= clicks \* q/);
  assert.match(SRC, /cycleStart \+= cellSteps \* stepSec\(\)/);
  assert.match(SRC, /return is3 \? q \/ 3 : q \/ 4/);
  assert.equal(BINARY_QUARTERS_PER_REP, 32 / 4);
  assert.equal(TERNARY_QUARTERS_PER_REP, TRI_LEN / 3);
  // Klang-Schalter bleibt: Tom / Snare über playStick, Click als anderer Klang
  assert.match(SRC, /playStick\(ctx, nt\.hand, when, !!nt\.acc\)/);
  assert.match(SRC, /t\("Tom \/ Snare"\)/);
});

test("Fokus zeigt die Dauer vor dem Start und die Restzeit beim Spielen", () => {
  assert.match(SRC, /\{challenge && run\.exercises > 0 \? \(/);
  assert.match(SRC, /t\("du brauchst etwa"\)/);
  assert.match(SRC, /t\("noch"\)/);
  assert.match(SRC, /className=\{playing \? "stick-dur run" : "stick-dur"\}/);
  const keys = [
    "du brauchst etwa",
    "noch",
    "Sekunde",
    "Nr. {n} · {reps}×",
    "Nr. {from}–{to} · {n}× je Übung",
    "plus 1 Takt Einzählen",
    "plus 2 Takte Einzählen",
    "1-24 durchspielen. Wiederholungen = komplette Übung (beide Takte). Einzählen nur am Start, nicht zwischen den Nummern. Oben siehst du, wie lange du brauchst - und beim Spielen, was noch übrig ist.",
  ];
  for (const key of keys) {
    assert.equal(typeof EN2[key], "string", key);
    assert.notEqual(EN2[key], key, key);
  }
});
