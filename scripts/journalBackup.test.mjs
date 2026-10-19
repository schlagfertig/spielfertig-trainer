// Journal-Umzug: Format, Prüfung, Zusammenführen ohne Doppelte, Ersetzen (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { backupFileName, buildBackup, hasJournalData, mergeBackup, parseBackup, replaceBackup } from "../src/lib/journalBackup.js";
import { record } from "../src/lib/practiceLog.js";
import { exKey, toggleHw, toggleCard } from "../src/lib/journal.js";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";

const at = new Date(2026, 9, 19, 17, 0).getTime();
const D = 86400000;
const hwEntry = (id) => ({ key: exKey("rudiments", id), ex: "rudiments", item: id, label: `R${id}`, preset: { rud: id, bpm: 80 }, sessions: { rudiments: { sel: id, bpm: 80 } }, info: { bpm: 80 } });
function device() {
  let diary = record(null, { ex: "rudiments", item: 16, sec: 600, bpm: 90, at }).log;
  diary = record(diary, { ex: "click", sec: 300, bpm: 100, at: at - D }).log;
  const homework = toggleHw(null, hwEntry(16), at).list;
  const cards = toggleCard(null, 16, at).list;
  return { diary, homework, cards };
}

test("Export: App-Kennung, Version, Datum, Dateiname", () => {
  const b = buildBackup(device(), at);
  assert.equal(b.app, "schlagfertig"); assert.equal(b.kind, "journal"); assert.equal(b.version, 1);
  assert.equal(b.diary.length, 2); assert.equal(b.homework.length, 1); assert.equal(b.karteikasten.length, 1);
  assert.equal(backupFileName(at), "schlagfertig-journal-2026-10-19.json");
});

test("Import prüft Datei: kaputt, fremd, zu neue Version, leer", () => {
  assert.equal(parseBackup("{kaputt").reason, "json");
  assert.equal(parseBackup(JSON.stringify({ exported_at: "x", version: 1, bands: [] })).reason, "app"); // Spielfertig-Live-Backup
  assert.equal(parseBackup(JSON.stringify({ app: "schlagfertig", kind: "journal", version: 2, diary: [] })).reason, "version");
  assert.equal(parseBackup(JSON.stringify({ app: "schlagfertig", kind: "journal", version: 1 })).reason, "empty");
  assert.equal(parseBackup("\uFEFF" + JSON.stringify(buildBackup(device(), at))).ok, true);
});

test("Import säubert: Hausaufgabe schreibt nur Übe-Einstellungen zurück", () => {
  const b = buildBackup(device(), at);
  b.homework[0].sessions.lang = { lang: "xx" }; b.homework[0].sessions.feedback = { consent: true };
  b.diary.push({ id: "x", day: "kein Datum", ex: "rudiments", sec: 100 }, { id: "y", day: "2026-10-01", ex: "click", sec: -5 });
  const r = parseBackup(JSON.stringify(b));
  assert.deepEqual(Object.keys(r.data.homework[0].sessions), ["rudiments"]);
  assert.equal(r.data.diary.length, 2);
  assert.ok(r.data.diary.every((e) => e.toast === true)); // kein „Eingetragen!“-Hinweis für alte Einträge
});

test("Zusammenführen: in leeres Gerät alles, gleiche Datei nochmal ohne Doppelte, nichts geht verloren", () => {
  const data = parseBackup(JSON.stringify(buildBackup(device(), at))).data;
  const empty = { diary: null, homework: null, cards: null };
  assert.equal(hasJournalData(empty), false);
  const m1 = mergeBackup(empty, data);
  assert.deepEqual(m1.added, { entries: 2, updated: 0, homework: 1, cards: 1 });
  const m2 = mergeBackup(m1, data);
  assert.deepEqual(m2.added, { entries: 0, updated: 0, homework: 0, cards: 0 });
  assert.equal(m2.diary.entries.length, 2); assert.equal(m2.homework.items.length, 1); assert.equal(m2.cards.cards.length, 1);
  // anderes Gerät mit eigenem Eintrag am selben Tag: höherer Wert gewinnt, eigener Eintrag bleibt
  let other = record(null, { ex: "rudiments", item: 16, sec: 120, bpm: 120, at }).log;
  other = record(other, { ex: "pyramid", sec: 200, bpm: 70, at: at - 3 * D }).log;
  const m3 = mergeBackup({ diary: other, homework: null, cards: toggleCard(null, 5, at).list }, data);
  assert.deepEqual(m3.added, { entries: 1, updated: 1, homework: 1, cards: 1 });
  const same = m3.diary.entries.find((e) => e.id.endsWith("|rudiments|16"));
  assert.equal(same.sec, 600); assert.equal(same.bpm, 120);
  assert.ok(m3.diary.entries.some((e) => e.ex === "pyramid"));
  assert.deepEqual(m3.cards.cards.map((c) => c.rud).sort((a, b) => a - b), [5, 16]);
});

test("Ersetzen: nur die Daten aus der Datei", () => {
  const data = parseBackup(JSON.stringify(buildBackup(device(), at))).data;
  const r = replaceBackup(data);
  assert.equal(r.diary.entries.length, 2); assert.equal(r.homework.items.length, 1); assert.equal(r.cards.cards.length, 1);
});

test("Umzug: Texte übersetzt", () => {
  const EN_ALL = { ...EN, ...EN2 };
  for (const k of ["Exportieren", "Importieren", "Zusammenführen", "Ersetzen", "Abbrechen", "Kopieren", "Datei speichern", "Ja, ersetzen"]) assert.ok(EN_ALL[k], k);
});
