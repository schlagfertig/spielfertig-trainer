/** Kleines Lexikon. Nur beschreibende, übliche Begriffe. Keine erfundenen Personen oder Jahreszahlen. */

export const LEXICON = [
  {
    id: "akzent",
    term: "Akzent",
    text: "Ein Akzent ist ein Schlag, der lauter oder klarer ist als die anderen. In der Notation steht oft ein Keil darüber. Akzente geben einer Übung oder einem Groove eine Richtung, ohne dass sich die Notenwerte ändern.",
  },
  {
    id: "backbeat",
    term: "Backbeat",
    text: "Der Backbeat ist die Betonung auf Zählzeit 2 und 4 in einem geraden Takt. So klingt viel Rock, Pop und Funk. Die Snare spielt diese Schläge oft, der Bass liegt eher auf 1 und 3.",
  },
  {
    id: "downbeat",
    term: "Downbeat",
    text: "Der Downbeat ist der Schlag, der auf eine Zählzeit fällt, also auf 1, 2, 3 oder 4. Die 1 ist der erste Schlag des Taktes. Alles dazwischen ist nicht der Downbeat.",
  },
  {
    id: "fill",
    term: "Fill",
    text: "Ein Fill ist eine kurze Figur, die eine Lücke füllt, meist am Ende einer Phrase. Er führt in den nächsten Teil des Stücks. Danach geht es zurück in den Groove.",
  },
  {
    id: "flam",
    term: "Flam",
    text: "Ein Flam sind zwei Schläge fast gleichzeitig: ein leiser Vorschlag und ein Hauptschlag. Die Hände bleiben ungleich, eine ist knapp vorher. Der Flam ist auch ein Rudiment und macht einzelne Schläge dicker.",
  },
  {
    id: "four",
    term: "Four on the Floor",
    text: "Four on the Floor heißt: die Bassdrum auf jeder Viertel, also auf 1, 2, 3 und 4. Das gibt einen gleichmäßigen Puls, wie man ihn oft in Disco und House hört. Die Snare kann trotzdem auf 2 und 4 bleiben.",
  },
  {
    id: "ghost",
    term: "Ghost Note",
    text: "Eine Ghost Note ist ein sehr leiser Schlag zwischen den lauten. Sie ist noch da, soll aber fast verschwinden. In Grooves liegen Ghost Notes oft auf der Snare zwischen Backbeat und Akzenten. Die Herkunft des Wortes ist nicht eindeutig belegt.",
  },
  {
    id: "groove",
    term: "Groove",
    text: "Ein Groove ist ein Muster, das sich wiederholt und dem Stück sein Gefühl gibt. Dazu gehören Bassdrum, Snare und Hi-Hat oder Ride. Timing und Dynamik gehören dazu, nicht nur die richtigen Hände.",
  },
  {
    id: "hihat",
    term: "Hi-Hat",
    text: "Die Hi-Hat sind zwei Becken übereinander, die man mit dem Fuß schließt und öffnet. Zu spielt man sie mit dem Stock, oft als durchgehende Unterteilung. Offen klingt sie länger, geschlossen kurz und trocken.",
  },
  {
    id: "offbeat",
    term: "Offbeat",
    text: "Der Offbeat liegt zwischen den Zählzeiten. Im geraden Takt ist das oft das „und“ zwischen 1 und 2. Wer den Offbeat hört, hält den Puls, auch wenn der Downbeat gerade nicht gespielt wird.",
  },
  {
    id: "paradiddle",
    term: "Paradiddle",
    text: "Ein Paradiddle ist ein Rudiment mit Einzel- und Doppelschlägen, beim Single Paradiddle R L R R und umgekehrt. Man übt damit saubere Wechsel und Akzente. Das Wort diddle meint im Unterricht oft den Doppelschlag. Die genaue Wortherkunft ist nicht eindeutig belegt.",
  },
  {
    id: "ride",
    term: "Ride",
    text: "Die Ride ist ein Becken für das durchgehende Zeitspiel, oft mit dem Muster Viertel und Achtel. Sie trägt den Puls, während Snare und Bassdrum die Figur spielen. Der Rand klingt heller, die Kuppe trockener.",
  },
  {
    id: "rudiment",
    term: "Rudiment",
    text: "Ein Rudiment ist eine feste kleine Figur für die Hände, zum Beispiel Wirbel, Paradiddle oder Flam. Man übt sie langsam und sauber, danach im Tempo. Die Percussive Arts Society hat 1984 eine Liste von 40 International Drum Rudiments veröffentlicht. Die National Association of Rudimental Drummers hatte 1933 zuvor 26 amerikanische Rudiments festgelegt.",
  },
  {
    id: "snare",
    term: "Snare",
    text: "Die Snare ist die Trommel mit einem Teppich aus Schnarrseiten am unteren Fell. Die Seiten schnarren mit, wenn man schlägt. Ohne Seiten klingt sie dumpfer. Die meisten Rudiments sind zuerst für die Snare gedacht.",
  },
  {
    id: "takt",
    term: "Takt",
    text: "Ein Takt fasst eine feste Zahl von Schlägen zusammen. 4/4 hat vier Viertel, 6/8 zwei Gruppen zu drei Achteln. Der Taktstrich zeigt, wo ein neuer Takt beginnt. Die 1 ist der erste Schlag danach.",
  },
  {
    id: "tempo",
    term: "Tempo",
    text: "Das Tempo ist die Geschwindigkeit des Pulses, angegeben in BPM, also Schlägen pro Minute. In dieser App meint die Zahl die Viertel. Schneller wird es erst sinnvoll, wenn die Figur langsam sauber sitzt.",
  },
  {
    id: "triole",
    term: "Triole",
    text: "Eine Triole sind drei gleichmäßige Schläge in der Zeit von zwei. Eine Achteltriole füllt also eine Viertel. Man zählt sie oft als „1-trip-let“ oder „ein-und-a“. Der Puls bleibt die Viertel.",
  },
  {
    id: "wirbel",
    term: "Wirbel",
    text: "Ein Wirbel ist ein langer, gleichmäßiger Ton aus vielen schnellen Schlägen. Beim Single Stroke Roll wechselt jede Hand einzeln, beim Double Stroke Roll kommen Doppelschläge. Ein geschlossener Wirbel klingt wie ein Liegen, kein einzelnes Klopfen.",
  },
];

export function searchLexicon(q) {
  const s = String(q || "").trim().toLowerCase();
  const list = LEXICON.slice().sort((a, b) => a.term.localeCompare(b.term, "de"));
  if (!s) return list;
  return list.filter((e) => e.term.toLowerCase().includes(s) || e.text.toLowerCase().includes(s));
}
