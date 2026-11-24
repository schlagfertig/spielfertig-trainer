import { test } from "node:test";
import assert from "node:assert/strict";
import { clampInt, commitNumber, draftDigits } from "../src/lib/commitNumber.js";

test("commitNumber: gültigen Wert behalten", () => {
  assert.equal(commitNumber("95", 40, 260, 160), 95);
  assert.equal(commitNumber("10", 2, 60, 10), 10);
  assert.equal(commitNumber("4", 1, 20, 4), 4);
  assert.equal(commitNumber("80", 30, 260, 80), 80);
});

test("commitNumber: leer oder ungültig behält den letzten gültigen Wert", () => {
  assert.equal(commitNumber("", 40, 260, 160), 160);
  assert.equal(commitNumber("   ", 2, 60, 10), 10);
  assert.equal(commitNumber("abc", 1, 20, 4), 4);
  assert.equal(commitNumber(undefined, 30, 260, 80), 80);
});

test("commitNumber: erst beim Bestätigen auf min/max begrenzen", () => {
  assert.equal(commitNumber("9", 40, 260, 160), 40);
  assert.equal(commitNumber("1", 2, 60, 10), 2);
  assert.equal(commitNumber("0", 1, 20, 4), 1);
  assert.equal(commitNumber("300", 40, 260, 160), 260);
  assert.equal(commitNumber("99", 1, 20, 4), 20);
  assert.equal(commitNumber("20", 30, 260, 80), 30);
});

test("draftDigits: Feld darf leer bleiben, keine Begrenzung während des Tippens", () => {
  assert.equal(draftDigits(""), "");
  assert.equal(draftDigits("9"), "9");
  assert.equal(draftDigits("95"), "95");
  assert.equal(draftDigits("9a5"), "95");
  assert.equal(draftDigits("12345", 3), "123");
});

test("clampInt rundet und begrenzt", () => {
  assert.equal(clampInt(40.2, 40, 260), 40);
  assert.equal(clampInt(39.6, 40, 260), 40);
  assert.equal(clampInt(300, 40, 260), 260);
});
