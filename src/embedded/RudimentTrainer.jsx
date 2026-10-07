import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, meterPulse, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial, Nudge } from "../lib/metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { NavScrub } from "../lib/NavScrub.jsx";
import { PrintDialog } from "./PrintDialog.jsx";
import { rudimentInfo } from "../lib/rudimentInfo.js";
import { t, getLang } from "../lib/i18n.js";
import { pickCheer } from "../lib/cheers.js";

const HEAR_OK = ["snare", "hands", "click"];
const HEARS = [
  { id: "snare", label: "Snare" },
  { id: "hands", label: "Tom / Snare" },
  { id: "click", label: "Nur Click" },
];
const CHEER_MS = 6500;
const GOALS = [
  { id: "free", label: "Frei" },
  { id: "l8", loops: 8, label: "8 Loops" },
  { id: "l16", loops: 16, label: "16 Loops" },
  { id: "t120", sec: 120, label: "2 Min" },
];

// Kurze Hochformat-Screens (z. B. 375×667): kompakter Metronom-Bereich
const SHORT_MQ = "(max-height: 720px) and (orientation: portrait)";

function useShortScreen() {
  const [short, setShort] = useState(() => !!window.matchMedia?.(SHORT_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(SHORT_MQ);
    if (!mq) return undefined;
    const on = () => setShort(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return short;
}

// Phone quer (wenig Höhe): Rad kleiner, rechte Spalte
const LOW_WIDE_MQ = "(orientation: landscape) and (max-height: 560px)";
function useLowLandscape() {
  const [m, setM] = useState(() => !!window.matchMedia?.(LOW_WIDE_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(LOW_WIDE_MQ);
    if (!mq) return undefined;
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return m;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function readRudimentSession() {
  const s = loadSession("rudiments", {});
  const sel = RUDIMENTS.some((r) => r.id === Number(s.sel)) ? Number(s.sel) : 16;
  const goalId = GOALS.some((g) => g.id === s.goalId) ? s.goalId : "free";
  return {
    sel,
    bpm: clamp(Number(s.bpm) || 80, 30, 260),
    hear: HEAR_OK.includes(s.hear) ? s.hear : "snare",
    goalId,
  };
}

export default function RudimentTrainer({ printOpen = false, onPrintClose, stage = false, preset = null }) {
  // Aus der „Heute“-Karte: Rudiment und Tempo vorgeben, Klang/Ziel bleiben wie zuletzt.
  const init = useRef((() => {
    const s = readRudimentSession();
    if (!preset) return s;
    return {
      ...s,
      sel: RUDIMENTS.some((r) => r.id === preset.rud) ? preset.rud : s.sel,
      bpm: preset.bpm ? clamp(preset.bpm, 30, 260) : s.bpm,
    };
  })()).current;
  const [sel, setSel] = useState(init.sel);
  const [bpm, setBpm] = useState(init.bpm);
  const [hear, setHear] = useState(init.hear);
  const [goalId, setGoalId] = useState(init.goalId);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [loopN, setLoopN] = useState(0);
  const [leftSec, setLeftSec] = useState(0);
  const [cheer, setCheer] = useState(null); // { i, text, goal } – Motivation am Ende des Ziels
  const [info, setInfo] = useState(false);
  const lastCheer = useRef(-1);
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[0];
  const idx = Math.max(0, RUDIMENTS.findIndex((r) => r.id === rud.id));
  const meterNow = meterPulse(rud.time);
  const beatsInBar = Math.max(1, Math.round(meterNow.bar / meterNow.pulse));
  const beatN = playT < 0 ? -1 : Math.floor((playT + 1e-4) / meterNow.pulse) % beatsInBar;
  const goal = GOALS.find((g) => g.id === goalId) || GOALS[0];
  const compact = useShortScreen() && !stage;
  const wide = useLowLandscape();

  useEffect(() => {
    saveSession("rudiments", { sel, bpm, hear, goalId });
  }, [sel, bpm, hear, goalId]);
  useEffect(() => () => stopRef.current?.(), []);
  // Motivation blendet sich nach ein paar Sekunden selbst aus (Antippen schließt sofort)
  useEffect(() => {
    if (!cheer) return undefined;
    const id = window.setTimeout(() => setCheer(null), CHEER_MS);
    return () => window.clearTimeout(id);
  }, [cheer]);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
    setLoopN(0);
    setLeftSec(0);
  }

  function pickRud(id) {
    if (id !== sel) stop();
    setSel(id);
    setCheer(null);
    setInfo(false);
  }

  function pulse(when, ctx) {
    const delay = Math.max(0, (when - ctx.currentTime) * 1000);
    window.setTimeout(() => {
      setBeat(true);
      window.setTimeout(() => setBeat(false), 80);
    }, delay);
  }

  function startLoop() {
    stop();
    setCheer(null);
    const ctx = unlockAudio();
    const notes = (rud.notes || []).filter((nt) => !nt.rest);
    const steps = rudimentDuration(rud);
    const meter = meterPulse(rud.time);
    const targetLoops = goal.loops || 0;
    const endAt = goal.sec ? ctx.currentTime + goal.sec : Infinity;
    let cancelled = false;
    let timer = 0;
    let loopsDone = 1;
    const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
    const events = () => {
      if (hearRef.current === "click") {
        const ev = [];
        for (let s = 0; s < steps; s += meter.pulse) ev.push({ t: s, kind: "click", down: s % meter.bar < 0.01 });
        return ev;
      }
      const kind = hearRef.current === "hands" ? "stick" : "snare";
      return notes.map((nt) => ({ t: nt.t, kind, nt }));
    };
    let listEv = events();
    if (!listEv.length) listEv = [{ t: 0, kind: "click", down: true }];
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.02;
    setLoopN(1);
    if (goal.sec) setLeftSec(goal.sec);

    const finishOk = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setPlayT(-1);
      setBeat(false);
      setLeftSec(0);
      const c = pickCheer(getLang(), lastCheer.current);
      lastCheer.current = c.i;
      setCheer({ ...c, goal: goal.label });
    };

    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (goal.sec && now >= endAt) {
        finishOk();
        return;
      }
      const horizon = now + 0.16;
      while (!cancelled) {
        const ev = listEv[evIndex];
        const when = cycleStart + ev.t * stepSec();
        if (when >= horizon) break;
        if (goal.sec && when >= endAt) {
          finishOk();
          return;
        }
        if (when >= now - 0.02) {
          if (ev.kind === "click") playClick(ctx, when, ev.down);
          else playOrnament(ctx, ev.nt, when, ev.kind === "stick" ? "stick" : "snare", stepSec());
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(ev.t); }, delay);
          if (ev.kind === "click" || Math.abs((ev.t || 0) % meter.pulse) < 0.08) pulse(when, ctx);
        }
        evIndex += 1;
        if (evIndex >= listEv.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
          listEv = events();
          loopsDone += 1;
          setLoopN(loopsDone);
          if (targetLoops && loopsDone > targetLoops) {
            finishOk();
            return;
          }
        }
      }
      if (goal.sec) setLeftSec(Math.max(0, endAt - ctx.currentTime));
      timer = window.setTimeout(schedule, 25);
    };
    setPlaying(true);
    schedule();
    stopRef.current = () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }

  return (
    <div className={compact ? "rud-wrap rud-tool rud-short" : "rud-wrap rud-tool"}>
      <style>{`
        .rud-wrap {
          /* Platz für Hören-Umschalter über dem Dial */
          --rud-dock: 240px;
        }
        .rud-wrap .rud-metro .seg {
          padding: 2px;
          gap: 2px;
          border-radius: 7px;
        }
        .rud-wrap .rud-metro .seg button {
          height: 30px;
          padding: 0 10px;
          font-size: 13px;
          line-height: 30px;
          border-radius: 5px;
        }
        .rud-wrap.rud-short {
          --rud-dock: 166px;
          --rud-foot: calc(72px + env(safe-area-inset-bottom, 0px));
        }
        .rud-wrap.rud-short .staff-hint,
        .rud-wrap.rud-short .rud-metro .dial-row > div > div + div,
        .page.tool.stage .rud-metro .dial-row > div > div + div {
          display: none;
        }
        @media (orientation: portrait) { .page.tool:not(.stage) .rud-wrap:not(.rud-short) .rud-metro .dial-row { padding-bottom: 16px; } }
        .rud-wrap.rud-short .rud-metro .metro-face { padding-top: 4px; }
        .rud-wrap.rud-short .nudge-lg { width: 40px; height: 40px; font-size: 17px; }
        .rud-wrap.rud-short .nudge-lg.nudge-10 { width: 36px; height: 36px; font-size: 14px; }
        .rud-wrap.rud-short .rud-half { min-height: 60px; }
        /* ScrubNav-Kurzvorschau: feste Höhe (Pop-up springt nicht), leeren Rand unter der Zählzeile abschneiden */
        .rud-scrub-pv { display: flex; justify-content: center; align-items: flex-start; height: 90px; overflow: hidden; margin-top: 8px; padding: 2px 6px 0; box-sizing: border-box; background: #fff; border-radius: 8px; }
        .rud-scrub-pv svg { flex: none; width: auto; height: 126px; max-width: 100%; }
        .rud-wrap.rud-short .rud-scrub-pv { height: 76px; }
        .rud-wrap.rud-short .rud-scrub-pv svg { height: 106px; }
        .rud-wrap .rud-nav {
          background: transparent;
          box-shadow: none;
          z-index: 20;
        }
        .rud-wrap .rud-metro {
          z-index: 16;
          /* Fußzone der Vor/Zurück-Leiste bleibt klickbar */
          pointer-events: none;
        }
        .rud-wrap .rud-metro .dial-row,
        .rud-wrap .rud-metro .dial-row *,
        .rud-wrap .rud-metro .seg,
        .rud-wrap .rud-metro .seg *,
        .rud-wrap .rud-metro .rud-picks,
        .rud-wrap .rud-metro .rud-picks * {
          pointer-events: auto;
        }
        .rud-wrap .rud-metro .metro-face {
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .rud-info {
          position: absolute; top: 6px; right: 10px; z-index: 2;
          border: 1px solid #5cc8b8; background: #fff; color: #0b3d38;
          border-radius: 999px; padding: 3px 12px; font: 800 13px/1.2 Figtree, sans-serif;
        }
        .staff-card { position: relative; }
        /* Paket C: alle Rudiment-Karten gleich groß – feste Notenfläche, die Noten passen sich ein */
        .rud-staff-box { height: 150px; display: flex; align-items: center; justify-content: center; }
        .staff-card .rud-staff-box svg { width: 100%; height: 100%; max-height: 100%; }
        .rud-wrap.rud-short .rud-staff-box { height: 112px; }
        @media (max-height: 600px) { .rud-wrap.rud-short .rud-staff-box { height: 72px; } }
        /* Fokus-Mode: Notenfläche füllt die Karte (Noten groß) */
        .page.tool.stage .rud-staff-box { flex: 1 1 auto; height: auto; min-height: 0; }
        .rud-wrap .beat-loop { text-align: center; min-width: 0; margin-top: 8px; color: #6a7378; font-size: 13px; letter-spacing: 0.1em; }
        .rud-wrap .beat-loop.on { color: #0b6e62; }
        /* Info darf über dem Rad liegen (eigene Ebene über dem Dock) */
        .staff-card.rud-card-info { z-index: 17; }
        .rud-back-foot { display: flex; justify-content: flex-end; margin-top: 14px; }
        .rud-back-foot button { border: 1px solid #5cc8b8; background: #fff; color: #0b3d38; border-radius: 999px; padding: 8px 16px; font: 800 14px Figtree, sans-serif; }
        /* Ziel und Klang: zwei Auswahlfelder in einer Zeile direkt über dem Rad – nichts überlappt */
        .rud-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 auto 6px; max-width: 420px; width: 100%; }
        .rud-pick { position: relative; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 0; min-height: 46px; padding: 5px 30px 5px 12px; border-radius: 14px; border: 1px solid rgba(92,200,184,.42); background: rgba(19,33,31,.82); color: #f4f7f6; text-align: left; box-sizing: border-box; }
        .rud-pick-kick { font: 800 10px/1.2 Figtree, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: #5cc8b8; }
        .rud-pick-val { font: 700 15px/1.25 Figtree, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .rud-pick-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #5cc8b8; font: 800 14px Figtree, sans-serif; pointer-events: none; }
        .rud-pick select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 17px; }
        .rud-pick.off { opacity: .55; }
        .rud-wrap.rud-short .rud-pick { min-height: 40px; padding-top: 3px; padding-bottom: 3px; }
        .rud-wrap.rud-short .rud-pick-val { font-size: 14px; }
        /* Motivation am Ende des Ziels */
        .rud-cheer { position: fixed; left: 50%; top: 22%; z-index: 30; width: min(340px, calc(100vw - 40px)); transform: translateX(-50%); box-sizing: border-box; padding: 18px 20px 16px; border-radius: 22px; background: #f4f7f6; color: #161a1d; border: 2px solid #e8b84b; box-shadow: 0 18px 50px rgba(0,0,0,.45); text-align: center; cursor: pointer; }
        .rud-cheer-kick { font: 700 30px/1.05 Oswald, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; color: #161a1d; }
        .rud-cheer-goal { margin-top: 4px; font: 800 12px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #b8860b; }
        .rud-cheer-text { margin-top: 10px; font: 600 17px/1.4 Figtree, sans-serif; }
        .rud-cheer-hint { margin-top: 10px; font: 700 11px Figtree, sans-serif; color: #8a969c; letter-spacing: 0.06em; }
        @media (prefers-reduced-motion: no-preference) {
          .rud-cheer { animation: rudCheerIn .32s cubic-bezier(.2,.8,.2,1) both; }
          @keyframes rudCheerIn { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(.94); } to { opacity: 1; transform: translateX(-50%); } }
        }
        /* Querformat: Karte links, Ziel/Klang und Rad rechts */
        @media (orientation: landscape) {
          .page.tool.view-rudiments .top { flex-direction: row; align-items: center; gap: 12px; padding: 2px 0 8px; }
          .page.tool.view-rudiments .top-row { display: contents; }
          .page.tool.view-rudiments .top-title { order: 1; flex: 1 1 auto; width: auto; min-width: 0; font-size: 22px; }
          .page.tool.view-rudiments .top-right { order: 2; }
          .page.tool .rud-wrap.rud-tool { padding-bottom: calc(var(--rud-foot) + 8px); padding-right: 316px; overflow: hidden; }
          .page.tool .rud-tool .staff-card { flex: 1 1 auto; justify-content: flex-start; }
          .page.tool .rud-tool .rud-staff-box { flex: 1 1 auto; min-height: 0; height: auto; }
          .page.tool .rud-tool .staff-card .rud-staff-box svg { max-height: 100%; }
          .page.tool .rud-tool .staff-card.rud-card-info { overflow: auto; }
          .page.tool .rud-tool .rud-metro { left: auto !important; right: 0; top: 0; width: 316px; max-height: none; display: flex; flex-direction: column; justify-content: flex-end; }
          .page.tool .rud-tool .rud-metro .metro-face { max-height: none; overflow: visible; padding: 0 10px calc(var(--rud-foot) + 14px); }
          .page.tool .rud-tool .rud-metro .dial-row { gap: 5px; padding-bottom: 14px; }
          .page.tool .rud-tool .rud-metro .dial-row .nudge-lg { width: 42px; height: 42px; font-size: 16px; }
          .page.tool .rud-tool .rud-metro .dial-row .nudge-lg.nudge-10 { width: 38px; height: 38px; font-size: 14px; }
          .page.tool .rud-tool .rud-picks { margin-bottom: 4px; }
          .page.tool .rud-tool .rud-title { flex: 0 0 auto; min-height: 0; margin-bottom: 4px; padding-bottom: 4px; }
          .page.tool .rud-tool .beat-track, .page.tool .rud-tool .beat-loop { flex: 0 0 auto; }
          .page.tool .rud-tool .beat-track { margin-top: 4px; }
          .page.tool .rud-tool .beat-cells span { padding: 4px 0; font-size: 17px; }
          .page.tool .rud-tool .beat-loop { margin-top: 4px; }
          .rud-cheer { top: 18%; }
        }
        .rud-back { padding: 28px 8px 8px; color: #161a1d; text-align: left; }
        .rud-back h3 { margin: 12px 0 4px; font: 800 13px Figtree, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #0b3d38; }
        .rud-back p { margin: 0; font: 600 15px/1.4 Figtree, sans-serif; }
      `}</style>
      <div className={info ? "staff-card rud-card-info" : "staff-card"}>
        <button type="button" className="rud-info" onClick={() => setInfo((v) => !v)} aria-pressed={info}>{info ? t("Zurück") : t("Info")}</button>
        <div className="rud-title">
          <div className="rud-title-kicker">{t("Rudiment wählen")}</div>
          <div className="rud-title-row">
            <div className="rud-title-name">{rud.label}</div>
            <span className="rud-title-caret" aria-hidden="true">▾</span>
          </div>
          <select className="rud-title-select" value={rud.id} onChange={(e) => pickRud(Number(e.target.value))} aria-label={t("Rudiment wählen")}>
            {CATS.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {RUDIMENTS.filter((r) => r.cat === c.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {info ? (
          <RudimentBack rud={rud} onBack={() => setInfo(false)} />
        ) : (
          <>
            <div className="rud-staff-box">
              <RudimentStaff rud={rud} playingT={playT} svgId="rud-live" />
            </div>
            <div className="beat-track">
              <div className="beat-cells">
                {Array.from({ length: beatsInBar }, (_, i) => (
                  <span key={i} className={playing && beatN === i ? "on" : ""}>{i + 1}</span>
                ))}
              </div>
            </div>
            {/* Loop-Anzeige unter den Zählzeiten (Paket C) */}
            <div className={playing ? "beat-loop on" : "beat-loop"} aria-live="polite">
              {playing && goal.sec ? fmt(leftSec) : playing ? `Loop ${loopN}${goal.loops ? " / " + goal.loops : ""}` : "Loop —"}
            </div>
          </>
        )}
      </div>
      {cheer ? (
        <div className="rud-cheer" role="status" aria-live="polite" onClick={() => setCheer(null)}>
          <div className="rud-cheer-kick">{t("Geschafft!")}</div>
          <div className="rud-cheer-goal">{`${t(cheer.goal)} · ${bpm} BPM`}</div>
          <div className="rud-cheer-text">{cheer.text}</div>
          <div className="rud-cheer-hint">{t("Antippen zum Schließen")}</div>
        </div>
      ) : null}
      <div className="metro-shell rud-metro" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 16, gridTemplateColumns: "1fr" }}>
        <div
          className="dock metro-face"
          style={{
            borderRadius: "16px 16px 0 0",
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        >
          {stage ? null : (
            <div className="rud-hear rud-picks">
              <label className={playing ? "rud-pick off" : "rud-pick"}>
                <span className="rud-pick-kick">{t("Ziel", null, "rud")}</span>
                <span className="rud-pick-val">{t(goal.label)}</span>
                <span className="rud-pick-caret" aria-hidden="true">▾</span>
                <select value={goalId} disabled={playing} onChange={(e) => setGoalId(e.target.value)} aria-label={t("Ziel", null, "rud")}>
                  {GOALS.map((g) => <option key={g.id} value={g.id}>{t(g.label)}</option>)}
                </select>
              </label>
              <label className="rud-pick">
                <span className="rud-pick-kick">{t("Klang")}</span>
                <span className="rud-pick-val">{t((HEARS.find((h) => h.id === hear) || HEARS[0]).label)}</span>
                <span className="rud-pick-caret" aria-hidden="true">▾</span>
                <select value={hear} onChange={(e) => setHear(e.target.value)} aria-label={t("Klang")}>
                  {HEARS.map((h) => <option key={h.id} value={h.id}>{h.id === "hands" ? `${t(h.label)} (${t("rechts Floortom, links 14er Snare")})` : t(h.label)}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="dial-row">
            <Nudge by={-10} bpm={bpm} set={setBpm} min={30} max={260} />
            <Nudge by={-5} bpm={bpm} set={setBpm} min={30} max={260} />
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={wide || compact ? 88 : stage ? 152 : 124} now subLabel={playing ? "Stop" : "Start"} wheel />
            <Nudge by={5} bpm={bpm} set={setBpm} min={30} max={260} />
            <Nudge by={10} bpm={bpm} set={setBpm} min={30} max={260} />
          </div>
        </div>
      </div>
      <NavScrub
        items={RUDIMENTS.map((r) => ({ id: r.id, label: r.label, preview: r.label }))}
        index={idx}
        disabled={playing}
        onPick={pickRud}
        renderPreview={(row) => (
          <div className="rud-scrub-pv">
            <RudimentStaff rud={RUDIMENTS.find((r) => r.id === row.id)} />
          </div>
        )}
      />
      {printOpen ? <PrintDialog sel={sel} onClose={onPrintClose} /> : null}
    </div>
  );
}

function RudimentBack({ rud, onBack }) {
  const info = rudimentInfo(rud.id, getLang());
  const foot = <div className="rud-back-foot"><button type="button" onClick={onBack}>{t("Zurück")}</button></div>;
  if (!info) return <div className="rud-back"><p>{t("Zu diesem Rudiment liegt noch keine Info.")}</p>{foot}</div>;
  return (
    <div className="rud-back">
      <h3>{t("Was es ist")}</h3>
      <p>{info.what}</p>
      <h3>{t("Name")}</h3>
      <p>{info.name}</p>
      <h3>{t("Herkunft")}</h3>
      <p>{info.origin}</p>
      <h3>{t("Wofür")}</h3>
      <p>{info.use}</p>
      {foot}
    </div>
  );
}
