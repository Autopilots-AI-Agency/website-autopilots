import { test, expect } from "@playwright/test";

test("scroll builds the house, flips to its backend and reverses correctly", async ({
  page,
}) => {
  await page.goto("/nl/");
  await expect(page.locator(".us-story")).toBeVisible();
  const goToPhase = async (phase: number) => {
    await page.locator(".us-story").evaluate((el, phase) => {
      const stage = el as HTMLElement;
      window.scrollTo({
        top:
          window.scrollY +
          stage.getBoundingClientRect().top +
          ((stage.offsetHeight - window.innerHeight) * phase) / 4,
        behavior: "instant",
      });
    }, phase);
  };
  await goToPhase(2.6);
  await expect(page.locator("[data-house-phase]")).toHaveText("Eerste lijnen");
  const first = await page
    .locator("[data-house-canvas]")
    .evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await goToPhase(3.1);
  await expect(page.locator("[data-house-phase]")).toHaveText(
    "Een plek om te leven",
  );
  const built = await page
    .locator("[data-house-canvas]")
    .evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  expect(built).not.toEqual(first);
  await goToPhase(3.4);
  await expect(page.locator(".dx-flip-back")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await goToPhase(2.6);
  await expect(page.locator(".dx-flip-front")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await expect(page.locator("[data-house-phase]")).toHaveText("Eerste lijnen");
});

test("showcase has working channels, evolving scenes and an editable website back", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/nl/");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  const stage = page.locator(".us-story");
  const panels = page.locator(".us-panel");
  await expect(panels).toHaveCount(3);
  await page.locator('[data-us-step="1"]').click();
  await expect(page.locator('[data-us-step="1"]')).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect
    .poll(async () =>
      Number(await panels.nth(0).getAttribute("data-demo-progress")),
    )
    .toBeGreaterThan(0.5);
  await panels.nth(0).locator('[data-dx-channel="chat"]').click();
  await expect(page.locator("[data-customer-line]")).toContainText(
    "woning ontwerpen",
  );
  await panels.nth(0).locator("[data-dx-play]").click();
  await expect(panels.nth(0).locator("[data-dx-status]")).toContainText(
    "Je team kan verder",
  );
  await page.locator('[data-us-step="2"]').click();
  await expect(page.locator('[data-us-step="2"]')).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect
    .poll(async () =>
      Number(await panels.nth(1).getAttribute("data-demo-progress")),
    )
    .toBeGreaterThan(0.5);
  await panels.nth(1).locator("[data-dx-play]").click();
  await expect(
    panels.nth(1).locator(".sx-customer-portal").locator(".."),
  ).toHaveClass(/dx-shown/);
  await page.locator('[data-us-step="3"]').click();
  await expect(page.locator('[data-us-step="3"]')).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect
    .poll(async () =>
      Number(await panels.nth(2).getAttribute("data-demo-progress")),
    )
    .toBeGreaterThan(0.5);
  await expect(page.locator(".sx-house-stage")).toHaveClass(/sx-canvas-ready/);
  await panels.nth(2).locator("[data-dx-play]").click();
  await expect(page.locator("[data-house-phase]")).toHaveText(
    "Een plek om te leven",
  );
  await page.getByRole("button", { name: "Bekijk de achterkant" }).click();
  await expect(page.locator(".dx-flip-back")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await page.getByLabel("Titel op je website").fill("Ruimte om te groeien.");
  await page.getByRole("button", { name: "Warm brons", exact: true }).click();
  await page.getByRole("button", { name: "Bekijk jouw aanpassingen" }).click();
  await expect(page.locator(".dx-flip-front")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await expect(page.locator(".dx-flip-front h4")).toContainText(
    "Ruimte om te groeien.",
  );
  // Layout safety includes the active transformed panel, not only document overflow.
  const geometry = await stage.evaluate((el) => {
    const card = el
      .querySelector<HTMLElement>('[data-panel="2"]')!
      .getBoundingClientRect();
    const heading = el.querySelector(".us-caption")!.getBoundingClientRect();
    const controls = el.querySelector(".us-controls")!.getBoundingClientRect();
    return {
      top: card.top,
      bottom: card.bottom,
      headingBottom: heading.bottom,
      controlsTop: controls.top,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.headingBottom);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.controlsTop);
  expect(errors).toEqual([]);
});

test("reduced motion shows completed scenes and preserves manual backend controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nl/");
  await expect(page.locator("#ap-connected")).toHaveClass(/us-static/);
  await expect(page.locator("[data-house-phase]")).toHaveText(
    "Een plek om te leven",
  );
  await expect(page.locator(".us-panel[inert]")).toHaveCount(0);
  await expect(page.locator(".sx-customer-portal").locator("..")).toHaveClass(
    /dx-shown/,
  );
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await page.getByRole("button", { name: "Bekijk de achterkant" }).click();
  await expect(page.locator(".dx-flip-back")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
});
