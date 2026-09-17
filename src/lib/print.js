export async function svgToPng(svgEl, scale = 2) {
  const clone = svgEl.cloneNode(true);
  const vb = (svgEl.getAttribute("viewBox") || "0 0 800 160").split(/[\s,]+/).map(Number);
  const w = Math.max(1, vb[2] || svgEl.clientWidth || 800);
  const h = Math.max(1, vb[3] || svgEl.clientHeight || 160);
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#161A1D";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

export async function tilesToPng(tiles, scale = 2) {
  const pages = [];
  for (const tile of tiles) pages.push({ label: tile.r.label, canvas: await svgToPng(tile.svg, scale) });
  const pad = 28;
  const labelH = 36;
  const width = Math.max(...pages.map((p) => p.canvas.width), 800) + pad * 2;
  const height = pages.reduce((s, p) => s + p.canvas.height + labelH + pad, pad);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#161A1D";
  ctx.fillRect(0, 0, width, height);
  let y = pad;
  pages.forEach((p) => {
    ctx.fillStyle = "#5CC8B8";
    ctx.font = "700 22px Oswald, sans-serif";
    ctx.fillText(p.label, pad, y + 22);
    y += labelH;
    ctx.drawImage(p.canvas, pad, y);
    y += p.canvas.height + pad;
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
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return false;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export function printElement(html) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>Drucken</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      body { margin: 0; background: #161A1D; color: #f4f7f6; font-family: Figtree, sans-serif; }
      .sheet { display: grid; gap: 8px; }
    </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 250);
  return true;
}
