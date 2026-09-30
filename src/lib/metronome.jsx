import { useRef, useState, useEffect, useLayoutEffect, useId } from "react";
import { t } from "./i18n.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const TEAL_GLOW = "rgba(92,200,184,0.45)";
const MINUS = "-";
const MOVE_PX = 8;
const HOLD_MS = 480;
const FADE_MS = 640;
const GROW = 0.62;
// Innere ~62 % des Radius: Tippen startet/stoppt, Drehen ändert dort kein Tempo (nur am Rand).
const DEAD_R = 0.62;

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
        transform: visible ? "scale(1)" : `scale(${GROW})`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
        zIndex: 81,
      }}
    >
      <path d={arc(cx, cy, r, 236, 148, 0)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
      <polygon points={fatTip(cx, cy, r, 148, -1)} fill={TEAL} />
      <text x={lmX} y={lmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="15" fontWeight="800">{MINUS}</text>
      <g style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS * 0.6}ms ease-out` }}>
        <text x={lx - 6} y={ly - 16} textAnchor="end" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800" letterSpacing="0.08em">{t("TIPP LINKS")}</text>
        <text x={lx - 6} y={ly - 2} textAnchor="end" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.06em">{t("= LANGSAMER")}</text>
        <text x={rx + 6} y={ry - 16} textAnchor="start" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="800" letterSpacing="0.08em">{t("TIPP RECHTS")}</text>
        <text x={rx + 6} y={ry - 2} textAnchor="start" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.06em">{t("= SCHNELLER")}</text>
      </g>
      <path d={arc(cx, cy, r, 304, 32, 1)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
      <polygon points={fatTip(cx, cy, r, 32, 1)} fill={TEAL} />
      <text x={rmX} y={rmY} textAnchor="middle" dominantBaseline="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="15" fontWeight="800">+</text>
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

/* Clickwheel (Entwurf, iPod-artig): ein Ring um den Kreis, der in Ruhe leise sichtbar ist
   und sich beim Antippen vergrößert. Gezeichnet wird immer die offene Größe; in Ruhe ist das
   SVG auf WHEEL_REST verkleinert, so dass nur der äußere Streifen (Striche, − und +) um den
   Kreis herum sichtbar bleibt – der Rest liegt unter dem Kreis. Die Logik bleibt die des Dials:
   Mitte = Start/Stop, am Rand drehen = Tempo, weiter außen feiner. */
const WHEEL_K = 1.55; // Außenradius offen = Kreisradius × 1.55 (Standard, Click-Trainer); pro Trainer über `wheelK` kleiner, wenn Platz fehlt
const WHEEL_REST_PX = 14; // in Ruhe ragt der Ring so weit über den Kreis hinaus
const WHEEL_TICKS = 60;
const HINT_FS = 10.5; // Schriftgröße des Hinweises im Ring; wird verkleinert, bis er auf den Bogen passt
const HINT_MIN_FS = 7;

function Clickwheel({ size, bpm, open, thumb, k = WHEEL_K }) {
  const R0 = size / 2;
  const ro = R0 * k;
  const ri = R0 + 1;
  const pad = 22; // Platz für die Richtungspfeile außerhalb
  const D = Math.round(2 * (ro + pad));
  const c = D / 2;
  const rest = (R0 + WHEEL_REST_PX) / ro;
  const mid = (ri + ro) / 2;
  const uid = useId().replace(/:/g, "");
  const rot = ((Number(bpm) || 0) * 6) % 360; // grob = 6° pro BPM: die Striche wandern mit dem Tempo
  const [lx, ly] = polar(c, c, ro - 14, 180);
  const [rx, ry] = polar(c, c, ro - 14, 0);
  const ra = ro + 9;
  const cue = { opacity: open ? 1 : 0 };
  // Hinweis oben im Ring passend machen: Länge ist proportional zur Schriftgröße (Sperrung in em),
  // also einmal messen und die Größe so setzen, dass der Text auf den Bogen passt (kleine Räder = kleinere Schrift).
  const hint = t("Am Rand drehen · außen feiner").toUpperCase();
  const hintRef = useRef(null);
  const hintPathRef = useRef(null);
  const [hintFs, setHintFs] = useState(HINT_FS);
  useLayoutEffect(() => {
    const fit = () => {
      const el = hintRef.current;
      const path = hintPathRef.current;
      if (!el || !path || !el.getComputedTextLength) return;
      const len = el.getComputedTextLength();
      if (!len) return;
      const perPx = len / hintFs; // Textlänge je px Schriftgröße
      const want = Math.max(HINT_MIN_FS, Math.min(HINT_FS, (path.getTotalLength() * 0.95) / perPx));
      if (Math.abs(want - hintFs) > 0.1) setHintFs(Math.round(want * 10) / 10);
    };
    fit();
    document.fonts?.ready?.then(fit);
  }, [hint, size, k, hintFs]);
  return (
    <svg
      className={open ? "cw-svg open" : "cw-svg"}
      width={D}
      height={D}
      viewBox={`0 0 ${D} ${D}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        margin: `${-D / 2}px 0 0 ${-D / 2}px`,
        transform: `scale(${open ? 1 : rest})`,
        transformOrigin: "50% 50%",
        pointerEvents: open ? "auto" : "none",
        overflow: "visible",
        zIndex: 0,
      }}
    >
      <defs>
        <path id={`${uid}-top`} ref={hintPathRef} d={arc(c, c, mid, 194, 346, 1)} />
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Trefferfläche, damit man auch im vergrößerten Ring außerhalb des Kreises greifen kann */}
      <circle cx={c} cy={c} r={ro + 6} fill="transparent" />
      {/* Drehbahn = Greifzone */}
      <circle className="cw-track" cx={c} cy={c} r={mid} fill="none" stroke={TEAL} strokeWidth={ro - ri} style={{ opacity: open ? 0.14 : 0.09 }} />
      <circle cx={c} cy={c} r={ro - 0.75} fill="none" stroke={TEAL} strokeWidth="1.5" style={{ opacity: open ? 0.55 : 0.32 }} />
      <g className="cw-ticks" transform={`rotate(${rot} ${c} ${c})`} style={{ opacity: open ? 0.75 : 0.3 }}>
        {Array.from({ length: WHEEL_TICKS }, (_, i) => {
          const major = i % 5 === 0;
          const [x0, y0] = polar(c, c, ro - (major ? 7.5 : 5), (i * 360) / WHEEL_TICKS);
          const [x1, y1] = polar(c, c, ro - 2.5, (i * 360) / WHEEL_TICKS);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={TEAL} strokeWidth={major ? 2 : 1.2} strokeLinecap="round" />;
        })}
      </g>
      <g style={{ opacity: open ? 1 : 0.55 }}>
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="20" fontWeight="800">{MINUS}</text>
        <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="20" fontWeight="800">+</text>
      </g>
      {/* Nur offen: Drehrichtung, Hinweis oben im Ring, Daumen am Finger */}
      <g className="cw-cue" style={cue}>
        <path d={arc(c, c, ra, 206, 154, 0)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
        <polygon points={fatTip(c, c, ra, 154, -1)} fill={TEAL} />
        <path d={arc(c, c, ra, 334, 26, 1)} fill="none" stroke={TEAL} strokeWidth="2.6" strokeLinecap="round" />
        <polygon points={fatTip(c, c, ra, 26, 1)} fill={TEAL} />
        <text ref={hintRef} fill={TEAL} fontFamily="Figtree, sans-serif" fontSize={hintFs} fontWeight="800" letterSpacing="0.1em" dominantBaseline="central">
          <textPath href={`#${uid}-top`} startOffset="50%" textAnchor="middle">{hint}</textPath>
        </text>
      </g>
      {open && thumb ? (() => {
        // Daumen sitzt auf dem echten Fingerabstand, begrenzt auf den Ring (innen = Kreisrand, außen = Ringrand).
        const tr = (ro - ri) * 0.3;
        const r = Math.min(ro - tr, Math.max(ri + tr, thumb.r));
        const [tx, ty] = polar(c, c, r, thumb.deg);
        return (
          <g filter={`url(#${uid}-glow)`} className="cw-thumb">
            <circle cx={tx} cy={ty} r={tr} fill={TEAL} stroke="rgba(244,247,246,0.75)" strokeWidth="1.4" />
          </g>
        );
      })() : null}
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
  wheel = false,
  wheelK = WHEEL_K,
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
  const cw = wheel && !!setBpm;
  const [wheelOpen, setWheelOpen] = useState(false);
  const [thumb, setThumb] = useState(null); // { deg, r } – Fingerposition relativ zur Kreismitte
  const shrinkTimer = useRef(null);
  const [lever, setLever] = useState({
    visible: false,
    mounted: false,
    cx: 0,
    cy: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (document.getElementById("metro-gesture-css")) return;
    const s = document.createElement("style");
    s.id = "metro-gesture-css";
    s.textContent = ".nudge-lg{transition:opacity .64s ease-out,transform .64s ease-out}body.metro-gesturing .nudge-lg{opacity:0;pointer-events:none;transform:scale(.88)}"
      // Clickwheel: weiches Vergrößern/Verkleinern; bei reduzierter Bewegung ohne Animation
      + ".cw-svg{transition:transform .24s cubic-bezier(.2,.8,.2,1)}.cw-svg:not(.open){transition-duration:.34s}.cw-svg .cw-cue,.cw-svg .cw-track,.cw-svg .cw-ticks{transition:opacity .2s ease-out}.cw-hint{transition:opacity .2s ease-out}"
      + "@media (prefers-reduced-motion: reduce){.cw-svg,.cw-svg:not(.open),.cw-svg .cw-cue,.cw-svg .cw-track,.cw-svg .cw-ticks,.cw-hint,.nudge-lg{transition:none}}";
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("metro-gesturing", lever.mounted || wheelOpen);
    return () => document.body.classList.remove("metro-gesturing");
  }, [lever.mounted, wheelOpen]);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    document.body.classList.remove("metro-gesturing");
  }, []);

  function openWheel() {
    if (!cw) return;
    if (shrinkTimer.current) { clearTimeout(shrinkTimer.current); shrinkTimer.current = null; }
    setWheelOpen(true);
  }

  function shrinkWheelSoon(ms) {
    if (!cw) return;
    if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    shrinkTimer.current = setTimeout(() => {
      shrinkTimer.current = null;
      setWheelOpen(false);
      setThumb(null);
    }, ms);
  }

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
    setLever((prev) => {
      const next = {
        mounted: true,
        cx: origin.cx,
        cy: origin.cy,
        x: ev.clientX,
        y: ev.clientY,
        visible: prev.mounted ? true : false,
      };
      if (!prev.mounted) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLever((p) => (p.mounted ? { ...p, visible: true } : p));
          });
        });
      }
      return next;
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

  // Sofort ausblenden (weich, ohne Halte-Pause) – z. B. wenn der Finger zurück in den Ring geht.
  function fadeLeverNow() {
    clearTimers();
    setLever((prev) => (prev.mounted ? { ...prev, visible: false } : prev));
    fadeTimer.current = setTimeout(() => {
      setLever((prev) => ({ ...prev, mounted: false }));
      fadeTimer.current = null;
    }, FADE_MS + 40);
  }

  function onPointerDown(e) {
    if (!setBpm) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    openWheel();
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
    d.moved += Math.hypot(e.clientX - d.x, e.clientY - d.y);
    d.x = e.clientX;
    d.y = e.clientY;

    // Mitte (tote Zone) oder noch kein echter Zug: Winkel nachführen, Tempo bleibt.
    // Clickwheel: Daumen folgt dem Finger auf dem Ring; der Hebel erscheint erst außerhalb des Rings (= feiner).
    const lev = (ev) => {
      if (!cw) { showLever(d.origin, ev); return; }
      setThumb({ deg: (ang * 180) / Math.PI, r: dist });
      if (dist > (size / 2) * wheelK) showLever(d.origin, ev);
      else if (lever.mounted && !fadeTimer.current) fadeLeverNow();
    };
    if (d.moved < MOVE_PX || dist < DEAD_R * (size / 2)) {
      d.last = ang;
      d.acc = 0;
      if (d.dragging) lev(e);
      return;
    }
    if (!d.dragging) {
      // Erster Moment am Rand: nur einrasten, kein Sprung.
      d.dragging = true;
      d.last = ang;
      lev(e);
      return;
    }
    const delta = wrap(ang - d.last);
    d.last = ang;
    d.acc += delta;
    lev(e);
    const step = radPerBpm(dist, size / 2);
    if (Math.abs(d.acc) >= step) {
      const steps = Math.trunc(d.acc / step);
      d.acc -= steps * step;
      d.bpm = clamp(d.bpm + steps, min, max);
      setBpm(d.bpm);
    }
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (d?.dragging) {
      if (cw) { setThumb(null); if (lever.mounted) fadeLeverNow(); }
      else hideLever();
    }
    // Nach dem Loslassen kurz offen lassen, dann zurück auf die leise Ruhegröße.
    shrinkWheelSoon(d?.dragging ? 700 : 1200);
    if (!d) return;
    // Nie am Rand gedreht (Tipp oder Wackeln in der Mitte) = Start/Stop.
    if (!d.dragging) onToggle?.();
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, minWidth: 0 }}>
      <div
        className={cw ? "cw-frame" : undefined}
        style={{ position: "relative", width: size + layoutPad * 2, height: size + layoutPad * 2, flexShrink: 0, overflow: "visible", touchAction: cw ? "none" : undefined }}
        {...(cw ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } : {})}
      >
        {cw ? <Clickwheel size={size} bpm={bpm} open={wheelOpen} thumb={thumb} k={wheelK} /> : null}
        {setBpm && !cw && !lever.mounted ? <WheelHints /> : null}
        <button
          type="button"
          onClick={cw ? (e) => { if (e.detail === 0) onToggle?.(); } : setBpm ? undefined : () => onToggle?.()}
          onKeyDown={cw ? (e) => {
            const k = e.key;
            const dir = k === "ArrowRight" || k === "ArrowUp" ? 1 : k === "ArrowLeft" || k === "ArrowDown" ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            setBpm(clamp((Number(bpm) || min) + dir, min, max));
            openWheel();
            shrinkWheelSoon(1200);
          } : undefined}
          {...(cw ? {} : { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp })}
          title={t("Tipp = Start/Stop. Am Rand drehen ändert das Tempo. Außen feiner.")}
          aria-label={t(active ? "Metronom stoppen. Halten und drehen ändert das Tempo." : "Metronom starten. Halten und drehen ändert das Tempo.")}
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
      {setBpm && !cw && lever.mounted ? (
        <DragArrows cx={lever.cx} cy={lever.cy} size={size} visible={lever.visible} />
      ) : null}
      {setBpm && lever.mounted ? (
        <HoldLever cx={lever.cx} cy={lever.cy} x={lever.x} y={lever.y} size={size} visible={lever.visible} />
      ) : null}
      {setBpm ? (
        <div className="cw-hint" style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", width: 168, marginTop: 2, textAlign: "center", font: "600 11px/1.25 Figtree, sans-serif", color: "#8a969c", pointerEvents: "none", opacity: cw && wheelOpen ? 0 : 1 }}>
          {t("Am Rand drehen · außen feiner")}
        </div>
      ) : null}
    </div>
  );
}
