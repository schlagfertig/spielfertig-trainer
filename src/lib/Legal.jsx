import { BRAND } from "./brand.js";

function lines(...parts) {
  return parts.filter(Boolean).join("\n");
}

export default function Legal({ topic = "impressum", onOpen }) {
  const isPrivacy = topic === "datenschutz";

  return (
    <div className="legal">
      {isPrivacy ? (
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
        <nav className="legal-nav" aria-label="Weitere Angaben">
          {isPrivacy ? (
            <button type="button" className="legal-nav-btn" onClick={() => onOpen("impressum")}>
              Zum Impressum
            </button>
          ) : (
            <button type="button" className="legal-nav-btn" onClick={() => onOpen("datenschutz")}>
              Zur Datenschutzerklärung
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
