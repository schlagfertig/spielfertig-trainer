import { t } from "./i18n.js";

// Kontakt-Knöpfe im Footer der Startseite: nur Icons, Kontaktdaten stecken im Link (nicht als Text sichtbar).
// Logos als Inline-SVG in currentColor (Türkis wie die ±5-Knöpfe, keine Markenfarben, keine externen Assets). WhatsApp/Instagram öffnen extern (_blank), Mail normal.
const LINKS = [
  {
    id: "wa",
    href: "https://wa.me/4915225742199",
    label: "WhatsApp schreiben",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
        <path d="M12 3.1a8.9 8.9 0 0 0-7.7 13.4L3.1 20.9l4.5-1.2A8.9 8.9 0 1 0 12 3.1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.2 7.7c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.2 5 4.4 2.5 1 3 .8 3.5.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "ig",
    href: "https://www.instagram.com/xschlagfertigx/",
    label: "Instagram",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="16" height="16" rx="4.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="16.7" cy="7.3" r="1.15" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "mail",
    href: "mailto:schlagfertig@icloud.com",
    label: "E-Mail schreiben",
    external: false,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
        <rect x="3.4" y="5.8" width="17.2" height="12.4" rx="2.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path d="M4.6 7.4l7.4 5.8 7.4-5.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function SocialLinks() {
  return (
    <nav className="foot-social" aria-label={t("Kontakt")}>
      {LINKS.map((l) => (
        <a
          key={l.id}
          className={`social-btn social-${l.id}`}
          href={l.href}
          aria-label={t(l.label)}
          title={t(l.label)}
          {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {l.icon}
        </a>
      ))}
    </nav>
  );
}
