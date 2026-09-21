import { useEffect, useRef, useState } from "react";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";
const EMPTY_STICK = [Array(16).fill("")];
const NOTES_PER_BAR = 8;

const n = (t, dur, hand, acc = false, extra = {}) => ({ t, dur, hand, acc, ...extra });
const run8ths = (hands) =>
  hands.split("").map((h, i) => n(i * 2, 2, h, false, { g: Math.floor(i / 4) + 1 }));

const PATTERNS = [
  "RLRLRLRLRLRLRLRL", "LRLRLRLRLRLRLRLR", "RRLLRRLLRRLLRRLL", "LLRRLLRRLLRRLLRR",
  "RLRRLRLLRLRRLRLL", "RLLRLRRLRLLRLRRL", "RRLRLLRLRRLRLLRL", "RLRLLRLRRLRLLRLR",
  "RRRLRRRLRRRLRRRL", "LLLRLLLRLLLRLLLR", "RLLLRLLLRLLLRLLL", "LRRRLRRRLRRRLRRR",
  "RRRRLLLLRRRRLLLL", "RLRLRRLLRLRLRRLL", "LRLRLLRRLRLRLLRR", "RLRLRRLRLRLRLRLL",
  "RLRLRLLRLRLRLRRL", "RLRLRRLRLRLRLLRL", "RLRLRRRLRLRLRRRL", "LRLRLLLRLRLRLLLR",
  "RLRLRLLLRLRLRLLL", "LRLRLRRRLRLRLRRR", "RLRLRRRRLRLRLLLL", "RRLLRLRRLLRRLRLL",
];

const EXERCISES = PATTERNS.map((hands, i) => ({
  id: i + 1,
  label: `Nr. ${i + 1}`,
  time: "2/2",
  bars: 2,
  notes: run8ths(hands),
  hands,
  sticking: [hands],
}));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function Hands({ hands, playT, compact }) {
  const letters = String(hands || "").split("");
  const active = playT < 0 ? -1 : Math.round(playT / 2);
  return (
    <div style={{ display: "flex", gap: compact ? 6 : 10, marginTop: compact ? 0 : 6 }}>
      {[0, 1].map((bar) => (
        <div key={bar} style={{ flex: 1, display: "flex", gap: 1 }}>
          {letters.slice(bar * 8, bar * 8 + 8).map((ch, i) => {
            const idx = bar * 8 + i;
            const on = idx === active;
            return (
              <span key={idx} style={{
                flex: 1,
                marginRight: i === 3 ? 6 : 0,
                textAlign: "center",
                font: compact ? "800 14px/1 Oswald, sans-serif" : "800 22px/1.1 Oswald, sans-serif",
                color: on ? "#06120f" : ch === "R" ? RCOL : LCOL,
                background: on ? "#e8b84b" : "transparent",
                borderRadius: 5,
                padding: compact ? "2px 0" : "6px 0",
              }}>{ch}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Circle({ n }) {
  return (
    <div style={{
      width: 46, height: 46, flex: "0 0 46px", borderRadius: "50%",
      border: `2px solid ${TEAL}`, color: TEAL,
      display: "grid", placeItems: "center",
      font: "800 16px Oswald, sans-serif",
    }}>{n}</div>
  );
}

export default function StickControl() {
  const [exId, setExId] = useState(1);
  const [bpm, setBpm] = useState(80);
  const [mode, setMode] = useState("practice");
  const [barsPer, setBarsPer] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  bpmRef.current = bpm;
  const idx = Math.max(0, EXERCISES.findIndex((e) => e.id === exId));
  const ex = EXERCISES[idx] || EXERCISES[0];
  const prev = EXERCISES[idx - 1];
  const next = EXERCISES[idx + 1];
  const rest = EXERCISES.slice(idx + 2);
  const challenge = mode === "challenge";

  useEffect(() => () => stopRef.current?.(), []);

  function pick(id) {
    if (playing) return;
    setExId(id);
    setDone("");
  }
  function step(dir) {
    const n0 = EXERCISES[idx + dir];
    if (n0) pick(n0.id);
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
    let exIdx = Math.max(0, idx);
    let notes = EXERCISES[exIdx].notes;
    let notesInEx = 0;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.04;
    const steps = 32;
    const targetNotes = per * NOTES_PER_BAR;
    setPlaying(true);

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
      setCounting(false);
      setBeat(false);
      setPlayT(-1);
      setDone(isCh ? `Bis Nr. 24 gehalten (ab ${startLabel}).` : "");
    };
    const countIn = (from, then) => {
      setCounting(true);
      const q = 60 / Math.max(30, bpmRef.current);
      for (let i = 0; i < 4; i++) {
        playClick(ctx, from + i * q, i === 0);
        pulse(from + i * q);
      }
      window.setTimeout(() => { if (!cancelled) setCounting(false); }, Math.max(0, (from + 4 * q - ctx.currentTime) * 1000));
      then(from + 4 * q);
    };
    const arm = (startAt) => {
      cycleStart = startAt;
      evIndex = 0;
      notesInEx = 0;
      notes = EXERCISES[exIdx].notes;
    };
    countIn(cycleStart, (when) => arm(when));

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
      const horizon = now + 0.16;
      while (!cancelled) {
        const nt = notes[evIndex];
        const when = cycleStart + nt.t * stepSec();
        if (when >= horizon) break;
        if (when >= now - 0.02) {
          if (nt.t % 4 < 0.08) {
            playClick(ctx, when, nt.t % 16 < 0.08);
            pulse(when);
          }
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(nt.t); }, delay);
        }
        evIndex += 1;
        notesInEx += 1;
        if (evIndex >= notes.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
        }
        if (notesInEx >= targetNotes) {
          if (!isCh || exIdx >= EXERCISES.length - 1) {
            finishOk();
            return;
          }
          const lastT = notes[Math.max(0, evIndex - 1)]?.t || 0;
          const handoff = cycleStart + lastT * stepSec() + stepSec() * 2;
          exIdx += 1;
          window.setTimeout(() => { if (!cancelled) setExId(EXERCISES[exIdx].id); }, 0);
          countIn(Math.max(ctx.currentTime + 0.02, handoff), (when) => arm(when));
          break;
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
    <div className="rud-wrap">
      <div className="staff-card" style={{ position: "sticky", top: 52, zIndex: 8 }}>
        <div className="rud-title">
          <div className="rud-title-name">{ex.label}</div>
          <select className="rud-title-select" value={ex.id} disabled={playing} onChange={(e) => pick(Number(e.target.value))} aria-label="Nummer wählen">
            {EXERCISES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <RudimentStaff rud={{ ...ex, sticking: EMPTY_STICK }} playingT={playT} svgId="stick-live" hideTime />
      </div>

      <div className="seg" style={{ margin: "0 0 12px", width: "fit-content" }}>
        <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>Üben</button>
        <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>Challenge</button>
      </div>
      {challenge ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: DIM, fontWeight: 700, margin: "0 0 12px" }}>
          Takte je Nummer
          <input type="number" min={1} max={20} value={barsPer} disabled={playing} onChange={(e) => setBarsPer(clamp(Number(e.target.value) || 1, 1, 20))} style={{ width: 64, background: "#161a1d", color: TEAL, border: "1px solid #2f383d", borderRadius: 8, padding: "8px 10px", fontWeight: 800, fontSize: 18, textAlign: "center" }} />
        </label>
      ) : null}

      <div style={{ background: TEAL, color: "#06120f", borderRadius: 16, padding: "14px 14px 12px", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: "800 12px Figtree, sans-serif", letterSpacing: "0.14em" }}>
          <span>{counting ? "COUNT-IN" : "NOW"}</span>
          <span>{playing ? "▶" : ""} {ex.id}/24</span>
        </div>
        <div style={{ font: "700 30px/1.05 Oswald, sans-serif", letterSpacing: "0.03em", textTransform: "uppercase", margin: "6px 0 2px" }}>{ex.label}</div>
        <div style={{ font: "800 16px Figtree, sans-serif" }}>{bpm} BPM</div>
        <div style={{ borderTop: "1px solid rgba(6,18,15,.25)", marginTop: 10, paddingTop: 8 }}>
          <Hands hands={ex.hands} playT={counting ? -1 : playT} />
        </div>
      </div>

      {next ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #2f383d", borderRadius: 14, padding: "10px 12px", marginBottom: 4, background: "#14191c" }}>
          <div style={{ color: TEAL, font: "800 11px Figtree, sans-serif", letterSpacing: "0.14em", width: 44 }}>NEXT</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 20px Oswald, sans-serif" }}>{next.label}</div>
            <Hands hands={next.hands} playT={-1} compact />
          </div>
          <Circle n={next.id} />
        </div>
      ) : null}

      {rest.map((row, i) => (
        <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #2f383d", opacity: 0.42 }}>
          <div style={{ width: 44, color: DIM, fontWeight: 800 }}>{idx + 3 + i}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "700 16px Oswald, sans-serif", color: "#c5cece" }}>{row.label}</div>
            <Hands hands={row.hands} playT={-1} compact />
          </div>
          <Circle n={row.id} />
        </div>
      ))}

      <div
        className="panel dock"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "var(--rud-foot)",
          zIndex: 16,
          margin: 0,
          borderRadius: "16px 16px 0 0",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={108} now />
          <div style={{ flex: 1, border: `1px solid ${TEAL}`, borderRadius: 14, padding: "10px 12px", display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: TEAL, font: "800 11px Figtree, sans-serif", letterSpacing: "0.14em" }}>NEXT</div>
              <div style={{ font: "700 20px/1.1 Oswald, sans-serif", margin: "2px 0 4px" }}>{next ? next.label : "—"}</div>
              <div style={{ color: TEAL, fontWeight: 800 }}>{ex.id}{next ? ` → ${next.id}` : " · Ende"}</div>
            </div>
            <div style={{ width: 1, background: "#2f383d" }} />
            <div style={{ flex: 1, minWidth: 0, color: DIM, fontSize: 13 }}>
              {next ? <Hands hands={next.hands} playT={-1} compact /> : "Letzte Nummer"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))}>−5</button>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
            {playing ? "Stop" : challenge ? `${ex.label}–24` : "Start"}
          </button>
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))}>+5</button>
        </div>
        {done ? <p style={{ color: TEAL, textAlign: "center", fontWeight: 700, margin: "12px 0 0" }}>{done}</p> : null}
      </div>

      <div className="rud-nav">
        <button type="button" className="rud-half prev" disabled={!prev || playing} onClick={() => step(-1)}>
          <span className="rud-half-arrow">‹</span>
          <span className="rud-half-name">{prev ? prev.label : ""}</span>
        </button>
        <button type="button" className="rud-half next" disabled={!next || playing} onClick={() => step(1)}>
          <span className="rud-half-name">{next ? next.label : ""}</span>
          <span className="rud-half-arrow">›</span>
        </button>
      </div>
    </div>
  );
}
