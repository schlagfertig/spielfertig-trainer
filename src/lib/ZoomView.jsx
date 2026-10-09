import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getLang, t } from "./i18n.js";

/* Zoom-Ansicht für Noten (Foto oder PDF): Standard = ganze Seite eingepasst (nichts abgeschnitten).
   Zwei Finger = zoomen (1× bis 5×), Doppeltipp = Zoom an/aus, ein Finger verschiebt, solange gezoomt ist.
   Nicht gezoomt: waagerecht wischen = voriges/nächstes Blatt (onSwipe). PDFs zeichnet pdf.js selbst in ein
   Canvas (das iPhone zeigt PDFs im iframe nur als starres Bild) und nach dem Zoomen schärfer nach.
   Notizen: renderOverlay({ page, aspect }) liegt in derselben Fläche wie die Seite und zoomt/verschiebt mit.
   mode = "draw": ein Finger/Stift/Maus zeichnet (onDraw), zwei Finger zoomen weiter.
   mode = "pin": Tippen aufs Blatt ruft onTapPage({ x, y }, page) mit normierten Seitenkoordinaten. */

const MAX_ZOOM = 5;
const DT_MS = 300; // Doppeltipp-Fenster
const TAP_PX = 12; // mehr Bewegung = kein Tipp
const MAX_PX = 12e6; // Canvas-Obergrenze (iOS: ca. 16,7 Mio. Pixel pro Canvas)

let pdfjsP = null;
function loadPdfjs() {
  if (!pdfjsP) {
    pdfjsP = Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    }).catch((e) => { pdfjsP = null; throw e; });
  }
  return pdfjsP;
}

const clampNum = (v, a, b) => Math.max(a, Math.min(b, v));

function fmtZoom(s) {
  const v = Math.round(s * 10) / 10;
  return `${getLang() === "en" ? String(v) : String(v).replace(".", ",")}×`;
}

export function ZoomView({ file, url, onSwipe, mini = false, mode = "view", onDraw, onTapPage, onPage, renderOverlay }) {
  const isPdf = file?.kind === "pdf";
  const box = useRef(null);
  const stage = useRef(null);
  const canvas = useRef(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState(null); // natürliche Größe der Seite (px bzw. PDF-Punkte)
  const [doc, setDoc] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [err, setErr] = useState("");
  const [level, setLevel] = useState(1); // Zoomstufe für Anzeige/Nachschärfen (nach der Geste)
  const view = useRef({ s: 1, tx: 0, ty: 0 });
  const g = useRef({ pts: new Map(), start: null, moved: 0, pinch: null, multi: false, lastTap: null });
  const settle = useRef(0);

  // Größe der Fläche
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const upd = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // PDF laden
  useEffect(() => {
    if (!isPdf || !url) return undefined;
    let gone = false;
    let task = null;
    setErr("");
    loadPdfjs().then((lib) => {
      if (gone) return;
      task = lib.getDocument({ url, isEvalSupported: false });
      return task.promise.then((d) => { if (!gone) { setDoc(d); setPageNo(1); } });
    }).catch(() => { if (!gone) setErr(t("PDF konnte nicht angezeigt werden.")); });
    return () => { gone = true; task?.destroy?.(); setDoc(null); };
  }, [isPdf, url]);

  // PDF-Seite: natürliche Größe
  const pageRef = useRef(null);
  useEffect(() => {
    if (!doc) return undefined;
    let gone = false;
    doc.getPage(pageNo).then((p) => {
      if (gone) return;
      pageRef.current = p;
      const v = p.getViewport({ scale: 1 });
      setNat({ w: v.width, h: v.height });
    }).catch(() => { if (!gone) setErr(t("PDF konnte nicht angezeigt werden.")); });
    return () => { gone = true; };
  }, [doc, pageNo]);

  useEffect(() => { onPage?.(pageNo); }, [pageNo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fit = nat && vp.w && vp.h ? Math.min(vp.w / nat.w, vp.h / nat.h) : 0;
  const fw = nat ? nat.w * fit : 0;
  const fh = nat ? nat.h * fit : 0;

  const apply = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    const { s, tx, ty } = view.current;
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    el.style.setProperty("--zv-inv", String(1 / s));
  }, []);

  // Grenzen: kleiner als die Fläche = mittig, größer = Ränder bleiben am Rand
  const clampView = useCallback((v) => {
    const s = clampNum(v.s, 1, MAX_ZOOM);
    const w = fw * s;
    const h = fh * s;
    const tx = w <= vp.w ? (vp.w - w) / 2 : clampNum(v.tx, vp.w - w, 0);
    const ty = h <= vp.h ? (vp.h - h) / 2 : clampNum(v.ty, vp.h - h, 0);
    return { s, tx, ty };
  }, [fw, fh, vp.w, vp.h]);

  const commit = useCallback((v, now = false) => {
    view.current = clampView(v);
    apply();
    window.clearTimeout(settle.current);
    const done = () => setLevel(view.current.s);
    if (now) done();
    else settle.current = window.setTimeout(done, 160);
  }, [apply, clampView]);

  // Neue Seite / neue Größe: eingepasst
  useLayoutEffect(() => {
    if (!fit) return;
    commit({ s: 1, tx: 0, ty: 0 }, true);
  }, [fit, fw, fh, pageNo, commit]);
  useEffect(() => () => window.clearTimeout(settle.current), []);

  const zoomAt = useCallback((s, px, py, now) => {
    const v = view.current;
    const k = clampNum(s, 1, MAX_ZOOM) / v.s;
    commit({ s: v.s * k, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }, now);
  }, [commit]);

  // PDF zeichnen: Auflösung passend zur Zoomstufe (nachgeschärft, sobald die Geste ruht)
  useEffect(() => {
    const p = pageRef.current;
    const cv = canvas.current;
    if (!isPdf || !p || !cv || !fit || !nat) return undefined;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    let scale = fit * level * dpr;
    const px = nat.w * nat.h * scale * scale;
    if (px > MAX_PX) scale *= Math.sqrt(MAX_PX / px);
    const vpt = p.getViewport({ scale });
    const off = document.createElement("canvas");
    off.width = Math.floor(vpt.width);
    off.height = Math.floor(vpt.height);
    const task = p.render({ canvasContext: off.getContext("2d"), viewport: vpt });
    let gone = false;
    task.promise.then(() => {
      if (gone) return;
      cv.width = off.width;
      cv.height = off.height;
      cv.getContext("2d").drawImage(off, 0, 0);
      cv.dataset.res = String(Math.round(scale * 100) / 100);
      off.width = 0; off.height = 0;
    }).catch(() => {});
    return () => { gone = true; task.cancel?.(); };
  }, [isPdf, fit, nat, level, pageNo]);

  // Gesten (Pointer-Events; touch-action: none auf der Fläche)
  const local = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  // Bildschirmpunkt (in der Fläche) → normierte Seitenkoordinate (0…1)
  const norm = (p) => {
    const v = view.current;
    return fw && fh ? { x: (p.x - v.tx) / (fw * v.s), y: (p.y - v.ty) / (fh * v.s) } : null;
  };
  const drawRef = useRef(onDraw);
  drawRef.current = onDraw;
  function endDraw(cancel) {
    const G = g.current;
    if (!G.draw) return;
    G.draw = null;
    if (cancel) drawRef.current?.cancel?.();
    else drawRef.current?.end?.();
  }
  useEffect(() => { if (mode !== "draw") endDraw(true); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function onDown(e) {
    if (mini || e.button > 0) return;
    if (e.target.closest("button, textarea, input, .zv-noptr")) return;
    const G = g.current;
    // Stift zeichnet: aufgelegte Hand (Touch) ignorieren
    if (mode === "draw" && G.draw?.pen && e.pointerType === "touch") return;
    box.current.setPointerCapture?.(e.pointerId);
    const p = local(e);
    G.pts.set(e.pointerId, p);
    if (G.pts.size === 1) { G.start = { ...p, t: Date.now() }; G.moved = 0; G.multi = false; G.last = p; }
    if (mode === "draw" && G.pts.size === 1) {
      const q = norm(p);
      if (q) {
        G.draw = { id: e.pointerId, pen: e.pointerType === "pen" };
        drawRef.current?.start?.(q, pageNo, { pressure: e.pointerType === "pen" ? e.pressure : 0, aspect: nat ? nat.h / nat.w : 1, px: 1 / (fw * view.current.s) });
      }
      return;
    }
    if (G.pts.size === 2 && G.draw) endDraw(true); // zweiter Finger: doch zoomen statt zeichnen
    if (G.pts.size === 2) {
      const [a, b] = [...G.pts.values()];
      G.multi = true;
      G.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ...view.current };
    }
  }
  function onMove(e) {
    const G = g.current;
    if (!G.pts.has(e.pointerId)) return;
    const p = local(e);
    G.pts.set(e.pointerId, p);
    if (G.draw && G.draw.id === e.pointerId) {
      const evs = e.nativeEvent?.getCoalescedEvents?.() || [];
      const list = evs.length ? evs.map((ce) => local(ce)) : [p];
      const q = list.map(norm).filter(Boolean);
      if (q.length) drawRef.current?.move?.(q, { pressure: e.pointerType === "pen" ? e.pressure : 0, px: 1 / (fw * view.current.s) });
      return;
    }
    if (G.pts.size >= 2 && G.pinch) {
      const [a, b] = [...G.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const P = G.pinch;
      const s = clampNum(P.s * (d / P.d), 1, MAX_ZOOM);
      const k = s / P.s;
      // Punkt unter der Anfangs-Mitte bleibt unter den Fingern (inkl. Mitverschieben)
      commit({ s, tx: mx - (P.mx - P.tx) * k, ty: my - (P.my - P.ty) * k });
      return;
    }
    if (G.pts.size === 1 && G.start) {
      G.moved = Math.max(G.moved, Math.hypot(p.x - G.start.x, p.y - G.start.y));
      if (view.current.s > 1.01) {
        const v = view.current;
        commit({ s: v.s, tx: v.tx + (p.x - G.last.x), ty: v.ty + (p.y - G.last.y) });
      }
      G.last = p;
    }
  }
  function onUp(e) {
    const G = g.current;
    if (!G.pts.has(e.pointerId)) return;
    const p = local(e);
    G.pts.delete(e.pointerId);
    if (G.draw && G.draw.id === e.pointerId) {
      endDraw(e.type === "pointercancel");
      G.pts.clear();
      G.start = null;
      return;
    }
    if (G.pts.size === 1) {
      // von zwei auf einen Finger: mit dem verbleibenden weiter verschieben, ohne Sprung
      G.pinch = null;
      G.last = [...G.pts.values()][0];
      return;
    }
    if (G.pts.size > 0) return;
    G.pinch = null;
    const st = G.start;
    G.start = null;
    if (!st || G.multi || e.type === "pointercancel") return;
    const dx = p.x - st.x;
    const dy = p.y - st.y;
    const zoomed = view.current.s > 1.01;
    if (mode !== "view") {
      // Marker setzen: einfacher Tipp, kein Doppeltipp-Zoom, kein Blättern
      if (mode === "pin" && G.moved < TAP_PX) {
        const q = norm(p);
        if (q && q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1) onTapPage?.(q, pageNo);
      }
      return;
    }
    if (G.moved < TAP_PX) {
      const now = Date.now();
      const lt = G.lastTap;
      if (lt && now - lt.t < DT_MS && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
        G.lastTap = null;
        if (zoomed) commit({ s: 1, tx: 0, ty: 0 }, true);
        else zoomAt(2.5, p.x, p.y, true);
      } else G.lastTap = { x: p.x, y: p.y, t: now };
      return;
    }
    // Blättern nur, wenn nicht gezoomt
    if (!zoomed && Math.abs(dx) > 60 && Math.abs(dy) < 50) onSwipe?.(dx < 0 ? 1 : -1);
  }

  // Trackpad/Mausrad: Strg+Rad (bzw. Trackpad-Pinch) = zoomen, sonst verschieben, wenn gezoomt
  useEffect(() => {
    const el = box.current;
    if (!el || mini) return undefined;
    const onWheel = (e) => {
      const r = el.getBoundingClientRect();
      if (e.ctrlKey) {
        e.preventDefault();
        zoomAt(view.current.s * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else if (view.current.s > 1.01) {
        e.preventDefault();
        const v = view.current;
        commit({ s: v.s, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY });
      }
    };
    // ältere iOS-Safari: eigenes Seiten-Zoomen unterdrücken
    const noGesture = (e) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", noGesture);
    el.addEventListener("gesturechange", noGesture);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", noGesture);
      el.removeEventListener("gesturechange", noGesture);
    };
  }, [mini, zoomAt, commit]);

  // Tastatur: + / − / 0
  useEffect(() => {
    if (mini) return undefined;
    const onKey = (e) => {
      if (e.target?.closest?.("input, textarea, select, [contenteditable]")) return;
      const c = { x: vp.w / 2, y: vp.h / 2 };
      if (e.key === "+" || e.key === "=") zoomAt(view.current.s * 1.5, c.x, c.y, true);
      else if (e.key === "-" || e.key === "_") zoomAt(view.current.s / 1.5, c.x, c.y, true);
      else if (e.key === "0") commit({ s: 1, tx: 0, ty: 0 }, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mini, vp.w, vp.h, zoomAt, commit]);

  const step = (f) => zoomAt(view.current.s * f, vp.w / 2, vp.h / 2, true);
  const zoomed = level > 1.01;
  const pages = doc?.numPages || 1;

  let content = null;
  if (err) content = <div className="zv-msg">{err}</div>;
  else if (!file || !url || (isPdf && !nat)) content = <div className="zv-msg" aria-busy="true">…</div>;

  return (
    <div
      ref={box}
      className={`${mini ? "zv mini" : zoomed ? "zv zoomed" : "zv"}${mode !== "view" ? ` zv-${mode}` : ""}`}
      data-sf-gesture=""
      data-zoom={Math.round(level * 100) / 100}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {content}
      {!err && file && url ? (
        <div
          ref={stage}
          className="zv-stage"
          style={{ width: fw || undefined, height: fh || undefined, visibility: fit ? "visible" : "hidden" }}
        >
          {isPdf ? (
            <canvas ref={canvas} className="zv-page" role="img" aria-label={file.name} />
          ) : (
            <img
              className="zv-page"
              src={url}
              alt={file.name}
              draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
            />
          )}
          {renderOverlay && fit && nat ? renderOverlay({ page: pageNo, aspect: nat.h / nat.w }) : null}
        </div>
      ) : null}
      {!mini && fit ? (
        <div className="zv-ctl">
          {isPdf && pages > 1 ? (
            <>
              <button type="button" onClick={() => setPageNo((n) => Math.max(1, n - 1))} disabled={pageNo <= 1} aria-label={t("Vorherige Seite")}>▲</button>
              <span className="zv-pg">{t("Seite {n}/{m}", { n: pageNo, m: pages })}</span>
              <button type="button" onClick={() => setPageNo((n) => Math.min(pages, n + 1))} disabled={pageNo >= pages} aria-label={t("Nächste Seite")}>▼</button>
              <span className="zv-sep" aria-hidden="true" />
            </>
          ) : null}
          <button type="button" onClick={() => step(1 / 1.5)} disabled={!zoomed} aria-label={t("Verkleinern")}>−</button>
          <button type="button" className="zv-lvl" onClick={() => commit({ s: 1, tx: 0, ty: 0 }, true)} disabled={!zoomed} aria-label={t("Ganze Seite zeigen")} title={t("Ganze Seite zeigen")}>
            {zoomed ? fmtZoom(level) : t("Ganz")}
          </button>
          <button type="button" onClick={() => step(1.5)} disabled={level >= MAX_ZOOM - 0.01} aria-label={t("Vergrößern")}>+</button>
        </div>
      ) : null}
    </div>
  );
}

export const ZOOM_CSS = `
  .zv { position: relative; width: 100%; height: 100%; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; background: #0b0d0e; }
  .zv.mini { touch-action: auto; }
  .zv.zv-draw { cursor: crosshair; }
  .zv.zv-pin { cursor: copy; }
  .zv-stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; background: #fff; box-shadow: 0 0 0 1px #2f383d; }
  .zv-page { display: block; width: 100%; height: 100%; pointer-events: none; }
  .zv-msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #8a969c; padding: 16px; text-align: center; }
  .zv-ctl { position: absolute; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 3; display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 14px; border: 1px solid rgba(92,200,184,.5); background: rgba(22,26,29,.86); }
  .zv-ctl button { min-width: 44px; height: 44px; padding: 0 8px; border-radius: 10px; border: 0; background: transparent; color: #5cc8b8; font: 800 20px/1 Figtree, sans-serif; cursor: pointer; }
  .zv-ctl button:disabled { opacity: .35; cursor: default; }
  .zv-ctl button:focus-visible { outline: 2px solid #5cc8b8; outline-offset: 1px; }
  .zv-ctl .zv-lvl { min-width: 64px; font-size: 14px; letter-spacing: .04em; }
  .zv-pg { color: #f4f7f6; font: 700 13px Figtree, sans-serif; white-space: nowrap; padding: 0 2px; }
  .zv-sep { width: 1px; height: 24px; background: #2f383d; margin: 0 2px; }
`;
