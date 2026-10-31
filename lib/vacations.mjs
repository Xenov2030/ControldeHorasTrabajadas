import {
  validateWorkspace,
  parseDate,
  addDays,
  scheduleHours,
} from "./workspace.mjs";

export const vacationDays = (start, end) =>
  (parseDate(end) - parseDate(start)) / 86400000 + 1;
export function addVacation(state, period) {
  validateWorkspace(state);
  const days = vacationDays(period.start, period.end);
  if (days < 1 || days > 366)
    throw new Error("Elegí un período de vacaciones de entre 1 y 366 días.");
  if (state.activeSession)
    throw new Error("Cerrá la jornada activa antes de registrar vacaciones.");
  if (
    state.entries.some((e) => e.date >= period.start && e.date <= period.end) ||
    (state.vacationPeriods || []).some(
      (p) => p.start <= period.end && p.end >= period.start,
    )
  )
    throw new Error(
      "Ese período coincide con jornadas, ausencias o vacaciones ya registradas. Revisá esas fechas antes de guardarlo.",
    );
  const hours = scheduleHours(state.schedule);
  const entries = [];
  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    const amount = hours[(parseDate(date).getUTCDay() + 6) % 7];
    if (amount > 0)
      entries.push({
        id: `${period.id}-${date}`,
        date,
        type: "vacation",
        hours: amount,
        quantity: 0,
        note: period.note,
        vacationPaid: period.paid,
        vacationPeriodId: period.id,
      });
  }
  return validateWorkspace({
    ...state,
    vacationPeriods: [...(state.vacationPeriods || []), period],
    entries: [...state.entries, ...entries],
  });
}
export function removeVacation(state, id) {
  return validateWorkspace({
    ...state,
    vacationPeriods: (state.vacationPeriods || []).filter((p) => p.id !== id),
    entries: state.entries.filter((e) => e.vacationPeriodId !== id),
  });
}
