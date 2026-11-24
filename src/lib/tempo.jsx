import { useEffect, useState } from "react";
import { clampInt, commitNumber, draftDigits } from "./commitNumber.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const LINE = "#2f383d";
const DIM = "#8a969c";

function clamp(n, min, max) {
  return clampInt(n, min, max);
}

// Freies Tippen: Feld darf leer bleiben, Prüfung erst beim Verlassen / Enter / „Fertig“.
export function DraftNumberInput({ value, setValue, min, max, ariaLabel }) {
  const safe = clamp(Number(value) || min, min, max);
  const [draft, setDraft] = useState(String(safe));
  const [focused, setFocused] = useState(false);
  const maxLen = String(Math.max(Math.abs(min), Math.abs(max))).length;

  useEffect(() => {
    if (!focused) setDraft(String(safe));
  }, [safe, focused]);

  function commit(raw) {
    const next = commitNumber(raw, min, max, safe);
    setValue(next);
    setDraft(String(next));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={focused ? draft : String(safe)}
      onFocus={(e) => { setFocused(true); setDraft(String(safe)); e.target.select(); }}
      onChange={(e) => setDraft(draftDigits(e.target.value, maxLen))}
      onBlur={() => { setFocused(false); commit(draft); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

// slider=false: kein Schieberegler (Click-Trainer - dort stellt das Rad das Tempo ein).
export function TempoControl({ bpm, setBpm, min = 30, max = 260, hideNudge = false, slider = true }) {
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
    apply(commitNumber(raw, min, max, safe));
  }

  function onDraft(raw) {
    setDraft(draftDigits(raw, 3));
  }

  function slide(n) {
    apply(n);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 15, color: DIM }}>Tempo</span>
      {slider && (
        <input type="range" min={min} max={max} value={safe} onChange={(e) => slide(Number(e.target.value))} aria-label="Tempo" style={{ width: 140, accentColor: TEAL }} />
      )}
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
        onFocus={(e) => { setFocused(true); setDraft(String(safe)); e.target.select(); }}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={() => { setFocused(false); commit(draft); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{ width: 58, textAlign: "center", fontSize: 18, fontWeight: 700, color: TEAL, background: INK, border: "1px solid " + LINE, borderRadius: 8, padding: "7px 4px" }}
      />
      <span style={{ fontSize: 14, color: DIM, fontWeight: 700 }}>BPM</span>
    </div>
  );
}
