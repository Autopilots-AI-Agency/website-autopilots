import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../netlify/functions/consultant.mjs";
import executor from "../../netlify/functions/consultant-executor.mjs";
import worker from "../../netlify/functions/consultant-worker.mjs";
import tools from "../../netlify/functions/consultant-tools.mjs";
import {
  n8nConfiguration,
  connectionReady,
  runConsultant,
} from "../../netlify/functions/_shared/consultant-n8n.mjs";

test("missing or short worker credential blocks admission before paid verification", async () => {
  const secret = "synthetic-not-a-real-secret-1234567890";
  const env = {
    CONSULTANT_TRANSPORT: "n8n",
    CONSULTANT_ENABLED: "true",
    CONSULTANT_N8N_WEBHOOK_URL: "https://n8n.auto-pilots.io/webhook/fixture",
    CONSULTANT_N8N_WEBHOOK_KEY: secret,
    CONSULTANT_WORKER_KEY: secret,
    CONSULTANT_STORAGE_SECRET: secret,
    CONSULTANT_HASH_SECRET: secret,
    ANALYSIS_SIGNING_SECRET: secret,
    CONSULTANT_ORGANIZATION_ID: "fixture",
    CONSULTANT_APPROVAL_VERSION: "fixture-approved",
    TELNYX_VERIFY_PROFILE_ID: "verify-fixture",
    TELNYX_ACCOUNT_ID: "account-fixture",
    CONSULTANT_TEXML_CONNECTION_ID: "123",
    CONSULTANT_FROM: "+31612345678",
    CONSULTANT_BOOKING_ENABLED: "true",
    CONSULTANT_GHL_CALENDAR_ID: "calendar-fixture",
    CONSULTANT_GHL_LOCATION_ID: "location-fixture",
    CONSULTANT_ALLOWED_PHONES: "+31612345678",
    CONSULTANT_ASSISTANTS_JSON: JSON.stringify(
      Object.fromEntries(
        ["nl", "en", "es", "de", "it", "fr"].map((locale) => [
          locale,
          { id: `fixture-${locale}`, version: "1" },
        ]),
      ),
    ),
    CONSULTANT_BUDGET_CURRENCY: "USD",
    CONSULTANT_DAILY_BUDGET_CENTS: "1000",
    CONSULTANT_MAX_CALL_CENTS: "100",
    CONSULTANT_MAX_SMS_CENTS: "10",
  };
  assert.equal(connectionReady(n8nConfiguration(env), env), true);
  assert.deepEqual(await runConsultant("config", {}, "192.0.2.1", env), {
    ok: true,
    enabled: true,
  });
  for (const key of [undefined, "", "too-short"]) {
    const incomplete = { ...env, CONSULTANT_WORKER_KEY: key };
    assert.equal(
      connectionReady(n8nConfiguration(incomplete), incomplete),
      false,
    );
    assert.deepEqual(
      await runConsultant("config", {}, "192.0.2.1", incomplete),
      { ok: true, enabled: false },
    );
    await assert.rejects(
      runConsultant("verify-start", {}, "192.0.2.1", incomplete),
      /calls_disabled/,
    );
  }
});

test("n8n transport fails closed without provider setup and never needs Render or provider secrets in Netlify", async () => {
  const before = process.env.CONSULTANT_TRANSPORT;
  process.env.CONSULTANT_TRANSPORT = "n8n";
  try {
    const req = new Request(
      "https://fixture.test/.netlify/functions/consultant",
      {
        method: "POST",
        headers: {
          origin: "https://fixture.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "config" }),
      },
    );
    assert.deepEqual(await (await handler(req, { ip: "192.0.2.1" })).json(), {
      ok: true,
      enabled: false,
    });
    const config = n8nConfiguration({});
    assert.equal(config.apiKey, "n8n-managed");
    assert.equal(config.token, "n8n-managed");
    assert.equal(connectionReady(config, {}), false);
  } finally {
    if (before === undefined) delete process.env.CONSULTANT_TRANSPORT;
    else process.env.CONSULTANT_TRANSPORT = before;
  }
});
test("n8n worker and assistant tool routes reject unauthorized calls before provider access", async () => {
  const request = (path, body = {}) =>
    new Request("https://fixture.test/.netlify/functions/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await worker(request("consultant-worker"))).status, 401);
  assert.equal(
    (await tools(request("consultant-tools?action=delete"))).status,
    404,
  );
  assert.equal(
    (
      await executor(
        request("consultant-executor", { url: "https://evil.invalid" }),
      )
    ).status,
    503,
  );
  assert.equal(
    (await executor(new Request("https://fixture.test"))).status,
    405,
  );
});
