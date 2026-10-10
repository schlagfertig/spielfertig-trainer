// Einstieg für absolute Anfänger: kurze Reihe sehr leichter Übungen nach der „Ersten Übung“.
// Reines Datenmodul ohne DOM-Import, damit der Test es direkt mit node laden kann.
// Texte sind deutsch (Schlüssel für t(), Übersetzungen in en.js).
//
// Jede Übung = ein Schlag pro Klick. sticking: Folge der Hände, wiederholt sich; accent: Index-Liste betonter Schläge.
// Tempo: fest (bpm + sec) oder als Welle (wave: von → bis → zurück, step BPM alle bars Takte).

export const STEPS = [
  {
    id: "puls",
    title: "Im Puls bleiben",
    head: "Eine Minute im Puls bleiben",
    text: "Du hörst einen gleichmäßigen Klick - 80 Schläge pro Minute, das ist ein ruhiges Gehtempo. Bei jedem Klick ein Schlag auf dem Pad. Nicht schneller werden.",
    lead: "Leg einfach los: Spiel eine Minute zum Click - ganz ohne Vorwissen.",
    done: "Eine Minute gehalten.",
    bpm: 80, sec: 60, sticking: ["R", "L"], accent: [],
  },
  {
    id: "doppel",
    title: "Doppelschläge",
    head: "Zweimal rechts, zweimal links",
    text: "Jetzt spielt jede Hand zwei Schläge hintereinander: rechts, rechts, links, links. Ein Schlag pro Klick, 60 BPM - ganz ruhig. Lass den Stock locker zurückfedern, dann klingen beide Schläge gleich laut.",
    lead: "Spiel RRLL ganz langsam zum Click - jede Hand zwei Schläge.",
    done: "Deine Doppelschläge laufen.",
    bpm: 60, sec: 90, sticking: ["R", "R", "L", "L"], accent: [],
  },
  {
    id: "welle",
    title: "Tempo-Welle",
    head: "Mit dem Tempo mitgehen",
    text: "Der Click startet bei 60 BPM und wird alle zwei Takte ein kleines bisschen schneller - bis 90 BPM. Danach geht es genauso sanft zurück auf 60. Spiel abwechselnd rechts und links und geh einfach mit. Der Pfeil zeigt dir, wohin es gerade geht.",
    lead: "Werde mit dem Click langsam schneller - von 60 auf 90 BPM und wieder zurück.",
    done: "Welle geritten.",
    wave: { from: 60, to: 90, step: 3, bars: 2 }, sticking: ["R", "L"], accent: [],
  },
  {
    id: "akzent",
    title: "Akzent auf der Eins",
    head: "Spiel die Eins lauter",
    text: "Jeder vierte Schlag ist die Eins - spiel ihn etwas lauter, die anderen drei ganz leise. Die Eins hörst du im Click als hellen Ton, und oben siehst du sie mit „>“ markiert. 70 BPM, abwechselnd rechts und links.",
    lead: "Spiel die Eins lauter, die anderen Schläge leise - so hörst du den Takt.",
    done: "Die Eins sitzt.",
    bpm: 70, sec: 90, sticking: ["R", "L", "R", "L"], accent: [0],
  },
  {
    id: "wechsel",
    title: "Einzel & Doppel",
    head: "Einzel- und Doppelschläge im Wechsel",
    text: "Ein Takt Einzelschläge, ein Takt Doppelschläge: R L R L, dann R R L L - immer im Wechsel. 70 BPM, ein Schlag pro Klick. Achte auf den Übergang: Das Tempo bleibt gleich.",
    lead: "Ein Takt RLRL, ein Takt RRLL - im Wechsel, ohne aus dem Tempo zu fallen.",
    done: "Einstieg geschafft!",
    bpm: 70, sec: 120, sticking: ["R", "L", "R", "L", "R", "R", "L", "L"], accent: [],
  },
];

export const BEGINNER_KEY = "beginner";
const BEAT = 4; // Schläge pro Takt

export const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);

// Tempo pro Stufe der Welle: 60, 63 … 90 … 63, 60 (Gipfel nur einmal).
export function waveLevels({ from, to, step }) {
  const up = [];
  for (let b = from; b < to; b += step) up.push(b);
  up.push(to);
  return [...up, ...up.slice(0, -1).reverse()];
}

// Tempo für jeden einzelnen Schlag (Länge = Anzahl der Schläge der Übung).
// Feste Übungen: auf ganze Takte und ganze Durchgänge der Handfolge aufgerundet.
export function tempoPlan(step) {
  if (step.wave) {
    const per = step.wave.bars * BEAT;
    return waveLevels(step.wave).flatMap((b) => Array(per).fill(b));
  }
  const unit = Math.max(BEAT, step.sticking.length);
  const n = Math.ceil((step.sec * step.bpm) / 60 / unit) * unit;
  return Array(n).fill(step.bpm);
}

// Dauer in Sekunden (Summe der Schlagabstände).
export const planSeconds = (plan) => plan.reduce((s, b) => s + 60 / b, 0);

// Richtung der Welle am Schlag i: "up" | "peak" | "down" | null (feste Übung).
export function waveDir(plan, i) {
  if (!plan.length) return null;
  const top = Math.max(...plan);
  const low = Math.min(...plan);
  if (top === low) return null;
  const k = Math.max(0, Math.min(plan.length - 1, i));
  if (plan[k] === top) return "peak";
  const firstTop = plan.indexOf(top);
  return k < firstTop ? "up" : "down";
}

// Fortschritt: { done: ["puls", …] }. Alte Speicherung „firstLesson.done“ zählt als Schritt 1.
export function doneSet(saved, firstLessonDone = false) {
  const ids = new Set(Array.isArray(saved?.done) ? saved.done.filter((id) => stepIndex(id) >= 0) : []);
  if (firstLessonDone) ids.add(STEPS[0].id);
  return ids;
}

export function markDone(saved, id) {
  const ids = doneSet(saved);
  if (stepIndex(id) >= 0) ids.add(id);
  return { done: STEPS.map((s) => s.id).filter((x) => ids.has(x)) };
}

// Nächste noch nicht erledigte Übung (Index) oder -1, wenn alle geschafft sind.
export function nextIndex(done) {
  return STEPS.findIndex((s) => !done.has(s.id));
}

// Kurzinfo „60 BPM · 1½ Min“ bzw. „60-90 BPM · 2½ Min“ (Minuten auf halbe gerundet).
export function stepMeta(step) {
  const plan = tempoPlan(step);
  const half = Math.max(1, Math.round((planSeconds(plan) / 60) * 2));
  const min = `${Math.floor(half / 2) || ""}${half % 2 ? "½" : ""}`;
  const bpm = step.wave ? `${step.wave.from}-${step.wave.to}` : String(step.bpm);
  return { bpm, min };
}
