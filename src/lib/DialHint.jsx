import { createPortal } from "react-dom";
import { t } from "./i18n.js";

const TEAL = "#5cc8b8";

export function DialHint({ onDone }) {
  return createPortal(
    <div className="modal help-modal" onClick={onDone} role="dialog" aria-modal="true">
      <div className="modal-card help-card" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div className="modal-head">{t("Tempo drehen")}</div>
        <p className="help-lead" style={{ marginBottom: 8 }}>
          {t("Halten und im Kreis drehen. Rechts schneller, links langsamer. Außen feiner.")}
        </p>
        <svg viewBox="0 0 220 200" width="220" height="200" aria-hidden="true" style={{ margin: "0 auto", display: "block" }}>
          <style>{`
            @keyframes dialSpin { from { transform: rotate(-50deg); } to { transform: rotate(230deg); } }
            @keyframes dialPulse { 0%,100% { opacity:.35 } 50% { opacity:1 } }
            .dial-arm { transform-origin: 110px 96px; animation: dialSpin 3.2s ease-in-out infinite alternate; }
            .dial-tip { animation: dialPulse 1.6s ease-in-out infinite; }
          `}</style>
          <circle cx="110" cy="96" r="52" fill="#161a1d" stroke={TEAL} strokeWidth="4" />
          <text x="110" y="92" textAnchor="middle" fill={TEAL} fontFamily="Space Mono, monospace" fontSize="22" fontWeight="700">80</text>
          <text x="110" y="110" textAnchor="middle" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="9" fontWeight="800" letterSpacing="0.14em">BPM</text>
          <g className="dial-arm">
            <line x1="110" y1="96" x2="110" y2="38" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
            <circle className="dial-tip" cx="110" cy="34" r="8" fill={TEAL} />
          </g>
          <text x="28" y="168" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="13" fontWeight="800">{t("TIPP LINKS")}</text>
          <text x="192" y="168" textAnchor="end" fill={TEAL} fontFamily="Figtree, sans-serif" fontSize="13" fontWeight="800">{t("TIPP RECHTS")}</text>
          <text x="28" y="184" fill="#8a969c" fontFamily="Figtree, sans-serif" fontSize="11">{t("= LANGSAMER")}</text>
          <text x="192" y="184" textAnchor="end" fill="#8a969c" fontFamily="Figtree, sans-serif" fontSize="11">{t("= SCHNELLER")}</text>
        </svg>
        <button className="play" onClick={onDone} style={{ width: "100%", marginTop: 8 }}>{t("Verstanden")}</button>
      </div>
    </div>,
    document.body,
  );
}
