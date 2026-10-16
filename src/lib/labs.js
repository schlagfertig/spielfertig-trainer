// Labs: Funktionen im Test, nur für Tom sichtbar. Das Zugangs-Cookie (sf_zugang) ist HttpOnly und
// für die App nicht lesbar - daher ein lokaler Schalter: ?labs=1 einmal öffnen (merkt sich das Gerät),
// ?labs=0 schaltet wieder aus. Kein Zugang, keine Daten - blendet nur Test-Kacheln ein.
const KEY = "sf.labs";

export function readLabsParam(search) {
  const m = /[?&]labs=([^&]*)/.exec(search || "");
  if (!m) return null;
  return m[1] === "1" || m[1] === "on" ? true : m[1] === "0" || m[1] === "off" ? false : null;
}

export function initLabs() {
  try {
    const v = readLabsParam(window.location.search);
    if (v === null) return;
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    const u = new URL(window.location.href);
    u.searchParams.delete("labs");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
  } catch { /* Speicher nicht verfügbar */ }
}

export function labsOn() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
