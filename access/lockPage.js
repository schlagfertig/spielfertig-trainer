// Sperrseite ohne App-Bundle, ohne Tracking, ohne externe Fonts (DE/EN).
// state: "none" | "invalid" | { expired: exp, id? }
import { BRAND } from "../src/lib/brand.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const day = (exp, locale) => new Date(exp * 1000).toLocaleDateString(locale, { timeZone: "Europe/Berlin", day: "numeric", month: "long", year: "numeric" });

export const WA = "4915225742199";
export const IG = "xschlagfertigx";
export const MAIL = "schlagfertig@icloud.com";

const T = {
  de: {
    title: "Zugang abgelaufen · Schlagfertig",
    nTitle: "Testphase · Schlagfertig",
    nTag: "Testphase",
    nH1: "Schlagfertig groovt gerade im kleinen Kreis!",
    nLead: "Schlagfertig ist gerade in der Testphase und nur mit persönlichem Einladungslink nutzbar.",
    nAsk: "Dein Link ist abgelaufen oder du willst auch mittrommeln? Frag einfach nach einem neuen Link – ich schick dir gern einen.",
    waNone: "Hallo Tom, ich hätte gern einen Link für Schlagfertig!",
    invalid: "Hinweis: Dieser Link oder Code ist ungültig oder nicht mehr gültig. Bitte prüfe, ob er vollständig kopiert wurde.",
    privSum: "Datenschutz-Kurzinfo",
    h1: "Dein Zugang ist abgelaufen – aber die Sticks müssen nicht ruhen!",
    lead: (d) => `Dein Testlink für Schlagfertig ist${d ? ` am ${d}` : ""} abgelaufen. Danke, dass du mitgetestet hast!`,
    ask: "Du willst weiter grooven? Frag einfach nach einem neuen Link – ich schick dir gern einen.",
    wa: (id) => `Hallo Tom, mein Schlagfertig-Link ist abgelaufen – ich hätte gern einen neuen!${id ? ` (Kürzel: ${id})` : ""}`,
    subj: "Neuer Schlagfertig-Link",
    btnWa: "Per WhatsApp anfragen", btnIg: "Instagram", btnMail: "Per E-Mail anfragen",
    have: "Neuen Link schon bekommen?", paste: "Einladungslink oder Code einfügen", open: "Öffnen",
    legal: "Impressum & Datenschutz", priv: "/datenschutz.html", locale: "de-DE",
  },
  en: {
    title: "Access expired · Schlagfertig",
    nTitle: "Testing phase · Schlagfertig",
    nTag: "Testing phase",
    nH1: "Schlagfertig is grooving in a small circle right now!",
    nLead: "Schlagfertig is currently in a testing phase and only available with a personal invite link.",
    nAsk: "Your link has expired or you’d like to join in? Just ask for a new link – I’ll happily send you one.",
    waNone: "Hi Tom, I’d love a link for Schlagfertig!",
    invalid: "Note: this link or code is invalid or no longer valid. Please check that it was copied completely.",
    privSum: "Privacy summary",
    h1: "Your access has expired – but your sticks don’t have to rest!",
    lead: (d) => `Your Schlagfertig test link expired${d ? ` on ${d}` : ""}. Thanks for testing!`,
    ask: "Want to keep grooving? Just ask for a new link – I’ll happily send you one.",
    wa: (id) => `Hi Tom, my Schlagfertig link has expired – I’d love a new one!${id ? ` (code: ${id})` : ""}`,
    subj: "New Schlagfertig link",
    btnWa: "Ask via WhatsApp", btnIg: "Instagram", btnMail: "Ask via email",
    have: "Already got a new link?", paste: "Paste invite link or code", open: "Open",
    legal: "Legal notice & privacy", priv: "/privacy.html", locale: "en-GB",
  },
};

const PRIV = { de: `Verantwortlich: ${esc(BRAND.person)} (Kontakt siehe oben). Diese Seite wird bei Vercel Inc. bereitgestellt; beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, Browserkennung) in Server-Logs (Art. 6 Abs. 1 lit. f DSGVO). Nach Öffnen eines gültigen Einladungslinks setzen wir ein technisch notwendiges Cookie („sf_zugang“) mit pseudonymem Tester-Kürzel und Ablaufdatum (§ 25 Abs. 2 Nr. 2 TDDDG); es dient nur dem Testzugang, nicht der Analyse, und endet mit Ablauf des Links. Enthält der Einladungslink einen Vornamen oder eine Sprache, speichern wir sie in den Cookies „sf_name“ bzw. „sf_lang“ nur für die Begrüßung und die Startsprache der App; sie enden mit Ablauf des Links. Die vollständige Datenschutzerklärung findest du unter <a href="/datenschutz.html">/datenschutz.html</a> (auch ohne Einladungslink), in der App unter „Datenschutz“ oder auf Anfrage.`, en: `Controller: ${esc(BRAND.person)} (contact above). This page is hosted by Vercel Inc.; when it is accessed, the hosting provider processes technically necessary data (e.g. IP address, time of access, browser identifier) in server logs (Art. 6(1)(f) GDPR). After you open a valid invite link, we set a technically necessary cookie (“sf_zugang”) containing a pseudonymous tester code and expiry date (§ 25(2) no. 2 TDDDG); it is used only for test access, not for analytics, and ends when the link expires. If the invite link contains a first name or a language, we store them in the cookies “sf_name” and “sf_lang” only for the in-app greeting and the app’s starting language; they end when the link expires. The full privacy policy is available at <a href="/privacy.html">/privacy.html</a> (no invite link needed), in the app under “Privacy Policy” or on request.` };

export function lockPage(state = "none", lang = "de") {
  const L = lang === "en" ? "en" : "de";
  const t = T[L];
  const isExp = !!(state && state.expired);
  const safeId = isExp && /^[a-z0-9-]{1,40}$/.test(state.id || "") ? state.id : "";
  const d = isExp ? day(state.expired, t.locale) : "";
  const msg = isExp ? t.wa(safeId) : t.waNone;
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  const mail = `mailto:${MAIL}?subject=${encodeURIComponent(t.subj)}&body=${encodeURIComponent(msg)}`;
  const head = isExp
    ? `<span class="tag">Schlagfertig</span>\n<h1>${esc(t.h1)}</h1>\n<p>${esc(t.lead(d))}</p>\n<p>${esc(t.ask)}</p>`
    : `${state === "invalid" ? `<p class="hint" role="alert">${esc(t.invalid)}</p>\n` : ""}<span class="tag">${esc(t.nTag)}</span>\n<h1>${esc(t.nH1)}</h1>\n<p>${esc(t.nLead)}</p>\n<p>${esc(t.nAsk)}</p>`;
  const tel = BRAND.phone.replace(/\s/g, "");
  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#161A1D">
<title>${esc(isExp ? t.title : t.nTitle)}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box}
html{background:#161a1d}
body{margin:0;min-height:100vh;color:#f4f7f6;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:radial-gradient(120% 60% at 50% -10%,rgba(92,200,184,.28),transparent 60%),radial-gradient(80% 50% at 100% 100%,rgba(92,200,184,.12),transparent 70%),#161a1d}
main{max-width:520px;margin:0 auto;padding:max(20px,env(safe-area-inset-top)) 18px 32px}
.logo{display:block;width:min(220px,62vw);height:auto;margin:0 auto 6px;mix-blend-mode:lighten}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:22px 18px;
backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);box-shadow:0 10px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
.tag{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5cc8b8;margin:0 0 8px}
h1{font-size:clamp(23px,6.6vw,29px);line-height:1.2;margin:0 0 14px}
p{margin:0 0 14px;color:#d3dbd9}
.btns{display:grid;gap:10px;margin:18px 0 4px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border-radius:14px;font-weight:700;text-decoration:none;color:#f4f7f6;
background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16)}
.btn svg{width:22px;height:22px;flex:none}
.btn.wa{background:#5cc8b8;color:#06120f;border-color:#5cc8b8}
details{margin-top:18px;color:#8a969c;font-size:15px}
summary{cursor:pointer}
form{margin-top:10px}
label{display:block;margin-bottom:6px}
input{width:100%;font:inherit;padding:12px;border-radius:10px;border:1px solid #2f383d;background:#1c2226;color:#f4f7f6}
button{margin-top:10px;width:100%;min-height:46px;font:700 16px system-ui,sans-serif;border-radius:10px;border:1px solid #5cc8b8;background:transparent;color:#5cc8b8}
footer{margin-top:22px;font-size:13px;color:#8a969c;text-align:center;white-space:pre-line}
a{color:#5cc8b8}
.hint{font-size:14px;color:#e8c77a;border:1px solid rgba(232,184,75,.5);border-radius:12px;padding:8px 12px;margin:0 0 14px}
footer details{margin:8px auto 0;max-width:460px;text-align:left;white-space:normal;font-size:12px}
</style>
</head>
<body>
<main>
<img class="logo" src="/logo.svg" alt="schlagfertig‽">
<section class="card">
${head}
<div class="btns">
<a class="btn wa" href="${esc(wa)}" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>${esc(t.btnWa)}</a>
<a class="btn" href="https://instagram.com/${IG}" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>${esc(t.btnIg)} · @${IG}</a>
<a class="btn" href="${esc(mail)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>${esc(t.btnMail)}</a>
</div>
<details>
<summary>${esc(t.have)}</summary>
<form method="get" action="/">
<label for="zugang">${esc(t.paste)}</label>
<input id="zugang" name="zugang" type="text" required autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
<button type="submit">${esc(t.open)}</button>
</form>
</details>
</section>
<footer>${L === "de" ? "Impressum · Angaben gemäß § 5 DDG" : "Legal notice"}
${esc(BRAND.person)} · ${esc(BRAND.addressLine1)} · ${esc(BRAND.addressLine2)}
<a href="tel:${esc(tel)}">${esc(BRAND.phone)}</a> · <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a>
<a href="${t.priv}">${esc(t.legal)}</a>
<details><summary>${esc(t.privSum)}</summary><p>${PRIV[L]}</p></details></footer>
</main>
</body>
</html>`;
}
