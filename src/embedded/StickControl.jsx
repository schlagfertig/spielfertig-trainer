import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { NavScrub } from "../lib/NavScrub.jsx";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const INK = "#f4f7f6";
const LINE = "#3a444c";
const GOLD = "#e8b84b";
const CELL_STEPS = 32;
const INNER = 13;
const GAP = 20;
const LINE_L = 30;
const Q_PER_BAR = 4;

const n = (t, dur, hand, extra = {}) => ({ t, dur, hand, acc: false, ...extra });
const run8ths = (hands) =>
  hands.split("").map((h, i) => n(i * 2, 2, h, { g: Math.floor(i / 4) + 1 }));

const PATTERNS = [
  "RLRLRLRLRLRLRLRL", "LRLRLRLRLRLRLRLR", "RRLLRRLLRRLLRRLL", "LLRRLLRRLLRRLLRR",
  "RLRRLRLLRLRRLRLL", "RLLRLRRLRLLRLRRL", "RRLRLLRLRRLRLLRL", "RLRLLRLRRLRLLRLR",
  "RRRLRRRLRRRLRRRL", "LLLRLLLRLLLRLLLR", "RLLLRLLLRLLLRLLL", "LRRRLRRRLRRRLRRR",
  "RRRRLLLLRRRRLLLL", "RLRLRRLLRLRLRRLL", "LRLRLLRRLRLRLLRR", "RLRLRLRRLRLRLRLL",
  "RLRLRLLRLRLRLRRL", "RLRLRRLRLRLRLLRL", "RLRLRRRLRLRLRRRL", "LRLRLLLRLRLRLLLR",
  "RLRLRLLLRLRLRLLL", "LRLRLRRRLRLRLRRR", "RLRLRRRRLRLRLLLL", "RRLLRLRRLLRRLRLL",
];

const EXERCISES = PATTERNS.map((hands, i) => ({
  id: i + 1,
  label: `Nr. ${i + 1}`,
  notes: run8ths(hands),
  hands,
}));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function noteX(i) {
  const g = Math.floor(i / 4);
  const k = i % 4;
  return LINE_L + GAP + g * (INNER * 3 + GAP) + k * INNER;
}

function phraseWidth() {
  return noteX(15) + GAP + 8;
}

function Phrase({ id, hands, playT }) {
  const letters = String(hands || "").split("");
  const active = playT < 0 ? -1 : Math.round(playT / 2);
  const y = 42;
  const top = 10;
  const hy = 78;
  const xs = Array.from({ length: 16 }, (_, i) => noteX(i));
  const start = LINE_L;
  const end = xs[15] + GAP;
  const barX = (xs[7] + xs[8]) / 2;
  const stem = 4.4;
  return (
    <svg viewBox={`0 0 ${end + 8} 92`} width="100%" role="img" aria-label={`Nummer ${id}`}>
      <line x1={start} y1={y} x2={end} y2={y} stroke={LINE} strokeWidth="1.45" />
      <line x1={start} y1={y - 12} x2={start} y2={y + 12} stroke={LINE} strokeWidth="1.6" />
      <line x1={end} y1={y - 12} x2={end} y2={y + 12} stroke={LINE} strokeWidth="1.6" />
      <line x1={barX} y1={y - 12} x2={barX} y2={y + 12} stroke={LINE} strokeWidth="1.25" />
      {xs.map((x, i) => {
        const on = i === active;
        const c = on ? GOLD : INK;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx="5.4" ry="3.6" fill={c} transform={`rotate(-18 ${x} ${y})`} />
            <line x1={x + stem} y1={y - 1.2} x2={x + stem} y2={top} stroke={c} strokeWidth="0.9" />
          </g>
        );
      })}
      {[0, 1, 2, 3].map((g) => (
        <line key={g} x1={xs[g * 4] + stem} y1={top} x2={xs[g * 4 + 3] + stem} y2={top} stroke={INK} strokeWidth="3" strokeLinecap="butt" />
      ))}
      <text x="6" y={hy} fill={TEAL} fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="16">{id}.</text>
      {letters.map((ch, i) => (
        <text key={i} x={xs[i]} y={hy} textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="16" fill={i === active ? GOLD : INK}>{ch}</text>
      ))}
    </svg>
  );
}

function StickRow({ id, hands }) {
  const letters = String(hands || "").split("");
  const xs = Array.from({ length: 16 }, (_, i) => noteX(i));
  const w = phraseWidth();
  return (
    <svg viewBox={`0 0 ${w} 22`} width="100%" aria-hidden="true">
      <text x="6" y="16" fill={TEAL} fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="13">{id}.</text>
      {letters.map((ch, i) => (
        <text key={i} x={xs[i]} y="16" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="13" fill={INK}>{ch}</text>
      ))}
    </svg>
  );
}

function ListRow({ row, onPick, playing, label, near }) {
  return (
    <button type="button" onClick={() => onPick(row.id)} disabled={playing} style={{ width: "100%", marginTop: 4, background: "#14191c", border: "1px solid #2f383d", borderRadius: 12, padding: near ? "8px 8px 6px" : "6px 8px", color: "inherit", textAlign: "left", opacity: near ? 1 : 0.7 }}>
      {label ? <div style={{ color: TEAL, font: "800 11px Figtree, sans-serif", letterSpacing: "0.12em", padding: "0 4px 4px" }}>{label}</div> : null}
      <StickRow id={row.id} hands={row.hands} />
    </button>
  );
}

export default function StickControl() {
  const [exId, setExId] = useState(1);
  const [bpm, setBpm] = useState(80);
  const [mode, setMode] = useState("practice");
  const [reps, setReps] = useState(4);
  const [countBars, setCountBars] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const pinRef = useRef(null);
  const bpmRef = useRef(80);
  bpmRef.current = bpm;
  const idx = Math.max(0, EXERCISES.findIndex((e) => e.id === exId));
  const ex = EXERCISES[idx] || EXERCISES[0];
  const previous = EXERCISES.slice(0, idx);
  const upcoming = EXERCISES.slice(idx + 1);
  const challenge = mode === "challenge";

  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => {
    pinRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [exId]);

  function pick(id) {
    if (playing) return;
    setExId(id);
    setDone("");
  }
  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setCounting(false);
    setBeat(false);
    setPlayT(-1);
  }

  function start() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const isCh = mode === "challenge";
    const per = clamp(reps, 1, 20);
    const startLabel = EXERCISES[Math.max(0, idx)].label;
    const barsIn = clamp(countBars, 0, 2);
    const clicks = barsIn * Q_PER_BAR;
    let exIdx = Math.max(0, idx);
    let notes = EXERCISES[exIdx].notes;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let repsInEx = 0;
    const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
    let cycleStart = ctx.currentTime + 0.03;
    setPlaying(true);
    const pulseAt = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 80);
      }, delay);
    };
    if (clicks > 0) {
      setCounting(true);
      const q = 60 / Math.max(30, bpmRef.current);
      for (let i = 0; i < clicks; i++) {
        playClick(ctx, cycleStart + i * q, i % Q_PER_BAR === 0);
        pulseAt(cycleStart + i * q);
      }
      cycleStart += clicks * q;
      window.setTimeout(() => { if (!cancelled) setCounting(false); }, Math.max(0, (cycleStart - ctx.currentTime) * 1000));
    }
    const finishOk = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setCounting(false);
      setBeat(false);
      setPlayT(-1);
      setDone(isCh ? `Bis Nr. 24 gehalten (ab ${startLabel}).` : "");
    };
    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      const horizon = now + 0.18;
      while (!cancelled) {
        const nt = notes[evIndex];
        if (!nt) break;
        const when = cycleStart + nt.t * stepSec();
        if (when >= horizon) break;
        if (when >= now - 0.02) {
          if (nt.t % 4 < 0.08) {
            playClick(ctx, when, nt.t % 16 < 0.08);
            pulseAt(when);
          }
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(nt.t); }, delay);
        }
        evIndex += 1;
        if (evIndex >= notes.length) {
          repsInEx += 1;
          evIndex = 0;
          cycleStart += CELL_STEPS * stepSec();
          if (isCh && repsInEx >= per) {
            const nextI = exIdx + 1;
            if (nextI >= EXERCISES.length) { finishOk(); return; }
            exIdx = nextI;
            notes = EXERCISES[exIdx].notes;
            repsInEx = 0;
            window.setTimeout(() => { if (!cancelled) setExId(EXERCISES[exIdx].id); }, 0);
          }
        }
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  return (
    <div className="rud-wrap stick-wrap">
      <style>{`
        .stick-wrap {
          --rud-foot: calc(84px + env(safe-area-inset-bottom, 0px));
        }
        .stick-pin {
          position: sticky;
          top: 0;
          z-index: 14;
          background: #161a1d;
          padding: 8px 0 10px;
        }
        .stick-dock {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 18;
          background: transparent;
          border-top: none;
          border-radius: 18px 18px 0 0;
          box-shadow: none;
          overflow: visible;
        }
        .stick-dock .rud-metro {
          position: static;
          display: block;
          grid-template-columns: none;
          margin: 0;
        }
        .stick-dock .metro-face,
        .stick-dock .dock {
          position: static;
          margin: 0;
          border: 0;
          border-radius: 18px 18px 0 0;
          box-shadow: none;
          background: transparent;
          padding: 6px 12px 4px;
          max-height: none;
        }
        .stick-dock .rud-nav {
          position: relative;
          box-shadow: none;
          border-top: 1px solid #2f383d;
          background: transparent;
        }
        .stick-wrap .rud-half {
          min-height: 64px;
          gap: 8px;
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
        }
        .stick-wrap .rud-half-arrow { font-size: 36px; }
        .stick-wrap .rud-half-name { font-size: clamp(15px, 4.2vw, 20px); }
        .stick-flash, .stick-click-mini { display: none; }
        @media (orientation: landscape) {
          .stick-wrap {
            --rud-foot: calc(46px + env(safe-area-inset-bottom, 0px));
            padding-bottom: var(--rud-foot) !important;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
          }
          .stick-list, .stick-done { display: none !important; }
          .stick-dock .metro-shell { display: none !important; }
          .stick-dock { border-radius: 0; box-shadow: none; }
          .stick-pin {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 0 0 4px;
          }
          .stick-tools {
            flex: 0 0 auto;
            margin: 0 0 6px !important;
          }
          .stick-card {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: center;
            padding: 6px 10px 4px !important;
          }
          .stick-card svg {
            width: 100%;
            height: auto;
            max-height: calc(100dvh - 128px);
          }
          .stick-wrap .rud-half {
            min-height: 44px;
            padding: 4px 12px calc(4px + env(safe-area-inset-bottom, 0px));
          }
          .stick-wrap .rud-half-name { font-size: 15px; }
          .stick-click-mini {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            min-width: 68px;
            height: 34px;
            padding: 0 12px;
            border-radius: 999px;
            border: 2px solid ${playing ? "#e05c5c" : TEAL};
            background: ${playing ? "#3a1a1a" : "#13211f"};
            color: ${playing ? "#e05c5c" : TEAL};
            font: 800 12px/1 Figtree, sans-serif;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .stick-flash {
            display: block;
            pointer-events: none;
            position: fixed;
            inset: 0;
            z-index: 28;
            box-shadow: inset 0 0 0 6px ${TEAL}, inset 0 0 22px 3px rgba(92,200,184,.3);
          }
        }
      `}</style>
      {beat ? <div className="stick-flash" aria-hidden="true" /> : null}
      <div className="stick-list">
        {previous.map((row, i) => (
          <ListRow key={row.id} row={row} onPick={pick} playing={playing} near={i === previous.length - 1} label={i === previous.length - 1 ? "DAVOR" : ""} />
        ))}
      </div>
      <div className="stick-pin" ref={pinRef}>
        <div className="stick-tools" style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 10px", flexWrap: "wrap" }}>
          <div className="seg" style={{ width: "fit-content" }}>
            <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>Üben</button>
            <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>Challenge</button>
          </div>
          {challenge ? (
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: DIM, fontWeight: 700 }}>
              Wiederholungen
              <input type="number" min={1} max={20} value={reps} disabled={playing} onChange={(e) => setReps(clamp(Number(e.target.value) || 1, 1, 20))} style={{ width: 52, background: "#161a1d", color: TEAL, border: "1px solid #2f383d", borderRadius: 8, padding: "6px 8px", fontWeight: 800, fontSize: 16, textAlign: "center" }} />
            </label>
          ) : null}
          {counting ? <span style={{ color: TEAL, fontWeight: 800, letterSpacing: "0.08em" }}>COUNT-IN</span> : null}
          <button type="button" className="stick-click-mini" onClick={() => (playing ? stop() : start())}>
            {playing ? "Stop" : "Click"}
          </button>
        </div>
        <div className="stick-card" style={{ background: "#14191c", border: `1.5px solid ${TEAL}`, borderRadius: 16, padding: "12px 8px 8px" }}>
          <Phrase id={ex.id} hands={ex.hands} playT={counting ? -1 : playT} />
        </div>
      </div>
      <div className="stick-list">
        {upcoming.map((row, i) => (
          <ListRow key={row.id} row={row} onPick={pick} playing={playing} near={i === 0} label={i === 0 ? "ALS NÄCHSTES" : ""} />
        ))}
      </div>
      {done ? <p className="stick-done" style={{ color: TEAL, textAlign: "center", fontWeight: 700, margin: "12px 0 0" }}>{done}</p> : null}
      <div className="stick-dock">
        <div className="metro-shell rud-metro">
          <div className="dock metro-face">
            <div className="dial-row">
              <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))}>−5</button>
              <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} />
              <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))}>+5</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ color: DIM, fontWeight: 700, fontSize: 14 }}>Einzählen</span>
              <div className="seg" style={{ width: "fit-content" }}>
                <button type="button" className={countBars === 0 ? "on" : ""} onClick={() => setCountBars(0)}>Aus</button>
                <button type="button" className={countBars === 1 ? "on" : ""} onClick={() => setCountBars(1)}>1 Takt</button>
                <button type="button" className={countBars === 2 ? "on" : ""} onClick={() => setCountBars(2)}>2 Takte</button>
              </div>
            </div>
          </div>
        </div>
        <NavScrub
          items={EXERCISES.map((e) => ({ id: e.id, label: e.label, preview: e.hands.slice(0, 8) }))}
          index={idx}
          disabled={playing}
          onPick={pick}
        />
      </div>
    </div>
  );
}
