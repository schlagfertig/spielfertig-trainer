import { useEffect, useRef, useState } from "react";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { ClickAdvanced } from "../lib/ClickAdvanced.jsx";
import { createMixClock, extrasOn, readMix, writeMix } from "../lib/clickMix.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";
const MINS = [1, 2, 5, 10];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function fmtLeft(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function readClickSession() {
  const s = loadSession("click", {});
  const startBpm = clamp(Number(s.startBpm) || 80, 30, 260);
  return {
    mode: s.mode === "sixteenth" ? "sixteenth" : "ramp",
    mins: MINS.includes(Number(s.mins)) ? Number(s.mins) : 2,
    startBpm,
    everySec: clamp(Number(s.everySec) || 10, 2, 60),
    step: clamp(Number(s.step) || 4, 1, 20),
    cap: clamp(Number(s.cap) || 160, 40, 260),
  };
}

function useMixNow(mix, flipped) {
  return flipped || extrasOn(mix);
}

export default function ClickTrainer() {
  const init = useRef(readClickSession()).current;
  const [mode, setMode] = useState(init.mode);
  const [mins, setMins] = useState(init.mins);
  const [startBpm, setStartBpm] = useState(init.startBpm);
  const [bpm, setBpm] = useState(init.startBpm);
  const [everySec, setEverySec] = useState(init.everySec);
  const [step, setStep] = useState(init.step);
  const [cap, setCap] = useState(init.cap);
  const [mix, setMix] = useState(() => readMix());
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [left, setLeft] = useState(0);
  const [done, setDone] = useState("");
  const [bgHint, setBgHint] = useState(false);
  const stopRef = useRef(null);
  const bpmRef = useRef(init.startBpm);
  const everyRef = useRef(init.everySec);
  const stepRef = useRef(init.step);
  const capRef = useRef(init.cap);
  const playingRef = useRef(false);
  const modeRef = useRef(mode);
  const mixRef = useRef(mix);
  const flippedRef = useRef(flipped);
  bpmRef.current = bpm;
  everyRef.current = everySec;
  stepRef.current = step;
  capRef.current = cap;
  playingRef.current = playing;
  modeRef.current = mode;
  mixRef.current = mix;
  flippedRef.current = flipped;

  useEffect(() => {
    saveSession("click", { mode, mins, startBpm, everySec, step, cap });
  }, [mode, mins, startBpm, everySec, step, cap]);
  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && playingRef.current) setBgHint(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function halt(resetBpm = true) {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setLeft(0);
    if (resetBpm) setBpm(startBpm);
  }

  function stop() {
    halt(true);
    setDone("");
  }

  function start() {
    halt(false);
    setDone("");
    setBgHint(false);
    const ctx = unlockAudio();
    let cancelled = false;
    let timer = 0;
    let next = ctx.currentTime + 0.02;
    let beatN = 0;
    const sixteenth = modeRef.current === "sixteenth";
    const endAt = sixteenth ? ctx.currentTime + mins * 60 : Infinity;
    let bumpAt = ctx.currentTime + everyRef.current;
    const clock = createMixClock();
    clock.reset(next);
    let engine = useMixNow(mixRef.current, flippedRef.current) ? "mix" : "simple";
    setBpm(startBpm);
    bpmRef.current = startBpm;
    setPlaying(true);
    if (sixteenth) setLeft(mins * 60);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 80);
      }, delay);
    };

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setBeat(false);
      setLeft(0);
      setBpm(startBpm);
      setDone(`${mins} Min 16tel bei ${startBpm} BPM — fertig.`);
    };

    const schedule = () => {
      if (cancelled) return;
      if (ctx.state === "suspended" && playingRef.current) setBgHint(true);
      const now = ctx.currentTime;
      if (sixteenth && now >= endAt) {
        finish();
        return;
      }
      if (!sixteenth) {
        while (bumpAt < now - 0.05) bumpAt += everyRef.current;
        if (now >= bumpAt - 0.001) {
          const nextBpm = clamp(bpmRef.current + stepRef.current, 30, Math.min(260, capRef.current));
          bpmRef.current = nextBpm;
          setBpm(nextBpm);
          bumpAt += everyRef.current;
        }
      }
      const wantMix = useMixNow(mixRef.current, flippedRef.current);
      if (wantMix && engine !== "mix") {
        clock.reset(Math.max(now + 0.02, next));
        engine = "mix";
      } else if (!wantMix && engine !== "simple") {
        next = Math.max(now + 0.02, next);
        engine = "simple";
      }
      const horizon = now + 0.16;
      if (engine === "mix") {
        clock.fill(ctx, horizon, bpmRef.current, mixRef.current, pulse);
        next = horizon;
      } else {
        while (next < now - 0.02) {
          const beatSec = 60 / Math.max(30, bpmRef.current);
          next += sixteenth ? beatSec / 4 : beatSec;
          beatN += 1;
        }
        while (next < horizon && !cancelled) {
          if (sixteenth && next >= endAt) {
            finish();
            return;
          }
          const quarter = beatN % 4 === 0;
          playClick(ctx, next, quarter);
          if (quarter) pulse(next);
          const beatSec = 60 / Math.max(30, bpmRef.current);
          next += sixteenth ? beatSec / 4 : beatSec;
          beatN += 1;
        }
      }
      if (sixteenth) setLeft(Math.max(0, endAt - ctx.currentTime));
      else setLeft(Math.max(0, bumpAt - ctx.currentTime));
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

  function pickMode(next) {
    if (playingRef.current) stop();
    setMode(next);
    setDone("");
  }

  function flip(on) {
    setFlipped(on);
    writeMix({ ...mixRef.current, advanced: on || extrasOn(mixRef.current) });
  }

  const atCap = mode === "ramp" && bpm >= cap;
  const sixteenth = mode === "sixteenth";

  return (
    <div>
      <p style={{ color: DIM, fontSize: 14, margin: "12px 0 16px" }}>
        {sixteenth
          ? "16tel durchgehend. BPM ist der Viertel-Puls; jede Viertel ist betont."
          : "Click starten. Alle paar Sekunden wird das Tempo angehoben — Du bleibst am Pad."}
      </p>
      <div className="seg" style={{ margin: "0 0 14px", width: "fit-content" }}>
        <button type="button" className={mode === "ramp" ? "on" : ""} onClick={() => pickMode("ramp")}>Tempo steigern</button>
        <button type="button" className={sixteenth ? "on" : ""} onClick={() => pickMode("sixteenth")}>16tel · Min</button>
      </div>
      <div className="panel dock metro-flip" style={{ position: "static", margin: "0 0 14px", borderRadius: 12, boxShadow: "none" }}>
        <div className={flipped ? "metro-inner is-back" : "metro-inner"}>
          <div className="metro-face metro-front">
            <div className="dial-row">
              <button type="button" className="nudge-lg" onClick={() => setDial(bpm - 5)} aria-label="5 BPM langsamer">−5</button>
              <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={132} now />
              <button type="button" className="nudge-lg" onClick={() => setDial(bpm + 5)} aria-label="5 BPM schneller">+5</button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
              <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
                {playing ? "Stop" : "Start"}
              </button>
              <button type="button" className="ghost" onClick={() => flip(true)}>Erweitert</button>
            </div>
            {playing && sixteenth ? (
              <div className="count">
                <span className="count-num">{fmtLeft(left)}</span>
                <span className="count-unit">Minuten übrig</span>
              </div>
            ) : null}
            {playing && !sixteenth ? (
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
            {done ? <p style={{ color: "#5cc8b8", textAlign: "center", fontSize: 14, margin: "12px 0 0" }}>{done}</p> : null}
            {bgHint ? <p style={{ color: "#e8b84b", textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>App im Hintergrund — der Click kann pausieren. Zurückkommen und ggf. neu starten.</p> : null}
          </div>
          <div className="metro-face metro-back">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8" }}>Click-Mixer</div>
              <button type="button" className="ghost" onClick={() => flip(false)}>Metronom</button>
            </div>
            <ClickAdvanced mix={mix} setMix={setMix} slidersOnly />
          </div>
        </div>
      </div>
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 12 }}>Einstellung</div>
        <TempoControl bpm={startBpm} setBpm={setStart} min={30} max={260} hideNudge />
        {sixteenth ? (
          <>
            <div style={{ marginTop: 16, fontSize: 13, color: DIM }}>Dauer</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {MINS.map((m) => (
                <button key={m} type="button" className={mins === m ? "chip on" : "chip"} onClick={() => setMins(m)}>{m} Min</button>
              ))}
            </div>
            <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
              {mins} Min 16tel bei {startBpm} BPM (Viertel betont, dazwischen leiser).
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      <style>{`
        .field { display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${DIM}; }
        .field input {
          width: 64px; text-align: center; font-weight: 700; font-size: 16px; color: #5cc8b8;
          background: ${INK}; border: 1px solid ${LINE}; border-radius: 8px; padding: 7px 4px;
        }
        .metro-flip { perspective: 1000px; }
        .metro-inner {
          position: relative;
          transition: transform .45s ease;
          transform-style: preserve-3d;
        }
        .metro-inner.is-back { transform: rotateY(180deg); }
        .metro-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .metro-inner:not(.is-back) .metro-back { display: none; }
        .metro-inner.is-back .metro-front { display: none; }
      `}</style>
    </div>
  );
}
