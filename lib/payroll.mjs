export const defaults = {
  hourlyRate: 3500,
  dailyHours: 8,
  overtimeMultiplier: 1.5,
  holidayMultiplier: 2,
  vacationPaid: true,
};
export function calculate(entries, rules = defaults) {
  const r = { ...defaults, ...rules };
  if (
    ![
      r.hourlyRate,
      r.dailyHours,
      r.overtimeMultiplier,
      r.holidayMultiplier,
    ].every(Number.isFinite) ||
    r.hourlyRate < 0 ||
    r.dailyHours <= 0 ||
    r.dailyHours > 24 ||
    r.overtimeMultiplier < 1 ||
    r.holidayMultiplier < 1
  )
    throw new Error("Revisá los valores de las reglas.");
  if (
    r.weekdayHours &&
    (r.weekdayHours.length !== 7 ||
      !r.weekdayHours.every((h) => Number.isFinite(h) && h >= 0 && h <= 24))
  )
    throw new Error("Revisá el horario semanal.");
  const days = new Map();
  for (const e of entries) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      !["work", "holiday", "vacation"].includes(e.type)
    )
      throw new Error("Jornada inválida.");
    const hours = Number(e.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24)
      throw new Error("Las horas deben ser mayores que cero y hasta 24.");
    const previous = days.get(e.date);
    if (previous && previous.type !== e.type)
      throw new Error("Una fecha no puede tener tipos de jornada distintos.");
    const total = (previous?.hours || 0) + hours;
    if (total > 24) throw new Error("Una fecha no puede superar las 24 horas.");
    days.set(e.date, { type: e.type, hours: total });
  }
  let regularHours = 0,
    overtimeHours = 0,
    holidayHours = 0,
    vacationHours = 0,
    amount = 0;
  for (const [date, { type, hours }] of days.entries()) {
    if (type === "vacation") {
      vacationHours += hours;
      if (r.vacationPaid) amount += hours * r.hourlyRate;
    } else if (type === "holiday") {
      holidayHours += hours;
      amount += hours * r.hourlyRate * r.holidayMultiplier;
    } else {
      const weekday = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
      const threshold = r.weekdayHours?.[weekday] ?? r.dailyHours;
      const regular = Math.min(hours, threshold),
        extra = Math.max(0, hours - threshold);
      regularHours += regular;
      overtimeHours += extra;
      amount += (regular + extra * r.overtimeMultiplier) * r.hourlyRate;
    }
  }
  return {
    regularHours,
    overtimeHours,
    holidayHours,
    vacationHours,
    workedHours: regularHours + overtimeHours + holidayHours,
    amount: Math.round(amount * 100) / 100,
  };
}

export function periodBounds(reference, kind = "monthly") {
  const date = new Date(reference + "T12:00:00Z");
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha inválida.");
  const format = (d) => d.toISOString().slice(0, 10);
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth(),
    day = date.getUTCDate();
  if (kind === "weekly") {
    const start = new Date(date);
    start.setUTCDate(day - ((date.getUTCDay() + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return [format(start), format(end)];
  }
  if (kind === "fortnightly")
    return [
      format(new Date(Date.UTC(year, month, day <= 15 ? 1 : 16, 12))),
      format(
        new Date(
          Date.UTC(year, month + (day <= 15 ? 0 : 1), day <= 15 ? 15 : 0, 12),
        ),
      ),
    ];
  return [
    format(new Date(Date.UTC(year, month, 1, 12))),
    format(new Date(Date.UTC(year, month + 1, 0, 12))),
  ];
}
