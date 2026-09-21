import { useEffect, useMemo, useState } from "react";
import { RUDIMENTS } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { deliverPng, printElement, sheetHtml, tilesToPng } from "../lib/print.js";
import { PrintPreview } from "../lib/PrintPreview.jsx";

const DIM = "#8a969c";
const SECTION = "Rudiments";

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function Banner({ tone, text }) {
  if (!text) return null;
  const bg = tone === "err" ? "#3a1a1a" : tone === "warn" ? "#3a2e12" : "#13211f";
  const fg = tone === "err" ? "#e05c5c" : tone === "warn" ? "#e8b84b" : "#5cc8b8";
  return (
    <p role="status" style={{ background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, margin: "10px 0 0" }}>
      {text}
    </p>
  );
}

export function PrintDialog({ sel, onClose }) {
  const [picked, setPicked] = useState(() => [sel]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tone, setTone] = useState("ok");
  const [tick, setTick] = useState(0);
  const current = RUDIMENTS.find((r) => r.id === sel);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setTick((n) => n + 1));
    return () => window.cancelAnimationFrame(id);
  }, [picked, perPage]);

  const tiles = useMemo(() => {
    const host = document.getElementById("print-host");
    if (!host) return [];
    return RUDIMENTS.filter((r) => picked.includes(r.id))
      .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
      .filter((x) => x.svg);
  }, [picked, tick]);

  function status(text, nextTone = "ok") {
    setNote(text);
    setTone(nextTone);
  }

  async function savePng(list, reason) {
    const canvas = await tilesToPng(list, 2, perPage, SECTION);
    const result = await deliverPng(canvas, "spielfertig-rudiments.png", "save");
    if (result) status(reason || "PNG gespeichert — Dateien / Downloads prüfen.");
    else status("Speichern abgebrochen.", "warn");
    return result;
  }

  async function doPrint(mode) {
    setBusy(true);
    status(mode === "print" ? "Blatt wird erzeugt…" : mode === "share" ? "Teilen wird vorbereitet…" : "PNG wird erzeugt…");
    const host = document.getElementById("print-host");
    const list = host
      ? RUDIMENTS.filter((r) => picked.includes(r.id))
        .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
        .filter((x) => x.svg)
      : [];
    if (!list.length) {
      status("Keine Notation zum Export.", "err");
      setBusy(false);
      return;
    }
    try {
      if (mode === "print") {
        if (isStandalone()) {
          await savePng(list, "Home-Bildschirm: Systemdruck fehlt. Blatt als PNG gespeichert.");
        } else {
          const printed = printElement(sheetHtml(list, perPage, SECTION));
          if (printed) status("Druckdialog geöffnet. Fertig? Oben auf Zurück.");
          else await savePng(list, "Druck blockiert oder fehlgeschlagen — PNG gespeichert.");
        }
      } else if (mode === "share") {
        const canvas = await tilesToPng(list, 2, perPage, SECTION);
        const result = await deliverPng(canvas, "spielfertig-rudiments.png", "share");
        if (result === "share") status("Geteilt.");
        else if (result === "save") status("Teilen nicht verfügbar — PNG gespeichert.", "warn");
        else status("Teilen abgebrochen.", "warn");
      } else {
        await savePng(list);
      }
    } catch {
      status("Konnte das Blatt nicht erzeugen. Bitte erneut versuchen.", "err");
    }
    setBusy(false);
  }

  const onlyCurrent = picked.length === 1 && picked[0] === sel;

  return (
    <div className="modal" style={{ top: 52, zIndex: 30, alignItems: "stretch" }}>
      <div className="modal-card" style={{ width: "100%", maxWidth: 560, maxHeight: "none", margin: "0 auto" }}>
        <div className="modal-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span>Rudiments drucken</span>
          <button type="button" className="play" onClick={onClose} style={{ padding: "10px 16px", fontSize: 15 }}>Zurück</button>
        </div>
        <p style={{ color: DIM, fontSize: 15 }}>
          {onlyCurrent
            ? `Aktuelles Blatt: ${current?.label || "Übung"}`
            : `Auswahl: ${picked.length} Übungen`}
          {" · "}Vorschau unten.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {[4, 6, 10, 12].map((n) => (
            <button key={n} type="button" className={perPage === n ? "chip on" : "chip"} onClick={() => setPerPage(n)}>{n} / Seite</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, margin: "0 0 8px" }}>
          <button type="button" className="ghost" onClick={() => setPicked(RUDIMENTS.map((r) => r.id))}>Alle</button>
          <button type="button" className={onlyCurrent ? "ghost on" : "ghost"} onClick={() => setPicked([sel])}>Nur aktuelles Blatt</button>
        </div>
        <div style={{ maxHeight: "22dvh", overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {RUDIMENTS.map((r) => (
            <label key={r.id} className="check">
              <input
                type="checkbox"
                checked={picked.includes(r.id)}
                onChange={() => setPicked((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id])}
              />
              {r.label}{r.id === sel ? " · jetzt" : ""}
            </label>
          ))}
        </div>
        <div id="print-host" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 720, overflow: "hidden", clipPath: "inset(100%)" }}>
          {RUDIMENTS.filter((r) => picked.includes(r.id)).map((r) => (
            <div key={r.id} data-print={r.id}><RudimentStaff rud={r} /></div>
          ))}
        </div>
        <PrintPreview tiles={tiles} perPage={perPage} section={SECTION} />
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="play" disabled={busy || !picked.length} onClick={() => doPrint("print")}>{busy ? "…" : isStandalone() ? "Speichern" : "Drucken"}</button>
          <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("share")}>Teilen</button>
          {!isStandalone() ? <button className="ghost" disabled={busy || !picked.length} onClick={() => doPrint("save")}>PNG</button> : null}
          <button className="ghost" onClick={onClose}>Schließen</button>
        </div>
        <Banner tone={tone} text={note} />
        {!note ? (
          <p style={{ color: DIM, fontSize: 14, margin: "10px 0 0" }}>
            {isStandalone()
              ? "Vom Home-Bildschirm gibt es keinen Systemdruck. Speichern legt ein PNG ab."
              : "Drucken öffnet den Systemdialog. Die App sagt danach Bescheid."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
