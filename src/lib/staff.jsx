const INK = "#161a1d";
const GOLD = "#e8b84b";
const RCOL = "#5c8ee0";
const LCOL = "#e05c5c";

const HEAD_RX = 6.2;
const HEAD_RY = 4.05;
const HEAD_ROT = -22;
const STEM_DX = 5.4;
const STEM_H = 26;
const BEAM_W = 3.4;
const BEAM_GAP = 3.8;
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
      <rect x={x} y={y - 11} width={3.2} height={22} rx={0.3} />
      <rect x={x + 6.6} y={y - 11} width={3.2} height={22} rx={0.3} />
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
      <text x={x} y={y - 1} fontSize="18">{n}</text>
      <text x={x} y={y + 17} fontSize="18">{d}</text>
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
