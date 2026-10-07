// App-Name im Text: „Schlagfertig Control“ (ohne ‽, besser lesbar), mit geschütztem Leerzeichen.
// Das runde Logo „schlagfertig‽“ (mit ‽) ist Toms Markenzeichen. Kurzname auf dem Home-Bildschirm: „Control“.
export const BRAND = {
  mark: "schlagfertig‽",
  product: "Schlagfertig\u00a0Control", // geschütztes Leerzeichen: Name bricht nicht um
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
