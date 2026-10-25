import { test } from "node:test";
import assert from "node:assert/strict";
import { EN } from "../src/lib/en.js";
import { EN2 } from "../src/lib/en2.js";
import { HELP } from "../src/lib/helpCopy.js";
import { clampAudioOffsetMs, latencyHintMs } from "../src/lib/audioOffset.js";

const COPY = { ...EN, ...EN2 };

test("Latenz: Bereich 0–200 ms in 5er-Schritten", () => {
  assert.equal(clampAudioOffsetMs(0), 0);
  assert.equal(clampAudioOffsetMs(64), 65);
  assert.equal(clampAudioOffsetMs(65), 65);
  assert.equal(clampAudioOffsetMs(200), 200);
  assert.equal(clampAudioOffsetMs(201), 200);
  assert.equal(clampAudioOffsetMs(-65), 0);
  assert.equal(clampAudioOffsetMs(Number.NaN), 0);
  assert.equal(clampAudioOffsetMs("40"), 40);
});

test("Latenz: Hinweis nur aus baseLatency + outputLatency, nie ein fester Wert", () => {
  assert.equal(latencyHintMs(undefined, undefined), null);
  assert.equal(latencyHintMs(0, 0), null);
  assert.equal(latencyHintMs(-0.02, 0), null);
  assert.equal(latencyHintMs(0.02, undefined), 20);
  assert.equal(latencyHintMs(0.02, 0.044), 65); // 64 ms → nächster 5er-Schritt, nicht fest verdrahtet
  assert.equal(latencyHintMs(0.5, 0.5), 200);
  assert.notEqual(latencyHintMs(0.02, 0.045), -65);
});

test("Latenz: Texte du/dich und britisches Englisch, Hilfe zeigt den Regler", () => {
  assert.equal(COPY["Latenz"], "Latency");
  assert.equal(COPY["5 ms weniger"], "5 ms less");
  assert.equal(COPY["5 ms mehr"], "5 ms more");
  assert.equal(COPY["Latenz in Millisekunden"], "Latency in milliseconds");
  const hint = "Schieb, bis der Click mit dem weißen Puls zusammenfällt. Das merkt sich Schlagfertig für jede Übung.";
  assert.match(COPY[hint], /lines up with the white pulse/);
  assert.match(COPY[hint], /Schlagfertig/);
  assert.doesNotMatch(COPY[hint], /\bpractice\b/i);
  assert.match(HELP.home.find((row) => row[0] === "Latenz")[1], /schiebst du/);
  assert.match(HELP.click.find((row) => row[0] === "Latenz")[1], /Click-Mixer/);
  for (const topic of ["home", "click"]) {
    const row = HELP[topic].find((r) => r[0] === "Latenz");
    assert.ok(COPY[row[0]] && COPY[row[1]], topic);
  }
});

test("Latenz: gespeichert, Bild wartet, Seed überschreibt eine eigene Wahl nicht", async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  const mod = await import(`../src/lib/audioOffset.js?case=${Math.random()}`);
  const ctx = { currentTime: 10, baseLatency: 0.02, outputLatency: 0.044 };
  assert.equal(mod.getAudioOffsetMs(), 0);
  assert.equal(mod.beatDelayMs(ctx, 10.16), 160);
  assert.equal(mod.beatDelayMs(ctx, 9.9), 0);
  assert.equal(mod.visualAudioNow(ctx), 10);

  assert.equal(mod.seedAudioOffset(ctx), 65);
  assert.equal(mod.getAudioOffsetMs(), 65);
  assert.equal(mod.beatDelayMs(ctx, 10.16), 225);
  assert.equal(mod.beatDelayMs({ currentTime: 10 }, 9.95), 15);
  assert.ok(Math.abs(mod.visualAudioNow(ctx) - (10 - 65 / 1000)) < 1e-9);
  assert.deepEqual(JSON.parse(store.get("sf.v1.audioOffset")), { ms: 65, touched: true });

  assert.equal(mod.setAudioOffsetMs(80), 80);
  assert.equal(mod.seedAudioOffset({ baseLatency: 0.01, outputLatency: 0.01 }), 80);
  assert.equal(mod.setAudioOffsetMs(0), 0);
  assert.equal(mod.seedAudioOffset(ctx), 0);
  assert.equal(mod.beatDelayMs(ctx, 10.16), 160);

  const again = await import(`../src/lib/audioOffset.js?reload=${Math.random()}`);
  store.set("sf.v1.audioOffset", JSON.stringify({ ms: 40, touched: true }));
  assert.equal(again.getAudioOffsetMs(), 40);
  assert.equal(again.beatDelayMs({ currentTime: 2 }, 2.5), 540);
});
