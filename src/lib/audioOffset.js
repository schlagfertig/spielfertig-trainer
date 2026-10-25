// Latenz (ms): der gehörte Click kommt auf Bluetooth später als der Puls auf dem Bildschirm.
// Der Scheduler plant den Click nur ~160 ms voraus. Den Ton um bis zu 200 ms vorzuziehen
// würde viele Clicks in die Vergangenheit legen (Web Audio spielt sie dann sofort, das Raster rutscht).
// Stattdessen bleibt der Click auf der Audio-Uhr, und Bild (Puls, Zählzeit, Notencursor) wartet
// um denselben Offset. Bei 0 ms bleibt alles wie bisher.
import { loadSession, saveSession } from "./session.js";

export const AUDIO_OFFSET_KEY = "audioOffset";
export const OFFSET_MIN = 0;
export const OFFSET_MAX = 200;
export const OFFSET_STEP = 5;

const listeners = new Set();
let state = null;

export function clampAudioOffsetMs(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  const stepped = Math.round(v / OFFSET_STEP) * OFFSET_STEP;
  return Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, stepped));
}

// Summe aus baseLatency + outputLatency, wenn der Browser sie nennt. Nie ein fester Bluetooth-Wert.
export function latencyHintMs(baseLatency, outputLatency) {
  const parts = [baseLatency, outputLatency].map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!parts.length) return null;
  const ms = parts.reduce((sum, n) => sum + n, 0) * 1000;
  if (!(ms > 0)) return null;
  return clampAudioOffsetMs(ms);
}

function emit() {
  const ms = state.ms;
  listeners.forEach((fn) => {
    try { fn(ms); } catch { /* Anzeige */ }
  });
}

function ensure() {
  if (state) return state;
  const saved = loadSession(AUDIO_OFFSET_KEY, {});
  if (Number.isFinite(Number(saved.ms))) {
    state = { ms: clampAudioOffsetMs(saved.ms), touched: saved.touched !== false };
  } else {
    state = { ms: 0, touched: false };
  }
  return state;
}

export function getAudioOffsetMs() {
  return ensure().ms;
}

export function getAudioOffsetSec() {
  return getAudioOffsetMs() / 1000;
}

export function setAudioOffsetMs(n) {
  const s = ensure();
  s.ms = clampAudioOffsetMs(n);
  s.touched = true;
  saveSession(AUDIO_OFFSET_KEY, { ms: s.ms, touched: true });
  emit();
  return s.ms;
}

// Einmalig, solange du den Regler noch nicht angefasst hast. 0 oder fehlende Werte lassen den Offset bei 0.
export function seedAudioOffset(ctx) {
  const s = ensure();
  if (s.touched) return s.ms;
  const hint = latencyHintMs(ctx?.baseLatency, ctx?.outputLatency);
  if (hint == null) return s.ms;
  s.ms = hint;
  s.touched = true;
  saveSession(AUDIO_OFFSET_KEY, { ms: s.ms, touched: true });
  emit();
  return s.ms;
}

export function subscribeAudioOffset(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Wartezeit bis zum Bild: Audio-Zeit `when` plus Offset. Bei Offset 0 identisch zur alten Rechnung.
export function beatDelayMs(ctx, when) {
  const now = Number(ctx?.currentTime);
  const t = Number(when);
  const off = getAudioOffsetMs();
  if (!Number.isFinite(t)) return off;
  const base = Number.isFinite(now) ? (t - now) * 1000 : 0;
  // setTimeout löst in ganzen Millisekunden aus. Runden hält 0 ms exakt auf der alten Wartezeit.
  return Math.max(0, Math.round(base + off));
}

// Für Anzeigen, die direkt an der Audio-Uhr hängen (NoClick-Balken): „jetzt“ hinkt um den Offset hinterher.
export function visualAudioNow(ctx) {
  const now = Number(ctx?.currentTime);
  if (!Number.isFinite(now)) return 0;
  return now - getAudioOffsetSec();
}
