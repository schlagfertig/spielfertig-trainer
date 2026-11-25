import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ, isWideLayout } from "../src/lib/wideLayout.js";

test("WIDE_MQ ist die vereinbarte Breite-und-Höhe-Schwelle", () => {
  assert.equal(WIDE_MQ, "(min-width: 640px) and (min-height: 560px)");
});

test("isWideLayout: Duo aufgeklappt und iPad ja, Phone und kurzes Querformat nein", () => {
  assert.equal(isWideLayout(951, 669), true);  // Duo quer
  assert.equal(isWideLayout(669, 951), true);  // Duo hochkant aufgeklappt
  assert.equal(isWideLayout(1180, 820), true); // iPad quer
  assert.equal(isWideLayout(820, 1180), true); // iPad hochkant
  assert.equal(isWideLayout(466, 678), false); // Duo zugeklappt
  assert.equal(isWideLayout(390, 844), false); // iPhone
  assert.equal(isWideLayout(844, 390), false); // iPhone quer, zu flach
  assert.equal(isWideLayout(678, 466), false); // Duo zugeklappt quer
});

test("Click-Trainer und NoClick nutzen dieselbe Media Query wie WIDE_MQ", () => {
  const files = [
    "src/embedded/ClickTrainer.jsx",
    "src/lib/NoClick.jsx",
  ];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.match(src, /WIDE_MQ/, `${f} importiert oder verwendet WIDE_MQ nicht`);
    assert.equal(src.includes("(min-width: 640px) and (min-height: 560px)") || src.includes("${WIDE_MQ}") || src.includes("WIDE_MQ"), true, `${f} weicht von der Schwelle ab`);
  }
});
