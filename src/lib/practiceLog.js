// Übe-Tagebuch: reine Logik ohne DOM - Einträge sammeln, zusammenführen, gruppieren.
// Ein Eintrag = eine Übung an einem Tag: Gesamtzeit + höchstes Tempo. Kurzes Antesten (< 30 s am Stück) zählt nicht.

export const MIN_SEC = 30;
export const MAX_SESSION_SEC = 3 * 60 * 60; // Schutz gegen „Gerät lag die Nacht über im Hintergrund“
export const MAX_ENTRIES = 1000;
export const EXERCISES = ["rudiments", "click", "pyramid", "stick", "dice"];

const pad = (n) => String(n).padStart(2, "0");

// Lokaler Kalendertag (nicht UTC), z. B. "2026-10-17".
export function dayKey(at = Date.now()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function entryId(day, ex, item) {
  return `${day}|${ex}|${item == null ? "" : item}`;
}

export function emptyLog() {
  return { v: 1, entries: [] };
}

export function normalizeLog(raw) {
  const entries = Array.isArray(raw?.entries) ? raw.entries.filter((e) => e && e.id && e.day && e.ex && Number(e.sec) > 0) : [];
  return { v: 1, entries };
}

// Eine Session (Start → Stop) in Sekunden, gekappt.
export function sessionSec(startAt, stopAt) {
  const s = Math.round((Number(stopAt) - Number(startAt)) / 1000);
  if (!Number.isFinite(s) || s <= 0) return 0;
  return Math.min(s, MAX_SESSION_SEC);
}

// Session eintragen. Zählt erst ab MIN_SEC am Stück; gleiche Übung am gleichen Tag wird zusammengeführt.
// seg: { ex, item?, label?, sec, bpm, at, hw? }  (hw = als Hausaufgabe geübt, Journal/Labs)  →  { log, entry, isNew } (entry = null, wenn nicht gezählt)
export function record(log, seg) {
  const base = normalizeLog(log);
  const sec = Math.min(Math.round(Number(seg?.sec) || 0), MAX_SESSION_SEC);
  if (!seg?.ex || sec < MIN_SEC) return { log: base, entry: null, isNew: false };
  const at = seg.at ?? Date.now();
  const day = dayKey(at);
  const id = entryId(day, seg.ex, seg.item);
  const bpm = Math.max(0, Math.round(Number(seg.bpm) || 0));
  const slot = slotOf(seg.start ?? at - sec * 1000);
  const i = base.entries.findIndex((e) => e.id === id);
  let entry;
  let entries;
  if (i >= 0) {
    const old = base.entries[i];
    entry = { ...old, sec: old.sec + sec, bpm: Math.max(old.bpm || 0, bpm), runs: (old.runs || 1) + 1, label: seg.label || old.label || "", at, slots: addSlot(slotsOf(old), slot, sec), ...(seg.hw || old.hw ? { hw: true } : {}) };
    entries = base.entries.slice();
    entries[i] = entry;
  } else {
    entry = { id, day, ex: seg.ex, item: seg.item ?? null, label: seg.label || "", sec, bpm, runs: 1, at, toast: false, slots: { [slot]: sec }, ...(seg.hw ? { hw: true } : {}) };
    entries = [entry, ...base.entries];
  }
  if (entries.length > MAX_ENTRIES) entries = entries.slice().sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES);
  return { log: { v: 1, entries }, entry, isNew: i < 0 };
}

// Hinweis „Eingetragen!“ nur einmal pro Übung und Tag.
export function needsToast(log, id) {
  const e = normalizeLog(log).entries.find((x) => x.id === id);
  return !!e && !e.toast;
}

export function markToasted(log, id) {
  const base = normalizeLog(log);
  return { v: 1, entries: base.entries.map((e) => (e.id === id ? { ...e, toast: true } : e)) };
}

// Löschen gibt den Eintrag zurück - für „Rückgängig“.
export function removeEntry(log, id) {
  const base = normalizeLog(log);
  const index = base.entries.findIndex((e) => e.id === id);
  if (index < 0) return { log: base, removed: null, index: -1 };
  const entries = base.entries.slice();
  const [removed] = entries.splice(index, 1);
  return { log: { v: 1, entries }, removed, index };
}

export function restoreEntry(log, removed, index = 0) {
  const base = normalizeLog(log);
  if (!removed || base.entries.some((e) => e.id === removed.id)) return base;
  const entries = base.entries.slice();
  entries.splice(Math.max(0, Math.min(index, entries.length)), 0, removed);
  return { v: 1, entries };
}

// Nach Tagen gruppiert, neuester Tag zuerst; innerhalb des Tages zuletzt geübt zuerst.
export function groupByDay(log) {
  const map = new Map();
  for (const e of normalizeLog(log).entries) {
    if (!map.has(e.day)) map.set(e.day, []);
    map.get(e.day).push(e);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([day, list]) => ({ day, sec: list.reduce((s, e) => s + e.sec, 0), entries: list.slice().sort((a, b) => b.at - a.at) }));
}

// Minuten für die Anzeige: ab 30 s mindestens 1 min.
export function minutes(sec) {
  return Math.max(1, Math.round((Number(sec) || 0) / 60));
}

// Letzte 7 Tage (inkl. heute): Minuten gesamt + Tage mit Einträgen.
export function weekStats(log, now = Date.now()) {
  const days = new Set();
  for (let k = 0; k < 7; k++) days.add(dayKey(now - k * 86400000));
  let sec = 0;
  const active = new Set();
  for (const e of normalizeLog(log).entries) if (days.has(e.day)) { sec += e.sec; active.add(e.day); }
  return { sec, days: active.size };
}

// Laufende Session als kleiner Zustandsautomat (für den Hook und für Tests).
// begin → bpm(...) → end: liefert die fertige Session oder null.
export function createSession(ex, item, label, bpm, at) {
  return { ex, item: item ?? null, label: label || "", start: at, bpm: Math.max(0, Number(bpm) || 0) };
}

export function bumpBpm(s, bpm) {
  if (!s) return s;
  const b = Number(bpm) || 0;
  return b > s.bpm ? { ...s, bpm: b } : s;
}

export function endSession(s, at) {
  if (!s) return null;
  return { ex: s.ex, item: s.item, label: s.label, bpm: Math.round(s.bpm), sec: sessionSec(s.start, at), at, start: s.start };
}

// ---- Tageszeit (Übe-Zeitfenster) ----
// Jede Session zählt mit ihrer Startzeit in ein Fenster; pro Eintrag werden Sekunden je Fenster gesammelt (entry.slots).
export const SLOTS = [
  { id: "frueh", label: "früh", from: 5, to: 8 },
  { id: "vormittag", label: "Vormittag", from: 8, to: 11 },
  { id: "mittag", label: "Mittag", from: 11, to: 14 },
  { id: "nachmittag", label: "Nachmittag", from: 14, to: 18 },
  { id: "abend", label: "Abend", from: 18, to: 22 },
  { id: "nacht", label: "Nacht", from: 22, to: 5 },
];

export function slotOf(at) {
  const h = new Date(at).getHours();
  const s = SLOTS.find((x) => (x.from < x.to ? h >= x.from && h < x.to : h >= x.from || h < x.to));
  return s ? s.id : "nacht";
}

function addSlot(slots, id, sec) {
  return { ...slots, [id]: (slots[id] || 0) + sec };
}

// Ältere Einträge ohne slots (vor der Monatsauswertung): ganze Zeit ins Fenster der geschätzten Startzeit.
export function slotsOf(e) {
  if (e?.slots && typeof e.slots === "object" && Object.keys(e.slots).length) return e.slots;
  if (!e || !(e.sec > 0)) return {};
  return { [slotOf((e.at || 0) - e.sec * 1000)]: e.sec };
}

// ---- Monatsauswertung ----
export function monthKey(at = Date.now()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function shiftMonth(key, by) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function exerciseKey(e) {
  return `${e.ex}|${e.item == null ? "" : e.item}`;
}

// { month, sec, days, prevSec, diffSec, pct (null ohne Vormonat), slot (Lieblings-Fenster oder null), slots, top: [{ key, ex, item, label, sec }] }
export function monthStats(log, month = monthKey()) {
  const entries = normalizeLog(log).entries;
  const prev = shiftMonth(month, -1);
  const inMonth = entries.filter((e) => e.day.slice(0, 7) === month);
  const sec = inMonth.reduce((s, e) => s + e.sec, 0);
  const prevSec = entries.filter((e) => e.day.slice(0, 7) === prev).reduce((s, e) => s + e.sec, 0);
  const slots = {};
  for (const e of inMonth) for (const [k, v] of Object.entries(slotsOf(e))) slots[k] = (slots[k] || 0) + v;
  let slot = null;
  for (const s of SLOTS) if ((slots[s.id] || 0) > 0 && (!slot || slots[s.id] > slots[slot])) slot = s.id;
  const byEx = new Map();
  for (const e of inMonth) {
    const k = exerciseKey(e);
    const cur = byEx.get(k) || { key: k, ex: e.ex, item: e.item ?? null, label: e.label || "", sec: 0, at: 0 };
    cur.sec += e.sec;
    if (e.at > cur.at) { cur.at = e.at; if (e.label) cur.label = e.label; }
    byEx.set(k, cur);
  }
  const top = [...byEx.values()].sort((a, b) => b.sec - a.sec || b.at - a.at).slice(0, 3).map(({ at, ...x }) => x);
  return {
    month, sec, days: new Set(inMonth.map((e) => e.day)).size, prev, prevSec,
    earlier: entries.some((e) => e.day.slice(0, 7) < month), // gab es vor diesem Monat schon Einträge?
    diffSec: sec - prevSec, pct: prevSec > 0 ? Math.round(((sec - prevSec) / prevSec) * 100) : null,
    slot, slots, top,
  };
}
