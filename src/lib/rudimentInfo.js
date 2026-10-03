/** Kurzinfos zu den 40 Rudiments. Nur Beschreibbares. Herkunft, die nicht belegt ist, steht so da.
 *  Jeder Text als { de, en }; rudimentInfo(id, lang) liefert die gewünschte Sprache. */

const PAS = { de: "Steht auf der Liste der 40 International Drum Rudiments, die die Percussive Arts Society 1984 veröffentlicht hat. Ein einzelner Erfinder ist nicht belegt.",
  en: "Listed among the 40 International Drum Rudiments published by the Percussive Arts Society in 1984. No single inventor is documented." };
const NAME = { de: "Der Name beschreibt die Figur. Eine eigene Wortherkunft ist nicht eindeutig belegt.",
  en: "The name describes the figure. A separate word origin is not clearly documented." };

function info(what, use, name = NAME, origin = PAS) {
  return { what, name, origin, use };
}

export const RUDIMENT_INFO = {
  1: info(
    { de: "Ein Wirbel aus einzelnen, abwechselnden Schlägen: R L R L, ohne Doppelschlag.",
      en: "A roll made of single, alternating strokes: R L R L, with no double strokes." },
    { de: "Grundlage für gleichmäßige Hände, Tempo und kontrollierte Wirbel.",
      en: "The foundation for even hands, tempo and controlled rolls." },
  ),
  2: info(
    { de: "Drei Triolenschläge und ein betonter Abschlag auf der nächsten Zählzeit.",
      en: "Three triplet strokes and an accented final stroke on the next beat." },
    { de: "Übt den Wechsel von Triole in den Downbeat, mit Akzent am Ende.",
      en: "Practises moving from the triplet into the downbeat, with an accent at the end." },
  ),
  3: info(
    { de: "Sechs schnelle Einzelschläge und ein betonter Abschlag.",
      en: "Six quick single strokes and an accented final stroke." },
    { de: "Wie Single Stroke Four, nur länger. Gut für Ausdauer in der Triole und einen klaren Schluss.",
      en: "Like the Single Stroke Four, only longer. Good for triplet endurance and a clean ending." },
  ),
  4: info(
    { de: "Ein Wirbel aus vielen sehr kurzen, prellenden Schlägen pro Hand, nicht aus gezählten Doppelschlägen.",
      en: "A roll made of many very short, bounced strokes per hand, not counted double strokes." },
    { de: "Für einen geschlossenen, liegenden Wirbel, wenn Einzelschläge zu langsam wären.",
      en: "For a closed, sustained roll when single strokes would be too slow." },
  ),
  5: info(
    { de: "Jede Hand spielt drei Schläge, dann wechselt sie: R R R L L L.",
      en: "Each hand plays three strokes, then switches: R R R L L L." },
    { de: "Übt den Dreierschlag und den sauberen Wechsel danach.",
      en: "Practises the triple stroke and the clean switch that follows." },
  ),
  6: info(
    { de: "Der offene Doppelschlag-Wirbel: jede Hand zwei gleich laute Schläge, R R L L.",
      en: "The open double stroke roll: each hand plays two equally loud strokes, R R L L." },
    { de: "Grundlage für längere Wirbel und für Kontrolle im Doppelschlag.",
      en: "The foundation for longer rolls and for control of the double stroke." },
  ),
  7: info(
    { de: "Ein kurzer Doppelschlag-Wirbel über fünf Schläge, mit Akzent am Anfang.",
      en: "A short double stroke roll of five strokes, accented at the start." },
    { de: "Der kurze Wirbel, mit dem man einen Schlag verlängert, ohne ihn zu verschmieren.",
      en: "The short roll that lengthens a stroke without smearing it." },
  ),
  8: info(
    { de: "Sechs Schläge: eine Sechzehntel, vier Zweiunddreißigstel, wieder eine Sechzehntel. Sticking R L L R R L.",
      en: "Six strokes: a sixteenth, four thirty-second notes, another sixteenth. Sticking R L L R R L." },
    { de: "Verbindet Einzelschlag und Doppelschlag in einer kurzen Figur.",
      en: "Combines single and double strokes in one short figure." },
  ),
  9: info(
    { de: "Ein Doppelschlag-Wirbel über sieben Schläge, mit Akzent am Anfang.",
      en: "A double stroke roll of seven strokes, accented at the start." },
    { de: "Wie der Five Stroke, einen Schlag länger. Gut als kurzer Wirbel auf einer Zählzeitgruppe.",
      en: "Like the Five Stroke Roll, one stroke longer. Good as a short roll across a group of beats." },
  ),
  10: info(
    { de: "Ein Doppelschlag-Wirbel über neun Schläge.",
      en: "A double stroke roll of nine strokes." },
    { de: "Längerer kurzer Wirbel. Übt, den Akzent zu setzen und den Wirbel trotzdem gleichmäßig zu halten.",
      en: "A longer short roll. Practises placing the accent while keeping the roll even." },
  ),
  11: info(
    { de: "Ein Doppelschlag-Wirbel über zehn Schläge.",
      en: "A double stroke roll of ten strokes." },
    { de: "Liegt zwischen den kürzeren und den langen Wirbeln. Gut, um das Ende eines Wirbels sauber zu stoppen.",
      en: "Sits between the shorter and the long rolls. Good for stopping the end of a roll cleanly." },
  ),
  12: info(
    { de: "Ein Doppelschlag-Wirbel über elf Schläge.",
      en: "A double stroke roll of eleven strokes." },
    { de: "Wie die anderen nummerierten Wirbel: Länge zählen, Akzent halten, Hände gleich lassen.",
      en: "Like the other numbered rolls: count the length, hold the accent, keep the hands even." },
  ),
  13: info(
    { de: "Ein Doppelschlag-Wirbel über dreizehn Schläge.",
      en: "A double stroke roll of thirteen strokes." },
    { de: "Übt längere Wirbel, ohne dass Tempo oder Lautstärke wegkippen.",
      en: "Practises longer rolls without the tempo or volume slipping." },
  ),
  14: info(
    { de: "Ein Doppelschlag-Wirbel über fünfzehn Schläge.",
      en: "A double stroke roll of fifteen strokes." },
    { de: "Für Ausdauer im Doppelschlag und einen klaren letzten Schlag.",
      en: "For endurance in the double stroke and a clear final stroke." },
  ),
  15: info(
    { de: "Ein Doppelschlag-Wirbel über siebzehn Schläge.",
      en: "A double stroke roll of seventeen strokes." },
    { de: "Der lange kurze Wirbel in dieser Reihe. Gut als Etappe zum offenen Wirbel.",
      en: "The longest of the short rolls in this series. A good step towards the open roll." },
  ),
  16: info(
    { de: "Einzel, Einzel, Doppelschlag, dann seitenverkehrt: R L R R L R L L.",
      en: "Single, single, double, then the reverse: R L R R L R L L." },
    { de: "Das Grund-Paradiddle. Übt Wechsel, Doppelschlag und später Akzente auf dem ersten Schlag.",
      en: "The basic paradiddle. Practises hand changes, the double stroke and, later, accents on the first stroke." },
    { de: "Diddle meint im englischen Unterricht oft den Doppelschlag. Die Vorsilbe ist nicht eindeutig erklärt. Eine belegte Wortherkunft fehlt.",
      en: "In English-language teaching, diddle often means the double stroke. The first part of the word has no clear explanation. A documented word origin is missing." },
  ),
  17: info(
    { de: "Zwei Wechsel und ein Doppelschlag, im 6/8-Gefühl: R L R L R R und seitenverkehrt.",
      en: "Two alternating strokes and a double, with a 6/8 feel: R L R L R R and the reverse." },
    { de: "Verlängert das Paradiddle. Gut für Triolen- und 6/8-Puls.",
      en: "Extends the paradiddle. Good for a triplet and 6/8 pulse." },
  ),
  18: info(
    { de: "Drei Wechsel und ein Doppelschlag: R L R L R L R R, die zweite Hälfte führt links.",
      en: "Three alternating strokes and a double: R L R L R L R R; the second half leads with the left." },
    { de: "Noch ein Schritt länger als das Double Paradiddle. Übt den Wechsel vor dem Doppelschlag.",
      en: "One step longer than the double paradiddle. Practises the alternation before the double stroke." },
  ),
  19: info(
    { de: "Paradiddle plus ein weiterer Doppelschlag: R L R R L L und seitenverkehrt.",
      en: "A paradiddle plus another double stroke: R L R R L L and the reverse." },
    { de: "Verbindet Paradiddle und Doubles. Liegt oft gut unter einem Shuffle oder einer Triole.",
      en: "Combines the paradiddle and doubles. Often sits well under a shuffle or a triplet." },
  ),
  20: info(
    { de: "Ein Hauptschlag mit einem leisen Vorschlag der anderen Hand, hier als Achtel im Wechsel.",
      en: "A main stroke with a soft grace note from the other hand, here as alternating eighth notes." },
    { de: "Macht einzelne Schläge dicker und übt, dass der Vorschlag leise und knapp vorher kommt.",
      en: "Makes single strokes fuller and practises keeping the grace note soft and just ahead." },
    { de: "Der Name wird meist als Lautmalerei verstanden, nach dem Klang der beiden Schläge. Eine belegte Wortherkunft fehlt.",
      en: "The name is usually taken as onomatopoeia, after the sound of the two strokes. A documented word origin is missing." },
  ),
  21: info(
    { de: "Eine Triole mit Flam und Akzent auf dem ersten Schlag, die Hände wechseln.",
      en: "A triplet with a flam and an accent on the first note; the hands alternate." },
    { de: "Übt Flam und Akzent im Triolenpuls, ohne den Vorschlag laut werden zu lassen.",
      en: "Practises flam and accent in a triplet pulse without letting the grace note get loud." },
  ),
  22: info(
    { de: "Flam und ein Nachschlag derselben Hand, im Wechsel: Flam rechts, Tap rechts, dann links.",
      en: "A flam followed by a tap from the same hand, alternating: flam right, tap right, then left." },
    { de: "Der Flam bleibt der Akzent, der Tap danach ist leichter. Gut für Kontrolle in der Dynamik.",
      en: "The flam stays the accent; the tap after it is lighter. Good for dynamic control." },
  ),
  23: info(
    { de: "Eine Flam-Figur mit Akzent und einem Wechsel der Führung in der zweiten Hälfte.",
      en: "A flam figure with an accent and a change of lead in the second half." },
    { de: "Übt Flam, Akzent und den Seitenwechsel in einer zusammenhängenden Figur.",
      en: "Practises flam, accent and switching sides in one connected figure." },
  ),
  24: info(
    { de: "Ein Paradiddle, bei dem der erste Schlag jeder Hälfte ein Flam ist.",
      en: "A paradiddle where the first stroke of each half is a flam." },
    { de: "Verbindet Flam und Paradiddle. Der Vorschlag darf den Doppelschlag nicht hetzen.",
      en: "Combines flam and paradiddle. The grace note must not rush the double stroke." },
  ),
  25: info(
    { de: "Ein Paradiddle-artiges Sticking mit Flams, Grundfolge R R L R und seitenverkehrt.",
      en: "A paradiddle-like sticking with flams, basic pattern R R L R and the reverse." },
    { de: "Übt Flams auf mehreren Schlägen, nicht nur auf dem ersten.",
      en: "Practises flams on several strokes, not just the first." },
  ),
  26: info(
    { de: "Paradiddle-Diddle mit Flam am Anfang jeder Hälfte.",
      en: "A paradiddle-diddle with a flam at the start of each half." },
    { de: "Dichte Figur aus Flam und Doubles. Gut, wenn beides schon einzeln sitzt.",
      en: "A dense figure of flams and doubles. Good once both work on their own." },
  ),
  27: info(
    { de: "Vier Schläge mit Flams am Anfang und am Ende der Figur, die mittleren ohne Flam.",
      en: "Four strokes with flams at the start and end of the figure, the middle ones without." },
    { de: "Übt, Flams zu setzen und dazwischen normale Schläge zu lassen.",
      en: "Practises placing flams with normal strokes in between." },
    { de: "Der Name ahmt die Figur lautmalerisch nach. Eine belegte Wortherkunft fehlt.",
      en: "The name imitates the figure's sound. A documented word origin is missing." },
  ),
  28: info(
    { de: "Eine Sechzehnteltriole mit Flam auf dem ersten Schlag, die Hände als R R L und seitenverkehrt.",
      en: "A sixteenth-note triplet with a flam on the first note, sticking R R L and the reverse." },
    { de: "Ein Flam in der Triole, kompakter als der Flam Accent.",
      en: "A flam within the triplet, more compact than the Flam Accent." },
    { de: "Der Name verweist auf eine Schweizer Trommeltradition. Ein belegter Einzelursprung fehlt.",
      en: "The name refers to a Swiss drumming tradition. A single documented origin is missing." },
  ),
  29: info(
    { de: "Flam Tap in umgekehrter Verteilung: der Flam sitzt nicht auf zwei gleichen Nachschlägen, sondern im Wechsel der Figur.",
      en: "A flam tap with the strokes arranged the other way round: the flam does not sit on two equal taps but in the alternation of the figure." },
    { de: "Gegensatz zum Flam Tap. Gut, um nicht nur eine Flam-Form zu können.",
      en: "The counterpart to the Flam Tap. Good for knowing more than one flam figure." },
  ),
  30: info(
    { de: "Ein Flam und ein Drag in einer Figur, hier als Achteltriole mit zwei Sechzehnteln auf dem zweiten Schlag.",
      en: "A flam and a drag in one figure, here as an eighth-note triplet with two sixteenths on the second note." },
    { de: "Verbindet die zwei Verzierungen. Erst langsam, damit Vorschlag und Drag nicht ineinanderfallen.",
      en: "Combines the two ornaments. Start slowly so the grace note and the drag don't run into each other." },
  ),
  31: info(
    { de: "Ein Hauptschlag mit zwei leisen Vorschlägen derselben Hand. Im Unterricht auch Ruff genannt.",
      en: "A main stroke with two soft grace notes from the same hand. Teachers also call it a ruff." },
    { de: "Die kleine Verzierung vor einem Schlag. Die Vorschläge bleiben leise und eng am Hauptschlag.",
      en: "The small ornament before a stroke. The grace notes stay soft and close to the main stroke." },
    { de: "Drag ist der Name in der PAS-Liste. Ruff ist eine ältere, parallele Bezeichnung. Eine belegte Wortherkunft fehlt.",
      en: "Drag is the name in the PAS list. Ruff is an older, parallel name. A documented word origin is missing." },
  ),
  32: info(
    { de: "Ein Drag und danach ein Tap, im Wechsel der Hände.",
      en: "A drag followed by a tap, alternating hands." },
    { de: "Übt den Drag als Auftakt und den leichteren Schlag danach.",
      en: "Practises the drag as a lead-in and the lighter stroke after it." },
  ),
  33: info(
    { de: "Zwei Drags und ein Tap, im 6/8 notiert: punktierte Achtel mit Drag, Sechzehntel mit Drag, einfache Achtel.",
      en: "Two drags and a tap, written in 6/8: a dotted eighth with a drag, a sixteenth with a drag, a plain eighth." },
    { de: "Der längere Drag-Auftakt. Gut für 6/8-Puls und leise Vorschläge.",
      en: "The longer drag lead-in. Good for a 6/8 pulse and soft grace notes." },
  ),
  34: info(
    { de: "Eine Drag-Figur aus der klassischen Rudiment-Reihe, mit mehreren Drags vor den Hauptschlägen.",
      en: "A drag figure from the classic rudiment series, with several drags before the main strokes." },
    { de: "Übt mehrere Drags hintereinander, ohne dass die Hauptschläge hetzen.",
      en: "Practises several drags in a row without rushing the main strokes." },
    { de: "Der Name ist traditionell. Warum die Zahl 25, ist nicht eindeutig belegt.",
      en: "The name is traditional. Why the number 25 is used is not clearly documented." },
  ),
  35: info(
    { de: "Ein Paradiddle, bei dem aus dem ersten Schlag jeder Hälfte zwei Zweiunddreißigstel werden, dieselbe Hand doppelt.",
      en: "A paradiddle in which the first stroke of each half becomes two thirty-second notes, the same hand twice." },
    { de: "Verbindet Drag-Bewegung und Paradiddle, ohne einen eigenen Vorschlagston davor.",
      en: "Combines the drag motion with the paradiddle, without a separate grace note before it." },
  ),
  36: info(
    { de: "Paradiddle mit Drag auf einem der ersten Schläge, die zweite Note bleibt eine Achtel.",
      en: "A paradiddle with a drag on one of the first strokes; the second note stays an eighth." },
    { de: "Drag und Paradiddle in einer Figur. Der Drag bleibt Verzierung, nicht der laute Schlag.",
      en: "Drag and paradiddle in one figure. The drag stays an ornament, not the loud stroke." },
  ),
  37: info(
    { de: "Paradiddle mit Drag auf der ersten Sechzehntel, Sticking der Sechzehntel R L R R und seitenverkehrt.",
      en: "A paradiddle with a drag on the first sixteenth; the sixteenths are stuck R L R R and the reverse." },
    { de: "Wie Nummer 36, aber der Drag sitzt eine Note später. Gut zum Vergleichen der beiden.",
      en: "Like number 36, but the drag sits one note later. Good for comparing the two." },
  ),
  38: info(
    { de: "Eine Figur aus Vorschlägen und vier Hauptschlägen, einmal pro Seite.",
      en: "A figure of grace notes and four main strokes, once on each side." },
    { de: "Übt den Auftakt aus leisen Schlägen in eine klare Vierergruppe.",
      en: "Practises the lead-in of soft strokes into a clear group of four." },
    { de: "Der Name ahmt das Sticking nach. Eine belegte Wortherkunft fehlt.",
      en: "The name imitates the sticking. A documented word origin is missing." },
  ),
  39: info(
    { de: "Ratamacue mit einem zusätzlichen Drag-Auftakt, im 6/8.",
      en: "A ratamacue with an extra drag lead-in, in 6/8." },
    { de: "Länger als der einfache Ratamacue. Die Vorschläge bleiben leise, die Hauptschläge tragen die Figur.",
      en: "Longer than the single ratamacue. The grace notes stay soft; the main strokes carry the figure." },
  ),
  40: info(
    { de: "Ratamacue mit zwei Drag-Auftakten, im 4/4.",
      en: "A ratamacue with two drag lead-ins, in 4/4." },
    { de: "Die längste der drei Ratamacue-Formen. Gut, wenn 38 und 39 schon gleichmäßig sind.",
      en: "The longest of the three ratamacue forms. Good once 38 and 39 are even." },
  ),
};

/** Info zu Rudiment `id` in der gewünschten Sprache: { what, name, origin, use } als Text, oder null. */
export function rudimentInfo(id, lang = "de") {
  const r = RUDIMENT_INFO[id];
  if (!r) return null;
  const pick = (x) => (lang === "en" && x.en) || x.de;
  return { what: pick(r.what), name: pick(r.name), origin: pick(r.origin), use: pick(r.use) };
}
