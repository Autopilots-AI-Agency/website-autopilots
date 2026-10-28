import { test, expect } from "@playwright/test";
import { consultantCopy } from "../../src/data/consultant-copy";
import { mockBackendHealth } from "./scan-fixtures";
for (const locale of ["nl", "en", "es", "de", "it", "fr"]) {
  test(`${locale}: verified callback choice reaches personal landing with provider status`, async ({
    page,
  }, info) => {
    const c = consultantCopy(locale);
    await mockBackendHealth(page);
    const calls: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(
      /\/(?:\.netlify\/functions|backend-api\/[^/]+)\/consultant$/,
      async (route) => {
        const body = route.request().postDataJSON();
        calls.push(body.action);
        if (body.action === "config")
          return route.fulfill({ json: { ok: true, enabled: true } });
        if (body.action === "verify-start") {
          expect(body.input.consent).toBe(true);
          expect(body.input.phone).toBe("+31612345678");
          expect(body.input.token).toBe("synthetic");
          return route.fulfill({
            json: { ok: true, id: "challenge-fixture", key: "synthetic-key" },
          });
        }
        if (body.action === "verify-check") {
          expect(body.input.code).toBe("123456");
          return route.fulfill({ json: { ok: true, verified: true } });
        }
        if (body.action === "call") {
          expect(body.input.challengeId).toBe("challenge-fixture");
          expect(body.input.consentVersion).toBe("ai-callback-2026-10-20");
          return route.fulfill({
            json: {
              ok: true,
              id: "call-fixture",
              key: "status-fixture",
              status: "queued",
            },
          });
        }
        return route.fulfill({ json: { ok: true, status: "in-progress" } });
      },
    );
    await page.goto(`/${locale}/ai-scan/`);
    // The full quiz -> choice path is covered separately in all six languages.
    await page.evaluate((locale) => {
      const root = document.querySelector("#ap-intake")!;
      (root.querySelector(".question-view") as HTMLElement).hidden = true;
      root.dispatchEvent(
        new CustomEvent("consultant:assessment", {
          detail: {
            token: "synthetic",
            answers: { sector: "Synthetic" },
            report: {
              locale,
              token: "synthetic",
              sources: [],
              generatedAt: new Date().toISOString(),
              report: {
                company: "Synthetic",
                summary: "Fixture",
                recommendations: [],
                observations: [],
                unknowns: [],
              },
            },
          },
        }),
      );
    }, locale);
    await expect(page.getByRole("button", { name: c.verify })).toBeEnabled();
    await page
      .locator("[data-consultant-phone] [name=phone]")
      .fill("+31612345678");
    await page.getByRole("button", { name: c.verify }).click();
    expect(calls).not.toContain("verify-start");
    await page.locator("[data-consultant-phone] [name=consent]").check();
    await page.getByRole("button", { name: c.verify }).click();
    await page.locator("[data-consultant-code] input").fill("123456");
    await page.getByRole("button", { name: c.confirm, exact: false }).click();
    await page.getByRole("button", { name: c.callNow, exact: false }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/ai-scan/resultaat/`));
    await expect(page.locator("[data-call-status]")).toHaveText(c.connected);
    await expect(page.locator(".result-view")).toBeVisible();
    await expect(page.locator(".consultant-booking h1")).toHaveText(
      c.resultTitle,
    );
    expect(calls.filter((x) => x === "call")).toHaveLength(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    if (locale === "nl")
      await page.screenshot({
        path: `/tmp/autopilots-consultant-result-${info.project.name}.png`,
        fullPage: true,
      });
    await page.reload();
    await expect(page.locator("[data-call-status]")).toHaveText(c.connected);
    expect(calls.filter((x) => x === "call")).toHaveLength(1);
  });
}
