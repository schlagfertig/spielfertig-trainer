// Dieselbe Schloss-Marke für gesperrte Einträge in der Gratis-Fassung (Store).
// Türkis wie „Volle App“ auf den Kacheln. Gold bleibt den wenigen Akzenten.
import { t } from "./i18n.js";

export function LockIcon({ size = 14 }) {
  return (
    <svg className="sf-lock" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2.2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Schloss, dazu „Volle App“. icon: nur das Schloss (der Text bleibt fürs Vorlesen). */
export function PaidMark({ icon = false, size = 14 }) {
  const label = t("Volle App");
  return (
    <span className={icon ? "sf-paid sf-paid-icon" : "sf-paid"} title={label}>
      <LockIcon size={size} />
      {icon ? <span className="sf-paid-sr">{label}</span> : <span>{label}</span>}
    </span>
  );
}
