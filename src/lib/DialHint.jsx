import { createPortal } from "react-dom";
import { t } from "./i18n.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const DIM = "#8a969c";

// Kurzanleitung zum Tempo-Rad - Grafik im Stil des echten Rads (Paket C):
// Kreis mit Tempo und „Start“, schmaler Ring mit Strichen, Daumen auf dem Ring, ±5 und ±10 außen.
const CX = 160;
const CY = 92;
const R0 = 48; // Kreis
const RO = R0 * 1.3; // Ring außen (wie WHEEL_K)
const MID = (R0 + 1 + RO) / 2;

function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
function arc(r, a0, a1, sweep) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 ${sweep} ${x1} ${y1}`;
}
function tipAt(r, deg, dir) {
  const [x, y] = polar(r, deg);
  const tn = ((deg + dir * 90) * Math.PI) / 180;
  const tx = Math.cos(tn);
  const ty = Math.sin(tn);
  const px = Math.cos((deg * Math.PI) / 180);
  const py = Math.sin((deg * Math.PI) / 180);
  return `${x + tx * 7},${y + ty * 7} ${x + px * 5 - tx * 0.5},${y + py * 5 - ty * 0.5} ${x - px * 5 - tx * 0.5},${y - py * 5 - ty * 0.5}`;
}

function Key({ x, label }) {
  return (
    <g>
      <rect x={x} y={CY - 18} width="36" height="36" rx="10" fill="#13211f" stroke={TEAL} strokeWidth="1.5" />
      <text x={x + 18} y={CY + 1} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="13" fontWeight="800">{label}</text>
    </g>
  );
}

export function DialHint({ onDone }) {
  const ra = RO + 8;
  return createPortal(
    <div className="modal help-modal" onClick={onDone} role="dialog" aria-modal="true">
      <div className="modal-card help-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div className="modal-head">{t("Tempo einstellen")}</div>
        <p className="help-lead" style={{ marginBottom: 8 }}>
          {t("Zum Einstellen am Ring drehen: rechts herum schneller, links herum langsamer. Mit −5/+5 und −10/+10 springst du in Schritten. Mitte antippen startet und stoppt.")}
        </p>
        <svg viewBox="0 0 320 196" width="100%" style={{ maxWidth: 320, margin: "0 auto", display: "block" }} aria-hidden="true">
          <style>{`
            @keyframes dhTurn { from { transform: rotate(-10deg); } to { transform: rotate(100deg); } }
            @keyframes dhTicks { from { transform: rotate(0deg); } to { transform: rotate(48deg); } }
            @keyframes dhN0 { 0%, 30% { opacity: 1; } 36%, 100% { opacity: 0; } }
            @keyframes dhN1 { 0%, 30% { opacity: 0; } 36%, 64% { opacity: 1; } 70%, 100% { opacity: 0; } }
            @keyframes dhN2 { 0%, 64% { opacity: 0; } 70%, 100% { opacity: 1; } }
            .dh-anim { animation-duration: 2.8s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; transform-origin: ${CX}px ${CY}px; }
            .dh-thumb { animation-name: dhTurn; }
            .dh-ticks { animation-name: dhTicks; }
            .dh-n0 { animation-name: dhN0; } .dh-n1 { animation-name: dhN1; } .dh-n2 { animation-name: dhN2; }
            @media (prefers-reduced-motion: reduce) { .dh-anim { animation: none; } .dh-n1, .dh-n2 { opacity: 0; } }
          `}</style>
          <defs>
            <path id="dh-top" d={arc(MID, 196, 344, 1)} />
          </defs>
          {/* Ring */}
          <circle cx={CX} cy={CY} r={MID} fill="none" stroke={TEAL} strokeWidth={RO - R0 - 1} opacity="0.16" />
          <circle cx={CX} cy={CY} r={RO - 0.75} fill="none" stroke={TEAL} strokeWidth="1.5" opacity="0.55" />
          <g className="dh-anim dh-ticks" opacity="0.75">
            {Array.from({ length: 60 }, (_, i) => {
              const major = i % 5 === 0;
              const [x0, y0] = polar(RO - (major ? 6.5 : 4.5), i * 6);
              const [x1, y1] = polar(RO - 2.2, i * 6);
              return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={TEAL} strokeWidth={major ? 1.8 : 1.1} strokeLinecap="round" />;
            })}
          </g>
          <text fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="7.4" fontWeight="800" letterSpacing="0.08em" dominantBaseline="central">
            <textPath href="#dh-top" startOffset="50%" textAnchor="middle">{t("Zum Einstellen drehen").toUpperCase()}</textPath>
          </text>
          {/* Drehrichtung */}
          <path d={arc(ra, 206, 156, 0)} fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" />
          <polygon points={tipAt(ra, 156, -1)} fill={TEAL} />
          <path d={arc(ra, 334, 24, 1)} fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" />
          <polygon points={tipAt(ra, 24, 1)} fill={TEAL} />
          {/* Kreis wie im Trainer */}
          <circle cx={CX} cy={CY} r={R0} fill={INK} stroke={TEAL} strokeWidth="3.5" />
          {["80", "84", "88"].map((n, i) => (
            <text key={n} className={`dh-anim dh-n${i}`} x={CX} y={CY - 3} textAnchor="middle" dominantBaseline="central" fill={TEAL} fontFamily="Space Mono, monospace" fontSize="30" fontWeight="700" letterSpacing="-0.04em">{n}</text>
          ))}
          <text x={CX} y={CY + 22} textAnchor="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="8.5" fontWeight="800" letterSpacing="0.16em" opacity="0.85">START</text>
          {/* Daumen auf dem Ring */}
          <g className="dh-anim dh-thumb">
            <circle cx={CX + MID} cy={CY} r="6.5" fill={TEAL} stroke="rgba(244,247,246,0.75)" strokeWidth="1.4" />
          </g>
          {/* Tasten außen */}
          <Key x={4} label="−10" />
          <Key x={44} label="−5" />
          <Key x={240} label="+5" />
          <Key x={280} label="+10" />
          <text x={42} y={CY + 34} textAnchor="middle" fill={DIM} fontFamily="Figtree, sans-serif" fontSize="10" fontWeight="800" letterSpacing="0.08em">{t("LANGSAMER")}</text>
          <text x={278} y={CY + 34} textAnchor="middle" fill={DIM} fontFamily="Figtree, sans-serif" fontSize="10" fontWeight="800" letterSpacing="0.08em">{t("SCHNELLER")}</text>
          <text x={CX} y={188} textAnchor="middle" fill={DIM} fontFamily="Figtree, sans-serif" fontSize="10" fontWeight="800" letterSpacing="0.08em">{t("MITTE ANTIPPEN = START / STOP")}</text>
        </svg>
        <button className="play" onClick={onDone} style={{ width: "100%", marginTop: 8 }}>{t("Verstanden")}</button>
      </div>
    </div>,
    document.body,
  );
}
