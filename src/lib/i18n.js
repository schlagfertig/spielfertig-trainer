import { loadSession, saveSession } from "./session.js";
import { EN } from "./en.js";

// Deutscher Text ist der Schlüssel; fehlt eine Übersetzung, bleibt es deutsch.
function initial() {
  const saved = loadSession("lang", {}).lang;
  if (saved === "de" || saved === "en") return saved;
  return /^de/i.test(navigator.language || "") ? "de" : "en";
}

let lang = initial();
// Statisches index.html bleibt deutsch; Titel/Beschreibung folgen der Sprache zur Laufzeit.
const HEAD = { title: document.title, desc: document.querySelector('meta[name="description"]') };
const HEAD_DESC = HEAD.desc?.content || "";
function applyHead() {
  document.documentElement.lang = lang;
  document.title = t(HEAD.title);
  if (HEAD.desc) HEAD.desc.content = t(HEAD_DESC);
}
applyHead();

export const getLang = () => lang;

export function setLang(next) {
  lang = next;
  saveSession("lang", { lang });
  applyHead();
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
