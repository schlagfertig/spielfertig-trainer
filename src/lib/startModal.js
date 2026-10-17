// Höchstens EIN Popup pro App-Start: Erfolg (Dankeschön) > Test-Feedback-Frage > „Neu in Schlagfertig“.
// Der Rest wartet auf einen späteren Start. Der Erfolg kann auch mitten in der Sitzung kommen (nach Stop) -
// dann gibt es in dieser Sitzung kein weiteres Start-Popup.
import { loadSession, saveSession } from "./session.js";
import { HIGHLIGHTS } from "./changelog.js";
import { APP_VERSION } from "./version.js";
import { decideWhatsNew, minorKey } from "./whatsNew.js";
import { FEEDBACK_ENABLED, loadFb, needsConsentPrompt } from "./feedbackClient.js";

const VKEY = "lastVersion";
// Ältere Installationen kennen den Schlüssel noch nicht: wer die Begrüßung schon gesehen hat, kommt von 1.0.
const PRIOR = loadSession(VKEY, { v: "" }).v || (loadSession("welcomeSeen", {}).seen ? "1.0.0" : "");
let choice; // undefined = noch nicht entschieden
let taken = null;

function forcedWhatsNew() {
  try { return new URLSearchParams(window.location.search).get("whatsnew") === "1"; } catch { return false; }
}

// Einmal pro Seitenaufruf, auf der Startseite nach der Begrüßung. → "achievement" | "consent" | "whatsnew" | null
export function startModal({ onHome = true } = {}) {
  if (choice !== undefined) return choice;
  const lastSeen = loadSession(VKEY, { v: "" }).v || PRIOR;
  const wn = decideWhatsNew({ lastSeen, current: APP_VERSION, highlights: HIGHLIGHTS });
  if (wn.record) saveSession(VKEY, { v: wn.record });
  const fb = FEEDBACK_ENABLED ? loadFb() : null;
  if (taken) choice = null;
  else if (!onHome) choice = null;
  else if (forcedWhatsNew()) choice = "whatsnew";
  else if (fb?.thanks && !fb.thanks.shown) choice = "achievement";
  else if (needsConsentPrompt()) choice = "consent";
  else if (wn.show) choice = "whatsnew";
  else choice = null;
  if (choice) taken = choice;
  return choice;
}

// Erfolg mitten in der Sitzung: belegt den Platz, danach kein anderes Start-Popup mehr.
export function takeForAchievement() {
  taken = "achievement";
  if (choice === undefined) choice = null;
}

export function currentHighlights() {
  return HIGHLIGHTS[minorKey(APP_VERSION)] || null;
}

export function markWhatsNewSeen() {
  saveSession(VKEY, { v: APP_VERSION });
}
