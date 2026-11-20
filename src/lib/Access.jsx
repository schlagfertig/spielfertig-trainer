import { useEffect, useRef, useState } from "react";
import { getLang, t } from "./i18n.js";
import { accessInfo, iosApp, isUnlocked, nativeApp, purchaseFullVersion, unlockSource } from "./demo.js";
import { buyYearly, openManageSubscriptions, refreshEntitlement, restoreFullVersion, watchEntitlement } from "./iap.js";
import { refreshSandboxStore, setTestIgnoreFullPref, showTestIgnoreSwitch, testIgnoreFullPref } from "./storeEnv.js";
import { accessStatus } from "./accessText.js";
import { PurchaseOptions, restoreNote } from "./Paywall.jsx";

// „Mein Zugang“: Status, bei Sperre dieselben Kauf-Optionen wie im Paywall, sonst nur Status und Wiederherstellen.
// Erreichbar über den Fußbereich der Startseite (Store/native: ein Knopf „Mein Zugang“; Web bleibt unverändert).
// Der Status kommt aus der letzten Store-Prüfung und wird beim Öffnen und beim Zurückkehren in die App erneuert.
// onChange(): die App liest ihren Freischalt-Zustand neu.
export function Access({ onChange, price, sub = null, subPrice = null, onOpenLegal }) {
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
    refreshSandboxStore().then(() => {
      if (stop) return;
      rereadRef.current();
      return refreshEntitlement({ resume: true });
    }).then((res) => { if (!stop && res?.checked) rereadRef.current(); });
    const off = watchEntitlement(() => { if (!stop) rereadRef.current(); });
    return () => { stop = true; off(); };
  }, []);

  async function toggleIgnoreFull(on) {
    setTestIgnoreFullPref(on);
    await refreshEntitlement({ resume: false });
    reread();
  }

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

  async function buy() {
    if (busy) return;
    setNote("");
    setBusy(true);
    try {
      const res = await purchaseFullVersion();
      if (res?.ok) { setNote(""); reread(); }
      else setNote(buyNote(res));
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
      if (res?.ok) { setNote(""); reread(); }
      else setNote(buyNote(res));
    } catch {
      setNote("Kauf hat nicht geklappt. Bitte nochmal versuchen.");
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
      </section>
      {!unlocked && native ? (
        <PurchaseOptions
          price={price}
          sub={sub}
          subPrice={subPrice}
          busy={busy}
          ios={ios}
          showLegal={ios}
          idPrefix="access-opt"
          onBuy={buy}
          onSubscribe={subscribe}
          onOpenLegal={onOpenLegal}
        />
      ) : null}
      {manage ? (
        <button type="button" className="access-btn" onClick={() => openManageSubscriptions()}>{t("Abo verwalten")}</button>
      ) : null}
      {native ? (
        <button type="button" className="access-btn" onClick={restore} disabled={busy}>{t("Kauf wiederherstellen")}</button>
      ) : null}
      {note ? <p className="access-note" role="status">{t(note)}</p> : null}
      {manage ? <p className="access-hint">{t("Kündigen und ändern kannst du jederzeit in den Einstellungen deiner Apple-ID (Abonnements).")}</p> : null}
      {showTestIgnoreSwitch() ? (
        <div className="access-testmode">
          <label className="access-testmode-lab">
            <input type="checkbox" checked={testIgnoreFullPref()} disabled={busy} onChange={(e) => toggleIgnoreFull(e.target.checked)} />
            {t("Testmodus: Vollversion ignorieren")}
          </label>
          <p className="access-hint">{t("Nur ein TestFlight-Testmodus. An Apple wird nichts gelöscht.")}</p>
        </div>
      ) : null}
    </div>
  );
}

function buyNote(res) {
  if (res?.reason === "cancel") return "Kauf abgebrochen.";
  if (res?.reason === "not-native") return "Kauf geht nur in der Store-App.";
  if (res?.reason === "pending") return "Der Kauf wartet noch auf eine Freigabe. Sobald sie da ist, schaltet die App frei.";
  return "Kauf hat nicht geklappt. Bitte nochmal versuchen.";
}
