import { validateEmployment, employmentDeduction } from "./employment.mjs";
import { calculate, defaults } from "./payroll.mjs";
import {
  COUNTRIES,
  countryFor,
  zoneFor,
  CURRENCIES,
  DEFAULT_ZONE,
  localInstant,
} from "./locations.mjs";

export const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const PAY_MODES = {
  hourly: "Por hora",
  daily: "Por jornada",
  fortnightly: "Por quincena",
  monthly: "Por mes",
  piecework: "Al tanto / producción",
};
export const ENTRY_TYPES = {
  work: "Trabajo",
  holiday: "Feriado trabajado",
  vacation: "Vacaciones",
  absence: "Falta / ausencia",
};
export const currency = (value, code = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: code,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(value);
export const dateLabel = (date) => date.split("-").reverse().join("/");
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function localDate(now = new Date(), timeZone = DEFAULT_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (name) => parts.find((p) => p.type === name).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Ingresá una fecha válida.");
  const d = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value)
    throw new Error("Ingresá una fecha válida.");
  return d;
}
export const isoDate = (d) => d.toISOString().slice(0, 10);
export function addDays(value, days) {
  const d = parseDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}
const monthDate = (year, month, day) =>
  isoDate(new Date(Date.UTC(year, month, day, 12)));
function number(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`Revisá ${label}.`);
}
export function createWorkspace() {
  return {
    version: 2,
    configured: false,
    profile: {
      name: "",
      country: "AR",
      region: "Mendoza",
      timeZone: DEFAULT_ZONE,
      currency: "ARS",
      employmentStart: "",
      theme: "system",
    },
    schedule: DAYS.map((_, i) => ({
      start: i < 5 ? "05:00" : "",
      end: i < 4 ? "14:00" : i === 4 ? "13:00" : "",
      breakMinutes: 0,
    })),
    cycle: {
      kind: "fortnightly",
      closeDay: 15,
      firstPayDay: 20,
      firstOffset: 0,
      secondPayDay: 5,
      secondOffset: 1,
      monthlyPayDay: 5,
      monthlyOffset: 1,
      weeklyPayDay: 5,
    },
    compensation: [
      {
        id: "initial",
        effectiveFrom: "1900-01-01",
        mode: "hourly",
        amount: 3500,
        overtimeRate: 3500,
        dailyHours: 8,
        unit: "unidad",
        overtimeMultiplier: 1.5,
        holidayMultiplier: 2,
        vacationPaid: true,
      },
    ],
    entries: [],
    vacationPeriods: [],
    activeSession: null,
    payments: [],
    reminders: {
      enabled: false,
      delayMinutes: 10,
      repeatMinutes: 60,
      maxReminders: 3,
    },
    sac: [],
  };
}
export function timeMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error("Ingresá un horario válido.");
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function duration(start, end, breakMinutes = 0, nextDay = false) {
  const minutes = timeMinutes(end) - timeMinutes(start) + (nextDay ? 1440 : 0);
  number(breakMinutes, 0, 1439, "los minutos de descanso");
  if (minutes <= 0 || minutes > 1440 || breakMinutes >= minutes)
    throw new Error(
      "Revisá la entrada, la salida y el descanso. Para turnos nocturnos, marcá «Termina al día siguiente».",
    );
  return (minutes - breakMinutes) / 60;
}
export function scheduleHours(schedule) {
  return schedule.map((day) => {
    if (!day.start && !day.end) return 0;
    return duration(
      day.start,
      day.end,
      day.breakMinutes,
      timeMinutes(day.end) <= timeMinutes(day.start),
    );
  });
}
export function bounds(reference, cycle) {
  const d = parseDate(reference),
    y = d.getUTCFullYear(),
    m = d.getUTCMonth(),
    day = d.getUTCDate();
  if (cycle.kind === "weekly") {
    const start = addDays(reference, -(d.getUTCDay() + 6) % 7);
    return [start, addDays(start, 6)];
  }
  if (cycle.kind === "fortnightly") {
    number(cycle.closeDay, 1, 27, "el cierre de la primera quincena");
    return day <= cycle.closeDay
      ? [monthDate(y, m, 1), monthDate(y, m, cycle.closeDay)]
      : [monthDate(y, m, cycle.closeDay + 1), monthDate(y, m + 1, 0)];
  }
  return [monthDate(y, m, 1), monthDate(y, m + 1, 0)];
}
function clampedDate(year, month, day) {
  const last = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  return monthDate(year, month, Math.min(day, last));
}
export function paymentDate(start, cycle) {
  const d = parseDate(start),
    y = d.getUTCFullYear(),
    m = d.getUTCMonth();
  if (cycle.kind === "weekly") {
    const end = bounds(start, cycle)[1];
    const weekday = parseDate(end).getUTCDay();
    return addDays(end, (cycle.weeklyPayDay - weekday + 7) % 7 || 7);
  }
  if (cycle.kind === "fortnightly") {
    const first = d.getUTCDate() === 1;
    return clampedDate(
      y,
      m + (first ? cycle.firstOffset : cycle.secondOffset),
      first ? cycle.firstPayDay : cycle.secondPayDay,
    );
  }
  return clampedDate(y, m + cycle.monthlyOffset, cycle.monthlyPayDay);
}
export function compensationAt(versions, date) {
  return (
    [...versions]
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
      .find((v) => v.effectiveFrom <= date) || null
  );
}
export function validateWorkspace(state, nestedJob = false) {
  if (
    state?.jobId !== undefined &&
    (typeof state.jobId !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(state.jobId))
  )
    throw new Error("El identificador del trabajo no es válido.");
  if (
    state?.jobName !== undefined &&
    (typeof state.jobName !== "string" ||
      !state.jobName.trim() ||
      state.jobName.length > 80)
  )
    throw new Error("El nombre del trabajo no es válido.");
  if (state?.otherJobs !== undefined) {
    if (
      nestedJob ||
      !Array.isArray(state.otherJobs) ||
      state.otherJobs.length > 9
    )
      throw new Error("La lista de trabajos no es válida.");
    const ids = new Set([state.jobId || "primary"]);
    for (const job of state.otherJobs) {
      if (!job?.jobId || !job?.jobName || ids.has(job.jobId))
        throw new Error("Hay trabajos sin identificar o duplicados.");
      ids.add(job.jobId);
      validateWorkspace(job, true);
    }
  }
  if (
    state?.version !== 2 ||
    !state.profile ||
    !Array.isArray(state.entries) ||
    !Array.isArray(state.compensation) ||
    !state.compensation.length
  )
    throw new Error("El archivo no tiene un formato compatible con Jornada.");
  if (
    !["system", "light", "dark"].includes(state.profile.theme) ||
    typeof state.profile.name !== "string" ||
    state.profile.name.length > 80
  )
    throw new Error("Revisá tu perfil.");
  if (
    state.profile.country &&
    !COUNTRIES.some((c) => c.code === state.profile.country)
  )
    throw new Error("Elegí un país del catálogo.");
  const location = countryFor(state.profile);
  if (!location.regions.includes(state.profile.region))
    throw new Error(
      "Elegí una provincia, estado o departamento del país seleccionado.",
    );
  if (
    state.profile.timeZone &&
    !location.timeZones.includes(state.profile.timeZone)
  )
    throw new Error("Elegí una zona horaria del país seleccionado.");
  if (state.profile.currency && !CURRENCIES.includes(state.profile.currency))
    throw new Error("Elegí una moneda válida.");
  if (state.profile.employmentStart) parseDate(state.profile.employmentStart);
  if (!Array.isArray(state.schedule) || state.schedule.length !== 7)
    throw new Error("Revisá el horario semanal.");
  scheduleHours(state.schedule);
  const cycle = state.cycle;
  if (!cycle || !["weekly", "fortnightly", "monthly"].includes(cycle.kind))
    throw new Error("Revisá el período de liquidación.");
  for (const key of [
    "closeDay",
    "firstPayDay",
    "secondPayDay",
    "monthlyPayDay",
  ]) {
    number(
      cycle[key],
      1,
      key === "closeDay" ? 27 : 31,
      "los días de cierre y cobro",
    );
    if (!Number.isInteger(cycle[key]))
      throw new Error("Los días deben ser enteros.");
  }
  for (const key of ["firstOffset", "secondOffset", "monthlyOffset"])
    if (![0, 1, 2].includes(cycle[key]))
      throw new Error("Revisá el mes de cobro.");
  number(cycle.weeklyPayDay, 0, 6, "el día de cobro semanal");
  const versionDates = new Set();
  for (const v of state.compensation) {
    validateEmployment(v);
    parseDate(v.effectiveFrom);
    if (versionDates.has(v.effectiveFrom))
      throw new Error("Ya existe una condición de pago con esa fecha.");
    versionDates.add(v.effectiveFrom);
    if (!PAY_MODES[v.mode]) throw new Error("Elegí una modalidad de pago.");
    number(v.amount, 0, 1e12, "el importe");
    number(v.overtimeRate, 0, 1e9, "el valor hora para extras");
    number(v.dailyHours, 0.25, 24, "las horas por jornada");
    number(v.overtimeMultiplier, 1, 5, "el multiplicador de extras");
    number(v.holidayMultiplier, 1, 5, "el multiplicador de feriados");
    if (
      typeof v.unit !== "string" ||
      v.unit.length > 40 ||
      typeof v.vacationPaid !== "boolean"
    )
      throw new Error("Revisá las condiciones de pago.");
  }
  const vacations = state.vacationPeriods ?? [];
  if (!Array.isArray(vacations))
    throw new Error("Revisá los períodos de vacaciones.");
  const periodIds = new Set();
  let previousEnd = "";
  for (const p of [...vacations].sort((a, b) =>
    String(a?.start).localeCompare(String(b?.start)),
  )) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      periodIds.has(p.id) ||
      typeof p.paid !== "boolean" ||
      typeof p.note !== "string" ||
      p.note.length > 200
    )
      throw new Error("El período de vacaciones no es válido.");
    const days = (parseDate(p.end) - parseDate(p.start)) / 86400000 + 1;
    if (days < 1 || days > 366 || p.start <= previousEnd)
      throw new Error("Hay períodos de vacaciones inválidos o superpuestos.");
    previousEnd = p.end;
    periodIds.add(p.id);
  }
  const linkedDates = new Set();
  const ids = new Set();
  for (const e of state.entries) {
    parseDate(e.date);
    if (typeof e.id !== "string" || ids.has(e.id))
      throw new Error("Hay registros duplicados o inválidos.");
    ids.add(e.id);
    if (
      !ENTRY_TYPES[e.type] ||
      typeof e.note !== "string" ||
      e.note.length > 200
    )
      throw new Error("Revisá el registro de jornada.");
    const vacation = vacations.find(
      (p) => p.start <= e.date && p.end >= e.date,
    );
    if (
      vacation &&
      (e.type !== "vacation" ||
        e.vacationPeriodId !== vacation.id ||
        e.vacationPaid !== vacation.paid)
    )
      throw new Error(
        "La fecha coincide con un período de vacaciones. Gestioná ese período desde Vacaciones.",
      );
    if (e.vacationPeriodId !== undefined) {
      if (!vacation || linkedDates.has(`${e.vacationPeriodId}:${e.date}`))
        throw new Error("Hay jornadas de vacaciones sin período o duplicadas.");
      linkedDates.add(`${e.vacationPeriodId}:${e.date}`);
    }
    if (
      e.vacationPaid !== undefined &&
      (e.type !== "vacation" || typeof e.vacationPaid !== "boolean")
    )
      throw new Error("Revisá la condición de pago de las vacaciones.");
    number(e.hours, 1 / 60, 24, "las horas");
    number(e.quantity ?? 0, 0, 1e9, "la cantidad producida");
    if (e.type === "absence") {
      if (
        typeof e.absenceJustified !== "boolean" ||
        typeof e.absencePaid !== "boolean"
      )
        throw new Error("Indicá si la falta está justificada y si es paga.");
      number(e.deductionAmount ?? 0, 0, 1e12, "el descuento de la ausencia");
      if ((e.quantity ?? 0) !== 0)
        throw new Error("Una ausencia no puede tener producción.");
    }
    if (
      e.type === "absence" &&
      (e.deductionAmount ?? 0) > 0 &&
      (e.absencePaid ||
        !["monthly", "fortnightly"].includes(
          compensationAt(state.compensation, e.date)?.mode,
        ))
    )
      throw new Error(
        "El descuento manual solo corresponde a ausencias sin pago con sueldo fijo.",
      );
    if (!compensationAt(state.compensation, e.date))
      throw new Error("Falta una condición de pago vigente para esa fecha.");
  }
  // The legacy engine also validates accumulated daily hours and incompatible types.
  const attendance = new Map();
  for (const e of state.entries) {
    const previous = attendance.get(e.date);
    if (previous && (previous.type !== e.type || e.type === "absence"))
      throw new Error(
        "Ya hay un registro incompatible en esa fecha. Revisalo antes de cargar una ausencia o una jornada.",
      );
    attendance.set(e.date, e);
  }
  calculate(
    state.entries.filter((e) => e.type !== "absence"),
    defaults,
  );
  if (
    !Array.isArray(state.payments) ||
    !Array.isArray(state.sac) ||
    !state.reminders
  )
    throw new Error("Falta información de la configuración.");
  if (
    typeof state.reminders.enabled !== "boolean" ||
    !Number.isInteger(state.reminders.maxReminders)
  )
    throw new Error("Revisá los recordatorios.");
  number(state.reminders.delayMinutes, 0, 120, "la demora del aviso");
  number(state.reminders.repeatMinutes, 15, 240, "la repetición del aviso");
  number(state.reminders.maxReminders, 1, 3, "la cantidad de avisos");
  for (const p of state.payments) {
    parseDate(p.start);
    parseDate(p.end);
    parseDate(p.date);
    number(p.amount, 0, 1e12, "el cobro");
  }
  const sacMonths = new Set();
  for (const row of state.sac) {
    if (sacMonths.has(row.month))
      throw new Error("Hay remuneraciones mensuales duplicadas.");
    sacMonths.add(row.month);
    parseDate(row.month + "-01");
    number(row.base, 0, 1e12, "la remuneración mensual");
    number(row.extras, 0, 1e12, "las extras mensuales");
  }
  if (state.activeSession) {
    if (!Number.isFinite(Date.parse(state.activeSession.startedAt)))
      throw new Error("La entrada activa no es válida.");
  }
  return state;
}
export function migrateLegacy(saved) {
  calculate(saved.entries, saved.rules);
  const state = createWorkspace(),
    r = { ...defaults, ...saved.rules };
  state.entries = saved.entries.map((e, i) => ({
    ...e,
    id: e.id || `legacy-${i}`,
    note: e.note || "",
    quantity: 0,
  }));
  state.schedule = state.schedule.map((day, i) => {
    const hours = r.weekdayHours?.[i] ?? r.dailyHours;
    return hours
      ? {
          start: "05:00",
          end: `${String(Math.floor(5 + hours) % 24).padStart(2, "0")}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`,
          breakMinutes: 0,
        }
      : { start: "", end: "", breakMinutes: 0 };
  });
  state.compensation[0] = {
    ...state.compensation[0],
    amount: r.hourlyRate,
    overtimeRate: r.hourlyRate,
    overtimeMultiplier: r.overtimeMultiplier,
    holidayMultiplier: r.holidayMultiplier,
    vacationPaid: r.vacationPaid,
  };
  return validateWorkspace(state);
}
export function periodTotals(state, start, end) {
  const hoursByDay = scheduleHours(state.schedule),
    entries = state.entries.filter((e) => e.date >= start && e.date <= end);
  let regularHours = 0,
    overtimeHours = 0,
    holidayHours = 0,
    vacationHours = 0,
    baseAmount = 0,
    extraAmount = 0,
    holidayAmount = 0,
    quantity = 0,
    absenceHours = 0,
    justifiedAbsences = 0,
    unjustifiedAbsences = 0,
    deductionAmount = 0;
  const earnings = new Map();
  function track(v, value, extras = false) {
    const row = earnings.get(v) || { regular: 0, extras: 0 };
    row[extras ? "extras" : "regular"] += value;
    earnings.set(v, row);
    return value;
  }
  const groups = new Map();
  for (const e of entries) {
    const current = groups.get(e.date) || { ...e, hours: 0, quantity: 0 };
    current.hours += e.hours;
    current.quantity += e.quantity || 0;
    groups.set(e.date, current);
  }
  for (const [date, e] of groups) {
    const v = compensationAt(state.compensation, date);
    if (!v) continue;
    const weekday = (parseDate(date).getUTCDay() + 6) % 7,
      normal = hoursByDay[weekday];
    const regular = Math.min(e.hours, normal),
      extra = Math.max(0, e.hours - normal);
    const rate =
      v.mode === "hourly"
        ? v.amount
        : v.mode === "daily"
          ? v.amount / v.dailyHours
          : v.overtimeRate;
    const fixed = ["monthly", "fortnightly"].includes(v.mode);
    quantity += e.quantity;
    if (e.type === "absence") {
      absenceHours += e.hours;
      if (e.absenceJustified) justifiedAbsences += 1;
      else unjustifiedAbsences += 1;
      if (e.absencePaid && !fixed && v.mode !== "piecework")
        baseAmount += track(v, e.hours * rate);
      if (!e.absencePaid && fixed)
        deductionAmount += -track(v, -(e.deductionAmount || 0));
      continue;
    }
    if (e.type === "vacation") {
      vacationHours += e.hours;
      if (
        (e.vacationPaid ?? v.vacationPaid) &&
        !fixed &&
        v.mode !== "piecework"
      )
        baseAmount += track(v, e.hours * rate);
      continue;
    }
    if (e.type === "holiday") {
      holidayHours += e.hours;
      if (v.mode === "piecework") baseAmount += track(v, e.quantity * v.amount);
      else if (fixed)
        holidayAmount += track(v, e.hours * rate * (v.holidayMultiplier - 1));
      else holidayAmount += track(v, e.hours * rate * v.holidayMultiplier);
      continue;
    }
    regularHours += regular;
    overtimeHours += extra;
    if (v.mode === "piecework") {
      baseAmount += track(v, e.quantity * v.amount);
      continue;
    }
    if (!fixed) baseAmount += track(v, regular * rate);
    extraAmount += track(v, extra * rate * v.overtimeMultiplier, true);
  }
  // Fixed salaries are projected by calendar days, independent from recorded attendance.
  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (state.profile.employmentStart && date < state.profile.employmentStart)
      continue;
    const v = compensationAt(state.compensation, date);
    if (!v || !["monthly", "fortnightly"].includes(v.mode)) continue;
    const cycle =
      v.mode === "monthly"
        ? { kind: "monthly" }
        : { kind: "fortnightly", closeDay: state.cycle.closeDay };
    const [a, b] = bounds(date, cycle),
      days = (parseDate(b) - parseDate(a)) / 86400000 + 1;
    baseAmount += track(v, v.amount / days);
  }
  const payrollDeductionAmount = round(
    [...earnings].reduce(
      (sum, [v, row]) => sum + employmentDeduction(v, row.regular, row.extras),
      0,
    ),
  );
  const amount = round(
    baseAmount + extraAmount + holidayAmount - deductionAmount,
  );
  return {
    payrollDeductionAmount,
    netAmount: round(amount - payrollDeductionAmount),
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    holidayHours: round(holidayHours),
    vacationHours: round(vacationHours),
    workedHours: round(regularHours + overtimeHours + holidayHours),
    quantity,
    absenceHours: round(absenceHours),
    justifiedAbsences,
    unjustifiedAbsences,
    deductionAmount: round(deductionAmount),
    baseAmount: round(baseAmount),
    extraAmount: round(extraAmount),
    holidayAmount: round(holidayAmount),
    amount: round(baseAmount + extraAmount + holidayAmount - deductionAmount),
  };
}
export function reminderFor(state, now = new Date()) {
  if (!state.reminders.enabled || !state.activeSession) return null;
  const date = localDate(
      new Date(state.activeSession.startedAt),
      zoneFor(state.profile),
    ),
    day = state.schedule[(parseDate(date).getUTCDay() + 6) % 7];
  if (!day.start || !day.end) return null;
  const endDate =
    timeMinutes(day.end) <= timeMinutes(day.start) ? addDays(date, 1) : date;
  let expected;
  try {
    expected = localInstant(endDate, day.end, zoneFor(state.profile));
  } catch {
    return null;
  }
  const late =
    (now.getTime() - expected) / 60000 - state.reminders.delayMinutes;
  if (late < 0) return null;
  const index = Math.floor(late / state.reminders.repeatMinutes);
  if (index >= state.reminders.maxReminders) return null;
  return {
    key: `${state.activeSession.startedAt}:${index}`,
    index,
    expected: day.end,
  };
}
export function sacEstimate(rows, year, half, employmentStart = "") {
  const start = `${year}-${half === 1 ? "01" : "07"}-01`,
    end = half === 1 ? `${year}-06-30` : `${year}-12-31`;
  const selected = rows.filter(
    (r) => r.month >= start.slice(0, 7) && r.month <= end.slice(0, 7),
  );
  const months = new Set(selected.map((r) => r.month));
  const best = selected.reduce(
    (max, r) => (r.base + r.extras > max.base + max.extras ? r : max),
    { base: 0, extras: 0, month: "" },
  );
  const totalDays = (parseDate(end) - parseDate(start)) / 86400000 + 1;
  const workedStart =
    employmentStart && employmentStart > start ? employmentStart : start;
  const workedDays =
    workedStart > end
      ? 0
      : (parseDate(end) - parseDate(workedStart)) / 86400000 + 1;
  const factor = workedDays / totalDays;
  return {
    amount: round(((best.base + best.extras) / 2) * factor),
    base: round((best.base / 2) * factor),
    extras: round((best.extras / 2) * factor),
    bestMonth: best.month,
    months: months.size,
    factor,
  };
}
