let ctx;

export function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  return c;
}

export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(c, t, freq, dur, type, gain) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseHit(c, t, dur, gain, hp) {
  const n = c.createBufferSource();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.6);
  n.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f);
  f.connect(g);
  g.connect(c.destination);
  n.start(t);
  n.stop(t + dur + 0.02);
}

export function playMetronome(c, downbeat, t) {
  tone(c, t, downbeat ? 1320 : 990, downbeat ? 0.07 : 0.055, "square", downbeat ? 0.09 : 0.06);
}

export function playStick(c, hand, t, accent) {
  const high = hand === "R";
  tone(c, t, high ? 420 : 280, accent ? 0.12 : 0.09, "triangle", accent ? 0.22 : 0.12);
  noiseHit(c, t, accent ? 0.08 : 0.05, accent ? 0.12 : 0.06, high ? 1800 : 900);
}

export function playKit(c, voice, t, accent) {
  const a = accent ? 1.25 : 1;
  if (voice === "BD") {
    tone(c, t, 62, 0.18, "sine", 0.28 * a);
    tone(c, t, 48, 0.14, "triangle", 0.1 * a);
  } else if (voice === "SN") {
    tone(c, t, 190, 0.08, "triangle", 0.16 * a);
    noiseHit(c, t, 0.12, 0.2 * a, 1200);
  } else if (voice === "HH") {
    noiseHit(c, t, 0.04, 0.1 * a, 5000);
    tone(c, t, 7800, 0.03, "square", 0.03 * a);
  } else if (voice === "CY") {
    noiseHit(c, t, 0.45, 0.12 * a, 2400);
    tone(c, t, 420, 0.3, "triangle", 0.04 * a);
  } else if (voice === "HF") {
    noiseHit(c, t, 0.03, 0.08 * a, 3000);
    tone(c, t, 240, 0.04, "square", 0.04 * a);
  } else if (voice === "T1") {
    tone(c, t, 220, 0.14, "sine", 0.2 * a);
  } else if (voice === "T2") {
    tone(c, t, 170, 0.16, "sine", 0.2 * a);
  } else if (voice === "FT") {
    tone(c, t, 120, 0.18, "sine", 0.22 * a);
  }
}

export function startCountIn({ ctx, bpm, beats = 4, onBeat, onDone }) {
  let cancelled = false;
  const beatSec = 60 / Math.max(30, Math.min(260, bpm));
  const t0 = ctx.currentTime + 0.12;
  const timers = [];
  for (let i = 0; i < beats; i++) {
    playMetronome(ctx, i === 0, t0 + i * beatSec);
    timers.push(window.setTimeout(() => { if (!cancelled) onBeat?.(i); }, (0.12 + i * beatSec) * 1000));
  }
  timers.push(window.setTimeout(() => { if (!cancelled) onDone?.(); }, (0.12 + beats * beatSec) * 1000));
  return () => {
    cancelled = true;
    timers.forEach((id) => window.clearTimeout(id));
  };
}
