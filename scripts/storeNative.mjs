// Nach `npx cap add`: iOS 15 für StoreKit 2, Play-Billing-Recht für Android.
// ios/ und android/ liegen nicht im Repo; der Android-Workflow ruft `android` auf.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function ensureBillingPermission(xml) {
  const text = String(xml || "");
  if (text.includes("com.android.vending.BILLING")) return text;
  const line = '    <uses-permission android:name="com.android.vending.BILLING" />';
  if (!/<manifest\b[^>]*>/.test(text)) return text;
  return text.replace(/<manifest\b[^>]*>/, (tag) => `${tag}\n${line}`);
}

export function ensureIos15(text) {
  return String(text || "")
    .replace(/platform :ios, '(\d+(?:\.\d+)?)'/g, (line, version) => (
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
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
const cmd = process.argv[2];
if (isMain && cmd === "android") {
  patchFile("android/app/src/main/AndroidManifest.xml", ensureBillingPermission);
} else if (isMain && cmd === "ios") {
  patchFile("ios/App/Podfile", ensureIos15);
  if (existsSync("ios/App/App.xcodeproj/project.pbxproj")) {
    patchFile("ios/App/App.xcodeproj/project.pbxproj", ensureIos15);
  }
}
