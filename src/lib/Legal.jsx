import { BRAND } from "./brand.js";

const IMPRESSUM = [
  ["Angaben gemäß § 5 DDG", `${BRAND.person}\n${BRAND.addressLine1}\n${BRAND.addressLine2}\nDeutschland`],
  ["Kontakt", `Telefon: ${BRAND.phone}\nE-Mail: ${BRAND.email}\nWebsite: https://${BRAND.web}`],
  ["Verantwortlich für den Inhalt", BRAND.person],
  [
    "Hinweis",
    "Dieses Angebot ist ein persönliches Übungs-Tool (Drum-Trainer) ohne Nutzerkonten und ohne Shop. Es dient dem Üben von Rudiments und Groove.",
  ],
];

const DATENSCHUTZ = [
  [
    "1. Verantwortlicher",
    `${BRAND.person}\n${BRAND.addressLine1}\n${BRAND.addressLine2}\nDeutschland\nE-Mail: ${BRAND.email}\nTelefon: ${BRAND.phone}`,
  ],
  [
    "2. Allgemeines",
    "Spielfertig Trainer ist eine Web-App zum Üben. Es gibt keine Registrierung und kein Nutzerkonto. Übungsdaten bleiben auf Ihrem Gerät, soweit der Browser das speichert.",
  ],
  [
    "3. Hosting",
    "Die App wird bei Vercel Inc. bereitgestellt (spielfertig-trainer.vercel.app). Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt, Browserkennung) in Server-Logs. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung und Sicherheit der Website).",
  ],
  [
    "4. Lokale Speicherung",
    "localStorage (Schlüsselpräfix „sf.v1.“): z. B. letzte Übungs-Einstellungen und ob Kurzhilfen schon gesehen wurden.\n\nIndexedDB („sf.archive.v1“): von Ihnen hinzugefügte Notenblätter (Fotos/PDFs), nur lokal in diesem Browser — kein Upload in unsere Cloud.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 TDDDG (technisch erforderlich für die von Ihnen genutzte Funktion). Löschung: Browser-Daten für diese Seite löschen bzw. Blätter in der App entfernen.",
  ],
  [
    "5. Cookies und Analyse",
    "Wir setzen keine eigenen Tracking-Cookies und keine Analyse-Tools (kein Google Analytics, Plausible, Matomo o. Ä.) ein.",
  ],
  [
    "6. Google Fonts",
    "Die App lädt Schriftarten von Google Fonts (fonts.googleapis.com / fonts.gstatic.com). Dabei kann Ihre IP-Adresse an Google übermittelt werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Später können die Schriften lokal gehostet werden, um diese Übertragung zu vermeiden.",
  ],
  [
    "7. Ihre Rechte",
    "Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.",
  ],
  ["Stand", "September 2026"],
];

export default function Legal({ topic = "impressum" }) {
  const title = topic === "datenschutz" ? "Datenschutz" : "Impressum";
  const rows = topic === "datenschutz" ? DATENSCHUTZ : IMPRESSUM;

  return (
    <div className="legal">
      <h1 className="legal-title">{title}</h1>
      {rows.map(([k, v]) => (
        <section key={k} className="legal-block">
          <h2>{k}</h2>
          <p>{v}</p>
        </section>
      ))}
    </div>
  );
}
