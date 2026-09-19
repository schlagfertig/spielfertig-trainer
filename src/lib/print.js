function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function printStyles(cols) {
  return `
    @page { size: A4 portrait; margin: 10mm; }
    html, body { margin: 0; background: #fff; color: #161a1d; font-family: Figtree, sans-serif; }
    .page {
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      gap: 8px;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .tile {
      border: 1.5px solid #5cc8b8;
      border-radius: 8px;
      padding: 8px 10px 10px;
      break-inside: avoid;
      page-break-inside: avoid;
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
  `;
}

export function sheetHtml(tiles, perPage = 6) {
  const cols = perPage <= 4 ? 1 : 2;
  const pages = chunk(tiles, perPage);
  const body = pages.map((page) =>
    `<section class="page">` +
    page.map(({ r, svg }) => `<article class="tile"><h2>${r.label}</h2>${svg.outerHTML}</article>`).join("") +
    `</section>`
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Spielfertig — Drucken</title>
    <style>${printStyles(cols)}</style></head><body>${body}</body></html>`;
}

export function printElement(html) {
  try {
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      window.setTimeout(() => {
        try { w.print(); } catch { /* ignore */ }
      }, 280);
      return "popup";
    }
  } catch { /* popup blocked */ }
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { /* ignore */ }
      window.setTimeout(() => iframe.remove(), 1500);
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

export async function tilesToPng(tiles, scale = 2, perPage = 6) {
  const rendered = [];
  for (const tile of tiles) rendered.push({ label: tile.r.label, canvas: await svgToPng(tile.svg, scale) });
  const cols = perPage <= 4 ? 1 : 2;
  const pages = chunk(rendered, perPage);
  const pageW = 1240;
  const pageH = 1754;
  const pad = 28;
  const gap = 16;
  const labelH = 28;
  const outH = pages.length * pageH + Math.max(0, pages.length - 1) * 24;
  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e6e8ea";
  ctx.fillRect(0, 0, pageW, outH);
  pages.forEach((page, pi) => {
    const top = pi * (pageH + 24);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, top, pageW, pageH);
    const rows = Math.ceil(page.length / cols);
    const cellW = (pageW - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (pageH - pad * 2 - gap * (rows - 1)) / rows;
    page.forEach((p, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = pad + c * (cellW + gap);
      const y = top + pad + r * (cellH + gap);
      ctx.strokeStyle = "#5cc8b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
      ctx.fillStyle = "#0b3d38";
      ctx.font = "700 18px Oswald, sans-serif";
      ctx.fillText(p.label, x + 10, y + 24);
      const maxW = cellW - 20;
      const maxH = cellH - labelH - 16;
      const scaleFit = Math.min(maxW / p.canvas.width, maxH / p.canvas.height, 1);
      const dw = p.canvas.width * scaleFit;
      const dh = p.canvas.height * scaleFit;
      ctx.drawImage(p.canvas, x + 10, y + labelH + 8, dw, dh);
    });
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
