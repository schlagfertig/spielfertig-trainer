const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

const HEAD_RX = 5.15;
const HEAD_RY = 3.4;
const HEAD_ROT = -22;
const STEM_DX = 4.55;
const STEM_H = 31;
const BEAM_W = 3.2;
const BEAM_GAP = 4.05;

export function parseTime(time) {
  const [n, d] = String(time || "4/4").split("/").map(Number);
  return { n: n || 4, d: d || 4 };
}

export function stepsFromTime(time, bars = 1) {
  const { n, d } = parseTime(time);
  return bars * n * (16 / d);
}

function beamsFor(nt) {
  if (!nt || nt.rest) return 0;
  if (nt.beams != null) return nt.beams;
  if (nt.tuplet) return nt.dur <= 1.2 ? 2 : 1;
  if (nt.dur <= 0.5) return 3;
  if (nt.dur <= 1) return 2;
  if (nt.dur <= 2) return 1;
  return 0;
}

function beamGroups(notes) {
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
      const beat = Math.floor(nt.t / 4 + 1e-6);
      const curBeat = Math.floor(cur[0].t / 4 + 1e-6);
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

function PercClef({ x, y }) {
  return (
    <g fill={INK} stroke="none">
      <rect x={x} y={y - 12} width={3.4} height={24} rx={0.4} />
      <rect x={x + 7.2} y={y - 12} width={3.4} height={24} rx={0.4} />
    </g>
  );
}

function TimeSig({ x, y, gap, time }) {
  const { n, d } = parseTime(time);
  return (
    <g fill={INK} stroke="none" textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700">
      <text x={x} y={y - gap} fontSize="19">{n}</text>
      <text x={x} y={y + gap} fontSize="19">{d}</text>
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

function Accent({ x, y }) {
  return <path d={`M ${x - 5.6} ${y} L ${x + 5.6} ${y} L ${x} ${y + 3.9} Z`} fill={INK} stroke="none" />;
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
  const hx = x - 11.2;
  const hy = y + 2.4;
  const sx = hx + 2.3;
  const top = hy - 15.5;
  return (
    <g stroke={INK} fill={INK}>
      <ellipse cx={hx} cy={hy} rx={2.7} ry={1.85} stroke="none" transform={`rotate(${HEAD_ROT} ${hx} ${hy})`} />
      <line x1={sx} y1={hy - 1.1} x2={sx} y2={top} strokeWidth={0.9} fill="none" />
      <SlimFlag x={sx} y={top} />
      <line x1={sx - 3.8} y1={top + 8.4} x2={sx + 5.2} y2={top + 1.3} strokeWidth={1.05} fill="none" strokeLinecap="round" />
    </g>
  );
}

function DragGrace({ x, y }) {
  const hy = y + 1.8;
  const g1 = x - 20.4;
  const g2 = x - 12.6;
  const rx = 2.7;
  const ry = 1.85;
  const sx1 = g1 + 2.4;
  const sx2 = g2 + 2.4;
  const top = hy - 16.5;
  return (
    <g stroke={INK} fill={INK}>
      <ellipse cx={g1} cy={hy} rx={rx} ry={ry} stroke="none" transform={`rotate(${HEAD_ROT} ${g1} ${hy})`} />
      <ellipse cx={g2} cy={hy} rx={rx} ry={ry} stroke="none" transform={`rotate(${HEAD_ROT} ${g2} ${hy})`} />
      <line x1={sx1} y1={hy - 1.2} x2={sx1} y2={top} strokeWidth={0.9} fill="none" />
      <line x1={sx2} y1={hy - 1.2} x2={sx2} y2={top} strokeWidth={0.9} fill="none" />
      <SlimFlag x={sx1} y={top} extra />
      <SlimFlag x={sx2} y={top} extra />
      <path
        d={`M ${g1 - 1} ${hy - 8} C ${g1 + 5} ${top - 7}, ${x - 6} ${top - 5}, ${x - 1} ${y - 8}`}
        fill="none"
        strokeWidth={1.15}
        strokeLinecap="round"
      />
    </g>
  );
}

function StickLine({ x, y, text, flam }) {
  if (!text && !flam) return null;
  const letters = String(text || "");
  const long = letters.length > 2;
  const fs = long ? 8.5 : 12;
  return (
    <g stroke="none">
      {flam ? (
        <text x={x - (long ? 0 : 8)} y={y} textAnchor="middle" fontSize="8" fontWeight="700" fill={flam === "R" ? RCOL : LCOL}>
          {flam}
        </text>
      ) : null}
      <text x={x + (flam && !long ? 4 : 0)} y={y} textAnchor="middle" fontSize={fs} fontWeight="700">
        {letters.split("").map((ch, i) => (
          <tspan key={i} fill={ch === "R" ? RCOL : ch === "L" ? LCOL : INK}>{ch}</tspan>
        ))}
      </text>
    </g>
  );
}

export function RudimentStaff({ rud, playingT = -1, handwritten, svgId }) {
  const notes = rud.notes || [];
  const sounded = notes.filter((nt) => !nt.rest);
  const minDur = sounded.reduce((m, nt) => Math.min(m, nt.dur || 1), 4);
  const steps = stepsFromTime(rud.time, rud.bars || 1);
  const ornamented = notes.some((nt) => nt.flam || nt.drag);
  const quarterW = ornamented ? 152 : minDur <= 0.5 ? 144 : 140;
  const stepW = quarterW / 4;
  const x0 = 108;
  const w = x0 + steps * stepW + 28;
  const y = 60;
  const lineGap = 8;
  const ny = y - lineGap / 2;
  const rows = rud.sticking && rud.sticking[1] ? 2 : 1;
  const longStick = (rud.sticking || []).some((row) => String(row).length > 8 || (Array.isArray(row) && row.some((s) => String(s).length > 2)));
  const h0 = y + 2 * lineGap + 18;
  const viewH = rows === 2 ? (longStick ? 176 : 168) : 148;
  const groups = beamGroups(notes);
  const beamed = new Set();
  groups.forEach((g) => g.forEach((n) => beamed.add(n)));
  const near = (a, b) => Math.abs(a - b) < 0.05;
  const stemX = (x) => x + STEM_DX;
  const stemTop = ny - STEM_H;
  const primary = rud.sticking && rud.sticking[0];
  const secondary = rud.sticking && rud.sticking[1];
  const { n: beats } = parseTime(rud.time);
  const barW = beats * (16 / parseTime(rud.time).d) * stepW;
  const tokenAt = (row, i, nt) => {
    if (!row) return nt.hand;
    if (Array.isArray(row)) return row[i];
    return row[i];
  };

  return (
    <svg id={svgId} viewBox={`0 0 ${w} ${viewH}`} width="100%" role="img" aria-label={rud.label}>
      <g stroke={INK} fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={22} y1={y + i * lineGap} x2={w - 16} y2={y + i * lineGap} strokeWidth={1.05} />
        ))}
        <line x1={22} y1={y - 2 * lineGap} x2={22} y2={y + 2 * lineGap} strokeWidth={2} />
        <line x1={w - 16} y1={y - 2 * lineGap} x2={w - 16} y2={y + 2 * lineGap} strokeWidth={2} />
        {Array.from({ length: Math.max(0, (rud.bars || 1) - 1) }, (_, i) => {
          const bx = x0 + (i + 1) * barW;
          return <line key={`bar-${i}`} x1={bx} y1={y - 2 * lineGap} x2={bx} y2={y + 2 * lineGap} strokeWidth={1.35} />;
        })}
        <PercClef x={28} y={y} />
        <TimeSig x={58} y={y} gap={lineGap} time={rud.time || "4/4"} />
        {notes.map((nt, i) => {
          const x = x0 + nt.t * stepW;
          if (nt.rest) return <g key={i}><Rest x={x} y={ny} dur={nt.dur} /></g>;
          const on = near(playingT, nt.t);
          const sx = stemX(x);
          const ink = on ? GOLD : INK;
          const accY = beamed.has(nt) || nt.roll ? stemTop - (nt.roll ? 11 : 7) : stemTop - 7;
          const next = notes.slice(i + 1).find((n) => !n.rest);
          const x2 = next ? x0 + next.t * stepW : x;
          return (
            <g key={i}>
              {nt.flam && <FlamGrace x={x} y={ny} />}
              {nt.drag && <DragGrace x={x} y={ny} />}
              <ellipse
                cx={x}
                cy={ny}
                rx={HEAD_RX}
                ry={HEAD_RY}
                fill={ink}
                stroke={ink}
                strokeWidth={0.35}
                transform={`rotate(${HEAD_ROT} ${x} ${ny})`}
              />
              {(nt.dur === 3 || nt.dur === 6 || nt.dot) && <circle cx={x + 8.6} cy={ny + 0.6} r={1.45} fill={INK} stroke="none" />}
              <line x1={sx} y1={ny - 2.15} x2={sx} y2={stemTop} stroke={ink} strokeWidth={1.35} />
              {nt.roll ? <Tremolo sx={sx} y0={ny - 6} y1={stemTop + 2} count={nt.roll} /> : null}
              {nt.acc && <Accent x={x + 1} y={accY} />}
              {!beamed.has(nt) && !nt.roll && beamsFor(nt) >= 1 && <Flag x={sx} y={stemTop} extra={beamsFor(nt) >= 2} />}
              {nt.tie && next && (
                <path
                  d={`M ${x + 6} ${ny + 9} C ${x + 14} ${ny + 18}, ${x2 - 14} ${ny + 18}, ${x2 - 6} ${ny + 9}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
        {sounded.map((nt, i) => {
          const x = x0 + nt.t * stepW;
          const top = tokenAt(primary, i, nt);
          const bot = secondary ? tokenAt(secondary, i, nt) : null;
          const flamTop = nt.flam ? String(nt.flam) : null;
          const flamBot = flamTop ? flipHand(flamTop) : null;
          return (
            <g key={`h-${i}`}>
              <StickLine x={x} y={h0} text={top} flam={flamTop} />
              {bot ? <StickLine x={x} y={h0 + 16} text={bot} flam={flamBot} /> : null}
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const xs = g.map((n) => stemX(x0 + n.t * stepW));
          const y0 = stemTop;
          const sl = Math.min(1.6, (xs[xs.length - 1] - xs[0]) * 0.01);
          const yAt = (x) => y0 + ((x - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])) * sl;
          const maxB = Math.max(...g.map((n) => beamsFor(n)));
          const layers = [];
          for (let b = 0; b < maxB; b++) {
            g.forEach((n, i) => {
              if (beamsFor(n) <= b) return;
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
            layers.push(
              <text key={`${gi}-tup`} x={mid} y={y0 - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK} stroke="none">
                {g[0].tuplet}
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
