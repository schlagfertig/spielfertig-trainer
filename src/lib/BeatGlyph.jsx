const INK = "#f4f7f6";

// Kleine Notengruppe für einen Schlag (Pyramide, Click-Mixer).
// rests: Positionen mit Pause statt Note (einzelne Note in der Gruppe bekommt Fähnchen); accent: > über der Note; below: Text darunter
export function BeatGlyph({ per, tuplet, on, rests = [], accent = false, below = "" }) {
  const n = Math.max(1, per);
  const w = 48;
  const h = 24;
  const y = 16;
  const top = n === 1 ? 7 : 5;
  const ink = on ? "#06120f" : INK;
  const span = rests.length ? (n - 1) * 12 : w - 12;
  const left = (w - span) / 2;
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? w / 2 : left + (span * i) / (n - 1)));
  const rx = n >= 6 ? 1.8 : n >= 4 ? 2.1 : 2.5;
  const beams = n === 1 ? 0 : n === 2 || n === 3 ? 1 : n === 8 ? 3 : 2;
  const notes = xs.filter((_, i) => !rests.includes(i));
  const single = notes.length === 1;
  const padTop = accent ? 6 : 0;
  const padBottom = below ? 8 : 0;
  return (
    <svg viewBox={`0 ${-padTop} ${w} ${h + padTop + padBottom}`} width={w} height={h + padTop + padBottom} aria-hidden="true" style={{ overflow: "visible" }}>
      {xs.map((x, i) => rests.includes(i) ? (
        <g key={i} stroke={ink} strokeWidth="1" fill="none">
          <circle cx={x - 1} cy={10.5} r={1.3} fill={ink} stroke="none" />
          <path d={`M ${x - 1} 11.6 Q ${x + 0.8} 12 ${x + 2.2} 10 L ${x - 0.6} ${beams > 1 ? 21 : 18}`} />
          {beams > 1 ? <>
            <circle cx={x - 1.9} cy={14} r={1.2} fill={ink} stroke="none" />
            <path d={`M ${x - 1.9} 15 Q ${x - 0.3} 15.3 ${x + 1.1} 13.9`} />
          </> : null}
        </g>
      ) : (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.68} fill={ink} transform={`rotate(-18 ${x} ${y})`} />
          {n > 1 && !single ? <line x1={x + 1.4} y1={y - 0.5} x2={x + 1.4} y2={top} stroke={ink} strokeWidth="0.95" /> : (
            <line x1={x + 1.6} y1={y - 0.3} x2={x + 1.6} y2={3.5} stroke={ink} strokeWidth="1.1" />
          )}
        </g>
      ))}
      {single && n > 1 ? Array.from({ length: beams }, (_, b) => (
        <path key={b} d={`M ${notes[0] + 1.6} ${3.5 + b * 3} C ${notes[0] + 9} ${5 + b * 3}, ${notes[0] + 9} ${12 + b * 3}, ${notes[0] + 2.6} ${14 + b * 3}`} fill="none" stroke={ink} strokeWidth="1.1" />
      )) : null}
      {!single ? Array.from({ length: beams }, (_, b) => (
        <line key={b} x1={notes[0] + 1.4} y1={top + b * 2.1} x2={notes[notes.length - 1] + 1.4} y2={top + b * 2.1} stroke={ink} strokeWidth={b === 0 ? 2 : 1.4} />
      )) : null}
      {tuplet ? (
        <text x={w / 2} y={2.5} textAnchor="middle" fill={ink} fontFamily="Figtree, sans-serif" fontSize="7.5" fontWeight="800">{tuplet}</text>
      ) : null}
      {accent ? <path d={`M ${notes[0] - 3} -5 L ${notes[0] + 3.5} -2.8 L ${notes[0] - 3} -0.6`} fill="none" stroke={ink} strokeWidth="1.1" /> : null}
      {below ? <text x={notes[0]} y={h + 6.5} textAnchor="middle" fill={ink} fontFamily="Figtree, sans-serif" fontSize="8" fontWeight="800">{below}</text> : null}
    </svg>
  );
}
