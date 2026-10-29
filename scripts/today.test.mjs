import { test } from "node:test";
import assert from "node:assert/strict";
import { FREE_PYRAMID_QUEST, PLANS, dayKey, pickPlanId, planMinutes, stepDetail } from "../src/lib/today.js";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";

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
      for (const txt of [s.label, s.detail, s.freeDetail].filter(Boolean)) {
        assert.ok(!bad.test(txt), txt);
        const tr = EN[txt] || EN2[txt];
        if (/[äöüß]|[a-z] [a-z]/i.test(txt) && !/^(Hand Control|Single |Double )/.test(txt) && !/^Rudiments ·/.test(txt)) assert.ok(tr, `EN fehlt: ${txt}`);
        if (tr) assert.ok(!bad.test(tr), tr);
      }
    }
  }
});

test("Gratis-Tagesquest: Pyramide höchstens bis 16tel, Vollversion bleibt bis 32tel", () => {
  assert.equal(FREE_PYRAMID_QUEST, "4tel bis 16tel · 60 BPM");
  assert.equal(EN2[FREE_PYRAMID_QUEST], "Quarters to 16ths · 60 BPM");
  assert.doesNotMatch(EN2[FREE_PYRAMID_QUEST], /\bpractice\b/i);
  let pyramids = 0;
  for (const p of PLANS) {
    for (const s of p.steps) {
      if (s.view !== "pyramid") {
        assert.equal(stepDetail(s, false), s.detail, s.label);
        continue;
      }
      pyramids += 1;
      const free = stepDetail(s, false);
      assert.equal(free, FREE_PYRAMID_QUEST);
      assert.equal(stepDetail(s, true), "4tel bis 32tel · 60 BPM");
      assert.equal(s.detail, "4tel bis 32tel · 60 BPM");
      assert.doesNotMatch(free, /32tel|Septole|Quintole|Sextole|Triole/);
      assert.doesNotMatch(EN2[free], /32nd|septuplet|quintuplet|sextuplet|triplet/i);
    }
  }
  assert.ok(pyramids >= 1);
  assert.equal(stepDetail({ view: "pyramid", detail: "4tel bis 32tel · 60 BPM" }, false), FREE_PYRAMID_QUEST);
  assert.equal(stepDetail({ view: "pyramid", detail: "4tel bis Septole", freeDetail: "noch 32tel" }, false), FREE_PYRAMID_QUEST);
  assert.equal(stepDetail({ view: "pyramid", detail: "bis Quintole" }, false), FREE_PYRAMID_QUEST);
  assert.equal(stepDetail({ view: "click", detail: "Click-Trainer · 80 BPM" }, false), "Click-Trainer · 80 BPM");
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
