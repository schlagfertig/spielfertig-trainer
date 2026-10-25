import { useEffect, useState } from "react";
import { t } from "./i18n.js";
import {
  OFFSET_MAX,
  OFFSET_MIN,
  OFFSET_STEP,
  getAudioOffsetMs,
  setAudioOffsetMs,
  subscribeAudioOffset,
} from "./audioOffset.js";

const TEAL = "#5cc8b8";
const INK = "#161a1d";
const DIM = "#8a969c";
const LINE = "#2f383d";

export function AudioOffsetControl({ where = "home" }) {
  const [ms, setMs] = useState(getAudioOffsetMs);

  useEffect(() => subscribeAudioOffset(setMs), []);

  function set(next) {
    setMs(setAudioOffsetMs(next));
  }

  return (
    <div className={where === "sheet" ? "latenz latenz-sheet" : "latenz"}>
      <div className="latenz-head">
        <span className="latenz-label">{t("Latenz")}</span>
        <span className="latenz-val">{ms} ms</span>
      </div>
      <div className="latenz-row">
        <button type="button" className="latenz-step" onClick={() => set(ms - OFFSET_STEP)} aria-label={t("5 ms weniger")}>−</button>
        <input
          type="range"
          min={OFFSET_MIN}
          max={OFFSET_MAX}
          step={OFFSET_STEP}
          value={ms}
          aria-label={t("Latenz in Millisekunden")}
          aria-valuemin={OFFSET_MIN}
          aria-valuemax={OFFSET_MAX}
          aria-valuenow={ms}
          onChange={(e) => set(Number(e.target.value))}
        />
        <button type="button" className="latenz-step" onClick={() => set(ms + OFFSET_STEP)} aria-label={t("5 ms mehr")}>+</button>
      </div>
      <p className="latenz-hint">{t("Schieb, bis der Click mit dem weißen Puls zusammenfällt. Das merkt sich Schlagfertig für jede Übung.")}</p>
      <style>{`
        .latenz {
          position: relative;
          z-index: 1;
          margin-top: 22px;
          padding: 14px 16px 12px;
          background: #1c2428;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 14px;
          color: #f4f7f6;
        }
        .latenz-sheet {
          margin-top: 14px;
          background: ${INK};
          border-color: ${LINE};
        }
        .latenz-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .latenz-label {
          color: ${TEAL};
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .latenz-val { color: ${TEAL}; font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .latenz-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .latenz-row input[type=range] {
          flex: 1;
          min-width: 0;
          accent-color: ${TEAL};
          min-height: 32px;
        }
        .latenz-step {
          flex: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid ${LINE};
          background: ${INK};
          color: ${TEAL};
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
          padding: 0;
          cursor: pointer;
        }
        .latenz-hint { margin: 8px 0 0; color: ${DIM}; font-size: 13px; line-height: 1.4; }
      `}</style>
    </div>
  );
}
