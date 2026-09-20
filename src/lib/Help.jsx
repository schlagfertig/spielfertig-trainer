import { useState } from "react";

const COPY = {
  home: [
    ["Rudiments", "40 PAS-Übungen. Notation lesen, Click hören, Tempo halten."],
    ["Click-Trainer", "Metronom: Tempo steigern oder 16tel für x Minuten."],
    ["Rhythmuspyramide", "Subdivisionen auf und ab. Ohne Septole."],
    ["Stick Control", "24 Single-Beat-Nummern. Challenge spielt 1–24 durch."],
    ["Noten", "Eigene Fotos/PDFs nur auf diesem Gerät. Beim Üben über Blatt."],
    ["Kreis", "Tippen startet. Drehen ändert das Tempo fein."],
  ],
  rudiments: [
    ["Liste", "Eine Übung wählen. ‹ › blättert ohne Menü."],
    ["Kreis", "Tipp = Start/Stop. Im Uhrzeigersinn schneller, zurück langsamer."],
    ["Ziel", "Frei, 8/16 Loops oder 2 Minuten. Tempo steigern bleibt extra."],
    ["Pad", "Große Notation + großer Click fürs Tablet."],
    ["Blatt", "Eigenes Foto/PDF aufschlagen, Click läuft weiter."],
    ["Drucken", "Legt ein DIN-A4-Blatt mit den gewählten Rudiments."],
  ],
  click: [
    ["Kreis", "Tipp = Start/Stop. Drehen stellt das Tempo in 1-BPM-Schritten."],
    ["Tempo steigern", "Starttempo, alle X Sekunden +Y BPM bis zum Ziel."],
    ["16tel · Min", "Feste 16tel für 1/2/5/10 Min. BPM = Viertel, Viertel betont."],
    ["Hintergrund", "Mobile kann den Click pausieren — Tab offen lassen."],
  ],
  pyramid: [
    ["Stufen", "4tel → 8tel → 8el-Triole → 16tel → Quintole → 16tel-Sextole → 32tel."],
    ["Septole", "Bewusst weggelassen (MVP)."],
    ["Richtung", "nur auf, nur ab, oder auf und wieder ab."],
    ["Click", "Subdivision durchgehend, Viertel betont. Stufe wechselt ohne Pause."],
  ],
  stick: [
    ["Notation", "Achtel bleiben stehen. Darunter wechselt nur der Fingersatz."],
    ["Wahl", "Dropdown oben, Pfeile unten wie bei den Rudiments."],
    ["Click", "BPM = Viertel. Nur Viertel-Click."],
    ["Challenge", "Nr. 1 bis 24 am Stück. 2/4/8 Takte je Nummer. Letzter Takt = Vorschau."],
  ],
  archive: [
    ["Lokal", "Dateien bleiben im Browser dieses Geräts. Kein Upload in die Cloud."],
    ["Format", "Foto oder PDF, bis 12 MB."],
    ["Üben", "In Rudiments u. a. über Blatt öffnen — Playback läuft weiter."],
  ],
};

export function Help({ topic = "home" }) {
  const [open, setOpen] = useState(false);
  const rows = COPY[topic] || COPY.home;
  return (
    <>
      <button type="button" className="help-dot" onClick={() => setOpen(true)} aria-label="Kurzhilfe">?</button>
      {open && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">Kurz</div>
            <ul className="help-list">
              {rows.map(([k, v]) => (
                <li key={k}><strong>{k}</strong> {v}</li>
              ))}
            </ul>
            <button className="ghost" onClick={() => setOpen(false)}>Schließen</button>
          </div>
        </div>
      )}
    </>
  );
}
