import { useMemo } from "react";
import { RUDIMENTS } from "../lib/rudiments.js";
import { RudimentStaff } from "../lib/staff.jsx";
import { deliverPng, printElement, sheetHtml, tilesToPng } from "../lib/print.js";
import { PrintPreview } from "../lib/PrintPreview.jsx";
import { useState } from "react";

const DIM = "#8a969c";
const SECTION = "Rudiments";

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

export function PrintDialog({ sel, onClose }) {
  const [picked, setPicked] = useState(() => [sel]);
  const [perPage, setPerPage] = useState(6);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(0);

  const tiles = useMemo(() => {
    const host = document.getElementById("print-host");
    if (!host) return [];
    return RUDIMENTS.filter((r) => picked.includes(r.id))
      .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
      .filter((x) => x.svg);
  }, [picked, tick]);

  function bump() {
    window.requestAnimationFrame(() => setTick((n) => n + 1));
  }

  async function savePng(list, reason) {
    const canvas = await tilesToPng(list, 2, perPage, SECTION);
    const result = await deliverPng(canvas, "spielfertig-rudiments.png", "save");
    if (result) setNote(reason || "PNG gespeichert.");
    else setNote("Speichern abgebrochen.");
    return result;
  }

  async function doPrint(mode) {
    setBusy(true);
    setNote(mode === "print" ? "Blatt wird erzeugt…" : "");
    bump();
    const list = (() => {
      const host = document.getElementById("print-host");
      if (!host) return [];
      return RUDIMENTS.filter((r) => picked.includes(r.id))
        .map((r) => ({ r, svg: host.querySelector(`[data-print="${r.id}"] svg`) }))
        .filter((x) => x.svg);
    })();
    if (!list.length) {
      setNote("Keine Notation zum Export.");
      setBusy(false);
      return;
    }
    try {
      if (mode === "print") {
        if (isStandalone()) {
          await savePng(list, "Home-Bildschirm: Blatt als PNG gespeichert. Teilen geht auch.");
        } else {
          const printed = printElement(sheetHtml(list, perPage, SECTION));
          if (printed) setNote("Druckdialog geöffnet. Fertig? Oben auf Zurück.");
          else await savePng(list, "Druck nicht möglich — Blatt als PNG gespeichert.");
        }
      } else if (mode === "share") {
        const canvas = await tilesToPng(list, 2, perPage, SECTION);
        const result = await deliverPng(canvas, "spielfertig-rudiments.png", "share");
        if (result === "share") setNote("Geteilt.");
        else if (result === "save") setNote("Teilen nicht verfügbar — PNG gespeichert.");
        else setNote("Abgebrochen.");
      } else {
        await savePng(list);
      }
    } catch {
      setNote("Konnte das Blatt nicht erzeugen. Bitte erneut versuchen.");
    }
    setBusy(false);
  }

  return (
    <div className="modal" style={{ top: 52, zIndex: 30, alignItems: "stretch" }}>
      <div className="modal-card" style={{ width: "100%", maxWidth: 560, maxHeight: "none", margin: "0 auto" }}>
        <div className="modal-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span>Rudiments drucken</span>
          <button type="button" className="play" onClick={onClose} style={{ padding: "10px 16px", fontSize: 15 }}>Zurück</button>
        </div>
        <p style={{ color: DIM, fontSize: 15 }}>
          Auswahl ändert die Vorschau live. Kopf: Logo + Bereich. Fuß: Name und Marke.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {[4, 6, 10, 12].map((n) => (
            <button key={n} type="button" className={perPage === n ? "chip on" : "chip"} onClick={() => { setPerPage(n); bump(); }}>{n} / Seite</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, margin: "0 0 8px" }}>
          <button type="button" className="ghost" onClick={() => { setPicked(RUDIMENTS.map((r) => r.id)); bump(); }}>Alle</button>
          <button type="button" className="ghost" onClick={() => { setPicked([sel]); bump(); }}>Nur aktuelles</button>
        </div>
        <div style={{ maxHeight: "22dvh", overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {RUDIMENTS.map((r) => (
            <label key={r.id} className="check">
              <input
                type="checkbox"
                checked={picked.includes(r.id)}
                onChange={() => {
                  setPicked((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]);
                  bump();
                }}
              />
              {r.label}
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
        {note ? <p style={{ color: "#5cc8b8", fontSize: 15, margin: "10px 0 0" }}>{note}</p> : (
          <p style={{ color: DIM, fontSize: 14, margin: "10px 0 0" }}>
            {isStandalone() ? "Vom Home-Bildschirm speichert die App ein PNG." : "Drucken öffnet den Systemdialog. Danach oben Zurück."}
          </p>
        )}
      </div>
    </div>
  );
}
