// Bildaufbau fuer den Uebungs-Clip (720x1280, Hochformat fuer Reels/TikTok):
// Karte oben (Rudiments-Logo + aktuelle Uebung), Kamera darunter,
// Schlagfertig-Siegel unten rechts, Tempo-Plakette unten links.
// Statische Teile werden einmal in Offscreen-Canvas gerendert, pro Frame nur drawImage.

/** Kartenstil im Clip: "white" (helle Karte) oder "glass" (Liquid Glass). */
export const CLIP_CARD_STYLE = "glass";

export const CLIP_W = 720;
export const CLIP_H = 1280;
const M = 32;
const TEAL = "#5cc8b8";
const INK = "#161a1d";
const LIGHT = "#f4f7f6";
const CARD_W = CLIP_W - 2 * M;
const NOTE_H = 150;
const RUD_LOGO_H = 196;

function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Neutrale (schwarze/graue) Pixel hell faerben, Tuerkis bleibt – fuer dunkle Glas-Karten. */
function toLight(src, w, h) {
  const c = canvasOf(w, h);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, c.width, c.height);
  try {
    const data = g.getImageData(0, 0, c.width, c.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i];
      const gg = d[i + 1];
      const b = d[i + 2];
      if (gg - r < 36 && b - r < 36) {
        // schwarz/grau -> hell
        d[i] = 244; d[i + 1] = 247; d[i + 2] = 246;
      } else if (r * 0.3 + gg * 0.59 + b * 0.11 < 150) {
        // dunkles Tuerkis -> App-Tuerkis (lesbar auf dunklem Glas)
        d[i] = 92; d[i + 1] = 200; d[i + 2] = 184;
      }
    }
    g.putImageData(data, 0, 0);
  } catch { /* tainted – dann eben Original */ }
  return c;
}

/** Notenbild auf den sichtbaren Inhalt zuschneiden (SVG hat viel Leerraum). */
function trimmed(img) {
  const w = (img.width || 600) * 2;
  const h = (img.height || 200) * 2;
  const c = canvasOf(w, h);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, c.width, c.height);
  try {
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] > 24 && (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235)) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return c;
    const p = 8;
    x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p);
    x1 = Math.min(c.width - 1, x1 + p); y1 = Math.min(c.height - 1, y1 + p);
    const out = canvasOf(x1 - x0 + 1, y1 - y0 + 1);
    out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  } catch {
    return c;
  }
}

function fitFont(ctx, text, weight, size, family, maxW) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 14 && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${family}`;
  }
}

/** Einmalig: Siegel-Logo (rund, ohne Zusatz-Schriftzug) mit dunkler Unterlage, Rudiments-Logo. */
export async function prepareClipAssets(view, style = CLIP_CARD_STYLE) {
  const [seal, rud] = await Promise.all([
    loadImg("/logo.svg"),
    view === "rudiments" ? loadImg("/clip/rudiments-logo.png") : Promise.resolve(null),
  ]);
  const out = { seal: null, rud: null };
  if (seal) {
    const D = 400; // 2x fuer Schaerfe, gezeichnet mit ~200 px
    const c = canvasOf(D, D);
    const g = c.getContext("2d");
    g.beginPath();
    g.arc(D / 2, D / 2, D / 2 - 4, 0, Math.PI * 2);
    g.fillStyle = "rgba(14,18,20,0.78)";
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "rgba(92,200,184,0.55)";
    g.stroke();
    // logo.svg: 1280x1024, Siegel mittig; Quadrat 0.7*Breite um die Mitte enthaelt Ringe + Namenszug.
    const sw = seal.width || 1280;
    const sh = seal.height || 1024;
    const side = sw * 0.7;
    g.drawImage(seal, (sw - side) / 2, (sh - side) / 2, side, side, 10, 10, D - 20, D - 20);
    out.seal = c;
  }
  if (rud) {
    const h = RUD_LOGO_H * 2;
    const w = (rud.width / rud.height) * h;
    out.rud = style === "glass" ? toLight(rud, w, h) : (() => { const c = canvasOf(w, h); c.getContext("2d").drawImage(rud, 0, 0, c.width, c.height); return c; })();
  }
  return out;
}

function cardHeight(view, hasName, hasNotes) {
  const head = view === "rudiments" ? 24 + RUD_LOGO_H + 6 : 22 + 24;
  return head + (hasName ? 46 : 0) + 10 + (hasNotes ? NOTE_H + 22 : 8);
}

/** Karte (Logo + Uebung) als Bitmap; neu nur, wenn sich Uebung/Notenbild aendern. */
export function renderCard({ view, kicker, name, notation, assets, style = CLIP_CARD_STYLE }) {
  const label = String(name || "").toUpperCase();
  const kick = String(kicker || "").toUpperCase();
  // Ohne eigene Uebungsbezeichnung wird der Modul-Titel selbst zur grossen Zeile.
  const solo = view !== "rudiments" && (!label || label === kick);
  const hasName = solo ? !!kick : !!label;
  const H = cardHeight(view, hasName, !!notation) - (solo ? 24 : 0);
  const pad = 40; // Platz fuer Schatten/Glow
  const c = canvasOf(CARD_W + 2 * pad, H + 2 * pad);
  const g = c.getContext("2d");
  const x = pad;
  const y = pad;
  const glass = style === "glass";
  g.save();
  if (glass) {
    g.shadowColor = "rgba(92,200,184,0.42)";
    g.shadowBlur = 36;
    rr(g, x, y, CARD_W, H, 30);
    const fill = g.createLinearGradient(0, y, 0, y + H);
    fill.addColorStop(0, "rgba(255,255,255,0.24)");
    fill.addColorStop(0.45, "rgba(255,255,255,0.11)");
    fill.addColorStop(1, "rgba(92,200,184,0.14)");
    g.fillStyle = "rgba(20,28,32,0.55)";
    g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = fill;
    g.fill();
    // Glanzkante: oben hell, unten zart
    const edge = g.createLinearGradient(0, y, 0, y + H);
    edge.addColorStop(0, "rgba(255,255,255,0.75)");
    edge.addColorStop(0.35, "rgba(255,255,255,0.22)");
    edge.addColorStop(1, "rgba(92,200,184,0.55)");
    g.lineWidth = 2;
    g.strokeStyle = edge;
    g.stroke();
    // Spiegelung oben
    g.save();
    rr(g, x, y, CARD_W, H, 30);
    g.clip();
    const sheen = g.createLinearGradient(0, y, 0, y + 90);
    sheen.addColorStop(0, "rgba(255,255,255,0.22)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sheen;
    g.fillRect(x, y, CARD_W, 90);
    g.restore();
  } else {
    g.shadowColor = "rgba(0,0,0,0.38)";
    g.shadowBlur = 30;
    g.shadowOffsetY = 10;
    rr(g, x, y, CARD_W, H, 30);
    g.fillStyle = "#fbfcfc";
    g.fill();
  }
  g.restore();

  const text = glass ? LIGHT : INK;
  let cy = y;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  if (view === "rudiments" && assets?.rud) {
    const lh = RUD_LOGO_H;
    const lw = (assets.rud.width / assets.rud.height) * lh;
    g.drawImage(assets.rud, x + (CARD_W - lw) / 2, cy + 24, lw, lh);
    cy += 24 + lh + 6;
  } else if (solo) {
    cy += 22;
  } else {
    g.fillStyle = TEAL;
    g.font = "800 18px Figtree, sans-serif";
    g.letterSpacing = "3px";
    g.fillText(String(kicker || "").toUpperCase(), x + CARD_W / 2, cy + 22 + 18);
    g.letterSpacing = "0px";
    cy += 22 + 24;
  }
  if (hasName) {
    g.fillStyle = text;
    const line = solo ? kick : label;
    fitFont(g, line, 700, 36, "Oswald, Figtree, sans-serif", CARD_W - 56);
    g.fillText(line, x + CARD_W / 2, cy + 36);
    cy += 46;
  }
  g.fillStyle = glass ? "rgba(92,200,184,0.7)" : TEAL;
  g.fillRect(x + CARD_W / 2 - 36, cy + 2, 72, 3);
  cy += 10;
  if (notation) notation = trimmed(notation);
  if (notation) {
    const maxW = CARD_W - 48;
    const s = Math.min(maxW / notation.width, NOTE_H / notation.height);
    const w = notation.width * s;
    const h = notation.height * s;
    const src = glass ? toLight(notation, notation.width, notation.height) : notation;
    g.drawImage(src, x + (CARD_W - w) / 2, cy + (NOTE_H - h) / 2, w, h);
  }
  return { canvas: c, pad, h: H };
}

/** Hintergrund (einmal), abhaengig vom Stil. */
export function renderBackdrop(style = CLIP_CARD_STYLE) {
  const c = canvasOf(CLIP_W, CLIP_H);
  const g = c.getContext("2d");
  g.fillStyle = "#0d1113";
  g.fillRect(0, 0, CLIP_W, CLIP_H);
  const glow = g.createRadialGradient(CLIP_W * 0.5, 220, 20, CLIP_W * 0.5, 220, style === "glass" ? 560 : 460);
  glow.addColorStop(0, style === "glass" ? "rgba(92,200,184,0.38)" : "rgba(92,200,184,0.2)");
  glow.addColorStop(1, "rgba(92,200,184,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, CLIP_W, CLIP_H);
  if (style === "glass") {
    const low = g.createRadialGradient(CLIP_W * 0.15, CLIP_H * 0.95, 10, CLIP_W * 0.15, CLIP_H * 0.95, 520);
    low.addColorStop(0, "rgba(92,200,184,0.18)");
    low.addColorStop(1, "rgba(92,200,184,0)");
    g.fillStyle = low;
    g.fillRect(0, 0, CLIP_W, CLIP_H);
  }
  return c;
}

/** Ein Videobild. */
export function drawClipFrame(ctx, { backdrop, card, view, video, seal, dial }) {
  ctx.drawImage(backdrop, 0, 0);
  const cardH = card ? card.h : 0;
  const top = 40;
  if (card) ctx.drawImage(card.canvas, M - card.pad, top - card.pad);
  const cam = { x: M, y: top + cardH + 22, w: CARD_W, h: 0 };
  cam.h = CLIP_H - 40 - cam.y;
  ctx.save();
  rr(ctx, cam.x, cam.y, cam.w, cam.h, 30);
  ctx.fillStyle = "#050708";
  ctx.fill();
  ctx.clip();
  if (video && video.readyState >= 2 && video.videoWidth) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const s = Math.max(cam.w / vw, cam.h / vh);
    const sw = cam.w / s;
    const sh = cam.h / s;
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, cam.x, cam.y, cam.w, cam.h);
  }
  // zarter Verlauf unten, damit Logo und Tempo lesbar bleiben
  const shade = ctx.createLinearGradient(0, cam.y + cam.h - 260, 0, cam.y + cam.h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(cam.x, cam.y + cam.h - 260, cam.w, 260);
  ctx.restore();
  ctx.save();
  rr(ctx, cam.x, cam.y, cam.w, cam.h, 30);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();
  ctx.restore();

  // Siegel unten rechts
  const D = 196;
  if (seal) ctx.drawImage(seal, cam.x + cam.w - D - 18, cam.y + cam.h - D - 18, D, D);

  // Tempo unten links
  if (dial) {
    const r = 58;
    const cx = cam.x + 18 + r;
    const cy = cam.y + cam.h - 18 - r - (D - 2 * r) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = dial.beat ? "rgba(92,200,184,0.92)" : "rgba(14,18,20,0.78)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = dial.beat ? "#ffffff" : TEAL;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = dial.beat ? INK : LIGHT;
    ctx.font = "800 38px Figtree, sans-serif";
    ctx.fillText(String(dial.bpm), cx, cy + 10);
    ctx.font = "800 13px Figtree, sans-serif";
    ctx.fillStyle = dial.beat ? INK : TEAL;
    ctx.fillText("BPM", cx, cy + 32);
  }
}
