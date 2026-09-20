import { playClickLayer } from "./audio.js";
import { loadSession, saveSession } from "./session.js";

export const DEFAULT_MIX = {
  advanced: false,
  quarter: 75,
  off: 0,
  sixteenth: 0,
  triplet: 0,
  beat: 85,
  master: 80,
};

export const MIX_LAYERS = [
  { id: "quarter", label: "Viertel", sub: "1 2 3 4" },
  { id: "off", label: "Achtel +", sub: "und" },
  { id: "sixteenth", label: "16tel e/a", sub: "e + a" },
  { id: "triplet", label: "Triolen", sub: "3" },
  { id: "beat", label: "BEAT", sub: "1" },
  { id: "master", label: "Master", sub: "gesamt" },
];

function pct(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function readMix() {
  const s = loadSession("clickMix", DEFAULT_MIX);
  return {
    advanced: !!s.advanced,
    quarter: pct(s.quarter, 75),
    off: pct(s.off, 0),
    sixteenth: pct(s.sixteenth, 0),
    triplet: pct(s.triplet, 0),
    beat: pct(s.beat, 85),
    master: pct(s.master, 80),
  };
}

export function writeMix(mix) {
  saveSession("clickMix", mix);
}

export function layerGain(mix, id) {
  return (pct(mix[id], 0) / 100) * (pct(mix.master, 0) / 100);
}

export function extrasOn(mix) {
  return (mix.off || 0) > 0 || (mix.sixteenth || 0) > 0 || (mix.triplet || 0) > 0;
}

export function createMixClock() {
  let n16 = 0;
  let n3 = 0;
  let t16 = 0;
  let t3 = 0;
  return {
    reset(t0) {
      n16 = 0;
      n3 = 0;
      t16 = t0;
      t3 = t0;
    },
    fill(ctx, horizon, bpm, mix, onQuarter) {
      const beat = 60 / Math.max(30, bpm);
      const g = (id) => layerGain(mix, id);
      const earliest = ctx.currentTime - 0.02;
      while (t16 < earliest) {
        n16 += 1;
        t16 += beat / 4;
      }
      while (t3 < earliest) {
        n3 += 1;
        t3 += beat / 3;
      }
      while (t16 < horizon) {
        const slot = n16 % 4;
        const bar = n16 % 16;
        if (t16 >= earliest) {
          if (g("beat") > 0.008 && bar === 0) playClickLayer(ctx, t16, "beat", g("beat"));
          if (g("quarter") > 0.008 && slot === 0) playClickLayer(ctx, t16, "quarter", g("quarter"));
          if (g("off") > 0.008 && slot === 2) playClickLayer(ctx, t16, "off", g("off"));
          if (g("sixteenth") > 0.008 && (slot === 1 || slot === 3)) playClickLayer(ctx, t16, "sixteenth", g("sixteenth"));
          if (slot === 0) onQuarter?.(t16);
        }
        n16 += 1;
        t16 += beat / 4;
      }
      while (t3 < horizon) {
        if (t3 >= earliest && g("triplet") > 0.008) playClickLayer(ctx, t3, "triplet", g("triplet"));
        n3 += 1;
        t3 += beat / 3;
      }
    },
  };
}
