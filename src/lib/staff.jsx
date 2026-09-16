const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

function beamsFor(dur) {
  if (dur <= 0.5) return 3;
  if (dur <= 1) return 2;
  if (dur <= 2) return 1;
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
    if (nt.dur >= 2) {
      flush();
      return;
    }
    const beat = Math.floor(nt.t / 4 + 1e-6);
    if (cur.length && Math.floor(cur[0].t / 4 + 1e-6) !== beat) flush();
    cur.push(nt);
  });
  flush();
  return groups.filter((g) => g.length >= 2);
}

function PercClef({ x, y }) {
  return (
    <g>
      <rect x={x} y={y - 14} width={4.2} height={28} fill={INK} />
      <rect x={x + 8} y={y - 14} width={4.2} height={28} fill={INK} />
    </g>
  );
}

function TimeSig({ x, y, time }) {
  const [n, d] = String(time || "4/4").split("/");
  return (
    <g fill={INK} stroke="none" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700">
      <text x={x} y={y - 2} fontSize="16">{n}</text>
      <text x={x} y={y + 16} fontSize="16">{d}</text>
    </g>
  );
}

export function RudimentStaff({ rud, playingT = -1, handwritten, svgId }) {
  const notes = rud.notes || [];
  const bars = rud.bars || 1;
  const steps = bars * 16;
  const x0 = 78;
  const stepW = 18;
  const w = x0 + steps * stepW + 36;
  const y = 56;
  const stemH = 36;
  const lineGap = 8;
  const groups = beamGroups(notes);
  const beamed = new Set();
  groups.forEach((g) => g.forEach((n) => beamed.add(n)));
  const near = (a, b) => Math.abs(a - b) < 0.05;

  return (
    <svg id={svgId} viewBox={`0 0 ${w} 132`} width="100%" role="img" aria-label={rud.label}>
      <g stroke={INK} fill="none">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={22} y1={y + i * lineGap} x2={w - 16} y2={y + i * lineGap} strokeWidth={1.15} />
        ))}
        <line x1={22} y1={y - 2 * lineGap} x2={22} y2={y + 2 * lineGap} strokeWidth={2.2} />
        <line x1={w - 16} y1={y - 2 * lineGap} x2={w - 16} y2={y + 2 * lineGap} strokeWidth={2.2} />
        <PercClef x={28} y={y} />
        <TimeSig x={58} y={y} time={rud.time || "4/4"} />
        {notes.map((nt, i) => {
          const x = x0 + nt.t * stepW;
          const on = near(playingT, nt.t);
          const ey = y - stemH;
          return (
            <g key={i}>
              {nt.flam && (
                <g>
                  <ellipse cx={x - 11} cy={y + 2} rx={4} ry={3} fill={INK} transform={`rotate(-18 ${x - 11} ${y + 2})`} />
                  <line x1={x - 8} y1={y} x2={x - 3} y2={y - 10} strokeWidth={1.2} />
                </g>
              )}
              {nt.drag && (
                <g>
                  <ellipse cx={x - 15} cy={y + 2} rx={3.4} ry={2.5} fill={INK} transform={`rotate(-18 ${x - 15} ${y + 2})`} />
                  <ellipse cx={x - 9} cy={y + 2} rx={3.4} ry={2.5} fill={INK} transform={`rotate(-18 ${x - 9} ${y + 2})`} />
                </g>
              )}
              <ellipse cx={x} cy={y} rx={6} ry={4.4} fill={on ? GOLD : INK} stroke={on ? GOLD : INK} strokeWidth={1.1} transform={`rotate(-20 ${x} ${y})`} />
              {nt.dur === 3 && <circle cx={x + 9} cy={y + 1} r={1.7} fill={INK} />}
              {nt.roll ? Array.from({ length: nt.roll }, (_, k) => (
                <line key={k} x1={x - 5} y1={y - 10 - k * 4} x2={x + 5} y2={y - 16 - k * 4} strokeWidth={1.3} />
              )) : null}
              <line x1={x} y1={y - 5} x2={x} y2={ey} stroke={on ? GOLD : INK} strokeWidth={1.45} />
              {nt.acc && (
                <text x={x} y={ey - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK} stroke="none">></text>
              )}
              {!beamed.has(nt) && beamsFor(nt.dur) >= 1 && (
                <path d={`M ${x} ${ey} C ${x + 11} ${ey + 2}, ${x + 13} ${ey + 14}, ${x + 6} ${ey + 18}`} stroke={INK} strokeWidth={1.4} />
              )}
              {!beamed.has(nt) && beamsFor(nt.dur) >= 2 && (
                <path d={`M ${x} ${ey + 5} C ${x + 10} ${ey + 7}, ${x + 11} ${ey + 16}, ${x + 5} ${ey + 19}`} stroke={INK} strokeWidth={1.3} />
              )}
              <text x={x} y={y + 2 * lineGap + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill={nt.hand === "R" ? RCOL : LCOL} stroke="none">{nt.hand}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const xs = g.map((n) => x0 + n.t * stepW);
          const y0 = y - stemH;
          const y1 = y0 + Math.min(6, (xs[xs.length - 1] - xs[0]) * 0.04);
          const yAt = (x) => y0 + ((x - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])) * (y1 - y0);
          const maxB = Math.max(...g.map((n) => beamsFor(n.dur)));
          const layers = [];
          for (let b = 0; b < maxB; b++) {
            const thick = b === 0 ? 3.1 : 2.15;
            const gap = 5;
            g.forEach((n, i) => {
              if (beamsFor(n.dur) <= b) return;
              const left = i > 0 && beamsFor(g[i - 1].dur) > b;
              const right = i < g.length - 1 && beamsFor(g[i + 1].dur) > b;
              if (left) return;
              if (right) {
                let j = i;
                while (j < g.length - 1 && beamsFor(g[j + 1].dur) > b) j++;
                layers.push(
                  <line key={`${gi}-${b}-${i}`} x1={xs[i]} y1={yAt(xs[i]) + b * gap} x2={xs[j]} y2={yAt(xs[j]) + b * gap} strokeWidth={thick} />
                );
              } else {
                const neighborX = i > 0 ? xs[i - 1] : (xs[i + 1] ?? xs[i] + stepW);
                const inward = i > 0 ? -1 : 1;
                const hook = Math.abs(neighborX - xs[i]) * 0.5;
                layers.push(
                  <line key={`${gi}-${b}-${i}`} x1={xs[i]} y1={yAt(xs[i]) + b * gap} x2={xs[i] + inward * hook} y2={yAt(xs[i]) + b * gap} strokeWidth={thick} />
                );
              }
            });
          }
          return <g key={gi}>{layers}</g>;
        })}
      </g>
    </svg>
  );
}

export { INK, GOLD };
