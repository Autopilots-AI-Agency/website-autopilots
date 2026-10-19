import test from "node:test";
import assert from "node:assert/strict";
import { intakeConfirmation } from "../../netlify/functions/_shared/intake-confirmation.mjs";
const bookingUrl =
  "https://api.leadconnectorhq.com/widget/booking/UaWTV0sdETiXy0refclQ";
test("confirmation has HTML and text, one CTA, and no scripts", () => {
  const mail = intakeConfirmation({ name: "Test", bookingUrl });
  assert.match(mail.text, /eenmalige implementatie en maandelijkse kosten/);
  assert.equal((mail.html.match(/<a /g) || []).length, 1);
  assert.doesNotMatch(mail.html, /<script|<iframe|onerror=/i);
  assert.match(mail.html, /max-width:600px/);
});
test("customer names cannot inject email markup", () => {
  const mail = intakeConfirmation({ name: "<img src=x>", bookingUrl });
  assert.ok(mail.html.includes("&lt;img src=x&gt;"));
  assert.ok(!mail.html.includes("<img"));
});
test("rejects untrusted or insecure CTA destinations", () => {
  for (const url of [
    "http://auto-pilots.io",
    "https://evil.example",
    "https://user:pass@auto-pilots.io",
  ]) {
    assert.throws(() => intakeConfirmation({ name: "Test", bookingUrl: url }));
  }
});
