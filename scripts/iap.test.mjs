import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FULL_PRODUCT_ID } from "../src/lib/demo.js";
import {
  buyFullVersion, loadStorePrice, ownsFullProduct, priceFromProducts, purchaseFailureKind, restoreFullVersion, transactionGrantsFull,
} from "../src/lib/iap.js";
import { EN2 } from "../src/lib/en2.js";
import { deploymentTargetFromPodspec, ensureBillingPermission, ensureIos15, ensureIosVersion } from "./storeNative.mjs";

const id = FULL_PRODUCT_ID;

test("Preis aus dem Store, sonst kein Text", () => {
  assert.equal(priceFromProducts([{ identifier: id, priceString: "12,99 €" }]), "12,99 €");
  assert.equal(priceFromProducts([{ identifier: "other", priceString: "€12.99" }]), "€12.99");
  assert.equal(priceFromProducts([{ identifier: id, priceString: "  €12.99  " }]), "€12.99");
  assert.equal(priceFromProducts([]), null);
  assert.equal(priceFromProducts([{ identifier: id, priceString: "  " }]), null);
  assert.equal(priceFromProducts(null), null);
  // Zahl nicht als Dollar formatieren. localizedPrice gilt, wenn priceString fehlt.
  assert.equal(priceFromProducts([{ identifier: id, price: 11.99, currencyCode: "USD" }]), null);
  assert.equal(priceFromProducts([{ identifier: id, price: 12.99, currencyCode: "EUR", localizedPrice: "12,99 €" }]), "12,99 €");
  assert.equal(priceFromProducts([{ identifier: id, priceString: "12,99 €", price: 11.99, currencyCode: "USD" }]), "12,99 €");
  // TestFlight: US-String bei deutschem Storefront verwerfen, echten Store-String behalten.
  const usd = { identifier: id, priceString: "$11.99", price: 11.99, currencyCode: "USD" };
  assert.equal(priceFromProducts([usd], { countryCode: "DEU" }), null);
  assert.equal(priceFromProducts([usd], { countryCode: "DE" }), null);
  assert.equal(priceFromProducts([usd], { countryCode: "USA" }), "$11.99");
  assert.equal(priceFromProducts([usd], { countryCode: "US" }), "$11.99");
  assert.equal(priceFromProducts([usd]), "$11.99");
  assert.equal(priceFromProducts([{ ...usd, localizedPrice: "12,99 €" }], { countryCode: "DEU" }), "12,99 €");
  assert.equal(priceFromProducts([{ identifier: id, priceString: "12,99 €", currencyCode: "EUR" }], { countryCode: "DEU" }), "12,99 €");
});

test("Vollversion nur bei passender, nicht widerrufener Transaktion", () => {
  assert.equal(ownsFullProduct([{ productIdentifier: id }]), true);
  assert.equal(ownsFullProduct([{ productIdentifier: id, purchaseState: "1" }]), true);
  assert.equal(ownsFullProduct([{ productIdentifier: id, purchaseState: "PURCHASED" }]), true);
  assert.equal(ownsFullProduct([{ productIdentifier: id, purchaseState: "2" }]), false);
  assert.equal(ownsFullProduct([{ productIdentifier: id, revocationDate: "2026-10-01T00:00:00Z" }]), false);
  assert.equal(ownsFullProduct([{ productIdentifier: "de.schlagfertig.app.full" }]), false);
  assert.equal(ownsFullProduct(null), false);
  assert.equal(transactionGrantsFull({ productIdentifier: id, transactionId: "1" }), true);
  assert.equal(transactionGrantsFull({ transactionId: "1" }), true);
  assert.equal(transactionGrantsFull({ productIdentifier: "other", transactionId: "1" }), false);
  assert.equal(transactionGrantsFull({}), false);
  assert.equal(transactionGrantsFull(null), false);
});

test("Abbruch und Fehler auseinanderhalten", () => {
  assert.equal(purchaseFailureKind({ message: "User cancelled" }), "cancel");
  assert.equal(purchaseFailureKind(new Error("User canceled the purchase")), "cancel");
  assert.equal(purchaseFailureKind({ message: "Purchase is not purchased" }), "sheet");
  assert.equal(purchaseFailureKind({ message: "Product not found" }), "error");
  assert.equal(purchaseFailureKind({ message: "Purchase is pending" }), "error");
});

test("Ohne native Hülle kein Kauf und kein Store-Preis", async () => {
  assert.deepEqual(await buyFullVersion(), { ok: false, reason: "not-native", productId: id });
  assert.deepEqual(await restoreFullVersion(), { ok: false, reason: "not-native", productId: id });
  assert.equal(await loadStorePrice(), null);
});

test("Kauf-Blatt: Wiederherstellen nur im Store, Texte DE/EN", () => {
  const sheet = readFileSync(new URL("../src/lib/Paywall.jsx", import.meta.url), "utf8");
  assert.match(sheet, /DEMO_ON \? \(/);
  assert.match(sheet, /fallbackPrice\(getLang\(\)\)/);
  assert.doesNotMatch(sheet, /\$11\.99/);
  assert.match(sheet, /Kauf wiederherstellen/);
  assert.equal(sheet.split("Kauf geht nur in der Store-App.").length - 1, 1);
  assert.match(sheet, /reason === "not-native"\) return "Wiederherstellen geht nur in der Store-App\."/);
  assert.match(sheet, /Kauf abgebrochen\./);
  assert.match(sheet, /Kauf hat nicht geklappt\. Bitte nochmal versuchen\./);
  assert.match(sheet, /Kein Kauf zum Wiederherstellen\./);
  assert.match(sheet, /Wiederherstellen hat nicht geklappt\. Bitte nochmal versuchen\./);
  assert.equal(EN2["Wiederherstellen geht nur in der Store-App."], "Restore only works in the store app.");
  assert.equal(EN2["Kauf wiederherstellen"], "Restore purchase");
  assert.equal(EN2["Kauf abgebrochen."], "Purchase cancelled.");
  assert.equal(EN2["Kauf hat nicht geklappt. Bitte nochmal versuchen."], "The purchase didn't go through. Please try again.");
  assert.equal(EN2["Kein Kauf zum Wiederherstellen."], "No purchase to restore.");
  assert.equal(EN2["Wiederherstellen hat nicht geklappt. Bitte nochmal versuchen."], "Restore didn't work. Please try again.");
  const joined = [
    EN2["Kauf wiederherstellen"],
    EN2["Wiederherstellen geht nur in der Store-App."],
    EN2["Kauf abgebrochen."],
    EN2["Kauf hat nicht geklappt. Bitte nochmal versuchen."],
    EN2["Kein Kauf zum Wiederherstellen."],
    EN2["Wiederherstellen hat nicht geklappt. Bitte nochmal versuchen."],
  ].join(" ");
  assert.doesNotMatch(joined, /\bcanceled\b/);
  assert.doesNotMatch(joined, /\bpractice\b/i);
});

test("Play Billing und iOS 15 für das erzeugte native Projekt", () => {
  const xml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application />\n</manifest>\n`;
  const withPerm = ensureBillingPermission(xml);
  assert.match(withPerm, /com\.android\.vending\.BILLING/);
  assert.equal(ensureBillingPermission(withPerm), withPerm);
  assert.equal(ensureIos15("platform :ios, '14.0'\n"), "platform :ios, '15.0'\n");
  assert.equal(ensureIos15("platform :ios, '15.0'\n"), "platform :ios, '15.0'\n");
  assert.equal(ensureIos15('platform :ios, "14.0"\n'), "platform :ios, '15.0'\n");
  assert.equal(
    ensureIos15("IPHONEOS_DEPLOYMENT_TARGET = 14.0;\nIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n"),
    "IPHONEOS_DEPLOYMENT_TARGET = 15.0;\nIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n",
  );
  const workflow = readFileSync(new URL("../.github/workflows/android-aab.yml", import.meta.url), "utf8");
  assert.match(workflow, /storeNative\.mjs android/);
  const spec = "s.ios.deployment_target = '15.0'\n";
  assert.equal(deploymentTargetFromPodspec(spec), "15.0");
  assert.equal(ensureIosVersion("platform :ios, '14.0'\n", "15.0"), "platform :ios, '15.0'\n");
  assert.equal(
    ensureIosVersion("IPHONEOS_DEPLOYMENT_TARGET = 13.0;\nIPHONEOS_DEPLOYMENT_TARGET = 16.0;\n", "15.0"),
    "IPHONEOS_DEPLOYMENT_TARGET = 15.0;\nIPHONEOS_DEPLOYMENT_TARGET = 16.0;\n",
  );
  const iosWorkflow = readFileSync(new URL("../.github/workflows/ios-testflight.yml", import.meta.url), "utf8");
  assert.doesNotMatch(iosWorkflow, /--no-package-lock/);
  assert.match(iosWorkflow, /applyIosDeploymentTarget/);
  assert.match(iosWorkflow, /mv dist dist\.keep/);
  const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  assert.match(pkg, /"@capgo\/native-purchases": "7\.19\.3"/);
});
