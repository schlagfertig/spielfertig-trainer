// Store-Freemium (Tom, 2026-10-24). Einmalig, kein Abo. Anzeige: DEMO_PRICE.
// Web und Test: DEMO_ON aus, volle App. Store-Build (CAPACITOR=1 → __SF_STORE__, wie feedbackClient.js)
// und native Hülle: DEMO_ON an, Sperren unten.
// Store-IAP (Apple/Google, einmalig) hängt sich an purchaseFullVersion — noch nicht verdrahtet.
// Produkt-ID: de.schlagfertig.app.full (Paket-ID de.schlagfertig.app).
// App Store Connect (Lotse) hat noch die ältere ID de.schlagfertig.control.full notiert.
// Code aus der Stunde nur im Tester-Build (VITE_SF_TESTER_BUILD=1 → __SF_TESTER__).
// Im echten Store-Build gibt es den Code nicht (Apple Guideline 3.1.1).

/* global __SF_STORE__, __SF_TESTER__ */
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
// Einmal-Kauf der vollen App. An diese ID gehen StoreKit und Play Billing.
// de.schlagfertig.control.full bleibt nur die alte Connect-Notiz, nicht die Paket-ID.
export const FULL_PRODUCT_ID = "de.schlagfertig.app.full";
// Literal, damit der Store-Build das Code-Feld wegoptimiert (Guideline 3.1.1).
// true nur bei VITE_SF_TESTER_BUILD=1. Ohne das Flag (auch in node-Tests): false.
export const TESTER_UNLOCK = typeof __SF_TESTER__ !== "undefined" && __SF_TESTER__ === true;

// Frei bei Sperre: #1 Single Stroke Roll, #6 Double Stroke Open Roll,
// #16 Single Paradiddle, #20 Flam, #22 Flam Tap, #31 Drag.
export const FREE_RUDIMENTS = [1, 6, 16, 20, 22, 31];
export const FREE_RUDIMENT = FREE_RUDIMENTS[0];
export const FREE_STICK_MAX = 2; // Hand Control 1 und 2; 3–24 volle App
export const FREE_JOURNAL_N = 2; // Hausaufgaben und Karteikasten: die ersten zwei
// Pyramide: 4tel, 8tel, 16tel. Triole, Quintole, Sextole, Septole, 32tel = volle App.
export const FREE_PYRAMID_STAGES = ["q", "e", "s16"];
// Eigene Grooves: genau 1 Takt erstellen und üben. Mehr Takte und Speichern = volle App.
export const FREE_GROOVE_BARS = 1;

// Ansichten, die sich öffnen lassen. Innen kann trotzdem etwas gesperrt sein
// (NoClick, Rudiments außerhalb der sechs, schwerere Pyramiden-Stufen, Hand Control ab 3,
// Groove über 1 Takt, Speichern, …).
// Noten (archive) bleibt zu.
const FREE = new Set([
  "home", "first", "nostick", "click", "lexicon", "impressum", "datenschutz", "news",
  "rudiments", "dice", "stick", "diary", "rhythm", "pyramid",
]);

export function isUnlocked() {
  if (!DEMO_ON) return true;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

// Store-IAP (Apple/Google) setzt bei echtem Kauf hier setUnlocked(true) — noch nicht angebunden.
// Der Code aus der Stunde schreibt das nur im Tester-Build.
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

export function hourCodeMatches(code) {
  return String(code || "").trim().toLowerCase() === "sf-stunde";
}

// Im Store-Build immer false, auch wenn der Code stimmt (Guideline 3.1.1).
export function unlockCodeOk(code) {
  return TESTER_UNLOCK && hourCodeMatches(code);
}

// Haken für StoreKit (iOS) und Play Billing (Android). Noch kein Plugin, kein System-Kaufdialog.
// Wenn der Kauf später klappt: setUnlocked(true) und { ok: true, productId: FULL_PRODUCT_ID }.
export function purchaseFullVersion() {
  return Promise.resolve({
    ok: false,
    reason: "not-wired",
    productId: FULL_PRODUCT_ID,
  });
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

// Genau ein Takt ist frei. 2–4 Takte gehören zur vollen App (Freischalt-Blatt, nicht still verwerfen).
export function grooveBarsOpen(n, unlocked = isUnlocked()) {
  const count = Number(n);
  return !!unlocked || (Number.isFinite(count) && count >= 1 && count <= FREE_GROOVE_BARS);
}

// Speichern, auch bei einem Takt, gehört zur vollen App.
export function grooveSaveOpen(unlocked = isUnlocked()) {
  return !!unlocked;
}

export function withinFreeCount(n, unlocked = isUnlocked()) {
  return !!unlocked || Number(n) < FREE_JOURNAL_N;
}

export function askUnlock() {
  if (isUnlocked()) return false;
  try { window.dispatchEvent(new CustomEvent(PAYWALL_EVENT)); } catch { /* ignore */ }
  return true;
}
