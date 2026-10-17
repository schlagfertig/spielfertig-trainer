// Austauschbarer Speicher für das Test-Feedback (api/feedback.js).
// - Upstash Redis (Vercel Marketplace, „Redis“/„Upstash for Redis“): nutzt KV_REST_API_URL + KV_REST_API_TOKEN
//   bzw. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN - nur REST per fetch, kein Paket nötig.
// - Arbeitsspeicher (FEEDBACK_MEMORY=1 oder lokal mit `npm run dev`): nur zum Ausprobieren, geht beim Neustart verloren.
// Ohne beides: null → die Funktion antwortet 503 und die App behält das Feedback im Postausgang auf dem Gerät.

export function redisStore(url, token, fetchImpl = fetch) {
  async function cmd(...args) {
    const r = await fetchImpl(url.replace(/\/+$/, ""), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(args.map(String)),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(`redis: ${j.error || r.status}`);
    return j.result;
  }
  return {
    kind: "redis",
    push: (key, obj) => cmd("RPUSH", key, JSON.stringify(obj)),
    list: async (key) => ((await cmd("LRANGE", key, 0, -1)) || []).map((s) => JSON.parse(s)),
    len: async (key) => Number(await cmd("LLEN", key)) || 0,
    sadd: async (key, m) => Number(await cmd("SADD", key, m)) === 1,
    srem: (key, m) => cmd("SREM", key, m),
    scard: async (key) => Number(await cmd("SCARD", key)) || 0,
    members: async (key) => (await cmd("SMEMBERS", key)) || [],
    get: async (key) => { const v = await cmd("GET", key); return v == null ? null : JSON.parse(v); },
    set: async (key, obj, { nx = false } = {}) => (await cmd("SET", key, JSON.stringify(obj), ...(nx ? ["NX"] : []))) === "OK",
    del: (key) => cmd("DEL", key),
  };
}

export function memoryStore() {
  const kv = new Map();
  const arr = (k) => { if (!Array.isArray(kv.get(k))) kv.set(k, []); return kv.get(k); };
  const set = (k) => { if (!(kv.get(k) instanceof Set)) kv.set(k, new Set()); return kv.get(k); };
  return {
    kind: "memory",
    push: async (k, o) => arr(k).push(JSON.stringify(o)),
    list: async (k) => arr(k).map((s) => JSON.parse(s)),
    len: async (k) => arr(k).length,
    sadd: async (k, m) => { const s = set(k); if (s.has(m)) return false; s.add(m); return true; },
    srem: async (k, m) => set(k).delete(m),
    scard: async (k) => set(k).size,
    members: async (k) => [...set(k)],
    get: async (k) => (typeof kv.get(k) === "string" ? JSON.parse(kv.get(k)) : null),
    set: async (k, o, { nx = false } = {}) => { if (nx && kv.has(k)) return false; kv.set(k, JSON.stringify(o)); return true; },
    del: async (k) => kv.delete(k),
  };
}

let mem = null;
export function storeFromEnv(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(url, token);
  if (env.FEEDBACK_MEMORY === "1") return (mem ||= memoryStore());
  return null;
}
