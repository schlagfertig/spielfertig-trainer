import { useMemo, useState } from "react";
import { searchLexicon } from "../lib/lexicon.js";
import { t, getLang } from "../lib/i18n.js";

export default function Lexicon() {
  const [q, setQ] = useState("");
  const lang = getLang();
  const list = useMemo(() => searchLexicon(q, lang), [q, lang]);
  const letters = useMemo(() => [...new Set(list.map((e) => e.term[0].toLocaleUpperCase(lang)))], [list, lang]);

  return (
    <div className="lex">
      <style>{`
        .lex { padding: 0 0 28px; }
        .lex-lead { color: #8a969c; font: 600 14px/1.4 Figtree, sans-serif; margin: 0 0 12px; }
        .lex-search {
          width: 100%; box-sizing: border-box; margin: 0 0 12px;
          background: #14191c; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 12px;
          padding: 12px 14px; font: 600 16px Figtree, sans-serif;
        }
        .lex-search:focus { outline: none; border-color: #5cc8b8; }
        .lex-az { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin: 0 0 8px; }
        .lex-az a {
          flex: 0 0 auto; min-width: 32px; height: 32px; border-radius: 8px;
          display: grid; place-items: center; color: #5cc8b8; background: #14191c;
          border: 1px solid #2f383d; font: 800 13px Figtree, sans-serif; text-decoration: none;
        }
        .lex-empty { color: #8a969c; font: 600 14px Figtree, sans-serif; }
        .lex-item { border-bottom: 1px solid #2f383d; scroll-margin-top: 76px; }
        .lex-details { color: #f4f7f6; }
        .lex-details summary {
          list-style: none; cursor: pointer; padding: 14px 28px 14px 2px; position: relative; scroll-margin-top: 76px;
          font: 700 18px/1.2 Figtree, sans-serif;
        }
        .lex-details summary::-webkit-details-marker { display: none; }
        .lex-details summary::after {
          content: "+"; position: absolute; right: 2px; top: 14px; color: #5cc8b8; font-size: 18px;
        }
        .lex-details[open] summary::after { content: "–"; }
        .lex-details .lex-brand { color: #5cc8b8; }
        .lex-body { color: #d5dcde; font: 600 15px/1.45 Figtree, sans-serif; margin: 0 0 8px; }
        .lex-letter { color: #5cc8b8; font: 800 12px Figtree, sans-serif; letter-spacing: 0.14em; margin: 14px 0 0; }
        .lex-fig { margin: 0 0 14px; }
        .lex-fig img { display: block; width: 100%; height: auto; border-radius: 12px; background: #101416; }
      `}</style>
      <p className="lex-lead">{t("Kurze Erklärungen zum Nachschlagen – tipp einen Begriff an.")}</p>
      <input
        className="lex-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("Begriff suchen")}
        aria-label={t("Begriff suchen")}
        enterKeyHint="search"
      />
      {letters.length > 1 ? (
        <nav className="lex-az" aria-label={t("Buchstaben")}>
          {letters.map((ch) => (
            <a
              key={ch}
              href={`#lex-${ch}`}
              onClick={(ev) => {
                // Kein Hash-Sprung: der würde popstate auslösen und die App zur Startseite schicken.
                ev.preventDefault();
                document.getElementById(`lex-${ch}`)?.scrollIntoView({ block: "start" });
              }}
            >{ch}</a>
          ))}
        </nav>
      ) : null}
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
                  {/* Bild bleibt in der Liste – kein Vollbild mehr beim Antippen */}
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
