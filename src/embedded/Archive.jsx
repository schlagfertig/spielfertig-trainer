import { useEffect, useMemo, useRef, useState } from "react";
import {
  addSheet, getSheet, lastId, lastId2, listSheets, loadArchiveView,
  rememberLast, rememberLast2, removeSheet, saveArchiveView, updateSheetMeta,
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

function Pane({ file, url, overlay, split }) {
  if (!file || !url) {
    return <div style={{ flex: 1, minHeight: 80, color: "#8a969c", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center" }}>{t("Blatt in der Liste wählen")}</div>;
  }
  const h = split ? (overlay ? "42dvh" : "56dvh") : (overlay ? "48dvh" : "68dvh");
  if (file.kind === "pdf") {
    return <iframe title={file.name} src={url} style={{ width: "100%", height: h, border: 0, background: "#fff", flex: 1 }} />;
  }
  return <img src={url} alt={file.name} style={{ display: "block", width: "100%", height: "auto", maxHeight: h, objectFit: "contain" }} />;
}

export default function Archive({ overlay = false, onClose }) {
  const [rows, setRows] = useState([]);
  const [openA, setOpenA] = useState(overlay ? lastId() : "");
  const [openB, setOpenB] = useState(overlay ? lastId2() : "");
  const [split, setSplit] = useState(!!(overlay && lastId2()));
  const [pickSide, setPickSide] = useState("a");
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
  const a = useSheet(openA);
  const b = useSheet(split ? openB : "");

  async function refresh() {
    try {
      setRows(await listSheets());
    } catch {
      setErr(t("Hier nicht verfügbar (privater Modus?)."));
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onFiles(list) {
    const picked = list?.[0];
    if (!picked) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const id = await addSheet(picked);
      await refresh();
      if (split && pickSide === "b") {
        setOpenB(id);
        rememberLast2(id);
      } else {
        setOpenA(id);
        rememberLast(id);
      }
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
    if (openA === id) setOpenA("");
    if (openB === id) setOpenB("");
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

  function show(id) {
    if (split && pickSide === "b") {
      setOpenB(id);
      rememberLast2(id);
      return;
    }
    setOpenA(id);
    rememberLast(id);
  }

  function toggleSplit() {
    const on = !split;
    setSplit(on);
    if (on) {
      setPickSide("b");
      if (!openB && rows[1]?.id && rows[1].id !== openA) {
        setOpenB(rows[1].id);
        rememberLast2(rows[1].id);
      }
    } else {
      setPickSide("a");
    }
  }

  const body = (
    <div>
      <style>{ARCH_CSS}</style>
      <div role="note" style={{ background: "rgba(58,46,18,.55)", color: "#e8b84b", border: "1px solid rgba(232,184,75,.45)", borderRadius: 12, padding: "12px 14px", margin: "0 0 14px", fontSize: 15, lineHeight: 1.4 }}>
        <strong style={{ display: "block", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 12, marginBottom: 4 }}>{t("Nur auf diesem Gerät")}</strong>
        {t("Fotos und PDFs bleiben im Browser. Anderes Gerät oder Cache leeren löscht sie — Original extra sichern.")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="play" disabled={busy} onClick={() => pick.current?.click()}>{busy ? "…" : t("Hinzufügen")}</button>
        <button type="button" className={split ? "ghost on" : "ghost"} onClick={toggleSplit} aria-pressed={split} aria-label={t("Zwei Seiten")}>{t("2 Seiten")}</button>
        {overlay && <button type="button" className="ghost" onClick={onClose}>{t("Schließen")}</button>}
      </div>
      {split ? (
        <div className="seg" style={{ marginBottom: 12, width: "fit-content" }}>
          <button type="button" className={pickSide === "a" ? "on" : ""} onClick={() => setPickSide("a")}>{t("Links")}</button>
          <button type="button" className={pickSide === "b" ? "on" : ""} onClick={() => setPickSide("b")}>{t("Rechts")}</button>
        </div>
      ) : null}
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
        {(tools ? shown : rows).map((r) => (
          <div key={r.id} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: 10, border: "1px solid #2f383d", borderRadius: 10, background: r.id === openA || r.id === openB ? "#13211f" : "#1c2226" }}>
            <button type="button" onClick={() => show(r.id)} style={{ flex: "1 1 170px", minWidth: 0, textAlign: "left", background: "transparent", border: 0, color: "#f4f7f6" }}>
              <strong style={{ display: "block", fontSize: 18 }}>{r.name}</strong>
              <span style={{ color: "#8a969c", fontSize: 14 }}>
                {r.kind === "pdf" ? "PDF" : t("Foto")}
                {r.id === openA ? ` · ${t("links")}` : r.id === openB && split ? ` · ${t("rechts")}` : ""}
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
        ))}
      </div>
      {(openA || (split && openB)) ? (
        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "stretch", background: "#0b0d0e", borderRadius: 10, overflow: "auto", maxHeight: overlay ? "54dvh" : "70dvh" }}>
          <Pane file={a.file} url={a.url} overlay={overlay} split={split} />
          {split ? <Pane file={b.file} url={b.url} overlay={overlay} split /> : null}
        </div>
      ) : null}
      {edit ? <EditDialog row={edit} known={known} onCancel={() => setEdit(null)} onSave={(meta) => saveMeta(edit.id, meta)} /> : null}
    </div>
  );

  if (!overlay) return body;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(920px, 100%)", maxHeight: "94dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">{t("Noten")}</div>
        {body}
      </div>
    </div>
  );
}
