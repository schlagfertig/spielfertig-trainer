import { test } from "node:test";
import assert from "node:assert/strict";
import { hideFirstToday, isFirstHidden } from "../src/lib/firstSkip.js";
import { EN } from "../src/lib/en.js";

test("„Nicht heute“: ausgeblendet bis Tagesende, am nächsten Tag wieder da", () => {
  const morning = new Date(2026, 9, 2, 8, 0);
  const late = new Date(2026, 9, 2, 23, 59, 59);
  const next = new Date(2026, 9, 3, 0, 0, 1);
  const saved = hideFirstToday(morning);
  assert.deepEqual(saved, { day: "2026-10-02" });
  assert.equal(isFirstHidden(saved, morning), true);
  assert.equal(isFirstHidden(saved, late), true);
  assert.equal(isFirstHidden(saved, next), false);
  assert.equal(isFirstHidden(saved, new Date(2026, 9, 1, 12)), false);
  // Monats-/Jahreswechsel
  assert.equal(isFirstHidden(hideFirstToday(new Date(2026, 11, 31, 22)), new Date(2027, 0, 1, 7)), false);
});

test("„Nicht heute“: ohne/kaputte Speicherung sichtbar", () => {
  const d = new Date(2026, 9, 2, 12);
  for (const s of [undefined, null, {}, { day: 20261002 }, { day: "" }, { day: "garbage" }]) assert.equal(isFirstHidden(s, d), false);
});

test("„Nicht heute“: Texte auf Englisch", () => {
  assert.equal(EN["Nicht heute"], "Not today");
  assert.ok(EN["Erste Übung für heute ausblenden"]);
});
