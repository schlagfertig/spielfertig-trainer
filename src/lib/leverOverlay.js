// Hebel und Richtungspfeile: Koordinaten vom Viewport in den Overlay-Kasten umrechnen.
// Nicht window.innerWidth/100vw verwenden – bei transformierten Vorfahren
// (z. B. .hero mit translateX) sitzt position:fixed sonst schief, und
// 100vw kann von innerWidth abweichen.
export function toOverlayCoords(cx, cy, x, y, box) {
  const left = Number(box?.left) || 0;
  const top = Number(box?.top) || 0;
  return {
    cx: cx - left,
    cy: cy - top,
    x: x - left,
    y: y - top,
  };
}

export function overlayViewBox(box) {
  const width = Math.max(1, Number(box?.width) || 0);
  const height = Math.max(1, Number(box?.height) || 0);
  return { width, height, viewBox: `0 0 ${width} ${height}` };
}
