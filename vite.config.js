import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { privacyPages } from "./scripts/privacyHtml.mjs";
import { devFeedbackApi } from "./scripts/devFeedbackApi.mjs";

const cap = process.env.CAPACITOR === "1";

export default defineConfig({
  // privacyPages: öffentliche /datenschutz.html + /privacy.html nur für die Web-Version (die App zeigt die In-App-Seite).
  // devFeedbackApi: /api/feedback lokal bei `npm run dev` (Arbeitsspeicher), damit das Test-Feedback ohne Vercel ausprobiert werden kann.
  plugins: [react(), ...(cap ? [] : [privacyPages(), devFeedbackApi()])],
  // Store-Hülle: Test-Feedback komplett aus (App Privacy „Keine Daten erfasst“), siehe src/lib/feedbackClient.js.
  define: { __SF_STORE__: JSON.stringify(cap) },
  // Store-Hülle lädt file:// — relative Assets. Vercel bleibt bei "/".
  base: cap ? "./" : "/",
});
