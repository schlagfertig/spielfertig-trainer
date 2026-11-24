// Zahl erst beim Bestätigen (Blur / Enter) in den erlaubten Bereich holen.
// Während des Tippens darf das Feld leer oder unvollständig sein.

export function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Leere oder ungültige Eingabe behält fallback; sonst auf [min, max] begrenzen. */
export function commitNumber(raw, min, max, fallback) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n)) return fallback;
  return clampInt(n, min, max);
}

/** Nur Ziffern behalten, ohne zu begrenzen, damit man frei tippen kann. */
export function draftDigits(raw, maxLen = 3) {
  return String(raw).replace(/[^\d]/g, "").slice(0, maxLen);
}
