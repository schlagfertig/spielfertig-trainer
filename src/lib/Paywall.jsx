import { useEffect, useRef, useState } from "react";
import { t } from "./i18n.js";
import { DEMO_PRICE, purchaseFullVersion, unlockCodeOk } from "./demo.js";

// Kauf-Blatt für die Vollversion. Kaufen ruft purchaseFullVersion.
// Bis StoreKit/Play Billing verdrahtet ist, kein System-Kaufdialog und kein Freischalten.
export function DemoPaywall({ onClose, onUnlock }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [note, setNote] = useState(false);
  const field = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") closeRef.current?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function tryCode() {
    if (unlockCodeOk(code)) { onUnlock(); return; }
    if (!String(code).trim()) { field.current?.focus(); return; }
    setBad(true);
  }

  async function buy() {
    setNote(false);
    const res = await purchaseFullVersion();
    if (res?.ok) { onUnlock(); return; }
    setNote(true);
  }

  return (
    <div className="paywall" onClick={onClose}>
      <div
        className="paywall-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-kicker paywall-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="paywall-head">
          <div className="paywall-kicker" id="paywall-kicker">{t("Vollversion")}</div>
          <button type="button" className="paywall-x" onClick={onClose} aria-label={t("Schließen")}>×</button>
        </div>
        <h2 id="paywall-title" className="paywall-title">{t("Volle App")}</h2>
        <div className="paywall-offer">
          <p className="paywall-price">{DEMO_PRICE}</p>
          <button type="button" className="paywall-buy" onClick={buy}>{t("Kaufen")}</button>
        </div>
        <p className="paywall-sub">{t("Einmalig, kein Abo.")}</p>
        {note ? <p className="paywall-note" role="status">{t("Kauf geht nur in der Store-App.")}</p> : null}
        <p className="paywall-copy">{t("Danach ist alles offen: NoClick, alle Rudiments, Hand Control, die schwereren Pyramiden-Stufen, Noten, Drucken der übrigen Übungen, unbegrenzte Hausaufgaben und Karteikarten — eigene Grooves mit mehr als einem Takt, und du speicherst sie.")}</p>
        <p className="paywall-copy">{t("Kostenlos bleiben Erste Übung, No-Stick-Challenge, Tempo halten und Tempo steigern, Lexikon und das Tagebuch. Dazu sechs Rudiments (Single Stroke Roll, Double Stroke Open Roll, Single Paradiddle, Flam, Flam Tap, Drag), die du auch drucken kannst, der Würfel aus diesen sechs, Hand Control 1 und 2, die Rhythmuspyramide in Vierteln, Achteln und 16teln, die ersten zwei Hausaufgaben, die ersten zwei Karteikarten und eigene Grooves mit genau einem Takt zum Ausprobieren.")}</p>
        <div className="paywall-tester">
          <div className="paywall-tester-kicker">{t("Für Tester")}</div>
          <label className="paywall-label" htmlFor="paywall-code">{t("Code aus der Stunde")}</label>
          <div className="paywall-code">
            <input
              id="paywall-code"
              ref={field}
              value={code}
              onChange={(e) => { setCode(e.target.value); setBad(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") tryCode(); }}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck="false"
            />
            <button type="button" className="paywall-unlock" onClick={tryCode}>{t("Freischalten")}</button>
          </div>
          {bad ? <p className="paywall-bad">{t("Code passt nicht.")}</p> : null}
        </div>
        <button type="button" className="paywall-close" onClick={onClose}>{t("Schließen")}</button>
      </div>
    </div>
  );
}
