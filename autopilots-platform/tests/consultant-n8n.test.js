import test from "node:test";
import assert from "node:assert/strict";
import {
  BlobConsultantStore,
  encryptedRecords,
} from "../src/consultant/blob-store.mjs";
import {
  executionTickets,
  n8nProviderFetch,
  providerOperation,
} from "../src/consultant/n8n-executor.mjs";
import { readFileSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import { createConsultantRuntime } from "../src/consultant/runtime.mjs";
import {
  telnyxVerification,
  telnyxCallReader,
} from "../src/consultant/providers.mjs";
import { telnyxConsultantProvider } from "../src/consultant/consultant-telnyx.mjs";
import { callConsentVersion } from "../src/consultant/consultant-service.mjs";

class Blobs {
  data = new Map();
  serial = 0;
  async list({ prefix }) {
    return {
      blobs: [...this.data.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key })),
    };
  }
  async delete(key) {
    this.data.delete(key);
  }
  async getWithMetadata(key) {
    return structuredClone(this.data.get(key) || null);
  }
  async setJSON(key, data, options = {}) {
    const old = this.data.get(key);
    if (
      (options.onlyIfNew && old) ||
      (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
    )
      return { modified: false };
    const etag = String(++this.serial);
    this.data.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
}
const secret = "synthetic-long-storage-secret-for-unit-tests";
const config = {
  enabled: true,
  approvalVersion: "pilot-1",
  organizationId: "fixture-org",
  verifyProfileId: "verify-1",
  allowedPhones: ["+31612345678"],
  from: "+31850835827",
  accountId: "account-1",
  connectionId: "12345",
  assistants: { nl: { id: "assistant-1", version: "2" } },
  bookingEnabled: true,
  calendarId: "calendar-1",
  locationId: "location-1",
};
const sms = () =>
  providerOperation(
    "https://api.telnyx.com/v2/verifications/sms",
    {
      method: "POST",
      body: JSON.stringify({
        phone_number: config.allowedPhones[0],
        verify_profile_id: config.verifyProfileId,
        timeout_secs: 300,
      }),
    },
    config,
  );
test("synthetic quiz -> SMS proof -> durable queue -> n8n ticket -> Telnyx receipt survives serverless restarts", async () => {
  const ledger = new Blobs(),
    blobs = new Blobs();
  const c = {
    ...config,
    hashSecret: secret,
    assessmentSecret: secret,
    budgetCurrency: "USD",
    dailyBudgetCents: 1000,
    maxCallCents: 100,
    maxSmsCents: 10,
    apiKey: "n8n-managed",
  };
  const tickets = executionTickets(blobs, c, secret);
  let smsCount = 0,
    callCount = 0;
  async function invoke(action, input) {
    const store = await new BlobConsultantStore(
      ledger,
      secret,
      c.organizationId,
    ).acquire();
    try {
      const relay = n8nProviderFetch({
        config: c,
        tickets,
        store,
        webhookUrl: "https://n8n.auto-pilots.io/webhook/fixture",
        webhookKey: secret,
        fetchImpl: async (_url, options) => {
          const operation = await tickets.claim(JSON.parse(options.body));
          // Assert durable cost reservation precedes the simulated provider effect.
          const persisted = encryptedRecords(secret, c.organizationId).decode(
            [...ledger.data.values()][0].data.payload,
          );
          assert.ok(Object.keys(persisted.records.usage).length >= 1);
          let body;
          if (operation.url.endsWith("/verifications/sms")) {
            smsCount++;
            body = {
              data: {
                id: "verify-1",
                status: "pending",
                phone_number: c.allowedPhones[0],
              },
            };
          } else if (operation.url.endsWith("/actions/verify"))
            body = {
              data: {
                response_code: "accepted",
                phone_number: c.allowedPhones[0],
              },
            };
          else if (operation.url.includes("/ai_calls/")) {
            callCount++;
            body = { call_sid: "call-1" };
            assert.equal(
              operation.body.AIAssistantDynamicVariables.locale,
              "nl",
            );
          } else body = { sid: "call-1", status: "completed" };
          return Response.json({ status: 200, body });
        },
      });
      const runtime = createConsultantRuntime(c, store, {
        ready: true,
        verification: telnyxVerification(c, relay),
        calls: telnyxConsultantProvider(c, relay),
        reader: telnyxCallReader(c, relay),
      });
      return await runtime[action](input, "192.0.2.1");
    } finally {
      await store.checkpoint(true);
    }
  }
  const payload = Buffer.from(
    JSON.stringify({
      id: "assessment-fixture",
      locale: "nl",
      expires: Date.now() + 3600000,
      answers: { sector: "Synthetic" },
      report: {
        company: "Fixture",
        summary: "No real business",
        recommendations: [],
      },
    }),
  ).toString("base64url");
  const token =
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url");
  const challenge = await invoke("start", {
    id: randomUUID(),
    token,
    phone: c.allowedPhones[0],
    consent: true,
    consentVersion: callConsentVersion,
  });
  await invoke("verify", { ...challenge, code: "123456" });
  const input = {
    id: randomUUID(),
    token,
    challengeId: challenge.id,
    key: challenge.key,
    consent: true,
    consentVersion: callConsentVersion,
  };
  const call = await invoke("call", input);
  assert.deepEqual(await invoke("call", input), call);
  await invoke("tick");
  assert.equal((await invoke("status", call)).status, "provider_accepted");
  await invoke("tick");
  assert.equal((await invoke("status", call)).status, "completed");
  assert.equal(smsCount, 1);
  assert.equal(callCount, 1);
});
test("scheduled cleanup removes expired sensitive tickets after a crash, even when calling is disabled", async () => {
  const blobs = new Blobs();
  let now = 1000;
  const tickets = executionTickets(blobs, config, secret, () => now);
  const ticket = await tickets.issue(sms());
  now += 60001;
  await executionTickets(
    blobs,
    { ...config, enabled: false },
    secret,
    () => now,
  ).prune();
  const record = encryptedRecords(secret, config.organizationId).decode(
    [...blobs.data.values()][0].data.payload,
  );
  assert.deepEqual(record, { status: "closed", closedAt: now });
  await assert.rejects(tickets.claim(ticket), /unauthorized/);
  now += 8 * 86400000;
  await tickets.prune();
  assert.equal(blobs.data.size, 0);
});
test("ledger atomically grants only one concurrent owner; encrypted records survive restart", async () => {
  const blobs = new Blobs();
  const a = new BlobConsultantStore(blobs, secret, config.organizationId),
    b = new BlobConsultantStore(blobs, secret, config.organizationId);
  const results = await Promise.allSettled([a.acquire(), b.acquire()]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  const owner = a.held ? a : b;
  owner.put("call", {
    id: "test",
    organizationId: config.organizationId,
    status: "queued",
    createdAt: Date.now(),
    phone: "+31612345678",
  });
  await owner.checkpoint(true);
  assert.ok(!JSON.stringify([...blobs.data]).includes("+31612345678"));
  const c = await new BlobConsultantStore(
    blobs,
    secret,
    config.organizationId,
  ).acquire();
  assert.equal(c.get("call", "test").status, "queued");
  assert.throws(
    () =>
      c.transaction(() => {
        c.put("call", { id: "fail", organizationId: config.organizationId });
        throw Error("rollback");
      }),
    /rollback/,
  );
  assert.equal(c.get("call", "fail"), null);
  await c.checkpoint(true);
});
test("expired owner cannot overwrite a newer lease or checkpoint before a provider effect", async () => {
  const blobs = new Blobs();
  let now = 1000;
  const a = await new BlobConsultantStore(
    blobs,
    secret,
    config.organizationId,
    () => now,
  ).acquire();
  now += 120001;
  const b = await new BlobConsultantStore(
    blobs,
    secret,
    config.organizationId,
    () => now,
  ).acquire();
  await assert.rejects(a.checkpoint(), /lease_lost/);
  await b.checkpoint(true);
});
test("encryption rejects different organization and tampering", () => {
  const codec = encryptedRecords(secret, "a"),
    encoded = codec.encode({ id: 1 });
  assert.throws(() => encryptedRecords(secret, "b").decode(encoded));
  const bytes = Buffer.from(encoded, "base64");
  bytes[30] ^= 1;
  assert.throws(() => codec.decode(bytes.toString("base64")));
});
test("execution tickets are atomic one-use capabilities, scoped, expiring and stripped after claim", async () => {
  const blobs = new Blobs();
  let now = 1000;
  const tickets = executionTickets(blobs, config, secret, () => now);
  const ticket = await tickets.issue(sms());
  await assert.rejects(
    tickets.claim({ ...ticket, key: "wrong" }),
    /unauthorized/,
  );
  const claims = await Promise.allSettled([
    tickets.claim(ticket),
    tickets.claim(ticket),
  ]);
  assert.equal(claims.filter((x) => x.status === "fulfilled").length, 1);
  await assert.rejects(tickets.claim(ticket), /unauthorized/);
  const exp = await tickets.issue(sms());
  now += 60001;
  await assert.rejects(tickets.claim(exp), /unauthorized/);
  const revoked = await tickets.issue(sms());
  await tickets.revoke(revoked.id);
  await assert.rejects(tickets.claim(revoked), /unauthorized/);
});
test("current kill switch, approval and destination policy govern a ticket at claim time", async () => {
  const blobs = new Blobs();
  const tickets = executionTickets(blobs, config, secret);
  const ticket = await tickets.issue(sms());
  await assert.rejects(
    executionTickets(blobs, { ...config, enabled: false }, secret).claim(
      ticket,
    ),
    /unauthorized/,
  );
  await assert.rejects(
    executionTickets(
      blobs,
      { ...config, approvalVersion: "changed" },
      secret,
    ).claim(ticket),
    /unauthorized/,
  );
  await assert.rejects(
    executionTickets(blobs, { ...config, allowedPhones: [] }, secret).claim(
      ticket,
    ),
    /scope_mismatch/,
  );
});
test("executor checkpoints before issuing a ticket; never forwards provider secrets, URL or dossier to trigger", async () => {
  const steps = [];
  const tickets = {
    async issue() {
      steps.push("ticket");
      return { id: "test", key: "private-capability" };
    },
    async revoke() {
      steps.push("close");
    },
  };
  const execute = n8nProviderFetch({
    config,
    tickets,
    store: {
      async checkpoint() {
        steps.push("persist");
      },
    },
    webhookUrl: "https://n8n.auto-pilots.io/webhook/fixture",
    webhookKey: secret,
    fetchImpl: async (url, options) => {
      steps.push("request");
      assert.equal(options.headers.Authorization, undefined);
      assert.deepEqual(JSON.parse(options.body), {
        id: "test",
        key: "private-capability",
      });
      return Response.json({ status: 200, body: { data: { id: "receipt" } } });
    },
  });
  const op = sms();
  const result = await execute(op.url, {
    method: op.method,
    body: JSON.stringify(op.body),
    headers: { Authorization: "Bearer never-forward" },
  });
  assert.equal((await result.json()).data.id, "receipt");
  assert.deepEqual(steps, ["persist", "ticket", "request", "close"]);
});
test("failed checkpoint prevents external requests; ambiguous execution never retries and revokes ticket", async () => {
  let requests = 0,
    revokes = 0;
  const args = {
    config,
    tickets: {
      async issue() {
        return { id: "id", key: "key" };
      },
      async revoke() {
        revokes++;
      },
    },
    webhookUrl: "https://n8n.auto-pilots.io/webhook/fixture",
    webhookKey: secret,
    fetchImpl: async () => {
      requests++;
      throw Error("timeout");
    },
  };
  const op = sms(),
    options = { method: op.method, body: JSON.stringify(op.body) };
  await assert.rejects(
    n8nProviderFetch({
      ...args,
      store: {
        async checkpoint() {
          throw Error("lease_lost");
        },
      },
    })(op.url, options),
    /lease_lost/,
  );
  assert.equal(requests, 0);
  await assert.rejects(
    n8nProviderFetch({ ...args, store: { async checkpoint() {} } })(
      op.url,
      options,
    ),
    /timeout/,
  );
  assert.equal(requests, 1);
  assert.equal(revokes, 1);
});
test("provider allowlist rejects arbitrary URLs, paths and account scopes", () => {
  for (const url of [
    "https://api.telnyx.com.evil.test/v2/verifications/sms",
    "https://api.telnyx.com/v2/api_keys",
    "https://services.leadconnectorhq.com/contacts/",
    "http://api.telnyx.com/v2/verifications/sms",
  ])
    assert.throws(() => providerOperation(url, {}, config));
  assert.throws(
    () =>
      providerOperation(
        "https://services.leadconnectorhq.com/contacts/upsert",
        {
          method: "POST",
          body: JSON.stringify({
            locationId: "other",
            phone: config.allowedPhones[0],
          }),
        },
        config,
      ),
    /scope_mismatch/,
  );
});
test("n8n exports are inactive with no credentials, retries or execution payload retention", () => {
  for (const name of ["executor", "worker"]) {
    const workflow = JSON.parse(
      readFileSync(
        new URL(`../src/consultant/n8n/${name}.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(workflow.active, false);
    assert.equal(workflow.settings.saveDataErrorExecution, "none");
    assert.equal(workflow.settings.saveDataSuccessExecution, "none");
    assert.equal(workflow.settings.saveManualExecutions, false);
    for (const node of workflow.nodes) {
      assert.equal(node.retryOnFail, false);
      if (node.credentials)
        assert.match(
          node.credentials.httpHeaderAuth.id,
          /^UNCONFIGURED_AP_CONSULTANT_/,
        );
      if (node.parameters.sendBody !== undefined)
        assert.equal(typeof node.parameters.sendBody, "boolean");
    }
  }
});
