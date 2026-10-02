import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TERNARY_ENABLED, TRI_LEN, triHands, triNotes } from "../src/lib/handTernary.js";

const SRC = readFileSync(new URL("../src/embedded/StickControl.jsx", import.meta.url), "utf8");

test("Hand Control ternär: vorerst ausgeblendet, Umschalter nur mit Flag", () => {
  assert.equal(TERNARY_ENABLED, false);
  // Umschalter binär/ternär hängt am Flag, und der Zustand greift nur mit Flag
  assert.match(SRC, /\{TERNARY_ENABLED \? \(\s*<div className="seg"[^]*?t\("ternär"\)/);
  assert.match(SRC, /const ternary = TERNARY_ENABLED && ternaryPick;/);
});

test("Hand Control ternär: genau ein 4/4-Takt = 12 Triolen-Achtel", () => {
  assert.equal(TRI_LEN, 12);
  for (const p of ["RLRLRLRLRLRLRLRL", "RRLRLLRLRRLRLLRL", "LLLLLLLLLLLLLLLL", "RLR"]) {
    const h = triHands(p);
    assert.equal(h.length, 12);
    assert.equal(h, (p.repeat(12)).slice(0, 12));
    const ns = triNotes(p);
    assert.deepEqual(ns.map((n) => n.t), Array.from({ length: 12 }, (_, i) => i));
    // 12 Triolen-Achtel à 1/3 Viertel = 4 Viertel = ein 4/4-Takt
    assert.equal(ns.reduce((s, n) => s + n.dur, 0) / 3, 4);
  }
});

test("Hand Control: Start verwendet is3 erst nach der Deklaration", () => {
  const body = SRC.slice(SRC.indexOf("function start()"));
  const decl = body.indexOf("const is3 =");
  assert.ok(decl > 0);
  assert.equal(body.slice(0, decl).includes("is3"), false);
});
