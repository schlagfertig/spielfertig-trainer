# Changelog – Spielfertig Trainer

Alle für Nutzer sichtbaren Änderungen, nach Datum gruppiert (neueste zuerst).
Kleine Fix-Commits sind dem jeweiligen Feature zugeordnet; reine Technik (Build-Fixes,
Wiederherstellungen, Refactorings) ist weggelassen. Commits in Klammern (Kurz-SHA).

## 07.10.2026

- Meine Grooves: „Speichern als…“ legt immer einen neuen Groove mit neuer ID an und überschreibt keinen anderen mehr. „Erstellen“ beginnt nach dem Speichern oder nach dem Öffnen eines gespeicherten Grooves mit leerem Raster (1 Takt, ohne ID); ein noch ungespeicherter Entwurf bleibt beim Wechsel zwischen den Ansichten erhalten.
- Meine Grooves: unter Üben neuer Knopf „Bearbeiten“ für einen geöffneten Groove; im Erstellen-Bildschirm dann zusätzlich „Speichern“ (aktualisiert genau diesen Groove), „Speichern als…“ legt eine Kopie an.
- Meine Grooves quer: Taktwahl 1–4 nicht mehr `position: fixed`, sondern im normalen Fluss der Kopfzeile (rechts neben Erstellen/Üben/Archiv, Kopfzeile mit 34 % Abstand rechts für die Vorschau) – liegt beim Scrollen nicht mehr über den Feldern.
- Meine Grooves EN: „Speichern als…“, „Speichern“, „Beides“ und der Dreh-Hinweis laufen über t() (Save as…, Save, Both, „Turn your phone sideways to enter notes. In portrait you only see the rhythm.“); neu „Bearbeiten“ → Edit.
- Lexikon: Bildbeschreibungen (Alt-Texte DE/EN) für die 13 Begriffs-Bilder Akzent, Backbeat, Cowbell, Cross-Stick, Flam, Four on the Floor, Ghost Note, Kessel, Mallets, Offbeat, Paradiddle, Triole und Wirbel ergänzt (EN „Glossary: image descriptions added for 13 term pictures – helpful with a screen reader.“)
- Meine Grooves: Notation pro Schlag neu berechnet (src/lib/grooveNotation.js, Test scripts/grooveNotation.test.mjs) – Dauer jeder Note bis zur nächsten belegten 16tel; 1. + 4. 16tel als punktierte Achtel plus 16tel mit kurzem 16tel-Balken; ebenso korrigiert: 1-2 (16tel + punktierte Achtel), 1-2-3 (zwei 16tel + Achtel), 2-4 (16tel-Pause, Achtel, 16tel), einzelne Noten mit Fähnchen statt Balken über der Pause, nur „a“ mit Achtel- plus 16tel-Pause; leerer Schlag mit Viertelpause, leerer Takt mit Ganztaktpause. Zählzeile „1 e + a“ wie die Hilfe-Knöpfe (vorher „&“, DE und EN). Takt-Knöpfe: in Takt 1 nur „‹“ statt „Takt 0“, im letzten Takt nur „›“ statt einer nicht vorhandenen Taktnummer. „Löschen“ im Archiv fragt in einem App-Dialog nach („Groove löschen?“ – „„Name“ wird von diesem Gerät gelöscht.“, Abbrechen/Löschen, Escape schließt). Üben quer: Noten links, Click/Playback/Beides und Start-Rad rechts – Start ohne Scrollen erreichbar; liegt das Rad auf kleineren Bildschirmen trotzdem unter dem Rand, wird es beim Öffnen ins Bild gescrollt. Bassdrum-Notenkopf im untersten Zwischenraum (Standard-Schlagzeugnotation, vorher unter dem System), Hälse weiter nach oben zum gemeinsamen Balken; Notenbild entsprechend niedriger. Snare-Notenkopf (und Punkt) im Zwischenraum zwischen 2. und 3. Linie von oben (vorher auf der Mittellinie) – „Die Snare steht im Zwischenraum zwischen zweiter und dritter Linie.“ (EN „My grooves: the 1st and 4th 16th are now written correctly as a dotted eighth plus a 16th, and empty beats and bars show rests. The count row reads “1 e + a” like the helpers, bar 1 no longer shows “Bar 0”, Delete asks first, and in landscape the Start dial sits next to the notes when you practise. The bass drum now sits in the bottom space of the staff. The snare sits in the space between the second and third line.“)
- Rhythmuspyramide, Fokus beim Üben: statt der zwei kleinen Karten Jetzt/Als Nächstes eine breite helle Karte (#f4f7f6, Radius 16) mit der nächsten Stufe als ganzem 4/4-Takt in Noten samt Sticking; die laufende Stufe steht mit Kicker „Jetzt“ im Notenbild darüber. Im letzten Takt einer Stufe übernimmt das Notenbild Schlag für Schlag die nächste Stufe (wie die Gruppen im Hand-Control-Fokus-Mode); jede Änderung blendet in 0,28 s über (neue Ebene ein, alte aus), bei reduzierter Bewegung wird nur umgeschaltet. Gleichzeitig wird die nächste Karte leicht türkis (Rand #5cc8b8, Schrift #2f9e90) und zeigt „Wechsel in 4-3-2-1 Schlägen“; auf der letzten Stufe „Letzte Stufe · danach fertig“. Quer: Noten links, −5/Rad/+5 und Takt-Zähler rechts in eigener Spalte – vorher lag das Rad über den Karten. Quer: rechte Spalte beim Üben 284 px statt 268 px (plus Safe-Area rechts), Abstand in der Reihe −5/Rad/+5 8 px – +5 ragte bei 844 px Breite um 4 px über den Rand, jetzt 14 px Abstand (auch 812×375, 667×375). Quer passt der +5-Knopf jetzt ganz auf den Bildschirm. (EN „Rhythm Pyramid: while you practise, a large card shows the next level as a full bar. In the last pass it turns light teal and counts the beats to the change (4-3-2-1), and the notes move into the next level beat by beat with a soft fade. In landscape the notes sit on the left and the dial on the right. In landscape the +5 button now fits fully on the screen.“)
- Hand Control: „Jetzt n/24“ aus dem Kopf von „Als Nächstes“ in eine eigene Zeile über der hellen Karte verschoben, Count-in steht dort rechts (vorher in der Werkzeugzeile, die dabei umbrach und höher wurde). „Als Nächstes“ ist jetzt Teil des angehefteten Blocks (Werkzeuge, Jetzt-Zeile, Karte, Vorschau), Scroll-Anchoring auf der Seite aus – vorher sprang die Seite beim Count-in im Fokus-Mode um ~30 px und die Karte lag über „Als Nächstes“ (src/embedded/StickControl.jsx). Click-Trainer EN: Beschreibung zu „Tempo steigern“ übersetzt („Every few seconds the tempo goes up — you stay on the pad.“, src/lib/en.js). Rudiments: Hinweis „R blau · L rot“ korrigiert zu „R grau · L türkis“ (EN „R grey · L teal“), passend zur Anzeige. Fokus-Mode, letzte Wiederholung: Zähler-Ziffer über dem Rad hell (#f4f7f6) mit türkisem Schein statt #161a1d (war auf dunklem Grund unsichtbar); ebenso Wiederholungszahl und „danach fertig“ in der türkisen Vorschau hell statt dunkel. Frühere Übungen (Liste „Davor“), die unter die durchsichtige Kopfzeile scrollen, werden ausgeblendet (Abgleich beim Scrollen mit der Unterkante der Kopfzeile) – schienen ab Übung 2 hinter „HAND CONTROL“ durch. (EN „Hand Control: “Now 1/24” now sits above the current exercise, and after Start the card no longer slides over “Next up”. In Focus mode the count on the last repeat is easy to read again, and earlier exercises no longer show through behind the title. Click Trainer: the “Speed up” description is now in English too. Rudiments: the hint below the notes names the right colours – R grey, L teal.“)
- App-Name im Text „Schlagfertig Control“ (ohne ‽; das Logo „schlagfertig‽“ bleibt die Marke): Impressum-Hinweis nennt die App statt „Drum-Trainer“, Lead der Neuigkeiten nennt die App, geschütztes Leerzeichen zwischen „Schlagfertig“ und „Control“ (Willkommensdialog, Neuigkeiten-Lead, `BRAND.product`). Unbenutztes public/app-icon.svg zeigt jetzt „SCHLAGFERTIG‽“ statt „?“. (EN „App name: the legal notice and What’s new now mention “Schlagfertig Control”, and the welcome message no longer splits the name across two lines.“)

## 06.10.2026

- Meine Grooves ist da: Hi-Hat, Snare und Bass bauen, quer eintippen, hochkant den Rhythmus sehen, mit der Dial üben und unter einem Namen auf diesem Gerät behalten (EN „My grooves is here: create a groove with hi-hat, snare and bass, enter it in landscape, see the rhythm in portrait, practise with the dial and keep it under a name on this device.“) (0fb294f, c765d83, 8190bdb, d20c2cb, c16bf4e, 709bc63)
- Eingabe: Zählzeiten über jedem Feld, Hilfen 1, + und e a für die aktive Zeile, Taktzahl 1–4 im Querformat, Speichern als… fragt den Namen ab. Die Vorschau sitzt oben rechts (EN „Input: counts above each pad, 1, + and e a helpers for the active row, 1–4 bars in landscape, Save as… asks for the name. The preview sits at the top right.“) (82d674b, 03de912, f85b1fe, aa7fb13, a579090, 36d3ec5, da892cc)
- Üben: Nur Click, Playback oder Beides. Der Click blinkt nur auf den vollen Zählzeiten. Alle Stimmen hängen an einem Balken, die Bassdrum bleibt unten (EN „Practice: click only, playback or both. The click flashes only on the beat. All voices share one beam, the bass drum stays low.“) (e092f5e, 394bfa1, 486c726)
- Meine Grooves: Alle Notenhälse zeigen nach oben, auch bei der Bassdrum. Erste und letzte 16tel einer Vierergruppe stehen als punktierte Achtel plus 16tel, wie bei Rudiment 33 (EN „My grooves: all stems point up, the bass drum included. The first and last 16th of a beat are written as a dotted eighth plus a 16th, like rudiment 33.“) (486c726, f86bb31, b6ac4c2)
- Zum Eintippen in Meine Grooves das Handy quer drehen – die Felder werden größer (EN „Turn the phone sideways to enter a rhythm in My grooves – the pads get bigger.“) (430510a, aad71e3)
- Multiple Bounce Roll klingt im Vorspiel jetzt als Presswirbel, nicht mehr als einzelner Schlag (EN „The multiple bounce roll now plays back as a press roll, not a single stroke.“) (f894a8f, a96738f, d41f1ea)
- Rudiments: R ist grau, L ist türkis. Der laufende Schlag leuchtet türkis (EN „Rudiments: R is grey, L is teal. The current stroke lights up teal.“) (f236806, 165a946)

## 05.10.2026

- Hand Control: aktuelle Übung auf heller Karte (#f4f7f6, Radius 16 px, ohne türkisen Rand, auch beim Spielen kein türkiser Ring/Schleier) – überschreibt das dunkle Glas von .stick-card (src/embedded/StickControl.jsx); Handsatz darauf R grau (#8a969c), L und Nummer dunkleres Türkis (#2f9e90, auf Hell besser lesbar), gespielter Buchstabe deutlich dunkler (R #161a1d, L #1d7a6f); „Als Nächstes“ und Listenzeilen bleiben dunkel (R hell, L türkis)
- Hand Control, Fokus-Mode: in der letzten Wiederholung vor dem Wechsel morphen fertige 4er-Gruppen (Index < floor(aktiveLetter/4)) per Opacity-Fade (0,28 s) in den Handsatz der nächsten Übung; aktuelle und vorausliegende Gruppen bleiben; nur Fokus-Mode (Üben unverändert); playT wird bei neuem Durchgang/Übungswechsel zurückgesetzt, damit kein Rest-Highlight falsch morpht (src/embedded/StickControl.jsx)
- Rhythmuspyramide: beim Üben „Jetzt“ und „Als Nächstes“ als zwei helle Karten nebeneinander, jeweils mit Notenfigur und Name der Stufe (vorher eine dunkle Zeile nur mit Notenfigur); Stufen-Symbole mit durchgehendem Balken. Ein kurz eingebauter Wechsel Schlag für Schlag in die nächste Stufe wurde am selben Tag wieder entfernt (EN „Rhythm Pyramid: while you play, “Now” and “Next up” sit side by side on two light cards, each with the note figure and the name of the stage.“) (f234ce6, d9b13dc, b13a143, 0baf586)

## 04.10.2026

- Lexikon/Glossary: Bilder an 23 Einträgen (23 webp in public/lexikon/, Felder img/alt in src/lib/lexicon.js) – Noten (Achtel, Halbe, Viertel, Sechzehntel; Übersichtsbild mit hervorgehobenem Notenwert; Pause: Übersicht mit türkis hervorgehobenen Pausen, pausen-teal.webp) und Drumset-Teile (Bassdrum und Kick, Becken, Crash, Fußmaschine, Hi-Hat, Ride, Snare, Tom); 8 neue Einträge mit Bild und EN-Text (Ganze Note, Zweiunddreißigstel, Das Drumset, Hängetom, Standtom, Splash, Hardware, Hi-Hat-Maschine), jetzt 66 Einträge; doppelter Eintrag „Notenwerte“ mit „Notenwert“ zusammengelegt (Übersichtsbild und Zweiunddreißigstel/Pausen jetzt bei „Notenwert“); Bild antippen öffnet Vollbild mit „Schließen“ (EN „Close“); Einträge öffnen per details/summary statt Knopf-Zustand (8e11390..aa04253); doppeltes Komma nach dem Eintrag „Zählzeit“ entfernt (leerer Listenplatz, Lexikon-Tests liefen dadurch rot)
- Datenschutz: Erklärung aktualisiert und öffentlich – Abschnitt Google Fonts entfernt (Schriften lokal ausgeliefert, keine Anfragen an Drittanbieter), Web-Version (Vercel-Hosting, Server-Logs, Testzugang-Cookies) und App für iOS/Android (Inhalte gebündelt, keine Hosting-Server-Logs, Daten nur auf dem Gerät) getrennt beschrieben, neu: Kontakt über WhatsApp/Instagram/E-Mail öffnet den Dienst erst beim Antippen; Text DE/EN zentral in src/lib/privacyText.js (In-App-Seite und öffentliche Seite); beim Build erzeugt scripts/privacyHtml.mjs die statischen Seiten /datenschutz.html (DE zuerst) und /privacy.html (EN zuerst), middleware.js lässt genau diese beiden Pfade ohne Einladungs-Cookie durch (SPA-Route /datenschutz, / und /assets/ bleiben gesperrt); Sperrseite verlinkt /datenschutz.html bzw. /privacy.html; Tests in scripts/zugang.test.mjs und scripts/privacy.test.mjs
- Schriften lokal gebündelt statt Google Fonts: Bebas Neue, Figtree (variabel 400–800), Oswald (variabel 500–700), Space Mono 700, je latin + latin-ext als woff2 in src/fonts/ (fonts.css mit @font-face, font-display: swap, Lizenz OFL.txt), von Vite mit Hash nach /assets/ gebaut; index.html lädt nichts mehr von fonts.googleapis.com / fonts.gstatic.com
- Rudiments: Hörmodus „L / R“ heißt jetzt „Tom / Snare“ – rechts 16er Floortom, links 14er Snare, Akzent nur lauter (src/lib/audio.js playStick/playFloorTom; aria-label DE/EN „rechts Floortom, links 14er Snare“ / “right hand floor tom, left hand 14-inch snare”) (43a5353, 553ecc9, 2f4d377, f5e150c); Rudiment-Info zeigt auf Englisch wieder den englischen Text (rudimentInfo mit getLang(), war in f5e150c entfallen)
- Lexikon/Glossary: Eintrag „Schlagfertig“ heißt jetzt „Schlagfertig‽“ (DE/EN) und ist wie das Logo gestaltet – türkis (#5cc8b8), Titelschrift Oswald 600 (Bebas Neue des Logo-Schriftzugs hat keine Kleinbuchstaben), nicht in Versalien (Feld brand: true in src/lib/lexicon.js, Klasse .lex-brand in src/embedded/Lexicon.jsx); Text erklärt das Interrobang ‽ als Frage- und Ausrufezeichen zugleich („Bist du schon schlagfertig?“ / „Mach dich oder dein Schlagzeug schlagfertig!“, EN “Are you schlagfertig yet?” / “Get yourself or your drums schlagfertig!”); Suche „schlagfertig“ findet ihn weiter, Sortierung unter S

## 03.10.2026

- Startseite: Karten (Modul-Kacheln, „Erste Übung starten“, „Heute“) deutlich durchsichtiger, das Logo scheint durch – Glasstufe „deutlich“ (Standard): Deckkraft 0.46 → 0.22, Blur 16 → 9 px, Sättigung 150 %, kräftigerer Textschatten (Titel, Text, Heute); Alternative „leicht“ (0.34, 13 px) per data-glass="leicht" an .page.home; CSS-Variablen --home-card-a/--home-card-blur/--home-card-sat in src/styles-glass.css; deckender Hintergrund ohne backdrop-filter (#1c2428) und andere Seiten unverändert
- Lexikon/Glossary: alle 59 Einträge (neu: „Schlagfertig“ erklärt den App-Namen) (src/lib/lexicon.js) mit englischem Begriff und Text (`en: { term, text }`), Deutsch unverändert; EN-Liste A–Z nach englischem Begriff, Buchstabenleiste passend, Suche in Begriff und Text der gewählten Sprache; Rudiment-Info (src/lib/rudimentInfo.js) für alle 40 Rudiments als { de, en } („Was es ist“, „Name“, „Herkunft“, „Wofür“); Buchstabenleiste: Tipp auf einen Buchstaben scrollt zum Buchstaben statt zur Startseite (vorher löste der Hash-Sprung popstate aus); Test scripts/lexicon.test.mjs (a3207cc..216693c)
- Startseite: Knopf „Nicht heute“ (EN „Not today“) auf der Karte „Erste Übung starten“ von oben rechts nach unten rechts verschoben, in einer Zeile und mittig auf Höhe von „START“ – oben rechts lag er beim Scrollen unter den festen Knöpfen Flagge/?; gleicher Glas-Stil, gleiches Verhalten (blendet bis Tagesende aus), Kartenhöhe unverändert
- Startseite: Logo steht fest (position: fixed) hinter dem Inhalt, die Karten scrollen als Glas darüber (halbtransparent mit backdrop-filter Blur/Sättigung, ohne Unterstützung deckend dunkel; Schrift mit leichtem Schatten, Antippen skaliert leicht, nicht bei reduzierter Bewegung); türkiser Schein hinter dem Logo; Fragezeichen oben rechts bleibt fest; geöffnetes Logo-Metronom liegt über den Karten; Logo-Datei ohne schwarzes Hintergrundrechteck, Logo-Container transparent, „CONTROL“ wieder sichtbar, Cache-Bust logo.svg?v=clear2 (c5ebcce, 822b679, fa32c1b, 7771dd3, 073ea87)
- Karte „Heute“: Plan A „Grundlagen“ Pyramide 10 → 5 Min (gesamt 20 Min); Plan C „Kurz“ ohne Schritt „Eigene Noten“, Single Stroke Roll 4 → 6 Min (gesamt 7 Min) (477a7d2)

## 02.10.2026

- Neu: Lexikon (EN „Glossary“) – Startseiten-Kachel „Nachschlagen · Lexikon“ öffnet kurze Erklärungen zu Begriffen wie Downbeat, Flam oder Groove, von A bis Z mit Suche und Buchstaben-Leiste; Rudiments: Knopf „Info“ zeigt zum jeweiligen Rudiment Was es ist, Name, Herkunft und Wofür, „Notation“ führt zurück zum Notenbild (f2913a6..b062505)
- Hand Control: Umschalter „binär/ternär“ (EN „Straight/Triplets“) vorerst ausgeblendet (Flag TERNARY_ENABLED in src/lib/handTernary.js, Code und Daten bleiben; ohne Flag immer binär, auch im Fokus-Mode); ternäre Übungen auf einen 4/4-Takt gekürzt – 12 Triolen-Achtel in 4 Dreiergruppen mit „3“, ohne Mittel-Taktstrich, Durchgang 12 Triolen-Schritte; Start-Fehler behoben (ReferenceError: is3 wurde vor der Deklaration verwendet, Start war in beiden Rastern blockiert)
- Startseite: Karte „Erste Übung starten“ mit kleinem Glas-Knopf „Nicht heute“ (EN „Not today“) oben rechts – blendet die Karte bis Tagesende aus (lokales Datum, localStorage sf.v1.firstSkip), am nächsten Tag ist sie wieder da; die Karte klappt weich zusammen, „Heute“ rückt nach oben und bekommt den Fokus; ohne Rückfrage
- Startseite: Karte „Heute“ (EN „Today“) unter „Erste Übung“, über den Modul-Kacheln – drei feste Mini-Pläne mit Minuten-Richtwerten, Wahl über A/B/C (Vorschlag nach Wochentag, eigene Wahl gilt bis Tagesende, localStorage sf.v1.today): A „Grundlagen“ 25 Min (5 Click-Trainer 80 BPM halten → 10 Pyramide 60 BPM → 10 Hand Control ab Übung 1, 70 BPM), B „Rudiments“ 20 Min (5 Click-Trainer 70 BPM → 10 Single Paradiddle 70 BPM → 5 Double Stroke Roll 60 BPM), C „Kurz“ 10 Min (1 Erste Übung → 4 Single Stroke Roll 70 BPM → 5 Noten); jeder Schritt öffnet das Modul mit diesen Startwerten, Zurück führt zur gleichen Scroll-Position; kein Timer, keine Haken
- Hand Control: eigene Übungsreihe – alle 24 Sticking-Muster neu (u. a. Nr. 8 nur rechts, Nr. 16 nur links), Reihenfolge angepasst (a2c6333, 45fa04f); Texte neutral formuliert (Neuigkeiten, Startseiten-Hilfe „24 Handübungen“, dieses Changelog)

## 01.10.2026

- Startseite: einmaliger Hinweis auf die Seite „Neuigkeiten“ (EN „What’s new“) als Glas-Banner oben unter Flagge/? und über dem Logo – „Ansehen“ öffnet Neuigkeiten, „Später“ blendet aus; erscheint nicht mehr nach einem der beiden Knöpfe oder nach einem Besuch von Neuigkeiten (localStorage sf.v1.newsHint); bei neuen Nutzern erst nach dem Schließen der Begrüßung
- Startseite: Kontakt-Knöpfe im Footer zwischen Copyright und Neuigkeiten – WhatsApp (wa.me), Instagram (@xschlagfertigx) und E-Mail (mailto); runde Icon-Knöpfe 48 px im Glas-Stil der ±5-Knöpfe mit türkisen Inline-SVG-Icons, Beschriftung nur als aria-label/title (DE/EN); WhatsApp/Instagram öffnen in neuem Fenster (noopener noreferrer)
- Startseiten-Hilfe (?): Rudiments-Zeile an den neuen Kacheltext angeglichen – „40 Grundlagen für Technik, Kontrolle und Timing. Mit Notation, Click und Tempo.“ (EN „40 essentials for technique, control and timing. With notation, click and tempo.“); Noten-Zeile ergänzt: „‚Auswählen‘ = Vollbild mit Zoom.“ (EN „‘Select’ = full screen with zoom.“)
- Startseite: neue Kacheltexte – Erste Übung „Einfach loslegen: eine Minute im Click spielen. Ganz ohne Vorwissen.“, Click-Trainer „Dein Tempo, dein Groove. Tempo sicher halten oder Schritt für Schritt steigern.“, Rhythmuspyramide „4tel bis 32tel: Puls festigen und sauber zwischen den Unterteilungen wechseln.“, Noten „Deine Noten immer dabei. Fotos und PDFs speichern, beim Üben aufschlagen und zoomen.“ (mit Englisch); ausgeglichener Umbruch (text-wrap: balance) jetzt für alle Kacheltexte
- Verstecktes Logo-Metronom: Clickwheel wie im Click-Trainer (Ring vergrößert sich beim Antippen, Daumen folgt dem Finger, Ring-Hinweis); Ringgröße 1,55× – offener Ring samt Pfeilen bleibt über der ersten Kachel, ±5, × und ? blenden beim Drehen aus
- Startseite: Rudiments-Kachel mit neuem Text in zwei Zeilen – „40 Grundlagen für Technik, Kontrolle und Timing.“ / „Mit Notation, Click und Tempo.“ (EN „40 essentials for technique, control and timing.“ / „With notation, click and tempo.“)
- Jede Seite/jeder Trainer öffnet oben: beim Ansichtswechsel wird die Scroll-Position auf 0 gesetzt (vorher erbte z. B. Rudiments die Scroll-Position der Startseite, Zurück-Knopf außerhalb des Bildes); die Startseite stellt beim Zurückkehren ihre Position wieder her (history.scrollRestoration = manual). Angeheftete Kopfzeile (Hand Control) bleibt in der Home-Bildschirm-App unterhalb der Statusleiste (top = safe-area-inset-top, Ausrichtung der aktuellen Übung rechnet den Abstand mit)
- Flagge und Fragezeichen liegen nicht mehr unter der iPhone-Statusleiste, wenn die App vom Home-Bildschirm gestartet wird (Abstand oben = safe-area-inset-top auf Seiten, Startseiten-Knöpfen und Fokus-Mode). App-Icon und Manifest werden wieder geladen (Zugangs-Middleware lässt /app-icon.svg und /manifest.webmanifest ohne Cookie durch)

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
- Hand Control: neuer Name (Startseite, Titel, Übersicht) (9572e39, 0768e86, d318522, adc2378)
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

- Hand Control: feinere Noten, entfernte Übungen unscharf, aktuelle Übung oben fixiert (95613f9)
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
- Hand Control: Stickings in Weiß (fee3a59, d79845c)
- Texte: Umlaute überall, konkretere Startkarten, Noten-Leerzustand mit Hinweis (66a24d7, 732c251, 6390bc0, ea3bfae)
- Größere Tippflächen für Hilfe und Zurück (fb0b251)

## 21.09.2026

- Hand Control: aktuelle Übung angeheftet, Challenge ab aktueller Übung bis 24, vorherige Übungen darüber, Liste im Setlist-Stil (8559ab1, 22d91cf, 827d075, 0af7dd7, ef87d37, 5946b20, 517c7d2, 3ce14e3, d60ea3e, bb719e9, 5f5e277, b88faf3)
- Hand Control: Wischen und Halte-Rad in der unteren Leiste, Metronom über der Leiste (63ccdbd, 1e06acd, 3a1cb08, 5f0e5f5, a9af682, adae746, 053b927, 336e227)
- Hand Control: Challenge wiederholt ganze Übungen, Einzählen 1 oder 2 Takte (f975aa1, ab74647, 047664b)
- Hand Control im Querformat: ganze Phrase, Mini-Click und Bildschirm-Blitz (7c00e06, cbb98f8)
- Kurzeinführung beim ersten Öffnen jedes Bereichs mit Gesten-Tipps (433ac8c)
- Rudiments: Titel antippbar mit Auswahlliste, Wischen/Halte-Rad in der unteren Leiste, Hörmodi direkt vorne (2c7296b, 3f038eb, 8ac1a11, dfc42ef)
- Drucken bleibt in der App: Live-A4-Vorschau mit Branding, Telefon in der Fußzeile, als Home-App PNG speichern, Status-Meldung (0ec9b09, 8cf6f9d, 7a0c5f2, 3aa3cc9, 94c7312, 9c59d3b, 6e70f42, 418e7d4, 6b5837a, c343eb2, 30f208a)
- Erste Übung: geführte Mini-Lektion mit Startkarte auf der Startseite (7e39719, 0e23b32, b063fb0)
- Handy: nichts läuft mehr über den Rand, Querformat nutzbar, Mixer passt auf 390 px (13287bc, fe999bf, f3fdb7d)
- Click-Trainer: erst Tempo halten, dann steigern; blinkt auf jedem Viertel; Hinweis unter dem Rad; klarere Mixer-Beschriftung; „Übepad“ (0ccb422, c3f7b6d, c57c616, 12f1954, 806e625, 89ad70e, 20b3ab6)
- Tempo-Rad: Hinweispfeile folgen dem Kreis, − und + mittig (b510ea3, 916df74, 4a6e0fb, da72b36)
- Noten: „Blatt“ nur bei eigenem Archiv, Hinweis auf lokale Speicherung (e08ac56, 4f5af3a)
- Rudiments-Notation: Single Stroke Four, Six Stroke Roll mit L-Zeile, Drag Paradiddle #2, Flam Tap als Achtel, Single Flammed Mill, kurze Figuren mittig (2ffcbaf, 7ed612c, a092332, 41ee8ca, 14784db, e1dbf0a, fbb1304, 6a32b95, dac9edb, 25e18b1)
- Startseite: neue Kacheltexte für Hand Control und Pyramide (86c5006, 512dea2, 23ebf19, ab3b08f, e7aedb5)

## 20.09.2026

- Neu: Rhythmuspyramide – Unterteilungen von Vierteln bis 32teln, immer ein voller 4/4-Takt, 1/2/4 Takte pro Stufe (7025526, 510dd56, 2fe2fc9, be1c38d, 1bac767, cd7885d)
- Neu: Hand Control – 24 Handübungen mit Challenge und Viertel-Click (6fdde67, 1438b41, b553f37, f92cf20, c7594f2, 7bfcfda, dcf4a30, d6d6938, a651919, a2f419c, bbe80ec, c2e0142, 492144e)
- Hand Control: klares Notenbild, größere Noten und Stickings (b420468, ac8bd2d, 6c16cb3, 8711303, c05786d, 1cb7573, ca493bf, 2d1ed3f)
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
