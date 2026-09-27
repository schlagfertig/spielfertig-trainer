import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Store-Hülle lädt file:// — relative Assets. Vercel bleibt bei "/".
  base: process.env.CAPACITOR === "1" ? "./" : "/",
});
