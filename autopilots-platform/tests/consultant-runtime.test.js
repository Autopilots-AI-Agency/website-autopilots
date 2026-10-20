import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsultantStore } from "../src/consultant/store.mjs";
import {
  createConsultantRuntime,
  pilotBudget,
} from "../src/consultant/runtime.mjs";
import { consultantServer } from "../src/consultant/server.mjs";
import { bridgeSignature } from "../src/consultant/security.mjs";
import { consultantBooking } from "../src/consultant/booking.mjs";
import { callConsentVersion } from "../src/consultant/consultant-service.mjs";
import { assistantManifest } from "../src/consultant/assistant-manifest.mjs";
const secret = "synthetic-test-secret-not-a-real-key-123456";
function fixture(t, path = ":memory:") {
  const config = {
    enabled: true,
    organizationId: "fixture-org",
    approvalVersion: "test-approved",
    hashSecret: secret,
    assessmentSecret: secret,
    bridgeSecret: secret,
    dailyBudgetCents: 1000,
    budgetCurrency: "USD",
    maxCallCents: 100,
    maxSmsCents: 10,
    allowedPhones: ["+31612345678"],
    bookingEnabled: true,
    calendarId: "cal-1",
    locationId: "loc-1",
  };
  const store = new ConsultantStore(path, secret, config.organizationId);
  t.after(() => store.close());
  let now = Date.now();
  const counts = { sms: 0, call: 0 };
  const providers = {
    ready: true,
    verification: {
      start: async () => {
        counts.sms++;
        return { id: "verify-1" };
      },
      check: async (_, code) => code === "123456",
    },
    calls: {
      dial: async () => {
        counts.call++;
        return { id: "call-1" };
      },
    },
    reader: { status: async () => "completed" },
  };
  const runtime = createConsultantRuntime(config, store, providers, () => now);
  function token(id = "assessment-1", locale = "nl") {
    const payload = Buffer.from(
      JSON.stringify({
        id,
        locale,
        expires: now + 3600000,
        answers: { sector: "Synthetic" },
        report: {
          company: "Fixture",
          summary: "No real business",
          recommendations: [],
        },
      }),
    ).toString("base64url");
    return (
      payload +
      "." +
      createHmac("sha256", secret).update(payload).digest("base64url")
    );
  }
  async function verified() {
    const signed = token();
    const c = await runtime.start(
      {
        id: randomUUID(),
        token: signed,
        phone: "+31612345678",
        consent: true,
        consentVersion: callConsentVersion,
      },
      "192.0.2.1",
    );
    await runtime.verify({ ...c, code: "123456" });
    return {
      id: randomUUID(),
      token: signed,
      challengeId: c.id,
      key: c.key,
      consent: true,
      consentVersion: callConsentVersion,
    };
  }
  return {
    config,
    store,
    providers,
    runtime,
    token,
    counts,
    verified,
    advance: (ms) => {
      now += ms;
    },
  };
}
test("verified form -> exactly one queued call -> provider receipt -> real provider status", async (t) => {
  const f = fixture(t);
  const input = await f.verified();
  const results = await Promise.all([
    f.runtime.call(input, "192.0.2.1"),
    f.runtime.call(input, "192.0.2.1"),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(f.counts.call, 0);
  await Promise.all([f.runtime.tick(), f.runtime.tick()]);
  assert.equal(f.counts.call, 1);
  assert.equal(f.runtime.status(results[0]).status, "provider_accepted");
  await f.runtime.tick();
  assert.equal(f.runtime.status(results[0]).status, "completed");
  assert.equal(f.store.list("usage").length, 2);
  assert.throws(() => f.runtime.status({ ...results[0], key: "wrong" }));
});
test("approved USD 10 pilot ceiling cannot be raised through configuration", (t) => {
  const f = fixture(t);
  assert.deepEqual(pilotBudget, { currency: "USD", dailyCents: 1000 });
  assert.equal(f.runtime.ready(), true);
  f.config.dailyBudgetCents = 1001;
  assert.equal(f.runtime.ready(), false);
  f.config.dailyBudgetCents = 1000;
  f.config.budgetCurrency = "EUR";
  assert.equal(f.runtime.ready(), false);
  f.config.budgetCurrency = "USD";
  f.config.maxSmsCents = 0;
  assert.equal(f.runtime.ready(), false);
});
test("SMS and calls share a USD budget across midnight, retained after restart", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "consultant-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "state.sqlite");
  const f = fixture(t, path);
  // Use deterministic near-midnight time without exposing clock mutation to production.
  let now = Date.UTC(2026, 9, 20, 23, 59);
  const runtime = createConsultantRuntime(
    f.config,
    f.store,
    f.providers,
    () => now,
  );
  f.store.put("usage", {
    id: "previous-call",
    organizationId: f.config.organizationId,
    currency: "USD",
    reservedCents: 990,
    actualCost: null,
    createdAt: now,
    status: "reserved",
  });
  const token = f.token("budget-case");
  // A fresh signed token with expiry relative to the controlled clock.
  const payload = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString(),
  );
  payload.expires = now + 86400000 * 2;
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signed =
    encoded +
    "." +
    createHmac("sha256", secret).update(encoded).digest("base64url");
  const input = {
    id: randomUUID(),
    token: signed,
    phone: "+31612345678",
    consent: true,
    consentVersion: callConsentVersion,
  };
  await runtime.start(input, "192.0.2.1");
  assert.equal(f.counts.sms, 1);
  assert.equal(f.store.get("usage", `sms:${input.id}`).currency, "USD");
  now += 120000;
  const second = new ConsultantStore(path, secret, f.config.organizationId);
  t.after(() => second.close());
  const resumed = createConsultantRuntime(
    f.config,
    second,
    f.providers,
    () => now,
  );
  await assert.rejects(
    resumed.start({ ...input, id: randomUUID() }, "192.0.2.1"),
    /daily_limit/,
  );
  assert.equal(f.counts.sms, 1);
  now += 86400000;
  await resumed.start({ ...input, id: randomUUID() }, "192.0.2.1");
  assert.equal(f.counts.sms, 2);
});
test("unknown cost currency fails closed instead of treating it as zero", async (t) => {
  const f = fixture(t);
  f.store.put("usage", {
    id: "legacy-unknown",
    organizationId: f.config.organizationId,
    createdAt: Date.now(),
    actualCost: null,
    status: "reserved",
  });
  await assert.rejects(
    f.runtime.start(
      {
        id: randomUUID(),
        token: f.token(),
        phone: "+31612345678",
        consent: true,
        consentVersion: callConsentVersion,
      },
      "192.0.2.1",
    ),
    /usage_review_required/,
  );
  assert.equal(f.counts.sms, 0);
});
test("timeout stays unknown and cannot redial, including another form ID", async (t) => {
  const f = fixture(t);
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  f.providers.calls.dial = async () => {
    f.counts.call++;
    throw new Error("ambiguous timeout");
  };
  await f.runtime.tick();
  await f.runtime.tick();
  assert.equal(f.counts.call, 1);
  assert.equal(f.runtime.status(call).status, "provider_unknown");
  await assert.rejects(
    f.runtime.call({ ...input, id: randomUUID() }, "192.0.2.1"),
  );
});
test("SMS idempotency, verification attempts, signed locale, allowed destination and budget are enforced before paid operations", async (t) => {
  const f = fixture(t);
  const input = {
    id: randomUUID(),
    token: f.token("a", "fr"),
    phone: "+31612345678",
    consent: true,
    consentVersion: callConsentVersion,
  };
  const c = await f.runtime.start(input, "192.0.2.1");
  assert.deepEqual(await f.runtime.start(input, "192.0.2.1"), c);
  assert.equal(f.counts.sms, 1);
  await assert.rejects(
    f.runtime.call(
      {
        id: randomUUID(),
        token: input.token,
        challengeId: c.id,
        key: c.key,
        consent: true,
        consentVersion: callConsentVersion,
      },
      "192.0.2.1",
    ),
  );
  for (let i = 0; i < 5; i++)
    await assert.rejects(f.runtime.verify({ ...c, code: "999999" }));
  await assert.rejects(f.runtime.verify({ ...c, code: "123456" }));
  await assert.rejects(
    f.runtime.start(
      { ...input, id: randomUUID(), phone: "+12025550199" },
      "192.0.2.1",
    ),
  );
  f.config.dailyBudgetCents = 10;
  await assert.rejects(
    f.runtime.start({ ...input, id: randomUUID() }, "192.0.2.1"),
  );
  assert.equal(f.counts.sms, 1);
});
test("suppression, changed approval and expiry cancel before dispatch", async (t) => {
  for (const mode of ["suppression", "approval", "expiry"]) {
    const f = fixture(t);
    const input = await f.verified();
    const call = await f.runtime.call(input, "192.0.2.1");
    const job = f.store.get("call", call.id);
    if (mode === "suppression") f.runtime.suppress(job);
    if (mode === "approval") f.config.approvalVersion = "new-context";
    if (mode === "expiry") f.advance(300001);
    await f.runtime.tick();
    assert.equal(f.counts.call, 0);
    assert.equal(f.runtime.status(call).status, "cancelled");
  }
});
test("SQLite persists encrypted dossier, enforces organization and permits recovery without redial", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "consultant-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "state.sqlite");
  const f = fixture(t, path);
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  await f.runtime.tick();
  const second = new ConsultantStore(path, secret, "fixture-org");
  t.after(() => second.close());
  assert.equal(second.get("call", call.id).status, "provider_accepted");
  assert.equal(readFileSync(path).includes(Buffer.from("+31612345678")), false);
  const other = new ConsultantStore(path, secret, "different-org");
  t.after(() => other.close());
  assert.equal(other.get("call", call.id), null);
  assert.throws(() => other.put("call", f.store.get("call", call.id)));
});
test("HTTP bridge rejects unsigned requests and replay; signed health config works", async (t) => {
  const f = fixture(t);
  const server = consultantServer(f.config, f.store, f.runtime);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/bridge/config`;
  const body = JSON.stringify({ input: {}, trustedIp: "192.0.2.1" });
  assert.equal((await fetch(url, { method: "POST", body })).status, 401);
  const time = String(Date.now()),
    nonce = randomUUID();
  const headers = {
    "x-consultant-time": time,
    "x-consultant-nonce": nonce,
    "x-consultant-signature": bridgeSignature(
      secret,
      "POST",
      "/bridge/config",
      time,
      nonce,
      body,
    ),
  };
  assert.equal(
    (await (await fetch(url, { method: "POST", headers, body })).json())
      .enabled,
    true,
  );
  assert.notEqual(
    (await fetch(url, { method: "POST", headers, body })).status,
    200,
  );
});
test("booking uses server-issued slots, one durable lock and real receipt; unknown writes are not retried", async (t) => {
  const f = fixture(t);
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  const job = f.store.get("call", call.id);
  const start = new Date(Date.now() + 3600000).toISOString();
  let writes = 0;
  const calendar = {
    freeSlots: async () => [start],
    isAvailable: async () => true,
    resolveContact: async () => "contact-1",
    create: async () => {
      writes++;
      return { id: "event-1", calendarId: "cal-1" };
    },
  };
  const booking = consultantBooking(f.config, f.store, calendar);
  const result = await booking.availability(job, {
    start: new Date().toISOString(),
    timezone: "Europe/Amsterdam",
  });
  const request = {
    ...result.slots[0],
    name: "Synthetic User",
    email: "synthetic@example.test",
    confirmed: true,
  };
  await assert.rejects(booking.book(job, { ...request, slotId: "made-up" }));
  const [a, b] = await Promise.all([
    booking.book(job, request),
    booking.book(job, request),
  ]);
  assert.equal(a.eventId, "event-1");
  assert.equal(b.status, "pending");
  assert.equal(writes, 1);
  assert.equal((await booking.book(job, request)).eventId, "event-1");
  assert.equal(writes, 1);
});
test("all six manifests have scoped tools, explicit AI opening and no secret literals", () => {
  for (const locale of ["nl", "en", "es", "de", "it", "fr"]) {
    const m = assistantManifest(locale, {
      serviceUrl: "https://fixture.example.test",
      voice: "fixture-voice",
      model: "fixture-model",
    });
    assert.equal(m.tools.length, 4);
    assert.ok(m.greeting.length > 50);
    assert.equal(m.tools[0].webhook.headers[0].value, "{{tool_token}}");
  }
});

test("unknown calendar outcome stays locked without a second contact or appointment write", async (t) => {
  const f = fixture(t);
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  const job = f.store.get("call", call.id);
  let contacts = 0,
    writes = 0;
  const start = new Date(Date.now() + 3600000).toISOString();
  const calendar = {
    freeSlots: async () => [start],
    isAvailable: async () => true,
    resolveContact: async () => {
      contacts++;
      return "contact-1";
    },
    create: async () => {
      writes++;
      throw new Error("timeout after possible commit");
    },
  };
  const booking = consultantBooking(f.config, f.store, calendar);
  const offered = await booking.availability(job, {
    start: new Date().toISOString(),
    timezone: "Europe/Amsterdam",
  });
  const request = {
    ...offered.slots[0],
    name: "Fixture User",
    email: "fixture@example.test",
    confirmed: true,
  };
  assert.equal((await booking.book(job, request)).status, "unknown");
  assert.equal((await booking.book(job, request)).status, "unknown");
  assert.equal(writes, 1);
  assert.equal(contacts, 1);
});

test("finite budget, disabled provider readiness and kill switch prevent new paid operations", async (t) => {
  const f = fixture(t);
  f.config.dailyBudgetCents = Infinity;
  assert.equal(f.runtime.ready(), false);
  f.config.dailyBudgetCents = 1000;
  f.providers.ready = false;
  assert.equal(f.runtime.ready(), false);
  f.providers.ready = true;
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  f.config.enabled = false;
  await f.runtime.tick();
  assert.equal(f.runtime.status(call).status, "cancelled");
  f.config.enabled = true;
  await f.runtime.tick();
  assert.equal(f.counts.call, 0);
});

test("only one active call and provider status cannot go backward", async (t) => {
  const f = fixture(t);
  const input = await f.verified();
  const call = await f.runtime.call(input, "192.0.2.1");
  await f.runtime.tick();
  const job = f.store.get("call", call.id);
  f.store.put("call", { ...job, status: "in-progress" });
  f.providers.reader.status = async () => "ringing";
  await f.runtime.tick();
  assert.equal(f.runtime.status(call).status, "in-progress");
  f.store.put("call", {
    ...job,
    id: "second-queued-call",
    assessmentId: "second-assessment",
    status: "queued",
  });
  await f.runtime.tick();
  assert.equal(f.counts.call, 1);
  assert.equal(f.store.get("call", "second-queued-call").status, "queued");
});
