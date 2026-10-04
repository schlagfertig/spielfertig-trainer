// Vercel Routing Middleware: App nur mit persönlichem Einladungslink (siehe README „Testzugang“)
import { verifyToken } from "./access/token.js";
import { lockPage } from "./access/lockPage.js";
import gesperrt from "./access/gesperrt.json" with { type: "json" };

export const config = { runtime: "nodejs" };

const COOKIE = "sf_zugang";
// Ohne Zugang abrufbar: Icons und Manifest (Browser/iOS laden sie ohne Cookies)
// sowie die statische Datenschutzseite (App-Store-Link). Die SPA-Route /datenschutz bleibt gesperrt.
const FREI = new Set([
  "/logo.svg", "/favicon.svg", "/app-icon.svg", "/manifest.webmanifest",
  "/datenschutz.html", "/privacy.html",
]);

function cookieValue(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sf_zugang=([^;]*)/);
  return m ? m[1] : "";
}

// Eingefügt wird oft der ganze Link statt nur des Codes
function fromPaste(raw) {
  const v = raw.trim();
  if (!/[?&]zugang=/.test(v)) return { token: v, name: null, lang: null };
  try {
    const u = new URL(v, "https://x.invalid");
    return { token: u.searchParams.get("zugang") || "", name: u.searchParams.get("name"), lang: u.searchParams.get("lang") };
  } catch { return { token: "", name: null, lang: null }; }
}

// Anzeigename für die Begrüßung (?name=, nicht signiert): nur Buchstaben, - und ', max. 20 Zeichen
function cleanName(raw) {
  return Array.from((raw || "").normalize("NFC").replace(/[^\p{L}'-]/gu, "")).slice(0, 20).join("");
}

// Startsprache (?lang=, nicht signiert): nur "de" oder "en", sonst nichts
function cleanLang(raw) {
  return raw === "de" || raw === "en" ? raw : "";
}

function lock(state) {
  return new Response(lockPage(state), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (FREI.has(url.pathname)) return undefined; // durchlassen
  const secret = process.env.ZUGANG_SECRET;
  if (!secret) console.error("ZUGANG_SECRET fehlt: alle Anfragen gesperrt");

  const raw = url.searchParams.get("zugang");
  if (raw !== null) {
    const pasted = fromPaste(raw);
    const token = pasted.token;
    const r = await verifyToken(secret, token, gesperrt);
    if (!r.ok) return lock(r.reason === "expired" ? { expired: r.exp } : "invalid");
    const name = cleanName(pasted.name ?? url.searchParams.get("name"));
    const lang = cleanLang(pasted.lang ?? url.searchParams.get("lang"));
    url.searchParams.delete("zugang");
    url.searchParams.delete("name");
    url.searchParams.delete("lang");
    const attrs = `Path=/; Expires=${new Date(r.exp * 1000).toUTCString()}; Secure; SameSite=Lax`;
    const headers = new Headers({ location: url.pathname + url.search, "cache-control": "no-store" });
    headers.append("set-cookie", `${COOKIE}=${token}; ${attrs}; HttpOnly`);
    if (name) headers.append("set-cookie", `sf_name=${encodeURIComponent(name)}; ${attrs}`);
    if (lang) headers.append("set-cookie", `sf_lang=${lang}; ${attrs}`);
    return new Response(null, { status: 302, headers });
  }

  const r = await verifyToken(secret, cookieValue(request), gesperrt);
  if (r.ok) return undefined; // durchlassen
  if (url.pathname.startsWith("/assets/")) {
    return new Response("Kein Zugang", { status: 401, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return lock(r.reason === "expired" ? { expired: r.exp } : "none");
}
