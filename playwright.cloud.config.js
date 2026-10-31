const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/cloud",
  outputDir: "test-results-cloud",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3004",
    viewport: { width: 1280, height: 960 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Mendoza",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3004",
    url: "http://127.0.0.1:3004",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54399",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
    },
  },
});
