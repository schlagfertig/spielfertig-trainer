import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, meterPulse, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { NavScrub } from "../lib/NavScrub.jsx";
import { PrintDialog } from "./PrintDialog.jsx";

const HEAR_OK = ["snare", "hands", "click"];
const GOALS = [
  { id: "free", label: "Frei" },
  { id: "l8", loops: 8, label: "8 Loops" },
  { id: "l16", loops: 16, label: "16 Loops" },
  { id: "t120", sec: 120, label: "2 Min" },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function readRudimentSession() {
  const s = loadSession("rudiments", {});
  const sel = RUDIMENTS.some((r) => r.id === Number(s.sel)) ? Number(s.sel) : 16;
  const goalId = GOALS.some((g) => g.id === s.goalId) ? s.goalId : "free";
  return {
    sel,
    bpm: clamp(Number(s.bpm) || 80, 30, 260),
    hear: HEAR_OK.includes(s.hear) ? s.hear : "snare",
    goalId,
  };
}

export default function RudimentTrainer({ printOpen = false, onPrintClose, stage = false }) {
  const init = useRef(readRudimentSession()).current;
  const [sel, setSel] = useState(init.sel);
  const [bpm, setBpm] = useState(init.bpm);
  const [hear, setHear] = useState(init.hear);
  const [goalId, setGoalId] = useState(init.goalId);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [loopN, setLoopN] = useState(0);
  const [leftSec, setLeftSec] = useState(0);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[0];
  const idx = Math.max(0, RUDIMENTS.findIndex((r) => r.id === rud.id));
  const meterNow = meterPulse(rud.time);
  const beatsInBar = Math.max(1, Math.round(meterNow.bar / meterNow.pulse));
  const beatN = playT < 0 ? -1 : Math.floor((playT + 1e-4) / meterNow.pulse) % beatsInBar;
  const goal = GOALS.find((g) => g.id === goalId) || GOALS[0];

  useEffect(() => {
    saveSession("rudiments", { sel, bpm, hear, goalId });
  }, [sel, bpm, hear, goalId]);
  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
    setLoopN(0);
    setLeftSec(0);
  }

  function pickRud(id) {
    if (id !== sel) stop();
    setSel(id);
    setDone("");
  }

  function pulse(when, ctx) {
    const delay = Math.max(0, (when - ctx.currentTime) * 1000);
    window.setTimeout(() => {
      setBeat(true);
      window.setTimeout(() => setBeat(false), 80);
    }, delay);
  }

  function startLoop() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const notes = (rud.notes || []).filter((nt) => !nt.rest);
    const steps = rudimentDuration(rud);
    const meter = meterPulse(rud.time);
    const targetLoops = goal.loops || 0;
    const endAt = goal.sec ? ctx.currentTime + goal.sec : Infinity;
    let cancelled = false;
    let timer = 0;
    let loopsDone = 1;
    const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
    const events = () => {
      if (hearRef.current === "click") {
        const ev = [];
        for (let s = 0; s < steps; s += meter.pulse) ev.push({ t: s, kind: "click", down: s % meter.bar < 0.01 });
        return ev;
      }
      const kind = hearRef.current === "hands" ? "stick" : "snare";
      return notes.map((nt) => ({ t: nt.t, kind, nt }));
    };
    let listEv = events();
    if (!listEv.length) listEv = [{ t: 0, kind: "click", down: true }];
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.02;
    setLoopN(1);
    if (goal.sec) setLeftSec(goal.sec);

    const finishOk = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setPlayT(-1);
      setBeat(false);
      setLeftSec(0);
      setDone("Ziel gehalten — weiter so.");
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (goal.sec && now >= endAt) {
        finishOk();
        return;
      }
      const horizon = now + 0.16;
      while (!cancelled) {
        const ev = listEv[evIndex];
        const when = cycleStart + ev.t * stepSec();
        if (when >= horizon) break;
        if (goal.sec && when >= endAt) {
          finishOk();
          return;
        }
        if (when >= now - 0.02) {
          if (ev.kind === "click") playClick(ctx, when, ev.down);
          else playOrnament(ctx, ev.nt, when, ev.kind === "stick" ? "stick" : "snare", stepSec());
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(ev.t); }, delay);
          if (ev.kind === "click" || Math.abs((ev.t || 0) % meter.pulse) < 0.08) pulse(when, ctx);
        }
        evIndex += 1;
        if (evIndex >= listEv.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
          listEv = events();
          loopsDone += 1;
          setLoopN(loopsDone);
          if (targetLoops && loopsDone > targetLoops) {
            finishOk();
            return;
          }
        }
      }
      if (goal.sec) setLeftSec(Math.max(0, endAt - ctx.currentTime));
      timer = window.setTimeout(schedule, 25);
    };
    setPlaying(true);
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  return (
    <div className="rud-wrap">
      <style>{`
        .rud-wrap .rud-nav {
          background: transparent;
          box-shadow: none;
        }
        .rud-wrap .rud-metro .metro-face {
          background: transparent;
          border: none;
          box-shadow: none;
        }
      `}</style>
      <div className="staff-card">
        <div className="rud-title">
          <div className="rud-title-kicker">Rudiment wählen</div>
          <div className="rud-title-row">
            <div className="rud-title-name">{rud.label}</div>
            <span className="rud-title-caret" aria-hidden="true">▾</span>
          </div>
          <select className="rud-title-select" value={rud.id} onChange={(e) => pickRud(Number(e.target.value))} aria-label="Rudiment wählen">
            {CATS.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {RUDIMENTS.filter((r) => r.cat === c.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <RudimentStaff rud={rud} playingT={playT} svgId="rud-live" />
        <div className="beat-track" aria-live="polite">
          <div className="beat-cells">
            {Array.from({ length: beatsInBar }, (_, i) => (
              <span key={i} className={playing && beatN === i ? "on" : ""}>{i + 1}</span>
            ))}
          </div>
          <div className="beat-loop">
            {playing && goal.sec ? fmt(leftSec) : playing ? `Loop ${loopN}${goal.loops ? "/" + goal.loops : ""}` : "Loop —"}
          </div>
        </div>
        {done ? <div className="goal-done">{done}</div> : null}
        {stage ? null : <div className="staff-hint">Aktueller Schlag oben markiert · R blau · L rot</div>}
      </div>
      {stage ? null : (
        <div className="seg" style={{ margin: "0 0 12px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
          {GOALS.map((g) => (
            <button key={g.id} type="button" className={goalId === g.id ? "on" : ""} onClick={() => !playing && setGoalId(g.id)}>{g.label}</button>
          ))}
        </div>
      )}
      <div className="metro-shell rud-metro" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 16, gridTemplateColumns: "1fr" }}>
        <div
          className="dock metro-face"
          style={{
            borderRadius: "16px 16px 0 0",
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(Math.max(30, bpm - 5))} aria-label="5 BPM langsamer">−5</button>
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={stage ? 152 : 124} now subLabel={playing ? "Stop" : "Start