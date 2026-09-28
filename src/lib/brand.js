export const BRAND = {
  mark: "schlagfertig‽",
  product: "Spielfertig",
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
export const HAND_LEAD = "Schwache Hand verbessern, saubere Wechsel üben, Tempo ohne Verspannungen halten.";
