import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const jsx = readFileSync(new URL("../src/lib/EtudeDice.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("Würfel-Einstellungen: gleiche Optionen, Beschriftung über den Chips", () => {
  assert.match(jsx, /field="len"/);
  assert.match(jsx, /field="level"/);
  assert.match(jsx, /field="meter"/);
  assert.match(jsx, /LENGTHS\.map/);
  assert.match(jsx, /LEVELS\.map/);
  assert.match(jsx, /METERS\.map/);
  assert.match(jsx, /onChange=\{setBars\}/);
  assert.match(jsx, /onChange=\{setLevel\}/);
  assert.match(jsx, /onChange=\{pickMeter\}/);
  assert.match(jsx, /saveSession\("etudeDice"/);
  assert.doesNotMatch(jsx, /ed-row/);
  assert.match(css, /\.ed-field \{[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.ed-seg button \{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.ed-roll \{[^}]*min-height:\s*44px/s);
  const narrow = css.split("@media (max-width: 520px)")[1] || "";
  assert.match(narrow, /\.ed-field-level \{[^}]*grid-column:\s*1 \/ -1/s);
});
