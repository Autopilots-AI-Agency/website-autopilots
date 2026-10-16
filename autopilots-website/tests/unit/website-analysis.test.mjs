import test from "node:test";
import assert from "node:assert/strict";
import {
  publicAddress,
  websiteUrl,
  htmlText,
  analyze,
  readWebsite,
  validateReport,
} from "../../netlify/functions/_shared/website-analysis.mjs";

test("een nieuw website- of softwareconcept heeft geen bestaande website nodig", async () => {
  const pages = await readWebsite({
    noWebsite: true,
    answers: { goal: ["Een nieuwe of betere website"], focusRoute: "website" },
  });
  assert.equal(pages[0].url, "Jouw intake — nog geen website");
  assert.ok(pages[0].text.includes("Een nieuwe of betere website"));
});
import {
  signAssessment,
  verifyAssessment,
} from "../../netlify/functions/_shared/assessment-token.mjs";
test("crawler rejects private, reserved and literal network destinations", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.2",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
  for (const url of [
    "http://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://example.com:999",
    "https://name:pass@example.com",
  ])
    assert.throws(() => websiteUrl(url));
  assert.equal(websiteUrl("example.com").href, "https://example.com/");
});
test("website extraction removes executable content and bounds data", () => {
  assert.equal(
    htmlText(
      "<script>steal()</script><style>secret</style><h1>Bedrijf</h1><p>Hallo &amp; welkom</p>",
    ),
    "Bedrijf Hallo & welkom",
  );
  assert.equal(htmlText("x".repeat(30000)).length, 16000);
});
test("AI report must quote evidence that exists in supplied source", async () => {
  const pages = [
    { url: "https://example.com/", text: "Wij installeren warmtepompen." },
  ];
  const report = {
    company: "Voorbeeld",
    summary: "Installatiebedrijf",
    observations: [
      {
        finding: "Installatie",
        evidence: "Wij installeren warmtepompen.",
        source: pages[0].url,
      },
    ],
    recommendations: [
      {
        title: "Klantcontact",
        solution: "AI Telefoniste",
        why: "Volgens intake",
        workflow: ["Opnemen"],
        benefit: "Meer overzicht",
        conditions: ["Koppeling bevestigen"],
      },
    ],
    unknowns: ["Agenda?"],
    nextStep: "Kennismaken",
  };
  const fetchImpl = async (_url, options) => {
    const input = JSON.parse(JSON.parse(options.body).input);
    const generated =
      input.assessmentMode === "INTAKE_ONLY"
        ? {
            ...report,
            summary: "Een nieuw voorstel op basis van de intake.",
            observations: [],
          }
        : report;
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [{ type: "output_text", text: JSON.stringify(generated) }],
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
  };
  assert.equal(
    (await analyze({ answers: {} }, { fetchImpl, read: async () => pages }))
      .report.company,
    "Voorbeeld",
  );
  report.observations[0].evidence = "Wij zijn ISO gecertificeerd";
  const fallback = await analyze(
    { answers: {} },
    { fetchImpl, read: async () => pages },
  );
  assert.equal(fallback.basis, "intake");
  assert.equal(fallback.report.observations.length, 0);
  assert.equal(
    fallback.report.summary,
    "Een nieuw voorstel op basis van de intake.",
  );
  assert.deepEqual(fallback.sources, []);
  assert.equal(fallback.usage.inputTokens, 2);
  assert.ok(fallback.notice.includes("jouw antwoorden"));
});
test("kleine opmaakverschillen en een verkeerde bronlink blokkeren geen bevestigd citaat", () => {
  const report = {
    company: "Voorbeeld",
    summary: "Voorbeeld",
    observations: [
      {
        finding: "Onderhoud",
        evidence: "“Wij  installeren — warmtepompen”",
        source: "verkeerde link",
      },
    ],
    recommendations: [
      {
        title: "Advies",
        solution: "Procesadvies",
        why: "Intake",
        workflow: ["Bespreken"],
        benefit: "Een plan",
        conditions: ["Verifiëren"],
      },
    ],
    unknowns: ["Wat is het doel?"],
    nextStep: "Bespreken",
  };
  const checked = validateReport(report, [
    { url: "https://example.com/", text: "Wij installeren warmtepompen." },
  ]);
  assert.equal(checked.observations[0].source, "https://example.com/");
});
test("onleesbare website geeft een nieuw advies op alleen intake zonder websiteclaims", async () => {
  let calls = 0;
  const fetchImpl = async (_url, options) => {
    calls++;
    const request = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(request.input).sources, []);
    assert.ok(
      request.instructions.includes("observations MOET een lege array"),
    );
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  company: "Jouw bedrijf",
                  summary: "Een voorstel op jouw antwoorden.",
                  observations: [],
                  recommendations: [
                    {
                      title: "Website",
                      solution: "Website op maat",
                      why: "Je wilt een website",
                      workflow: ["Ontwerpen"],
                      benefit: "Een eigen uitstraling",
                      conditions: ["Inhoud afstemmen"],
                    },
                  ],
                  unknowns: ["Welke inhoud?"],
                  nextStep: "Kennismaken",
                }),
              },
            ],
          },
        ],
      }),
    );
  };
  const result = await analyze(
    { answers: { goal: ["Een nieuwe of betere website"] } },
    {
      fetchImpl,
      read: async () => {
        throw new Error("Onleesbaar");
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.basis, "intake");
  assert.equal(result.report.company, "Jouw bedrijf");
});
test("assessment handoff rejects tampered and expired reports", () => {
  process.env.ANALYSIS_SIGNING_SECRET = "test-secret";
  const token = signAssessment({ expires: Date.now() + 10000, id: "example" });
  assert.equal(verifyAssessment(token).id, "example");
  assert.throws(() => verifyAssessment(`${token}x`));
  assert.throws(
    () => verifyAssessment(signAssessment({ expires: 1 })),
    /verlopen/,
  );
});
