import { useEffect, useRef, useState } from "react";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { RudimentStaff } from "../lib/staff.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";
const BARS = [1, 2, 4];

const STAGES = [
  { id: "q", label: "4tel", perBeat: 1 },
  { id: "e", label: "8tel", perBeat: 2 },
  { id: "et", label: "8el-Triole", perBeat: 3, tuplet: 3 },
  { id: "s16", label: "16tel", perBeat: 4 },
  { id: "q5", label: "Quintole", perBeat: 5, tuplet: 5 },
  { id: "sx", label: "16tel-Sextole", perBeat: 6, tuplet: 6 },
  { id: "s32", label: "32tel", perBeat: 8 },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function plan(dir, stages) {
  const up = stages;
  const down = [...stages].reverse();
  if (dir === "up") return up;
  if (dir === "down") return down;
  return [...up, ...down.slice(1)];
}

function flipStick(s) {
  return s.replace(/R/g, "x").replace(/L/g, "R").replace(/x/g, "L");
}

function barLabel(n) {
  return n === 1 ? "1 Takt" : `${n} Takte`;
}

/** Always one 4/4 bar of the current subdivision. */
function barRud(stage) {
  const per = stage.perBeat;
  const dur = 4 / per;
  const notes = [];
  let hands = "";
  for (let beat = 0; beat < 4; beat++) {
    for (let i = 0; i < per; i++) {
      const hand = (beat * per + i) % 2 === 0 ? "R" : "L";
      hands += hand;
      notes.push({
        t: beat * 4 + i * dur,
        dur,
        hand,
        acc: i === 0,
        g: beat + 1,
        ...(stage.tuplet ? { tuplet: stage.tuplet } : {}),
      });
    }
  }
  return {
    label: `${stage.label} · 4/4`,
    time: "4/4",
    bars: 1,
    notes,
    sticking: [hands, flipStick(hands)],
  };
}

export default function PyramidTrainer() {
  const [bpm, setBpm] = useState(80);
  const [bars, setBars] = useState(2);
  const [dir, setDir] = useState("updown");
  const [enabled, setEnabled] = useState(() => new Set(STAGES.map((s) => s.id)));
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [idx, setIdx] = useState(0);
  const [leftBars, setLeftBars] = useState(0);
  const [playT, setPlayT] = useState(-1);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  const barsRef = useRef(2);
  bpmRef.current = bpm;
  barsRef.current = bars;
  const active = STAGES.filter((s) => enabled.has(s.id));
  const steps = plan(dir, active.length ? active : STAGES);
  const cur = steps[idx] || steps[0];
  const rud = barRud(cur);
  const curId = steps[idx]?.id;

  useEffect(() => () => stopRef.current?.(), []);

  function toggleStage(id) {
    if (playing) return;
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIdx(0);
    setDone("");
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setLeftBars(0);
    setPlayT(-1);
    setIdx(0);
  }

  function start() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const selected = STAGES.filter((s) => enabled.has(s.id));
    const run = plan(dir, selected.length ? selected : STAGES);
    const holdBars = barsRef.current;
    let cancelled = false;
    let timer = 0;
    let si = 0;
    let next = ctx.currentTime + 0.02;
    let sub = 0;
    let barsDone = 0;
    setIdx(0);
    setPlaying(true);
    setLeftBars(holdBars);

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
      setLeftBars(0);
      setPlayT(-1);
      setIdx(0);
      setDone("Pyramide fertig.");
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      const horizon = now + 0.16;
      while (next < horizon && !cancelled) {
        const curPer = run[si].perBeat;
        const down = sub % curPer === 0;
        playClick(ctx, next, down);
        const t16 = (sub % (curPer * 4)) * (4 / curPer);
        const delay = Math.max(0, (next - ctx.currentTime) * 1000);
        window.setTimeout(() => { if (!cancelled) setPlayT(t16); }, delay);
        if (down) pulse(next);
        next += 60 / Math.max(30, bpmRef.current) / curPer;
        sub += 1;
        if (sub % (curPer * 4) === 0) {
          barsDone += 1;
          if (barsDone >= holdBars) {
            if (si + 1 >= run.length) {
              finish();
              return;
            }
            si += 1;
            sub = 0;
            barsDone = 0;
            setIdx(si);
          }
          setLeftBars(Math.max(0, holdBars - barsDone));
        }
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  return (
    <div style={{ paddingBottom: "calc(220px + env(safe-area-inset-bottom, 0px))" }}>
      <p style={{ color: DIM, fontSize: 14, margin: "12px 0 16px" }}>
        Jede Stufe ist 4/4. Du wählst die Stufen und, wie viele Takte eine Stufe bleibt. Septole ist nicht dabei.
      </p>
      <div className="staff-card">
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} playingT={playT} svgId="pyramid-live" />
      </div>
      <div style={{ margin: "0 0 12px" }}>
        <div style={{ fontSize: 13, color: DIM, marginBottom: 8 }}>Stufen</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STAGES.map((s) => {
            const on = enabled.has(s.id);
            const current = playing && curId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={on ? "chip on" : "chip"}
                aria-pressed={on}
                onClick={() => toggleStage(s.id)}
                style={current ? { outline: "2px solid #e8b84b", outlineOffset: 2 } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p style={{ color: DIM, fontSize: 12, margin: "8px 0 0" }}>
          Tippen schaltet an oder aus. Mindestens eine Stufe bleibt an. Während dem Laufen gesperrt.
        </p>
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
        <div style={{ marginTop: 14, fontSize: 13, color: DIM }}>Takte pro Stufe</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {BARS.map((n) => (
            <button key={n} type="button" className={bars === n ? "chip on" : "chip"} onClick={() => !playing && setBars(n)}>{barLabel(n)}</button>
          ))}
        </div>
        <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
          Immer 4/4. Stufe wechselt nach {barLabel(bars)}, genau an der Taktgrenze.
        </p>
      </div>
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 15,
          background: "transparent",
          border: "none",
          boxShadow: "none",
          borderRadius: 0,
          margin: 0,
          padding: "8px 14px calc(14px + env(safe-area-inset-bottom, 0px))",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto", maxWidth: 880, margin: "0 auto" }}>
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label="5 BPM langsamer">−5</button>
            <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} />
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label="5 BPM schneller">+5</button>
          </div>
          {playing ? (
            <div className="count">
              <span className="count-num">{leftBars}</span>
              <span className="count-unit">{leftBars === 1 ? "Takt übrig" : "Takte übrig"}</span>
            </div>
          ) : null}
          {done ? <p style={{ color: "#5cc8b8", textAlign: "center", margin: "12px 0 0" }}>{done}</p> : null}
        </div>
      </div>
    </div>
  );
}
