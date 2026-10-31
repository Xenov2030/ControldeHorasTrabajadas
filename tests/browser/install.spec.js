const { test, expect } = require("@playwright/test");
const android =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
async function offer(page, outcome = "accepted") {
  await page.evaluate((result) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.installPrompts = (window.installPrompts || 0) + 1;
    };
    event.userChoice = Promise.resolve({ outcome: result });
    window.dispatchEvent(event);
  }, outcome);
}
test("la oferta nativa instala y el botón desaparece tras appinstalled y al recargar", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent: android,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3002/");
    const button = page.getByRole("button", {
      name: "Instalar JornadApp",
      exact: true,
    });
    await button.waitFor();
    await offer(page);
    await button.click();
    expect(await page.evaluate(() => window.installPrompts)).toBe(1);
    expect(
      await page.evaluate(() => localStorage.getItem("jornadapp-installed-v1")),
    ).toBeNull();
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(button).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("¿Cómo te llamás?")).toBeVisible();
    await expect(button).toHaveCount(0);
    // A new browser offer allows reinstalling after an uninstall.
    await offer(page);
    await expect(button).toBeVisible();
  } finally {
    await context.close();
  }
});
test("cancelar una instalación no marca la app como instalada", async ({
  browser,
}) => {
  const context = await browser.newContext({ userAgent: android });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3002/");
    const button = page.getByRole("button", {
      name: "Instalar JornadApp",
      exact: true,
    });
    await button.waitFor();
    await offer(page, "dismissed");
    await button.click();
    await expect(page.getByRole("status")).toContainText("más adelante");
    expect(
      await page.evaluate(() => localStorage.getItem("jornadapp-installed-v1")),
    ).toBeNull();
    await button.click();
    await expect(
      page.getByRole("dialog", { name: "Instalar JornadApp en tu celular" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Cerrar instrucciones", exact: true })
      .click();
  } finally {
    await context.close();
  }
});
test("iPhone muestra instrucciones y permite recordar que ya fue agregada", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent: iphone,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3002/");
    const button = page.getByRole("button", {
      name: "Instalar JornadApp",
      exact: true,
    });
    await button.click();
    const instructions = page.getByRole("dialog", {
      name: "Instalar JornadApp en tu iPhone o iPad",
    });
    await expect(instructions).toContainText("Agregar a pantalla de inicio");
    await page
      .getByRole("button", { name: "Ya la instalé", exact: true })
      .click();
    await expect(button).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("¿Cómo te llamás?")).toBeVisible();
    await expect(button).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
test("se oculta al abrir en modo instalado y publica un manifiesto válido", async ({
  browser,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.id).toBe("/");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  const context = await browser.newContext({ userAgent: iphone });
  try {
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "standalone", { value: true }),
    );
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3002/");
    await expect(page.getByLabel("¿Cómo te llamás?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Instalar JornadApp", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("jornadapp-installed-v1")),
    ).toBe("1");
  } finally {
    await context.close();
  }
});
test("detecta una PWA existente cuando el navegador ofrece la API de apps relacionadas", async ({
  browser,
}) => {
  const context = await browser.newContext({ userAgent: android });
  try {
    await context.addInitScript(() => {
      navigator.getInstalledRelatedApps = async () => [
        {
          platform: "webapp",
          url: new URL("/manifest.webmanifest", location.origin).href,
        },
      ];
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3002/");
    await expect(page.getByLabel("¿Cómo te llamás?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Instalar JornadApp", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem("jornadapp-installed-v1")),
    ).toBe("1");
  } finally {
    await context.close();
  }
});
