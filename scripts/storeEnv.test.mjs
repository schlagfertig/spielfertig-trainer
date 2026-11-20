// Sandbox/TestFlight-Erkennung und Tester-Schalter „Vollversion ignorieren“.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSandboxStore, isTestIgnoreFullActive, refreshSandboxStore, setSandboxStoreForTests,
  setTestIgnoreFullPref, showTestIgnoreSwitch, storeEnvironmentIsSandbox, testIgnoreFullPref,
} from "../src/lib/storeEnv.js";
import { entitlementFromPurchases } from "../src/lib/iap.js";
import { FULL_PRODUCT_ID, SUB_PRODUCT_ID } from "../src/lib/demo.js";

if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
}

const NOW = Date.parse("2026-11-18T10:00:00Z");
const full = { productIdentifier: FULL_PRODUCT_ID, transactionId: "f" };
const sub = {
  transactionId: "1",
  productIdentifier: SUB_PRODUCT_ID,
  expirationDate: "2027-11-18T10:00:00Z",
  isActive: true,
  subscriptionState: "subscribed",
};

function reset() {
  setSandboxStoreForTests(false);
  setTestIgnoreFullPref(false);
}

test("Sandbox nur bei environment Sandbox oder Receipt sandboxReceipt, nicht Produktion oder Xcode", () => {
  assert.equal(storeEnvironmentIsSandbox({ environment: "Sandbox" }), true);
  assert.equal(storeEnvironmentIsSandbox({ environment: "sandbox" }), true);
  assert.equal(storeEnvironmentIsSandbox({ sandbox: true }), true);
  assert.equal(storeEnvironmentIsSandbox({ receiptSandbox: true }), true);
  assert.equal(storeEnvironmentIsSandbox({ receiptUrl: "file:///private/var/receipt/sandboxReceipt" }), true);
  assert.equal(storeEnvironmentIsSandbox({ receipt: "/foo/sandboxReceipt" }), true);
  assert.equal(storeEnvironmentIsSandbox({ environment: "Production" }), false);
  assert.equal(storeEnvironmentIsSandbox({ environment: "Xcode" }), false);
  assert.equal(storeEnvironmentIsSandbox({ environment: "unknown" }), false);
  assert.equal(storeEnvironmentIsSandbox(null), false);
  assert.equal(storeEnvironmentIsSandbox({ receiptUrl: "file:///receipt" }), false);
});

test("Schalter und Ignorieren nur in erkannter Sandbox; gesetzte Vorliebe gilt nicht in Produktion", () => {
  reset();
  setTestIgnoreFullPref(true);
  assert.equal(testIgnoreFullPref(), true);
  assert.equal(isSandboxStore(), false);
  assert.equal(showTestIgnoreSwitch(), false);
  assert.equal(isTestIgnoreFullActive(), false);
  setSandboxStoreForTests(true);
  assert.equal(showTestIgnoreSwitch(), true);
  assert.equal(isTestIgnoreFullActive(), true);
  setTestIgnoreFullPref(false);
  assert.equal(showTestIgnoreSwitch(), true);
  assert.equal(isTestIgnoreFullActive(), false);
  reset();
});

test("Ohne iOS-native Hülle ist refreshSandboxStore nie Sandbox (Web)", async () => {
  globalThis.window = globalThis.window || {};
  delete globalThis.window.Capacitor;
  setSandboxStoreForTests(true);
  setTestIgnoreFullPref(true);
  assert.equal(await refreshSandboxStore(), false);
  assert.equal(isSandboxStore(), false);
  assert.equal(showTestIgnoreSwitch(), false);
  assert.equal(isTestIgnoreFullActive(), false);
  reset();
});

test("Ignorieren betrifft nur de.schlagfertig.control.full; Abo zählt weiter", () => {
  reset();
  setTestIgnoreFullPref(true);
  assert.deepEqual(entitlementFromPurchases([full], NOW), { owned: true, via: "full", until: null });
  setSandboxStoreForTests(true);
  assert.deepEqual(entitlementFromPurchases([full], NOW), { owned: false, via: null, until: null });
  const both = entitlementFromPurchases([full, sub], NOW);
  assert.equal(both.owned, true);
  assert.equal(both.via, "sub");
  assert.equal(entitlementFromPurchases([sub], NOW).via, "sub");
  setSandboxStoreForTests(false);
  assert.equal(entitlementFromPurchases([full], NOW).via, "full");
  reset();
});

test("Schalter nur auf Mein Zugang, Erkennung nur nativ, niemals per URL-Flag", () => {
  const access = readFileSync(new URL("../src/lib/Access.jsx", import.meta.url), "utf8");
  const env = readFileSync(new URL("../src/lib/storeEnv.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(access, /showTestIgnoreSwitch\(\)/);
  assert.match(access, /Testmodus: Vollversion ignorieren/);
  assert.match(access, /Nur ein TestFlight-Testmodus\. An Apple wird nichts gelöscht\./);
  assert.doesNotMatch(app, /showTestIgnoreSwitch/);
  assert.match(env, /getStoreEnvironment/);
  assert.match(env, /getAppTransaction/);
  assert.doesNotMatch(env, /searchParams|location\.hash|sf-test-sandbox|__SF_SANDBOX__/);
  const en2 = readFileSync(new URL("../src/lib/en2.js", import.meta.url), "utf8");
  assert.match(en2, /"Test mode: ignore full version"/);
  assert.match(en2, /TestFlight test mode and deletes nothing at Apple/);
});
