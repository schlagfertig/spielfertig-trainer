import { useEffect, useRef, useState } from "react";
import { addSheet, getSheet, lastId, listSheets, rememberLast, removeSheet } from "../lib/archive.js";

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

export default function Archive({ overlay = false, onClose }) {
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(overlay ? lastId() : "");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useRef(null);

  async function refresh() {
    try {
      setRows(await listSheets());
    } catch {
      setErr("Archiv auf diesem Gerät nicht verfügbar (privater Modus?).");
    }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!openId) {
      setFile(null);
      return undefined;
    }
    let gone = false;
    getSheet(openId).then((rec) => {
      if (!gone) setFile(rec);
    }).catch(() => {
      if (!gone) setFile(null);
    });
    return () => { gone = true; };
  }, [openId]);

  const url = useObjectUrl(file?.blob);

  async function onFiles(list) {
    const picked = list?.[0];
    if (!picked) return;
    setBusy(true);
    setErr("");
    try {
      const id = await addSheet(picked);
      await refresh();
      setOpenId(id);
    } catch (e) {
      setErr(e.message || "Konnte das Blatt nicht speichern.");
    }
    setBusy(false);
    if (pick.current) pick.current.value = "";
  }

  async function drop(id) {
    if (!window.confirm("Blatt vom Gerät löschen?")) return;
    await removeSheet(id);
    if (openId === id) {
      setOpenId("");
      setFile(null);
    }
    await refresh();
  }

  function show(id) {
    rememberLast(id);
    setOpenId(id);
  }

  const body = (
    <div className={overlay ? "archive overlay-body" : "archive"}>
      <p className="staff-hint" style={{ color: "#8a969c", marginTop: 0 }}>
        Nur auf diesem Gerät. Foto oder PDF, max. 12 MB. Kein Account.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="play" disabled={busy} onClick={() => pick.current?.click()}>{busy ? "…" : "Hinzufügen"}</button>
        {overlay && <button type="button" className="ghost" onClick={onClose}>Schließen</button>}
      </div>
      <input
        ref={pick}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      {err ? <p style={{ color: "#e05c5c" }}>{err}</p> : null}
      {!rows.length && !err ? <p style={{ color: "#8a969c" }}>Noch keine Blätter.</p> : null}
      <div className="archive-list">
        {rows.map((r) => (
          <div key={r.id} className={openId === r.id ? "archive-row on" : "archive-row"}>
            <button type="button" className="archive-open" onClick={() => show(r.id)}>
              <strong>{r.name}</strong>
              <span>{r.kind === "pdf" ? "PDF" : "Foto"} · {new Date(r.added).toLocaleDateString()}</span>
            </button>
            <button type="button" className="ghost" onClick={() => drop(r.id)}>Löschen</button>
          </div>
        ))}
      </div>
      {file && url ? (
        <div className="archive-view">
          {file.kind === "pdf" ? (
            <iframe title={file.name} src={url} className="archive-frame" />
          ) : (
            <img src={url} alt={file.name} className="archive-img" />
          )}
        </div>
      ) : null}
    </div>
  );

  if (!overlay) return body;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card archive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">Noten</div>
        {body}
      </div>
    </div>
  );
}
