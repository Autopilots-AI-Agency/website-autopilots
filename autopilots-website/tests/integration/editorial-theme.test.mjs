import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("editorial layout preserves SEO and isolates campaigns and showcase", () => {
  const layout = readFileSync("src/layouts/BaseLayout.astro", "utf8");
  assert.match(layout, /!customChrome/);
  assert.match(layout, /!contentId\?\.startsWith\('landing\.'\)/);
  assert.match(
    layout,
    /EditorialHeader locale=\{locale\} contentId=\{contentId\}/,
  );
  assert.match(layout, /rel="canonical"/);
  assert.match(layout, /hreflang=\{item.tag\}/);
});

test("editorial motion is progressive and honors reduced motion", () => {
  const motion = readFileSync(
    "src/components/premium/EditorialMotion.astro",
    "utf8",
  );
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /requestAnimationFrame/);
  assert.doesNotMatch(motion, /style\.opacity\s*=\s*['"]0/);
});
