import { useMemo, useState } from "react";
import { searchLexicon } from "../lib/lexicon.js";
import { t } from "../lib/i18n.js";

export default function Lexicon() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");
  const list = useMemo(() => searchLexicon(q), [q]);
  const letters = useMemo(() => [...new Set(list.map((e) => e.term[0].toLocaleUpperCase("de")))], [list]);

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
        .lex-item { border-bottom: 1px solid #2f383d; }
        .lex-item button {
          width: 100%; text-align: left; background: none; border: 0; color: #f4f7f6;
          padding: 14px 2px; font: 700 18px/1.2 Figtree, sans-serif;
          display: flex; justify-content: space-between; gap: 12px;
        }
        .lex-item button span { color: #5cc8b8; font-size: 14px; }
        .lex-body { color: #d5dcde; font: 600 15px/1.45 Figtree, sans-serif; margin: 0 0 14px; }
        .lex-letter { color: #5cc8b8; font: 800 12px Figtree, sans-serif; letter-spacing: 0.14em; margin: 14px 0 0; }
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
            <a key={ch} href={`#lex-${ch}`}>{ch}</a>
          ))}
        </nav>
      ) : null}
      {list.length === 0 ? <p className="lex-empty">{t("Kein Treffer.")}</p> : null}
      {list.map((e, i) => {
        const ch = e.term[0].toLocaleUpperCase("de");
        const prev = i > 0 ? list[i - 1].term[0].toLocaleUpperCase("de") : "";
        const on = open === e.id;
        return (
          <div key={e.id} className="lex-item" id={ch !== prev ? `lex-${ch}` : undefined}>
            {ch !== prev ? <div className="lex-letter">{ch}</div> : null}
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? "" : e.id)}>
              {e.term}
              <span aria-hidden="true">{on ? "–" : "+"}</span>
            </button>
            {on ? <p className="lex-body">{e.text}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
