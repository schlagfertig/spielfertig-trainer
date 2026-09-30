// Neuigkeiten / What's new — nur für Nutzer sichtbare Änderungen, neueste zuerst.
// Neuer Eintrag: oben ein { date: "JJJJ-MM-TT", items: [{ de: "…", en: "…" }] } ergänzen
// (oder an ein bestehendes Datum anhängen). Keine internen Details (Zugang, Build, Technik).
// Reines Datenmodul ohne DOM-Import, damit der Test es direkt mit node laden kann.

export const CHANGELOG = [
  {
    date: "2026-09-30",
    items: [
      { de: "Noten: Blätter bekommen eigene Namen und Tags. Du kannst suchen, nach Tags filtern und sortieren (neueste, älteste, Name A–Z).",
        en: "Sheet Music: give your sheets names and tags. You can search, filter by tag and sort (newest, oldest, name A–Z)." },
      { de: "Hand Control: neuer Modus „Fokus + Preview“ – die aktuelle Übung groß, die nächste klein darunter.",
        en: "Hand Control: new “Focus + Preview” mode – the current exercise large, the next one small below it." },
      { de: "Rhythmuspyramide: Du siehst jetzt die aktuelle und die nächste Stufe.",
        en: "Rhythm Pyramid: you now see the current and the next stage." },
      { de: "Click-Trainer: Tempo-Rad größer und mittig, „Erweitert“ öffnet sich als Fenster von unten.",
        en: "Click Trainer: bigger, centred tempo wheel; “Advanced” opens as a panel from the bottom." },
      { de: "Click-Trainer: Tempo-Schieberegler entfernt, Tempo nur noch über das Rad.",
        en: "Click Trainer: tempo slider removed, tempo is now set only with the wheel." },
      { de: "Rudiments: Notenbild bei mehreren Rudiments korrigiert (u. a. #4, #13, #20, #27, #28, #29, #33 und die Rolls #13–#15).",
        en: "Rudiments: notation fixed for several rudiments (including #4, #13, #20, #27, #28, #29, #33 and rolls #13–#15)." },
      { de: "Hilfe zur Pyramide erklärt jetzt auch die Septole.",
        en: "The Rhythm Pyramid help now also explains the septuplet." },
    ],
  },
  {
    date: "2026-09-29",
    items: [
      { de: "Rudiments: Stickings besser lesbar, mehr Abstand vor dem Abschlag bei Ten und Eleven Stroke Roll.",
        en: "Rudiments: stickings easier to read, more space before the final stroke in the Ten and Eleven Stroke Roll." },
      { de: "Glasflächen und Hilfe-Fenster sind etwas durchsichtiger.",
        en: "Glass surfaces and help windows are a little more transparent." },
    ],
  },
  {
    date: "2026-09-28",
    items: [
      { de: "Stick Control heißt jetzt „Hand Control“.",
        en: "Stick Control is now called “Hand Control”." },
      { de: "Rudiments: Gegensticking – viele Rudiments lassen sich auch mit links beginnend üben.",
        en: "Rudiments: opposite sticking – many rudiments can now be practised starting with the left hand." },
      { de: "Tempo-Rad: ruhige Mitte und Hinweis „Am Rand drehen“.",
        en: "Tempo wheel: calm centre and a “turn at the edge” hint." },
    ],
  },
  {
    date: "2026-09-27",
    items: [
      { de: "Die ganze App gibt es jetzt auch auf Englisch – umschalten mit der Flagge auf der Startseite.",
        en: "The whole app is now available in English – switch with the flag on the home screen." },
      { de: "Neues App-Logo „SPIELFERTIG‽ CONTROL“.",
        en: "New app logo “SPIELFERTIG‽ CONTROL”." },
      { de: "Kleines Extra: Tipp aufs Logo öffnet ein Metronom.",
        en: "Little extra: tap the logo to open a metronome." },
      { de: "Willkommensfenster mit persönlicher Begrüßung.",
        en: "Welcome window with a personal greeting." },
      { de: "Neue Glas-Optik für Flächen und Schaltflächen; Hilfe-Fenster erscheinen mittig.",
        en: "New glass look for surfaces and buttons; help windows now appear centred." },
      { de: "Rhythmuspyramide: neue Stufe Septole und größere Kacheln.",
        en: "Rhythm Pyramid: new septuplet stage and bigger tiles." },
      { de: "Click-Mixer zeigt Notensymbole statt Namen.",
        en: "The click mixer shows note symbols instead of names." },
    ],
  },
  {
    date: "2026-09-26",
    items: [
      { de: "Tempo-Rad: große Richtungspfeile beim Drehen, der Hebel folgt deinem Finger.",
        en: "Tempo wheel: large direction arrows while turning, the lever follows your finger." },
      { de: "Rhythmuspyramide: Stufen wählst du jetzt über Notengruppen; Einzählen wird groß eingeblendet.",
        en: "Rhythm Pyramid: pick stages via note groups; the count-in is shown large." },
    ],
  },
  {
    date: "2026-09-25",
    items: [
      { de: "Hand Control: feinere Noten, die aktuelle Übung bleibt oben stehen, entfernte Übungen sind unscharf.",
        en: "Hand Control: finer notes, the current exercise stays at the top, distant exercises are blurred." },
      { de: "Rudiments: Halte die untere Leiste gedrückt, um eine Vorschau der Noten zu sehen.",
        en: "Rudiments: press and hold the bottom bar to preview the notes." },
      { de: "Erste Übung: Start/Stop im Tempo-Rad.",
        en: "First Lesson: start/stop inside the tempo wheel." },
      { de: "Rhythmuspyramide: Tempo stellst du nur noch am Rad ein.",
        en: "Rhythm Pyramid: tempo is now set only with the wheel." },
    ],
  },
  {
    date: "2026-09-24",
    items: [
      { de: "Start/Stop sitzt jetzt in allen Trainern direkt im Metronom-Rad, das Rad ist größer.",
        en: "Start/stop now sits right inside the metronome wheel in every trainer, and the wheel is bigger." },
      { de: "Das Metronom bleibt unten am Bildschirm stehen.",
        en: "The metronome stays fixed at the bottom of the screen." },
      { de: "Tempo-Rad: gedrückt halten und drehen – innen grob, außen fein.",
        en: "Tempo wheel: press, hold and turn – coarse near the centre, fine at the edge." },
      { de: "Rhythmuspyramide: Stufen einzeln an- und abwählbar.",
        en: "Rhythm Pyramid: stages can be switched on and off individually." },
      { de: "Impressum und Datenschutz als eigene Seiten.",
        en: "Legal Notice and Privacy Policy as separate pages." },
      { de: "Größere Tippflächen und Umlaute überall.",
        en: "Bigger tap areas and proper German umlauts everywhere." },
    ],
  },
  {
    date: "2026-09-21",
    items: [
      { de: "Kurze Einführung beim ersten Öffnen jedes Bereichs.",
        en: "A short intro the first time you open each section." },
      { de: "Neu: „Erste Übung“ – eine geführte Mini-Lektion zum Einstieg.",
        en: "New: “First Lesson” – a short guided lesson to get started." },
      { de: "Drucken bleibt in der App, mit Live-Vorschau des A4-Blatts.",
        en: "Printing stays inside the app, with a live preview of the A4 sheet." },
      { de: "Hand Control: Challenge ab der aktuellen Übung, Einzählen 1 oder 2 Takte, Wischen zum Blättern.",
        en: "Hand Control: challenge from the current exercise, 1 or 2 bars count-in, swipe to browse." },
      { de: "Rudiments: Titel antippen öffnet die Auswahlliste.",
        en: "Rudiments: tap the title to open the list." },
      { de: "Besser auf dem Handy: nichts läuft mehr über den Rand, Querformat nutzbar.",
        en: "Better on phones: nothing spills over the edge, landscape works." },
    ],
  },
  {
    date: "2026-09-20",
    items: [
      { de: "Neu: Rhythmuspyramide – von Vierteln bis 32teln.",
        en: "New: Rhythm Pyramid – from quarter notes to 32nd notes." },
      { de: "Neu: Hand Control (damals Stick Control) – 24 Übungen mit Challenge.",
        en: "New: Hand Control (then called Stick Control) – 24 exercises with a challenge." },
      { de: "Neu: Noten – eigene Fotos und PDFs speichern und beim Üben aufschlagen.",
        en: "New: Sheet Music – save your own photos and PDFs and open them while practising." },
      { de: "Neu: erweiterter Click-Mixer mit Achteln, 16teln und Triolen.",
        en: "New: advanced click mixer with eighths, sixteenths and triplets." },
      { de: "Deine Einstellungen bleiben gespeichert.",
        en: "Your settings are remembered." },
      { de: "Größere Schrift fürs Handy.",
        en: "Larger text for phones." },
    ],
  },
  {
    date: "2026-09-19",
    items: [
      { de: "Snare-Klang in der Vorschau.",
        en: "Snare sound in the preview." },
      { de: "6/8-Takt mit passendem Click für die Diddle-Varianten.",
        en: "6/8 time with a matching click for the diddle variations." },
    ],
  },
  {
    date: "2026-09-18",
    items: [
      { de: "Tempo per Wischen am Metronom-Kreis; ±5-Tasten daneben.",
        en: "Change tempo by swiping around the metronome circle; ±5 buttons beside it." },
      { de: "Kurzhilfe hinter dem Fragezeichen.",
        en: "Quick help behind the question mark." },
    ],
  },
  {
    date: "2026-09-17",
    items: [
      { de: "Neu: Click-Trainer – das Tempo steigt automatisch.",
        en: "New: Click Trainer – the tempo rises automatically." },
      { de: "Schöneres, besser lesbares Notenbild.",
        en: "Nicer, more readable notation." },
    ],
  },
  {
    date: "2026-09-16",
    items: [
      { de: "Erste Version: alle 40 Rudiments mit Noten und Click.",
        en: "First version: all 40 rudiments with notation and click." },
    ],
  },
];

// Datum des neuesten Eintrags (für den „neu“-Punkt auf der Startseite).
export const CHANGELOG_LATEST = CHANGELOG[0]?.date || "";
