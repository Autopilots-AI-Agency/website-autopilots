import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  consultantContext,
  consultantInstructions,
  consultantLanguages,
} from "../../../autopilots-platform/src/consultant/consultant-agent.mjs";
import {
  requestConsultantCall,
  dispatchConsultantCall,
  normalizeCallbackPhone,
  callConsentVersion,
  bookConsultantMeeting,
} from "../../../autopilots-platform/src/consultant/consultant-service.mjs";
import {
  telnyxConsultantProvider,
  verifyTelnyxEvent,
} from "../../../autopilots-platform/src/consultant/consultant-telnyx.mjs";
import { intakeConfirmation } from "../../netlify/functions/_shared/intake-confirmation.mjs";
import { consultantGhlCalendar } from "../../../autopilots-platform/src/consultant/consultant-ghl.mjs";
const now = 1800000000000;
const assessment = {
  id: "assessment-123",
  locale: "nl",
  expires: now + 600000,
  answers: { sector: "Installatiebedrijven", volume: "25–100" },
  report: {
    company: "Fixture",
    summary: "Voorlopig advies",
    recommendations: [],
    unknowns: [],
  },
};
const policy = {
  enabled: true,
  organizationId: "autopilots",
  approvalVersion: "approved-test",
  hashSecret: "synthetic-test-secret",
};
const input = {
  id: "request-1234567890",
  token: "synthetic",
  phone: "06 12345678",
  proof: "synthetic-proof",
  consent: true,
  consentVersion: callConsentVersion,
};
const proof = {
  id: "otp-123",
  phone: "+31612345678",
  assessmentId: assessment.id,
  organizationId: "autopilots",
  verifiedAt: now,
  expires: now + 60000,
};
const deps = () => ({
  policy,
  now,
  verifyAssessment: () => assessment,
  verifyPhone: async () => proof,
  repository: { admit: async (job) => job },
});
test("all six agents disclose AI and have bounded persuasion and booking policy", () => {
  assert.equal(Object.keys(consultantLanguages).length, 6);
  for (const locale of Object.keys(consultantLanguages)) {
    const instructions = consultantInstructions(locale);
    assert.match(instructions, /stop selling immediately/);
    assert.match(instructions, /confirmed event ID/);
    assert.match(instructions, /untrusted DATA/);
    assert.ok(consultantLanguages[locale].greeting.length > 80);
  }
  assert.throws(() => consultantInstructions("unknown"));
});
test("dossier uses signed quiz context, distinguishes sources and omits contact/token secrets", () => {
  const dossier = JSON.parse(
    consultantContext({
      ...assessment,
      token: "secret",
      email: "private@example.test",
    }),
  );
  assert.deepEqual(dossier.selfReported, assessment.answers);
  assert.equal(dossier.email, undefined);
  assert.equal(dossier.token, undefined);
  assert.throws(() => consultantContext({ ...assessment, locale: "unknown" }));
  assert.throws(() =>
    consultantContext({
      ...assessment,
      report: { summary: "x".repeat(25000) },
    }),
  );
});
test("normalizes Dutch mobiles and international numbers without assuming country from language", () => {
  assert.equal(normalizeCallbackPhone("06 12345678"), "+31612345678");
  assert.equal(normalizeCallbackPhone("0033 6 12 34 56 78"), "+33612345678");
  assert.throws(() => normalizeCallbackPhone("061234"));
  assert.throws(() => normalizeCallbackPhone("+31abc612345678"));
});
test("call command binds proof, signed locale, approval, usage and minimal dossier", async () => {
  const call = await requestConsultantCall(
    { ...input, locale: "fr", organizationId: "attacker" },
    deps(),
  );
  assert.equal(call.locale, "nl");
  assert.equal(call.organizationId, "autopilots");
  assert.equal(call.expiresAt, now + 300000);
  assert.equal(call.usage.cost, null);
  assert.equal(call.risk, "R3");
  assert.notEqual(call.phoneHash, call.phone);
});
test("rejects missing consent, stale or wrong number proof and disabled operation before admission", async () => {
  for (const change of [
    { consent: false },
    { consentVersion: "old" },
    { id: "short" },
  ])
    await assert.rejects(
      requestConsultantCall({ ...input, ...change }, deps()),
    );
  await assert.rejects(
    requestConsultantCall(input, {
      ...deps(),
      policy: { ...policy, enabled: false },
    }),
    /calls_disabled/,
  );
  for (const change of [
    { phone: "+31687654321" },
    { assessmentId: "other" },
    { organizationId: "other" },
    { expires: now - 1 },
    { verifiedAt: now - 300001 },
  ])
    await assert.rejects(
      requestConsultantCall(input, {
        ...deps(),
        verifyPhone: async () => ({ ...proof, ...change }),
      }),
      /phone_verification_required/,
    );
});
test("ambiguous provider result is never retried, unclaimed job never dials", async () => {
  let dials = 0;
  const job = await requestConsultantCall(input, deps());
  const worker = {
    now,
    currentPolicy: async () => policy,
    provider: {
      dial: async () => {
        dials++;
        throw new Error("timeout");
      },
    },
    repository: {
      claim: async () => job,
      finish: async (_id, receipt) => receipt,
    },
  };
  assert.deepEqual(await dispatchConsultantCall(job.id, worker), {
    status: "provider_unknown",
    retryAllowed: false,
  });
  worker.repository.claim = async () => null;
  assert.equal(
    (await dispatchConsultantCall(job.id, worker)).status,
    "not_claimed",
  );
  assert.equal(dials, 1);
});
test("Telnyx adapter transmits correct locale dossier, pinned assistant and call limits without recording", async () => {
  let request;
  const config = {
    enabled: true,
    apiKey: "synthetic",
    connectionId: "123",
    from: "+31201234567",
    callbackUrl: "https://example.test/callback",
    assistants: { nl: { id: "assistant-123", version: "1" } },
  };
  const provider = telnyxConsultantProvider(config, async (url, options) => {
    request = { url, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ call_sid: "call-123" }));
  });
  const result = await provider.dial(
    await requestConsultantCall(input, deps()),
  );
  assert.equal(result.id, "call-123");
  assert.equal(request.url, "https://api.telnyx.com/v2/texml/ai_calls/123");
  assert.equal(request.body.Record, false);
  assert.equal(request.body.TimeLimit, 360);
  assert.equal(request.body.Timeout, 30);
  assert.equal(request.body.AIAssistantDynamicVariables.locale, "nl");
  assert.equal(request.body.AIAssistantVersion, "1");
  config.assistants.nl.version = "20261021T133515021458";
  await provider.dial(await requestConsultantCall(input, deps()));
  assert.equal(request.body.AIAssistantVersion, "20261021T133515021458");
  await assert.rejects(
    telnyxConsultantProvider({ ...config, enabled: false }).dial({
      locale: "nl",
    }),
  );
});
test("webhooks reject tampering, old signatures and unsigned payloads", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const key = publicKey
    .export({ format: "der", type: "spki" })
    .subarray(-32)
    .toString("base64");
  const timestamp = String(now / 1000);
  const body = JSON.stringify({
    data: { id: "event-123", event_type: "assistant.initialization" },
  });
  const headers = new Headers({
    "telnyx-timestamp": timestamp,
    "telnyx-signature-ed25519": sign(
      null,
      Buffer.from(`${timestamp}|${body}`),
      privateKey,
    ).toString("base64"),
  });
  assert.equal(verifyTelnyxEvent(body, headers, key, now).data.id, "event-123");
  assert.throws(() => verifyTelnyxEvent(body + " ", headers, key, now));
  assert.throws(() => verifyTelnyxEvent(body, headers, key, now + 301000));
  assert.throws(() => verifyTelnyxEvent(body, new Headers(), key, now));
});
test("booking requires consent, server slot and real calendar receipt; ambiguous write stays unknown", async () => {
  let count = 0;
  let saved;
  const bookingDeps = {
    authorizeSession: async () => ({
      active: true,
      organizationId: "autopilots",
      assessmentId: "a1",
      calendarId: "tim-calendar",
    }),
    repository: {
      booking: async () => saved,
      claimBooking: async () => true,
      finishBooking: async (_key, value) => (saved = value),
    },
    calendar: {
      resolveSlot: async () => ({
        timezone: "Europe/Amsterdam",
        calendarId: "tim-calendar",
      }),
      isAvailable: async () => true,
      create: async () => {
        count++;
        return { id: "event-1", calendarId: "tim-calendar" };
      },
    },
  };
  const bookingInput = {
    confirmed: true,
    slotId: "server-slot",
    timezone: "Europe/Amsterdam",
    attendee: {},
  };
  await assert.rejects(
    bookConsultantMeeting({ ...bookingInput, confirmed: false }, bookingDeps),
  );
  assert.equal(
    (await bookConsultantMeeting(bookingInput, bookingDeps)).status,
    "confirmed",
  );
  await bookConsultantMeeting(bookingInput, bookingDeps);
  assert.equal(count, 1);
  saved = undefined;
  bookingDeps.calendar.create = async () => {
    throw new Error("timeout");
  };
  assert.equal(
    (await bookConsultantMeeting(bookingInput, bookingDeps)).status,
    "unknown",
  );
});
test("personal analysis email contains escaped report and conditions, not executable AI markup", () => {
  const mail = intakeConfirmation({
    bookingUrl: "https://auto-pilots.io/nl/afspraak/",
    assessment: {
      ...assessment,
      report: {
        ...assessment.report,
        summary: "<script>alert(1)</script>",
        recommendations: [
          { title: "Plan", conditions: ["Eerst koppeling controleren"] },
        ],
      },
    },
  });
  assert.match(mail.text, /Eerst koppeling controleren/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
});
test("GHL adapter enforces calendar scope and free-slot validation", async () => {
  const config = {
    token: "synthetic",
    organizationId: "autopilots",
    calendarId: "tim-calendar",
    locationId: "own-location",
    durationMinutes: 30,
    writesEnabled: false,
  };
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(
      JSON.stringify(
        options.method === "POST"
          ? {
              id: "event-123",
              calendarId: "tim-calendar",
              contactId: "contact-123",
            }
          : {
              "2026-10-21": { slots: ["2026-10-21T10:00:00+02:00"] },
              traceId: "metadata",
            },
      ),
    );
  };
  const calendar = consultantGhlCalendar(config, fetchImpl);
  const slot = {
    calendarId: "tim-calendar",
    timezone: "Europe/Amsterdam",
    start: "2026-10-21T10:00:00+02:00",
    end: "2026-10-21T10:30:00+02:00",
  };
  assert.equal(await calendar.isAvailable(slot), true);
  await assert.rejects(calendar.isAvailable({ ...slot, calendarId: "other" }));
  const session = {
    organizationId: "autopilots",
    calendarId: "tim-calendar",
    locationId: "own-location",
    contactId: "contact-123",
  };
  await assert.rejects(
    calendar.create({ slot, session }),
    /ghl_write_not_authorized/,
  );
  const writer = consultantGhlCalendar(
    { ...config, writesEnabled: true },
    fetchImpl,
  );
  assert.equal((await writer.create({ slot, session })).id, "event-123");
  const body = JSON.parse(requests.at(-1).options.body);
  assert.equal(body.ignoreFreeSlotValidation, false);
  assert.equal(body.ignoreDateRange, false);
  assert.equal(body.calendarId, config.calendarId);
  await assert.rejects(
    writer.create({ slot, session: { ...session, locationId: "other" } }),
  );
});
