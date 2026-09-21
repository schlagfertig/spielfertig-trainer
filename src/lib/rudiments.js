/** PAS / Vic Firth 40. t in 16ths. dur 0.5 = 32nd, 1 = 16th, 2 = 8th, 4 = quarter. */
const n = (t, dur, hand, acc = false, extra = {}) => ({ t, dur, hand, acc, ...extra });
const run = (start, hands, dur = 1, accAt = [], extra = {}) =>
  hands.split("").map((h, i) => n(start + i * dur, dur, h, accAt.includes(i), extra));
const d32 = (start, hands, extra = {}) => run(start, hands, 0.5, [], extra);
const T3 = 4 / 3;
const T6 = 2 / 3;
const trip = (beat, hands, accAt = [], extraFn) =>
  hands.split("").map((h, i) => n(beat * 4 + i * T3, T3, h, accAt.includes(i), { tuplet: 3, ...(extraFn ? extraFn(h, i) : {}) }));
const six = (beat, hands, accAt = [], extra = {}) =>
  hands.split("").map((h, i) => n(beat * 4 + i * T6, T6, h, accAt.includes(i), { tuplet: 6, ...extra }));
const flip = (s) => String(s).replace(/R/g, "x").replace(/L/g, "R").replace(/x/g, "L");
const dual = (s) => [s, flip(s)];
const dualTok = (arr) => [arr, arr.map(flip)];
const swiss16 = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, T6, lead, true, { flam: oth, tuplet: 3, g, beams: 2 }),
    n(start + T6, T6, lead, false, { tuplet: 3, g, beams: 2 }),
    n(start + 2 * T6, T6, oth, false, { tuplet: 3, g, beams: 2 }),
  ];
};
const flamTap = (start, gR, gL) => [
  n(start, 1, "R", true, { flam: "L", g: gR }),
  n(start + 1, 1, "R", false, { g: gR }),
  n(start + 2, 1, "L", true, { flam: "R", g: gL }),
  n(start + 3, 1, "L", false, { g: gL }),
];
const invFlamTap = (start, g1, g2) => [
  n(start, 1, "R", true, { g: g1 }),
  n(start + 1, 1, "L", true, { flam: "R", g: g1 }),
  n(start + 2, 1, "L", true, { g: g2 }),
  n(start + 3, 1, "R", true, { flam: "L", g: g2 }),
];
const flamAcc = (beat, hand) => {
  const oth = hand === "R" ? "L" : "R";
  return trip(beat, hand + oth + hand, [0], (h, i) => (i === 0 ? { flam: oth } : {}));
};
const flamDrag8 = (beat, hand, g) => {
  const oth = hand === "R" ? "L" : "R";
  const b = beat * 4;
  const mid = T3 / 2;
  return [
    n(b, T3, hand, true, { flam: oth, tuplet: 3, g, beams: 1 }),
    n(b + T3, mid, oth, false, { g, beams: 2 }),
    n(b + T3 + mid, mid, oth, false, { g, beams: 2 }),
    n(b + 2 * T3, T3, hand, false, { tuplet: 3, g, beams: 1 }),
  ];
};
const sixStroke = (start, lead, g) => {
  const a = lead;
  const b = lead === "R" ? "L" : "R";
  return [
    n(start, 1, a, true, { g, beams: 2 }),
    n(start + 1, 0.5, b, false, { g, beams: 3 }),
    n(start + 1.5, 0.5, b, false, { g, beams: 3 }),
    n(start + 2, 0.5, a, false, { g, beams: 3 }),
    n(start + 2.5, 0.5, a, false, { g, beams: 3 }),
    n(start + 3, 1, b, true, { g, beams: 2 }),
  ];
};
/* PAS Single Stroke Four: 8th-triplet + accented tap on the next beat (like Seven: sextuplet + tap). */
const ss4 = (start, lead, g) => {
  const a = lead;
  const b = lead === "R" ? "L" : "R";
  return [
    n(start, T3, a, false, { tuplet: 3, g, beams: 1 }),
    n(start + T3, T3, b, false, { tuplet: 3, g, beams: 1 }),
    n(start + 2 * T3, T3, a, false, { tuplet: 3, g, beams: 1 }),
    n(start + 4, 2, b, true),
  ];
};
const pata = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 1, lead, true, { flam: oth, g }),
    n(start + 1, 1, oth, false, { g }),
    n(start + 2, 1, lead, false, { g }),
    n(start + 3, 1, oth, true, { flam: lead, g }),
  ];
};
const ddt = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 3, lead, false, { drag: oth, dot: true, g, beams: 1 }),
    n(start + 3, 1, lead, false, { drag: oth, g, beams: 2 }),
    n(start + 4, 2, oth, true, { g, beams: 1 }),
  ];
};
const dragadiddle = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 0.5, lead, true, { g, beams: 3 }),
    n(start + 0.5, 0.5, lead, false, { g, beams: 3 }),
    n(start + 1, 1, oth, false, { g, beams: 2 }),
    n(start + 2, 1, lead, false, { g, beams: 2 }),
    n(start + 3, 1, lead, false, { g, beams: 2 }),
  ];
};
const dp1 = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 2, lead, true, { g, beams: 1 }),
    n(start + 2, 1, lead, false, { drag: oth, g, beams: 2 }),
    n(start + 3, 1, oth, false, { g, beams: 2 }),
    n(start + 4, 1, lead, false, { g, beams: 2 }),
    n(start + 5, 1, lead, false, { g, beams: 2 }),
  ];
};
const dp2 = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 2, lead, true, { g, beams: 1 }),
    n(start + 2, 1, lead, false, { drag: oth, g, beams: 2 }),
    n(start + 3, 1, oth, false, { g, beams: 2 }),
    n(start + 4, 1, lead, false, { g, beams: 2 }),
    n(start + 5, 1, lead, false, { g, beams: 2 }),
  ];
};
const ratSingle = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, T6, lead, false, { drag: oth, tuplet: 3, g, beams: 2 }),
    n(start + T6, T6, oth, false, { tuplet: 3, g, beams: 2 }),
    n(start + 2 * T6, T6, lead, false, { tuplet: 3, g, beams: 2 }),
    n(start + 2, 2, oth, true, { g, beams: 1 }),
  ];
};
const ratDouble = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 2, lead, false, { drag: oth, g, beams: 1 }),
    n(start + 2, T6, lead, false, { drag: oth, tuplet: 3, g, beams: 2 }),
    n(start + 2 + T6, T6, oth, false, { tuplet: 3, g, beams: 2 }),
    n(start + 2 + 2 * T6, T6, lead, false, { tuplet: 3, g, beams: 2 }),
    n(start + 4, 2, oth, true, { g, beams: 1 }),
  ];
};
const ratTriple = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 2, lead, false, { drag: oth, g, beams: 1 }),
    n(start + 2, 2, lead, false, { drag: oth, g, beams: 1 }),
    n(start + 4, T6, lead, false, { drag: oth, tuplet: 3, g: g + 10, beams: 2 }),
    n(start + 4 + T6, T6, oth, false, { tuplet: 3, g: g + 10, beams: 2 }),
    n(start + 4 + 2 * T6, T6, lead, false, { tuplet: 3, g: g + 10, beams: 2 }),
    n(start + 6, 2, oth, true, { g: g + 10, beams: 1 }),
  ];
};

export const CATS = [
  { id: "roll", label: "Roll" },
  { id: "diddle", label: "Diddle" },
  { id: "flam", label: "Flam" },
  { id: "drag", label: "Drag" },
];

const SS16 = "RLRLRLRLRLRLRLRL";

export const RUDIMENTS = [
  { id: 1, cat: "roll", label: "1. Single Stroke Roll", bars: 1, time: "2/4", notes: [...d32(0, SS16)], sticking: dual(SS16) },
  { id: 2, cat: "roll", label: "2. Single Stroke Four", bars: 2, time: "2/4", notes: [...ss4(0, "R", 1), ...ss4(8, "L", 2)], sticking: dual("RLRLLRLR"), hint: "Triole + Abschlag" },
  { id: 3, cat: "roll", label: "3. Single Stroke Seven", bars: 1, time: "2/4", notes: [...six(0, "RLRLRL", [], { g: 1 }), n(4, 2, "R", true)], sticking: dual("RLRLRLR") },
