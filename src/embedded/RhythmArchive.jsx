import { useEffect, useRef, useState } from "react";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playKit, unlockAudio } from "../lib/audio.js";
import { loadSession, saveSession } from "../lib/session.js";
import { t } from "../lib/i18n.js";
import { beatLayout } from "../lib/grooveNotation.js";

const TEAL = "#5cc8b8";
const DIM = "#8a969c";
const INK = "#161a1d";
const VOICES = [
  { id: "HH", label: "Hi-Hat" },
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

function QuarterRest({ x, y }) {
  // Viertelpause, mittig auf der Mittellinie (y), etwa drei Zwischenräume hoch.
  return (
    <path
      transform={`translate(${x} ${y - 12})`}
      d="M 1.6 0 L 6.4 6.2 C 4.3 8.3 4 10.6 6.6 14 L 6.1 14.5 C 3.9 13.2 1.6 14 3.6 18.8 L 3 19.2 C -0.4 16 0.2 12.2 4 13 L 0 7.4 C 2.3 5.6 2.8 3.3 1.1 0.4 Z"
      fill="#161a1d"
    />
  );
}

function GrooveStaff({ grid, bars, playStep }) {
  const steps = bars * STEPS;
  const x0 = 42;
  const gap = 16;
  const w = x0 + steps * gap + 18;
  // Linien 36, 44, 52, 60, 68 (von oben). Snare im Zwischenraum zwischen 2. und 3. Linie (48),
  // Bassdrum im untersten Zwischenraum (zwischen 60 und 68), Hi-Hat über der obersten Linie. Keine Hilfslinien nötig.
  const y = { RD: 18, HH: 30, HO: 30, SN: 48, BD: 64 };
  const notes = [];
  VOICES.forEach((v) => (grid[v.id] || []).forEach((on, i) => { if (on) notes.push({ v: v.id, i }); }));
  const beams = [];
  const rests = [];
  const wholeRests = [];
  const beamY = 6;
  const sx = (i) => x0 + i * gap + 3.4;
  const info = {}; // Schritt -> { flag, dot }
  for (let b = 0; b < bars; b++) {
    const inBar = notes.some((n) => Math.floor(n.i / STEPS) === b);
    // Leerer Takt: Ganztaktpause mittig, hängt an der zweiten Linie von oben.
    if (!inBar) { wholeRests.push(x0 + b * STEPS * gap + (STEPS * gap) / 2 - 10); continue; }
    for (let k = 0; k < 4; k++) {
      const beat = b * 4 + k;
      const base = beat * 4;
      const L = beatLayout(notes.filter((n) => Math.floor(n.i / 4) === beat).map((n) => n.i % 4));
      L.rests.forEach((r) => rests.push({ x: x0 + (base + r.pos) * gap, kind: r.kind }));
      L.notes.forEach((n) => { info[base + n.pos] = n; });
      if (L.beam) {
        const left = L.rests.length ? x0 + base * gap + 3.4 : sx(base + L.beam[0]);
        beams.push(beamBox(left, beamY, sx(base + L.beam[1]), 3.4));
        L.sub.forEach(([a, c]) => beams.push(beamBox(sx(base + a), beamY + 3.8, sx(base + c), 3.2)));
        L.stubs.forEach((st) => {
          const xs = sx(base + st.pos);
          beams.push(beamBox(xs, beamY + 3.8, xs + st.dir * 8, 3.2));
        });
      }
    }
  }
  return (
    <svg viewBox={`0 4 ${w} 76`} width="100%" role="img" aria-label={t("Rhythmus")}>
      {[36, 44, 52, 60, 68].map((yy) => <line key={yy} x1="24" y1={yy} x2={w - 12} y2={yy} stroke="#c8d0d4" strokeWidth="1" />)}
      {Array.from({ length: bars + 1 }, (_, b) => (
        <line key={b} x1={x0 + b * STEPS * gap - 10} y1="32" x2={x0 + b * STEPS * gap - 10} y2="72" stroke="#161a1d" strokeWidth={b === 0 || b === bars ? 1.6 : 1} />
      ))}
      {beams.map((d, i) => <path key={i} d={d} fill="#161a1d" />)}
      {wholeRests.map((cx, i) => <rect key={`whole-${i}`} className="whole-rest" x={cx - 6} y="44" width="12" height="4.6" fill="#161a1d" />)}
      {rests.map((r, i) => {
        const yy = 52;
        return (
          <g key={`rest-${i}`}>
            {r.kind === "4" ? <QuarterRest x={r.x} y={yy} /> : r.kind === "16" ? <SixteenthRest x={r.x} y={yy} /> : <EighthRest x={r.x} y={yy} />}
          </g>
        );
      })}
      {notes.map((n) => {
        const x = x0 + n.i * gap;
        const ink = n.i === playStep ? TEAL : INK;
        const stemX = x + 3.4;
        const stemEnd = beamY;
        const nf = info[n.i] || {};
        return (
          <g key={n.v + n.i}>
            <line x1={stemX} y1={y[n.v]} x2={stemX} y2={stemEnd} stroke={ink} strokeWidth="1" />
            {nf.flag === "8" ? (
              <g transform={`translate(${stemX} ${stemEnd})`}>
                <image href="/flag-8.png" x="-0.6" y="0" width="8" height="12" />
              </g>
            ) : null}
            {nf.flag === "16" ? (
              <g transform={`translate(${stemX} ${stemEnd})`}>
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
            {nf.dot ? <circle cx={x + 8.8} cy={y[n.v]} r="1.4" fill={ink} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

export default function RhythmArchive() {
  const [screen, setScreen] = useState("build");
  const [name, setName] = useState("");
  const [askName, setAskName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [bars, setBars] = useState(1);
  const [bar, setBar] = useState(0);
  const [activeVoice, setActiveVoice] = useState("");
  const [bpm, setBpm] = useState(90);
  const [grid, setGrid] = useState(() => emptyGrid(1));
  const [list, setList] = useState(loadGrooves);
  const [currentId, setCurrentId] = useState("");
  // true, wenn ein gespeicherter Groove bewusst über „Bearbeiten“ geöffnet ist.
  const [editing, setEditing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const [playStep, setPlayStep] = useState(-1);
  const [hear, setHear] = useState("kit");
  // Groove, dessen Löschen gerade bestätigt werden soll (sonst null).
  const [confirmDel, setConfirmDel] = useState(null);
  const dialRef = useRef(null);
  const hearRef = useRef(hear);
  hearRef.current = hear;
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  useEffect(() => () => stopRef.current?.(), []);

  // Üben: Start-Rad sichtbar machen, falls es auf kleinen Bildschirmen (quer) unter dem Rand liegt.
  useEffect(() => {
    if (screen !== "practice") return undefined;
    const id = window.requestAnimationFrame(() => {
      const el = dialRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight) el.scrollIntoView({ block: "end", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [screen]);

  // Bestätigung schließt mit Escape.
  useEffect(() => {
    if (!confirmDel) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setConfirmDel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDel]);

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
      VOICES.forEach((v) => { next[v.id] = (prev[v.id] || []).slice(); });
      next[voice][step] = !next[voice][step];
      return next;
    });
  }

  function fill(voice, kind) {
    setGrid((prev) => {
      const next = {};
      VOICES.forEach((v) => { next[v.id] = (prev[v.id] || Array(bars * STEPS).fill(false)).slice(); });
      const start = bar * STEPS;
      const hits = [];
      for (let i = 0; i < STEPS; i++) {
        const hit = kind === "beat" ? i % 4 === 0 : kind === "off" ? i % 4 === 2 : i % 2 === 1;
        if (hit) hits.push(start + i);
      }
      const turnOff = hits.every((step) => next[voice][step]);
      hits.forEach((step) => { next[voice][step] = !turnOff; });
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
        const mode = hearRef.current;
        if (mode !== "click") VOICES.forEach((v) => { if (snapshot[v.id] && snapshot[v.id][s]) playKit(ctx, v.id, next, s % 4 === 0); });
        if (mode !== "kit" && s % 4 === 0) playClick(ctx, next, s % 16 === 0);
        const when = next;
        const show = s;
        window.setTimeout(() => {
          if (cancelled) return;
          setPlayStep(show);
          if (show % 4 === 0) {
            setBeat(true);
            window.setTimeout(() => setBeat(false), 70);
          }
        }, Math.max(0, (when - ctx.currentTime) * 1000));
        next += q();
        step += 1;
      }
      timer = window.setTimeout(schedule, 25);
    };
    schedule();
    stopRef.current = () => { cancelled = true; window.clearTimeout(timer); };
  }

  function newId() {
    let id = String(Date.now());
    while (list.some((g) => g.id === id)) id = String(Number(id) + 1);
    return id;
  }

  // „Speichern als…“ legt immer einen neuen Groove an (neue id) – nie überschreiben.
  function saveAs(title) {
    const item = { id: newId(), name: title, bpm, bars, grid, at: Date.now() };
    const next = [item, ...list];
    setList(next);
    saveGrooves(next);
    setCurrentId(item.id);
    setEditing(false);
    setName(title);
    setAskName(false);
    setScreen("archive");
  }

  // „Speichern“ aktualisiert nur den gerade bearbeiteten Groove.
  function saveCurrent() {
    const old = list.find((g) => g.id === currentId);
    if (!old) return;
    const item = { ...old, bpm, bars, grid, at: Date.now() };
    const next = [item, ...list.filter((g) => g.id !== currentId)];
    setList(next);
    saveGrooves(next);
    setEditing(false);
    setAskName(false);
    setScreen("archive");
  }

  // Leerer neuer Groove: frisches Raster, keine id.
  function newGroove() {
    stop();
    setCurrentId("");
    setEditing(false);
    setName("");
    setDraftName("");
    setAskName(false);
    setBars(1);
    setBar(0);
    setActiveVoice("");
    setGrid(emptyGrid(1));
  }

  // Tab „Erstellen“: ein entworfener (ungespeicherter) Groove bleibt erhalten,
  // nach Speichern oder Öffnen eines gespeicherten Grooves beginnt ein neuer.
  function openBuild() {
    if (currentId && !editing) newGroove();
    else stop();
    setScreen("build");
  }

  function editCurrent() {
    stop();
    setEditing(true);
    setBar(0);
    setScreen("build");
  }

  function openGroove(g) {
    stop();
    setCurrentId(g.id);
    setEditing(false);
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
    if (currentId === id) { setCurrentId(""); setEditing(false); }
  }

  const heads = ["1", "e", "+", "a"];
  return (
    <div className="rhythm-arch">
      <div className={screen === "build" ? "rhythm-top build" : "rhythm-top"}>
        <div className="seg" style={{ width: "fit-content" }}>
          <button type="button" className={screen === "build" ? "on" : ""} onClick={openBuild}>{t("Erstellen")}</button>
          <button type="button" className={screen === "practice" ? "on" : ""} onClick={() => setScreen("practice")}>{t("Üben")}</button>
          <button type="button" className={screen === "archive" ? "on" : ""} onClick={() => { stop(); setScreen("archive"); }}>{t("Archiv")}</button>
        </div>
        {screen === "build" ? (
          <div className="seg rhythm-bars">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" className={bars === n ? "on" : ""} onClick={() => setBarsCount(n)}>{n}</button>
            ))}
          </div>
        ) : null}
      </div>

      {screen === "build" ? (
        <div className="staff-card rhythm-preview" style={{ marginBottom: 12 }}>
          <div className="staff-label">{name.trim() || t("Neuer Rhythmus")}</div>
          <GrooveStaff grid={grid} bars={bars} playStep={-1} />
        </div>
      ) : null}

      {screen === "build" ? (
        <>
          <div className="rhythm-tip">
            <img src="/rotate-device.png" alt="" width="186" height="200" />
            <p>{t("Zum Eintippen das Handy quer drehen. Hochkant siehst du nur den Rhythmus.")}</p>
          </div>
          <div className="rhythm-entry">
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            {/* Vor/zurück: Nummer nur, wenn es den Takt gibt – in Takt 1 kein „Takt 0“. */}
            <button type="button" className="ghost" onClick={() => setBar((b) => Math.max(0, b - 1))} disabled={bar === 0} aria-label={t("Vorheriger Takt")}>{bar > 0 ? `‹ ${t("Takt")} ${bar}` : "‹"}</button>
            <span style={{ color: TEAL, fontWeight: 800 }}>{t("Takt")} {bar + 1}/{bars}</span>
            <button type="button" className="ghost" onClick={() => setBar((b) => Math.min(bars - 1, b + 1))} disabled={bar >= bars - 1} aria-label={t("Nächster Takt")}>{bar < bars - 1 ? `${bar + 2} ›` : "›"}</button>
            <button type="button" className="ghost" onClick={copyBar} disabled={bar === 0}>{t("Takt kopieren")}</button>
            <span className="rhythm-tools">
              <button type="button" disabled={!activeVoice} onClick={() => fill(activeVoice, "beat")}>1</button>
              <button type="button" disabled={!activeVoice} onClick={() => fill(activeVoice, "off")}>+</button>
              <button type="button" disabled={!activeVoice} onClick={() => fill(activeVoice, "ea")}>e a</button>
              <button type="button" disabled={!activeVoice} onClick={() => clearVoice(activeVoice)}>{t("leer")}</button>
            </span>
          </div>
          <div className="rhythm-grid">
            <div className="rhythm-counts">
              <span />
              {Array.from({ length: STEPS }, (_, i) => {
                const label = i % 4 === 0 ? String(i / 4 + 1) : ["e", "+", "a"][i % 4 - 1];
                return <span key={i} className={i % 4 === 0 ? "on" : ""}>{label}</span>;
              })}
            </div>
            {VOICES.map((v) => (
              <div key={v.id} className="rhythm-row">
                <button type="button" className={activeVoice === v.id ? "rhythm-voice on" : "rhythm-voice"} onClick={() => setActiveVoice(v.id)}>{t(v.label)}</button>
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
                        onClick={() => { setActiveVoice(v.id); toggle(v.id, step); }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="rhythm-save-row">
            {currentId && editing ? (
              <button type="button" className="play" onClick={saveCurrent}>{t("Speichern")}</button>
            ) : null}
            <button type="button" className="play" onClick={() => { setDraftName(name); setAskName(true); }}>{t("Speichern als…")}</button>
          </div>
          {askName ? (
            <div className="rhythm-save">
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={t("z. B. Rock-Grund")} autoFocus />
              <button type="button" className="play" onClick={() => saveAs(draftName.trim() || t("Ohne Namen"))}>{t("Speichern")}</button>
              <button type="button" className="ghost" onClick={() => setAskName(false)}>{t("Abbrechen")}</button>
            </div>
          ) : null}
          <p className="rhythm-note">{t("Nur auf diesem Gerät gespeichert. Bei Browser- oder Gerätewechsel kann das Archiv verloren gehen.")}</p>
          </div>
        </>
      ) : null}

      {screen === "practice" ? (
        <div className="rhythm-practice">
        <div className="staff-card rp-staff">
          <div className="staff-label">{name.trim() || t("Neuer Rhythmus")}</div>
          <GrooveStaff grid={grid} bars={bars} playStep={playStep} />
        </div>
        <div className="rp-hear">
          <div className="seg" style={{ width: "fit-content" }}>
            <button type="button" className={hear === "click" ? "on" : ""} onClick={() => setHear("click")}>{t("Nur Click")}</button>
            <button type="button" className={hear === "kit" ? "on" : ""} onClick={() => setHear("kit")}>Playback</button>
            <button type="button" className={hear === "both" ? "on" : ""} onClick={() => setHear("both")}>{t("Beides")}</button>
          </div>
        </div>
        {currentId ? (
          <div className="rp-edit">
            <button type="button" className="ghost" onClick={editCurrent}>{t("Bearbeiten")}</button>
          </div>
        ) : null}
        <div className="dial-row rp-dial" ref={dialRef}>
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm - 5, 40, 200))} aria-label={t("5 BPM langsamer")}>−5</button>
          <MetronomeDial bpm={bpm} setBpm={(n) => setBpm(clamp(n, 40, 200))} beat={beat} active={playing} onToggle={() => (playing ? stop() : start())} size={124} now subLabel={playing ? "Stop" : "Start"} wheel wheelK={1.36} />
          <button type="button" className="nudge-lg" onClick={() => setBpm(clamp(bpm + 5, 40, 200))} aria-label={t("5 BPM schneller")}>+5</button>
        </div>
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
              <button type="button" className="ghost" onClick={() => setConfirmDel(g)} aria-label={t("Groove „{name}“ löschen", { name: g.name })}>{t("Löschen")}</button>
            </div>
          ))}
        </div>
      ) : null}

      {confirmDel ? (
        <div className="modal rhythm-confirm" style={{ zIndex: 45 }} onClick={() => setConfirmDel(null)}>
          <div className="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="rhythm-del-h" aria-describedby="rhythm-del-p" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" id="rhythm-del-h">{t("Groove löschen?")}</div>
            <p id="rhythm-del-p" className="rhythm-confirm-text">{t("„{name}“ wird von diesem Gerät gelöscht.", { name: confirmDel.name })}</p>
            <div className="rhythm-confirm-actions">
              <button type="button" className="ghost" autoFocus onClick={() => setConfirmDel(null)}>{t("Abbrechen")}</button>
              <button type="button" className="play" onClick={() => { remove(confirmDel.id); setConfirmDel(null); }}>{t("Löschen")}</button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .rhythm-confirm .modal-card { width: min(380px, 100%); }
        .rhythm-confirm-text { color: #f4f7f6; font-size: 16px; line-height: 1.4; margin: 4px 0 0; overflow-wrap: anywhere; }
        .rhythm-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
        .rhythm-practice .rp-staff { margin-bottom: 12px; }
        .rp-hear, .rp-edit { display: flex; justify-content: center; margin: 8px 0; }
        .rp-dial { margin-top: 8px; }
        .rhythm-name { display: flex; flex-direction: column; gap: 4px; color: ${DIM}; font-weight: 700; }
        .rhythm-name input { background: #101416; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 12px; font: 700 16px Figtree, sans-serif; }
        .rhythm-grid { display: flex; flex-direction: column; gap: 8px; }
        .rhythm-steps { display: grid; grid-template-columns: repeat(16, minmax(0, 1fr)); gap: 3px; }
        .rhythm-counts { display: grid; grid-template-columns: 92px repeat(16, minmax(0, 1fr)); gap: 3px; color: ${DIM}; font: 700 11px Figtree, sans-serif; text-align: center; align-items: end; }
        .rhythm-counts .on { color: ${TEAL}; }
        .rhythm-row { display: grid; grid-template-columns: 92px 1fr; align-items: center; gap: 6px; }
        .rhythm-voice { border: 0; background: transparent; color: #f4f7f6; font: 800 16px Figtree, sans-serif; text-align: left; padding: 0; }
        .rhythm-voice.on { color: ${TEAL}; }
        .rhythm-tools { margin-left: auto; display: flex; gap: 4px; }
        .rhythm-tools button { min-width: 36px; min-height: 32px; border-radius: 8px; border: 1px solid #2f383d; background: transparent; color: ${TEAL}; font: 800 12px Figtree, sans-serif; }
        .rhythm-tools button:disabled { opacity: 0.35; }
        .rhythm-helps { display: flex; gap: 4px; }
        .rhythm-helps button { min-width: 36px; min-height: 32px; border-radius: 8px; border: 1px solid #2f383d; background: transparent; color: ${TEAL}; font: 800 12px Figtree, sans-serif; }
        .rhythm-steps button { min-height: 36px; border-radius: 8px; border: 1px solid #2f383d; background: #101416; }
        .rhythm-steps button[data-down="1"] { border-color: #3d4b50; }
        .rhythm-steps button.on { background: ${TEAL}; border-color: ${TEAL}; }
        .rhythm-tip { color: ${TEAL}; font-size: 16px; font-weight: 700; margin: 12px auto; text-align: center; min-height: 46vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .rhythm-tip img { display: block; margin: 0 auto 12px; width: min(186px, 48vw); height: auto; }
        .rhythm-tip p { margin: 0; max-width: 18rem; }
        .rhythm-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
        .rhythm-bars { display: none; }
        .rhythm-entry { display: none; }
        .rhythm-save-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
        .rhythm-save { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
        .rhythm-save input { flex: 1; min-height: 40px; border-radius: 10px; border: 1px solid #2f383d; background: #101416; color: #f4f7f6; padding: 0 10px; }
        @media (orientation: landscape) {
          /* Taktwahl im normalen Fluss der Kopfzeile, links neben der Vorschau – nie über den Feldern. */
          .rhythm-top.build { padding-right: 34%; }
          .rhythm-bars { display: flex; margin-left: auto; }
          .rhythm-tip { display: none; }
          .rhythm-entry { display: block; padding-right: 34%; }
          .rhythm-preview { position: fixed; top: 108px; right: 10px; width: 32%; margin: 0; z-index: 4; }
          .rhythm-steps button { min-height: 34px; }
          .rhythm-counts { font-size: 10px; }
          .rhythm-grid { gap: 6px; }
          .rhythm-counts { grid-template-columns: 108px repeat(16, minmax(0, 1fr)); }
          .rhythm-row { grid-template-columns: 108px 1fr; }
          .rhythm-voice { flex-direction: column; align-items: flex-start; gap: 4px; }
          .rhythm-steps button { min-height: 44px; }
          .rhythm-helps button { min-height: 28px; min-width: 28px; padding: 0 4px; }
          /* Üben quer: Noten links, Start-Rad rechts daneben – ohne Scrollen erreichbar. */
          .rhythm-practice { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "staff hear" "staff dial" "edit dial"; column-gap: 16px; row-gap: 8px; align-items: start; }
          .rhythm-practice .rp-staff { grid-area: staff; margin-bottom: 0; }
          .rp-hear { grid-area: hear; margin: 0; }
          .rp-edit { grid-area: edit; margin: 0; justify-content: flex-start; }
          .rp-dial { grid-area: dial; margin-top: 0; }
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
