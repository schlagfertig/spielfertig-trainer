// Einmal-Kauf der Vollversion über @capgo/native-purchases (Capacitor 7).
// iOS: StoreKit 2. Android: Play Billing, dieselbe Produkt-ID, nicht verbrauchbar.
// Das Plugin wird nur in der nativen Hülle geladen. Web und Tests rufen es nicht auf.

import { FULL_PRODUCT_ID, TESTER_UNLOCK, nativeApp, setUnlocked } from "./demo.js";

let pluginPromise = null;
let pricePromise = null;

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

export function priceFromProducts(products) {
  const list = Array.isArray(products) ? products : [];
  const hit = list.find((p) => p && p.identifier === FULL_PRODUCT_ID) || list[0];
  const raw = hit && typeof hit.priceString === "string" ? hit.priceString.trim() : "";
  return raw || null;
}

async function fetchPurchases() {
  const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP,
  });
  return Array.isArray(purchases) ? purchases : [];
}

async function readStorePrice() {
  const { NativePurchases, PURCHASE_TYPE } = await loadPlugin();
  const support = await NativePurchases.isBillingSupported();
  if (!support?.isBillingSupported) return null;
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [FULL_PRODUCT_ID],
    productType: PURCHASE_TYPE.INAPP,
  });
  return priceFromProducts(products);
}

// Lokalisierter Preis aus dem Store, z. B. "12,99 €" oder "€12.99". null = Fallback.
export function loadStorePrice() {
  if (!nativeApp()) return Promise.resolve(null);
  if (!pricePromise) {
    pricePromise = readStorePrice().then((price) => {
      if (!price) pricePromise = null;
      return price;
    }, () => {
      pricePromise = null;
      return null;
    });
  }
  return pricePromise;
}

// Beim Start der nativen App. Fehlschlag (offline, Produkt fehlt) lässt die
// gemerkte Freischaltung stehen. Tester-Code wird nicht wieder zugesperrt.
export async function refreshEntitlement() {
  if (!nativeApp()) return { checked: false, reason: "not-native" };
  try {
    const owned = ownsFullProduct(await fetchPurchases());
    if (owned) setUnlocked(true);
    else if (!TESTER_UNLOCK) setUnlocked(false);
    return { checked: true, owned };
  } catch {
    return { checked: false, reason: "error" };
  }
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
    return { ok: true, productId: FULL_PRODUCT_ID };
  } catch (err) {
    const kind = purchaseFailureKind(err);
    if (kind === "sheet") {
      try {
        if (ownsFullProduct(await fetchPurchases())) {
          setUnlocked(true);
          return { ok: true, productId: FULL_PRODUCT_ID };
        }
      } catch { /* Abbruch-Text, die Freischaltung bleibt wie sie ist */ }
      return { ok: false, reason: "cancel", productId: FULL_PRODUCT_ID };
    }
    if (kind === "cancel") return { ok: false, reason: "cancel", productId: FULL_PRODUCT_ID };
    return { ok: false, reason: "error", productId: FULL_PRODUCT_ID };
  }
}

export async function restoreFullVersion() {
  if (!nativeApp()) {
    return { ok: false, reason: "not-native", productId: FULL_PRODUCT_ID };
  }
  try {
    const { NativePurchases } = await loadPlugin();
    await NativePurchases.restorePurchases();
    if (ownsFullProduct(await fetchPurchases())) {
      setUnlocked(true);
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
