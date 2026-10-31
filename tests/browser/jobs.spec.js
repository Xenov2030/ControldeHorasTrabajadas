const { test, expect } = require("@playwright/test");

test("dos trabajos conservan jornadas separadas al configurar, cambiar y recargar", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const first = createWorkspace();
  first.configured = true;
  first.profile.name = "Nicolas";
  first.entries = [
    {
      id: "first-entry",
      date: "2026-10-08",
      hours: 8,
      type: "work",
      note: "Trabajo original",
      quantity: 0,
    },
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(
    (workspace) =>
      localStorage.setItem("jornada-v2", JSON.stringify(workspace)),
    first,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Renombrar trabajo", exact: true })
    .click();
  await page.getByLabel("Nombre del trabajo", { exact: true }).fill("Fábrica");
  await page
    .getByRole("button", { name: "Guardar nombre", exact: true })
    .click();
  await page
    .getByRole("button", { name: "+ Agregar trabajo", exact: true })
    .click();
  await page.getByLabel("Nombre del trabajo", { exact: true }).fill("Repartos");
  await page
    .getByRole("button", { name: "Crear trabajo", exact: true })
    .click();
  await expect(page.getByLabel("¿Cómo te llamás?")).toHaveValue("Nicolas");
  for (let step = 0; step < 4; step++) {
    if (step === 2)
      await page.getByLabel("Importe en pesos argentinos").fill("7000");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Empezar mi registro", exact: true })
    .click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.jobName).toBe("Repartos");
  expect(saved.entries).toHaveLength(0);
  expect(saved.otherJobs[0].entries[0].note).toBe("Trabajo original");
  const secondId = saved.jobId;
  await page
    .getByLabel("Trabajo actual", { exact: true })
    .selectOption("primary");
  await page.reload();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.jobName).toBe("Fábrica");
  expect(saved.entries).toHaveLength(1);
  await page
    .getByLabel("Trabajo actual", { exact: true })
    .selectOption(secondId);
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.compensation[0].amount).toBe(7000);
  expect(saved.entries).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
