export const BRAND = {
  mark: "schlagfertig\u203d",
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
