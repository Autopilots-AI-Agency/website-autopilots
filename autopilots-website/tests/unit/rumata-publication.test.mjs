import test from "node:test";
import assert from "node:assert/strict";
import { siteOrigin } from "../../src/config/site-origin.mjs";
import { campaignEndpoint } from "../../src/api/campaign-endpoint.mjs";

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
