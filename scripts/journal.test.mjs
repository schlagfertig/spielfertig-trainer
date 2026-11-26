import { test } from "node:test";
import assert from "node:assert/strict";
import { exKey, toggleHw, setHwDone, removeHw, setHwNote, splitHw, notePractice, findHw, normalizeHw, toggleCard, addCard, setCardLevel, setCardNote, removeCard, noteCard, sortCards, normalizeCards, hasCard, cleanNote, MAX_NOTE } from "../src/lib/journal.js";
import { record } from "../src/lib/practiceLog.js";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";
import { HELP } from "../src/lib/helpCopy.js";

const rud = (id, bpm = 80) => ({ key: exKey("rudiments", id), ex: "rudiments", item: id, label: `R${id}`, preset: { rud: id, bpm }, sessions: { rudiments: { sel: id, bpm } }, info: { bpm } });

test("Journal: Schlüssel je Übung, Click-Trainer je Modus", () => {
  assert.equal(exKey("rudiments", 16), "rudiments|16");
  assert.equal(exKey("stick", 3), "stick|3");
  assert.equal(exKey("click", null, "noclick"), "click|noclick");
  assert.equal(exKey("click", null, "ramp"), "click|ramp");
  assert.equal(exKey("click", null, undefined), "click|hold");
  assert.equal(exKey("pyramid", null), "pyramid");
  assert.equal(exKey("first", "puls"), "first|puls");
});

test("Hausaufgaben: Knopf schaltet um, Einstellungen bleiben dran", () => {
  let r = toggleHw(null, rud(16, 72), 1000);
  assert.ok(r.added);
  const x = r.list.items[0];
  assert.equal(x.view, "rudiments");
  assert.deepEqual(x.preset, { rud: 16, bpm: 72 });
  assert.equal(x.done, false);
  r = toggleHw(r.list, rud(16, 90), 2000); // nochmal tippen = raus
  assert.ok(!r.added);
  assert.equal(r.list.items.length, 0);
});

test("Hausaufgaben: kein Rudiment-Würfel - Knopf tut nichts, alte Einträge stören nicht", () => {
  const dice = { key: "dice", ex: "dice", item: null, label: "", preset: null, sessions: {}, info: {} };
  const r = toggleHw(null, dice, 1);
  assert.equal(r.added, false);
  assert.equal(r.list.items.length, 0);
  const old = { v: 1, items: [{ ...dice, view: "dice", done: false, at: 1 }, { ...rud(16), view: "rudiments", done: false, at: 2 }] };
  assert.deepEqual(normalizeHw(old).items.map((x) => x.key), ["rudiments|16"]);
  assert.deepEqual(splitHw(old).open.map((x) => x.key), ["rudiments|16"]);
  assert.equal(findHw(old, "dice"), null);
});

test("Tagebuch: Einstieg-Eintrag (Labs) mit Namen und Hausaufgaben-Marke", () => {
  const at = new Date(2026, 9, 19, 17, 0).getTime();
  const r = record(null, { ex: "first", item: "puls", label: "Im Puls bleiben", sec: 60, bpm: 80, at, hw: true });
  assert.equal(r.entry.id.endsWith("|first|puls"), true);
  assert.equal(r.entry.label, "Im Puls bleiben");
  assert.equal(r.entry.hw, true);
});

test("Hausaufgaben: sitzt / nochmal / entfernen, offen zuerst", () => {
  let l = toggleHw(null, rud(1), 1).list;
  l = toggleHw(l, rud(6), 2).list;
  l = toggleHw(l, rud(16), 3).list;
  l = setHwDone(l, "rudiments|6", true, 10);
  const s = splitHw(l);
  assert.deepEqual(s.open.map((x) => x.item), [16, 1]);
  assert.deepEqual(s.done.map((x) => x.item), [6]);
  l = setHwDone(l, "rudiments|6", false);
  assert.equal(splitHw(l).done.length, 0);
  l = removeHw(l, "rudiments|1");
  assert.deepEqual(normalizeHw(l).items.map((x) => x.item), [16, 6]);
});

test("Hausaufgaben: Üben merkt sich die Zeit, nur offene zählen fürs Tagebuch", () => {
  let l = toggleHw(null, rud(16), 1).list;
  const n = notePractice(l, "rudiments|16", 5000);
  assert.ok(n.hit);
  assert.equal(n.list.items[0].lastAt, 5000);
  assert.equal(n.list.items[0].runs, 1);
  assert.ok(!notePractice(l, "rudiments|2", 5000).hit);
  l = setHwDone(n.list, "rudiments|16", true);
  assert.equal(findHw(l, "rudiments|16", { open: true }), null);
  assert.ok(findHw(l, "rudiments|16"));
});

test("Karteikasten: Karte rein/raus, Stufen, Üben macht aus Neu „Übe ich“", () => {
  let l = toggleCard(null, 16, 1).list;
  assert.ok(hasCard(l, 16));
  l = addCard(l, 16); // doppelt bleibt einfach
  assert.equal(normalizeCards(l).cards.length, 1);
  l = addCard(l, 6, 2);
  l = setCardLevel(l, 6, "sitzt");
  l = setCardLevel(l, 6, "quatsch"); // ungültig: bleibt
  assert.equal(normalizeCards(l).cards.find((c) => c.rud === 6).level, "sitzt");
  const n = noteCard(l, 16, 9000);
  assert.ok(n.hit);
  const c16 = normalizeCards(n.list).cards.find((c) => c.rud === 16);
  assert.equal(c16.level, "uebe");
  assert.equal(c16.lastAt, 9000);
  assert.equal(normalizeCards(noteCard(n.list, 6, 9500).list).cards.find((c) => c.rud === 6).level, "sitzt");
  l = addCard(n.list, 1, 3);
  assert.deepEqual(sortCards(l).map((c) => c.rud), [16, 1, 6]); // Übe ich, Neu, Sitzt
  assert.ok(!hasCard(removeCard(l, 16), 16));
  assert.equal(toggleCard(l, 16).added, false);
});

test("Tagebuch: Hausaufgabe wird markiert und bleibt markiert, sonst unverändert", () => {
  const at = new Date(2026, 9, 19, 17, 0).getTime();
  const plain = record(null, { ex: "rudiments", item: 16, label: "Single Paradiddle", sec: 60, bpm: 80, at });
  assert.ok(!("hw" in plain.entry)); // ohne Journal genau wie bisher
  const hw = record(plain.log, { ex: "rudiments", item: 16, label: "Single Paradiddle", sec: 40, bpm: 90, at: at + 1000, hw: true });
  assert.equal(hw.entry.hw, true);
  const again = record(hw.log, { ex: "rudiments", item: 16, sec: 40, bpm: 70, at: at + 2000 });
  assert.equal(again.entry.hw, true);
  assert.equal(record(null, { ex: "click", sec: 20, bpm: 80, at, hw: true }).entry, null); // unter 30 s zählt nicht
});

test("Journal: Texte übersetzt", () => {
  const EN_ALL = { ...EN, ...EN2 };
  for (const [k, v] of HELP.journal) { assert.ok(EN_ALL[k], `EN fehlt: ${k}`); assert.ok(EN_ALL[v], `EN fehlt: ${v}`); }
  for (const k of ["Zu Hausaufgaben", "In den Karteikasten", "Hausaufgabe", "Übe ich", "Sitzt", "Karteikasten"]) assert.ok(EN2[k], k);
});

test("Notiz: an Hausaufgabe und Karteikarte setzen, ändern, löschen", () => {
  let l = toggleHw(null, rud(16), 1).list;
  l = setHwNote(l, "rudiments|16", "  Ziel: 96 BPM, locker aus dem Handgelenk  ");
  assert.equal(l.items[0].note, "Ziel: 96 BPM, locker aus dem Handgelenk");
  l = setHwNote(l, "rudiments|16", "Akzent auf die 2");
  assert.equal(l.items[0].note, "Akzent auf die 2");
  l = setHwNote(l, "rudiments|16", "   \n  ");
  assert.ok(!("note" in l.items[0]));
  // unbekannter Schlüssel ändert nichts
  const same = setHwNote(l, "rudiments|99", "x");
  assert.equal(same.items[0].note, undefined);
  assert.equal(l.items.length, 1);
});

test("Notiz: Karteikarte setzen, ändern, löschen; alte Einträge ohne note bleiben gültig", () => {
  let l = toggleCard(null, 16, 1).list;
  assert.ok(!("note" in l.cards[0]));
  l = setCardNote(l, 16, "Akzent auf die 2");
  assert.equal(l.cards[0].note, "Akzent auf die 2");
  l = setCardNote(l, 16, "  88 BPM  ");
  assert.equal(l.cards[0].note, "88 BPM");
  l = setCardNote(l, 16, "");
  assert.ok(!("note" in l.cards[0]));
  const old = { v: 1, cards: [{ rud: 1, level: "neu", at: 1, lastAt: 0 }] };
  const n = normalizeCards(old);
  assert.deepEqual(n.cards[0], { rud: 1, level: "neu", at: 1, lastAt: 0 });
  const oldHw = { v: 1, items: [{ key: "pyramid", ex: "pyramid", view: "pyramid", done: false, at: 1, lastAt: 0, runs: 0 }] };
  assert.ok(!("note" in normalizeHw(oldHw).items[0]));
});

test("Notiz: bleibt beim Abhaken, Stufenwechseln und Üben erhalten; leere und zu lange Werte werden aufgeräumt", () => {
  let l = setHwNote(toggleHw(null, rud(16), 1).list, "rudiments|16", "locker bleiben");
  l = setHwDone(l, "rudiments|16", true, 10);
  assert.equal(l.items[0].note, "locker bleiben");
  assert.equal(notePractice(l, "rudiments|16", 20).list.items[0].note, "locker bleiben");
  let c = setCardNote(toggleCard(null, 6, 1).list, 6, "Ziel: 80 BPM");
  c = setCardLevel(c, 6, "uebe");
  assert.equal(c.cards[0].note, "Ziel: 80 BPM");
  assert.equal(noteCard(c, 6, 30).list.cards[0].note, "Ziel: 80 BPM");
  assert.equal(cleanNote("  a\n\nb  "), "a\n\nb");
  assert.equal(cleanNote(null), "");
  assert.equal(cleanNote("x".repeat(MAX_NOTE + 40)).length, MAX_NOTE);
  const trimmed = setHwNote(toggleHw(null, rud(1), 1).list, "rudiments|1", "x".repeat(MAX_NOTE + 40));
  assert.equal(trimmed.items[0].note.length, MAX_NOTE);
  const empty = normalizeHw({ v: 1, items: [{ ...rud(1), view: "rudiments", done: false, at: 1, lastAt: 0, runs: 0, note: "   " }] });
  assert.ok(!("note" in empty.items[0]));
});

test("Notiz: Texte übersetzt", () => {
  const EN_ALL = { ...EN, ...EN2 };
  for (const k of ["Notiz", "Notiz hinzufügen", "Notiz bearbeiten", "Speichern", "Abbrechen", "z. B. Ziel: 96 BPM, locker aus dem Handgelenk"]) {
    assert.ok(EN_ALL[k], k);
  }
  assert.equal(EN2["Notiz hinzufügen"], "Add a note");
  assert.equal(EN2["Notiz bearbeiten"], "Edit note");
});
