import type { Page, Route } from "@playwright/test";

// Synthetic HTTP receipts only; this adapter exercises both real client transports.
export async function mockScan(page: Page, handler: (route: Route) => unknown) {
  let report: any;
  let input: any;
  await page.route("**/.netlify/functions/website-analysis", handler);
  await page.route("**/backend-api/*/scans", async (route) => {
    input = route.request().postDataJSON();
    const proxy = new Proxy(route, {
      get(target, property) {
        if (property === "fulfill")
          return async (options: any) => {
            report = options.json;
            await target.fulfill({
              status: 202,
              json: {
                id: target.request().headers()["idempotency-key"],
                state: "running",
              },
            });
          };
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await handler(proxy);
  });
  await page.route("**/backend-api/*/scans/*", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      json: {
        state: "succeeded",
        result: report.report,
        sources: report.sources,
        generatedAt: report.generatedAt,
        assessmentMode: "INTAKE_ONLY",
        answers: input.answers,
      },
    });
  });
}

export async function mockEmail(
  page: Page,
  handler: (route: Route) => unknown,
) {
  await page.route("**/.netlify/functions/analysis-request", handler);
  await page.route("**/backend-api/*/scans/*/email", async (route) => {
    const body = route.request().postDataJSON();
    if (
      !body.consent ||
      !/^[A-Za-z0-9_-]{43}$/.test(route.request().headers()["x-scan-token"])
    )
      throw new Error("Native email is missing consent or visitor capability");
    return route.fulfill({ json: { state: "accepted" } });
  });
}
