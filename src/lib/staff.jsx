const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

const HEAD_RX = 7.45;
const HEAD_RY = 4.95;
const HEAD_ROT = -22;
const STEM_DX = 6.45;
const STEM_H = 40;
const BEAM_W = 4.1;
const BEAM_GAP = 5;
const PRINT = "Figtree, sans-serif";
const SCRIPT = "Segoe Script, Bradley Hand, Snell Roundhand, cursive";

export function parseTime(time) {
  const [n, d] = String(time || "4/4").split("/").map(Number);
  return { n: n || 4, d: d || 4 };
}

export function stepsFromTime(time, bars = 1) {
  const { n, d } = parseTime(time);
  return bars * n * (16 / d);
}

function pulseFromTime(time) {
  const { n, d } = parseTime(time);
  if (d === 8 && n % 3 === 0) return 6;
  if (d === 2) return 8;
  return 4;
}

function beamsFor(nt) {
  if (!nt || nt.rest || nt.whole || (nt.dur || 0) >= 16) return 0;
  if (nt.beams != null) return nt.beams;
  if (nt.tuplet) return nt.dur <= 1.2 ? 2 : 1;
  if (nt.dur <= 0.5) return 3;
  if (nt.dur <= 1) return 2;
  if (nt.dur <= 2) return 1;
  return 0;
}

function beamGroups(notes, pulse = 4) {
  const groups = [];
  let cur = [];
  const flush = () => {
    if (cur.length) groups.push(cur);
    cur = [];
  };
  notes.forEach((nt) => {
    if (nt.rest || beamsFor(nt) === 0) {
      flush();
      return;
    }
    if (cur.length) {
      const sameG = nt.g != null && cur[0].g != null && nt.g === cur[0].g;
      const beat = Math.floor(nt.t / pulse + 1e-6);
      const curBeat = Math.floor(cur[0].t / pulse + 1e-6);
      if (nt.g != null || cur[0].g != null) {
        if (!sameG) flush();
      } else if (beat !== curBeat) flush();
    }
    cur.push(nt);
  });
  flush();
  return groups.filter((g) => g.length >= 2);
}

function flipHand(h) {
  if (!h) return h;
  return String(h).replace(/R/g, "x").replace(/L/g, "R").replace(/x/g, "L");
}

function withDrag(tok, nt) {
  const main = tok || nt.hand || "";
  if (!nt.drag) return main;
  const d = String(nt.drag);
  const s = String(main);
  if (s.startsWith(d + d)) return s;
  return d + d + s;
}

function PercClef({ x, y }) {
  return (
    <g fill={INK} stroke="none">
      <rect x={x} y={y - 16} width={4.2} height={32} rx={0.4} />
      <rect x={x + 9} y={y - 16} width={4.2} height={32} rx={0.4} />
    </g>
  );
}

function TimeSig({ x, y, n, d }) {
  if (n === 2 && d === 2) {
    return (
      <g fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round">
        <path d={`M ${x + 8} ${y - 13} C ${x - 8} ${y - 13}, ${x - 9} ${y}, ${x + 8} ${y + 13}`} />
        <line x1={x} y1={y - 17} x2={x} y2={y + 17} strokeWidth="1.9" />
      </g>
    );
  }
  return (
    <g fill={INK} stroke="none" fontFamily="Oswald, sans-serif" fontWeight="700" textAnchor="middle">
      <text x={x} y={y - 1} fontSize="22">{n}</text>
      <text x={x} y={y + 21} fontSize="22">{d}</text>
    </g>
  );
}

function Rest({ x, y, dur }) {
  if (dur >= 4) return <rect x={x - 5.5} y={y - 8} width={11} height={5} fill={INK} />;
  if (dur >= 2) {
    return <path d={`M ${x - 1} ${y - 9} C ${x + 8} ${y - 6} ${x + 7} ${y + 3} ${x - 1} ${y + 8}`} stroke={INK} strokeWidth={1.55} fill="none" />;
  }
  return (
    <g fill={INK} stroke={INK}>
      <path d={`M ${x - 1} ${y - 11} C ${x + 8} ${y - 8} ${x + 7} ${y + 1} ${x - 1} ${y + 6}`} strokeWidth={1.45} fill="none" />
      <ellipse cx={x + 2.8} cy={y - 9.5} rx={3} ry={2} transform={`rotate(-28 ${x + 2.8} ${y - 9.5})`} stroke="none" />
    </g>
  );
}

function Tremolo({ sx, y0, y1, count }) {
  const mid = (y0 + y1) / 2 + 1;
  const span = 14.5;
  const ang = (-32 * Math.PI) / 180;
  const dx = Math.cos(ang) * (span / 2);
  const dy = Math.sin(ang) * (span / 2);
  const step = 4.35;
  const start = mid - ((count - 1) * step) / 2;
  return (
    <g stroke={INK} strokeWidth={2.45} strokeLinecap="butt">
      {Array.from({ length: count }, (_, k) => {
        const cy = start + k * step;
        return <line key={k} x1={sx - dx} y1={cy - dy} x2={sx + dx} y2={cy + dy} />;
      })}
    </g>
  );
}

function WholeHead({ x, y, ink }) {
  return (
    <path
      fill={ink}
      fillRule="evenodd"
      stroke="none"
      d={`M ${x - 8.2} ${y}
        C ${x - 8.2} ${y - 5}, ${x - 4.6} ${y - 4.8}, ${x} ${y - 4.8}
        C ${x + 4.6} ${y - 4.8}, ${x + 8.2} ${y - 5}, ${x + 8.2} ${y}
        C ${x + 8.2} ${y + 5}, ${x + 4.6} ${y + 4.8}, ${x} ${y + 4.8}
        C ${x - 4.6} ${y + 4.8}, ${x - 8.2} ${y + 5}, ${x - 8.2} ${y} Z
        M ${x - 4.4} ${y}
        C ${x - 4.4} ${y - 4}, ${x - 2.5} ${y - 3.9}, ${x} ${y - 3.9}
        C ${x + 2.5} ${y - 3.9}, ${x + 4.4} ${y - 4}, ${x + 4.4} ${y}
        C ${x + 4.4} ${y + 4}, ${x + 2.5} ${y + 3.9}, ${x} ${y + 3.9}
        C ${x - 2.5} ${y + 3.9}, ${x - 4.4} ${y + 4}, ${x - 4.4} ${y} Z`}
    />
  );
}

function Accent({ x, y }) {
  return (
    <path
      d={`M ${x - 4.8} ${y - 3.4} L ${x + 5.1} ${y} L ${x - 4.8} ${y + 3.4}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.55}
      strokeLinejoin="miter"
      strokeLinecap="butt"
    />
  );
}

function Flag({ x, y, extra, scale = 1 }) {
  const s = scale;
  const body = (oy) => {
    const t = y + oy * s;
    return `M ${x} ${t}
      C ${x + 1.1 * s} ${t + 0.15 * s}, ${x + 12.2 * s} ${t + 2.4 * s}, ${x + 15.4 * s} ${t + 13.6 * s}
      C ${x + 16.8 * s} ${t + 19.8 * s}, ${x + 14.2 * s} ${t + 26.4 * s}, ${x + 11.2 * s} ${t + 31.2 * s}
      C ${x + 14.6 * s} ${t + 23.2 * s}, ${x + 13.4 * s} ${t + 13.2 * s}, ${x} ${t + 7.2 * s}
      Z`;
  };
  return (
    <g fill={INK} stroke="none">
      <path d={body(0)} />
      {extra ? <path d={body(6.4)} /> : null}
    </g>
  );
}

function SlimFlag({ x, y, extra }) {
  const body = (oy) => {
    const t = y + oy;
    return `M ${x} ${t}
      C ${x + 0.2} ${t + 0.05}, ${x + 4.2} ${t + 0.85}, ${x + 4.85} ${t + 6.4}
      C ${x + 5.25} ${t + 9.4}, ${x + 4.15} ${t + 12.8}, ${x + 2.95} ${t + 15.1}
      C ${x + 4.55} ${t + 10.6}, ${x + 4.15} ${t + 5.2}, ${x} ${t + 3.05}
      Z`;
  };
  return (
    <g fill={INK} stroke="none">
      <path d={body(0)} />
      {extra ? <path d={body(4.4)} /> : null}
    </g>
  );
}

function FlamGrace({ x, y }) {
  const hx = x - 13.6;
  const hy = y + 2.6;
  const sx = hx + 2.7;
  const top = hy - 18;
  return (
    <g stroke={INK} fill={INK}>
      <ellipse cx={hx} cy={hy} rx={3.35} ry={2.25} stroke="none" transform={`rotate(${HEAD_ROT} ${hx} ${hy})`} />
      <line x1={sx} y1={hy - 1.1} x2={sx} y2={top} strokeWidth={0.95} fill="none" />
      <SlimFlag x={sx} y={top} />
      <line x1={sx - 3.8} y1={top + 8.4} x2={sx + 5.2} y2={top + 1.3} strokeWidth={1.05} fill="none" strokeLinecap="round" />
    </g>
  );
}

function DragGrace({ x, y }) {
  const hy = y + 2;
  const g1 = x - 22;
  const g2 = x - 13.6;
  const rx = 3.15;
  const ry = 2.15;
  const sx1 = g1 + 2.6;
  const sx2 = g2 + 2.6;
  const top = hy - 17.5;
  return (
    <g stroke={INK} fill={INK}>
      <ellipse cx={g1} cy={hy} rx={rx} ry={ry} stroke="none" transform={`rotate(${HEAD_ROT} ${g1} ${hy})`} />
      <ellipse cx={g2} cy={hy} rx={rx} ry={ry} stroke="none" transform={`rotate(${HEAD_ROT} ${g2} ${hy})`} />
      <line x1={sx1} y1={hy - 1.1} x2={sx1} y2={top} strokeWidth={1} fill="none" />
      <line x1={sx2} y1={hy - 1.1} x2={sx2} y2={top} strokeWidth={1} fill="none" />
      <line x1={sx1} y1={top} x2={sx2} y2={top} strokeWidth={1.7} />
      <line x1={sx1} y1={top + 2.4} x2={sx2} y2={top + 2.4} strokeWidth={1.7} />
    </g>
  );
}

function StickLine({ x, x2, y, text, flam, handwritten }) {
  if (!text && !flam) return null;
  const letters = String(text || "").split("").filter(Boolean);
  const long = letters.length > 3;
  const font = handwritten ? SCRIPT : PRINT;
  if (!long) {
    return (
      <g stroke="none" fontFamily={font}>
        {flam ? (
          <text x={x - 12} y={y} textAnchor="middle" fontSize="16" fontWeight="800" fill={flam === "R" ? RCOL : LCOL}>
            {flam}
          </text>
        ) : null}
        <text x={x + (flam ? 5 : 0)} y={y} textAnchor="middle" fontSize={handwritten ? 24 : 23} fontWeight="800">
          {letters.map((ch, i) => (
            <tspan key={i} fill={ch === "R" ? RCOL : ch === "L" ? LCOL : INK}>{ch}</tspan>
          ))}
        </text>
      </g>
    );
  }
  const right = x2 != null && x2 > x ? x2 : x + Math.max(56, letters.length * 9);
  return (
    <g stroke="none" fontFamily={font}>
      {letters.map((ch, i) => {
        const t = letters.length === 1 ? 0 : i / (letters.length - 1);
        const xx = x + t * (right - x);
        return (
          <text key={i} x={xx} y={y} textAnchor="middle" fontSize={handwritten ? 22 : 21} fontWeight="800" fill={ch === "R" ? RCOL : ch === "L" ? LCOL : INK}>
            {ch}
          </text>
        );
      })}
    </g>
  );
}

export function RudimentStaff({ rud, playingT = -1, handwritten, svgId, hideTime = false }) {
  const notes = rud.notes || [];
  const sounded = notes.filter((nt) => !nt.rest);
  const minDur = sounded.reduce((m, nt) => Math.min(m, nt.dur || 1), 4);
  const steps = stepsFromTime(rud.time, rud.bars || 1);
  const pulse = pulseFromTime(rud.time);
  const ornamented = notes.some((nt) => nt.flam || nt.drag);
  const quarterW = hideTime ? (ornamented ? 118 : minDur <= 0.5 ? 110 : 114) : (ornamented ? 152 : minDur <= 0.5 ? 144 : 140);
  const stepW = quarterW / 4;
  const x0 = hideTime ? 46 : 88;
  const pack = hideTime ? 0.7 : 1;
  const cluster = 8;
  const soloWhole = sounded.length === 1 && !!(sounded[0].whole || (sounded[0].dur >= 8 && sounded[0].roll));
  const w = x0 + Math.max(steps * stepW, soloWhole ? 240 : 0) + 18;
  const y = 62;
  const lineGap = 12.5;
  const ny = y - lineGap / 2;
  const h0 = y + 2 * lineGap + 38;
  const viewH = 196;
  const groups = beamGroups(notes, pulse);
  const beamed = new Set();
  groups.forEach((g) => g.forEach((note) => beamed.add(note)));
  const near = (a, b) => Math.abs(a - b) < 0.05;
  const stemX = (x) => x + STEM_DX;
  const stemTop = ny - STEM_H;
  const primary = rud.sticking && rud.sticking[0];
  const parsed = parseTime(rud.time);
  const slotW = cluster * stepW;
  const noteX = (nt) => {
    if (soloWhole) return x0 + (Math.max(steps * stepW, 240) / 2);
    if (pack >= 0.99) return x0 + nt.t * stepW;
    const g = Math.floor(nt.t / cluster + 1e-6);
    const local = nt.t - g * cluster;
    const inner = slotW * pack;
    const inset = (slotW - inner) / 2;
    return x0 + g * slotW + inset + local * stepW * pack;
  };
  const barX = (t16) => x0 + t16 * stepW;
  const tokenAt = (row, i, nt) => {
    if (!row) return nt.hand;
    if (Array.isArray(row)) return row[i];
    return row[i];
  };
  const endXFor = (i) => {
    if (i + 1 < sounded.length) return noteX(sounded[i + 1]);
    return noteX(sounded[i]) + stepW * 2;
  };

  return (
    <svg id={svgId} viewBox={`0 0 ${w} ${viewH}`} width="100%" role="img" aria-label={rud.label}>
      <g stroke={INK} fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={16} y1={y + i * lineGap} x2={w - 10} y2={y + i * lineGap} strokeWidth={1.25} />
        ))}
        <line x1={16} y1={y - 2 * lineGap} x2={16} y2={y + 2 * lineGap} strokeWidth={2.3} />
        <line x1={w - 10} y1={y - 2 * lineGap} x2={w - 10} y2={y + 2 * lineGap} strokeWidth={2.3} />
        {Array.from({ length: Math.max(0, (rud.bars || 1) - 1) }, (_, i) => {
          const bx = barX((i + 1) * parsed.n * (16 / parsed.d));
          return <line key={`bar-${i}`} x1={bx} y1={y - 2 * lineGap} x2={bx} y2={y + 2 * lineGap} strokeWidth={1.6} />;
        })}
        {pulse === 6 ? (
          <line x1={barX(6)} y1={y - 2 * lineGap} x2={barX(6)} y2={y + 2 * lineGap} strokeWidth={0.7} strokeDasharray="2 3" />
        ) : null}
        <PercClef x={20} y={y} />
        {hideTime ? null : <TimeSig x={54} y={y} n={parsed.n} d={parsed.d} />}
        {notes.map((nt, i) => {
          const x = noteX(nt);
          if (nt.rest) return <g key={i}><Rest x={x} y={ny} dur={nt.dur} /></g>;
          const on = near(playingT, nt.t);
          const sx = stemX(x);
          const ink = on ? GOLD : INK;
          const whole = nt.whole || nt.dur >= 16;
          const accY = beamed.has(nt) || nt.roll ? stemTop - (nt.roll ? 12 : 8) : stemTop - 8;
          const next = notes.slice(i + 1).find((nn) => !nn.rest);
          const x2 = next ? noteX(next) : x;
          return (
            <g key={i}>
              {nt.flam && <FlamGrace x={x} y={ny} />}
              {nt.drag && <DragGrace x={x} y={ny} />}
              {whole ? (
                <WholeHead x={x} y={ny} ink={ink} />
              ) : (
                <ellipse
                  cx={x}
                  cy={ny}
                  rx={HEAD_RX}
                  ry={HEAD_RY}
                  fill={ink}
                  stroke={ink}
                  strokeWidth={0.4}
                  transform={`rotate(${HEAD_ROT} ${x} ${ny})`}
                />
              )}
              {(nt.dur === 3 || nt.dur === 6 || nt.dot) && <circle cx={x + 10.4} cy={ny + 0.6} r={1.7} fill={INK} stroke="none" />}
              {!whole && <line x1={sx} y1={ny - 2.8} x2={sx} y2={stemTop} stroke={ink} strokeWidth={1.6} />}
              {nt.roll ? <Tremolo sx={whole ? x : sx} y0={whole ? ny - 26 : ny - 6} y1={whole ? ny - 10 : stemTop + 2} count={nt.roll} /> : null}
              {nt.acc && <Accent x={x + 1} y={whole ? ny - 34 : accY} />}
              {!whole && !beamed.has(nt) && !nt.roll && beamsFor(nt) >= 1 && <Flag x={sx} y={stemTop} extra={beamsFor(nt) >= 2} />}
              {nt.tie && next && (
                <path
                  d={`M ${x + 6} ${ny + 10} C ${x + 14} ${ny + 20}, ${x2 - 14} ${ny + 20}, ${x2 - 6} ${ny + 10}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.25}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
        {sounded.map((nt, i) => {
          const x = noteX(nt);
          const top = withDrag(tokenAt(primary, i, nt), nt);
          const flamTop = nt.flam ? String(nt.flam) : null;
          const xEnd = String(top || "").length > 3 ? endXFor(i) : x;
          return (
            <g key={`h-${i}`}>
              <StickLine x={x} x2={xEnd} y={h0} text={top} flam={flamTop} handwritten={handwritten} />
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const xs = g.map((nn) => stemX(noteX(nn)));
          const y0 = stemTop;
          const sl = Math.min(1.6, (xs[xs.length - 1] - xs[0]) * 0.01);
          const yAt = (xx) => y0 + ((xx - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])) * sl;
          const maxB = Math.max(...g.map((nn) => beamsFor(nn)));
          const layers = [];
          for (let b = 0; b < maxB; b++) {
            g.forEach((nn, i) => {
              if (beamsFor(nn) <= b) return;
              if (i > 0 && beamsFor(g[i - 1]) > b) return;
              const yy = (xx) => yAt(xx) + b * BEAM_GAP;
              if (i < g.length - 1 && beamsFor(g[i + 1]) > b) {
                let j = i;
                while (j < g.length - 1 && beamsFor(g[j + 1]) > b) j++;
                layers.push(
                  <line key={`${gi}-${b}-${i}`} x1={xs[i]} y1={yy(xs[i])} x2={xs[j]} y2={yy(xs[j])} strokeWidth={BEAM_W} />
                );
              } else {
                const neighborX = i > 0 ? xs[i - 1] : (xs[i + 1] ?? xs[i] + stepW);
                const inward = i > 0 ? -1 : 1;
                const hook = Math.min(Math.abs(neighborX - xs[i]) * 0.45, stepW * 0.65);
                layers.push(
                  <line key={`${gi}-${b}-${i}`} x1={xs[i]} y1={yy(xs[i])} x2={xs[i] + inward * hook} y2={yy(xs[i])} strokeWidth={BEAM_W} />
                );
              }
            });
          }
          if (g[0].tuplet) {
            const mid = (xs[0] + xs[xs.length - 1]) / 2;
            const label = g[0].tuplet === 6 ? "(6)" : String(g[0].tuplet);
            layers.push(
              <text key={`${gi}-tup`} x={mid} y={y0 - 14} textAnchor="middle" fontSize="17" fontWeight="800" fill={INK} stroke="none">
                {label}
              </text>
            );
          }
          return <g key={gi}>{layers}</g>;
        })}
      </g>
    </svg>
  );
}

export { INK, GOLD };
