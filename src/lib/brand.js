// App-Name: „Schlagfertig‽“ – wie das runde Logo, Toms Markenzeichen. Das ‽ kommt aus src/fonts/fonts.css (eingebettet),
// damit es überall als Interrobang erscheint und nicht wie ein „?“. Untertitel: BRAND.subtitle (EN in en.js).
export const BRAND = {
  mark: "schlagfertig‽",
  product: "Schlagfertig‽",
  subtitle: "Drums lernen – Schlag für Schlag",
  person: "Thomas Schuster",
  phone: "01522 574 2199",
  email: "Schlagfertig@iCloud.com",
  addressLine1: "Mittleres Höfle 10",
  addressLine2: "86916 Kaufering",
  web: "spielfertig-trainer.vercel.app",
  tag: "Zeit für guten Sound",
  logo: "/logo.svg",
};

export function brandLine() {
  return [BRAND.mark, BRAND.person, BRAND.phone, BRAND.web].filter(Boolean).join("  ·  ");
}

export const HAND_NAME = "Hand Control";
export const HAND_LEAD = "Stärke deine schwache Hand, übe saubere Wechsel und halte das Tempo ganz locker.";
