import { useEffect, useState } from "react";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function TempoControl({ bpm, setBpm, min = 30, max = 260, hideNudge = false }) {
  const safe = clamp(Number(bpm) || min, min, max);
  const [draft, setDraft] = useState(String(safe));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(safe));
  }, [safe, focused]);

  function apply(n) {
    const next = clamp(n, min, max);
    setBpm(next);
    setDraft(String(next));
    return next;
  }

  function commit(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDraft(String(safe));
      return;
    }
    apply(n);
  }

  function onDraft(raw) {
    const clean = raw.replace(/[^\d]/g, "").slice(0, 3);
    if (clean === "") {
      setDraft("");
      return;
    }
    const n = parseInt(clean, 10);
    if (Number.isNaN(n)) {
      setDraft(String(safe));
      return;
    }
    if (n > max) {
      apply(max);
      return;
    }
    setDraft(String(n));
    if (n >= min) setBpm(n);
  }

  function slide(n) {
    apply(n);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 15, color: DIM }}>Tempo</span>
      <input type="range" min={min} max={max} value={safe} onChange={(e) => slide(Number(e.target.value))} aria-label="Tempo" style={{ width: 140, accentColor: TEAL }} />
      {!hideNudge && (
        <>
          <button type="button" className="nudge" onClick={() => apply(safe - 5)}>−5</button>
          <button type="button" className="nudge" onClick={() => apply(safe + 5)}>+5</button>
        </>
      )}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Tempo in BPM"
        value={focused ? draft : String(safe)}
        onFocus={() => { setFocused(true); setDraft(String(safe)); }}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={() => { setFocused(false); commit(draft); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{ width: 58, textAlign: "center", fontSize: 18, fontWeight: 700, color: TEAL, background: INK, border: "1px solid " + LINE, borderRadius: 8, padding: "7px 4px" }}
      />
      <span style={{ fontSize: 14, color: DIM, fontWeight: 700 }}>BPM</span>
    </div>
  );
}
