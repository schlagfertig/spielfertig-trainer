import { useEffect, useState } from "react";

// Gemeinsame Schwelle für die breite Zweispalten-Ansicht im Click-Trainer:
// jedes Querformat ab 640 px Breite (iPhone, Duo, iPad). Das SpinDial sitzt links,
// die Einstellungen rechts. Hochkant bleibt einspaltig (Rad unter den Einstellungen),
// auch auf dem aufgeklappten Duo.
export const WIDE_MQ = "(min-width: 640px) and (orientation: landscape)";

// Kurzes Querformat (iPhone typisch 375–430 px hoch): kleineres Rad, engerer Abstand.
export const WIDE_COMPACT_MQ = "(min-width: 640px) and (orientation: landscape) and (max-height: 500px)";

export function isWideLayout(w, h) {
  const width = Number(w);
  const height = Number(h);
  return width >= 640 && width > height;
}

export function isWideCompact(w, h) {
  const width = Number(w);
  const height = Number(h);
  return width >= 640 && width > height && height <= 500;
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
