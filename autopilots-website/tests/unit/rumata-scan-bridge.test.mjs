import test from "node:test";
import assert from "node:assert/strict";
import handler from "../../netlify/functions/website-analysis.mjs";
import {
  requestRumataScan,
  rumataIntake,
} from "../../netlify/functions/_shared/rumata-analysis.mjs";
import { verifyAssessment } from "../../netlify/functions/_shared/assessment-token.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const token = "a".repeat(43);
const options = { id, token };

test("Rumata submission maps the validated intake and forwards its original idempotency key", async (t) => {
  const answers = {
    sector: "Autobedrijven",
    goal: ["A", "B"],
    systems: ["CRM"],
    channels: ["Telefoon"],
  };
  const intake = rumataIntake({ locale: "nl", noWebsite: true }, answers);
  t.mock.method(globalThis, "fetch", async (url, request) => {
    assert.equal(url.protocol, "https:");
    assert.ok(url.pathname.endsWith("/scans"));
    assert.equal(request.method, "POST");
    assert.equal(request.redirect, "error");
    assert.equal(request.headers["idempotency-key"], id);
    assert.equal(request.headers["x-scan-token"], token);
    const body = JSON.parse(request.body);
    assert.equal(body.focusRoute, "combined");
    assert.equal(body.goal, "A; B");
    assert.equal(body.systems, "CRM");
    assert.deepEqual(body.answers, answers);
    return Response.json({ id, state: "running" }, { status: 202 });
  });
  assert.deepEqual(await requestRumataScan({ ...options, intake }), {
    status: 202,
    scan: { id, state: "running" },
  });
});

test("only an owned, completed Rumata scan gets a token accepted by the existing Netlify follow-up", async (t) => {
  const values = {
    AUTOPILOTS_ANALYSIS_ENABLED: "true",
    ANALYSIS_SIGNING_SECRET: "test-fixture-only",
  };
  const saved = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const scan = {
    id,
    state: "succeeded",
    result: { summary: "Testadvies" },
    sources: [],
    locale: "nl",
    answers: { goal: "Test" },
    assessmentMode: "INTAKE_ONLY",
    generatedAt: "2026-11-25T00:00:00.000Z",
  };
  let state = "running";
  const fetch = t.mock.method(globalThis, "fetch", async (url, request) => {
    assert.ok(url.pathname.endsWith(`/scans/${id}`));
    assert.equal(request.method, "GET");
    assert.equal(request.body, undefined);
    if (request.headers["x-scan-token"] !== token)
      return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json(state === "running" ? { state } : scan);
  });
  const read = (capability) =>
    handler(
      new Request(
        `https://auto-pilots.io/.netlify/functions/website-analysis?id=${id}`,
        { headers: { "x-scan-token": capability } },
      ),
    );

  assert.equal((await read("bad")).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal((await read("b".repeat(43))).status, 404);
  assert.deepEqual(await (await read(token)).json(), { state: "running" });

  state = "succeeded";
  const result = await (await read(token)).json();
  assert.deepEqual(result.result, scan.result);
  assert.notEqual(result.token, token);
  const assessment = verifyAssessment(result.token);
  assert.equal(assessment.id, id);
  assert.deepEqual(assessment.report, scan.result);
  assert.deepEqual(assessment.answers, scan.answers);
  assert.equal(assessment.locale, scan.locale);
});
