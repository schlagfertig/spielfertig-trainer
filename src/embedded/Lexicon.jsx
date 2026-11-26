import { useMemo, useState } from "react";
import { searchLexicon, pickLexiconSelection } from "../lib/lexicon.js";
import { t, getLang } from "../lib/i18n.js";
import { useWideLayout } from "../lib/wideLayout.js";
import "../styles-lexicon.css";

export default function Lexicon({ preset } = {}) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(() => preset?.id || preset?.lex || null);
  const lang = getLang();
  const wide = useWideLayout();
  const list = useMemo(() => searchLexicon(q, lang), [q, lang]);
  const letters = useMemo(() => [...new Set(list.map((e) => e.term[0].toLocaleUpperCase(lang)))], [list, lang]);
  const activeId = pickLexiconSelection(list, selectedId);
  const selected = list.find((e) => e.id === activeId) || null;
  const activeLetter = wide && selected ? selected.term[0].toLocaleUpperCase(lang) : "";

  function goLetter(ch) {
    const first = list.find((e) => e.term[0].toLocaleUpperCase(lang) === ch);
    if (wide && first) setSelectedId(first.id);
    document.getElementById(`lex-${ch}`)?.scrollIntoView({ block: "start" });
  }

  const search = (
    <input
      className="lex-search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={t("Begriff suchen")}
      aria-label={t("Begriff suchen")}
      enterKeyHint="search"
    />
  );

  const az = letters.length > 1 ? (
    <nav className="lex-az" aria-label={t("Buchstaben")}>
      {letters.map((ch) => (
        <button
          key={ch}
          type="button"
          className={ch === activeLetter ? "is-on" : undefined}
          aria-current={ch === activeLetter ? "true" : undefined}
          onClick={() => goLetter(ch)}
        >{ch}</button>
      ))}
    </nav>
  ) : null;

  if (wide) {
    return (
      <div className="lex is-wide">
        <div className="lex-col is-index">
          {search}
          {az}
          <div className="lex-index">
            {list.length === 0 ? <p className="lex-empty">{t("Kein Treffer.")}</p> : null}
            {list.map((e, i) => {
              const ch = e.term[0].toLocaleUpperCase(lang);
              const prev = i > 0 ? list[i - 1].term[0].toLocaleUpperCase(lang) : "";
              return (
                <div key={e.id} className="lex-item" id={ch !== prev ? `lex-${ch}` : undefined}>
                  {ch !== prev ? <div className="lex-letter">{ch}</div> : null}
                  <button
                    type="button"
                    className={e.id === activeId ? "lex-term is-on" : "lex-term"}
                    aria-current={e.id === activeId ? "true" : undefined}
                    data-lex-id={e.id}
                    onClick={() => setSelectedId(e.id)}
                  >
                    {e.brand ? <span className="lex-brand">{e.term}</span> : e.term}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="lex-col is-detail">
          {selected ? (
            <article className="lex-detail" aria-live="polite">
              <h2 className={selected.brand ? "lex-detail-title is-brand" : "lex-detail-title"}>{selected.term}</h2>
              <p className="lex-body">{selected.text}</p>
              {selected.img ? (
                <figure className="lex-fig">
                  <img src={selected.img} alt={selected.alt || selected.term} decoding="async" />
                </figure>
              ) : null}
            </article>
          ) : (
            <p className="lex-empty">{t("Kein Treffer.")}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lex">
      <p className="lex-lead">{t("Kurze Erklärungen zum Nachschlagen - tipp einen Begriff an.")}</p>
      {search}
      {az}
      {list.length === 0 ? <p className="lex-empty">{t("Kein Treffer.")}</p> : null}
      {list.map((e, i) => {
        const ch = e.term[0].toLocaleUpperCase(lang);
        const prev = i > 0 ? list[i - 1].term[0].toLocaleUpperCase(lang) : "";
        return (
          <div key={e.id} className="lex-item" id={ch !== prev ? `lex-${ch}` : undefined}>
            {ch !== prev ? <div className="lex-letter">{ch}</div> : null}
            {/* Aufgeklappter Begriff rutscht nach oben, mit Platz für Titel und einen Begriff darüber */}
            <details className="lex-details" onToggle={(ev) => {
              if (!ev.currentTarget.open) return;
              const item = ev.currentTarget.querySelector("summary");
              const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
              // Abstand nach oben: feste Kopfzeile + Platz für etwa zwei Begriffe (Titel und ein weiterer Begriff bleiben sichtbar)
              requestAnimationFrame(() => {
                if (!item) return;
                const bar = document.querySelector(".page.view-lexicon .top-row");
                const gap = (bar ? bar.getBoundingClientRect().height : 0) + 2 * item.getBoundingClientRect().height;
                const y = item.getBoundingClientRect().top + window.scrollY - gap;
                window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
              });
            }}>
              <summary>
                {e.brand ? <span className="lex-brand">{e.term}</span> : e.term}
              </summary>
              <p className="lex-body">{e.text}</p>
              {e.img ? (
                <figure className="lex-fig">
                  {/* Bild bleibt in der Liste - kein Vollbild mehr beim Antippen */}
                  <img src={e.img} alt={e.alt || e.term} loading="lazy" decoding="async" />
                </figure>
              ) : null}
            </details>
          </div>
        );
      })}
    </div>
  );
}
