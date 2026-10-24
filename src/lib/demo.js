// Store-Freemium (Tom, 2026-10-24). Einmalig, kein Abo. Anzeige: DEMO_PRICE.
// Web und Test: DEMO_ON aus, volle App. Store-Build (CAPACITOR=1 → __SF_STORE__, wie feedbackClient.js)
// und native Hülle: DEMO_ON an, Sperren unten.
// Freischalten jetzt: localStorage sf-unlocked, Code sf-stunde.
// Store-IAP (Apple/Google, einmalig) ist noch nicht verdrahtet — es ruft später setUnlocked(true) auf.

/* global __SF_STORE__ */
function storeBuild() {
  try {
    return typeof __SF_STORE__ !== "undefined" && __SF_STORE__ === true;
  } catch {
    return false;
  }
}
function nativeShell() {
  try {
    return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export const DEMO_ON = storeBuild() || nativeShell();
const KEY = "sf-unlocked";
export const DEMO_PRICE = "12,99 €";
export const PAYWALL_EVENT = "sf-paywall";

// Frei bei Sperre: #1 Single Stroke Roll, #6 Double Stroke Open Roll,
// #16 Single Paradiddle, #20 Flam, #22 Flam Tap, #31 Drag.
export const FREE_RUDIMENTS = [1, 6, 16, 20, 22, 31];
export const FREE_RUDIMENT = FREE_RUDIMENTS[0];
export const FREE_STICK_MAX = 2; // Hand Control 1 und 2; 3–24 volle App
export const FREE_JOURNAL_N = 2; // Hausaufgaben und Karteikasten: die ersten zwei
// Pyramide: 4tel, 8tel, 16tel. Triole, Quintole, Sextole, Septole, 32tel = volle App.
export const FREE_PYRAMID_STAGES = ["q", "e", "s16"];

// Ansichten, die sich öffnen lassen. Innen kann trotzdem etwas gesperrt sein
// (NoClick, Rudiments außerhalb der sechs, schwerere Pyramiden-Stufen, Hand Control ab 3, Speichern, …).
// Noten (archive) bleibt zu.
const FREE = new Set([
  "home", "first", "nostick", "click", "lexicon", "impressum", "datenschutz", "news",
  "rudiments", "dice", "stick", "diary", "rhythm", "pyramid",
]);

export function isUnlocked() {
  if (!DEMO_ON) return true;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

// Store-IAP (Apple/Google) setzt später hier setUnlocked(true) — noch nicht angebunden.
// Bis dahin schreibt der Code aus der Stunde (sf-stunde) sf-unlocked.
export function setUnlocked(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

export function freeView(view) {
  return FREE.has(view);
}

export function viewOpen(view, unlocked) {
  return !!unlocked || freeView(view);
}

export function canOpen(view) {
  if (!DEMO_ON) return true;
  return viewOpen(view, isUnlocked());
}

export function unlockCodeOk(code) {
  return String(code || "").trim().toLowerCase() === "sf-stunde";
}

export function rudimentOpen(id, unlocked = isUnlocked()) {
  return !!unlocked || FREE_RUDIMENTS.includes(Number(id));
}

// Drucken nur für die sechs freien Rudiments. Andere Übungen und Notenblätter: volle App.
export function canPrintRudiment(id, unlocked = isUnlocked()) {
  return rudimentOpen(id, unlocked);
}

export function pyramidStageOpen(id, unlocked = isUnlocked()) {
  return !!unlocked || FREE_PYRAMID_STAGES.includes(id);
}

export function stickOpen(id, unlocked = isUnlocked()) {
  const n = Number(id);
  return !!unlocked || (n >= 1 && n <= FREE_STICK_MAX);
}

export function noClickOpen() {
  return isUnlocked();
}

export function grooveSaveOpen() {
  return isUnlocked();
}

export function withinFreeCount(n, unlocked = isUnlocked()) {
  return !!unlocked || Number(n) < FREE_JOURNAL_N;
}

export function askUnlock() {
  if (isUnlocked()) return false;
  try { window.dispatchEvent(new CustomEvent(PAYWALL_EVENT)); } catch { /* ignore */ }
  return true;
}
