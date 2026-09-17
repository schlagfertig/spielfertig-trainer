import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { TempoControl } from "../lib/tempo.jsx";
import { MetronomeDial } from "../lib/metronome.jsx";
import { playClick, playStick, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, tilesToPng } from "../lib/print.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

export default function RudimentTrainer({ handwritten, printNonce }) {
  const [cat, setCat] = useState("diddle");
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
  const lastPrint = useRef(printNonce);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rampRef = useRef(rampOn); rampRef.current = rampOn;
  const rampStepRef = useRef(rampStep); rampStepRef.current = rampStep;
  const rampCapRef = useRef(rampCap); rampCapRef.current = rampCap;
  const list = RUDIMENTS.filter((r) => r.cat === cat);
  const rud = RUDIMENTS.find((r) => r.id === sel) || list[0] || RUDIMENTS[0];

  useEffect(() => {
    if (printNonce && printNonce !== lastPrint.current) setPrintOpen(true);
    lastPrint.current = printNonce;
  }, [printNonce]);
  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
    setBeat(false);
  }

  function pickCat(id) {
    stop();
    setCat(id);
    const first = RUDIMENTS.find((r) => r.cat === id);
    if (first) setSel(first.id);
  }

  function pickRud(id) {
    if (id !== sel) stop();
    setSel(id);
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

  async function doPrint(mode) {
    setBusy(true);
    setNote("");
    const host = document.getElementById("print-host");
    if (!host) { setBusy(false); return; }
    const tiles = RUDIMENTS.filter((r) => picked.includes(r.id))
      .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
      .filter((x) => x.svg);
    try {
      if (mode === "print") {
        const cols = perPage <= 4 ? 1 : 2;
        const ok = printElement(`<div class="sheet" style="grid-template-columns:repeat(${cols},1fr)">` +
          tiles.map(({ r, svg }) => `<div style="border:2px solid #5CC8B8;border-radius:12px;padding:10px;background:#1c2226"><div style="font-family:Oswald,sans-serif;font-weight:700;color:#5CC8B8">${r.label}</div>${svg.outerHTML}</div>`).join("") + `</div>`);
        setNote(ok ? "Druckdialog geöffnet." : "Popup blockiert — bitte Popups erlauben.");
      } else {
        const canvas = await tilesToPng(tiles, 2);
        const ok = await deliverPng(canvas, "spielfertig-rudiments.png", mode);
        setNote(ok ? (mode === "share" ? "Geteilt oder gespeichert." : "PNG gespeichert.") : "Abgebrochen.");
      }
    } catch {
      setNote("Konnte das Blatt nicht erzeugen.");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="tabs">
        {CATS.map((c) => (
          <button key={c.id} className={cat === c.id ? "chip on" : "chip"} onClick={() => pickCat(c.id)}>{c.label}</button>
        ))}
      </div>
      <div className="chip-row">
        {list.map((r) => (
          <button key={r.id} className={sel === r.id ? "chip on" : "chip"} onClick={() => pickRud(r.id)}>{r.label.replace(/^\d+\.\s*/, "")}</button>
        ))}
      </div>
      <div className={handwritten ? "staff-card hand" : "staff-card"}>
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} handwritten={handwritten} playingT={playT} svgId="rud-live" />
        <div className="staff-hint">R blau · L rot · Kreis unten startet den Click</div>
      </div>
      <div className="panel dock">
        <div className="dock-main">
          <MetronomeDial bpm={bpm} beat={beat} active={playing} onToggle={() => (playing ? stop() : startLoop())} size={96} now />
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : startLoop())}>{playing ? "Stop" : "Play"}</button>
          <button className={more ? "more-btn on" : "more-btn"} onClick={() => setMore((v) => !v)}>{more ? "Weniger" : "Optionen"}</button>
        </div>
        <div className="dock-tempo">
          <TempoControl bpm={bpm} setBpm={setBpm} min={30} max={260} />
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
        <div className="modal" onClick={() => setPrintOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">Rudiments drucken</div>
            <p style={{ color: DIM, fontSize: 13 }}>Wähle die Blätter. Hochformat DIN A4.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {[4, 6, 10, 12].map((n) => (
                <button key={n} className={perPage === n ? "chip on" : "chip"} onClick={() => setPerPage(n)}>{n} / Seite</button>
              ))}
            </div>
            <div style={{ maxHeight: 240, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {RUDIMENTS.map((r) => (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={picked.includes(r.id)} onChange={() => setPicked((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])} />
                  {r.label}
                </label>
              ))}
            </div>
            <div id="print-host" style={{ position: "absolute", left: -9999, top: 0 }}>
              {RUDIMENTS.filter((r) => picked.includes(r.id)).map((r) => (
                <div key={r.id} data-print={r.id}><RudimentStaff rud={r} handwritten={handwritten} /></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="play" disabled={busy || !picked.length} onClick={() => doPrint("print")}>Drucken</button>
              <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("share")}>Teilen</button>
              <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("save")}>Speichern</button>
              <button className="ghost" onClick={() => setPrintOpen(false)}>Schließen</button>
            </div>
            {note ? <p style={{ color: "#5cc8b8", fontSize: 12, margin: "10px 0 0" }}>{note}</p> : <p style={{ color: DIM, fontSize: 12, margin: "10px 0 0" }}>Teilen nutzt das System-Menü, sonst wird ein PNG gespeichert.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
