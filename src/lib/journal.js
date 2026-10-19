// Journal (Labs): Hausaufgaben und Karteikasten - reine Logik ohne DOM, damit node --test es direkt laden kann.
// Speicher wie das Tagebuch über session.js: sf.v1.homework und sf.v1.karteikasten.
// Hausaufgabe = Übung + ihre Einstellungen (view, preset für open(), sessions = gespeicherte Modul-Einstellungen).

export const HW_KEY = "homework";
export const CARD_KEY = "karteikasten";
export const MAX_ITEMS = 60;
export const CARD_LEVELS = [
  { id: "neu", label: "Neu" },
  { id: "uebe", label: "Übe ich" },
  { id: "sitzt", label: "Sitzt" },
];
const LEVEL_IDS = CARD_LEVELS.map((l) => l.id);
// Kein Rudiment-Würfel (Tom, 19.10.): alte gespeicherte Würfel-Einträge fallen beim Laden still heraus.
export const VIEW_OF = { rudiments: "rudiments", click: "click", pyramid: "pyramid", stick: "stick", first: "first" };

// Eindeutiger Schlüssel einer Übung: gleiche Übung = gleiche Hausaufgabe (nochmal tippen nimmt sie wieder raus).
// Click-Trainer: je Modus eine eigene Hausaufgabe (Tempo halten, Tempo steigern, NoClick).
export function exKey(ex, item, clickMode) {
  if (ex === "click") return `click|${clickMode === "ramp" || clickMode === "noclick" ? clickMode : "hold"}`;
  if (ex === "rudiments" || ex === "stick" || ex === "first") return item == null ? ex : `${ex}|${item}`;
  return ex; // Pyramide: eine Hausaufgabe mit den zuletzt gemerkten Einstellungen
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function normalizeHw(raw) {
  const items = Array.isArray(raw?.items)
    ? raw.items.filter((x) => x && typeof x.key === "string" && VIEW_OF[x.ex]).map((x) => ({
      ...x, done: !!x.done, at: num(x.at), lastAt: num(x.lastAt), runs: num(x.runs),
    }))
    : [];
  return { v: 1, items };
}

export function findHw(list, key, { open = false } = {}) {
  return normalizeHw(list).items.find((x) => x.key === key && (!open || !x.done)) || null;
}

// entry: { key, ex, item, label, preset, sessions, info } → { list, added }
export function toggleHw(list, entry, at = Date.now()) {
  const base = normalizeHw(list);
  if (!VIEW_OF[entry?.ex]) return { list: base, added: false }; // keine Hausaufgabe für diese Übung (z. B. Würfel)
  if (base.items.some((x) => x.key === entry.key)) return { list: { v: 1, items: base.items.filter((x) => x.key !== entry.key) }, added: false };
  const item = { ...entry, view: VIEW_OF[entry.ex], done: false, at, lastAt: 0, runs: 0 };
  return { list: { v: 1, items: [item, ...base.items].slice(0, MAX_ITEMS) }, added: true };
}

export function setHwDone(list, key, done, at = Date.now()) {
  const base = normalizeHw(list);
  return { v: 1, items: base.items.map((x) => (x.key === key ? { ...x, done: !!done, doneAt: done ? at : 0 } : x)) };
}

export function removeHw(list, key) {
  const base = normalizeHw(list);
  return { v: 1, items: base.items.filter((x) => x.key !== key) };
}

// Offen zuerst (neueste oben), dann „sitzt“ (zuletzt abgehakt oben).
export function splitHw(list) {
  const items = normalizeHw(list).items;
  return {
    open: items.filter((x) => !x.done).sort((a, b) => b.at - a.at),
    done: items.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
  };
}

// Geübt (ab 30 s, wie das Tagebuch): letzte Übezeit merken.
export function notePractice(list, key, at = Date.now()) {
  const base = normalizeHw(list);
  let hit = false;
  const items = base.items.map((x) => {
    if (x.key !== key) return x;
    hit = true;
    return { ...x, lastAt: at, runs: x.runs + 1 };
  });
  return { list: { v: 1, items }, hit };
}

// ---- Karteikasten: Rudiments zum Dranbleiben ----
export function normalizeCards(raw) {
  const seen = new Set();
  const cards = [];
  for (const c of Array.isArray(raw?.cards) ? raw.cards : []) {
    const rud = Math.round(num(c?.rud, NaN));
    if (!Number.isFinite(rud) || rud < 1 || seen.has(rud)) continue;
    seen.add(rud);
    cards.push({ rud, level: LEVEL_IDS.includes(c.level) ? c.level : "neu", at: num(c.at), lastAt: num(c.lastAt) });
  }
  return { v: 1, cards };
}

export function hasCard(list, rud) {
  return normalizeCards(list).cards.some((c) => c.rud === rud);
}

export function toggleCard(list, rud, at = Date.now()) {
  const base = normalizeCards(list);
  if (base.cards.some((c) => c.rud === rud)) return { list: { v: 1, cards: base.cards.filter((c) => c.rud !== rud) }, added: false };
  return { list: { v: 1, cards: [{ rud, level: "neu", at, lastAt: 0 }, ...base.cards].slice(0, MAX_ITEMS) }, added: true };
}

export function addCard(list, rud, at = Date.now()) {
  return hasCard(list, rud) ? normalizeCards(list) : toggleCard(list, rud, at).list;
}

export function setCardLevel(list, rud, level) {
  const base = normalizeCards(list);
  if (!LEVEL_IDS.includes(level)) return base;
  return { v: 1, cards: base.cards.map((c) => (c.rud === rud ? { ...c, level } : c)) };
}

export function removeCard(list, rud) {
  const base = normalizeCards(list);
  return { v: 1, cards: base.cards.filter((c) => c.rud !== rud) };
}

export function noteCard(list, rud, at = Date.now()) {
  const base = normalizeCards(list);
  let hit = false;
  const cards = base.cards.map((c) => {
    if (c.rud !== rud) return c;
    hit = true;
    // Erstes Üben einer neuen Karte: „Neu“ → „Übe ich“ (Sitzt bleibt Sitzt).
    return { ...c, lastAt: at, level: c.level === "neu" ? "uebe" : c.level };
  });
  return { list: { v: 1, cards }, hit };
}

// Karten nach Stufe: erst „Übe ich“, dann „Neu“, dann „Sitzt“; innerhalb zuletzt geübt bzw. hinzugefügt zuerst.
export function sortCards(list) {
  const order = { uebe: 0, neu: 1, sitzt: 2 };
  return normalizeCards(list).cards.slice().sort((a, b) => order[a.level] - order[b.level] || Math.max(b.lastAt, b.at) - Math.max(a.lastAt, a.at));
}
