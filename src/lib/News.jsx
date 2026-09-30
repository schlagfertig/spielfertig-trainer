import { useEffect } from "react";
import { CHANGELOG, CHANGELOG_LATEST } from "./changelog.js";
import { fmtDate, getLang, t } from "./i18n.js";
import { loadSession, saveSession } from "./session.js";

const SEEN_KEY = "newsSeen";

// true, wenn es Einträge gibt, die neuer sind als der letzte Besuch der Seite.
export function hasUnseenNews() {
  const seen = loadSession(SEEN_KEY, { date: "" }).date || "";
  return !!CHANGELOG_LATEST && CHANGELOG_LATEST > seen;
}

function markNewsSeen() {
  if (CHANGELOG_LATEST) saveSession(SEEN_KEY, { date: CHANGELOG_LATEST });
}

// „2026-09-30“ als lokales Datum (nicht UTC), damit der Tag nicht verrutscht.
function dayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
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
      <p className="news-lead">{t("Was sich in der App geändert hat – das Neueste zuerst.")}</p>
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
