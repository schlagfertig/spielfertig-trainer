import { useEffect, useState } from "react";

// Geteilter Homescreen: links Logo/Metronom, rechts die Menüpunkte.
// Querformat immer (iPhone, Duo, iPad). Hochkant nur beim Duo aufgeklappt
// (ca. 669 px breit). iPad hochkant (ab ca. 744 px) und iPhone/Duo
// zugeklappt hochkant bleiben einspaltig wie bisher.
export const HOME_SPLIT_MQ = "(orientation: landscape), (min-width: 640px) and (max-width: 736px) and (orientation: portrait)";

// Kurzes Querformat (iPhone 375–430 px hoch): Dial und Logo kleiner, damit beides passt.
export const HOME_COMPACT_DIAL_MQ = "(orientation: landscape) and (max-height: 500px)";

// Hochkant-Duo: typisch 669 px, mit Spielraum unter iPad-mini-Breite (744 px).
const DUO_PORT_MAX = 736;

export function isHomeSplit(w, h) {
  const width = Number(w);
  const height = Number(h);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width > height) return true;
  return width >= 640 && width <= DUO_PORT_MAX;
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
