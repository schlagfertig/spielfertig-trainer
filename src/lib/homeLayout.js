import { useEffect, useState } from "react";

// Geteilter Homescreen: links Logo/Metronom, rechts die Menüpunkte.
// Querformat immer (auch iPhone und flaches Duo), außerdem hohe schmale
// Geräte ab 640 px Breite (Duo aufgeklappt hochkant, iPad hochkant).
// iPhone hochkant und Duo zugeklappt hochkant bleiben einspaltig.
export const HOME_SPLIT_MQ = "(orientation: landscape), (min-width: 640px)";

// Kurzes Querformat (iPhone 375–430 px hoch): Dial und Logo kleiner, damit beides passt.
export const HOME_COMPACT_DIAL_MQ = "(orientation: landscape) and (max-height: 500px)";

export function isHomeSplit(w, h) {
  const width = Number(w);
  const height = Number(h);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return width > height || width >= 640;
}

export function isCompactHomeDial(w, h) {
  const width = Number(w);
  const height = Number(h);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return width > height && height <= 500;
}

function useMatch(mq) {
  const [on, setOn] = useState(() => (
    typeof window !== "undefined" && !!window.matchMedia?.(mq).matches
  ));
  useEffect(() => {
    const m = window.matchMedia?.(mq);
    if (!m) return undefined;
    const onChange = () => setOn(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [mq]);
  return on;
}

export function useHomeSplit() {
  return useMatch(HOME_SPLIT_MQ);
}

export function useCompactHomeDial() {
  return useMatch(HOME_COMPACT_DIAL_MQ);
}
