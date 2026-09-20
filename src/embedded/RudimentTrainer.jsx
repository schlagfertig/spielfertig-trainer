import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, meterPulse, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playOrnament, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, sheetHtml, tilesToPng } from "../lib/print.js";
import { loadSession, saveSession } from "../lib/session.js";
import { ClickAdvanced } from "../lib/ClickAdvanced.jsx";
import { createMixClock, extrasOn, readMix, writeMix } from "../lib/clickMix.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";
const HEAR_OK = ["snare", "hands", "click"];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function readRudimentSession() {
  const s = loadSession("rudiments", {});
  const sel = RUDIMENTS.some((r) => r.id === Number(s.sel)) ? Number(s.sel) : 16;
  return {
    sel,
    bpm: clamp(Number(s.bpm) || 80, 30, 260),
    hear: HEAR_OK.includes(s.hear) ? s.hear : "snare",
    countIn: s.countIn !== false,
    rampOn: !!s.rampOn,
    rampBars: clamp(Number(s.rampBars) || 2, 1, 8),
    rampStep: clamp(Number(s.rampStep) || 2, 1, 12),
    rampCap: clamp(Number(s.rampCap) || 160, 40, 260),
  };
}

export default function RudimentTrainer({ printNonce, stage = false }) {
  const init = useRef(readRudimentSession()).current;
  const [sel, setSel] = useState(init.sel);
  const [bpm, setBpm] = useState(init.bpm);
  const [hear, setHear] = useState(init.hear);
  const [countIn, setCountIn] = useState(init.countIn);
  const [rampOn, setRampOn] = useState(init.rampOn);
  const [rampBars, setRampBars] = useState(init.rampBars);
  const [rampStep, setRampStep] = useState(init.rampStep);
  const [rampCap, setRampCap] = useState(init.rampCap);
  const [mix, setMix] = useState(() => readMix());
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [loopN, setLoopN] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);
  const [picked, setPicked] = useState([init.sel]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef(null);
  const lastPrint = useRef(printNonce || 0);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rampRef = useRef(rampOn); rampRef.current = rampOn;
  const rampBarsRef = useRef(rampBars); rampBarsRef.current = rampBars;
  const rampStepRef = useRef(rampStep); rampStepRef.current = rampStep;
  const rampCapRef = useRef(rampCap); rampCapRef.current = rampCap;
  const mixRef = useRef(mix); mixRef.current = mix;
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[0];
  const idx = Math.max(0, RUDIMENTS.findIndex((r) => r.id === rud.id));
  const prevRud = RUDIMENTS[idx - 1];
  const nextRud = RUDIMENTS[idx + 1];
  const meterNow = meterPulse(rud.time);
  const beatsInBar = Math.max(1, Math.round(meterNow.bar / meterNow.pulse));
  const beatN = playT < 0 ? -1 : Math.floor((playT + 1e-4) / meterNow.pulse) % beatsInBar;

  useEffect(() => {
    saveSession("rudiments", { sel, bpm, hear, countIn, rampOn, rampBars, rampStep, rampCap });
  }, [sel, bpm, hear, countIn, rampOn, rampBars, rampStep, rampCap]);
  useEffect(() => {
    if (!printNonce || printNonce === lastPrint.current) return;
    lastPrint.current = printNonce;
    setPrintOpen(true);
    setNote("");
    setPicked((p) => (p.includes(sel) ? p : [...p, sel]));
  }, [printNonce, sel]);
  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => {
    if (stage) setFlipped(false);
  }, [stage]);

  function closePrint() {
    setPrintOpen(false);
    setNote("");
    setBusy(false);
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
    setLoopN(0);
  }

  function pickRud(id) {
    if (id !== sel) stop();
    setSel(id);
  }

  function stepRud(dir) {
    const next = RUDIMENTS[idx + dir];
    if (next) pickRud(next.id);
  }

  function flip(on) {
    setFlipped(on);
    writeMix({ ...mixRef.current, advanced: on || extrasOn(mixRef.current) });
  }

  function pulse(when, ctx) {
    const delay = Math.max(0, (when - ctx.currentTime) * 1000);
    window.setTimeout(() => {
      setBeat(true);
      window.setTimeout(() => setBeat(false), 80);
    }, delay);
  }

  function startLoop() {
    const ctx = unlockAudio();
    const notes = (rud.notes || []).filter((nt) => !nt.rest);
    const steps = rudimentDuration(rud);
    const meter = meterPulse(rud.time);
    const barsEach = Math.max(1, rud.bars || 1);
    let cancelled = false;
    let timer = 0;
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
    const origin = cycleStart;
    const useMix = hearRef.current === "click" && mixRef.current.advanced;
    const clock = createMixClock();
    if (useMix) clock.reset(cycleStart);
    let barsAcc = 0;
    let rampAt = cycleStart + rampBarsRef.current * meter.bar * stepSec();
    const bump = () => setBpm((p) => Math.min(rampCapRef.current, 260, p + rampStepRef.current));
    setLoopN(1);
    const schedule = () => {
      if (cancelled) return;
      const horizon = ctx.currentTime + 0.16;
      if (hearRef.current === "click" && mixRef.current.advanced) {
        clock.fill(ctx, horizon, bpmRef.current, mixRef.current, (when) => {
          pulse(when, ctx);
          const elapsed = Math.max(0, when - origin);
          const t16 = (elapsed / stepSec()) % steps;
          window.setTimeout(() => { if (!cancelled) setPlayT(t16); }, Math.max(0, (when - ctx.currentTime) * 1000));
        });
        const period = Math.max(0.08, steps * stepSec());
        setLoopN(1 + Math.floor(Math.max(0, ctx.currentTime - origin) / period));
        if (rampRef.current && ctx.currentTime >= rampAt) {
          bump();
          rampAt += rampBarsRef.current * meter.bar * stepSec();
        }
      } else {
        while (!cancelled) {
          const ev = listEv[evIndex];
          const when = cycleStart + ev.t * stepSec();
          if (when >= horizon) break;
          if (when >= ctx.currentTime - 0.02) {
            if (ev.kind === "click") playClick(ctx, when, ev.down);
            else playOrnament(ctx, ev.nt, when, ev.kind === "stick" ? "stick" : "snare", stepSec());
            const delay = Math.max(0, (when - ctx.currentTime) * 1000);
            window.setTimeout(() => { if (!cancelled) setPlayT(ev.t); }, delay);
            if (ev.kind === "click" || Math.abs((ev.t || 0) % meter.pulse) < 0.08) pulse(when, ctx);
          }
          evIndex += 1;
          if (evIndex >= listEv.length) {
            evIndex = 0;
            cycleStart += steps * stepSec();
            listEv = events();
            barsAcc += barsEach;
            setLoopN((n) => n + 1);
            if (rampRef.current && barsAcc >= rampBarsRef.current) {
              barsAcc = 0;
              bump();
            }
          }
        }
      }
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
        const printed = printElement(sheetHtml(tiles, perPage));
        if (printed) {
          setNote("Druckdialog geöffnet. Falls nichts kommt: Popups erlauben oder Speichern nutzen.");
        } else {
          await savePng(tiles, "Popup blockiert — Blatt als PNG gespeichert.");
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
          <div className="rud-title-name">{rud.label}</div>
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
          <div className="beat-loop">{playing ? `Loop ${loopN}` : "Loop —"}</div>
        </div>
        {stage ? null : <div className="staff-hint">Aktueller Schlag oben markiert · R blau · L rot</div>}
      </div>
      <div className="metro-shell rud-metro">
        <div className="panel dock metro-face">
          {flipped ? (
            <div key="back" className="metro-swap">
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5cc8b8", marginBottom: 10 }}>Optionen</div>
              <label className="check"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />4 Schläge einzählen</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
                <span style={{ fontSize: 12, color: DIM }}>Hören</span>
                <div className="seg">
                  <button type="button" className={hear === "snare" ? "on" : ""} onClick={() => setHear("snare")}>Snare</button>
                  <button type="button" className={hear === "hands" ? "on" : ""} onClick={() => setHear("hands")}>L / R</button>
                  <button type="button" className={hear === "click" ? "on" : ""} onClick={() => setHear("click")}>Nur Click</button>
                </div>
              </div>
              <ClickAdvanced mix={mix} setMix={setMix} slidersOnly />
            </div>
          ) : (
            <div key="front" className="metro-swap">
              <div className="dial-row">
                <button type="button" className="nudge-lg" onClick={() => setBpm(Math.max(30, bpm - 5))} aria-label="5 BPM langsamer">−5</button>
                <MetronomeDial bpm={bpm} setBpm={setBpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={stage ? 136 : 96} now />
                <button type="button" className="nudge-lg" onClick={() => setBpm(Math.min(260, bpm + 5))} aria-label="5 BPM schneller">+5</button>
              </div>
              {stage ? null : (
                <>
                  <label className="check" style={{ marginTop: 10 }}>
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
          )}
        </div>
        {stage ? null : (
          <button type="button" className={flipped ? "metro-side on" : "metro-side"} onClick={() => flip(!flipped)}>
            {flipped ? "Metronom" : "Erweitert"}
          </button>
        )}
      </div>
      <div className="rud-nav">
        <button type="button" className="rud-half prev" disabled={!prevRud} onClick={() => stepRud(-1)} aria-label={prevRud ? "Vorheriges: " + prevRud.label : "Kein vorheriges Rudiment"}>
          <span className="rud-half-arrow">‹</span>
          <span className="rud-half-name">{prevRud ? prevRud.label : ""}</span>
        </button>
        <button type="button" className="rud-half next" disabled={!nextRud} onClick={() => stepRud(1)} aria-label={nextRud ? "Nächstes: " + nextRud.label : "Kein nächstes Rudiment"}>
          <span className="rud-half-name">{nextRud ? nextRud.label : ""}</span>
          <span className="rud-half-arrow">›</span>
        </button>
      </div>
      {printOpen && (
        <div className="modal" onClick={closePrint}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">Rudiments drucken</div>
            <p style={{ color: DIM, fontSize: 13 }}>Auswahl und Layout. Hochformat DIN A4.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {[4, 6, 10, 12].map((n) => (
                <button key={n} type="button" className={perPage === n ? "chip on" : "chip"} onClick={() => setPerPage(n)}>{n} / Seite</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, margin: "0 0 8px" }}>
              <button type="button" className="ghost" onClick={() => setPicked(RUDIMENTS.map((r) => r.id))}>Alle</button>
              <button type="button" className="ghost" onClick={() => setPicked([sel])}>Nur aktuelles</button>
            </div>
            <div style={{ maxHeight: 240, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
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
              <button className="play" disabled={busy || !picked.length} onClick={() => doPrint("print")}>{busy ? "…" : "Drucken"}</button>
              <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("share")}>Teilen</button>
              <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("save")}>Speichern</button>
              <button className="ghost" onClick={closePrint}>Schließen</button>
            </div>
            {note ? <p style={{ color: "#5cc8b8", fontSize: 12, margin: "10px 0 0" }}>{note}</p> : <p style={{ color: DIM, fontSize: 12, margin: "10px 0 0" }}>Drucken öffnet den Systemdialog. Blockiert das Handy das Popup, wird automatisch ein PNG gespeichert.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
