import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_SEC, MAX_SESSION_SEC, dayKey, emptyLog, record, needsToast, markToasted, removeEntry, restoreEntry, groupByDay, minutes, weekStats, createSession, bumpBpm, endSession, sessionSec, EXERCISES } from "../src/lib/practiceLog.js";
import { SLOTS, slotOf, slotsOf, monthKey, shiftMonth, monthStats } from "../src/lib/practiceLog.js";
import { EN } from "../src/lib/en.js";

const T0 = new Date(2026, 9, 17, 10, 0, 0).getTime(); // 17.10.2026 10:00 lokal
const S = 1000;

test("Übe-Tagebuch: unter 30 s am Stück zählt nicht, ab 30 s schon", () => {
  assert.equal(MIN_SEC, 30);
  let r = record(emptyLog(), { ex: "click", sec: 29, bpm: 90, at: T0 });
  assert.equal(r.entry, null);
  assert.equal(r.log.entries.length, 0);
  r = record(emptyLog(), { ex: "click", sec: 30, bpm: 90, at: T0 });
  assert.ok(r.entry && r.isNew);
  assert.equal(r.entry.sec, 30);
  assert.equal(r.entry.day, "2026-10-17");
});

test("Übe-Tagebuch: gleiche Übung am gleichen Tag wird zusammengeführt (Zeit addiert, höchstes Tempo)", () => {
  let log = record(emptyLog(), { ex: "rudiments", item: 16, label: "Single Paradiddle", sec: 120, bpm: 90, at: T0 }).log;
  const r2 = record(log, { ex: "rudiments", item: 16, label: "Single Paradiddle", sec: 60, bpm: 100, at: T0 + 3600 * S });
  assert.equal(r2.isNew, false);
  assert.equal(r2.log.entries.length, 1);
  assert.equal(r2.entry.sec, 180);
  assert.equal(r2.entry.bpm, 100);
  assert.equal(r2.entry.runs, 2);
  const r3 = record(r2.log, { ex: "rudiments", item: 16, sec: 40, bpm: 80, at: T0 + 2 * 3600 * S });
  assert.equal(r3.entry.bpm, 100, "langsamer Durchgang senkt das Höchsttempo nicht");
  // kurzes Neustarten (< 30 s) ändert nichts
  const r4 = record(r3.log, { ex: "rudiments", item: 16, sec: 10, bpm: 140, at: T0 + 3 * 3600 * S });
  assert.equal(r4.entry, null);
  assert.equal(r4.log.entries[0].bpm, 100);
});

test("Übe-Tagebuch: andere Übung oder anderer Tag = eigener Eintrag", () => {
  let log = record(emptyLog(), { ex: "rudiments", item: 1, sec: 60, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "rudiments", item: 2, sec: 60, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "click", sec: 60, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "click", sec: 60, bpm: 80, at: T0 + 24 * 3600 * S }).log;
  assert.equal(log.entries.length, 4);
  const days = groupByDay(log);
  assert.deepEqual(days.map((d) => d.day), ["2026-10-18", "2026-10-17"]);
  assert.equal(days[1].entries.length, 3);
  assert.equal(days[1].sec, 180);
});

test("Übe-Tagebuch: Session-Automat misst Start → Stop und merkt das höchste Tempo", () => {
  let s = createSession("pyramid", null, "", 80, T0);
  s = bumpBpm(s, 90);
  s = bumpBpm(s, 70);
  const seg = endSession(s, T0 + 95 * S);
  assert.deepEqual({ sec: seg.sec, bpm: seg.bpm, ex: seg.ex }, { sec: 95, bpm: 90, ex: "pyramid" });
  assert.equal(endSession(null, T0), null);
  assert.equal(sessionSec(T0, T0 - 5 * S), 0);
  assert.equal(sessionSec(T0, T0 + 10 * 3600 * S), MAX_SESSION_SEC);
});

test("Übe-Tagebuch: Hinweis nur einmal pro Übung und Tag", () => {
  let { log, entry } = record(emptyLog(), { ex: "stick", item: 3, sec: 45, bpm: 80, at: T0 });
  assert.equal(needsToast(log, entry.id), true);
  log = markToasted(log, entry.id);
  assert.equal(needsToast(log, entry.id), false);
  const again = record(log, { ex: "stick", item: 3, sec: 45, bpm: 90, at: T0 + 60 * S });
  assert.equal(needsToast(again.log, again.entry.id), false);
  const tomorrow = record(again.log, { ex: "stick", item: 3, sec: 45, bpm: 90, at: T0 + 24 * 3600 * S });
  assert.equal(needsToast(tomorrow.log, tomorrow.entry.id), true);
});

test("Übe-Tagebuch: Löschen + Rückgängig stellt den Eintrag an gleicher Stelle wieder her", () => {
  let log = record(emptyLog(), { ex: "click", sec: 60, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "pyramid", sec: 60, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "dice", sec: 60, bpm: 80, at: T0 }).log;
  const ids = log.entries.map((e) => e.id);
  const del = removeEntry(log, ids[1]);
  assert.equal(del.log.entries.length, 2);
  const back = restoreEntry(del.log, del.removed, del.index);
  assert.deepEqual(back.entries.map((e) => e.id), ids);
  assert.equal(restoreEntry(back, del.removed, 0).entries.length, 3, "doppeltes Rückgängig fügt nichts doppelt ein");
  assert.equal(removeEntry(log, "gibt-es-nicht").removed, null);
});

test("Übe-Tagebuch: Minuten, Wochenbilanz, lokaler Tag, kaputte Daten", () => {
  assert.equal(minutes(30), 1);
  assert.equal(minutes(240), 4);
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59).getTime()), "2026-01-05");
  let log = record(emptyLog(), { ex: "click", sec: 120, bpm: 80, at: T0 }).log;
  log = record(log, { ex: "click", sec: 60, bpm: 80, at: T0 - 2 * 24 * 3600 * S }).log;
  log = record(log, { ex: "click", sec: 600, bpm: 80, at: T0 - 9 * 24 * 3600 * S }).log;
  assert.deepEqual(weekStats(log, T0), { sec: 180, days: 2 });
  assert.equal(record({ entries: [null, { id: "x" }] }, { ex: "click", sec: 40, bpm: 1, at: T0 }).log.entries.length, 1);
  assert.equal(groupByDay(undefined).length, 0);
  assert.ok(EXERCISES.includes("pyramid"));
});

test("Übe-Tagebuch: Texte haben eine englische Übersetzung", () => {
  for (const k of ["Übe-Tagebuch", "Eingetragen! 🥁 {name} · {min} min · {bpm} BPM", "Rückgängig", "Eintrag gelöscht.", "Übe-Tagebuch führen"]) {
    assert.ok(EN[k] && EN[k] !== k, k);
  }
});

const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test("Monatsauswertung: Tageszeit-Fenster inkl. Nacht über Mitternacht", () => {
  assert.deepEqual(SLOTS.map((x) => x.id), ["frueh", "vormittag", "mittag", "nachmittag", "abend", "nacht"]);
  const cases = [[4, "nacht"], [5, "frueh"], [7, "frueh"], [8, "vormittag"], [11, "mittag"], [13, "mittag"], [14, "nachmittag"], [17, "nachmittag"], [18, "abend"], [21, "abend"], [22, "nacht"], [0, "nacht"]];
  for (const [h, id] of cases) assert.equal(slotOf(at(2026, 10, 17, h, 30)), id, `${h} Uhr`);
});

test("Monatsauswertung: Startzeit jeder Session landet im Eintrag (slots), alte Einträge bleiben lesbar", () => {
  let log = record(emptyLog(), { ex: "click", sec: 600, bpm: 80, start: at(2026, 10, 17, 7, 50), at: at(2026, 10, 17, 8, 0) }).log;
  log = record(log, { ex: "click", sec: 300, bpm: 90, start: at(2026, 10, 17, 19, 0), at: at(2026, 10, 17, 19, 5) }).log;
  log = record(log, { ex: "click", sec: 120, bpm: 90, start: at(2026, 10, 17, 19, 30), at: at(2026, 10, 17, 19, 32) }).log;
  assert.deepEqual(log.entries[0].slots, { frueh: 600, abend: 420 });
  assert.equal(log.entries[0].sec, 1020);
  // Altbestand ohne slots: Startzeit = at - sec
  assert.deepEqual(slotsOf({ sec: 600, at: at(2026, 10, 1, 18, 5) }), { nachmittag: 600 });
  // alter Eintrag bekommt beim Zusammenführen seine Zeit + die neue Session
  const old = { v: 1, entries: [{ id: "2026-10-01|dice|", day: "2026-10-01", ex: "dice", item: null, sec: 600, bpm: 80, runs: 1, at: at(2026, 10, 1, 18, 5), toast: true }] };
  const merged = record(old, { ex: "dice", sec: 60, bpm: 80, start: at(2026, 10, 1, 20, 0), at: at(2026, 10, 1, 20, 1) }).entry;
  assert.deepEqual(merged.slots, { nachmittag: 600, abend: 60 });
});

test("Monatsauswertung: Summe, Vergleich zum Vormonat, Lieblingszeit, Top 3", () => {
  let log = emptyLog();
  const add = (ex, item, label, min, d, h, m = 10) => { log = record(log, { ex, item, label, sec: min * 60, bpm: 80, start: at(2026, m, d, h), at: at(2026, m, d, h) + min * 60000 }).log; };
  // September: 60 min
  add("click", null, "", 60, 10, 18, 9);
  // Oktober: 90 min
  add("rudiments", 16, "Single Paradiddle", 30, 2, 18);
  add("rudiments", 16, "Single Paradiddle", 20, 5, 19);
  add("click", null, "", 25, 5, 9);
  add("stick", 3, "", 10, 6, 15);
  add("pyramid", null, "", 5, 7, 23);
  const m = monthStats(log, "2026-10");
  assert.equal(m.sec, 90 * 60);
  assert.equal(m.prev, "2026-09");
  assert.equal(m.prevSec, 60 * 60);
  assert.equal(m.diffSec, 30 * 60);
  assert.equal(m.pct, 50);
  assert.equal(m.days, 4);
  assert.equal(m.slot, "abend");
  assert.deepEqual(m.top.map((x) => [x.key, x.sec / 60]), [["rudiments|16", 50], ["click|", 25], ["stick|3", 10]]);
  assert.equal(m.top[0].label, "Single Paradiddle");
  const sep = monthStats(log, "2026-09");
  assert.equal(sep.pct, null, "ohne Vormonat kein Prozentwert");
  assert.equal(sep.earlier, false);
  add("click", null, "", 15, 3, 18, 12);
  const dec = monthStats(log, "2026-12");
  assert.deepEqual([dec.prevSec, dec.pct, dec.earlier], [0, null, true], "Pause im Vormonat, aber schon früher geübt");
  assert.equal(sep.diffSec, 60 * 60);
  const empty = monthStats(log, "2026-11");
  assert.deepEqual([empty.sec, empty.slot, empty.top.length, empty.pct], [0, null, 0, -100]);
});

test("Monatsauswertung: Monat wechseln über Jahresgrenzen", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(monthKey(at(2026, 3, 31, 23)), "2026-03");
  for (const k of ["Monatsauswertung", "früh", "Vormittag", "Mittag", "Nachmittag", "Abend", "Nacht", "Deine Lieblingszeit"]) assert.ok(EN[k] && EN[k] !== k, k);
});

test("Rudiment-Würfel (früher Etüden-Würfel): alte Einträge zählen weiter unter der id dice, kein Doppel in den Top 3", () => {
  // Alt-Eintrag wie vor der Umbenennung gespeichert (ex: "dice", ohne gespeicherten Namen)
  const old = { v: 1, entries: [{ id: "2026-10-16|dice|", day: "2026-10-16", ex: "dice", item: null, label: "", sec: 300, bpm: 80, runs: 1, at: T0 - 86400 * S, toast: true }] };
  const log = record(old, { ex: "dice", sec: 120, bpm: 90, at: T0 }).log;
  const top = monthStats(log, "2026-10").top;
  assert.equal(top.filter((x) => x.ex === "dice").length, 1);
  assert.equal(top[0].sec, 420);
  assert.equal(EN["Rudiment-Würfel"], "Rudiment Dice");
  assert.equal(EN["Etüden-Würfel"], undefined);
});
