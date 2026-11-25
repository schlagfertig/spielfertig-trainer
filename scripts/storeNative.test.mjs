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

import {
  SCENE_LIFECYCLE_MARKER,
  SCENE_DELEGATE_SWIFT,
  ensureSceneManifest,
  ensureSceneAppDelegateHook,
  ensureSceneDelegateInPbxproj,
  applyIosSceneLifecycle,
} from "./storeNative.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync as read } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cap7Dir = mkdtempSync(join(tmpdir(), "cap7-ios-tpl-"));
execFileSync("tar", [
  "-xzf",
  fileURLToPath(new URL("../node_modules/@capacitor/cli/assets/ios-pods-template.tar.gz", import.meta.url)),
  "-C",
  cap7Dir,
]);
const CAP7_PLIST = read(join(cap7Dir, "App/App/Info.plist"), "utf8");
const CAP7_APPDELEGATE = read(join(cap7Dir, "App/App/AppDelegate.swift"), "utf8");
const CAP7_PBX = read(join(cap7Dir, "App/App.xcodeproj/project.pbxproj"), "utf8");

test("Capacitor-7-Template hat Main.storyboard, aber keinen UIScene-Lebenszyklus", () => {
  assert.match(CAP7_PLIST, /<key>UIMainStoryboardFile<\/key>\s*<string>Main<\/string>/);
  assert.match(CAP7_PLIST, /<key>UILaunchStoryboardName<\/key>\s*<string>LaunchScreen<\/string>/);
  assert.doesNotMatch(CAP7_PLIST, /UIApplicationSceneManifest/);
  assert.doesNotMatch(CAP7_APPDELEGATE, /configurationForConnecting|SceneDelegate/);
  assert.doesNotMatch(CAP7_PBX, /SceneDelegate\.swift/);
});

test("ensureSceneManifest setzt UIApplicationSceneManifest mit Main-Storyboard (idempotent)", () => {
  const once = ensureSceneManifest(CAP7_PLIST);
  assert.match(once, /<key>UIApplicationSceneManifest<\/key>/);
  assert.match(once, /<key>UISceneStoryboardFile<\/key>\s*<string>Main<\/string>/);
  assert.match(once, /<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>/);
  assert.match(once, /<key>UISceneConfigurationName<\/key>\s*<string>Default Configuration<\/string>/);
  assert.match(once, /<key>UIApplicationSupportsMultipleScenes<\/key>\s*<false\/>/);
  assert.match(once, /<key>UIMainStoryboardFile<\/key>\s*<string>Main<\/string>/);
  assert.equal((once.match(/UIApplicationSceneManifest/g) || []).length, 1);
  assert.equal(ensureSceneManifest(once), once);
  assert.equal(ensureSceneManifest("kein plist"), "kein plist");
});

test("ensureSceneAppDelegateHook hängt configurationForConnecting an (idempotent)", () => {
  const once = ensureSceneAppDelegateHook(CAP7_APPDELEGATE);
  assert.ok(once.includes(SCENE_LIFECYCLE_MARKER));
  assert.match(once, /configurationForConnecting/);
  assert.match(once, /config\.delegateClass = SceneDelegate\.self/);
  assert.match(once, /UISceneConfiguration\(name: "Default Configuration"/);
  assert.equal(ensureSceneAppDelegateHook(once), once);
  assert.equal(ensureSceneAppDelegateHook("kein Swift"), null);
  const count = (s, c) => s.split(c).length - 1;
  assert.equal(count(once, "{"), count(once, "}"));
  assert.equal(count(once, "("), count(once, ")"));
  assert.match(once, /ApplicationDelegateProxy\.shared/);
});

test("ensureSceneDelegateInPbxproj trägt SceneDelegate.swift ein (idempotent)", () => {
  const once = ensureSceneDelegateInPbxproj(CAP7_PBX);
  assert.match(once, /SceneDelegate\.swift in Sources/);
  assert.match(once, /5F5CE11EDE1E6A7E00000001 \/\* SceneDelegate\.swift \*\//);
  assert.match(once, /5F5CE11EDE1E6A7E00000002 \/\* SceneDelegate\.swift in Sources \*\//);
  assert.match(once, /path = SceneDelegate.swift;/);
  const hits = (once.match(/SceneDelegate\.swift/g) || []).length;
  assert.ok(hits >= 4, `SceneDelegate.swift sollte mehrfach im pbxproj stehen, war ${hits}`);
  assert.equal(ensureSceneDelegateInPbxproj(once), once);
  assert.equal((ensureSceneDelegateInPbxproj(once).match(/SceneDelegate\.swift/g) || []).length, hits);
  assert.equal(ensureSceneDelegateInPbxproj("leer"), null);
});

test("SCENE_DELEGATE_SWIFT nutzt das Storyboard-Fenster und reicht URLs an Capacitor 7 weiter", () => {
  assert.match(SCENE_DELEGATE_SWIFT, /class SceneDelegate: UIResponder, UIWindowSceneDelegate/);
  assert.match(SCENE_DELEGATE_SWIFT, /var window: UIWindow\?/);
  assert.doesNotMatch(SCENE_DELEGATE_SWIFT, /CAPBridgeViewController|SceneDelegateProxy/);
  assert.match(SCENE_DELEGATE_SWIFT, /ApplicationDelegateProxy\.shared\.application/);
  assert.match(SCENE_DELEGATE_SWIFT, /openURLContexts/);
  assert.match(SCENE_DELEGATE_SWIFT, /continue userActivity/);
  assert.ok(SCENE_DELEGATE_SWIFT.includes(SCENE_LIFECYCLE_MARKER));
});

test("applyIosSceneLifecycle schreibt Dateien im iOS-Projekt und der Workflow ruft sie auf", () => {
  const root = mkdtempSync(join(tmpdir(), "sf-uiscene-"));
  const appDir = join(root, "App");
  mkdirSync(appDir);
  mkdirSync(join(root, "App.xcodeproj"));
  const plistPath = join(appDir, "Info.plist");
  const appDelegatePath = join(appDir, "AppDelegate.swift");
  const sceneDelegatePath = join(appDir, "SceneDelegate.swift");
  const pbxprojPath = join(root, "App.xcodeproj", "project.pbxproj");
  writeFileSync(plistPath, CAP7_PLIST);
  writeFileSync(appDelegatePath, CAP7_APPDELEGATE);
  writeFileSync(pbxprojPath, CAP7_PBX);
  assert.equal(applyIosSceneLifecycle({ plistPath, appDelegatePath, sceneDelegatePath, pbxprojPath }), 0);
  assert.equal(applyIosSceneLifecycle({ plistPath, appDelegatePath, sceneDelegatePath, pbxprojPath }), 0);
  assert.match(read(plistPath, "utf8"), /UIApplicationSceneManifest/);
  assert.match(read(appDelegatePath, "utf8"), /configurationForConnecting/);
  assert.equal(read(sceneDelegatePath, "utf8"), SCENE_DELEGATE_SWIFT);
  assert.match(read(pbxprojPath, "utf8"), /SceneDelegate\.swift in Sources/);
  const workflow = read(new URL("../.github/workflows/ios-testflight.yml", import.meta.url), "utf8");
  assert.match(workflow, /applyIosSceneLifecycle/);
  assert.equal(typeof applyIosSceneLifecycle, "function");
});
