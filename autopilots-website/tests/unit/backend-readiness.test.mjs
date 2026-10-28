import test from "node:test";
import assert from "node:assert/strict";
import { createBackendReadiness } from "../../src/api/backend-readiness.mjs";

const base = "/backend-api/b05f7168-a0d2-46df-a25a-818ec27416d6";
const readyResponse = () => ({
  ok: true,
  json: async () => ({ status: "ready" }),
});

test("cold-start probes wait past one browser request timeout without replaying writes", async () => {
  let clock = 0;
  let probes = 0;
  let writes = 0;
  const ready = createBackendReadiness({
    now: () => clock,
    delay: async (ms) => {
      clock += ms;
    },
    fetchImpl: async (url, init) => {
      assert.equal(url, base + "/health");
      assert.equal(init.method, "GET");
      assert.equal(init.body, undefined);
      assert.equal(init.headers, undefined);
      probes++;
      if (probes <= 2) {
        clock += 15000;
        throw new Error("cold start timeout");
      }
      return readyResponse();
    },
  });
  await ready(base);
  writes++; // The caller may submit its original command once, only after readiness.
  assert.equal(probes, 3);
  assert.equal(writes, 1);
  assert.ok(clock > 25000);
});

test("concurrent callers share probes; the readiness cache expires", async () => {
  let clock = 0;
  let probes = 0;
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const ready = createBackendReadiness({
    now: () => clock,
    fetchImpl: async () => {
      probes++;
      await pending;
      return readyResponse();
    },
  });
  const a = ready(base),
    b = ready(base + "/");
  assert.equal(probes, 1);
  release();
  await Promise.all([a, b]);
  await ready(base);
  assert.equal(probes, 1);
  clock += 30001;
  await ready(base);
  assert.equal(probes, 2);
});

test("unready services and HTML fallbacks time out without admission, then allow a new probe", async () => {
  let clock = 0;
  let calls = 0;
  let recovered = false;
  const ready = createBackendReadiness({
    now: () => clock,
    totalTimeoutMs: 1000,
    retryDelayMs: 500,
    delay: async (ms) => {
      clock += ms;
    },
    fetchImpl: async (_url, init) => {
      assert.equal(init.method, "GET");
      calls++;
      return recovered
        ? readyResponse()
        : {
            ok: true,
            json: async () => {
              throw new Error("HTML fallback");
            },
          };
    },
  });
  await assert.rejects(ready(base), /backend_not_ready/);
  assert.equal(calls, 2);
  recovered = true;
  await ready(base);
  assert.equal(calls, 3);
});

test("the legacy transport does not contact Rumata", async () => {
  const ready = createBackendReadiness({
    fetchImpl: async () => {
      throw new Error("unexpected probe");
    },
  });
  await ready("");
});
