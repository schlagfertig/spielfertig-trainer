import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_SPLIT_MQ, HOME_COMPACT_DIAL_MQ, isHomeSplit, isCompactHomeDial } from "../src/lib/homeLayout.js";

test("HOME_SPLIT_MQ ist Querformat überall oder Duo aufgeklappt hochkant", () => {
  assert.equal(HOME_SPLIT_MQ, "(orientation: landscape), (min-width: 640px) and (max-width: 736px) and (orientation: portrait)");
});

test("HOME_COMPACT_DIAL_MQ ist flaches Querformat", () => {
  assert.equal(HOME_COMPACT_DIAL_MQ, "(orientation: landscape) and (max-height: 500px)");
});

test("isHomeSplit: Querformat überall und Duo hochkant ja, iPad/Handy hochkant und Duo zu hochkant nein", () => {
  assert.equal(isHomeSplit(951, 669), true);  // Duo quer
  assert.equal(isHomeSplit(669, 951), true);  // Duo aufgeklappt hochkant
  assert.equal(isHomeSplit(1180, 820), true); // iPad quer
  assert.equal(isHomeSplit(820, 1180), false); // iPad hochkant: wie bisher
  assert.equal(isHomeSplit(768, 1024), false); // iPad hochkant älter
  assert.equal(isHomeSplit(744, 1133), false); // iPad mini hochkant
  assert.equal(isHomeSplit(844, 390), true);  // iPhone quer
  assert.equal(isHomeSplit(932, 430), true);  // iPhone quer groß
  assert.equal(isHomeSplit(667, 375), true);  // iPhone quer klein
  assert.equal(isHomeSplit(678, 466), true);  // Duo zugeklappt quer
  assert.equal(isHomeSplit(466, 678), false); // Duo zugeklappt hochkant
  assert.equal(isHomeSplit(390, 844), false); // iPhone hochkant
  assert.equal(isHomeSplit(430, 932), false); // iPhone hochkant groß
});

test("isCompactHomeDial: nur flaches Querformat", () => {
  assert.equal(isCompactHomeDial(844, 390), true);
  assert.equal(isCompactHomeDial(667, 375), true);
  assert.equal(isCompactHomeDial(678, 466), true);
  assert.equal(isCompactHomeDial(951, 669), false); // Duo quer, genug Höhe
  assert.equal(isCompactHomeDial(669, 951), false);
  assert.equal(isCompactHomeDial(390, 844), false);
});

test("CSS und App nutzen dieselbe Schwelle wie HOME_SPLIT_MQ", () => {
  const css = readFileSync(new URL("../src/styles-home.css", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const metro = readFileSync(new URL("../src/lib/LogoMetronome.jsx", import.meta.url), "utf8");
  assert.match(css, /@media \(orientation: landscape\), \(min-width: 640px\) and \(max-width: 736px\) and \(orientation: portrait\)/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(app, /HOME_SPLIT_MQ/);
  assert.match(app, /home-stage/);
  assert.match(app, /home-menu/);
  assert.match(metro, /useCompactHomeDial/);
});

test("home-help bleibt über dem offenen Logo-Metronom (Sprache/!/? antippbar)", () => {
  const glass = readFileSync(new URL("../src/styles-glass.css", import.meta.url), "utf8");
  const home = readFileSync(new URL("../src/styles-home.css", import.meta.url), "utf8");
  const heroOpen = /\.home \.hero:has\(\.logo-metro\.open\)\s*\{[^}]*z-index:\s*(\d+)/.exec(glass);
  const helpGlass = /\.home \.home-help\s*\{[^}]*z-index:\s*(\d+)/.exec(glass);
  assert.ok(heroOpen, "z-index für offenes Hero fehlt in styles-glass.css");
  assert.ok(helpGlass, "z-index für .home-help fehlt in styles-glass.css");
  const heroZ = Number(heroOpen[1]);
  const helpZ = Number(helpGlass[1]);
  assert.ok(helpZ > heroZ, `.home-help (z-index ${helpZ}) muss über dem offenen Hero (z-index ${heroZ}) liegen, sonst sind Sprache/!/? hinter dem Dial`);
  // styles-home.css kommt danach und darf .home-help nicht wieder unter das Hero setzen
  const helpHome = [...home.matchAll(/\.home \.home-help(?:\.[\w-]+)?\s*\{([^}]*)\}/g)];
  for (const m of helpHome) {
    const z = /z-index:\s*(\d+)/.exec(m[1]);
    if (z) {
      assert.ok(Number(z[1]) > heroZ, `styles-home.css setzt .home-help auf z-index ${z[1]}, unter dem offenen Hero (${heroZ})`);
    }
  }
});

