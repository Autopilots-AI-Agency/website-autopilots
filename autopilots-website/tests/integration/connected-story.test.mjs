import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(
  "src/components/premium/ConnectedStory.astro",
  "utf8",
);
const css = readFileSync("src/styles/connected-story.css", "utf8");
test("connected story presents all three disciplines in the agreed order", () => {
  assert.ok(
    source.indexOf("id:'medewerkers'") < source.indexOf("id:'software'"),
  );
  assert.ok(source.indexOf("id:'software'") < source.indexOf("id:'websites'"));
  assert.match(
    source,
    /Wij bouwen AI-medewerkers, maatwerksoftware en websites voor het mkb/,
  );
  assert.match(source, /Eén bedrijf dat samenwerkt/);
});
test("demo is explicit and intake remains the existing CTA", () => {
  assert.match(source, /INTERACTIEF VOORBEELD/);
  assert.match(source, /Er is niets verzonden/);
  assert.match(source, /QuizCTA label="Start de AI-scan"/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest/);
});
test("responsive and reduced motion paths remain available", () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(source, /data-cs-motion/);
  assert.match(source, /requestAnimationFrame/);
});
test("unified stage reuses interfaces and retains a quiet fallback", () => {
  const stage = readFileSync(
    "src/components/premium/UnifiedStory.astro",
    "utf8",
  );
  const styles = readFileSync("src/styles/unified-story.css", "utf8");
  assert.match(source, /UnifiedStory\.astro/);
  assert.match(stage, /track\.append\(panel\)/);
  assert.doesNotMatch(stage, /cloneNode|sn-courier|fetch\(/);
  assert.match(stage, /panel\.inert=/);
  assert.match(stage, /prefers-reduced-motion/);
  assert.match(styles, /\.us-sticky\{position:sticky/);
  assert.match(styles, /\.us-static \.us-story\{height:auto/);
});
test("each interface has a scroll-driven example and manual replay without external actions", () => {
  const stage = readFileSync(
    "src/components/premium/UnifiedStory.astro",
    "utf8",
  );
  assert.match(stage, /data-dx-channel/);
  const scenes = readFileSync(
    "src/components/premium/showcase-scenes.ts",
    "utf8",
  );
  assert.match(scenes, /dx-planner/);
  assert.match(scenes, /dx-pipeline/);
  assert.match(scenes, /data-house-canvas/);
  assert.match(stage, /drawHouse\?\.\(houseProgress\)/);
  assert.doesNotMatch(scenes, /fetch\(|XMLHttpRequest/);
  assert.match(stage, /data-dx-at/);
  assert.match(stage, /phase-i-\.55/);
  assert.match(stage, /Opnieuw afspelen/);
  assert.doesNotMatch(stage, /geen echte aanvraag of boeking/);
  assert.doesNotMatch(stage, /fetch\(|XMLHttpRequest/);
});
