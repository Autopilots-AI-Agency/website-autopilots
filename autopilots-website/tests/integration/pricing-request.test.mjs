import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("public price templates show request-only implementation and monthly fees", () => {
  for (const file of [
    "src/components/ecosystem/NichePricing.astro",
    "src/pages/voorstel/autobedrijven/index.astro",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /quote.setup/);
    assert.match(source, /quote.monthly/);
    assert.doesNotMatch(source, /€|<stripe-buy-button|js.stripe.com/);
    assert.match(source, /quote.cta/);
  }
});
