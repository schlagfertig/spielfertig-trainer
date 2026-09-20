import { useState } from "react";

const COPY = {
  home: [
    ["Rudiments", "40 PAS-Übungen. Notation lesen, Click hören, Tempo halten."],
    ["Click-Trainer", "Metronom: Tempo steigern oder 16tel für x Minuten."],
    ["Kreis", "Tippen startet. Drehen ändert das Tempo fein."],
  ],
  rudiments: [
    ["Liste", "Eine Übung wählen. ‹ › blättert ohne Menü."],
    ["Kreis", "Tipp = Start/Stop. Im Uhrzeigersinn schneller, zurück langsamer."],
    ["−5 / +5", "Grobe Sprünge. Das Feld daneben ist das genaue BPM."],
    ["Optionen", "Einzählen, Snare / L/R / Nur Click, Tempo je Durchlauf anheben."],
    ["Drucken", "Legt ein DIN-A4-Blatt mit den gewählten Rudiments."],
  ],
  click: [
    ["Kreis", "Tipp = Start/Stop. Drehen stellt das Tempo in 1-BPM-Schritten."],
    ["Tempo steigern", "Starttempo, alle X Sekunden +Y BPM bis zum Ziel."],
    ["16tel · Min", "Feste 16tel für 1/2/5/10 Min. BPM = Viertel, Viertel betont."],
    ["Hintergrund", "Mobile kann den Click pausieren — Tab offen lassen."],
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
