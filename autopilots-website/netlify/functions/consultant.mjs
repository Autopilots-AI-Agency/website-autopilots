import { createHmac, randomUUID } from "node:crypto";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export default async function (request, context) {
  const secret = process.env.CONSULTANT_BRIDGE_SECRET;
  const origin = process.env.CONSULTANT_SERVICE_URL;
  if (request.method !== "POST")
    return json({ ok: false, error: "method_not_allowed" }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ ok: false, error: "invalid_origin" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ ok: false, error: "invalid_type" }, 415);
  let input;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 65000)
      return json({ ok: false, error: "too_large" }, 413);
    input = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  if (
    !["config", "verify-start", "verify-check", "call", "status"].includes(
      input?.action,
    )
  )
    return json({ ok: false, error: "invalid_action" }, 400);
  if (process.env.CONSULTANT_TRANSPORT === "n8n") {
    const { runConsultant, failure } =
      await import("./_shared/consultant-n8n.mjs");
    try {
      if (!context?.ip) throw new Error("invalid_request");
      return json(
        await runConsultant(input.action, input.input || {}, context.ip),
      );
    } catch (error) {
      return failure(error);
    }
  }
  if (
    !origin ||
    !secret ||
    secret.length < 32 ||
    process.env.CONSULTANT_ENABLED !== "true"
  )
    return input.action === "config"
      ? json({ ok: true, enabled: false })
      : json({ ok: false, error: "calls_disabled" }, 503);
  try {
    const url = new URL(`/bridge/${input.action}`, origin);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("invalid_service");
    // Netlify supplies this value; never accept an IP from the browser body/header.
    if (!context?.ip) throw new Error("missing_client_ip");
    const body = JSON.stringify({
      input: input.input || {},
      trustedIp: context.ip,
    });
    const time = String(Date.now()),
      nonce = randomUUID();
    const signature = createHmac("sha256", secret)
      .update(["POST", url.pathname, time, nonce, body].join("\n"))
      .digest("hex");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Consultant-Time": time,
        "X-Consultant-Nonce": nonce,
        "X-Consultant-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(14000),
      redirect: "error",
    });
    const data = await response.json();
    return json(data, response.status);
  } catch {
    return json({ ok: false, error: "service_unavailable" }, 503);
  }
}
