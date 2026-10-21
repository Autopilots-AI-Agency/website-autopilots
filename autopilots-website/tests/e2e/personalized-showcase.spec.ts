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

test("branch picker shares one centered axis on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/nl/");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  const picker = await page.locator(".sp-picker").boundingBox();
  const center = picker!.x + picker!.width / 2;
  for (const selector of [
    ".sp-intro",
    ".sp-intro p",
    ".sp-form",
    ".sp-options",
    ".sp-start",
    ".sp-skip",
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - center)).toBeLessThan(2);
  }
  const intro = await page.locator(".sp-intro").boundingBox();
  const form = await page.locator(".sp-form").boundingBox();
  expect(form!.y).toBeGreaterThan(intro!.y + intro!.height);
  expect(
    await page
      .locator(".sp-intro")
      .evaluate((el) => getComputedStyle(el).textAlign),
  ).toBe("center");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

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
    if (page.viewportSize()!.width < 701)
      await page.locator('[data-panel="2"]').scrollIntoViewIfNeeded();
    else await page.locator('[data-us-step="3"]').click();
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

test("selection survives reload, old company data is discarded and intake receives the branch", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "ap-showcase-v1",
      JSON.stringify({ branch: "Autobedrijven", company: "OLD COMPANY NAME" }),
    ),
  );
  await page.goto("/nl/?utm_source=demo");
  await page.getByRole("button", { name: "Alleen noodzakelijk" }).click();
  await page.getByRole("radio", { name: "Autobedrijven", exact: true }).check();
  await expect(page.getByLabel("Je bedrijfsnaam")).toHaveCount(0);
  await expect(page.locator("#sp-title")).toHaveText(
    "Kies jullie brancheen zie wat wij kunnen betekenen.",
  );
  await expect(page.locator(".sp-intro p")).toHaveText(
    "Wij bouwen AI-medewerkers, software & websites.",
  );
  await expect(page.locator("#ap-connected")).not.toContainText(
    "OLD COMPANY NAME",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("ap-showcase-v1")!),
    ),
  ).toEqual({ branch: "Autobedrijven" });
  await page.locator(".sp-start").click();
  await expect(page.locator(".us-caption h2")).toHaveText(
    "Drie bouwgebieden. Eén partner.",
  );
  await expect(page.locator(".dx-atelier img")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".us-story")).toHaveAttribute(
    "data-profile",
    "automotive",
  );
  await expect(page.getByLabel("Je bedrijfsnaam")).toHaveCount(0);
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

test("unsupported saved branches are cleared and the extra selector is absent", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "ap-showcase-v1",
      JSON.stringify({ branch: "Tandartsen" }),
    ),
  );
  await page.goto("/nl/");
  await page.locator("[data-consent-reject]").click();
  await expect(page.locator(".sp-option")).toHaveCount(6);
  await expect(
    page.locator(".sp-dropdown, .sp-feedback, [name='showcase-other']"),
  ).toHaveCount(0);
  await expect(page.locator(".us-story")).toHaveAttribute(
    "data-profile",
    "general",
  );
  await expect(page.locator(".us-story")).toHaveAttribute("data-branch", "");
  expect(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("ap-showcase-v1")!),
    ),
  ).toEqual({ branch: "" });
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
  if (page.viewportSize()!.width < 701)
    await page.locator('[data-panel="2"]').scrollIntoViewIfNeeded();
  else await page.locator('[data-us-step="3"]').click();
  if (page.viewportSize()!.width >= 701)
    await expect(page.locator('[data-us-step="3"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
  const chip = await page.locator(".sp-change").boundingBox();
  const eyebrow = await page.locator(".us-caption .cs-eyebrow").boundingBox();
  expect(chip!.y + chip!.height).toBeLessThanOrEqual(eyebrow!.y);
  await page.locator(".sp-change").click();
  await page.locator(".sp-start").click();
  await expect(page.locator(".us-caption h2")).toHaveText(
    "Drie bouwgebieden. Eén partner.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("featured choices support keyboard selection and clearing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nl/");
  await page.locator("[data-consent-reject]").click();
  const first = page.locator(".sp-option input").first();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".sp-option input").nth(1)).toBeChecked();
  await page.locator(".sp-skip").click();
  await expect(page.locator(".us-story")).toHaveAttribute(
    "data-profile",
    "general",
  );
  await expect(page.locator(".sp-option input:checked")).toHaveCount(0);
  await page.locator(".sp-change").click();
  await expect(first).toBeFocused();
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
