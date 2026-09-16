const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

function xOf(t, x0, stepW) {
  return x0 + t * stepW;
}

function beamGroups(notes) {
  const groups = [];
  let cur = [];
  const flush = () => {
    if (cur.length) groups.push(cur);
    cur = [];
  };
  notes.forEach((nt) => {
    if (nt.dur >= 4) {
      flush();
      return;
    }
    const beat = Math.floor(nt.t / 4);
    if (cur.length && Math.floor(cur[0].t / 4) !== beat) flush();
    cur.push(nt);
  });
  flush();
  return groups.filter((g) => g.length >= 2);
}

export function RudimentStaff({ rud, playingT = -1, handwritten, svgId }) {
  const notes = rud.notes || [];
  const bars = rud.bars || 1;
  const steps = bars * 16;
  const x0 = 36;
  const stepW = 22;
  const w = x0 + steps * stepW + 28;
  const y = 48;
  const stem = handwritten ? 28 : 32;
  const stroke = handwritten ? 2.2 : 1.6;
  const groups = beamGroups(notes);
  const beamed = new Set();
  groups.forEach((g) => g.forEach((n) => beamed.add(n)));
  return (
    <svg id={svgId} viewBox={`0 0 ${w} 118`} width="100%" role="img" aria-label={rud.label}>
      {handwritten && (
        <filter id="hw">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.7" />
        </filter>
      )}
      <g filter={handwritten ? "url(#hw)" : undefined} stroke={INK} fill="none">
        <line x1={18} y1={y} x2={w - 14} y2={y} strokeWidth={stroke} />
        {Array.from({ length: bars + 1 }, (_, i) => (
          <line key={i} x1={x0 + i * 16 * stepW} y1={y - 22} x2={x0 + i * 16 * stepW} y2={y + 22} strokeWidth={i === 0 || i === bars ? 2.4 : 1.4} />
        ))}
        {notes.map((nt, i) => {
          const x = xOf(nt.t, x0, stepW);
          const on = playingT === nt.t;
          const fill = on ? GOLD : INK;
          const ey = y - 6 - stem;
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
              <ellipse cx={x} cy={y} rx={6.2} ry={4.6} fill={fill} stroke={on ? GOLD : INK} strokeWidth={1.2} transform={`rotate(-20 ${x} ${y})`} />
              {nt.dur === 3 && <circle cx={x + 9} cy={y + 1} r={1.7} fill={INK} />}
              {nt.roll ? Array.from({ length: nt.roll }, (_, k) => (
                <line key={k} x1={x - 5} y1={y - 10 - k * 4} x2={x + 5} y2={y - 16 - k * 4} strokeWidth={1.3} />
              )) : null}
              <line x1={x} y1={y - 6} x2={x} y2={ey} stroke={on ? GOLD : INK} strokeWidth={1.5} />
              {nt.acc && <path d={`M ${x - 5} ${ey - 10} L ${x} ${ey - 16} L ${x} ${ey - 6} Z`} fill={INK} />}
              {!beamed.has(nt) && nt.dur <= 2 && (
                <path d={`M ${x} ${ey} C ${x + 10} ${ey + 2}, ${x + 12} ${ey + 12}, ${x + 6} ${ey + 16}`} stroke={INK} strokeWidth={1.4} />
              )}
              {!beamed.has(nt) && nt.dur === 1 && (
                <path d={`M ${x} ${ey + 5} C ${x + 9} ${ey + 7}, ${x + 10} ${ey + 15}, ${x + 5} ${ey + 18}`} stroke={INK} strokeWidth={1.3} />
              )}
              <text x={x} y={y + 22} textAnchor="middle" fontSize="11" fontWeight="700" fill={nt.hand === "R" ? RCOL : LCOL} stroke="none">{nt.hand}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const xs = g.map((n) => xOf(n.t, x0, stepW));
          const yb = y - 6 - stem;
          return (
            <g key={gi}>
              <line x1={xs[0]} y1={yb} x2={xs[xs.length - 1]} y2={yb} strokeWidth={3.2} />
              {g.map((n, i) => {
                if (n.dur > 1) return null;
                const left = i > 0 && g[i - 1].dur === 1;
                const right = i < g.length - 1 && g[i + 1].dur === 1;
                if (left && right) return <line key={i} x1={xs[i]} y1={yb + 6} x2={xs[i + 1]} y2={yb + 6} strokeWidth={2.2} />;
                const neighborX = left ? xs[i - 1] : right ? xs[i + 1] : xs[i] + stepW;
                const inward = left ? -1 : 1;
                const hook = Math.abs(neighborX - xs[i]) * 0.5;
                return <line key={i} x1={xs[i]} y1={yb + 6} x2={xs[i] + inward * hook} y2={yb + 6} strokeWidth={2.2} />;
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

const VOICES = [
  { id: "CY", y: 18, oval: true },
  { id: "HH", y: 30, oval: true },
  { id: "SN", y: 54, oval: false },
  { id: "T1", y: 42, oval: false },
  { id: "T2", y: 66, oval: false },
  { id: "FT", y: 78, oval: false },
  { id: "BD", y: 90, oval: false },
  { id: "HF", y: 102, oval: true },
];

export function voiceY(id) {
  return (VOICES.find((v) => v.id === id) || VOICES[2]).y;
}

export function GrooveStaff({ events, bars = 1, mode = "binary", playingT = -1, svgId }) {
  const stepW = mode === "binary" ? 18 : 22;
  const x0 = 44;
  const barSteps = mode === "binary" ? 16 : 12;
  const w = Math.max(320, x0 + bars * barSteps * stepW + 24);
  const h = 36 + bars * 176;
  const lines = [30, 42, 54, 66, 78];
  const byBar = [];
  for (let b = 0; b < bars; b++) {
    const t0 = b * barSteps;
    byBar.push((events || []).filter((e) => e.t >= t0 && e.t < t0 + barSteps).map((e) => ({ ...e, t: e.t - t0 })));
  }
  return (
    <svg id={svgId} viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Groove">
      {byBar.map((ev, bi) => {
        const yo = 20 + bi * 176;
        const grouped = {};
        ev.forEach((e) => { (grouped[e.t] || (grouped[e.t] = [])).push(e); });
        const times = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        return (
          <g key={bi} transform={`translate(0 ${yo})`}>
            <text x={14} y={58} fill="#8a969c" fontSize="11" fontWeight="700">{bi + 1}</text>
            {lines.map((ly) => (
              <line key={ly} x1={x0 - 10} y1={ly} x2={w - 16} y2={ly} stroke="#161a1d" strokeWidth={1.2} />
            ))}
            <line x1={x0 - 10} y1={30} x2={x0 - 10} y2={78} stroke="#161a1d" strokeWidth={2.2} />
            <line x1={w - 16} y1={30} x2={w - 16} y2={78} stroke="#161a1d" strokeWidth={2.2} />
            {times.map((t) => {
              const hits = grouped[t];
              const x = x0 + t * stepW;
              const ys = hits.map((h) => voiceY(h.voice)).sort((a, b) => a - b);
              const top = ys[0];
              const bot = ys[ys.length - 1];
              const on = playingT === t + bi * barSteps;
              return (
                <g key={t}>
                  <line x1={x} y1={top} x2={x} y2={Math.min(bot, top + 36)} stroke={on ? GOLD : INK} strokeWidth={1.5} />
                  {hits.map((hit, i) => {
                    const y = voiceY(hit.voice);
                    const v = VOICES.find((z) => z.id === hit.voice);
                    const open = hit.voice === "HH" || hit.voice === "CY" || hit.voice === "HF";
                    return (
                      <ellipse key={i} cx={x} cy={y} rx={v?.oval ? 6.4 : 6} ry={v?.oval ? 3.4 : 4.4} fill={on ? GOLD : open ? "none" : INK} stroke={on ? GOLD : INK} strokeWidth={1.3} transform={`rotate(-20 ${x} ${y})`} />
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export { INK, GOLD };
