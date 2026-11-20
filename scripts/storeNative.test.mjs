import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  ensurePlistString,
  ensureIosMediaUsageDescriptions,
  IOS_CAMERA_USAGE_DE,
  IOS_MICROPHONE_USAGE_DE,
} from "./storeNative.mjs";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>Schlagfertig</string>
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
</dict>
</plist>
`;

test("ensurePlistString fügt fehlenden Key ein und ersetzt vorhandenen", () => {
  const added = ensurePlistString(SAMPLE, "NSCameraUsageDescription", "hallo & welt");
  assert.match(added, /<key>NSCameraUsageDescription<\/key>\s*<string>hallo &amp; welt<\/string>/);
  assert.match(added, /ITSAppUsesNonExemptEncryption/);
  const replaced = ensurePlistString(added, "NSCameraUsageDescription", "neu");
  assert.match(replaced, /<string>neu<\/string>/);
  assert.equal((replaced.match(/NSCameraUsageDescription/g) || []).length, 1);
});

test("ensureIosMediaUsageDescriptions setzt Kamera- und Mikrofon-Text", () => {
  const out = ensureIosMediaUsageDescriptions(SAMPLE);
  assert.match(out, new RegExp(`NSCameraUsageDescription[\\s\\S]*${IOS_CAMERA_USAGE_DE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(out, new RegExp(`NSMicrophoneUsageDescription[\\s\\S]*${IOS_MICROPHONE_USAGE_DE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

import { SUB_INFO_MARKER, applyNativePurchasesSubscriptionInfo, ensureSubscriptionInfo } from "./storeNative.mjs";

test("Plugin-Patch: Abo-Dauer und Testphase im Produkt (idempotent, Anker geprüft)", (t) => {
  const swiftPath = new URL("../node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/Product+CapacitorPurchasesPlugin.swift", import.meta.url);
  if (!existsSync(swiftPath)) return t.skip("npm install fehlt");
  const original = readFileSync(swiftPath, "utf8");
  const once = ensureSubscriptionInfo(original);
  assert.ok(once.includes(SUB_INFO_MARKER));
  assert.match(once, /var product: \[String: Any\] = \[/);
  assert.match(once, /product\["subscriptionPeriod"\]/);
  assert.match(once, /product\["introductoryPrice"\]/);
  assert.match(once, /return product\n/);
  assert.doesNotMatch(once, /return \[\n\s+"identifier"/);
  assert.equal(ensureSubscriptionInfo(once), once);
  assert.equal(ensureSubscriptionInfo("kein Swift"), null);
  assert.equal(ensureSubscriptionInfo(""), null);
  // Klammern bleiben ausgeglichen
  const count = (t, c) => t.split(c).length - 1;
  assert.equal(count(once, "{"), count(once, "}"));
  assert.equal(count(once, "["), count(once, "]"));
  const workflow = readFileSync(new URL("../.github/workflows/ios-testflight.yml", import.meta.url), "utf8");
  assert.match(workflow, /applyNativePurchasesSubscriptionInfo/);
  assert.equal(typeof applyNativePurchasesSubscriptionInfo, "function");
});

import { STORE_ENV_MARKER, applyNativePurchasesStoreEnvironment, ensureStoreEnvironment } from "./storeNative.mjs";

test("Plugin-Patch: getStoreEnvironment (Sandbox/TestFlight, idempotent, Anker geprüft)", (t) => {
  const swiftPath = new URL("../node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift", import.meta.url);
  if (!existsSync(swiftPath)) return t.skip("npm install fehlt");
  const original = readFileSync(swiftPath, "utf8");
  const once = ensureStoreEnvironment(original);
  assert.ok(once.includes(STORE_ENV_MARKER));
  assert.match(once, /CAPPluginMethod\(name: "getStoreEnvironment"/);
  assert.match(once, /func getStoreEnvironment\(_ call: CAPPluginCall\)/);
  assert.match(once, /AppTransaction\.shared/);
  assert.match(once, /sandboxReceipt/);
  assert.match(once, /environmentString/);
  assert.equal(ensureStoreEnvironment(once), once);
  assert.equal(ensureStoreEnvironment("kein Swift"), null);
  assert.equal(ensureStoreEnvironment(""), null);
  const count = (s, c) => s.split(c).length - 1;
  assert.equal(count(once, "{"), count(once, "}"));
  assert.equal(count(once, "("), count(once, ")"));
  const workflow = readFileSync(new URL("../.github/workflows/ios-testflight.yml", import.meta.url), "utf8");
  assert.match(workflow, /applyNativePurchasesStoreEnvironment/);
  assert.equal(typeof applyNativePurchasesStoreEnvironment, "function");
});
