export async function svgToPng(svgEl, scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.width * scale);
  canvas.height = Math.max(1, img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#161A1D";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

export async function deliverPng(canvas, name, mode = "share") {
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  const file = new File([blob], name, { type: "image/png" });
  if (mode !== "save" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export function printElement(html) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>Druck</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      body { margin: 0; background: #161A1D; color: #f4f7f6; font-family: Figtree, sans-serif; }
      .sheet { display: grid; gap: 8px; }
    </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 250);
  return true;
}
