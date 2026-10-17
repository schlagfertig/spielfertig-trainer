// „Neu in Schlagfertig“: reine Logik ohne DOM.
// Einmal pro Minor-/Major-Wechsel (1.0 → 1.1, 1.x → 2.0), nicht bei Patch (1.1.0 → 1.1.1), nicht beim allerersten Start.

export function minorKey(v) {
  const m = /^(\d+)\.(\d+)/.exec(String(v || ""));
  return m ? `${Number(m[1])}.${Number(m[2])}` : "";
}

// → { show, record }: record = Version, die als „gesehen“ gespeichert werden soll (null = nichts ändern).
// lastSeen leer = erster Start: nur merken. Ohne Highlights für die neue Minor-Version: still merken.
export function decideWhatsNew({ lastSeen, current, highlights = {} }) {
  const cur = minorKey(current);
  if (!cur) return { show: false, record: null };
  if (!lastSeen) return { show: false, record: current };
  if (minorKey(lastSeen) === cur) return { show: false, record: lastSeen === current ? null : current };
  if (!highlights[cur]) return { show: false, record: current };
  return { show: true, record: null }; // gespeichert wird erst, wenn das Popup wirklich gezeigt wurde
}
