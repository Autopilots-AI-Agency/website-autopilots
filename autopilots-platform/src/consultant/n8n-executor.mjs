import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { encryptedRecords } from "./blob-store.mjs";

const digest = (value) => createHash("sha256").update(String(value)).digest();
export const tokenMatches = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length >= 32 &&
  b.length >= 32 &&
  timingSafeEqual(digest(a), digest(b));

// Only requests produced by our fixed provider adapters are executable. Never an
// arbitrary URL, auth header, callback, account or recipient from the public UI.
export function providerOperation(rawUrl, options, config) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw new Error("provider_not_allowed");
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : undefined;
  const p = url.pathname;
  let provider;
  if (url.origin === "https://api.telnyx.com") {
    provider = "telnyx";
    if (method === "POST" && p === "/v2/verifications/sms" && !url.search) {
      if (
        body.verify_profile_id !== config.verifyProfileId ||
        !config.allowedPhones.includes(body.phone_number) ||
        body.timeout_secs !== 300
      )
        throw new Error("provider_scope_mismatch");
    } else if (
      method === "POST" &&
      /^\/v2\/verifications\/[\w-]+\/actions\/verify$/.test(p) &&
      !url.search
    ) {
      if (!/^\d{4,8}$/.test(body.code)) throw new Error("invalid_verification");
    } else if (
      method === "POST" &&
      p === `/v2/texml/ai_calls/${config.connectionId}` &&
      !url.search
    ) {
      if (
        body.From !== config.from ||
        !config.allowedPhones.includes(body.To) ||
        body.TimeLimit !== 360 ||
        body.Record !== false ||
        body.StatusCallback ||
        !Object.values(config.assistants).some(
          (x) =>
            x.id === body.AIAssistantId &&
            x.version === body.AIAssistantVersion,
        )
      )
        throw new Error("provider_scope_mismatch");
    } else if (!(
      method === "GET" &&
      !url.search &&
      p.startsWith(
        `/v2/texml/Accounts/${encodeURIComponent(config.accountId)}/Calls/`,
      ) &&
      /^[\w-]+$/.test(p.split("/").at(-1))
    ))
      throw new Error("provider_not_allowed");
  } else if (
    url.origin === "https://services.leadconnectorhq.com" &&
    config.bookingEnabled
  ) {
    provider = "ghl";
    if (
      method === "GET" &&
      p === `/calendars/${encodeURIComponent(config.calendarId)}/free-slots`
    ) {
      if (
        [...url.searchParams.keys()].some(
          (k) => !["startDate", "endDate", "timezone"].includes(k),
        )
      )
        throw new Error("provider_not_allowed");
    } else if (method === "POST" && !url.search && p === "/contacts/upsert") {
      if (
        body.locationId !== config.locationId ||
        !config.allowedPhones.includes(body.phone)
      )
        throw new Error("provider_scope_mismatch");
    } else if (
      method === "POST" &&
      !url.search &&
      p === "/calendars/events/appointments"
    ) {
      if (
        body.locationId !== config.locationId ||
        body.calendarId !== config.calendarId ||
        body.ignoreDateRange !== false ||
        body.ignoreFreeSlotValidation !== false
      )
        throw new Error("provider_scope_mismatch");
    } else throw new Error("provider_not_allowed");
  } else throw new Error("provider_not_allowed");
  return { provider, url: url.href, method, ...(body ? { body } : {}) };
}

export function executionTickets(blobs, config, secret, clock = Date.now) {
  const codec = encryptedRecords(secret, config.organizationId);
  const prefix = `tickets/${digest(config.organizationId).toString("hex")}/`;
  return {
    async issue(operation) {
      const id = randomUUID(),
        key = randomBytes(32).toString("hex");
      const record = {
        operation,
        keyHash: digest(key).toString("hex"),
        status: "issued",
        expiresAt: clock() + 60000,
        approval: config.approvalVersion,
      };
      const receipt = await blobs.setJSON(
        prefix + id,
        { payload: codec.encode(record) },
        { onlyIfNew: true },
      );
      if (!receipt.modified) throw new Error("ticket_unavailable");
      return { id, key };
    },
    async claim(input) {
      if (
        !config.enabled ||
        !config.approvalVersion ||
        !/^[a-f0-9-]{36}$/.test(input?.id || "") ||
        typeof input?.key !== "string"
      )
        throw new Error("unauthorized");
      const old = await blobs.getWithMetadata(prefix + input.id, {
        type: "json",
        consistency: "strong",
      });
      if (!old) throw new Error("unauthorized");
      const record = codec.decode(old.data.payload);
      if (
        record.status !== "issued" ||
        record.expiresAt <= clock() ||
        record.approval !== config.approvalVersion ||
        !tokenMatches(record.keyHash, digest(input.key).toString("hex"))
      )
        throw new Error("unauthorized");
      // Revalidate against current policy; a revoked destination cannot execute.
      const operation = providerOperation(
        record.operation.url,
        {
          method: record.operation.method,
          body: record.operation.body
            ? JSON.stringify(record.operation.body)
            : undefined,
        },
        config,
      );
      const result = await blobs.setJSON(
        prefix + input.id,
        {
          payload: codec.encode({
            status: "consumed",
            claimedAt: clock(),
            approval: config.approvalVersion,
          }),
        },
        { onlyIfMatch: old.etag },
      );
      if (!result.modified) throw new Error("unauthorized");
      return operation;
    },
    async revoke(id) {
      const old = await blobs.getWithMetadata(prefix + id, {
        type: "json",
        consistency: "strong",
      });
      if (old)
        await blobs.setJSON(
          prefix + id,
          { payload: codec.encode({ status: "closed", closedAt: clock() }) },
          { onlyIfMatch: old.etag },
        );
    },
    async prune() {
      // Recover after a killed function: expired tickets must not retain OTPs or
      // dossiers forever. Closed random IDs carry no customer content.
      const { blobs: entries } = await blobs.list({ prefix });
      for (const entry of entries) {
        const old = await blobs.getWithMetadata(entry.key, {
          type: "json",
          consistency: "strong",
        });
        if (!old) continue;
        const record = codec.decode(old.data.payload);
        if (record.status === "issued" && record.expiresAt <= clock()) {
          await blobs.setJSON(
            entry.key,
            { payload: codec.encode({ status: "closed", closedAt: clock() }) },
            { onlyIfMatch: old.etag },
          );
        } else if (
          ["closed", "consumed"].includes(record.status) &&
          (record.closedAt || record.claimedAt) < clock() - 7 * 86400000
        ) {
          await blobs.delete(entry.key);
        }
      }
    },
  };
}

export function n8nProviderFetch({
  config,
  tickets,
  store,
  webhookUrl,
  webhookKey,
  fetchImpl = fetch,
}) {
  const endpoint = new URL(webhookUrl);
  if (
    endpoint.origin !== "https://n8n.auto-pilots.io" ||
    !endpoint.pathname.startsWith("/webhook/") ||
    endpoint.search ||
    endpoint.username ||
    endpoint.password ||
    !webhookKey ||
    webhookKey.length < 32
  )
    throw new Error("invalid_executor");
  return async (url, options = {}) => {
    const operation = providerOperation(url, options, config);
    // Persist cost, dispatch and booking locks before releasing any capability.
    await store.checkpoint();
    const ticket = await tickets.issue(operation);
    try {
      const response = await fetchImpl(endpoint.href, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Consultant-Executor": webhookKey,
        },
        body: JSON.stringify(ticket),
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("executor_unavailable");
      const result = await response.json();
      if (
        !Number.isInteger(result.status) ||
        result.status < 200 ||
        result.status > 599 ||
        result.body === undefined
      )
        throw new Error("invalid_executor_receipt");
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      // Remove context/OTP from storage even on ambiguous provider outcomes.
      // Revocation never permits another attempt of the same request.
      await tickets.revoke(ticket.id).catch(() => {});
    }
  };
}
