// Hand Control, ternär (WA-24): dasselbe Sticking auf Achteltriolen.
// Ein 4/4-Takt = 12 Triolen-Achtel (4 Gruppen zu 3, Zählzeit auf jeder 1. der Gruppe).
// Vorerst ausgeblendet (TERNARY_ENABLED = false), bis passende Stickings feststehen – Code und Daten bleiben.
// Reines Datenmodul ohne DOM-Import, damit der Test es direkt mit node laden kann.

export const TERNARY_ENABLED = false;
export const TRI_LEN = 12;

export function triHands(hands) {
  const src = String(hands || "R");
  let s = "";
  while (s.length < TRI_LEN) s += src;
  return s.slice(0, TRI_LEN);
}

export function triNotes(hands) {
  return triHands(hands).split("").map((hand, i) => ({ t: i, dur: 1, hand, acc: false }));
}
