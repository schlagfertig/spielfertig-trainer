import { useRef, useState, useEffect, useId } from "react";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const TEAL_GLOW = "rgba(92,200,184,0.45)";
const MINUS = "-";
const MOVE_PX = 8;
const FADE_MS = 220;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function angleOf(el, ev) {
  const r = el.getBoundingClientRect();
  return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2));
}

function distOf(el, ev) {
  const r = el.getBoundingClientRect();
  return Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2));
}

function wrap(d) {
  if (d > Math.PI) return d - Math.PI * 2;
  if (d < -Math.PI) return d + Math.PI * 2;
  return d;
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function tip(cx, cy, r, deg, dir) {
  const [x, y] = polar(cx, cy, r, deg);
  const t = ((deg + dir * 90) * Math.PI) / 180;
  const px = Math.cos(t);
  const py = Math.sin(t);
  const tx = Math.cos((deg * Math.PI) / 180) * dir;
  const ty = Math.sin((deg * Math.PI) / 180) * dir;
  const s = 3.2;
  const b = 2.4;
  return `${x + tx * s},${y + ty * s} ${x - px * b - tx * 0.4},${y - py * b - ty * 0.4} ${x + px * b - tx * 0.4},${y + py * b - ty * 0.4}`;
}

function arc(cx, cy, r, a0, a1, sweep) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${sweep} ${x1} ${y1}`;
}

/** Radians of turn per 1 BPM: near center = coarse, past rim = finer. */
function radPerBpm(distPx, halfSize) {
  // Reach past the dial rim so fine control lives outside the circle.
  // 1.85 * 1.6 ≈ 2.96 (±60% larger functional radius).
  const reach = halfSize * 2.96;
  const t = Math.min(1, Math.max(0, distPx / Math.max(1, reach)));
  const coarse = (6 * Math.PI) / 180;
  const fine = (22 * Math.PI) / 180;
  return coarse + (fine - coarse) * t;
}

function WheelHints() {
  const cx = 50;
  const cy = 50;
  const r = 46;
  const [lmX, lmY] = polar(cx, cy, r, 183);
  const [rmX, rmY] = polar(cx, cy, r, 357);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <path d={arc(cx, cy, r, 218, 196, 0)} fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <path d={arc(cx, cy, r, 170, 148, 0)} fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <polygon points={tip(cx, cy, r, 148, -1)} fill={TEAL} />
      <text x={lmX} y={lmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="9" fontWeight="800">{MINUS}</text>
      <path d={arc(cx, cy, r, 322, 344, 1)} fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <path d={arc(cx, cy, r, 10, 32, 1)} fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <polygon points={tip(cx, cy, r, 32, 1)} fill={TEAL} />
      <text x={rmX} y={rmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="9" fontWeight="800">+</text>
    </svg>
  );
}

/** Hold-and-turn lever: only visible while dragging; length + arc fill follow finger distance. */
function HoldLever({ angle, distPx, size, pad, visible }) {
  const W = size + pad * 2;
  const cx = W / 2;
  const cy = W / 2;
  const rMin = size * 0.2;
  // Past dial rim into the pad ring (finer zone).
  const rMax = size / 2 + pad - 8;
  const r = Math.min(rMax, Math.max(rMin, distPx));
  const t = (r - rMin) / Math.max(0.001, rMax - rMin); // 0 near, 1 far
  const coarse = 1 - t; // near = grob (dicker), far = fein (schmaler)
  const strokeW = 2.2 + coarse * 3.2;
  const arcR = Math.min(rMax - 2, r + 10);
  const halfSpan = 28 + coarse * 22;
  const a0 = (angle * 180) / Math.PI - halfSpan;
  const a1 = (angle * 180) / Math.PI + halfSpan;
  const fillSpan = 8 + coarse * (halfSpan * 2 - 8);
  const af0 = (angle * 180) / Math.PI - fillSpan / 2;
  const af1 = (angle * 180) / Math.PI + fillSpan / 2;
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${W} ${W}`}
      width={W}
      height={W}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        zIndex: 2,
      }}
    >
      <defs>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${uid}-glow)`} opacity={0.92}>
        <path
          d={arc(cx, cy, arcR, a0, a1, 1)}
          fill="none"
          stroke="rgba(92,200,184,0.28)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        <path
          d={arc(cx, cy, arcR, af0, af1, 1)}
          fill="none"
          stroke={TEAL}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={TEAL}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.9}
        />
        <circle cx={x} cy={y} r={5.5} fill={TEAL} stroke="rgba(244,247,246,0.55)" strokeWidth={1.2} />
        <circle cx={x} cy={y} r={2.2} fill="#f4f7f6" opacity={0.9} />
      </g>
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
  subLabel,
}) {
  const large = size >= 72;
  const on = !!active;
  const fill = beat ? "#fff" : on ? TEAL : INK;
  const ring = beat ? "#fff" : TEAL;
  const num = beat ? TEAL : on ? INK : TEAL;
  const labelCol = num;
  const bpmSize = Math.max(12, Math.round(size * (large ? 0.36 : 0.34)));
  const labelSize = Math.max(8, Math.round(size * 0.11));
  const pad = 64; // +60% vs 40, matches larger functional radius
  const drag = useRef(null);
  const fadeTimer = useRef(null);
  const [lever, setLever] = useState({ visible: false, angle: 0, dist: size * 0.35, mounted: false });

  useEffect(() => () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  }, []);

  function showLever(angle, dist) {
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
    setLever({ visible: true, angle, dist, mounted: true });
  }

  function hideLever() {
    setLever((prev) => ({ ...prev, visible: false }));
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setLever((prev) => ({ ...prev, mounted: false }));
      fadeTimer.current = null;
    }, FADE_MS + 40);
  }

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
      dragging: false,
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d || !setBpm) return;
    const ang = angleOf(e.currentTarget, e);
    const dist = distOf(e.currentTarget, e);
    const delta = wrap(ang - d.last);
    d.last = ang;
    d.acc += delta;
    d.moved += Math.hypot(e.clientX - d.x, e.clientY - d.y);
    d.x = e.clientX;
    d.y = e.clientY;

    if (d.moved >= MOVE_PX) {
      d.dragging = true;
      showLever(ang, dist);
      const step = radPerBpm(dist, size / 2);
      if (Math.abs(d.acc) >= step) {
        const steps = Math.trunc(d.acc / step);
        d.acc -= steps * step;
        d.bpm = clamp(d.bpm + steps, min, max);
        setBpm(d.bpm);
      }
    }
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (d?.dragging) hideLever();
    if (!d) return;
    if (d.moved < MOVE_PX) onToggle?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 0 }}>
      <div style={{ position: "relative", width: size + pad * 2, height: size + pad * 2, flexShrink: 0, overflow: "visible" }}>
        {setBpm ? <WheelHints /> : null}
        {setBpm && lever.mounted ? (
          <HoldLever
            angle={lever.angle}
            distPx={lever.dist}
            size={size}
            pad={pad}
            visible={lever.visible}
          />
        ) : null}
        <button
          type="button"
          tabIndex={setBpm ? -1 : undefined}
          aria-hidden={setBpm ? true : undefined}
          onClick={setBpm ? undefined : () => onToggle?.()}
          style={{
            position: "absolute",
            left: pad,
            top: pad,
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
            pointerEvents: setBpm ? "none" : "auto",
            boxShadow: beat
              ? "0 0 24px 7px " + TEAL
              : on
                ? "0 0 16px 3px " + TEAL_GLOW
                : "none",
            transform: beat ? "scale(1.07)" : "scale(1)",
            transition: "transform .05s linear, background .05s linear, box-shadow .05s linear, border-color .05s linear, color .05s linear",
            zIndex: 1,
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
              }}>{subLabel != null ? subLabel : (now && on ? "Now" : "BPM")}</div>
            )}
          </div>
        </button>
        {setBpm ? (
          <div
            role="button"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.();
              }
            }}
            title="Tipp = Start/Stop. Halten und drehen ändert das Tempo."
            aria-label={active ? "Metronom stoppen. Halten und drehen ändert das Tempo." : "Metronom starten. Halten und drehen ändert das Tempo."}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 3,
              borderRadius: "50%",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              outline: "none",
            }}
          />
        ) : null}
      </div>
      {setBpm ? (
        <div style={{ marginTop: 2, maxWidth: 148, textAlign: "center", font: "600 11px/1.25 Figtree, sans-serif", color: "#8a969c" }}>
          Halten und drehen ändert das Tempo
        </div>
      ) : null}
    </div>
  );
}
