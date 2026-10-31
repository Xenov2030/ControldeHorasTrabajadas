import countries from "../data/latam.json" with { type: "json" };
import { Temporal } from "@js-temporal/polyfill";
export const COUNTRIES = countries;
export const DEFAULT_ZONE = "America/Argentina/Mendoza";
export const CURRENCIES = [
  ...new Set([...countries.map((c) => c.currency), "USD", "EUR"]),
].sort();
export function countryFor(profile = {}) {
  return (
    countries.find((c) => c.code === (profile.country || "AR")) ||
    countries.find((c) => c.code === "AR")
  );
}
export function zoneFor(profile = {}) {
  return profile.timeZone || countryFor(profile).timeZone;
}
export function currencyFor(profile = {}) {
  return profile.currency || countryFor(profile).currency;
}
export function currencyName(code) {
  return new Intl.DisplayNames("es", { type: "currency" }).of(code) || code;
}
export function locationLabel(profile = {}) {
  return [countryFor(profile).name, profile.region].filter(Boolean).join(" · ");
}
export function localInstant(date, time, timeZone = DEFAULT_ZONE) {
  try {
    return Number(
      Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(timeZone, {
        disambiguation: "reject",
      }).epochMilliseconds,
    );
  } catch {
    throw new Error(
      "La fecha u hora no es válida en esta zona horaria. Revisá si coincide con un cambio de hora estacional.",
    );
  }
}
export function localClock(now = new Date(), timeZone = DEFAULT_ZONE) {
  return new Intl.DateTimeFormat("es", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
export function zoneLabel(zone) {
  return zone.replaceAll("_", " ").replaceAll("/", " / ");
}
