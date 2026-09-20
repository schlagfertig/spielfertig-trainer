import { useEffect, useRef, useState } from "react";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";
const INK = "#161a1d";
const LINE = "#2f383d";
const HOLDS = [8, 12, 16, 24];

const STAGES = [
  { id: "q", label: "4tel", perBeat: 1 },
  { id: "qt", label: "4tel-Triole", perBeat: 3 },
  { id: "s16", label: "16tel", perBeat: 4 },
  { id: "q5", label: "Quintole", perBeat: 5 },
  { id: "sx", label: "16tel-Sextole", perBeat: 6 },
  { id: "s32", label: "32tel", perBeat: 8 },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function plan(dir) {
  const up = STAGES;
  const down = [...STAGES].reverse();
  if (dir === "up") return up;
  if (dir === "down") return down;
  return [...up, ...down.slice(1)];
}

function StageGlyph({ n }) {
  const w = 280;
  const gap = w / Math.max(1, n);
  return (
    <svg viewBox={`0 0 ${w} 48`} width="100%" height="48" aria-hidden="true">
      <line x1="0" y1="22" x2={w} y2="22" stroke="#c5cdd0" strokeWidth="1" />
      {Array.from({ length: n }, (_, i) => {
        const x = gap * i + gap * 0.35;
        return (
          <g key={i} stroke="#161a1d" fill="#161a1d">
            <ellipse cx={x} cy="22" rx="5" ry="3.4" transform={`rotate(-22 ${x} 22)`} />
            <line x1={x + 4.4} y1="20" x2={x + 4.4} y2="6" strokeWidth="1.3" />
            {n >= 4 ? <line x1={x + 4.4} y1="6" x2={x + 10} y2="9" strokeWidth="2.2" /> : null}
            {n >= 8 ? <line x1={x + 4.4} y1="10" x2={x + 10} y2="13" strokeWidth="2.2" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

export default function PyramidTrainer() {
  const [bpm, setBpm] = useState(80);
  const [hold, setHold] = useState(12);
  const [dir, setDir] = useState("updown");
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  bpmRef.current = bpm;
  const steps = plan(dir);
  const cur = steps[idx] || steps[0];

  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setLeft(0);
    setIdx(0);
  }

  function start() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const run = plan(dir);
    let cancelled = false;
    let timer = 0;
    let si = 0;
    let next = ctx.currentTime + 0.02;
    let stageEnd = next + hold;
    let sub = 0;
    setIdx(0);
    setPlaying(true);
    setLeft(hold);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (!cancelled) {
          setBeat(true);
          window.setTimeout(() => setBeat(false), 80);
        }
      }, delay);
    };

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setBeat(false);
      setLeft(0);
      setIdx(0);
      setDone("Pyramide fertig.");
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (now >= stageEnd) {
        if (si + 1 >= run.length) {
          finish();
          return;
        }
        si += 1;
        sub = 0;
        stageEnd += hold;
        setIdx(si);
      }
      const horizon = now + 0.16;
      const per = run[si].perBeat;
      while (next < horizon && !cancelled) {
        if (next >= stageEnd) break;
        const down = sub % per === 0;
        playClick(ctx, next, down);
        if (down) pulse(next);
        next += 60 / Math.max(30, bpmRef.current) / per;
        sub += 1;
      }
      setLeft(Math.max(0, stageEnd - ctx.currentTime));
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  return (
    <div>
      <p style={{ color: DIM, fontSize: 14, margin: "12px 0 16px" }}>
        Auf und ab durch Subdivisionen. Septole ist nicht dabei.
      </p>
      <div className="staff-card">
        <div className="staff-label">{cur.label} · {cur.perBeat} / Viertel</div>
        <StageGlyph n={cur.perBeat} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {steps.map((s, i) => (
            <span key={s.id + i} className={i === idx ? "chip on" : "chip"} style={{ pointerEvents: "none" }}>{s.label}</span>
          ))}
        </div>
      </div>
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className="dial-row">
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label="5 BPM langsamer">−5</button>
          <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={120} now />
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label="5 BPM schneller">+5</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
            {playing ? "Stop" : "Start"}
          </button>
        </div>
        {playing ? (
          <div className="count">
            <span className="count-num">{Math.max(0, Math.ceil(left))}</span>
            <span className="count-unit">Sek. in dieser Stufe</span>
          </div>
        ) : null}
        {done ? <p style={{ color: "#5cc8b8", textAlign: "center", margin: "12px 0 0" }}>{done}</p> : null}
      </div>
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 12 }}>Einstellung</div>
        <TempoControl bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} min={30} max={200} hideNudge />
        <div style={{ marginTop: 14, fontSize: 13, color: DIM }}>Richtung</div>
        <div className="seg" style={{ marginTop: 8, width: "fit-content" }}>
          <button type="button" className={dir === "up" ? "on" : ""} onClick={() => !playing && setDir("up")}>auf</button>
          <button type="button" className={dir === "down" ? "on" : ""} onClick={() => !playing && setDir("down")}>ab</button>
          <button type="button" className={dir === "updown" ? "on" : ""} onClick={() => !playing && setDir("updown")}>auf + ab</button>
        </div>
        <div style={{ marginTop: 14, fontSize: 13, color: DIM }}>Sekunden pro Stufe</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {HOLDS.map((s) => (
            <button key={s} type="button" className={hold === s ? "chip on" : "chip"} onClick={() => setHold(s)}>{s}s</button>
          ))}
        </div>
        <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
          BPM = Viertel. Stufe wechselt ohne Pause. Septole bewusst weggelassen.
        </p>
      </div>
    </div>
  );
}
