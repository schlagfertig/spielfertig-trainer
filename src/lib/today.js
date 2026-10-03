// „Heute“-Karte auf der Startseite: feste Mini-Pläne (kein Timer, keine Haken).
// Jeder Schritt öffnet ein Modul mit passenden Startwerten (preset).
// Reines Datenmodul ohne DOM-Import, damit der Test es direkt mit node laden kann.
// Texte sind deutsch; die Karte übersetzt sie mit t() (Schlüssel in en.js).

export const PLANS = [
  {
    id: "A",
    title: "Grundlagen",
    steps: [
      { min: 5, label: "Puls halten", detail: "Click-Trainer · 80 BPM", view: "click", preset: { bpm: 80 } },
      { min: 5, label: "Pyramide", detail: "4tel bis 32tel · 60 BPM", view: "pyramid", preset: { bpm: 60 } },
      { min: 10, label: "Hand Control", detail: "ab Übung 1 · 70 BPM", view: "stick", preset: { bpm: 70, ex: 1 } },
    ],
  },
  {
    id: "B",
    title: "Rudiments",
    steps: [
      { min: 5, label: "Puls halten", detail: "Click-Trainer · 70 BPM", view: "click", preset: { bpm: 70 } },
      { min: 10, label: "Single Paradiddle", detail: "Rudiments · 70 BPM", view: "rudiments", preset: { rud: 16, bpm: 70 } },
      { min: 5, label: "Double Stroke Roll", detail: "Rudiments · 60 BPM", view: "rudiments", preset: { rud: 6, bpm: 60 } },
    ],
  },
  {
    id: "C",
    title: "Kurz",
    steps: [
      { min: 1, label: "Erste Übung", detail: "im Click bleiben · 80 BPM", view: "first", preset: null },
      { min: 6, label: "Single Stroke Roll", detail: "Rudiments · 70 BPM", view: "rudiments", preset: { rud: 1, bpm: 70 } },
    ],
  },
];

export const planMinutes = (plan) => plan.steps.reduce((s, x) => s + x.min, 0);

export function dayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

// Vorschlag nach Wochentag (Mo A, Di B, Mi C, Do A …); eine eigene Wahl gilt bis Tagesende.
export function pickPlanId(d = new Date(), saved = {}) {
  if (saved && saved.day === dayKey(d) && PLANS.some((p) => p.id === saved.plan)) return saved.plan;
  const monFirst = (new Date(d).getDay() + 6) % 7;
  return PLANS[monFirst % PLANS.length].id;
}
