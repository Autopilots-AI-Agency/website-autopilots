import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "autopilots_consent_v1",
      JSON.stringify({ analytics: false }),
    ),
  );
  await page.goto("/calculator/");
});

test("proposal costs remain blank until entered; known calculation is exact", async ({
  page,
}) => {
  await expect(page.locator('[data-output="net"]')).toHaveText("—");
  await expect(page.locator("#rc-implementation")).toHaveValue("");
  await expect(page.locator("#rc-minuteRate")).toHaveValue("0.29");
  await expect(page.locator("#rc-phoneShare")).toHaveValue("100");
  await expect(page.locator("#rc-automation")).toHaveValue("85");
  await expect(page.locator("#rc-hourlyCost")).toHaveValue("50");
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-management").fill("100");
  await expect(page.locator('[data-output="hours"]')).toHaveText("42,5 uur");
  await expect(page.locator('[data-output="net"]')).toHaveText(/1.155/);
  await expect(page.locator('[data-output="payback"]')).toHaveText("2 maanden");
  await expect(page.locator('[data-output="yearOne"]')).toHaveText(/11.798/);
  await expect(page.locator('[data-output="followingYear"]')).toHaveText(
    /13.860/,
  );
  await expect(page.locator('[data-output="roi"]')).toHaveCount(0);
  await expect(page.locator("#ap-phone-calculator")).not.toContainText(
    "Rendement jaar 1",
  );
  await expect(page.locator('[data-output="firstAutomation"]')).toHaveText(
    "42,5%",
  );
  await expect(page.locator('[data-output="fullAutomation"]')).toHaveText(
    "85%",
  );
  await expect(page.locator(".rc-launch")).toContainText(
    "Volledige maandkosten",
  );
  await expect(page.locator(".rc-launch dl > div")).toHaveCount(2);
  await expect(page.locator(".rc-launch")).not.toContainText(
    "Netto capaciteitswaarde maand 1",
  );
  await expect(page.locator("#rc-status")).toBeHidden();
  await expect(page.locator("[data-chart-line]")).toHaveAttribute("d", /^M24/);
  await page.getByRole("button", { name: "Herstel voorbeeldinvoer" }).click();
  await expect(page.locator("#rc-implementation")).toHaveValue("");
  await expect(page.locator("#rc-phoneShare")).toHaveValue("100");
  await expect(page.locator("#rc-automation")).toHaveValue("85");
  await expect(page.locator("#rc-hourlyCost")).toHaveValue("50");
  await expect(page.locator('[data-output="net"]')).toHaveText("—");
  await expect(page.locator("[data-chart-line]")).not.toHaveAttribute("d");
});

test("current labour value follows fractional FTE and contract hours; AI savings keep their volume limit", async ({
  page,
}) => {
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-management").fill("100");
  const current = page.locator('[data-output="current"]');
  const withAi = page.locator('[data-output="with"]');
  await expect(current).toHaveText(/8.667/);
  await expect(withAi).toHaveText(/7.512/);
  await page.locator("#rc-fte").fill("1.2");
  await expect(current).toHaveText(/10.400/);
  await expect(withAi).toHaveText(/9.245/);
  await expect(page.locator('[data-output="net"]')).toHaveText(/1.155/);
  await page.locator("#rc-fte").fill("1");
  await page.locator("#rc-weeklyHours").fill("48");
  await expect(current).toHaveText(/10.400/);
  await expect(withAi).toHaveText(/9.245/);
  await expect(page.locator('[data-output="hours"]')).toHaveText("42,5 uur");
  await page.locator("#rc-phoneShare").fill("50");
  await expect(current).toHaveText(/5.200/);
  await expect(page.locator('[data-output="net"]')).toHaveText(/1.155/);
});

test("visible usage equation and monthly breakdown follow minutes and tariff", async ({
  page,
}) => {
  const summary = page.locator("[data-usage-summary]");
  await expect(summary.locator('[data-output="minutes"]')).toHaveText("3.000");
  await expect(summary.locator('[data-output="minuteRate"]')).toHaveText(
    /0,29/,
  );
  await expect(summary.locator('[data-output="usage"]')).toHaveText(/870/);
  await expect(summary.locator('[data-output="ai"]')).toHaveText(
    "Nog invullen",
  );
  await page.locator("#rc-management").fill("100");
  await expect(summary.locator('[data-output="ai"]')).toHaveText(/970/);
  await expect(page.locator('[data-output="net"]')).toHaveText("—");
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-minutes").fill("4000");
  await page.locator("#rc-minuteRate").fill("0.30");
  await page.locator("#rc-otherMonthly").fill("50");
  await expect(summary.locator('[data-output="minutes"]')).toHaveText("4.000");
  await expect(summary.locator('[data-output="usage"]')).toHaveText(/1.200/);
  await expect(summary.locator('[data-output="ai"]')).toHaveText(/1.350/);
  await expect(page.locator(".rc-case")).toHaveCount(0);
  await expect(page.locator("fieldset legend").first()).toContainText(
    "huidige personeelskosten",
  );
});

test("one overview follows earlier answers without another benefit choice", async ({
  page,
}) => {
  await expect(page.locator(".rc-results")).toHaveCount(1);
  await expect(page.locator("[data-mode], #rc-avoidedPercent")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Directe besparing", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Waarde van tijd", exact: true }),
  ).toHaveCount(0);
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-management").fill("100");
  await expect(page.locator('[data-output="net"]')).toHaveText(/1.155/);
  await page.locator("#rc-automation").fill("60");
  await expect(page.locator('[data-output="hours"]')).toHaveText("30 uur");
  await expect(page.locator('[data-output="net"]')).toHaveText(/530/);
  await expect(page.locator('[data-output="payback"]')).toHaveText("4 maanden");
  await expect(page.locator('[data-output="yearOne"]')).toHaveText(/4.610/);
  await expect(page.locator('[data-output="firstAutomation"]')).toHaveText(
    "30%",
  );
  await expect(page.locator('[data-output="fullAutomation"]')).toHaveText(
    "60%",
  );
  await page.locator("#rc-automation").fill("80");
  await page.locator("#rc-costMode").selectOption("breakdown");
  await page.locator("#rc-grossHourly").fill("20");
  await page.locator("#rc-holiday").fill("8");
  await page.locator("#rc-employer").fill("20");
  await page.locator("#rc-pension").fill("5");
  await page.locator("#rc-otherHourly").fill("2");
  await expect(page.locator('[data-output="net"]')).toHaveText(/174/);
  await page.locator("#rc-minutes").fill("-1");
  await expect(page.locator("#rc-minutes")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator('[data-output="net"]')).toHaveText("—");
  await expect(page.locator("#rc-status")).toContainText("Controleer");
});

test("removed follow-up input and positive, negative, zero and incomplete result colors", async ({
  page,
}) => {
  await expect(page.locator("#rc-followup")).toHaveCount(0);
  const net = page.locator('[data-output="net"]');
  await expect(net).toHaveAttribute("data-result-state", "neutral");
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-management").fill("100");
  await expect(net).toHaveAttribute("data-result-state", "positive");
  await expect(net).toHaveCSS("color", "rgb(158, 215, 182)");
  await page.locator("#rc-management").fill("2000");
  await expect(net).toHaveAttribute("data-result-state", "negative");
  await expect(net).toHaveCSS("color", "rgb(255, 170, 161)");
  await expect(net).toHaveText(/-.*745/);
  await page.locator("#rc-management").fill("1255");
  await expect(net).toHaveAttribute("data-result-state", "neutral");
  await expect(net).toHaveText(/0/);
  await page.locator("#rc-management").fill("");
  await expect(net).toHaveText("—");
  await expect(net).toHaveAttribute("data-result-state", "neutral");
});

test("yearly value colors follow their own positive, negative and neutral outcomes", async ({
  page,
}) => {
  const check = async (key: string, state: string, color?: string) => {
    const value = page.locator(`[data-output="${key}"]`);
    await expect(value).toHaveAttribute("data-result-state", state);
    if (color) await expect(value).toHaveCSS("color", color);
  };
  for (const key of ["yearOne", "followingYear"]) await check(key, "neutral");
  await page.locator("#rc-implementation").fill("1000");
  await page.locator("#rc-management").fill("100");
  for (const key of ["yearOne", "followingYear"])
    await check(key, "positive", "rgb(158, 215, 182)");
  // A high setup cost makes year one negative without changing the following years.
  await page.locator("#rc-implementation").fill("20000");
  await check("yearOne", "negative", "rgb(255, 170, 161)");
  await check("followingYear", "positive", "rgb(158, 215, 182)");
  await page.locator("#rc-management").fill("2000");
  for (const key of ["yearOne", "followingYear"])
    await check(key, "negative", "rgb(255, 170, 161)");
  await page.locator("#rc-implementation").fill("12797.5");
  await page.locator("#rc-management").fill("100");
  await check("yearOne", "neutral");
  await page.locator("#rc-management").fill("1255");
  await check("followingYear", "neutral");
  await page.locator("#rc-management").fill("");
  for (const key of ["yearOne", "followingYear"]) {
    await check(key, "neutral");
    await expect(page.locator(`[data-output="${key}"]`)).toHaveText("—");
  }
});

test("zero and extreme workload produce no fictitious return", async ({
  page,
}) => {
  await page.locator("#rc-implementation").fill("0");
  await page.locator("#rc-management").fill("0");
  await page.locator("#rc-minutes").fill("0");
  await expect(page.locator('[data-output="hours"]')).toHaveText("0 uur");
  await expect(page.locator('[data-output="payback"]')).toHaveText("Geen");
  await expect(page.locator('[data-output="roi"]')).toHaveCount(0);
  await page.locator("#rc-minutes").fill("6000");
  await page.locator("#rc-fte").fill("0.25");
  await page.locator("#rc-weeklyHours").fill("24");
  await page.locator("#rc-phoneShare").fill("50");
  await page.locator("#rc-automation").fill("100");
  await expect(page.locator('[data-output="hours"]')).toHaveText("13 uur");
  await expect(page.locator("#rc-status")).toContainText("begrensd");
});

test("calculator never sends entered data and scan starts at branch", async ({
  page,
}) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") sent.push(request.url());
  });
  await page.locator("#rc-implementation").fill("1234");
  await page.locator("#rc-management").fill("234");
  await page.waitForTimeout(500);
  expect(sent).toEqual([]);
  await page
    .getByRole("link", { name: "Ontdek jullie AI mogelijkheden", exact: true })
    .click();
  await expect(page).toHaveURL(/\/nl\/ai-scan\/$/);
  await expect(page.locator("#intake-questions")).toContainText(
    "In welke branche",
  );
});

test("concise copy retains cost and launch assumptions without repeated group introductions", async ({
  page,
}) => {
  await expect(page.locator(".rc-group-note")).toHaveCount(0);
  const note = page.locator("[data-chart-assumptions]");
  await expect(note).toContainText("Maand 1 halve AI-afhandeling");
  await expect(note).toContainText("volledige maandkosten");
  expect(
    (await note.innerText()).trim().split(/\s+/).length,
  ).toBeLessThanOrEqual(24);
  await expect(page.locator(".rc-featured")).toContainText(
    "geen automatische loonkostenbesparing",
  );
  const assumptions = page.locator("details.rc-assumptions");
  await expect(assumptions).not.toHaveAttribute("open");
  await expect(assumptions).toContainText(
    "Alle ingevoerde minuten worden betaald",
  );
  await expect(page.locator("[data-year-note]")).toContainText(
    "geen winst- of omzetprognose",
  );
});

test("semantic, keyboard-friendly and without horizontal overflow", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const escapes = await page
      .locator("#ap-phone-calculator input, #ap-phone-calculator button")
      .evaluateAll(
        (elements) =>
          elements.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < 0 || r.right > innerWidth + 1);
          }).length,
      );
    expect(escapes).toBe(0);
  }
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://auto-pilots.io/calculator/",
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
