const { test } = require("@playwright/test");
const assert = require("node:assert/strict");
let browserErrors = [];
test.beforeEach(() => {
  browserErrors = [];
});
test.afterEach(() => assert.deepEqual(browserErrors, []));
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
function user(id) {
  return {
    id,
    email: id === A ? "cuenta-a@example.test" : "cuenta-b@example.test",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    user_metadata: { full_name: id === A ? "Cuenta A" : "Cuenta B" },
  };
}
function session(id) {
  const b64 = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}.test_fixture_signature`,
    refresh_token: "test_fixture_refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: user(id),
  };
}
async function fixture(
  context,
  { id = A, local = null, rows = new Map() } = {},
) {
  const backend = { rows, writes: 0, fail: false };
  context.on("weberror", (e) => browserErrors.push(e.error().message));
  await context.addInitScript(
    ({ auth, local }) => {
      if (location.origin !== "http://127.0.0.1:3004") return;
      if (!localStorage.getItem("sb-127-auth-token"))
        localStorage.setItem("sb-127-auth-token", JSON.stringify(auth));
      if (local && !localStorage.getItem("jornada-v2"))
        localStorage.setItem("jornada-v2", JSON.stringify(local));
    },
    { auth: session(id), local },
  );
  await context.route("http://127.0.0.1:54399/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      headers = {
        "access-control-allow-origin": "http://127.0.0.1:3004",
        "access-control-allow-headers":
          req.headers()["access-control-request-headers"] ||
          "authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,x-supabase-api-version",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      };
    const send = (status, value) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: value === undefined ? "" : JSON.stringify(value),
      });
    if (req.method() === "OPTIONS") return send(204);
    let actor;
    try {
      actor = JSON.parse(
        Buffer.from(
          (req.headers().authorization || "").split(".")[1],
          "base64url",
        ).toString(),
      ).sub;
    } catch {}
    if (url.pathname === "/auth/v1/user")
      return actor
        ? send(200, user(actor))
        : send(401, { message: "Missing session" });
    if (url.pathname === "/auth/v1/logout") return send(204);
    if (url.pathname === "/rest/v1/workspaces") {
      if (url.searchParams.get("owner_id") !== `eq.${actor}`)
        return send(403, { code: "42501" });
      const row = rows.get(actor);
      return send(200, row ? [row] : []);
    }
    if (url.pathname === "/rest/v1/rpc/save_workspace") {
      backend.writes++;
      if (backend.fail) {
        backend.fail = false;
        return send(503, { message: "Test offline" });
      }
      const body = req.postDataJSON();
      if (body.p_owner_id !== actor) return send(403, { code: "42501" });
      const current = rows.get(actor),
        revision = current?.revision || 0;
      if (body.p_expected_revision !== revision)
        return send(409, { code: "40001", message: "Conflict" });
      const updated_at = new Date().toISOString();
      rows.set(actor, {
        owner_id: actor,
        payload: body.p_payload,
        revision: revision + 1,
        updated_at,
      });
      return send(200, [{ revision: revision + 1, updated_at }]);
    }
    if (url.pathname === "/auth/v1/otp") return send(200, {});
    return send(404, { message: "Test route not implemented" });
  });
  return backend;
}
async function openExisting(page, context, options = {}) {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const s = createWorkspace();
  s.configured = true;
  s.profile.name = "Cuenta A";
  s.entries = [
    {
      id: "original",
      date: "2026-10-08",
      hours: 8,
      type: "work",
      note: "Registro original",
      quantity: 0,
    },
  ];
  const rows = new Map([
    [
      A,
      {
        owner_id: A,
        payload: s,
        revision: 1,
        updated_at: new Date().toISOString(),
      },
    ],
  ]);
  const backend = await fixture(context, { rows, ...options });
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  return backend;
}
async function addEntry(page) {
  await page
    .getByRole("button", { name: "Cargar una jornada manualmente" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha de entrada").fill("2026-10-09");
  await dialog.getByLabel("Entrada", { exact: true }).fill("05:00");
  await dialog.getByLabel("Salida real", { exact: true }).fill("13:00");
  await dialog
    .getByRole("button", { name: "Guardar jornada", exact: true })
    .click();
}
const saved = (page) =>
  page
    .locator(".cloud-status")
    .filter({ hasText: "Guardado en tu cuenta" })
    .waitFor();

test("datos locales solo se importan cuando el usuario los elige", async ({
  page,
  context,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const local = createWorkspace();
  local.configured = true;
  local.profile.name = "Mis registros";
  local.entries = [
    {
      id: "local",
      date: "2026-10-08",
      hours: 8,
      type: "work",
      note: "Importado",
      quantity: 0,
    },
  ];
  const backend = await fixture(context, { local });
  await page.goto("/");
  await page
    .getByRole("heading", { name: "¿Estos registros son tuyos?" })
    .waitFor();
  assert.equal(backend.writes, 0);
  await page
    .getByRole("button", { name: "Importar mis registros de este navegador" })
    .click();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  await saved(page);
  assert.equal(backend.rows.get(A).payload.entries[0].id, "local");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("jornada-v2")).entries[0].id,
    ),
    "local",
  );
  await addEntry(page);
  await saved(page);
  assert.equal(backend.rows.get(A).payload.entries.length, 2);
});
test("otra sesión recupera los registros y una cuenta distinta empieza sin esos datos", async ({
  page,
  context,
  browser,
}) => {
  const backend = await openExisting(page, context);
  await addEntry(page);
  await saved(page);
  const second = await browser.newContext();
  try {
    await fixture(second, { rows: backend.rows });
    const other = await second.newPage();
    await other.goto("http://127.0.0.1:3004");
    await other
      .getByRole("heading", { name: "Tu esfuerzo, en números." })
      .waitFor();
    await other
      .getByLabel("Fecha del período", { exact: true })
      .fill("2026-10-09");
    assert.equal(await other.locator("tbody tr").count(), 2);
  } finally {
    await second.close();
  }
  const different = await browser.newContext();
  try {
    await fixture(different, { id: B, rows: backend.rows });
    const other = await different.newPage();
    await other.goto("http://127.0.0.1:3004");
    await other
      .getByRole("heading", { name: "Bienvenido a tu cuenta." })
      .waitFor();
    assert.equal(await other.getByText("Registro original").count(), 0);
    assert.equal(backend.rows.has(B), false);
  } finally {
    await different.close();
  }
});
test("error de red conserva cambios y los reintenta al volver a abrir", async ({
  page,
  context,
}) => {
  const backend = await openExisting(page, context);
  backend.fail = true;
  await addEntry(page);
  await page.locator(".cloud-status.error").waitFor();
  const cache = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "jornada-account-v1:11111111-1111-4111-8111-111111111111",
      ),
    ),
  );
  assert.equal(cache.dirty, true);
  assert.equal(cache.workspace.entries.length, 2);
  assert.equal(backend.rows.get(A).payload.entries.length, 1);
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  await saved(page);
  assert.equal(backend.rows.get(A).payload.entries.length, 2);
});
test("un conflicto conserva ambas versiones y no sobrescribe al otro dispositivo", async ({
  page,
  context,
}, testInfo) => {
  const backend = await openExisting(page, context);
  const remote = structuredClone(backend.rows.get(A));
  remote.revision = 2;
  remote.payload.profile.name = "Cambio remoto";
  backend.rows.set(A, remote);
  await addEntry(page);
  await page
    .getByRole("heading", { name: "Hay dos versiones de tus datos." })
    .waitFor();
  assert.equal(backend.rows.get(A).revision, 2);
  assert.equal(backend.rows.get(A).payload.entries.length, 1);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar mis cambios de este dispositivo" })
    .click();
  const file = await downloadPromise,
    path = testInfo.outputPath("cambios-pendientes.json");
  await file.saveAs(path);
  assert.equal(
    JSON.parse(await require("node:fs/promises").readFile(path, "utf8")).entries
      .length,
    2,
  );
  await page
    .getByRole("button", { name: "Cargar la versión guardada en mi cuenta" })
    .click();
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  await saved(page);
  assert.match(
    await page.locator(".aside-bottom").innerText(),
    /Cambio remoto/,
  );
  assert.equal(backend.rows.get(A).revision, 2);
});
test("cerrar sesión oculta los registros y limpia la copia sincronizada de la cuenta", async ({
  page,
  context,
}) => {
  await openExisting(page, context);
  await saved(page);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar con Google" }).waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Tu esfuerzo, en números." })
      .count(),
    0,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem(
        "jornada-account-v1:11111111-1111-4111-8111-111111111111",
      ),
    ),
    null,
  );
});

test("pantalla de ingreso no muestra datos sin sesión y genera el acceso de Google con retorno al sitio", async ({
  page,
  context,
}, testInfo) => {
  context.on("weberror", (e) => browserErrors.push(e.error().message));
  await context.route("http://127.0.0.1:54399/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/authorize")
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>Proveedor de prueba</p>",
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
      headers: { "access-control-allow-origin": "http://127.0.0.1:3004" },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continuar con Google" }).waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Tu esfuerzo, en números." })
      .count(),
    0,
  );
  await page.screenshot({
    path: testInfo.outputPath("ingreso-pc.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("ingreso-celular.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await page.waitForURL((url) => url.pathname === "/auth/v1/authorize");
  const target = new URL(page.url());
  assert.equal(target.searchParams.get("provider"), "google");
  assert.equal(
    target.searchParams.get("redirect_to"),
    "http://127.0.0.1:3004/auth/callback",
  );
});

test("varios trabajos se sincronizan completos y mantienen registros separados", async ({
  page,
  context,
  browser,
}) => {
  const { createWorkspace } = await import("../../lib/workspace.mjs");
  const { addJob } = await import("../../lib/jobs.mjs");
  const primary = createWorkspace();
  primary.configured = true;
  primary.entries = [
    {
      id: "factory",
      date: "2026-10-08",
      hours: 8,
      type: "work",
      note: "Solo fábrica",
      quantity: 0,
    },
  ];
  const second = addJob(primary, "Repartos", "second");
  second.configured = true;
  const rows = new Map([
    [
      A,
      {
        owner_id: A,
        payload: second,
        revision: 1,
        updated_at: new Date().toISOString(),
      },
    ],
  ]);
  const backend = await fixture(context, { rows });
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Tu esfuerzo, en números." })
    .waitFor();
  await addEntry(page);
  await saved(page);
  assert.equal(backend.rows.get(A).payload.entries.length, 1);
  assert.equal(
    backend.rows.get(A).payload.otherJobs[0].entries[0].note,
    "Solo fábrica",
  );
  await page
    .getByLabel("Trabajo actual", { exact: true })
    .selectOption("primary");
  await saved(page);
  assert.equal(backend.rows.get(A).payload.entries[0].note, "Solo fábrica");
  assert.equal(backend.rows.get(A).payload.otherJobs[0].jobName, "Repartos");
  const fresh = await browser.newContext();
  try {
    await fixture(fresh, { rows });
    const other = await fresh.newPage();
    await other.goto("http://127.0.0.1:3004/");
    await other
      .getByRole("heading", { name: "Tu esfuerzo, en números." })
      .waitFor();
    await other
      .getByLabel("Trabajo actual", { exact: true })
      .selectOption("second");
    await saved(other);
    assert.equal(rows.get(A).payload.jobName, "Repartos");
    assert.equal(rows.get(A).payload.entries[0].date, "2026-10-09");
    assert.equal(
      rows.get(A).payload.otherJobs[0].entries[0].note,
      "Solo fábrica",
    );
  } finally {
    await fresh.close();
  }
});
