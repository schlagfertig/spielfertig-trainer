import { useRef, useState, useEffect, useId } from "react";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const TEAL_GLOW = "rgba(92,200,184,0.45)";
const MINUS = "-";
const MOVE_PX = 8;
const HOLD_MS = 480;
const FADE_MS = 640;

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

function fatTip(cx, cy, r, deg, dir) {
  const [x, y] = polar(cx, cy, r, deg);
  const t = ((deg + dir * 90) * Math.PI) / 180;
  const px = Math.cos(t);
  const py = Math.sin(t);
  const tx = Math.cos((deg * Math.PI) / 180) * dir;
  const ty = Math.sin((deg * Math.PI) / 180) * dir;
  const s = 8;
  const b = 5.6;
  return `${x + tx * s},${y + ty * s} ${x - px * b - tx * 0.5},${y - py * b - ty * 0.5} ${x + px * b - tx * 0.5},${y + py * b - ty * 0.5}`;
}

function arc(cx, cy, r, a0, a1, sweep) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${sweep} ${x1} ${y1}`;
}

function radPerBpm(distPx, halfSize) {
  const reach = halfSize * 2.96;
  const t = Math.min(1, Math.max(0, distPx / Math.max(1, reach)));
  const coarse = (6 * Math.PI) / 180;
  const fine = (22 * Math.PI) / 180;
  return coarse + (fine - coarse) * t;
}

function originOf(el) {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
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

function DragArrows({ cx, cy, size, visible }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const r = size / 2 + 36;
  const [lx, ly] = polar(cx, cy, r + 8, 228);
  const [rx, ry] = polar(cx, cy, r + 8, 312);
  const [lmX, lmY] = polar(cx, cy, r, 186);
  const [rmX, rmY] = polar(cx, cy, r, 354);
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={vw}
      height={vh}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100dvh",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        zIndex: 81,
      }}
    >
      <path d={arc(cx, cy, r, 236, 148, 0)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
      <polygon points={fatTip(cx, cy, r, 148, -1)} fill={TEAL} />
      <text x={lmX} y={lmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="15" fontWeight="800">{MINUS}</text>
      <text x={lx - 6} y={ly - 16} textAnchor="end" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800" letterSpacing="0.08em">TIPP LINKS</text>
      <text x={lx - 6} y={ly - 2} textAnchor="end" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.06em">= LANGSAMER</text>

      <path d={arc(cx, cy, r, 304, 32, 1)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
      <polygon points={fatTip(cx, cy, r, 32, 1)} fill={TEAL} />
      <text x={rmX} y={rmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="15" fontWeight="800">+</text>
      <text x={rx + 6} y={ry - 16} textAnchor="start" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800" letterSpacing="0.08em">TIPP RECHTS</text>
      <text x={rx + 6} y={ry - 2} textAnchor="start" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.06em">= SCHNELLER</text>
    </svg>
  );
}

function HoldLever({ cx, cy, x, y, size, visible }) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const rMin = size * 0.2;
  const rMax = Math.max(size * 1.8, 220);
  const t = Math.min(1, Math.max(0, (dist - rMin) / Math.max(1, rMax - rMin)));
  const coarse = 1 - t;
  const strokeW = 2 + coarse * 3.4;
  const deg = (angle * 180) / Math.PI;
  const halfSpan = 22 + coarse * 18;
  const arcR = Math.max(18, dist + 8);
  const uid = useId().replace(/:/g, "");
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={vw}
      height={vh}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100dvh",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        zIndex: 80,
      }}
    >
      <defs>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${uid}-glow)`} opacity={0.95}>
        <path
          d={arc(cx, cy, arcR, deg - halfSpan, deg + halfSpan, 1)}
          fill="none"
          stroke="rgba(92,200,184,0.28)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        <line x1={cx} y1={cy} x2={x} y2={y} stroke={TEAL} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={x} cy={y} r={7} fill={TEAL} stroke="rgba(244,247,246,0.7)" strokeWidth={1.4} />
        <circle cx={x} cy={y} r={2.4} fill="#f4f7f6" />
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
  const layoutPad = 16;
  const drag = useRef(null);
  const holdTimer = useRef(null);
  const fadeTimer = useRef(null);
  const [lever, setLever] = useState({
    visible: false,
    mounted: false,
    cx: 0,
    cy: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  }, []);

  function clearTimers() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }
  }

  function showLever(origin, ev) {
    clearTimers();
    setLever({
      visible: true,
      mounted: true,
      cx: origin.cx,
      cy: origin.cy,
      x: ev.clientX,
      y: ev.clientY,
    });
  }

  function hideLever() {
    clearTimers();
    holdTimer.current = setTimeout(() => {
      setLever((prev) => ({ ...prev, visible: false }));
      fadeTimer.current = setTimeout(() => {
        setLever((prev) => ({ ...prev, mounted: false }));
        fadeTimer.current = null;
      }, FADE_MS + 40);
      holdTimer.current = null;
    }, HOLD_MS);
  }

  function onPointerDown(e) {
    if (!setBpm) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const origin = originOf(e.currentTarget);
    drag.current = {
      last: angleOf(e.currentTarget, e),
      acc: 0,
      moved: 0,
      x: e.clientX,
      y: e.clientY,
      bpm: Number(bpm) || min,
      dragging: false,
      origin,
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
      showLever(d.origin, e);
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
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 0 }}>
      <div style={{ position: "relative", width: size + layoutPad * 2, height: size + layoutPad * 2, flexShrink: 0, overflow: "visible" }}>
        {setBpm && !lever.visible && !lever.mounted ? <WheelHints /> : null}
        <button
          type="button"
          onClick={setBpm ? undefined : () => onToggle?.()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="Tipp = Start/Stop. Halten und drehen ändert das Tempo. Außen feiner."
          aria-label={active ? "Metronom stoppen. Halten und drehen ändert das Tempo." : "Metronom starten. Halten und drehen ändert das Tempo."}
          style={{
            position: "absolute",
            left: layoutPad,
            top: layoutPad,
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
      </div>
      {setBpm && lever.mounted ? (
        <DragArrows cx={lever.cx} cy={lever.cy} size={size} visible={lever.visible} />
      ) : null}
      {setBpm && lever.mounted ? (
        <HoldLever cx={lever.cx} cy={lever.cy} x={lever.x} y={lever.y} size={size} visible={lever.visible} />
      ) : null}
      {setBpm ? (
        <div style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", width: 168, marginTop: 2, textAlign: "center", font: "600 11px/1.25 Figtree, sans-serif", color: "#8a969c", pointerEvents: "none" }}>
          Halten und drehen · außen feiner
        </div>
      ) : null}
    </div>
  );
}
