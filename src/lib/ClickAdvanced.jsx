import { MIX_LAYERS, writeMix } from "./clickMix.js";
import { BeatGlyph } from "./BeatGlyph.jsx";

const TEAL = "#5cc8b8";
const DIM = "#8a969c";

// Symbol statt Name je Ebene (ein Schlag)
const GLYPH = {
  quarter: <BeatGlyph per={1} />,
  off: <BeatGlyph per={2} rests={[0]} />,
  sixteenth: <BeatGlyph per={4} rests={[0, 2]} />,
  triplet: <BeatGlyph per={3} tuplet={3} rests={[0]} />,
  beat: <BeatGlyph per={1} accent below="1" />,
  master: (
    <svg viewBox="-12 0 48 24" width={48} height={24} aria-hidden="true" fill="none" stroke="#f4f7f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#f4f7f6" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11" />
    </svg>
  ),
};

export function ClickAdvanced({ mix, setMix, slidersOnly = false }) {
  function patch(partial) {
    const next = { ...mix, ...partial };
    setMix(next);
    writeMix(next);
  }

  return (
    <div className="click-adv">
      {!slidersOnly && (
        <div className="seg" style={{ width: "fit-content", maxWidth: "100%" }}>
          <button type="button" className={!mix.advanced ? "on" : ""} onClick={() => patch({ advanced: false })}>Normal</button>
          <button type="button" className={mix.advanced ? "on" : ""} onClick={() => patch({ advanced: true })}>Erweitert</button>
        </div>
      )}
      {(slidersOnly || mix.advanced) && (
        <div className="click-adv-list">
          <p style={{ color: DIM, fontSize: 12, margin: "0 0 4px", lineHeight: 1.35 }}>
            Jede Zeile ist eine eigene Click-Ebene, der Lautsprecher regelt alle zusammen.
          </p>
          {MIX_LAYERS.map((layer) => (
            <label key={layer.id} className="click-adv-row">
              <span className="click-adv-name" title={`${layer.label}: ${layer.sub}`}>{GLYPH[layer.id]}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={mix[layer.id]}
                aria-label={`${layer.label}. ${layer.sub}`}
                onChange={(e) => patch({ [layer.id]: Number(e.target.value) })}
              />
              <span className="click-adv-val">{mix[layer.id]}</span>
            </label>
          ))}
          <p style={{ color: DIM, fontSize: 11, margin: "4px 0 0" }}>
            Änderungen gelten sofort, der Click läuft weiter.
          </p>
        </div>
      )}
      <style>{`
        .click-adv { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .click-adv-list { display: flex; flex-direction: column; gap: 8px; max-height: 46dvh; overflow: auto; padding-right: 2px; }
        .click-adv-row { display: grid; grid-template-columns: minmax(72px, 86px) minmax(0, 1fr) 28px; gap: 6px; align-items: center; min-width: 0; }
        .click-adv-name { display: flex; align-items: center; min-width: 0; }
        .click-adv-row input[type=range] { width: 100%; min-width: 0; accent-color: ${TEAL}; min-height: 28px; }
        .click-adv-val { font-size: 11px; color: ${TEAL}; font-weight: 800; text-align: right; }
      `}</style>
    </div>
  );
}
