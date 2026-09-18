import { useEffect, useRef, useState } from "react";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function ClickTrainer() {
  const [startBpm, setStartBpm] = useState(80);
  const [bpm, setBpm] = useState(80);
  const [everySec, setEverySec] = useState(10);
  const [step, setStep] = useState(4);
  const [cap, setCap] = useState(160);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [left, setLeft] = useState(0);
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  const everyRef = useRef(10);
  const stepRef = useRef(4);
  const capRef = useRef(160);
  const playingRef = useRef(false);
  bpmRef.current = bpm;
  everyRef.current = everySec;
  stepRef.current = step;
  capRef.current = cap;
  playingRef.current = playing;

  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setLeft(0);
    setBpm(startBpm);
  }

  function start() {
    stop();
    const ctx = unlockAudio();
    let cancelled = false;
    let timer = 0;
    let next = ctx.currentTime + 0.02;
    let beatN = 0;
    let bumpAt = ctx.currentTime + everyRef.current;
    setBpm(startBpm);
    bpmRef.current = startBpm;
    setPlaying(true);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 80);
      }, delay);
    };

    const schedule = () => {
      if (cancelled) return;
      const horizon = ctx.currentTime + 0.16;
      while (next < horizon && !cancelled) {
        if (ctx.currentTime >= bumpAt - 0.001 || next >= bumpAt) {
          const nextBpm = clamp(bpmRef.current + stepRef.current, 30, Math.min(260, capRef.current));
          bpmRef.current = nextBpm;
          setBpm(nextBpm);
          bumpAt += everyRef.current;
        }
        playClick(ctx, next, beatN % 4 === 0);
        pulse(next);
        next += 60 / Math.max(30, bpmRef.current);
        beatN += 1;
      }
      setLeft(Math.max(0, bumpAt - ctx.currentTime));
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  function setStart(n) {
    const v = clamp(n, 30, 260);
    setStartBpm(v);
    if (!playingRef.current) setBpm(v);
  }

  function setDial(n) {
    const v = clamp(n, 30, 260);
    setBpm(v);
    bpmRef.current = v;
    if (!playingRef.current) setStartBpm(v);
  }

  const atCap = bpm >= cap;

  return (
    <div>
      <p style={{ color: DIM, fontSize: 14, margin: "12px 0 16px" }}>
        Click starten. Alle paar Sekunden wird das Tempo angehoben — Du bleibst am Pad.
      </p>
      <div className="panel dock" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className="dial-row">
          <button type="button" className="nudge-lg" onClick={() => setDial(bpm - 5)} aria-label="5 BPM langsamer">−5</button>
          <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={132} now />
          <button type="button" className="nudge-lg" onClick={() => setDial(bpm + 5)} aria-label="5 BPM schneller">+5</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
            {playing ? "Stop" : "Start"}
          </button>
        </div>
        {playing ? (
          <div className="count">
            {atCap ? (
              <span className="count-done">Ziel</span>
            ) : (
              <>
                <span className="count-num">{Math.max(0, Math.ceil(left))}</span>
                <span className="count-unit">Sek. bis +{step}</span>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 12 }}>Einstellung</div>
        <TempoControl bpm={startBpm} setBpm={setStart} min={30} max={260} hideNudge />
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label className="field">
            <span>Alle</span>
            <input type="number" min={2} max={60} value={everySec} onChange={(e) => setEverySec(clamp(Number(e.target.value) || 10, 2, 60))} />
            <span>Sekunden</span>
          </label>
          <label className="field">
            <span>um</span>
            <input type="number" min={1} max={20} value={step} onChange={(e) => setStep(clamp(Number(e.target.value) || 4, 1, 20))} />
            <span>BPM schneller</span>
          </label>
          <label className="field">
            <span>bis</span>
            <input type="number" min={40} max={260} value={cap} onChange={(e) => setCap(clamp(Number(e.target.value) || 160, 40, 260))} />
            <span>BPM</span>
          </label>
        </div>
        <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
          Beispiel: Start {startBpm}, alle {everySec}s +{step}, Ziel {cap}.
        </p>
      </div>
      <style>{`
        .field { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${DIM}; }
        .field input {
          width: 64px; text-align: center; font-weight: 700; font-size: 16px; color: #5cc8b8;
          background: ${INK}; border: 1px solid ${LINE}; border-radius: 8px; padding: 7px 4px;
        }
      `}</style>
    </div>
  );
}
