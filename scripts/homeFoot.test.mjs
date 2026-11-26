// Fußzeile der Startseite: im Store-/Native-Build genau ein Knopf „Mein Zugang“,
// im Web nur „Vollversion“. Dieselbe Fußzeile gilt hochkant und im geteilten Querformat.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isHomeSplit } from "../src/lib/homeLayout.js";
import { demoOnNow } from "../src/lib/demo.js";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles-home.css", import.meta.url), "utf8");

function footerBlock() {
  const start = app.lastIndexOf("foot-links");
  const end = app.lastIndexOf("</footer>");
  assert.ok(start >= 0 && end > start, "Fußzeile in App.jsx nicht gefunden");
  return app.slice(start, end);
}

test("Store/native: genau ein Knopf Mein Zugang; Web: nur Vollversion", () => {
  const footer = footerBlock();
  assert.match(footer, /demoOnNow\(\) \? \(/);
  assert.equal((footer.match(/t\("Mein Zugang"\)/g) || []).length, 1);
  assert.equal((footer.match(/t\("Vollversion"\)/g) || []).length, 1);
  // Entweder-oder, nicht beide Knöpfe gleichzeitig (Build 31 zeigte beide).
  assert.match(footer, /demoOnNow\(\) \? \([\s\S]*Mein Zugang[\s\S]*\) : \([\s\S]*Vollversion/);
  assert.doesNotMatch(footer, /setPaywall\(true\)[\s\S]*Vollversion[\s\S]*DEMO_ON/);
  assert.doesNotMatch(footer, /DEMO_ON \? <button[^>]*Mein Zugang/);
  // Paywall bleibt der Web-Weg; TestFlight-Schalter bleibt auf Mein Zugang, nicht in der Fußzeile.
  assert.match(app, /refreshSandboxStore\(\)\.then\(\(\) => refreshEntitlement\(\)\)/);
  assert.doesNotMatch(app, /showTestIgnoreSwitch/);
});

test("Dieselbe eine Fußzeile gilt hochkant und im geteilten Querformat", () => {
  // Eine Fußzeile sitzt in der rechten Spalte (.home-menu) und wird nicht je Ausrichtung verdoppelt.
  const menuStart = app.indexOf('className="home-menu"');
  const menuEnd = app.lastIndexOf("</footer>");
  assert.ok(menuStart >= 0 && menuEnd > menuStart);
  const menu = app.slice(menuStart, menuEnd);
  assert.equal((menu.match(/<footer className="foot">/g) || []).length, 1);
  assert.equal((app.match(/<footer className="foot">/g) || []).length, 1);
  // Layout-Helfer: Querformat und Duo aufgeklappt hochkant sind geteilt, iPhone hochkant nicht —
  // die Fußzeilen-Bedingung hängt nicht am Layout.
  assert.equal(isHomeSplit(390, 844), false);
  assert.equal(isHomeSplit(844, 390), true);
  assert.equal(isHomeSplit(951, 669), true);
  assert.equal(isHomeSplit(669, 951), true);
  // CSS der geteilten Ansicht begrenzt die Spaltenbreite, fügt aber keine Kauf-Knöpfe hinzu.
  assert.match(css, /\.home-menu \.foot/);
  assert.doesNotMatch(css, /Vollversion|Mein Zugang|foot-link/);
});

test("Ohne Store-Umgebung bleibt demoOnNow aus (Web-Pfad)", () => {
  assert.equal(demoOnNow(), false);
});
