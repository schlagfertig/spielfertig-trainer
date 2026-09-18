import { useState } from "react";

const COPY = {
  home: [
    ["Rudiments", "40 PAS-Übungen. Notation lesen, Click hören, Tempo halten."],
    ["Click-Trainer", "Nur Metronom. Starttempo, dann alle X Sekunden +Y BPM."],
    ["Kreis", "Tippen startet. Drehen ändert das Tempo fein."],
  ],
  rudiments: [
    ["Liste", "Eine Übung wählen. ‹ › blättert ohne Menü."],
    ["Kreis", "Tipp = Start/Stop. Im Uhrzeigersinn schneller, zurück langsamer."],
    ["−5 / +5", "Grobe Sprünge. Das Feld daneben ist das genaue BPM."],
    ["Optionen", "Einzählen, Nur Click oder L/R, Tempo je Durchlauf anheben."],
    ["Drucken", "Legt ein DIN-A4-Blatt mit den gewählten Rudiments."],
  ],
  click: [
    ["Kreis", "Tipp = Start/Stop. Drehen stellt das Tempo in 1-BPM-Schritten."],
    ["Start", "Das Tempo, mit dem der Click loslegt."],
    ["Alle … Sekunden", "Nach dieser Zeit kommt der nächste Sprung."],
    ["um … BPM", "Wie weit jeder Sprung geht."],
    ["bis … BPM", "Hier hört der Trainer auf zu steigern."],
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
