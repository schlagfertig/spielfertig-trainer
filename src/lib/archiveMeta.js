// WA-22: Metadaten fürs Noten-Archiv (Name + Tags), Suche/Filter/Sortierung.
// Rein funktional (kein DOM, kein IndexedDB) - damit per node --test prüfbar.

export const MAX_NAME_LEN = 80;
export const MAX_TAG_LEN = 24;
export const MAX_TAGS = 8;
export const SORTS = ["new", "old", "name"];

const clean = (s) => String(s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();

/** Vergleichsschlüssel: klein, ß→ss, ohne Akzente/Umlaut-Punkte („Übung“ ≈ „ubung“). */
export function fold(s) {
  return clean(s).toLocaleLowerCase("de").replace(/ß/g, "ss").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Dateiname ohne Endung („Fill-Ideen.pdf“ → „Fill-Ideen“). */
export function baseName(fileName) {
  return clean(String(fileName || "").replace(/\.[^./\\]+$/, ""));
}

/** Tags aus Array oder „a, b; c“: getrimmt, ohne führendes #, ohne Dubletten (Groß/klein egal), begrenzt. */
export function normTags(input) {
  const arr = Array.isArray(input) ? input : String(input ?? "").split(/[,;\n]/);
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const tag = clean(clean(raw).replace(/^#+/, "")).slice(0, MAX_TAG_LEN).trim();
    if (!tag) continue;
    const k = fold(tag);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/**
 * Migration beim Lesen (alte Einträge haben nur `name`, keine `tags`):
 * Name bleibt wie gespeichert; fehlt er, dann Dateiname, sonst Fallback. Nichts anderes wird verändert.
 */
export function normalizeMeta(rec, fallback = "Blatt") {
  const name = clean(rec?.name).slice(0, MAX_NAME_LEN) || baseName(rec?.fileName) || fallback;
  return { ...rec, name, tags: normTags(rec?.tags) };
}

/** Neue Metadaten anwenden; leerer Name behält den bisherigen. */
export function applyMeta(rec, { name, tags } = {}) {
  const cur = normalizeMeta(rec);
  const n = clean(name).slice(0, MAX_NAME_LEN);
  return { ...rec, name: n || cur.name, tags: tags === undefined ? cur.tags : normTags(tags), metaV: 1 };
}

/** Alle vorhandenen Tags, häufigste zuerst, dann alphabetisch; Schreibweise des ersten Vorkommens. */
export function allTags(rows) {
  const map = new Map();
  for (const r of rows || []) {
    for (const tag of normTags(r?.tags)) {
      const k = fold(tag);
      const hit = map.get(k);
      if (hit) hit.count += 1;
      else map.set(k, { tag, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "de", { sensitivity: "base", numeric: true }));
}

/** Vorschläge für den Dialog: vorhandene Tags, die das Blatt noch nicht hat, passend zur Eingabe. */
export function suggestTags(all, current, query = "", limit = 8) {
  const have = new Set(normTags(current).map(fold));
  const q = fold(query);
  return (all || [])
    .map((x) => (typeof x === "string" ? x : x.tag))
    .filter((tag) => !have.has(fold(tag)) && (!q || fold(tag).includes(q)))
    .slice(0, limit);
}

const byName = (a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base", numeric: true });

/** Suche (alle Wörter müssen in Name oder Tags vorkommen) + Tag-Filter + Sortierung. */
export function filterSheets(rows, { q = "", tag = "", sort = "new" } = {}) {
  const words = fold(q).split(" ").filter(Boolean);
  const tagK = fold(tag);
  const list = (rows || []).map((r) => normalizeMeta(r)).filter((r) => {
    const tags = r.tags.map(fold);
    if (tagK && !tags.includes(tagK)) return false;
    if (!words.length) return true;
    const hay = [fold(r.name), ...tags].join(" ");
    return words.every((w) => hay.includes(w));
  });
  const s = SORTS.includes(sort) ? sort : "new";
  if (s === "name") return list.sort((a, b) => byName(a, b) || (b.added || 0) - (a.added || 0));
  if (s === "old") return list.sort((a, b) => (a.added || 0) - (b.added || 0));
  return list.sort((a, b) => (b.added || 0) - (a.added || 0));
}

export function parseView(v) {
  return { sort: SORTS.includes(v?.sort) ? v.sort : "new" };
}
