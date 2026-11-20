// Einmal-Kauf der Vollversion und Jahresabo (nur iOS) über @capgo/native-purchases (Capacitor 7).
// iOS: StoreKit 2. Android: Play Billing, Vollversion mit derselben Produkt-ID, nicht verbrauchbar.
// Vollversion ODER aktives Abo = dieselbe Freischaltung (entitlementFromPurchases).
// Das Plugin wird nur in der nativen Hülle geladen. Web und Tests rufen es nicht auf.

import {
  FULL_PRODUCT_ID, SUB_PRODUCT_ID, TESTER_UNLOCK, iosApp, nativeApp, setAccessInfo, setUnlockSource, setUnlocked, unlockSource,
} from "./demo.js";
import { isTestIgnoreFullActive } from "./storeEnv.js";

let pluginPromise = null;
let priceInflight = null;
let lastStoreInfo = { price: null, sub: null, subPrice: null };

function loadPlugin() {
  if (!pluginPromise) pluginPromise = import("@capgo/native-purchases");
  return pluginPromise;
}

// iOS sagt „User cancelled“. Play Billing packt Abbruch und „schon gekauft“
// in denselben Satz „Purchase is not purchased“ — den prüfen wir danach nochmal.
export function purchaseFailureKind(err) {
  const msg = `${err && err.message ? err.message : ""} ${err && err.code ? err.code : ""}`;
  if (/cancel/i.test(msg)) return "cancel";
  if (/not purchased/i.test(msg)) return "sheet";
  if (/pending/i.test(msg)) return "pending";
  return "error";
}

// Android: purchaseState "1" ist gekauft, "2" ist noch offen. iOS setzt das Feld nicht.
// Widerruf (revocationDate) zählt nicht als Vollversion.
export function ownsFullProduct(purchases) {
  if (!Array.isArray(purchases)) return false;
  return purchases.some((p) => {
    if (!p || p.productIdentifier !== FULL_PRODUCT_ID) return false;
    if (p.revocationDate) return false;
    if (p.purchaseState != null && String(p.purchaseState) !== "1" && String(p.purchaseState) !== "PURCHASED") return false;
    return true;
  });
}

export function transactionGrantsFull(tx) {
  if (!tx || typeof tx !== "object") return false;
  if (tx.revocationDate) return false;
  if (tx.productIdentifier && tx.productIdentifier !== FULL_PRODUCT_ID) return false;
  if (!tx.productIdentifier && !tx.transactionId) return false;
  if (tx.purchaseState != null && String(tx.purchaseState) !== "1" && String(tx.purchaseState) !== "PURCHASED") return false;
  return true;
}

// Jahresabo (iOS, StoreKit 2): getPurchases liefert die aktuellen Berechtigungen UND alle früheren
// Transaktionen, auch abgelaufene. Also zählt nur: nicht widerrufen und (isActive oder Ablaufdatum
// in der Zukunft oder Kulanzzeit). Ohne Angabe zum Ablauf wird nichts freigeschaltet.
function purchaseStateOk(p) {
  return p.purchaseState == null || String(p.purchaseState) === "1" || String(p.purchaseState) === "PURCHASED";
}

export function subscriptionActive(p, now = Date.now()) {
  if (!p || typeof p !== "object" || p.productIdentifier !== SUB_PRODUCT_ID) return false;
  if (p.revocationDate || p.subscriptionState === "revoked") return false;
  if (!purchaseStateOk(p)) return false;
  if (p.subscriptionState === "inGracePeriod") return true;
  if (p.isActive === true) return true;
  if (p.isActive === false) return false;
  const until = Date.parse(p.expirationDate);
  return Number.isFinite(until) && until > now;
}

export function ownsActiveSubscription(purchases, now = Date.now()) {
  return Array.isArray(purchases) && purchases.some((p) => subscriptionActive(p, now));
}

// Spätestes Ablaufdatum unter den aktiven Abo-Transaktionen (ms) oder null.
export function subscriptionUntil(purchases, now = Date.now()) {
  if (!Array.isArray(purchases)) return null;
  let best = null;
  for (const p of purchases) {
    if (!subscriptionActive(p, now)) continue;
    const t = Date.parse(p.expirationDate);
    if (Number.isFinite(t) && (best == null || t > best)) best = t;
  }
  return best;
}

// Eine Antwort für „ist die App frei?“. via: "full" hat Vorrang vor "sub".
export function entitlementFromPurchases(purchases, now = Date.now()) {
  if (ownsFullProduct(purchases) && !isTestIgnoreFullActive()) return { owned: true, via: "full", until: null };
  if (ownsActiveSubscription(purchases, now)) return { owned: true, via: "sub", until: subscriptionUntil(purchases, now) };
  return { owned: false, via: null, until: null };
}

// Was „Mein Zugang“ anzeigt: Quelle plus beim Abo Ablauf, Verlängerung (willCancel), Zustand und Testphase.
// null = nicht frei. Nur Anzeige, die Freischaltung hängt weiter an entitlementFromPurchases.
export function entitlementDetail(purchases, now = Date.now()) {
  const e = entitlementFromPurchases(purchases, now);
  if (!e.owned) return null;
  if (e.via === "full") return { via: "full" };
  let best = null;
  let bestT = -Infinity;
  for (const p of purchases) {
    if (!subscriptionActive(p, now)) continue;
    const tm = Date.parse(p.expirationDate);
    const rank = Number.isFinite(tm) ? tm : 0;
    if (rank > bestT) { best = p; bestT = rank; }
  }
  return {
    via: "sub",
    until: e.until,
    willCancel: typeof best?.willCancel === "boolean" ? best.willCancel : null,
    state: best?.subscriptionState || "",
    trial: best?.isTrialPeriod === true,
  };
}

// Antwort von purchaseProduct für das Abo: gekauft und (noch) gültig.
export function transactionGrantsSub(tx, now = Date.now()) {
  if (!tx || typeof tx !== "object") return false;
  if (tx.productIdentifier !== SUB_PRODUCT_ID) return false;
  return subscriptionActive(tx, now);
}

function storePriceTexts(product) {
  if (!product || typeof product !== "object") return [];
  const out = [];
  for (const key of ["priceString", "localizedPrice"]) {
    const value = product[key];
    if (typeof value === "string" && value.trim()) out.push(value.trim());
  }
  return out;
}

function storefrontCountry(storefront) {
  if (!storefront || typeof storefront !== "object") return "";
  return String(storefront.countryCode || "").trim().toUpperCase();
}

function unitedStates(code) {
  return code === "US" || code === "USA";
}

// "$11.99" / "US$11.99" / "11.99 USD". Kein Umbau einer nackten Zahl.
export function isDollarPrice(text) {
  const s = String(text || "").trim();
  return s.startsWith("$") || /^US\$/i.test(s) || /\bUSD\b/.test(s);
}

// Der Text vom Store, unverändert. priceString, sonst localizedPrice.
// Eine Zahl (price) wird nicht mit einer angenommenen Währung formatiert.
// TestFlight: displayPrice ist oft der US-Preis "$11.99", das Kaufblatt aber
// der Storefront-Preis (DE: "12,99 €"). Dollar außerhalb der USA zählt dann nicht.
export function priceFromProducts(products, storefront, id = FULL_PRODUCT_ID) {
  const list = Array.isArray(products) ? products : [];
  // Die Vollversion fällt auf den ersten Treffer zurück (wie bisher), das Abo nie auf ein fremdes Produkt.
  const hit = list.find((p) => p && p.identifier === id) || (id === FULL_PRODUCT_ID ? list.find((p) => p && p.identifier !== SUB_PRODUCT_ID) : null);
  const options = storePriceTexts(hit);
  if (!options.length) return null;
  const country = storefrontCountry(storefront);
  if (country && !unitedStates(country)) {
    return options.find((text) => !isDollarPrice(text)) || null;
  }
  return options[0];
}

async function fetchPurchases() {
  const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
  // iOS liefert Käufe und Abos in einer Liste (productType gilt nur für Android).
  const { purchases } = await NativePurchases.getPurchases(iosApp() ? {} : {
    productType: PURCHASE_TYPE.INAPP,
  });
  return Array.isArray(purchases) ? purchases : [];
}

async function readStoreInfo() {
  const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
  const support = await NativePurchases.isBillingSupported();
  if (!support?.isBillingSupported) return { price: null, sub: null, subPrice: null };
  let storefront = null;
  if (typeof NativePurchases.getStorefront === "function") {
    try { storefront = await NativePurchases.getStorefront(); } catch { storefront = null; }
  }
  const withSub = iosApp();
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: withSub ? [FULL_PRODUCT_ID, SUB_PRODUCT_ID] : [FULL_PRODUCT_ID],
    productType: PURCHASE_TYPE.INAPP,
  });
  const list = Array.isArray(products) ? products : [];
  const sub = withSub ? list.find((p) => p && p.identifier === SUB_PRODUCT_ID) || null : null;
  return {
    price: priceFromProducts(list, storefront),
    sub,
    subPrice: sub ? priceFromProducts(list, storefront, SUB_PRODUCT_ID) : null,
  };
}

// Preise und Abo-Produkt aus dem Store: { price, sub, subPrice }.
// price = lokalisierter Text der Vollversion, z. B. "12,99 €". sub = Produkt des Jahresabos
// (Preis, Dauer, Testphase, wenn das Plugin sie liefert), subPrice = geprüfter Preistext.
// null-Felder = kein brauchbarer Store-Wert (Web, offline, Produkt fehlt, Dollar auf fremdem Storefront).
// Der erste Treffer wird nicht festgehalten: das Kauf-Blatt fragt neu.
export function loadStoreInfo() {
  if (!nativeApp()) return Promise.resolve({ price: null, sub: null, subPrice: null });
  if (!priceInflight) {
    priceInflight = readStoreInfo().then((info) => {
      lastStoreInfo = info;
      return info;
    }, () => lastStoreInfo).finally(() => {
      priceInflight = null;
    });
  }
  return priceInflight;
}

// Nur der Preis der Vollversion (wie bisher).
export function loadStorePrice() {
  return loadStoreInfo().then((info) => info.price);
}

// Beim Start der nativen App und beim Zurückkehren in die App. Fehlschlag (offline, Produkt fehlt)
// lässt die gemerkte Freischaltung stehen. Tester-Code wird nicht wieder zugesperrt.
// Beim Zurückkehren (resume) sperrt nur ein abgelaufenes Abo wieder zu: Käufer der Vollversion und
// eingelöste Codes bleiben offen, auch wenn der Store einmal kurz nichts liefert.
export async function refreshEntitlement({ resume = false } = {}) {
  if (!nativeApp()) return { checked: false, reason: "not-native" };
  try {
    const purchases = await fetchPurchases();
    const { owned, via, until } = entitlementFromPurchases(purchases);
    if (owned) {
      setUnlocked(true);
      setUnlockSource(via);
      setAccessInfo(entitlementDetail(purchases));
    } else if (!TESTER_UNLOCK && (!resume || unlockSource() === "sub" || isTestIgnoreFullActive())) {
      setUnlocked(false);
      if (isTestIgnoreFullActive()) { setUnlockSource(""); setAccessInfo(null); }
    }
    return { checked: true, owned, via, until };
  } catch {
    return { checked: false, reason: "error" };
  }
}

// Käufe und eingelöste Offer-Codes sofort freischalten, ohne App-Neustart:
// StoreKit meldet sie über Transaction.updates (Plugin-Event transactionUpdated);
// dazu prüfen wir beim Zurückkehren in die App (Capacitor resume, visibilitychange) neu.
// onChange() läuft nach jeder Prüfung, die etwas ergeben hat. Rückgabe: Aufräum-Funktion.
export function watchEntitlement(onChange) {
  if (!nativeApp()) return () => {};
  let stopped = false;
  let handles = [];
  let timer = null;
  const check = () => {
    if (stopped) return;
    refreshEntitlement({ resume: true }).then((res) => {
      if (!stopped && res.checked) onChange?.(res);
    });
  };
  // Kurz bündeln: resume, visibilitychange und Event kommen oft zusammen.
  const soon = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; check(); }, 250);
  };
  const onVis = () => { if (!document.hidden) soon(); };
  document.addEventListener("visibilitychange", onVis);
  loadPlugin().then(({ NativePurchases }) => {
    if (stopped) return;
    return NativePurchases.addListener("transactionUpdated", soon).then((h) => {
      if (stopped) h.remove?.(); else handles.push(h);
    });
  }).catch(() => { /* Plugin fehlt: resume reicht */ });
  import("@capacitor/app").then(({ App }) => {
    if (stopped) return;
    return App.addListener("resume", soon).then((h) => {
      if (stopped) h.remove?.(); else handles.push(h);
    });
  }).catch(() => { /* kein App-Plugin: visibilitychange reicht */ });
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVis);
    handles.forEach((h) => { try { h.remove?.(); } catch { /* ignore */ } });
    handles = [];
  };
}

export async function buyFullVersion() {
  if (!nativeApp()) {
    return { ok: false, reason: "not-native", productId: FULL_PRODUCT_ID };
  }
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const support = await NativePurchases.isBillingSupported();
    if (!support?.isBillingSupported) {
      return { ok: false, reason: "unavailable", productId: FULL_PRODUCT_ID };
    }
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: FULL_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1,
      isConsumable: false,
    });
    if (!transactionGrantsFull(tx)) {
      return { ok: false, reason: "error", productId: FULL_PRODUCT_ID };
    }
    setUnlocked(true);
    setUnlockSource("full");
    setAccessInfo({ via: "full" });
    return { ok: true, productId: FULL_PRODUCT_ID };
  } catch (err) {
    const kind = purchaseFailureKind(err);
    if (kind === "sheet") {
      try {
        if (ownsFullProduct(await fetchPurchases())) {
          setUnlocked(true);
          setUnlockSource("full");
          setAccessInfo({ via: "full" });
          return { ok: true, productId: FULL_PRODUCT_ID };
        }
      } catch { /* Abbruch-Text, die Freischaltung bleibt wie sie ist */ }
      return { ok: false, reason: "cancel", productId: FULL_PRODUCT_ID };
    }
    if (kind === "cancel") return { ok: false, reason: "cancel", productId: FULL_PRODUCT_ID };
    if (kind === "pending") return { ok: false, reason: "pending", productId: FULL_PRODUCT_ID };
    return { ok: false, reason: "error", productId: FULL_PRODUCT_ID };
  }
}

// Jahresabo kaufen (nur iOS). Das Kaufblatt von Apple zeigt Preis, Testphase und Verlängerung.
export async function buyYearly() {
  if (!iosApp()) {
    return { ok: false, reason: "not-native", productId: SUB_PRODUCT_ID };
  }
  try {
    const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
    const support = await NativePurchases.isBillingSupported();
    if (!support?.isBillingSupported) {
      return { ok: false, reason: "unavailable", productId: SUB_PRODUCT_ID };
    }
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: SUB_PRODUCT_ID,
      productType: PURCHASE_TYPE.SUBS,
      quantity: 1,
      isConsumable: false,
    });
    if (!transactionGrantsSub(tx)) {
      // Die Antwort ist nicht eindeutig: im Store nachsehen, bevor wir „nicht geklappt“ sagen.
      try {
        const list = await fetchPurchases();
        const res = entitlementFromPurchases(list);
        if (res.owned) { setUnlocked(true); setUnlockSource(res.via); setAccessInfo(entitlementDetail(list)); return { ok: true, productId: SUB_PRODUCT_ID }; }
      } catch { /* Fehler-Text */ }
      return { ok: false, reason: "error", productId: SUB_PRODUCT_ID };
    }
    setUnlocked(true);
    setUnlockSource("sub");
    setAccessInfo(entitlementDetail([tx]) || { via: "sub", until: null, willCancel: null, state: "", trial: false });
    return { ok: true, productId: SUB_PRODUCT_ID };
  } catch (err) {
    const kind = purchaseFailureKind(err);
    if (kind === "cancel" || kind === "sheet") return { ok: false, reason: "cancel", productId: SUB_PRODUCT_ID };
    if (kind === "pending") return { ok: false, reason: "pending", productId: SUB_PRODUCT_ID };
    return { ok: false, reason: "error", productId: SUB_PRODUCT_ID };
  }
}

// Apple-ID-Einstellungen für Abos (kündigen, ändern). Nur iOS.
export async function openManageSubscriptions() {
  if (!iosApp()) return false;
  try {
    const { NativePurchases } = await loadPlugin();
    await NativePurchases.manageSubscriptions();
    return true;
  } catch {
    return false;
  }
}

// „Kauf wiederherstellen“: Vollversion und Jahresabo.
export async function restoreFullVersion() {
  if (!nativeApp()) {
    return { ok: false, reason: "not-native", productId: FULL_PRODUCT_ID };
  }
  try {
    const { NativePurchases } = await loadPlugin();
    await NativePurchases.restorePurchases();
    const list = await fetchPurchases();
    const res = entitlementFromPurchases(list);
    if (res.owned) {
      setUnlocked(true);
      setUnlockSource(res.via);
      setAccessInfo(entitlementDetail(list));
      return { ok: true, productId: FULL_PRODUCT_ID };
    }
    if (!TESTER_UNLOCK) setUnlocked(false);
    return { ok: false, reason: "none", productId: FULL_PRODUCT_ID };
  } catch (err) {
    const kind = purchaseFailureKind(err);
    return {
      ok: false,
      reason: kind === "cancel" || kind === "sheet" ? "cancel" : "error",
      productId: FULL_PRODUCT_ID,
    };
  }
}
