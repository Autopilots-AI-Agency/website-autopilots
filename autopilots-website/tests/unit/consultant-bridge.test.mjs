import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import handler from "../../netlify/functions/consultant.mjs";
test("bridge is disabled without runtime configuration, rejects cross-origin requests and never accepts browser IP", async () => {
  const original = { ...process.env };
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.CONSULTANT_ENABLED;
    const request = (body, origin = "https://fixture.test") =>
      new Request("https://fixture.test/.netlify/functions/consultant", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await (await handler(request({ action: "config" }))).json()).enabled,
      false,
    );
    assert.equal(
      (await handler(request({ action: "call" }, "https://other.test"))).status,
      403,
    );
    process.env.CONSULTANT_ENABLED = "true";
    process.env.CONSULTANT_BRIDGE_SECRET =
      "synthetic-bridge-secret-for-testing-only";
    process.env.CONSULTANT_SERVICE_URL = "https://service.fixture.test";
    let count = 0;
    globalThis.fetch = async (url, options) => {
      count++;
      assert.equal(new URL(url).host, "service.fixture.test");
      const data = JSON.parse(options.body);
      assert.equal(data.trustedIp, "192.0.2.1");
      assert.notEqual(data.trustedIp, data.input.trustedIp);
      const expected = createHmac(
        "sha256",
        process.env.CONSULTANT_BRIDGE_SECRET,
      )
        .update(
          [
            "POST",
            new URL(url).pathname,
            options.headers["X-Consultant-Time"],
            options.headers["X-Consultant-Nonce"],
            options.body,
          ].join("\n"),
        )
        .digest("hex");
      assert.equal(expected, options.headers["X-Consultant-Signature"]);
      return new Response(JSON.stringify({ ok: true, status: "queued" }));
    };
    assert.equal(
      (
        await handler(
          request({ action: "call", input: { trustedIp: "spoofed" } }),
          { ip: "192.0.2.1" },
        )
      ).status,
      200,
    );
    assert.equal(count, 1);
    assert.equal((await handler(request({ action: "call" }), {})).status, 503);
    assert.equal(count, 1);
    process.env.CONSULTANT_SERVICE_URL = "http://unsafe.test";
    assert.equal(
      (await handler(request({ action: "call" }), { ip: "192.0.2.1" })).status,
      503,
    );
    assert.equal(count, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of [
      "CONSULTANT_ENABLED",
      "CONSULTANT_SERVICE_URL",
      "CONSULTANT_BRIDGE_SECRET",
    ]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
