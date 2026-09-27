import { useState } from "react";
import { BRAND } from "./brand.js";
import { getLang, t } from "./i18n.js";

function lines(...parts) {
  return parts.filter(Boolean).join("\n");
}

// Englische Fassung: nur Komfort-Übersetzung, verbindlich ist die deutsche.
function LegalEn({ isPrivacy }) {
  return isPrivacy ? (
    <>
      <section className="legal-block">
        <h2>1. Controller</h2>
        <p>
          {lines(BRAND.person, BRAND.addressLine1, BRAND.addressLine2, "Deutschland")}
          {"\n"}
          Email:{" "}
          <a className="legal-a" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          {"\n"}
          Phone:{" "}
          <a className="legal-a" href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
        </p>
      </section>
      <section className="legal-block">
        <h2>2. General</h2>
        <p>
          Spielfertig Trainer is a web app for practicing. There is no registration and no user account.
          Practice data stays on your device, to the extent that your browser stores it.
        </p>
      </section>
      <section className="legal-block">
        <h2>3. Hosting</h2>
        <p>
          The app is provided by Vercel Inc. ({BRAND.web}). When the app is accessed, the hosting
          provider processes technically necessary data (e.g. IP address, time of access, browser identifier)
          in server logs. Legal basis: Art. 6(1)(f) GDPR (provision and security of the website).
        </p>
      </section>
      <section className="legal-block">
        <h2>4. Local storage</h2>
        <p>
          {lines(
            "localStorage (key prefix “sf.v1.”): e.g. your most recent exercise settings and whether quick-help screens have already been seen.",
            "",
            "IndexedDB (“sf.archive.v1”): sheet music you have added (photos/PDFs), stored locally in this browser only — no upload to our cloud.",
            "",
            "Legal basis: Art. 6(1)(f) GDPR or § 25(2) TDDDG, as applicable (technically necessary for the function you use). Deletion: clear the browser data for this site or remove sheets in the app.",
          )}
        </p>
      </section>
      <section className="legal-block">
        <h2>5. Cookies and analytics</h2>
        <p>
          We do not use our own tracking cookies or any analytics tools
          (no Google Analytics, Plausible, Matomo or similar).
        </p>
      </section>
      <section className="legal-block">
        <h2>6. Google Fonts</h2>
        <p>
          The app loads fonts from Google Fonts (fonts.googleapis.com / fonts.gstatic.com).
          In the process, your IP address may be transmitted to Google. Legal basis: Art. 6(1)(f) GDPR.
          The fonts may be hosted locally at a later date to avoid this transfer.
        </p>
      </section>
      <section className="legal-block">
        <h2>7. Your rights</h2>
        <p>
          You have the right of access, rectification, erasure, restriction of processing, objection and
          data portability, as well as the right to lodge a complaint with a data protection supervisory authority
          (for Bavaria, e.g. the Bavarian State Commissioner for Data Protection — Bayerischer Landesbeauftragter für den Datenschutz).
        </p>
      </section>
      <section className="legal-block">
        <h2>Last updated</h2>
        <p>September 2026</p>
      </section>
    </>
  ) : (
    <>
      <section className="legal-block">
        <h2>Information pursuant to § 5 DDG</h2>
        <p>{lines(BRAND.person, BRAND.addressLine1, BRAND.addressLine2, "Deutschland")}</p>
      </section>
      <section className="legal-block">
        <h2>Contact</h2>
        <p>
          Phone:{" "}
          <a className="legal-a" href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
          {"\n"}
          Email:{" "}
          <a className="legal-a" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          {"\n"}
          Website:{" "}
          <a className="legal-a" href={`https://${BRAND.web}`}>{BRAND.web}</a>
        </p>
      </section>
      <section className="legal-block">
        <h2>Responsible for the content</h2>
        <p>{BRAND.person}</p>
      </section>
      <section className="legal-block">
        <h2>Note</h2>
        <p>
          This service is a personal practice tool (drum trainer) without user accounts and without a shop.
          It is intended for practicing rudiments and groove.
        </p>
      </section>
    </>
  );
}

export default function Legal({ topic = "impressum", onOpen }) {
  const isPrivacy = topic === "datenschutz";
  const en = getLang() === "en";
  const [showDe, setShowDe] = useState(false);
  const showEn = en && !showDe;

  return (
    <div className="legal" lang={showEn ? "en" : "de"}>
      {en ? (
        <section className="legal-block" role="note" lang="en">
          <p>This translation is provided for convenience. The German version is legally binding.</p>
          <button type="button" className="legal-nav-btn" onClick={() => setShowDe((v) => !v)}>
            {showDe ? "Show English version" : "Show German version"}
          </button>
        </section>
      ) : null}
      {showEn ? <LegalEn isPrivacy={isPrivacy} /> : isPrivacy ? (
        <>
          <section className="legal-block">
            <h2>1. Verantwortlicher</h2>
            <p>
              {lines(BRAND.person, BRAND.addressLine1, BRAND.addressLine2, "Deutschland")}
              {"\n"}
              E-Mail:{" "}
              <a className="legal-a" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              {"\n"}
              Telefon:{" "}
              <a className="legal-a" href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
            </p>
          </section>
          <section className="legal-block">
            <h2>2. Allgemeines</h2>
            <p>
              Spielfertig Trainer ist eine Web-App zum Üben. Es gibt keine Registrierung und kein Nutzerkonto.
              Übungsdaten bleiben auf Ihrem Gerät, soweit der Browser das speichert.
            </p>
          </section>
          <section className="legal-block">
            <h2>3. Hosting</h2>
            <p>
              Die App wird bei Vercel Inc. bereitgestellt ({BRAND.web}). Beim Aufruf verarbeitet der
              Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, Browserkennung)
              in Server-Logs. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung und Sicherheit
              der Website).
            </p>
          </section>
          <section className="legal-block">
            <h2>4. Lokale Speicherung</h2>
            <p>
              {lines(
                "localStorage (Schlüsselpräfix „sf.v1.“): z. B. letzte Übungs-Einstellungen und ob Kurzhilfen schon gesehen wurden.",
                "",
                "IndexedDB („sf.archive.v1“): von Ihnen hinzugefügte Notenblätter (Fotos/PDFs), nur lokal in diesem Browser — kein Upload in unsere Cloud.",
                "",
                "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 TDDDG (technisch erforderlich für die von Ihnen genutzte Funktion). Löschung: Browser-Daten für diese Seite löschen bzw. Blätter in der App entfernen.",
              )}
            </p>
          </section>
          <section className="legal-block">
            <h2>5. Cookies und Analyse</h2>
            <p>
              Wir setzen keine eigenen Tracking-Cookies und keine Analyse-Tools
              (kein Google Analytics, Plausible, Matomo o. Ä.) ein.
            </p>
          </section>
          <section className="legal-block">
            <h2>6. Google Fonts</h2>
            <p>
              Die App lädt Schriftarten von Google Fonts (fonts.googleapis.com / fonts.gstatic.com).
              Dabei kann Ihre IP-Adresse an Google übermittelt werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
              Später können die Schriften lokal gehostet werden, um diese Übertragung zu vermeiden.
            </p>
          </section>
          <section className="legal-block">
            <h2>7. Ihre Rechte</h2>
            <p>
              Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und
              Datenübertragbarkeit sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren
              (für Bayern z. B. der Bayerische Landesbeauftragte für den Datenschutz).
            </p>
          </section>
          <section className="legal-block">
            <h2>Stand</h2>
            <p>September 2026</p>
          </section>
        </>
      ) : (
        <>
          <section className="legal-block">
            <h2>Angaben gemäß § 5 DDG</h2>
            <p>{lines(BRAND.person, BRAND.addressLine1, BRAND.addressLine2, "Deutschland")}</p>
          </section>
          <section className="legal-block">
            <h2>Kontakt</h2>
            <p>
              Telefon:{" "}
              <a className="legal-a" href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>{BRAND.phone}</a>
              {"\n"}
              E-Mail:{" "}
              <a className="legal-a" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              {"\n"}
              Website:{" "}
              <a className="legal-a" href={`https://${BRAND.web}`}>{BRAND.web}</a>
            </p>
          </section>
          <section className="legal-block">
            <h2>Verantwortlich für den Inhalt</h2>
            <p>{BRAND.person}</p>
          </section>
          <section className="legal-block">
            <h2>Hinweis</h2>
            <p>
              Dieses Angebot ist ein persönliches Übungs-Tool (Drum-Trainer) ohne Nutzerkonten und ohne Shop.
              Es dient dem Üben von Rudiments und Groove.
            </p>
          </section>
        </>
      )}

      {typeof onOpen === "function" ? (
        <nav className="legal-nav" aria-label={t("Weitere Angaben")}>
          {isPrivacy ? (
            <button type="button" className="legal-nav-btn" onClick={() => onOpen("impressum")}>
              {t("Zum Impressum")}
            </button>
          ) : (
            <button type="button" className="legal-nav-btn" onClick={() => onOpen("datenschutz")}>
              {t("Zur Datenschutzerklärung")}
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
