import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { RudimentStaff } from "./staff.jsx";
import { MetronomeDial, Nudge } from "./metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "./audio.js";
import { beatDelayMs } from "./audioOffset.js";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";
import { BPM, BPM_MAX, BPM_MIN, LENGTHS, LEVELS, METERS, barOf, etudeEvents, rerollBar, rollEtude } from "./etudeDice.js";
import { askUnlock, isUnlocked, FREE_RUDIMENTS } from "./demo.js";
import { usePracticeTrack } from "./PracticeDiary.jsx";

// Rudiment-Würfel: Länge + Schwierigkeit wählen, würfeln, Takt für Takt neu würfeln, üben.
const DIM = "#8a969c";
const clampBpm = (n) => Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(Number(n) || BPM.leicht)));

// Notenbild eng zuschneiden: RudimentStaff hat oben/unten viel Luft (viewBox-Höhe fest) - hier nur der belegte Bereich.
function tightenStaves(root) {
  if (!root) return;
  root.querySelectorAll(".ed-staff svg").forEach((svg) => {
    try {
      const cur = svg.getAttribute("viewBox") || "";
      // Hat React die viewBox neu gesetzt (anderer Takt), gilt die neue als Original.
      if (cur !== svg.dataset.tight) svg.dataset.vb = cur;
      const vb = (svg.dataset.vb || "").split(/\s+/).map(Number);
      if (vb.length !== 4) return;
      const bb = svg.getBBox();
      if (!bb.height) return;
      const top = Math.max(0, bb.y - 4);
      const bot = Math.min(vb[3], bb.y + bb.height + 4);
      const tight = `${vb[0]} ${top} ${vb[2]} ${bot - top}`;
      svg.dataset.tight = tight;
      svg.setAttribute("viewBox", tight);
    } catch { /* getBBox geht nur sichtbar - dann bleibt die Original-Ansicht */ }
  });
}

const KICK = { color: "#5cc8b8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, margin: "8px 0 10px" };

// Klang-Symbole im Stil der Startseiten-Glyphen (HomeIcons): helle Linien (currentColor), türkise Akzente, Gold sparsam.
function DrumGlyph() {
  return (
    <svg className="ed-glyph" viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <ellipse cx="16" cy="18" rx="10" ry="3.6" />
      <path d="M6 18v5.2c0 2 4.5 3.6 10 3.6s10-1.6 10-3.6V18" />
      <path className="ed-g-soft" d="M10 21.4v4M16 21.8v5M22 21.4v4" />
      <path className="ed-g-acc" d="M8.5 5.5 18 15.2M23.5 5.5 14 15.2" />
      <circle className="ed-g-acc ed-g-fill" cx="8.3" cy="5.3" r="1.5" />
      <circle className="ed-g-acc ed-g-fill" cx="23.7" cy="5.3" r="1.5" />
    </svg>
  );
}

function MetroGlyph() {
  return (
    <svg className="ed-glyph" viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12.6 4.5h6.8l5.1 22H7.5z" />
      <path d="M7.5 26.5h17" />
      <path className="ed-g-soft" d="M10.5 20.5h11" />
      <path className="ed-g-acc" d="M16 22.5 21.8 8" />
      <circle className="ed-g-gold" cx="19.9" cy="12.8" r="2.2" />
    </svg>
  );
}

// Klang-Knopf (Liquid Glass): Trommel = nur Snare, Trommel + Metronom = Snare + Click.
function SoundBtn({ on, metro, label, onClick }) {
  return (
    <button type="button" className={`ed-snd${metro ? " ed-snd-click" : " ed-snd-snare"}${on ? " on" : ""}`} aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      <DrumGlyph />
      {metro ? <><span aria-hidden="true" className="ed-snd-plus">+</span><MetroGlyph /></> : null}
    </button>
  );
}

function Seg({ value, options, onChange, label }) {
  return (
    <div className="ed-row">
      <span className="ed-lab">{label}</span>
      <div className="seg ed-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function diceOnly() {
  return isUnlocked() ? null : FREE_RUDIMENTS;
}

export default function EtudeDice() {
  const saved = loadSession("etudeDice", {});
  const [bars, setBars] = useState(saved.bars === 8 ? 8 : 4);
  const [level, setLevel] = useState(LEVELS.some((l) => l.id === saved.level) ? saved.level : "leicht");
  const [meter, setMeter] = useState(() => {
    const m = METERS.includes(saved.meter) ? saved.meter : "4/4";
    return !isUnlocked() && m === "6/8" ? "4/4" : m;
  });
  const [etude, setEtude] = useState(() => {
    const e = saved.etude?.ids?.length ? saved.etude : null;
    if (!e || isUnlocked()) return e;
    if (e.meter === "6/8" || e.ids.some((id) => !FREE_RUDIMENTS.includes(Number(id)))) return null;
    return e;
  });
  const [bpm, setBpmRaw] = useState(clampBpm(saved.bpm || BPM.leicht));
  const setBpm = (v) => setBpmRaw((b) => clampBpm(typeof v === "function" ? v(b) : v));
  const [click, setClick] = useState(saved.click !== false);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [rolled, setRolled] = useState(-2); // -1 = alles, sonst Taktnummer (kurze Würfel-Animation)
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  usePracticeTrack({ ex: "dice", playing, bpm });
  const stopRef = useRef(null);

  useEffect(() => { saveSession("etudeDice", { bars, level, meter, etude, bpm, click }); }, [bars, level, meter, etude, bpm, click]);
  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
  }

  function flash(i) {
    setRolled(i);
    window.setTimeout(() => setRolled(-2), 340);
  }

  function pickMeter(next) {
    if (next === "6/8" && !isUnlocked()) { askUnlock(); return; }
    setMeter(next);
  }

  function roll() {
    stop();
    const only = diceOnly();
    const meterNow = only && meter === "6/8" ? "4/4" : meter;
    if (meterNow !== meter) setMeter(meterNow);
    setEtude(rollEtude({ bars, level, meter: meterNow, only }));
    setBpm(BPM[level]);
    flash(-1);
  }

  function reroll(i) {
    stop();
    const only = diceOnly();
    setEtude((e) => rerollBar(e, i, Math.random, only));
    flash(i);
  }

  function start() {
    if (!etude) return;
    stop();
    const ctx = unlockAudio();
    const { ev, total } = etudeEvents(etude, { click, snare: true });
    if (!ev.length) return;
    const stepSec = () => 60 / Math.max(BPM_MIN, bpmRef.current) / 4;
    let cancelled = false;
    let timer = 0;
    let i = 0;
    // Zeit der nächsten Note wird Schritt für Schritt mit dem aktuellen Tempo weitergezählt.
    // So greift ein neues Tempo (SpinDial / ±5) sofort ab der nächsten Note - ohne Sprung, ohne verschluckte Noten.
    let when = ctx.currentTime + 0.05;
    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (when < now - 0.05) when = now + 0.02; // Tab im Hintergrund o. Ä.: neu einrasten statt nachholen
      const horizon = now + 0.12;
      while (!cancelled && when < horizon) {
        const e = ev[i];
        const step = stepSec();
        const d = beatDelayMs(ctx, when);
        if (e.kind === "click") {
          playClick(ctx, when, e.down);
          window.setTimeout(() => { if (cancelled) return; setBeat(true); window.setTimeout(() => setBeat(false), 80); }, d);
        } else playOrnament(ctx, e.nt, when, "snare", step);
        window.setTimeout(() => { if (!cancelled) setPlayT(e.t); }, d);
        const next = i + 1 < ev.length ? ev[i + 1].t : total;
        when += (next - e.t) * step;
        i = i + 1 < ev.length ? i + 1 : 0;
        if (i === 0 && ev[0].t > 0) when += ev[0].t * step;
      }
      timer = window.setTimeout(schedule, 25);
    };
    setPlaying(true);
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  const barsRef = useRef(null);
  useLayoutEffect(() => { tightenStaves(barsRef.current); }, [etude]);

  const steps = etude?.meter === "6/8" ? 12 : 16;
  const curBar = playT < 0 ? -1 : Math.floor((playT + 1e-4) / steps);
  const setupChanged = etude && (etude.bars !== bars || etude.level !== level || etude.meter !== meter);

  return (
    <div className="ed-wrap">
      <p style={KICK}>{`${t("Neu")} · ${t("Rudiment-Würfel")}`}</p>
      <p style={{ color: DIM, fontSize: 17, margin: "0 0 12px" }}>{isUnlocked()
        ? t("Würfel dir aus den 40 Rudiments deine eigene Übung - jedes Mal neu, Takt für Takt.")
        : t("Kostenlos würfelst du nur aus sechs Rudiments: Single Stroke Roll, Double Stroke Open Roll, Single Paradiddle, Flam, Flam Tap und Drag. 6/8 gehört zur vollen App.")}</p>
      <div className="panel ed-setup">
        <Seg label={t("Länge")} value={bars} onChange={setBars} options={LENGTHS.map((n) => ({ id: n, label: t("{n} Takte", { n }) }))} />
        <Seg label={t("Stufe")} value={level} onChange={setLevel} options={LEVELS.map((l) => ({ id: l.id, label: t(l.label) }))} />
        <Seg label={t("Takt")} value={meter} onChange={pickMeter} options={METERS.map((m) => ({ id: m, label: m }))} />
        <button type="button" className="card ed-roll" onClick={roll}>
          <span className="ed-die" aria-hidden="true">🎲</span>
          <span>{etude ? t("Nochmal würfeln") : t("Würfeln")}</span>
        </button>
      </div>
      {etude ? (
        <>
          <div className="bg-meta" style={{ margin: "14px 0 8px" }}>{`${t("{n} Takte", { n: etude.ids.length })} · ${t(LEVELS.find((l) => l.id === etude.level)?.label || "")} · ${etude.meter}`}</div>
          <ol className="ed-bars" ref={barsRef}>
            {etude.ids.map((id, i) => {
              const bar = barOf(id, etude.meter);
              const now = curBar === i;
              return (
                <li key={`${i}-${id}`} className={`ed-bar${now ? " is-now" : ""}${rolled === i || rolled === -1 ? " is-roll" : ""}`}>
                  <div className="ed-bar-head">
                    <span className="ed-num">{i + 1}</span>
                    <span className="ed-name">{bar.label.replace(/^\d+\.\s*/, "")}{bar.reps > 1 ? <small> ×{bar.reps}</small> : null}</span>
                    <button type="button" className="ghost ed-reroll" onClick={() => reroll(i)} aria-label={t("Takt {n} neu würfeln", { n: i + 1 })}>🎲</button>
                  </div>
                  <div className="ed-staff">
                    <RudimentStaff rud={bar} playingT={now ? playT - i * steps : -1} />
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="panel dock ed-dock dial-row" style={{ position: "static", margin: "6px 0 14px", borderRadius: 12, boxShadow: "none", border: "1px solid transparent" }}>
            <SoundBtn on={click} metro label={t("Snare + Click")} onClick={() => { setClick(true); if (playing) stop(); }} />
            <SoundBtn on={!click} label={t("Nur Snare")} onClick={() => { setClick(false); if (playing) stop(); }} />
            <span className="ed-n ed-m10"><Nudge by={-10} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} /></span>
            <span className="ed-n ed-m5"><Nudge by={-5} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} /></span>
            <div className="ed-dial">
              <MetronomeDial bpm={bpm} setBpm={setBpm} min={BPM_MIN} max={BPM_MAX} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} wheel />
            </div>
            <span className="ed-n ed-p5"><Nudge by={5} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} /></span>
            <span className="ed-n ed-p10"><Nudge by={10} bpm={bpm} set={setBpm} min={BPM_MIN} max={BPM_MAX} /></span>
          </div>
          <p style={{ color: DIM, fontSize: 15, margin: "0 0 12px", textAlign: "center" }}>{t("Erst langsam, dann am SpinDial schneller drehen. Ein Takt gefällt dir nicht? Tipp auf 🎲.")}</p>
        </>
      ) : (
        <p style={{ color: DIM, fontSize: 15, margin: "14px 0", textAlign: "center" }}>{t("Wähl Länge und Stufe und tipp auf ‚Würfeln‘.")}</p>
      )}
    </div>
  );
}
