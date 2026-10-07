// Erzeugt die öffentliche Datenschutzseite (statisches HTML, ohne JS) aus src/lib/privacyText.js.
// Wird beim Build von vite.config.js als dist/datenschutz.html (Deutsch zuerst) und dist/privacy.html (Englisch zuerst) ausgegeben.
// middleware.js lässt genau diese beiden Pfade ohne Einladungs-Cookie durch.
import { PRIVACY } from "../src/lib/privacyText.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;amp;", "<": "&amp;lt;", ">": "&amp;gt;", '"': "&amp;quot;" })[c]);

function part(p) {
  return typeof p === "string" ? esc(p) : `<a href="${esc(p.href)}">${esc(p.text)}</a>`;
}

function langSection(lang) {
  const d = PRIVACY[lang];
  const note = d.note ? `<p class="note">${esc(d.note)}</p>\n` : "";
  const secs = d.sections
    .map((s) => `<section>\n<h2>${esc(s.h)}</h2>\n<p>${s.body.map(part).join("")}</p>\n</section>`)
    .join("\n");
  return `<article id="${lang}" lang="${lang}">\n<h1>${esc(d.title)}</h1>\n${note}${secs}\n</article>`;
}

export function privacyHtml(first = "de") {
  const order = first === "en" ? ["en", "de"] : ["de", "en"];
  const title = first === "en" ? "Privacy Policy · Datenschutz – Schlagfertig‽" : "Datenschutz · Privacy Policy – Schlagfertig‽";
  return `<!doctype html>
<html lang="${first}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#161a1d">
<title>${esc(title)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
body{margin:0;background:#161a1d;color:#f4f7f6;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:640px;margin:0 auto;padding:20px 18px 48px}
header{text-align:center;margin-bottom:8px}
header img{display:block;width:min(220px,60vw);height:auto;margin:0 auto 10px;mix-blend-mode:lighten}
nav{display:flex;justify-content:center;gap:10px}
nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid #2f383d;border-radius:8px;color:#5cc8b8;font-weight:700;text-decoration:none}
nav a:hover{border-color:#5cc8b8}
h1{font-size:clamp(26px,8vw,34px);letter-spacing:.06em;text-transform:uppercase;margin:28px 0 18px}
h2{color:#5cc8b8;font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px}
section{margin:0 0 18px}
p{margin:0;color:#c3ccd0;font-size:16px;white-space:pre-line}
p.note{margin:0 0 18px;padding:12px 14px;border:1px solid #2f383d;border-radius:10px;color:#8a969c}
article+article{margin-top:36px;padding-top:8px;border-top:1px solid #2f383d}
a{color:#5cc8b8;text-underline-offset:3px;word-break:break-word}
</style>
</head>
<body>
<main>
<header>
<img src="/logo.svg" alt="schlagfertig‽">
<nav aria-label="Sprache / Language"><a href="#de" lang="de">Deutsch</a><a href="#en" lang="en">English</a></nav>
</header>
${order.map(langSection).join("\n")}
</main>
</body>
</html>
`;
}

// Vite-Plugin: legt beide Seiten beim Build neben index.html ab (keine eingecheckte Kopie, damit der Text nur in privacyText.js steht).
export function privacyPages() {
  return {
    name: "privacy-pages",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "datenschutz.html", source: privacyHtml("de") });
      this.emitFile({ type: "asset", fileName: "privacy.html", source: privacyHtml("en") });
    },
  };
}
