import { createPublicKey, verify } from "node:crypto";
import { normalizeCallbackPhone } from "./consultant-service.mjs";

export function telnyxConsultantProvider(config, fetchImpl = fetch) {
  return {
    async dial(job) {
      const assistant = config.assistants?.[job.locale];
      if (
        !config.enabled ||
        !config.apiKey ||
        !/^\d+$/.test(config.connectionId || "") ||
        !assistant?.id ||
        !/^\d+$/.test(assistant.version || "") ||
        !config.from
      )
        throw new Error("telnyx_not_ready");
      const callback = config.callbackUrl ? new URL(config.callbackUrl) : null;
      if (
        callback &&
        (callback.protocol !== "https:" ||
          callback.username ||
          callback.password)
      )
        throw new Error("invalid_callback");
      const response = await fetchImpl(
        `https://api.telnyx.com/v2/texml/ai_calls/${config.connectionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            From: normalizeCallbackPhone(config.from),
            To: normalizeCallbackPhone(job.phone),
            AIAssistantId: assistant.id,
            AIAssistantVersion: assistant.version,
            AIAssistantDynamicVariables: {
              business_context: job.context,
              request_id: job.id,
              locale: job.locale,
              tool_token: job.toolToken,
              current_time: new Date().toISOString(),
            },
            ...(callback
              ? {
                  StatusCallback: callback.href,
                  StatusCallbackMethod: "POST",
                  StatusCallbackEvent: "initiated ringing answered completed",
                }
              : {}),
            Record: false,
            TimeLimit: 360,
            timeout_seconds: 30,
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw new Error("telnyx_request_failed");
      const data = await response.json();
      if (typeof data.call_sid !== "string" || !data.call_sid)
        throw new Error("missing_call_receipt");
      return { id: data.call_sid };
    },
  };
}

// For signed API-v2 JSON events. TeXML form callbacks require their own verified
// product-specific adapter; do not assume this verifier covers those callbacks.
export function verifyTelnyxEvent(
  rawBody,
  headers,
  publicKey,
  now = Date.now(),
) {
  const timestamp = headers.get("telnyx-timestamp");
  if (
    !/^\d+$/.test(timestamp || "") ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    throw new Error("invalid_webhook_time");
  const key = Buffer.from(publicKey || "", "base64");
  if (key.length !== 32) throw new Error("invalid_public_key");
  const der = Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    key,
  ]);
  const valid = verify(
    null,
    Buffer.from(`${timestamp}|${rawBody}`),
    createPublicKey({ key: der, format: "der", type: "spki" }),
    Buffer.from(headers.get("telnyx-signature-ed25519") || "", "base64"),
  );
  if (!valid) throw new Error("invalid_webhook_signature");
  const event = JSON.parse(rawBody);
  if (!event.data?.id || !event.data?.event_type)
    throw new Error("invalid_webhook_event");
  return event; // Caller must atomically deduplicate event.id and enforce call/org scope.
}
