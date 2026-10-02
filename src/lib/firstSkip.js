// „Nicht heute“ auf der Karte „Erste Übung starten“: blendet die Karte bis Tagesende aus.
// Gespeichert wird nur der Kalendertag (lokales Datum wie bei der „Heute“-Karte) – am nächsten Tag ist sie wieder da.
// Reines Datenmodul ohne DOM-Import, damit der Test es direkt mit node laden kann.
import { dayKey } from "./today.js";

export const FIRST_SKIP_KEY = "firstSkip";

export function hideFirstToday(d = new Date()) {
  return { day: dayKey(d) };
}

export function isFirstHidden(saved, d = new Date()) {
  return !!saved && typeof saved.day === "string" && saved.day === dayKey(d);
}
