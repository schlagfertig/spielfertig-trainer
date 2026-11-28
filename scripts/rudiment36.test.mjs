// Rudiment 36 (Drag Paradiddle #1) als ein voller 4/4-Takt,
// und die große Zählzeiten-Leiste nur in Rudiments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RUDIMENTS, meterPulse, rudimentDuration } from "../src/lib/rudiments.js";
import { rudimentInfo } from "../src/lib/rudimentInfo.js";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const r36 = RUDIMENTS.find((r) => r.id === 36);
const r37 = RUDIMENTS.find((r) => r.id === 37);

test("Rudiment 36 ist ein voller 4/4-Takt, wie Rudiment 37", () => {
  assert.equal(r36.time, "4/4");
  assert.equal(r36.bars, 1);
  assert.equal(rudimentDuration(r36), 16);
  assert.deepEqual(meterPulse(r36.time), { pulse: 4, bar: 16, compound: false });
  assert.equal(r37.time, "4/4");
  assert.equal(r37.bars, 1);
  assert.equal(rudimentDuration(r37), 16);
  const end = Math.max(...r36.notes.map((n) => n.t + n.dur));
  assert.equal(end, 16);
  let cursor = 0;
  for (const n of r36.notes) {
    assert.equal(n.t, cursor, "Lücke oder Überlappung im 4/4-Takt");
    cursor += n.dur;
  }
  assert.equal(cursor, 16);
});

test("Rudiment 36: rechte Figur auf 1 und 2, linke auf 3 und 4, mit Achtelpausen", () => {
  const sounded = r36.notes.filter((n) => !n.rest);
  const rests = r36.notes.filter((n) => n.rest);
  assert.deepEqual(rests.map((n) => [n.t, n.dur]), [[6, 2], [14, 2]]);
  assert.deepEqual(
    sounded.map((n) => [n.t, n.dur, n.hand, !!n.acc, n.drag || null]),
    [
      [0, 2, "R", true, null],
      [2, 1, "R", false, "L"],
      [3, 1, "L", false, null],
      [4, 1, "R", false, null],
      [5, 1, "R", false, null],
      [8, 2, "L", true, null],
      [10, 1, "L", false, "R"],
      [11, 1, "R", false, null],
      [12, 1, "L", false, null],
      [13, 1, "L", false, null],
    ],
  );
  assert.deepEqual(r36.sticking[0], ["R", "LLR", "L", "R", "R", "L", "RRL", "R", "L", "L"]);
  assert.deepEqual(r36.sticking[1], ["L", "RRL", "R", "L", "L", "R", "LLR", "L", "R", "R"]);
  assert.equal(r36.sticking[0].length, sounded.length);
  assert.match(rudimentInfo(36, "de").what, /4\/4/);
  assert.match(rudimentInfo(36, "en").what, /4\/4/);
});

test("Playback von Rudiment 36 ist ein 4/4-Loop ohne die Pausen", () => {
  const steps = rudimentDuration(r36);
  const meter = meterPulse(r36.time);
  const clicks = [];
  for (let s = 0; s < steps; s += meter.pulse) clicks.push({ t: s, down: s % meter.bar < 0.01 });
  assert.deepEqual(clicks, [
    { t: 0, down: true },
    { t: 4, down: false },
    { t: 8, down: false },
    { t: 12, down: false },
  ]);
  const played = r36.notes.filter((n) => !n.rest).map((n) => n.t);
  assert.deepEqual(played, [0, 2, 3, 4, 5, 8, 10, 11, 12, 13]);
});

test("Pausen füllen den Takt, statt die Figur in der Notenzeile zu zentrieren", () => {
  const staff = read("../src/lib/staff.jsx");
  assert.match(staff, /const spanEnd = notes\.reduce/);
});

test("Die große Zählzeiten-Leiste ist nur in Rudiments weg", () => {
  const rud = read("../src/embedded/RudimentTrainer.jsx");
  const css = read("../src/styles.css");
  assert.equal(rud.includes("beat-track"), false);
  assert.equal(rud.includes("beat-cells"), false);
  assert.match(rud, /className=\{playing \? "beat-loop on" : "beat-loop"\}/);
  assert.match(rud, /Loop -/);
  assert.equal(css.includes(".beat-cells"), false);
  assert.equal(css.includes(".beat-track"), false);
  assert.match(read("../src/lib/NoClick.jsx"), /nc-count-nums/);
  assert.match(read("../src/embedded/ClickTrainer.jsx"), /className="count"/);
  assert.match(read("../src/embedded/PyramidTrainer.jsx"), /className="pyr-count"/);
  assert.match(read("../src/embedded/StickControl.jsx"), /className="stick-count"/);
  assert.match(read("../src/embedded/RhythmArchive.jsx"), /className="rhythm-counts"/);
  assert.match(read("../src/lib/EtudeDice.jsx"), /className="ed-bars"/);
});
