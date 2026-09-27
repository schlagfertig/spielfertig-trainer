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
npm run cap:ios       # Mac + Xcode
npm run cap:android   # Android Studio
```

Oder getrennt: `npm run cap:sync` und danach Xcode / Android Studio öffnen.

## iOS → TestFlight / App Store

- Mac, Xcode, Apple-Developer-Konto (99 €/Jahr)
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

## Optional: Hülle lädt die Live-Seite

In `capacitor.config.ts`:

```ts
server: { url: "https://spielfertig-trainer.vercel.app", cleartext: false }
```

Updates ohne Store-Review, aber Lock-Seite ohne Cookie. Für Stores eher `webDir: "dist"` lassen.

## Plugins schon vorbereitet

- `@capacitor/status-bar` — dunkle Leiste, startet in `src/lib/native.js`
- `@capacitor/haptics` — `tapHaptic()` z. B. am Metronom-Tick
- `@capacitor/app` — App-Lifecycle
