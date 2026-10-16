import { verifyAssessment } from "./_shared/assessment-token.mjs";
import { createHash } from "node:crypto";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
export default async (request) => {
  if (request.method !== "POST")
    return json({ message: "Methode niet toegestaan." }, 405);
  if (
    process.env.AUTOPILOTS_ANALYSIS_ENABLED !== "true" ||
    !process.env.ANALYSIS_SIGNING_SECRET
  )
    return json({ message: "Aanvragen zijn nog niet beschikbaar." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ message: "Ongeldige herkomst." }, 403);
  let input;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 65000)
      return json({ message: "Aanvraag te groot." }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ message: "Ongeldige aanvraag." }, 400);
  }
  const id = request.headers.get("idempotency-key");
  if (
    !/^[a-zA-Z0-9-]{16,80}$/.test(id || "") ||
    input.consent !== true ||
    typeof input.name !== "string" ||
    input.name.length < 2 ||
    input.name.length > 100 ||
    typeof input.email !== "string" ||
    input.email.length > 160 ||
    !/^\S+@\S+\.\S+$/.test(input.email)
  )
    return json(
      { message: "Controleer je naam, e-mailadres en toestemming." },
      422,
    );
  let assessment;
  try {
    assessment = verifyAssessment(input.token);
  } catch (error) {
    return json({ message: error.message }, 422);
  }
  const record = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    assessment,
    consentAt: new Date().toISOString(),
    status: "requested",
    risk: "R1",
    usage: assessment.usage,
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([record.name, record.email, assessment.id]))
    .digest("hex");
  try {
    if (process.env.AUTOPILOTS_LOCAL_INTAKE === "true") {
      const { mkdir, writeFile, readFile } = await import("node:fs/promises");
      await mkdir(".local/intake-requests", { recursive: true, mode: 0o700 });
      const path = `.local/intake-requests/${id}.json`;
      try {
        await writeFile(path, JSON.stringify({ ...record, fingerprint }), {
          flag: "wx",
          mode: 0o600,
        });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const prior = JSON.parse(await readFile(path, "utf8"));
        if (prior.fingerprint !== fingerprint)
          return json({ message: "Deze aanvraag is al gebruikt." }, 409);
      }
    } else {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({
        name: "autopilots-assessment-requests",
        consistency: "strong",
      });
      const previous = await store.get(id, { type: "json" });
      if (previous && previous.fingerprint !== fingerprint)
        return json({ message: "Deze aanvraag is al gebruikt." }, 409);
      if (!previous) await store.setJSON(id, { ...record, fingerprint });
    }
  } catch {
    return json(
      { message: "Je aanvraag kon niet worden opgeslagen. Probeer opnieuw." },
      503,
    );
  }
  const calendar =
    process.env.PUBLIC_GHL_CALENDAR_URL ||
    "https://api.leadconnectorhq.com/widget/booking/UaWTV0sdETiXy0refclQ";
  return json({ ok: true, id, bookingUrl: calendar });
};
