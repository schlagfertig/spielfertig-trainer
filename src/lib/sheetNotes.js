// Noten: Notizen pro Blatt - Notizfeld, Stift-Striche und Textmarker.
// Rein funktional (kein DOM, kein IndexedDB) - damit per node --test prüfbar.
// Gespeichert wird alles im selben IndexedDB-Eintrag wie das Blatt (Feld `notes`).
// Koordinaten sind normiert auf die Seite: x = 0…1 der Breite, y = 0…1 der Höhe.
// So bleiben Striche und Marker beim Zoomen, Verschieben, im Vollbild und beim Drehen
// genau an ihrer Stelle. Strichbreite ist relativ zur Seitenbreite.

export const NOTES_V = 1;
export const MAX_TEXT = 2000;
export const MAX_PIN_TEXT = 280;
export const MAX_STROKES = 400; // pro Seite
export const MAX_PINS = 60; // pro Seite
export const MAX_POINTS = 2000; // pro Strich
export const COLORS = {
  red: { hex: "#e05c5c", w: 0.006, alpha: 1 },
  teal: { hex: "#1f9e8c", w: 0.006, alpha: 1 },
  yellow: { hex: "#f5d90a", w: 0.022, alpha: 0.38 },
};
export const COLOR_KEYS = Object.keys(COLORS);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const r4 = (v) => Math.round(v * 10000) / 10000;
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

let seq = 0;
export function newId(prefix = "p") {
  seq = (seq + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Bildschirmpunkt → normierte Seitenkoordinate. view = { s, tx, ty } (ZoomView), fw/fh = eingepasste Seitengröße. */
export function toPage(x, y, view, fw, fh) {
  const s = view?.s || 1;
  if (!fw || !fh) return null;
  return { x: (x - (view?.tx || 0)) / (fw * s), y: (y - (view?.ty || 0)) / (fh * s) };
}

/** Normierte Seitenkoordinate → Bildschirmpunkt (Umkehrung von toPage). */
export function fromPage(nx, ny, view, fw, fh) {
  const s = view?.s || 1;
  return { x: (view?.tx || 0) + nx * fw * s, y: (view?.ty || 0) + ny * fh * s };
}

/** Liegt der Punkt auf der Seite? (kleiner Rand erlaubt) */
export function onPage(p, pad = 0) {
  return !!p && p.x >= -pad && p.x <= 1 + pad && p.y >= -pad && p.y <= 1 + pad;
}

export function cleanText(s, max = MAX_TEXT) {
  return String(s ?? "").replace(/\r\n?/g, "\n").slice(0, max);
}

function cleanPoint(p) {
  const x = num(Array.isArray(p) ? p[0] : p?.x);
  const y = num(Array.isArray(p) ? p[1] : p?.y);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return [r4(clamp01(x)), r4(clamp01(y))];
}

/** Punkte ausdünnen: Punkte näher als `min` (normiert) am vorigen fallen weg; erster/letzter bleibt. */
export function thin(points, min = 0.0015) {
  const out = [];
  for (const p of points || []) {
    const c = cleanPoint(p);
    if (!c) continue;
    const last = out[out.length - 1];
    if (!last || Math.hypot(c[0] - last[0], c[1] - last[1]) >= min) out.push(c);
  }
  const lastIn = cleanPoint(points?.[points.length - 1]);
  if (lastIn && out.length && (out[out.length - 1][0] !== lastIn[0] || out[out.length - 1][1] !== lastIn[1])) out.push(lastIn);
  return out.slice(0, MAX_POINTS);
}

/** Strich prüfen/normieren. pressure (0…1, Stift) verändert die Breite leicht. */
/** Neuer Strich (points) oder gespeicherter Strich (pts, w) - beides wird geprüft. */
export function makeStroke({ id, color = "red", points, pts: saved, pressure, w } = {}) {
  const c = COLORS[color] ? color : "red";
  const pts = thin(points ?? saved ?? []);
  if (!pts.length) return null;
  const base = COLORS[c].w;
  const sw = num(w);
  let width;
  if (!Number.isNaN(sw) && sw > 0) width = Math.max(base * 0.5, Math.min(base * 1.5, sw));
  else {
    const pr = num(pressure);
    const k = c === "yellow" || Number.isNaN(pr) || pr <= 0 ? 1 : 0.6 + clamp01(pr) * 0.8;
    width = base * k;
  }
  return { id: String(id || newId("s")), color: c, w: r4(width), pts };
}

export function makePin({ id, x, y, text = "" } = {}) {
  const p = cleanPoint([x, y]);
  if (!p) return null;
  return { id: id || newId("m"), x: p[0], y: p[1], text: cleanText(text, MAX_PIN_TEXT) };
}

function cleanPage(pg) {
  const strokes = (Array.isArray(pg?.strokes) ? pg.strokes : []).map((s) => makeStroke(s)).filter(Boolean).slice(-MAX_STROKES);
  const pins = (Array.isArray(pg?.pins) ? pg.pins : []).map((m) => makePin(m)).filter(Boolean).slice(0, MAX_PINS);
  return { strokes, pins };
}

export function emptyNotes() {
  return { v: NOTES_V, text: "", pages: {}, updated: 0 };
}

/** Gespeicherte Notizen lesen (fehlend/kaputt → leer). Leere Seiten fallen weg. */
export function normalizeNotes(raw) {
  const out = emptyNotes();
  if (!raw || typeof raw !== "object") return out;
  out.text = cleanText(raw.text);
  out.updated = Number.isFinite(raw.updated) ? raw.updated : 0;
  const pages = raw.pages && typeof raw.pages === "object" ? raw.pages : {};
  for (const [k, pg] of Object.entries(pages)) {
    const n = Number.parseInt(k, 10);
    if (!(n >= 1)) continue;
    const c = cleanPage(pg);
    if (c.strokes.length || c.pins.length) out.pages[String(n)] = c;
  }
  return out;
}

export function getPage(notes, page = 1) {
  return notes?.pages?.[String(page)] || { strokes: [], pins: [] };
}

/** Seite ersetzen (unveränderlich). Leere Seite wird entfernt. */
export function setPage(notes, page, pg) {
  const pages = { ...(notes?.pages || {}) };
  const c = cleanPage(pg);
  if (c.strokes.length || c.pins.length) pages[String(page)] = c;
  else delete pages[String(page)];
  return { ...(notes || emptyNotes()), v: NOTES_V, pages };
}

export function setText(notes, text) {
  return { ...(notes || emptyNotes()), v: NOTES_V, text: cleanText(text) };
}

export function addStroke(notes, page, stroke) {
  const s = makeStroke(stroke);
  if (!s) return notes;
  const pg = getPage(notes, page);
  return setPage(notes, page, { ...pg, strokes: [...pg.strokes, s] });
}

/** Abstand Punkt → Strecke (normiert). */
function segDist(px, py, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = dx * dx + dy * dy;
  const u = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L)) : 0;
  return Math.hypot(px - (a[0] + u * dx), py - (a[1] + u * dy));
}

/** Trifft der Radierer (Punkt + Radius, normiert) diesen Strich? aspect = Höhe/Breite der Seite. */
export function hitStroke(stroke, x, y, r = 0.02, aspect = 1) {
  const pts = stroke?.pts || [];
  const a = aspect || 1;
  const rr = r + (stroke?.w || 0) / 2;
  if (pts.length === 1) return Math.hypot(x - pts[0][0], (y - pts[0][1]) * a) <= rr;
  for (let i = 1; i < pts.length; i++) {
    const A = [pts[i - 1][0], pts[i - 1][1] * a];
    const B = [pts[i][0], pts[i][1] * a];
    if (segDist(x, y * a, A, B) <= rr) return true;
  }
  return false;
}

/** Radierer: entfernt alle Striche, die der Punkt trifft. Gibt { notes, removed } zurück. */
export function eraseAt(notes, page, x, y, r = 0.02, aspect = 1) {
  const pg = getPage(notes, page);
  const keep = pg.strokes.filter((s) => !hitStroke(s, x, y, r, aspect));
  const removed = pg.strokes.length - keep.length;
  if (!removed) return { notes, removed: 0 };
  return { notes: setPage(notes, page, { ...pg, strokes: keep }), removed };
}

export function addPin(notes, page, pin) {
  const m = makePin(pin);
  const pg = getPage(notes, page);
  if (!m || pg.pins.length >= MAX_PINS) return { notes, pin: null };
  return { notes: setPage(notes, page, { ...pg, pins: [...pg.pins, m] }), pin: m };
}

export function updatePin(notes, page, id, patch) {
  const pg = getPage(notes, page);
  return setPage(notes, page, { ...pg, pins: pg.pins.map((m) => (m.id === id ? makePin({ ...m, ...patch, id }) : m)) });
}

export function removePin(notes, page, id) {
  const pg = getPage(notes, page);
  return setPage(notes, page, { ...pg, pins: pg.pins.filter((m) => m.id !== id) });
}

export function clearPage(notes, page) {
  return setPage(notes, page, { strokes: [], pins: [] });
}

/** Rückgängig: Verlauf als Stapel früherer Zustände (höchstens `max`). */
export function pushHistory(stack, state, max = 50) {
  return [...(stack || []), state].slice(-max);
}
export function popHistory(stack) {
  const s = stack || [];
  if (!s.length) return { stack: s, state: null };
  return { stack: s.slice(0, -1), state: s[s.length - 1] };
}

/** SVG-Pfad für einen Strich; y wird mit aspect (Höhe/Breite) skaliert → viewBox "0 0 1 aspect". */
export function strokePath(stroke, aspect = 1) {
  const pts = stroke?.pts || [];
  if (!pts.length) return "";
  const f = (v) => r4(v);
  const P = pts.map(([x, y]) => [f(x), f(y * aspect)]);
  if (P.length === 1) return `M${P[0][0]} ${P[0][1]}l0.0001 0`;
  if (P.length === 2) return `M${P[0][0]} ${P[0][1]}L${P[1][0]} ${P[1][1]}`;
  // geglättet: quadratische Kurven durch die Mittelpunkte
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length - 1; i++) {
    const mx = f((P[i][0] + P[i + 1][0]) / 2);
    const my = f((P[i][1] + P[i + 1][1]) / 2);
    d += `Q${P[i][0]} ${P[i][1]} ${mx} ${my}`;
  }
  const L = P[P.length - 1];
  return `${d}L${L[0]} ${L[1]}`;
}

/** Zusammenfassung für die Übersicht. */
export function summary(raw) {
  const n = normalizeNotes(raw);
  let strokes = 0;
  let pins = 0;
  for (const pg of Object.values(n.pages)) { strokes += pg.strokes.length; pins += pg.pins.length; }
  const text = n.text.replace(/\s+/g, " ").trim();
  return { text, strokes, pins, any: !!(text || strokes || pins) };
}

/** Kurze Vorschau des Notiztexts (Wortgrenze, …). */
export function preview(text, max = 60) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:--]+$/, "")}…`;
}
