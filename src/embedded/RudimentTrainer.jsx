import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, meterPulse, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, sheetHtml, tilesToPng } from "../lib/print.js";
import { loadSession, saveSession } from "../lib/session.js";
import { NavScrub } from "../lib/NavScrub.jsx";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";
const HEAR_OK = ["snare", "hands", "click"];
const GOALS = [
  { id: "free", label: "Frei" },
  { id: "l8", loops: 8, label: "8 Loops" },
  { id: "l16", loops: 16, label: "16 Loops" },
  { id: "t120", sec: 120, label: "2 Min" },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function readRudimentSession() {
  const s = loadSession("rudiments", {});
  const sel = RUDIMENTS.some((r) => r.id === Number(s.sel)) ? Number(s.sel) : 16;
  const goalId = GOALS.some((g) => g.id === s.goalId) ? s.goalId : "free";
  return {
    sel,
    bpm: clamp(Number(s.bpm) || 80, 30, 260),
    hear: HEAR_OK.includes(s.hear) ? s.hear : "snare",
    countIn: s.countIn !== false,
    rampOn: !!s.rampOn,
    rampBars: clamp(Number(s.rampBars) || 2, 1, 8),
    rampStep: clamp(Number(s.rampStep) || 2, 1, 12),
    rampCap: clamp(Number(s.rampCap) || 160, 40, 260),
    goalId,
  };
}

export default function RudimentTrainer({ printOpen = false, onPrintClose, stage = false }) {
  const init = useRef(readRudimentSession()).current;
  const [sel, setSel] = useState(init.sel);
  const [bpm, setBpm] = useState(init.bpm);
  const [hear, setHear] = useState(init.hear);
  const [countIn, setCountIn] = useState(init.countIn);
  const [rampOn, setRampOn] = useState(init.rampOn);
  const [rampBars, setRampBars] = useState(init.rampBars);
  const [rampStep, setRampStep] = useState(init.rampStep);
  const [rampCap, setRampCap] = useState(init.rampCap);
  const [goalId, setGoalId] = useState(init.goalId);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [loopN, setLoopN] = useState(0);
  const [leftSec, setLeftSec] = useState(0);
  const [done, setDone] = useState("");
  const [picked, setPicked] = useState([init.sel]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rampRef = useRef(rampOn); rampRef.current = rampOn;
  const rampBarsRef = useRef(rampBars); rampBarsRef.current = rampBars;
  const rampStepRef = useRef(rampStep); rampStepRef.current = rampStep;
  const rampCapRef = useRef(rampCap); rampCapRef.current = rampCap;
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[0];
  const idx = Math.max(0, RUDIMENTS.findIndex((r) => r.id === rud.id));
  const meterNow = meterPulse(rud.time);
  const beatsInBar = Math.max(1, Math.round(meterNow.bar / meterNow.pulse));
  const beatN = playT < 0 ? -1 : Math.floor((playT + 1e-4) / meterNow.pulse) % beatsInBar;
  const goal = GOALS.find((g) => g.id === goalId) || GOALS[0];

  useEffect(() => {
    saveSession("rudiments", { sel, bpm, hear, countIn, rampOn, rampBars, rampStep, rampCap, goalId });
  }, [sel, bpm, hear, countIn, rampOn, rampBars, rampStep, rampCap, goalId]);
  useEffect(() => {
    if (printOpen) {
      setNote("");
      setPicked((p) => (p.includes(sel) ? p : [...p, sel]));
    }
  }, [printOpen, sel]);
  useEffect(() => () => stopRef.current?.(), []);

  function closePrint() {
    setNote("");
    setBusy(false);
    onPrintClose?.();
  }

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
    setDone("");
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
    setDone("");
    const ctx = unlockAudio();
    const notes = (rud.notes || []).filter((nt) => !nt.rest);
    const steps = rudimentDuration(rud);
    const meter = meterPulse(rud.time);
    const barsEach = Math.max(1, rud.bars || 1);
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
    if (countIn) {
      const pulseSec = stepSec() * meter.pulse;
      for (let i = 0; i < 4; i++) {
        playClick(ctx, cycleStart + i * pulseSec, i === 0);
        pulse(cycleStart + i * pulseSec, ctx);
      }
      cycleStart += 4 * pulseSec;
    }
    let barsAcc = 0;
    const bump = () => setBpm((p) => Math.min(rampCapRef.current, 260, p + rampStepRef.current));
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
      setDone("Ziel gehalten — weiter so.");
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
          barsAcc += barsEach;
          loopsDone += 1;
          setLoopN(loopsDone);
          if (targetLoops && loopsDone > targetLoops) {
            finishOk();
            return;
          }
          if (rampRef.current && barsAcc >= rampBarsRef.current) {
            barsAcc = 0;
            bump();
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

  function gatherTiles() {
    const host = document.getElementById("print-host");
    if (!host) return [];
    return RUDIMENTS.filter((r) => picked.includes(r.id))
      .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
      .filter((x) => x.svg);
  }

  async function savePng(tiles, reason) {
    const canvas = await tilesToPng(tiles, 2, perPage);
    const result = await deliverPng(canvas, "spielfertig-rudiments.png", "save");
    if (result) setNote(reason || "PNG gespeichert.");
    else setNote("Speichern abgebrochen.");
    return result;
  }

  async function doPrint(mode) {
    setBusy(true);
    setNote(mode === "print" ? "Blatt wird erzeugt…" : "");
    const tiles = gatherTiles();
    if (!tiles.length) {
      setNote("Keine Notation zum Export.");
      setBusy(false);
      return;
    }
    try {
      if (mode === "print") {
        if (isStandalone()) {
          await savePng(tiles, "Home-Bildschirm: Blatt als PNG gespeichert (kein System-Druck). Teilen geht auch.");
        } else {
          const printed = printElement(sheetHtml(tiles, perPage));
          if (printed) setNote("Druckdialog geöffnet. Fertig? Oben auf Zurück.");
          else await savePng(tiles, "Druck nicht möglich — Blatt als PNG gespeichert.");
        }
      } else if (mode === "share") {
        const canvas = await tilesToPng(tiles, 2, perPage);
        const result = await deliverPng(canvas, "spielfertig-rudiments.png", "share");
        if (result === "share") setNote("Geteilt.");
        else if (result === "save") setNote("Teilen nicht verfügbar — PNG gespeichert.");
        else setNote("Abgebrochen.");
      } else {
        await savePng(tiles);
      }
    } catch {
      setNote("Konnte das Blatt nicht erzeugen. Bitte erneut versuchen.");
    }
    setBusy(false);
  }

  const field = {
    width: 46,
    margin: "0 6px",
    background: INK,
    border: "1px solid " + LINE,
    color: "#5cc8b8",
    borderRadius: 5,
    padding: "3px 5px",
    textAlign: "center",
    fontWeight: 700,
  };

  return (
    <div className="rud-wrap">
      <div className="staff-card">
        <div className="rud-title">
          <div className="rud-title-kicker">Rudiment wählen</div>
          <div className="rud-title-row">
            <div className="rud-title-name">{rud.label}</div>
            <span className="rud-title-caret" aria-hidden="true">▾</span>
          </div>
          <select className="rud-title-select" value={rud.id} onChange={(e) => pickRud(Number(e.target.value))} aria-label="Rudiment wählen">
            {CATS.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {RUDIMENTS.filter((r) => r.cat === c.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <RudimentStaff rud={rud} playingT={playT} svgId="rud-live" />
        <div className="beat-track" aria-live="polite">
          <div className="beat-cells">
            {Array.from({ length: beatsInBar }, (_, i) => (
              <span key={i} className={playing && beatN === i ? "on" : ""}>{i + 1}</span>
            ))}
          </div>
          <div className="beat-loop">
            {playing && goal.sec ? fmt(leftSec) : playing ? `Loop ${loopN}${goal.loops ? "/" + goal.loops : ""}` : "Loop —"}
          </div>
        </div>
        {done ? <div className="goal-done">{done}</div> : null}
        {stage ? null : <div className="staff-hint">Aktueller Schlag oben markiert · R blau · L rot</div>}
      </div>
      {stage ? null : (
        <div className="seg" style={{ margin: "0 0 12px", width: "fit-content", maxWidth: "100%", flexWrap: "wrap" }}>
          {GOALS.map((g) => (
            <button key={g.id} type="button" className={goalId === g.id ? "on" : ""} onClick={() => !playing && setGoalId(g.id)}>{g.label}</button>
          ))}
        </div>
      )}
      <div className="metro-shell rud-metro" style={{ gridTemplateColumns: "1fr" }}>
        <div className="panel dock metro-face" style={{ borderRadius: "16px 16px 0 0" }}>
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(Math.max(30, bpm - 5))} aria-label="5 BPM langsamer">−5</button>
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={stage ? 136 : 96} now />
            <button type="button" className="nudge-lg" onClick={() => setBpm(Math.min(260, bpm + 5))} aria-label="5 BPM schneller">+5</button>
          </div>
          {stage ? null : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <div className="seg">
                  <button type="button" className={hear === "snare" ? "on" : ""} onClick={() => setHear("snare")}>Snare</button>
                  <button type="button" className={hear === "hands" ? "on" : ""} onClick={() => setHear("hands")}>L / R</button>
                  <button type="button" className={hear === "click" ? "on" : ""} onClick={() => setHear("click")}>Nur Click</button>
                </div>
              </div>
              <label className="check" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />4 Schläge einzählen
              </label>
              <label className="check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={rampOn} onChange={(e) => setRampOn(e.target.checked)} />Tempo steigern
              </label>
              {rampOn ? (
                <div style={{ fontSize: 12, color: DIM, marginTop: 8, lineHeight: 1.7 }}>
                  alle
                  <input type="number" min={1} max={8} value={rampBars} onChange={(e) => setRampBars(clamp(Number(e.target.value) || 2, 1, 8))} style={field} />
                  Takte um
                  <input type="number" min={1} max={12} value={rampStep} onChange={(e) => setRampStep(clamp(Number(e.target.value) || 2, 1, 12))} style={field} />
                  BPM · bis
                  <input type="number" min={40} max={260} value={rampCap} onChange={(e) => setRampCap(clamp(Number(e.target.value) || 160, 40, 260))} style={{ ...field, width: 56 }} />
                </div>
              ) : null}
            </>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : startLoop())}>{playing ? "Stop" : "Start"}</button>
          </div>
        </div>
      </div>
      <NavScrub
        items={RUDIMENTS.map((r) => ({ id: r.id, label: r.label, preview: r.label }))}
        index={idx}
        disabled={playing}
        onPick={pickRud}
      />
      {printOpen && (
        <div className="modal" style={{ top: 52, zIndex: 30, alignItems: "stretch" }}>
          <div className="modal-card" style={{ width: "100%", maxWidth: 560, maxHeight: "none", margin: "0 auto" }}>
            <div className="modal-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span>Rudiments drucken</span>
              <button type="button" className="play" onClick={closePrint} style={{ padding: "10px 16px", fontSize: 15 }}>Zurück</button>
            </div>
            <p style={{ color: DIM, fontSize: 15 }}>
              Auswahl und Layout. Oben oder hier Zurück — die App bleibt offen.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {[4, 6, 10, 12].map((n) => (
                <button key={n} type="button" className={perPage === n ? "chip on" : "chip"} onClick={() => setPerPage(n)}>{n} / Seite</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, margin: "0 0 8px" }}>
              <button type="button" className="ghost" onClick={() => setPicked(RUDIMENTS.map((r) => r.id))}>Alle</button>
              <button type="button" className="ghost" onClick={() => setPicked([sel])}>Nur aktuelles</button>
            </div>
            <div style={{ maxHeight: "36dvh", overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {RUDIMENTS.map((r) => (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={picked.includes(r.id)} onChange={() => setPicked((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])} />
                  {r.label}
                </label>
              ))}
            </div>
            <div id="print-host" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 720, overflow: "hidden", clipPath: "inset(100%)" }}>
              {RUDIMENTS.filter((r) => picked.includes(r.id)).map((r) => (
                <div key={r.id} data-print={r.id}><RudimentStaff rud={r} /></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="play" disabled={busy || !picked.length} onClick={() => doPrint("print")}>{busy ? "…" : isStandalone() ? "Speichern" : "Drucken"}</button>
              <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("share")}>Teilen</button>
              {!isStandalone() ? <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("save")}>PNG</button> : null}
              <button className="ghost" onClick={closePrint}>Schließen</button>
            </div>
            {note ? <p style={{ color: "#5cc8b8", fontSize: 15, margin: "10px 0 0" }}>{note}</p> : (
              <p style={{ color: DIM, fontSize: 14, margin: "10px 0 0" }}>
                {isStandalone() ? "Vom Home-Bildschirm speichert die App ein PNG — so bleibt kein Druckdialog offen." : "Drucken öffnet den Systemdialog. Danach oben Zurück."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
