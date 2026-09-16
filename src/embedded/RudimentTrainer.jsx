import { useEffect, useRef, useState } from "react";
import { CATS, RUDIMENTS, rudimentDuration } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { TempoControl } from "../lib/tempo.jsx";
import { playMetronome, playStick, startCountIn, unlockAudio } from "../lib/audio.js";
import { deliverPng, printElement, svgToPng } from "../lib/print.js";

const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

export default function RudimentTrainer({ handwritten, printNonce }) {
  const [cat, setCat] = useState("diddle");
  const [sel, setSel] = useState(16);
  const [bpm, setBpm] = useState(80);
  const [hear, setHear] = useState("hands");
  const [countIn, setCountIn] = useState(true);
  const [rampOn, setRampOn] = useState(false);
  const [rampStep, setRampStep] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [playT, setPlayT] = useState(-1);
  const [printOpen, setPrintOpen] = useState(false);
  const [picked, setPicked] = useState([16]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const stopRef = useRef(null);
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const hearRef = useRef(hear); hearRef.current = hear;
  const rampRef = useRef(rampOn); rampRef.current = rampOn;
  const rampStepRef = useRef(rampStep); rampStepRef.current = rampStep;
  const list = RUDIMENTS.filter((r) => r.cat === cat);
  const rud = RUDIMENTS.find((r) => r.id === sel) || RUDIMENTS[15];

  useEffect(() => { if (printNonce) setPrintOpen(true); }, [printNonce]);
  useEffect(() => () => stopRef.current?.(), []);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
    setPlayT(-1);
  }

  function startLoop() {
    const ctx = unlockAudio();
    const notes = rud.notes;
    const steps = rudimentDuration(rud);
    let cancelled = false;
    const run = () => {
      const stepMs = 60000 / bpmRef.current / 4;
      const t0 = ctx.currentTime + 0.06;
      notes.forEach((nt) => {
        const t = t0 + nt.t * (stepMs / 1000);
        if (hearRef.current === "hands") playStick(ctx, nt.hand, t, nt.acc);
        else if (nt.t % 4 === 0) playMetronome(ctx, nt.t % 16 === 0, t);
      });
      for (let s = 0; s < steps; s++) window.setTimeout(() => { if (!cancelled) setPlayT(s); }, 60 + s * stepMs);
      const loop = window.setTimeout(() => {
        if (cancelled) return;
        if (rampRef.current) setBpm((p) => Math.min(260, p + rampStepRef.current));
        run();
      }, 60 + steps * stepMs);
      stopRef.current = () => { cancelled = true; window.clearTimeout(loop); };
    };
    setPlaying(true);
    if (countIn) {
      const cancelIn = startCountIn({ ctx, bpm: bpmRef.current, onDone: () => { if (!cancelled) run(); } });
      stopRef.current = () => { cancelled = true; cancelIn?.(); };
    } else run();
  }

  async function doPrint(mode) {
    setBusy(true);
    const host = document.getElementById("print-host");
    if (!host) { setBusy(false); return; }
    const tiles = RUDIMENTS.filter((r) => picked.includes(r.id))
      .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
      .filter((x) => x.svg);
    if (mode === "print") {
      const cols = perPage <= 4 ? 1 : 2;
      printElement(`<div class="sheet" style="grid-template-columns:repeat(${cols},1fr)">` +
        tiles.map(({ r, svg }) => `<div style="border:2px solid #5CC8B8;border-radius:12px;padding:10px;background:#1c2226"><div style="font-family:Oswald,sans-serif;font-weight:700;color:#5CC8B8">${r.label}</div>${svg.outerHTML}</div>`).join("") + `</div>`);
    } else if (tiles[0]) {
      await deliverPng(await svgToPng(tiles[0].svg, 2), "rudiment.png", mode);
    }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CATS.map((c) => (
          <button key={c.id} className={cat === c.id ? "chip on" : "chip"} onClick={() => setCat(c.id)}>{c.label} ({RUDIMENTS.filter((r) => r.cat === c.id).length})</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {list.map((r) => (
          <button key={r.id} className={sel === r.id ? "chip on" : "chip"} onClick={() => setSel(r.id)}>{r.label}</button>
        ))}
      </div>
      <div className="staff-card">
        <div className="staff-label">{rud.label}</div>
        <RudimentStaff rud={rud} handwritten={handwritten} playingT={playT} svgId="rud-live" />
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11 }}>
          <span style={{ color: "#5c8ee0", fontWeight: 700 }}>R = rechts</span>
          <span style={{ color: "#e05c5c", fontWeight: 700 }}>L = links</span>
          <span style={{ color: DIM }}>> = Akzent</span>
        </div>
      </div>
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TempoControl bpm={bpm} setBpm={setBpm} min={30} max={260} />
          <label className="check"><input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />Einzählen</label>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: DIM }}>Hören</span>
          <div className="seg">
            <button className={hear === "hands" ? "on" : ""} onClick={() => setHear("hands")}>L / R</button>
            <button className={hear === "click" ? "on" : ""} onClick={() => setHear("click")}>Nur Click</button>
          </div>
          <span style={{ fontSize: 11, color: DIM }}>{hear === "hands" ? "Rechts höher, links tiefer" : "Nur das Tempo — Du spielst die Noten"}</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label className="check"><input type="checkbox" checked={rampOn} onChange={(e) => setRampOn(e.target.checked)} />Tempo-Trainer: automatisch schneller</label>
          {rampOn && (
            <span style={{ fontSize: 12, color: DIM }}>
              +<input type="number" min={1} max={20} value={rampStep} onChange={(e) => setRampStep(Number(e.target.value))} style={{ width: 46, margin: "0 6px", background: INK, border: "1px solid " + LINE, color: "#fff", borderRadius: 5, padding: "3px 5px" }} />BPM je Durchlauf
            </span>
          )}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={playing ? "play stop" : "play"} onClick={() => (playing ? stop() : startLoop())}>{playing ? "Stop" : "Play"}</button>
          <button className="ghost" onClick={() => setPrintOpen(true)}>Drucken</button>
        </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
