// Öffentliche Datenschutzseite: gleiche Quelle wie die In-App-Seite, keine Google-Schriften, kein Skript.
import test from "node:test";
import assert from "node:assert/strict";
import { privacyHtml } from "./privacyHtml.mjs";
import { PRIVACY } from "../src/lib/privacyText.js";

test("privacyHtml: DE zuerst bzw. EN zuerst, alle Abschnitte, statisch", () => {
  const de = privacyHtml("de");
  const en = privacyHtml("en");
  assert.match(de, /<html lang="de">/);
  assert.match(en, /<html lang="en">/);
  assert.ok(de.indexOf('id="de"') < de.indexOf('id="en"'));
  assert.ok(en.indexOf('id="en"') < en.indexOf('id="de"'));
  for (const html of [de, en]) {
    for (const l of ["de", "en"]) for (const s of PRIVACY[l].sections) assert.ok(html.includes(s.h.replace(/&/g, "&amp;")), s.h);
    assert.doesNotMatch(html, /<script|fonts\.googleapis|fonts\.gstatic|\/assets\//);
    assert.match(html, /German version is legally binding/);
    assert.match(html, /sf_zugang/);
    assert.match(html, /BayLDA[^]*Promenade 18, 91522 Ansbach/);
    assert.doesNotMatch(html, /Landesbeauftragte/);
  }
});

test("privacyText: Google Fonts nur noch als Negativ-Hinweis, Abschnitte fortlaufend nummeriert", () => {
  for (const l of ["de", "en"]) {
    const nums = PRIVACY[l].sections.map((s) => s.h.match(/^(\d+)\./)?.[1]).filter(Boolean).map(Number);
    assert.deepEqual(nums, nums.map((_, i) => i + 1));
    const text = JSON.stringify(PRIVACY[l]);
    assert.doesNotMatch(text, /fonts\.googleapis|fonts\.gstatic/);
    assert.equal(PRIVACY[l].sections.filter((s) => /Google Fonts/.test(s.body.join?.("") ?? "")).length, 1);
  }
});
