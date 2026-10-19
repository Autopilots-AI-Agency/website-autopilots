import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const profiles = [
  ["Autobedrijven", "automotive", "proefrit", "Elektrische SUV", "VELO"],
  [
    "Bouw & renovatie",
    "construction",
    "verbouwen",
    "Uitbouw familie Van Dijk",
    "FORMA",
  ],
  [
    "Installatiebedrijven",
    "installation",
    "warmtepomp",
    "Warmtepomp Van Dijk",
    "VOLT",
  ],
  ["Vastgoed & makelaars", "property", "bezichtigen", "Parklaan 24", "MAISON"],
  [
    "Zakelijke dienstverlening",
    "business",
    "groei",
    "Groeitraject Van Dijk",
    "STUDIO NEXT",
  ],
  [
    "Beauty & salons",
    "beauty",
    "behandeling",
    "Adviesafspraak Joris",
    "LUMIÈRE",
  ],
];

test("six branches change all three scenes and keep keyboard-accessible controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/nl/");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await expect(page.locator(".sp-picker")).toBeVisible();
  page.on("request", (r) => {
    if (["fetch", "xhr"].includes(r.resourceType())) requests.push(r.url());
  });
  const canvases = new Set<string>();
  for (const [label, id, question, project, brand] of profiles) {
    await page.getByRole("radio", { name: label, exact: true }).check();
    await expect(page.locator(".us-story")).toHaveAttribute("data-profile", id);
    await expect(page.locator("[data-customer-line]")).toContainText(question);
    await expect(page.locator(".sx-project-board")).toContainText(project);
    await expect(page.locator(".dx-address")).toContainText(brand);
    await page.locator('[data-us-step="3"]').click();
    await expect
      .poll(() =>
        page
          .locator("[data-house-canvas]")
          .evaluate((el) => (el as HTMLCanvasElement).width),
      )
      .toBeGreaterThan(0);
    canvases.add(
      await page
        .locator("[data-house-canvas]")
        .evaluate((el) => (el as HTMLCanvasElement).toDataURL()),
    );
    await page.locator(".dx-flip-toggle").click();
    await expect(page.locator(".dx-flip-back")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    await expect(page.locator(".dx-admin-top")).toContainText(brand);
    await page.locator("#demo-site-title").fill("Mijn eigen titel");
    await page.locator(".dx-flip-toggle").click();
    await expect(page.locator(".dx-atelier-copy h4")).toContainText(
      "Mijn eigen titel",
    );
    await page.locator(".sp-change").click();
  }
  expect(canvases.size).toBe(6);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  const audit = await new AxeBuilder({ page }).include(".sp-picker").analyze();
  expect(audit.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("selection survives reload, company is safe and intake receives only the branch", async ({
  page,
}) => {
  await page.goto("/nl/?utm_source=demo");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await page.getByRole("radio", { name: "Autobedrijven", exact: true }).check();
  const company = "<img src=x onerror=alert(1)> & Test";
  await page.getByLabel("Je bedrijfsnaam").fill(company);
  await page.locator(".sp-start").click();
  await expect(page.locator(".us-caption h2")).toContainText(company);
  await expect(page.locator(".dx-atelier img")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".us-story")).toHaveAttribute(
    "data-profile",
    "automotive",
  );
  await expect(page.getByLabel("Je bedrijfsnaam")).toHaveValue(company);
  const cta = page.locator("#ap-connected [data-quiz-cta]").first();
  await expect(cta).toHaveAttribute("href", /branche=Autobedrijven/);
  expect(await cta.getAttribute("href")).not.toContain("company");
  await cta.click();
  await expect(page.locator("[data-step-count]")).toContainText("02");
  await page.locator(".back").click();
  await expect(
    page.getByRole("button", { name: /Autobedrijven/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("unsupported branches are explicitly general and can be cleared", async ({
  page,
}) => {
  await page.goto("/nl/");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await page.getByLabel("Een andere branche").selectOption("Tandartsen");
  await expect(page.locator(".us-story")).toHaveAttribute(
    "data-profile",
    "general",
  );
  await expect(page.locator(".sp-feedback")).toContainText(
    "algemene voorbeeld",
  );
  await expect(
    page.locator("#ap-connected [data-quiz-cta]").first(),
  ).toHaveAttribute("href", /branche=Tandartsen/);
  await page.locator(".sp-skip").click();
  await expect(
    page.locator("#ap-connected [data-quiz-cta]").first(),
  ).not.toHaveAttribute("href", /branche=/);
});

test("normal scrolling keeps the branch switch clear of the caption", async ({
  page,
}) => {
  await page.goto("/nl/");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await page
    .getByRole("radio", { name: "Installatiebedrijven", exact: true })
    .check();
  await page.locator(".sp-start").click();
  await page.locator('[data-us-step="3"]').click();
  await expect(page.locator('[data-us-step="3"]')).toHaveAttribute(
    "aria-current",
    "true",
  );
  const chip = await page.locator(".sp-change").boundingBox();
  const eyebrow = await page.locator(".us-caption .cs-eyebrow").boundingBox();
  expect(chip!.y + chip!.height).toBeLessThanOrEqual(eyebrow!.y);
  await page.locator(".sp-change").click();
  await page.getByLabel("Je bedrijfsnaam").fill("A".repeat(60));
  await page.locator(".sp-start").click();
  await expect(page.locator(".us-caption h2")).toContainText("A".repeat(60));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const storage of ["blocked", "corrupt"])
  test(`works with ${storage} session storage`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (mode === "blocked")
        Object.defineProperty(window, "sessionStorage", {
          get() {
            throw new Error("blocked");
          },
        });
      else sessionStorage.setItem("ap-showcase-v1", "{broken");
    }, storage);
    await page.goto("/nl/");
    await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
    await page
      .getByRole("radio", { name: "Installatiebedrijven", exact: true })
      .check();
    await expect(page.locator(".us-story")).toHaveAttribute(
      "data-profile",
      "installation",
    );
    await expect(page.locator("[data-customer-line]")).toContainText(
      "warmtepomp",
    );
  });
