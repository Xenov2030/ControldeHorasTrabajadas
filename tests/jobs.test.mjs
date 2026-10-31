import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, validateWorkspace } from "../lib/workspace.mjs";
import { addJob, switchJob, renameJob, listJobs } from "../lib/jobs.mjs";
import { cloudPayload } from "../lib/cloud-sync.mjs";

test("existing work becomes the primary job without losing data when adding another", () => {
  const first = createWorkspace();
  first.configured = true;
  first.profile.name = "Nicolas";
  first.compensation[0].amount = 4500;
  first.activeSession = { startedAt: "2026-10-31T08:00:00Z" };
  const next = addJob(first, "Taller", "job-two");
  assert.equal(next.configured, false);
  assert.equal(next.profile.name, "Nicolas");
  assert.equal(next.activeSession, null);
  assert.deepEqual(next.entries, []);
  assert.equal(next.otherJobs[0].compensation[0].amount, 4500);
  assert.ok(next.otherJobs[0].activeSession);
  assert.equal(first.otherJobs, undefined);
  assert.equal(cloudPayload(next), next);
});
test("switching preserves independent salaries, names, schedules and active sessions across JSON reload", () => {
  const first = renameJob(createWorkspace(), "Fábrica");
  first.compensation[0].amount = 4000;
  const second = addJob(first, "Repartos", "second");
  second.compensation[0].amount = 7000;
  second.schedule[0].end = "18:00";
  second.activeSession = { startedAt: "2026-10-31T09:00:00Z" };
  const back = switchJob(JSON.parse(JSON.stringify(second)), "primary");
  assert.equal(back.jobName, "Fábrica");
  assert.equal(back.compensation[0].amount, 4000);
  assert.equal(back.activeSession, null);
  const again = switchJob(back, "second");
  assert.equal(again.compensation[0].amount, 7000);
  assert.equal(again.schedule[0].end, "18:00");
  assert.ok(again.activeSession);
  assert.equal(listJobs(again).length, 2);
});
test("backups refuse duplicate, nested or invalid jobs and enforce the beta limit", () => {
  const state = addJob(createWorkspace(), "Trabajo 2", "two");
  assert.throws(() => addJob(state, "Duplicado", "two"));
  assert.throws(() => renameJob(state, "  "));
  assert.throws(() => switchJob(state, "unknown"));
  const nested = structuredClone(state);
  nested.otherJobs[0].otherJobs = [];
  assert.throws(() => validateWorkspace(nested));
  const duplicate = structuredClone(state);
  duplicate.otherJobs[0].jobId = "two";
  assert.throws(() => validateWorkspace(duplicate));
  const invalid = structuredClone(state);
  invalid.otherJobs[0].compensation[0].amount = -1;
  assert.throws(() => cloudPayload(invalid));
  let many = state;
  for (let i = 3; i <= 10; i++) many = addJob(many, `Trabajo ${i}`, `job-${i}`);
  assert.equal(listJobs(many).length, 10);
  assert.throws(() => addJob(many, "Trabajo 11", "job-11"));
});

test("jobs in Argentina can use ARS and USD independently without converting balances", () => {
  const pesos = renameJob(createWorkspace(), "Empleo local");
  pesos.configured = true;
  pesos.compensation[0].amount = 4000;
  pesos.payments = [
    {
      id: "ars",
      date: "2026-10-20",
      start: "2026-10-01",
      end: "2026-10-15",
      amount: 500000,
    },
  ];
  pesos.sac = [{ month: "2026-10", base: 1000000, extras: 100000 }];
  const dollars = addJob(pesos, "Cliente exterior", "usd-job", "USD");
  assert.equal(dollars.profile.country, "AR");
  assert.equal(dollars.profile.currency, "USD");
  dollars.compensation[0].amount = 20;
  dollars.payments = [{ ...pesos.payments[0], id: "usd", amount: 1600 }];
  dollars.sac = [{ month: "2026-10", base: 1600, extras: 200 }];
  const restored = cloudPayload(JSON.parse(JSON.stringify(dollars)));
  const local = switchJob(restored, "primary");
  assert.equal(local.profile.currency, "ARS");
  assert.equal(local.payments[0].amount, 500000);
  assert.equal(local.compensation[0].amount, 4000);
  assert.equal(local.sac[0].base, 1000000);
  const foreign = switchJob(local, "usd-job");
  assert.equal(foreign.profile.currency, "USD");
  assert.equal(foreign.payments[0].amount, 1600);
  assert.equal(foreign.sac[0].base, 1600);
  assert.throws(() => addJob(local, "Invalid", "invalid", "XYZ"));
});
