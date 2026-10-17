# Schlagfertig‽

_Drums lernen – Schlag für Schlag_

Rudiment-Trainer und Groove-Editor unter der Marke schlagfertig‽ (Repo- und Vercel-Name weiterhin `spielfertig-trainer`).

Getrennt von der Setlist-/Gig-App (`Spielfertig1.0`).

Kein Login, kein Store, keine Setlist.

## Testzugang (persönliche Einladungslinks)

Die App ist nur mit persönlichem Link nutzbar. `middleware.js` (Vercel Routing Middleware) prüft jede Anfrage; ohne gültigen Link erscheint die Sperrseite (`access/lockPage.js`, DE/EN, mit Anfrage-Buttons, Impressum und Datenschutz-Kurzinfo; abgelaufene Links bekommen eine eigene freundliche Variante).

- **Geheimnis:** Env-Var `ZUGANG_SECRET` in Vercel (mind. 32 Zeichen, Production + Preview). Nie ins Repo. Fehlt es, ist alles gesperrt.
- **Link erzeugen:** `ZUGANG_SECRET=… npm run zugang -- anna` (21 Tage bis Tagesende Berlin), `… -- anna 30`, feste Kürzel: `… -- --id tom 365`. Mit `ZUGANG_LISTE=/pfad/links.csv` wird die Zuordnung Kürzel → Name außerhalb des Repos protokolliert.
- **Begrüßung mit Namen:** Der Generator hängt `&name=Vorname` (Originalschreibweise, z. B. Jürgen) an; die Middleware setzt daraus das lesbare Cookie `sf_name` für den Willkommensdialog. Der Name ist nicht signiert: Wer ihn im Link ändert, ändert nur die Begrüßung, nicht den Zugang.
- **Startsprache:** `… -- --en anna` (oder `--lang en|de`) hängt `&lang=en` an; die Middleware setzt daraus (nur zusammen mit gültigem Link, nur `de`/`en`) das lesbare Cookie `sf_lang`. Die App startet dann in dieser Sprache, solange noch keine eigene Sprachwahl gespeichert ist; die Flagge wechselt und merkt sich die Sprache wie bisher. Ohne Angabe gilt die Browsersprache. Nicht signiert, harmlos.
- **Sperren:** Kürzel in `access/gesperrt.json` eintragen, committen; wirkt nach dem Deploy auch für schon gesetzte Cookies.
- **Alle Links auf einmal ungültig:** `ZUGANG_SECRET` in Vercel ändern und neu deployen.
- **Tests:** `npm test`. Lokal (`npm run dev` / `preview`) läuft die Middleware nicht.

## Test-Feedback (nur Web-/Testversion)

Opt-in-Feedback nach Übungen, geheimer Dankeschön-Erfolg (Schwelle: `THANKS_AFTER` in `src/lib/feedbackRules.js`, Standard 7),
Special Thanks. In der Store-App (`npm run build:cap`) ist alles aus (`__SF_STORE__`, `src/lib/feedbackClient.js`).

- Server: `api/feedback.js` (Vercel Function), Speicher austauschbar in `api/_lib/store.js`.
  Braucht eine Upstash-Redis-Datenbank aus dem Vercel Marketplace (setzt `KV_REST_API_URL` + `KV_REST_API_TOKEN`).
  Ohne Speicher antwortet die Funktion 503 und die App hebt das Feedback im Postausgang auf dem Gerät auf.
- `FEEDBACK_ADMIN_TOKEN` (Vercel-Env): `GET /api/feedback` mit `Authorization: Bearer …` exportiert alles als JSON;
  `POST {type:"setcode", num:"SF-1234", code:"…", validUntil:"JJJJ-MM-TT"}` hinterlegt später den Code zu einer Nummer.
- Testmodus: `?fbtest=1` (Erfolg nach 2, Frage schon nach 2 s), `&fbexpired=1` (Code gestern abgelaufen), `&fbcode=1` (gültiger Beispiel-Code), `?fbtest=0` aus.
- Lokal: `npm run dev` bedient `/api/feedback` aus dem Arbeitsspeicher (Admin-Token `dev`).

## „Neu in Schlagfertig“

Einmal nach Minor/Major-Update (nicht Patch, nicht beim ersten Start); Inhalt `HIGHLIGHTS` in `src/lib/changelog.js`,
Version in `src/lib/version.js` (= package.json). Pro App-Start höchstens ein Popup: Erfolg > Feedback-Frage > Neu (`src/lib/startModal.js`).
Testhaken: `?whatsnew=1`.
