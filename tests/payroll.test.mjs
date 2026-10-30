import test from "node:test";
import assert from "node:assert/strict";
import { calculate, defaults } from "../lib/payroll.mjs";
const e = (hours, type = "work", date = "2026-10-01") => ({
  hours,
  type,
  date,
});
test("8 normales y 2 extra al 50%", () =>
  assert.equal(
    calculate([e(10)], { ...defaults, hourlyRate: 100 }).amount,
    1100,
  ));
test("acumula turnos del mismo día antes de calcular extras", () =>
  assert.equal(calculate([e(5), e(5)]).overtimeHours, 2));
test("umbral de 9 horas configurable", () =>
  assert.equal(
    calculate([e(10)], { ...defaults, dailyHours: 9 }).overtimeHours,
    1,
  ));
test("feriado usa multiplicador propio sin sumar extras", () => {
  const r = calculate([e(10, "holiday")], { ...defaults, hourlyRate: 100 });
  assert.equal(r.amount, 2000);
  assert.equal(r.overtimeHours, 0);
});
test("vacaciones pagas no cuentan como trabajo", () => {
  const r = calculate([e(8, "vacation")]);
  assert.equal(r.workedHours, 0);
  assert.equal(r.amount, 28000);
});
test("vacaciones sin pago", () =>
  assert.equal(
    calculate([e(8, "vacation")], { ...defaults, vacationPaid: false }).amount,
    0,
  ));
test("rechaza jornadas incompatibles y horas inválidas", () => {
  assert.throws(() => calculate([e(8), e(8, "vacation")]));
  assert.throws(() => calculate([e(-1)]));
  assert.throws(() => calculate([e(13), e(13)]));
});

test("horario 9/9/9/9/8 suma 44 horas sin extras", () => {
  const rules = { ...defaults, weekdayHours: [9, 9, 9, 9, 8, 0, 0] };
  const r = calculate(
    [
      e(9, "work", "2026-10-05"),
      e(9, "work", "2026-10-06"),
      e(9, "work", "2026-10-07"),
      e(9, "work", "2026-10-08"),
      e(8, "work", "2026-10-09"),
    ],
    rules,
  );
  assert.equal(r.regularHours, 44);
  assert.equal(r.overtimeHours, 0);
});
test("sábado de 4 horas pactadas: quinta hora extra", () => {
  const r = calculate([e(5, "work", "2026-10-10")], {
    ...defaults,
    weekdayHours: [8, 8, 8, 8, 8, 4, 0],
  });
  assert.equal(r.regularHours, 4);
  assert.equal(r.overtimeHours, 1);
});
test("día sin jornada habitual cuenta como extra", () =>
  assert.equal(
    calculate([e(3, "work", "2026-10-11")], {
      ...defaults,
      weekdayHours: [9, 9, 9, 9, 8, 0, 0],
    }).overtimeHours,
    3,
  ));
const { periodBounds } = await import("../lib/payroll.mjs");
test("semana cruza mes y año", () =>
  assert.deepEqual(periodBounds("2027-01-01", "weekly"), [
    "2026-12-28",
    "2027-01-03",
  ]));
test("quincenas contemplan año bisiesto", () => {
  assert.deepEqual(periodBounds("2028-02-16", "fortnightly"), [
    "2028-02-16",
    "2028-02-29",
  ]);
  assert.deepEqual(periodBounds("2026-02-15", "fortnightly"), [
    "2026-02-01",
    "2026-02-15",
  ]);
});
test("período mensual", () =>
  assert.deepEqual(periodBounds("2026-04-20"), ["2026-04-01", "2026-04-30"]));
