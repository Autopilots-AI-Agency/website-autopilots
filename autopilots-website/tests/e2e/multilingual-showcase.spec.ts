import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  translator,
  messages,
} from "../../src/components/premium/showcase-i18n";
import {
  generalProfile,
  showcaseProfiles,
} from "../../src/components/premium/showcase-profiles";
import { localizedProfile } from "../../src/components/premium/showcase-profile-i18n";

const languages = ["en", "es", "de", "it", "fr"] as const;
for (const locale of languages) {
  const t = translator(locale);
  test(`${locale}: all industry scenes, controls and website editor are translated`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/${locale}/`);
    await page.locator("[data-consent-reject]").click();
    await expect(page.locator(".us-panel")).toHaveCount(3);
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      new RegExp(`^${locale}`),
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://auto-pilots.io/${locale}/`,
    );
    await expect(page.locator(".cs-hero h1")).toContainText(
      t("Je bedrijf kan meer."),
    );
    await expect(page.locator("#sp-title")).toContainText(
      t("en zie wat wij kunnen betekenen."),
    );
    await expect(page.locator("#home-language summary")).toContainText(
      locale.toUpperCase(),
    );
    await expect(page.locator(".cs-cta [data-quiz-cta]")).toHaveAttribute(
      "href",
      new RegExp(`^/${locale}/ai-scan/`),
    );
    await expect(page.locator(".cs-cta h2")).toContainText(t("En hoe zou dit"));
    // Full phrases that differ from this locale must never leak into the demos.
    const forbidden = messages
      .filter(
        (row) =>
          row[0].length > 25 && row[0] !== t(row[0]) && !row[0].includes("{"),
      )
      .map((row) => row[0]);
    for (const original of [generalProfile, ...showcaseProfiles]) {
      const profile = localizedProfile(original, locale);
      if (original.id !== "general")
        await page
          .locator(`.sp-option input[value="${original.branch}"]`)
          .check();
      await expect(page.locator("[data-customer-line]")).toContainText(
        profile.question,
      );
      await expect(page.locator(".sx-project-board")).toContainText(
        profile.project,
      );
      await expect(page.locator(".dx-atelier-copy h4")).toContainText(
        profile.title,
      );
      const content = await page.locator(".us-world").textContent();
      for (const phrase of forbidden)
        expect(content, `${locale}/${original.id}: ${phrase}`).not.toContain(
          phrase,
        );
    }
    await page.locator('[data-dx-channel="chat"]').click();
    await expect(page.locator("[data-dx-call]")).toHaveText(
      t("Nieuw chatbericht"),
    );
    await page.locator(".dx-flip-toggle").click();
    await expect(page.locator(".dx-flip-back")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    await expect(page.locator(".dx-admin-body")).toContainText(
      t("Zelf aanpassen."),
    );
    await page
      .locator("#demo-site-title")
      .fill("My title <strong>exactly</strong>");
    await page.locator('[data-site-color="#875735"]').click();
    await expect(page.locator(".dx-admin-saved")).toContainText(
      t("Kleur aangepast · bekijk de voorkant"),
    );
    await page.locator(".dx-flip-toggle").click();
    await expect(page.locator(".dx-atelier-copy h4")).toContainText(
      "My title <strong>exactly</strong>",
    );
    await expect(page.locator(".dx-atelier-copy h4 strong")).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .include(".sp-picker")
      .analyze();
    expect(audit.violations).toEqual([]);
  });

  test(`${locale}: only featured choices remain and language switching preserves selection`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/`);
    await page.locator("[data-consent-reject]").click();
    await expect(page.locator(".sp-option")).toHaveCount(8);
    await expect(
      page.locator(".sp-dropdown, .sp-feedback, [name='showcase-other']"),
    ).toHaveCount(0);
    const choice = page.locator('.sp-option input[value="Autobedrijven"]');
    await choice.check();
    await expect(page.locator(".cs-header [data-quiz-cta]")).toHaveAttribute(
      "href",
      /branche=Autobedrijven/,
    );
    await page.locator("#home-language summary").click();
    await page.locator('[data-home-locale="nl"]').click();
    await expect(choice).toBeChecked();
    await page.locator("#home-language summary").click();
    await page.locator(`[data-home-locale="${locale}"]`).click();
    await expect(choice).toBeChecked();
    await page.reload();
    await expect(choice).toBeChecked();
    await expect(page.locator(".us-story")).toHaveAttribute(
      "data-profile",
      "automotive",
    );
  });

  test(`${locale}: scroll transitions keep localized headings and controls clear`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/`);
    await page.locator("[data-consent-reject]").click();
    await page
      .locator('.sp-option input[value="Zakelijke dienstverlening"]')
      .check();
    await page
      .locator('.sp-option input[value="Zakelijke dienstverlening"]')
      .click();
    for (const step of [1, 2, 3]) {
      if (page.viewportSize()!.width < 701) {
        const panel = page.locator(`[data-panel="${step - 1}"]`);
        await panel.scrollIntoViewIfNeeded();
        const box = await panel.boundingBox();
        expect(box!.x).toBe(16);
        expect(box!.width).toBeGreaterThan(page.viewportSize()!.width * 0.9);
        continue;
      }
      await page.locator(`[data-us-step="${step}"]`).click();
      await expect(page.locator(`[data-us-step="${step}"]`)).toHaveAttribute(
        "aria-current",
        "true",
      );
      // Wait for the scroll interpolation to settle before measuring transformed cards.
      await expect
        .poll(async () =>
          page
            .locator(`[data-panel="${step - 1}"]`)
            .evaluate((el) =>
              Math.abs(parseFloat((el as HTMLElement).style.left) - 50),
            ),
        )
        .toBeLessThan(0.01);
      const geometry = await page.locator(".us-story").evaluate((el, step) => {
        const panel = el
          .querySelector(`[data-panel="${step - 1}"]`)!
          .getBoundingClientRect();
        const heading = el
          .querySelector(".us-caption")!
          .getBoundingClientRect();
        const controls = el
          .querySelector(".us-controls")!
          .getBoundingClientRect();
        return {
          top: panel.top,
          bottom: panel.bottom,
          headingBottom: heading.bottom,
          controlsTop: controls.top,
        };
      }, step);
      expect(geometry.top).toBeGreaterThanOrEqual(geometry.headingBottom);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.controlsTop);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
