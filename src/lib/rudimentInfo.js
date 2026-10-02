/** Kurzinfos zu den 40 Rudiments. Nur Beschreibbares. Herkunft, die nicht belegt ist, steht so da. */

const PAS = "Steht auf der Liste der 40 International Drum Rudiments, die die Percussive Arts Society 1984 veröffentlicht hat. Ein einzelner Erfinder ist nicht belegt.";
const NAME = "Der Name beschreibt die Figur. Eine eigene Wortherkunft ist nicht eindeutig belegt.";

function info(what, use, name = NAME, origin = PAS) {
  return { what, name, origin, use };
}

export const RUDIMENT_INFO = {
  1: info(
    "Ein Wirbel aus einzelnen, abwechselnden Schlägen: R L R L, ohne Doppelschlag.",
    "Grundlage für gleichmäßige Hände, Tempo und kontrollierte Wirbel."
  ),
  2: info(
    "Drei Triolenschläge und ein betonter Abschlag auf der nächsten Zählzeit.",
    "Übt den Wechsel von Triole in den Downbeat, mit Akzent am Ende."
  ),
  3: info(
    "Sechs schnelle Einzelschläge und ein betonter Abschlag.",
    "Wie Single Stroke Four, nur länger. Gut für Ausdauer in der Triole und einen klaren Schluss."
  ),
  4: info(
    "Ein Wirbel aus vielen sehr kurzen, prellenden Schlägen pro Hand, nicht aus gezählten Doppelschlägen.",
    "Für einen geschlossenen, liegenden Wirbel, wenn Einzelschläge zu langsam wären."
  ),
  5: info(
    "Jede Hand spielt drei Schläge, dann wechselt sie: R R R L L L.",
    "Übt den Dreierschlag und den sauberen Wechsel danach."
  ),
  6: info(
    "Der offene Doppelschlag-Wirbel: jede Hand zwei gleich laute Schläge, R R L L.",
    "Grundlage für längere Wirbel und für Kontrolle im Doppelschlag."
  ),
  7: info(
    "Ein kurzer Doppelschlag-Wirbel über fünf Schläge, mit Akzent am Anfang.",
    "Der kurze Wirbel, mit dem man einen Schlag verlängert, ohne ihn zu verschmieren."
  ),
  8: info(
    "Sechs Schläge: eine Sechzehntel, vier Zweiunddreißigstel, wieder eine Sechzehntel. Sticking R L L R R L.",
    "Verbindet Einzelschlag und Doppelschlag in einer kurzen Figur."
  ),
  9: info(
    "Ein Doppelschlag-Wirbel über sieben Schläge, mit Akzent am Anfang.",
    "Wie der Five Stroke, einen Schlag länger. Gut als kurzer Wirbel auf einer Zählzeitgruppe."
  ),
  10: info(
    "Ein Doppelschlag-Wirbel über neun Schläge.",
    "Längerer kurzer Wirbel. Übt, den Akzent zu setzen und den Wirbel trotzdem gleichmäßig zu halten."
  ),
  11: info(
    "Ein Doppelschlag-Wirbel über zehn Schläge.",
    "Liegt zwischen den kürzeren und den langen Wirbeln. Gut, um das Ende eines Wirbels sauber zu stoppen."
  ),
  12: info(
    "Ein Doppelschlag-Wirbel über elf Schläge.",
    "Wie die anderen nummerierten Wirbel: Länge zählen, Akzent halten, Hände gleich lassen."
  ),
  13: info(
    "Ein Doppelschlag-Wirbel über dreizehn Schläge.",
    "Übt längere Wirbel, ohne dass Tempo oder Lautstärke wegkippen."
  ),
  14: info(
    "Ein Doppelschlag-Wirbel über fünfzehn Schläge.",
    "Für Ausdauer im Doppelschlag und einen klaren letzten Schlag."
  ),
  15: info(
    "Ein Doppelschlag-Wirbel über siebzehn Schläge.",
    "Der lange kurze Wirbel in dieser Reihe. Gut als Etappe zum offenen Wirbel."
  ),
  16: info(
    "Einzel, Einzel, Doppelschlag, dann seitenverkehrt: R L R R L R L L.",
    "Das Grund-Paradiddle. Übt Wechsel, Doppelschlag und später Akzente auf dem ersten Schlag.",
    "Diddle meint im englischen Unterricht oft den Doppelschlag. Die Vorsilbe ist nicht eindeutig erklärt. Eine belegte Wortherkunft fehlt.",
  ),
  17: info(
    "Zwei Wechsel und ein Doppelschlag, im 6/8-Gefühl: R L R L R R und seitenverkehrt.",
    "Verlängert das Paradiddle. Gut für Triolen- und 6/8-Puls."
  ),
  18: info(
    "Drei Wechsel und ein Doppelschlag: R L R L R L R R, die zweite Hälfte führt links.",
    "Noch ein Schritt länger als das Double Paradiddle. Übt den Wechsel vor dem Doppelschlag."
  ),
  19: info(
    "Paradiddle plus ein weiterer Doppelschlag: R L R R L L und seitenverkehrt.",
    "Verbindet Paradiddle und Doubles. Liegt oft gut unter einem Shuffle oder einer Triole."
  ),
  20: info(
    "Ein Hauptschlag mit einem leisen Vorschlag der anderen Hand, hier als Achtel im Wechsel.",
    "Macht einzelne Schläge dicker und übt, dass der Vorschlag leise und knapp vorher kommt.",
    "Der Name wird meist als Lautmalerei verstanden, nach dem Klang der beiden Schläge. Eine belegte Wortherkunft fehlt.",
  ),
  21: info(
    "Eine Triole mit Flam und Akzent auf dem ersten Schlag, die Hände wechseln.",
    "Übt Flam und Akzent im Triolenpuls, ohne den Vorschlag laut werden zu lassen."
  ),
  22: info(
    "Flam und ein Nachschlag derselben Hand, im Wechsel: Flam rechts, Tap rechts, dann links.",
    "Der Flam bleibt der Akzent, der Tap danach ist leichter. Gut für Kontrolle in der Dynamik."
  ),
  23: info(
    "Eine Flam-Figur mit Akzent und einem Wechsel der Führung in der zweiten Hälfte.",
    "Übt Flam, Akzent und den Seitenwechsel in einer zusammenhängenden Figur."
  ),
  24: info(
    "Ein Paradiddle, bei dem der erste Schlag jeder Hälfte ein Flam ist.",
    "Verbindet Flam und Paradiddle. Der Vorschlag darf den Doppelschlag nicht hetzen."
  ),
  25: info(
    "Ein Paradiddle-artiges Sticking mit Flams, Grundfolge R R L R und seitenverkehrt.",
    "Übt Flams auf mehreren Schlägen, nicht nur auf dem ersten."
  ),
  26: info(
    "Paradiddle-Diddle mit Flam am Anfang jeder Hälfte.",
    "Dichte Figur aus Flam und Doubles. Gut, wenn beides schon einzeln sitzt."
  ),
  27: info(
    "Vier Schläge mit Flams am Anfang und am Ende der Figur, die mittleren ohne Flam.",
    "Übt, Flams zu setzen und dazwischen normale Schläge zu lassen.",
    "Der Name ahmt die Figur lautmalerisch nach. Eine belegte Wortherkunft fehlt.",
  ),
  28: info(
    "Eine Sechzehnteltriole mit Flam auf dem ersten Schlag, die Hände als R R L und seitenverkehrt.",
    "Ein Flam in der Triole, kompakter als der Flam Accent.",
    "Der Name verweist auf eine Schweizer Trommeltradition. Ein belegter Einzelursprung fehlt.",
  ),
  29: info(
    "Flam Tap in umgekehrter Verteilung: der Flam sitzt nicht auf zwei gleichen Nachschlägen, sondern im Wechsel der Figur.",
    "Gegensatz zum Flam Tap. Gut, um nicht nur eine Flam-Form zu können."
  ),
  30: info(
    "Ein Flam und ein Drag in einer Figur, hier als Achteltriole mit zwei Sechzehnteln auf dem zweiten Schlag.",
    "Verbindet die zwei Verzierungen. Erst langsam, damit Vorschlag und Drag nicht ineinanderfallen."
  ),
  31: info(
    "Ein Hauptschlag mit zwei leisen Vorschlägen derselben Hand. Im Unterricht auch Ruff genannt.",
    "Die kleine Verzierung vor einem Schlag. Die Vorschläge bleiben leise und eng am Hauptschlag.",
    "Drag ist der Name in der PAS-Liste. Ruff ist eine ältere, parallele Bezeichnung. Eine belegte Wortherkunft fehlt.",
  ),
  32: info(
    "Ein Drag und danach ein Tap, im Wechsel der Hände.",
    "Übt den Drag als Auftakt und den leichteren Schlag danach."
  ),
  33: info(
    "Zwei Drags und ein Tap, im 6/8 notiert: punktierte Achtel mit Drag, Sechzehntel mit Drag, einfache Achtel.",
    "Der längere Drag-Auftakt. Gut für 6/8-Puls und leise Vorschläge."
  ),
  34: info(
    "Eine Drag-Figur aus der klassischen Rudiment-Reihe, mit mehreren Drags vor den Hauptschlägen.",
    "Übt mehrere Drags hintereinander, ohne dass die Hauptschläge hetzen.",
    "Der Name ist traditionell. Warum die Zahl 25, ist nicht eindeutig belegt.",
  ),
  35: info(
    "Ein Paradiddle, bei dem aus dem ersten Schlag jeder Hälfte zwei Zweiunddreißigstel werden, dieselbe Hand doppelt.",
    "Verbindet Drag-Bewegung und Paradiddle, ohne einen eigenen Vorschlagston davor."
  ),
  36: info(
    "Paradiddle mit Drag auf einem der ersten Schläge, die zweite Note bleibt eine Achtel.",
    "Drag und Paradiddle in einer Figur. Der Drag bleibt Verzierung, nicht der laute Schlag."
  ),
  37: info(
    "Paradiddle mit Drag auf der ersten Sechzehntel, Sticking der Sechzehntel R L R R und seitenverkehrt.",
    "Wie Nummer 36, aber der Drag sitzt eine Note später. Gut zum Vergleichen der beiden."
  ),
  38: info(
    "Eine Figur aus Vorschlägen und vier Hauptschlägen, einmal pro Seite.",
    "Übt den Auftakt aus leisen Schlägen in eine klare Vierergruppe.",
    "Der Name ahmt das Sticking nach. Eine belegte Wortherkunft fehlt.",
  ),
  39: info(
    "Ratamacue mit einem zusätzlichen Drag-Auftakt, im 6/8.",
    "Länger als der einfache Ratamacue. Die Vorschläge bleiben leise, die Hauptschläge tragen die Figur."
  ),
  40: info(
    "Ratamacue mit zwei Drag-Auftakten, im 4/4.",
    "Die längste der drei Ratamacue-Formen. Gut, wenn 38 und 39 schon gleichmäßig sind."
  ),
};

export function rudimentInfo(id) {
  return RUDIMENT_INFO[id] || null;
}
