import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playKit, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { t } from "../lib/i18n.js";

const TEAL = "#5cc8b8";
const DIM = "#8a969c";
const INK = "#161a1d";
const VOICES = [
  { id: "RD", label: "Ride" },
  { id: "HH", label: "Hi-Hat" },
  { id: "HO", label: "Offen" },
  { id: "SN", label: "Snare" },
  { id: "BD", label: "Bass" },
];
const STEPS = 16;

function emptyGrid(bars) {
  const grid = {};
  VOICES.forEach((v) => { grid[v.id] = Array(bars * STEPS).fill(false); });
  return grid;
}
function loadGrooves() {
  const raw = loadSession("grooves", { list: [] });
  return Array.isArray(raw.list) ? raw.list : [];
}
function saveGrooves(list) {
  saveSession("grooves", { list });
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function beamBox(x1, y, x2, thick) {
  const h = thick / 2;
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);
  return `M ${a} ${y - h} L ${b} ${y - h} L ${b} ${y + h} L ${a} ${y + h} Z`;
}

function EighthRest({ x, y }) {
  return <image href="/rest-eighth.png" x={x - 4} y={y - 10} width="8" height="15" />;
}
function SixteenthRest({ x, y }) {
  return <image href="/rest-16.png" x={x - 3} y={y - 8} width="5.4" height="12" />;
}

function GrooveStaff({ grid, bars, playStep }) {
  const steps = bars * STEPS;
  const x0 = 42;
  const gap = 16;
  const w = x0 + steps * gap + 18;
  const y = { RD: 18, HH: 30, HO: 30, SN: 52, BD: 82 };
  const up = { RD: 4, HH: 8, HO: 8, SN: 28 };
  const head = 12.4;
  const notes = [];
  VOICES.forEach((v) => grid[v.id].forEach((on, i) => { if (on) notes.push({ v: v.id, i }); }));
  const beams = [];
  const rests = [];
  const beamY = 6;
  const sx = (i) => x0 + i * gap + 3.4;
  for (let beat = 0; beat < bars * 4; beat++) {
    const group = notes.filter((n) => Math.floor(n.i / 4) === beat);
    const byVoice = {};
    group.forEach((n) => { (byVoice[n.v] ||= []).push(n); });
    const positions = new Set(group.map((n) => n.i % 4));
    if (!positions.has(0) && group.length) {
      const first = Math.min(...positions);
      if (first === 1 || first === 2) rests.push({ x: x0 + beat * 4 * gap, kind: first === 1 ? "16" : "8", dotted: false, down: false, beam: beamY, headY: 52 });
    }
    if (group.length >= 2 || rests.some((r) => Math.abs(r.x - (x0 + beat * 4 * gap)) < 1)) {
      const xs = group.map((n) => sx(n.i));
      const restX = x0 + beat * 4 * gap + 3.4;
      const left = rests.some((r) => Math.abs(r.x - (x0 + beat * 4 * gap)) < 1) ? Math.min(restX, ...xs) : Math.min(...xs);
      beams.push(beamBox(left, beamY, Math.max(...xs), 3.4));
      group.forEach((n) => {
        if (n.i % 4 !== 1 && n.i % 4 !== 3) return;
        beams.push(beamBox(sx(n.i) - 8, beamY + 3.8, sx(n.i), 3.2));
      });
    }
  }
  return (
    <svg viewBox={`0 4 ${w} 108`} width="100%" role="img" aria-label={t("Rhythmus")}>
      {[36, 44, 52, 60, 68].map((yy) => <line key={yy} x1="24" y1={yy} x2={w - 12} y2={yy} stroke="#c8d0d4" strokeWidth="1" />)}
      {Array.from({ length: bars + 1 }, (_, b) => (
        <line key={b} x1={x0 + b * STEPS * gap - 10} y1="32" x2={x0 + b * STEPS * gap - 10} y2="72" stroke="#161a1d" strokeWidth={b === 0 || b === bars ? 1.6 : 1} />
      ))}
      {beams.map((d, i) => <path key={i} d={d} fill="#161a1d" />)}
      {rests.map((r, i) => {
        const y = 52;
        const stemX = r.x + (r.down ? -3.4 : 3.4);
        return (
          <g key={`rest-${i}`}>
            {r.kind === "16" ? <SixteenthRest x={r.x} y={y} /> : <EighthRest x={r.x} y={y} />}
            {r.dotted ? <circle cx={r.x + 8} cy={y - 2} r="1.1" fill="#161a1d" /> : null}
          </g>
        );
      })}
      {notes.map((n) => {
        const x = x0 + n.i * gap;
        const ink = n.i === playStep ? TEAL : INK;
        const down = false;
        const stemX = x + 3.4;
        const beatNotes = notes.filter((o) => Math.floor(o.i / 4) === Math.floor(n.i / 4));
        const pos = n.i % 4;
        const led = beatNotes.filter((o) => o.v === n.v).length === 1 && (pos === 3 || pos === 1);
        const stemEnd = beamY;
        const alone = beatNotes.length < 2 && !led;
        const voiceNotes = beatNotes.filter((o) => o.v === n.v);
        const dotted = voiceNotes.length === 2 && voiceNotes.some((o) => o.i % 4 === 0) && voiceNotes.some((o) => o.i % 4 === 3) && pos === 0;
        return (
          <g key={n.v + n.i}>
            <line x1={stemX} y1={y[n.v]} x2={stemX} y2={stemEnd} stroke={ink} strokeWidth="1" />
            {alone && pos === 2 ? (
              <g transform={down ? `translate(${stemX} ${stemEnd}) scale(-1 -1)` : `translate(${stemX} ${stemEnd})`}>
                <image href="/flag-8.png" x="-0.6" y="0" width="8" height="12" />
              </g>
            ) : null}
            {alone && (pos === 1 || pos === 3) ? (
              <g transform={down ? `translate(${stemX} ${stemEnd}) scale(-1 -1)` : `translate(${stemX} ${stemEnd})`}>
                <image href="/flag-16.png" x="-0.6" y="0" width="8" height="14" />
              </g>
            ) : null}
            {n.v === "BD" || n.v === "SN" ? (
              <ellipse cx={x} cy={y[n.v]} rx="4.4" ry="3.1" fill={ink} transform={`rotate(-18 ${x} ${y[n.v]})`} />
            ) : (
              <g stroke={ink} fill="none" strokeWidth="1.5">
                {n.v === "HO" ? <circle cx={x} cy={y[n.v]} r="4.4" /> : null}
                <line x1={x - 3.2} y1={y[n.v] - 3.2} x2={x + 3.2} y2={y[n.v] + 3.2} />
                <line x1={x + 3.2} y1={y[n.v] - 3.2} x2={x - 3.2} y2={y[n.v] + 3.2} />
              </g>
            )}
            {dotted ? <circle cx={x + 8.8} cy={y[n.v] + 0.5} r="1.4" fill={ink} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

export default function RhythmArchive() {
  const [screen, setScreen] = useState("build");
  const [name, setName] = useState("");
  const [bars, setBars] = useState(1);
  const [bar, setBar] = useState(0);
  const [bpm, setBpm] = useState(90);
  const [grid, setGrid] = useState(() => emptyGrid(1));
  const [list, setList] = useState(loadGrooves);
  const [currentId, setCurrentId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playStep, setPlayStep] = useState(-1);
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  useEffect(() => () => stopRef.current?.(), []);

  function setBarsCount(n) {
    const next = clamp(n, 1, 4);
    setGrid((prev) => {
      const out = emptyGrid(next);
      VOICES.forEach((v) => {
        const src = prev[v.id] || [];
        for (let i = 0; i < Math.min(src.length, next * STEPS); i++) out[v.id][i] = src[i];
      });
      return out;
    });
    setBars(next);
    setBar((b) => Math.min(b, next - 1));
  }

  function toggle(voice, step) {
    setGrid((prev) => {
      const next = {};
      VOICES.forEach((v) => { next[v.id] = prev[v.id].slice(); });
      const on = !next[voice][step];
      next[voice][step] = on;
      if (on && voice === "HO") next.HH[step] = false;
      if (on && voice === "HH") next.HO[step] = false;
      return next;
    });
  }

  function fill(voice, kind) {
    setGrid((prev) => {
      const next = {};
      VOICES.forEach((v) => { next[v.id] = prev[v.id].slice(); });
      const start = bar * STEPS;
      for (let i = 0; i < STEPS; i++) {
        const step = start + i;
        let on = false;
        if (kind === "beat") on = i % 4 === 0;
        if (kind === "off") on = i % 4 === 2;
        if (kind === "ea") on = i % 2 === 1;
        next[voice][step] = on;
        if (on && voice === "HO") next.HH[step] = false;
        if (on && voice === "HH") next.HO[step] = false;
      }
      return next;
    });
  }

  function clearVoice(voice) {
    setGrid((prev) => {
      const next = {};
      VOICES.forEach((v) => { next[v.id] = prev[v.id].slice(); });
      for (let i = 0; i < STEPS; i++) next[voice][bar * STEPS + i] = false;
      return next;
    });
  }

  function copyBar() {
    if (bar === 0) return;
    setGrid((prev) => {
      const next = {};
      VOICES.forEach((v) => {
        next[v.id] = prev[v.id].slice();
        for (let i = 0; i < STEPS; i++) next[v.id][bar * STEPS + i] = prev[v.id][(bar - 1) * STEPS + i];
      });
      return next;
    });
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setBeat(false);
    setPlayStep(-1);
  }

  function start() {
    stop();
    const ctx = unlockAudio();
    const steps = bars * STEPS;
    const snapshot = grid;
    let cancelled = false;
    let timer = 0;
    setPlaying(true);
    const q = () => 60 / Math.max(30, bpmRef.current) / 4;
    let next = ctx.currentTime + 0.05;
    for (let i = 0; i < 4; i++) playClick(ctx, next + i * q(), i === 0);
    next += 4 * q();
    let step = 0;
    const schedule = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      if (now < next - 0.02) {
        timer = window.setTimeout(schedule, 25);
        return;
      }
      const horizon = now + 0.16;
      while (next < horizon && !cancelled) {
        const s = step % steps;
        VOICES.forEach((v) => { if (snapshot[v.id][s]) playKit(ctx, v.id, next, s % 4 === 0); });
        if (s % 4 === 0) playClick(ctx, next, s % 16 === 0);
        const when = next;
        const show = s;
        window.setTimeout(() => {
          if (cancelled) return;
          setPlayStep(show);
          setBeat(true);
          window.setTimeout(() => setBeat(false), 70);
        }, Math.max(0, (when - ctx.currentTime) * 1000));
        next += q();
        step += 1;
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  function save() {
    const title = name.trim() || t("Ohne Namen");
    const item = { id: currentId || String(Date.now()), name: title, bpm, bars, grid, at: Date.now() };
    const next = [item, ...list.filter((g) => g.id !== item.id)];
    setList(next);
    saveGrooves(next);
    setCurrentId(item.id);
    setName(title);
    setScreen("archive");
  }

  function openGroove(g) {
    stop();
    setCurrentId(g.id);
    setName(g.name);
    setBpm(g.bpm || 90);
    setBars(g.bars || 1);
    setBar(0);
    setGrid(g.grid || emptyGrid(g.bars || 1));
    setScreen("practice");
  }

  function remove(id) {
    const next = list.filter((g) => g.id !== id);
    setList(next);
    saveGrooves(next);
    if (currentId === id) setCurrentId("");
  }

  const heads = ["1", "e", "+", "a"];
  return (
    <div className="rhythm-arch">
      <div className="seg" style={{ width: "fit-content", marginBottom: 12 }}>
        <button type="button" className={screen === "build" ? "on" : ""} onClick={() => { stop(); setScreen("build"); }}>{t("Erstellen")}</button>
        <button type="button" className={screen === "practice" ? "on" : ""} onClick={() => setScreen("practice")}>{t("Üben")}</button>
        <button type="button" className={screen === "archive" ? "on" : ""} onClick={() => { stop(); setScreen("archive"); }}>{t("Archiv")}</button>
      </div>

      {screen !== "archive" ? (
        <div className="staff-card" style={{ marginBottom: 12 }}>
          <div className="staff-label">{name.trim() || t("Neuer Rhythmus")}</div>
          <GrooveStaff grid={grid} bars={bars} playStep={screen === "practice" ? playStep : -1} />
        </div>
      ) : null}

      {screen === "build" ? (
        <>
          <p className="rhythm-tip">{t("Zum Eintippen das Handy quer drehen. Die Felder werden größer.")}</p>
          <label className="rhythm-name">
            <span>{t("Name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("z. B. Rock-Grund")} />
          </label>
          <div className="seg" style={{ width: "fit-content", margin: "8px 0" }}>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => setBarsCount(n)}>{n}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button type="button" className="ghost" onClick={() => setBar((b) => Math.max(0, b - 1))} disabled={bar === 0}>{t("Takt")} {bar}</button>
            <span style={{ color: TEAL, fontWeight: 800 }}>{t("Takt")} {bar + 1}/{bars}</span>
            <button type="button" className="ghost" onClick={() => setBar((b) => Math.min(bars - 1, b + 1))} disabled={bar >= bars - 1}>{bar + 2}</button>
            <button type="button" className="ghost" onClick={copyBar} disabled={bar === 0}>{t("Takt kopieren")}</button>
          </div>
          <div className="rhythm-grid">
            <div className="rhythm-heads">
              <span />
              {heads.map((h, i) => <span key={h + i}>{h}</span>)}
            </div>
            {VOICES.map((v) => (
              <div key={v.id} className="rhythm-row">
                <div className="rhythm-voice">
                  <span>{t(v.label)}</span>
                  <span className="rhythm-helps">
                    <button type="button" onClick={() => fill(v.id, "beat")}>1</button>
                    <button type="button" onClick={() => fill(v.id, "off")}>+</button>
                    <button type="button" onClick={() => fill(v.id, "ea")}>e a</button>
                    <button type="button" onClick={() => clearVoice(v.id)}>{t("leer")}</button>
                  </span>
                </div>
                <div className="rhythm-steps">
                  {Array.from({ length: STEPS }, (_, i) => {
                    const step = bar * STEPS + i;
                    const on = grid[v.id][step];
                    return (
                      <button
                        key={step}
                        type="button"
                        className={on ? "on" : ""}
                        data-down={i % 4 === 0 ? "1" : "0"}
                        aria-label={`${t(v.label)} ${heads[i % 4]}`}
                        onClick={() => toggle(v.id, step)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="play" style={{ marginTop: 12 }} onClick={save}>{t("Speichern")}</button>
          <p className="rhythm-note">{t("Nur auf diesem Gerät gespeichert. Bei Browser- oder Gerätewechsel kann das Archiv verloren gehen.")}</p>
        </>
      ) : null}

      {screen === "practice" ? (
        <div className="dial-row" style={{ marginTop: 8 }}>
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 40, 200))} aria-label={t("5 BPM langsamer")}>−5</button>
          <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 40, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} wheel wheelK={1.36} />
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 40, 200))} aria-label={t("5 BPM schneller")}>+5</button>
        </div>
      ) : null}

      {screen === "archive" ? (
        <div>
          <p className="rhythm-note">{t("Nur auf diesem Gerät gespeichert. Bei Browser- oder Gerätewechsel kann das Archiv verloren gehen.")}</p>
          {list.length === 0 ? <p style={{ color: DIM }}>{t("Noch nichts gespeichert.")}</p> : null}
          {list.map((g) => (
            <div key={g.id} className="rhythm-item">
              <button type="button" onClick={() => openGroove(g)}>
                <strong>{g.name}</strong>
                <span>{g.bpm} BPM · {g.bars} {g.bars === 1 ? t("Takt") : t("Takte")}</span>
              </button>
              <button type="button" className="ghost" onClick={() => remove(g.id)} aria-label={t("Löschen")}>{t("Löschen")}</button>
            </div>
          ))}
        </div>
      ) : null}

      <style>{`
        .rhythm-name { display: flex; flex-direction: column; gap: 4px; color: ${DIM}; font-weight: 700; }
        .rhythm-name input { background: #101416; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 12px; font: 700 16px Figtree, sans-serif; }
        .rhythm-grid { display: flex; flex-direction: column; gap: 8px; }
        .rhythm-heads, .rhythm-steps { display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 3px; }
        .rhythm-heads { margin-left: 0; color: ${DIM}; font: 700 11px Figtree, sans-serif; text-align: center; }
        .rhythm-row { display: flex; flex-direction: column; gap: 4px; }
        .rhythm-voice { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: #f4f7f6; font-weight: 800; }
        .rhythm-helps { display: flex; gap: 4px; }
        .rhythm-helps button { min-width: 36px; min-height: 32px; border-radius: 8px; border: 1px solid #2f383d; background: transparent; color: ${TEAL}; font: 800 12px Figtree, sans-serif; }
        .rhythm-steps button { min-height: 36px; border-radius: 8px; border: 1px solid #2f383d; background: #101416; }
        .rhythm-steps button[data-down="1"] { border-color: #3d4b50; }
        .rhythm-steps button.on { background: ${TEAL}; border-color: ${TEAL}; }
        .rhythm-tip { color: ${TEAL}; font-size: 14px; font-weight: 700; margin: 0 0 8px; }
        @media (orientation: landscape) {
          .rhythm-tip { display: none; }
          .rhythm-steps button { min-height: 48px; }
          .rhythm-helps button { min-height: 40px; }
        }
        .rhythm-note { color: ${DIM}; font-size: 13px; line-height: 1.4; }
        .rhythm-item { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
        .rhythm-item > button:first-child { flex: 1; text-align: left; background: #1c2428; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 12px; padding: 12px; }
        .rhythm-item strong { display: block; font-size: 17px; }
        .rhythm-item span { color: ${TEAL}; font-size: 13px; }
      `}</style>
    </div>
  );
}
