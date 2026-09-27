import { loadSession, saveSession } from "./session.js";
import { EN } from "./en.js";

// Deutscher Text ist der Schlüssel; fehlt eine Übersetzung, bleibt es deutsch.
function initial() {
  const saved = loadSession("lang", {}).lang;
  if (saved === "de" || saved === "en") return saved;
  return /^de/i.test(navigator.language || "") ? "de" : "en";
}

let lang = initial();
document.documentElement.lang = lang;

export const getLang = () => lang;

export function setLang(next) {
  lang = next;
  saveSession("lang", { lang });
  document.documentElement.lang = lang;
}

export function t(text, vars) {
  const s = (lang === "en" && EN[text]) || text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
