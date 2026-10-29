# Vorhaben: Demo-Ausschnitt / Store-Freemium

Stand: 2026-10-29. Sperre in `src/lib/demo.js`. Web und Test: `DEMO_ON` aus (volle App). Store-Build (`CAPACITOR=1` / `__SF_STORE__`) und native Hülle: `DEMO_ON` an. Preis `12,99 €` einmalig, kein Abo. Das Blatt zeigt Vollversion, Volle App, den Preis und **Kaufen**, ohne Code-Feld (Guideline 3.1.1). Der Code `sf-stunde` gilt nur mit `VITE_SF_TESTER_BUILD=1` (`__SF_TESTER__`). `purchaseFullVersion` kauft in der nativen Hülle das nicht verbrauchbare Produkt `de.schlagfertig.control.full` (nur die Konstante `FULL_PRODUCT_ID`; Paket-ID bleibt `de.schlagfertig.app`) über StoreKit 2 bzw. Play Billing. Ob es live geht, entscheidet Tom.

Frei, wenn die Sperre an ist:
- Start, Impressum, Datenschutz, Neuigkeiten
- Erste Übung, No-Stick-Challenge
- Click-Trainer: Tempo halten und Tempo steigern (NoClick = volle App)
- Lexikon
- Rudiments #1 Single Stroke Roll, #6 Double Stroke Open Roll, #16 Single Paradiddle, #20 Flam, #22 Flam Tap, #31 Drag
- Rudiment-Würfel, nur aus diesen sechs (6/8 = volle App)
- Hand Control 1 und 2 (3–24 = volle App)
- Journal: Tagebuch ganz; Hausaufgaben und Karteikasten je die ersten zwei
- Eigene Grooves: genau 1 Takt erstellen und üben; mehr als 1 Takt und Speichern (auch bei 1 Takt) = volle App
- Rhythmuspyramide: 4tel, 8tel und 16tel
- Drucken der sechs freien Rudiments

Zu, mit Hinweis und Freischalt-Blatt:
- NoClick, übrige Rudiments, Hand Control ab 3, weitere Hausaufgaben und Karteikarten, Groove mit mehr als einem Takt, Groove speichern (auch 1 Takt)
- Schwerere Pyramiden-Stufen (Triole, Quintole, Sextole, Septole, 32tel)
- Noten (Notenblätter)
- Drucken anderer Rudiments und Notenblätter

Kacheln bleiben sichtbar. Tippen auf eine gesperrte Stelle öffnet das Blatt (Vollversion, Preis, Knopf Kaufen, was frei bleibt). Der Code für Tester sitzt nur im Tester-Build.
