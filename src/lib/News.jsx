import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CHANGELOG, CHANGELOG_LATEST } from "./changelog.js";
import { fmtDate, getLang, t } from "./i18n.js";
import { loadSession, saveSession } from "./session.js";

const SEEN_KEY = "newsSeen";
// Einmaliger Hinweis auf der Startseite, dass es die Seite „Neuigkeiten“ gibt (sf.v1.newsHint).
const HINT_KEY = "newsHint";

// true, wenn es Einträge gibt, die neuer sind als der letzte Besuch der Seite.
export function hasUnseenNews() {
  const seen = loadSession(SEEN_KEY, { date: "" }).date || "";
  return !!CHANGELOG_LATEST && CHANGELOG_LATEST > seen;
}

function markNewsSeen() {
  if (CHANGELOG_LATEST) saveSession(SEEN_KEY, { date: CHANGELOG_LATEST });
  // Wer die Seite (z. B. über den Footer) geöffnet hat, kennt sie – Hinweis nicht mehr zeigen.
  markNewsHintSeen();
}

export function markNewsHintSeen() {
  saveSession(HINT_KEY, { seen: true });
}

// Hinweis nur, solange er nicht weggetippt wurde und die Seite noch nie geöffnet war.
export function shouldShowNewsHint() {
  if (loadSession(HINT_KEY, {}).seen) return false;
  return !loadSession(SEEN_KEY, { date: "" }).date;
}

// Kleines Glas-Banner oben auf der Startseite (unter Flagge/?, über dem Logo).
export function NewsHint({ onView, onLater }) {
  return (
    <div className="news-hint glass" role="status">
      <p className="news-hint-text">{t("Neu: Unter ‚Neuigkeiten‘ siehst du, was sich in der App geändert hat.")}</p>
      <div className="news-hint-actions">
        <button type="button" className="ghost" onClick={onLater}>{t("Später")}</button>
        <button type="button" className="ghost on" onClick={onView}>{t("Ansehen")}</button>
      </div>
    </div>
  );
}

// „2026-09-30“ als lokales Datum (nicht UTC), damit der Tag nicht verrutscht.
function dayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function NewsButton() {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(hasUnseenNews);
  const en = getLang() === "en";
  function show() {
    setOpen(true);
    markNewsSeen();
    setUnseen(false);
  }
  const sheet = open ? createPortal(
    <div className="modal help-modal" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={t("Neuigkeiten")}>
      <div className="modal-card help-card news-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          {t("Neuigkeiten")}
          <button type="button" className="news-x" onClick={() => setOpen(false)} aria-label={t("Schließen")}>×</button>
        </div>
        <div className="news-scroll" lang={en ? "en" : "de"}>
          <p className="news-lead">{t("Was sich in Schlagfertig Control geändert hat – das Neueste zuerst.").replace("Schlagfertig Control", "Schlagfertig\u00a0Control")}</p>
          {CHANGELOG.map((day) => (
            <section className="news-day" key={day.date}>
              <h2><time dateTime={day.date}>{fmtDate(dayDate(day.date))}</time></h2>
              <ul className="news-list">
                {day.items.map((it, i) => <li key={i}>{en ? it.en : it.de}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;
  return (
    <>
      <button type="button" className="help-dot news-bang" onClick={show} aria-label={t("Neuigkeiten")}>
        !
        {unseen ? <span className="news-bang-dot" aria-hidden="true" /> : null}
      </button>
      {sheet}
    </>
  );
}

export default function News() {
  const en = getLang() === "en";
  useEffect(() => {
    markNewsSeen();
    // Von der Startseite kommt man aus dem Footer – Seite oben beginnen.
    try { window.scrollTo(0, 0); } catch { /* ignore */ }
  }, []);
  return (
    <div className="legal news" lang={en ? "en" : "de"}>
      <p className="news-lead">{t("Was sich in Schlagfertig Control geändert hat – das Neueste zuerst.").replace("Schlagfertig Control", "Schlagfertig\u00a0Control")}</p>
      {CHANGELOG.map((day) => (
        <section className="legal-block news-day" key={day.date}>
          <h2><time dateTime={day.date}>{fmtDate(dayDate(day.date))}</time></h2>
          <ul className="news-list">
            {day.items.map((it, i) => (
              <li key={i}>{en ? it.en : it.de}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
