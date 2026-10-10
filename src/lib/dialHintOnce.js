// Dial-Hinweis („Tempo drehen“) nur EINMAL für die ganze App zeigen - nicht pro Bereich.
// Gemeinsamer Schlüssel: sf.v1.dialHint = { seen: true }.
// Migration: Bisher kam der Hinweis nach der ersten Kurzhilfe jedes Rad-Bereichs
// (sf.v1.tour.<bereich>). Wer irgendeine davon schon geschlossen hat, hat ihn gesehen.
import { loadSession, saveSession } from "./session.js";

export const DIAL_TOPICS = ["rudiments", "click", "pyramid", "stick"];
export const DIAL_HINT_KEY = "dialHint";

export function dialHintSeen() {
  if (loadSession(DIAL_HINT_KEY, {}).seen) return true;
  const tour = loadSession("tour", {});
  if (DIAL_TOPICS.some((k) => tour[k])) {
    markDialHintSeen();
    return true;
  }
  return false;
}

export function markDialHintSeen() {
  saveSession(DIAL_HINT_KEY, { seen: true });
}
