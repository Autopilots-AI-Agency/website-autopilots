import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { siteOrigin } from "../../src/config/site-origin.mjs";
import { campaignEndpoint } from "../../src/api/campaign-endpoint.mjs";

test("typechecking generates Astro declarations on a clean checkout first", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.scripts.typecheck, "astro sync && tsc --noEmit");
});

test("headless installation starts beside the pinned package manager with an explicit workspace", () => {
  const config = JSON.parse(
    readFileSync(
      new URL("../../rumata.frontend.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(config.workingDirectory, "autopilots-website");
  assert.equal(
    config.installCommand,
    "corepack pnpm install --frozen-lockfile",
  );
  assert.equal(config.buildCommand, "node scripts/build-rumata.mjs");
  assert.equal(config.outputDirectory, "autopilots-website/dist");
  const workspace = readFileSync(
    new URL("../../pnpm-workspace.yaml", import.meta.url),
    "utf8",
  );
  assert.ok(workspace.startsWith("packages:\n  - .\n"));
  assert.ok(workspace.includes("allowBuilds:\n  esbuild: true\n  sharp: true"));
});

test("publication origin supports the approved www target without accepting arbitrary hosts", () => {
  assert.equal(siteOrigin(), "https://auto-pilots.io");
  assert.equal(
    siteOrigin("https://www.auto-pilots.io"),
    "https://www.auto-pilots.io",
  );
  for (const value of [
    "https://attacker.example",
    "http://www.auto-pilots.io",
    "https://www.auto-pilots.io/path",
  ])
    assert.throws(() => siteOrigin(value));
});

test("campaign transport uses the managed same-origin prefix and retains the legacy fallback", () => {
  const base = "/backend-api/b05f7168-a0d2-46df-a25a-818ec27416d6";
  assert.equal(
    campaignEndpoint("/api/funnel-lead", base),
    base + "/api/funnel-lead",
  );
  assert.equal(campaignEndpoint("/api/funnel-event"), "/api/funnel-event");
  assert.throws(() => campaignEndpoint("/admin", base));
  assert.throws(() =>
    campaignEndpoint("/api/funnel-lead", "https://attacker.example"),
  );
});
