// Sperrseite ohne App-Bundle und ohne Google Fonts (DE oben, EN darunter)
import { BRAND } from "../src/lib/brand.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const day = (exp, locale) => new Date(exp * 1000).toLocaleDateString(locale, { timeZone: "Europe/Berlin", day: "numeric", month: "long", year: "numeric" });

// state: "none" | "invalid" | { expired: exp }
function notice(state) {
  if (state === "invalid") return ["Dieser Link oder Code ist ungültig oder nicht mehr gültig. Bitte prüfe, ob er vollständig kopiert wurde.", "This link or code is invalid or no longer valid. Please check that it was copied completely."];
  if (state && state.expired) return [`Dieser Zugang ist am ${day(state.expired, "de-DE")} abgelaufen. Frag nach einem neuen Link.`, `This access expired on ${day(state.expired, "en-GB")}. Ask for a new link.`];
  return null;
}

export function lockPage(state = "none") {
  const n = notice(state);
  const tel = BRAND.phone.replace(/\s/g, "");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#161A1D">
<title>Schlagfertig Control</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box}
body{margin:0;background:#161a1d;color:#f4f7f6;font:17px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:560px;margin:0 auto;padding:24px 18px 40px}
img{display:block;width:min(260px,70vw);height:auto;margin:0 auto 4px;mix-blend-mode:lighten}
h1{text-align:center;font-size:clamp(22px,7vw,28px);letter-spacing:.05em;text-transform:uppercase;margin:0 0 18px}
h2{color:#5cc8b8;font-size:14px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px}
p{margin:0 0 16px}
.en{color:#8a969c}
.notice{border:1px solid #e8b84b;border-radius:10px;padding:12px 14px;margin:0 0 18px}
.notice p{margin:0}.notice p+p{margin-top:6px;color:#c9b27a}
form{margin:8px 0 28px}
label{display:block;font-weight:700;margin-bottom:6px}
input{width:100%;font:inherit;padding:12px;border-radius:8px;border:1px solid #2f383d;background:#1c2226;color:#f4f7f6}
button{margin-top:10px;width:100%;min-height:48px;font:700 17px system-ui,sans-serif;border-radius:8px;border:0;background:#5cc8b8;color:#06120f}
footer{border-top:1px solid #2f383d;padding-top:16px;font-size:15px;color:#8a969c}
footer p{white-space:pre-line}
a{color:#5cc8b8}
</style>
</head>
<body>
<main>
<img src="/logo.svg" alt="schlagfertig‽">
<h1>Schlagfertig Control</h1>
${n ? `<div class="notice" role="alert"><p>${esc(n[0])}</p><p lang="en">${esc(n[1])}</p></div>` : ""}
<section>
<h2>Testphase</h2>
<p>Schlagfertig Control ist gerade nur mit persönlichem Einladungslink nutzbar. Öffne den Link aus deiner Einladung erneut oder frag nach einem neuen.</p>
</section>
<section lang="en" class="en">
<h2>Testing phase</h2>
<p>Schlagfertig Control currently requires a personal invite link. Open the link from your invitation again or ask for a new one.</p>
</section>
<form method="get" action="/">
<label for="zugang">Einladungslink oder Code einfügen · <span lang="en">Paste invite link or code</span></label>
<input id="zugang" name="zugang" type="text" required autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
<button type="submit">Öffnen · <span lang="en">Open</span></button>
</form>
<footer>
<h2>Impressum · <span lang="en">Legal notice</span></h2>
<p>Angaben gemäß § 5 DDG
${esc(BRAND.person)}
${esc(BRAND.addressLine1)}
${esc(BRAND.addressLine2)}
Deutschland
Telefon: <a href="tel:${esc(tel)}">${esc(BRAND.phone)}</a>
E-Mail: <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a></p>
<h2>Datenschutz · <span lang="en">Privacy</span></h2>
<p>Verantwortlich: ${esc(BRAND.person)} (Kontakt siehe oben). Diese Seite wird bei Vercel Inc. bereitgestellt; beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, Browserkennung) in Server-Logs (Art. 6 Abs. 1 lit. f DSGVO). Nach Öffnen eines gültigen Einladungslinks setzen wir ein technisch notwendiges Cookie („sf_zugang“) mit pseudonymem Tester-Kürzel und Ablaufdatum (§ 25 Abs. 2 Nr. 2 TDDDG); es dient nur dem Testzugang, nicht der Analyse, und endet mit Ablauf des Links. Enthält der Einladungslink einen Vornamen oder eine Sprache, speichern wir sie in den Cookies „sf_name“ bzw. „sf_lang“ nur für die Begrüßung und die Startsprache der App; sie enden mit Ablauf des Links. Die vollständige Datenschutzerklärung finden Sie unter <a href="/datenschutz.html">/datenschutz.html</a> (auch ohne Einladungslink), in der App unter „Datenschutz“ oder auf Anfrage.</p>
<p lang="en">Controller: ${esc(BRAND.person)} (contact above). This page is hosted by Vercel Inc.; when it is accessed, the hosting provider processes technically necessary data (e.g. IP address, time of access, browser identifier) in server logs (Art. 6(1)(f) GDPR). After you open a valid invite link, we set a technically necessary cookie (“sf_zugang”) containing a pseudonymous tester code and expiry date (§ 25(2) no. 2 TDDDG); it is used only for test access, not for analytics, and ends when the link expires. If the invite link contains a first name or a language, we store them in the cookies “sf_name” and “sf_lang” only for the in-app greeting and the app’s starting language; they end when the link expires. The full privacy policy is available at <a href="/privacy.html">/privacy.html</a> (no invite link needed), in the app under “Privacy Policy” or on request.</p>
</footer>
</main>
</body>
</html>`;
}
