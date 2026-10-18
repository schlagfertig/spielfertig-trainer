import { useEffect, useRef } from "react";
import { getLang, t } from "./i18n.js";
import { currentHighlights, markWhatsNewSeen } from "./startModal.js";
import "./TesterFeedback.css";

// „Neu in Schlagfertig 🥁“ - einmal nach einem Minor-/Major-Update, Inhalt aus HIGHLIGHTS (changelog.js).
export default function WhatsNew({ onOpen, onClose, onNews }) {
  const h = currentHighlights();
  const go = useRef(null);
  useEffect(() => { if (h) { markWhatsNewSeen(); go.current?.focus(); } }, [h]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!h) return null;
  const c = h[getLang() === "en" ? "en" : "de"];
  return (
    <div className="modal fb-modal" onClick={onClose}>
      <div className="modal-card fb-card wn-card" role="dialog" aria-modal="true" aria-labelledby="wn-h" onClick={(e) => e.stopPropagation()}>
        <h2 className="fb-title wn-title" id="wn-h">{c.title}</h2>
        <ul className="wn-list">
          {c.lines.map((line) => {
            const [icon, ...rest] = Array.from(line);
            const text = rest.join("").trim();
            const i = text.indexOf(":");
            return (
              <li key={line} className="dy-glass wn-item">
                <span className="wn-ico" aria-hidden="true">{icon}</span>
                <span>{i > 0 ? <><b>{text.slice(0, i + 1)}</b>{text.slice(i + 1)}</> : text}</span>
              </li>
            );
          })}
        </ul>
        <div className="fb-actions">
          <button ref={go} type="button" className="fb-btn fb-primary" onClick={() => { onClose(); if (h.action) onOpen(h.action, h.preset || null); }}>{c.go}</button>
          <button type="button" className="fb-btn" onClick={onClose}>{c.later}</button>
        </div>
        <button type="button" className="fb-link" onClick={onNews}>{t("Alle Neuigkeiten ansehen")}</button>
      </div>
    </div>
  );
}
