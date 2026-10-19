import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("root and Dutch homepage render the connected design without a language gate", () => {
  for (const path of ["dist/index.html", "dist/nl/index.html"]) {
    const html = readFileSync(path, "utf8");
    assert.match(html, /id="ap-connected"/);
    assert.match(html, /id="home-language"/);
    assert.doesNotMatch(html, /Choose your language|Select your language/);
    assert.match(html, /index,follow,max-image-preview:large/);
    assert.match(html, /hreflang="x-default"/);
    for (const locale of ["nl", "en", "es", "de", "it", "fr"])
      assert.match(html, new RegExp(`href="/${locale}/"`));
  }
});

test("language selection is optional, remembered, and never forces redirects", () => {
  const source = readFileSync(
    "src/components/premium/HomeLanguage.astro",
    "utf8",
  );
  assert.match(source, /navigator.languages/);
  assert.match(source, /localStorage.setItem\('autopilots_locale'/);
  assert.match(source, /location.pathname==='\/'/);
  assert.doesNotMatch(
    source,
    /location\.(?:replace|assign)|location.href\s*=|fetch\(/,
  );
});

test("translated homepages and SEO entry points remain available", () => {
  for (const locale of ["nl", "en", "es", "de", "it", "fr"]) {
    assert.ok(existsSync(`dist/${locale}/index.html`));
    assert.ok(existsSync(`dist/sitemap-${locale}.xml`));
  }
  for (const path of [
    "nl/voor-wie",
    "nl/kennisbank",
    "nl/producten",
    "ontwerpen/intake",
  ])
    assert.ok(existsSync(`dist/${path}/index.html`));
});
