# Store-Hülle (Capacitor)

Die Web-App bleibt die Quelle. iOS/Android sind eine native Schale um `dist/`.

App-Name: **Schlagfertig‽** (`appName` in `capacitor.config.json`; Manifest `name` „Schlagfertig‽ – Drums lernen“, `short_name` „Schlagfertig‽“), wie das Logo. Untertitel: „Drums lernen – Schlag für Schlag“ / EN „Learn drums – beat by beat“. Das ‽ kommt in der App aus `src/fonts/interrobang*.woff2` (Noto Sans, OFL). Paket-ID bleibt `de.schlagfertig.app`.  
Live im Browser: https://spielfertig-trainer.vercel.app  
Die Vercel-Zugangssperre gilt **nicht** im Store-Build (kein Middleware, gebündeltes `dist`).

## Freemium

`DEMO_ON` in `src/lib/demo.js` geht im Store von allein an: `npm run build:cap` setzt `__SF_STORE__` (`CAPACITOR=1`), die native Hülle zählt mit. Web und Test (`npm run dev`, Vercel) bleiben offen.

Frei: Start, Impressum, Datenschutz, Neuigkeiten, Erste Übung, No-Stick-Challenge, Click-Trainer nur „Tempo halten“ und „Tempo steigern“, Lexikon, Rudiments #1 #6 #16 #20 #22 #31, Rudiment-Würfel nur aus diesen sechs, Hand Control 1–2, Journal-Tagebuch, je die ersten zwei Hausaufgaben und Karteikarten, Eigene Grooves mit genau 1 Takt erstellen und üben (Speichern nicht), Rhythmuspyramide in 4tel, 8tel und 16tel, Drucken nur dieser sechs Rudiments.

Volle App einmalig, Anzeige `12,99 €`: NoClick, übrige Rudiments, Hand Control 3–24, unbegrenzte Hausaufgaben und Karteikarten, Grooves mit mehr als einem Takt, Grooves speichern (auch bei 1 Takt), schwerere Pyramiden-Stufen (Triole, Quintole, Sextole, Septole, 32tel), Noten, Drucken anderer Rudiments und Notenblätter. Das Blatt zeigt Produktname Vollversion, Preis und den Knopf **Kaufen**. Der Kauf (`purchaseFullVersion`, Produkt-ID `de.schlagfertig.app.full`) ist noch nicht an StoreKit oder Play Billing angebunden: Kaufen öffnet keinen System-Dialog und schaltet nicht frei, es steht nur „Kauf geht nur in der Store-App.“ App Store Connect (Lotse) hat noch die ältere ID `de.schlagfertig.control.full` notiert; die passt nicht zur Paket-ID. Tester schalten weiter mit dem Code `sf-stunde` frei (`localStorage` `sf-unlocked`). Tippen auf einen zweiten Takt, auf Speichern oder auf Hand Control ab 3 öffnet das Blatt.

Sperren im Browser ansehen: `CAPACITOR=1 npm run dev`.

## Einmalig auf Deinem Rechner

```bash
npm install
npx cap add ios
npx cap add android
```

`ios/` und `android/` entstehen lokal (groß, nicht nötig im Alltag zu committen).

## Jeden Build

```bash
npm run cap:ios       # Mac + aktuelles Xcode (sonst Cloud-Build, siehe unten)
npm run cap:android   # Android Studio
```

Oder getrennt: `npm run cap:sync` und danach Xcode / Android Studio öffnen.

## iOS → TestFlight / App Store

- Apple-Developer-Konto (99 €/Jahr); gebaut wird per Cloud-Build (siehe unten), kein eigener Mac nötig
- Bundle-ID: `de.schlagfertig.app` (in Apple Developer anlegen)
- Signing: Dein Team in Xcode wählen
- Icons/Splash: aus `assets/` erzeugt (siehe „Icons und Splash im Cloud-Build“)
- Archive → TestFlight → Review

Apple lehnt oft „nur eine Website“ ab. Dagegen: Offline (gebündeltes `dist`), Home-Icon, Statusleiste, später Haptik/Push.

## Android → Play Store

- Google-Play-Konto (~25 $ einmalig)
- Application ID: `de.schlagfertig.app`
- Cloud-Build: GitHub → Actions → „Android App Bundle (.aab)“ → Run workflow (`.github/workflows/android-aab.yml`). Ergebnis: Artefakt `schlagfertig-control-aab` (`app-release.aab`), versionCode = Run-Nummer, versionName `1.0.<Run>`.
- Target SDK 36 (Play-Pflicht seit 31.08.2026): der Workflow setzt compile/targetSdk 36 und AGP 8.9.1 (Capacitor 7 bringt nur 35 mit).
- Signatur: Upload-Key (Play App Signing), Secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Keystore sicher aufbewahren (Verlust → Upload-Key-Reset bei Google nötig).
- Adaptive Icons: `assets/icon-foreground.png` (icon-only auf 90 %) + `assets/icon-background.png` (`#161a1d`).
- Play Console, Altersfreigabe 13+

Schnellere Alternative ohne Android Studio: [pwabuilder.com](https://www.pwabuilder.com) mit der Live-URL — erzeugt ein TWA-.aab. Dann gilt wieder die Web-Zugangssperre (Einladungslink).

## Nicht machen: Hülle lädt die Live-Seite

**Kein `server.url` auf die Live-Seite** (z. B. `https://spielfertig-trainer.vercel.app`) in `capacitor.config.json` eintragen – auch nicht „nur zum Testen“:

- Die App zeigt dann ohne Einladungs-Cookie nur die Sperrseite (Vercel-Zugangssperre).
- Apple lehnt reine Website-Hüllen ab (Guideline 4.2), und ohne Netz geht nichts.
- Jede Web-Änderung landet ungeprüft in der Store-App.

Der Store-Build bündelt immer `dist/` (`webDir: "dist"`, `npm run build:cap`). `server.url` nur lokal und nie committen, falls Live-Reload gegen `localhost` gebraucht wird.

## Plan: Cloud-Build statt eigenem Mac

Der eigene Mac (2012) kann kein aktuelles Xcode. iOS wird deshalb in der Cloud gebaut und signiert:

- **GitHub Actions** (macOS-Runner, Xcode vorinstalliert) oder **Codemagic** (Capacitor-Vorlage, Free-Tier)
- Ablauf: `npm install` (kein `npm ci`: `package-lock.json` liegt nicht im Repo) → `npm run build:cap` → `npx cap add ios` / `npx cap sync ios` → Archiv signieren → Upload zu TestFlight
- Signing über App-Store-Connect-API-Key und Zertifikat/Profil als Secrets des Build-Dienstes, nicht im Repo
- Android kann im selben Workflow (Linux-Runner) als signiertes `.aab` mitlaufen

Konfiguration liegt in `capacitor.config.json` (JSON statt TS, damit die Capacitor-CLI ohne TypeScript lädt).

## Plugins schon vorbereitet

- `@capacitor/status-bar` — dunkle Leiste, startet in `src/lib/native.js`
- `@capacitor/haptics` — `tapHaptic()` z. B. am Metronom-Tick
- `@capacitor/app` — App-Lifecycle

## Icons und Splash im Cloud-Build

Quellen liegen in `assets/`: Logo (`public/logo.svg`) mit „CONTROL“ darunter in Teal `#5cc8b8`, Schrift wie auf dem Startbildschirm (Bebas Neue aus `src/fonts/`, Sperrung .22em):

- `assets/icon-only.png` – 1024×1024, ohne Alphakanal, sRGB, Hintergrund `#161a1d`, ~95 px Rand (iOS rundet die Ecken selbst ab)
- `assets/splash.png`, `assets/splash-dark.png` – 2732×2732, Logo + CONTROL mittig (1100×1148 px, innerhalb der 1200-px-Safe-Area), Hintergrund `#161a1d`

Im Workflow nach `npx cap add ios` / `npx cap sync ios`:

```bash
npx @capacitor/assets generate --ios
```

Kein Eintrag in `package.json` nötig (läuft per `npx`). Das schreibt `AppIcon.appiconset` und `Splash.imageset` in `ios/App`.

Wichtig: Die Datei muss `icon-only.png` heißen. Ein `assets/icon.png` oder `assets/logo.png` behandelt das Tool als Logo („Easy Mode“) und baut daraus eigene Splashes auf weißem Grund. Für Android liegen `icon-foreground.png` + `icon-background.png` (adaptive Icons) bereit; der Android-Workflow ruft `--android` auf.
