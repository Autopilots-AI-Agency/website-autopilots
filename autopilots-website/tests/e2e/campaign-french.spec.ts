import { test, expect } from "@playwright/test";

const landing = "/fr/lp/concessions-automobiles/collaborateur-ia/";
const experience = `${landing}experience/`;

test("French campaign keeps questions, errors, consent and navigation in French", async ({
  page,
  baseURL,
}) => {
  // Proxy a synthetic non-local origin to the local build so production error handling is exercised.
  await page.route("https://campaign.test/**", async (route) => {
    const localUrl = route
      .request()
      .url()
      .replace("https://campaign.test", baseURL!);
    await route.fulfill({ response: await route.fetch({ url: localUrl }) });
  });
  await page.route(/\/api\/funnel-event$/, (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  let submissions = 0;
  await page.route(/\/api\/funnel-lead$/, (route) => {
    submissions++;
    const body = route.request().postDataJSON();
    expect(body.consent).toBe(true);
    expect(JSON.parse(body.funnelAnswers).channel.label).toBe(
      "Surtout par téléphone",
    );
    return submissions === 1
      ? route.fulfill({
          status: 503,
          json: { message: "Versturen is nu niet gelukt." },
        })
      : route.fulfill({ json: { ok: true } });
  });
  await page.goto(`https://campaign.test${landing}?utm_source=synthetic-test`);
  await page
    .getByRole("button", { name: "Uniquement nécessaires", exact: true })
    .click();
  for (const [name, value] of [
    ["volume", "175"],
    ["channel", "phone"],
    ["missed", "20"],
    ["responseTime", "under-60"],
    ["goal", "appointments"],
  ]) {
    await page
      .locator(`label:has(input[name="${name}"][value="${value}"])`)
      .click();
  }
  await expect(page.locator("[data-progress-label]")).toHaveText(
    "Votre résultat est prêt",
  );
  await page.locator('.ap-entry-fields [name="name"]').fill("Test synthétique");
  await page
    .locator('.ap-entry-fields [name="company"]')
    .fill("Entreprise de test");
  await page
    .locator('.ap-entry-fields [name="email"]')
    .fill("synthetic@example.test");
  await page.locator('.ap-entry-fields [name="phone"]').fill("+33612345678");
  await page.locator(".ap-entry-submit").click();
  expect(submissions).toBe(0);
  await page.locator(".ap-entry-consent input").check();
  await page.locator(".ap-entry-submit").click();
  await expect(page.locator("[data-form-status]")).toHaveText(
    "L’envoi a échoué. Veuillez réessayer.",
  );
  await page.locator(".ap-entry-submit").click();
  await expect(page).toHaveURL(new RegExp(experience));
  expect(new URL(page.url()).searchParams.get("utm_source")).toBe(
    "synthetic-test",
  );
  await expect(page.locator(".ap-campaign-roi legend")).toHaveText(
    "Quel rôle souhaitez-vous évaluer ?",
  );
  await expect(page.locator(".ap-campaign-roi aside")).toContainText(
    "Valeur supplémentaire possible",
  );
  await page
    .locator('[data-campaign-roi-form] input[name="volume"]')
    .fill("1000");
  await expect(page.locator("[data-roi-ai]")).not.toHaveText("0");
});

test("French terms explain the available authoritative version and link to it", async ({
  page,
}) => {
  await page.goto("/fr/conditions/");
  await expect(page.locator(".ap-terms-document")).toHaveAttribute(
    "lang",
    "fr",
  );
  await expect(page.locator(".ap-terms-document")).toContainText(
    "Aucune traduction française actualisée n’est publiée.",
  );
  await expect(
    page.getByRole("link", { name: "Lire les conditions en néerlandais" }),
  ).toHaveAttribute("href", "/nl/voorwaarden/");
  await expect(page.locator("a[download]")).toHaveAttribute(
    "href",
    "/downloads/autopilots-algemene-servicevoorwaarden-v1.8.pdf",
  );
});
