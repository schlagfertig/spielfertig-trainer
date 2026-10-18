// Test-Feedback: Zustand auf dem Gerät (localStorage sf.v1.feedback), Postausgang und Server-Aufrufe.
// Nur Web-/Testversion: in der Store-App (CAPACITOR=1 bzw. native Hülle) ist FEEDBACK_ENABLED false und es wird nichts gesendet.
import { loadSession, saveSession } from "./session.js";
import { ASK_MIN_SEC, TEST_ASK_MIN_SEC, addQualified, dayKey, exKey, makeThanksNumber, thanksAfter } from "./feedbackRules.js";

/* global __SF_STORE__ */
const STORE_BUILD = typeof __SF_STORE__ !== "undefined" && __SF_STORE__ === true;
const NATIVE = typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
export const FEEDBACK_ENABLED = !STORE_BUILD && !NATIVE;

const KEY = "feedback";
const TEST_KEY = "fbtest";
const API = "/api/feedback";
export const ASK_EVENT = "sf-feedback-ask";
export const THANKS_EVENT = "sf-feedback-thanks";
export const SETTINGS_EVENT = "sf-feedback-settings";
export const CHANGE_EVENT = "sf-feedback-change";

const EMPTY = { consent: null, device: "", qual: [], asked: {}, thanks: null, special: null, outbox: [] };

export function loadFb() { return { ...EMPTY, ...loadSession(KEY, EMPTY) }; }
function saveFb(next) {
  saveSession(KEY, next);
  try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT)); } catch { /* ignore */ }
  return next;
}
export function patchFb(patch) { return saveFb({ ...loadFb(), ...patch }); }

function uuid() {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

// Zufällige Geräte-Kennung ohne Bezug zum Namen (pseudonym), erst beim ersten Senden erzeugt.
export function deviceId() {
  const fb = loadFb();
  if (fb.device) return fb.device;
  const device = uuid().toLowerCase();
  patchFb({ device });
  return device;
}

// ---- Testmodus: ?fbtest=1 (Erfolg nach 2, Frage sofort), &fbexpired=1 (Code gestern abgelaufen), &fbcode=1 (gültiger Beispiel-Code); ?fbtest=0 beendet ----
export function readTestParams(search = (typeof location !== "undefined" ? location.search : "")) {
  const q = new URLSearchParams(search);
  if (q.get("fbtest") === "0") { saveSession(TEST_KEY, { on: false }); return; }
  if (q.get("fbtest") === "1") saveSession(TEST_KEY, { on: true, expired: q.get("fbexpired") === "1", code: q.get("fbcode") === "1" });
}
export function testMode() { return loadSession(TEST_KEY, { on: false }); }
export const isTest = () => testMode().on === true;

export function hasConsent() { return FEEDBACK_ENABLED && loadFb().consent === true; }
export function needsConsentPrompt() { return FEEDBACK_ENABLED && loadFb().consent === null; }

export function setConsent(on) {
  const fb = loadFb();
  // Widerruf: nichts mehr senden - noch nicht gesendete Feedbacks bleiben nicht im Postausgang.
  patchFb({ consent: !!on, outbox: on ? fb.outbox : fb.outbox.filter((x) => x.type !== "feedback") });
}

// Nach Stop: fragen? Ab 30 s am Stück, höchstens einmal pro Übung und Tag (Testmodus: immer, ab 2 s).
export function shouldAsk(seg, now = Date.now()) {
  if (!hasConsent() || !seg?.ex) return false;
  const test = isTest();
  if ((Number(seg.sec) || 0) < (test ? TEST_ASK_MIN_SEC : ASK_MIN_SEC)) return false;
  if (test) return true;
  return !loadFb().asked[`${dayKey(now)}#${exKey(seg.ex, seg.item)}`];
}

export function markAsked(seg, now = Date.now()) {
  const fb = loadFb();
  const today = dayKey(now);
  const asked = {};
  for (const k of Object.keys(fb.asked || {})) if (k.startsWith(today)) asked[k] = true; // nur heute behalten
  asked[`${today}#${exKey(seg.ex, seg.item)}`] = true;
  patchFb({ asked });
}

// Aus usePracticeTrack nach Stop aufgerufen.
// Gibt true zurück, wenn gleich gefragt wird (dann wartet der Tagebuch-Hinweis, bis das Fenster zu ist).
export const ASK_DELAY_MS = 650;
export function offerFeedback(seg) {
  if (!shouldAsk(seg)) return false;
  markAsked(seg);
  window.setTimeout(() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: seg })), ASK_DELAY_MS);
  return true;
}

// ---- Postausgang ----
async function post(body) {
  const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
  let j = null;
  try { j = await r.json(); } catch { /* ignore */ }
  return { status: r.status, json: j };
}

let flushing = null;
export function flush() {
  if (!FEEDBACK_ENABLED) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    for (;;) {
      const fb = loadFb();
      const item = fb.outbox[0];
      if (!item) break;
      let res;
      try { res = await post(item); } catch { break; } // offline: später nochmal
      // Speicher fehlt (503), kein Zugang (401) oder zu viele (429): behalten und später nochmal.
      if (res.status === 503 || res.status === 401 || res.status === 429 || res.status >= 500) break;
      const cur = loadFb();
      const rest = cur.outbox.slice(1);
      const patch = { outbox: rest };
      if (res.status === 200 && item.type === "thanks" && res.json?.num) {
        patch.thanks = { ...(cur.thanks || {}), num: res.json.num, synced: true, code: res.json.code || cur.thanks?.code || "", validUntil: res.json.validUntil || cur.thanks?.validUntil || "" };
      }
      patchFb(patch);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

function enqueue(item) {
  const fb = loadFb();
  patchFb({ outbox: [...fb.outbox, item].slice(-200) });
  return flush();
}

// Feedback abgeben → { reached } = Überraschungs-Erfolg jetzt erreicht?
export function submitFeedback({ seg, rating, comment, quote, lang }, now = Date.now()) {
  if (!hasConsent()) return { reached: false };
  const test = isTest();
  const day = dayKey(now);
  const ex = exKey(seg.ex, seg.item);
  const fb = loadFb();
  const qual = addQualified(fb.qual, { day, ex, comment });
  patchFb({ qual });
  enqueue({ type: "feedback", device: deviceId(), rating, comment: comment || "", quote: !!quote, ex, label: seg.label || "", day, lang, test });
  const reached = !fb.thanks && qual.length >= thanksAfter(test);
  if (reached) claimThanks();
  return { reached };
}

// Dankeschön-Nummer: sofort auf dem Gerät (damit sie auch offline da ist), Server bestätigt oder vergibt eine andere.
export function claimThanks() {
  const fb = loadFb();
  if (fb.thanks?.num) return fb.thanks;
  const thanks = { num: makeThanksNumber(), platform: "", synced: false, code: "", validUntil: "", at: Date.now() };
  patchFb({ thanks });
  enqueue({ type: "thanks", device: deviceId(), num: thanks.num, platform: "", test: isTest() });
  return thanks;
}

export function setPlatform(platform) {
  const fb = loadFb();
  if (!fb.thanks) return;
  patchFb({ thanks: { ...fb.thanks, platform } });
  enqueue({ type: "thanks", device: deviceId(), num: fb.thanks.num, platform, test: isTest() });
}

// Code und „gültig bis“ vom Server holen (Tom trägt sie später ein).
export async function refreshThanks() {
  const fb = loadFb();
  if (!FEEDBACK_ENABLED || !fb.thanks?.num || !fb.device) return;
  try {
    const r = await post({ type: "status", device: fb.device });
    if (r.status !== 200 || !r.json?.num) return;
    const cur = loadFb();
    patchFb({ thanks: { ...cur.thanks, num: r.json.num, code: r.json.code || "", validUntil: r.json.validUntil || "", synced: true } });
  } catch { /* offline */ }
}

// Anzeige-Zustand des Codes, inkl. Testmodus-Schalter.
export function codeView(thanks, now = Date.now()) {
  const tm = testMode();
  if (tm.on && tm.expired) return { code: "SF-TEST-CODE", validUntil: dayKey(now - 86400000) };
  if (tm.on && tm.code) return { code: "SF-TEST-CODE", validUntil: dayKey(now + 30 * 86400000) };
  return { code: thanks?.code || "", validUntil: thanks?.validUntil || "" };
}

// ---- Special Thanks (getrennt vom Feedback, ohne Geräte-Kennung) ----
export function saveSpecial(name, contact) {
  const fb = loadFb();
  const id = fb.special?.id || uuid().toLowerCase();
  patchFb({ special: { id, name, contact } });
  return enqueue({ type: "special", id, name, contact });
}
export function removeSpecial() {
  const fb = loadFb();
  if (!fb.special?.id) return Promise.resolve();
  patchFb({ special: null });
  return enqueue({ type: "unspecial", id: fb.special.id });
}

// Alle Feedbacks dieses Geräts auf dem Server löschen (Dankeschön-Nummer bleibt).
export function forgetMine() {
  const fb = loadFb();
  patchFb({ outbox: fb.outbox.filter((x) => x.type !== "feedback"), qual: [] });
  if (!fb.device) return Promise.resolve();
  return enqueue({ type: "forget", device: fb.device });
}
