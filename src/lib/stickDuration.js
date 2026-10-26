// Dauer eines Hand-Control-Fokus-Laufs, passend zum Scheduler in StickControl.jsx.
// Binär (Normalfall): 16 Achtel = 2 Takte = 8 Viertel je Wiederholung
//   (CELL_STEPS 32, Schritt = Viertel/4 → 32/4 = 8).
// Ternär (derzeit ausgeblendet): 12 Triolenachtel = 1 Takt = 4 Viertel
//   (TRI_LEN 12, Schritt = Viertel/3 → 12/3 = 4).
// Einzählen nur einmal am Anfang (0–2 Takte à 4 Viertel), nicht zwischen den Nummern.
// Gezählt wird von der aktuellen Nummer bis zur letzten, die noch offen ist
// (danach ist Schluss, auch wenn spätere Nummern existieren).

export const BINARY_QUARTERS_PER_REP = 8;
export const TERNARY_QUARTERS_PER_REP = 4;
export const QUARTERS_PER_BAR = 4;

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Wie der Scheduler: unter 30 BPM zählt als 30, kein oberes Limit in der Audiorechnung.
export function secPerQuarter(bpm) {
  return 60 / Math.max(30, Number(bpm) || 30);
}

export function quartersPerRep(ternary) {
  return ternary ? TERNARY_QUARTERS_PER_REP : BINARY_QUARTERS_PER_REP;
}

/**
 * Geplanter Fokus-Lauf. totalSec ist die hörbare Länge bei gleichbleibendem Tempo.
 * exercises === 0 → nichts zu spielen (Nummer zu), totalSec 0.
 */
export function fokusRun({
  startId = 1,
  total = 24,
  isOpen = () => true,
  reps = 4,
  countBars = 1,
  bpm = 80,
  ternary = false,
} = {}) {
  const last = Math.max(1, Math.round(Number(total)) || 1);
  const id0 = clampInt(startId, 1, last, 1);
  const per = clampInt(reps, 1, 20, 4);
  const bars = clampInt(countBars, 0, 2, 1);
  let from = id0;
  let to = id0;
  let exercises = 0;
  for (let id = id0; id <= last; id++) {
    if (!isOpen(id)) break;
    if (exercises === 0) from = id;
    to = id;
    exercises += 1;
  }
  if (!exercises) {
    return { from: id0, to: id0, exercises: 0, reps: per, countBars: bars, totalSec: 0 };
  }
  const q = secPerQuarter(bpm);
  const countSec = bars * QUARTERS_PER_BAR * q;
  const repSec = quartersPerRep(ternary) * q;
  return {
    from,
    to,
    exercises,
    reps: per,
    countBars: bars,
    totalSec: countSec + exercises * per * repSec,
  };
}

/**
 * Restsekunden an der Audio-Uhr.
 * cycleStart ist der Beginn der Wiederholung, die der Scheduler gerade füllt
 * (nach dem Einzählen; am Ende der letzten Wiederholung das Ende des Laufs).
 * cyclesDone zählt abgeschlossene Wiederholungen. repSec gilt für alles, was noch kommt,
 * damit eine Tempoänderung unterwegs die Restzeit mitzieht.
 */
export function remainingSec({ cycleStart, now, cyclesDone, cyclesTotal, repSec }) {
  const leftCycles = Math.max(0, (Number(cyclesTotal) || 0) - (Number(cyclesDone) || 0));
  const tail = (Number(cycleStart) || 0) - (Number(now) || 0);
  const rep = Math.max(0, Number(repSec) || 0);
  return Math.max(0, tail + leftCycles * rep);
}

/** Anzeige: unter einer Minute nur die Sekunden, sonst m:ss. */
export function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return { clock: String(s), unit: "s" };
  const m = Math.floor(s / 60);
  const r = s % 60;
  return { clock: `${m}:${String(r).padStart(2, "0")}`, unit: "m" };
}
