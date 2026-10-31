import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace } from "../lib/workspace.mjs";
import { currencyFor } from "../lib/locations.mjs";
import {
  checkCurrencyCorrection,
  hasFinancialRecords,
} from "../lib/currency-change.mjs";
test("país determina la moneda cuando no hay una preferencia explícita", () => {
  assert.equal(currencyFor({ country: "MX" }), "MXN");
  assert.equal(currencyFor({ country: "BR" }), "BRL");
  assert.equal(currencyFor({ country: "AR" }), "ARS");
  assert.equal(currencyFor({ country: "BR", currency: "USD" }), "USD");
});
test("una corrección de moneda no puede reinterpretar importes sin confirmación", () => {
  const s = createWorkspace();
  s.entries = [
    { id: "1", date: "2026-10-09", hours: 8, type: "work", note: "" },
  ];
  const next = { ...s, profile: { ...s.profile, currency: "BRL" } };
  assert.equal(hasFinancialRecords(s), true);
  assert.throws(() => checkCurrencyCorrection(s, next));
  assert.equal(checkCurrencyCorrection(s, next, true), true);
  assert.equal(next.compensation[0].amount, s.compensation[0].amount);
});
test("un espacio sin registros puede configurar su moneda desde el principio", () => {
  const s = createWorkspace(),
    next = { ...s, profile: { ...s.profile, currency: "MXN" } };
  assert.equal(checkCurrencyCorrection(s, next), false);
});
test("no exige confirmar ajustes sin cambiar la moneda y bloquea cambios durante una jornada", () => {
  const s = createWorkspace();
  s.payments = [{ amount: 100 }];
  assert.equal(
    checkCurrencyCorrection(s, {
      ...s,
      profile: { ...s.profile, name: "Ana" },
    }),
    false,
  );
  s.activeSession = { startedAt: "2026-10-30T11:00:00Z" };
  assert.throws(() =>
    checkCurrencyCorrection(
      s,
      { ...s, profile: { ...s.profile, currency: "BRL" } },
      true,
    ),
  );
});
