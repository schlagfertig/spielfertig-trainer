/** PAS / Vic Firth 40. t = 16th steps, dur in 16ths (0.5 = 32nd). */
const n = (t, dur, hand, acc = false, extra = {}) => ({ t, dur, hand, acc, ...extra });
const rest = (t, dur) => ({ t, dur, rest: true });
const run = (start, hands, dur = 1, accAt = []) =>
  hands.split("").map((h, i) => n(start + i * dur, dur, h, accAt.includes(i)));
const d32 = (start, hands) => hands.split("").map((h, i) => n(start + i * 0.5, 0.5, h));

export const CATS = [
  { id: "roll", label: "Roll" },
  { id: "diddle", label: "Diddle" },
  { id: "flam", label: "Flam" },
  { id: "drag", label: "Drag" },
];

export const RUDIMENTS = [
  { id: 1, cat: "roll", label: "1. Single Stroke Roll", bars: 1, time: "4/4", notes: run(0, "RLRLRLRLRLRLRLRL") },
  { id: 2, cat: "roll", label: "2. Single Stroke Four", bars: 1, time: "4/4", notes: [...run(0, "RLRL", 1, [0]), n(4, 4, "R", true), ...run(8, "LRLR", 1, [0]), n(12, 4, "L", true)] },
  { id: 3, cat: "roll", label: "3. Single Stroke Seven", bars: 1, time: "4/4", notes: [...run(0, "RLRLRL", 1, [0]), n(6, 2, "R", true), ...run(8, "LRLRLR", 1, [0]), n(14, 2, "L", true)] },
  { id: 4, cat: "roll", label: "4. Multiple Bounce Roll", bars: 1, time: "4/4", notes: [n(0, 8, "R", true, { roll: 3 }), n(8, 8, "L", true, { roll: 3 })] },
  { id: 5, cat: "roll", label: "5. Triple Stroke Roll", bars: 1, time: "4/4", notes: run(0, "RRRLLLRRRLLLRRRL") },
  { id: 6, cat: "roll", label: "6. Double Stroke Open Roll", bars: 1, time: "4/4", notes: run(0, "RRLLRRLLRRLLRRLL") },
  { id: 7, cat: "roll", label: "7. Five Stroke Roll", bars: 1, time: "4/4", notes: [...d32(0, "RRLL"), n(2, 2, "R", true), ...d32(4, "LLRR"), n(6, 2, "L", true)] },
  { id: 8, cat: "roll", label: "8. Six Stroke Roll", bars: 1, time: "4/4", notes: [rest(0, 1), ...run(1, "LLRRL", 1, [4]), n(6, 2, "R", true), rest(8, 1), ...run(9, "LLRRL", 1, [4]), n(14, 2, "R", true)] },
  { id: 9, cat: "roll", label: "9. Seven Stroke Roll", bars: 1, time: "4/4", notes: [rest(0, 1), ...d32(1, "LLRRLL"), n(4, 2, "R", true), rest(8, 1), ...d32(9, "RRLLRR"), n(12, 2, "L", true)] },
  { id: 10, cat: "roll", label: "10. Nine Stroke Roll", bars: 1, time: "4/4", notes: [...d32(0, "RRLLRRLL"), n(4, 2, "R", true), ...d32(8, "LLRRLLRR"), n(12, 2, "L", true)] },
  { id: 11, cat: "roll", label: "11. Ten Stroke Roll", bars: 1, time: "4/4", notes: [...run(0, "RRLLRRLLR", 1), n(9, 7, "L", true)] },
  { id: 12, cat: "roll", label: "12. Eleven Stroke Roll", bars: 1, time: "4/4", notes: [...run(0, "RRLLRRLLRR", 1), n(10, 6, "L", true)] },
  { id: 13, cat: "roll", label: "13. Thirteen Stroke Roll", bars: 1, time: "4/4", notes: [...run(0, "RRLLRRLLRRLL", 1), n(12, 4, "R", true)] },
  { id: 14, cat: "roll", label: "14. Fifteen Stroke Roll", bars: 1, time: "4/4", notes: [...run(0, "RRLLRRLLRRLLRR", 1), n(14, 2, "L", true)] },
  { id: 15, cat: "roll", label: "15. Seventeen Stroke Roll", bars: 2, time: "4/4", notes: [...run(0, "RRLLRRLLRRLLRRLL", 1), n(16, 16, "R", true)] },
  { id: 16, cat: "diddle", label: "16. Single Paradiddle", bars: 1, time: "4/4", notes: run(0, "RLRR", 1, [0]).concat(run(4, "LRLL", 1, [0])).concat(run(8, "RLRR", 1, [0])).concat(run(12, "LRLL", 1, [0])) },
  { id: 17, cat: "diddle", label: "17. Double Paradiddle", bars: 1, time: "4/4", notes: run(0, "RLRLRR", 1, [0]).concat(run(6, "LRLRLL", 1, [0])).concat([n(12, 4, "R", true)]) },
  { id: 18, cat: "diddle", label: "18. Triple Paradiddle", bars: 1, time: "4/4", notes: run(0, "RLRLRLRR", 1, [0]).concat(run(8, "LRLRLRLL", 1, [0])) },
  { id: 19, cat: "diddle", label: "19. Paradiddle-Diddle", bars: 1, time: "4/4", notes: run(0, "RLRRLL", 1, [0]).concat(run(6, "LRLLRR", 1, [0])).concat([n(12, 4, "R", true)]) },
  { id: 20, cat: "flam", label: "20. Flam", bars: 1, time: "4/4", notes: [n(0, 4, "R", true, { flam: "L" }), n(4, 4, "L", true, { flam: "R" }), n(8, 4, "R", true, { flam: "L" }), n(12, 4, "L", true, { flam: "R" })] },
  { id: 21, cat: "flam", label: "21. Flam Accent", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { flam: "L" }), n(2, 2, "L"), n(4, 2, "R"), n(6, 2, "L", true, { flam: "R" }), n(8, 2, "R"), n(10, 2, "L"), n(12, 4, "R", true, { flam: "L" })] },
  { id: 22, cat: "flam", label: "22. Flam Tap", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { flam: "L" }), n(2, 2, "R"), n(4, 2, "L", true, { flam: "R" }), n(6, 2, "L"), n(8, 2, "R", true, { flam: "L" }), n(10, 2, "R"), n(12, 2, "L", true, { flam: "R" }), n(14, 2, "L")] },
  { id: 23, cat: "flam", label: "23. Flamacue", bars: 1, time: "4/4", notes: [n(0, 1, "R", false, { flam: "L" }), n(1, 1, "L", true), n(2, 1, "R"), n(3, 1, "L"), n(4, 4, "R", true, { flam: "L" }), n(8, 1, "L", false, { flam: "R" }), n(9, 1, "R", true), n(10, 1, "L"), n(11, 1, "R"), n(12, 4, "L", true, { flam: "R" })] },
  { id: 24, cat: "flam", label: "24. Flam Paradiddle", bars: 1, time: "4/4", notes: [n(0, 1, "R", true, { flam: "L" }), n(1, 1, "L"), n(2, 1, "R"), n(3, 1, "R"), n(4, 1, "L", true, { flam: "R" }), n(5, 1, "R"), n(6, 1, "L"), n(7, 1, "L"), n(8, 1, "R", true, { flam: "L" }), n(9, 1, "L"), n(10, 1, "R"), n(11, 1, "R"), n(12, 1, "L", true, { flam: "R" }), n(13, 1, "R"), n(14, 1, "L"), n(15, 1, "L")] },
  { id: 25, cat: "flam", label: "25. Single Flammed Mill", bars: 1, time: "4/4", notes: [n(0, 1, "R", true, { flam: "L" }), n(1, 1, "R"), n(2, 1, "L"), n(3, 1, "R"), n(4, 1, "L", true, { flam: "R" }), n(5, 1, "L"), n(6, 1, "R"), n(7, 1, "L"), n(8, 1, "R", true, { flam: "L" }), n(9, 1, "R"), n(10, 1, "L"), n(11, 1, "R"), n(12, 1, "L", true, { flam: "R" }), n(13, 1, "L"), n(14, 1, "R"), n(15, 1, "L")] },
  { id: 26, cat: "flam", label: "26. Flam Paradiddle-Diddle", bars: 1, time: "4/4", notes: [n(0, 1, "R", true, { flam: "L" }), n(1, 1, "L"), n(2, 1, "R"), n(3, 1, "R"), n(4, 1, "L"), n(5, 1, "L"), n(6, 1, "L", true, { flam: "R" }), n(7, 1, "R"), n(8, 1, "L"), n(9, 1, "L"), n(10, 1, "R"), n(11, 1, "R"), n(12, 4, "R", true)] },
  { id: 27, cat: "flam", label: "27. Pataflafla", bars: 1, time: "4/4", notes: [n(0, 1, "R", true, { flam: "L" }), n(1, 1, "L"), n(2, 1, "R"), n(3, 1, "L", true, { flam: "R" }), n(4, 1, "L", true, { flam: "R" }), n(5, 1, "R"), n(6, 1, "L"), n(7, 1, "R", true, { flam: "L" }), n(8, 1, "R", true, { flam: "L" }), n(9, 1, "L"), n(10, 1, "R"), n(11, 1, "L", true, { flam: "R" }), n(12, 4, "R", true, { flam: "L" })] },
  { id: 28, cat: "flam", label: "28. Swiss Army Triplet", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { flam: "L" }), n(2, 2, "R"), n(4, 2, "L"), n(6, 2, "L", true, { flam: "R" }), n(8, 2, "L"), n(10, 2, "R"), n(12, 2, "R", true, { flam: "L" }), n(14, 2, "R")] },
  { id: 29, cat: "flam", label: "29. Inverted Flam Tap", bars: 1, time: "4/4", notes: [n(0, 2, "R", true), n(2, 2, "L", true, { flam: "R" }), n(4, 2, "L", true), n(6, 2, "R", true, { flam: "L" }), n(8, 2, "R", true), n(10, 2, "L", true, { flam: "R" }), n(12, 2, "L", true), n(14, 2, "R", true, { flam: "L" })] },
  { id: 30, cat: "flam", label: "30. Flam Drag", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { flam: "L" }), n(2, 2, "L", false, { drag: "R" }), n(4, 2, "R"), n(6, 2, "L", true, { flam: "R" }), n(8, 2, "R", false, { drag: "L" }), n(10, 2, "L"), n(12, 4, "R", true, { flam: "L" })] },
  { id: 31, cat: "drag", label: "31. Drag", bars: 1, time: "4/4", notes: [n(0, 4, "R", true, { drag: "L" }), n(4, 4, "L", true, { drag: "R" }), n(8, 4, "R", true, { drag: "L" }), n(12, 4, "L", true, { drag: "R" })] },
  { id: 32, cat: "drag", label: "32. Single Drag Tap", bars: 1, time: "4/4", notes: [n(0, 2, "R", false, { drag: "L" }), n(2, 2, "L", true), n(4, 2, "L", false, { drag: "R" }), n(6, 2, "R", true), n(8, 2, "R", false, { drag: "L" }), n(10, 2, "L", true), n(12, 2, "L", false, { drag: "R" }), n(14, 2, "R", true)] },
  { id: 33, cat: "drag", label: "33. Double Drag Tap", bars: 1, time: "4/4", notes: [n(0, 2, "R", false, { drag: "L" }), n(2, 2, "R", false, { drag: "L" }), n(4, 2, "L", true), n(6, 2, "L", false, { drag: "R" }), n(8, 2, "L", false, { drag: "R" }), n(10, 2, "R", true), n(12, 4, "R", true)] },
  { id: 34, cat: "drag", label: "34. Lesson 25", bars: 1, time: "4/4", notes: [n(0, 1, "R", false, { drag: "L" }), n(1, 1, "L"), n(2, 2, "R", true), n(4, 1, "L", false, { drag: "R" }), n(5, 1, "R"), n(6, 2, "L", true), n(8, 1, "R", false, { drag: "L" }), n(9, 1, "L"), n(10, 2, "R", true), n(12, 4, "L", true)] },
  { id: 35, cat: "drag", label: "35. Single Dragadiddle", bars: 1, time: "4/4", notes: [n(0, 1, "R", true, { drag: "L" }), n(1, 1, "L"), n(2, 1, "R"), n(3, 1, "R"), n(4, 1, "L", true, { drag: "R" }), n(5, 1, "R"), n(6, 1, "L"), n(7, 1, "L"), n(8, 1, "R", true, { drag: "L" }), n(9, 1, "L"), n(10, 1, "R"), n(11, 1, "R"), n(12, 1, "L", true, { drag: "R" }), n(13, 1, "R"), n(14, 1, "L"), n(15, 1, "L")] },
  { id: 36, cat: "drag", label: "36. Drag Paradiddle #1", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { drag: "L" }), n(2, 1, "L"), n(3, 1, "R"), n(4, 1, "R"), n(5, 1, "L"), n(6, 2, "L", true, { drag: "R" }), n(8, 1, "R"), n(9, 1, "L"), n(10, 1, "L"), n(11, 1, "R"), n(12, 4, "R", true)] },
  { id: 37, cat: "drag", label: "37. Drag Paradiddle #2", bars: 1, time: "4/4", notes: [n(0, 2, "R", true, { drag: "L" }), n(2, 2, "R", false, { drag: "L" }), n(4, 1, "L"), n(5, 1, "R"), n(6, 1, "R"), n(7, 1, "L"), n(8, 2, "L", true, { drag: "R" }), n(10, 2, "L", false, { drag: "R" }), n(12, 1, "R"), n(13, 1, "L"), n(14, 1, "L"), n(15, 1, "R")] },
  { id: 38, cat: "drag", label: "38. Single Ratamacue", bars: 1, time: "4/4", notes: [n(0, 1, "R", false, { drag: "L" }), n(1, 1, "L"), n(2, 1, "R"), n(3, 1, "L", true), n(4, 4, "R"), n(8, 1, "L", false, { drag: "R" }), n(9, 1, "R"), n(10, 1, "L"), n(11, 1, "R", true), n(12, 4, "L")] },
  { id: 39, cat: "drag", label: "39. Double Ratamacue", bars: 1, time: "4/4", notes: [n(0, 2, "R", false, { drag: "L" }), n(2, 1, "R", false, { drag: "L" }), n(3, 1, "L"), n(4, 1, "R"), n(5, 1, "L", true), n(6, 2, "R"), n(8, 2, "L", false, { drag: "R" }), n(10, 1, "L", false, { drag: "R" }), n(11, 1, "R"), n(12, 1, "L"), n(13, 1, "R", true), n(14, 2, "L")] },
  { id: 40, cat: "drag", label: "40. Triple Ratamacue", bars: 2, time: "4/4", notes: [n(0, 2, "R", false, { drag: "L" }), n(2, 2, "R", false, { drag: "L" }), n(4, 1, "R", false, { drag: "L" }), n(5, 1, "L"), n(6, 1, "R"), n(7, 1, "L", true), n(8, 8, "R"), n(16, 2, "L", false, { drag: "R" }), n(18, 2, "L", false, { drag: "R" }), n(20, 1, "L", false, { drag: "R" }), n(21, 1, "R"), n(22, 1, "L"), n(23, 1, "R", true), n(24, 8, "L")] },
];

export function rudimentDuration(rud) {
  return (rud.bars || 1) * 16;
}
