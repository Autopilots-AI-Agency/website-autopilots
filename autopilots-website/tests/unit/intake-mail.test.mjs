import test from "node:test";
import assert from "node:assert/strict";
import { sendIntakeMail } from "../../netlify/functions/_shared/intake-mail.mjs";

function setup() {
  const values = new Map();
  const store = {
    async get(key) {
      return values.get(key);
    },
    async setJSON(key, value, { onlyIfNew } = {}) {
      if (onlyIfNew && values.has(key)) return { modified: false };
      values.set(key, value);
      return { modified: true };
    },
  };
  return {
    record: {
      id: "test-request",
      name: "Test",
      email: "test@example.com",
      assessment: { id: "signed-assessment" },
    },
    bookingUrl: "https://auto-pilots.io/afspraak/",
    store,
    apiKey: "test-only",
    now: 1000,
  };
}
test("confirmation uses fixed sender and persists receipt; repeated clicks do not resend", async () => {
  const args = setup();
  let calls = 0;
  args.fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.equal(body.from, "Autopilots <support@auto-pilots.io>");
    assert.deepEqual(body.to, ["test@example.com"]);
    assert.ok(options.headers["Idempotency-Key"]);
    return Response.json({ id: "mail-1" });
  };
  assert.equal((await sendIntakeMail(args)).status, "accepted");
  args.record.id = "another-browser-click";
  assert.equal((await sendIntakeMail(args)).status, "accepted");
  assert.equal(calls, 1);
});
test("retries keep immutable payload and key, and stop before provider deduplication expires", async () => {
  const args = setup();
  const requests = [];
  args.fetchImpl = async (_, options) => {
    requests.push(options);
    throw new Error("timeout");
  };
  assert.equal((await sendIntakeMail(args)).status, "pending");
  args.record.name = "Changed";
  await sendIntakeMail(args);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(
    requests[0].headers["Idempotency-Key"],
    requests[1].headers["Idempotency-Key"],
  );
  args.now += 24 * 60 * 60 * 1000;
  assert.equal((await sendIntakeMail(args)).status, "review_required");
  assert.equal(requests.length, 2);
});
test("assessment cannot send to a second recipient", async () => {
  const args = setup();
  let calls = 0;
  args.fetchImpl = async () => {
    calls++;
    return Response.json({ id: "mail-1" });
  };
  await sendIntakeMail(args);
  args.record.email = "other@example.com";
  assert.equal((await sendIntakeMail(args)).status, "conflict");
  assert.equal(calls, 1);
});
test("missing key fails closed without touching provider", async () => {
  const args = setup();
  args.apiKey = undefined;
  args.fetchImpl = () => assert.fail("must not send");
  assert.equal((await sendIntakeMail(args)).status, "unavailable");
});
