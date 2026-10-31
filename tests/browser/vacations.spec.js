const { test, expect } = require("@playwright/test");

test("registra vacaciones futuras con calendario, evita conflictos y elimina el período completo", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const state = createWorkspace();
  state.configured = true;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-31T15:00:00Z") });
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("jornada-v2", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Registrar vacaciones", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Inicio de vacaciones").fill("2026-11-02");
  await dialog.getByLabel("Fin de vacaciones").fill("2026-11-15");
  await dialog.getByLabel("Nota de vacaciones").fill("Viaje familiar");
  await dialog
    .getByRole("button", { name: "Guardar período de vacaciones", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const calendar = page.getByRole("region", {
    name: "Calendario de vacaciones",
    exact: true,
  });
  await expect(calendar.locator(".vacation-day.booked")).toHaveCount(14);
  await expect(calendar).toContainText("Planificadas");
  await expect(calendar).toContainText("14 días corridos");
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.vacationPeriods).toHaveLength(1);
  expect(saved.entries).toHaveLength(10);
  await page
    .getByRole("button", { name: "Registrar vacaciones", exact: true })
    .click();
  await dialog.getByLabel("Inicio de vacaciones").fill("2026-11-14");
  await dialog.getByLabel("Fin de vacaciones").fill("2026-11-18");
  await dialog
    .getByRole("button", { name: "Guardar período de vacaciones", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("coincide");
  await page
    .getByRole("button", { name: "Cerrar ventana", exact: true })
    .click();
  await page.reload();
  await page.getByLabel("Mes del calendario de vacaciones").fill("2026-11");
  await expect(calendar.locator(".vacation-day.booked")).toHaveCount(14);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Eliminar vacaciones del 02/11/2026",
      exact: true,
    })
    .click();
  await expect(calendar.locator(".vacation-day.booked")).toHaveCount(0);
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.vacationPeriods).toHaveLength(0);
  expect(saved.entries).toHaveLength(0);
  expect(errors).toEqual([]);
});
