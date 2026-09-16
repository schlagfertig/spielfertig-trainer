import { useEffect, useRef, useState } from "react";
import { GrooveStaff } from "../lib/staff.jsx";
import { TempoControl } from "../lib/tempo.jsx";
import { playKit, playMetronome, startCountIn, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, svgToPng } from "../lib/print.js";

const DIM = "#8a969c";
const VOICES = ["CY", "HH", "SN", "T1", "T2", "FT", "BD", "HF"];
const PRESETS = {
  rock: { title: "We Will Rock You", mode: "binary", bars: 1, cells: { SN: [4, 12], BD: [0, 8] } },
  basic: { title: "Basic Rock", mode: "binary", bars: 1, cells: { HH: [0, 2, 4, 6, 8, 10, 12, 14], SN: [4, 12], BD: [0, 8] } },
  shuffle: { title: "Shuffle (ternär)", mode: "ternary", bars: 1, cells: { HH: [0, 2, 3, 5, 6, 8], SN: [3, 9], BD: [0, 6] } },
};

function emptyBars(n, mode) {
  const bar = mode === "binary" ? 16 : 12;
  return Array.from({ length: n }, () => {
    const row = {};
    VOICES.forEach((v) => { row[v] = Array(bar).fill(false); });
    return row;
  });
}
function applyPreset(p) {
  const bars = emptyBars(p.bars, p.mode);
  Object.entries(p.cells).forEach(([v, idx]) => idx.forEach((i) => { if (bars[0][v]) bars[0][v][i] = true; }));
  return bars;
}
function eventsFrom(bars, mode) {
  const bar = mode === "binary" ? 16 : 12;
  const ev = [];
  bars.forEach((b, bi) => VOICES.forEach((v) => b[v].forEach((on, i) => { if (on) ev.push({ t: bi * bar + i, voice: v }); })));
  return ev;
}

export default function DrumEditor({ handwritten, printNonce }) {
  const [mode, setMode] = useState("binary");
  const [nBars, setNBars] = useState(1);
  const [bars, setBars] = useState(() => emptyBars(1, "binary"));
  const [linked, setLinked] = useState([true]);
  const [bpm, setBpm] = useState(90);
  const [countIn, setCountIn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [title, setTitle] = useState("");
  const [fillVoice, setFillVoice] = useState("HH");
  const hold = useRef(null);
  const paint = useRef(null);
  const stopRef = useRef(null);
  const barsRef = useRef(bars); barsRef.current = bars;
  const modeRef = useRef(mode); modeRef.current = mode;
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const barSteps = mode === "binary" ? 16 : 12;
  const heads = mode === "binary"
    ? Array.from({ length: nBars * 16 }, (_, i) => ["1", "e", "+", "a"][i % 4])
    : Array.from({ length: nBars * 12 }, (_, i) => ["1", "trip", "+"][i % 3]);

  useEffect(() => { if (printNonce) share("print"); }, [printNonce]);
  useEffect(() => () => stopRef.current?.(), []);

  function resize(nextBars, nextMode) {
    const src = bars;
    const out = emptyBars(nextBars, nextMode);
    const steps = nextMode === "binary" ? 16 : 12;
    for (let i = 0; i < nextBars; i++) {
      const srcBar = src[Math.min(i, src.length - 1)];
      VOICES.forEach((v) => { for (let s = 0; s < steps; s++) out[i][v][s] = !!(srcBar && srcBar[v] && srcBar[v][s]); });
    }
    setBars(out);
    setLinked((l) => Array.from({ length: nextBars }, (_, i) => l[i] ?? i > 0));
    setNBars(nextBars);
    setMode(nextMode);
  }

  function setCell(bi, voice, step, val) {
    setBars((prev) => {
      const next = prev.map((b) => {
        const row = { ...b };
        VOICES.forEach((v) => { row[v] = b[v].slice(); });
        return row;
      });
      const apply = (idx) => { next[idx][voice][step] = val; };
      apply(bi);
      if (linked[bi]) linked.forEach((on, i) => { if (on && i !== bi) apply(i); });
      return next;
    });
  }

  function onCellDown(bi, voice, step, e) {
    e.preventDefault();
    const want = !bars[bi][voice][step];
    paint.current = { want, voice };
    if (e.pointerType === "touch") {
      hold.current = window.setTimeout(() => { setCell(bi, voice, step, want); hold.current = "paint"; }, 200);
    } else {
      setCell(bi, voice, step, want);
      hold.current = "paint";
    }
  }
  function onCellEnter(bi, voice, step) {
    if (hold.current === "paint" && paint.current && paint.current.voice === voice) setCell(bi, voice, step, paint.current.want);
  }
  function onCellUp() {
    if (hold.current && hold.current !== "paint") window.clearTimeout(hold.current);
    hold.current = null;
  }

  function fill(kind) {
    const steps = nBars * barSteps;
    let idx = [];
    if (kind === "quarter") idx = mode === "binary" ? Array.from({ length: nBars * 4 }, (_, i) => i * 4) : Array.from({ length: nBars * 4 }, (_, i) => i * 3);
    if (kind === "eighthOff") {
      const beat = mode === "binary" ? 4 : 3;
      for (let t = 0; t < steps; t += beat) idx.push(t, t + 2);
    }
    if (kind === "sixOff" && mode === "binary") { for (let t = 0; t < steps; t += 4) idx.push(t + 1, t + 3); }
    if (kind === "trip" && mode === "ternary") idx = Array.from({ length: steps }, (_, i) => i);
    setBars((prev) => {
      const next = prev.map((b) => {
        const row = { ...b };
        VOICES.forEach((v) => { row[v] = b[v].slice(); });
        return row;
      });
      idx.forEach((t) => {
        const bi = Math.floor(t / barSteps);
        const st = t % barSteps;
        if (next[bi]) next[bi][fillVoice][st] = true;
      });
      return next;
    });
  }

  function loadPreset(key) {
    const p = PRESETS[key];
    setTitle(p.title); setMode(p.mode); setNBars(p.bars); setBars(applyPreset(p)); setLinked([true]);
  }

  function stop() {
    stopRef.current?.(); stopRef.current = null; setPlaying(false); setPlayT(-1);
  }

  function play() {
    const ctx = unlockAudio();
    const ev = eventsFrom(barsRef.current, modeRef.current);
    const steps = barsRef.current.length * (modeRef.current === "binary" ? 16 : 12);
    const subdiv = modeRef.current === "binary" ? 4 : 3;
    let cancelled = false;
    const run = () => {
      const stepMs = (60000 / bpmRef.current) / subdiv;
      const t0 = ctx.currentTime + 0.06;
      ev.forEach((e) => playKit(ctx, e.voice, t0 + e.t * (stepMs / 1000)));
      for (let s = 0; s < steps; s++) {
        if (s % subdiv === 0) playMetronome(ctx, s === 0, t0 + s * (stepMs / 1000));
        window.setTimeout(() => { if (!cancelled) setPlayT(s); }, 60 + s * stepMs);
      }
      const loop = window.setTimeout(() => { if (!cancelled) run(); }, 60 + steps * stepMs);
      stopRef.current = () => { cancelled = true; window.clearTimeout(loop); };
    };
    setPlaying(true);
    if (countIn) {
      const cancelIn = startCountIn({ ctx, bpm: bpmRef.current, onDone: () => { if (!cancelled) run(); } });
      stopRef.current = () => { cancelled = true; cancelIn?.(); };
    } else run();
  }

  async function share(modeOut) {
    const svg = document.getElementById("groove-live");
    if (!svg) return;
    if (modeOut === "print") {
      printElement(`<div style="padding:16px"><h1 style="font-family:Oswald,sans-serif;color:#5CC8B8">${title || "Groove"}</h1>${svg.outerHTML}</div>`);
      return;
    }
    await deliverPng(await svgToPng(svg, 2), (title || "groove") + ".png", modeOut);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button className={mode === "binary" ? "chip on" : "chip"} onClick={() => resize(nBars, "binary")}>Binär (16tel)</button>
        <button className={mode === "ternary" ? "chip on" : "chip"} onClick={() => resize(nBars, "ternary")}>Ternär (Triolen)</button>
        {[1, 2, 4].map((n) => (
          <button key={n} className={nBars === n ? "chip on" : "chip"} onClick={() => resize(n, mode)}>{n} Takt{n > 1 ? "e" : ""}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="chip" onClick={() => loadPreset("rock")}>We Will Rock You</button>
        <button className="chip" onClick={() => loadPreset("basic")}>Basic Rock</button>
        <button className="chip" onClick={() => loadPreset("shuffle")}>Shuffle (ternär)</button>
        <button className="chip" onClick={() => { setBars(emptyBars(nBars, mode)); setTitle(""); }}>Leeren</button>
      </div>
      <input className="title-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel / Rhythmusname (für PDF)…" />
      <div className="staff-card">
        <GrooveStaff events={eventsFrom(bars, mode)} bars={nBars} mode={mode} playingT={playT} handwritten={handwritten} svgId="groove-live" />
      </div>
      <div className="panel">
        <div style={{ fontSize: 11, color: DIM, marginBottom: 8 }}>Füll-Layer auf</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {VOICES.map((v) => (
            <button key={v} className={fillVoice === v ? "chip on" : "chip"} onClick={() => setFillVoice(v)}>{v}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="chip" onClick={() => fill("quarter")}>Viertel 1 2 3 4</button>
          <button className="chip" onClick={() => fill("eighthOff")}>Achtel + Offbeat</button>
          {mode === "binary" && <button className="chip" onClick={() => fill("sixOff")}>16tel e a</button>}
          {mode === "ternary" && <button className="chip" onClick={() => fill("trip")}>Triolen</button>}
        </div>
      </div>
      <div className="grid-wrap">
        {nBars > 1 && (
          <div className="link-row">
            {bars.map((_, i) => (
              <label key={i} className="check">
                <input type="checkbox" checked={!!linked[i]} onChange={() => setLinked((l) => l.map((x, j) => (j === i ? !x : x)))} />
                Takt {i + 1} gleich
              </label>
            ))}
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: `36px repeat(${nBars * barSteps}, minmax(18px,1fr))` }}>
          <div />
          {heads.map((h, i) => <div key={"h" + i} className="gh">{h}</div>)}
          {VOICES.map((v) => [
            <div key={v + "l"} className="gv">{v}</div>,
            ...bars.flatMap((b, bi) => b[v].map((on, si) => (
              <button key={v + bi + "-" + si} className={on ? "cell on" : "cell"} aria-label={`${v} ${heads[bi * barSteps + si]} ${on ? "an" : "aus"}`} style={{ touchAction: "pan-x pan-y" }} onPointerDown={(e) => onCellDown(bi, v, si, e)} onPointerEnter={(e) => { if (e.buttons) onCellEnter(bi, v, si); }} onPointerUp={onCellUp}>
                {on ? "✓" : "–"}
              </button>
            ))),
          ])}
        </div>
      </div>
      <div className="transport">
        <TempoControl bpm={bpm} setBpm={setBpm} min={40} max={220} />
        <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : play())}>{playing ? "Stop" : "Play"}</button>
        <label className="check"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />Einzählen</label>
        <button className="ghost" onClick={() => share("print")}>Drucken</button>
        <button className="ghost" onClick={() => share("save")}>Speichern</button>
        <button className="ghost" onClick={() => share("share")}>Teilen</button>
      </div>
    </div>
  );
}
