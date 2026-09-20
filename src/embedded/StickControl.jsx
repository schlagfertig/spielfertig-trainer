import { useEffect, useRef, useState } from "react";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const DIM = "#8a969c";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

const n = (t, dur, hand, acc = false, extra = {}) => ({ t, dur, hand, acc, ...extra });
const run8ths = (hands) =>
  hands.split("").map((h, i) => n(i * 2, 2, h, false, { g: Math.floor(i / 4) + 1 }));

const PATTERNS = [
  "RLRLRLRLRLRLRLRL",
  "LRLRLRLRLRLRLRLR",
  "RRLLRRLLRRLLRRLL",
  "LLRRLLRRLLRRLLRR",
  "RLRRLRLLRLRRLRLL",
  "RLLRLRRLRLLRLRRL",
  "RRLRLLRLRRLRLLRL",
  "RLRLLRLRRLRLLRLR",
  "RRRLRRRLRRRLRRRL",
  "LLLRLLLRLLLRLLLR",
  "RLLLRLLLRLLLRLLL",
  "LRRRLRRRLRRRLRRR",
  "RRRRLLLLRRRRLLLL",
  "RLRLRRLLRLRLRRLL",
  "LRLRLLRRLRLRLLRR",
  "RLRLRRLRLRLRLRLL",
  "RLRLRLLRLRLRLRRL",
  "RLRLRRLRLRLRLLRL",
  "RLRLRRRLRLRLRRRL",
  "LRLRLLLRLRLRLLLR",
  "RLRLRLLLRLRLRLLL",
  "LRLRLRRRLRLRLRRR",
  "RLRLRRRRLRLRLLLL",
  "RRLLRLRRLLRRLRLL",
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

const BAR_CHOICES = [2, 4, 8];
const EMPTY_STICK = [Array(16).fill("")];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function Hands({ hands, playT, faint }) {
  const letters = String(hands || "").split("");
  const active = playT < 0 ? -1 : Math.round(playT / 2);
  return (
    <div style={{ display: "flex", gap: 10, opacity: faint ? 0.55 : 1 }}>
      {[0, 1].map((bar) => (
        <div key={bar} style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 2 }}>
          {letters.slice(bar * 8, bar * 8 + 8).map((ch, i) => {
            const idx = bar * 8 + i;
            const on = !faint && idx === active;
            const gap = i === 3 ? 8 : 0;
            return (
              <span
                key={idx}
                style={{
                  flex: 1,
                  marginRight: gap,
                  textAlign: "center",
                  font: "800 22px/1.1 Oswald, sans-serif",
                  color: on ? "#06120f" : ch === "R" ? RCOL : LCOL,
                  background: on ? "#e8b84b" : "transparent",
                  borderRadius: 6,
                  padding: "6px 0",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function StickControl() {
  const [exId, setExId] = useState(1);
  const [bpm, setBpm] = useState(80);
  const [mode, setMode] = useState("practice");
  const [barsPer, setBarsPer] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [preview, setPreview] = useState(false);
  const [done, setDone] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  bpmRef.current = bpm;
  const idx = Math.max(0, EXERCISES.findIndex((e) => e.id === exId));
  const ex = EXERCISES[idx] || EXERCISES[0];
  const prev = EXERCISES[idx - 1];
  const next = EXERCISES[idx + 1];
  const peek = mode === "challenge" ? EXERCISES[idx + 1] : null;

  useEffect(() => () => stopRef.current?.(), []);

  function pick(id) {
    if (playing) return;
    setExId(id);
    setDone("");
    setPreview(false);
  }

  function step(dir) {
    const n = EXERCISES[idx + dir];
    if (n) pick(n.id);
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setPlayT(-1);
    setPreview(false);
  }

  function start() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const challenge = mode === "challenge";
    let exIdx = challenge ? 0 : Math.max(0, idx);
    if (challenge) setExId(1);
    let notes = EXERCISES[exIdx].notes;
    const cellBars = 2;
    const cyclesNeeded = Math.max(1, Math.round(barsPer / cellBars));
    let cycleInEx = 0;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.02;
    const steps = cellBars * 16;
    setPlaying(true);
    setPreview(false);

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
      setPreview(false);
      setDone(challenge ? "1–24 durch — gehalten." : "");
    };

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
          const onQuarter = nt.t % 4 < 0.08;
          if (onQuarter) {
            playClick(ctx, when, nt.t % 16 < 0.08);
            pulse(when);
          }
          const lastCycle = cycleInEx === cyclesNeeded - 1;
          const lastBar = nt.t >= 8 - 1e-4;
          const hasNext = challenge && exIdx < EXERCISES.length - 1;
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => {
            if (cancelled) return;
            setPlayT(nt.t);
            setPreview(!!(hasNext && lastCycle && lastBar));
          }, delay);
        }
        evIndex += 1;
        if (evIndex >= notes.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
          cycleInEx += 1;
          if (cycleInEx >= cyclesNeeded) {
            if (challenge) {
              if (exIdx >= EXERCISES.length - 1) {
                finishOk();
                return;
              }
              exIdx += 1;
              notes = EXERCISES[exIdx].notes;
              cycleInEx = 0;
              window.setTimeout(() => {
                if (!cancelled) {
                  setExId(EXERCISES[exIdx].id);
                  setPreview(false);
                }
              }, 0);
            } else {
              cycleInEx = 0;
            }
          }
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
          <select
            className="rud-title-select"
            value={ex.id}
            disabled={playing}
            onChange={(e) => pick(Number(e.target.value))}
            aria-label="Nummer wählen"
          >
            {EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </div>
        <RudimentStaff rud={{ ...ex, sticking: EMPTY_STICK }} playingT={playT} svgId="stick-live" hideTime />
        <Hands hands={ex.hands} playT={playT} />
        {preview && peek ? (
          <div style={{ marginTop: 10, padding: 8, background: "#eef1f2", borderRadius: 8 }}>
            <div style={{ font: "800 13px Figtree, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", color: "#334", marginBottom: 6 }}>
              Nächste · {peek.label}
            </div>
            <Hands hands={peek.hands} playT={-1} faint />
          </div>
        ) : null}
      </div>
      <div className="seg" style={{ margin: "0 0 12px", width: "fit-content" }}>
        <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>Üben</button>
        <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>Challenge</button>
      </div>
      {mode === "challenge" ? (
        <div style={{ margin: "0 0 12px" }}>
          <div style={{ color: DIM, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Takte je Nummer</div>
          <div className="seg" style={{ width: "fit-content" }}>
            {BAR_CHOICES.map((n) => (
              <button key={n} type="button" className={barsPer === n ? "on" : ""} onClick={() => !playing && setBarsPer(n)}>{n}</button>
            ))}
          </div>
          <p style={{ color: DIM, fontSize: 15, margin: "8px 0 0" }}>
            1–24 am Stück. Letzter Takt zeigt den nächsten Fingersatz.
          </p>
        </div>
      ) : (
        <p style={{ color: DIM, fontSize: 15, margin: "0 0 12px" }}>
          Notation bleibt. Nur der Fingersatz wechselt. Tempo = Viertel.
        </p>
      )}
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className="dial-row">
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label="5 BPM langsamer">−5</button>
          <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={120} now />
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label="5 BPM schneller">+5</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
            {playing ? "Stop" : mode === "challenge" ? "1–24 Start" : "Start"}
          </button>
        </div>
        {playing && mode === "challenge" ? (
          <p style={{ color: "#5cc8b8", textAlign: "center", fontWeight: 800, margin: "12px 0 0" }}>
            {ex.label} · {ex.id}/24 · {barsPer} Takte
          </p>
        ) : null}
        {done ? <p style={{ color: "#5cc8b8", textAlign: "center", fontWeight: 700, margin: "12px 0 0" }}>{done}</p> : null}
      </div>
      <div className="rud-nav">
        <button type="button" className="rud-half prev" disabled={!prev || playing} onClick={() => step(-1)} aria-label={prev ? prev.label : "Keine vorherige Nummer"}>
          <span className="rud-half-arrow">‹</span>
          <span className="rud-half-name">{prev ? prev.label : ""}</span>
        </button>
        <button type="button" className="rud-half next" disabled={!next || playing} onClick={() => step(1)} aria-label={next ? next.label : "Keine nächste Nummer"}>
          <span className="rud-half-name">{next ? next.label : ""}</span>
          <span className="rud-half-arrow">›</span>
        </button>
      </div>
    </div>
  );
}
