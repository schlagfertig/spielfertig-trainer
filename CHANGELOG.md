# Changelog – Spielfertig Trainer

Alle für Nutzer sichtbaren Änderungen, nach Datum gruppiert (neueste zuerst).
Kleine Fix-Commits sind dem jeweiligen Feature zugeordnet; reine Technik (Build-Fixes,
Wiederherstellungen, Refactorings) ist weggelassen. Commits in Klammern (Kurz-SHA).

## 30.09.2026

- Noten: Vollbild/Vorschau rendern PDFs selbst (pdf.js, Canvas) statt im iframe – ganze Seite eingepasst (contain); Pinch-Zoom und Doppeltipp (2,5×) bis 5×, Verschieben mit einem Finger, Ctrl/Trackpad-Zoom, Tasten + − 0; beim Zoomen neu in höherer Auflösung gerendert (bis ca. 12 MP); Knöpfe − / „Ganz“ / +, bei mehrseitigen PDFs ▲ „Seite n/m“ ▼; Wischen für ‹ › nur ungezoomt; No-Bounce-Wächter lässt Gestenflächen ([data-sf-gesture]) in Ruhe; Hilfetext „Zoomen“
- Rudiments: #2 Single Stroke Four als ein 2/4-Takt notiert – je Schlag 16tel-Triole (mit „3“) plus betonte Achtel, pro Schlag gebalkt; Handsatz R L R L / L R L R; Click und Wiedergabe folgen dem neuen Rhythmus
- Clickwheel in allen Trainern: Rudiments, Rhythmuspyramide und Hand Control nutzen das Clickwheel des Click-Trainers (Ring vergrößert sich beim Antippen, Daumen folgt dem Finger); Ringgröße je Trainer angepasst (Hand Control 1,40×, Pyramide 1,36×, sonst 1,55×), Ring wird nicht mehr vom Dock abgeschnitten, Ring-Hinweis passt sich der Radgröße an; Hand Control: Wiederholungs-Zähler weicht dem offenen Ring aus
- Seiten federn nicht mehr nach (kein Gummiband/Pull-to-refresh; overscroll-behavior am Dokument plus Touch-Wächter für ältere iOS); Hand Control: Liste steht still, solange der Click läuft (kein Wischen/Scrollen, aktuelle Übung bleibt fest und springt weiter, Vorschau/Zähler/Rad funktionieren; nach Stopp wieder frei)
- Startseite: Fußzeile „Copyright by Thomas Schuster“ größer, Links (Neuigkeiten, Impressum, Datenschutz) kleiner bei 44-px-Tippflächen; Click-Trainer-Clickwheel: Daumen folgt dem Finger auch nach innen, Hebel blendet beim Zurückgehen in den Ring sofort aus (d608d76)
- Noten: Antippen öffnet eine Vorschau (Einzelseite), „Auswählen“ öffnet das Vollbild mit ‹ › zum vorigen/nächsten Blatt; ausgewähltes Blatt türkis markiert (aria-current, Label „Ausgewählt“); „2 Seiten“ und doppelter Kopf-Knopf „Blatt“ entfernt; „Hinzufügen“ → „Notenblatt hinzufügen“; gelber Hinweis neu formuliert; Hilfetexte aktualisiert
- Hand Control: Übungen 3–24 wieder in der Liste „Danach“
- Neuer App-Name „Schlagfertig Control“ (Tab-Titel, Willkommen, Einladungs-Sperrseite, Datenschutz, Englisch); Startseite: unter dem Logo nur noch „Control“, Zeile „schlagfertig · Zeit für guten Sound“ entfernt
- Rudiments: „Übepad“ heißt jetzt „Fokus-Mode“ (EN „Focus mode“); an = Knopf türkis gefüllt
- Noten: Blätter bekommen eigene Namen und Tags; Suche, Tag-Filter und Sortierung (neueste, älteste, Name A–Z) (164b101)
- Hand Control, Fokus-Mode: Wiederholungen per Drehrädchen; Zähler „2 / 4“ groß über dem Kreis; in der letzten Wiederholung ist die Vorschau der nächsten Übung hell türkis hervorgehoben
- Hand Control: startet immer in der Fokus-Ansicht (aktuelle Übung groß, nächste als Vorschau), Schalter „Fokus + Preview“ entfernt; frühere Übungen leicht unscharf; „Challenge“ heißt jetzt „Fokus-Mode“ (EN „Focus mode“)
- Hand Control: neuer Modus „Fokus + Preview“ – aktuelle Übung groß, nächste kompakt darunter (44da43d)
- Rhythmuspyramide: zeigt jetzt die aktuelle und die nächste Stufe (366808b)
- Hilfe zur Pyramide: Septole ergänzt, auf Deutsch und Englisch (b2e137d)
- Click-Trainer: Tempo-Rad größer und mittig, „Erweitert“ öffnet als Fenster von unten (e23d066)
- Click-Trainer: Tempo-Schieberegler entfernt, Tempo nur noch über das Rad (df717b2)
- Tempo-Hinweis am Rad erscheint nur noch einmal statt in jedem Trainer
- Rudiments: Notation korrigiert – #4 mittig, #13 in einem Takt, #20 mit zwei Flams, #27/#28 als 2/4 mit Triolen-Balken, #29, #33 und Handsatz bei Flam/Drag (1e00f75, 9596798, 36a362d)
- Rudiments: Abschlag bei den Rolls #13–#15 näher an den Roll (0bb037b)

## 29.09.2026

- Rudiments: Stickings besser lesbar (nicht mehr gestaucht), mehr Abstand vor dem Abschlag bei Ten/Eleven Stroke (d33280e, 8cb38c8, c3b11e1)
- Optik: Glasflächen durchsichtiger, Hilfe-Fenster gläserner (ac7675e)

## 28.09.2026

- Tempo-Rad: ruhige Mitte, Hinweis „Am Rand drehen“ (c89659f, d3eb5f0)
- Stick Control heißt jetzt „Hand Control“ (Startseite, Titel, Übersicht) (9572e39, 0768e86, d318522, adc2378)
- Rudiments: Gegensticking (mit links beginnen) für alle Rudiments mit zweiter Sticking-Zeile (6eff065)
- Rad-Hinweis erscheint erst nach der Hilfe (9572e39, 7873600)

## 27.09.2026

- Englisch: die ganze App lässt sich über die Flagge auf Englisch umstellen – Startseite, Hilfe, alle Trainer, Noten, Drucken, Impressum/Datenschutz (d87feb3, 979ea03, 4dafacb, 87bdaf0, b331d82, 5bdbb5c, 4cf6237)
- Neues App-Logo „SPIELFERTIG‽ CONTROL“ und neuer Tab-Titel (ed08ec1)
- Easter Egg: Logo antippen öffnet ein Metronom-Rad; das Logo pulsiert ab und zu als Hinweis (ef255c0, 52a4c91)
- Willkommensfenster mit persönlicher Begrüßung und Datenschutz-Hinweis (523256e, ac025df, d6d5699)
- Testzugang über persönliche Einladungslinks mit Ablaufdatum, optional mit Sprache (80c4931, 27b2a53)
- Neue Optik „Liquid Glass“ für Flächen und Schaltflächen; Kopfzeile transparent, Titel in eigener Zeile (407340f, 49bf860, 05bf9e4, 9d0950f)
- Hilfe-Fenster erscheinen mittig und farbig; Hilfetexte für Click-Trainer und Noten gekürzt (498244e, 193fbd3, 17035c8, 1ec6673, c095ea3)
- Rhythmuspyramide: neue Stufe Septole, größere Kacheln (4 pro Zeile) (4f5e6fb)
- Click-Mixer: Notensymbole statt Namen; Erweitert-Karte fest und leicht türkis (0c9c050, ac56b42)
- Rad-Hinweis unter dem Dial; Sound-Umschalter blendet beim Drehen aus; −5 auf schmalen Handys ganz sichtbar; Übepad-Modus mit Zurück (be2b4b8, ec4cee0, fd764f9, 42f939a)
- Hand Control: Listenende blendet weich aus (2f128ea)
- Tempo-Rad: ±5 blendet beim Drehen aus, Pfeile wachsen mit dem Hebel (7f5b3ab, 24bb10b)

## 26.09.2026

- Tempo-Rad: große Richtungspfeile während des Drehens, Hebel folgt dem Finger und blendet weich aus (d98021c, bd99369, b475337, 9b29ffe, 15fe18e)
- Rhythmuspyramide: Stufenwahl als Notengruppen, kompakteres Layout, Einzählen als Overlay (a4ebe58, 3b80e5f)

## 25.09.2026

- Stick Control: feinere Noten, entfernte Übungen unscharf, aktuelle Übung oben fixiert (95613f9)
- Rudiments: Halten der unteren Leiste zeigt eine Kurzvorschau der Noten (9a7d689)
- Rhythmuspyramide: Tempo nur noch über das Rad (0b84653)
- Erste Übung: Start/Stop im Rad, größeres Rad, ruhigere Optik (51e459a, 1eb52cb, 87abeec)
- Rudiments: kompaktes Rad auf kleinen Handys (e488d56)
- Hilfe-Texte an die Neuerungen angepasst (7d6c452)

## 24.09.2026

- Impressum und Datenschutz als eigene Seiten mit Links im Footer und klickbaren Kontakten (8f42648, dfbf31c, cf2e820, 143402d, fe03118, 8cdd0b7)
- Start/Stop direkt im Metronom-Rad in allen Trainern, größeres Rad (9202ef8, c01f331, 7916f93, e2fb9a9)
- Metronom unten fest mit transparentem Hintergrund (9aac11b, a7890b8, d8b1117, b59b878, bbeb11b, 051d4bf, b484db6)
- Tempo-Rad: halten und drehen – innen grob, außen fein, größerer Wirkbereich (15e9eba, 34b41dc, 4a20fe1)
- Rhythmuspyramide: Stufen einzeln an- und abwählbar (d3707e5)
- Rudiments: ohne Einzählen und Tempo-Rampe; Sound-Umschalter über dem Rad; Rad klar getrennt von Vor/Zurück (5852a1f, 96da9a7, d92f7f9, f3b1e2f, 8aa7a23)
- Stick Control: Stickings in Weiß (fee3a59, d79845c)
- Texte: Umlaute überall, konkretere Startkarten, Noten-Leerzustand mit Hinweis (66a24d7, 732c251, 6390bc0, ea3bfae)
- Größere Tippflächen für Hilfe und Zurück (fb0b251)

## 21.09.2026

- Stick Control: aktuelle Übung angeheftet, Challenge ab aktueller Übung bis 24, vorherige Übungen darüber, Liste im Setlist-Stil (8559ab1, 22d91cf, 827d075, 0af7dd7, ef87d37, 5946b20, 517c7d2, 3ce14e3, d60ea3e, bb719e9, 5f5e277, b88faf3)
- Stick Control: Wischen und Halte-Rad in der unteren Leiste, Metronom über der Leiste (63ccdbd, 1e06acd, 3a1cb08, 5f0e5f5, a9af682, adae746, 053b927, 336e227)
- Stick Control: Challenge wiederholt ganze Übungen, Einzählen 1 oder 2 Takte (f975aa1, ab74647, 047664b)
- Stick Control im Querformat: ganze Phrase, Mini-Click und Bildschirm-Blitz (7c00e06, cbb98f8)
- Kurzeinführung beim ersten Öffnen jedes Bereichs mit Gesten-Tipps (433ac8c)
- Rudiments: Titel antippbar mit Auswahlliste, Wischen/Halte-Rad in der unteren Leiste, Hörmodi direkt vorne (2c7296b, 3f038eb, 8ac1a11, dfc42ef)
- Drucken bleibt in der App: Live-A4-Vorschau mit Branding, Telefon in der Fußzeile, als Home-App PNG speichern, Status-Meldung (0ec9b09, 8cf6f9d, 7a0c5f2, 3aa3cc9, 94c7312, 9c59d3b, 6e70f42, 418e7d4, 6b5837a, c343eb2, 30f208a)
- Erste Übung: geführte Mini-Lektion mit Startkarte auf der Startseite (7e39719, 0e23b32, b063fb0)
- Handy: nichts läuft mehr über den Rand, Querformat nutzbar, Mixer passt auf 390 px (13287bc, fe999bf, f3fdb7d)
- Click-Trainer: erst Tempo halten, dann steigern; blinkt auf jedem Viertel; Hinweis unter dem Rad; klarere Mixer-Beschriftung; „Übepad“ (0ccb422, c3f7b6d, c57c616, 12f1954, 806e625, 89ad70e, 20b3ab6)
- Tempo-Rad: Hinweispfeile folgen dem Kreis, − und + mittig (b510ea3, 916df74, 4a6e0fb, da72b36)
- Noten: „Blatt“ nur bei eigenem Archiv, Hinweis auf lokale Speicherung (e08ac56, 4f5af3a)
- Rudiments-Notation: Single Stroke Four, Six Stroke Roll mit L-Zeile, Drag Paradiddle #2, Flam Tap als Achtel, Single Flammed Mill, kurze Figuren mittig (2ffcbaf, 7ed612c, a092332, 41ee8ca, 14784db, e1dbf0a, fbb1304, 6a32b95, dac9edb, 25e18b1)
- Startseite: neue Kacheltexte für Stick Control und Pyramide (86c5006, 512dea2, 23ebf19, ab3b08f, e7aedb5)

## 20.09.2026

- Neu: Rhythmuspyramide – Unterteilungen von Vierteln bis 32teln, immer ein voller 4/4-Takt, 1/2/4 Takte pro Stufe (7025526, 510dd56, 2fe2fc9, be1c38d, 1bac767, cd7885d)
- Neu: Stick Control – 24 Single-Beat-Übungen nach Stone mit Challenge und Viertel-Click (6fdde67, 1438b41, b553f37, f92cf20, c7594f2, 7bfcfda, dcf4a30, d6d6938, a651919, a2f419c, bbe80ec, c2e0142, 492144e)
- Stick Control: buchähnliches Notenbild, größere Noten und Stickings (b420468, ac8bd2d, 6c16cb3, 8711303, c05786d, 1cb7573, ca493bf, 2d1ed3f)
- Neu: Noten – eigene Fotos und PDFs lokal speichern, beim Üben als „Blatt“ öffnen, umbenennen, zwei Blätter nebeneinander (7b38d06, cdb5eaa, 11e3e82, 9bb26b0, ea8f3bb, b1a2225, ba3563d, e133ac6)
- Neu: Erweiterter Click-Mixer (Viertel, Achtel, 16tel, Triolen) auf der Rückseite des Metronoms (cd55151, 1039c26, 29005e2, 6c6497f, 5ec6a8c, 4591dac, 79ab55b, 0d95acd, ce1d261, 6a9c336, b4453f4, db15e23, 4cf01db)
- Einstellungen bleiben gespeichert (Rudiments, Click-Trainer); Stop setzt aufs Starttempo zurück (ceb1ee0, 983ef8e, d91a36e)
- Rudiments: Name und Vor/Zurück unten, aktueller Schlag und Loop-Zähler, Übungsziel (Loops oder 2 Minuten), Übepad-Vollbild (0601d6a, d810b55, 2475508, 92369cb, 87c2378, 7479d33, 228d984, 4fe3d94, 87a7c10, 239a8ad, b592a40, 6e4feb1)
- Rudiments: Metronom unten fest mit seitlichem Umklappen, Tempo-Rampe nach Takten, Ruhe-Rad in Türkis (605e53e, 18bbef4, d8e2b74, 0a5368c, ec0514e)
- Rudiments: Flam- und Drag-Vorschläge hörbar und leiser (fa5a2b1, e3a7e02)
- Rudiments-Notation: 2/4-Takte und PAS-Schreibweise für Flams/Drags, Akzent „>“, Ratamacues, Six Stroke und Single Stroke Roll (7f03588, adff039, 6635242, ae44bae, a4c929c, 681f174, 513f279, 0b62e97, 33d5711, 02a3448, 2a95d66, 26c5680, 13c1ddf, e22d9d1, cb3fa2e, 588a1f5)
- Größere Schrift für das Handy (340f5ed, 9a28aa3, 5d802e8, f489c15, 2e0877a)
- Querformat: größere Notation (689b37e)
- Wischen vom Rand und Browser-Zurück führen zum letzten Screen (c82aee6)
- Tempo-Feld wird live auf gültige Werte begrenzt (27a4e0f)
- Logo auf der Startseite ohne schwarzen Kasten (9f1329d, fb2f736, 485ea9a)

## 19.09.2026

- Drucken/Export mit A4-Layout (909d1e2)
- 6/8-Takt und passender Click für Diddle-Varianten (9950972, 1ad61a9, 06afc44)
- Snare-Klang in der Vorschau, Umschalter zwischen Snare, L/R und Click (24e813a, d957b93)
- Rudiments-Notation: Single Stroke Roll / Multiple Bounce getauscht, Single Stroke Four nach PAS (ea8818c, 85ff5a0)

## 18.09.2026

- Tempo über den Metronom-Kreis: im Uhrzeigersinn wischen macht schneller (86b4762, a4e4bda, f120041)
- Kurzhilfe hinter einem Fragezeichen (7b8a4b3, 5f54fb4)
- ±5-Tasten groß links und rechts vom Kreis, großer Countdown (82c1f79, bf99294, 8b29568, 4a6bc93, ea300bc)
- Offizielles schlagfertig-Logo (1f3c517, 13ce405, 894fecc, 44365a2)
- Rudiments-Notation: Eleven Stroke Roll und Drag-Vorschläge (b87eac4, 991f5ca)

## 17.09.2026

- Neu: Click-Trainer – Starttempo, alle X Sekunden +Y BPM (2db06a8, c0f0f32)
- Metronom-Kreis im Dock pulsiert mit dem Beat; Click ohne Lücke am Zeilenanfang (fb99afa, 91f5b0e, 01b95df)
- Rudiments als Auswahlliste mit Gruppen, Tempo in ±5-Schritten (5eaa98b, a33db16)
- Übersichtlichere Oberfläche, Optionen zugeklappt, Druck-Status (467c843, 906977a, 0ddd252)
- Notenbild überarbeitet: Notenköpfe, Hälse, Balken, Fähnchen, Flams/Drags, Taktarten und Taktstriche (d34602f, b51d15f, e9bba66, fdde35d, 0240014, 3d6f2f7, b18251c, 0165288, 88eedd3, cb6a5d2, d19d314, 179dd5d)
- Lange Stroke-Rolls in gerollter Vic-Firth-Schreibweise mit durchgehendem Handsatz (b239044, 2378128, 091ba15, 9f89c3e, 4ce79af, 8836f14, b8919a2)
- Rudiments-Notation: Single Stroke Roll als ganze Note, Paradiddle-Diddle und Double Paradiddle mit L-Lead-Zeile (e38b233, e125f24, d45fda8, bf99a2e, cd72f38, 5a1eb69, c668c67, 2119f97, e01221c, 9767d41, 5de1891, e68a6ab)

## 16.09.2026

- Erste Version: alle 40 PAS-Rudiments mit Notation, Click und Druck (a4ca42e, aca7f65, f3d50c8, fdff8eb, 381d9ff)
- Rudiments nach Vic-Firth-/PAS-Schreibweise mit Triolen, Sextolen und sauberen Balkengruppen (99d65ba, 7beab84, 8f2fe4d, 9019f1e, 760b6c0, 066df83, 4a982a7, 2163d8a)
- App-Logo „The best time for Rudiments is NOW“ (9c85aa2, 6ae8856)
