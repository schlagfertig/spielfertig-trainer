import { useState } from "react";
import { BRAND } from "./brand.js";
import { getLang, t } from "./i18n.js";
import { PRIVACY } from "./privacyText.js";

function lines(...parts) {
  return parts.filter(Boolean).join("\n");
}

// Datenschutzerklärung aus privacyText.js (gleiche Quelle wie die öffentliche Seite /datenschutz.html).
function PrivacyBody({ lang }) {
  return (
    <>
      {PRIVACY[lang].sections.map((sec) => (
        <section className="legal-block" key={sec.h}>
          <h2>{sec.h}</h2>
          <p>
            {sec.body.map((part, i) =>
              typeof part === "string" ? part : (
                <a key={i} className="legal-a" href={part.href}>{part.text}</a>
              ),
            )}
          </p>
        </section>
      ))}
    </>
  );
}

// Englische Fassung: nur Komfort-Übersetzung, verbindlich ist die deutsche.
function LegalEn({ isPrivacy }) {
  return isPrivacy ? (
    <PrivacyBody lang="en" />
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
          {BRAND.product} is a practice tool made by a drummer for drummers: rudiments, grooves and timing - beat by beat.
          No user account and no ads. Questions, ideas or feedback? Just send me an email.
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
        <PrivacyBody lang="de" />
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
              {BRAND.product} ist ein Übungs-Tool von einem Drummer für Drummer: Rudiments, Grooves und Timing - Schlag für Schlag.
              Ohne Nutzerkonto und ohne Werbung. Fragen, Ideen oder Feedback? Schreib mir einfach eine E-Mail.
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
