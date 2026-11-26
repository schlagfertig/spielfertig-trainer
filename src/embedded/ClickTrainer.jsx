import { useEffect, useRef, useState } from "react";
import { DraftNumberInput, TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial, Nudge } from "../lib/metronome.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { beatDelayMs } from "../lib/audioOffset.js";
import { AudioOffsetControl } from "../lib/AudioOffsetControl.jsx";
import { loadSession, saveSession } from "../lib/session.js";
import { ClickAdvanced } from "../lib/ClickAdvanced.jsx";
import { createMixClock, extrasOn, readMix, writeMix } from "../lib/clickMix.js";
import { t } from "../lib/i18n.js";
import { usePracticeTrack } from "../lib/PracticeDiary.jsx";
import NoClick from "../lib/NoClick.jsx";
import { PracticeClip } from "../lib/PracticeClip.jsx";
import { askUnlock, noClickOpen } from "../lib/demo.js";
import { PaidMark } from "../lib/PaidMark.jsx";
import { WIDE_MQ, isWideLayout, useWideLayout } from "../lib/wideLayout.js";

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
    mode: s.mode === "ramp" || s.mode === "noclick" ? s.mode : "hold",
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
// Breite Ansicht (jedes Querformat ab 640 px): Rad links, etwas größer; auf kurzem iPhone-Querformat kleiner, damit nichts abgeschnitten wird.
function dialSizeFor(h, w = 9999) {
  if (isWideLayout(w, h)) {
    if (h <= 500) {
      const cap = h <= 400 ? 108 : 120;
      return Math.max(96, Math.min(cap, Math.round(h * 0.28), Math.round(w * 0.26)));
    }
    const side = Math.min(390, Math.max(300, Math.round(w * 0.48)));
    return Math.max(124, Math.min(152, Math.round(h * 0.22), side - 200));
  }
  const byH = h <= 480 ? 112 : h <= 720 ? 128 : 140;
  return Math.max(96, Math.min(byH, w - 252));
}

function useDialSize() {
  const [size, setSize] = useState(() =>
    dialSizeFor(
      typeof window !== "undefined" ? window.innerHeight : 844,
      typeof window !== "undefined" ? window.innerWidth : 9999,
    ),
  );
  useEffect(() => {
    const on = () => setSize(dialSizeFor(window.innerHeight, window.innerWidth));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

function readClickInit(preset) {
  const base = preset?.mode === "noclick"
    ? { ...readClickSession(), mode: "noclick" }
    : preset?.bpm
      ? { ...readClickSession(), mode: "hold", startBpm: clamp(preset.bpm, 30, 260) }
      : readClickSession();
  if (base.mode === "noclick" && !noClickOpen()) base.mode = "hold";
  return base;
}

export default function ClickTrainer({ preset = null } = {}) {
  // Aus der „Heute“-Karte: Tempo halten mit vorgegebenem Tempo. NoClick ist die volle App.
  const init = useRef(readClickInit(preset)).current;
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
  const wide = useWideLayout();
  const advBtnRef = useRef(null);
  const sheetCloseRef = useRef(null);
  const sheetRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  usePracticeTrack({ ex: "click", playing, bpm });
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
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 90);
      }, beatDelayMs(ctx, when));
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
    if (next === "noclick" && !noClickOpen()) { askUnlock(); return; }
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

  const advBtn = (
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
  );

  const mixer = (
    <div
      id="ct-sheet"
      ref={sheetRef}
      className={flipped ? "ct-sheet open" : "ct-sheet"}
      role="dialog"
      aria-modal="false"
      aria-label={t("Click-Mixer")}
      inert={!flipped}
    >
      {wide ? null : (
        <button ref={sheetCloseRef} type="button" className="ct-sheet-handle" onClick={() => flip(false)} aria-label={t("Schließen")}>
          <span aria-hidden="true" />
        </button>
      )}
      <div className="ct-sheet-head">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8" }}>{t("Click-Mixer")}</div>
        <button ref={wide ? sheetCloseRef : undefined} type="button" className="ct-sheet-x" onClick={() => flip(false)} aria-label={t("Schließen")}>×</button>
      </div>
      <ClickAdvanced mix={mix} setMix={setMix} slidersOnly />
      <AudioOffsetControl where="sheet" />
    </div>
  );

  return (
    <div className="ct-wrap">
      <div className="ct-settings">
      <div className="seg" style={{ margin: "8px 0 12px", maxWidth: "100%" }}>
        <button type="button" className={mode === "hold" ? "on" : ""} onClick={() => pickMode("hold")}>{t("Tempo halten")}</button>
        <button type="button" className={ramp ? "on" : ""} onClick={() => pickMode("ramp")}>{t("Tempo steigern")}</button>
        <button
          type="button"
          className={`${mode === "noclick" ? "on" : ""}${noClickOpen() ? "" : " has-lock"}`}
          onClick={() => pickMode("noclick")}
          title={noClickOpen() ? undefined : t("Volle App")}
          aria-label={noClickOpen() ? "NoClick" : `NoClick · ${t("Volle App")}`}
        >{noClickOpen() ? null : <PaidMark icon />}NoClick</button>
      </div>
      {mode === "noclick" ? null : (<>
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
                <DraftNumberInput value={everySec} setValue={setEverySec} min={2} max={60} ariaLabel={t("Sekunden")} />
                <span>{t("Sekunden")}</span>
              </label>
              <label className="field">
                <span>{t("um")}</span>
                <DraftNumberInput value={step} setValue={setStep} min={1} max={20} ariaLabel={t("BPM schneller")} />
                <span>{t("BPM schneller")}</span>
              </label>
              <label className="field">
                <span>{t("bis")}</span>
                <DraftNumberInput value={cap} setValue={setCap} min={40} max={260} ariaLabel={t("bis")} />
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
      {wide ? <div className="ct-adv-slot">{advBtn}{mixer}</div> : null}
      </>)}
      </div>
      {mode === "noclick" ? <NoClick dialSize={dialSize} /> : (<>
      <div className="ct-stage click-dock">
        <div className="dial-row">
          <Nudge by={-10} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={-5} bpm={bpm} set={setDial} min={30} max={260} />
          <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={dialSize} now subLabel={playing ? "Stop" : "Start"} wheel />
          <Nudge by={5} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={10} bpm={bpm} set={setDial} min={30} max={260} />
        </div>
        {/* Feste Höhe unter dem Rad (Countdown-Platz + „Erweitert“), damit das SpinDial in allen Modi still steht */}
        <div className="ct-below">
        {/* Clip-Knopf links unter -10/-5 im Fluss der Seite, damit er beim Scrollen nie über den Knöpfen liegt */}
        <div className="ct-clip"><PracticeClip inline title={t("Click-Trainer")} view="click" /></div>
        <div className="ct-count-slot">
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
        </div>
        {done ? <p style={{ color: "#5cc8b8", textAlign: "center", fontSize: 14, margin: "12px 0 0" }}>{done}</p> : null}
        {bgHint ? <p style={{ color: "#e8b84b", textAlign: "center", fontSize: 12, margin: "10px 0 0" }}>{t("App im Hintergrund - der Click kann pausieren. Zurückkommen und ggf. neu starten.")}</p> : null}
        {wide ? null : advBtn}
        </div>
      </div>
      {wide ? null : (
        <>
          <div className={flipped ? "ct-backdrop open" : "ct-backdrop"} onClick={() => flip(false)} aria-hidden="true" />
          {mixer}
        </>
      )}
      </>)}
      <style>{`
        .page.tool:has(.ct-wrap) { display: flex; flex-direction: column; }
        .page.tool:has(.ct-wrap) .main { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
        .ct-wrap { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; max-width: 100%; }
        .ct-settings { display: contents; }
        /* Kreis mittig im freien Raum unter der Einstellung */
        .ct-stage {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          min-height: 0;
          padding: 12px 0 env(safe-area-inset-bottom, 0px);
        }
        .ct-stage .dial-row { padding-bottom: 22px; }
        .ct-stage .count { margin-top: 2px; }
        .ct-below { position: relative; align-self: stretch; flex: none; height: 84px; display: flex; flex-direction: column; align-items: center; }
        .ct-clip { position: absolute; left: 0; top: 0; }
        .ct-clip:empty { display: none; }
        .ct-count-slot { height: 48px; display: flex; flex-direction: column; justify-content: flex-start; }
        .page .ct-stage .dial-row .nudge-lg.nudge-10 { width: 44px; height: 44px; font-size: 15px; }
        @media (max-width: 400px) and (orientation: portrait) { .ct-stage .dial-row:has(.nudge-10) { gap: 3px; } }
        .ct-adv-btn {
          margin-top: 0;
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
        /* Breite Ansicht in jedem Querformat ab 640 px (WIDE_MQ): SpinDial links,
           Einstellungen rechts (schmale Spalte), ohne Rahmen ums Rad, beide Spalten vertikal in der Mitte. */
        @media ${WIDE_MQ} {
          .page.tool:has(.ct-wrap) {
            height: 100dvh;
            max-height: 100dvh;
            overflow: hidden;
            padding-bottom: 0;
          }
          .page.tool:has(.ct-wrap) .main {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            padding-bottom: 0;
          }
          .ct-wrap {
            display: grid;
            /* Links das Rad in der Restbreite, rechts die Einstellungen bewusst schmaler (max. 340px). */
            grid-template-columns: minmax(max-content, 1fr) minmax(0, 340px);
            grid-template-rows: minmax(0, 1fr);
            column-gap: 16px;
            align-items: center;
            min-height: 0;
          }
          /* Modus-Knöpfe in einer Reihe: kurze Labels bleiben schmal, lange bekommen den Rest. */
          .ct-settings > .seg {
            flex-wrap: nowrap;
            width: 100%;
            box-sizing: border-box;
          }
          .ct-settings > .seg button {
            flex: 1 1 auto;
            min-width: 0;
            padding: 8px 5px;
            font-size: 13px;
            line-height: 1.2;
            white-space: nowrap;
            text-align: center;
          }
          .ct-settings {
            display: flex;
            flex-direction: column;
            grid-column: 2;
            grid-row: 1;
            align-self: center;
            min-height: 0;
            max-height: 100%;
            overflow: hidden;
          }
          /* Panel scrollt bei Bedarf, „Erweitert“ bleibt sichtbar am unteren Rand. */
          .ct-settings > .panel {
            flex: 1 1 auto;
            min-height: 0;
            overflow: auto;
          }
          .ct-wrap:has(.nc-dock) {
            grid-template-rows: auto auto;
            align-content: safe center;
            align-items: start;
          }
          .ct-wrap:has(.nc-dock) .ct-settings {
            grid-row: 1;
            align-self: start;
            overflow: visible;
            max-height: none;
          }
          .ct-adv-slot { padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 0px)); }
          .ct-wrap > .ct-stage {
            grid-column: 1;
            grid-row: 1;
            align-self: center;
            justify-content: center;
            align-items: center;
            max-height: 100%;
            min-height: 0;
            box-sizing: border-box;
            padding: 8px 20px env(safe-area-inset-bottom, 0px);
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
          }
          /* Platz für „Zum Einstellen drehen“ plus Luft über Clip. */
          .ct-wrap > .ct-stage .dial-row { padding-bottom: 36px; }
          /* Clip bleibt unter dem Rad-Block, nicht am linken Rand der breiten Spalte. */
          .ct-wrap .ct-below {
            align-self: center;
            width: max-content;
            min-width: 0;
            max-width: 100%;
          }
          .ct-wrap .ct-clip { position: static; margin-top: 8px; }
          /* ±5 oben, ±10 unten, je eine Spalte links und rechts vom Rad. */
          .ct-wrap .dial-row:has(.nudge-10) {
            display: grid;
            grid-template-columns: auto auto auto;
            grid-template-rows: auto auto;
            grid-template-areas:
              "m5  dial p5"
              "m10 dial p10";
            column-gap: 14px;
            row-gap: 12px;
            align-items: center;
            justify-items: center;
            justify-content: center;
          }
          .ct-wrap .dial-row:has(.nudge-10) > .nudge-lg:nth-child(1) { grid-area: m10; }
          .ct-wrap .dial-row:has(.nudge-10) > .nudge-lg:nth-child(2) { grid-area: m5; }
          .ct-wrap .dial-row:has(.nudge-10) > .clip-dial { grid-area: dial; }
          .ct-wrap .dial-row:has(.nudge-10) > .nudge-lg:nth-child(4) { grid-area: p5; }
          .ct-wrap .dial-row:has(.nudge-10) > .nudge-lg:nth-child(5) { grid-area: p10; }
          .ct-below { height: auto; min-height: 52px; }
          /* Mixer steht in der rechten Spalte, kein Blatt über dem Rad */
          .ct-adv-slot .ct-sheet {
            position: static;
            left: auto;
            right: auto;
            bottom: auto;
            z-index: auto;
            max-width: none;
            max-height: none;
            margin: 10px 0 0;
            padding: 10px 12px 12px;
            transform: none;
            visibility: visible;
            border-radius: 12px;
            border: 1px solid ${LINE};
            border-bottom: 1px solid ${LINE};
            box-shadow: none;
            background: #182427;
          }
          .ct-adv-slot .ct-sheet:not(.open) { display: none; }
          .nc-wrap { display: contents; }
          .nc-settings { grid-column: 2; grid-row: 2 / -1; min-height: 0; overflow: auto; }
          .nc-dock {
            grid-column: 1;
            grid-row: 1 / -1;
            align-self: stretch;
            justify-content: center;
            align-items: center;
            padding: 8px 20px env(safe-area-inset-bottom, 0px);
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
          }
        }
        /* Kurzes iPhone-Querformat: enger, kleineres Rad, rechte Spalte scrollt bei Bedarf. */
        @media ${WIDE_MQ} and (max-height: 500px) {
          .page.tool:has(.ct-wrap) { padding: 4px 12px 0; }
          .ct-wrap { column-gap: 12px; }
          .ct-wrap > .ct-stage { padding: 0 8px env(safe-area-inset-bottom, 0px); }
          .ct-wrap > .ct-stage .dial-row { padding-bottom: 8px; }
          .ct-wrap .dial-row:has(.nudge-10) { column-gap: 8px; row-gap: 8px; }
          .page.tool:has(.ct-wrap) .ct-stage .dial-row .nudge-lg {
            width: 44px;
            height: 44px;
            font-size: 15px;
          }
          .ct-settings > .seg { margin: 0 0 6px; }
          .ct-settings .panel { padding: 10px 12px; margin-bottom: 6px; }
          .ct-settings .panel p { margin-top: 8px; }
          .ct-adv-slot { padding: 4px 0 env(safe-area-inset-bottom, 0px); }
          .ct-below { min-height: 0; }
          .ct-wrap .ct-clip { margin-top: 2px; }
        }
        /* Hochkant auf Duo aufgeklappt und iPad: einspaltig wie am Handy, nicht über die volle Breite. */
        @media (min-width: 640px) and (orientation: portrait) {
          .page.tool:has(.ct-wrap) .top,
          .page.tool:has(.ct-wrap) .main {
            max-width: 440px;
            width: 100%;
            margin-inline: auto;
          }
        }
      `}</style>
    </div>
  );
}
