import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const { dialHintSeen, markDialHintSeen, DIAL_TOPICS } = await import("../src/lib/dialHintOnce.js");

beforeEach(() => store.clear());

test("frischer Speicher: Hinweis noch nicht gesehen", () => {
  assert.equal(dialHintSeen(), false);
});

test("nach markDialHintSeen gilt er überall als gesehen", () => {
  markDialHintSeen();
  assert.equal(store.get("sf.v1.dialHint"), JSON.stringify({ seen: true }));
  assert.equal(dialHintSeen(), true);
});

for (const k of DIAL_TOPICS) {
  test(`Migration: alte Kurzhilfe „${k}“ gesehen → Hinweis gesehen`, () => {
    store.set("sf.v1.tour", JSON.stringify({ [k]: true }));
    assert.equal(dialHintSeen(), true);
    assert.equal(store.get("sf.v1.dialHint"), JSON.stringify({ seen: true }));
  });
}

test("Migration: nur Noten-Hilfe gesehen (kein Rad) → noch nicht gesehen", () => {
  store.set("sf.v1.tour", JSON.stringify({ archive: true }));
  assert.equal(dialHintSeen(), false);
});
