import { useEffect, useState } from "react";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function TempoControl({ bpm, setBpm, min = 30, max = 260 }) {
  const [draft, setDraft] = useState(String(bpm));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(bpm));
  }, [bpm, focused]);

  function commit(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDraft(String(bpm));
      return;
    }
    const next = clamp(n, min, max);
    setBpm(next);
    setDraft(String(next));
  }

  function onDraft(raw) {
    const clean = raw.replace(/[^\d]/g, "").slice(0, 3);
    setDraft(clean);
    const n = parseInt(clean, 10);
    if (!Number.isNaN(n) && n >= min) setBpm(clamp(n, min, max));
  }

  function nudge(delta) {
    const cur = Number(bpm);
    const base = Number.isFinite(cur) ? cur : min;
    setBpm(clamp(base + delta, min, max));
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: DIM }}>Tempo</span>
      <button type="button" className="nudge" onClick={() => nudge(-5)} aria-label="5 BPM langsamer">−5</button>
      <input type="range" min={min} max={max} value={Number.isFinite(Number(bpm)) ? bpm : min} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo" style={{ width: 120, accentColor: TEAL }} />
      <button type="button" className="nudge" onClick={() => nudge(5)} aria-label="5 BPM schneller">+5</button>
      <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Tempo in BPM" value={focused ? draft : String(Number.isFinite(Number(bpm)) ? bpm : "")} onFocus={() => { setFocused(true); setDraft(String(bpm)); }} onChange={(e) => onDraft(e.target.value)} onBlur={() => { setFocused(false); commit(draft); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ width: 52, textAlign: "center", fontSize: 16, fontWeight: 700, color: TEAL, background: INK, border: "1px solid " + LINE, borderRadius: 8, padding: "6px 4px" }} />
      <span style={{ fontSize: 11, color: DIM, fontWeight: 700 }}>BPM</span>
    </div>
  );
}
