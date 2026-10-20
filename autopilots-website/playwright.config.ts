import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.AP_TEST_PORT || 4321);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: `ASTRO_TELEMETRY_DISABLED=1 npm run build && ASTRO_TELEMETRY_DISABLED=1 npx --no-install astro preview --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/nl/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
