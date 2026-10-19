// Journal-Umzug: alles aus Tagebuch, Hausaufgaben und Karteikasten in eine kleine JSON-Datei und zurück.
// Reine Logik ohne DOM (node --test lädt sie direkt). Import führt zusammen: nichts wird gelöscht, nichts doppelt.
// Format im Stil des Spielfertig-Live-Backups: { app, kind, version, exported_at, ... }.
import { MAX_ENTRIES, MAX_SESSION_SEC, normalizeLog } from "./practiceLog.js";
import { MAX_ITEMS, VIEW_OF, normalizeCards, normalizeHw } from "./journal.js";

export const BACKUP_APP = "schlagfertig";
export const BACKUP_KIND = "journal";
export const BACKUP_VERSION = 1;

const pad = (n) => String(n).padStart(2, "0");
export function backupFileName(at = Date.now()) {
  const d = new Date(at);
  return `schlagfertig-journal-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function buildBackup({ diary, homework, cards }, at = Date.now()) {
  return {
    app: BACKUP_APP, kind: BACKUP_KIND, version: BACKUP_VERSION, exported_at: new Date(at).toISOString(),
    diary: normalizeLog(diary).entries,
    homework: normalizeHw(homework).items,
    karteikasten: normalizeCards(cards).cards,
  };
}

// ---- Prüfen: nur bekannte Felder, einfache Werte. Eine Hausaufgabe darf beim Öffnen nur Übe-Einstellungen zurückschreiben.
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");
const SESSION_KEYS = ["rudiments", "click", "noclick"];
const plain = (o) => (isObj(o) ? Object.fromEntries(Object.entries(o).filter(([k, v]) => k.length < 40 && (v === null || ["string", "number", "boolean"].includes(typeof v))).map(([k, v]) => [k, typeof v === "string" ? v.slice(0, 120) : v])) : null);

function cleanEntry(e) {
  if (!isObj(e) || !/^\d{4}-\d{2}-\d{2}$/.test(e.day) || typeof e.ex !== "string" || typeof e.id !== "string") return null;
  const sec = Math.min(Math.round(num(e.sec)), MAX_SESSION_SEC);
  if (sec <= 0) return null;
  const item = e.item == null ? null : typeof e.item === "number" || typeof e.item === "string" ? e.item : null;
  const id = `${e.day}|${e.ex}|${item == null ? "" : item}`;
  const slots = isObj(e.slots) ? Object.fromEntries(Object.entries(e.slots).filter(([, v]) => num(v) > 0).slice(0, 12).map(([k, v]) => [str(k, 12), Math.round(num(v))])) : {};
  return { id, day: e.day, ex: str(e.ex, 20), item, label: str(e.label), sec, bpm: Math.max(0, Math.round(num(e.bpm))), runs: Math.max(1, Math.round(num(e.runs, 1))), at: num(e.at), toast: true, slots, ...(e.hw ? { hw: true } : {}) };
}

function cleanHw(x) {
  if (!isObj(x) || typeof x.key !== "string" || !VIEW_OF[x.ex]) return null;
  const sessions = isObj(x.sessions) ? Object.fromEntries(SESSION_KEYS.filter((k) => isObj(x.sessions[k])).map((k) => [k, plain(x.sessions[k])])) : {};
  return {
    key: str(x.key, 60), ex: x.ex, item: x.item == null ? null : typeof x.item === "number" || typeof x.item === "string" ? x.item : null, label: str(x.label),
    preset: plain(x.preset), sessions, info: plain(x.info) || {}, view: VIEW_OF[x.ex],
    done: !!x.done, at: num(x.at), lastAt: num(x.lastAt), runs: Math.max(0, Math.round(num(x.runs))), ...(x.doneAt ? { doneAt: num(x.doneAt) } : {}),
  };
}

// Text → { ok: true, data } oder { ok: false, reason: "json" | "app" | "version" | "empty" }
export function parseBackup(text) {
  let raw;
  try { raw = JSON.parse(String(text ?? "").replace(/^\uFEFF/, "")); } catch { return { ok: false, reason: "json" }; }
  if (!isObj(raw) || raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND) return { ok: false, reason: "app" };
  if (!Number.isInteger(raw.version) || raw.version < 1 || raw.version > BACKUP_VERSION) return { ok: false, reason: "version" };
  const arr = (v) => (Array.isArray(v) ? v : []);
  const data = {
    diary: arr(raw.diary).map(cleanEntry).filter(Boolean),
    homework: arr(raw.homework).map(cleanHw).filter(Boolean),
    karteikasten: normalizeCards({ cards: arr(raw.karteikasten) }).cards,
  };
  if (!data.diary.length && !data.homework.length && !data.karteikasten.length) return { ok: false, reason: "empty" };
  return { ok: true, data };
}

// Zusammenführen. Gleicher Tagebuch-Eintrag (Tag + Übung): Übezeit und Tempo = jeweils der höhere Wert
// (nicht addiert - so bleibt ein zweiter Import derselben Datei ohne Wirkung). Hausaufgaben je Übung,
// Karteikarten je Rudiment: vorhandene bleiben wie sie sind. Bestehendes wird nie entfernt.
export function mergeBackup(current, data) {
  const log = normalizeLog(current.diary);
  const byId = new Map(log.entries.map((e, i) => [e.id, i]));
  const entries = log.entries.slice();
  let added = 0;
  let updated = 0;
  const fresh = [];
  for (const e of data.diary) {
    if (byId.has(e.id)) {
      const i = byId.get(e.id);
      const old = entries[i];
      if (e.sec > old.sec || e.bpm > (old.bpm || 0) || (e.hw && !old.hw)) {
        entries[i] = { ...old, sec: Math.max(old.sec, e.sec), bpm: Math.max(old.bpm || 0, e.bpm), slots: e.sec > old.sec ? e.slots : old.slots, ...(e.hw || old.hw ? { hw: true } : {}) };
        updated++;
      }
    } else { byId.set(e.id, -1); fresh.push(e); }
  }
  const room = Math.max(0, MAX_ENTRIES - entries.length);
  const take = fresh.sort((a, b) => b.at - a.at).slice(0, room);
  added = take.length;
  const diary = { v: 1, entries: [...entries, ...take] };

  const hw = normalizeHw(current.homework);
  const keys = new Set(hw.items.map((x) => x.key));
  const newHw = data.homework.filter((x) => !keys.has(x.key) && keys.add(x.key)).slice(0, Math.max(0, MAX_ITEMS - hw.items.length));
  const homework = { v: 1, items: [...hw.items, ...newHw] };

  const cards = normalizeCards(current.cards);
  const ruds = new Set(cards.cards.map((c) => c.rud));
  const newCards = data.karteikasten.filter((c) => !ruds.has(c.rud) && ruds.add(c.rud)).slice(0, Math.max(0, MAX_ITEMS - cards.cards.length));
  const karteikasten = { v: 1, cards: [...cards.cards, ...newCards] };

  return { diary, homework, cards: karteikasten, added: { entries: added, updated, homework: newHw.length, cards: newCards.length } };
}

// Ersetzen (nur nach Rückfrage): Daten auf diesem Gerät durch die Datei ersetzen.
export function replaceBackup(data) {
  const diary = { v: 1, entries: data.diary.slice().sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES) };
  const homework = { v: 1, items: data.homework.slice(0, MAX_ITEMS) };
  const cards = { v: 1, cards: data.karteikasten.slice(0, MAX_ITEMS) };
  return { diary, homework, cards, added: { entries: diary.entries.length, updated: 0, homework: homework.items.length, cards: cards.cards.length } };
}

export function hasJournalData({ diary, homework, cards }) {
  return normalizeLog(diary).entries.length + normalizeHw(homework).items.length + normalizeCards(cards).cards.length > 0;
}
