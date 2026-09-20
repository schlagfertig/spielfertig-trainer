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
/** 8th-triplet flam-drag: two 16ths occupy the middle triplet stroke. */
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
const ss4 = (start, g) => [
  n(start, T6, "R", false, { tuplet: 3, g, beams: 2 }),
  n(start + T6, T6, "L", false, { tuplet: 3, g, beams: 2 }),
  n(start + 2 * T6, T6, "R", false, { tuplet: 3, g, beams: 2 }),
  n(start + 2, 2, "L", false, { g, beams: 1 }),
];
const pata = (start, lead, g) => {
  const oth = lead === "R" ? "L" : "R";
  return [
    n(start, 1, lead, true, { flam: oth, g }),
    n(start + 1, 1, oth, false, { g }),
    n(start + 2, 1, lead, false, { g }),
    n(start + 3, 1, oth, true, { flam: lead, g }),
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
    n(start + 4, 2, lead, false, { drag: oth, g, beams: 1 }),
    n(start + 6, T6, lead, false, { drag: oth, tuplet: 3, g, beams: 2 }),
    n(start + 6 + T6, T6, oth, false, { tuplet: 3, g, beams: 2 }),
    n(start + 6 + 2 * T6, T6, lead, false, { tuplet: 3, g, beams: 2 }),
    n(start + 8, 2, oth, true, { g, beams: 1 }),
  ];
};

export const CATS = [
  { id: "roll", label: "Roll" },
  { id: "diddle", label: "Diddle" },
  { id: "flam", label: "Flam" },
  { id: "drag", label: "Drag" },
];

const SS32 = "RLRLRLRLRLRLRLRLRLRLRLRLRLRLRLRL";

export const RUDIMENTS = [
  { id: 1, cat: "roll", label: "1. Single Stroke Roll", bars: 1, time: "4/4", notes: [...d32(0, SS32)], sticking: dual(SS32) },
  { id: 2, cat: "roll", label: "2. Single Stroke Four", bars: 2, time: "2/4", notes: [...ss4(0, 1), ...ss4(8, 2)], sticking: dual("RLRLRLRL") },
  { id: 3, cat: "roll", label: "3. Single Stroke Seven", bars: 1, time: "2/4", notes: [...six(0, "RLRLRL", [], { g: 1 }), n(4, 2, "R", true)], sticking: dual("RLRLRLR") },
  { id: 4, cat: "roll", label: "4. Multiple Bounce Roll", bars: 1, time: "2/4", notes: [n(0, 8, "R", false, { roll: 3, whole: true })], sticking: dualTok(["R"]) },
  { id: 5, cat: "roll", label: "5. Triple Stroke Roll", bars: 1, time: "4/4", notes: [...trip(0, "RRR", [0]), ...trip(1, "LLL", [0]), ...trip(2, "RRR", [0]), ...trip(3, "LLL", [0])], sticking: dual("RRRLLLRRRLLL") },
  { id: 6, cat: "roll", label: "6. Double Stroke Open Roll", bars: 1, time: "4/4", notes: run(0, "RRLLRRLLRRLLRRLL"), sticking: dual("RRLLRRLLRRLLRRLL") },
  { id: 7, cat: "roll", label: "7. Five Stroke Roll", bars: 1, time: "2/4", notes: [...d32(0, "RRLL"), n(2, 2, "R", true), ...d32(4, "LLRR"), n(6, 2, "L", true)] },
  { id: 8, cat: "roll", label: "8. Six Stroke Roll", bars: 1, time: "4/4", notes: [...sixStroke(0, "R", 1), ...sixStroke(4, "L", 2), ...sixStroke(8, "R", 3), ...sixStroke(12, "L", 4)], sticking: dual("RLLRRLLRRLLRRLLRRLLRRLLR") },
  { id: 9, cat: "roll", label: "9. Seven Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 2, "L", false, { roll: 3, tie: true }), n(2, 2, "R", true), n(4, 2, "R", false, { roll: 3, tie: true }), n(6, 2, "L", true)], sticking: dualTok(["LLRRLLR", "", "RRLLRRL", ""]) },
  { id: 10, cat: "roll", label: "10. Nine Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 2, "R", false, { roll: 3, tie: true }), n(2, 2, "R", true), n(4, 2, "L", false, { roll: 3, tie: true }), n(6, 2, "L", true)], sticking: dualTok(["RRLLRRLLR", "", "LLRRLLRRL", ""]) },
  { id: 11, cat: "roll", label: "11. Ten Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 2, "R", false, { roll: 3, tie: true }), n(2, 1, "R", true, { g: 1 }), n(3, 1, "L", true, { g: 1 }), n(4, 2, "L", false, { roll: 3, tie: true }), n(6, 1, "L", true, { g: 2 }), n(7, 1, "R", true, { g: 2 })], sticking: dualTok(["RRLLRRLL", "R", "L", "LLRRLLRR", "L", "R"]) },
  { id: 12, cat: "roll", label: "12. Eleven Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 2, "R", false, { roll: 3, tie: true }), n(2, 1, "R", false, { g: 1, roll: 1 }), n(3, 1, "L", true, { g: 1 }), n(4, 2, "L", false, { roll: 3, tie: true }), n(6, 1, "L", false, { g: 2, roll: 1 }), n(7, 1, "R", true, { g: 2 })], sticking: dualTok(["RRLLRRLL", "RR", "L", "LLRRLLRR", "LL", "R"]) },
  { id: 13, cat: "roll", label: "13. Thirteen Stroke Roll", bars: 2, time: "2/4", notes: [n(0, 6, "R", false, { roll: 3, tie: true }), n(6, 2, "R", true), n(8, 6, "L", false, { roll: 3, tie: true }), n(14, 2, "L", true)], sticking: dualTok(["RRLLRRLLRRLLR", "", "LLRRLLRRLLRRL", ""]) },
  { id: 14, cat: "roll", label: "14. Fifteen Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 6, "R", false, { roll: 3, tie: true }), n(6, 1, "R", false, { g: 1 }), n(7, 1, "L", true, { g: 1 })], sticking: dualTok(["RRLLRRLLRRLLR", "R", "L"]) },
  { id: 15, cat: "roll", label: "15. Seventeen Stroke Roll", bars: 1, time: "2/4", notes: [n(0, 8, "R", false, { roll: 3, tie: true }), n(8, 4, "R", true)], sticking: dualTok(["RRLLRRLLRRLLRRLLR", ""]) },
  { id: 16, cat: "diddle", label: "16. Single Paradiddle", bars: 1, time: "2/4", notes: [...run(0, "RLRR", 1, [0], { g: 1 }), ...run(4, "LRLL", 1, [0], { g: 2 })], sticking: dual("RLRRLRLL") },
  { id: 17, cat: "diddle", label: "17. Double Paradiddle", bars: 1, time: "6/8", notes: [...run(0, "RLRLRR", 1, [0], { g: 1 }), ...run(6, "LRLRLL", 1, [0], { g: 2 })], sticking: dual("RLRLRRLRLRLL") },
  { id: 18, cat: "diddle", label: "18. Triple Paradiddle", bars: 1, time: "4/4", notes: [...run(0, "RLRLRLRR", 1, [0], { g: 1 }), ...run(8, "LRLRLLRR", 1, [0], { g: 2 })], sticking: dual("RLRLRLRRLRLRLLRR") },
  { id: 19, cat: "diddle", label: "19. Paradiddle-Diddle", bars: 1, time: "6/8", notes: [...run(0, "RLRRLL", 1, [0], { g: 1 }), ...run(6, "RLRRLL", 1, [0], { g: 2 })], sticking: dual("RLRRLLRLRRLL") },
  { id: 20, cat: "flam", label: "20. Flam", bars: 1, time: "4/4", notes: [
    n(0, 2, "R", true, { flam: "L", g: 1 }), n(2, 2, "L", true, { flam: "R", g: 1 }),
    n(4, 2, "R", true, { flam: "L", g: 2 }), n(6, 2, "L", true, { flam: "R", g: 2 }),
    n(8, 2, "R", true, { flam: "L", g: 3 }), n(10, 2, "L", true, { flam: "R", g: 3 }),
    n(12, 2, "R", true, { flam: "L", g: 4 }), n(14, 2, "L", true, { flam: "R", g: 4 }),
  ], sticking: dual("RLRLRLRL") },
  { id: 21, cat: "flam", label: "21. Flam Accent", bars: 1, time: "2/4", notes: [...flamAcc(0, "R"), ...flamAcc(1, "L")], sticking: dual("RLRLRL") },
  { id: 22, cat: "flam", label: "22. Flam Tap", bars: 1, time: "2/4", notes: [...flamTap(0, 1, 2)], sticking: dual("RRLRLL") },
  { id: 23, cat: "flam", label: "23. Flamacue", bars: 1, time: "2/4", notes: [n(0, 1, "R", false, { flam: "L", g: 1 }), n(1, 1, "L", true, { g: 1 }), n(2, 1, "R", false, { g: 1 }), n(3, 1, "L", false, { g: 1 }), n(4, 4, "R", true, { flam: "L" })], sticking: dual("RLRLR") },
  { id: 24, cat: "flam", label: "24. Flam Paradiddle", bars: 1, time: "2/4", notes: [n(0, 1, "R", true, { flam: "L", g: 1 }), n(1, 1, "L", false, { g: 1 }), n(2, 1, "R", false, { g: 1 }), n(3, 1, "R", false, { g: 1 }), n(4, 1, "L", true, { flam: "R", g: 2 }), n(5, 1, "R", false, { g: 2 }), n(6, 1, "L", false, { g: 2 }), n(7, 1, "L", false, { g: 2 })], sticking: dual("RLRRLRLL") },
  { id: 25, cat: "flam", label: "25. Single Flammed Mill", bars: 1, time: "2/4", notes: [n(0, 1, "R", true, { flam: "L", g: 1 }), n(1, 1, "R", false, { g: 1 }), n(2, 1, "L", false, { g: 1 }), n(3, 1, "R", false, { g: 1 }), n(4, 1, "L", true, { flam: "R", g: 2 }), n(5, 1, "L", false, { g: 2 }), n(6, 1, "R", false, { g: 2 }), n(7, 1, "L", false, { g: 2 })], sticking: dual("RRLRLRLL") },
  { id: 26, cat: "flam", label: "26. Flam Paradiddle-Diddle", bars: 1, time: "2/4", notes: [
    ...six(0, "RLRRLL", [0], { g: 1 }).map((nt, i) => (i === 0 ? { ...nt, flam: "L" } : nt)),
    ...six(1, "RLRRLL", [0], { g: 2 }).map((nt, i) => (i === 0 ? { ...nt, flam: "L" } : nt)),
  ], sticking: dual("RLRRLLRLRRLL") },
  { id: 27, cat: "flam", label: "27. Pataflafla", bars: 1, time: "4/4", notes: [...pata(0, "R", 1), ...pata(4, "L", 2), ...pata(8, "R", 3), ...pata(12, "L", 4)], sticking: dual("RLRLLRLRRLRLLRLR") },
  { id: 28, cat: "flam", label: "28. Swiss Army Triplet", bars: 1, time: "4/4", notes: [
    ...swiss16(0, "R", 1), ...swiss16(2, "R", 1), ...swiss16(4, "R", 2), ...swiss16(6, "R", 2),
    ...swiss16(8, "R", 3), ...swiss16(10, "R", 3), ...swiss16(12, "R", 4), ...swiss16(14, "R", 4),
  ], sticking: dual("RRLRRLRRLRRLRRLRRLRRLRRL") },
  { id: 29, cat: "flam", label: "29. Inverted Flam Tap", bars: 1, time: "4/4", notes: [...invFlamTap(0, 1, 2), ...invFlamTap(4, 3, 4), ...invFlamTap(8, 5, 6), ...invFlamTap(12, 7, 8)], sticking: dual("RLLRRLLRRLLRRLLR") },
  { id: 30, cat: "flam", label: "30. Flam Drag", bars: 1, time: "2/4", notes: [...flamDrag8(0, "R", 1), ...flamDrag8(1, "L", 2)], sticking: dualTok(["R", "L", "L", "R", "L", "R", "R", "L"]) },
  { id: 31, cat: "drag", label: "31. Drag", bars: 1, time: "2/4", notes: [n(0, 2, "R", true, { drag: "L", g: 1 }), n(2, 2, "L", true, { drag: "R", g: 1 }), n(4, 2, "R", true, { drag: "L", g: 2 }), n(6, 2, "L", true, { drag: "R", g: 2 })], sticking: dual("RLRL") },
  { id: 32, cat: "drag", label: "32. Single Drag Tap", bars: 1, time: "2/4", notes: [n(0, 2, "R", false, { drag: "L", g: 1 }), n(2, 2, "L", true, { g: 1 }), n(4, 2, "L", false, { drag: "R", g: 2 }), n(6, 2, "R", true, { g: 2 })] },
  { id: 33, cat: "drag", label: "33. Double Drag Tap", bars: 1, time: "2/4", notes: [n(0, 2, "R", false, { drag: "L", g: 1 }), n(2, 2, "R", false, { drag: "L", g: 1 }), n(4, 4, "L", true)] },
  { id: 34, cat: "drag", label: "34. Lesson 25", bars: 1, time: "2/4", notes: [n(0, 1, "R", false, { drag: "L", g: 1 }), n(1, 1, "L", false, { g: 1 }), n(2, 2, "R", true, { g: 1 }), n(4, 1, "L", false, { drag: "R", g: 2 }), n(5, 1, "R", false, { g: 2 }), n(6, 2, "L", true, { g: 2 })] },
  { id: 35, cat: "drag", label: "35. Single Dragadiddle", bars: 1, time: "2/4", notes: [n(0, 1, "R", true, { drag: "L", g: 1 }), n(1, 1, "L", false, { g: 1 }), n(2, 1, "R", false, { g: 1 }), n(3, 1, "R", false, { g: 1 }), n(4, 1, "L", true, { drag: "R", g: 2 }), n(5, 1, "R", false, { g: 2 }), n(6, 1, "L", false, { g: 2 }), n(7, 1, "L", false, { g: 2 })], sticking: dual("RLRRLRLL") },
  { id: 36, cat: "drag", label: "36. Drag Paradiddle #1", bars: 2, time: "2/4", notes: [
    n(0, 2, "R", true, { drag: "L", g: 1 }), n(2, 1, "R", false, { drag: "L", g: 1 }), n(3, 1, "L", false, { g: 1 }), n(4, 1, "R", false, { g: 1 }), n(5, 1, "R", false, { g: 1 }),
    n(8, 2, "L", true, { drag: "R", g: 2 }), n(10, 1, "L", false, { drag: "R", g: 2 }), n(11, 1, "R", false, { g: 2 }), n(12, 1, "L", false, { g: 2 }), n(13, 1, "L", false, { g: 2 }),
  ], sticking: dualTok(["R", "LLR", "L", "R", "R", "L", "RRL", "R", "L", "L"]) },
  { id: 37, cat: "drag", label: "37. Drag Paradiddle #2", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { drag: "L" }), n(2, 2, "R", false, { drag: "L" }), n(4, 1, "L"), n(5, 1, "R"), n(6, 1, "R"), n(7, 1, "L"), n(8, 2, "L", true, { drag: "R" }), n(10, 2, "L", false, { drag: "R" }), n(12, 1, "R"), n(13, 1, "L"), n(14, 1, "L"), n(15, 1, "R")] },
  { id: 38, cat: "drag", label: "38. Single Ratamacue", bars: 1, time: "2/4", notes: [...ratSingle(0, "R", 1), ...ratSingle(4, "L", 2)], sticking: dualTok(["LLR", "L", "R", "L", "RRL", "R", "L", "R"]) },
  { id: 39, cat: "drag", label: "39. Double Ratamacue", bars: 2, time: "2/4", notes: [...ratDouble(0, "R", 1), ...ratDouble(8, "L", 2)], sticking: dualTok(["LLR", "LLR", "L", "R", "L", "RRL", "RRL", "R", "L", "R"]) },
  { id: 40, cat: "drag", label: "40. Triple Ratamacue", bars: 3, time: "2/4", notes: [...ratTriple(0, "R", 1), ...ratTriple(12, "L", 2)], sticking: dualTok(["LLR", "LLR", "LLR", "L", "R", "L", "RRL", "RRL", "RRL", "R", "L", "R"]) },
];

export function rudimentDuration(rud) {
  const [num, den] = String(rud.time || "4/4").split("/").map(Number);
  return (rud.bars || 1) * (num || 4) * (16 / (den || 4));
}

/** Click grid in 16th-units. 6/8 = dotted-quarter pulse. */
export function meterPulse(time) {
  const [n0, d] = String(time || "4/4").split("/").map(Number);
  const num = n0 || 4;
  const den = d || 4;
  const compound = den === 8 && num % 3 === 0;
  return { pulse: compound ? 6 : 4, bar: num * (16 / den), compound };
}
