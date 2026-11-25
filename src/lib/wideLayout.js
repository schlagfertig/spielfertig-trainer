import { useEffect, useState } from "react";

// Gemeinsame Schwelle für die breite Zweispalten-Ansicht:
// nur Querformat, und nur wenn genug Breite und Höhe da sind
// (iPhone Duo aufgeklappt quer 951×669, iPad quer).
// Hochkant und kurzes Querformat bleiben im einspaltigen Layout (Rad unter den Einstellungen).
export const WIDE_MQ = "(min-width: 640px) and (min-height: 560px) and (orientation: landscape)";

export function isWideLayout(w, h) {
  const width = Number(w);
  const height = Number(h);
  return width >= 640 && height >= 560 && width > height;
}

export function useWideLayout() {
  const [wide, setWide] = useState(() => (
    typeof window !== "undefined" && !!window.matchMedia?.(WIDE_MQ).matches
  ));
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_MQ);
    if (!mq) return undefined;
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return wide;
}
