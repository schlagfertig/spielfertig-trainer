let ctx;
let noiseBuf;

export function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  warmNoise(c);
  return c;
}

export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function warmNoise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const len = Math.floor(c.sampleRate * 0.22);
  noiseBuf = c.createBuffer(1, len, c.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuf;
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
  n.buffer = warmNoise(c);
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f);
  f.connect(g);
  g.connect(c.destination);
  n.start(t);
  n.stop(t + dur + 0.02);
}

function tick(c, t, f1, f2, g1, g2, d1 = 0.022, d2 = 0.04) {
  const o1 = c.createOscillator();
  const a1 = c.createGain();
  o1.connect(a1);
  a1.connect(c.destination);
  o1.frequency.setValueAtTime(f1, t);
  a1.gain.setValueAtTime(0.0001, t);
  a1.gain.exponentialRampToValueAtTime(Math.max(0.0001, g1), t + 0.001);
  a1.gain.exponentialRampToValueAtTime(0.001, t + d1);
  o1.start(t);
  o1.stop(t + d1 + 0.01);
  if (f2) {
    const o2 = c.createOscillator();
    const a2 = c.createGain();
    o2.connect(a2);
    a2.connect(c.destination);
    o2.frequency.setValueAtTime(f2, t);
    a2.gain.setValueAtTime(0.0001, t);
    a2.gain.exponentialRampToValueAtTime(Math.max(0.0001, g2), t + 0.001);
    a2.gain.exponentialRampToValueAtTime(0.001, t + d2);
    o2.start(t);
    o2.stop(t + d2 + 0.01);
  }
}

export function playClick(c, t, downbeat = false) {
  playClickLayer(c, t, downbeat ? "beat" : "quarter", downbeat ? 1 : 0.78);
}

export function playClickLayer(c, t, voice, amp) {
  const a = Math.max(0, Math.min(1, amp));
  if (a < 0.008) return;
  if (voice === "beat") tick(c, t, 2500, 1180, 0.48 * a, 0.3 * a, 0.024, 0.046);
  else if (voice === "off" || voice === "sixteenth") tick(c, t, 2050, 0, 0.22 * a, 0, 0.014, 0.014);
  else if (voice === "triplet") tick(c, t, 1560, 640, 0.28 * a, 0.14 * a, 0.02, 0.034);
  else tick(c, t, 1880, 820, 0.36 * a, 0.2 * a, 0.02, 0.038);
}

export function playMetronome(c, downbeat, t) {
  playClick(c, t, downbeat);
}

/* Tom / Snare: rechts 16er Floortom, links 14er Snare. Akzent nur lauter. */
function playFloorTom(c, t, accent, grace) {
  const a = grace ? 0.45 : accent ? 1.65 : 1;
  const dur = grace ? 0.05 : accent ? 0.2 : 0.15;
  const body = c.createOscillator();
  const bg = c.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(grace ? 128 : 104, t);
  body.frequency.exponentialRampToValueAtTime(78, t + (grace ? 0.04 : 0.09));
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.28 * a, t + 0.004);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  body.connect(bg);
  bg.connect(c.destination);
  body.start(t);
  body.stop(t + dur + 0.02);
  tone(c, t, grace ? 180 : 146, grace ? 0.04 : 0.08, "triangle", 0.06 * a);
  noiseHit(c, t, grace ? 0.02 : 0.035, 0.04 * a, 900);
}

export function playStick(c, hand, t, accent, grace = false) {
  if (hand === "R") playFloorTom(c, t, accent, grace);
  else playSnare(c, t, accent, grace);
}

export function playSnare(c, t, accent = false, grace = false) {
  const a = grace ? 0.42 : accent ? 1.75 : 1;
  const dur = grace ? 0.042 : accent ? 0.13 : 0.085;
  const body = c.createOscillator();
  const bg = c.createGain();
  body.type = "triangle";
  body.frequency.setValueAtTime(grace ? 240 : 205, t);
  body.frequency.exponentialRampToValueAtTime(grace ? 150 : 118, t + (grace ? 0.03 : 0.055));
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.16 * a, t + 0.003);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  body.connect(bg);
  bg.connect(c.destination);
  body.start(t);
  body.stop(t + dur + 0.02);

  const src = c.createBufferSource();
  src.buffer = warmNoise(c);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = grace ? 1400 : 850;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = grace ? 3800 : 3100;
  bp.Q.value = 0.85;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime((grace ? 0.12 : 0.2) * a, t + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(ng);
  ng.connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.02);

  const click = c.createOscillator();
  const cg = c.createGain();
  click.type = "square";
  click.frequency.setValueAtTime(grace ? 920 : 760, t);
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime((grace ? 0.035 : 0.06) * a, t + 0.001);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + (grace ? 0.01 : 0.014));
  click.connect(cg);
  cg.connect(c.destination);
  click.start(t);
  click.stop(t + 0.02);
}

/** Flam = 1 grace before primary. Drag = 2 graces before primary. */
export function playOrnament(c, nt, when, mode, stepSec) {
  const hit = (hand, t, acc, grace) => {
    if (mode === "stick") playStick(c, hand, t, acc, grace);
    else playSnare(c, t, acc, grace);
  };
  const flamLead = Math.min(0.058, Math.max(0.026, stepSec * 0.38));
  const dragGap = Math.min(0.038, Math.max(0.018, stepSec * 0.22));
  if (nt.roll) {
    const dur = Math.max(stepSec * 2, (nt.dur || 4) * stepSec);
    // Zwischen dem ersten Wirbel (42 ms) und dem Presswirbel (24 ms).
    const gap = 0.033;
    const count = Math.max(10, Math.min(42, Math.round(dur / gap)));
    for (let i = 0; i < count; i++) {
      hit(nt.hand, when + i * gap, i === 0, true);
    }
    return;
  }
  if (nt.flam) hit(nt.flam, when - flamLead, false, true);
  if (nt.drag) {
    hit(nt.drag, when - dragGap * 2, false, true);
    hit(nt.drag, when - dragGap, false, true);
  }
  hit(nt.hand, when, !!nt.acc, false);
}

export function playKit(c, voice, t, accent) {
  const a = accent ? 1.25 : 1;
  if (voice === "BD") {
    tone(c, t, 62, 0.18, "sine", 0.22 * a);
    tone(c, t, 48, 0.14, "triangle", 0.08 * a);
  } else if (voice === "SN") {
    playSnare(c, t, !!accent);
  } else if (voice === "HH") {
    noiseHit(c, t, 0.04, 0.08 * a, 5000);
    tone(c, t, 7800, 0.03, "square", 0.025 * a);
  } else if (voice === "CY") {
    noiseHit(c, t, 0.45, 0.1 * a, 2400);
    tone(c, t, 420, 0.3, "triangle", 0.035 * a);
  } else if (voice === "RD") {
    noiseHit(c, t, 0.09, 0.05 * a, 2800);
    tone(c, t, 1400, 0.08, "triangle", 0.05 * a);
  } else if (voice === "HO") {
    noiseHit(c, t, 0.22, 0.09 * a, 3600);
    tone(c, t, 4200, 0.1, "square", 0.028 * a);
  } else if (voice === "HF") {
    noiseHit(c, t, 0.03, 0.07 * a, 3000);
    tone(c, t, 240, 0.04, "square", 0.035 * a);
  } else if (voice === "T1") {
    tone(c, t, 220, 0.14, "sine", 0.16 * a);
  } else if (voice === "T2") {
    tone(c, t, 170, 0.16, "sine", 0.16 * a);
  } else if (voice === "FT") {
    tone(c, t, 120, 0.18, "sine", 0.18 * a);
  }
}

export function startCountIn({ ctx, bpm, beats = 4, onBeat, onDone }) {
  let cancelled = false;
  const beatSec = 60 / Math.max(30, Math.min(260, bpm));
  const t0 = ctx.currentTime + 0.02;
  const timers = [];
  for (let i = 0; i < beats; i++) {
    playClick(ctx, t0 + i * beatSec, i === 0);
    timers.push(window.setTimeout(() => { if (!cancelled) onBeat?.(i); }, Math.max(0, (t0 + i * beatSec - ctx.currentTime) * 1000)));
  }
  timers.push(window.setTimeout(() => { if (!cancelled) onDone?.(); }, Math.max(0, (t0 + beats * beatSec - ctx.currentTime) * 1000)));
  return () => {
    cancelled = true;
    timers.forEach((id) => window.clearTimeout(id));
  };
}
