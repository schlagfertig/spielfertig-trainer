// Rudiment-Würfel: würfelt kurze Etüden aus den 40 Rudiments zusammen. Reines Datenmodul (ohne DOM).
// Jeder Takt ist ein Rudiment im Etüden-Takt: 4/4 (2/4-Rudiments zweimal hintereinander) oder 6/8.
import { RUDIMENTS } from "./rudiments.js";

export const LENGTHS = [4, 8];
export const LEVELS = [
  { id: "leicht", label: "Leicht" },
  { id: "mittel", label: "Mittel" },
  { id: "schwer", label: "Schwer" },
];
export const METERS = ["4/4", "6/8"];

// Schwierigkeit je Rudiment-Nummer (PAS). 6/8-Rudiments (17, 19, 33, 39) nur im 6/8-Pool.
// Nr. 15 (Seventeen Stroke Roll) passt mit 12 Sechzehnteln in keinen 4/4-Takt - bleibt draußen.
export const POOLS = {
  "4/4": {
    leicht: [1, 5, 6, 16, 18, 20, 22, 31],
    mittel: [2, 3, 4, 7, 8, 9, 10, 21, 23, 24, 29, 32, 34, 35],
    schwer: [11, 12, 13, 14, 25, 26, 27, 28, 30, 36, 37, 38, 40],
  },
  "6/8": {
    leicht: [17, 19],
    mittel: [17, 19, 33],
    schwer: [17, 33, 39],
  },
};

export const BPM = { leicht: 70, mittel: 80, schwer: 90 };
export const BPM_MIN = 40;
export const BPM_MAX = 160;

export function rudById(id) {
  return RUDIMENTS.find((r) => r.id === id);
}

export function barSteps(meter) {
  return meter === "6/8" ? 12 : 16;
}

// Rudiment in genau einen Etüden-Takt bringen (für Notenbild + Wiedergabe).
export function barOf(id, meter = "4/4") {
  const r = rudById(id);
  if (!r) return null;
  const [num, den] = String(r.time).split("/").map(Number);
  const len = (r.bars || 1) * num * (16 / den);
  const target = barSteps(meter);
  const reps = Math.max(1, Math.round(target / len));
  const notes = [];
  for (let k = 0; k < reps; k++) {
    for (const nt of r.notes) notes.push({ ...nt, t: nt.t + k * len, ...(nt.g != null ? { g: nt.g + k * 100 } : {}) });
  }
  let sticking;
  const row = r.sticking?.[0];
  if (row) sticking = [Array.isArray(row) ? Array.from({ length: reps }, () => row).flat() : row.repeat(reps)];
  return { id: r.id, label: r.label, cat: r.cat, time: meter, bars: 1, notes, sticking, reps };
}

function pick(pool, rnd, avoid = []) {
  const opts = pool.filter((id) => !avoid.includes(id));
  const from = opts.length ? opts : pool;
  return from[Math.floor(rnd() * from.length) % from.length];
}

// only: bei der kostenlosen Version nur diese Rudiment-Nummern.
// Schnittmenge leer (Mittel/Schwer, die sechs liegen alle in „leicht“): die vorgegebene Liste.
// 6/8 enthält keine der sechs — der Aufrufer muss 6/8 dann gar nicht würfeln.
function poolFor(meter, level, only) {
  let pool = POOLS[meter]?.[level] || POOLS["4/4"].leicht;
  if (!Array.isArray(only) || !only.length) return pool;
  const allow = new Set(only.map(Number));
  const filtered = pool.filter((id) => allow.has(id));
  return filtered.length ? filtered : only.map(Number);
}

// Neue Etüde: keine zwei gleichen Takte direkt hintereinander (soweit der Pool das hergibt).
export function rollEtude({ bars = 4, level = "leicht", meter = "4/4", only = null } = {}, rnd = Math.random) {
  const pool = poolFor(meter, level, only);
  const ids = [];
  for (let i = 0; i < bars; i++) ids.push(pick(pool, rnd, i ? [ids[i - 1]] : []));
  return { bars, level, meter, ids };
}

// Einen Takt neu würfeln: anders als vorher und als die Nachbarn.
export function rerollBar(etude, i, rnd = Math.random, only = null) {
  const pool = poolFor(etude.meter, etude.level, only);
  const avoid = [etude.ids[i], etude.ids[i - 1], etude.ids[i + 1]].filter((x) => x != null);
  const ids = etude.ids.slice();
  ids[i] = pick(pool, rnd, avoid);
  if (ids[i] === etude.ids[i] && pool.length > 1) ids[i] = pick(pool, rnd, [etude.ids[i]]);
  return { ...etude, ids };
}

// Wiedergabe-Ereignisse der ganzen Etüde (t in 16teln ab Takt 1).
export function etudeEvents(etude, { click = true, snare = true } = {}) {
  const steps = barSteps(etude.meter);
  const pulse = etude.meter === "6/8" ? 6 : 4;
  const ev = [];
  etude.ids.forEach((id, b) => {
    const bar = barOf(id, etude.meter);
    const off = b * steps;
    if (click) for (let s = 0; s < steps; s += pulse) ev.push({ t: off + s, kind: "click", down: s === 0, bar: b });
    if (snare) for (const nt of bar.notes) if (!nt.rest) ev.push({ t: off + nt.t, kind: "snare", nt, bar: b });
  });
  ev.sort((a, b) => a.t - b.t || (a.kind === "click" ? -1 : 1));
  return { ev, total: steps * etude.ids.length, steps };
}
