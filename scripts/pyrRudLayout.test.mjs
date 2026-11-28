import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ } from "../src/lib/wideLayout.js";
import {
  DIAL_LAND_CENTER_FRAC,
  DIAL_LAND_COL_FRAC,
  DIAL_LAND_COL_GAP,
  DIAL_LAND_HEADER_STACK,
  DIAL_LAND_PAGE_PAD_X,
  DIAL_LAND_PAGE_PAD_TOP,
} from "../src/lib/dialLayout.js";

const pyr = readFileSync(new URL("../src/embedded/PyramidTrainer.jsx", import.meta.url), "utf8");
const rud = readFileSync(new URL("../src/embedded/RudimentTrainer.jsx", import.meta.url), "utf8");
const click = readFileSync(new URL("../src/embedded/ClickTrainer.jsx", import.meta.url), "utf8");
const shared = readFileSync(new URL("../src/styles-dial.css", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

test("Gemeinsame Querformat-Tokens für die linke SpinDial-Spalte", () => {
  assert.equal(WIDE_MQ, "(min-width: 640px) and (orientation: landscape)");
  assert.equal(DIAL_LAND_CENTER_FRAC, 0.25);
  assert.equal(DIAL_LAND_COL_FRAC, 0.5);
  assert.equal(DIAL_LAND_COL_GAP, 16);
  assert.equal(DIAL_LAND_HEADER_STACK, 145);
  assert.equal(DIAL_LAND_PAGE_PAD_X, 12);
  assert.equal(DIAL_LAND_PAGE_PAD_TOP, 6);
  assert.match(main, /import "\.\/styles-dial\.css"/);
  assert.match(shared, /--sf-dial-col-left:\s*0px/);
  assert.match(shared, /--sf-dial-col-width:\s*50vw/);
  assert.match(shared, /--sf-land-content-left:\s*50vw/);
  assert.match(shared, /--sf-dial-col-gap:\s*16px/);
  assert.match(shared, /--sf-header-stack:\s*145px/);
  assert.match(shared, /\.page\.tool:has\(\.sf-land\) \.sf-dial-col \{/);
  assert.match(shared, /left:\s*var\(--sf-dial-col-left\)/);
  assert.match(shared, /top:\s*var\(--sf-land-top-space\)/);
  assert.match(shared, /grid-template-areas:\s*"m5\s+dial\s+p5"\s*"m10\s+dial\s+p10"/);
});

test("Click-Trainer, Rhythmuspyramide und Rudiments teilen die linke Dial-Spalte", () => {
  assert.match(click, /import \{ useDialSize \} from "\.\.\/lib\/dialLayout\.js"/);
  assert.match(click, /className="ct-wrap sf-land/);
  assert.match(click, /click-dock sf-dial-col/);
  assert.match(pyr, /import \{ useDialSize \} from "\.\.\/lib\/dialLayout\.js"/);
  assert.match(pyr, /pyramid-wrap sf-land/);
  assert.match(pyr, /pyr-dock sf-dial-col/);
  assert.match(rud, /import \{ useDialSize \} from "\.\.\/lib\/dialLayout\.js"/);
  assert.match(rud, /rud-wrap rud-tool[^"]*sf-land/);
  assert.match(rud, /rud-metro sf-dial-col/);
});

test("Rhythmuspyramide nutzt dieselbe Querformat-Schwelle wie WIDE_MQ (ab 640 px)", () => {
  assert.match(pyr, /import \{ WIDE_MQ, useWideLayout \} from "\.\.\/lib\/wideLayout\.js"/);
  assert.match(pyr, /@media \$\{WIDE_MQ\}/);
  assert.equal(pyr.includes("max-height: 820px"), false);
});

test("Rhythmuspyramide: im Querformat sitzt das SpinDial links, Noten und Auswahl rechts", () => {
  const wide = pyr.split("@media ${WIDE_MQ}")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(wide, /padding-left:\s*calc\(var\(--sf-land-content-left\) - var\(--sf-page-pad-x\)\)/);
  assert.equal(wide.includes("padding-right: calc(320px"), false);
  assert.equal(wide.includes("width: calc(320px"), false);
});

test("Rhythmuspyramide: im Querformat liegt Clip unter dem SpinDial in der linken Spalte", () => {
  assert.match(pyr, /<div className="sf-dial-clip">\s*<PracticeClip inline/);
  const wide = pyr.split("@media ${WIDE_MQ}")[1];
  assert.match(wide, /\.page\.tool\.view-pyramid \.clip-fab:not\(\.clip-inline\) \{ display:\s*none/);
});

test("Rhythmuspyramide: Hochkant bleibt das Rad unten fest verankert", () => {
  const base = pyr.split("@media ${WIDE_MQ}")[0];
  assert.match(base, /\.pyr-dock \{ position: fixed; left: 0; right: 0; bottom: 0;/);
  assert.match(base, /\.pyramid-wrap \{ scroll-margin-top: 8px; padding-bottom: calc\(220px/);
  assert.equal(base.includes("m5  dial p5"), false);
  assert.equal(base.includes("dial-row:has(.nudge-10)"), false);
});

test("Rudiments: im Querformat sitzt das SpinDial links, Noten, Ziel und Klang rechts", () => {
  assert.match(rud, /import \{ WIDE_MQ, useWideLayout \} from "\.\.\/lib\/wideLayout\.js"/);
  const wide = rud.split("@media ${WIDE_MQ}")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(wide, /padding-left:\s*calc\(var\(--sf-land-content-left\) - var\(--sf-page-pad-x\)\)/);
  assert.match(wide, /\.page\.tool\.view-rudiments \.rud-nav \{ left:\s*var\(--sf-land-content-left\)/);
  assert.match(rud, /rud-picks rud-picks-land/);
  assert.match(rud, /\{stage \|\| land \? null/);
  assert.equal(wide.includes("width: calc(316px"), false);
  assert.equal(rud.includes("332px"), false);
});

test("Rudiments: im Querformat liegt Clip unter dem SpinDial in der linken Spalte", () => {
  assert.match(rud, /<PracticeClip inline title=\{t\("Rudiments"\)\} view="rudiments"/);
  const wide = rud.split("@media ${WIDE_MQ}")[1];
  assert.match(wide, /\.page\.tool\.view-rudiments \.clip-fab:not\(\.clip-inline\) \{ display:\s*none/);
});

test("Rudiments: im kurzen Querformat behält die Notenfläche eine echte Höhe und Info liegt neben dem Pfeil", () => {
  const short = rud.split("@media ${WIDE_MQ} and (max-height: 500px)")[1];
  assert.ok(short, "kurzer Querformat-Block fehlt");
  assert.match(short, /\.rud-staff-box \{[^}]*min-height:\s*128px/s);
  assert.match(short, /\.rud-staff-box \{[^}]*height:\s*128px/s);
  assert.match(short, /\.rud-staff-box \{[^}]*flex:\s*0 0 auto/s);
  assert.match(short, /\.rud-title-row \{[^}]*padding-right:\s*66px/s);
  assert.match(short, /\.rud-info \{[^}]*top:\s*18px/s);
  const wide = rud.split("@media ${WIDE_MQ}")[1].split("@media ${WIDE_MQ} and")[0];
  assert.match(wide, /\.rud-staff-box \{[^}]*min-height:\s*112px/s);
  assert.doesNotMatch(wide, /\.rud-staff-box \{[^}]*min-height:\s*0/s);
  const base = rud.split("@media (orientation: landscape)")[0];
  assert.match(base, /\.rud-staff-box \{ height: 150px;/);
});

test("Rudiments: Hochkant behält die eine Reihe −10 −5 Rad +5 +10 und Ziel/Klang über dem Rad", () => {
  const base = rud.split("@media (orientation: landscape)")[0];
  assert.equal(base.includes("grid-template-areas"), false);
  assert.match(rud, /<div className="dial-row">\s*<Nudge by=\{-10\}[\s\S]*?<Nudge by=\{-5\}[\s\S]*?<MetronomeDial[\s\S]*?<Nudge by=\{5\}[\s\S]*?<Nudge by=\{10\}/);
  assert.match(base, /@media \(orientation: portrait\) \{\s*\.rud-wrap \.rud-metro \{\s*position: fixed;\s*left: 0;/);
});
