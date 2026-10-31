import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  validateWorkspace,
  periodTotals,
  bounds,
  paymentDate,
  duration,
  compensationAt,
  migrateLegacy,
  reminderFor,
  sacEstimate,
  parseDate,
  localDate,
  scheduleHours,
} from "../lib/workspace.mjs";
const entry = (date, hours, more = {}) => ({
  id: date,
  date,
  type: "work",
  hours,
  quantity: 0,
  note: "",
  ...more,
});
const state = () => createWorkspace();

test("horario de 44 h y novena hora habitual sin extras", () => {
  const s = state();
  s.entries = [
    entry("2026-10-05", 9),
    entry("2026-10-06", 9),
    entry("2026-10-07", 9),
    entry("2026-10-08", 9),
    entry("2026-10-09", 8),
  ];
  const t = periodTotals(s, "2026-10-01", "2026-10-15");
  assert.equal(t.workedHours, 44);
  assert.equal(t.overtimeHours, 0);
  assert.equal(t.amount, 44 * 3500);
});
test("múltiples turnos se acumulan en el día antes de calcular extras", () => {
  const s = state();
  s.entries = [
    entry("2026-10-05", 5),
    entry("2026-10-05", 5, { id: "second" }),
  ];
  const t = periodTotals(s, "2026-10-05", "2026-10-05");
  assert.equal(t.overtimeHours, 1);
  assert.equal(t.extraAmount, 5250);
});
test("aumentos conservan valor histórico", () => {
  const s = state();
  s.compensation.push({
    ...s.compensation[0],
    id: "raise",
    effectiveFrom: "2026-10-16",
    amount: 4000,
  });
  s.entries = [entry("2026-10-15", 9), entry("2026-10-16", 8)];
  const t = periodTotals(s, "2026-10-01", "2026-10-31");
  assert.equal(t.amount, 9 * 3500 + 8 * 4000);
  assert.equal(compensationAt(s.compensation, "2026-10-14").amount, 3500);
});
test("quincenas personalizadas y fin de febrero bisiesto", () => {
  assert.deepEqual(
    bounds("2028-02-16", { kind: "fortnightly", closeDay: 15 }),
    ["2028-02-16", "2028-02-29"],
  );
  assert.deepEqual(
    bounds("2026-10-11", { kind: "fortnightly", closeDay: 10 }),
    ["2026-10-11", "2026-10-31"],
  );
});
test("primer período al 20 y segundo al 5 del mes siguiente", () => {
  const c = state().cycle;
  assert.equal(paymentDate("2026-10-01", c), "2026-10-20");
  assert.equal(paymentDate("2026-12-16", c), "2027-01-05");
});
test("cobro día 31 se ajusta al último día del mes", () => {
  const c = {
    ...state().cycle,
    kind: "monthly",
    monthlyPayDay: 31,
    monthlyOffset: 1,
  };
  assert.equal(paymentDate("2028-01-01", c), "2028-02-29");
});
test("semana lunes a domingo y pago viernes siguiente", () => {
  const c = { ...state().cycle, kind: "weekly" };
  assert.deepEqual(bounds("2027-01-01", c), ["2026-12-28", "2027-01-03"]);
  assert.equal(paymentDate("2026-12-28", c), "2027-01-08");
});
test("turnos nocturnos descuentan descanso", () => {
  assert.equal(duration("22:00", "06:30", 30, true), 8);
  assert.throws(() => duration("22:00", "06:00"));
  assert.throws(() => duration("05:00", "13:00", 480));
});
test("sueldo mensual no se multiplica por cantidad de registros", () => {
  const s = state();
  s.compensation[0] = {
    ...s.compensation[0],
    mode: "monthly",
    amount: 1000000,
  };
  s.entries = [entry("2026-10-05", 9), entry("2026-10-06", 9)];
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-31").amount, 1000000);
});
test("aumento mensual en medio de mes se prorratea por días calendario", () => {
  const s = state();
  s.compensation[0] = { ...s.compensation[0], mode: "monthly", amount: 310000 };
  s.compensation.push({
    ...s.compensation[0],
    id: "raise",
    amount: 620000,
    effectiveFrom: "2026-10-16",
  });
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-31").amount, 470000);
});
test("sueldo quincenal respeta cierre personalizado", () => {
  const s = state();
  s.cycle.closeDay = 10;
  s.compensation[0] = {
    ...s.compensation[0],
    mode: "fortnightly",
    amount: 100000,
  };
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-31").amount, 200000);
});
test("valor por jornada y extra con divisor explícito", () => {
  const s = state();
  s.compensation[0] = {
    ...s.compensation[0],
    mode: "daily",
    amount: 80000,
    dailyHours: 8,
  };
  s.entries = [entry("2026-10-09", 9)];
  const t = periodTotals(s, "2026-10-09", "2026-10-09");
  assert.equal(t.baseAmount, 80000);
  assert.equal(t.extraAmount, 15000);
});
test("al tanto usa cantidad y no duplica extras", () => {
  const s = state();
  s.compensation[0] = { ...s.compensation[0], mode: "piecework", amount: 500 };
  s.entries = [entry("2026-10-09", 10, { quantity: 20 })];
  const t = periodTotals(s, "2026-10-09", "2026-10-09");
  assert.equal(t.amount, 10000);
  assert.equal(t.extraAmount, 0);
  assert.equal(t.overtimeHours, 2);
});
test("feriados de sueldo fijo suman solo recargo sin duplicar base", () => {
  const s = state();
  s.compensation[0] = {
    ...s.compensation[0],
    mode: "monthly",
    amount: 310000,
    overtimeRate: 1000,
  };
  s.entries = [entry("2026-10-09", 8, { type: "holiday" })];
  const t = periodTotals(s, "2026-10-01", "2026-10-31");
  assert.equal(t.amount, 318000);
  assert.equal(t.holidayAmount, 8000);
});
test("vacaciones no cuentan como trabajo", () => {
  const s = state();
  s.entries = [entry("2026-10-05", 9, { type: "vacation" })];
  const t = periodTotals(s, "2026-10-01", "2026-10-31");
  assert.equal(t.workedHours, 0);
  assert.equal(t.vacationHours, 9);
  assert.equal(t.amount, 31500);
});
test("migración conserva jornadas y valor hora de la primera versión", () => {
  const s = migrateLegacy({
    entries: [{ date: "2026-10-05", hours: 8, type: "work" }],
    rules: { hourlyRate: 1000, weekdayHours: [8, 8, 8, 8, 8, 4, 0] },
  });
  assert.equal(s.entries.length, 1);
  assert.equal(s.compensation[0].amount, 1000);
  assert.equal(scheduleHours(s.schedule)[5], 4);
  assert.equal(s.configured, false);
});
test("validación rechaza fecha inexistente y condiciones duplicadas", () => {
  assert.throws(() => parseDate("2026-02-30"));
  const s = state();
  s.compensation.push({ ...s.compensation[0], id: "second" });
  assert.throws(() => validateWorkspace(s));
});
test("validación rechaza horas acumuladas incompatibles y archivo ajeno", () => {
  const s = state();
  s.entries = [
    entry("2026-10-05", 8),
    entry("2026-10-05", 8, { id: "second", type: "vacation" }),
  ];
  assert.throws(() => validateWorkspace(s));
  assert.throws(() => validateWorkspace({ version: 2 }));
});
test("recordatorios después de salida, con repetición limitada", () => {
  const s = state();
  s.reminders.enabled = true;
  s.activeSession = { startedAt: "2026-10-09T05:00:00-03:00" };
  assert.equal(reminderFor(s, new Date("2026-10-09T13:09:00-03:00")), null);
  assert.equal(reminderFor(s, new Date("2026-10-09T13:10:00-03:00")).index, 0);
  assert.equal(reminderFor(s, new Date("2026-10-09T14:10:00-03:00")).index, 1);
  assert.equal(reminderFor(s, new Date("2026-10-09T16:10:00-03:00")), null);
  s.activeSession = null;
  assert.equal(reminderFor(s, new Date("2026-10-09T14:10:00-03:00")), null);
});
test("recordatorio nocturno ocurre en el día siguiente", () => {
  const s = state();
  s.schedule[4] = { start: "22:00", end: "06:00", breakMinutes: 0 };
  s.reminders.enabled = true;
  s.activeSession = { startedAt: "2026-10-09T22:00:00-03:00" };
  assert.equal(
    reminderFor(s, new Date("2026-10-10T06:10:00-03:00")).expected,
    "06:00",
  );
});
test("zona horaria Argentina al cambiar el día UTC", () =>
  assert.equal(localDate(new Date("2026-10-10T01:00:00Z")), "2026-10-09"));
test("SAC usa base y extras del mismo mejor mes", () => {
  const r = sacEstimate(
    [
      { month: "2026-07", base: 1000000, extras: 0 },
      { month: "2026-08", base: 900000, extras: 300000 },
    ],
    2026,
    2,
  );
  assert.equal(r.amount, 600000);
  assert.equal(r.base, 450000);
  assert.equal(r.extras, 150000);
  assert.equal(r.bestMonth, "2026-08");
  assert.equal(r.months, 2);
});
test("SAC proporcional según fecha de ingreso y cero después del semestre", () => {
  const r = sacEstimate(
    [{ month: "2026-12", base: 1000000, extras: 0 }],
    2026,
    2,
    "2026-10-01",
  );
  assert.equal(r.factor, 92 / 184);
  assert.equal(r.amount, 250000);
  assert.equal(
    sacEstimate(
      [{ month: "2026-12", base: 1000000, extras: 0 }],
      2026,
      2,
      "2027-01-01",
    ).amount,
    0,
  );
});

test("ausencia sin pago se registra sin sumar horas trabajadas o ingresos", () => {
  const s = state();
  s.entries = [
    entry("2026-10-09", 8, {
      type: "absence",
      absenceJustified: false,
      absencePaid: false,
      deductionAmount: 0,
    }),
  ];
  validateWorkspace(s);
  const t = periodTotals(s, "2026-10-01", "2026-10-15");
  assert.equal(t.workedHours, 0);
  assert.equal(t.overtimeHours, 0);
  assert.equal(t.absenceHours, 8);
  assert.equal(t.unjustifiedAbsences, 1);
  assert.equal(t.amount, 0);
});
test("justificada y paga son condiciones independientes", () => {
  const s = state();
  s.entries = [
    entry("2026-10-09", 8, {
      type: "absence",
      absenceJustified: true,
      absencePaid: false,
      deductionAmount: 0,
    }),
  ];
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-15").amount, 0);
  s.entries[0].absencePaid = true;
  const t = periodTotals(s, "2026-10-01", "2026-10-15");
  assert.equal(t.justifiedAbsences, 1);
  assert.equal(t.amount, 28000);
  assert.equal(t.workedHours, 0);
});
test("sueldo fijo solo descuenta la cantidad indicada manualmente", () => {
  const s = state();
  s.compensation[0] = { ...s.compensation[0], mode: "monthly", amount: 310000 };
  s.entries = [
    entry("2026-10-09", 8, {
      type: "absence",
      absenceJustified: false,
      absencePaid: false,
      deductionAmount: 1234.5,
    }),
  ];
  const t = periodTotals(s, "2026-10-01", "2026-10-31");
  assert.equal(t.amount, 308765.5);
  assert.equal(t.deductionAmount, 1234.5);
  s.entries[0].deductionAmount = 0;
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-31").amount, 310000);
});
test("ausencia paga en sueldo fijo no duplica el pago", () => {
  const s = state();
  s.compensation[0] = { ...s.compensation[0], mode: "monthly", amount: 310000 };
  s.entries = [
    entry("2026-10-09", 8, {
      type: "absence",
      absenceJustified: true,
      absencePaid: true,
      deductionAmount: 0,
    }),
  ];
  assert.equal(periodTotals(s, "2026-10-01", "2026-10-31").amount, 310000);
});
test("impide duplicar ausencias o mezclar ausencia con trabajo en la misma fecha", () => {
  const s = state();
  const a = entry("2026-10-09", 8, {
    type: "absence",
    absenceJustified: true,
    absencePaid: false,
    deductionAmount: 0,
  });
  s.entries = [a, entry("2026-10-09", 2, { id: "other" })];
  assert.throws(() => validateWorkspace(s));
  s.entries = [a, { ...a, id: "other" }];
  assert.throws(() => validateWorkspace(s));
});
test("copia anterior sigue siendo válida sin datos de ausencias", () =>
  assert.doesNotThrow(() => validateWorkspace(state())));
