// Demo-Ausschnitt. Vollversion später über denselben Schalter (Zahlung), jetzt per Code.
const KEY = "sf-unlocked";
export const DEMO_PRICE = "12,99 €";
export const FREE_RUDIMENT = 1;
const FREE = new Set(["home", "first", "click", "lexicon", "impressum", "datenschutz", "news", "nostick", "rudiments"]);

export function isUnlocked() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setUnlocked(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

export function canOpen(view) {
  return isUnlocked() || FREE.has(view);
}

export function unlockCodeOk(code) {
  return String(code || "").trim().toLowerCase() === "sf-stunde";
}
