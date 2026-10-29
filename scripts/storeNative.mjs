// Nach `npx cap add`: iOS 15 für StoreKit 2, Play-Billing-Recht für Android.
// ios/ und android/ liegen nicht im Repo; der Android-Workflow ruft `android` auf.

import { readFileSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function ensureBillingPermission(xml) {
  const text = String(xml || "");
  if (text.includes("com.android.vending.BILLING")) return text;
  const line = '    <uses-permission android:name="com.android.vending.BILLING" />';
  if (!/<manifest\b[^>]*>/.test(text)) return text;
  return text.replace(/<manifest\b[^>]*>/, (tag) => `${tag}\n${line}`);
}

export function ensureIos15(text) {
  return String(text || "")
    .replace(/platform :ios,\s*['"](\d+(?:\.\d+)?)['"]/g, (line, version) => (
      Number.parseFloat(version) >= 15 ? line : "platform :ios, '15.0'"
    ))
    .replace(/IPHONEOS_DEPLOYMENT_TARGET = (\d+(?:\.\d+)?);/g, (line, version) => (
      Number.parseFloat(version) >= 15 ? line : "IPHONEOS_DEPLOYMENT_TARGET = 15.0;"
    ));
}

function patchFile(path, transform) {
  if (!existsSync(path)) {
    console.error(`Datei fehlt: ${path}`);
    process.exitCode = 1;
    return;
  }
  const prev = readFileSync(path, "utf8");
  const next = transform(prev);
  if (next !== prev) writeFileSync(path, next);
  return next;
}

// import.meta.url und argv können sich auf dem macOS-Runner unterscheiden (Symlink).
function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(entry));
  } catch {
    return false;
  }
}

const cmd = process.argv[2];
if (invokedDirectly() && cmd === "android") {
  patchFile("android/app/src/main/AndroidManifest.xml", ensureBillingPermission);
} else if (invokedDirectly() && cmd === "ios") {
  const podfile = patchFile("ios/App/Podfile", ensureIos15);
  const line = String(podfile || "").split("\n").find((l) => l.includes("platform :ios"));
  console.log(line || "Podfile ohne platform :ios");
  const version = line && line.match(/(\d+(?:\.\d+)?)/);
  if (!version || Number.parseFloat(version[1]) < 15) process.exitCode = 1;
  if (existsSync("ios/App/App.xcodeproj/project.pbxproj")) {
    patchFile("ios/App/App.xcodeproj/project.pbxproj", ensureIos15);
  }
}
