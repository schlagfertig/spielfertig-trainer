import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
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

function barRud(stage) {
  const per = stage.perBeat;
  const dur = 4 / per;
  const notes = [];
  let hands = "";
  for (let beat = 0; beat < 4; beat++) {
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
  }
  return {
    label: `${t(stage.label)} · 4/4`,
    time: "4/4",
    bars: 1,
    notes,
    sticking: [hands, flipStick(hands)],
  };
}

export default function PyramidTrainer() {
  const [bpm, setBpm] = useState(80);
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
  const [done, setDone] = useState("");
  // Kurzes visuelles Aufleuchten beim Stufenwechsel (nur Anzeige, kein Einfluss auf Click/Timing).
  const [flash, setFlash] = useState(0);
  const flashTimer = useRef(0);
  const wrapRef = useRef(null);
  const stopRef = useRef(null);
  const bpmRef = useRef(80);
  const barsRef = useRef(2);
  bpmRef.current = bpm;
  barsRef.current = bars;
  const active = STAGES.filter((s) => enabled.has(s.id));
  const steps = plan(dir, active.length ? active : STAGES);
  const cur = steps[idx] || steps[0];
  const nextStage = idx + 1 < steps.length ? steps[idx + 1] : null;
  const rud = barRud(cur);
  const focus = playing || counting;

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
        next += 60 / Math.max(30, bpmRef.current) / curPer;
        sub += 1;
        if (sub % (curPer * 4) === 0) {
          barsDone += 1;
          // Anzeige (Stufe, Resttakte, Ende) erst dann umschalten, wenn der Taktwechsel hörbar ist –
          // der Scheduler plant bis zu ~160 ms voraus.
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
    <div className="pyramid-wrap" ref={wrapRef} style={{ paddingBottom: focus ? "calc(168px + env(safe-area-inset-bottom, 0px))" : "calc(220px + env(safe-area-inset-bottom, 0px))" }}>
      {!focus ? (
        <p style={{ color: DIM, fontSize: 13, margin: "8px 0 10px" }}>
          {t("Stufen wählen · immer 4/4.")}
        </p>
      ) : null}
      <div className="staff-card" style={{ marginBottom: focus ? 0 : 10 }}>
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} playingT={counting ? -1 : playT} svgId="pyramid-live" />
      </div>
      {focus ? (
        <div
          className={flash ? "pyr-now flash" : "pyr-now"}
          data-stage={cur.id}
          data-next={nextStage ? nextStage.id : "end"}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Notenfigur (ein Schlag der Unterteilung) statt Name; Name bleibt für Screenreader. */}
          <span className="pyr-sr">
            {`${t("Jetzt")}: ${t(cur.label)}. `}
            {nextStage ? `${t("Als Nächstes")}: ${t(nextStage.label)}.` : `${t("Letzte Stufe")}, ${t("danach fertig")}.`}
          </span>
          <div className="pyr-now-col" aria-hidden="true">
            <span className="pyr-now-kick" aria-hidden="true">{t("Jetzt")}</span>
            <span className="pyr-now-glyph cur" aria-hidden="true"><BeatGlyph per={cur.perBeat} tuplet={cur.tuplet} /></span>
          </div>
          <span className="pyr-now-arrow" aria-hidden="true">→</span>
          <div className="pyr-now-col" aria-hidden="true">
            <span className="pyr-now-kick" aria-hidden="true">{nextStage ? t("Als Nächstes") : t("Letzte Stufe")}</span>
            {nextStage ? (
              <span className="pyr-now-glyph next" aria-hidden="true"><BeatGlyph per={nextStage.perBeat} tuplet={nextStage.tuplet} /></span>
            ) : (
              <span className="pyr-now-val end" aria-hidden="true">{t("danach fertig")}</span>
            )}
          </div>
          <span className="pyr-now-pos" aria-hidden="true">{t("Stufe {i}/{n}", { i: idx + 1, n: steps.length })}</span>
        </div>
      ) : null}
      {!focus ? (
        <div className="panel" style={{ padding: "10px 12px 12px", marginBottom: 8 }}>
          <div className="pyr-steps">
            {STAGES.map((s) => {
              const on = enabled.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={on ? "chip on" : "chip"}
                  aria-pressed={on}
                  aria-label={t(s.label)}
                  title={t(s.label)}
                  onClick={() => toggleStage(s.id)}
                >
                  <BeatGlyph per={s.perBeat} tuplet={s.tuplet} on={on} />
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="seg" style={{ width: "fit-content" }}>
              <button type="button" className={dir === "up" ? "on" : ""} onClick={() => setDir("up")}>{t("auf")}</button>
              <button type="button" className={dir === "down" ? "on" : ""} onClick={() => setDir("down")}>{t("ab")}</button>
              <button type="button" className={dir === "updown" ? "on" : ""} onClick={() => setDir("updown")}>{t("auf+ab")}</button>
            </div>
            <div className="seg" style={{ width: "fit-content" }}>
              {BARS.map((n) => (
                <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => setBars(n)}>{n === 1 ? t("1 Takt") : t("{n} T.", { n })}</button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {counting ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(22,26,29,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Oswald, sans-serif", fontSize: "28vw", lineHeight: 0.9, color: TEAL, fontWeight: 700 }}>{countN || 1}</div>
            <div style={{ color: DIM, letterSpacing: "0.16em", fontWeight: 800, textTransform: "uppercase" }}>{t("Einzählen")}</div>
          </div>
        </div>
      ) : null}
      <div
        className="pyramid-dock"
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
          padding: "6px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto", maxWidth: 880, margin: "0 auto" }}>
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 30, 200))} aria-label={t("5 BPM langsamer")}>−5</button>
            <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={focus ? 112 : 124} now subLabel={playing ? "Stop" : "Start"} />
            <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 30, 200))} aria-label={t("5 BPM schneller")}>+5</button>
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
        /* 4 Kacheln pro Reihe, Notensymbol mitskaliert */
        .pyr-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-bottom: 8px; }
        .pyr-steps .chip { min-height: 52px; padding: 6px 4px; display: flex; align-items: center; justify-content: center; }
        .pyr-steps svg { width: 100%; max-width: 64px; height: auto; }
        /* WA-20: Jetzt / Als Nächstes – feste Höhe, damit beim Wechsel nichts springt */
        .pyr-now {
          position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center; gap: 10px; height: 84px; box-sizing: border-box; margin-top: 12px;
          padding: 12px 14px 10px; border-radius: 14px; border: 1.5px solid rgba(92, 200, 184, 0.35);
          background: rgba(19, 33, 31, 0.92); color: #eef3f2;
        }
        .pyr-now-col { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
        .pyr-now-col:last-of-type { text-align: right; }
        .pyr-now-kick { font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${DIM}; }
        .pyr-now-val {
          font-family: Oswald, sans-serif; font-weight: 700; font-size: 20px; line-height: 1.1; color: ${TEAL};
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere;
        }
        .pyr-now-val.end { color: ${DIM}; font-size: 17px; }
        .pyr-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
        .pyr-now-glyph { display: flex; align-items: flex-end; height: 40px; }
        .pyr-now-col:last-of-type .pyr-now-glyph { justify-content: flex-end; }
        .pyr-now-glyph svg { width: 76px; height: 38px; }
        .pyr-now-glyph.next svg { width: 64px; height: 32px; }
        /* aktuelle Stufe in Teal, nächste hell */
        .pyr-now-glyph.cur svg [fill="#f4f7f6"] { fill: ${TEAL}; }
        .pyr-now-glyph.cur svg [stroke="#f4f7f6"] { stroke: ${TEAL}; }
        .pyr-now-arrow { color: ${DIM}; font-size: 20px; font-weight: 800; }
        .pyr-now-pos { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: ${DIM}; white-space: nowrap; }
        .pyr-now.flash { border-color: ${TEAL}; background: rgba(92, 200, 184, 0.22); }
        @media (prefers-reduced-motion: no-preference) {
          .pyr-now { transition: background-color .5s ease-out, border-color .5s ease-out; }
          .pyr-now.flash { transition: none; animation: pyrFlash .9s ease-out; }
          @keyframes pyrFlash { 0% { box-shadow: 0 0 0 0 rgba(92, 200, 184, 0.55); } 100% { box-shadow: 0 0 0 10px rgba(92, 200, 184, 0); } }
        }
      `}</style>
    </div>
  );
}
