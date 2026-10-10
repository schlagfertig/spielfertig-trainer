import { useEffect, useRef, useState } from "react";
import { loadSession, saveSession } from "./session.js";
import { t } from "./i18n.js";

// Vorname aus dem Cookie sf_name (setzt middleware.js beim Einladungslink); nur Buchstaben, - und '
function testerName() {
  try {
    const v = decodeURIComponent(/(?:^|;\s*)sf_name=([^;]*)/.exec(document.cookie)?.[1] || "");
    return /^[\p{L}'-]{1,20}$/u.test(v) ? v : "";
  } catch { return ""; }
}

// Persönlicher Gruß aus dem Cookie sf_gruss (setzt middleware.js nur für einzelne Einladungs-Kürzel)
function greeting() {
  return /(?:^|;\s*)sf_gruss=schatz(?:;|$)/.test(document.cookie || "") ? "schatz" : "";
}


// Einmalige Begrüßung beim ersten Öffnen der Startseite (localStorage sf.v1.welcomeSeen)
export function Welcome({ onClose } = {}) {
  const [open, setOpen] = useState(() => !loadSession("welcomeSeen", {}).seen);
  const [name] = useState(testerName);
  const [gruss] = useState(greeting);
  const btn = useRef(null);

  function close() {
    saveSession("welcomeSeen", { seen: true });
    setOpen(false);
    onClose?.();
  }

  useEffect(() => {
    if (!open) return undefined;
    btn.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal welcome" onClick={close}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-text" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head" id="welcome-title">{gruss === "schatz" ? t("Hallo mein Schatz! ❤️") : (name ? t("Hallo {name}, willkommen bei Schlagfertig‽ 🥁", { name }) : t("Willkommen bei Schlagfertig‽ 🥁"))}</div>
        <p className="welcome-sub">{t("Drums lernen - Schlag für Schlag")}</p>
        <p id="welcome-text">{t("Schön, dass du dabei bist und die App testest. Starte am besten mit „Erste Übung“ - das dauert nur eine Minute. Über das „?“ oben rechts findest du überall Hilfe. Ich freue mich über jede Rückmeldung!")}</p>
        <p className="welcome-sig">Tom</p>
        <button ref={btn} type="button" className="play" onClick={close} style={{ width: "100%" }}>{t("Los geht's")}</button>
      </div>
    </div>
  );
}
