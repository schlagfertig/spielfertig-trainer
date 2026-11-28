import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const click = readFileSync(new URL("../src/embedded/ClickTrainer.jsx", import.meta.url), "utf8");
const wide = click.split("@media ${WIDE_MQ}")[1].split("@media ${WIDE_MQ} and")[0];
const base = click.split("@media ${WIDE_MQ}")[0];

test("Modus-Tabs: ganze Fläche mindestens 44 px, Taps werden nicht zum Scrollen", () => {
  assert.match(base, /\.ct-modes button \{[^}]*min-height:\s*44px/s);
  assert.match(base, /\.ct-modes button \{[^}]*touch-action:\s*manipulation/s);
  assert.match(wide, /\.ct-settings > \.seg button \{[^}]*min-height:\s*44px/s);
  assert.match(wide, /\.ct-settings > \.seg button \{[^}]*touch-action:\s*manipulation/s);
});

test("Modusleiste endet vor dem ?, auch wenn die Safe Area rechts breit ist", () => {
  assert.match(wide, /safe-area-inset-right/);
  assert.match(
    wide,
    /margin-right:\s*calc\(\s*max\(0px,\s*max\(8px,\s*env\(safe-area-inset-right,\s*0px\)\)\s*\+\s*44px\s*-\s*var\(--sf-page-pad-x,\s*12px\)\)\s*\+\s*10px\s*\)/s,
  );
  assert.doesNotMatch(click, /width:\s*calc\(100% - 56px\)/);
});
