// Nach `npx cap add`: iOS-Deployment-Target aus dem Capgo-Podspec, Play-Billing-Recht für Android,
// TCC-Texte für Kamera/Mikrofon (Clip nutzt getUserMedia; ohne Texte stürzt iOS ab).
// ios/ und android/ liegen nicht im Repo; der Android-Workflow ruft `android` auf.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function ensureBillingPermission(xml) {
  const text = String(xml || "");
  if (text.includes("com.android.vending.BILLING")) return text;
  const line = '    <uses-permission android:name="com.android.vending.BILLING" />';
  if (!/<manifest\b[^>]*>/.test(text)) return text;
  return text.replace(/<manifest\b[^>]*>/, (tag) => `${tag}\n${line}`);
}

export function deploymentTargetFromPodspec(text) {
  const found = [...String(text || "").matchAll(/\.ios\.deployment_target\s*=\s*['"](\d+(?:\.\d+)?)['"]/g)]
    .map((m) => Number.parseFloat(m[1]))
    .filter((n) => Number.isFinite(n));
  if (!found.length) throw new Error("ios.deployment_target fehlt im Podspec");
  const highest = Math.max(...found);
  return Number.isInteger(highest) ? `${highest}.0` : String(highest);
}

export function ensureIosVersion(text, minimum) {
  const floor = Number.parseFloat(minimum);
  if (!Number.isFinite(floor)) throw new Error(`iOS-Version ungültig: ${minimum}`);
  const label = Number.isInteger(floor) ? `${floor}.0` : String(floor);
  return String(text || "")
    .replace(/platform :ios,\s*['"](\d+(?:\.\d+)?)['"]/g, (line, version) => (
      Number.parseFloat(version) >= floor ? line : `platform :ios, '${label}'`
    ))
    .replace(/IPHONEOS_DEPLOYMENT_TARGET = (\d+(?:\.\d+)?);/g, (line, version) => (
      Number.parseFloat(version) >= floor ? line : `IPHONEOS_DEPLOYMENT_TARGET = ${label};`
    ));
}

export function ensureIos15(text) {
  return ensureIosVersion(text, "15.0");
}

// Clip (PracticeClip.jsx): getUserMedia Video + Mikrofon. Ohne diese Keys killt iOS die App (TCC).
export const IOS_CAMERA_USAGE_DE =
  "Schlagfertig braucht die Kamera, damit du dich beim Üben filmen kannst.";
export const IOS_MICROPHONE_USAGE_DE =
  "Schlagfertig braucht das Mikrofon, damit Click und Pad in deinem Clip zu hören sind.";

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Setzt oder ersetzt einen String-Eintrag in einer Info.plist (XML). */
export function ensurePlistString(xml, key, value) {
  const text = String(xml || "");
  const safeKey = String(key || "");
  if (!safeKey || !/<plist\b/i.test(text) || !/<\/dict>/i.test(text)) return text;
  const escaped = escapeXml(value);
  const keyTag = `<key>${safeKey}</key>`;
  const block = `${keyTag}\n\t<string>${escaped}</string>`;
  const keyRe = new RegExp(
    `<key>${safeKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</key>\\s*<string>[\\s\\S]*?</string>`,
  );
  if (keyRe.test(text)) return text.replace(keyRe, block);
  // Vor dem schließenden </dict> der Wurzel einfügen (letztes </dict> vor </plist>).
  const close = text.lastIndexOf("</dict>");
  if (close < 0) return text;
  return `${text.slice(0, close)}\t${block}\n${text.slice(close)}`;
}

export function ensureIosMediaUsageDescriptions(xml) {
  return ensurePlistString(
    ensurePlistString(xml, "NSCameraUsageDescription", IOS_CAMERA_USAGE_DE),
    "NSMicrophoneUsageDescription",
    IOS_MICROPHONE_USAGE_DE,
  );
}

function patchFile(path, transform) {
  if (!existsSync(path)) {
    console.error(`Datei fehlt: ${path}`);
    return null;
  }
  const prev = readFileSync(path, "utf8");
  const next = transform(prev);
  if (next !== prev) writeFileSync(path, next);
  return next;
}

export function applyIosDeploymentTarget() {
  const podspecPath = "node_modules/@capgo/native-purchases/CapgoNativePurchases.podspec";
  if (!existsSync(podspecPath)) {
    console.error(`Datei fehlt: ${podspecPath}`);
    return 1;
  }
  const minimum = deploymentTargetFromPodspec(readFileSync(podspecPath, "utf8"));
  console.log(`iOS deployment target aus Podspec: ${minimum}`);
  const bump = (text) => ensureIosVersion(text, minimum);
  const podfile = patchFile("ios/App/Podfile", bump);
  const line = String(podfile || "").split("\n").find((l) => l.includes("platform :ios"));
  console.log(line || "Podfile ohne platform :ios");
  const platform = line && line.match(/(\d+(?:\.\d+)?)/);
  if (!platform || Number.parseFloat(platform[1]) < Number.parseFloat(minimum)) return 1;
  const project = "ios/App/App.xcodeproj/project.pbxproj";
  const patched = patchFile(project, bump);
  if (patched == null) return 1;
  const low = [...patched.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = (\d+(?:\.\d+)?);/g)]
    .some((m) => Number.parseFloat(m[1]) < Number.parseFloat(minimum));
  return low ? 1 : 0;
}

/** Schreibt Kamera-/Mikrofon-Texte in ios/App/App/Info.plist (nach cap add/sync). */
export function applyIosMediaUsageDescriptions(plistPath = "ios/App/App/Info.plist") {
  const patched = patchFile(plistPath, ensureIosMediaUsageDescriptions);
  if (patched == null) return 1;
  if (!patched.includes("NSCameraUsageDescription") || !patched.includes("NSMicrophoneUsageDescription")) {
    console.error("Kamera-/Mikrofon-Texte fehlen nach dem Patch");
    return 1;
  }
  console.log("Info.plist: NSCameraUsageDescription + NSMicrophoneUsageDescription gesetzt");
  return 0;
}

function cliCommand() {
  const args = process.argv.slice(1).map((a) => String(a).replaceAll("\\", "/"));
  const script = args.some((a) => /(?:^|\/)storeNative\.mjs$/.test(a));
  if (!script) return "";
  if (args.includes("ios")) return "ios";
  if (args.includes("android")) return "android";
  return "";
}

const cmd = cliCommand();
if (cmd === "android") {
  if (patchFile("android/app/src/main/AndroidManifest.xml", ensureBillingPermission) == null) process.exitCode = 1;
} else if (cmd === "ios") {
  process.exitCode = applyIosDeploymentTarget();
}
