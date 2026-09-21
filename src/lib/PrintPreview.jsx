import { BRAND, brandLine } from "./brand.js";
import { todayDe } from "./print.js";

export function PrintPreview({ tiles = [], perPage = 6, section = "Rudiments" }) {
  const cols = perPage <= 4 ? 1 : 2;
  const pages = Math.max(1, Math.ceil((tiles.length || 1) / perPage));
  const first = tiles.slice(0, perPage);
  return (
    <div className="sheet-prev">
      <div className="sheet-prev-kicker">Vorschau · erste Seite</div>
      <div className="sheet-prev-page">
        <div className="sheet-prev-head">
          <img src={BRAND.logo} alt="" />
          <div>
            <div className="sheet-prev-sec">{section}</div>
            <div className="sheet-prev-sub">{BRAND.product} · {todayDe()}</div>
          </div>
        </div>
        <div className="sheet-prev-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {first.length ? first.map(({ r, svg }) => (
            <article key={r.id} className="sheet-prev-tile">
              <h3>{r.label}</h3>
              <div className="sheet-prev-svg" dangerouslySetInnerHTML={{ __html: svg?.outerHTML || "" }} />
            </article>
          )) : <div className="sheet-prev-empty">Übungen anhaken — die Seite baut sich hier auf.</div>}
        </div>
        <div className="sheet-prev-foot">
          <span>{brandLine()}</span>
          <span>1 / {pages}{tiles.length ? ` · ${tiles.length}` : ""}</span>
        </div>
      </div>
      <style>{`
        .sheet-prev { margin: 12px 0 4px; }
        .sheet-prev-kicker {
          font: 800 11px/1 Figtree, sans-serif;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: #5cc8b8; margin: 0 0 8px;
        }
        .sheet-prev-page {
          background: #fff; color: #161a1d;
          border-radius: 8px; overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,.35);
        }
        .sheet-prev-head {
          display: flex; align-items: center; justify-content: space-between;
          background: #161a1d; color: #f4f7f6; padding: 8px 10px;
        }
        .sheet-prev-head img { height: 22px; width: auto; display: block; }
        .sheet-prev-sec {
          font-family: Oswald, sans-serif; font-size: 13px;
          letter-spacing: 0.08em; text-transform: uppercase; color: #5cc8b8; text-align: right;
        }
        .sheet-prev-sub { font-size: 10px; color: #8a969c; text-align: right; }
        .sheet-prev-grid { display: grid; gap: 6px; padding: 8px; min-height: 72px; }
        .sheet-prev-tile {
          border: 1px solid #5cc8b8; border-radius: 6px; padding: 6px 8px 8px; background: #fff;
        }
        .sheet-prev-tile h3 {
          margin: 0 0 4px; font: 700 10px/1.2 Oswald, sans-serif;
          letter-spacing: 0.04em; text-transform: uppercase; color: #0b3d38;
        }
        .sheet-prev-svg svg { width: 100%; height: auto; display: block; }
        .sheet-prev-empty { color: #8a969c; font-size: 13px; padding: 16px 8px; text-align: center; }
        .sheet-prev-foot {
          display: flex; justify-content: space-between; gap: 8px;
          padding: 6px 10px 8px; border-top: 1px solid #5cc8b8;
          font-size: 9px; letter-spacing: 0.03em; color: #5a666c;
        }
      `}</style>
    </div>
  );
}
