import test from "node:test";
import assert from "node:assert/strict";
import {
  COUNTRIES,
  countryFor,
  currencyFor,
  zoneFor,
  localInstant,
  localClock,
} from "../lib/locations.mjs";
import {
  createWorkspace,
  validateWorkspace,
  localDate,
  reminderFor,
  currency,
} from "../lib/workspace.mjs";
import { portfolioLink } from "../lib/branding.mjs";
const counts = {
  AR: 24,
  BO: 9,
  BR: 27,
  BZ: 6,
  CL: 16,
  CO: 33,
  CR: 7,
  CU: 16,
  DO: 32,
  EC: 24,
  SV: 14,
  GT: 22,
  GY: 10,
  HT: 10,
  HN: 18,
  MX: 32,
  NI: 17,
  PA: 14,
  PY: 18,
  PE: 26,
  PR: 78,
  SR: 10,
  UY: 19,
  VE: 25,
};
test("catálogo completo con divisiones de todos los países incluidos", () => {
  assert.equal(COUNTRIES.length, 24);
  for (const [code, count] of Object.entries(counts)) {
    const c = COUNTRIES.find((c) => c.code === code);
    assert.ok(c, code);
    assert.equal(c.regions.length, count, code);
    assert.equal(new Set(c.regions).size, count);
    assert.ok(c.timeZones.includes(c.timeZone));
    assert.doesNotThrow(() =>
      new Intl.NumberFormat("es", {
        style: "currency",
        currency: c.currency,
      }).format(1),
    );
  }
});
test("no mezcla países con territorios y conserva nombres actualizados", () => {
  assert.equal(COUNTRIES.find((c) => c.code === "PR").territory, true);
  assert.equal(COUNTRIES.filter((c) => !c.territory).length, 23);
  assert.ok(
    COUNTRIES.find((c) => c.code === "VE").regions.includes("La Guaira"),
  );
  assert.ok(COUNTRIES.find((c) => c.code === "AR").regions.includes("Mendoza"));
  assert.ok(
    COUNTRIES.find((c) => c.code === "PA").regions.includes("Naso Tjër Di"),
  );
});
test("rechaza una provincia de otro país y conserva perfiles anteriores", () => {
  const s = createWorkspace();
  s.profile = {
    name: "Ana",
    region: "Mendoza",
    theme: "system",
    employmentStart: "",
  };
  assert.doesNotThrow(() => validateWorkspace(s));
  assert.equal(countryFor(s.profile).code, "AR");
  assert.equal(zoneFor(s.profile), "America/Argentina/Mendoza");
  assert.equal(currencyFor(s.profile), "ARS");
  s.profile.country = "MX";
  assert.throws(() => validateWorkspace(s));
  s.profile.region = "Oaxaca";
  assert.doesNotThrow(() => validateWorkspace(s));
});
test("fecha y reloj respetan zonas diferentes, sin asumir UTC-3", () => {
  const now = new Date("2026-10-31T04:30:00Z");
  assert.equal(localDate(now, "America/Mexico_City"), "2026-10-30");
  assert.equal(localDate(now), "2026-10-31");
  assert.equal(localClock(now, "America/Mexico_City"), "22:30");
  assert.equal(
    localInstant("2026-07-01", "05:00", "America/Mexico_City"),
    Date.parse("2026-07-01T11:00:00Z"),
  );
  assert.equal(
    localInstant("2026-07-01", "05:00", "America/Tijuana"),
    Date.parse("2026-07-01T12:00:00Z"),
  );
});
test("no adivina horas inexistentes o ambiguas al cambiar el horario estacional", () => {
  assert.throws(() => localInstant("2026-03-08", "02:30", "America/New_York"));
  assert.throws(() => localInstant("2026-11-01", "01:30", "America/New_York"));
});
test("recordatorio de México usa su horario local", () => {
  const s = createWorkspace();
  s.profile = {
    ...s.profile,
    country: "MX",
    region: "Oaxaca",
    currency: "MXN",
    timeZone: "America/Mexico_City",
  };
  s.reminders.enabled = true;
  s.activeSession = { startedAt: "2026-10-09T05:00:00-06:00" };
  assert.equal(reminderFor(s, new Date("2026-10-09T13:09:00-06:00")), null);
  assert.equal(reminderFor(s, new Date("2026-10-09T13:10:00-06:00")).index, 0);
});
test("formato monetario usa el código seleccionado sin convertir cantidades", () => {
  assert.match(currency(3500.5, "MXN"), /3.500,50/);
  assert.match(currency(3500.5, "MXN"), /MXN/);
  assert.match(currency(3500.5), /3.500,50/);
});
test("marca del creador solo permite enlaces HTTPS sin credenciales", () => {
  assert.equal(
    portfolioLink("https://example.com/portfolio"),
    "https://example.com/portfolio",
  );
  for (const url of [
    "",
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ])
    assert.equal(portfolioLink(url), null);
});
