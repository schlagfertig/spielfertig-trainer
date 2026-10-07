import { test } from "node:test";
import assert from "node:assert/strict";
import { CHEERS, pickCheer } from "../src/lib/cheers.js";

test("Motivation: mehrere Varianten, jede mit de und en", () => {
  assert.ok(CHEERS.length >= 4);
  for (const c of CHEERS) {
    assert.ok(c.de.trim() && c.en.trim());
    assert.notEqual(c.de, c.en);
    assert.ok(c.de.length <= 90 && c.en.length <= 90, "kurz halten");
  }
});

test("Motivation: nie zweimal dieselbe hintereinander", () => {
  for (let k = 0; k < CHEERS.length; k++) {
    const r = pickCheer("de", k, () => k / CHEERS.length);
    assert.notEqual(r.i, k);
  }
  assert.equal(pickCheer("en", -1, () => 0).text, CHEERS[0].en);
});
