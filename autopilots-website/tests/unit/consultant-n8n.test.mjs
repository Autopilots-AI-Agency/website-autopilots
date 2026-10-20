import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../netlify/functions/consultant.mjs";
import executor from "../../netlify/functions/consultant-executor.mjs";
import worker from "../../netlify/functions/consultant-worker.mjs";
import tools from "../../netlify/functions/consultant-tools.mjs";
import {
  n8nConfiguration,
  connectionReady,
} from "../../netlify/functions/_shared/consultant-n8n.mjs";

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
