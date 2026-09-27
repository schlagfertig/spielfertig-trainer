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

// ctx trennt gleiche deutsche Wörter mit verschiedener Übersetzung (EN-Schlüssel "ctx|Text").
export function t(text, vars, ctx) {
  const s = (lang === "en" && EN[ctx ? `${ctx}|${text}` : text]) || text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function fmtDate(d = Date.now()) {
  try {
    const x = new Date(d);
    // en: "27 Sep 2026" (en-GB liefert je nach Browser "Sept")
    return lang === "en"
      ? `${x.getDate()} ${x.toLocaleDateString("en-US", { month: "short" })} ${x.getFullYear()}`
      : x.toLocaleDateString("de-DE");
  } catch {
    return "";
  }
}
