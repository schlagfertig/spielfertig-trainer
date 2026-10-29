import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { privacyPages } from "./scripts/privacyHtml.mjs";
import { devFeedbackApi } from "./scripts/devFeedbackApi.mjs";

const cap = process.env.CAPACITOR === "1";
// Eigener Build für Tester (Code aus der Stunde). Der Store-Build lässt das aus (Guideline 3.1.1).
const tester = process.env.VITE_SF_TESTER_BUILD === "1";

export default defineConfig({
  // privacyPages: öffentliche /datenschutz.html + /privacy.html nur für die Web-Version (die App zeigt die In-App-Seite).
  // devFeedbackApi: /api/feedback lokal bei `npm run dev` (Arbeitsspeicher), damit das Test-Feedback ohne Vercel ausprobiert werden kann.
  plugins: [react(), ...(cap ? [] : [privacyPages(), devFeedbackApi()])],
  // Store-Hülle: Test-Feedback komplett aus (App Privacy „Keine Daten erfasst“), siehe src/lib/feedbackClient.js.
  // __SF_TESTER__ nur bei VITE_SF_TESTER_BUILD=1. npm run build:cap setzt es nicht.
  define: { __SF_STORE__: JSON.stringify(cap), __SF_TESTER__: JSON.stringify(tester) },
  // Store-Hülle lädt file:// — relative Assets. Vercel bleibt bei "/".
  base: cap ? "./" : "/",
});
