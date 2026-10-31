import { createWorkspace, validateWorkspace } from "./workspace.mjs";

export const MAX_JOBS = 10;
export const jobId = (workspace) => workspace.jobId || "primary";
export const jobName = (workspace) => workspace.jobName || "Mi trabajo";
export const listJobs = (workspace) => [
  workspace,
  ...(workspace.otherJobs || []),
];
function standalone(workspace) {
  const { otherJobs, ...job } = workspace;
  return { ...job, jobId: jobId(workspace), jobName: jobName(workspace) };
}
export function renameJob(workspace, name) {
  const clean = name.trim();
  if (!clean || clean.length > 80)
    throw new Error("Ingresá un nombre de trabajo de hasta 80 caracteres.");
  return validateWorkspace({
    ...workspace,
    jobId: jobId(workspace),
    jobName: clean,
  });
}
export function switchJob(workspace, id) {
  validateWorkspace(workspace);
  const jobs = listJobs(workspace);
  const selected = jobs.find((job) => jobId(job) === id);
  if (!selected) throw new Error("No se encontró ese trabajo.");
  return validateWorkspace({
    ...standalone(selected),
    otherJobs: jobs.filter((job) => jobId(job) !== id).map(standalone),
  });
}
export function addJob(workspace, name, id) {
  validateWorkspace(workspace);
  if (listJobs(workspace).length >= MAX_JOBS)
    throw new Error(`Podés registrar hasta ${MAX_JOBS} trabajos en esta beta.`);
  if (!id || listJobs(workspace).some((job) => jobId(job) === id))
    throw new Error("El identificador del trabajo ya existe.");
  const next = renameJob(createWorkspace(), name);
  next.jobId = id;
  // Personal preferences carry over; employment dates and all work data start empty.
  next.profile = { ...workspace.profile, employmentStart: "" };
  next.otherJobs = listJobs(workspace).map(standalone);
  return validateWorkspace(next);
}
