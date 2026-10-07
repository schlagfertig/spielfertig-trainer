// Datenschutzerklärung DE/EN – einzige Quelle für die In-App-Seite (Legal.jsx)
// und die öffentliche Seite /datenschutz.html bzw. /privacy.html (beim Build erzeugt, siehe scripts/privacyHtml.mjs).
// Reines Datenmodul ohne DOM/React, damit es auch mit node geladen werden kann.
// Abschnitt: { h, body: [Teil, …] }; Teil = Text (mit \n für Zeilenumbrüche) oder { href, text } für einen Link.
import { BRAND } from "./brand.js";

const mail = { href: `mailto:${BRAND.email}`, text: BRAND.email };
const tel = { href: `tel:${BRAND.phone.replace(/\s/g, "")}`, text: BRAND.phone };
const lda = { href: "https://www.lda.bayern.de", text: "www.lda.bayern.de" };
const address = [BRAND.person, BRAND.addressLine1, BRAND.addressLine2, "Deutschland"].join("\n");

export const PRIVACY_UPDATED = { de: "Oktober 2026", en: "October 2026" };

export const PRIVACY = {
  de: {
    title: "Datenschutz",
    sections: [
      { h: "1. Verantwortlicher", body: [address, "\nE-Mail: ", mail, "\nTelefon: ", tel] },
      { h: "2. Allgemeines", body: [
        "Schlagfertig‽ ist eine App zum Üben. Es gibt sie als Web-Version im Browser und als App für iOS und Android. Es gibt keine Registrierung und kein Nutzerkonto, kein Tracking und keine Werbung. Übungsdaten bleiben auf Ihrem Gerät.",
      ] },
      { h: "3. Hosting (Web-Version)", body: [
        `Die Web-Version wird bei Vercel Inc. bereitgestellt (${BRAND.web}). Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, Browserkennung) in Server-Logs. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung und Sicherheit der Website).`,
      ] },
      { h: "4. App für iOS und Android", body: [
        "In der App für iOS und Android sind Programm und Inhalte (einschließlich der Schriften) bereits enthalten. Bei der Nutzung lädt die App keine Inhalte von unserem Hosting-Server; für die Nutzung der App entstehen deshalb keine Server-Logs beim Hosting-Anbieter.\n\nFür Download und Updates über den App Store bzw. Google Play gelten die Datenschutzbestimmungen von Apple bzw. Google.",
      ] },
      { h: "5. Lokale Speicherung", body: [
        "localStorage (Schlüsselpräfix „sf.v1.“): z. B. letzte Übungs-Einstellungen und ob Kurzhilfen schon gesehen wurden.\n\nIndexedDB („sf.archive.v1“): von Ihnen hinzugefügte Notenblätter (Fotos/PDFs), nur lokal auf diesem Gerät — kein Upload in unsere Cloud.\n\nIn der Web-Version liegen diese Daten im Browser, in der App im Speicher der App auf dem Gerät.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 TDDDG (technisch erforderlich für die von Ihnen genutzte Funktion). Löschung: Browser-Daten für diese Seite löschen bzw. Blätter in der App entfernen; in der App für iOS/Android werden die Daten mit der App gelöscht.",
      ] },
      { h: "6. Cookies und Analyse", body: [
        "Wir setzen keine eigenen Tracking-Cookies und keine Analyse-Tools (kein Google Analytics, Plausible, Matomo o. Ä.) ein.\n\nNur Web-Version (Testphase): Für den Testzugang setzen wir ein technisch notwendiges Cookie („sf_zugang“) mit einem pseudonymen Tester-Kürzel und Ablaufdatum; es dient nur dem Zugang, nicht der Analyse, und endet mit Ablauf des Einladungslinks (§ 25 Abs. 2 Nr. 2 TDDDG). Enthält der Einladungslink einen Vornamen oder eine Sprache, speichern wir sie in den Cookies „sf_name“ bzw. „sf_lang“ nur für die Begrüßung und die Startsprache der App; sie enden mit Ablauf des Links.",
      ] },
      { h: "7. Schriftarten", body: [
        "Die Schriftarten sind in der App enthalten und werden lokal ausgeliefert (Web-Version: vom selben Server wie die App). Es gibt keine Anfragen an Drittanbieter für Schriften (z. B. Google Fonts).",
      ] },
      { h: "8. Kontakt über WhatsApp, Instagram und E-Mail", body: [
        "Die Kontakt-Knöpfe in der App öffnen WhatsApp, Instagram bzw. Ihr E-Mail-Programm erst, wenn Sie sie antippen. Erst dann werden Daten an den jeweiligen Dienst übertragen; dafür gelten dessen Datenschutzbestimmungen.",
      ] },
      { h: "9. Ihre Rechte", body: [
        "Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach, ", lda, ".",
      ] },
      { h: "Stand", body: [PRIVACY_UPDATED.de] },
    ],
  },
  en: {
    title: "Privacy Policy",
    note: "This translation is provided for convenience. The German version is legally binding.",
    sections: [
      { h: "1. Controller", body: [address, "\nEmail: ", mail, "\nPhone: ", tel] },
      { h: "2. General", body: [
        "Schlagfertig‽ is an app for practicing. It is available as a web version in the browser and as an app for iOS and Android. There is no registration and no user account, no tracking and no advertising. Practice data stays on your device.",
      ] },
      { h: "3. Hosting (web version)", body: [
        `The web version is provided by Vercel Inc. (${BRAND.web}). When it is accessed, the hosting provider processes technically necessary data (e.g. IP address, time of access, browser identifier) in server logs. Legal basis: Art. 6(1)(f) GDPR (provision and security of the website).`,
      ] },
      { h: "4. App for iOS and Android", body: [
        "In the iOS and Android app, the program and its content (including the fonts) are already included. When you use the app, it does not load any content from our hosting server, so using the app creates no server logs at the hosting provider.\n\nDownloads and updates via the App Store or Google Play are subject to the privacy policies of Apple or Google.",
      ] },
      { h: "5. Local storage", body: [
        "localStorage (key prefix “sf.v1.”): e.g. your most recent exercise settings and whether quick-help screens have already been seen.\n\nIndexedDB (“sf.archive.v1”): sheet music you have added (photos/PDFs), stored locally on this device only — no upload to our cloud.\n\nIn the web version this data is stored in the browser, in the app in the app’s storage on the device.\n\nLegal basis: Art. 6(1)(f) GDPR or § 25(2) TDDDG, as applicable (technically necessary for the function you use). Deletion: clear the browser data for this site or remove sheets in the app; in the iOS/Android app the data is deleted together with the app.",
      ] },
      { h: "6. Cookies and analytics", body: [
        "We do not use our own tracking cookies or any analytics tools (no Google Analytics, Plausible, Matomo or similar).\n\nWeb version only (testing phase): for test access we set a technically necessary cookie (“sf_zugang”) containing a pseudonymous tester code and expiry date; it is used only for access, not for analytics, and ends when the invite link expires (§ 25(2) no. 2 TDDDG). If the invite link contains a first name or a language, we store them in the cookies “sf_name” and “sf_lang” only for the in-app greeting and the app’s starting language; they end when the link expires.",
      ] },
      { h: "7. Fonts", body: [
        "The fonts are included in the app and delivered locally (web version: from the same server as the app). No font requests are made to third parties (e.g. Google Fonts).",
      ] },
      { h: "8. Contact via WhatsApp, Instagram and email", body: [
        "The contact buttons in the app open WhatsApp, Instagram or your email app only when you tap them. Only then is data transmitted to the respective service; its privacy policy applies.",
      ] },
      { h: "9. Your rights", body: [
        "You have the right of access, rectification, erasure, restriction of processing, objection and data portability, as well as the right to lodge a complaint with a data protection supervisory authority. The competent authority is the Bavarian Data Protection Authority (BayLDA — Bayerisches Landesamt für Datenschutzaufsicht), Promenade 18, 91522 Ansbach, Germany, ", lda, ".",
      ] },
      { h: "Last updated", body: [PRIVACY_UPDATED.en] },
    ],
  },
};
