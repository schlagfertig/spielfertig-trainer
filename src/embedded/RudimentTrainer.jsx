import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playStick, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, sheetHtml, tilesToPng } from "../lib/print.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

export default function RudimentTrainer({ printNonce }) {
  const [sel, setSel] = useState(16);
  const [bpm, setBpm] = useState(80);
  const [hear, setHear] = useState("click");
  const [countIn, setCountIn] = useState(true);
  const [rampOn, setRampOn] = useState(false);
  const [rampStep, setRampStep] = useState(2);
  const [rampCap, setRampCap] = useState(160);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [beat, setBeat] = useState(false);
  const [more, setMore] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [picked, setPicked] = useState([16]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef(null);
  const lastPrint = useRef(printNonce || 0);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rampRef = useRef(rampOn); rampRef.current = rampOn;
  const rampStepRef = useRef(rampStep); rampStepRef.current = rampStep;
  const rampCapRef = useRef(rampCap); rampCapRef.current = rampCap;
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[0];
  const idx = Math.max(0, RUDIMENTS.findIndex((r) => r.id === rud.id));

  useEffect(() => {
    if (!printNonce || printNonce === lastPrint.current) return;
    lastPrint.current = printNonce;
    setPrintOpen(true);
    setNote("");
    setPicked((p) => (p.includes(sel) ? p : [...p, sel]));
  }, [printNonce, sel]);
  useEffect(() => () => stopRef.current?.(), []);

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
  }

  function pickRud(id) {
    if (id !== sel) stop();
    setSel(id);
  }

  function stepRud(dir) {
    const next = RUDIMENTS[idx + dir];
    if (next) pickRud(next.id);
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
    let cancelled = false;
    let timer = 0;
    const stepSec = () => 60 / Math.max(30, bpmRef.current) / 4;
    const events = () => {
      if (hearRef.current === "click") {
        const ev = [];
        for (let s = 0; s < steps; s += 4) ev.push({ t: s, kind: "click", down: s % 16 === 0 });
        return ev;
      }
      return notes.map((nt) => ({ t: nt.t, kind: "stick", nt }));
    };
    let listEv = events();
    if (!listEv.length) listEv = [{ t: 0, kind: "click", down: true }];
    let evIndex = 0;
    let cycleStart = ctx.currentTime + 0.02;
    if (countIn) {
      const beatSec = 60 / Math.max(30, bpmRef.current);
      for (let i = 0; i < 4; i++) {
        playClick(ctx, cycleStart + i * beatSec, i === 0);
        pulse(cycleStart + i * beatSec, ctx);
      }
      cycleStart += 4 * beatSec;
    }
    const schedule = () => {
      if (cancelled) return;
      const horizon = ctx.currentTime + 0.16;
      while (!cancelled) {
        const ev = listEv[evIndex];
        const when = cycleStart + ev.t * stepSec();
        if (when >= horizon) break;
        if (when >= ctx.currentTime - 0.02) {
          if (ev.kind === "click") playClick(ctx, when, ev.down);
          else playStick(ctx, ev.nt.hand, when, ev.nt.acc);
          const delay = Math.max(0, (when - ctx.currentTime) * 1000);
          window.setTimeout(() => { if (!cancelled) setPlayT(ev.t); }, delay);
          if (ev.kind === "click" || Math.abs((ev.t || 0) % 4) < 0.08) pulse(when, ctx);
        }
        evIndex += 1;
        if (evIndex >= listEv.length) {
          evIndex = 0;
          cycleStart += steps * stepSec();
          listEv = events();
          if (rampRef.current) setBpm((p) => Math.min(rampCapRef.current, 260, p + rampStepRef.current));
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

  return (
    <div>
      <div className="pick">
        <button type="button" className="ghost" disabled={idx <= 0} onClick={() => stepRud(-1)} aria-label="Vorheriges Rudiment">‹</button>
        <select className="rud-select" value={rud.id} onChange={(e) => pickRud(Number(e.target.value))} aria-label="Rudiment wählen">
          {CATS.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {RUDIMENTS.filter((r) => r.cat === c.id).map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className="ghost" disabled={idx >= RUDIMENTS.length - 1} onClick={() => stepRud(1)} aria-label="Nächstes Rudiment">›</button>
      </div>
      <div className="staff-card">
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} playingT={playT} svgId="rud-live" />
        <div className="staff-hint">R blau · L rot · Kreis drehen ändert das Tempo</div>
      </div>
      <div className="panel dock">
        <div className="dock-main">
          <div className="dial-row">
            <button type="button" className="nudge-lg" onClick={() => setBpm(Math.max(30, bpm - 5))} aria-label="5 BPM langsamer">−5</button>
            <MetronomeDial bpm={bpm} setBpm={setBpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={96} now />
            <button type="button" className="nudge-lg" onClick={() => setBpm(Math.min(260, bpm + 5))} aria-label="5 BPM schneller">+5</button>
          </div>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : startLoop())}>{playing ? "Stop" : "Start"}</button>
          <button className={more ? "more-btn on" : "more-btn"} onClick={() => setMore((v) => !v)}>{more ? "Weniger" : "Optionen"}</button>
        </div>
        <div className="dock-tempo">
          <TempoControl bpm={bpm} setBpm={setBpm} min={30} max={260} hideNudge />
        </div>
        {more && (
          <div className="more">
            <label className="check"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />4 Schläge einzählen</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: DIM }}>Hören</span>
              <div className="seg">
                <button className={hear === "hands" ? "on" : ""} onClick={() => setHear("hands")}>L / R</button>
                <button className={hear === "click" ? "on" : ""} onClick={() => setHear("click")}>Nur Click</button>
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={rampOn} onChange={(e) => setRampOn(e.target.checked)} />Tempo steigern</label>
            {rampOn && (
              <span style={{ fontSize: 12, color: DIM }}>
                +
                <input type="number" min={1} max={12} value={rampStep} onChange={(e) => setRampStep(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} style={{ width: 46, margin: "0 6px", background: INK, border: "1px solid " + LINE, color: "#fff", borderRadius: 5, padding: "3px 5px" }} />
                BPM je Durchlauf · bis
                <input type="number" min={40} max={260} value={rampCap} onChange={(e) => setRampCap(Math.max(40, Math.min(260, Number(e.target.value) || 160)))} style={{ width: 56, margin: "0 6px", background: INK, border: "1px solid " + LINE, color: "#fff", borderRadius: 5, padding: "3px 5px" }} />
              </span>
            )}
          </div>
        )}
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
