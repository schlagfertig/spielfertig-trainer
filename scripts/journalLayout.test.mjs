import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WIDE_MQ, WIDE_COMPACT_MQ, isWideLayout, isWideCompact } from "../src/lib/wideLayout.js";
import { EN2 } from "../src/lib/en2.js";

const journal = readFileSync(new URL("../src/lib/Journal.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles-journal.css", import.meta.url), "utf8");

test("Journal nutzt dieselbe Querformat-Schwelle wie WIDE_MQ (ab 640 px)", () => {
  assert.match(journal, /useWideLayout/);
  assert.equal(WIDE_MQ, "(min-width: 640px) and (orientation: landscape)");
  assert.match(css, /@media \(min-width: 640px\) and \(orientation: landscape\)/);
  assert.equal(isWideLayout(844, 390), true);
  assert.equal(isWideLayout(951, 669), true);
  assert.equal(isWideLayout(1180, 820), true);
  assert.equal(isWideLayout(390, 844), false);
  assert.equal(isWideLayout(669, 951), false);
  assert.equal(isWideLayout(820, 1180), false);
});

test("Querformat: zwei Reiter (Heft und Karteikasten), nicht drei Spalten", () => {
  assert.match(journal, /const LAND_TABS/);
  assert.match(journal, /id: "spread", label: "Tagebuch & Hausaufgaben"/);
  assert.match(journal, /id: "cards", label: "Karteikasten"/);
  assert.match(journal, /wide \? LAND_TABS : TABS/);
  assert.match(journal, /landTab === "spread"/);
  assert.match(journal, /className="jr-spread"/);
  // Karteikasten bleibt ein eigener Reiter, keine dritte Spalte
  assert.doesNotMatch(journal, /jr-spread[\s\S]{0,400}Karteikasten[\s\S]{0,200}jr-spread-col/);
});

test("Heft-Ansicht: Tagebuch links, Hausaufgaben rechts, feine Buchfalz, unabhängig scrollbar", () => {
  const wide = css.split("@media (min-width: 640px) and (orientation: landscape)")[1];
  assert.ok(wide, "WIDE_MQ-Block fehlt");
  assert.match(wide, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(journal, /className="jr-spread-col is-left"/);
  assert.match(journal, /className="jr-spread-col is-right"/);
  assert.match(journal, /<PracticeDiary \/>/);
  assert.match(journal, /<Homework onOpen=\{onOpen\} \/>/);
  // left column comes before right column in the spread markup
  const spread = journal.split('className="jr-spread"')[1];
  assert.ok(spread.indexOf("is-left") < spread.indexOf("is-right"));
  assert.ok(spread.indexOf("PracticeDiary") < spread.indexOf("Homework"));
  assert.match(wide, /\.jr-spread-col\.is-right \{[^}]*border-left:/s);
  assert.match(wide, /\.jr-spread-col \{[^}]*overflow:\s*auto/s);
});

test("Kurzes Querformat: beide Spalten bleiben unabhängig scrollbar", () => {
  assert.equal(WIDE_COMPACT_MQ, "(min-width: 640px) and (orientation: landscape) and (max-height: 500px)");
  assert.equal(isWideCompact(844, 390), true);
  assert.match(css, /@media \(min-width: 640px\) and \(orientation: landscape\) and \(max-height: 500px\)/);
  const compact = css.split("@media (min-width: 640px) and (orientation: landscape) and (max-height: 500px)")[1];
  assert.ok(compact, "kompakter WIDE-Block fehlt");
  // Die Overflow-Regel steht im allgemeinen Landscape-Block und gilt auch kompakt.
  assert.match(css, /\.jr-spread-col \{[^}]*overflow:\s*auto/s);
});

test("Hochkant bleibt bei drei Reitern Tagebuch / Hausaufgaben / Karteikasten", () => {
  assert.match(journal, /const TABS = \[[^\]]*id: "diary"[^\]]*id: "hw"[^\]]*id: "cards"/s);
  assert.match(journal, /wide \? LAND_TABS : TABS/);
  // Kein jr-spread, wenn nicht wide
  assert.match(journal, /wide && landTab === "spread"/);
});

test("Neuer Reiter-Text ist auf Englisch übersetzt (British English)", () => {
  assert.equal(EN2["Tagebuch & Hausaufgaben"], "Diary & homework");
});
