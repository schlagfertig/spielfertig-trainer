// No-Stick-Challenge: Bonus für Einsteiger – trommeln mit allem außer Sticks.
// Drei kurze Runden, jede mit einem zufälligen Haushalts-„Instrument“ und einem Muster aus dem Einstieg.
// Zählt nicht zum Fortschritt „Schritt n von 5“. Reines Datenmodul (ohne DOM), damit der Test es direkt laden kann.
// Texte sind deutsch (Schlüssel für t(), Übersetzungen in en.js).

// Haushalts-„Instrumente“: name, tip (so geht's), yay (Lob nach der Runde).
export const OBJECTS = [
  { id: "haende", emoji: "👐", name: "Deine Hände",
    tip: "Trommel flach mit den Händen auf deine Oberschenkel oder die Tischplatte. Locker aus dem Handgelenk – nicht hauen, federn lassen.",
    yay: "Hände-Groove: Du hast immer ein Instrument dabei." },
  { id: "kochloeffel", emoji: "🥄", name: "Zwei Kochlöffel",
    tip: "Hol dir zwei Kochlöffel aus der Küche und spiel auf einem Kissen oder einem Topfdeckel. Halt sie locker zwischen Daumen und Zeigefinger.",
    yay: "Küchen-Groove freigeschaltet!" },
  { id: "schuhe", emoji: "👟", name: "Zwei Schuhe",
    tip: "Schnapp dir zwei Schuhe, nimm sie an der Ferse und trommel mit den Sohlen auf einen Karton oder den Teppich. Klingt dumpf – groovt trotzdem.",
    yay: "Mit Schuhen im Takt – das macht dir so schnell keiner nach." },
  { id: "staebchen", emoji: "🥢", name: "Zwei Essstäbchen",
    tip: "Essstäbchen sind fast Mini-Sticks. Spiel leise auf einem Buch und hör genau hin: Klingen beide Hände gleich?",
    yay: "Sushi-Groove: fein und genau." },
  { id: "stifte", emoji: "✏️", name: "Zwei Stifte",
    tip: "Zwei Stifte, ein Notizblock – fertig ist dein Reise-Pad. Spiel ganz locker aus den Fingern, die Stifte dürfen zurückfedern.",
    yay: "Dein Schreibtisch groovt jetzt mit." },
  { id: "finger", emoji: "☝️", name: "Deine Zeigefinger",
    tip: "Nur die Zeigefinger auf der Tischkante: leise wie eine Maus, aber genau auf dem Klick.",
    yay: "Leise, aber punktgenau – stark!" },
  { id: "zeitung", emoji: "📰", name: "Zwei Zeitungsrollen",
    tip: "Roll zwei Zeitungen oder Prospekte fest zusammen und spiel damit auf ein Sofakissen. Schön satt in die Mitte!",
    yay: "Papier-Power: Das hat richtig Wumms." },
  { id: "bananen", emoji: "🍌", name: "Zwei Bananen",
    tip: "Ja, wirklich: zwei Bananen! Tipp ganz sanft auf den Tisch – du spürst den Puls, und das Obst bleibt heil.",
    yay: "Bananen-Beat gemeistert – und alles bleibt heil." },
];

// Muster aus dem Einstieg (ein Schlag pro Klick), in fester, leichter Reihenfolge.
export const ROUNDS = [
  { id: "einzel", title: "Einzelschläge", sticking: ["R", "L"], accent: [], bpm: 70, sec: 40 },
  { id: "doppel", title: "Doppelschläge", sticking: ["R", "R", "L", "L"], accent: [], bpm: 60, sec: 40 },
  { id: "akzent", title: "Akzent auf der Eins", sticking: ["R", "L", "R", "L"], accent: [0], bpm: 80, sec: 45 },
];

export const BPM_MIN = 50;
export const BPM_MAX = 100;
export const clampBpm = (b) => Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number(b) || 0)));

const byId = (id) => OBJECTS.find((o) => o.id === id);

// Zufälliges Objekt, das nicht in exclude (Liste von ids) steht.
export function pickObject(exclude = [], rnd = Math.random) {
  const pool = OBJECTS.filter((o) => !exclude.includes(o.id));
  const list = pool.length ? pool : OBJECTS;
  return list[Math.floor(rnd() * list.length) % list.length];
}

// Neue Challenge: drei Runden, jede mit einem anderen Objekt.
export function newChallenge(rnd = Math.random) {
  const used = [];
  return ROUNDS.map((r) => {
    const o = pickObject(used, rnd);
    used.push(o.id);
    return { ...r, obj: o.id };
  });
}

// „Neu würfeln“: nur das Objekt der Runde i wechselt – nie auf eins, das schon in der Challenge vorkommt.
export function reroll(rounds, i, rnd = Math.random) {
  const used = rounds.map((r) => r.obj);
  const o = pickObject(used, rnd);
  return rounds.map((r, k) => (k === i ? { ...r, obj: o.id } : r));
}

// Tempo der Runde i ändern (SpinDial), begrenzt auf ein ruhiges Einsteiger-Tempo.
export function setRoundBpm(rounds, i, bpm) {
  return rounds.map((r, k) => (k === i ? { ...r, bpm: clampBpm(bpm) } : r));
}

export const objectOf = (round) => byId(round.obj) || OBJECTS[0];
