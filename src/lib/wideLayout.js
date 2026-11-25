import { useEffect, useState } from "react";

// Gemeinsame Schwelle für die breite Zweispalten-Ansicht:
// iPhone Duo aufgeklappt (quer 951×669 und hochkant 669×951) und iPad,
// nicht das normale iPhone und nicht das kurze Querformat.
export const WIDE_MQ = "(min-width: 640px) and (min-height: 560px)";

export function isWideLayout(w, h) {
  return Number(w) >= 640 && Number(h) >= 560;
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
