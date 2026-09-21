import { useRef } from "react";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const TEAL_GLOW = "rgba(92,200,184,0.45)";
const RAD_PER_BPM = (10 * Math.PI) / 180;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function angleOf(el, ev) {
  const r = el.getBoundingClientRect();
  return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2));
}

function wrap(d) {
  if (d > Math.PI) return d - Math.PI * 2;
  if (d < -Math.PI) return d + Math.PI * 2;
  return d;
}

function WheelHints({ size }) {
  const w = Math.max(72, size);
  return (
    <svg width={w} height={16} viewBox={`0 0 ${w} 16`} aria-hidden="true" style={{ display: "block", marginBottom: 2 }}>
      <path d="M22 13 A 11 11 0 0 0 8 5" fill="none" stroke={TEAL} strokeWidth="1.35" strokeLinecap="round" />
      <path d="M8 5 L12 2 L13 7 Z" fill={TEAL} />
      <text x="26" y="11" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800">−</text>
      <path d={`M${w - 22} 13 A 11 11 0 0 1 ${w - 8} 5`} fill="none" stroke={TEAL} strokeWidth="1.35" strokeLinecap="round" />
      <path d={`M${w - 8} 5 L${w - 12} 2 L${w - 13} 7 Z`} fill={TEAL} />
      <text x={w - 32} y="11" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800">+</text>
    </svg>
  );
}

export function MetronomeDial({
  bpm,
  setBpm,
  min = 30,
  max = 260,
  beat,
  active,
  onToggle,
  size = 124,
  now = true,
}) {
  const large = size >= 72;
  const on = !!active;
  const fill = beat ? "#fff" : on ? TEAL : INK;
  const ring = beat ? "#fff" : TEAL;
  const num = beat ? TEAL : on ? INK : TEAL;
  const labelCol = num;
  const bpmSize = Math.max(12, Math.round(size * (large ? 0.36 : 0.34)));
  const labelSize = Math.max(8, Math.round(size * 0.11));
  const drag = useRef(null);

  function onPointerDown(e) {
    if (!setBpm) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      last: angleOf(e.currentTarget, e),
      acc: 0,
      moved: 0,
      x: e.clientX,
      y: e.clientY,
      bpm: Number(bpm) || min,
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d || !setBpm) return;
    const ang = angleOf(e.currentTarget, e);
    const delta = wrap(ang - d.last);
    d.last = ang;
    d.acc += delta;
    d.moved += Math.hypot(e.clientX - d.x, e.clientY - d.y);
    d.x = e.clientX;
    d.y = e.clientY;
    if (Math.abs(d.acc) >= RAD_PER_BPM) {
      const steps = Math.trunc(d.acc / RAD_PER_BPM);
      d.acc -= steps * RAD_PER_BPM;
      d.bpm = clamp(d.bpm + steps, min, max);
      setBpm(d.bpm);
    }
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    if (d.moved < 8) onToggle?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      {setBpm ? <WheelHints size={size} /> : null}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={(active ? "Click aus" : "Click an") + " (" + bpm + " BPM). Drehen ändert das Tempo."}
        aria-label={active ? "Metronom stoppen" : "Metronom starten"}
        style={{
          background: fill,
          border: (large ? 3.5 : 2.5) + "px solid " + ring,
          borderRadius: "50%",
          width: size,
          height: size,
          cursor: setBpm ? "grab" : "pointer",
          touchAction: "none",
          userSelect: "none",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: beat
            ? "0 0 24px 7px " + TEAL
            : on
              ? "0 0 16px 3px " + TEAL_GLOW
              : "none",
          transform: beat ? "scale(1.07)" : "scale(1)",
          transition: "transform .05s linear, background .05s linear, box-shadow .05s linear, border-color .05s linear, color .05s linear",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, pointerEvents: "none" }}>
          <div style={{
            color: num,
            fontSize: bpmSize,
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}>{bpm}</div>
          {large && (
            <div style={{
              color: labelCol,
              fontSize: labelSize,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginTop: 4,
              opacity: 0.85,
            }}>{now && on ? "Now" : "BPM"}</div>
          )}
        </div>
      </button>
    </div>
  );
}
