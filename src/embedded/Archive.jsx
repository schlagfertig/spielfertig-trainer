import { useEffect, useRef, useState } from "react";
import {
  addSheet, getSheet, lastId, lastId2, listSheets,
  rememberLast, rememberLast2, removeSheet, renameSheet,
} from "../lib/archive.js";

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
    return <div style={{ flex: 1, minHeight: 80, color: "#8a969c", display: "flex", alignItems: "center", justifyContent: "center" }}>Tipp auf ein Blatt</div>;
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
  const [busy, setBusy] = useState(false);
  const pick = useRef(null);
  const a = useSheet(openA);
  const b = useSheet(split ? openB : "");

  async function refresh() {
    try {
      setRows(await listSheets());
    } catch {
      setErr("Archiv auf diesem Gerät nicht verfügbar (privater Modus?).");
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onFiles(list) {
    const picked = list?.[0];
    if (!picked) return;
    setBusy(true);
    setErr("");
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
    } catch (e) {
      setErr(e.message || "Konnte das Blatt nicht speichern.");
    }
    setBusy(false);
    if (pick.current) pick.current.value = "";
  }

  async function drop(id) {
    if (!window.confirm("Blatt vom Gerät löschen?")) return;
    await removeSheet(id);
    if (openA === id) setOpenA("");
    if (openB === id) setOpenB("");
    await refresh();
  }

  async function rename(id, current) {
    const next = window.prompt("Name", current || "");
    if (next == null) return;
    await renameSheet(id, next);
    await refresh();
  }

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
      <p style={{ color: "#8a969c", marginTop: 0, fontSize: 16 }}>
        Nur auf diesem Gerät. Foto oder PDF, max. 12 MB.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className="play" disabled={busy} onClick={() => pick.current?.click()}>{busy ? "…" : "Hinzufügen"}</button>
        <button type="button" className={split ? "ghost on" : "ghost"} onClick={toggleSplit}>2×</button>
        {overlay && <button type="button" className="ghost" onClick={onClose}>Schließen</button>}
      </div>
      {split ? (
        <div className="seg" style={{ marginBottom: 12, width: "fit-content" }}>
          <button type="button" className={pickSide === "a" ? "on" : ""} onClick={() => setPickSide("a")}>Links</button>
          <button type="button" className={pickSide === "b" ? "on" : ""} onClick={() => setPickSide("b")}>Rechts</button>
        </div>
      ) : null}
      <input ref={pick} type="file" accept="image/*,application/pdf" hidden onChange={(e) => onFiles(e.target.files)} />
      {err ? <p style={{ color: "#e05c5c" }}>{err}</p> : null}
      {!rows.length && !err ? <p style={{ color: "#8a969c" }}>Noch keine Blätter.</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: 10, border: "1px solid #2f383d", borderRadius: 10, background: r.id === openA || r.id === openB ? "#13211f" : "#1c2226" }}>
            <button type="button" onClick={() => show(r.id)} style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, color: "#f4f7f6" }}>
              <strong style={{ display: "block", fontSize: 18 }}>{r.name}</strong>
              <span style={{ color: "#8a969c", fontSize: 14 }}>
                {r.kind === "pdf" ? "PDF" : "Foto"}
                {r.id === openA ? " · links" : r.id === openB && split ? " · rechts" : ""}
                {" · "}{new Date(r.added).toLocaleDateString()}
              </span>
            </button>
            <button type="button" className="ghost" onClick={() => rename(r.id, r.name)}>Name</button>
            <button type="button" className="ghost" onClick={() => drop(r.id)}>Löschen</button>
          </div>
        ))}
      </div>
      {(openA || (split && openB)) ? (
        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "stretch", background: "#0b0d0e", borderRadius: 10, overflow: "auto", maxHeight: overlay ? "54dvh" : "70dvh" }}>
          <Pane file={a.file} url={a.url} overlay={overlay} split={split} />
          {split ? <Pane file={b.file} url={b.url} overlay={overlay} split /> : null}
        </div>
      ) : null}
    </div>
  );

  if (!overlay) return body;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(920px, 100%)", maxHeight: "94dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">Noten</div>
        {body}
      </div>
    </div>
  );
}
