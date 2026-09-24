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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function readClickSession() {
  const s = loadSession("click", {});
  const startBpm = clamp(Number(s.startBpm) || 80, 30, 260);
  return {
    mode: s.mode === "ramp" ? "ramp" : "hold",
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
    saveSession("click", { mode, startBpm, everySec, step, cap });
  }, [mode, startBpm, everySec, step, cap]);
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
    const ramp = modeRef.current === "ramp";
    let bumpAt = ctx.currentTime + everyRef.current;
    const clock = createMixClock();
    clock.reset(next);
    let engine = useMixNow(mixRef.current, flippedRef.current) ? "mix" : "simple";
    setBpm(startBpm);
    bpmRef.current = startBpm;
    setPlaying(true);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 90);
      }, delay);
    };

    const schedule = () => {
      if (cancelled) return;
      if (ctx.state === "suspended" && playingRef.current) setBgHint(true);
      const now = ctx.currentTime;
      if (ramp) {
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
          next += beatSec;
          beatN += 1;
        }
        while (next < horizon && !cancelled) {
          const down = beatN % 4 === 0;
          playClick(ctx, next, down);
          pulse(next);
          const beatSec = 60 / Math.max(30, bpmRef.current);
          next += beatSec;
          beatN += 1;
        }
      }
      if (ramp) setLeft(Math.max(0, bumpAt - ctx.currentTime));
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

  const ramp = mode === "ramp";
  const atCap = ramp && bpm >= cap;

  return (
    <div style={{ minWidth: 0, maxWidth: "100%", paddingBottom: "calc(220px + env(safe-area-inset-bottom, 0px))" }}>
      <p style={{ color: DIM, fontSize: 14, margin: "12px 0 16px" }}>
        {ramp
          ? "Click starten. Alle paar Sekunden wird das Tempo angehoben — Du bleibst am Pad."
          : "Gleichmäßiges Tempo halten. BPM am Kreis drehen oder ±5."}
      </p>
      <div className="seg" style={{ margin: "0 0 14px", maxWidth: "100%" }}>
        <button type="button" className={!ramp ? "on" : ""} onClick={() => pickMode("hold")}>Tempo halten</button>
        <button type="button" className={ramp ? "on" : ""} onClick={() => pickMode("ramp")}>Tempo steigern</button>
      </div>
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 12 }}>Einstellung</div>
        <TempoControl bpm={startBpm} setBpm={setStart} min={30} max={260} hideNudge />
        {ramp ? (
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
        ) : (
          <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
            Fester Puls bei {startBpm} BPM. Drehen ändert das Tempo live.
          </p>
        )}
      </div>
      <div
        className="click-dock"
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
          <div className="metro-shell">
            <div style={{ position: "static", margin: 0, padding: "8px 8px 4px 0", borderRadius: 0, background: "transparent", border: "none", boxShadow: "none", overflow: "auto" }}>
              {flipped ? (
                <div key="back" className="metro-swap">
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 10 }}>Click-Mixer</div>
                  <ClickAdvanced mix={mix} setMix={setMix} slidersOnly />
                </div>
              ) : (
                <div key="front" className="metro-swap">
                  <div className="dial-row">
                    <button type="button" className="nudge-lg" onClick={() => setDial(bpm - 5)} aria-label="5 BPM langsamer">−5</button>
                    <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={108} now />
                    <button type="button" className="nudge-lg" onClick={() => setDial(bpm + 5)} aria-label="5 BPM schneller">+5</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
                    <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : start())}>
                      {playing ? "Stop" : "Start"}
                    </button>
                  </div>
                  {playing && ramp ? (
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
              )}
            </div>
            <button type="button" className={flipped ? "metro-side on" : "metro-side"} onClick={() => flip(!flipped)}>
              {flipped ? "Metronom" : "Erweitert"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .click-dock {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 15;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .field { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 14px; color: ${DIM}; }
        .field input {
          width: 64px; text-align: center; font-weight: 700; font-size: 16px; color: #5cc8b8;
          background: ${INK}; border: 1px solid ${LINE}; border-radius: 8px; padding: 7px 4px;
        }
        .metro-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 40px;
          align-items: stretch;
          margin: 0;
          max-width: 100%;
          min-width: 0;
        }
        .metro-side {
          margin: 0;
          width: 40px;
          max-width: 40px;
          min-width: 40px;
          padding: 10px 0;
          overflow: hidden;
          border: 1px solid ${LINE};
          border-left: 0;
          border-radius: 0 12px 12px 0;
          background: #13211f;
          color: #5cc8b8;
          font: 800 10px/1.05 Figtree, sans-serif;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          cursor: pointer;
        }
        .metro-side.on {
          background: #5cc8b8;
          color: #06120f;
          border-color: #5cc8b8;
        }
        .metro-swap { animation: metroIn .28s ease; min-width: 0; }
        @keyframes metroIn {
          from { opacity: 0; transform: rotateY(-80deg); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
