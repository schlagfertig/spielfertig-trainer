import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toOverlayCoords, overlayViewBox } from "../src/lib/leverOverlay.js";

test("toOverlayCoords: im Viewport-Overlay bleiben die Punkte gleich", () => {
  const p = toOverlayCoords(512, 200, 900, 240, { left: 0, top: 0, width: 1024, height: 669 });
  assert.equal(p.cx, 512);
  assert.equal(p.cy, 200);
  assert.equal(p.x, 900);
  assert.equal(p.y, 240);
});

test("toOverlayCoords: bei versetztem Kasten (Hero mit transform) sitzt der Hebel am Dial", () => {
  // iPad quer: Hero 640 px breit, zentriert bei left=192, Dial in der Mitte, Finger rechts.
  const p = toOverlayCoords(512, 180, 900, 220, { left: 192, top: 0, width: 640, height: 820 });
  assert.equal(p.cx, 320);
  assert.equal(p.cy, 180);
  assert.equal(p.x, 708);
  assert.equal(p.y, 220);
});

test("overlayViewBox nimmt die Kastengröße, nicht das Fenster", () => {
  const v = overlayViewBox({ left: 192, top: 10, width: 420, height: 669 });
  assert.equal(v.width, 420);
  assert.equal(v.height, 669);
  assert.equal(v.viewBox, "0 0 420 669");
});

test("HoldLever und DragArrows rechnen containerbezogen und spannen nicht mehr 100vw/innerWidth", () => {
  const src = readFileSync(new URL("../src/lib/metronome.jsx", import.meta.url), "utf8");
  assert.match(src, /toOverlayCoords/);
  assert.match(src, /overlayViewBox/);
  assert.match(src, /createPortal/);
  assert.equal(src.includes('width: "100vw"'), false, "Hebel darf nicht mehr 100vw als Maß nutzen");
  assert.equal(/viewBox=\{`0 0 \$\{vw\} \$\{vh\}`\}/.test(src), false, "viewBox darf nicht mehr innerWidth/innerHeight sein");
});
