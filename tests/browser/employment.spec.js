const { test, expect } = require("@playwright/test");

test("configura aportes con coma, distingue bruto y bolsillo y conserva la vigencia", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const state = createWorkspace();
  state.configured = true;
  state.entries = [
    {
      id: "entry",
      date: "2026-10-09",
      type: "work",
      hours: 10,
      quantity: 0,
      note: "",
    },
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("jornada-v2", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  await page.getByLabel("Importe en pesos argentinos").fill("1000");
  await page
    .getByLabel("¿Cómo está registrado este trabajo?")
    .selectOption("registered");
  await page.getByLabel("Aportes y retenciones estimados (%)").fill("101");
  await page.getByLabel("Vigente desde").fill("2026-10-01");
  await page
    .getByRole("button", { name: "Agregar al historial", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jornada-v2")).compensation.length,
    ),
  ).toBe(1);
  await page.getByLabel("Aportes y retenciones estimados (%)").fill("17,5");
  await page
    .getByRole("button", { name: "Agregar al historial", exact: true })
    .click();
  await page
    .getByText("Cambios guardados en este navegador.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  const breakdown = page.getByRole("region", {
    name: "Detalle del importe a cobrar",
  });
  await expect(breakdown).toContainText("9.075,00");
  await expect(breakdown).toContainText("1.925,00");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  await page
    .getByRole("combobox", { name: "El importe que ingresás es", exact: true })
    .selectOption("net");
  await expect(
    page.getByLabel("Aportes y retenciones estimados (%)"),
  ).toHaveCount(0);
  await page.getByLabel("Vigente desde").fill("2026-10-10");
  await page
    .getByRole("button", { name: "Agregar al historial", exact: true })
    .click();
  await page.reload();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(stored.compensation).toHaveLength(3);
  expect(stored.compensation[1].amountBasis).toBeUndefined(); // gross is the default
  expect(stored.compensation[1].deductionPercent).toBe(17.5);
  expect(stored.compensation[2].amountBasis).toBe("net");
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  await expect(
    page.getByRole("region", { name: "Detalle del importe a cobrar" }),
  ).toContainText("9.075,00");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("monotributo requiere categoría y muestra cuota mensual sin descontarla", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const state = createWorkspace();
  state.configured = true;
  state.compensation[0].amount = 1000;
  state.entries = [
    {
      id: "entry",
      date: "2026-10-09",
      type: "work",
      hours: 10,
      quantity: 0,
      note: "",
    },
  ];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("jornada-v2", JSON.stringify(s)),
    state,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  await page
    .getByRole("combobox", {
      name: "¿Cómo está registrado este trabajo?",
      exact: true,
    })
    .selectOption("monotributo");
  const categories = page.getByRole("combobox", {
    name: "Categoría de monotributo",
    exact: true,
  });
  await expect(categories.locator("option")).toHaveCount(12);
  await page.getByLabel("Vigente desde").fill("2026-10-01");
  await page
    .getByRole("button", { name: "Agregar al historial", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jornada-v2")).compensation.length,
    ),
  ).toBe(1);
  await categories.selectOption("C");
  await page.getByLabel("Cuota mensual de monotributo (ARS)").fill("23000,50");
  await page
    .getByRole("button", { name: "Agregar al historial", exact: true })
    .click();
  await page
    .getByText("Cambios guardados en este navegador.", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  const note = page.getByRole("region", {
    name: "Monotributo del período",
    exact: true,
  });
  await expect(note).toContainText("Categoría C");
  await expect(note).toContainText("23.000,50");
  await expect(note).toContainText("no está descontada");
  await expect(
    page.getByRole("region", { name: "Detalle del importe a cobrar" }),
  ).toContainText("11.000,00");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  expect(saved.compensation[1].monotributoCategory).toBe("C");
  expect(saved.compensation[1].monotributoMonthlyFee).toBe(23000.5);
  expect(errors).toEqual([]);
});
