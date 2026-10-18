import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EN2 } from "../src/lib/en2.js";
import { HELP } from "../src/lib/helpCopy.js";
import { CHANGELOG } from "../src/lib/changelog.js";

const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("Fix-Paket: neue/geänderte deutsche Texte haben eine englische Fassung (en2.js)", () => {
  const keys = [];
  for (const f of ["App.jsx", "lib/EtudeDice.jsx", "lib/TesterFeedback.jsx"]) {
    for (const m of src(f).matchAll(/t\("([^"]+)"/g)) if (m[1] in EN2) keys.push(m[1]);
  }
  for (const rows of Object.values(HELP)) for (const [k, v] of rows) if (v in EN2) keys.push(v);
  assert.ok(keys.length >= 8, `nur ${keys.length} Treffer`);
  for (const [de, en] of Object.entries(EN2)) assert.ok(en && en !== de, de);
});

test("Rudiment-Würfel: „Übung“ statt „Etüde“, Etikett Rudiment, Button einheitlich", () => {
  const app = src("App.jsx"), dice = src("lib/EtudeDice.jsx");
  assert.doesNotMatch(app + dice, /deine eigene Etüde/);
  assert.match(app, /\$\{t\("Neu"\)\} · Rudiment/);
  assert.doesNotMatch(dice, /t\("Neu würfeln"\)/);
  assert.doesNotMatch(JSON.stringify(HELP.dice) + JSON.stringify(HELP.home), /Etüde/);
  const n = CHANGELOG.find((d) => d.date === "2026-10-17").items[0];
  assert.match(n.de, /deine eigene Übung/);
  assert.match(n.en, /your own exercise/);
  // Snare-Etüden (11.10.) bleiben, wie sie sind
  assert.ok(CHANGELOG.some((d) => d.items.some((i) => /Snare-Etüden/.test(i.de))));
});
