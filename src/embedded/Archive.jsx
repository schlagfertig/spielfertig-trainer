import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addSheet, getSheet, lastId, listSheets, loadArchiveView,
  rememberLast, removeSheet, saveArchiveView, updateSheetMeta,
} from "../lib/archive.js";
import { allTags, filterSheets, fold, MAX_NAME_LEN, MAX_TAG_LEN, MAX_TAGS, normTags, suggestTags } from "../lib/archiveMeta.js";
import { fmtDate, t } from "../lib/i18n.js";

const ARCH_CSS = `
  .arch-tools { display: flex; gap: 8px; margin: 0 0 10px; }
  .arch-search { flex: 1; min-width: 0; background: #161a1d; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 12px; }
  .arch-sort { flex: 0 0 auto; max-width: 44%; background: #161a1d; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 8px; }
  .arch-search:focus-visible, .arch-sort:focus-visible, .arch-field:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 1px; }
  .arch-tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 10px; }
  .arch-chip { background: transparent; color: #8a969c; border: 1px solid #2f383d; border-radius: 999px; padding: 7px 12px; font: 700 14px Figtree, sans-serif; cursor: pointer; min-height: 36px; }
  .arch-chip.on { background: #5cc8b8; color: #06120f; border-color: #5cc8b8; }
  .arch-chip .n { opacity: .7; font-weight: 600; margin-left: 4px; }
  .arch-count { color: #8a969c; font-size: 14px; margin: 0 0 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .arch-link { background: none; border: 0; color: #5cc8b8; font: 700 14px Figtree, sans-serif; text-decoration: underline; padding: 6px 0; cursor: pointer; }
  .arch-rowtags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .arch-tag { background: #13211f; color: #5cc8b8; border: 1px solid rgba(92,200,184,.35); border-radius: 999px; padding: 2px 8px; font: 700 12px Figtree, sans-serif; }
  .arch-edit .modal-card { width: min(460px, 100%); }
  .arch-label { display: block; color: #8a969c; font-weight: 700; font-size: 14px; margin: 10px 0 6px; }
  .arch-field { width: 100%; box-sizing: border-box; background: #161a1d; color: #f4f7f6; border: 1px solid #2f383d; border-radius: 10px; padding: 10px 12px; }
  .arch-cur { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 8px; }
  .arch-cur .arch-chip { color: #06120f; background: #5cc8b8; border-color: #5cc8b8; }
  .arch-hint { color: #8a969c; font-size: 13px; margin: 6px 0 0; }
  .arch-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  /* Liste: ausgewähltes Blatt türkis markiert (Rahmen, Fläche, Label) */
  .arch-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 10px; border: 1px solid #2f383d; border-radius: 10px; background: #1c2226; }
  .arch-row.on { border: 2px solid #5cc8b8; padding: 9px; background: rgba(92,200,184,.14); box-shadow: 0 0 0 1px rgba(92,200,184,.25); }
  .arch-open { flex: 1 1 170px; min-width: 0; text-align: left; background: transparent; border: 0; color: #f4f7f6; padding: 0; cursor: pointer; }
  .arch-open:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 3px; border-radius: 6px; }
  .arch-sel { display: inline-block; margin-left: 8px; vertical-align: 2px; background: #5cc8b8; color: #06120f; border-radius: 999px; padding: 2px 8px; font: 800 11px Figtree, sans-serif; letter-spacing: .06em; text-transform: uppercase; }
  /* Vorschau-Popup (Einzelseite) */
  .arch-prev .modal-card { width: min(560px, 100%); display: flex; flex-direction: column; gap: 10px; }
  .arch-kick { color: #5cc8b8; font: 800 12px Figtree, sans-serif; letter-spacing: .12em; text-transform: uppercase; }
  .arch-prev-name { color: #f4f7f6; font: 700 20px Figtree, sans-serif; overflow-wrap: anywhere; margin: 2px 0 0; }
  .arch-prev-view { background: #0b0d0e; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 120px; }
  .arch-prev-view img { display: block; width: 100%; height: auto; max-height: 52dvh; object-fit: contain; }
  .arch-prev-view iframe { display: block; width: 100%; height: 52dvh; border: 0; background: #fff; }
  .arch-prev .arch-actions { margin-top: 0; }
  /* Vollbild: eine Seite, ‹ › blättert durch die Liste */
  .arch-full { position: fixed; inset: 0; z-index: 60; background: #0b0d0e; display: flex; flex-direction: column; }
  .arch-full-bar { display: flex; align-items: center; gap: 8px; padding: calc(8px + env(safe-area-inset-top, 0px)) 10px 8px; background: #161a1d; border-bottom: 1px solid #2f383d; }
  .arch-full-title { flex: 1; min-width: 0; color: #f4f7f6; }
  .arch-full-title strong { display: block; font: 700 16px Figtree, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .arch-full-title span { color: #8a969c; font: 700 12px Figtree, sans-serif; letter-spacing: .06em; }
  .arch-full-body { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; touch-action: pan-y pinch-zoom; }
  .arch-full-body img { display: block; max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; }
  .arch-full-body iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
  .arch-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 48px; height: 64px; border-radius: 12px; border: 1px solid rgba(92,200,184,.6); background: rgba(22,26,29,.78); color: #5cc8b8; font: 700 34px/1 Oswald, sans-serif; cursor: pointer; }
  .arch-nav.prev { left: 6px; }
  .arch-nav.next { right: 6px; }
  .arch-nav:disabled { opacity: .25; cursor: default; }
  .arch-nav:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 2px; }
`;

function EditDialog({ row, known, onCancel, onSave }) {
  const [name, setName] = useState(row.name || "");
  const [tags, setTags] = useState(normTags(row.tags));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const full = tags.length >= MAX_TAGS;
  const sugg = suggestTags(known, tags, draft);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function add(raw) {
    const next = normTags([...tags, ...normTags(raw)]);
    setTags(next);
    setDraft("");
  }
  function remove(tag) {
    setTags(tags.filter((x) => fold(x) !== fold(tag)));
  }
  async function save(e) {
    e?.preventDefault();
    setBusy(true);
    await onSave({ name, tags: normTags([...tags, ...normTags(draft)]) });
    setBusy(false);
  }

  return (
    <div className="modal arch-edit" style={{ zIndex: 45 }} onClick={onCancel}>
      <form className="modal-card" role="dialog" aria-modal="true" aria-labelledby="arch-edit-h" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="modal-head" id="arch-edit-h">{t("Name & Tags")}</div>
        <label className="arch-label" htmlFor="arch-name">{t("Name")}</label>
        <input id="arch-name" className="arch-field" value={name} maxLength={MAX_NAME_LEN} autoFocus onChange={(e) => setName(e.target.value)} />
        <label className="arch-label" htmlFor="arch-tag">{t("Tags")}</label>
        {tags.length ? (
          <div className="arch-cur">
            {tags.map((tag) => (
              <button key={tag} type="button" className="arch-chip" onClick={() => remove(tag)} aria-label={t("Tag entfernen: {tag}", { tag })}>{tag} ×</button>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="arch-tag"
            className="arch-field"
            value={draft}
            maxLength={MAX_TAG_LEN}
            disabled={full}
            placeholder={full ? t("Höchstens {n} Tags.", { n: MAX_TAGS }) : t("Tag hinzufügen")}
            enterKeyHint="done"
            onChange={(e) => {
              const v = e.target.value;
              if (/[,;]/.test(v)) add(v);
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) { e.preventDefault(); add(draft); }
              if (e.key === "Backspace" && !draft && tags.length) remove(tags[tags.length - 1]);
            }}
          />
          <button type="button" className="ghost" disabled={!draft.trim() || full} onClick={() => add(draft)} aria-label={t("Tag hinzufügen")}>+</button>
        </div>
        {sugg.length && !full ? (
          <>
            <div className="arch-label">{t("Vorschläge")}</div>
            <div className="arch-cur" style={{ margin: 0 }}>
              {sugg.map((tag) => (
                <button key={tag} type="button" className="arch-chip" style={{ background: "transparent", color: "#5cc8b8", borderColor: "rgba(92,200,184,.45)" }} onClick={() => add(tag)}>+ {tag}</button>
              ))}
            </div>
          </>
        ) : null}
        <p className="arch-hint">{t("Optional, z. B. Paradiddle, Fills, Groove.")}</p>
        <div className="arch-actions">
          <button type="button" className="ghost" onClick={onCancel}>{t("Abbrechen")}</button>
          <button type="submit" className="ghost on" disabled={busy}>{t("Speichern")}</button>
        </div>
      </form>
    </div>
  );
}

function useObjectUrl(blob) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function useSheet(id) {
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!id) {
      setFile(null);
      return undefined;
    }
    let gone = false;
    getSheet(id).then((rec) => { if (!gone) setFile(rec); }).catch(() => { if (!gone) setFile(null); });
    return () => { gone = true; };
  }, [id]);
  const url = useObjectUrl(file?.blob);
  return { file, url };
}

function SheetView({ file, url }) {
  if (!file || !url) return <div style={{ color: "#8a969c", padding: 16 }} aria-busy="true">…</div>;
  if (file.kind === "pdf") return <iframe title={file.name} src={url} />;
  return <img src={url} alt={file.name} />;
}

/* Vorschau einer Seite im Popup; „Auswählen“ markiert das Blatt und öffnet das Vollbild. */
function PreviewDialog({ id, onClose, onSelect }) {
  const { file, url } = useSheet(id);
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal arch-prev" style={{ zIndex: 45 }} onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="arch-prev-h" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="arch-kick">{t("Einzelseite")}</div>
          <h2 className="arch-prev-name" id="arch-prev-h">{file?.name || "…"}</h2>
        </div>
        <div className="arch-prev-view"><SheetView file={file} url={url} /></div>
        <div className="arch-actions">
          <button type="button" className="ghost" onClick={onClose}>{t("Schließen")}</button>
          <button type="button" ref={btn} className="ghost on" onClick={() => onSelect(id)}>{t("Auswählen")}</button>
        </div>
      </div>
    </div>
  );
}

/* Vollbild: eine Seite groß; ‹ › (Pfeiltasten, Wischen) springt zum vorigen/nächsten Blatt der Liste. */
function FullView({ id, list, onMove, onClose }) {
  const { file, url } = useSheet(id);
  const ref = useRef(null);
  const swipe = useRef(null);
  const pos = list.findIndex((r) => r.id === id);
  const prevId = pos > 0 ? list[pos - 1].id : "";
  const nextId = pos >= 0 && pos < list.length - 1 ? list[pos + 1].id : "";
  const name = file?.name || list[pos]?.name || "";
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    // echtes Vollbild, wo der Browser es erlaubt (iPhone: nicht für Elemente – dann bleibt die Fläche bildschirmfüllend)
    try { el?.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    const onFs = () => { if (!document.fullscreenElement) onCloseRef.current(); };
    const t0 = window.setTimeout(() => document.addEventListener("fullscreenchange", onFs), 400);
    return () => {
      window.clearTimeout(t0);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && prevId) onMove(prevId);
      else if (e.key === "ArrowRight" && nextId) onMove(nextId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onMove, prevId, nextId]);

  return (
    <div className="arch-full" ref={ref} role="dialog" aria-modal="true" aria-label={`${t("Einzelseite")}: ${name}`}>
      <div className="arch-full-bar">
        <div className="arch-full-title">
          <strong>{name}</strong>
          <span>{t("Einzelseite")} · {t("{n} von {m}", { n: pos + 1, m: list.length })}</span>
        </div>
        <button type="button" className="ghost" onClick={onClose}>{t("Schließen")}</button>
      </div>
      <div
        className="arch-full-body"
        onTouchStart={(e) => { const p = e.changedTouches[0]; swipe.current = { x: p.clientX, y: p.clientY }; }}
        onTouchEnd={(e) => {
          const s0 = swipe.current; swipe.current = null;
          if (!s0 || e.changedTouches.length !== 1) return;
          const dx = e.changedTouches[0].clientX - s0.x;
          const dy = Math.abs(e.changedTouches[0].clientY - s0.y);
          if (Math.abs(dx) > 60 && dy < 50) {
            if (dx < 0 && nextId) onMove(nextId);
            if (dx > 0 && prevId) onMove(prevId);
          }
        }}
      >
        <button type="button" className="arch-nav prev" onClick={() => onMove(prevId)} disabled={!prevId} aria-label={t("Vorheriges Blatt")}>‹</button>
        <SheetView file={file} url={url} />
        <button type="button" className="arch-nav next" onClick={() => onMove(nextId)} disabled={!nextId} aria-label={t("Nächstes Blatt")}>›</button>
      </div>
    </div>
  );
}

export default function Archive() {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(() => lastId());
  const [preview, setPreview] = useState("");
  const [full, setFull] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [tagF, setTagF] = useState("");
  const [sort, setSort] = useState(() => loadArchiveView().sort);
  const [edit, setEdit] = useState(null);
  const pick = useRef(null);
  const known = useMemo(() => allTags(rows), [rows]);
  const shown = useMemo(() => filterSheets(rows, { q, tag: tagF, sort }), [rows, q, tagF, sort]);
  const filtering = !!(q.trim() || tagF);
  const tools = rows.length >= 2;
  const list = tools ? shown : rows;

  async function refresh() {
    try {
      setRows(await listSheets());
    } catch {
      setErr(t("Hier nicht verfügbar (privater Modus?)."));
    }
  }

  useEffect(() => { refresh(); }, []);

  function choose(id) {
    setSel(id);
    rememberLast(id);
  }

  async function onFiles(files) {
    const picked = files?.[0];
    if (!picked) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const id = await addSheet(picked);
      await refresh();
      choose(id);
      setOk(t("Gespeichert. Extra-Kopie in Dateien oder Cloud legen."));
    } catch (e) {
      setErr(e.message || t("Speichern fehlgeschlagen."));
    }
    setBusy(false);
    if (pick.current) pick.current.value = "";
  }

  async function drop(id) {
    if (!window.confirm(t("Blatt vom Gerät löschen?"))) return;
    await removeSheet(id);
    if (sel === id) setSel("");
    setOk(t("Gelöscht."));
    await refresh();
  }

  async function saveMeta(id, meta) {
    try {
      await updateSheetMeta(id, meta);
      setErr("");
      setOk(t("Name und Tags gespeichert."));
    } catch (e) {
      setErr(e.message || t("Speichern fehlgeschlagen."));
    }
    setEdit(null);
    await refresh();
  }

  function changeSort(v) {
    setSort(v);
    saveArchiveView({ sort: v });
  }

  // Tag-Filter aufheben, wenn es den Tag nicht mehr gibt (z. B. nach Umbenennen/Löschen)
  useEffect(() => {
    if (tagF && !known.some((x) => fold(x.tag) === fold(tagF))) setTagF("");
  }, [known, tagF]);

  const closePreview = useCallback(() => setPreview(""), []);
  const closeFull = useCallback(() => setFull(""), []);
  const selectAndOpen = useCallback((id) => {
    setSel(id);
    rememberLast(id);
    setPreview("");
    setFull(id);
  }, []);
  const moveFull = useCallback((id) => {
    if (!id) return;
    setSel(id);
    rememberLast(id);
    setFull(id);
  }, []);

  return (
    <div>
      <style>{ARCH_CSS}</style>
      <div role="note" style={{ background: "rgba(58,46,18,.55)", color: "#e8b84b", border: "1px solid rgba(232,184,75,.45)", borderRadius: 12, padding: "12px 14px", margin: "0 0 14px", fontSize: 15, lineHeight: 1.4 }}>
        <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>{t("Deine Noten bleiben auf diesem Gerät")}</strong>
        {t("Fotos und PDFs werden nur hier im Browser gespeichert. Auf einem anderen Gerät siehst du sie nicht, und wenn du die Browserdaten löschst, sind sie weg. Bewahre deine Originale also zusätzlich woanders auf.")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="play" disabled={busy} onClick={() => pick.current?.click()}>{busy ? "…" : t("Notenblatt hinzufügen")}</button>
      </div>
      <input ref={pick} type="file" accept="image/*,application/pdf" hidden onChange={(e) => onFiles(e.target.files)} />
      {err ? <p role="status" style={{ color: "#e05c5c", fontWeight: 700 }}>{err}</p> : null}
      {ok ? <p role="status" style={{ color: "#5cc8b8", fontWeight: 700 }}>{ok}</p> : null}
      {!rows.length && !err ? <p style={{ color: "#8a969c" }}>{t("Noch nichts hier. Foto oder PDF hinzufügen.")}</p> : null}
      {tools ? (
        <>
          <div className="arch-tools">
            <input type="search" className="arch-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Name/Tag suchen")} aria-label={t("Suchen")} enterKeyHint="search" />
            <select className="arch-sort" value={sort} onChange={(e) => changeSort(e.target.value)} aria-label={t("Sortieren")}>
              <option value="new">{t("Neueste zuerst")}</option>
              <option value="old">{t("Älteste zuerst")}</option>
              <option value="name">{t("Name A–Z")}</option>
            </select>
          </div>
          {known.length ? (
            <div className="arch-tags" role="group" aria-label={t("Nach Tag filtern")}>
              <button type="button" className={tagF ? "arch-chip" : "arch-chip on"} aria-pressed={!tagF} onClick={() => setTagF("")}>{t("Alle", null, "arch")}</button>
              {known.map(({ tag, count }) => {
                const on = fold(tag) === fold(tagF);
                return (
                  <button key={tag} type="button" className={on ? "arch-chip on" : "arch-chip"} aria-pressed={on} onClick={() => setTagF(on ? "" : tag)}>
                    {tag}<span className="n">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {filtering ? (
            <div className="arch-count" role="status">
              <span>{shown.length ? t("{n} von {m}", { n: shown.length, m: rows.length }) : t("Nichts gefunden.")}</span>
              <button type="button" className="arch-link" onClick={() => { setQ(""); setTagF(""); }}>{t("Filter zurücksetzen")}</button>
            </div>
          ) : null}
        </>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((r) => {
          const on = r.id === sel;
          return (
            <div key={r.id} className={on ? "arch-row on" : "arch-row"} data-id={r.id}>
              <button type="button" className="arch-open" onClick={() => setPreview(r.id)} aria-current={on ? "true" : undefined} aria-haspopup="dialog">
                <strong style={{ display: "block", fontSize: 18 }}>
                  {r.name}
                  {on ? <span className="arch-sel">{t("Ausgewählt")}</span> : null}
                </strong>
                <span style={{ color: "#8a969c", fontSize: 14 }}>
                  {r.kind === "pdf" ? "PDF" : t("Foto")}
                  {" · "}{fmtDate(r.added)}
                </span>
                {r.tags?.length ? (
                  <span className="arch-rowtags">
                    {r.tags.map((tag) => <span key={tag} className="arch-tag">{tag}</span>)}
                  </span>
                ) : null}
              </button>
              <span style={{ display: "flex", gap: 6, marginLeft: "auto", whiteSpace: "nowrap" }}>
              <button type="button" className="ghost" onClick={() => setEdit(r)} aria-label={t("Name & Tags bearbeiten: {name}", { name: r.name })}>{t("Name & Tags")}</button>
              <button type="button" className="ghost" onClick={() => drop(r.id)}>{t("Löschen")}</button>
              </span>
            </div>
          );
        })}
      </div>
      {preview ? <PreviewDialog id={preview} onClose={closePreview} onSelect={selectAndOpen} /> : null}
      {full ? <FullView id={full} list={list.some((r) => r.id === full) ? list : rows} onMove={moveFull} onClose={closeFull} /> : null}
      {edit ? <EditDialog row={edit} known={known} onCancel={() => setEdit(null)} onSave={(meta) => saveMeta(edit.id, meta)} /> : null}
    </div>
  );
}
