import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ } from "../src/lib/wideLayout.js";

const pyr = readFileSync(new URL("../src/embedded/PyramidTrainer.jsx", import.meta.url), "utf8");
const rud = readFileSync(new URL("../src/embedded/RudimentTrainer.jsx", import.meta.url), "utf8");

test("Rhythmuspyramide nutzt dieselbe Querformat-Schwelle wie WIDE_MQ (ab 640 px)", () => {
  assert.match(pyr, /import \{ WIDE_MQ \} from "\.\.\/lib\/wideLayout\.js"/);
  assert.equal(WIDE_MQ, "(min-width: 640px) and (orientation: landscape)");
  assert.match(pyr, /@media \$\{WIDE_MQ\}/);
  // Die alte Grenze max-height: 820px hat iPad 1194×834 ausgelassen und galt nur im Übungsmodus
  assert.equal(pyr.includes("max-height: 820px"), false);
});

test("Rhythmuspyramide: im Querformat sitzt das SpinDial rechts, in Einstellung und Übung", () => {
  const wide = pyr.split("@media ${WIDE_MQ}")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(wide, /\.pyramid-wrap,\s*\n\s*\.pyramid-wrap\.focus/);
  assert.match(wide, /\.pyr-dock,\s*\n\s*\.pyr-dock\.focus/);
  assert.match(wide, /padding-right:\s*calc\(320px \+ env\(safe-area-inset-right, 0px\)\)/);
  assert.match(wide, /left:\s*auto/);
  assert.match(wide, /width:\s*calc\(320px \+ env\(safe-area-inset-right, 0px\)\)/);
});

test("Rhythmuspyramide: im Querformat stehen ±5 über ±10 neben dem SpinDial", () => {
  const wide = pyr.split("@media ${WIDE_MQ}")[1];
  assert.match(wide, /grid-template-areas:\s*"m5\s+dial\s+p5"\s*"m10\s+dial\s+p10"/);
  assert.match(wide, /\.pyr-dock \.dial-row:has\(\.nudge-10\) > \.nudge-lg:nth-child\(1\) \{ grid-area:\s*m10;/);
  assert.match(wide, /\.pyr-dock \.dial-row:has\(\.nudge-10\) > \.clip-dial \{ grid-area:\s*dial;/);
});

test("Rhythmuspyramide: Hochkant bleibt das Rad unten fest verankert", () => {
  const base = pyr.split("@media ${WIDE_MQ}")[0];
  assert.match(base, /\.pyr-dock \{ position: fixed; left: 0; right: 0; bottom: 0;/);
  assert.match(base, /\.pyramid-wrap \{ scroll-margin-top: 8px; padding-bottom: calc\(220px/);
});

test("Rudiments: im Querformat stehen ±5 über ±10 neben dem SpinDial", () => {
  const land = rud.split("@media (orientation: landscape)")[1];
  assert.ok(land, "Landscape-Block fehlt");
  assert.match(land, /grid-template-areas:\s*"m5\s+dial\s+p5"\s*"m10\s+dial\s+p10"/);
  assert.match(land, /\.rud-metro \.dial-row:has\(\.nudge-10\) > \.nudge-lg:nth-child\(1\) \{ grid-area:\s*m10;/);
  assert.match(land, /\.rud-metro \.dial-row:has\(\.nudge-10\) > \.clip-dial \{ grid-area:\s*dial;/);
  // Rechte Spalte lässt Platz zum Bildschirmrand, damit +10 nicht abgeschnitten wird
  assert.match(land, /padding:\s*0 calc\(16px \+ env\(safe-area-inset-right, 0px\)\)/);
});

test("Rudiments: Hochkant behält die eine Reihe −10 −5 Rad +5 +10", () => {
  const base = rud.split("@media (orientation: landscape)")[0];
  assert.equal(base.includes("grid-template-areas"), false);
  assert.match(rud, /<div className="dial-row">\s*<Nudge by=\{-10\}[\s\S]*?<Nudge by=\{-5\}[\s\S]*?<MetronomeDial[\s\S]*?<Nudge by=\{5\}[\s\S]*?<Nudge by=\{10\}/);
});

test("Rhythmuspyramide: im Querformat liegt Clip unter dem SpinDial, nicht über der Auswahl", () => {
  const wide = pyr.split("@media ${WIDE_MQ}")[1];
  assert.match(wide, /\.page\.tool:has\(\.pyramid-wrap\) \.clip-fab/);
  assert.match(wide, /left:\s*auto/);
  assert.match(wide, /right:\s*calc\(118px \+ env\(safe-area-inset-right, 0px\)\)/);
});
