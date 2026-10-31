import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  periodTotals,
  validateWorkspace,
} from "../lib/workspace.mjs";
import { addJob, switchJob } from "../lib/jobs.mjs";

function fixture(more = {}) {
  const state = createWorkspace();
  state.compensation[0] = {
    ...state.compensation[0],
    amount: 1000,
    employmentType: "registered",
    deductionPercent: 17,
    amountBasis: "gross",
    ...more,
  };
  state.entries = [
    {
      id: "entry",
      date: "2026-10-09",
      type: "work",
      hours: 10,
      quantity: 0,
      note: "",
    },
  ];
  return state;
}
const totals = (s) => periodTotals(s, "2026-10-01", "2026-10-15");
test("registered gross income applies configured deductions including extra hours", () => {
  const result = totals(fixture());
  assert.equal(result.amount, 11000); // Friday: 8 regular + 2 at 1.5.
  assert.equal(result.payrollDeductionAmount, 1870);
  assert.equal(result.netAmount, 9130);
});
test("extras can be excluded and mixed work applies only the registered share", () => {
  assert.equal(
    totals(fixture({ deductExtras: false })).payrollDeductionAmount,
    1360,
  );
  const mixed = totals(
    fixture({
      employmentType: "mixed",
      registeredPercent: 60,
      deductExtras: false,
    }),
  );
  assert.equal(mixed.payrollDeductionAmount, 816);
  assert.equal(mixed.netAmount, 10184);
});
test("net inputs, unregistered work and legacy conditions are never discounted again", () => {
  for (const patch of [
    { amountBasis: "net" },
    { employmentType: "unregistered" },
    { employmentType: undefined },
  ]) {
    const s = fixture(patch);
    const result = totals(s);
    assert.equal(result.netAmount, result.amount);
    assert.equal(result.payrollDeductionAmount, 0);
  }
  const old = createWorkspace();
  validateWorkspace(old);
  assert.equal(totals(old).payrollDeductionAmount, 0);
});
test("effective dates retain historical rates within a single period", () => {
  const s = fixture();
  s.compensation.push({
    ...s.compensation[0],
    id: "new",
    effectiveFrom: "2026-10-10",
    deductionPercent: 20,
  });
  s.entries.push({
    ...s.entries[0],
    id: "entry2",
    date: "2026-10-12",
    hours: 9,
  });
  const result = totals(s);
  assert.equal(result.amount, 20000);
  assert.equal(result.payrollDeductionAmount, 3670);
  assert.equal(result.netAmount, 16330);
});
test("fixed salary deductions use the projected period less manual unpaid absence", () => {
  const s = fixture({ mode: "monthly", amount: 31000 });
  s.entries = [
    {
      id: "absence",
      date: "2026-10-09",
      type: "absence",
      hours: 8,
      quantity: 0,
      absenceJustified: true,
      absencePaid: false,
      deductionAmount: 1000,
      note: "",
    },
  ];
  const result = totals(s);
  assert.equal(result.amount, 14000);
  assert.equal(result.deductionAmount, 1000);
  assert.equal(result.payrollDeductionAmount, 2380);
  assert.equal(result.netAmount, 11620);
});
test("piecework, paid vacation and holidays use the regular payment deduction", () => {
  const piece = fixture({ mode: "piecework" });
  piece.entries[0].quantity = 12;
  assert.equal(totals(piece).payrollDeductionAmount, 2040);
  for (const type of ["vacation", "holiday"]) {
    const s = fixture();
    s.entries[0] = { ...s.entries[0], type, hours: 8 };
    assert.equal(
      totals(s).payrollDeductionAmount,
      type === "vacation" ? 1360 : 2720,
    );
  }
});
test("each job keeps its own contribution settings after switching and JSON recovery", () => {
  const first = fixture();
  const second = addJob(first, "Otro trabajo", "other");
  second.entries = structuredClone(first.entries);
  second.compensation[0].employmentType = "unregistered";
  const restored = JSON.parse(JSON.stringify(second));
  assert.equal(totals(restored).payrollDeductionAmount, 0);
  assert.equal(
    totals(switchJob(restored, "primary")).payrollDeductionAmount,
    1870,
  );
});
test("invalid imported employment settings fail validation", () => {
  for (const patch of [
    { deductionPercent: -1 },
    { deductionPercent: 101 },
    { deductionPercent: "17" },
    { registeredPercent: -1 },
    { amountBasis: "unknown" },
    { employmentType: "unknown" },
    { deductExtras: "yes" },
  ]) {
    assert.throws(() => validateWorkspace(fixture(patch)));
  }
});
