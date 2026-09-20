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
    <div>
      <p style={{ color: "#8a969c", marginTop: 0, fontSize: 16 }}>
        Nur auf diesem Gerät. Foto oder PDF, max. 12 MB. Kein Account.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="play" disabled={busy} onClick={() => pick.current?.click()}>{busy ? "…" : "Hinzufügen"}</button>
        {overlay && <button type="button" className="ghost" onClick={onClose}>Schließen</button>}
      </div>
      <input ref={pick} type="file" accept="image/*,application/pdf" hidden onChange={(e) => onFiles(e.target.files)} />
      {err ? <p style={{ color: "#e05c5c" }}>{err}</p> : null}
      {!rows.length && !err ? <p style={{ color: "#8a969c" }}>Noch keine Blätter.</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, border: "1px solid #2f383d", borderRadius: 10, background: openId === r.id ? "#13211f" : "#1c2226" }}>
            <button type="button" onClick={() => show(r.id)} style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, color: "#f4f7f6" }}>
              <strong style={{ display: "block", fontSize: 18 }}>{r.name}</strong>
              <span style={{ color: "#8a969c", fontSize: 14 }}>{r.kind === "pdf" ? "PDF" : "Foto"} · {new Date(r.added).toLocaleDateString()}</span>
            </button>
            <button type="button" className="ghost" onClick={() => drop(r.id)}>Löschen</button>
          </div>
        ))}
      </div>
      {file && url ? (
        <div style={{ marginTop: 14, background: "#0b0d0e", borderRadius: 10, overflow: "auto", maxHeight: overlay ? "52dvh" : "70dvh" }}>
          {file.kind === "pdf" ? (
            <iframe title={file.name} src={url} style={{ width: "100%", height: overlay ? "48dvh" : "68dvh", border: 0, background: "#fff" }} />
          ) : (
            <img src={url} alt={file.name} style={{ display: "block", width: "100%", height: "auto" }} />
          )}
        </div>
      ) : null}
    </div>
  );

  if (!overlay) return body;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(720px, 100%)", maxHeight: "94dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">Noten</div>
        {body}
      </div>
    </div>
  );
}
