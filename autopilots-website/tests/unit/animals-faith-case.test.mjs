import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  caseResults,
  publicResults,
  suppliedCaseMetrics,
  specialistAgents,
} from "../../src/data/animals-faith-case.mjs";

test("case metrics do not present unverified or absent results as live numbers", () => {
  assert.equal(caseResults.approved, false);
  assert.deepEqual(
    publicResults().map((result) => result.value),
    [null, null, null],
  );
  assert.deepEqual(
    publicResults({
      approved: false,
      period: "six months",
      appointments: 25,
      minutes: 300,
      hoursSaved: 10,
    }).map((result) => result.value),
    [null, null, null],
  );
  assert.deepEqual(
    publicResults({ approved: true, period: null, appointments: 25 }).map(
      (result) => result.value,
    ),
    [null, null, null],
  );
});

test("approved values require a period and finite nonnegative numeric data", () => {
  assert.deepEqual(
    publicResults({
      approved: true,
      period: "Verified test period",
      appointments: 0,
      minutes: 300,
      hoursSaved: 10,
    }).map((result) => result.value),
    [0, 300, 10],
  );
  assert.deepEqual(
    publicResults({
      approved: true,
      period: "Verified test period",
      appointments: -1,
      minutes: Infinity,
      hoursSaved: "100",
    }).map((result) => result.value),
    [null, null, null],
  );
});

test("published case is indexable and keeps the estimated time saving labelled", () => {
  const page = readFileSync(
    new URL(
      "../../src/pages/nl/cases/animals-faith/index.astro",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(page, /customChrome>/);
  assert.doesNotMatch(page, /customChrome noindex/);
  assert.doesNotMatch(
    page,
    /id="dashboard"|href="#dashboard"|data-dashboard|INZICHT VOOR HET TEAM/,
  );
  assert.doesNotMatch(page, /Over deze resultaten|af-impact-source/);
  assert.match(page, /Geschatte tijdwinst/);
  assert.match(page, /2026/);
  assert.match(page, /Een terugbelverzoek met relevante context/);
  assert.doesNotMatch(page, /<audio|<iframe|telnyx|supabase|api_key/i);
});

test("client supplied 2026 results retain their precision, attribution and seven specialists", () => {
  assert.deepEqual(
    suppliedCaseMetrics.map((metric) => metric.value),
    [300, 2000, 90, 99.8],
  );
  assert.deepEqual(
    suppliedCaseMetrics.map((metric) => metric.suffix),
    ["+", "+", "+", "%"],
  );
  assert.equal(suppliedCaseMetrics[3].decimals, 1);
  assert.ok(
    suppliedCaseMetrics.every(
      (metric) =>
        metric.source === "client-supplied" && metric.period === "2026",
    ),
  );
  assert.equal(specialistAgents.length, 7);
  const page = readFileSync(
    new URL(
      "../../src/pages/nl/cases/animals-faith/index.astro",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(page, /Sophie|class="af-network"/);
  assert.doesNotMatch(page, /Klantcase \/ Telefonische AI/);
  assert.ok(
    page.indexOf('class="af-impact"') <
      page.indexOf('class="af-specialism-intro"'),
  );
});

test("presentation script uses no external calls, gates counters and respects reduced motion", () => {
  const script = readFileSync(
    new URL("../../src/scripts/animals-faith-case.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /data-verified="true"/);
  assert.match(script, /element\.dataset\.counted/);
});

test("agent routing measures actual cards and animates only the selected connection", () => {
  const page = readFileSync(
    new URL(
      "../../src/pages/nl/cases/animals-faith/index.astro",
      import.meta.url,
    ),
    "utf8",
  );
  const script = readFileSync(
    new URL("../../src/scripts/animals-faith-case.ts", import.meta.url),
    "utf8",
  );
  assert.match(page, /data-selected-connection/);
  assert.match(page, /data-connection-current pathLength="100"/);
  assert.doesNotMatch(page, /class="af-branch-line"/);
  assert.match(script, /new ResizeObserver\(drawConnections\)/);
  assert.match(script, /current\.animate/);
  assert.match(script, /routeAnimation\?\.cancel\(\)/);
  assert.match(script, /if \(quiet\(\)\) return/);
});
