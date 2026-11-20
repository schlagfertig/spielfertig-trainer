import { useEffect, useState } from "react";
import { getLang, t } from "./i18n.js";
import { COMMENT_MAX, GENERAL_AREA_IDS, GENERAL_AREA_LABEL, GENERAL_CATEGORY_IDS, GENERAL_CATEGORY_LABEL, generalMailtoHref } from "./feedbackRules.js";
import { submitGeneralFeedback } from "./feedbackClient.js";
import "./TesterFeedback.css";

export const GENERAL_EVENT = "sf-general-feedback";

const CATEGORY_EMOJI = {
  bug: "🐞",
  idea: "💡",
  like: "❤️",
  unclear: "😕",
  difficulty: "↕️",
};

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
}

function Sheet({ onClose }) {
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  useEscape(true, onClose);
  useEffect(() => {
    if (!sent) return undefined;
    const id = window.setTimeout(onClose, 1800);
    return () => window.clearTimeout(id);
  }, [sent, onClose]);
  const lang = getLang();
  const mail = generalMailtoHref({ category, area, comment: comment.trim(), lang });

  async function send() {
    if (!category || busy) return;
    setBusy(true);
    setError(false);
    try {
      await submitGeneralFeedback({ category, area, comment: comment.trim(), lang });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal fb-modal fb-sheet-wrap" onClick={onClose}>
      <div className="modal-card fb-card fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-gen-h" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="fb-sent" role="status"><span aria-hidden="true">🥁</span><b>{t("Danke dir! Das hilft mir sehr.")}</b></div>
        ) : (
          <>
            <div className="modal-head" id="fb-gen-h">{t("Feedback geben")}</div>
            <p className="fb-q fb-q-sm">{t("Worum geht es?")}</p>
            <div className="fb-chips" role="radiogroup" aria-label={t("Worum geht es?")}>
              {GENERAL_CATEGORY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={category === id}
                  className={category === id ? "fb-chip on" : "fb-chip"}
                  onClick={() => setCategory(id)}
                >
                  <span aria-hidden="true">{CATEGORY_EMOJI[id]}</span> {t(GENERAL_CATEGORY_LABEL[id])}
                </button>
              ))}
            </div>
            <p className="fb-where">{t("Wo? (optional)")}</p>
            <div className="fb-chips" role="radiogroup" aria-label={t("Wo? (optional)")}>
              {GENERAL_AREA_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={area === id}
                  className={area === id ? "fb-chip on" : "fb-chip"}
                  onClick={() => setArea((cur) => (cur === id ? "" : id))}
                >
                  {t(GENERAL_AREA_LABEL[id])}
                </button>
              ))}
            </div>
            <label className="fb-label">
              {t("Dein Text (optional)")}
              <textarea className="fb-input" rows={2} maxLength={COMMENT_MAX} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("z. B. was schiefgeht oder was du dir wünschst …")} />
            </label>
            <p className="fb-fine">{t("Ohne Namen. Mit dem Absenden erklärst du dich einverstanden, dass ich die Nachricht speichere. Details stehen in der Datenschutzerklärung unter „Feedback“.")}</p>
            <div className="fb-actions">
              <button type="button" className="fb-btn fb-primary" disabled={!category || busy} onClick={send}>{busy ? t("Wird gesendet …") : t("Absenden")}</button>
            </div>
            <button type="button" className="fb-link" onClick={onClose}>{t("Abbrechen")}</button>
            {error ? (
              <div className="fb-send-err" role="alert">
                <p>{t("Das hat leider nicht geklappt. Prüfe deine Verbindung oder schreib mir eine Mail.")}</p>
                <a className="fb-btn fb-gold-btn" href={mail}>{t("Per E-Mail schicken")}</a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// Fußzeilen-Link auf dem Startbildschirm: Web-Testversion und Store-App.
export function GeneralFeedbackLink() {
  return <button type="button" className="foot-link" onClick={() => window.dispatchEvent(new CustomEvent(GENERAL_EVENT))}>{t("Feedback")}</button>;
}

export default function GeneralFeedback() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(GENERAL_EVENT, on);
    return () => window.removeEventListener(GENERAL_EVENT, on);
  }, []);
  if (!open) return null;
  return <Sheet onClose={() => setOpen(false)} />;
}
