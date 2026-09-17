const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

const HEAD_RX = 5.15;
const HEAD_RY = 3.4;
const HEAD_ROT = -22;
const STEM_DX = 4.55;
const STEM_H = 31;
const BEAM_W = 2.35;
const BEAM_GAP = 3.55;

function beamsFor(nt) {
  if (!nt || nt.rest) return 0;
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

function PercClef({ x, y }) {
  return (
    <g fill={INK} stroke="none">
      <rect x={x} y={y - 12} width={3.4} height={24} rx={0.4} />
      <rect x={x + 7.2} y={y - 12} width={3.4} height={24} rx={0.4} />
    </g>
  );
}

function TimeSig({ x, y, time }) {
  const [n, d] = String(time || "4/4").split("/");
  return (
    <g fill={INK} stroke="none" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700">
      <text x={x} y={y - 1} fontSize="17">{n}</text>
      <text x={x} y={y + 15} fontSize="17">{d}</text>
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
  const span = 13.5;
  const ang = (-30 * Math.PI) / 180;
  const dx = Math.cos(ang) * (span / 2);
  const dy = Math.sin(ang) * (span / 2);
  const step = 4.15;
  const start = mid - ((count - 1) * step) / 2;
  return (
    <g stroke={INK} strokeWidth={2.15} strokeLinecap="butt">
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

function Flag({ x, y, extra }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={1.35} strokeLinecap="round">
      <path d={`M ${x} ${y} C ${x + 10} ${y + 1.5}, ${x + 12} ${y + 11}, ${x + 5.5} ${y + 16.5}`} />
      {extra ? <path d={`M ${x} ${y + 5} C ${x + 9} ${y + 6.5}, ${x + 10.5} ${y + 14}, ${x + 5} ${y + 17.5}`} /> : null}
    </g>
  );
}

function Hand({ x, y, h }) {
  if (!h) return null;
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="12" fontWeight="700" fill={h === "R" ? RCOL : LCOL} stroke="none">
      {h}
    </text>
  );
}

export function RudimentStaff({ rud, playingT = -1, handwritten, svgId }) {
  const notes = rud.notes || [];
  const sounded = notes.filter((nt) => !nt.rest);
  const minDur = sounded.reduce((m, nt) => Math.min(m, nt.dur || 1), 4);
  const lastT = notes.reduce((m, nt) => Math.max(m, nt.t + (nt.dur || 0)), 8);
  const steps = Math.max(8, Math.ceil(lastT + 0.25));
  const stepW = minDur <= 0.5 ? 26 : 23;
  const x0 = 78;
  const w = x0 + steps * stepW + 36;
  const y = 60;
  const lineGap = 8;
  const rows = rud.sticking && rud.sticking[1] ? 2 : 1;
  const h0 = y + 2 * lineGap + 18;
  const viewH = rows === 2 ? 168 : 148;
  const groups = beamGroups(notes);
  const beamed = new Set();
  groups.forEach((g) => g.forEach((n) => beamed.add(n)));
  const near = (a, b) => Math.abs(a - b) < 0.05;
  const stemX = (x) => x + STEM_DX;
  const stemTop = y - STEM_H;
  const primary = rud.sticking && rud.sticking[0];
  const secondary = rud.sticking && rud.sticking[1];

  return (
    <svg id={svgId} viewBox={`0 0 ${w} ${viewH}`} width="100%" role="img" aria-label={rud.label}>
      <g stroke={INK} fill="none" strokeLinecap="butt" strokeLinejoin="miter">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={22} y1={y + i * lineGap} x2={w - 16} y2={y + i * lineGap} strokeWidth={1.05} />
        ))}
        <line x1={22} y1={y - 2 * lineGap} x2={22} y2={y + 2 * lineGap} strokeWidth={2} />
        <line x1={w - 16} y1={y - 2 * lineGap} x2={w - 16} y2={y + 2 * lineGap} strokeWidth={2} />
        <PercClef x={28} y={y} />
        <TimeSig x={56} y={y} time={rud.time || "4/4"} />
        {notes.map((nt, i) => {
          const x = x0 + nt.t * stepW;
          if (nt.rest) return <g key={i}><Rest x={x} y={y} dur={nt.dur} /></g>;
          const on = near(playingT, nt.t);
          const sx = stemX(x);
          const ink = on ? GOLD : INK;
          const accY = beamed.has(nt) || nt.roll ? stemTop - (nt.roll ? 11 : 7) : stemTop - 7;
          return (
            <g key={i}>
              {nt.flam && (
                <g>
                  <ellipse cx={x - 13} cy={y + 2.4} rx={3.15} ry={2.15} fill={INK} stroke="none" transform={`rotate(${HEAD_ROT} ${x - 13} ${y + 2.4})`} />
                  <line x1={x - 10.2} y1={y + 0.6} x2={x - 10.2} y2={y - 11} strokeWidth={1.05} />
                  <path d={`M ${x - 10.2} ${y - 11} C ${x - 4} ${y - 10}, ${x - 3.2} ${y - 4.5}, ${x - 7.2} ${y - 2}`} strokeWidth={1.05} />
                </g>
              )}
              {nt.drag && (
                <g fill={INK} stroke="none">
                  <ellipse cx={x - 16.2} cy={y + 2.2} rx={2.95} ry={2.05} transform={`rotate(${HEAD_ROT} ${x - 16.2} ${y + 2.2})`} />
                  <ellipse cx={x - 10.4} cy={y + 2.2} rx={2.95} ry={2.05} transform={`rotate(${HEAD_ROT} ${x - 10.4} ${y + 2.2})`} />
                </g>
              )}
              <ellipse
                cx={x}
                cy={y}
                rx={HEAD_RX}
                ry={HEAD_RY}
                fill={ink}
                stroke={ink}
                strokeWidth={0.35}
                transform={`rotate(${HEAD_ROT} ${x} ${y})`}
              />
              {nt.dur === 3 && <circle cx={x + 8.6} cy={y + 0.6} r={1.45} fill={INK} stroke="none" />}
              <line x1={sx} y1={y - 2.15} x2={sx} y2={stemTop} stroke={ink} strokeWidth={1.25} />
              {nt.roll ? <Tremolo sx={sx} y0={y - 6} y1={stemTop + 2} count={nt.roll} /> : null}
              {nt.acc && <Accent x={x + 1} y={accY} />}
              {!beamed.has(nt) && beamsFor(nt) >= 1 && <Flag x={sx} y={stemTop} extra={beamsFor(nt) >= 2} />}
            </g>
          );
        })}
        {sounded.map((nt, i) => {
          const x = x0 + nt.t * stepW;
          const top = primary ? primary[i] : nt.hand;
          const bot = secondary ? secondary[i] : null;
          return (
            <g key={`h-${i}`}>
              <Hand x={x} y={h0} h={top} />
              {bot ? <Hand x={x} y={h0 + 16} h={bot} /> : null}
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
