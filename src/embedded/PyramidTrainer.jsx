import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { RudimentStaff } from "../lib/staff.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const INK = "#f4f7f6";
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

function BeatGlyph({ per, tuplet, on }) {
  const n = Math.max(1, per);
  const w = 48;
  const h = 24;
  const y = 16;
  const top = n === 1 ? 7 : 5;
  const ink = on ? "#06120f" : INK;
  const left = 6;
  const right = w - 6;
  const span = right - left;
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? w / 2 : left + (span * i) / (n - 1)));
  const rx = n >= 6 ? 1.8 : n >= 4 ? 2.1 : 2.5;
  const beams = n === 1 ? 0 : n === 2 || n === 3 ? 1 : n === 8 ? 3 : 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      {xs.map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.68} fill={ink} transform={`rotate(-18 ${x} ${y})`} />
          {n > 1 ? <line x1={x + 1.4} y1={y - 0.5} x2={x + 1.4} y2={top} stroke={ink} strokeWidth="0.95" /> : (
            <line x1={x + 1.6} y1={y - 0.3} x2={x + 1.6} y2={3.5} stroke={ink} strokeWidth="1.1" />
          )}
        </g>
      ))}
      {n === 1 ? <path d={`M ${xs[0] + 1.6} 3.5 C ${xs[0] + 9} 5, ${xs[0] + 9} 12, ${xs[0] + 2.6} 14`} fill="none" stroke={ink} strokeWidth="1.1" /> : null}
      {Array.from({ length: beams }, (_, b) => (
        <line key={b} x1={xs[0] + 1.4} y1={top + b * 2.1} x2={xs[n - 1] + 1.4} y2={top + b * 2.1} stroke={ink} strokeWidth={b === 0 ? 2 : 1.4} />
      ))}
      {tuplet ? (
        <text x={w / 2} y={4.5} textAnchor="middle" fill={ink} fontFamily="Figtree, sans-serif" fontSize="7.5" fontWeight="800">{tuplet}</text>
      ) : null}
    </svg>
  );
}

export default function PyramidTrainer() {
  const [bpm, setBpm] = useState(80);
  const [bars, setBars] = useState(2);
  const [dir, setDir] = useState("updown");
  const [enabled, setEnabled] = useState(() => new Set(STAGES.map((s) => s.id)));
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [countN, setCountN] = useState(0);
  const [beat, setBeat] = useState(false);
  const [idx, setIdx] = useState(0);
  const [leftBars, setLeftBars] = useState(0);
  const [playT, setPlayT] = useState(-1);
  const [done, setDone] = useState("");
  const wrapRef = useRef(null);
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  const barsRef = useRef(2);
  bpmRef.current = bpm;
  barsRef.current = bars;
  const active = STAGES.filter((s) => enabled.has(s.id));
  const steps = plan(dir, active.length ? active : STAGES);
  const cur = steps[idx] || steps[0];
  const rud = barRud(cur);
  const focus = playing || counting;

  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => {
    wrapRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollTo(0, 0);
  }, []);

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
    setCounting(false);
    setCountN(0);
    setBeat(false);
    setLeftBars(0);
    setPlayT(-1);
    setIdx(0);
  }

  function start() {
    stop();
    setDone("");
    wrapRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    const ctx = unlockAudio();
    const selected = STAGES.filter((s) => enabled.has(s.id));
    const run = plan(dir, selected.length ? selected : STAGES);
    const holdBars = barsRef.current;
    let cancelled = false;
    let timer = 0;
    let si = 0;
    let sub = 0;
    let barsDone = 0;
    setIdx(0);
    setPlaying(true);
    setCounting(true);
    setCountN(1);
    setLeftBars(holdBars);
    setPlayT(-1);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (!cancelled) {
          setBeat(true);
          window.setTimeout(() => setBeat(false), 80);
        }
      }, delay);
    };

    const q = 60 / Math.max(30, bpmRef.current);
    let next = ctx.currentTime + 0.03;
    for (let i = 0; i < 4; i++) {
      const when = next + i * q;
      playClick(ctx, when, i === 0);
      pulse(when);
      window.setTimeout(() => { if (!cancelled) setCountN(i + 1); }, Math.max(0, (when - ctx.currentTime) * 1000));
    }
    next += 4 * q;
    window.setTimeout(() => { if (!cancelled) { setCounting(false); setCountN(0); } }, Math.max(0, (next - ctx.currentTime) * 1000));

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setCounting(false);
      setCountN(0);
      setBeat(false);
      setLeftBars(0);
      setPlayT(-1);
      setIdx(0);
      setDone("Pyramide fertig.");
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (now < next - 0.02) {
        timer = window.setTimeout(schedule, 25);
        return;
      }
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
    <div className="pyramid-wrap" ref={wrapRef} style={{ paddingBottom: focus ? "calc(168px + env(safe-area-inset-bottom, 0px))" : "calc(220px + env(safe-area-inset-bottom, 0px))" }}>
      {!focus ? (
        <p style={{ color: DIM, fontSize: 13, margin: "8px 0 10px" }}>
          Stufen wählen · immer 4/4.
        </p>
      ) : null}
      <div className="staff-card" style={{ marginBottom: focus ? 0 : 10 }}>
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} playingT={counting ? -1 : playT} svgId="pyramid-live" />
      </div>
      {!focus ? (
        <div className="panel" style={{ padding: "10px 12px 12px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {STAGES.map((s) => {
              const on = enabled.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={on ? "chip on" : "chip"}
                  aria-pressed={on}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => toggleStage(s.id)}
                  style={{ padding: "4px 4px 2px", minWidth: 52 }}
                >
                  <BeatGlyph per={s.perBeat} tuplet={s.tuplet} on={on} />
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="seg" style={{ width: "fit-content" }}>
              <button type="button" className={dir === "up" ? "on" : ""} onClick={() => setDir("up")}>auf</button>
              <button type="button" className={dir === "down" ? "on" : ""} onClick={() => setDir("down")}>ab</button>
              <button type="button" className={dir === "updown" ? "on" : ""} onClick={() => setDir("updown")}>auf+ab</button>
            </div>
            <div className="seg" style={{ width: "fit-content" }}>
              {BARS.map((n) => (
                <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => setBars(n)}>{n === 1 ? "1 Takt" : `${n} T.`}</button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {counting ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(22,26,29,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "28vw", lineHeight: 0.9, color: TEAL, fontWeight: 700 }}>{countN || 1}</div>
            <div style={{ color: DIM, letterSpacing: "0.16em", fontWeight: 800, textTransform: "uppercase" }}>Einzählen</div>
          </div>
        </div>
      ) : null}
      <div
        className="pyramid-dock"
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
          padding: "6px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto", maxWidth: 880, margin: "0 auto" }}>
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label="5 BPM langsamer">−5</button>
            <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={focus ? 112 : 124} now subLabel={playing ? "Stop" : "Start"} />
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label="5 BPM schneller">+5</button>
          </div>
          {playing && !counting ? (
            <div className="count">
              <span className="count-num">{leftBars}</span>
              <span className="count-unit">{leftBars === 1 ? "Takt übrig" : "Takte übrig"}</span>
            </div>
          ) : null}
          {done ? <p style={{ color: TEAL, textAlign: "center", margin: "12px 0 0" }}>{done}</p> : null}
        </div>
      </div>
    </div>
  );
}
