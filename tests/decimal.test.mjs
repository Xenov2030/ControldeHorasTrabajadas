import test from "node:test";
import assert from "node:assert/strict";
import { parseDecimal, decimalText } from "../lib/decimal.mjs";
test("coma y punto producen el mismo valor decimal", () => {
  assert.equal(parseDecimal("3500,50"), 3500.5);
  assert.equal(parseDecimal("3500.50"), 3500.5);
  assert.equal(parseDecimal("8,75"), 8.75);
  assert.equal(parseDecimal(",5"), 0.5);
});
test("acepta formatos de miles explícitos con parte decimal", () => {
  assert.equal(parseDecimal("1.234.567,89"), 1234567.89);
  assert.equal(parseDecimal("1,234,567.89"), 1234567.89);
});
test("un único separador se interpreta como decimal, nunca como miles implícitos", () => {
  assert.equal(parseDecimal("1.234"), 1.234);
  assert.equal(parseDecimal("1,234"), 1.234);
});
test("rechaza texto, exponentes, múltiples separadores y valores vacíos", () => {
  for (const raw of [
    "",
    " ",
    "1,2,3",
    "1.2.3",
    "1e5",
    "NaN",
    "Infinity",
    "--4",
    "3500,",
    "1,00.50",
  ])
    assert.throws(() => parseDecimal(raw));
});
test("los importes no se convierten en cero al quedar vacíos y muestran coma en español", () => {
  assert.equal(decimalText(3500.5), "3500,5");
  assert.equal(decimalText(""), "");
  assert.equal(decimalText(0), "0");
});
