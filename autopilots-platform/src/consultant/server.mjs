import { createServer } from "node:http";
import { configuration } from "./configuration.mjs";
import { pathToFileURL } from "node:url";
import { ConsultantStore } from "./store.mjs";
import { verifyBridge } from "./security.mjs";
import { createConsultantRuntime } from "./runtime.mjs";
import { telnyxVerification, telnyxCallReader } from "./providers.mjs";
import { telnyxConsultantProvider } from "./consultant-telnyx.mjs";
import { consultantGhlCalendar } from "./consultant-ghl.mjs";
import { consultantBooking } from "./booking.mjs";

export function consultantServer(config, store, runtime, bookingTools) {
  return createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(data));
    };
    if (req.url === "/health" && req.method === "GET")
      return reply(200, { ok: true, callingEnabled: runtime.ready() });
    if (req.method !== "POST")
      return reply(405, { ok: false, error: "method_not_allowed" });
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 65536) return reply(413, { ok: false, error: "too_large" });
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString("utf8");
      const request = new Request(`http://localhost${req.url}`, {
        method: "POST",
        headers: req.headers,
        body,
      });
      const path = new URL(request.url).pathname;
      if (path.startsWith("/bridge/")) {
        verifyBridge(request, body, config, store);
        const data = JSON.parse(body);
        const input = data.input;
        const action = path.slice(8);
        if (action === "config")
          return reply(200, { ok: true, enabled: runtime.ready() });
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new Error("invalid_request");
        const methods = {
          "verify-start": "start",
          "verify-check": "verify",
          call: "call",
          status: "status",
        };
        if (!methods[action])
          return reply(404, { ok: false, error: "not_found" });
        const result = await runtime[methods[action]](input, data.trustedIp);
        return reply(200, { ok: true, ...result });
      }
      if (path.startsWith("/tools/")) {
        const job = runtime.authorizeTool(req.headers["x-consultant-session"]);
        const input = JSON.parse(body);
        if (path === "/tools/suppress")
          return reply(200, runtime.suppress(job));
        if (path === "/tools/availability" && bookingTools)
          return reply(200, await bookingTools.availability(job, input));
        if (path === "/tools/book" && bookingTools)
          return reply(200, await bookingTools.book(job, input));
      }
      return reply(404, { ok: false, error: "not_found" });
    } catch (error) {
      // No raw provider bodies, stack traces, phone numbers or tokens in logs/replies.
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
      ];
      const code = known.includes(error.message)
        ? error.message
        : "request_failed";
      return reply(
        code === "unauthorized" ? 401 : code === "calls_disabled" ? 503 : 422,
        { ok: false, error: code },
      );
    }
  });
}

export { configuration } from "./configuration.mjs";
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const config = configuration();
  for (const key of ["hashSecret", "assessmentSecret", "bridgeSecret"])
    if (!config[key] || config[key].length < 32)
      throw new Error(`${key}_required`);
  const store = new ConsultantStore(
    process.env.CONSULTANT_DB_PATH || "./var/consultant.sqlite",
    process.env.CONSULTANT_STORAGE_SECRET,
    config.organizationId,
  );
  const ready = !!(
    config.apiKey &&
    config.verifyProfileId &&
    config.accountId &&
    config.connectionId &&
    config.from &&
    config.bookingEnabled &&
    config.token &&
    config.calendarId &&
    config.locationId &&
    ["nl", "en", "es", "de", "it", "fr"].every(
      (l) => config.assistants[l]?.id && config.assistants[l]?.version,
    )
  );
  const runtime = createConsultantRuntime(config, store, {
    ready,
    verification: telnyxVerification(config),
    calls: telnyxConsultantProvider(config),
    reader: telnyxCallReader(config),
  });
  const server = consultantServer(
    config,
    store,
    runtime,
    consultantBooking(config, store, consultantGhlCalendar(config)),
  );
  const timer = setInterval(() => runtime.tick().catch(() => {}), 3000);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(
    Number(process.env.PORT || 4310),
    process.env.HOST || "127.0.0.1",
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      clearInterval(timer);
      server.close(() => {
        store.close();
        process.exit(0);
      });
    });
}
