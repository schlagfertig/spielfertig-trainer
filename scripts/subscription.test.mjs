import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EULA_URL, FULL_PRODUCT_ID, SUB_PRODUCT_ID, iosApp, nativeApp } from "../src/lib/demo.js";
import {
  buyYearly, entitlementFromPurchases, openManageSubscriptions, ownsActiveSubscription, priceFromProducts,
  refreshEntitlement, subscriptionActive, subscriptionUntil, transactionGrantsSub, watchEntitlement,
} from "../src/lib/iap.js";
import { periodLabel, perPeriod, readFreeTrial, readPeriod, subscriptionOffer } from "../src/lib/subscriptionText.js";
import { EN2 } from "../src/lib/en2.js";

const NOW = Date.parse("2026-11-17T12:00:00Z");
const FUTURE = "2027-11-17T12:00:00Z";
const PAST = "2026-11-10T12:00:00Z";
const full = { productIdentifier: FULL_PRODUCT_ID, transactionId: "1" };
const sub = (extra = {}) => ({ productIdentifier: SUB_PRODUCT_ID, transactionId: "2", expirationDate: FUTURE, isActive: true, ...extra });

test("Produkt-IDs", () => {
  assert.equal(SUB_PRODUCT_ID, "de.schlagfertig.control.yearly");
  assert.equal(FULL_PRODUCT_ID, "de.schlagfertig.control.full");
  assert.equal(EULA_URL, "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
});

test("Freischaltung: Vollversion ODER aktives Abo", () => {
  assert.deepEqual(entitlementFromPurchases([full], NOW), { owned: true, via: "full", until: null });
  const s = entitlementFromPurchases([sub()], NOW);
  assert.equal(s.owned, true);
  assert.equal(s.via, "sub");
  assert.equal(s.until, Date.parse(FUTURE));
  // beides: Vollversion hat Vorrang
  assert.equal(entitlementFromPurchases([sub(), full], NOW).via, "full");
  // nichts, leer, kaputt
  assert.deepEqual(entitlementFromPurchases([], NOW), { owned: false, via: null, until: null });
  assert.equal(entitlementFromPurchases(null, NOW).owned, false);
  assert.equal(entitlementFromPurchases([null, {}, "x"], NOW).owned, false);
  assert.equal(entitlementFromPurchases([{ productIdentifier: "other", isActive: true }], NOW).owned, false);
});

test("Abo: abgelaufen, widerrufen, Kulanzzeit, ohne Angaben", () => {
  // StoreKit liefert auch alte Verlängerungen: abgelaufen zählt nicht
  assert.equal(subscriptionActive(sub({ isActive: false, expirationDate: PAST }), NOW), false);
  assert.equal(subscriptionActive(sub({ isActive: undefined, expirationDate: PAST }), NOW), false);
  assert.equal(subscriptionActive(sub({ isActive: undefined, expirationDate: FUTURE }), NOW), true);
  // alte abgelaufene Transaktion + neue aktive: aktiv
  assert.equal(ownsActiveSubscription([sub({ isActive: false, expirationDate: PAST }), sub({ transactionId: "3" })], NOW), true);
  // widerrufen / erstattet
  assert.equal(subscriptionActive(sub({ revocationDate: "2026-11-16T00:00:00Z" }), NOW), false);
  assert.equal(subscriptionActive(sub({ subscriptionState: "revoked" }), NOW), false);
  // Kulanzzeit (Zahlungsproblem): Zugang bleibt
  assert.equal(subscriptionActive(sub({ isActive: false, expirationDate: PAST, subscriptionState: "inGracePeriod" }), NOW), true);
  // Abo gekündigt, läuft aber noch: bleibt offen bis zum Ende
  assert.equal(subscriptionActive(sub({ willCancel: true }), NOW), true);
  // Billing-Retry ohne Kulanzzeit: zu
  assert.equal(subscriptionActive(sub({ isActive: false, expirationDate: PAST, subscriptionState: "inBillingRetryPeriod" }), NOW), false);
  // keine Angabe zum Ablauf: nichts freischalten
  assert.equal(subscriptionActive({ productIdentifier: SUB_PRODUCT_ID, transactionId: "9" }, NOW), false);
  // Android-ähnlicher Zustand "offen"
  assert.equal(subscriptionActive(sub({ purchaseState: "2" }), NOW), false);
  // Ablauf genau jetzt zählt nicht mehr
  assert.equal(subscriptionActive(sub({ isActive: undefined, expirationDate: new Date(NOW).toISOString() }), NOW), false);
});

test("Abo: spätestes Ablaufdatum", () => {
  const a = sub({ expirationDate: "2027-01-01T00:00:00Z" });
  const b = sub({ expirationDate: "2027-06-01T00:00:00Z", transactionId: "5" });
  assert.equal(subscriptionUntil([a, b], NOW), Date.parse("2027-06-01T00:00:00Z"));
  assert.equal(subscriptionUntil([], NOW), null);
  assert.equal(subscriptionUntil(null, NOW), null);
});

test("Kauf-Antwort des Abos", () => {
  assert.equal(transactionGrantsSub(sub(), NOW), true);
  assert.equal(transactionGrantsSub(sub({ isActive: false, expirationDate: PAST }), NOW), false);
  assert.equal(transactionGrantsSub({ productIdentifier: FULL_PRODUCT_ID, transactionId: "1" }, NOW), false);
  assert.equal(transactionGrantsSub(null, NOW), false);
  assert.equal(transactionGrantsSub({}, NOW), false);
});

test("Preise: Abo getrennt von der Vollversion", () => {
  const products = [
    { identifier: SUB_PRODUCT_ID, priceString: "4,99 €" },
    { identifier: FULL_PRODUCT_ID, priceString: "12,99 €" },
  ];
  assert.equal(priceFromProducts(products), "12,99 €");
  assert.equal(priceFromProducts(products, null, SUB_PRODUCT_ID), "4,99 €");
  // nur das Abo geladen: die Vollversion nimmt nicht den Abo-Preis
  assert.equal(priceFromProducts([products[0]]), null);
  // nur die Vollversion geladen: das Abo hat keinen Preis
  assert.equal(priceFromProducts([products[1]], null, SUB_PRODUCT_ID), null);
  // Dollar auf deutschem Storefront verwerfen
  assert.equal(priceFromProducts([{ identifier: SUB_PRODUCT_ID, priceString: "$4.99" }], { countryCode: "DE" }, SUB_PRODUCT_ID), null);
});

const yearly = {
  identifier: SUB_PRODUCT_ID,
  priceString: "4,99 €",
  price: 4.99,
  subscriptionPeriod: { numberOfUnits: 1, unit: 3 },
  introductoryPrice: { price: 0, priceString: "0,00 €", paymentMode: 2, numberOfPeriods: 1, subscriptionPeriod: { numberOfUnits: 2, unit: 1 } },
};

test("Abo-Texte kommen aus dem Store-Produkt (DE)", () => {
  const o = subscriptionOffer(yearly, "de");
  assert.equal(o.loaded, true);
  assert.equal(o.price, "4,99 €");
  assert.equal(o.priceLine, "4,99 € pro Jahr");
  assert.equal(o.trial, true);
  assert.equal(o.trialLine, "14 Tage gratis, danach 4,99 € pro Jahr");
  assert.equal(o.buyLabel, "Gratis testen");
});

test("Abo-Texte (EN, British)", () => {
  const o = subscriptionOffer(yearly, "en");
  assert.equal(o.priceLine, "4,99 € per year");
  assert.equal(o.trialLine, "14 days free, then 4,99 € per year");
  assert.equal(o.buyLabel, "Try free");
});

test("Abo-Texte folgen dem Produkt, nichts ist fest", () => {
  const p = { ...yearly, priceString: "5,99 €", introductoryPrice: { ...yearly.introductoryPrice, subscriptionPeriod: { numberOfUnits: 7, unit: 0 } } };
  assert.equal(subscriptionOffer(p, "de").trialLine, "7 Tage gratis, danach 5,99 € pro Jahr");
  const m = { ...yearly, subscriptionPeriod: { numberOfUnits: 1, unit: 2 }, introductoryPrice: { ...yearly.introductoryPrice, subscriptionPeriod: { numberOfUnits: 1, unit: 2 } } };
  assert.equal(subscriptionOffer(m, "de").trialLine, "1 Monat gratis, danach 4,99 € pro Monat");
  assert.equal(subscriptionOffer(m, "en").trialLine, "1 month free, then 4,99 € per month");
  // unitString statt Zahl (neueres Plugin)
  assert.deepEqual(readPeriod({ numberOfUnits: 2, unitString: "Week" }), { n: 2, unit: "week" });
  assert.equal(periodLabel({ n: 2, unit: "week" }, "de"), "14 Tage");
  assert.equal(periodLabel({ n: 1, unit: "week" }, "de"), "1 Woche");
  assert.equal(perPeriod({ n: 2, unit: "year" }, "de"), "alle 2 Jahre");
  // Preisangabe vom Store hat Vorrang vor product.priceString (z. B. Dollar-Filter)
  assert.equal(subscriptionOffer({ ...yearly, priceString: "$4.99" }, "de", "4,99 €").price, "4,99 €");
});

test("Abo-Texte: Plugin liefert keine Testphase oder Dauer", () => {
  // Plugin 7.19.3 auf iOS: nur Preis. Keine erfundene Testphase.
  const o = subscriptionOffer({ identifier: SUB_PRODUCT_ID, priceString: "4,99 €", price: 4.99 }, "de");
  assert.equal(o.loaded, true);
  assert.equal(o.trial, false);
  assert.equal(o.priceLine, "4,99 € pro Jahr");
  assert.doesNotMatch(o.trialLine, /\d/);
  assert.match(o.trialLine, /Apple/);
  assert.equal(o.buyLabel, "Abonnieren");
  // Einführungspreis ist nicht gratis: keine Gratis-Behauptung
  assert.equal(readFreeTrial({ introductoryPrice: { price: 1.99, subscriptionPeriod: { numberOfUnits: 1, unit: 2 } } }, "de"), null);
  assert.equal(readFreeTrial({ introductoryPrice: null }, "de"), null);
  assert.equal(readFreeTrial(null, "de"), null);
});

test("Abo-Texte: Produkt nicht geladen", () => {
  for (const lang of ["de", "en"]) {
    const o = subscriptionOffer(null, lang);
    assert.equal(o.loaded, false);
    assert.equal(o.price, "");
    assert.equal(o.trial, false);
    assert.ok(o.priceLine.length > 10);
    assert.ok(o.trialLine.length > 10);
    assert.doesNotMatch(o.priceLine + o.trialLine, /\d/, "keine Zahl aus dem Nichts");
  }
  assert.equal(subscriptionOffer({ identifier: SUB_PRODUCT_ID, priceString: "  " }, "de").loaded, false);
});

test("Ohne native Hülle: kein Abo-Kauf, keine Prüfung, kein Watcher", async () => {
  assert.equal(nativeApp(), false);
  assert.equal(iosApp(), false);
  assert.deepEqual(await buyYearly(), { ok: false, reason: "not-native", productId: SUB_PRODUCT_ID });
  assert.deepEqual(await refreshEntitlement(), { checked: false, reason: "not-native" });
  assert.deepEqual(await refreshEntitlement({ resume: true }), { checked: false, reason: "not-native" });
  assert.equal(await openManageSubscriptions(), false);
  const stop = watchEntitlement(() => {});
  assert.equal(typeof stop, "function");
  stop();
});

test("Verdrahtung: Transaktions-Event, resume, Produkt-ID, kein Festtext", () => {
  const iap = readFileSync(new URL("../src/lib/iap.js", import.meta.url), "utf8");
  assert.match(iap, /addListener\("transactionUpdated"/);
  assert.match(iap, /addListener\("resume"/);
  assert.match(iap, /visibilitychange/);
  assert.match(iap, /PURCHASE_TYPE\.SUBS/);
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /watchEntitlement\(/);
  assert.equal(app.split("<DemoPaywall").length - 1, 2);
  assert.equal(app.split("sub={storeSub.product}").length - 1, 3);
  assert.match(app, /<Access[\s\S]*sub=\{storeSub\.product\}/);
  // Die Produkt-ID des Abos steht nur in demo.js
  const src = ["../src/lib/iap.js", "../src/lib/Paywall.jsx", "../src/lib/subscriptionText.js", "../src/App.jsx"];
  for (const f of src) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), "utf8"), /control\.yearly/);
  // Der Abo-Preis und die Testdauer sind nirgends fest eingebaut
  const paywall = readFileSync(new URL("../src/lib/Paywall.jsx", import.meta.url), "utf8");
  const text = readFileSync(new URL("../src/lib/subscriptionText.js", import.meta.url), "utf8");
  const noComments = (code) => code.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");
  for (const code of [paywall, text]) {
    assert.doesNotMatch(noComments(code), /4,99|4\.99|14 Tage|14 days/);
  }
  // Das Kauf-Blatt verlinkt EULA und Datenschutz und hat „Kauf wiederherstellen“
  assert.match(paywall, /EULA_URL/);
  assert.match(paywall, /onOpenLegal\?\.\("datenschutz"\)/);
  assert.match(paywall, /Kauf wiederherstellen/);
});

test("Englisch: alle Texte der Kaufseite übersetzt", () => {
  const paywall = readFileSync(new URL("../src/lib/Paywall.jsx", import.meta.url), "utf8");
  const keys = [...paywall.matchAll(/\bt\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(keys.length > 10);
  const en = { ...EN2 };
  const missing = keys.filter((k) => !(k in en) && !readFileSync(new URL("../src/lib/en.js", import.meta.url), "utf8").includes(`"${k}"`));
  assert.deepEqual(missing, []);
});
