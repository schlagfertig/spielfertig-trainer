import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playSnare, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { t } from "../lib/i18n.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const KEY = "etude";

const LEVELS = [
  { id: 1, label: "1", hint: "Viertel im Takt", per: 4 },
  { id: 2, label: "2", hint: "Achtel über 2 Viertel", per: 8 },
  { id: 3, label: "3", hint: "16tel pro Viertel", per: 16 },
];

function empty(level, bars) {
  const per = LEVELS.find((l) => l.id === level).per;
  return Array.from({ length: bars }, () => Array(per).fill(false));
}

function randomize(level, bars) {
  const per = LEVELS.find((l) => l.id === level).per;
  return Array.from({ length: bars }, () => {
    const row = Array.from({ length: per }, () => Math.random() < 0.5);
    if (!row.some(Boolean)) row[Math.floor(Math.random() * per)] = true;
    return row;
  });
}

function EtudeStaff({ grid, level, step }) {
  const per = grid[0]?.length || 4;
  const w = 64 + grid.length * per * (level === 1 ? 28 : level === 2 ? 18 : 14);
  const h = 92;
  const notes = [];
  grid.forEach((bar, b) => bar.forEach((on, i) => notes.push({ on, x: 36 + (b * per + i) * (level === 1 ? 28 : level === 2 ? 18 : 14) })));
  return (
    <svg className="etude-staff" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t("Etüde")}>
      {[0, 1, 2, 3, 4].map((n) => <line key={n} x1="16" x2={w - 12} y1={22 + n * 8} y2={22 + n * 8} stroke="#8aa" strokeWidth="1" />)}
      <text x="18" y="18" fill={INK} fontSize="11" fontFamily="Figtree, sans-serif">4/4</text>
      {notes.map((n, i) => (
        <g key={i}>
          {n.on ? <ellipse cx={n.x} cy="46" rx="5.2" ry="3.6" fill={i === step ? TEAL : INK} /> : <text x={n.x - 3} y="50" fill="#8a969c" fontSize="14">·</text>}
          {i === step ? <line x1={n.x} x2={n.x} y1="12" y2="80" stroke={TEAL} strokeWidth="1.5" opacity="0.7" /> : null}
        </g>
      ))}
    </svg>
  );
}

export default function SnareEtude() {
  const saved = loadSession(KEY, {});
  const [level, setLevel] = useState(saved.level || 1);
  const [bars, setBars] = useState(saved.bars || 2);
  const [grid, setGrid] = useState(saved.grid || empty(saved.level || 1, saved.bars || 2));
  const [mode, setMode] = useState("build");
  const [bpm, setBpm] = useState(saved.bpm || 80);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const stopRef = useRef(null);

  useEffect(() => { saveSession(KEY, { level, bars, grid, bpm }); }, [level, bars, grid, bpm]);

  function applyLevel(next) {
    stop();
    setLevel(next);
    setGrid(empty(next, bars));
  }
  function applyBars(next) {
    stop();
    setBars(next);
    setGrid(empty(level, next));
  }
  function toggle(b, i) {
    setGrid((g) => g.map((row, bi) => bi === b ? row.map((on, ii) => ii === i ? !on : on) : row));
  }
  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setStep(-1);
  }
  function start() {
    const ctx = unlockAudio();
    const per = LEVELS.find((l) => l.id === level).per;
    const flat = grid.flat();
    const stepBeats = 4 / per;
    let n = 0;
    let next = ctx.currentTime + 0.05;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      while (next < ctx.currentTime + 0.18) {
        const i = n % flat.length;
        const beat = Math.floor((n % per) / (per / 4));
        playClick(ctx, next, beat === 0);
        if (flat[i]) playSnare(ctx, next, beat === 0);
        const when = next;
        window.setTimeout(() => { if (!cancelled) setStep(i); }, Math.max(0, (when - ctx.currentTime) * 1000));
        next += (60 / bpm) * stepBeats;
        n += 1;
      }
      stopRef.current && (stopRef.current.timer = window.setTimeout(schedule, 40));
    };
    stopRef.current = () => { cancelled = true; window.clearTimeout(stopRef.current?.timer); };
    schedule();
    setPlaying(true);
    setMode("play");
  }

  const per = LEVELS.find((l) => l.id === level).per;
  const group = level === 1 ? 1 : level === 2 ? 4 : 4;

  return (
    <div className="etude">
      <div className="seg" style={{ width: "fit-content" }}>
        <button type="button" className={mode === "build" ? "on" : ""} onClick={() => { stop(); setMode("build"); }}>{t("Bauen")}</button>
        <button type="button" className={mode === "play" ? "on" : ""} onClick={() => setMode("play")}>{t("Üben")}</button>
      </div>
      <p className="etude-hint">{t(LEVELS.find((l) => l.id === level).hint)}. {t("Ein Baustein ist eine Zelle, kein Buchstabe.")}</p>
      {mode === "build" ? (
        <>
          <div className="etude-row">
            <div className="seg">{LEVELS.map((l) => <button key={l.id} type="button" className={level === l.id ? "on" : ""} onClick={() => applyLevel(l.id)}>{l.label}</button>)}</div>
            <div className="seg">{[1, 2, 4, 8].map((n) => <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => applyBars(n)}>{n}</button>)}</div>
            <button type="button" className="play" onClick={() => setGrid(randomize(level, bars))}>{t("Zufall")}</button>
          </div>
          {grid.map((row, b) => (
            <div key={b} className="etude-bar">
              <span>{t("Takt")} {b + 1}</span>
              <div className="etude-cells">
                {row.map((on, i) => (
                  <button key={i} type="button" className={on ? "on" : ""} style={{ marginRight: (i + 1) % group === 0 ? 8 : 3 }} onClick={() => toggle(b, i)} />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <EtudeStaff grid={grid} level={level} step={step} />
          <div className="etude-dial">
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={false} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} wheel />
          </div>
        </>
      )}
      <style>{`
        .etude-hint { color: #8a969c; font-size: 14px; margin: 8px 0; }
        .etude-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
        .etude-bar { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
        .etude-bar span { width: 62px; color: ${TEAL}; font-weight: 800; }
        .etude-cells { display: flex; flex-wrap: wrap; }
        .etude-cells button { width: 28px; height: 36px; border-radius: 8px; border: 1px solid #2f383d; background: #14191c; }
        .etude-cells button.on { background: ${TEAL}; border-color: ${TEAL}; }
        .etude-staff { width: 100%; height: auto; background: #f4f7f6; border-radius: 16px; }
        .etude-dial { display: flex; justify-content: center; margin-top: 12px; }
      `}</style>
    </div>
  );
}
