// Noten: Notizen pro Blatt – Speicherformat, Koordinaten, Radierer, Rückgängig (node --test)
import test from "node:test";
import assert from "node:assert/strict";
import {
  addPin, addStroke, clearPage, COLORS, emptyNotes, eraseAt, fromPage, getPage, hitStroke, makeStroke, MAX_PIN_TEXT,
  MAX_TEXT, normalizeNotes, onPage, popHistory, preview, pushHistory, removePin, setText, strokePath, summary, thin, toPage, updatePin,
} from "../src/lib/sheetNotes.js";

test("Koordinaten: Bildschirm ↔ Seite bleibt bei jedem Zoom/Verschieben gleich", () => {
  const fw = 300; const fh = 420;
  for (const view of [{ s: 1, tx: 45, ty: 0 }, { s: 2.5, tx: -200, ty: -310 }, { s: 5, tx: -1234, ty: -987 }]) {
    const scr = fromPage(0.25, 0.6, view, fw, fh);
    const p = toPage(scr.x, scr.y, view, fw, fh);
    assert.ok(Math.abs(p.x - 0.25) < 1e-9 && Math.abs(p.y - 0.6) < 1e-9, JSON.stringify(view));
  }
  // Drehen: neue eingepasste Größe – derselbe normierte Punkt liegt wieder an derselben Stelle der Seite
  const portrait = fromPage(0.5, 0.5, { s: 1, tx: 0, ty: 100 }, 390, 546);
  const landscape = fromPage(0.5, 0.5, { s: 1, tx: 300, ty: 0 }, 260, 364);
  assert.deepEqual(portrait, { x: 195, y: 373 });
  assert.deepEqual(landscape, { x: 430, y: 182 });
  assert.equal(toPage(10, 10, { s: 1, tx: 0, ty: 0 }, 0, 0), null);
  assert.ok(onPage({ x: 0.5, y: 1 }) && !onPage({ x: -0.1, y: 0.5 }) && onPage({ x: -0.01, y: 0.5 }, 0.02));
});

test("Strich: Punkte werden begrenzt (0…1), gerundet und ausgedünnt", () => {
  const s = makeStroke({ color: "teal", points: [[-0.2, 0.5], [0.10001, 0.5], [0.1002, 0.5002], [1.4, 2]] });
  assert.equal(s.color, "teal");
  assert.deepEqual(s.pts[0], [0, 0.5]);
  assert.deepEqual(s.pts[s.pts.length - 1], [1, 1]);
  assert.equal(s.pts.length, 3, "fast gleicher Punkt fällt weg");
  assert.equal(makeStroke({ points: [] }), null);
  assert.equal(makeStroke({ color: "lila", points: [[0.1, 0.1]] }).color, "red");
  assert.equal(thin([{ x: 0.2, y: 0.2 }, [NaN, 1], null]).length, 1);
});

test("Strich: Stiftdruck ändert die Breite leicht, Leuchtstift nicht", () => {
  const base = makeStroke({ color: "red", points: [[0, 0]] }).w;
  assert.equal(base, COLORS.red.w);
  assert.ok(makeStroke({ color: "red", points: [[0, 0]], pressure: 1 }).w > base);
  assert.ok(makeStroke({ color: "red", points: [[0, 0]], pressure: 0.1 }).w < base);
  assert.equal(makeStroke({ color: "yellow", points: [[0, 0]], pressure: 1 }).w, COLORS.yellow.w);
});

test("Seiten: Striche und Marker pro PDF-Seite getrennt, leere Seiten verschwinden", () => {
  let n = emptyNotes();
  n = addStroke(n, 1, { points: [[0.1, 0.1], [0.2, 0.2]] });
  n = addStroke(n, 3, { color: "yellow", points: [[0.5, 0.5], [0.9, 0.5]] });
  n = addPin(n, 3, { x: 0.4, y: 0.7, text: "Takt 12 langsamer üben" }).notes;
  assert.equal(getPage(n, 1).strokes.length, 1);
  assert.equal(getPage(n, 2).strokes.length, 0);
  assert.equal(getPage(n, 3).pins[0].text, "Takt 12 langsamer üben");
  n = clearPage(n, 1);
  assert.deepEqual(Object.keys(n.pages), ["3"]);
});

test("Marker: anlegen, ändern, löschen; Text begrenzt", () => {
  let { notes: n, pin } = addPin(emptyNotes(), 1, { x: 0.3, y: 0.3, text: "x".repeat(MAX_PIN_TEXT + 50) });
  assert.equal(pin.text.length, MAX_PIN_TEXT);
  n = updatePin(n, 1, pin.id, { text: "Hier Akzent!" });
  assert.equal(getPage(n, 1).pins[0].text, "Hier Akzent!");
  assert.equal(getPage(n, 1).pins[0].x, 0.3, "Position bleibt");
  n = removePin(n, 1, pin.id);
  assert.equal(getPage(n, 1).pins.length, 0);
  assert.equal(addPin(emptyNotes(), 1, { x: NaN, y: 0 }).pin, null);
});

test("Radierer: trifft nur den Strich in der Nähe (Seitenformat berücksichtigt)", () => {
  let n = addStroke(emptyNotes(), 1, { id: "a", points: [[0.1, 0.1], [0.4, 0.1]] });
  n = addStroke(n, 1, { id: "b", points: [[0.1, 0.8], [0.4, 0.8]] });
  const aspect = 1.414;
  assert.ok(hitStroke(getPage(n, 1).strokes[0], 0.25, 0.105, 0.01, aspect));
  assert.ok(!hitStroke(getPage(n, 1).strokes[0], 0.25, 0.2, 0.01, aspect));
  const r = eraseAt(n, 1, 0.25, 0.8, 0.01, aspect);
  assert.equal(r.removed, 1);
  assert.deepEqual(getPage(r.notes, 1).strokes.map((s) => s.id), ["a"]);
  assert.equal(eraseAt(n, 1, 0.9, 0.5, 0.01, aspect).notes, n, "nichts getroffen → unverändert");
});

test("Rückgängig: Verlauf als Stapel, begrenzt", () => {
  let st = [];
  for (let i = 0; i < 60; i++) st = pushHistory(st, i, 50);
  assert.equal(st.length, 50);
  const { stack, state } = popHistory(st);
  assert.equal(state, 59);
  assert.equal(stack.length, 49);
  assert.deepEqual(popHistory([]), { stack: [], state: null });
});

test("Laden: alte Blätter ohne Notizen und kaputte Daten werden leer bzw. bereinigt", () => {
  assert.deepEqual(normalizeNotes(undefined), emptyNotes());
  assert.deepEqual(normalizeNotes("kaputt"), emptyNotes());
  const n = normalizeNotes({ text: 42, pages: { 0: { strokes: [{ pts: [[0, 0]] }] }, abc: {}, 2: { strokes: [{ color: "teal", pts: [[0.5, 0.5]] }, { pts: [] }], pins: [{ x: 0.2, y: 0.2, text: "a" }, { x: "?" }] } } });
  assert.equal(n.text, "42");
  assert.deepEqual(Object.keys(n.pages), ["2"]);
  assert.equal(n.pages["2"].strokes.length, 1);
  assert.equal(n.pages["2"].pins.length, 1);
  assert.equal(setText(emptyNotes(), "y".repeat(MAX_TEXT + 10)).text.length, MAX_TEXT);
  // Gespeichertes Format übersteht JSON (IndexedDB-Klon) unverändert
  const round = normalizeNotes(JSON.parse(JSON.stringify(n)));
  assert.deepEqual(round, n);
});

test("SVG-Pfad: y mit Seitenformat skaliert, Einzelpunkt sichtbar", () => {
  assert.equal(strokePath({ pts: [[0.1, 0.5], [0.2, 0.5]] }, 2), "M0.1 1L0.2 1");
  assert.match(strokePath({ pts: [[0.1, 0.1]] }, 1), /^M0\.1 0\.1l/);
  assert.match(strokePath({ pts: [[0, 0], [0.1, 0.1], [0.2, 0]] }, 1), /Q/);
  assert.equal(strokePath({ pts: [] }), "");
});

test("Übersicht: Zusammenfassung und kurze Vorschau", () => {
  let n = setText(emptyNotes(), "  Takt 12   langsamer üben\nund Akzente auf 2 und 4 betonen, dann Tempo steigern bis 120  ");
  n = addStroke(n, 1, { points: [[0.1, 0.1]] });
  n = addPin(n, 2, { x: 0.1, y: 0.1, text: "!" }).notes;
  const s = summary(n);
  assert.deepEqual([s.strokes, s.pins, s.any], [1, 1, true]);
  const p = preview(s.text, 40);
  assert.ok(p.endsWith("…") && p.length <= 41, p);
  assert.ok(p.startsWith("Takt 12 langsamer üben"));
  assert.equal(summary(undefined).any, false);
  assert.equal(preview("kurz"), "kurz");
});
