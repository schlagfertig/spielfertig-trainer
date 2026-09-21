import { MIX_LAYERS, writeMix } from "./clickMix.js";

const TEAL = "#5cc8b8";
const DIM = "#8a969c";

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
            Jede Ebene extra: BEAT = 1, Offbeat = und, e/a = 16tel dazwischen, Master = alles.
          </p>
          {MIX_LAYERS.map((layer) => (
            <label key={layer.id} className="click-adv-row">
              <span className="click-adv-name">
                {layer.label}
                <small>{layer.sub}</small>
              </span>
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
        .click-adv-name { font-size: 12px; color: #ddd; font-weight: 700; line-height: 1.15; min-width: 0; }
        .click-adv-name small { display: block; color: ${DIM}; font-weight: 600; font-size: 10px; }
        .click-adv-row input[type=range] { width: 100%; min-width: 0; accent-color: ${TEAL}; min-height: 28px; }
        .click-adv-val { font-size: 11px; color: ${TEAL}; font-weight: 800; text-align: right; }
      `}</style>
    </div>
  );
}
