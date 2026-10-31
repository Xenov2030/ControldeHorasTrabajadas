import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspace,
  periodTotals,
  validateWorkspace,
} from "../lib/workspace.mjs";
import { addVacation, removeVacation } from "../lib/vacations.mjs";
import { cloudPayload } from "../lib/cloud-sync.mjs";
const period = (more = {}) => ({
  id: "holiday",
  start: "2026-11-02",
  end: "2026-11-15",
  paid: true,
  note: "Verano",
  ...more,
});
test("vacation ranges include rest days while recording only scheduled hours", () => {
  const next = addVacation(createWorkspace(), period());
  assert.equal(next.vacationPeriods.length, 1);
  assert.equal(next.entries.length, 10);
  assert.ok(
    next.entries.every(
      (e) => e.type === "vacation" && e.vacationPeriodId === "holiday",
    ),
  );
  const result = periodTotals(next, "2026-11-01", "2026-11-30");
  assert.equal(result.vacationHours, 88);
  assert.equal(result.workedHours, 0);
  assert.equal(result.overtimeHours, 0);
  assert.equal(result.amount, 88 * 3500);
  assert.equal(
    cloudPayload(JSON.parse(JSON.stringify(next))).entries.length,
    10,
  );
});
test("unpaid vacation excludes hourly pay and does not silently deduct fixed salaries", () => {
  const unpaid = addVacation(createWorkspace(), period({ paid: false }));
  assert.equal(periodTotals(unpaid, "2026-11-01", "2026-11-30").amount, 0);
  const fixed = createWorkspace();
  fixed.compensation[0].mode = "monthly";
  fixed.compensation[0].amount = 300000;
  const next = addVacation(fixed, period({ paid: false }));
  assert.equal(periodTotals(next, "2026-11-01", "2026-11-30").amount, 300000);
});
test("conflicting periods, recorded work, invalid ranges and active sessions are rejected atomically", () => {
  const state = createWorkspace();
  const booked = addVacation(state, period());
  assert.throws(() =>
    addVacation(
      booked,
      period({ id: "other", start: "2026-11-15", end: "2026-11-20" }),
    ),
  );
  assert.throws(() => addVacation(state, period({ end: "2026-11-01" })));
  assert.throws(() => addVacation(state, period({ end: "2028-11-01" })));
  state.activeSession = { startedAt: "2026-10-31T08:00:00Z" };
  assert.throws(() => addVacation(state, period()));
  state.activeSession = null;
  state.entries = [
    {
      id: "work",
      date: "2026-11-08",
      type: "work",
      hours: 2,
      quantity: 0,
      note: "",
    },
  ];
  assert.throws(() => addVacation(state, period()));
  assert.equal(state.vacationPeriods.length, 0);
  assert.equal(state.entries.length, 1);
});
test("vacation calendar blocks work even on rest days inside the full range", () => {
  const state = addVacation(createWorkspace(), period());
  state.entries.push({
    id: "conflict",
    date: "2026-11-08",
    type: "work",
    hours: 2,
    quantity: 0,
    note: "",
  });
  assert.throws(() => validateWorkspace(state));
});
test("deleting a period removes its generated entries and preserves other periods", () => {
  const state = addVacation(
    addVacation(createWorkspace(), period()),
    period({ id: "second", start: "2026-12-01", end: "2026-12-03" }),
  );
  const next = removeVacation(state, "holiday");
  assert.equal(next.vacationPeriods.length, 1);
  assert.ok(next.entries.every((e) => e.vacationPeriodId === "second"));
  const broken = structuredClone(next);
  broken.vacationPeriods = [];
  assert.throws(() => validateWorkspace(broken));
});
test("legacy single-day vacations remain valid with no period metadata", () => {
  const state = createWorkspace();
  delete state.vacationPeriods;
  state.entries = [
    {
      id: "old",
      date: "2026-10-09",
      type: "vacation",
      hours: 8,
      quantity: 0,
      note: "",
    },
  ];
  validateWorkspace(state);
  assert.equal(
    periodTotals(state, "2026-10-01", "2026-10-15").vacationHours,
    8,
  );
});
