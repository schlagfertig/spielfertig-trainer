import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGELOG, CHANGELOG_LATEST } from "../src/lib/changelog.js";

test("Changelog hat Einträge", () => {
  assert.ok(Array.isArray(CHANGELOG) && CHANGELOG.length > 0);
});

test("jedes Datum ist gültig (JJJJ-MM-TT) und hat Einträge", () => {
  for (const day of CHANGELOG) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/, `Datum: ${day.date}`);
    const d = new Date(`${day.date}T12:00:00Z`);
    assert.equal(d.toISOString().slice(0, 10), day.date, `echtes Datum: ${day.date}`);
    assert.ok(Array.isArray(day.items) && day.items.length > 0, `Einträge für ${day.date}`);
  }
});

test("jeder Eintrag hat de und en (nicht leer)", () => {
  for (const day of CHANGELOG) {
    day.items.forEach((it, i) => {
      for (const k of ["de", "en"]) {
        assert.equal(typeof it[k], "string", `${day.date} #${i + 1} ${k}`);
        assert.ok(it[k].trim().length > 0, `${day.date} #${i + 1} ${k} leer`);
      }
      assert.notEqual(it.de.trim(), it.en.trim(), `${day.date} #${i + 1}: en ist nicht übersetzt`);
    });
  }
});

test("Daten eindeutig und neueste zuerst", () => {
  const dates = CHANGELOG.map((d) => d.date);
  assert.equal(new Set(dates).size, dates.length, "doppeltes Datum");
  for (let i = 1; i < dates.length; i++) assert.ok(dates[i - 1] > dates[i], `${dates[i - 1]} vor ${dates[i]}`);
  assert.equal(CHANGELOG_LATEST, dates[0]);
});

test("keine internen Themen in den App-Texten", () => {
  const bad = /zugang|einladung|invite|access link|secret|middleware|cookie|token|build|capacitor|vercel/i;
  for (const day of CHANGELOG) for (const it of day.items) {
    assert.ok(!bad.test(it.de) && !bad.test(it.en), `intern: ${it.de}`);
  }
});
