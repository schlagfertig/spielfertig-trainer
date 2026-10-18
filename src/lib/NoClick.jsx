// NoClick (Untermodus im Click-Trainer): X Takte mit Click, Y Takte ohne Click - du hältst das Tempo.
// Einstellen über drei Zahlen und einen Ring ums SpinDial; beim Üben zwei Balken mit Countdown.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MetronomeDial, Nudge } from "./metronome.jsx";
import { playClick, playClickLayer, unlockAudio } from "./audio.js";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";
import { usePracticeTrack } from "./PracticeDiary.jsx";
import { LIMITS, RING_HIDE_MS, announceLevel, barInfo, beatInfo, clampSetting, readSettings, ringStep } from "./noClick.js";

const TEAL = "#5cc8b8";
const FLASH_SEC = 0.13; // Blitz auf der 1 in der Lücke
const RING_FADE_MS = 260;
const ROWS = [
  { key: "click", name: "Click", sub: "Takte mit Click" },
  { key: "gap", name: "NoClick", sub: "Takte ohne Click" },
  { key: "beats", name: "Beats", sub: "pro Takt" },
];

function clampBpm(n) {
  return Math.max(30, Math.min(260, Math.round(Number(n) || 80)));
}

function readState() {
  const s = loadSession("noclick", {});
  return { ...readSettings(s), bpm: clampBpm(s.bpm ?? loadSession("click", {}).startBpm ?? 80) };
}

function wrap(a) {
  if (a > Math.PI) return a - 2 * Math.PI;
  if (a < -Math.PI) return a + 2 * Math.PI;
  return a;
}

// Zarter Ring konzentrisch ums SpinDial. Ring folgt dem Finger; die Zahl oben im Fenster gilt.
function Ring({ kind, value, onChange, center, inner, outer, shown, onTurn, dragging, onOutside }) {
  const [lo, hi] = LIMITS[kind];
  const count = hi - lo + 1;
  const stepDeg = 360 / count;
  const drag = useRef(null);
  const [live, setLive] = useState(0);
  const angle = (e) => Math.atan2(e.clientY - center.y, e.clientX - center.x);

  useEffect(() => { if (!shown) { drag.current = null; setLive(0); } }, [shown]);

  function down(e) {
    if (!shown) return;
    e.preventDefault();
    // Nur am Ring selbst drehen; Tipp in die Mitte oder daneben schließt ihn.
    const dist = Math.hypot(e.clientX - center.x, e.clientY - center.y);
    if (dist < inner - 12 || dist > outer + 16) { onOutside(e); return; }
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* egal */ }
    drag.current = { last: angle(e), acc: 0, v: value };
    dragging.current = true;
    onTurn();
  }
  function move(e) {
    const d = drag.current;
    if (!d || !shown) return; // ausgeblendet: nichts mehr verstellen, auch wenn der Finger noch liegt
    e.preventDefault();
    const a = angle(e);
    d.acc += wrap(a - d.last);
    d.last = a;
    const st = ringStep(kind);
    // Runden statt Abschneiden: ab halbem Weg zur Nachbarzahl gilt schon die neue Zahl (beim Drehen wie beim Loslassen).
    const steps = Math.round(d.acc / st);
    if (steps) {
      // Zahlen steigen im Uhrzeigersinn, der Ring folgt dem Finger: linksrum holt die größere Zahl nach oben.
      const nv = clampSetting(kind, d.v - steps);
      d.acc -= steps * st;
      if (nv !== d.v) { d.v = nv; onChange(nv); }
    }
    const atEnd = (d.v === hi && d.acc < 0) || (d.v === lo && d.acc > 0);
    setLive(atEnd ? 0 : d.acc);
    onTurn();
  }
  function up(e) {
    drag.current = null;
    dragging.current = false;
    setLive(0);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* egal */ }
  }

  const mid = (inner + outer) / 2;
  const box = outer * 2 + 8;
  const c = box / 2;
  const rot = -(value - lo) * stepDeg + (live * 180) / Math.PI;
  const nums = [];
  for (let k = lo; k <= hi; k++) {
    const deg = (k - lo) * stepDeg; // aufsteigend im Uhrzeigersinn
    const dist = Math.abs(((deg + rot + 540) % 360) - 180); // 180 = oben
    // Gut lesbar schon beim Öffnen: 28 px, fett, weiß bzw. sehr hell mit dunklem Rand, kaum abgeblendet.
    const near = dist < 60;
    const op = Math.max(0.82, 1 - dist / 400);
    const fill = near ? "#ffffff" : "#e6f7f4";
    nums.push(
      <g key={k} transform={`rotate(${deg} ${c} ${c})`} opacity={op}>
        <text x={c} y={c - mid} textAnchor="middle" dominantBaseline="central" fill={fill} stroke="#161a1d" strokeWidth="4.5" strokeLinejoin="round" paintOrder="stroke" fontSize="28" fontWeight="800">{k}</text>
        {/* 6 und 9 drehen mit - der Unterstrich zeigt, wo unten ist */}
        {k === 6 || k === 9 ? <line x1={c - 6} x2={c + 6} y1={c - mid + 14} y2={c - mid + 14} stroke={fill} strokeWidth="2.4" strokeLinecap="round" /> : null}
      </g>,
    );
  }
  return (
    <svg
      className={shown ? "nc-ring shown" : "nc-ring"}
      width={box}
      height={box}
      style={{ left: center.x - c, top: center.y - c }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label={t("Ring zum Einstellen")}
    >
      <defs>
        <radialGradient id="nc-ring-g" cx="50%" cy="50%" r="50%">
          <stop offset={`${(inner / (box / 2)) * 100}%`} stopColor="rgba(92,200,184,0.05)" />
          <stop offset={`${(outer / (box / 2)) * 100}%`} stopColor="rgba(92,200,184,0.16)" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={mid} fill="none" stroke="rgba(22,26,29,0.72)" strokeWidth={outer - inner} />
      <circle cx={c} cy={c} r={mid} fill="none" stroke="url(#nc-ring-g)" strokeWidth={outer - inner} />
      <circle cx={c} cy={c} r={outer} fill="none" stroke="rgba(92,200,184,0.38)" strokeWidth="1" />
      <circle cx={c} cy={c} r={inner} fill="none" stroke="rgba(92,200,184,0.28)" strokeWidth="1" />
      <g transform={`rotate(${rot} ${c} ${c})`} style={{ transition: live ? "none" : "transform .14s ease-out" }}>{nums}</g>
      <text x={c - 31} y={c - mid - 1} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontSize="13" opacity="0.7">‹</text>
      <text x={c + 31} y={c - mid - 1} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontSize="13" opacity="0.7">›</text>
      <rect x={c - 21} y={c - mid - 19} width="42" height="38" rx="11" fill="#161a1d" stroke={TEAL} strokeWidth="1.6" style={{ filter: "drop-shadow(0 0 8px rgba(92,200,184,.55))" }} />
      <text x={c} y={c - mid + 1} textAnchor="middle" dominantBaseline="central" fill="#f4f7f6" fontSize="21" fontWeight="800">{value}</text>
    </svg>
  );
}

export default function NoClick({ dialSize = 140 }) {
  const init = useRef(readState()).current;
  const [cfg, setCfg] = useState({ click: init.click, gap: init.gap, beats: init.beats });
  const [flash, setFlash] = useState(init.flash);
  const [bpm, setBpm] = useState(init.bpm);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [cur, setCur] = useState(null); // { bar, phase, left }
  const [editing, setEditing] = useState(null); // "click" | "gap" | "beats" | null
  const [ringKind, setRingKind] = useState(null); // bleibt beim Ausblenden kurz stehen
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [holdLock, setHoldLock] = useState(false); // Finger lag beim Ausblenden noch: Tempo bis zum Loslassen gesperrt
  usePracticeTrack({ ex: "click", playing, bpm });

  const bpmRef = useRef(bpm);
  const flashRef = useRef(flash);
  const cfgRef = useRef(cfg);
  bpmRef.current = bpm;
  flashRef.current = flash;
  cfgRef.current = cfg;
  const stopRef = useRef(null);
  const ctxRef = useRef(null);
  const timeline = useRef([]);
  const hideTimer = useRef(0);
  const fadeTimer = useRef(0);
  const ringDragging = useRef(false);
  const swallowClick = useRef(0); // Klick nach dem Schließen nicht noch einmal als Tipp auf eine Zahl werten
  const dockRef = useRef(null);
  const clickFill = useRef(null);
  const gapFill = useRef(null);
  const gapBar = useRef(null);

  useEffect(() => { saveSession("noclick", { ...cfg, flash, bpm }); }, [cfg, flash, bpm]);
  useEffect(() => () => { stopRef.current?.(); clearTimeout(hideTimer.current); clearTimeout(fadeTimer.current); }, []);
  useEffect(() => {
    if (!holdLock) return undefined;
    const release = () => setHoldLock(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => { window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); };
  }, [holdLock]);

  // Clip-Knopf (liegt über der Seite) dezent abdunkeln, solange der Ring offen ist
  useEffect(() => {
    document.body.classList.toggle("nc-ring-open", !!editing);
    return () => document.body.classList.remove("nc-ring-open");
  }, [editing]);

  function measure() {
    const b = dockRef.current?.querySelector(".clip-dial button");
    if (!b) return;
    const r = b.getBoundingClientRect();
    setCenter({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }
  useEffect(() => {
    if (!editing) return undefined;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [editing]);

  function armHide() {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(closeRing, RING_HIDE_MS);
  }
  function openRing(kind) {
    if (playing) return;
    clearTimeout(fadeTimer.current);
    setEditing(kind);
    setRingKind(kind);
    armHide();
  }
  function closeRing() {
    clearTimeout(hideTimer.current);
    if (ringDragging.current) setHoldLock(true);
    ringDragging.current = false;
    setEditing(null);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setRingKind(null), RING_FADE_MS);
  }
  function tapTile(kind) {
    if (performance.now() < swallowClick.current) return;
    if (editing === kind) closeRing();
    else openRing(kind);
  }
  function setValue(kind, v) {
    setCfg((c) => ({ ...c, [kind]: clampSetting(kind, v) }));
  }
  // Tipp neben den Ring schließt ihn sofort; Tipp auf eine andere Zahl wechselt den Ring.
  function onBackdrop(e) {
    e.preventDefault();
    swallowClick.current = performance.now() + 600;
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.dataset?.ncKey);
    if (hit && hit.dataset.ncKey !== editing) { openRing(hit.dataset.ncKey); return; }
    closeRing();
    setHoldLock(true); // Finger liegt noch: SpinDial erst nach dem Loslassen wieder frei
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setCur(null);
  }

  function start() {
    stop();
    if (editing) closeRing();
    const ctx = unlockAudio();
    ctxRef.current = ctx;
    const set = { ...cfgRef.current };
    let cancelled = false;
    let timer = 0;
    let next = ctx.currentTime + 0.05;
    let n = 0;
    timeline.current = [];
    const log = import.meta.env.DEV ? (window.__noclick = []) : null;
    const pulse = (when) => {
      window.setTimeout(() => {
        if (cancelled) return;
        setBeat(true);
        window.setTimeout(() => setBeat(false), 90);
      }, Math.max(0, (when - ctx.currentTime) * 1000));
    };
    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      while (next < now - 0.02) { next += 60 / bpmRef.current; n += 1; } // verpasst (Hintergrund): überspringen
      const horizon = now + 0.16;
      while (next < horizon) {
        const b = beatInfo(n, set);
        const beatSec = 60 / bpmRef.current;
        if (b.beat === 0) {
          timeline.current.push({ at: next, bar: b.bar, dur: beatSec * set.beats });
          if (timeline.current.length > 6) timeline.current.shift();
        }
        if (b.sound) {
          playClick(ctx, next, b.down);
          if (b.comeback) playClickLayer(ctx, next, "quarter", 0.9); // Akzent auf der ersten 1 nach der Lücke
          pulse(next);
        }
        log?.push({ at: next, n, bar: b.bar, beat: b.beat, phase: b.phase, sound: b.sound, accent: b.sound && b.down, comeback: b.comeback });
        next += beatSec;
        n += 1;
      }
      timer = window.setTimeout(schedule, 25);
    };
    setCur({ bar: 0, ...barInfo(0, set.click, set.gap) });
    setPlaying(true);
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  // Anzeige beim Üben: aus der Audio-Uhr, damit Balken, Blitz und Vorankündigung genau zum Click passen.
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let lastBar = -1;
    const set = { ...cfgRef.current };
    const frame = () => {
      const ctx = ctxRef.current;
      const now = ctx ? ctx.currentTime : 0;
      const tl = timeline.current;
      let e = null;
      for (let i = tl.length - 1; i >= 0; i--) if (tl[i].at <= now) { e = tl[i]; break; }
      const info = barInfo(e ? e.bar : 0, set.click, set.gap);
      const progress = e ? (now - e.at) / e.dur : 0;
      if (e && e.bar !== lastBar) { lastBar = e.bar; setCur({ bar: e.bar, ...info }); }
      const pre = e ? announceLevel(info, progress, flashRef.current) : 0;
      if (clickFill.current) clickFill.current.style.opacity = info.phase === "click" ? "1" : String(pre);
      if (gapFill.current) gapFill.current.style.opacity = info.phase === "gap" ? "1" : String(pre);
      const fl = !!e && flashRef.current && info.phase === "gap" && now - e.at < FLASH_SEC;
      gapBar.current?.classList.toggle("flash", fl);
      if (import.meta.env.DEV) window.__noclickView = { bar: info.bar, phase: info.phase, left: info.left, pre, flash: fl, progress };
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  function setDial(n) {
    if (editing || holdLock) return;
    const v = clampBpm(n);
    setBpm(v);
    bpmRef.current = v;
  }

  const locked = !!editing || holdLock;
  const inner = dialSize / 2 + 22;
  const outer = Math.min(inner + 56, (typeof window !== "undefined" ? window.innerWidth : 390) / 2 - 6);
  const phase = cur?.phase;

  return (
    <div className={playing ? "nc-wrap playing" : "nc-wrap"}>
      <div className="nc-head">
        <div className="nc-title">NoClick</div>
        <p className="nc-sub">{t("Click an, Click aus, du hältst das Tempo.")}</p>
      </div>
      <div className="nc-set" role="group" aria-label={t("NoClick-Einstellung")}>
        {ROWS.map((r) => {
          const on = editing === r.key;
          const live = playing && ((r.key === "click" && phase === "click") || (r.key === "gap" && phase === "gap"));
          return (
            <button
              key={r.key}
              type="button"
              data-nc-key={r.key}
              className={`nc-row${on ? " on" : ""}${live ? " live" : ""}`}
              aria-pressed={on}
              aria-disabled={playing}
              onClick={() => { if (!playing) tapTile(r.key); }}
              onKeyDown={(e) => {
                if (playing || !on) return;
                const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0;
                if (!dir) return;
                e.preventDefault();
                setValue(r.key, cfg[r.key] + dir);
                armHide();
              }}
              aria-label={t("{name}: {n}. Am Ring drehen zum Ändern.", { name: `${r.name} (${t(r.sub)})`, n: cfg[r.key] })}
            >
              <span className="nc-dot" aria-hidden="true" />
              <span className="nc-num">{cfg[r.key]}</span>
              <span className="nc-txt"><b>{r.name}</b><small>{t(r.sub)}</small></span>
            </button>
          );
        })}
      </div>
      {playing ? (
        <div className="nc-bars" aria-live="polite">
          <div className={phase === "click" ? "nc-col on" : "nc-col"}>
            <div className="nc-lab">Click</div>
            <div className="nc-bar"><span ref={clickFill} className="nc-fill" /></div>
            {phase === "click" ? <Countdown left={cur.left} /> : <div className="nc-cd-off">–</div>}
          </div>
          <div className={phase === "gap" ? "nc-col on" : "nc-col"}>
            <div className="nc-lab">NoClick</div>
            <div ref={gapBar} className="nc-bar"><span ref={gapFill} className="nc-fill" /></div>
            {phase === "gap" ? <Countdown left={cur.left} /> : <div className="nc-cd-off">–</div>}
          </div>
        </div>
      ) : (
        <>
          <p className={editing ? "nc-hint on" : "nc-hint"}>{editing ? t("Dreh am Ring. Das Tempo ist so lange gesperrt.") : t("Tipp auf eine Zahl, um sie zu ändern.")}</p>
          <div className="nc-flash">
            <span>{t("Blinken auf der 1")}: <b>{t(flash ? "an" : "aus")}</b></span>
            <button type="button" role="switch" aria-checked={flash} aria-label={t("Blinken auf der 1")} className={flash ? "dy-switch on" : "dy-switch"} onClick={() => setFlash(!flash)}>
              <span className="dy-knob" />
            </button>
          </div>
        </>
      )}
      <div ref={dockRef} className={`ct-stage click-dock nc-dock${locked ? " locked" : ""}${editing ? " ring-open" : ""}`} aria-disabled={locked}>
        <div className="dial-row">
          <Nudge by={-10} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={-5} bpm={bpm} set={setDial} min={30} max={260} />
          <MetronomeDial bpm={bpm} setBpm={setDial} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={dialSize} now subLabel={playing ? "Stop" : "Start"} wheel />
          <Nudge by={5} bpm={bpm} set={setDial} min={30} max={260} />
          <Nudge by={10} bpm={bpm} set={setDial} min={30} max={260} />
        </div>
        {/* gleiche Höhe unter dem Rad wie im Click-Trainer (Countdown + „Erweitert“) - das SpinDial steht in allen Modi gleich */}
        <div className="ct-below" aria-hidden="true" />
      </div>
      {ringKind && typeof document !== "undefined" ? createPortal(
        <>
          {editing ? <div className="nc-backdrop" onPointerDown={onBackdrop} aria-hidden="true" /> : null}
          <Ring kind={ringKind} value={cfg[ringKind]} onChange={(v) => setValue(ringKind, v)} center={center} inner={inner} outer={outer} shown={!!editing} onTurn={armHide} dragging={ringDragging} onOutside={onBackdrop} />
        </>,
        document.body,
      ) : null}
      <style>{`
        .nc-wrap { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
        .nc-head { text-align: center; margin: 2px 0 10px; }
        .nc-title { font: 800 13px/1 Figtree, sans-serif; letter-spacing: .22em; text-transform: uppercase; color: ${TEAL}; }
        .nc-sub { margin: 6px 0 0; color: #8a969c; font-size: 14px; }
        .nc-set { display: grid; gap: 8px; justify-content: center; }
        .nc-row { position: relative; display: flex; align-items: center; gap: 14px; min-height: 52px; min-width: 210px; padding: 0 8px 0 18px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; border-radius: 16px; }
        .nc-wrap.playing .nc-row { cursor: default; }
        .nc-num { flex: none; width: 50px; height: 50px; display: grid; place-items: center; border-radius: 14px; font: 800 24px/1 Figtree, sans-serif; color: #f4f7f6;
          background: linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 6px 16px rgba(0,0,0,.28); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: color .18s, border-color .18s, box-shadow .18s, background .18s; }
        .nc-row.on .nc-num { color: ${TEAL}; border-color: ${TEAL}; background: rgba(92,200,184,.12); box-shadow: inset 0 0 0 1px ${TEAL}, 0 0 18px rgba(92,200,184,.5); }
        .nc-txt b { display: block; font: 800 12px/1.1 Figtree, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: ${TEAL}; }
        .nc-row.on .nc-txt b { color: #f4f7f6; }
        .nc-txt small { display: block; margin-top: 3px; font-size: 12px; color: #8a969c; }
        .nc-dot { position: absolute; left: 4px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: ${TEAL}; box-shadow: 0 0 8px ${TEAL}; opacity: 0; transition: opacity .2s; }
        .nc-row.live .nc-dot { opacity: 1; }
        .nc-hint { margin: 12px 0 0; text-align: center; color: #c9d3d6; font-size: 13px; min-height: 18px; }
        .nc-hint.on { color: ${TEAL}; }
        .nc-flash { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; margin-top: 6px; color: #c9d3d6; font-size: 14px; }
        .nc-flash b { color: ${TEAL}; }
        .nc-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 4px 0; }
        .nc-col { text-align: center; }
        .nc-lab { font: 800 11px/1 Figtree, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #8a969c; margin-bottom: 7px; }
        .nc-col.on .nc-lab { color: ${TEAL}; }
        .nc-bar { position: relative; height: 12px; border-radius: 999px; background: rgba(92,200,184,.10); border: 1px solid rgba(92,200,184,.22); }
        .nc-fill { position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(90deg, #4fb8a8, #8fe6d8); opacity: 0; }
        .nc-col.on .nc-bar { box-shadow: 0 0 16px rgba(92,200,184,.55); }
        .nc-bar.flash .nc-fill { background: #f2fffc; }
        .nc-bar.flash { box-shadow: 0 0 22px 4px rgba(170,255,240,.75) !important; }
        .nc-cd { margin-top: 8px; color: #f4f7f6; }
        .nc-cd b { display: block; font: 700 46px/1 Oswald, "Bebas Neue", sans-serif; }
        .nc-cd small { display: block; margin-top: 2px; font: 700 11px/1 Figtree, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #8a969c; }
        .nc-cd-off { margin-top: 8px; font: 700 28px/46px Figtree, sans-serif; color: #4a585e; }
        .nc-dock { transition: opacity .22s ease, filter .22s ease; }
        .nc-dock.locked { opacity: .35; filter: saturate(.5); pointer-events: none; }
        /* Ring offen: ±5/±10 und Clip ausblenden (nicht nur abdunkeln) */
        .nc-dock .nudge-lg { transition: opacity .22s ease, visibility .22s; }
        .nc-dock.ring-open .nudge-lg { opacity: 0; visibility: hidden; pointer-events: none; }
        .clip-fab { transition: opacity .22s ease, visibility .22s; }
        body.nc-ring-open .clip-fab { opacity: 0; visibility: hidden; pointer-events: none; }
        .nc-backdrop { position: fixed; inset: 0; z-index: 60; touch-action: none; background: transparent; }
        .nc-ring { position: fixed; z-index: 61; touch-action: none; opacity: 0; pointer-events: none; transition: opacity ${RING_FADE_MS}ms ease; user-select: none; -webkit-user-select: none; }
        .nc-ring.shown { opacity: 1; pointer-events: auto; }
        .nc-ring text { font-family: Figtree, sans-serif; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) { .nc-ring, .nc-dock, .nc-num { transition: none; } }
      `}</style>
    </div>
  );
}

function Countdown({ left }) {
  return (
    <div className="nc-cd">
      <b>{left}</b>
      <small>{t(left === 1 ? "Takt übrig" : "Takte übrig")}</small>
    </div>
  );
}
