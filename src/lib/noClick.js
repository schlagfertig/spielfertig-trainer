// NoClick (Click-Trainer-Untermodus): X Takte mit Click, Y Takte ohne Click, im Kreis.
// Reines Datenmodul ohne DOM, damit node --test es direkt laden kann.

export const LIMITS = { click: [1, 8], gap: [1, 8], beats: [1, 12] }; // gespeicherte Werte über 8 werden beim Laden auf 8 begrenzt
export const DEFAULTS = { click: 2, gap: 2, beats: 4, flash: true };
export const RING_HIDE_MS = 3000; // Ring blendet nach so langer Zeit ohne Drehen aus

// Vorankündigung im letzten Takt einer Phase: der nächste Balken fährt linear von zart bis etwa halb hell,
// auf der 1 der neuen Phase springt er auf voll (dann ist er aktiv).
export const PRE_FROM = 0.12;
export const PRE_TO = 0.5;

export function clampSetting(key, v) {
  const [lo, hi] = LIMITS[key] || [1, 8];
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : DEFAULTS[key] ?? lo;
}

export function readSettings(raw = {}) {
  return {
    click: clampSetting("click", raw.click ?? DEFAULTS.click),
    gap: clampSetting("gap", raw.gap ?? DEFAULTS.gap),
    beats: clampSetting("beats", raw.beats ?? DEFAULTS.beats),
    flash: raw.flash !== false,
  };
}

// Takt (0-basiert ab Start) → Phase, Position, übrige Takte (inkl. aktuellem), letzter Takt der Phase?
export function barInfo(bar, click, gap) {
  const cycle = click + gap;
  const pos = ((bar % cycle) + cycle) % cycle;
  const phase = pos < click ? "click" : "gap";
  const index = phase === "click" ? pos : pos - click;
  const len = phase === "click" ? click : gap;
  return { bar, phase, index, len, left: len - index, last: index === len - 1 };
}

// Schlag n (0-basiert ab Start) → was passiert hörbar/sichtbar.
export function beatInfo(n, { click, gap, beats }) {
  const bar = Math.floor(n / beats);
  const beat = n % beats;
  const b = barInfo(bar, click, gap);
  const sound = b.phase === "click";
  const down = beat === 0;
  return {
    ...b,
    beat,
    sound, // Click hörbar, SpinDial blinkt mit
    down, // 1 des Takts (Akzent im Click)
    comeback: sound && down && b.index === 0 && bar > 0, // erste 1 nach der Lücke: stärkerer Akzent
    flash1: !sound && down, // 1 in der Lücke: NoClick-Balken blitzt (nur mit Schalter), ohne Ton
  };
}

// Toms Regel: im letzten Click-Takt kündigt sich NoClick immer an. Im letzten NoClick-Takt kündigt sich
// der Click nur an, wenn „Blinken auf der 1“ an ist (aus = in der Lücke weder Blitzen noch Vorankündigung).
export function announces(info, flashOn) {
  if (!info?.last) return false;
  return info.phase === "click" ? true : !!flashOn;
}

// Helligkeit (0…1) des als Nächstes kommenden Balkens; progress = Anteil des laufenden Takts (0…1).
export function announceLevel(info, progress, flashOn) {
  if (!announces(info, flashOn)) return 0;
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  return PRE_FROM + (PRE_TO - PRE_FROM) * p;
}

// Ring: Wert aus aufsummiertem Drehwinkel (Bogenmaß, rechtsrum positiv). Ein Schritt = 360° / Anzahl Werte.
export function ringStep(key) {
  const [lo, hi] = LIMITS[key];
  return (2 * Math.PI) / (hi - lo + 1);
}
