import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEXICON, searchLexicon, lexEntry } from "../src/lib/lexicon.js";
import { RUDIMENT_INFO, rudimentInfo } from "../src/lib/rudimentInfo.js";

const filled = (s) => typeof s === "string" && s.trim().length > 0;

test("jeder Lexikon-Eintrag hat einen englischen Begriff und Text", () => {
  assert.ok(LEXICON.length >= 50);
  for (const e of LEXICON) {
    assert.ok(filled(e.term) && filled(e.text), `de fehlt: ${e.id}`);
    assert.ok(e.en && filled(e.en.term) && filled(e.en.text), `en fehlt: ${e.id}`);
  }
});

test("jede Rudiment-Info 1–40 hat de und en in allen Feldern", () => {
  for (let id = 1; id <= 40; id++) {
    const r = RUDIMENT_INFO[id];
    assert.ok(r, `Info fehlt: ${id}`);
    for (const k of ["what", "name", "origin", "use"]) {
      assert.ok(filled(r[k].de), `${id}.${k}.de`);
      assert.ok(filled(r[k].en), `${id}.${k}.en`);
    }
    assert.equal(rudimentInfo(id, "en").what, r.what.en);
    assert.equal(rudimentInfo(id).what, r.what.de);
  }
});

test("EN-Liste ist A–Z nach englischem Begriff, DE nach deutschem", () => {
  const en = searchLexicon("", "en").map((e) => e.term);
  assert.deepEqual(en, [...en].sort((a, b) => a.localeCompare(b, "en")));
  assert.ok(en.includes("Roll") && !en.includes("Wirbel"));
  const de = searchLexicon("").map((e) => e.term);
  assert.deepEqual(de, [...de].sort((a, b) => a.localeCompare(b, "de")));
  assert.ok(de.includes("Wirbel"));
});

test("Suche funktioniert auf Englisch", () => {
  assert.ok(searchLexicon("roll", "en").some((e) => e.term === "Roll"));
  assert.ok(searchLexicon("quarter", "en").some((e) => e.term === "Quarter note"));
  assert.equal(searchLexicon("wirbel", "en").some((e) => e.term === "Wirbel"), false);
});

test("keine Erwähnung von Stick Control oder Stone", () => {
  for (const f of ["src/lib/lexicon.js", "src/lib/rudimentInfo.js"]) {
    const s = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.ok(!/stick control/i.test(s), f);
    assert.ok(!/\bstone\b/i.test(s), f);
  }
});

test("jeder Eintrag mit Bild hat Alt-Text auf Deutsch und Englisch", () => {
  const withImg = LEXICON.filter((e) => e.img);
  assert.ok(withImg.length >= 22);
  for (const e of withImg) {
    assert.ok(e.img.startsWith("/lexikon/") && e.img.endsWith(".webp"), e.id);
    assert.ok(e.alt && e.alt.length > 3, e.id + " alt");
    assert.ok(e.en?.alt && e.en.alt.length > 3, e.id + " en.alt");
    assert.notEqual(e.en.alt, e.alt, e.id + " en.alt = de");
    assert.equal(lexEntry(e, "en").alt, e.en.alt, e.id);
    assert.equal(lexEntry(e, "de").alt, e.alt, e.id);
  }
});
