// Notation eines Schlags in „Meine Grooves“ (vier 16tel-Positionen 0–3, alle Stimmen zusammen).
// Reines Datenmodul ohne DOM/JSX, damit der Test es direkt mit node laden kann.
//
// Dauer einer Note = Abstand zur nächsten belegten Position im Schlag (bzw. bis zum Schlagende):
// 1 = 16tel, 2 = Achtel, 3 = punktierte Achtel, 4 = Viertel.
// Ergebnis:
//   rests  – Pausen vor der ersten Note: { kind: "4" | "8" | "16", pos }
//   notes  – { pos, dur, dot, flag: "" | "8" | "16" } (Fähnchen nur bei einer einzelnen Note im Schlag)
//   beam   – [erste, letzte] Position des Hauptbalkens (ab zwei Noten), sonst null
//   sub    – zweite Balken zwischen aufeinanderfolgenden 16teln: [[von, bis], …]
//   stubs  – kurze 16tel-Balken an einzelnen 16teln: { pos, dir } (1 = nach rechts, -1 = nach links)
export function beatLayout(positions) {
  const P = [...new Set(positions)].filter((p) => p >= 0 && p < 4).sort((a, b) => a - b);
  if (!P.length) return { empty: true, rests: [{ kind: "4", pos: 0 }], notes: [], beam: null, sub: [], stubs: [] };
  const notes = P.map((pos, k) => {
    const dur = (k + 1 < P.length ? P[k + 1] : 4) - pos;
    return { pos, dur, dot: dur === 3, flag: "" };
  });
  const lead = P[0];
  const rests = lead === 1 ? [{ kind: "16", pos: 0 }]
    : lead === 2 ? [{ kind: "8", pos: 0 }]
    : lead === 3 ? [{ kind: "8", pos: 0 }, { kind: "16", pos: 2 }]
    : [];
  if (notes.length === 1) {
    const n = notes[0];
    n.flag = n.dur === 1 ? "16" : n.dur < 4 ? "8" : "";
    return { empty: false, rests, notes, beam: null, sub: [], stubs: [] };
  }
  // 16tel folgen immer direkt aufeinander (Dauer 1 = nächste Note eine Position weiter).
  // Zwei oder mehr in Folge teilen einen zweiten Balken; eine einzelne 16tel bekommt einen
  // kurzen Balken – am Anfang des Schlags nach rechts, sonst nach links.
  const sub = [];
  const stubs = [];
  let run = [];
  const flush = () => {
    if (run.length >= 2) sub.push([run[0], run[run.length - 1]]);
    else if (run.length === 1) stubs.push({ pos: run[0], dir: run[0] === lead ? 1 : -1 });
    run = [];
  };
  notes.forEach((n) => {
    if (n.dur === 1) run.push(n.pos);
    else flush();
  });
  flush();
  return { empty: false, rests, notes, beam: [lead, P[P.length - 1]], sub, stubs };
}
