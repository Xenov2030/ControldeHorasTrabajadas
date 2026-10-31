export const EMPLOYMENT_TYPES = {
  unspecified: "Sin definir",
  registered: "Registrado / en blanco",
  unregistered: "No registrado / en negro",
  mixed: "Mixto: una parte registrada",
};
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
  return settings;
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
