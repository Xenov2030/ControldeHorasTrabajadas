const { test, expect } = require("@playwright/test");

test("dos trabajos en ARS y USD conservan país, registros y exportaciones separados", async ({
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
  await page
    .getByLabel("Nombre del trabajo", { exact: true })
    .fill("Cliente exterior");
  await page
    .getByRole("combobox", { name: "Moneda del nuevo trabajo", exact: true })
    .selectOption("USD");
  await page
    .getByRole("button", { name: "Crear trabajo", exact: true })
    .click();
  await expect(page.getByLabel("¿Cómo te llamás?")).toHaveValue("Nicolas");
  for (let step = 0; step < 4; step++) {
    if (step === 2) await page.getByLabel("Importe en USD").fill("20");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Empezar mi registro", exact: true })
    .click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.jobName).toBe("Cliente exterior");
  expect(saved.profile.country).toBe("AR");
  expect(saved.profile.currency).toBe("USD");
  expect(saved.otherJobs[0].profile.currency).toBe("ARS");
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
  expect(saved.compensation[0].amount).toBe(20);
  expect(saved.entries).toHaveLength(0);
  await expect(
    page.getByRole("option", { name: "Fábrica · ARS", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Cargar una jornada manualmente" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-09");
  await dialog.getByLabel("Entrada", { exact: true }).fill("05:00");
  await dialog.getByLabel("Salida real", { exact: true }).fill("07:00");
  await dialog
    .getByRole("button", { name: "Guardar jornada", exact: true })
    .click();
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  await expect(page.locator(".metrics .income")).toContainText("USD");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("USD.csv");
  const csv = require("node:fs").readFileSync(await download.path(), "utf8");
  expect(csv).toContain("Cliente exterior");
  expect(csv).toContain("USD");
  expect(csv).not.toContain("Trabajo original");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
