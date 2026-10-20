import { getStore } from "@netlify/blobs";
import { configuration } from "../../../../autopilots-platform/src/consultant/configuration.mjs";
import { BlobConsultantStore } from "../../../../autopilots-platform/src/consultant/blob-store.mjs";
import {
  executionTickets,
  n8nProviderFetch,
} from "../../../../autopilots-platform/src/consultant/n8n-executor.mjs";
import { createConsultantRuntime } from "../../../../autopilots-platform/src/consultant/runtime.mjs";
import {
  telnyxVerification,
  telnyxCallReader,
} from "../../../../autopilots-platform/src/consultant/providers.mjs";
import { telnyxConsultantProvider } from "../../../../autopilots-platform/src/consultant/consultant-telnyx.mjs";
import { consultantGhlCalendar } from "../../../../autopilots-platform/src/consultant/consultant-ghl.mjs";
import { consultantBooking } from "../../../../autopilots-platform/src/consultant/booking.mjs";

export const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function n8nConfiguration(env = process.env) {
  // Provider secrets live only in n8n credentials. These markers are never sent
  // to a provider; n8nProviderFetch removes all incoming authorization headers.
  const config = configuration({
    ...env,
    TELNYX_API_KEY: "n8n-managed",
    GHL_API_TOKEN: "n8n-managed",
  });
  config.callbackUrl = undefined;
  return config;
}
export function connectionReady(config, env = process.env) {
  return !!(
    env.CONSULTANT_TRANSPORT === "n8n" &&
    env.CONSULTANT_N8N_WEBHOOK_URL?.startsWith(
      "https://n8n.auto-pilots.io/webhook/",
    ) &&
    env.CONSULTANT_N8N_WEBHOOK_KEY?.length >= 32 &&
    env.CONSULTANT_WORKER_KEY?.length >= 32 &&
    env.CONSULTANT_STORAGE_SECRET?.length >= 32 &&
    config.hashSecret?.length >= 32 &&
    config.assessmentSecret?.length >= 32 &&
    config.organizationId &&
    config.verifyProfileId &&
    config.accountId &&
    /^\d+$/.test(config.connectionId || "") &&
    config.from &&
    config.bookingEnabled &&
    config.calendarId &&
    config.locationId &&
    config.allowedPhones.length &&
    ["nl", "en", "es", "de", "it", "fr"].every(
      (l) =>
        config.assistants[l]?.id &&
        /^\d+$/.test(config.assistants[l]?.version || ""),
    )
  );
}
export function ticketStore(config, env = process.env) {
  return executionTickets(
    getStore({
      name: "autopilots-consultant-tickets-v1",
      consistency: "strong",
    }),
    config,
    env.CONSULTANT_STORAGE_SECRET,
  );
}
export async function runConsultant(action, input, ip, env = process.env) {
  const config = n8nConfiguration(env);
  const ready = connectionReady(config, env);
  if (!ready) {
    if (action === "config") return { ok: true, enabled: false };
    throw new Error("calls_disabled");
  }
  // Config checks don't acquire the ledger or create any provider request.
  if (action === "config")
    return {
      ok: true,
      enabled: createConsultantRuntime(config, null, { ready }).ready(),
    };
  const store = await new BlobConsultantStore(
    getStore({
      name: "autopilots-consultant-ledger-v1",
      consistency: "strong",
    }),
    env.CONSULTANT_STORAGE_SECRET,
    config.organizationId,
  ).acquire();
  try {
    const fetchProvider = n8nProviderFetch({
      config,
      tickets: ticketStore(config, env),
      store,
      webhookUrl: env.CONSULTANT_N8N_WEBHOOK_URL,
      webhookKey: env.CONSULTANT_N8N_WEBHOOK_KEY,
    });
    const runtime = createConsultantRuntime(config, store, {
      ready,
      verification: telnyxVerification(config, fetchProvider),
      calls: telnyxConsultantProvider(config, fetchProvider),
      reader: telnyxCallReader(config, fetchProvider),
    });
    const methods = {
      "verify-start": "start",
      "verify-check": "verify",
      call: "call",
      status: "status",
    };
    if (methods[action])
      return { ok: true, ...(await runtime[methods[action]](input, ip)) };
    if (action === "tick") {
      await runtime.tick();
      return { ok: true };
    }
    const job = runtime.authorizeTool(input.session);
    if (action === "suppress") return runtime.suppress(job);
    const booking = consultantBooking(
      config,
      store,
      consultantGhlCalendar(config, fetchProvider),
    );
    if (action === "availability" || action === "book")
      return await booking[action](job, input.parameters);
    throw new Error("invalid_action");
  } finally {
    if (store.held) await store.checkpoint(true);
  }
}

export async function readJson(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("invalid_request");
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65000) throw new Error("invalid_request");
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid_request");
  return value;
}
export function failure(error) {
  const known = [
    "calls_disabled",
    "consent_required",
    "invalid_phone",
    "destination_not_enabled",
    "calls_suppressed",
    "daily_limit",
    "rate_limited",
    "verification_expired",
    "verification_unavailable",
    "invalid_verification",
    "already_requested",
    "phone_verification_required",
    "id_conflict",
    "invalid_assessment",
    "expired_assessment",
    "unauthorized",
    "not_found",
    "assessment_mismatch",
    "invalid_request",
    "consultant_busy",
    "lease_lost",
  ];
  const code = known.includes(error.message) ? error.message : "request_failed";
  return reply(
    { ok: false, error: code },
    code === "unauthorized"
      ? 401
      : ["calls_disabled", "consultant_busy", "lease_lost"].includes(code)
        ? 503
        : 422,
  );
}
