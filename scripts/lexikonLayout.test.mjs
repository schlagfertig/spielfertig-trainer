import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ, WIDE_COMPACT_MQ, isWideLayout, isWideCompact } from "../src/lib/wideLayout.js";
import { searchLexicon, pickLexiconSelection } from "../src/lib/lexicon.js";
import { EN } from "../src/lib/en.js";

const lex = readFileSync(new URL("../src/embedded/Lexicon.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles-lexicon.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("Lexikon nutzt dieselbe Querformat-Schwelle wie WIDE_MQ (ab 640 px)", () => {
  assert.match(lex, /useWideLayout/);
  assert.equal(WIDE_MQ, "(min-width: 640px) and (orientation: landscape)");
  assert.match(css, /@media \(min-width: 640px\) and \(orientation: landscape\)/);
  assert.equal(isWideLayout(844, 390), true);
  assert.equal(isWideLayout(951, 669), true);
  assert.equal(isWideLayout(1024, 768), true);
  assert.equal(isWideLayout(1180, 820), true);
  assert.equal(isWideLayout(390, 844), false);
  assert.equal(isWideLayout(669, 951), false);
  assert.equal(isWideLayout(820, 1180), false);
});

test("Querformat: links Begriffsliste, rechts Erklärung, unabhängig scrollbar", () => {
  const wide = css.split("@media (min-width: 640px) and (orientation: landscape)")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(lex, /className="lex is-wide"/);
  assert.match(lex, /className="lex-col is-index"/);
  assert.match(lex, /className="lex-col is-detail"/);
  const spread = lex.split('className="lex is-wide"')[1];
  assert.ok(spread.indexOf("is-index") < spread.indexOf("is-detail"));
  assert.match(wide, /grid-template-columns:\s*minmax\(230px,\s*0\.34fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(wide, /\.lex-index \{[^}]*overflow:\s*auto/s);
  assert.match(wide, /\.lex-col\.is-detail \{[^}]*overflow:\s*auto/s);
  assert.match(wide, /\.lex-col\.is-detail \{[^}]*border-left:/s);
  assert.match(wide, /\.page\.tool\.view-lexicon \.main \{[^}]*max-width:\s*none/s);
  // Kein Akkordeon in der Querformat-Ansicht
  const landBlock = lex.split("if (wide)")[1].split("return (\n    <div className=\"lex\">")[0];
  assert.doesNotMatch(landBlock, /<details/);
  assert.match(landBlock, /className="lex-detail"/);
  assert.match(landBlock, /lex-term/);
});

test("Buchstabenleiste umbricht und wird nicht am rechten Rand abgeschnitten", () => {
  assert.match(css, /\.lex-az \{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.lex-az \{[^}]*overflow:\s*visible/s);
  assert.doesNotMatch(css, /\.lex-az \{[^}]*overflow-x:\s*auto/s);
});

test("Hochkant bleibt bei der einspaltigen Akkordeon-Liste", () => {
  assert.match(lex, /<details className="lex-details"/);
  assert.match(lex, /onToggle=/);
  assert.match(lex, /window\.scrollTo/);
  // Die zweispaltige Klasse nur im wide-Zweig
  const port = lex.split("if (wide)")[1].split("return (\n    <div className=\"lex\">")[1];
  assert.ok(port, "Hochkant-Zweig fehlt");
  assert.doesNotMatch(port, /lex is-wide/);
  assert.doesNotMatch(port, /lex-col is-detail/);
  assert.match(port, /<details className="lex-details"/);
});

test("pickLexiconSelection behält die Auswahl oder nimmt den ersten sichtbaren Begriff", () => {
  const de = searchLexicon("", "de");
  assert.ok(de.length > 2);
  const first = de[0].id;
  const later = de[10].id;
  assert.equal(pickLexiconSelection(de, later), later);
  assert.equal(pickLexiconSelection(de, "gibt-es-nicht"), first);
  assert.equal(pickLexiconSelection(de, null), first);
  assert.equal(pickLexiconSelection([], "x"), null);
  const filtered = searchLexicon("Drumset", "de");
  assert.ok(filtered.some((e) => e.id === "drumset"));
  assert.equal(pickLexiconSelection(filtered, "drumset"), "drumset");
  assert.equal(pickLexiconSelection(filtered, first), "drumset");
});

test("bestehende Beschriftungen bleiben auf Englisch übersetzt (British English)", () => {
  assert.equal(EN["Lexikon"], "Glossary");
  assert.equal(EN["Begriff suchen"], "Search a term");
  assert.equal(EN["Buchstaben"], "Letters");
  assert.equal(EN["Kein Treffer."], "No matches.");
});

test("Lexikon nimmt optionale Deep-Link-Vorgabe (preset) entgegen", () => {
  assert.match(app, /<Lexicon preset=\{preset\} \/>/);
  assert.match(lex, /preset\?\.id \|\| preset\?\.lex/);
});

test("kurzes Querformat bleibt unabhängig scrollbar", () => {
  assert.equal(WIDE_COMPACT_MQ, "(min-width: 640px) and (orientation: landscape) and (max-height: 500px)");
  assert.equal(isWideCompact(844, 390), true);
  assert.match(css, /@media \(min-width: 640px\) and \(orientation: landscape\) and \(max-height: 500px\)/);
});
