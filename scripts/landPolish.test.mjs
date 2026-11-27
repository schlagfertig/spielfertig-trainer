import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DIAL_LAND_CENTER_FRAC,
  DIAL_LAND_HEADER_STACK,
} from "../src/lib/dialLayout.js";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const top = readFileSync(new URL("../src/styles-top.css", import.meta.url), "utf8");
const dial = readFileSync(new URL("../src/styles-dial.css", import.meta.url), "utf8");
const lex = readFileSync(new URL("../src/styles-lexicon.css", import.meta.url), "utf8");
const click = readFileSync(new URL("../src/embedded/ClickTrainer.jsx", import.meta.url), "utf8");
const pyr = readFileSync(new URL("../src/embedded/PyramidTrainer.jsx", import.meta.url), "utf8");

const landTop = top.split("@media (orientation: landscape)")[1];
const baseTop = top.split("@media (orientation: landscape)")[0];

test("Zurück bekommt im Querformat eine große Tippfläche, frei von der Dynamic Island", () => {
  assert.equal(app.match(/className="ghost top-back"/g).length, 2);
  assert.match(landTop, /--sf-safe-left:\s*env\(safe-area-inset-left,\s*0px\)/);
  assert.match(landTop, /margin-left:\s*max\(0px,\s*calc\(var\(--sf-safe-left\)\s*-\s*var\(--sf-tool-pad-x\)\)\)/);
  assert.match(landTop, /\.page\.tool \.top-back \{[^}]*min-height:\s*48px/s);
  assert.match(landTop, /\.page\.tool \.top-back \{[^}]*z-index:\s*40/s);
  assert.match(landTop, /\.page\.tool \.top-back \{[^}]*pointer-events:\s*auto/s);
  assert.match(landTop, /\.page\.tool \.top-back::after \{[^}]*content:\s*""/s);
  assert.match(landTop, /\.page\.tool\.view-rudiments \.top-title[^}]*margin-left:\s*8px/s);
  assert.doesNotMatch(baseTop, /top-back/);
  assert.match(baseTop, /\.page\.tool \.top \{[^}]*flex-direction:\s*column/s);
});

test("Lexikon rückt Zurück nicht doppelt ein: der Seitenabstand enthält die Insel schon", () => {
  const wide = lex.split("@media (min-width: 640px) and (orientation: landscape)")[1]
    .split("@media (min-width: 640px) and (orientation: landscape) and (max-height: 500px)")[0];
  assert.match(wide, /--sf-tool-pad-x:\s*max\(12px,\s*env\(safe-area-inset-left,\s*0px\)\)/);
});

test("Click-Trainer und Rhythmuspyramide: rechte Spalte beginnt oben, Rad bleibt links", () => {
  assert.equal(DIAL_LAND_CENTER_FRAC, 0.25);
  assert.equal(DIAL_LAND_HEADER_STACK, 145);
  assert.match(dial, /--sf-header-stack:\s*145px/);
  assert.match(dial, /--sf-dial-col-width:\s*50vw/);
  const head = dial.split("Click-Trainer und Rhythmuspyramide")[1];
  assert.match(head, /\.page\.tool\.view-click:has\(\.sf-land\) \.top,\s*\.page\.tool\.view-pyramid:has\(\.sf-land\) \.top \{[^}]*position:\s*absolute/s);
  assert.match(head, /width:\s*calc\(var\(--sf-land-content-left\)\s*-\s*var\(--sf-page-pad-x\)\s*-\s*8px\)/);
  assert.match(head, /pointer-events:\s*none/);
  assert.match(head, /\.top-right \{[^}]*position:\s*fixed/s);
  assert.match(head, /\.top-right \{[^}]*pointer-events:\s*auto/s);
  assert.match(head, /\.top-back,\s*\.page\.tool\.view-pyramid:has\(\.sf-land\) \.top-back \{[^}]*pointer-events:\s*auto/s);
  const wideClick = click.split("@media ${WIDE_MQ}")[1].split("@media ${WIDE_MQ} and")[0];
  assert.match(wideClick, /align-self:\s*start/);
  assert.match(wideClick, /\.ct-settings > \.seg \{[^}]*width:\s*calc\(100% - 56px\)/s);
  assert.doesNotMatch(wideClick, /align-self:\s*center/);
  const widePyr = pyr.split("@media ${WIDE_MQ}")[1].split("@media ${WIDE_MQ} and")[0];
  assert.match(widePyr, /\.pyr-lead \{[^}]*margin:\s*2px 56px 8px 0/s);
  assert.match(widePyr, /\.pyramid-wrap\.focus \{[^}]*padding-top:\s*48px/s);
  const basePyr = pyr.split("@media ${WIDE_MQ}")[0];
  assert.match(basePyr, /\.pyr-lead \{[^}]*margin:\s*8px 0 10px/s);
  assert.match(basePyr, /\.pyr-dock \{ position: fixed; left: 0; right: 0; bottom: 0;/);
});
