import { test } from "node:test";
import assert from "node:assert/strict";
import { POOLS, barOf, rollEtude, rerollBar, etudeEvents, barSteps } from "../src/lib/etudeDice.js";
import { readLabsParam } from "../src/lib/labs.js";

test("Rudiment-Würfel: jeder Takt füllt genau den Etüden-Takt", () => {
  for (const meter of Object.keys(POOLS)) for (const lvl of Object.keys(POOLS[meter])) for (const id of POOLS[meter][lvl]) {
    const b = barOf(id, meter);
    const end = Math.max(...b.notes.map((n) => n.t + n.dur));
    assert.ok(end <= barSteps(meter) + 1e-6 && end > barSteps(meter) - 4.01, `${id} in ${meter}: ${end}`);
  }
});
test("Rudiment-Würfel: Länge, keine Doppel nebeneinander, Reroll ändert nur einen Takt", () => {
  for (let k = 0; k < 50; k++) {
    const e = rollEtude({ bars: 8, level: "mittel", meter: "4/4" });
    assert.equal(e.ids.length, 8);
    for (let i = 1; i < 8; i++) assert.notEqual(e.ids[i], e.ids[i - 1]);
    const r = rerollBar(e, 3);
    assert.notEqual(r.ids[3], e.ids[3]);
    r.ids.forEach((id, i) => { if (i !== 3) assert.equal(id, e.ids[i]); });
  }
  const { total, ev } = etudeEvents(rollEtude({ bars: 4, level: "leicht", meter: "6/8" }));
  assert.equal(total, 48);
  assert.equal(ev.filter((e) => e.kind === "click").length, 8);
});
test("Labs-Schalter", () => {
  assert.equal(readLabsParam("?labs=1"), true);
  assert.equal(readLabsParam("?a=b&labs=0"), false);
  assert.equal(readLabsParam("?x=1"), null);
});
