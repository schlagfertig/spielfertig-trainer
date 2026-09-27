# Spielfertig — Trainer

Rudiment-Trainer und Groove-Editor unter der Marke schlagfertig‽

Getrennt von der Setlist-/Gig-App (`Spielfertig1.0`).

Kein Login, kein Store, keine Setlist.

## Testzugang (persönliche Einladungslinks)

Die App ist nur mit persönlichem Link nutzbar. `middleware.js` (Vercel Routing Middleware) prüft jede Anfrage; ohne gültigen Link erscheint die Sperrseite (`access/lockPage.js`, mit Impressum und Datenschutz-Kurzinfo).

- **Geheimnis:** Env-Var `ZUGANG_SECRET` in Vercel (mind. 32 Zeichen, Production + Preview). Nie ins Repo. Fehlt es, ist alles gesperrt.
- **Link erzeugen:** `ZUGANG_SECRET=… npm run zugang -- anna` (21 Tage bis Tagesende Berlin), `… -- anna 30`, feste Kürzel: `… -- --id tom 365`. Mit `ZUGANG_LISTE=/pfad/links.csv` wird die Zuordnung Kürzel → Name außerhalb des Repos protokolliert.
- **Begrüßung mit Namen:** Der Generator hängt `&name=Vorname` (Originalschreibweise, z. B. Jürgen) an; die Middleware setzt daraus das lesbare Cookie `sf_name` für den Willkommensdialog. Der Name ist nicht signiert: Wer ihn im Link ändert, ändert nur die Begrüßung, nicht den Zugang.
- **Sperren:** Kürzel in `access/gesperrt.json` eintragen, committen; wirkt nach dem Deploy auch für schon gesetzte Cookies.
- **Alle Links auf einmal ungültig:** `ZUGANG_SECRET` in Vercel ändern und neu deployen.
- **Tests:** `npm test`. Lokal (`npm run dev` / `preview`) läuft die Middleware nicht.
