import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MetronomeDial, Nudge } from "../lib/metronome.jsx";
import { playClick, playClickLayer, unlockAudio } from "../lib/audio.js";
import { NavScrub } from "../lib/NavScrub.jsx";
import { t } from "../lib/i18n.js";
import { TERNARY_ENABLED, TRI_LEN, triHands, triNotes } from "../lib/handTernary.js";

const DIM = "#8a969c";
const TEAL = "#5cc8b8";
const INK = "#161a1d";
const LIST = "#f4f7f6";
const LINE = "#2a3338";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";
const GOLD = "#e8b84b";
const CELL_STEPS = 32;
const INNER = 13;
const GAP = 20;
const LINE_L = 30;
const Q_PER_BAR = 4;

const n = (t, dur, hand, extra = {}) => ({ t, dur, hand, acc: false, ...extra });
const run8ths = (hands) =>
  hands.split("").map((h, i) => n(i * 2, 2, h, { g: Math.floor(i / 4) + 1 }));

const PATTERNS = [
  "RLRLRLRLRLRLRLRL",
  "RRLLRRLLRRLLRRLL",
  "RRRLRRRLRRRLRRRL",
  "RRRRLLLLRRRRLLLL",
  "RRRRRLLLRRRRRLLL",
  "RRRRRRLLRRRRRRLL",
  "RRRRRRRLRRRRRRRL",
  "RRRRRRRRRRRRRRRR",
  "LRLRLRLRLRLRLRLR",
  "LLRRLLRRLLRRLLRR",
  "LLLRLLLRLLLRLLLR",
  "LLLLRRRRLLLLRRRR",
  "LLLLLRRRLLLLLRRR",
  "LLLLLLRRLLLLLLRR",
  "LLLLLLLRLLLLLLLR",
  "LLLLLLLLLLLLLLLL",
  "RLRRLRLLRLRRLRLL",
  "RLLRLRRLRLLRLRRL",
  "RRLRLLRLRRLRLLRL",
  "RLRLLRLRRLRLLRLR",
  "RLRLRRLLRLRLRRLL",
  "RLRLRRRRRLRLRRRR",
  "LRLRLLRRLRLRLLRR",
  "LRLRLLLLLRLRLLLL",
];

const EXERCISES = PATTERNS.map((hands, i) => ({
  id: i + 1,
  label: `Nr. ${i + 1}`,
  notes: run8ths(hands),
  hands,
}));

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function noteX(i) {
  const g = Math.floor(i / 4);
  const k = i % 4;
  return LINE_L + GAP + g * (INNER * 3 + GAP) + k * INNER;
}

function phraseWidth() {
  return noteX(15) + GAP + 8;
}

// Ein Takt mit 12 Triolen-Achteln: Abstände so, dass die Breite etwa der binären Zeile (2 Takte) entspricht.
function noteX3(i) {
  const g = Math.floor(i / 3);
  const k = i % 3;
  const inner = 17;
  const gap = 22;
  return 26 + gap + g * (inner * 2 + gap) + k * inner;
}

function phraseWidth3() {
  return noteX3(TRI_LEN - 1) + 24;
}

// Helle Karte: R grau, L dunkleres Türkis (#2f9e90, auf Hell besser lesbar); der gerade gespielte Buchstabe deutlich dunkler
// (R fast schwarz, L #1d7a6f). Dunkle Zeilen: L wie gehabt #5cc8b8.
const TEAL_ON_LIGHT = "#2f9e90";
function handFill(ch, on, onLight) {
  if (on) return "#5cc8b8";
  if (ch === "L") return onLight ? TEAL_ON_LIGHT : "#5cc8b8";
  return onLight ? "#8a969c" : "#d7dee1";
}

function Hands({ id, hands, nextHands = null, swapGroups = 0, playT = -1, ternary, size = 28, light = true }) {
  // Fokus-Mode, letzte Wiederholung: schon gespielte 4er-Gruppen (swapGroups) zeigen den Handsatz
  // der nächsten Übung – weicher Opacity-Fade, aktuelle und kommende Gruppen bleiben unverändert.
  const letters = (ternary ? triHands(hands) : String(hands || "")).split("");
  const nextLetters = nextHands
    ? (ternary ? triHands(nextHands) : String(nextHands || "")).split("")
    : null;
  const active = playT < 0 ? -1 : (ternary ? Math.round(playT) : Math.round(playT / 2));
  const gSize = ternary ? 3 : 4;
  const cell = size * 0.78;
  const gap = size * 0.55;
  const xOf = (i) => 34 + Math.floor(i / gSize) * (gSize * cell + gap) + (i % gSize) * cell;
  const end = xOf(letters.length - 1) + 16;
  const y = size;
  const fade = { transition: "opacity 0.28s ease" };
  return (
    <svg viewBox={`0 2 ${end} ${size + 10}`} width="100%" role="img" aria-label={t("Nummer {n}", { n: id })} data-swap-groups={swapGroups}>
      {Array.from({ length: Math.ceil(letters.length / gSize) - 1 }, (_, g) => {
        const x = (xOf(g * gSize + gSize - 1) + xOf((g + 1) * gSize)) / 2;
        return <line key={g} x1={x} y1={y - size * 0.62} x2={x} y2={y + 4} stroke="#c8d0d4" strokeWidth="1.2" />;
      })}
      <text x="8" y={y} fill={light ? TEAL_ON_LIGHT : TEAL} fontFamily="Oswald, sans-serif" fontWeight="700" fontSize={size * 0.72}>{id}.</text>
      {letters.map((ch, i) => {
        const g = Math.floor(i / gSize);
        const swapped = !!(nextLetters && g < swapGroups);
        const nextCh = nextLetters?.[i] ?? ch;
        const on = i === active;
        if (!nextLetters) {
          return <text key={i} x={xOf(i)} y={y} textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize={size} fill={handFill(ch, on, light)}>{ch}</text>;
        }
        return (
          <g key={i}>
            <text x={xOf(i)} y={y} textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize={size} fill={handFill(ch, on && !swapped, light)} style={{ ...fade, opacity: swapped ? 0 : 1 }}>{ch}</text>
            <text x={xOf(i)} y={y} textAnchor="middle" fontFamily="Oswald, sans-serif" fontWeight="700" fontSize={size} fill={handFill(nextCh, on && swapped, light)} style={{ ...fade, opacity: swapped ? 1 : 0 }}>{nextCh}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Phrase(props) {
  return <Hands {...props} size={28} light />;
}

function NextRow(props) {
  return <Hands {...props} size={18} light={false} />;
}

function StickRow(props) {
  return <Hands {...props} size={15} light={false} />;
}

/* Drehrädchen (iOS-artiger Walzen-Picker) für die Wiederholungen: senkrecht wischen/scrollen rastet ein,
   Antippen einer Zahl wählt sie, Tastatur: ↑/↓, Bild↑/↓ (±5), Pos1/Ende. Für Screenreader ein spinbutton. */
const DRUM_ITEM = 20; // drei Zeilen sichtbar: davor · Auswahl · danach
function RepsDrum({ value, min = 1, max = 20, onChange, disabled, label }) {
  const ref = useRef(null);
  const userScroll = useRef(false);
  const progUntil = useRef(0); // während die Walze selbst scrollt (Taste/Tippen), Zwischenstände ignorieren
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = (value - min) * DRUM_ITEM;
    // nur beim Einhängen: danach folgt die Walze dem Wert (siehe unten)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (userScroll.current) { userScroll.current = false; return; }
    const top = (value - min) * DRUM_ITEM;
    if (Math.abs(el.scrollTop - top) > 1) {
      progUntil.current = Date.now() + (reduced ? 80 : 450);
      el.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    }
  }, [value, min, reduced]);
  function onScroll(e) {
    if (disabled || Date.now() < progUntil.current) return;
    const v = Math.max(min, Math.min(max, min + Math.round(e.currentTarget.scrollTop / DRUM_ITEM)));
    if (v !== value) { userScroll.current = true; onChange(v); }
  }
  function onKeyDown(e) {
    if (disabled) return;
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
    let v = null;
    if (step) v = value + step;
    else if (e.key === "Home") v = min;
    else if (e.key === "End") v = max;
    if (v == null) return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, v)));
  }
  return (
    <div className={disabled ? "reps-drum-wrap off" : "reps-drum-wrap"}>
      <div
        ref={ref}
        className="reps-drum"
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}×`}
        aria-disabled={disabled || undefined}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        <div className="reps-drum-pad" aria-hidden="true" />
        {items.map((v) => (
          <div key={v} className={v === value ? "reps-drum-item on" : "reps-drum-item"} aria-hidden="true" onClick={() => !disabled && onChange(v)}>{v}×</div>
        ))}
        <div className="reps-drum-pad" aria-hidden="true" />
      </div>
    </div>
  );
}

function ListRow({ row, onPick, playing, label, near, className, ternary }) {
  return (
    <button type="button" className={className} onClick={() => onPick(row.id)} disabled={playing} style={{ width: "100%", marginTop: 4, background: "#14191c", border: "1px solid #2f383d", borderRadius: 12, padding: near ? "8px 8px 6px" : "6px 8px", color: "inherit", textAlign: "left", opacity: near ? 1 : 0.7 }}>
      {label ? <div style={{ color: TEAL, font: "400 14px Figtree, sans-serif", letterSpacing: "0.08em", padding: "0 4px 4px" }}>{label}</div> : null}
      <StickRow id={row.id} hands={row.hands} ternary={ternary} />
    </button>
  );
}

function useMq(q) {
  const [m, setM] = useState(() => !!window.matchMedia?.(q).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return undefined;
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [q]);
  return m;
}

export default function StickControl({ preset = null } = {}) {
  // Querformat: Übung links, Tempo-Bereich rechts; auf flachen Screens (Phone quer) kleineres Rad
  const lowWide = useMq("(orientation: landscape) and (max-height: 560px)");
  const dialSize = lowWide ? 92 : 124;
  // „Heute“-Karte: Startübung und Tempo vorgeben
  const [exId, setExId] = useState(() => (EXERCISES.some((e) => e.id === preset?.ex) ? preset.ex : 1));
  const [bpm, setBpm] = useState(preset?.bpm || 80);
  const [mode, setMode] = useState("practice");
  const [ternaryPick, setTernary] = useState(false);
  // ternär ist vorerst ausgeblendet: ohne Flag immer binär (auch Fokus-Mode, Auto-Weiter, Vorschau)
  const ternary = TERNARY_ENABLED && ternaryPick;
  const [reps, setReps] = useState(4);
  const [countBars, setCountBars] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [done, setDone] = useState("");
  const [repNow, setRepNow] = useState(0); // Fokus-Mode: laufende Wiederholung der aktuellen Übung (1…reps), 0 = aus
  const stopRef = useRef(null);
  const pinRef = useRef(null);
  const prevRef = useRef(null);
  const wrapRef = useRef(null);
  const bpmRef = useRef(preset?.bpm || 80);
  bpmRef.current = bpm;
  const ternaryRef = useRef(false);
  ternaryRef.current = ternary;
  const idx = Math.max(0, EXERCISES.findIndex((e) => e.id === exId));
  const ex = EXERCISES[idx] || EXERCISES[0];
  const previous = EXERCISES.slice(0, idx);
  const nextEx = EXERCISES[idx + 1] || null;
  // Alle weiteren Übungen nach „Als Nächstes“ (idx+2 … 24) – bleiben erreichbar, gedämpft/unscharf wie die früheren
  const later = EXERCISES.slice(idx + 2);
  const challenge = mode === "challenge";
  const lastRep = challenge && playing && repNow > 0 && repNow >= reps;

  useEffect(() => () => stopRef.current?.(), []);
  // Während der Click läuft: Liste fest (kein Wischen/Scrollen); Auto-Weiter scrollt weiter per scrollTo.
  useEffect(() => {
    if (!playing) return undefined;
    const de = document.documentElement;
    de.classList.add("sf-scroll-lock");
    const block = (e) => e.preventDefault();
    window.addEventListener("wheel", block, { passive: false });
    return () => { de.classList.remove("sf-scroll-lock"); window.removeEventListener("wheel", block); };
  }, [playing]);
  useEffect(() => {
    // Kopfzeile ist angeheftet (in der Home-Bildschirm-App unterhalb der Statusleiste): Höhe + Abstand oben
    const topEl = document.querySelector(".top");
    const head = topEl ? topEl.offsetHeight + (parseFloat(getComputedStyle(topEl).top) || 0) : 0;
    wrapRef.current?.style.setProperty("--stick-top", `${head}px`);
    const before = prevRef.current;
    if (before) window.scrollTo({ top: before.getBoundingClientRect().bottom + window.scrollY - head, behavior: "instant" });
  }, [exId]);
  useEffect(() => {
    // Frühere Übungen unter der Kopfzeile (Zurück, Titel) ausblenden; beim Hochscrollen erscheinen sie darunter wieder
    let raf = 0;
    const update = () => {
      raf = 0;
      const list = prevRef.current;
      if (!list) return;
      const topEl = document.querySelector(".top");
      const limit = topEl ? topEl.getBoundingClientRect().bottom : 0;
      for (const el of list.children) el.classList.toggle("stick-under", el.getBoundingClientRect().top < limit - 1);
    };
    const onMove = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => { window.removeEventListener("scroll", onMove); window.removeEventListener("resize", onMove); window.cancelAnimationFrame(raf); };
  }, [exId]);
  useEffect(() => {
    let t = 0;
    const onScroll = () => {
      wrapRef.current?.classList.add("stick-scrolling");
      window.clearTimeout(t);
      t = window.setTimeout(() => wrapRef.current?.classList.remove("stick-scrolling"), 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.clearTimeout(t); };
  }, []);

  function pick(id) {
    if (playing) return;
    setExId(id);
    setDone("");
  }
  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setCounting(false);
    setBeat(false);
    setPlayT(-1);
    setRepNow(0);
  }

  function start() {
    stop();
    setDone("");
    const ctx = unlockAudio();
    const isCh = mode === "challenge";
    const per = clamp(reps, 1, 20);
    const startId = EXERCISES[Math.max(0, idx)].id;
    const barsIn = clamp(countBars, 0, 2);
    const clicks = barsIn * Q_PER_BAR;
    let exIdx = Math.max(0, idx);
    // Raster zuerst festlegen, dann verwenden (vorher: ReferenceError beim Start)
    const is3 = ternaryRef.current;
    let notes = is3 ? triNotes(EXERCISES[exIdx].hands) : EXERCISES[exIdx].notes;
    let cancelled = false;
    let timer = 0;
    let evIndex = 0;
    let repsInEx = 0;
    let ended = false;
    const cellSteps = is3 ? TRI_LEN : CELL_STEPS;
    const stepSec = () => {
      const q = 60 / Math.max(30, bpmRef.current);
      return is3 ? q / 3 : q / 4;
    };
    let cycleStart = ctx.currentTime + 0.03;
    setPlaying(true);
    // Zähler erst umschalten, wenn die Wiederholung hörbar beginnt.
    const repAt = (n, when) => window.setTimeout(() => {
      if (cancelled) return;
      setRepNow(n);
      // Neuer Durchgang: Highlight zurücksetzen – sonst bliebe playT kurz auf dem letzten Buchstaben
      // und würde in der letzten Wiederholung fälschlich schon Gruppen morphen.
      if (n > 1) setPlayT(-1);
    }, Math.max(0, (when - ctx.currentTime) * 1000));
    const pulseAt = (when) => {
      const delay = Math.max(0, (when - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 80);
      }, delay);
    };
    if (clicks > 0) {
      setCounting(true);
      const q = 60 / Math.max(30, bpmRef.current);
      for (let i = 0; i < clicks; i++) {
        playClick(ctx, cycleStart + i * q, i % Q_PER_BAR === 0);
        pulseAt(cycleStart + i * q);
      }
      cycleStart += clicks * q;
      window.setTimeout(() => { if (!cancelled) setCounting(false); }, Math.max(0, (cycleStart - ctx.currentTime) * 1000));
    }
    if (isCh) repAt(1, cycleStart);
    const finishOk = () => {
      if (cancelled) return;
      cancelled = true;
      window.clearTimeout(timer);
      stopRef.current = null;
      setPlaying(false);
      setCounting(false);
      setBeat(false);
      setPlayT(-1);
      setRepNow(0);
      setDone(isCh ? String(startId) : "");
    };
    const schedule = () => {
      if (cancelled || ended) return;
      const now = ctx.currentTime;
      const horizon = now + 0.18;
      while (!cancelled && !ended) {
        const nt = notes[evIndex];
        if (!nt) break;
        const when = cycleStart + nt.t * stepSec();
        if (when >= horizon) break;
        if (when >= now - 0.02) {
          if (is3) {
            if (nt.t % 3 === 0) {
              playClick(ctx, when, nt.t % 12 === 0);
              pulseAt(when);
            } else {
              playClickLayer(ctx, when, "triplet", 0.7);
            }
          } else if (nt.t % 4 < 0.08) {
            playClick(ctx, when, nt.t % 16 < 0.08);
            pulseAt(when);
          }
          const delay = Math.max(0, (when - now) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(nt.t); }, delay);
        }
        evIndex += 1;
        if (evIndex >= notes.length) {
          repsInEx += 1;
          evIndex = 0;
          cycleStart += cellSteps * stepSec();
          if (isCh && repsInEx >= per) {
            const nextI = exIdx + 1;
            if (nextI >= EXERCISES.length) {
              // Ende erst melden, wenn der letzte Durchgang zu Ende gespielt ist.
              ended = true;
              window.setTimeout(finishOk, Math.max(0, (cycleStart - ctx.currentTime) * 1000));
              return;
            }
            exIdx = nextI;
            notes = is3 ? triNotes(EXERCISES[exIdx].hands) : EXERCISES[exIdx].notes;
            repsInEx = 0;
            // Anzeige erst wechseln, wenn die neue Übung hörbar beginnt (Scheduler plant ~180 ms voraus).
            const nextId = EXERCISES[exIdx].id;
            window.setTimeout(() => { if (!cancelled) { setExId(nextId); setPlayT(-1); } }, Math.max(0, (cycleStart - ctx.currentTime) * 1000));
            repAt(1, cycleStart);
          } else if (isCh) {
            repAt(repsInEx + 1, cycleStart);
          }
        }
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  return (
    <div className="rud-wrap stick-wrap" ref={wrapRef}>
      <style>{`
        .stick-wrap {
          --rud-foot: calc(84px + env(safe-area-inset-bottom, 0px));
          --rud-dock: 220px;
        }
        body:has(.stick-wrap), #root:has(.stick-wrap), .page:has(.stick-wrap) { overflow-x: clip; }
        /* Kopfzeile ist hier angeheftet – in der Home-Bildschirm-App unterhalb der Statusleiste (im Browser 0) */
        .page:has(.stick-wrap) .top { top: env(safe-area-inset-top, 0px); }
        .stick-far { filter: blur(1.8px); opacity: 0.45 !important; transition: filter 0.3s, opacity 0.3s; }
        /* Frühere (schon gespielte) Übungen: wie die fernen kommenden unscharf und gedämpft – die direkt davor etwas weniger, damit sie lesbar bleibt */
        .stick-prev { filter: blur(1.1px); opacity: 0.55 !important; transition: filter 0.3s, opacity 0.3s; }
        .stick-scrolling :is(.stick-far, .stick-prev) { filter: none; opacity: 0.7 !important; }
        /* Frühere Übungen, die unter die (durchsichtige) Kopfzeile geraten, ausblenden – sonst scheinen sie hinter „HAND CONTROL“ durch */
        .stick-wrap .stick-list > .stick-under { opacity: 0 !important; pointer-events: none; }
        .stick-wrap .stick-list > button { transition: filter 0.3s, opacity 0.2s; }
        /* Kommende Übungen nach der Vorschau: unter der angehefteten Bühne durchscrollen; Reserve (nur auf hohen Screens), damit #24 ganz unten zwischen Bühne und Dock sichtbar landet */
        .stick-later { position: relative; z-index: 1; margin-top: 4px; padding-bottom: clamp(0px, calc(100dvh - 700px), 88px); }
        .stick-later-kick { color: ${DIM}; font: 700 12px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 4px 0; }
        @media (prefers-reduced-motion: reduce) {
          .stick-far, .stick-prev { transition: none; }
          .stick-card text { transition: none !important; }
        }
        /* Bühne = angeheftete aktuelle Übung + Vorschau; so hoch, dass die frühere Liste darüber immer wegscrollen kann */
        .stick-stage { min-height: calc(100dvh - var(--stick-top, 0px) - var(--rud-foot) - var(--rud-dock) + 16px); }
        .stick-fade {
          pointer-events: none;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 15;
          height: calc(var(--rud-dock) + var(--rud-foot) + 88px);
          background: linear-gradient(to bottom, rgba(22,26,29,0) 0%, rgba(22,26,29,.35) 28%, rgba(22,26,29,.82) 62%, #161a1d 88%);
        }
        /* Aktuelle Übung: helle Karte (wie die Notenkarte), ohne türkisen Rand – überschreibt das dunkle Glas aus styles-glass.css.
           Beim Spielen kein Rahmen/Schleier: der gerade gespielte Buchstabe wird dunkler. */
        .stick-wrap .stick-card {
          background: ${LIST} !important;
          color: ${INK};
          border: 0 !important;
          border-radius: 16px;
          padding: 14px 10px 10px;
          box-shadow: 0 10px 28px rgba(0,0,0,.18) !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
          -apple-visual-effect: none !important;
        }
        /* Kein Scroll-Anchoring: sonst springt die Seite, wenn sich die Bühne in der Höhe ändert, und die angeheftete Karte rutscht über die Vorschau */
        html:has(.stick-wrap) { overflow-anchor: none; }
        /* Angeheftet: Werkzeuge, „Jetzt“-Zeile, aktuelle Übung und „Als Nächstes“ – alles in einem Block, damit sich nichts überlappt */
        .stick-pin {
          position: sticky;
          top: var(--stick-top, 0px);
          z-index: 16;
          background: #161a1d;
          padding: 8px 0 10px;
        }
        .stick-wrap .rud-metro {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 16;
          background: transparent;
          border: none;
          box-shadow: none;
        }
        .stick-wrap .rud-metro .metro-face,
        .stick-wrap .rud-metro .dock {
          position: static;
          margin: 0;
          border: 0;
          border-radius: 18px 18px 0 0;
          box-shadow: none;
          background: transparent;
          padding: 6px 12px var(--rud-foot);
          max-height: calc(var(--rud-dock) + var(--rud-foot));
          overflow: auto;
        }
        .stick-wrap .rud-nav {
          box-shadow: none;
          border-top: 1px solid #2f383d;
          background: transparent;
        }
        .stick-wrap .rud-half {
          min-height: 64px;
          gap: 8px;
          padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
        }
        .stick-wrap .rud-half-arrow { font-size: 36px; }
        .stick-wrap .rud-half-name { font-size: clamp(15px, 4.2vw, 20px); }
        /* Fokus-Ansicht (Standard): nächste Übung kompakt unter der großen aktuellen */
        /* „Jetzt 3/24“ und Count-in gehören zur aktuellen Übung: eigene Zeile über der hellen Karte, feste Höhe (nichts springt) */
        .stick-now { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-height: 18px; margin: 0 2px 4px; }
        .stick-now-kick { color: ${TEAL}; font: 800 12px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
        .stick-now-pos { color: ${DIM}; font: 700 12px Figtree, sans-serif; letter-spacing: 0.06em; margin-left: 6px; }
        .stick-now-count { color: ${TEAL}; font: 800 12px Figtree, sans-serif; letter-spacing: 0.12em; white-space: nowrap; }
        .stick-next {
          position: relative; margin-top: 8px; padding: 5px 12px 3px;
          background: #14191c; border: 1px solid #2f383d; border-radius: 12px;
        }
        .stick-next-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .stick-next-kick { color: ${TEAL}; font: 800 12px Figtree, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; }
        .stick-next-body {
          display: block; width: 100%; margin: 0; padding: 0; border: 0; background: none; color: inherit; opacity: 0.9;
        }
        .stick-next-body svg { display: block; }
        .stick-next-end { color: ${DIM}; font: 700 16px/24px Oswald, sans-serif; letter-spacing: 0.04em; padding: 0; text-align: right; }
        /* Fokus-Mode, letzte Wiederholung: Vorschau hervorheben (hell türkis), damit man sich auf die nächste Nummer einstellen kann */
        .stick-next { transition: background-color .3s ease-out, border-color .3s ease-out, box-shadow .3s ease-out, padding .3s ease-out; }
        .stick-next.soon { background: rgba(92,200,184,.2); border-color: ${TEAL}; box-shadow: 0 0 0 1px ${TEAL}, 0 0 18px rgba(92,200,184,.28); padding: 7px 12px 6px; }
        .stick-next.soon .stick-next-kick { font-size: 14px; }
        .stick-next.soon .stick-next-body { opacity: 1; }
        .stick-next.soon .stick-next-end { color: ${LIST}; }
        /* Wiederholungs-Zähler: groß und mittig direkt über dem Kreis (sitzt über dem festen Dock, der Kreis bewegt sich nicht) */
        .stick-reps { position: absolute; left: 0; right: 0; bottom: 100%; display: flex; flex-direction: column; align-items: center; pointer-events: none; padding-bottom: 2px; }
        .stick-reps-kick { color: ${DIM}; font: 800 11px Figtree, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; }
        .stick-reps-num { color: ${TEAL}; font: 700 34px/1 Oswald, sans-serif; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
        .stick-reps-num .of { color: ${DIM}; font-size: 24px; }
        /* Letzte Wiederholung: Ziffer hell mit türkisem Schein (passend zur türkisen Vorschau) – vorher dunkel auf dunkel, unsichtbar */
        .stick-reps.last .stick-reps-num { color: ${LIST}; text-shadow: 0 0 14px rgba(92,200,184,.75); }
        /* Clickwheel offen: Zähler rückt etwas nach oben, damit der Ring ihn nicht überdeckt */
        .stick-reps { transition: transform .24s cubic-bezier(.2,.8,.2,1); }
        body.metro-gesturing .stick-reps { transform: translateY(-16px); }
        @media (prefers-reduced-motion: reduce) { .stick-reps { transition: none; } }
        .stick-next-reps { display: none; color: ${TEAL}; font: 700 20px/1 Oswald, sans-serif; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
        .stick-next-reps .of { color: ${DIM}; font-size: 15px; }
        .stick-next.soon .stick-next-reps { color: ${LIST}; }
        @media (max-height: 720px) {
          /* wenig Höhe: Zähler wandert in den Kopf der Vorschau (sonst läge er über der Karte) */
          .stick-reps { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
          .stick-next-reps { display: inline; font-size: 18px; }
          .stick-next-reps .of { font-size: 14px; }
          /* Zähler mittig zur Kopfzeile statt an der Grundlinie – sonst stößt die große Ziffer an den oberen Kartenrand */
          .stick-next-head { align-items: center; min-height: 20px; }
        }
        /* Drehrädchen */
        .reps-field { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
        .reps-drum-wrap { position: relative; width: 52px; height: ${DRUM_ITEM * 3}px; flex: 0 0 auto; }
        .reps-drum-wrap::after { content: ""; position: absolute; left: 4px; right: 4px; top: ${DRUM_ITEM}px; height: ${DRUM_ITEM}px; border-top: 1px solid rgba(92,200,184,.45); border-bottom: 1px solid rgba(92,200,184,.45); pointer-events: none; }
        .reps-drum-wrap.off { opacity: .5; }
        .reps-drum-wrap.off .reps-drum { pointer-events: none; }
        .reps-drum {
          height: ${DRUM_ITEM * 3}px; overflow-y: auto; scroll-snap-type: y mandatory; overscroll-behavior: contain; touch-action: pan-y;
          scrollbar-width: none; background: #161a1d; border: 1px solid #2f383d; border-radius: 10px; outline: none;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,.2) 0, #000 38%, #000 62%, rgba(0,0,0,.2) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.2) 0, #000 38%, #000 62%, rgba(0,0,0,.2) 100%);
        }
        .reps-drum::-webkit-scrollbar { display: none; }
        .reps-drum:focus-visible { border-color: ${TEAL}; box-shadow: 0 0 0 2px rgba(92,200,184,.5); }
        .reps-drum-pad { height: ${DRUM_ITEM}px; }
        .reps-drum-item { height: ${DRUM_ITEM}px; line-height: ${DRUM_ITEM}px; text-align: center; scroll-snap-align: center; color: ${DIM}; font: 700 13px/${DRUM_ITEM}px Figtree, sans-serif; cursor: pointer; user-select: none; }
        .reps-drum-item.on { color: ${TEAL}; font-size: 17px; font-weight: 800; }
        @media (prefers-reduced-motion: reduce) { .stick-next { transition: none; } .reps-drum { scroll-behavior: auto; } }
        @media (prefers-reduced-motion: no-preference) {
          .stick-next-body, .stick-next-end { animation: stickNextIn .28s ease-out; }
          @keyframes stickNextIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 0.9; transform: none; } }
        }
        /* Querformat (Paket C): aufgeräumt in zwei Spalten – links Modus, aktuelle Übung und Vorschau,
           rechts Tempo (Rad mit ±5/±10) und Einzählen. Kopf in einer Zeile, nichts liegt übereinander. */
        @media (orientation: landscape) {
          .page.tool.view-stick .top { flex-direction: row; align-items: center; gap: 12px; padding: 2px 0 8px; }
          .page.tool.view-stick .top-row { display: contents; }
          .page.tool.view-stick .top-title { order: 1; flex: 1 1 auto; width: auto; min-width: 0; font-size: 22px; }
          .page.tool.view-stick .top-right { order: 2; }
          .page.tool .stick-wrap.rud-wrap {
            --rud-foot: calc(46px + env(safe-area-inset-bottom, 0px));
            padding-bottom: calc(var(--rud-foot) + 10px) !important;
            display: grid;
            grid-template-columns: minmax(0, 1fr) var(--hc-side, 330px);
            grid-template-rows: minmax(0, 1fr);
            column-gap: 14px;
            min-height: 0;
            overflow: hidden;
          }
          .stick-stage { display: contents; }
          .stick-list, .stick-done, .stick-fade { display: none !important; }
          .page.tool .stick-wrap .stick-pin {
            grid-column: 1;
            grid-row: 1;
            position: static;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0;
            background: transparent;
          }
          .stick-tools { flex: 0 0 auto; margin: 0 0 8px !important; }
          .stick-now { flex: 0 0 auto; margin: 0 2px 4px; }
          .page.tool .stick-wrap .stick-card {
            flex: 0 1 auto;
            min-height: 0;
            margin: 0;
            display: flex;
            align-items: center;
            padding: 8px 12px 6px !important;
          }
          .page.tool .stick-wrap .stick-card svg { width: 100%; height: auto; max-height: 100%; }
          .stick-next { flex: 0 0 auto; margin-top: 8px; }
          .page.tool .stick-wrap .rud-metro {
            position: relative;
            grid-column: 2;
            grid-row: 1;
            left: auto;
            right: auto;
            bottom: auto;
            z-index: 2;
            align-self: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: stretch;
            min-height: 0;
            max-height: none;
            border: 1px solid #2f383d;
            border-radius: 18px;
            background: #14191c;
          }
          .page.tool .stick-wrap .rud-metro .metro-face {
            padding: 10px 6px 12px;
            max-height: none;
            overflow: visible;
          }
          .page.tool .stick-wrap .rud-metro .dial-row { gap: 5px; }
          .page.tool .stick-wrap .rud-metro .dial-row .nudge-lg { width: 42px; height: 42px; font-size: 16px; }
          .page.tool .stick-wrap .rud-metro .dial-row .nudge-lg.nudge-10 { width: 38px; height: 38px; font-size: 14px; }
          .page.tool .stick-wrap .metro-face .seg { display: inline-flex; }
          .page.tool .stick-wrap .stick-count { margin-top: 20px !important; }
          .stick-wrap .rud-half {
            min-height: 44px;
            padding: 4px 12px calc(4px + env(safe-area-inset-bottom, 0px));
          }
          .stick-wrap .rud-half-name { font-size: 15px; }
        }
        @media (orientation: landscape) and (min-height: 561px) {
          .page.tool .stick-wrap.rud-wrap { --hc-side: 390px; }
        }
        @media (orientation: landscape) and (min-height: 721px) {
          /* Tablet quer: Wiederholungs-Zähler oben im Tempo-Bereich statt über dem Dock */
          .page.tool .stick-wrap .stick-reps { position: static; margin-bottom: 10px; }
        }
      `}</style>
      <div className="stick-list" ref={prevRef}>
        {previous.map((row, i) => {
          const last = i === previous.length - 1;
          return <ListRow key={row.id} row={row} onPick={pick} playing={playing} near={last} className={last ? "stick-prev" : "stick-far"} label={last ? t("DAVOR") : ""} ternary={ternary} />;
        })}
      </div>
      <div className="stick-stage">
      <div className="stick-pin" ref={pinRef}>
        <div className="stick-tools" style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 10px", flexWrap: "wrap" }}>
          <div className="seg" style={{ width: "fit-content" }}>
            <button type="button" className={mode === "practice" ? "on" : ""} onClick={() => !playing && setMode("practice")}>{t("Üben")}</button>
            <button type="button" className={mode === "challenge" ? "on" : ""} onClick={() => !playing && setMode("challenge")}>{t("Fokus-Mode")}</button>
          </div>
          {TERNARY_ENABLED ? (
            <div className="seg" style={{ width: "fit-content" }} role="group" aria-label={t("Raster")}>
              <button type="button" className={!ternary ? "on" : ""} onClick={() => !playing && setTernary(false)}>{t("binär")}</button>
              <button type="button" className={ternary ? "on" : ""} onClick={() => !playing && setTernary(true)}>{t("ternär")}</button>
            </div>
          ) : null}
          {challenge ? (
            <span className="reps-field">
              <span style={{ color: DIM, fontWeight: 700 }} aria-hidden="true" title={t("Wiederholungen")}>{t("Wdh.")}</span>
              <RepsDrum value={reps} onChange={(v) => setReps(clamp(v, 1, 20))} disabled={playing} label={t("Wiederholungen")} />
            </span>
          ) : null}
        </div>
        <div className="stick-now">
          <span className="stick-now-kick">{t("Jetzt")}<span className="stick-now-pos">{`${ex.id}/${EXERCISES.length}`}</span></span>
          {counting ? <span className="stick-now-count">COUNT-IN</span> : null}
        </div>
        <div className={playing ? "stick-card stick-run staff-card" : "stick-card staff-card"} >
          <Phrase
            id={ex.id}
            hands={ex.hands}
            nextHands={lastRep && nextEx ? nextEx.hands : null}
            swapGroups={(() => {
              // Nur Fokus-Mode + letzte Wdh.: Gruppen mit Index < floor(aktiveLetter / gSize) sind fertig → nächste Übung.
              if (!(lastRep && nextEx) || counting || playT < 0) return 0;
              const gSize = ternary ? 3 : 4;
              const letterI = ternary ? Math.round(playT) : Math.round(playT / 2);
              return Math.max(0, Math.floor(letterI / gSize));
            })()}
            playT={counting ? -1 : playT}
            ternary={ternary}
          />
        </div>
      <div className={lastRep ? "stick-next soon" : "stick-next"} data-next={nextEx ? nextEx.id : "end"} role="status" aria-live="polite" aria-atomic="true">
        <div className="stick-next-head">
          <span className="stick-next-kick">{nextEx ? t("Als Nächstes") : t("Letzte Übung")}</span>
          {challenge && playing && repNow > 0 ? <span className="stick-next-reps" aria-hidden="true">{repNow}<span className="of"> / {reps}</span></span> : null}
        </div>
        {nextEx ? (
          <button type="button" key={nextEx.id} className="stick-next-body" onClick={() => pick(nextEx.id)} disabled={playing} aria-label={t("Nummer {n}", { n: nextEx.id })}>
            <NextRow id={nextEx.id} hands={nextEx.hands} ternary={ternary} />
          </button>
        ) : (
          <div className="stick-next-end">{challenge ? t("danach fertig") : t("Nr. {n}", { n: ex.id })}</div>
        )}
      </div>
      </div>
      {later.length ? (
        <div className="stick-list stick-later" role="group" aria-label={t("Danach")}>
          <div className="stick-later-kick" aria-hidden="true">{t("Danach")}</div>
          {later.map((row) => <ListRow key={row.id} row={row} onPick={pick} playing={playing} className="stick-far" ternary={ternary} />)}
        </div>
      ) : null}
      </div>
      {done ? <p className="stick-done" style={{ color: TEAL, textAlign: "center", fontWeight: 700, margin: "12px 0 0" }}>{t("Bis Nr. 24 gehalten (ab Nr. {n}).", { n: done })}</p> : null}
      <div className="stick-fade" aria-hidden="true" />
        <div className="metro-shell rud-metro">
          {challenge && playing && repNow > 0 ? (
            <div className={lastRep ? "stick-reps last" : "stick-reps"} role="status" aria-label={t("Wiederholung {n} von {m}", { n: repNow, m: reps })}>
              <span className="stick-reps-kick" aria-hidden="true">{t("Wiederholung")}</span>
              <span className="stick-reps-num" aria-hidden="true">{repNow}<span className="of"> / {reps}</span></span>
            </div>
          ) : null}
          <div className="dock metro-face">
            <div className="dial-row">
              <Nudge by={-10} bpm={bpm} set={setBpm} min={30} max={200} />
              <Nudge by={-5} bpm={bpm} set={setBpm} min={30} max={200} />
              <MetronomeDial bpm={bpm} setBpm={(v) => setBpm(clamp(v, 30, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={dialSize} now subLabel={playing ? "Stop" : "Start"} wheel />
              <Nudge by={5} bpm={bpm} set={setBpm} min={30} max={200} />
              <Nudge by={10} bpm={bpm} set={setBpm} min={30} max={200} />
            </div>
            <div className="stick-count" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ color: DIM, fontWeight: 700, fontSize: 14 }}>{t("Einzählen")}</span>
              <div className="seg" style={{ width: "fit-content" }}>
                <button type="button" className={countBars === 0 ? "on" : ""} onClick={() => setCountBars(0)}>{t("Aus")}</button>
                <button type="button" className={countBars === 1 ? "on" : ""} onClick={() => setCountBars(1)}>{t("1 Takt")}</button>
                <button type="button" className={countBars === 2 ? "on" : ""} onClick={() => setCountBars(2)}>{t("2 Takte")}</button>
              </div>
            </div>
          </div>
        </div>
        <NavScrub
          items={EXERCISES.map((e) => ({ id: e.id, label: t("Nr. {n}", { n: e.id }), preview: e.hands.slice(0, 8) }))}
          index={idx}
          disabled={playing}
          onPick={pick}
        />
    </div>
  );
}
