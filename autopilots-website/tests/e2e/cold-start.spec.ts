import { test, expect } from "@playwright/test";
import { mockScan } from "./scan-fixtures";

test("a sleeping backend is probed before a single scan is submitted", async ({
  page,
}) => {
  let release!: () => void;
  const healthGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let probes = 0;
  let submissions = 0;
  await mockScan(page, (route) => {
    submissions++;
    return route.fulfill({
      json: {
        report: {
          company: "Synthetic cold-start check",
          summary: "Fixture",
          recommendations: [],
          observations: [],
          unknowns: [],
        },
        sources: [],
        generatedAt: new Date().toISOString(),
      },
    });
  });
  await page.route("**/backend-api/*/health", async (route) => {
    probes++;
    expect(route.request().method()).toBe("GET");
    expect(route.request().postData()).toBeNull();
    await healthGate;
    await route.fulfill({ json: { status: "ready" } });
  });
  await page.route("**/backend-api/*/consultant", (route) =>
    route.fulfill({ json: { ok: true, enabled: false } }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nl/ai-scan/");
  for (let step = 0; step < 3; step++)
    await page.locator(".choice").first().click();
  await page.locator(".continue").click();
  for (const multi of [true, false, true]) {
    await page.locator(".choice").first().click();
    if (multi) await page.locator(".continue").click();
  }
  await page.locator(".choice").first().click();
  await page.locator("#no-website").check();
  await page.locator(".website-form [name=consent]").check();
  await page.locator(".website-form button").click();
  await expect(page.locator(".loading-view")).toBeVisible();
  await expect.poll(() => probes).toBeGreaterThan(0);
  expect(submissions).toBe(0);
  release();
  await expect(page.locator(".consultant-choice")).toBeVisible();
  expect(submissions).toBe(1);
});
