const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  expect: { timeout: 7000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3002",
    viewport: { width: 1440, height: 1050 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Mendoza",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm start -- --port 3002",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
