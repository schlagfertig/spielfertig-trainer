// Texte für das Jahresabo auf der Kaufseite. Alles, was der Store liefert (Preis, Dauer, Testphase),
// wird aus dem Produkt gelesen (@capgo/native-purchases → StoreKit). Nichts davon ist fest eingebaut.
// Fehlt ein Wert (Produkt nicht geladen, Plugin liefert die Angabe nicht), steht ein ehrlicher
// Ersatztext da. Das Kaufblatt von Apple zeigt Preis, Testphase und Dauer immer verbindlich.
// Reine Funktionen, ohne Browser, damit scripts/subscription.test.mjs sie prüft.

// StoreKit-Einheiten (SKProduct.PeriodUnit / Product.SubscriptionPeriod.Unit): 0 Tag, 1 Woche, 2 Monat, 3 Jahr.
const UNITS = ["day", "week", "month", "year"];

/** { numberOfUnits, unit } oder { numberOfUnits, unitString } → { n, unit } | null */
export function readPeriod(sp) {
  if (!sp || typeof sp !== "object") return null;
  const n = Number(sp.numberOfUnits);
  if (!Number.isFinite(n) || n < 1) return null;
  let unit = null;
  if (typeof sp.unitString === "string") unit = sp.unitString.toLowerCase();
  else if (Number.isInteger(sp.unit)) unit = UNITS[sp.unit] || null;
  else if (typeof sp.unit === "string") unit = sp.unit.toLowerCase();
  if (!UNITS.includes(unit)) return null;
  return { n, unit };
}

// Tage, Wochen, Monate, Jahre in Tagen für „14 Tage“ statt „2 Wochen“ (Apple rechnet 1 Woche = 7 Tage).
function inDays(p) {
  if (!p) return null;
  if (p.unit === "day") return p.n;
  if (p.unit === "week") return p.n * 7;
  return null;
}

const DE = {
  day: ["Tag", "Tage"], week: ["Woche", "Wochen"], month: ["Monat", "Monate"], year: ["Jahr", "Jahre"],
};
const EN_ = {
  day: ["day", "days"], week: ["week", "weeks"], month: ["month", "months"], year: ["year", "years"],
};

/** „14 Tage“ / „14 days“, „1 Monat“ / „1 month“ */
export function periodLabel(p, lang) {
  if (!p) return "";
  const days = inDays(p);
  const [unit, n] = days != null && p.unit === "week" && p.n > 1 ? ["day", days] : [p.unit, p.n];
  const names = (lang === "en" ? EN_ : DE)[unit];
  return `${n} ${n === 1 ? names[0] : names[1]}`;
}

/** „pro Jahr“ / „per year“, bei mehreren Einheiten „alle 2 Jahre“ / „every 2 years“ */
export function perPeriod(p, lang) {
  if (!p) return "";
  if (p.n === 1) return lang === "en" ? `per ${EN_[p.unit][0]}` : `pro ${DE[p.unit][0]}`;
  return lang === "en" ? `every ${periodLabel(p, lang)}` : `alle ${periodLabel(p, lang)}`;
}

/** Kostenlose Einführungsphase des Produkts: { period, label } oder null. Preis 0 = gratis. */
export function readFreeTrial(product, lang) {
  const intro = product && typeof product === "object" ? product.introductoryPrice : null;
  if (!intro || typeof intro !== "object") return null;
  if (Number(intro.price) !== 0) return null;
  const sp = readPeriod(intro.subscriptionPeriod);
  if (!sp) return null;
  const count = Number.isFinite(Number(intro.numberOfPeriods)) && Number(intro.numberOfPeriods) > 1 ? Number(intro.numberOfPeriods) : 1;
  const period = { n: sp.n * count, unit: sp.unit };
  return { period, label: periodLabel(period, lang) };
}

function priceText(product) {
  if (!product || typeof product !== "object") return "";
  for (const key of ["priceString", "localizedPrice"]) {
    const v = product[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Anzeige für die Abo-Karte.
 * product: Produkt aus NativePurchases.getProducts (oder null, wenn nicht geladen).
 * price: schon geprüfter Preistext (Dollar-Filter aus iap.js) oder null.
 * Rückgabe:
 *   loaded      Preis aus dem Store vorhanden
 *   price       „4,99 €“ oder ""
 *   per         „pro Jahr“ (aus der Produktdauer, sonst Jahr) oder ""
 *   priceLine   „4,99 € pro Jahr“ / Ersatztext
 *   trialLine   „14 Tage gratis, danach 4,99 € pro Jahr“ / Ersatztext
 *   trial       Testphase vom Store bekannt (true) oder nicht (false)
 *   buyLabel    Text auf dem Knopf
 */
export function subscriptionOffer(product, lang = "de", price = null) {
  const en = lang === "en";
  const shown = (typeof price === "string" && price.trim()) || priceText(product);
  const period = readPeriod(product && product.subscriptionPeriod);
  const per = period ? perPeriod(period, lang) : (en ? "per year" : "pro Jahr");
  const trial = readFreeTrial(product, lang);
  if (!shown) {
    return {
      loaded: false,
      price: "",
      per: "",
      priceLine: en ? "Price shown by Apple when you subscribe" : "Preis zeigt Apple beim Abonnieren",
      trialLine: en
        ? "New subscribers may get a free trial. Apple shows whether it applies to you, and the exact price, before you confirm."
        : "Neue Abonnenten bekommen womöglich eine Gratis-Testphase. Ob sie für dich gilt und was es kostet, zeigt Apple vor der Bestätigung.",
      trial: false,
      buyLabel: en ? "Subscribe" : "Abonnieren",
    };
  }
  const priceLine = `${shown} ${per}`;
  if (trial) {
    return {
      loaded: true,
      price: shown,
      per,
      priceLine,
      trialLine: en
        ? `${trial.label} free, then ${priceLine}`
        : `${trial.label} gratis, danach ${priceLine}`,
      trial: true,
      buyLabel: en ? "Try free" : "Gratis testen",
    };
  }
  return {
    loaded: true,
    price: shown,
    per,
    priceLine,
    // Das Plugin liefert die Testphase nicht (oder das Produkt hat keine). Nichts behaupten, was wir nicht wissen.
    trialLine: en
      ? "If a free trial applies to you, Apple shows it before you confirm."
      : "Gilt für dich eine Gratis-Testphase, zeigt Apple sie vor der Bestätigung.",
    trial: false,
    buyLabel: en ? "Subscribe" : "Abonnieren",
  };
}
