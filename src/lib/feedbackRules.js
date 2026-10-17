// Test-Feedback (nur Web-/Testversion): reine Regeln ohne DOM - gemeinsam für App (src/lib/TesterFeedback.jsx)
// und Server (api/feedback.js). In der Store-App (Capacitor) ist das Feature komplett aus.

// Überraschungs-Erfolg: nach so vielen „zählenden“ Feedbacks. Hier ändern (Tom: 7).
export const THANKS_AFTER = 7;
// Testmodus (?fbtest=1): schon nach 2.
export const TEST_THANKS_AFTER = 2;
// Feedback-Frage erst ab so vielen Sekunden am Stück (wie das Übe-Tagebuch); im Testmodus sofort.
export const ASK_MIN_SEC = 30;
export const TEST_ASK_MIN_SEC = 2;
export const COMMENT_MAX = 500;
export const NAME_MAX = 60;
export const MIN_TEXT = 3; // so viele Zeichen braucht ein Kommentar, damit das Feedback zählt
export const FEEDBACK_MAIL = "schlagfertig@icloud.com";

export const thanksAfter = (test) => (test ? TEST_THANKS_AFTER : THANKS_AFTER);

const pad = (n) => String(n).padStart(2, "0");
export function dayKey(at = Date.now()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DEVICE_RE = /^[a-z0-9-]{16,40}$/;
export const NUM_RE = /^SF-\d{4,6}$/;

// Übung als Schlüssel: "rudiments|5", "click|"
export function exKey(ex, item) {
  return `${String(ex || "").slice(0, 24)}|${item == null ? "" : String(item).slice(0, 40)}`;
}

export function cleanText(s, max) {
  return String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
}

// Zählt ein Feedback für den Erfolg? Nur mit Text, höchstens eins pro Übung und Tag.
export function qualifyKey(fb) {
  if (cleanText(fb?.comment, COMMENT_MAX).length < MIN_TEXT) return null;
  if (!fb?.day || !fb?.ex) return null;
  return `${fb.day}#${fb.ex}`;
}

// Liste zählender Schlüssel ergänzen (Set-Semantik, Reihenfolge stabil).
export function addQualified(keys, fb) {
  const k = qualifyKey(fb);
  const list = Array.isArray(keys) ? keys.slice() : [];
  if (k && !list.includes(k)) list.push(k);
  return list;
}

// Kurze Dankeschön-Nummer, z. B. "SF-4821".
export function makeThanksNumber(rand = Math.random) {
  return `SF-${1000 + Math.floor(rand() * 9000)}`;
}

// Eingehendes Feedback prüfen und säubern. → { ok, value } oder { ok:false, error }
export function validateFeedback(raw) {
  const device = String(raw?.device || "");
  if (!DEVICE_RE.test(device)) return { ok: false, error: "device" };
  const rating = raw?.rating === "up" || raw?.rating === "down" ? raw.rating : null;
  if (!rating) return { ok: false, error: "rating" };
  const ex = cleanText(raw?.ex, 80);
  if (!ex) return { ok: false, error: "ex" };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw?.day || "") ? raw.day : null;
  if (!day) return { ok: false, error: "day" };
  return {
    ok: true,
    value: {
      device, rating, ex, day,
      label: cleanText(raw?.label, 80),
      comment: cleanText(raw?.comment, COMMENT_MAX),
      quote: raw?.quote === true,
      lang: raw?.lang === "en" ? "en" : "de",
      test: raw?.test === true,
    },
  };
}

export function cleanPlatform(p) {
  return p === "ios" || p === "android" ? p : "";
}

export const PLATFORM_LABEL = { ios: "iPhone", android: "Android", "": "?" };

// Code abgelaufen? validUntil = "YYYY-MM-DD" (gilt bis einschließlich diesem Tag).
export function isExpired(validUntil, now = Date.now()) {
  if (!validUntil || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return false;
  return dayKey(now) > validUntil;
}

// Mail an Tom mit Dankeschön-Nummer und Gerät (für „Bei Tom melden“ und „Tom Bescheid geben“).
export function mailtoHref({ num, platform, expired = false, code = "", lang = "de" }) {
  const dev = PLATFORM_LABEL[cleanPlatform(platform)];
  const de = lang !== "en";
  const subject = de
    ? `Schlagfertig Dankeschön ${num}${expired ? " - Code abgelaufen" : ""}`
    : `Schlagfertig thank-you ${num}${expired ? " - code expired" : ""}`;
  const lines = de
    ? ["Hallo Tom,", "", expired ? `mein Code${code ? ` (${code})` : ""} ist leider abgelaufen. Kannst du mir einen neuen schicken?` : "ich habe beim Testen mitgeholfen und möchte mir die Vollversion abholen.", "", `Dankeschön-Nummer: ${num}`, `Gerät: ${dev}`, ""]
    : ["Hi Tom,", "", expired ? `my code${code ? ` (${code})` : ""} has expired. Could you send me a new one?` : "I helped test the app and would like to claim the full version.", "", `Thank-you number: ${num}`, `Device: ${dev}`, ""];
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
