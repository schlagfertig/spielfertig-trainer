import { useEffect, useRef, useState } from "react";

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
  const [flash, setFlash] = useState(false);
  const [hint, setHint] = useState("");
  const taps = useRef([]);
  const flashTimer = useRef(0);

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

  function tap() {
    const now = performance.now();
    const keep = taps.current.filter((t) => now - t < 3200);
    keep.push(now);
    taps.current = keep;
    window.clearTimeout(flashTimer.current);
    setFlash(true);
    flashTimer.current = window.setTimeout(() => setFlash(false), 180);
    if (keep.length < 2) {
      setHint("nochmal tippen");
      return;
    }
    const gaps = [];
    for (let i = 1; i < keep.length; i++) gaps.push(keep[i] - keep[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const next = clamp(60000 / avg, min, max);
    setBpm(next);
    setDraft(String(next));
    setHint(`${next} BPM`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: DIM }}>Tempo</span>
      <input type="range" min={min} max={max} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo Schieberegler" style={{ width: 140, accentColor: TEAL }} />
      <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Tempo in BPM eingeben" value={focused ? draft : String(bpm)} onFocus={() => { setFocused(true); setDraft(String(bpm)); }} onChange={(e) => onDraft(e.target.value)} onBlur={() => { setFocused(false); commit(draft); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{ width: 52, textAlign: "center", fontSize: 16, fontWeight: 700, color: TEAL, background: INK, border: "1px solid " + LINE, borderRadius: 8, padding: "6px 4px" }} />
      <span style={{ fontSize: 11, color: DIM, fontWeight: 700 }}>BPM</span>
      <button type="button" onPointerDown={(e) => { e.preventDefault(); tap(); }} aria-label="Tempo tippen" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid " + (flash ? TEAL : LINE), background: flash ? "rgba(92,200,184,0.22)" : INK, color: flash ? TEAL : DIM, fontWeight: 800, fontSize: 12, letterSpacing: 0.08, cursor: "pointer", minWidth: 56 }}>{flash ? String(bpm) : "TAP"}</button>
      {hint ? <span style={{ fontSize: 11, color: TEAL }}>{hint}</span> : null}
    </div>
  );
}
