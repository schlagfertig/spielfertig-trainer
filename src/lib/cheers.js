// Motivation am Ende eines Ziels (Rudiments: 8/16 Loops oder 2 Minuten) - kurz, per du, ermutigend.
// Reines Datenmodul (ohne DOM), damit der Test es direkt laden kann.
export const CHEERS = [
  { de: "Stark durchgezogen - genau so wächst dein Timing.", en: "Strong finish - that’s exactly how your timing grows." },
  { de: "Bis zum Schluss sauber geblieben. Noch eine Runde, etwas schneller?", en: "Clean right to the end. One more round, a little faster?" },
  { de: "Das sitzt! Gönn deinen Händen kurz Pause und leg dann nach.", en: "That’s locked in! Give your hands a short break, then go again." },
  { de: "Drangeblieben und durchgespielt - darauf kannst du stolz sein.", en: "You stuck with it and played it through - be proud of that." },
  { de: "Schlag für Schlag besser. Weiter so!", en: "Better with every stroke. Keep it up!" },
  { de: "Locker bleiben, Puls halten - du hast es drauf.", en: "Stay relaxed, hold the pulse - you’ve got this." },
];

// Zufällige Nachricht, nie zweimal dieselbe hintereinander.
export function pickCheer(lang = "de", last = -1, rnd = Math.random) {
  const n = CHEERS.length;
  let i = Math.floor(rnd() * n) % n;
  if (n > 1 && i === last) i = (i + 1) % n;
  return { i, text: CHEERS[i][lang === "en" ? "en" : "de"] };
}
