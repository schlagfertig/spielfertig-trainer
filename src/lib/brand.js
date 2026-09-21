export const BRAND = {
  mark: "schlagfertig\u203d",
  product: "Spielfertig",
  person: "Thomas Schuster",
  phone: "01522 574 2199",
  web: "spielfertig-trainer.vercel.app",
  tag: "Zeit f\u00fcr guten Sound",
  logo: "/logo.svg",
};

export function brandLine() {
  return [BRAND.mark, BRAND.person, BRAND.phone, BRAND.web].filter(Boolean).join("  \u00b7  ");
}
