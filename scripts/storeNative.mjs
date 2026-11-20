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

// @capgo/native-purchases 7.19.3 (letzte Version für Capacitor 7) liefert auf iOS für ein Produkt nur
// Preis, Titel und Beschreibung. Dauer und Einführungsangebot (Gratis-Testphase) des Jahresabos fehlen,
// obwohl die Kaufseite sie aus dem Store zeigen soll. Das Plugin ab Version 8 (Capacitor 8) liefert sie;
// hier ergänzen wir dieselben Felder im Swift-Code, bevor Xcode baut (node_modules, nicht im Repo).
// Felder wie im neueren Plugin: subscriptionGroupIdentifier, subscriptionPeriod {numberOfUnits, unit 0 Tag…3 Jahr},
// introductoryPrice {price, priceString, paymentMode, numberOfPeriods, subscriptionPeriod}.
export const SUB_INFO_MARKER = "// sf-sub-info (Schlagfertig)";
const SUB_INFO_HEAD = '        return [\n            "identifier": self.id,';
const SUB_INFO_TAIL = '            "isFamilyShareable": self.isFamilyShareable\n        ]\n';
const SUB_INFO_SWIFT = `        ${SUB_INFO_MARKER}
        if let subscription = self.subscription {
            let sfPeriod: (Product.SubscriptionPeriod) -> [String: Any] = { period in
                let unit: Int
                switch period.unit {
                case .day: unit = 0
                case .week: unit = 1
                case .month: unit = 2
                case .year: unit = 3
                @unknown default: unit = -1
                }
                return ["numberOfUnits": period.value, "unit": unit]
            }
            product["subscriptionGroupIdentifier"] = subscription.subscriptionGroupID
            product["subscriptionPeriod"] = sfPeriod(subscription.subscriptionPeriod)
            if let intro = subscription.introductoryOffer {
                var mode = 0
                if intro.paymentMode == .payUpFront { mode = 1 }
                if intro.paymentMode == .freeTrial { mode = 2 }
                product["introductoryPrice"] = [
                    "identifier": intro.id ?? "",
                    "price": intro.price,
                    "priceString": intro.displayPrice,
                    "currencyCode": self.priceFormatStyle.currencyCode,
                    "paymentMode": mode,
                    "numberOfPeriods": intro.periodCount,
                    "subscriptionPeriod": sfPeriod(intro.period)
                ] as [String: Any]
            }
        }
        return product
`;

/** Ergänzt die Abo-Felder im Product-Dictionary des Plugins. Zweiter Lauf ändert nichts. null = Anker nicht gefunden. */
export function ensureSubscriptionInfo(swift) {
  const text = String(swift || "");
  if (text.includes(SUB_INFO_MARKER)) return text;
  if (!text.includes(SUB_INFO_HEAD) || !text.includes(SUB_INFO_TAIL)) return null;
  const headDone = text.replace(SUB_INFO_HEAD, '        var product: [String: Any] = [\n            "identifier": self.id,');
  return headDone.replace(SUB_INFO_TAIL, SUB_INFO_TAIL + SUB_INFO_SWIFT);
}

export function applyNativePurchasesSubscriptionInfo(
  swiftPath = "node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/Product+CapacitorPurchasesPlugin.swift",
) {
  if (!existsSync(swiftPath)) {
    console.error(`Datei fehlt: ${swiftPath}`);
    return 1;
  }
  const prev = readFileSync(swiftPath, "utf8");
  const next = ensureSubscriptionInfo(prev);
  if (next == null) {
    console.error("Plugin-Quelle hat sich geändert: Anker für die Abo-Felder nicht gefunden");
    return 1;
  }
  if (next !== prev) writeFileSync(swiftPath, next);
  console.log("Plugin: subscriptionPeriod und introductoryPrice im Produkt ergänzt");
  return 0;
}


export const STORE_ENV_MARKER = "// sf-store-env (Schlagfertig)";
const STORE_ENV_METHODS_HEAD = 'CAPPluginMethod(name: "getStorefront", returnType: CAPPluginReturnPromise)\n    ]';
const STORE_ENV_METHODS_NEXT = 'CAPPluginMethod(name: "getStorefront", returnType: CAPPluginReturnPromise),\n        CAPPluginMethod(name: "getStoreEnvironment", returnType: CAPPluginReturnPromise) ' + STORE_ENV_MARKER + '\n    ]';
const STORE_ENV_CLASS_END = `            print("isEntitledToOldBusinessModel error: \\(error)")
            call.reject("Failed to get app transaction: \\(error.localizedDescription)")
        }
    }
}`;
const STORE_ENV_SWIFT = `            print("isEntitledToOldBusinessModel error: \\(error)")
            call.reject("Failed to get app transaction: \\(error.localizedDescription)")
        }
    }

    ${STORE_ENV_MARKER}
    @objc func getStoreEnvironment(_ call: CAPPluginCall) {
        let receiptURL = Bundle.main.appStoreReceiptURL
        let receiptSandbox = receiptURL?.lastPathComponent == "sandboxReceipt"
        if #available(iOS 16.0, *) {
            Task { @MainActor in
                await self.handleGetStoreEnvironment(call, receiptSandbox: receiptSandbox)
            }
        } else {
            call.resolve([
                "environment": receiptSandbox ? "Sandbox" : "unknown",
                "sandbox": receiptSandbox,
                "receiptSandbox": receiptSandbox,
                "source": "receipt"
            ])
        }
    }

    @available(iOS 16.0, *)
    @MainActor
    private func handleGetStoreEnvironment(_ call: CAPPluginCall, receiptSandbox: Bool) async {
        do {
            let verificationResult = try await AppTransaction.shared
            let env: String
            switch verificationResult {
            case .verified(let appTransaction):
                env = appTransaction.environment.environmentString
            case .unverified(let appTransaction, _):
                env = appTransaction.environment.environmentString
            }
            let sandbox = env.lowercased() == "sandbox" || receiptSandbox
            call.resolve([
                "environment": env,
                "sandbox": sandbox,
                "receiptSandbox": receiptSandbox,
                "source": "appTransaction"
            ])
        } catch {
            call.resolve([
                "environment": receiptSandbox ? "Sandbox" : "unknown",
                "sandbox": receiptSandbox,
                "receiptSandbox": receiptSandbox,
                "source": "receipt"
            ])
        }
    }
}`;

/** Ergänzt getStoreEnvironment im Capgo-Plugin (AppTransaction.environment oder sandboxReceipt). Idempotent. null = Anker fehlt. */
export function ensureStoreEnvironment(swift) {
  const text = String(swift || "");
  if (text.includes(STORE_ENV_MARKER)) return text;
  if (!text.includes(STORE_ENV_METHODS_HEAD) || !text.includes(STORE_ENV_CLASS_END)) return null;
  return text.replace(STORE_ENV_METHODS_HEAD, STORE_ENV_METHODS_NEXT).replace(STORE_ENV_CLASS_END, STORE_ENV_SWIFT);
}

export function applyNativePurchasesStoreEnvironment(
  swiftPath = "node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift",
) {
  if (!existsSync(swiftPath)) {
    console.error(`Datei fehlt: ${swiftPath}`);
    return 1;
  }
  const prev = readFileSync(swiftPath, "utf8");
  const next = ensureStoreEnvironment(prev);
  if (next == null) {
    console.error("Plugin-Quelle hat sich geändert: Anker für getStoreEnvironment nicht gefunden");
    return 1;
  }
  if (next !== prev) writeFileSync(swiftPath, next);
  console.log("Plugin: getStoreEnvironment (Sandbox/TestFlight) ergänzt");
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
