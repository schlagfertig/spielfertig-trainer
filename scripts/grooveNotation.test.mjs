import { test } from "node:test";
import assert from "node:assert/strict";
import { beatLayout } from "../src/lib/grooveNotation.js";

const durs = (L) => L.notes.map((n) => n.dur);

test("leerer Schlag: Viertelpause", () => {
  const L = beatLayout([]);
  assert.equal(L.empty, true);
  assert.deepEqual(L.rests, [{ kind: "4", pos: 0 }]);
});

test("1. und 4. 16tel: punktierte Achtel plus 16tel mit kurzem Balken nach links", () => {
  const L = beatLayout([0, 3]);
  assert.deepEqual(durs(L), [3, 1]);
  assert.equal(L.notes[0].dot, true);
  assert.deepEqual(L.beam, [0, 3]);
  assert.deepEqual(L.sub, []);
  assert.deepEqual(L.stubs, [{ pos: 3, dir: -1 }]);
});

test("1-2-4: 16tel, Achtel, 16tel mit zwei kurzen Balken", () => {
  const L = beatLayout([0, 1, 3]);
  assert.deepEqual(durs(L), [1, 2, 1]);
  assert.deepEqual(L.stubs, [{ pos: 0, dir: 1 }, { pos: 3, dir: -1 }]);
  assert.deepEqual(L.sub, []);
});

test("vier 16tel: ein durchgehender zweiter Balken", () => {
  const L = beatLayout([0, 1, 2, 3]);
  assert.deepEqual(L.sub, [[0, 3]]);
  assert.deepEqual(L.stubs, []);
});

test("1-3: zwei Achtel ohne zweiten Balken", () => {
  const L = beatLayout([0, 2]);
  assert.deepEqual(durs(L), [2, 2]);
  assert.deepEqual(L.sub, []);
  assert.deepEqual(L.stubs, []);
});

test("1-2: 16tel plus punktierte Achtel", () => {
  const L = beatLayout([0, 1]);
  assert.deepEqual(durs(L), [1, 3]);
  assert.equal(L.notes[1].dot, true);
  assert.deepEqual(L.stubs, [{ pos: 0, dir: 1 }]);
});

test("1-2-3: zwei 16tel plus Achtel", () => {
  const L = beatLayout([0, 1, 2]);
  assert.deepEqual(L.sub, [[0, 1]]);
  assert.deepEqual(L.stubs, []);
});

test("2-4: 16tel-Pause, Achtel, 16tel", () => {
  const L = beatLayout([1, 3]);
  assert.deepEqual(L.rests, [{ kind: "16", pos: 0 }]);
  assert.deepEqual(durs(L), [2, 1]);
  assert.deepEqual(L.stubs, [{ pos: 3, dir: -1 }]);
});

test("einzelne Noten: Viertel, punktierte Achtel, Achtel, 16tel mit passenden Pausen", () => {
  assert.deepEqual(beatLayout([0]).notes, [{ pos: 0, dur: 4, dot: false, flag: "" }]);
  assert.deepEqual(beatLayout([1]).notes, [{ pos: 1, dur: 3, dot: true, flag: "8" }]);
  assert.deepEqual(beatLayout([2]).notes, [{ pos: 2, dur: 2, dot: false, flag: "8" }]);
  assert.deepEqual(beatLayout([3]).notes, [{ pos: 3, dur: 1, dot: false, flag: "16" }]);
  assert.deepEqual(beatLayout([3]).rests, [{ kind: "8", pos: 0 }, { kind: "16", pos: 2 }]);
  assert.equal(beatLayout([1]).beam, null);
});

test("doppelte Positionen (mehrere Stimmen) zählen einmal", () => {
  assert.deepEqual(durs(beatLayout([0, 0, 3, 3])), [3, 1]);
});

test("alle 16 Kombinationen: Dauern füllen genau einen Schlag", () => {
  for (let m = 0; m < 16; m++) {
    const P = [0, 1, 2, 3].filter((k) => m & (1 << k));
    const L = beatLayout(P);
    const restLen = L.rests.reduce((s, r) => s + ({ "4": 4, "8": 2, "16": 1 })[r.kind], 0);
    assert.equal(restLen + durs(L).reduce((a, b) => a + b, 0), 4, `Maske ${m}`);
  }
});
