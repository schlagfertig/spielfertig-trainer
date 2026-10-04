import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { privacyPages } from "./scripts/privacyHtml.mjs";

const cap = process.env.CAPACITOR === "1";

export default defineConfig({
  // privacyPages: öffentliche /datenschutz.html + /privacy.html nur für die Web-Version (die App zeigt die In-App-Seite).
  plugins: [react(), ...(cap ? [] : [privacyPages()])],
  // Store-Hülle lädt file:// — relative Assets. Vercel bleibt bei "/".
  base: cap ? "./" : "/",
});
