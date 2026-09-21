import { BRAND, brandLine } from "./brand.js";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, size + i));
  return out;
}

export function todayDe() {
  try {
    return new Date().toLocaleDateString("de-DE");
  } catch {
    return "";
  }
}

export function printStyles(cols) {
  return `
    @page { size: A4 portrait; margin: 8mm; }
    html, body { margin: 0; background: #fff; color: #161a1d; font-family: Figtree, sans-serif; }
    .bar {
      position: sticky; top: 0; z-index: 2;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: #161a1d; color: #f4f7f6;
    }
    .bar button {
      background: #5cc8b8; color: #06120f; border: 0;
      border-radius: 8px; padding: 10px 16px;
      font: 800 15px Figtree, sans-serif;
    }
    .bar span { font: 700 13px Figtree, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: #8a969c; }
    .sheet { page-break-after: always; break-after: page; }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .head {
      display: flex; align-items: center; justify-content: space-between;
      background: #161a1d; color: #f4f7f6;
      padding: 10px 14px; margin: 0 0 10px; border-radius: 6px;
    }
    .head img { height: 28px; width: auto; display: block; }
    .head-meta { text-align: right; }
    .head-sec {
      font-family: Oswald, sans-serif; font-size: 16px; letter-spacing: 0.08em;
      text-transform: uppercase; color: #5cc8b8;
    }
    .head-date { font-size: 11px; color: #8a969c; margin-top: 2px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      gap: 8px;
    }
    .tile {
      border: 1.5px solid #5cc8b8;
      border-radius: 8px;
      padding: 8px 10px 10px;
      break-inside: avoid;
      background: #fff;
    }
    .tile h2 {
      font-family: Oswald, sans-serif;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0 0 6px;
      color: #0b3d38;
    }
    svg { width: 100%; height: auto; display: block; }
    .foot {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #5cc8b8;
      display: flex; justify-content: space-between; gap: 12px;
      font-size: 10px; letter-spacing: 0.04em; color: #5a666c;
    }
    @media print { .bar { display: none !important; } }
  `;
}

export function sheetHtml(tiles, perPage = 6, section = "Rudiments") {
  const cols = perPage <= 4 ? 1 : 2;
  const pages = chunk(tiles, perPage);
  const date = todayDe();
  const foot = brandLine();
  const body = pages.map((page, i) =>
    `<section class="sheet">
      <header class="head">
        <img src="${BRAND.logo}" alt="${BRAND.mark}" />
        <div class="head-meta">
          <div class="head-sec">${section}</div>
          <div class="head-date">${BRAND.product}${date ? " · " + date : ""}</div>
        </div>
      </header>
      <div class="grid">` +
    page.map(({ r, svg }) => `<article class="tile"><h2>${r.label}</h2>${svg.outerHTML}</article>`).join("") +
    `</div>
      <footer class="foot"><span>${foot}</span><span>${i + 1} / ${pages.length}</span></footer>
    </section>`
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND.product} — ${section}</title>
    <style>${printStyles(cols)}</style></head><body>
    <div class="bar">
      <button type="button" onclick="try{window.close()}catch(e){} if(!window.closed){history.back()}">Zurück</button>
      <span>Druckvorschau</span>
    </div>
    ${body}</body></html>`;
}

export function printElement(html) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("no frame");
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch { /* ignore */ }
      window.setTimeout(() => iframe.remove(), 1800);
    }, 280);
    return "iframe";
  } catch {
    return false;
  }
}

export async function svgToPng(svgEl, scale = 2) {
  const clone = svgEl.cloneNode(true);
  const vb = (svgEl.getAttribute("viewBox") || "0 0 800 160").split(/[\s,]+/).map(Number);
  const w = Math.max(1, vb[2] || svgEl.clientWidth || 800);
  const h = Math.max(1, vb[3] || svgEl.clientHeight || 160);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

async function loadLogo() {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = BRAND.logo;
    });
    return img;
  } catch {
    return null;
  }
}

export async function tilesToPng(tiles, scale = 2, perPage = 6, section = "Rudiments") {
  const rendered = [];
  for (const tile of tiles) rendered.push({ label: tile.r.label, canvas: await svgToPng(tile.svg, scale) });
  const logo = await loadLogo();
  const cols = perPage <= 4 ? 1 : 2;
  const pages = chunk(rendered, perPage);
  const pageW = 1240;
  const pageH = 1754;
  const pad = 28;
  const gap = 16;
  const headH = 88;
  const footH = 44;
  const labelH = 28;
  const outH = Math.max(pageH, pages.length * pageH + Math.max(0, pages.length - 1) * 24);
  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e6e8ea";
  ctx.fillRect(0, 0, pageW, outH);
  const foot = brandLine();
  pages.forEach((page, pi) => {
    const top = pi * (pageH + 24);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, top, pageW, pageH);
    ctx.fillStyle = "#161a1d";
    ctx.fillRect(pad, top + 16, pageW - pad * 2, 56);
    if (logo) {
      const lh = 32;
      const lw = (logo.width / Math.max(1, logo.height)) * lh;
      ctx.drawImage(logo, pad + 16, top + 28, lw, lh);
    }
    ctx.fillStyle = "#5cc8b8";
    ctx.font = "700 22px Oswald, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(section, pageW - pad - 16, top + 42);
    ctx.fillStyle = "#8a969c";
    ctx.font = "600 13px Figtree, sans-serif";
    ctx.fillText(`${BRAND.product} · ${todayDe()}`, pageW - pad - 16, top + 60);
    ctx.textAlign = "left";
    const rows = Math.ceil(page.length / cols) || 1;
    const areaTop = top + headH;
    const areaH = pageH - headH - footH - 8;
    const cellW = (pageW - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (areaH - gap * (rows - 1)) / rows;
    page.forEach((p, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = pad + c * (cellW + gap);
      const y = areaTop + r * (cellH + gap);
      ctx.strokeStyle = "#5cc8b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.fillStyle = "#0b3d38";
      ctx.font = "700 18px Oswald, sans-serif";
      ctx.fillText(p.label, x + 10, y + 24);
      const maxW = cellW - 20;
      const maxH = cellH - labelH - 16;
      const scaleFit = Math.min(maxW / p.canvas.width, maxH / p.canvas.height, 1);
      ctx.drawImage(p.canvas, x + 10, y + labelH + 8, p.canvas.width * scaleFit, p.canvas.height * scaleFit);
    });
    ctx.fillStyle = "#5cc8b8";
    ctx.fillRect(pad, top + pageH - 36, pageW - pad * 2, 1);
    ctx.fillStyle = "#5a666c";
    ctx.font = "600 13px Figtree, sans-serif";
    ctx.fillText(foot, pad, top + pageH - 16);
    ctx.textAlign = "right";
    ctx.fillText(`${pi + 1} / ${pages.length}`, pageW - pad, top + pageH - 16);
    ctx.textAlign = "left";
  });
  return canvas;
}

export async function deliverPng(canvas, name, mode = "share") {
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return false;
  const file = new File([blob], name, { type: "image/png" });
  if (mode !== "save" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return "share";
    } catch (e) {
      if (e && e.name === "AbortError") return false;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 800);
  return "save";
}
