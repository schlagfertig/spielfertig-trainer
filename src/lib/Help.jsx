import { useState } from "react";
import { loadSession, saveSession } from "./session.js";

const COPY = {
  home: [
    ["Rudiments", "40 PAS-Übungen. Notation lesen, Click hören, Tempo halten."],
    ["Click-Trainer", "Metronom: Tempo steigern oder halten. Seite ‚Erweitert‘ = Click-Mixer."],
    ["Rhythmuspyramide", "Subdivisionen auf und ab. Ohne Septole."],
    ["Stick Control", "24 Single-Beat-Nummern. Challenge spielt 1–24 durch."],
    ["Noten", "Eigene Fotos/PDFs nur auf diesem Gerät. Beim Üben über Blatt."],
    ["Kreis", "Tippen = Start/Stop. Halten + drehen = Tempo."],
  ],
  rudiments: [
    ["Metronom unten", "Tippen = Start/Stop. Halten + drehen: rechtsrum schneller."],
    ["Radius", "Innen grob, außen fein, auch über den Ring hinaus. −5/+5 daneben."],
    ["Nav unten", "‹ › tippen = vor/zurück. Wischen springt mehrere. Halten öffnet das Zahlenrad."],
    ["Titel", "‚Rudiment wählen‘ + ▾ öffnet die komplette Liste."],
    ["Hören", "Snare, L/R oder Nur Click — Umschalter über dem Kreis."],
  ],
  click: [
    ["Metronom unten", "Tippen = Start/Stop. Halten + drehen: rechtsrum schneller."],
    ["Radius", "Innen grob, außen fein, auch über den Ring hinaus. −5/+5 daneben."],
    ["Erweitert", "Seitenstreifen ‚Erweitert‘ dreht die Kachel. Mixer für Viertel, Offbeat, 16tel, Triolen, Beat und Master. Der Click läuft dabei weiter."],
    ["Modi", "Tempo halten oder steigern (alle X Sekunden +Y BPM)."],
  ],
  pyramid: [
    ["Metronom unten", "Tippen = Start/Stop. Halten + drehen = Tempo, innen grob, außen fein, auch über den Ring hinaus. −5/+5 daneben."],
    ["Stufen", "4tel → 8tel → 8el-Triole → 16tel → Quintole → 16tel-Sextole → 32tel. Tippen schaltet einzeln an/aus, eine bleibt immer an."],
    ["Takte", "1, 2 oder 4 Takte pro Stufe, immer im 4/4."],
  ],
  stick: [
    ["Metronom unten", "Tippen = Start/Stop. Drehen = Tempo, innen grob, außen fein. −5/+5 daneben."],
    ["Nav unten", "‹ › oder wischen. Halten öffnet das Rad, Vorschau = erste 8 Achtel."],
    ["Liste", "Nach oben scrollen zeigt frühere Nummern, nach unten die nächsten. Die aktuelle bleibt oben angeheftet."],
    ["Challenge", "1–24 durchspielen. Wiederholungen = komplette Übung (beide Takte). Einzählen nur am Start, nicht zwischen den Nummern."],
  ],
  archive: [
    ["Lokal", "Dateien bleiben im Browser dieses Geräts. Kein Upload in die Cloud."],
    ["Format", "Foto oder PDF, bis 12 MB."],
    ["Üben", "In Rudiments u. a. über Blatt öffnen — Playback läuft weiter."],
  ],
};

function markSeen(topic) {
  const cur = loadSession("tour", {});
  if (cur[topic]) return;
  saveSession("tour", { ...cur, [topic]: true });
}

export function Help({ topic = "home" }) {
  const first = topic !== "home" && !loadSession("tour", {})[topic];
  const [open, setOpen] = useState(first);
  const rows = COPY[topic] || COPY.home;

  function close() {
    markSeen(topic);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="help-dot" onClick={() => setOpen(true)} aria-label="Kurzhilfe">?</button>
      {open && (
        <div className="modal" onClick={close}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">{first ? "Kurz anschauen" : "Kurz"}</div>
            {first ? (
              <p style={{ color: "#8a969c", fontSize: 15, margin: "0 0 12px" }}>
                Einmalig beim ersten Öffnen — danach jederzeit über ?
              </p>
            ) : null}
            <ul className="help-list">
              {rows.map(([k, v]) => (
                <li key={k}><strong>{k}</strong> {v}</li>
              ))}
            </ul>
            <button className="play" onClick={close} style={{ width: "100%" }}>
              {first ? "Verstanden" : "Schließen"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
