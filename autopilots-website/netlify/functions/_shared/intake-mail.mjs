import { createHash } from "node:crypto";
import { intakeConfirmation } from "./intake-confirmation.mjs";

export async function sendIntakeMail({
  record,
  bookingUrl,
  store,
  apiKey,
  fetchImpl = fetch,
  now = Date.now(),
}) {
  if (!apiKey) return { status: "unavailable" };
  // Bind one immutable message to each signed assessment, not each browser click.
  const key = createHash("sha256")
    .update(String(record.assessment.id))
    .digest("hex");
  const message = {
    from: "Autopilots <support@auto-pilots.io>",
    reply_to: "support@auto-pilots.io",
    to: [record.email],
    ...intakeConfirmation({
      name: record.name,
      bookingUrl,
      locale: record.assessment.locale,
      assessment:
        record.delivery === "analysis" ? record.assessment : undefined,
    }),
  };
  await store.setJSON(
    key,
    {
      message,
      delivery: record.delivery || "confirmation",
      createdAt: now,
      risk: "R1",
      requestId: record.id,
    },
    { onlyIfNew: true },
  );
  const saved = await store.get(key, { type: "json" });
  if (!saved || saved.message.to[0] !== record.email)
    return { status: "conflict" };
  if (
    (saved.delivery || "confirmation") !== (record.delivery || "confirmation")
  )
    return { status: "conflict" };
  const receipt = await store.get(`${key}-receipt`, { type: "json" });
  if (receipt) return receipt;
  // Resend retains idempotency keys for 24 hours. Never resend an ambiguous
  // delivery beyond that window; an operator must reconcile it first.
  if (now - saved.createdAt >= 23 * 60 * 60 * 1000)
    return { status: "review_required" };
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `intake-${key}`,
      },
      body: JSON.stringify(saved.message),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { status: "pending" };
    const data = await response.json();
    if (typeof data.id !== "string" || !data.id) return { status: "pending" };
    const result = {
      status: "accepted",
      providerId: data.id,
      acceptedAt: new Date(now).toISOString(),
      usage: { provider: "resend", emails: 1, cost: "provider_billing" },
    };
    await store.setJSON(`${key}-receipt`, result, { onlyIfNew: true });
    return result;
  } catch {
    // No provider payloads or credentials may leak into public errors/logs.
    return { status: "pending" };
  }
}
