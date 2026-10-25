import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playSnare, unlockAudio } from "../lib/audio.js";
import { beatDelayMs } from "../lib/audioOffset.js";
import { loadSession, saveSession } from "../lib/session.js";
import { t } from "../lib/i18n.js";

const TEAL = "#5cc8b8";
const KEY = "etude";
const LENGTHS = [1, 2, 4, ...Array.from({ length: 15 }, (_, i) => 8 + i * 4)];
const PATTERNS = Array.from({ length: 16 }, (_, n) => [0, 1, 2, 3].map((i) => ((n >> (3 - i)) & 1) === 1));

const LEVELS = [
  { id: 1, label: "1", hint: "Eine Kachel = 1 Takt", units: 1 },
  { id: 2, label: "2", hint: "Eine Kachel = 2 Viertel", units: 2 },
  { id: 3, label: "3", hint: "Eine Kachel = 1 Viertel", units: 4 },
];

function unitsFor(level) {
  return LEVELS.find((l) => l.id === level).units;
}

function blank(level, bars) {
  return Array(bars * unitsFor(level)).fill(0);
}

function Mini({ bits, on }) {
  return (
    <span className={`mini${on ? " on" : ""}`} aria-hidden="true">
      {bits.map((bit, i) => <i key={i} className={bit ? "hit" : ""} />)}
    </span>
  );
}

export default function SnareEtude() {
  const saved = loadSession(KEY, {});
  const [level, setLevel] = useState(saved.level || 1);
  const [bars, setBars] = useState(LENGTHS.includes(saved.bars) ? saved.bars : 4);
  const [slots, setSlots] = useState(saved.slots || blank(saved.level || 1, saved.bars || 4));
  const [brush, setBrush] = useState(15);
  const [mode, setMode] = useState("build");
  const [bpm, setBpm] = useState(saved.bpm || 80);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const stopRef = useRef(null);

  useEffect(() => { saveSession(KEY, { level, bars, slots, bpm }); }, [level, bars, slots, bpm]);

  function applyLevel(next) {
    stop();
    setLevel(next);
    setSlots(blank(next, bars));
  }
  function applyBars(next) {
    stop();
    setBars(next);
    setSlots(blank(level, next));
  }
  function paint(i) {
    setSlots((s) => s.map((v, idx) => idx === i ? brush : v));
  }
  function randomFill() {
    setSlots(Array.from({ length: bars * unitsFor(level) }, () => Math.floor(Math.random() * 16)));
  }
  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setStep(-1);
  }
  function start() {
    const ctx = unlockAudio();
    const per = level === 1 ? 4 : 4;
    const flat = slots.flatMap((id) => PATTERNS[id]);
    const stepBeats = level === 1 ? 1 : level === 2 ? 0.5 : 0.25;
    let n = 0;
    let next = ctx.currentTime + 0.05;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      while (next < ctx.currentTime + 0.18) {
        const i = n % flat.length;
        const inUnit = i % 4;
        const down = level === 1 ? inUnit === 0 : level === 2 ? inUnit === 0 : inUnit === 0 && Math.floor(i / 4) % 4 === 0;
        playClick(ctx, next, down);
        if (flat[i]) playSnare(ctx, next, down);
        const when = next;
        const at = i;
        window.setTimeout(() => { if (!cancelled) setStep(at); }, beatDelayMs(ctx, when));
        next += (60 / bpm) * stepBeats;
        n += 1;
      }
      if (stopRef.current) stopRef.current.timer = window.setTimeout(schedule, 40);
    };
    stopRef.current = () => { cancelled = true; window.clearTimeout(stopRef.current?.timer); };
    schedule();
    setPlaying(true);
    setMode("play");
  }

  const units = unitsFor(level);
  const active = step < 0 ? -1 : Math.floor(step / 4);

  return (
    <div className="etude">
      <div className="seg" style={{ width: "fit-content" }}>
        <button type="button" className={mode === "build" ? "on" : ""} onClick={() => { stop(); setMode("build"); }}>{t("Bauen")}</button>
        <button type="button" className={mode === "play" ? "on" : ""} onClick={() => setMode("play")}>{t("Üben")}</button>
      </div>
      <p className="etude-hint">{t(LEVELS.find((l) => l.id === level).hint)}. {t("Tippe eine Vierer-Kachel, dann die Stelle in der Etüde.")}</p>
      {mode === "build" ? (
        <>
          <div className="etude-row">
            <div className="seg">{LEVELS.map((l) => <button key={l.id} type="button" className={level === l.id ? "on" : ""} onClick={() => applyLevel(l.id)}>{l.label}</button>)}</div>
            <button type="button" className="play" onClick={randomFill}>{t("Zufall")}</button>
          </div>
          <div className="etude-len" role="listbox" aria-label={t("Takte")}>
            {LENGTHS.map((n) => <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => applyBars(n)}>{n}</button>)}
          </div>
          <div className="etude-palette">
            {PATTERNS.map((bits, id) => (
              <button key={id} type="button" className={brush === id ? "on" : ""} onClick={() => setBrush(id)} aria-label={t("Baustein {n}", { n: id + 1 })}>
                <Mini bits={bits} on={brush === id} />
              </button>
            ))}
          </div>
          {Array.from({ length: bars }, (_, b) => (
            <div key={b} className="etude-bar">
              <span>{t("Takt")} {b + 1}</span>
              <div className="etude-slots">
                {Array.from({ length: units }, (_, u) => {
                  const i = b * units + u;
                  return (
                    <button key={u} type="button" className={active === i ? "live" : ""} onClick={() => paint(i)}>
                      <Mini bits={PATTERNS[slots[i] || 0]} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="etude-play">
            {Array.from({ length: bars }, (_, b) => (
              <div key={b} className="etude-bar">
                <span>{b + 1}</span>
                <div className="etude-slots">
                  {Array.from({ length: units }, (_, u) => {
                    const i = b * units + u;
                    return <Mini key={u} bits={PATTERNS[slots[i] || 0]} on={active === i} />;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="etude-dial">
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={false} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} wheel />
          </div>
        </>
      )}
      <style>{`
        .etude-hint { color: #8a969c; font-size: 14px; margin: 8px 0; }
        .etude-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .etude-len { display: flex; gap: 6px; overflow-x: auto; padding: 8px 0 10px; }
        .etude-len button { min-width: 42px; min-height: 36px; border-radius: 999px; border: 1px solid #2f383d; background: #14191c; color: #f4f7f6; font-weight: 800; }
        .etude-len button.on { background: ${TEAL}; color: #06120f; border-color: ${TEAL}; }
        .etude-palette { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 8px 0 14px; }
        .etude-palette button, .etude-slots button { min-height: 44px; border-radius: 12px; border: 1px solid #2f383d; background: #14191c; }
        .etude-palette button.on { border-color: ${TEAL}; box-shadow: inset 0 0 0 1px ${TEAL}; }
        .etude-bar { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
        .etude-bar span { width: 62px; color: ${TEAL}; font-weight: 800; }
        .etude-slots { display: flex; gap: 6px; flex-wrap: wrap; }
        .etude-slots button.live, .mini.on { outline: 2px solid ${TEAL}; }
        .mini { display: inline-flex; gap: 3px; }
        .mini i { width: 8px; height: 16px; border-radius: 3px; background: #2a3338; display: block; }
        .mini i.hit { background: ${TEAL}; }
        .etude-dial { display: flex; justify-content: center; margin-top: 12px; }
        .etude-play { max-height: 46vh; overflow: auto; }
      `}</style>
    </div>
  );
}
