import { useEffect, useRef, useState } from "react";
import { getLang, t } from "./i18n.js";
import { accessInfo, askUnlock, iosApp, isUnlocked, nativeApp, unlockSource } from "./demo.js";
import { openManageSubscriptions, refreshEntitlement, restoreFullVersion, watchEntitlement } from "./iap.js";
import { accessStatus } from "./accessText.js";
import { restoreNote } from "./Paywall.jsx";

// „Mein Zugang“: Status (Testversion, Vollversion, Jahresabo), Abo verwalten, Kauf wiederherstellen.
// Erreichbar über den Fußbereich der Startseite (neben Vollversion, Impressum, Datenschutz).
// Der Status kommt aus der letzten Store-Prüfung und wird beim Öffnen und beim Zurückkehren in die App erneuert.
// onChange(): die App liest ihren Freischalt-Zustand neu.
export function Access({ onChange }) {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const lang = getLang();
  const native = nativeApp();
  const ios = iosApp();

  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const reread = () => { setTick((n) => n + 1); changeRef.current?.(); };
  const rereadRef = useRef(reread);
  rereadRef.current = reread;

  useEffect(() => {
    let stop = false;
    refreshEntitlement({ resume: true }).then((res) => { if (!stop && res.checked) rereadRef.current(); });
    const off = watchEntitlement(() => { if (!stop) rereadRef.current(); });
    return () => { stop = true; off(); };
  }, []);

  const unlocked = isUnlocked();
  const st = accessStatus({ unlocked, source: unlockSource(), info: accessInfo(), lang });
  const manage = ios && st.kind !== "test" && (st.kind === "sub" || st.kind === "trial" || st.kind === "grace");

  async function restore() {
    if (busy) return;
    setNote("");
    setBusy(true);
    try {
      const res = await restoreFullVersion();
      if (res?.ok) { setNote("Dein Kauf ist wiederhergestellt."); reread(); }
      else setNote(restoreNote(res));
    } catch {
      setNote("Wiederherstellen hat nicht geklappt. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="legal access">
      <section className={`access-card access-${st.tone}`} aria-live="polite" aria-label={t("Mein Zugang")}>
        <div className="access-kicker">{t("Dein Status")}</div>
        <h2 className="access-title">{st.title}</h2>
        {st.lines.map((line) => <p className="access-line" key={line}>{line}</p>)}
        {st.kind === "test" ? (
          <button type="button" className="access-btn access-btn-main" onClick={() => askUnlock()}>
            {t(ios ? "Vollversion oder Jahresabo ansehen" : "Vollversion ansehen")}
          </button>
        ) : null}
      </section>
      {manage ? (
        <button type="button" className="access-btn" onClick={() => openManageSubscriptions()}>{t("Abo verwalten")}</button>
      ) : null}
      {native ? (
        <button type="button" className="access-btn" onClick={restore} disabled={busy}>{t("Kauf wiederherstellen")}</button>
      ) : null}
      {note ? <p className="access-note" role="status">{t(note)}</p> : null}
      {manage ? <p className="access-hint">{t("Kündigen und ändern kannst du jederzeit in den Einstellungen deiner Apple-ID (Abonnements).")}</p> : null}
    </div>
  );
}
