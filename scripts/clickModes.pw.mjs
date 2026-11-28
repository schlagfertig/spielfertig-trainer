// Echter Tap-Test der Click-Trainer-Modi (Touch, Safe Area wie iPhone-Querformat).
// Voraussetzung: Dev-Server auf http://127.0.0.1:5173 und Google Chrome.
// Aufruf: node scripts/clickModes.pw.mjs
import { chromium } from "playwright";

const BASE = process.env.SF_BASE || "http://127.0.0.1:5173";
const CHROME = process.env.SF_CHROME || "/usr/local/bin/google-chrome";

function intersects(a, b) {
  const al = a.x;
  const at = a.y;
  const bl = b.x;
  const bt = b.y;
  return !(a.right <= bl || b.right <= al || a.bottom <= bt || b.bottom <= at);
}

async function prep(page) {
  await page.addInitScript(() => {
    localStorage.setItem("sf.v1.lang", JSON.stringify({ lang: "de" }));
    localStorage.setItem("sf.v1.welcomeSeen", JSON.stringify({ seen: true }));
    localStorage.setItem("sf.v1.lastVersion", JSON.stringify({ v: "1.4.0" }));
    localStorage.setItem("sf.v1.feedback", JSON.stringify({ consent: false }));
    localStorage.setItem("sf.v1.tour", JSON.stringify({ home: true, click: true, dice: true }));
  });
}

async function openClick(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator(".card", { hasText: "Click-Trainer" }).first().click();
  await page.waitForSelector(".ct-modes button");
}

async function setSafe(page, insets) {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setSafeAreaInsetsOverride", { insets });
  await page.waitForTimeout(80);
}

async function metrics(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".ct-modes button")].map((b) => {
      const r = b.getBoundingClientRect();
      return {
        text: b.textContent.replace(/\s+/g, " ").trim(),
        on: b.classList.contains("on"),
        x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom,
        scrollW: b.scrollWidth, clientW: b.clientWidth,
      };
    });
    const h = document.querySelector(".help-dot").getBoundingClientRect();
    return {
      buttons,
      help: { x: h.x, y: h.y, w: h.width, h: h.height, right: h.right, bottom: h.bottom },
      helpOpen: !!document.querySelector(".help-modal"),
      noclick: !!document.querySelector(".nc-title"),
      ramp: (document.body.innerText || "").includes("Alle paar Sekunden"),
    };
  });
}

async function tapButton(page, index) {
  const box = await page.locator(".ct-modes button").nth(index).boundingBox();
  if (!box) throw new Error("Tab fehlt");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const failures = [];

function check(name, ok, detail) {
  if (!ok) failures.push(`${name}: ${detail}`);
  else console.log("ok", name);
}

async function scenario(label, viewport, insets) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    locale: "de-DE",
  });
  const page = await ctx.newPage();
  await prep(page);
  await openClick(page);
  if (insets) await setSafe(page, insets);

  let m = await metrics(page);
  for (const b of m.buttons) {
    check(`${label} Höhe ${b.text}`, b.h >= 44, `nur ${Math.round(b.h)}px`);
    check(`${label} Text ${b.text}`, b.scrollW <= b.clientW + 1, `abgeschnitten ${b.scrollW}>${b.clientW}`);
    check(`${label} ? liegt nicht auf ${b.text}`, !intersects(b, m.help), `Tab ${Math.round(b.x)},${Math.round(b.y)}–${Math.round(b.right)},${Math.round(b.bottom)} ? ${Math.round(m.help.x)},${Math.round(m.help.y)}–${Math.round(m.help.right)},${Math.round(m.help.bottom)}`);
  }
  check(`${label} drei Tabs`, m.buttons.length === 3 && m.buttons.map((b) => b.text).join("|") === "Tempo halten|Tempo steigern|NoClick", m.buttons.map((b) => b.text).join("|"));

  await tapButton(page, 1);
  m = await metrics(page);
  check(`${label} Tap Tempo steigern`, m.buttons[1].on && m.ramp && !m.helpOpen, JSON.stringify({ on: m.buttons.map((b) => b.on), ramp: m.ramp, help: m.helpOpen }));

  await tapButton(page, 2);
  m = await metrics(page);
  check(`${label} Tap NoClick`, m.buttons[2].on && m.noclick && !m.helpOpen, JSON.stringify({ on: m.buttons.map((b) => b.on), noclick: m.noclick, help: m.helpOpen }));

  // Rechte Kante von NoClick: genau dort lag das ? und hat den Tap geschluckt.
  const nc = m.buttons[2];
  await tapButton(page, 0);
  await page.touchscreen.tap(nc.right - 6, nc.y + nc.h / 2);
  await page.waitForTimeout(60);
  m = await metrics(page);
  check(`${label} Tap rechte Kante NoClick`, m.buttons[2].on && m.noclick && !m.helpOpen, JSON.stringify({ on: m.buttons.map((b) => b.on), noclick: m.noclick, help: m.helpOpen }));

  await tapButton(page, 0);
  m = await metrics(page);
  check(`${label} Tap Tempo halten`, m.buttons[0].on && !m.noclick && !m.ramp && !m.helpOpen, JSON.stringify({ on: m.buttons.map((b) => b.on), ramp: m.ramp, noclick: m.noclick }));

  await ctx.close();
}

await scenario("844×390", { width: 844, height: 390 }, { top: 0, left: 59, bottom: 21, right: 59 });
await scenario("390×844", { width: 390, height: 844 }, null);
await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("alle Tap-Tests bestanden");
