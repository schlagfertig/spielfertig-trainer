import { useEffect, useRef, useState } from "react";
import { MetronomeDial, Nudge } from "../lib/metronome.jsx";
import { RudimentStaff } from "../lib/staff.jsx";
import { BeatGlyph } from "../lib/BeatGlyph.jsx";
import { playClick, unlockAudio } from "../lib/audio.js";
import { t } from "../lib/i18n.js";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const BARS = [1, 2, 4];

const STAGES = [
  { id: "q", label: "4tel", perBeat: 1 },
  { id: "e", label: "8tel", perBeat: 2 },
  { id: "et", label: "8tel-Triole", perBeat: 3, tuplet: 3 },
  { id: "s16", label: "16tel", perBeat: 4 },
  { id: "q5", label: "Quintole", perBeat: 5, tuplet: 5 },
  { id: "sx", label: "16tel-Sextole", perBeat: 6, tuplet: 6 },
  { id: "s7", label: "Septole", perBeat: 7, tuplet: 7 },
  { id: "s32", label: "32tel", perBeat: 8 },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function plan(dir, stages) {
  const up = stages;
  const down = [...stages].reverse();
  if (dir === "up") return up;
  if (dir === "down") return down;
  return [...up, ...down.slice(1)];
}

function flipStick(s) {
  return s.replace(/R/g, "x").replace(/L/g, "R").replace(/x/g, "L");
}

function barLabel(n) {
  return n === 1 ? "1 Takt" : `${n} Takte`;
}

function beatNotes(stage, beat) {
  const per = stage.perBeat;
  const dur = 4 / per;
  const notes = [];
  let hands = "";
  for (let i = 0; i < per; i++) {
    const hand = (beat * per + i) % 2 === 0 ? "R" : "L";
    hands += hand;
    notes.push({
      t: beat * 4 + i * dur,
      dur,
      hand,
      acc: i === 0,
      g: beat + 1,
      ...(stage.tuplet ? { tuplet: stage.tuplet } : {}),
    });
  }
  return { notes, hands };
}

// Ein 4/4-Takt der Stufe. Im letzten Durchgang vor dem Wechsel (swapBeats > 0) sind die schon
// gespielten Schläge bereits durch die nächste Stufe ersetzt – so läuft der Takt Schlag für Schlag hinüber.
function barRud(stage, nextStage = null, swapBeats = 0) {
  const notes = [];
  let hands = "";
  for (let beat = 0; beat < 4; beat++) {
    const src = nextStage && beat < swapBeats ? nextStage : stage;
    const part = beatNotes(src, beat);
    notes.push(...part.notes);
    hands += part.hands;
  }
  const incoming = nextStage && swapBeats > 0 ? ` → ${t(nextStage.label)}` : "";
  return {
    label: `${t(stage.label)}${incoming} · 4/4`,
    time: "4/4",
    bars: 1,
    notes,
    sticking: [hands, flipStick(hands)],
  };
}

// Weicher Übergang: Ändert sich der Takt (neuer Schlag übernommen oder Stufenwechsel), bleibt der
// vorige Stand kurz als zweite Ebene liegen und blendet aus, der neue blendet ein (0,28 s wie im Fokus-Mode).
function useMorph(rud, sig, on) {
  const [st, setSt] = useState({ sig, rud, old: null, k: 0 });
  if (st.sig !== sig) setSt({ sig, rud, old: on ? st.rud : null, k: st.k + 1 });
  useEffect(() => {
    if (!st.old) return undefined;
    const k = st.k;
    const id = window.setTimeout(() => setSt((s) => (s.k === k ? { ...s, old: null } : s)), 320);
    return () => window.clearTimeout(id);
  }, [st.k, st.old]);
  return { old: st.old, k: st.k };
}

export default function PyramidTrainer({ preset = null } = {}) {
  const startBpm = preset?.bpm || 80;
  const [bpm, setBpm] = useState(startBpm);
  const [bars, setBars] = useState(2);
  const [dir, setDir] = useState("updown");
  const [enabled, setEnabled] = useState(() => new Set(STAGES.map((s) => s.id)));
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [countN, setCountN] = useState(0);
  const [beat, setBeat] = useState(false);
  const [idx, setIdx] = useState(0);
  const [leftBars, setLeftBars] = useState(0);
  const [playT, setPlayT] = useState(-1);
  // Letzter Durchgang vor dem Wechsel: schon übernommene Schläge (0–3) und verbleibende Schläge (4–1, sonst 0).
  const [swapBeats, setSwapBeats] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState("");
  const [flash, setFlash] = useState(0);
  const flashTimer = useRef(0);
  const wrapRef = useRef(null);
  const stopRef = useRef(null);
  const bpmRef = useRef(startBpm);
  const barsRef = useRef(2);
  bpmRef.current = bpm;
  barsRef.current = bars;
  const active = STAGES.filter((s) => enabled.has(s.id));
  const steps = plan(dir, active.length ? active : STAGES);
  const cur = steps[idx] || steps[0];
  const nextStage = idx + 1 < steps.length ? steps[idx + 1] : null;
  const live = playing && !counting;
  const swap = live && nextStage ? swapBeats : 0;
  const rud = barRud(cur, nextStage, swap);
  const nextRud = nextStage ? barRud(nextStage) : null;
  const focus = playing || counting;
  const soon = live && countdown > 0 && !!nextStage;
  const morph = useMorph(rud, `${cur.id}|${nextStage ? nextStage.id : "-"}|${swap}`, live);

  useEffect(() => () => { stopRef.current?.(); window.clearTimeout(flashTimer.current); }, []);
  useEffect(() => {
    wrapRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollTo(0, 0);
  }, []);

  function toggleStage(id) {
    if (playing) return;
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIdx(0);
    setDone("");
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setCounting(false);
    setCountN(0);
    setBeat(false);
    setLeftBars(0);
    setPlayT(-1);
    setSwapBeats(0);
    setCountdown(0);
    setIdx(0);
    window.clearTimeout(flashTimer.current);
    setFlash(0);
  }

  function start() {
    stop();
    setDone("");
    wrapRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    const ctx = unlockAudio();
    const selected = STAGES.filter((s) => enabled.has(s.id));
    const run = plan(dir, selected.length ? selected : STAGES);
    const holdBars = barsRef.current;
    let cancelled = false;
    let timer = 0;
    let si = 0;
    let sub = 0;
    let barsDone = 0;
    let ended = false;
    setIdx(0);
    setPlaying(true);
    setCounting(true);
    setCountN(1);
    setLeftBars(holdBars);
    setPlayT(-1);

    const pulse = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (!cancelled) {
          setBeat(true);
          window.setTimeout(() => setBeat(false), 80);
        }
      }, delay);
    };

    const q = 60 / Math.max(30, bpmRef.current);
    let next = ctx.currentTime + 0.03;
    for (let i = 0; i < 4; i++) {
      const when = next + i * q;
      playClick(ctx, when, i === 0);
      pulse(when);
      window.setTimeout(() => { if (!cancelled) setCountN(i + 1); }, Math.max(0, (when - ctx.currentTime) * 1000));
    }
    next += 4 * q;
    window.setTimeout(() => { if (!cancelled) { setCounting(false); setCountN(0); } }, Math.max(0, (next - ctx.currentTime) * 1000));

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setCounting(false);
      setCountN(0);
      setBeat(false);
      setLeftBars(0);
      setPlayT(-1);
      setSwapBeats(0);
      setCountdown(0);
      setIdx(0);
      window.clearTimeout(flashTimer.current);
      setFlash(0);
      setDone("Pyramide fertig.");
    };

    const schedule = () => {
      if (cancelled || ended) return;
      const now = ctx.currentTime;
      if (now < next - 0.02) {
        timer = window.setTimeout(schedule, 25);
        return;
      }
      const horizon = now + 0.16;
      while (next < horizon && !cancelled && !ended) {
        const curPer = run[si].perBeat;
        const down = sub % curPer === 0;
        playClick(ctx, next, down);
        const t16 = (sub % (curPer * 4)) * (4 / curPer);
        const delay = Math.max(0, (next - ctx.currentTime) * 1000);
        window.setTimeout(() => { if (!cancelled) setPlayT(t16); }, delay);
        if (down) pulse(next);
        // Letzter Takt dieser Stufe (und es folgt noch eine): zu Beginn jedes Schlags die schon
        // gespielten Schläge in die nächste Stufe überblenden und die restlichen Schläge zählen (4-3-2-1).
        if (down && barsDone === holdBars - 1 && si + 1 < run.length) {
          const beatIn = Math.floor((sub % (curPer * 4)) / curPer);
          window.setTimeout(() => { if (!cancelled) { setSwapBeats(beatIn); setCountdown(4 - beatIn); } }, delay);
        }
        next += 60 / Math.max(30, bpmRef.current) / curPer;
        sub += 1;
        if (sub % (curPer * 4) === 0) {
          barsDone += 1;
          const barDelay = Math.max(0, (next - ctx.currentTime) * 1000);
          if (barsDone >= holdBars) {
            if (si + 1 >= run.length) {
              ended = true;
              window.setTimeout(finish, barDelay);
              return;
            }
            si += 1;
            sub = 0;
            barsDone = 0;
            const nsi = si;
            window.setTimeout(() => {
              if (cancelled) return;
              setIdx(nsi);
              setSwapBeats(0);
              setCountdown(0);
              setLeftBars(holdBars);
              window.clearTimeout(flashTimer.current);
              setFlash(nsi);
              flashTimer.current = window.setTimeout(() => setFlash(0), 900);
            }, barDelay);
          } else {
            const left = Math.max(0, holdBars - barsDone);
            window.setTimeout(() => { if (!cancelled) setLeftBars(left); }, barDelay);
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
    <div className={focus ? "pyramid-wrap focus" : "pyramid-wrap"} ref={wrapRef}>
      {!focus ? (
        <p style={{ color: DIM, fontSize: 13, margin: "8px 0 10px" }}>
          {t("Stufen wählen · immer 4/4.")}
        </p>
      ) : null}
      <div className={focus ? "pyr-focus" : undefined}>
      <div className="staff-card pyr-cur" style={{ marginBottom: focus ? 0 : 10 }}>
        <div className="staff-label">
          {focus ? <span className="pyr-kick">{t("Jetzt")}</span> : null}
          {rud.label}
        </div>
        <div className="pyr-morph">
          <div className="pyr-layer" key={`n${morph.k}`} data-in={morph.old ? "1" : "0"}>
            <RudimentStaff rud={rud} playingT={counting ? -1 : playT} svgId="pyramid-live" />
          </div>
          {morph.old ? (
            <div className="pyr-layer pyr-layer-old" key={`o${morph.k}`} aria-hidden="true">
              <RudimentStaff rud={morph.old} playingT={-1} svgId="pyramid-live-old" />
            </div>
          ) : null}
        </div>
      </div>
      {focus ? (
        <div
          className={`pyr-next${soon ? " soon" : ""}${flash ? " flash" : ""}`}
          data-stage={cur.id}
          data-next={nextStage ? nextStage.id : "end"}
          data-countdown={soon ? countdown : 0}
        >
          <span className="pyr-sr" role="status" aria-live="polite" aria-atomic="true">
            {`${t("Jetzt")}: ${t(cur.label)}. `}
            {nextStage ? `${t("Als Nächstes")}: ${t(nextStage.label)}.` : `${t("Letzte Stufe")}, ${t("danach fertig")}.`}
          </span>
          <div className="pyr-next-head" aria-hidden="true">
            <div className="pyr-next-title">
              <span className="pyr-kick">{nextStage ? t("Als Nächstes") : t("Letzte Stufe")}</span>
              <span className="pyr-next-name">{nextStage ? t(nextStage.label) : t("danach fertig")}</span>
            </div>
            {soon ? (
              <div className="pyr-count" key={countdown}>
                <span className="pyr-count-kick">{t("Wechsel in")}</span>
                <span className="pyr-count-num">{countdown}</span>
                <span className="pyr-count-unit">{t(countdown === 1 ? "Schlag" : "Schlägen")}</span>
              </div>
            ) : (
              <span className="pyr-next-pos">{t("Stufe {i}/{n}", { i: idx + 1, n: steps.length })}</span>
            )}
          </div>
          {nextRud ? (
            <div className="pyr-next-staff" aria-hidden="true">
              <RudimentStaff rud={nextRud} playingT={-1} svgId="pyramid-next" />
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
      {!focus ? (
        <div className="panel" style={{ padding: "10px 12px 12px", marginBottom: 8 }}>
          <div className="pyr-steps">
            {STAGES.map((s) => {
              const on = enabled.has(s.id);
              return (
                <button key={s.id} type="button" className={on ? "chip on" : "chip"} aria-pressed={on} aria-label={t(s.label)} title={t(s.label)} onClick={() => toggleStage(s.id)}>
                  <BeatGlyph per={s.perBeat} tuplet={s.tuplet} on={on} />
                </button>
              );
            })}
          </div>
          {/* Paket C: beide Auswahlen über die ganze Breite, jeweils mit klarer Frage darüber */}
          <div className="pyr-opt" role="group" aria-labelledby="pyr-dir-l">
            <div className="pyr-opt-l" id="pyr-dir-l">{t("Richtung: Wie läuft die Pyramide?")}</div>
            <div className="seg pyr-seg">
              <button type="button" className={dir === "up" ? "on" : ""} onClick={() => setDir("up")}>{t("Aufwärts")}</button>
              <button type="button" className={dir === "down" ? "on" : ""} onClick={() => setDir("down")}>{t("Abwärts")}</button>
              <button type="button" className={dir === "updown" ? "on" : ""} onClick={() => setDir("updown")}>{t("Auf & ab")}</button>
            </div>
          </div>
          <div className="pyr-opt" role="group" aria-labelledby="pyr-bars-l">
            <div className="pyr-opt-l" id="pyr-bars-l">{t("Länge: Wie viele Takte pro Stufe?")}</div>
            <div className="seg pyr-seg">
              {BARS.map((n) => (
                <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => setBars(n)}>{n === 1 ? t("1 Takt") : t("{n} Takte", { n })}</button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {counting ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(22,26,29,0.72)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "28vw", lineHeight: 0.9, color: TEAL, fontWeight: 700 }}>{countN || 1}</div>
            <div style={{ color: DIM, letterSpacing: "0.16em", fontWeight: 800, textTransform: "uppercase" }}>{t("Einzählen")}</div>
          </div>
        </div>
      ) : null}
      <div className={focus ? "pyramid-dock pyr-dock focus" : "pyramid-dock pyr-dock"}>
        <div style={{ pointerEvents: "auto", maxWidth: 880, margin: "0 auto" }}>
          <div className="dial-row">
            <Nudge by={-10} bpm={bpm} set={setBpm} min={30} max={200} />
            <Nudge by={-5} bpm={bpm} set={setBpm} min={30} max={200} />
            <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={focus ? 112 : 124} now subLabel={playing ? "Stop" : "Start"} wheel />
            <Nudge by={5} bpm={bpm} set={setBpm} min={30} max={200} />
            <Nudge by={10} bpm={bpm} set={setBpm} min={30} max={200} />
          </div>
          {playing && !counting ? (
            <div className="count">
              <span className="count-num">{leftBars}</span>
              <span className="count-unit">{t(leftBars === 1 ? "Takt übrig" : "Takte übrig")}</span>
            </div>
          ) : null}
          {done ? <p style={{ color: TEAL, textAlign: "center", margin: "12px 0 0" }}>{t(done)}</p> : null}
        </div>
      </div>
      <style>{`
        .pyr-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-bottom: 8px; }
        .pyr-steps .chip { min-height: 52px; padding: 6px 4px; display: flex; align-items: center; justify-content: center; }
        .pyr-steps svg { width: 100%; max-width: 64px; height: auto; }
        .pyr-opt { margin-top: 10px; }
        .pyr-opt-l { font: 800 12px/1.3 Figtree, sans-serif; letter-spacing: 0.06em; color: #5cc8b8; margin: 0 2px 6px; }
        .pyr-seg { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); width: 100%; box-sizing: border-box; }
        .pyr-seg button { min-width: 0; padding-left: 4px; padding-right: 4px; white-space: nowrap; }
        /* Kurze Hochformat-Screens: alles etwas kompakter, damit die Auswahl nicht unter das Rad rutscht */
        @media (max-height: 720px) and (orientation: portrait) {
          .pyramid-wrap:not(.focus) .pyr-cur { padding-top: 8px; padding-bottom: 4px; }
          .pyramid-wrap:not(.focus) .pyr-cur svg { max-height: 64px; }
          .pyr-steps { gap: 5px; margin-bottom: 4px; }
          .pyr-steps .chip { min-height: 40px; padding: 3px 4px; }
          .pyr-steps svg { max-width: 52px; }
          .pyr-opt { margin-top: 6px; }
          .pyr-opt-l { font-size: 11px; margin-bottom: 4px; }
          .pyr-seg button { padding-top: 6px; padding-bottom: 6px; font-size: 15px; }
        }
        .pyramid-wrap { scroll-margin-top: 8px; padding-bottom: calc(220px + env(safe-area-inset-bottom, 0px)); }
        .pyramid-wrap.focus { padding-bottom: calc(168px + env(safe-area-inset-bottom, 0px)); }
        .pyr-dock { position: fixed; left: 0; right: 0; bottom: 0; z-index: 15; background: transparent; border: none; box-shadow: none; border-radius: 0; margin: 0; padding: 6px 14px calc(10px + env(safe-area-inset-bottom, 0px)); pointer-events: none; }
        .pyr-kick { display: block; font: 800 11px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #8a969c; margin-bottom: 2px; }
        .pyr-morph { position: relative; }
        .pyr-layer-old { position: absolute; inset: 0; pointer-events: none; }
        .pyr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
        /* Nächste Stufe: ganzer Takt zum Vorauslesen, helle Karte wie die aktuelle Übung in Hand Control */
        .pyr-next { position: relative; margin-top: 10px; background: #f4f7f6; color: #161a1d; border-radius: 16px; border: 1px solid #e1e6e8; padding: 10px 12px 8px; }
        .pyr-next-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; min-height: 44px; }
        .pyr-next-title { display: flex; flex-direction: column; min-width: 0; }
        .pyr-next-name { font-family: Oswald, sans-serif; font-weight: 700; font-size: 20px; letter-spacing: 0.03em; line-height: 1.1; }
        .pyr-next-pos { font: 800 11px Figtree, sans-serif; letter-spacing: 0.1em; color: #8a969c; white-space: nowrap; padding-top: 2px; }
        .pyr-next-staff svg { display: block; width: 100%; height: auto; max-height: 104px; margin: 0 auto; }
        /* Letzter Durchgang: Karte leicht türkis, Countdown der Schläge bis zum Wechsel */
        .pyr-next.soon { background: #e2f3f0; border-color: #5cc8b8; }
        .pyr-next.soon .pyr-kick { color: #2f9e90; }
        .pyr-count { display: grid; grid-template-columns: auto auto; grid-template-areas: "kick kick" "num unit"; align-items: baseline; column-gap: 6px; text-align: right; color: #2f9e90; }
        .pyr-count-kick { grid-area: kick; font: 800 10px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; justify-self: end; }
        .pyr-count-num { grid-area: num; font-family: Oswald, sans-serif; font-weight: 700; font-size: 30px; line-height: 1; justify-self: end; }
        .pyr-count-unit { grid-area: unit; font: 800 11px Figtree, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
        .pyr-next.flash { box-shadow: 0 0 0 2px #5cc8b8; }
        @media (prefers-reduced-motion: no-preference) {
          .pyr-layer[data-in="1"] { animation: pyrIn 0.2s ease-out both; }
          .pyr-layer-old { animation: pyrOut 0.28s ease-in both; }
          .pyr-next { transition: background-color 0.28s ease, border-color 0.28s ease; }
          .pyr-count-num { animation: pyrTick 0.28s ease-out; }
          @keyframes pyrIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes pyrOut { 0%, 40% { opacity: 1; } 100% { opacity: 0; } }
          @keyframes pyrTick { from { transform: scale(1.25); } to { transform: scale(1); } }
        }
        /* Reduzierte Bewegung: kein Überblenden, nur Umschalten */
        @media (prefers-reduced-motion: reduce) {
          .pyr-layer-old { display: none; }
        }
        /* Quer beim Üben: Noten links, Rad und Takt-Zähler rechts – nichts liegt übereinander */
        @media (orientation: landscape) and (max-height: 820px) {
          /* Rechte Spalte breit genug für −5 · Rad (144 px mit Ring) · +5 samt Rand – vorher ragte +5 um 4 px über den Bildschirm */
          .pyramid-wrap.focus { padding-bottom: 12px; padding-right: calc(284px + env(safe-area-inset-right, 0px)); }
          .pyr-dock.focus { left: auto; top: 0; width: calc(284px + env(safe-area-inset-right, 0px)); padding: 8px calc(12px + env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) 12px; display: flex; flex-direction: column; justify-content: center; }
          .pyr-dock.focus .dial-row { gap: 8px; }
          .pyr-dock.focus .count { margin-top: 22px; }
          .pyr-dock.focus .count-num { font-size: 40px; }
          .pyr-dock.focus .count-unit { font-size: 13px; }
          .pyramid-wrap.focus .pyr-cur .staff-label { display: flex; gap: 8px; align-items: baseline; }
          .pyramid-wrap.focus .pyr-cur .pyr-kick { display: inline; margin: 0; }
          .pyramid-wrap.focus .pyr-next { margin-top: 8px; padding: 8px 12px 6px; }
          .pyramid-wrap.focus .pyr-next-staff svg { max-height: 84px; }
        }
      `}</style>
    </div>
  );
}
