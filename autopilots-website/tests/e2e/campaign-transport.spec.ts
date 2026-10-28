import { test, expect } from "@playwright/test";
import binding from "../../rumata.backends.json" with { type: "json" };

test("public campaign preserves questions and consent on the configured transport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const submissions: { path: string; consent: boolean; answers: string }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Local synthetic journey only: no CRM, email, AI or telephone provider calls.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=:))/, (route) =>
    route.abort(),
  );
  await page.route(/\/api\/funnel-event$/, (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.route(/\/api\/funnel-lead$/, (route) => {
    const body = route.request().postDataJSON();
    submissions.push({
      path: new URL(route.request().url()).pathname,
      consent: body.consent,
      answers: body.funnelAnswers,
    });
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/nl/lp/autobedrijven/ai-medewerker/");
  for (const [name, value] of [
    ["volume", "175"],
    ["channel", "phone"],
    ["missed", "20"],
    ["responseTime", "under-60"],
    ["goal", "appointments"],
  ]) {
    await page
      .locator(`label:has(input[name="${name}"][value="${value}"])`)
      .click();
  }
  await page.locator('.ap-entry-fields [name="name"]').fill("Synthetic test");
  await page.locator('.ap-entry-fields [name="company"]').fill("Test only");
  await page
    .locator('.ap-entry-fields [name="email"]')
    .fill("synthetic@example.test");
  await page.locator('.ap-entry-fields [name="phone"]').fill("+31612345678");
  const necessaryOnly = page.getByRole("button", {
    name: "Alleen noodzakelijk",
    exact: true,
  });
  if (await necessaryOnly.isVisible()) await necessaryOnly.click();
  await page.locator(".ap-entry-submit").click();
  expect(submissions).toHaveLength(0);
  await page.locator(".ap-entry-consent input").check();
  await page.locator(".ap-entry-submit").click();
  await expect(page).toHaveURL(
    /\/nl\/lp\/autobedrijven\/ai-medewerker\/ervaring\//,
  );
  expect(submissions).toHaveLength(1);
  const prefix = process.env.NETLIFY
    ? ""
    : `/backend-api/${binding.VITE_AUTOPILOTS_SCAN_URL.serviceId}`;
  expect(submissions[0].path).toBe(`${prefix}/api/funnel-lead`);
  expect(submissions[0].consent).toBe(true);
  expect(Object.keys(JSON.parse(submissions[0].answers))).toEqual([
    "volume",
    "channel",
    "missed",
    "responseTime",
    "goal",
  ]);
  expect(errors).toEqual([]);
});
