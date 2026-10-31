export const EMPLOYMENT_TYPES = {
  unspecified: "Sin definir",
  registered: "Registrado / en blanco",
  unregistered: "No registrado / en negro",
  mixed: "Mixto: una parte registrada",
  monotributo: "Monotributista (Argentina)",
};
export const MONOTRIBUTO_CATEGORIES = "ABCDEFGHIJK".split("");

export function employmentSettings(value) {
  const settings = {
    type: value.employmentType ?? "unspecified",
    basis: value.amountBasis ?? "gross",
    rate: value.deductionPercent ?? 0,
    share:
      value.employmentType === "mixed"
        ? (value.registeredPercent ?? 50)
        : value.employmentType === "registered"
          ? 100
          : 0,
    extras: value.deductExtras ?? true,
  };
  return settings;
}
export function validateEmployment(value) {
  const settings = employmentSettings(value);
  if (
    !Object.hasOwn(EMPLOYMENT_TYPES, settings.type) ||
    !["gross", "net"].includes(settings.basis) ||
    typeof settings.extras !== "boolean"
  )
    throw new Error("Revisá la condición laboral y el tipo de importe.");
  for (const number of [
    settings.rate,
    settings.share,
    value.registeredPercent ?? 100,
  ]) {
    if (!Number.isFinite(number) || number < 0 || number > 100)
      throw new Error(
        "Los porcentajes de aportes y parte registrada deben estar entre 0 y 100.",
      );
  }
  if (
    settings.type === "monotributo" &&
    !MONOTRIBUTO_CATEGORIES.includes(value.monotributoCategory)
  )
    throw new Error("Elegí tu categoría de monotributo, de A a K.");
  if (
    value.monotributoCategory !== undefined &&
    !MONOTRIBUTO_CATEGORIES.includes(value.monotributoCategory)
  )
    throw new Error("La categoría de monotributo no es válida.");
  if (
    value.monotributoMonthlyFee !== undefined &&
    (!Number.isFinite(value.monotributoMonthlyFee) ||
      value.monotributoMonthlyFee < 0 ||
      value.monotributoMonthlyFee > 1e12)
  )
    throw new Error("Revisá la cuota mensual de monotributo.");
  return settings;
}
export function monotributoConditions(compensation, start, end) {
  const ordered = [...compensation].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  return ordered.filter(
    (v, i) =>
      v.employmentType === "monotributo" &&
      v.effectiveFrom <= end &&
      (!ordered[i + 1] || ordered[i + 1].effectiveFrom > start),
  );
}
export function employmentDeduction(value, regular, extras) {
  const settings = validateEmployment(value);
  if (settings.basis === "net") return 0;
  return (
    (((Math.max(0, regular + (settings.extras ? extras : 0)) * settings.share) /
      100) *
      settings.rate) /
    100
  );
}
