import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { NavScrub } from "../lib/NavScrub.jsx";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const INK = "#f4f7f6";
const LINE = "#3a444c";
const GOLD = "#e8b84b";
const NOTES_PER_BAR = 8;
const CELL_STEPS = 32;
const INNER = 13;
const GAP = 20;
const LINE_L = 30;

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
        <text key={i} x={xs[i]} y={hy} textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="16" fill={i === active ? GOLD : TEAL}>{ch}</text>
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
        <text key={i} x={xs[i]} y="16" textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize="13" fill={TEAL}>{ch}</text>
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
  const [barsPer, setBarsPer] = useState(4);
  const [countIn, setCountIn] = useState(true);
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
    const per = clamp(barsPer, 1, 20);
    const startLabel = EXERCISES[Math.max(0, idx)].label;
    const useCount = countIn;
    let exIdx = Math.max(0, idx);
    let notes = EXERCISES[exIdx].notes;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let barsInEx = 0;
    let notesInBar = 0;
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
    if (useCount) {
      setCounting(true);
      const q = 60 / Math.max(30, bpmRef.current);
      for (let i = 0; i < 4; i++) {
        playClick(ctx, cycleStart + i * q, i === 0);
        pulseAt(cycleStart + i * q);
      }
      cycleStart += 4 * q;
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
        notesInBar += 1;
        if (notesInBar >= NOTES_PER_BAR) { notesInBar = 0; barsInEx += 1; }
        if (evIndex >= notes.length) { evIndex = 0; cycleStart += CELL_STEPS * stepSec(); }
        if (isCh && barsInEx >= per) {
          const nextI = exIdx + 1;
          if (nextI >= EXERCISES.length) { finishOk(); return; }
          exIdx = nextI;
          notes = EXERCISES[exIdx].notes;
          barsInEx = 0; notesInBar = 0; evIndex = 0;
          window.setTimeout(() => { if (!cancelled) setExId(EXERCISES[exIdx].id); }, 0);
          if (useCount) {
            setCounting(true);
            const q = 60 / Math.max(30, bpmRef.current);
            for (let i = 0; i < 4; i++) {
              playClick(ctx, when + stepSec() * 2 + i * q, i === 0);
              pulseAt(when + stepSec() * 2 + i * q);
            }
            cycleStart = when + stepSec() * 2 + 4 * q;
            window.setTimeout(() => { if (!cancelled) setCounting(false); }, Math.max(0, (cycleStart - ctx.currentTime) * 1000));
          } else cycleStart = when + stepSec() * 2;
          break;
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
          --rud-foot: calc(118px + env(safe-area-inset-bottom, 0px));
        }
        .stick-pin {
          position: sticky;
          top: 0;
          z-index: 14;
          background: #161a1d;
          padding: 8px 0 10px;
        }
        .stick-wrap .rud-metro { grid-template-columns: 1fr; }
        .stick-wrap .rud-metro .metro-face { border-radius: 16px 16px 0 0; }
        .stick-wrap .rud-half {
          min-height: 108px;
          gap: 12px;
          padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
        }
        .stick-wrap .rud-half-arrow {
          font-size: 52px;
        }
        .stick-wrap .rud-half-name {
          font-size: clamp(18px, 5.2vw, 24px);
        }
        @media (orientation: landscape) {
          .stick-wrap { padding-bottom: calc(var(--rud-foot) + 148px) !important; }
          .stick-wrap .rud-metro { max-height: 26dvh; }
          .stick-wrap .rud-metro .metro-face { max-height: 26dvh; padding: 6px 10px 8px; }
          .stick-wrap .rud-half { min-height: 88px; }
        }
      `}</style>
      {previous.map((row, i) => (
        <ListRow key={row.id} row={row} onPick={pick} playing={playing} near={i === previous.length - 1} label={i === previous.length - 1 ? "DAVOR" : ""} />
      ))}
      <div className="stick-pin" ref={pinRef}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 10px", flexWrap: "wrap" }}>
          <div className="seg" style={{ width: "fit-content" }}>
            <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>Üben</button>
            <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>Challenge</button>
          </div>
          {challenge ? (
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: DIM, fontWeight: 700, marginLeft: "auto" }}>
              Takte
              <input type="number" min={1} max={20} value={barsPer} disabled={playing} onChange={(e) => setBarsPer(clamp(Number(e.target.value) || 1, 1, 20))} style={{ width: 52, background: "#161a1d", color: TEAL, border: "1px solid #2f383d", borderRadius: 8, padding: "6px 8px", fontWeight: 800, fontSize: 16, textAlign: "center" }} />
            </label>
          ) : null}
          {counting ? <span style={{ color: TEAL, fontWeight: 800, letterSpacing: "0.08em" }}>COUNT-IN</span> : null}
        </div>
        <div style={{ background: "#14191c", border: `1.5px solid ${TEAL}`, borderRadius: 16, padding: "12px 8px 8px" }}>
          <Phrase id={ex.id} hands={ex.hands} playT={counting ? -1 : playT} />
        </div>
      </div>
      {upcoming.map((row, i) => (
        <ListRow key={row.id} row={row} onPick={pick} playing={playing} near={i === 0} label={i === 0 ? "ALS NÄCHSTES" : ""} />
      ))}
      {done ? <p style={{ color: TEAL, textAlign: "center", fontWeight: 700, margin: "12px 0 0" }}>{done}</p> : null}
      <div className="metro-shell rud-metro">
        <div className="panel dock metro-face">
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))}>−5</button>
            <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={96} now />
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))}>+5</button>
          </div>
          <label className="check" style={{ justifyContent: "center", marginTop: 10 }}>
            <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />4 Schläge einzählen
          </label>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
              {playing ? "Stop" : challenge ? `${ex.label}–24` : "Start"}
            </button>
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
  );
}
