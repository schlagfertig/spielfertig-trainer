// TestFlight-/Sandbox-Erkennung und der Tester-Schalter „Vollversion ignorieren".
// Der Schalter gilt nur, wenn die native Prüfung Sandbox ergibt. Im App-Store-Build
// und im Web bleibt er unsichtbar und wirkungslos, auch wenn die lokale Vorliebe gesetzt ist.

const PREF_KEY = "sf-test-ignore-full";

let sandbox = false;

export function isSandboxStore() {
  return sandbox === true;
}

// Nur für Tests. Produktions- und Web-Code setzen das ausschließlich über refreshSandboxStore().
export function setSandboxStoreForTests(value) {
  sandbox = value === true;
}

export function storeEnvironmentIsSandbox(info) {
  if (!info || typeof info !== "object") return false;
  if (info.sandbox === true) return true;
  const env = String(info.environment || "").trim().toLowerCase();
  if (env === "sandbox") return true;
  if (info.receiptSandbox === true) return true;
  const receipt = String(info.receipt || info.receiptUrl || info.receiptPath || "");
  if (receipt.endsWith("sandboxReceipt")) return true;
  return false;
}

function iosNative() {
  try {
    return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}

async function readNativeStoreEnvironment() {
  if (!iosNative()) return { sandbox: false, environment: "web", source: "web" };
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  const plugin = cap?.Plugins?.NativePurchases;
  const readers = [];
  if (plugin?.getStoreEnvironment) readers.push(() => plugin.getStoreEnvironment());
  if (plugin?.getAppTransaction) {
    readers.push(async () => {
      const r = await plugin.getAppTransaction();
      return r?.appTransaction || r;
    });
  }
  try {
    const { NativePurchases } = await import("@capgo/native-purchases");
    if (typeof NativePurchases.getStoreEnvironment === "function") readers.push(() => NativePurchases.getStoreEnvironment());
    if (typeof NativePurchases.getAppTransaction === "function") {
      readers.push(async () => {
        const r = await NativePurchases.getAppTransaction();
        return r?.appTransaction || r;
      });
    }
  } catch { /* Plugin nicht geladen */ }
  for (const read of readers) {
    try {
      const info = await read();
      if (info && typeof info === "object") return info;
    } catch { /* nächste Quelle */ }
  }
  return { sandbox: false, environment: "unknown", source: "none" };
}

export async function refreshSandboxStore() {
  if (!iosNative()) {
    sandbox = false;
    return false;
  }
  const info = await readNativeStoreEnvironment();
  sandbox = storeEnvironmentIsSandbox(info);
  return sandbox;
}

export function testIgnoreFullPref() {
  try { return localStorage.getItem(PREF_KEY) === "1"; } catch { return false; }
}

export function setTestIgnoreFullPref(on) {
  try {
    if (on) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch { /* ignore */ }
}

// Nur in der erkannten Sandbox wirksam. Produktion und Web ignorieren die Vorliebe.
export function isTestIgnoreFullActive() {
  return isSandboxStore() && testIgnoreFullPref();
}

export function showTestIgnoreSwitch() {
  return isSandboxStore();
}
