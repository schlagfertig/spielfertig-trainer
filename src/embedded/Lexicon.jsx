import { useMemo, useState } from "react";
import { searchLexicon } from "../lib/lexicon.js";
import { t, getLang } from "../lib/i18n.js";

export default function Lexicon() {
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState(null);
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
        .lex-item button {
          width: 100%; text-align: left; background: none; border: 0; color: #f4f7f6;
          padding: 14px 2px; font: 700 18px/1.2 Figtree, sans-serif;
          display: flex; justify-content: space-between; gap: 12px;
        }
        .lex-item button span { color: #5cc8b8; font-size: 14px; }
        .lex-item button .lex-brand { color: #5cc8b8; font: inherit; }
        .lex-body { color: #d5dcde; font: 600 15px/1.45 Figtree, sans-serif; margin: 0 0 8px; }
        .lex-letter { color: #5cc8b8; font: 800 12px Figtree, sans-serif; letter-spacing: 0.14em; margin: 14px 0 0; }
        .lex-fig { margin: 0 0 14px; }
        .lex-fig button { display: block; width: 100%; padding: 0; border: 0; background: none; border-radius: 12px; overflow: hidden; }
        .lex-fig img { display: block; width: 100%; height: auto; border-radius: 12px; background: #101416; }
        .lex-zoom {
          position: fixed; inset: 0; z-index: 40; display: grid; place-items: center;
          background: rgba(8, 10, 12, 0.88); padding: 18px;
        }
        .lex-zoom img { max-width: 100%; max-height: 86dvh; width: auto; height: auto; border-radius: 12px; }
        .lex-zoom button {
          position: absolute; top: calc(12px + env(safe-area-inset-top, 0px)); right: 12px;
          border: 1px solid #5cc8b8; background: #14191c; color: #f4f7f6;
          border-radius: 999px; padding: 8px 14px; font: 800 14px Figtree, sans-serif;
        }
      `}</style>
      <p className="lex-lead">{t("Kurze Erklärungen zum Nachschlagen. Kein Geschichtsbuch.")}</p>
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
      {zoom ? (
        <div className="lex-zoom" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <button type="button" onClick={() => setZoom(null)}>{t("Schließen")}</button>
          <img src={zoom.src} alt={zoom.alt} />
        </div>
      ) : null}
      {list.map((e, i) => {
        const ch = e.term[0].toLocaleUpperCase(lang);
        const prev = i > 0 ? list[i - 1].term[0].toLocaleUpperCase(lang) : "";
        const on = open === e.id;
        return (
          <div key={e.id} className="lex-item" id={ch !== prev ? `lex-${ch}` : undefined}>
            {ch !== prev ? <div className="lex-letter">{ch}</div> : null}
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? "" : e.id)}>
              {e.brand ? <span className="lex-brand">{e.term}</span> : e.term}
              <span aria-hidden="true">{on ? "–" : "+"}</span>
            </button>
            {on ? (
              <>
                <p className="lex-body">{e.text}</p>
                {e.img ? (
                  <figure className="lex-fig">
                    <button type="button" onClick={() => setZoom({ src: e.img, alt: e.alt || e.term })} aria-label={e.alt || e.term}>
                      <img src={e.img} alt={e.alt || e.term} loading="lazy" decoding="async" />
                    </button>
                  </figure>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
