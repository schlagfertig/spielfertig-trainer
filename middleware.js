// Vercel Routing Middleware: App nur mit persönlichem Einladungslink (siehe README „Testzugang“)
import { verifyToken } from "./access/token.js";
import { lockPage } from "./access/lockPage.js";
import gesperrt from "./access/gesperrt.json" with { type: "json" };

export const config = { runtime: "nodejs" };

const COOKIE = "sf_zugang";
const FREI = new Set(["/logo.svg", "/favicon.svg"]);

function cookieValue(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)sf_zugang=([^;]*)/);
  return m ? m[1] : "";
}

// Eingefügt wird oft der ganze Link statt nur des Codes
function inviteCode(raw) {
  const v = raw.trim();
  const m = v.match(/[?&]zugang=([^&#\s]+)/);
  if (!m) return v;
  try { return decodeURIComponent(m[1]); } catch { return ""; }
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
    const token = inviteCode(raw);
    const r = await verifyToken(secret, token, gesperrt);
    if (!r.ok) return lock(r.reason === "expired" ? { expired: r.exp } : "invalid");
    url.searchParams.delete("zugang");
    return new Response(null, {
      status: 302,
      headers: {
        location: url.pathname + url.search,
        "set-cookie": `${COOKIE}=${token}; Path=/; Expires=${new Date(r.exp * 1000).toUTCString()}; HttpOnly; Secure; SameSite=Lax`,
        "cache-control": "no-store",
      },
    });
  }

  const r = await verifyToken(secret, cookieValue(request), gesperrt);
  if (r.ok) return undefined; // durchlassen
  if (url.pathname.startsWith("/assets/")) {
    return new Response("Kein Zugang", { status: 401, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return lock(r.reason === "expired" ? { expired: r.exp } : "none");
}
