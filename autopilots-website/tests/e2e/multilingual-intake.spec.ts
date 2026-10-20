import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { intakeTranslator } from "../../src/data/intake-i18n";
import { intakeBranches } from "../../src/data/intakeBranches";
import { routeQuestions } from "../../src/data/intakeRoutes";
import { scanMessages } from "../../netlify/functions/_shared/intake-i18n.mjs";

const routes = {
  website: ["Een nieuwe of betere website"],
  software: ["Software op maat laten bouwen"],
  ai: ["Klantcontact met AI verbeteren"],
  combined: ["Een nieuwe of betere website", "Software op maat laten bouwen"],
};
for (const locale of ["nl", "en", "es", "de", "it", "fr"]) {
  const t = intakeTranslator(locale);
  for (const [route, goals] of Object.entries(routes)) {
    test(`${locale}/${route}: translated questions, validation, report and request`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let received: any;
      let showAdvice!: () => void;
      const loadingGate = new Promise<void>((resolve) => {
        showAdvice = resolve;
      });
      await page.route(
        "**/.netlify/functions/website-analysis",
        async (request) => {
          received = request.request().postDataJSON();
          expect(received.locale).toBe(locale);
          expect(received.answers.focusRoute).toBe(route);
          expect(received.answers.goal).toEqual(goals);
          expect(request.request().headers()["x-autopilots-locale"]).toBe(
            locale,
          );
          if (route === "website") await loadingGate;
          await request.fulfill({
            json: {
              locale,
              token: "signed-fixture",
              sources: [],
              generatedAt: "2026-10-19T12:00:00Z",
              notice: t(
                "Dit eerste voorstel is gebaseerd op jouw antwoorden. Je hebt nog geen website aangeleverd.",
              ),
              report: {
                company: t("Jouw bedrijf"),
                summary: t("Jouw persoonlijke advies"),
                observations: [],
                recommendations: [
                  {
                    title: t("Website op maat"),
                    solution: "Website op maat",
                    why: t("Jouw vertrekpunt"),
                    workflow: [t("Wat hiervoor nodig is")],
                    benefit: t("Een paar keuzes. Een helder vertrekpunt."),
                    conditions: [t("Dit willen we nog samen controleren")],
                  },
                ],
                unknowns: [t("Wat hiervoor nodig is")],
                nextStep: t("Bespreek mijn analyse"),
              },
            },
          });
        },
      );
      await page.route(
        "**/.netlify/functions/analysis-request",
        async (request) => {
          expect(request.request().postDataJSON().token).toBe("signed-fixture");
          expect(request.request().headers()["x-autopilots-locale"]).toBe(
            locale,
          );
          await request.fulfill({
            json: {
              ok: true,
              bookingUrl: "https://auto-pilots.io/",
              confirmation: "accepted",
            },
          });
        },
      );
      await page.goto(`/${locale}/ai-scan/`);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        new RegExp(`^${locale}-`),
      );
      await expect(page.locator("[data-question]")).toHaveText(
        t("In welke branche werkt jouw bedrijf?"),
      );
      for (const branch of intakeBranches) {
        // All branch labels have localized display values; canonical values stay private.
        expect(t(branch), `${locale}: ${branch}`).toBeTruthy();
      }
      await page.locator("#branch-query").fill(t("Tandartsen"));
      await page
        .locator(".choice")
        .filter({ hasText: t("Tandartsen") })
        .click();
      await expect(page.locator("[data-question]")).toHaveText(
        t("Hoe groot is je team?"),
      );
      await page.locator(".choice").first().click();
      await expect(page.locator("[data-question]")).toHaveText(
        t("Wat wil je voor jouw bedrijf realiseren?"),
      );
      await page.locator(".continue").click();
      await expect(page.locator(".error")).toHaveText(
        t("Kies minstens één optie."),
      );
      for (const goal of goals)
        await page
          .locator(".choice")
          .filter({ hasText: t(goal) })
          .click();
      await page.locator(".continue").click();
      for (const [index, question] of routeQuestions[
        route as keyof typeof routeQuestions
      ].entries()) {
        await expect(page.locator("[data-question]")).toHaveText(
          t(question.title),
        );
        await expect(page.locator("[data-help]")).toHaveText(t(question.help));
        for (const option of question.options)
          await expect(
            page.locator(".choice").filter({ hasText: t(option) }),
          ).toBeVisible();
        await page.locator(".choice").first().click();
        if (index !== 1) await page.locator(".continue").click();
      }
      await expect(page.locator("[data-question]")).toHaveText(
        t("Wanneer wil je de volgende stap zetten?"),
      );
      await page.locator(".choice").first().click();
      await expect(page.locator("[data-question]")).toHaveText(
        t("Laat ons jouw vertrekpunt zien."),
      );
      await page.locator(".website-form button").click();
      await expect(page.locator(".error")).toHaveText(
        t("Vul je websiteadres in of kies ‘Ik heb nog geen website’."),
      );
      await page.locator("#no-website").check();
      await page.locator(".website-form button").click();
      await expect(page.locator(".error")).toHaveText(
        t("Bevestig de toestemming om je analyse te maken."),
      );
      await page.locator(".website-form [name=consent]").check();
      await page.locator(".website-form button").click();
      if (route === "website") {
        await expect(page.locator(".loading-view")).toBeVisible();
        await expect(page.locator(".loading-view .main-title")).toContainText(
          t("Schenk gerust"),
        );
        await expect(page.locator(".coffee-scene")).toBeInViewport({
          ratio: 1,
        });
        const alignment = await page.locator(".loading-view").evaluate((el) => {
          const parent = el.getBoundingClientRect();
          return [
            ...el.querySelectorAll(
              ".coffee-scene, .main-title, .waiting-intro, .waiting-note p",
            ),
          ].map((child) => {
            const box = child.getBoundingClientRect();
            return Math.abs(
              box.x + box.width / 2 - parent.x - parent.width / 2,
            );
          });
        });
        expect(alignment.every((offset) => offset < 2)).toBe(true);
        showAdvice();
      }
      await expect(page.locator(".consultant-choice")).toBeVisible();
      await page
        .locator("[data-consultant-email] [name=email]")
        .fill("fixture@example.com");
      await page.locator("[data-consultant-email] [name=consent]").check();
      await page.locator("[data-consultant-email] button").click();
      await expect(page).toHaveURL(
        new RegExp("/" + locale + "/ai-scan/resultaat/"),
      );
      await expect(page.locator(".result-view")).toBeVisible();
      await expect(page.locator(".recommendation small")).toContainText(
        t("Website op maat"),
      );
      expect(received.answers.sector).toBe("Tandartsen");
      const text = await page.locator(".result-view").innerText();
      if (locale !== "nl")
        for (const [source] of scanMessages)
          if (source.length > 25 && t(source) !== source)
            expect(text).not.toContain(source);
      if (route === "website") {
        const audit = await new AxeBuilder({ page })
          .include("#ap-intake")
          .analyze();
        expect(audit.violations).toEqual([]);
        const downloaded = page.waitForEvent("download");
        await page.locator(".result-view .download").click();
        const file = await downloaded;
        const content = await readFile((await file.path())!, "utf8");
        expect(content).toContain(t("Jouw antwoorden:"));
        expect(content).toContain(t("Een nieuwe of betere website"));
        expect(content).not.toContain("focusRoute:");
      }
      await expect(page.locator(".consultant-booking")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
  test(`${locale}: homepage forwards industry and campaign to matching scan`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/?utm_source=language-test`);
    await page.locator("[data-consent-reject]").click();
    await page.locator(".sp-option input").first().check();
    await page.locator(".cs-header [data-quiz-cta]").click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/ai-scan/\\?`));
    expect(new URL(page.url()).searchParams.get("utm_source")).toBe(
      "language-test",
    );
    expect(new URL(page.url()).searchParams.get("branche")).toBeTruthy();
    await expect(page.locator("[data-question]")).toHaveText(
      t("Hoe groot is je team?"),
    );
    await page.locator(".scan-language summary").click();
    await expect(page.locator(".scan-language nav a")).toHaveCount(6);
  });
}
