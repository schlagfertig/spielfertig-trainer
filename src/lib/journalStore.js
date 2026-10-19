// Journal: Speicher, aktuelle Übung und Verknüpfung mit dem Tagebuch.
// Seit der Freigabe für alle an (vorher nur mit Labs). journalOn() bleibt als Schalter-Stelle bestehen.
import { useEffect, useRef } from "react";
import { loadSession, saveSession } from "./session.js";
import { MIN_SEC } from "./practiceLog.js";
import { CARD_KEY, HW_KEY, exKey, findHw, normalizeCards, normalizeHw, noteCard, notePractice } from "./journal.js";

export const JOURNAL_EVENT = "sf-journal";
export const journalOn = () => true;

export const loadHw = () => normalizeHw(loadSession(HW_KEY, { items: [] }));
export const loadCards = () => normalizeCards(loadSession(CARD_KEY, { cards: [] }));
function changed() {
  try { window.dispatchEvent(new CustomEvent(JOURNAL_EVENT)); } catch { /* kein Fenster (Test) */ }
}
export function saveHw(list) { saveSession(HW_KEY, list); changed(); }
export function saveCards(list) { saveSession(CARD_KEY, list); changed(); }

const clickMode = () => loadSession("click", {}).mode;
export const keyOf = (ex, item) => exKey(ex, item, clickMode());

// ---- Aktuelle Übung (vom Übe-Modul gemeldet, für den Knopf „Zu Hausaufgaben“ in der Kopfzeile) ----
let current = null;
let currentJson = "";
let owner = 0;
export const getCtx = () => current;

// Meldet die Übung nach dem Rendern (die Module speichern ihre Einstellungen im selben Durchlauf).
export function publishCtx(id, ctx) {
  window.setTimeout(() => {
    const next = { ...ctx, key: keyOf(ctx.ex, ctx.item) };
    const json = `${next.key}|${next.label}`;
    current = next; // Tempo immer aktuell halten, melden nur, wenn sich die Übung ändert
    owner = id;
    if (json === currentJson) return;
    currentJson = json;
    changed();
  }, 0);
}

export function clearCtx(id) {
  window.setTimeout(() => {
    if (owner !== id) return;
    current = null;
    currentJson = "";
    owner = 0;
    changed();
  }, 0);
}

// Hook für Übe-Module: meldet die gezeigte Übung (ctx = null: gerade keine). Ohne Labs tut er nichts.
let ids = 0;
export function useJournalCtx(ctx) {
  const labs = useRef(journalOn()).current;
  const id = useRef(0);
  if (labs && !id.current) id.current = ++ids;
  useEffect(() => { if (!labs) return; if (ctx) publishCtx(id.current, ctx); else clearCtx(id.current); });
  useEffect(() => () => { if (labs) clearCtx(id.current); }, [labs]);
  return labs;
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

// Hausaufgabe aus der aktuellen Übung: preset für open(), sessions = Einstellungen, die beim Öffnen zurückgeschrieben werden.
export function buildEntry(ctx) {
  const { ex, item, label } = ctx;
  const base = { key: ctx.key || keyOf(ex, item), ex, item: item ?? null, label: label || "" };
  if (ex === "rudiments") {
    const s = loadSession("rudiments", {});
    const bpm = Number(s.bpm) || ctx.bpm || 80;
    return { ...base, preset: { rud: item, bpm }, sessions: { rudiments: { ...pick(s, ["hear", "goalId"]), sel: item, bpm } }, info: { bpm } };
  }
  if (ex === "click") {
    const c = pick(loadSession("click", {}), ["mode", "startBpm", "everySec", "step", "cap"]);
    const mode = c.mode === "ramp" || c.mode === "noclick" ? c.mode : "hold";
    if (mode === "noclick") {
      const n = pick(loadSession("noclick", {}), ["click", "gap", "beats", "flash", "bpm", "countIn"]);
      return { ...base, preset: null, sessions: { click: { ...c, mode }, noclick: n }, info: { mode, bpm: n.bpm || c.startBpm || 80, click: n.click ?? 2, gap: n.gap ?? 2, beats: n.beats ?? 4, countIn: n.countIn ?? 1 } };
    }
    return { ...base, preset: null, sessions: { click: { ...c, mode } }, info: { mode, bpm: c.startBpm || 80, cap: c.cap, step: c.step, everySec: c.everySec } };
  }
  if (ex === "stick") return { ...base, preset: { ex: item, bpm: ctx.bpm || 80 }, sessions: {}, info: { bpm: ctx.bpm || 80 } };
  if (ex === "pyramid") return { ...base, preset: { bpm: ctx.bpm || 80 }, sessions: {}, info: { bpm: ctx.bpm || 80 } };
  if (ex === "first") return { ...base, preset: { step: item }, sessions: {}, info: { bpm: ctx.bpm || 0 } };
  return { ...base, preset: null, sessions: {}, info: {} };
}

// Hausaufgabe öffnen: gemerkte Einstellungen zurückschreiben, dann das Modul mit preset öffnen.
export function restoreSessions(entry) {
  for (const [k, v] of Object.entries(entry?.sessions || {})) {
    if (v && typeof v === "object") saveSession(k, { ...loadSession(k, {}), ...v });
  }
}

// Nach einer Übe-Session (aus usePracticeTrack): war das eine offene Hausaufgabe? Merkt sich die Übezeit
// bei Hausaufgabe und Karteikarte. Gibt true zurück, wenn der Tagebuch-Eintrag als Hausaufgabe markiert werden soll.
export function practiced(seg) {
  if (!journalOn() || !seg || seg.sec < MIN_SEC) return false;
  const key = keyOf(seg.ex, seg.item);
  const at = seg.at || Date.now();
  const open = !!findHw(loadHw(), key, { open: true });
  const hw = notePractice(loadHw(), key, at);
  if (hw.hit) saveHw(hw.list);
  if (seg.ex === "rudiments" && seg.item != null) {
    const c = noteCard(loadCards(), seg.item, at);
    if (c.hit) saveCards(c.list);
  }
  return open;
}
