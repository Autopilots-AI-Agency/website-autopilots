import { test, expect } from "@playwright/test";
import { consultantCopy } from "../../src/data/consultant-copy";
import { intakeTranslator } from "../../src/data/intake-i18n";

// Local synthetic journey. No real analysis, mail, SMS or call is performed.
test.describe("consultant choice preview", () => {
  for (const locale of ["nl", "en", "es", "de", "it", "fr"]) {
    test(`${locale}: email choice, disabled calls, booking above results`, async ({
      page,
    }, info) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const t = intakeTranslator(locale);
      const c = consultantCopy(locale);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/.netlify/functions/website-analysis", (route) =>
        route.fulfill({
          json: {
            token: "synthetic-assessment",
            sources: [],
            generatedAt: new Date().toISOString(),
            report: {
              company: "Voorbeeldbedrijf",
              summary: "Synthetic test advice",
              recommendations: [],
              observations: [],
              unknowns: [],
            },
          },
        }),
      );
      await page.route("**/.netlify/functions/analysis-request", (route) => {
        const body = route.request().postDataJSON();
        expect(body.delivery).toBe("analysis");
        expect(body.name).toBeUndefined();
        expect(body.token).toBe("synthetic-assessment");
        return route.fulfill({ json: { ok: true, confirmation: "accepted" } });
      });
      await page.route("**/.netlify/functions/consultant", (route) =>
        route.fulfill({ json: { ok: true, enabled: false } }),
      );
      await page.goto(`/${locale}/ai-scan/`);
      await page.locator(".choice").first().click();
      await expect(page.locator("[data-question]")).toHaveText(
        t("Hoe groot is je team?"),
      );
      await page.locator(".choice").first().click();
      await expect(page.locator("[data-question]")).toHaveText(
        t("Wat wil je voor jouw bedrijf realiseren?"),
      );
      await page.locator(".choice").first().click();
      await page.locator(".continue").click();
      for (const multi of [true, false, true]) {
        await page.locator(".choice").first().click();
        if (multi) await page.locator(".continue").click();
      }
      await page.locator(".choice").first().click();
      await page.locator("#no-website").check();
      await page.locator(".website-form [name=consent]").check();
      await page.locator(".website-form button[type=submit]").click();
      await expect(page.locator("#consultant-title")).toHaveText(c.title);
      await expect(page.locator(".consultant-choice")).toBeVisible();
      const title = await page.locator("#consultant-title").boundingBox();
      const choices = await page.locator(".consultant-options").boundingBox();
      expect(
        Math.abs(title!.x + title!.width / 2 - choices!.x - choices!.width / 2),
      ).toBeLessThan(2);
      await expect(page.locator("#consultant-title")).toHaveCSS(
        "text-align",
        "center",
      );
      await expect(page.getByRole("button", { name: c.verify })).toBeDisabled();
      await expect(page.locator(".result-view")).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (locale === "nl")
        await page.screenshot({
          path: `/tmp/autopilots-consultant-${info.project.name}.png`,
          fullPage: true,
        });
      await page
        .locator("[data-consultant-email] [name=email]")
        .fill("synthetic@example.test");
      await page.locator("[data-consultant-email] [name=consent]").check();
      await page.locator("[data-consultant-email] button").click();
      await expect(page.locator(".result-view")).toBeVisible();
      await expect(page.locator("[data-consultant-receipt]")).toHaveText(
        c.accepted,
      );
      const booking = await page.locator(".consultant-booking").boundingBox();
      const report = await page.locator(".result-view").boundingBox();
      expect(booking!.y + booking!.height).toBeLessThanOrEqual(report!.y);
      expect(errors).toEqual([]);
    });
  }
});
