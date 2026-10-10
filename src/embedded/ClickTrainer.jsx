import { useEffect, useRef, useState } from "react";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial, Nudge } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { ClickAdvanced } from "../lib/ClickAdvanced.jsx";
import { createMixClock, extrasOn, readMix, writeMix } from "../lib/clickMix.js";
import { t } from "../lib/i18n.js";

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

// Kreisgröße nach verfügbarer Höhe: groß auf normalen Phones, kleiner auf kurzen Screens / Querformat.
function dialSizeFor(h) {
  if (h <= 480) return 112;
  if (h <= 720) return 128;
  return 140; // Platz für ±5 und ±10 neben dem Rad
}

function useDialSize() {
  const [size, setSize] = useState(() => dialSizeFor(typeof window !== "undefined" ? window.innerHeight : 844));
  useEffect(() => {
    const on = () => setSize(dialSizeFor(window.innerHeight));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

export default function ClickTrainer({ preset = null } = {}) {
  // Aus der „Heute“-Karte: Tempo halten mit vorgegebenem Tempo.
  const init = useRef(preset?.bpm ? { ...readClickSession(), mode: "hold", startBpm: clamp(preset.bpm, 30, 260) } : readClickSession()).current;
  const [mode, setMode] = useState(init.mode);
  const [startBpm, setStartBpm] = useState(init.startBpm);
  const [bpm, setBpm] = useState(init.startBpm);
  const [everySec, setEverySec] = useState(init.everySec);
  const [step, setStep] = useState(init.step);
  const [cap, setCap] = useState(init.cap);
  const [mix, setMix] = useState(() => readMix());
  // flipped = Click-Mixer-Sheet offen
  const [flipped, setFlipped] = useState(false);
  const dialSize = useDialSize();
  const advBtnRef = useRef(null);
  const sheetCloseRef = useRef(null);
  const sheetRef = useRef(null);
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
  // Sheet: Esc schließt; Fokus rein beim Öffnen, zurück zum Erweitert-Knopf beim Schließen.
  useEffect(() => {
    if (!flipped) {
      if (sheetRef.current?.contains(document.activeElement)) advBtnRef.current?.focus();
      return undefined;
    }
    sheetCloseRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === "Escape") flip(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flipped]);
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
    <div className="ct-wrap">
      <div className="seg" style={{ margin: "8px 0 12px", maxWidth: "100%" }}>
        <button type="button" className={!ramp ? "on" : ""} onClick={() => pickMode("hold")}>{t("Tempo halten")}</button>
        <button type="button" className={ramp ? "on" : ""} onClick={() => pickMode("ramp")}>{t("Tempo steigern")}</button>
      </div>
      <div className="panel">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 8 }}>{t("Einstellung")}</div>
        <p style={{ color: DIM, fontSize: 13, margin: "0 0 12px", lineHeight: 1.35 }}>
          {ramp
            ? t("Alle paar Sekunden wird das Tempo angehoben - Du bleibst am Pad.")
            : t("Gleichmäßiges Tempo. SpinDial drehen oder ±5.")}
        </p>
        <TempoControl bpm={startBpm} setBpm={setStart} min={30} max={260} hideNudge slider={false} />
        {ramp ? (
          <>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <label className="field">
                <span>{t("Alle")}</span>
                <input type="number" min={2} max={60} value={everySec} onChange={(e) => setEverySec(clamp(Number(e.target.value) || 10, 2, 60))} />
                <span>{t("Sekunden")}</span>
              </label>
              <label className="field">
                <span>{t("um")}</span>
                <input type="number" min={1} max={20} value={step} onChange={(e) => setStep(clamp(Number(e.target.value) || 4, 1, 20))} />
                <span>{t("BPM schneller")}</span>
              </label>
              <label className="field">
                <span>{t("bis")}</span>
                <input type="number" min={40} max={260} value={cap} onChange={(e) => setCap(clamp(Number(e.target.value) || 160, 40, 260))} />
                <span>BPM</span>
              </label>
            </div>
            <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
              {t("Aktuell: Start {start}, alle {every}s +{step}, Ziel {cap}.", { start: startBpm, every: everySec, step, cap })}
            </p>
          </>
        ) : (
          <p style={{ color: DIM, fontSize: 12, margin: "14px 0 0" }}>
            {t("Fester Puls bei {bpm} BPM. Drehen ändert das Tempo live.", { bpm: startBpm })}
          </p>
        )}
      </div>
      <div className="ct-stage click-dock">
        <div className="dial-row">
          <Nudge by={-10} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={-5} bpm={bpm} set={setDial} min={30} max={260} />
          <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={dialSize} now subLabel={playing ? "Stop" : "Start"} wheel />
          <Nudge by={5} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={10} bpm={bpm} set={setDial} min={30} max={260} />
        </div>
        {playing && ramp ? (
          <div className="count">
            {atCap ? (
              <span className="count-done">{t("Ziel")}</span>
            ) : (
              <>
                <span className="count-num">{Math.max(0, Math.ceil(left))}</span>
                <span className="count-unit">{t("Sek. bis +{step}", { step })}</span>
              </>
            )}
          </div>
        ) : null}
        {done ? <p style={{ color: "#5cc8b8", textAlign: "center", fontSize: 14, margin: "12px 0 0" }}>{done}</p> : null}
        {bgHint ? <p style={{ color: "#e8b84b", textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>{t("App im Hintergrund - der Click kann pausieren. Zurückkommen und ggf. neu starten.")}</p> : null}
        <button
          ref={advBtnRef}
          type="button"
          className={flipped ? "ghost ct-adv-btn on" : "ghost ct-adv-btn"}
          aria-expanded={flipped}
          aria-controls="ct-sheet"
          onClick={() => flip(!flipped)}
        >
          {t("Erweitert")} <span aria-hidden="true" className="ct-adv-caret">▴</span>
        </button>
      </div>
      <div className={flipped ? "ct-backdrop open" : "ct-backdrop"} onClick={() => flip(false)} aria-hidden="true" />
      <div
        id="ct-sheet"
        ref={sheetRef}
        className={flipped ? "ct-sheet open" : "ct-sheet"}
        role="dialog"
        aria-modal="false"
        aria-label={t("Click-Mixer")}
        inert={!flipped}
      >
        <button ref={sheetCloseRef} type="button" className="ct-sheet-handle" onClick={() => flip(false)} aria-label={t("Schließen")}>
          <span aria-hidden="true" />
        </button>
        <div className="ct-sheet-head">
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8" }}>{t("Click-Mixer")}</div>
          <button type="button" className="ct-sheet-x" onClick={() => flip(false)} aria-label={t("Schließen")}>×</button>
        </div>
        <ClickAdvanced mix={mix} setMix={setMix} slidersOnly />
      </div>
      <style>{`
        .page.tool:has(.ct-wrap) { display: flex; flex-direction: column; }
        .page.tool:has(.ct-wrap) .main { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
        .ct-wrap { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; max-width: 100%; }
        /* Kreis mittig im freien Raum unter der Einstellung */
        .ct-stage {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 0;
          padding: 12px 0 env(safe-area-inset-bottom, 0px);
        }
        .ct-stage .dial-row { padding-bottom: 22px; }
        .ct-stage .count { margin-top: 2px; }
        @media (max-width: 370px) { .ct-stage .dial-row { gap: 6px; } }
        .ct-adv-btn {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #5cc8b8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ct-adv-caret { display: inline-block; font-size: 11px; transition: transform .2s ease; }
        .ct-adv-btn.on .ct-adv-caret { transform: rotate(180deg); }
        .ct-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(6, 10, 12, 0.5);
          opacity: 0;
          pointer-events: none;
          transition: opacity .28s ease;
        }
        .ct-backdrop.open { opacity: 1; pointer-events: auto; }
        .ct-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 41;
          max-width: 640px;
          margin: 0 auto;
          max-height: min(78dvh, 620px);
          overflow: auto;
          overscroll-behavior: none;
          box-sizing: border-box;
          padding: 0 16px calc(16px + env(safe-area-inset-bottom, 0px));
          background: #182427;
          border: 1px solid ${LINE};
          border-bottom: none;
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.45);
          transform: translateY(calc(100% + 24px));
          visibility: hidden;
          transition: transform .3s cubic-bezier(.2, .8, .2, 1), visibility 0s linear .3s;
        }
        .ct-sheet.open { transform: none; visibility: visible; transition: transform .3s cubic-bezier(.2, .8, .2, 1), visibility 0s; }
        .ct-sheet-handle {
          display: flex; justify-content: center; align-items: center;
          width: 100%; height: 26px; padding: 0; margin: 0;
          background: transparent; border: none; cursor: pointer;
        }
        .ct-sheet-handle span { width: 42px; height: 5px; border-radius: 3px; background: #4a585e; }
        .ct-sheet-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 10px; }
        .ct-sheet-x {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid ${LINE}; background: transparent; color: #c9d3d6;
          font-size: 22px; line-height: 1; cursor: pointer;
        }
        @media (prefers-reduced-motion: reduce) {
          .ct-sheet, .ct-sheet.open, .ct-backdrop, .ct-adv-caret { transition: none; }
        }
        .field { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 14px; color: ${DIM}; }
        .field input {
          width: 64px; text-align: center; font-weight: 700; font-size: 16px; color: #5cc8b8;
          background: ${INK}; border: 1px solid ${LINE}; border-radius: 8px; padding: 7px 4px;
        }
      `}</style>
    </div>
  );
}
