import { MIX_LAYERS, writeMix } from "./clickMix.js";

const TEAL = "#5cc8b8";
const DIM = "#8a969c";

export function ClickAdvanced({ mix, setMix }) {
  function patch(partial) {
    const next = { ...mix, ...partial };
    setMix(next);
    writeMix(next);
  }

  return (
    <div className="click-adv">
      <div className="seg" style={{ width: "fit-content" }}>
        <button type="button" className={!mix.advanced ? "on" : ""} onClick={() => patch({ advanced: false })}>Normal</button>
        <button type="button" className={mix.advanced ? "on" : ""} onClick={() => patch({ advanced: true })}>Erweitert</button>
      </div>
      {mix.advanced && (
        <div className="click-adv-list">
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
                aria-label={layer.label}
                onChange={(e) => patch({ [layer.id]: Number(e.target.value) })}
              />
              <span className="click-adv-val">{mix[layer.id]}</span>
            </label>
          ))}
          <p style={{ color: DIM, fontSize: 11, margin: "4px 0 0" }}>
            RW100-Analogie. BPM = Viertel. Änderungen gelten sofort.
          </p>
        </div>
      )}
      <style>{`
        .click-adv { display: flex; flex-direction: column; gap: 10px; }
        .click-adv-list { display: flex; flex-direction: column; gap: 8px; max-height: 42dvh; overflow: auto; padding-right: 2px; }
        .click-adv-row { display: grid; grid-template-columns: 92px 1fr 32px; gap: 8px; align-items: center; }
        .click-adv-name { font-size: 12px; color: #ddd; font-weight: 700; line-height: 1.15; }
        .click-adv-name small { display: block; color: ${DIM}; font-weight: 600; font-size: 10px; }
        .click-adv-row input[type=range] { width: 100%; accent-color: ${TEAL}; min-height: 28px; }
        .click-adv-val { font-size: 11px; color: ${TEAL}; font-weight: 800; text-align: right; }
      `}</style>
    </div>
  );
}
