import test from "node:test";
import assert from "node:assert/strict";
import { reserveAnalysis } from "../../netlify/functions/_shared/analysis-quota.mjs";

function fixture() {
  const entries = new Map();
  return {
    entries,
    store: {
      async setJSON(key, value, options) {
        assert.equal(options.onlyIfNew, true);
        if (entries.has(key)) return { modified: false };
        entries.set(key, value);
        return { modified: true };
      },
    },
  };
}
const base = {
  secret: "test-only",
  id: "test-request",
  now: Date.UTC(2026, 9, 19, 12),
};
test("shared atomic visitor quota permits only three concurrent reservations", async () => {
  const { store, entries } = fixture();
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      reserveAnalysis({ ...base, store, ip: "192.0.2.1" }),
    ),
  );
  assert.equal(results.filter(Boolean).length, 3);
  assert.ok(!JSON.stringify([...entries]).includes("192.0.2.1"));
});
test("global daily ceiling holds across visitors and resets next UTC day", async () => {
  const { store } = fixture();
  const results = await Promise.all(
    Array.from({ length: 70 }, (_, i) =>
      reserveAnalysis({ ...base, store, ip: `visitor-${i}` }),
    ),
  );
  assert.equal(results.filter(Boolean).length, 50);
  assert.equal(
    await reserveAnalysis({
      ...base,
      store,
      ip: "next",
      now: base.now + 86400000,
    }),
    true,
  );
});
test("missing trusted IP and storage failures fail closed", async () => {
  const { store } = fixture();
  await assert.rejects(reserveAnalysis({ ...base, store }));
  await assert.rejects(
    reserveAnalysis({
      ...base,
      ip: "visitor",
      store: {
        setJSON() {
          throw new Error("offline");
        },
      },
    }),
  );
});
