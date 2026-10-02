import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, dayKey, pickPlanId, planMinutes } from "../src/lib/today.js";
import { EN } from "../src/lib/en.js";

const VIEWS = new Set(["first", "rudiments", "click", "pyramid", "stick", "archive"]);

test("2–3 Pläne mit eindeutiger ID und Schritten zu echten Modulen", () => {
  assert.ok(PLANS.length >= 2 && PLANS.length <= 3);
  assert.equal(new Set(PLANS.map((p) => p.id)).size, PLANS.length);
  for (const p of PLANS) {
    assert.ok(p.steps.length > 0, p.id);
    for (const s of p.steps) {
      assert.ok(VIEWS.has(s.view), `${p.id}: ${s.view}`);
      assert.ok(Number.isInteger(s.min) && s.min > 0, `${p.id}: ${s.label}`);
      if (s.preset?.bpm) assert.ok(s.preset.bpm >= 40 && s.preset.bpm <= 120, `moderates Tempo ${s.label}`);
    }
    assert.ok(planMinutes(p) <= 30, `${p.id}: kurz`);
  }
});

test("alle Texte haben eine englische Übersetzung, keine fremden Markennamen", () => {
  const bad = /stick control|stone/i;
  for (const p of PLANS) {
    assert.ok(EN[`today|${p.title}`], `EN today|${p.title}`);
    for (const s of p.steps) {
      for (const txt of [s.label, s.detail]) {
        assert.ok(!bad.test(txt), txt);
        if (/[äöüß]|[a-z] [a-z]/i.test(txt) && !/^(Hand Control|Single |Double )/.test(txt) && !/^Rudiments ·/.test(txt)) assert.ok(EN[txt], `EN fehlt: ${txt}`);
        if (EN[txt]) assert.ok(!bad.test(EN[txt]), EN[txt]);
      }
    }
  }
});

test("Planwahl: Wochentag-Vorschlag, eigene Wahl gilt nur am selben Tag", () => {
  const fri = new Date(2026, 9, 2, 10);
  const mon = new Date(2026, 9, 5, 10);
  assert.equal(pickPlanId(mon, {}), "A");
  assert.equal(pickPlanId(fri, {}), "B");
  assert.equal(pickPlanId(fri, { day: dayKey(fri), plan: "C" }), "C");
  assert.equal(pickPlanId(mon, { day: dayKey(fri), plan: "C" }), "A");
  assert.equal(pickPlanId(fri, { day: dayKey(fri), plan: "X" }), "B");
});
