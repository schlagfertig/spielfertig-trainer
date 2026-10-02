// WA-22: Noten-Archiv – Metadaten, Migration, Suche/Filter/Sortierung (node --test)
import test from "node:test";
import assert from "node:assert/strict";
import { allTags, applyMeta, baseName, filterSheets, fold, MAX_TAGS, normalizeMeta, normTags, parseView, suggestTags } from "../src/lib/archiveMeta.js";

const legacy = { id: "a1", name: "Paradiddle-Variationen", kind: "image", mime: "image/png", size: 11772, added: 1000, blob: { fake: true } };

test("Migration: alter Eintrag behält Name + alle Felder, bekommt leere Tags", () => {
  const m = normalizeMeta(legacy);
  assert.equal(m.name, "Paradiddle-Variationen");
  assert.deepEqual(m.tags, []);
  assert.equal(m.blob, legacy.blob);
  assert.equal(m.size, 11772);
  assert.equal(m.added, 1000);
  assert.equal(legacy.tags, undefined, "Original bleibt unverändert");
});

test("Migration: ohne Name → Dateiname ohne Endung, sonst Fallback", () => {
  assert.equal(normalizeMeta({ id: "x", fileName: "Fill-Ideen.pdf" }).name, "Fill-Ideen");
  assert.equal(normalizeMeta({ id: "x", name: "   " }, "Blatt").name, "Blatt");
  assert.equal(baseName("Groove Übung 3.jpg"), "Groove Übung 3");
});

test("Tags: trimmen, #, Dubletten (Groß/klein, Umlaute), Limit", () => {
  assert.deepEqual(normTags(" Fills , #fills; Übung,  ubung ,, Groove "), ["Fills", "Übung", "Groove"]);
  assert.deepEqual(normTags(["a", "", null, "b"]), ["a", "b"]);
  assert.equal(normTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length, MAX_TAGS);
  assert.deepEqual(normTags("Fußarbeit, FUSSARBEIT"), ["Fußarbeit"]);
});

test("applyMeta: Name/Tags setzen, Blob bleibt, leerer Name behält alten", () => {
  const r = applyMeta(legacy, { name: "  Paradiddles   Teil 1 ", tags: "Rudiments, Hände" });
  assert.equal(r.name, "Paradiddles Teil 1");
  assert.deepEqual(r.tags, ["Rudiments", "Hände"]);
  assert.equal(r.blob, legacy.blob);
  assert.equal(r.metaV, 1);
  assert.equal(applyMeta(legacy, { name: "" }).name, "Paradiddle-Variationen");
  assert.deepEqual(applyMeta({ ...legacy, tags: ["x"] }, { name: "neu" }).tags, ["x"]);
});

const rows = [
  { id: "1", name: "Paradiddle-Variationen", tags: ["Rudiments", "Hände"], added: 1 },
  { id: "2", name: "Fill-Ideen", tags: ["Fills"], added: 3 },
  { id: "3", name: "Groove Übung 3", tags: ["Groove", "rudiments"], added: 2 },
  { id: "4", name: "Technik-Blatt S. 5", added: 4 },
];

test("allTags: häufigste zuerst, Schreibweise des ersten Vorkommens", () => {
  assert.deepEqual(allTags(rows).map((x) => [x.tag, x.count]), [["Rudiments", 2], ["Fills", 1], ["Groove", 1], ["Hände", 1]]);
});

test("suggestTags: ohne vorhandene, passend zur Eingabe", () => {
  assert.deepEqual(suggestTags(allTags(rows), ["Fills"], ""), ["Rudiments", "Groove", "Hände"]);
  assert.deepEqual(suggestTags(allTags(rows), [], "han"), ["Hände"]);
});

test("filterSheets: Suche in Name + Tags, umlaut-/großschreibungs-tolerant", () => {
  assert.deepEqual(filterSheets(rows, { q: "ubung" }).map((r) => r.id), ["3"]);
  assert.deepEqual(filterSheets(rows, { q: "FILL" }).map((r) => r.id), ["2"]);
  assert.deepEqual(filterSheets(rows, { q: "hände para" }).map((r) => r.id), ["1"]);
  assert.deepEqual(filterSheets(rows, { q: "nix" }), []);
});

test("filterSheets: Tag-Filter + Kombination mit Suche", () => {
  assert.deepEqual(filterSheets(rows, { tag: "RUDIMENTS" }).map((r) => r.id), ["3", "1"]);
  assert.deepEqual(filterSheets(rows, { tag: "rudiments", q: "groove" }).map((r) => r.id), ["3"]);
});

test("filterSheets: Sortierung neueste / älteste / Name A–Z (numerisch, de)", () => {
  assert.deepEqual(filterSheets(rows).map((r) => r.id), ["4", "2", "3", "1"]);
  assert.deepEqual(filterSheets(rows, { sort: "old" }).map((r) => r.id), ["1", "3", "2", "4"]);
  assert.deepEqual(filterSheets(rows, { sort: "name" }).map((r) => r.id), ["2", "3", "1", "4"]);
  const n = [{ id: "a", name: "Seite 10", added: 1 }, { id: "b", name: "seite 2", added: 2 }, { id: "c", name: "Äpfel", added: 3 }];
  assert.deepEqual(filterSheets(n, { sort: "name" }).map((r) => r.id), ["c", "b", "a"]);
  assert.equal(filterSheets(rows, { sort: "kaputt" })[0].id, "4");
});

test("parseView + fold", () => {
  assert.deepEqual(parseView({ sort: "name" }), { sort: "name" });
  assert.deepEqual(parseView({ sort: "x" }), { sort: "new" });
  assert.deepEqual(parseView(null), { sort: "new" });
  assert.equal(fold("  Über   Straße "), "uber strasse");
});
