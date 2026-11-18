// „Mein Zugang“: aus dem gemerkten Zugang (demo.js accessInfo) wird eine kurze Statusanzeige.
// Rein und ohne Browser, damit die Texte testbar sind. Datum: lokale Zeit, de „17.11.2027“, en „17 Nov 2027“.

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function accessDate(ms, lang = "de") {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return lang === "en"
    ? `${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`
    : `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

// → { kind, tone, title, lines[] }
// kind: "test" (nicht frei) | "full" | "sub" | "trial" (Abo in der Gratis-Testphase) | "grace" (Zahlung offen)
// tone: "ok" (türkis) | "warn" (gold, sparsam) | "idle" (grau)
// Ob ein Gratis-Code eingelöst wurde, sagt StoreKit nicht: das zeigt „Vollversion“.
export function accessStatus({ unlocked, source = "", info = null, lang = "de" }) {
  const en = lang === "en";
  if (!unlocked) {
    return {
      kind: "test",
      tone: "idle",
      title: en ? "Trial version" : "Testversion",
      lines: [en
        ? "Part of the app is free. The full version unlocks everything."
        : "Ein Teil der App ist gratis. Die Vollversion schaltet alles frei."],
    };
  }
  const via = (info && info.via) || (source === "sub" ? "sub" : "full");
  if (via !== "sub") {
    return {
      kind: "full",
      tone: "ok",
      title: en ? "Full version" : "Vollversion",
      lines: [en
        ? "Unlocked for good, no subscription. This also covers a redeemed free code."
        : "Für immer freigeschaltet, ohne Abo. Das gilt auch für einen eingelösten Gratis-Code."],
    };
  }
  const until = info && Number.isFinite(info.until) ? info.until : null;
  const date = until != null ? accessDate(until, lang) : "";
  const cancelled = info && info.willCancel === true;
  const renews = info && info.willCancel === false;
  if (info && info.state === "inGracePeriod") {
    return {
      kind: "grace",
      tone: "warn",
      title: en ? "Annual subscription" : "Jahresabo",
      lines: [
        en
          ? "Apple couldn't collect the payment yet. Your access stays open for now."
          : "Apple konnte die Zahlung noch nicht abbuchen. Dein Zugang bleibt vorerst offen.",
        en
          ? "Please check your payment method in your Apple ID settings."
          : "Bitte prüf deine Zahlungsart in den Einstellungen deiner Apple-ID.",
      ],
    };
  }
  if (info && info.trial) {
    return {
      kind: "trial",
      tone: "warn",
      title: en ? "Annual subscription: free trial" : "Jahresabo: Gratis-Testphase",
      lines: [
        date
          ? (en ? `Your free trial runs until ${date}.` : `Deine Gratis-Testphase läuft bis ${date}.`)
          : (en ? "Your free trial is running." : "Deine Gratis-Testphase läuft."),
        cancelled
          ? (en ? "You have cancelled: access ends then." : "Du hast gekündigt: danach endet der Zugang.")
          : (en ? "After that the subscription renews automatically unless you cancel first." : "Danach verlängert sich das Abo automatisch, wenn du nicht vorher kündigst."),
      ],
    };
  }
  const title = date
    ? (en ? `Annual subscription active until ${date}` : `Jahresabo aktiv bis ${date}`)
    : (en ? "Annual subscription active" : "Jahresabo aktiv");
  const lines = [];
  if (cancelled) lines.push(en ? "You have cancelled: access ends then." : "Du hast gekündigt: danach endet der Zugang.");
  else if (renews && date) lines.push(en ? `Renews automatically on ${date}.` : `Verlängert sich automatisch am ${date}.`);
  else lines.push(en ? "Renews automatically until you cancel." : "Verlängert sich automatisch, bis du kündigst.");
  return { kind: "sub", tone: "ok", title, lines };
}
