import { test } from "node:test";
import assert from "node:assert/strict";
import { OBJECTS, ROUNDS, newChallenge, reroll, pickObject, setRoundBpm, objectOf, clampBpm } from "../src/lib/noStick.js";
import { tempoPlan, planSeconds } from "../src/lib/beginner.js";
import { EN } from "../src/lib/en.js";

// deterministischer Zufall
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("No-Stick: Objekte eindeutig, mit Emoji und Texten (DE + EN)", () => {
  assert.ok(OBJECTS.length >= 6);
  assert.equal(new Set(OBJECTS.map((o) => o.id)).size, OBJECTS.length);
  for (const o of OBJECTS) {
    assert.ok(o.emoji && o.name && o.tip && o.yay, o.id);
    for (const k of ["name", "tip", "yay"]) assert.ok(EN[o[k]] && EN[o[k]] !== o[k], `${o.id}.${k} ohne Übersetzung`);
  }
  for (const r of ROUNDS) assert.ok(EN[r.title], r.id);
});

test("No-Stick: Runden sind leicht – 60–80 BPM, 30–60 s, ganze Takte und Handfolgen", () => {
  assert.equal(ROUNDS.length, 3);
  for (const r of ROUNDS) {
    assert.ok(r.bpm >= 60 && r.bpm <= 80, r.id);
    const plan = tempoPlan(r);
    const sec = planSeconds(plan);
    assert.ok(sec >= 30 && sec <= 60, `${r.id}: ${sec}s`);
    assert.equal(plan.length % 4, 0);
    assert.equal(plan.length % r.sticking.length, 0);
  }
});

test("No-Stick: neue Challenge hat drei verschiedene Objekte", () => {
  for (let k = 0; k < 50; k++) {
    const c = newChallenge();
    assert.equal(c.length, ROUNDS.length);
    assert.equal(new Set(c.map((r) => r.obj)).size, c.length);
    c.forEach((r, i) => assert.equal(r.id, ROUNDS[i].id));
  }
  // auch wenn der Zufall immer dasselbe liefert
  const c = newChallenge(() => 0);
  assert.equal(new Set(c.map((r) => r.obj)).size, 3);
});

test("No-Stick: Neu würfeln wechselt nur das Objekt dieser Runde – nie auf ein schon benutztes", () => {
  for (let k = 0; k < 100; k++) {
    const c = newChallenge();
    const i = k % 3;
    const n = reroll(c, i);
    assert.notEqual(n[i].obj, c[i].obj);
    assert.equal(new Set(n.map((r) => r.obj)).size, 3);
    n.forEach((r, j) => { if (j !== i) assert.deepEqual(r, c[j]); });
    assert.equal(n[i].bpm, c[i].bpm);
    assert.ok(objectOf(n[i]).emoji);
  }
  // deterministisch: Zufall 0.999… nimmt das letzte freie Objekt
  const c = newChallenge(seq(0, 0, 0));
  assert.deepEqual(c.map((r) => r.obj), OBJECTS.slice(0, 3).map((o) => o.id));
  assert.equal(reroll(c, 0, () => 0.999999)[0].obj, OBJECTS.at(-1).id);
});

test("No-Stick: pickObject meidet ausgeschlossene, SpinDial-Tempo begrenzt", () => {
  const all = OBJECTS.map((o) => o.id);
  assert.equal(pickObject(all.slice(1), () => 0.7).id, all[0]);
  assert.ok(pickObject(all, () => 0)); // alles ausgeschlossen → trotzdem eins
  assert.equal(clampBpm(20), 50);
  assert.equal(clampBpm(140), 100);
  const c = setRoundBpm(newChallenge(), 1, 64.4);
  assert.equal(c[1].bpm, 64);
  assert.equal(c[0].bpm, ROUNDS[0].bpm);
});
