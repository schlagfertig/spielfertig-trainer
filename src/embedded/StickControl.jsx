import { useEffect, useRef, useState } from "react";
import { RudimentStaff } from "../lib/staff.jsx";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playSnare, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";

const n = (t, dur, hand, acc = false, extra = {}) => ({ t, dur, hand, acc, ...extra });
const run8 = (hands) => hands.split("").map((h, i) => n(i * 2, 2, h, i % 4 === 0, { g: Math.floor(i / 2) + 1 }));
const dual = (s) => [s, s.replace(/R/g, "x").replace(/L/g, "R").replace(/x/g, "L")];

// Generische Stickings in 2/4, Achtel, zwei Takte. Keine Buch-Transkription.
// TODO Tom: Liste freigeben / tauschen, wenn eigene Exercises kommen.
const EXERCISES = [
  { id: "singles", label: "Singles", time: "2/4", bars: 2, notes: run8("RLRLRLRL"), sticking: dual("RLRLRLRL") },
  { id: "doubles", label: "Doubles", time: "2/4", bars: 2, notes: run8("RRLLRRLL"), sticking: dual("RRLLRRLL") },
  { id: "paradiddle", label: "Paradiddle", time: "2/4", bars: 2, notes: run8("RLRRLRLL"), sticking: dual("RLRRLRLL") },
];

const CHALLENGES = [
  { id: "t60", kind: "time", sec: 60, label: "1 Min" },
  { id: "t120", kind: "time", sec: 120, label: "2 Min" },
  { id: "b8", kind: "bars", bars: 8, label: "8 Takte" },
  { id: "b16", kind: "bars", bars: 16, label: "16 Takte" },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function StickControl() {
  const [exId, setExId] = useState("singles");
  const [bpm, setBpm] = useState(80);
  const [mode, setMode] = useState("practice");
  const [goalId, setGoalId] = useState("t60");
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [left, setLeft] = useState(0);
  const [barsLeft, setBarsLeft] = useState(0);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  bpmRef.current = bpm;
  const ex = EXERCISES.find((e) => e.id === exId) || EXERCISES[0];
  const goal = CHALLENGES.find((c) => c.id === goalId) || CHALLENGES[0];

  useEffect(() => () => stopRef.current?.(), []);

  function stop(ok = false) {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setPlayT(-1);
    setLeft(0);
    setBarsLeft(0);
    if (ok) setDone("Challenge gehalten — geschafft.");
  }

  function start() {
    stop(false);
    setDone("");
    const ctx = unlockAudio();
    const notes = ex.notes;
    const barsEach = Math.max(1, ex.bars || 1);
    const steps = barsEach * 8;
    const challenge = mode === "challenge";
    const endAt = challenge && goal.kind === "time" ? ctx.currentTime + goal.sec : Infinity;
    let barsTarget = challenge && goal.kind === "bars" ? goal.bars : Infinity;
    let barsDone = 0;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.02;
    setPlaying(true);
    if (challenge && goal.kind === "time") setLeft(goal.sec);
    if (challenge && goal.kind === "bars") setBarsLeft(goal.bars);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (!cancelled) {
          setBeat(true);
          window.setTimeout(() => setBeat(false), 80);
        }
      }, delay);
    };

    const finishOk = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setBeat(false);
      setPlayT(-1);
      setLeft(0);
      setBarsLeft(0);
      setDone("Challenge gehalten — geschafft.");
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (challenge && goal.kind === "time" && now >= endAt) {
        finishOk();
        return;
      }
      const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
      const horizon = now + 0.16;
      while (!cancelled) {
        const nt = notes[evIndex];
        const when = cycleStart + nt.t * stepSec();
        if (when >= horizon) break;
        if (challenge && goal.kind === "time" && when >= endAt) {
          finishOk();
          return;
        }
        if (when >= now - 0.02) {
          playSnare(ctx, when, nt.acc);
          if (nt.t % 4 < 0.08) playClick(ctx, when, nt.t % 8 < 0.08);
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(nt.t); }, delay);
          if (nt.t % 4 < 0.08) pulse(when);
        }
        evIndex += 1;
        if (evIndex >= notes.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
          barsDone += barsEach;
          if (challenge && goal.kind === "bars") {
            setBarsLeft(Math.max(0, barsTarget - barsDone));
            if (barsDone >= barsTarget) {
              finishOk();
              return;
            }
          }
        }
      }
      if (challenge && goal.kind === "time") setLeft(Math.max(0, endAt - ctx.currentTime));
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
        Drei generische Stickings in 2/4, als Achtel über zwei Takte. Keine Buch-Übungen.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {EXERCISES.map((e) => (
          <button key={e.id} type="button" className={exId === e.id ? "chip on" : "chip"} onClick={() => { if (!playing) setExId(e.id); }}>{e.label}</button>
        ))}
      </div>
      <div className="staff-card">
        <div className="staff-label">{ex.label} · 2/4</div>
        <RudimentStaff rud={ex} playingT={playT} svgId="stick-live" />
      </div>
      <div className="seg" style={{ margin: "0 0 12px", width: "fit-content" }}>
        <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>Üben</button>
        <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>Challenge</button>
      </div>
      {mode === "challenge" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 0 12px" }}>
          {CHALLENGES.map((c) => (
            <button key={c.id} type="button" className={goalId === c.id ? "chip on" : "chip"} onClick={() => !playing && setGoalId(c.id)}>{c.label}</button>
          ))}
        </div>
      )}
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className="dial-row">
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label="5 BPM langsamer">−5</button>
          <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop(false) : start())} size={120} now />
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label="5 BPM schneller">+5</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop(false) : start())}>
            {playing ? "Stop" : "Start"}
          </button>
        </div>
        {playing && mode === "challenge" && goal.kind === "time" ? (
          <div className="count">
            <span className="count-num">{fmt(left)}</span>
            <span className="count-unit">noch halten</span>
          </div>
        ) : null}
        {playing && mode === "challenge" && goal.kind === "bars" ? (
          <div className="count">
            <span className="count-num">{barsLeft}</span>
            <span className="count-unit">Takte übrig</span>
          </div>
        ) : null}
        {done ? <p style={{ color: "#5cc8b8", textAlign: "center", margin: "12px 0 0" }}>{done}</p> : null}
      </div>
      <div className="panel">
        <TempoControl bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} min={30} max={200} hideNudge />
        <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
          2/4, Achtel. BPM ist der Viertel-Puls. Click auf jeder Viertel, Eins betont. Challenge zählt als Erfolg, wenn du durchhältst.
        </p>
      </div>
    </div>
  );
}
