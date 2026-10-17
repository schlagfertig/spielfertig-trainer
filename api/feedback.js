// Test-Feedback der Web-/Testversion (nie in der Store-App). Eine Funktion, mehrere Aktionen (POST JSON { type, … }):
//   feedback  → Bewertung speichern, liefert { count } = zählende Feedbacks dieses Geräts
//   thanks    → Dankeschön-Nummer (SF-1234) vergeben/abrufen und Gerät (iPhone/Android) merken
//   status    → { num, platform, code, validUntil } - code/validUntil trägt Tom später ein (setcode)
//   special   → Name für die Special Thanks (getrennt vom Feedback, ohne Geräte-Kennung)
//   unspecial → eigenen Special-Thanks-Eintrag wieder löschen
//   forget    → alle Feedbacks dieses Geräts löschen (Widerruf)
//   setcode   → nur Tom (Authorization: Bearer FEEDBACK_ADMIN_TOKEN): Code + gültig bis zu einer Nummer
// GET mit Authorization: Bearer FEEDBACK_ADMIN_TOKEN → Export aller Daten als JSON.
// Speicher: api/_lib/store.js. Zugang: wie die App nur mit gültigem Einladungs-Cookie (middleware.js).
import { storeFromEnv } from "./_lib/store.js";
import { DEVICE_RE, NAME_MAX, NUM_RE, cleanPlatform, cleanText, makeThanksNumber, qualifyKey, thanksAfter, validateFeedback } from "../src/lib/feedbackRules.js";

const MAX_PER_DEVICE = 2000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function isAdmin(request, env) {
  const t = env.FEEDBACK_ADMIN_TOKEN;
  return !!t && (request.headers.get("authorization") || "") === `Bearer ${t}`;
}

const K = {
  devices: "fb:devices",
  items: (d) => `fb:dev:${d}`,
  qual: (d) => `fb:q:${d}`,
  thanks: (n) => `fb:thanks:${n}`,
  thanksDev: (d) => `fb:thanksdev:${d}`,
  thanksAll: "fb:thanksall",
  code: (n) => `fb:code:${n}`,
  special: (id) => `fb:special:${id}`,
  specialAll: "fb:specials",
};

async function readBody(request) {
  try {
    const text = await request.text();
    if (text.length > 8000) return null;
    return JSON.parse(text);
  } catch { return null; }
}

export async function handle(request, { env = process.env, store = storeFromEnv(env), now = Date.now(), rand = Math.random } = {}) {
  if (request.method === "GET") {
    if (!isAdmin(request, env)) return json({ error: "forbidden" }, 403);
    if (!store) return json({ error: "storage" }, 503);
    const devices = await store.members(K.devices);
    const feedback = [];
    for (const d of devices) feedback.push(...(await store.list(K.items(d))));
    const thanks = [];
    for (const n of await store.members(K.thanksAll)) thanks.push({ ...(await store.get(K.thanks(n))), ...(await store.get(K.code(n)) || {}) });
    const special = [];
    for (const id of await store.members(K.specialAll)) { const s = await store.get(K.special(id)); if (s) special.push(s); }
    return json({ feedback, thanks, special });
  }
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const body = await readBody(request);
  if (!body || typeof body !== "object") return json({ error: "body" }, 400);
  if (!store) return json({ error: "storage" }, 503);

  const device = String(body.device || "");
  const needDevice = () => DEVICE_RE.test(device);

  switch (body.type) {
    case "feedback": {
      const v = validateFeedback(body);
      if (!v.ok) return json({ error: v.error }, 400);
      if ((await store.len(K.items(device))) >= MAX_PER_DEVICE) return json({ error: "limit" }, 429);
      await store.sadd(K.devices, device);
      await store.push(K.items(device), { ...v.value, at: new Date(now).toISOString() });
      const q = qualifyKey(v.value);
      if (q) await store.sadd(K.qual(device), q);
      return json({ ok: true, count: await store.scard(K.qual(device)) });
    }
    case "thanks": {
      if (!needDevice()) return json({ error: "device" }, 400);
      const platform = cleanPlatform(body.platform);
      let num = await store.get(K.thanksDev(device));
      if (!num && (await store.scard(K.qual(device))) < thanksAfter(body.test === true)) return json({ error: "early" }, 403);
      if (!num) {
        // Vorschlag vom Gerät übernehmen, wenn frei - sonst neue Nummer ziehen.
        const wish = NUM_RE.test(body.num || "") ? body.num : null;
        const tries = wish ? [wish] : [];
        for (let i = 0; i < 20; i++) tries.push(makeThanksNumber(rand));
        for (const n of tries) {
          if (await store.set(K.thanks(n), { num: n, device, platform, test: body.test === true, at: new Date(now).toISOString() }, { nx: true })) { num = n; break; }
        }
        if (!num) return json({ error: "busy" }, 503);
        await store.set(K.thanksDev(device), num);
        await store.sadd(K.thanksAll, num);
      } else if (platform) {
        const old = (await store.get(K.thanks(num))) || { num, device };
        await store.set(K.thanks(num), { ...old, platform });
      }
      const code = (await store.get(K.code(num))) || {};
      return json({ ok: true, num, platform: platform || (await store.get(K.thanks(num)))?.platform || "", code: code.code || "", validUntil: code.validUntil || "" });
    }
    case "status": {
      if (!needDevice()) return json({ error: "device" }, 400);
      const num = await store.get(K.thanksDev(device));
      if (!num) return json({ ok: true, num: "", count: await store.scard(K.qual(device)) });
      const t = (await store.get(K.thanks(num))) || {};
      const code = (await store.get(K.code(num))) || {};
      return json({ ok: true, num, platform: t.platform || "", code: code.code || "", validUntil: code.validUntil || "", count: await store.scard(K.qual(device)) });
    }
    case "special": {
      const name = cleanText(body.name, NAME_MAX);
      const id = String(body.id || "");
      if (!name || !/^[a-z0-9-]{16,40}$/.test(id)) return json({ error: "name" }, 400);
      await store.set(K.special(id), { name, contact: cleanText(body.contact, 80), at: new Date(now).toISOString() });
      await store.sadd(K.specialAll, id);
      return json({ ok: true });
    }
    case "unspecial": {
      const id = String(body.id || "");
      if (!/^[a-z0-9-]{16,40}$/.test(id)) return json({ error: "id" }, 400);
      await store.del(K.special(id));
      await store.srem(K.specialAll, id);
      return json({ ok: true });
    }
    case "forget": {
      if (!needDevice()) return json({ error: "device" }, 400);
      await store.del(K.items(device));
      await store.del(K.qual(device));
      await store.srem(K.devices, device);
      return json({ ok: true });
    }
    case "setcode": {
      if (!isAdmin(request, env)) return json({ error: "forbidden" }, 403);
      if (!NUM_RE.test(body.num || "")) return json({ error: "num" }, 400);
      const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(body.validUntil || "") ? body.validUntil : "";
      await store.set(K.code(body.num), { code: cleanText(body.code, 64), validUntil });
      return json({ ok: true });
    }
    default:
      return json({ error: "type" }, 400);
  }
}

export const POST = (request) => handle(request);
export const GET = (request) => handle(request);
