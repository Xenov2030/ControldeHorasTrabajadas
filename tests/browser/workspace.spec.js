const { test } = require("@playwright/test");
const assert = require("node:assert/strict");
test("configuración, jornadas, cobros y diseño adaptable", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("BROWSER ERROR", e.message);
  });
  await page.clock.install({ time: new Date("2026-10-30T17:30:00Z") });
  await page.goto("/");
  await page.getByLabel("¿Cómo te llamás?").fill("Martín");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "L–J 9 h · V 8 h", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Importe en pesos argentinos").fill("4000");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Mostrar recordatorios dentro de la aplicación")
    .check();
  await page
    .getByRole("button", { name: "Empezar mi registro", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  console.log("PASS: alta inicial de cinco pasos");
  await page
    .getByRole("button", { name: "Cargar una jornada manualmente" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-09");
  await dialog.getByLabel("Entrada", { exact: true }).fill("05:00");
  await dialog.getByLabel("Salida real", { exact: true }).fill("15:00");
  await dialog
    .getByRole("button", { name: "Guardar jornada", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Jornada guardada." })
    .waitFor();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.entries[0].hours, 10);
  assert.equal(saved.compensation[0].amount, 4000);
  console.log("PASS: jornada de 10 h registrada y calculada");
  await page
    .locator(".topbar")
    .getByRole("combobox", { name: "Apariencia", exact: true })
    .selectOption("dark");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.reload();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  assert.match(await page.locator("table").innerText(), /09\/10\/2026/);
  console.log("PASS: persistencia de jornadas y modo oscuro");
  await page
    .locator(".topbar")
    .getByRole("combobox", { name: "Apariencia", exact: true })
    .selectOption("light");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  await page.getByLabel("Importe en pesos argentinos").fill("5000");
  await page.getByLabel("Vigente desde").fill("2026-11-01");
  await page.getByRole("button", { name: "Agregar al historial" }).click();
  await page.getByText("Cambios guardados en este navegador.").waitFor();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.compensation.length, 2);
  assert.equal(saved.compensation[0].amount, 4000);
  console.log("PASS: aumento futuro sin reemplazar valor anterior");
  await page.getByRole("button", { name: "Aguinaldo", exact: true }).click();
  await page.getByRole("combobox", { name: /Semestre/ }).selectOption("2");
  await page.getByLabel("Base julio", { exact: true }).fill("1000000");
  await page.getByLabel("Extras julio", { exact: true }).fill("200000");
  await page.getByRole("button", { name: "Guardar remuneraciones" }).click();
  await page.getByText("Remuneraciones guardadas.").waitFor();
  assert.match(await page.locator(".big-amount").innerText(), /600.000/);
  console.log("PASS: SAC manual con incidencia de extras");
  await page.getByRole("button", { name: "Mis cobros", exact: true }).click();
  await page.getByLabel("Fecha dentro del período").fill("2026-10-09");
  await page.getByLabel(/Importe recibido/).fill("45000");
  await page
    .getByRole("button", { name: "Guardar cobro", exact: true })
    .click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.payments.length, 1);
  console.log("PASS: registro de cobro vinculado al período");
  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar entrada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar salida", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Entrada", { exact: true })
    .fill("05:00");
  await page
    .getByRole("dialog")
    .getByLabel("Salida real", { exact: true })
    .fill("13:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar salida real" })
    .click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.activeSession, null);
  assert.equal(saved.entries.length, 2);
  console.log("PASS: entrada activa y cierre con hora corregida");
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.locator(".mobile-nav").isVisible());
  await page
    .locator(".topbar")
    .getByRole("combobox", { name: "Apariencia", exact: true })
    .selectOption("dark");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("mobile-dark.png"),
    fullPage: false,
    animations: "disabled",
  });
  console.log("PASS: versión móvil oscura sin desbordamiento horizontal");
  await page.getByRole("button", { name: "Jornadas", exact: true }).click();
  await page
    .getByRole("button", { name: "Agregar jornada", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: navegación móvil, diálogo y ausencia de errores de JavaScript",
  );
});

test("copia de seguridad restaura registros sin perder el historial", async ({
  page,
}, testInfo) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const original = createWorkspace();
  original.configured = true;
  original.profile.name = "Elena";
  original.entries = [
    {
      id: "saved",
      date: "2026-10-09",
      hours: 8,
      type: "work",
      note: "Registro original",
      quantity: 0,
    },
  ];
  await page.addInitScript((value) => {
    if (!localStorage.getItem("jornada-v2"))
      localStorage.setItem("jornada-v2", JSON.stringify(value));
  }, original);
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar copia de seguridad" })
    .click();
  const download = await downloadPromise,
    path = testInfo.outputPath("backup.json");
  await download.saveAs(path);
  const backup = JSON.parse(
    await require("node:fs/promises").readFile(path, "utf8"),
  );
  assert.equal(backup.entries[0].note, "Registro original");
  await page
    .locator(".topbar")
    .getByRole("combobox", { name: "Apariencia", exact: true })
    .selectOption("dark");
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles(path);
  await page
    .getByRole("status")
    .filter({ hasText: "Copia restaurada." })
    .waitFor();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(restored.profile.theme, "system");
  assert.equal(restored.entries[0].id, "saved");
});

test("no sobrescribe datos corruptos y permite descargar el original", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("jornada-v2", "original incompleto"),
  );
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Protejamos tus registros." })
    .waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("jornada-v2")),
    "original incompleto",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar datos originales" })
    .click();
  const file = await downloadPromise;
  assert.match(file.suggestedFilename(), /recuperacion/);
});

test("decimales con coma en sueldo, horas, cobros y aguinaldo; faltas justificadas y no justificadas", async ({
  page,
}, testInfo) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const s = createWorkspace();
  s.configured = true;
  s.profile.name = "Lucía";
  await page.clock.install({ time: new Date("2026-10-30T17:30:00Z") });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("jornada-v2"))
      localStorage.setItem("jornada-v2", JSON.stringify(value));
  }, s);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  const salary = page.getByLabel("Importe en pesos argentinos");
  await salary.fill("");
  await salary.pressSequentially("3500,");
  assert.equal(await salary.inputValue(), "3500,");
  assert.equal(await salary.evaluate((input) => input.checkValidity()), false);
  await salary.pressSequentially("75");
  assert.equal(await salary.inputValue(), "3500,75");
  assert.equal(await salary.evaluate((input) => input.checkValidity()), true);
  await page.getByLabel("Vigente desde").fill("2026-10-01");
  await page.getByRole("button", { name: "Agregar al historial" }).click();
  await page.getByText("Cambios guardados en este navegador.").waitFor();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.compensation[1].amount, 3500.75);
  await page.getByRole("button", { name: "Mis jornadas", exact: true }).click();
  await page
    .getByRole("button", { name: "Agregar jornada", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-09");
  await dialog
    .getByRole("button", { name: "Total de horas", exact: true })
    .click();
  await dialog.getByLabel("Horas trabajadas", { exact: true }).fill("8,5");
  await dialog
    .getByRole("button", { name: "Guardar jornada", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Jornada guardada." })
    .waitFor();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.entries[0].hours, 8.5);
  await page
    .getByRole("button", { name: "Registrar ausencia", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-08");
  await dialog.getByLabel("Horas de ausencia", { exact: true }).fill("9");
  await dialog
    .getByRole("combobox", { name: /La falta está justificada/ })
    .selectOption("true");
  await dialog
    .getByRole("combobox", { name: /La ausencia es paga/ })
    .selectOption("false");
  await dialog.getByLabel("Motivo de la ausencia").fill("Avisé a la empresa");
  await dialog
    .getByRole("button", { name: "Guardar ausencia", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Ausencia guardada." })
    .waitFor();
  await page
    .getByRole("button", { name: "Registrar ausencia", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-07");
  await dialog
    .getByRole("combobox", { name: /La falta está justificada/ })
    .selectOption("false");
  await dialog
    .getByRole("button", { name: "Guardar ausencia", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Ausencia guardada." })
    .waitFor();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.entries.length, 3);
  assert.equal(saved.entries[1].absenceJustified, true);
  assert.equal(saved.entries[2].absenceJustified, false);
  assert.equal(saved.entries[1].absencePaid, false);
  assert.match(await page.locator("table").innerText(), /Falta justificada/);
  assert.match(await page.locator("table").innerText(), /Sin justificar/);
  await page.getByRole("button", { name: "Mis cobros", exact: true }).click();
  await page.getByLabel(/Importe recibido/).fill("12345,67");
  await page
    .getByRole("button", { name: "Guardar cobro", exact: true })
    .click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.payments[0].amount, 12345.67);
  await page.getByRole("button", { name: "Aguinaldo", exact: true }).click();
  await page.getByRole("combobox", { name: /Semestre/ }).selectOption("2");
  await page.getByLabel("Base julio", { exact: true }).fill("1000000,50");
  await page.getByLabel("Extras julio", { exact: true }).fill("10000,25");
  await page.getByRole("button", { name: "Guardar remuneraciones" }).click();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.sac[0].base, 1000000.5);
  assert.equal(saved.sac[0].extras, 10000.25);
  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  await page.screenshot({
    path: testInfo.outputPath("nuevo-diseno-pc.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".topbar")
    .getByRole("combobox", { name: "Apariencia", exact: true })
    .selectOption("dark");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("nuevo-diseno-celular.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Registrar ausencia", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("ausencia-celular.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
});

test("diseño claro y oscuro conserva la navegación en móvil, tablet y PC", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const s = createWorkspace();
  s.configured = true;
  s.profile.name = "María";
  s.profile.theme = "light";
  await page.addInitScript((value) => {
    if (!localStorage.getItem("jornada-v2"))
      localStorage.setItem("jornada-v2", JSON.stringify(value));
  }, s);
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page
        .locator(".topbar")
        .getByRole("combobox", { name: "Apariencia", exact: true })
        .selectOption(theme);
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Desbordamiento a ${width}px, tema ${theme}`,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Registrar entrada", exact: true })
          .isVisible(),
        true,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByRole("tab", { name: "Tus horarios", exact: true }).click();
  assert.equal(
    await page.getByLabel("Entrada Lunes", { exact: true }).isVisible(),
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Jornadas", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar ausencia", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Guardar ausencia", exact: true })
      .isVisible(),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
});

test("país y provincia dependientes, moneda y reloj locales; SAC argentino no se aplica a México", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-30T17:30:00Z") });
  await page.goto("/");
  await page.getByLabel("¿Cómo te llamás?").fill("Luis");
  const country = page.getByRole("combobox", {
      name: "País o territorio",
      exact: true,
    }),
    region = page.getByRole("combobox", {
      name: "Provincia, estado o departamento",
      exact: true,
    });
  assert.equal(await country.locator("option").count(), 24);
  await country.selectOption("MX");
  assert.equal(await region.inputValue(), "");
  assert.equal(await region.locator("option").count(), 33);
  assert.equal(
    await page
      .getByRole("combobox", { name: "Moneda de registro", exact: true })
      .inputValue(),
    "MXN",
  );
  await region.selectOption("Oaxaca");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Importe en MXN").fill("350,50");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Empezar mi registro", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  assert.match(
    await page.locator(".workspace-card").innerText(),
    /México · Oaxaca/,
  );
  assert.equal(
    await page.locator(".desktop-session .session-time").innerText(),
    "11:30",
  );
  assert.match(await page.locator(".metrics .income").innerText(), /MXN/);
  await page
    .getByRole("button", { name: "Registrar entrada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar salida", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Entrada", { exact: true })
    .fill("05:00");
  await page
    .getByRole("dialog")
    .getByLabel("Salida real", { exact: true })
    .fill("11:00");
  await page
    .getByRole("button", { name: "Confirmar salida real", exact: true })
    .click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.profile.country, "MX");
  assert.equal(saved.profile.region, "Oaxaca");
  assert.equal(saved.profile.currency, "MXN");
  assert.equal(saved.entries[0].hours, 6);
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Moneda de registro", exact: true })
      .isDisabled(),
    false,
  );
  await page
    .getByRole("combobox", { name: "País o territorio", exact: true })
    .selectOption("BR");
  assert.equal(
    await page
      .getByRole("combobox", {
        name: "Provincia, estado o departamento",
        exact: true,
      })
      .inputValue(),
    "",
  );
  await page
    .getByRole("combobox", {
      name: "Provincia, estado o departamento",
      exact: true,
    })
    .selectOption("São Paulo");
  // A country proposes its currency, but the user can explicitly keep the old unit.
  await page
    .getByRole("combobox", { name: "Moneda de registro", exact: true })
    .selectOption("MXN");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.getByText("Cambios guardados en este navegador.").waitFor();
  saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.profile.country, "BR");
  assert.equal(saved.profile.currency, "MXN");
  assert.equal(saved.entries[0].hours, 6);
  await page.reload();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  assert.match(
    await page.locator(".workspace-card").innerText(),
    /Brasil · São Paulo/,
  );
  await page.getByRole("button", { name: "Aguinaldo", exact: true }).click();
  await page
    .getByRole("heading", { name: "Aguinaldo según tu país" })
    .waitFor();
  assert.equal(await page.locator(".sac-form").count(), 0);
});

test("restaurar una copia internacional reemplaza el espacio completo sin convertir importes", async ({
  page,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const old = createWorkspace();
  old.configured = true;
  old.profile.name = "Ana";
  old.entries = [
    {
      id: "old",
      date: "2026-10-09",
      hours: 8,
      type: "work",
      note: "Anterior",
      quantity: 0,
    },
  ];
  const incoming = createWorkspace();
  incoming.configured = true;
  incoming.profile = {
    ...incoming.profile,
    name: "Luis",
    country: "MX",
    region: "Oaxaca",
    timeZone: "America/Mexico_City",
    currency: "MXN",
  };
  incoming.entries = [
    {
      id: "mexico",
      date: "2026-10-09",
      hours: 6,
      type: "work",
      note: "Copia México",
      quantity: 0,
    },
  ];
  incoming.compensation[0].amount = 350.5;
  await page.addInitScript((value) => {
    if (!localStorage.getItem("jornada-v2"))
      localStorage.setItem("jornada-v2", JSON.stringify(value));
  }, old);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  page.on("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "copia-mexico.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incoming)),
  });
  await page
    .getByRole("status")
    .filter({ hasText: "Copia restaurada." })
    .waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("jornada-v2")),
  );
  assert.equal(saved.profile.currency, "MXN");
  assert.equal(saved.profile.region, "Oaxaca");
  assert.equal(saved.entries.length, 1);
  assert.equal(saved.entries[0].id, "mexico");
  assert.equal(saved.compensation[0].amount, 350.5);
});

test("firma del creador apunta al portfolio en bienvenida y panel, también en celular", async ({
  page,
}) => {
  await page.goto("/");
  let credit = page.getByRole("link", {
    name: "Portfolio de Nicolas Aguirres (abre en otra pestaña)",
    exact: true,
  });
  await credit.waitFor();
  assert.equal(
    await credit.getAttribute("href"),
    "https://nicolasaguirrescode.com/",
  );
  assert.equal(await credit.getAttribute("target"), "_blank");
  assert.match(await credit.getAttribute("rel"), /noopener/);
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const s = createWorkspace();
  s.configured = true;
  s.profile.name = "Ana";
  await page.evaluate(
    (value) => localStorage.setItem("jornada-v2", JSON.stringify(value)),
    s,
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  credit = page.getByRole("link", {
    name: "Portfolio de Nicolas Aguirres (abre en otra pestaña)",
    exact: true,
  });
  assert.equal(await credit.isVisible(), true);
  assert.equal(
    await credit.getAttribute("href"),
    "https://nicolasaguirrescode.com/",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await credit.scrollIntoViewIfNeeded();
  assert.equal(await credit.isVisible(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
});

test("corrige ARS a moneda del país con confirmación, conserva valores y descarga la copia anterior", async ({
  page,
}, testInfo) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const original = createWorkspace();
  original.configured = true;
  original.profile = {
    ...original.profile,
    name: "Ana",
    country: "BR",
    region: "São Paulo",
    timeZone: "America/Sao_Paulo",
    currency: "ARS",
  };
  original.compensation[0].amount = 200.5;
  original.entries = [
    {
      id: "original",
      date: "2026-10-09",
      hours: 8,
      type: "work",
      note: "Original",
      quantity: 0,
    },
  ];
  original.payments = [
    {
      id: "p1",
      start: "2026-10-01",
      end: "2026-10-15",
      date: "2026-10-20",
      amount: 100.25,
    },
  ];
  await page.addInitScript((value) => {
    if (!localStorage.getItem("jornada-v2"))
      localStorage.setItem("jornada-v2", JSON.stringify(value));
  }, original);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const selector = page.getByRole("combobox", {
    name: "Moneda de registro",
    exact: true,
  });
  assert.equal(await selector.isEnabled(), true);
  await selector.selectOption("BRL");
  const confirmation = page.getByRole("checkbox", {
    name: "Confirmo que los importes guardados ya corresponden a BRL",
    exact: true,
  });
  await confirmation.waitFor();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jornada-v2")).profile.currency,
    ),
    "ARS",
  );
  await confirmation.check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.getByText("Cambios guardados en este navegador.").waitFor();
  const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("jornada-v2")),
    ),
    backup = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("jornada-before-currency-change-v2")),
    );
  assert.equal(saved.profile.currency, "BRL");
  assert.equal(saved.compensation[0].amount, 200.5);
  assert.equal(saved.payments[0].amount, 100.25);
  assert.deepEqual(saved.entries, original.entries);
  assert.equal(backup.profile.currency, "ARS");
  assert.equal(backup.compensation[0].amount, 200.5);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Descargar copia anterior al cambio de moneda",
      exact: true,
    })
    .click();
  const download = await downloadPromise,
    path = testInfo.outputPath("moneda-anterior.json");
  await download.saveAs(path);
  assert.equal(
    JSON.parse(await require("node:fs/promises").readFile(path, "utf8")).profile
      .currency,
    "ARS",
  );
  await page.getByRole("tab", { name: "Cómo te pagan", exact: true }).click();
  await page.getByLabel("Importe en BRL").waitFor();
  assert.match(await page.locator(".salary-history").innerText(), /BRL/);
  await page.getByRole("button", { name: "Resumen", exact: true }).click();
  await page
    .getByLabel("Fecha del período", { exact: true })
    .fill("2026-10-09");
  assert.match(await page.locator(".metrics .income").innerText(), /BRL/);
  assert.doesNotMatch(
    await page.locator(".metrics .income").innerText(),
    /ARS/,
  );
  await page.getByRole("button", { name: "Mis cobros", exact: true }).click();
  await page.getByLabel("Importe recibido (BRL)").waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Moneda de registro", exact: true })
      .inputValue(),
    "BRL",
  );
});
