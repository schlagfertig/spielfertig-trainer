import { useEffect, useRef, useState } from "react";
import { getLang, t } from "./i18n.js";
import { DEMO_ON, EULA_URL, TESTER_UNLOCK, fallbackPrice, iosApp, isUnlocked, purchaseFullVersion, unlockCodeOk, unlockSource } from "./demo.js";
import { buyYearly, openManageSubscriptions, restoreFullVersion } from "./iap.js";
import { subscriptionOffer } from "./subscriptionText.js";

// Kauf-Blatt. Kaufen ruft purchaseFullVersion (in der nativen Hülle das Apple- bzw. Play-Kaufblatt).
// Preis ist der Store-String, sonst fallbackPrice.
// In der iOS-App gibt es zwei Wege: „Für immer“ (Vollversion) und „Jahresabo“. Abo-Preis, Dauer und
// Testphase kommen aus dem Store-Produkt (sub, subPrice), siehe subscriptionText.js.
// onOpenLegal("datenschutz") öffnet die In-App-Datenschutzseite.
export function DemoPaywall({ onClose, onUnlock, price, sub = null, subPrice = null, onOpenLegal }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const shownPrice = price || fallbackPrice(getLang());
  // Schon freigeschaltet (Kauf oder Wiederherstellen): Status statt Kaufen, damit niemand doppelt zahlt.
  const owned = isUnlocked();
  const ios = iosApp();
  const lang = getLang();
  const offer = subscriptionOffer(sub, lang, subPrice);
  const viaSub = owned && unlockSource() === "sub";

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
    if (!TESTER_UNLOCK) return;
    if (unlockCodeOk(code)) { onUnlock(); return; }
    if (!String(code).trim()) { field.current?.focus(); return; }
    setBad(true);
  }

  async function buy() {
    if (busy) return;
    setNote("");
    setBusy(true);
    try {
      const res = await purchaseFullVersion();
      if (res?.ok) { onUnlock(); return; }
      setNote(buyNote(res));
    } catch {
      setNote("Kauf hat nicht geklappt. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    if (busy) return;
    setNote("");
    setBusy(true);
    try {
      const res = await buyYearly();
      if (res?.ok) { onUnlock(); return; }
      setNote(buyNote(res));
    } catch {
      setNote("Kauf hat nicht geklappt. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (busy) return;
    setNote("");
    setBusy(true);
    try {
      const res = await restoreFullVersion();
      if (res?.ok) { onUnlock(); return; }
      setNote(restoreNote(res));
    } catch {
      setNote("Wiederherstellen hat nicht geklappt. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
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
        <img className="paywall-logo" src="/logo-vollversion.png" width="512" height="509" alt={t("Logo Schlagfertig Vollversion")} />
        {owned ? (
          <div className="paywall-offer paywall-owned">
            <p className="paywall-status" role="status"><span aria-hidden="true">✓</span> {t("Bereits freigeschaltet")}</p>
          </div>
        ) : ios ? (
          <div className="paywall-options">
            <section className="paywall-opt" aria-labelledby="paywall-opt-full">
              <h3 className="paywall-opt-title" id="paywall-opt-full">{t("Für immer")}</h3>
              <p className="paywall-price">{shownPrice}</p>
              <p className="paywall-sub">{t("Einmalig, kein Abo.")}</p>
              <button type="button" className="paywall-buy" onClick={buy} disabled={busy}>{t("Kaufen")}</button>
            </section>
            <section className="paywall-opt paywall-opt-sub" aria-labelledby="paywall-opt-sub">
              <h3 className="paywall-opt-title" id="paywall-opt-sub">{t("Jahresabo")}</h3>
              <p className="paywall-price">
                {offer.loaded ? <>{offer.price}<span className="paywall-per"> {offer.per}</span></> : <span className="paywall-per">{offer.priceLine}</span>}
              </p>
              <p className={offer.trial ? "paywall-trial is-on" : "paywall-trial"}>{offer.trialLine}</p>
              <p className="paywall-sub">{t("Verlängert sich automatisch, bis du kündigst.")}</p>
              <button type="button" className="paywall-buy" onClick={subscribe} disabled={busy}>{offer.buyLabel}</button>
            </section>
          </div>
        ) : (
          <>
            <div className="paywall-offer">
              <p className="paywall-price">{shownPrice}</p>
              <button type="button" className="paywall-buy" onClick={buy} disabled={busy}>{t("Kaufen")}</button>
            </div>
            <p className="paywall-sub">{t("Einmalig, kein Abo.")}</p>
          </>
        )}
        {viaSub ? (
          <p className="paywall-sub paywall-subs-on">
            {t("Dein Jahresabo ist aktiv.")}{" "}
            <button type="button" className="paywall-link" onClick={openManageSubscriptions}>{t("Abo verwalten")}</button>
          </p>
        ) : null}
        {DEMO_ON ? (
          <button type="button" className="paywall-restore" onClick={restore} disabled={busy}>{t("Kauf wiederherstellen")}</button>
        ) : null}
        {note ? <p className="paywall-note" role="status">{t(note)}</p> : null}
        <p className="paywall-copy">{t("Danach ist alles offen: Takte ohne Click, alle Rudiments, Hand Control, die schwereren Pyramiden-Stufen, Noten, Drucken der übrigen Übungen, unbegrenzte Hausaufgaben und Karteikarten — eigene Grooves mit mehr als einem Takt, und du speicherst sie.")}</p>
        <p className="paywall-copy">{t("Kostenlos bleiben Erste Übung, No-Stick-Challenge, Tempo halten und Tempo steigern, Lexikon und das Tagebuch. Dazu sechs Rudiments (Single Stroke Roll, Double Stroke Open Roll, Single Paradiddle, Flam, Flam Tap, Drag), die du auch drucken kannst, der Würfel aus diesen sechs, Hand Control 1 und 2, die Rhythmuspyramide in Vierteln, Achteln und 16teln, die ersten zwei Hausaufgaben, die ersten zwei Karteikarten und eigene Grooves mit genau einem Takt zum Ausprobieren.")}</p>
        {ios ? (
          <div className="paywall-legal">
            <p>{t("Jahresabo: Die Zahlung läuft über deine Apple-ID. Das Abo verlängert sich automatisch um ein weiteres Jahr, wenn du nicht mindestens 24 Stunden vor Ablauf des laufenden Zeitraums kündigst. Die Verlängerung wird dir innerhalb von 24 Stunden vor Ablauf berechnet.")}</p>
            <p>{t("Du verwaltest und kündigst das Abo jederzeit in den Einstellungen deiner Apple-ID (Einstellungen › Apple-ID › Abonnements). Eine Gratis-Testphase gibt es nur, wenn du sie noch nicht genutzt hast.")}</p>
            <p className="paywall-legal-links">
              <a className="paywall-link" href={EULA_URL} target="_blank" rel="noopener noreferrer">{t("Nutzungsbedingungen (EULA)")}</a>
              <span aria-hidden="true"> · </span>
              <button type="button" className="paywall-link" onClick={() => onOpenLegal?.("datenschutz")}>{t("Datenschutz")}</button>
            </p>
          </div>
        ) : null}
        {TESTER_UNLOCK ? (
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
        ) : null}
        <button type="button" className="paywall-close" onClick={onClose}>{t("Schließen")}</button>
      </div>
    </div>
  );
}

function buyNote(res) {
  if (res?.reason === "cancel") return "Kauf abgebrochen.";
  if (res?.reason === "not-native") return "Kauf geht nur in der Store-App.";
  if (res?.reason === "pending") return "Der Kauf wartet noch auf eine Freigabe. Sobald sie da ist, schaltet die App frei.";
  return "Kauf hat nicht geklappt. Bitte nochmal versuchen.";
}

export function restoreNote(res) {
  if (res?.reason === "not-native") return "Wiederherstellen geht nur in der Store-App.";
  if (res?.reason === "cancel") return "Kauf abgebrochen.";
  if (res?.reason === "none") return "Kein Kauf zum Wiederherstellen.";
  return "Wiederherstellen hat nicht geklappt. Bitte nochmal versuchen.";
}
