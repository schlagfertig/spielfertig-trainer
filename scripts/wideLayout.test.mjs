import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ, WIDE_COMPACT_MQ, isWideLayout, isWideCompact } from "../src/lib/wideLayout.js";

test("WIDE_MQ ist jedes Querformat ab 640 px Breite", () => {
  assert.equal(WIDE_MQ, "(min-width: 640px) and (orientation: landscape)");
});

test("WIDE_COMPACT_MQ ist das kurze Querformat unter 500 px Höhe", () => {
  assert.equal(WIDE_COMPACT_MQ, "(min-width: 640px) and (orientation: landscape) and (max-height: 500px)");
});

test("isWideLayout: Querformat auf iPhone, Duo aufgeklappt und iPad, Hochkant nein", () => {
  assert.equal(isWideLayout(951, 669), true);  // Duo quer
  assert.equal(isWideLayout(669, 951), false); // Duo hochkant: Rad darunter
  assert.equal(isWideLayout(1180, 820), true); // iPad quer
  assert.equal(isWideLayout(820, 1180), false); // iPad hochkant: Rad darunter
  assert.equal(isWideLayout(466, 678), false); // Duo zugeklappt hochkant
  assert.equal(isWideLayout(390, 844), false); // iPhone hochkant
  assert.equal(isWideLayout(844, 390), true);  // iPhone quer
  assert.equal(isWideLayout(932, 430), true);  // iPhone Pro Max quer
  assert.equal(isWideLayout(678, 466), true);  // Duo zugeklappt quer
});

test("isWideCompact: nur kurzes Querformat", () => {
  assert.equal(isWideCompact(844, 390), true);
  assert.equal(isWideCompact(932, 430), true);
  assert.equal(isWideCompact(678, 466), true);
  assert.equal(isWideCompact(951, 669), false);
  assert.equal(isWideCompact(1180, 820), false);
  assert.equal(isWideCompact(390, 844), false);
});

test("Click-Trainer und NoClick nutzen dieselbe Media Query wie WIDE_MQ", () => {
  const files = [
    "src/embedded/ClickTrainer.jsx",
    "src/lib/NoClick.jsx",
  ];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.match(src, /WIDE_MQ/, `${f} importiert oder verwendet WIDE_MQ nicht`);
    assert.equal(
      src.includes("(min-width: 640px) and (orientation: landscape)")
        || src.includes("${WIDE_MQ}")
        || src.includes("WIDE_MQ"),
      true,
      `${f} weicht von der Schwelle ab`,
    );
    assert.equal(
      src.includes("min-height: 560px"),
      false,
      `${f} hängt noch an der alten Mindesthöhe 560px`,
    );
  }
});

test("Click-Trainer: im Querformat sitzt das SpinDial links, die Einstellungen rechts", () => {
  const src = readFileSync(new URL("../src/embedded/ClickTrainer.jsx", import.meta.url), "utf8");
  const wide = src.split("@media ${WIDE_MQ}")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(wide, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(src, /\.ct-wrap > \.ct-stage \{[^}]*grid-column:\s*1;/s);
  assert.match(src, /\.ct-settings \{[^}]*grid-column:\s*1;/s);
  assert.match(src, /\.nc-dock \{[^}]*grid-column:\s*1;/s);
  assert.match(src, /\.nc-settings \{ grid-column:\s*1;/);
});
