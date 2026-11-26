import { useEffect, useState } from "react";
import { isWideLayout } from "./wideLayout.js";

// Gemeinsame Landschafts-Tokens für das SpinDial (Click-Trainer, Rhythmuspyramide,
// Rudiments und spätere Übungen). Werte müssen zu src/styles-dial.css passen.
export const DIAL_LAND_MAIN_MAX = 880;
export const DIAL_LAND_SETTINGS_COL = 340;
export const DIAL_LAND_COL_GAP = 16;
export const DIAL_LAND_COL_GAP_COMPACT = 12;
export const DIAL_LAND_COL_WIDTH = DIAL_LAND_MAIN_MAX - DIAL_LAND_SETTINGS_COL - DIAL_LAND_COL_GAP; // 524
export const DIAL_LAND_HEADER_STACK = 145;
export const DIAL_LAND_PAGE_PAD_X = 12;
export const DIAL_LAND_PAGE_PAD_TOP = 6;
export const DIAL_LAND_PAGE_PAD_TOP_COMPACT = 4;

// Kreisgröße nach verfügbarer Höhe: groß auf normalen Phones, kleiner auf kurzen Screens / Querformat.
// Breite Ansicht (jedes Querformat ab 640 px): Rad links, etwas größer; auf kurzem iPhone-Querformat kleiner, damit nichts abgeschnitten wird.
export function dialSizeFor(h, w = 9999) {
  if (isWideLayout(w, h)) {
    if (h <= 500) {
      const cap = h <= 400 ? 108 : 120;
      return Math.max(96, Math.min(cap, Math.round(h * 0.28), Math.round(w * 0.26)));
    }
    const side = Math.min(390, Math.max(300, Math.round(w * 0.48)));
    return Math.max(124, Math.min(152, Math.round(h * 0.22), side - 200));
  }
  const byH = h <= 480 ? 112 : h <= 720 ? 128 : 140;
  return Math.max(96, Math.min(byH, w - 252));
}

export function useDialSize() {
  const [size, setSize] = useState(() =>
    dialSizeFor(
      typeof window !== "undefined" ? window.innerHeight : 844,
      typeof window !== "undefined" ? window.innerWidth : 9999,
    ),
  );
  useEffect(() => {
    const on = () => setSize(dialSizeFor(window.innerHeight, window.innerWidth));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}
