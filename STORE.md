# Store-Hülle (Capacitor)

Die Web-App bleibt die Quelle. iOS/Android sind eine native Schale um `dist/`.

Live im Browser: https://spielfertig-trainer.vercel.app  
Die Vercel-Zugangssperre gilt **nicht** im Store-Build (kein Middleware, gebündeltes `dist`).

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
- Bundle-ID: `de.schlagfertig.trainer` (in Apple Developer anlegen)
- Signing: Dein Team in Xcode wählen
- Icons: `ios/App/App/Assets.xcassets/AppIcon.appiconset`
- Archive → TestFlight → Review

Apple lehnt oft „nur eine Website“ ab. Dagegen: Offline (gebündeltes `dist`), Home-Icon, Statusleiste, später Haptik/Push.

## Android → Play Store

- Google-Play-Konto (~25 $ einmalig)
- Application ID: `de.schlagfertig.trainer`
- In Android Studio: Build → Generate Signed Bundle (.aab)
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
- `@capacitor/haptics` — `tapHaptic()` z. B. am Metronom-Tick
- `@capacitor/app` — App-Lifecycle
