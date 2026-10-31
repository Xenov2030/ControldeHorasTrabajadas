import { currencyFor } from "./locations.mjs";
export const CURRENCY_BACKUP_KEY = "jornada-before-currency-change-v2";
export function hasFinancialRecords(state) {
  return Boolean(
    state &&
    (state.entries.length ||
      state.payments.length ||
      state.sac.length ||
      state.compensation.length > 1),
  );
}
export function checkCurrencyCorrection(previous, next, confirmed = false) {
  if (!previous || currencyFor(previous.profile) === currencyFor(next.profile))
    return false;
  if (previous.activeSession)
    throw new Error("Cerrá la jornada activa antes de cambiar la moneda.");
  if (hasFinancialRecords(previous) && !confirmed)
    throw new Error(
      `Confirmá que los importes guardados ya corresponden a ${currencyFor(next.profile)}. Este cambio no convierte dinero.`,
    );
  return hasFinancialRecords(previous);
}
