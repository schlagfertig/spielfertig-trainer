import { BRAND, brandLine } from "./brand.js";
import { todayDe } from "./print.js";

export function PrintPreview({ tiles = [], perPage = 6, section = "Rudiments" }) {
  const cols = perPage <= 4 ? 1 : 2;
  const pages = Math.max(1, Math.ceil((tiles.length || 1) / perPage));
  const first = tiles.slice(0, perPage);
  return (
    <div className="sheet-prev">
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
  );
}
