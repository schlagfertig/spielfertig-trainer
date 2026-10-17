// Nur `npm run dev` / `vite preview`: leitet /api/feedback an api/feedback.js mit Arbeitsspeicher weiter (kein Vercel nötig).
import { handle } from "../api/feedback.js";
import { memoryStore } from "../api/_lib/store.js";

export function devFeedbackApi() {
  const store = memoryStore();
  const mw = async (req, res, next) => {
    if (!req.url.startsWith("/api/feedback")) return next();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined;
    const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body: req.method === "GET" ? undefined : body });
    const r = await handle(request, { store, env: { FEEDBACK_ADMIN_TOKEN: process.env.FEEDBACK_ADMIN_TOKEN || "dev" } });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(await r.text());
  };
  return {
    name: "sf-dev-feedback-api",
    configureServer(server) { server.middlewares.use(mw); },
    configurePreviewServer(server) { server.middlewares.use(mw); },
  };
}
