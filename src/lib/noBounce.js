// Seiten fest verankern: kein Gummiband-/Bounce-Effekt und kein Pull-to-refresh (auch iOS-Home-Bildschirm).
// CSS (overscroll-behavior: none) deckt moderne Browser ab. Für ältere iOS-Versionen, die das am
// Dokument ignorieren, fängt dieser Wächter senkrechte Wischbewegungen ab, die nichts mehr scrollen könnten:
//  – Seite passt ganz auf den Bildschirm → senkrecht wischen tut nichts,
//  – Seite ist oben/unten am Ende → kein Überziehen,
//  – html.sf-scroll-lock (z. B. Hand Control während der Click läuft) → gar kein Wischen,
//  – offene Dialoge/Vollbild (aria-modal) → nur deren eigene Scrollbereiche.
// Waagerechte Gesten (Zurück-Wischen, Noten blättern), Zwei-Finger-Zoom und das Tempo-Rad
// (touch-action: none, Pointer-Events) bleiben unberührt.

function scrollBox(el, stop) {
  for (let n = el; n && n !== stop && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    if (n.scrollHeight > n.clientHeight + 1) {
      const oy = getComputedStyle(n).overflowY;
      if (oy === "auto" || oy === "scroll") return n;
    }
  }
  return null;
}

// Kann `box` in Fingerrichtung noch scrollen? dy > 0 = Finger nach unten = Inhalt nach oben scrollen.
function canScroll(top, max, dy) {
  if (dy > 0) return top > 0;
  if (dy < 0) return top < max - 1;
  return true;
}

export function installNoBounce() {
  if (typeof window === "undefined" || window.__sfNoBounce) return;
  window.__sfNoBounce = true;
  let lastX = 0;
  let lastY = 0;
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1 || !e.cancelable) return;
    const tp = e.touches[0];
    const dx = tp.clientX - lastX;
    const dy = tp.clientY - lastY;
    lastX = tp.clientX;
    lastY = tp.clientY;
    if (Math.abs(dx) > Math.abs(dy)) return; // waagerecht: nicht unsere Sache
    const target = e.target instanceof Element ? e.target : null;
    const de = document.documentElement;
    const modal = target?.closest('[aria-modal="true"]');
    if (!modal && de.classList.contains("sf-scroll-lock")) { e.preventDefault(); return; }
    const box = target ? scrollBox(target, modal ? modal.parentElement : null) : null;
    if (box) {
      if (!canScroll(box.scrollTop, box.scrollHeight - box.clientHeight, dy)) e.preventDefault();
      return;
    }
    if (modal) { e.preventDefault(); return; }
    const max = de.scrollHeight - window.innerHeight;
    if (max <= 0 || !canScroll(window.scrollY, max, dy)) e.preventDefault();
  }, { passive: false });
}
