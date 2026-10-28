import { test, expect } from "@playwright/test";

for (const motion of ["no-preference", "reduce"] as const) {
  test(`coffee loading: centered, visible and ${motion} safe`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    let release!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    await page.route(
      /\/(?:\.netlify\/functions\/website-analysis|backend-api\/[^/]+\/scans)$/,
      async (route) => {
        calls++;
        await responseGate;
        await route.fulfill({
          status: 503,
          json: { message: "Temporary test failure" },
        });
      },
    );
    await page.goto("/en/ai-scan/?branche=Autobedrijven");
    await page.locator(".choice").first().click();
    await page.locator(".choice").first().click();
    await page.locator(".choice").first().click();
    await page.locator(".continue").click();
    await page.locator(".choice").first().click();
    await page.locator(".continue").click();
    await page.locator(".choice").first().click();
    await page.locator(".choice").first().click();
    await page.locator(".continue").click();
    await page.locator(".choice").first().click();
    await page.locator("#no-website").check();
    await page.locator(".website-form [name=consent]").check();
    await page.emulateMedia({ reducedMotion: motion });
    await page.locator(".website-form button").click();
    await expect(page.locator(".loading-view")).toBeVisible();
    await expect(page.locator(".loading-view .main-title")).toBeFocused();
    await expect(page.locator(".coffee-scene")).toBeInViewport({ ratio: 1 });
    const center = await page.locator(".loading-view").evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.x + box.width / 2;
    });
    for (const selector of [
      ".coffee-scene",
      ".loading-view .eyebrow",
      ".loading-view .main-title",
      ".waiting-intro",
      ".waiting-note",
      ".waiting-note p",
      ".waiting-line",
      "[data-waiting-time]",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(Math.abs(box!.x + box!.width / 2 - center), selector).toBeLessThan(
        2,
      );
    }
    const animation = await page
      .locator(".coffee-fill")
      .evaluate((el) => getComputedStyle(el).animationName);
    if (motion === "no-preference") {
      expect(animation).toBe("apCoffeeFill");
      await expect
        .poll(() =>
          page
            .locator(".coffee-stream")
            .evaluate((el) => Number(getComputedStyle(el).opacity)),
        )
        .toBeGreaterThan(0.8);
      const earlyY = await page
        .locator(".coffee-fill")
        .evaluate(
          (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42,
        );
      expect(earlyY).toBeGreaterThan(15);
      await page.screenshot({
        path: `/tmp/autopilots-coffee-pouring-${test.info().project.name}.png`,
      });
      await expect
        .poll(
          () =>
            page
              .locator(".coffee-fill")
              .evaluate(
                (el) =>
                  new DOMMatrixReadOnly(getComputedStyle(el).transform).m42,
              ),
          { timeout: 8000 },
        )
        .toBeLessThan(1);
      await expect
        .poll(() =>
          page
            .locator(".coffee-stream")
            .evaluate((el) => Number(getComputedStyle(el).opacity)),
        )
        .toBe(0);
      await expect
        .poll(() =>
          page
            .locator(".coffee-steam")
            .evaluate((el) => Number(getComputedStyle(el).opacity)),
        )
        .toBe(1);
    } else {
      expect(animation).toBe("none");
      await expect(page.locator(".coffee-stream")).toHaveCSS("opacity", "0");
      await expect(page.locator(".coffee-fill")).toHaveCSS("transform", "none");
    }
    const statusBox = await page.locator(".waiting-note").boundingBox();
    await expect(page.locator("[data-waiting-message]")).toHaveText(
      "A good solution starts with understanding how you work.",
      { timeout: 10000 },
    );
    const nextBox = await page.locator(".waiting-note").boundingBox();
    expect(Math.abs(nextBox!.height - statusBox!.height)).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(calls).toBe(1);
    release();
    await expect(page.locator(".loading-view")).toBeHidden();
    await expect(page.locator(".question-view")).toBeVisible();
    await expect(page.locator(".error")).toContainText(
      "The analysis is unavailable. Please try again.",
    );
    await expect(page.locator("#ap-intake")).not.toHaveClass(/is-analyzing/);
  });
}
