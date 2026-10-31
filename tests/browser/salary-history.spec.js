const { test, expect } = require("@playwright/test");

test("guarda sueldos anteriores, permite editarlos y conserva otros semestres", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const state = createWorkspace();
  state.configured = true;
  state.sac = [{ month: "2026-07", base: 2000000, extras: 200000 }];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("jornada-v2", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page.getByRole("button", { name: "Aguinaldo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Año", exact: true })
    .selectOption("2025");
  await page
    .getByRole("combobox", { name: "Semestre", exact: true })
    .selectOption("1");
  await page.getByLabel("Base junio", { exact: true }).fill("1000000,50");
  await page.getByLabel("Extras junio", { exact: true }).fill("100000,25");
  await page
    .getByRole("button", { name: "Guardar remuneraciones", exact: true })
    .click();
  await expect(page.locator(".sac-result")).toContainText("550.000,38");
  const history = page.getByRole("region", {
    name: "Historial de sueldos para aguinaldo",
  });
  await expect(history).toContainText("junio de 2025");
  await expect(history).toContainText("julio de 2026");
  await page
    .getByRole("combobox", { name: "Año", exact: true })
    .selectOption("2024");
  await page
    .getByRole("combobox", { name: "Semestre", exact: true })
    .selectOption("2");
  await page.getByLabel("Base julio", { exact: true }).fill("400000");
  await page
    .getByRole("button", { name: "Guardar remuneraciones", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar junio de 2025", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Año", exact: true }),
  ).toHaveValue("2025");
  await expect(page.getByLabel("Extras junio", { exact: true })).toHaveValue(
    "100000,25",
  );
  await page.getByLabel("Base junio", { exact: true }).fill("1200000");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Semestre anterior", exact: true })
    .click();
  await expect(page.getByLabel("Base junio", { exact: true })).toHaveValue(
    "1200000",
  );
  await page
    .getByRole("button", { name: "Guardar remuneraciones", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Aguinaldo", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Historial de sueldos para aguinaldo" })
      .locator("tbody tr"),
  ).toHaveCount(3);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.sac.find((row) => row.month === "2025-06").base).toBe(1200000);
  expect(saved.sac.find((row) => row.month === "2026-07").base).toBe(2000000);
  expect(saved.entries).toHaveLength(0);
  expect(saved.payments).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
