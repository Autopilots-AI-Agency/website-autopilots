import { verifyAssessment } from "./_shared/assessment-token.mjs";
import { createHash } from "node:crypto";
import { sendIntakeMail } from "./_shared/intake-mail.mjs";
import { scanLocale, scanError } from "./_shared/intake-i18n.mjs";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
export default async (request) => {
  let locale = scanLocale(request.headers.get("x-autopilots-locale"));
  const reply = (data, status = 200) =>
    json(
      data.message
        ? {
            ...data,
            message: scanError(
              data.message,
              locale,
              "Je aanvraag kon niet worden opgeslagen. Probeer opnieuw.",
            ),
          }
        : data,
      status,
    );
  if (request.method !== "POST")
    return reply({ message: "Methode niet toegestaan." }, 405);
  if (
    process.env.AUTOPILOTS_ANALYSIS_ENABLED !== "true" ||
    !process.env.ANALYSIS_SIGNING_SECRET
  )
    return reply({ message: "Aanvragen zijn nog niet beschikbaar." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ message: "Ongeldige herkomst." }, 403);
  let input;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 65000)
      return reply({ message: "Aanvraag te groot." }, 413);
    input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return reply({ message: "Ongeldige aanvraag." }, 400);
  } catch {
    return reply({ message: "Ongeldige aanvraag." }, 400);
  }
  const id = request.headers.get("idempotency-key");
  const analysisDelivery = input.delivery === "analysis";
  if (analysisDelivery && input.name === undefined) input.name = "";
  if (
    !/^[a-zA-Z0-9-]{16,80}$/.test(id || "") ||
    input.consent !== true ||
    typeof input.name !== "string" ||
    (!analysisDelivery && input.name.length < 2) ||
    input.name.length > 100 ||
    typeof input.email !== "string" ||
    input.email.length > 160 ||
    !/^\S+@\S+\.\S+$/.test(input.email)
  )
    return reply(
      { message: "Controleer je naam, e-mailadres en toestemming." },
      422,
    );
  let assessment;
  try {
    assessment = verifyAssessment(input.token);
    // The signed assessment, not a contact-form field, determines the email language.
    locale = scanLocale(assessment.locale);
  } catch (error) {
    return reply({ message: error.message }, 422);
  }
  const record = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    assessment,
    consentAt: new Date().toISOString(),
    status: "requested",
    delivery: analysisDelivery ? "analysis" : "confirmation",
    risk: "R1",
    usage: assessment.usage,
  };
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        analysisDelivery
          ? [record.name, record.email, assessment.id, record.delivery]
          : [record.name, record.email, assessment.id],
      ),
    )
    .digest("hex");
  const calendar =
    process.env.PUBLIC_GHL_CALENDAR_URL ||
    "https://api.leadconnectorhq.com/widget/booking/UaWTV0sdETiXy0refclQ";
  let confirmation = { status: "not_sent_local" };
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
          return reply({ message: "Deze aanvraag is al gebruikt." }, 409);
      }
    } else {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({
        name: "autopilots-assessment-requests",
        consistency: "strong",
      });
      await store.setJSON(id, { ...record, fingerprint }, { onlyIfNew: true });
      const previous = await store.get(id, { type: "json" });
      if (previous && previous.fingerprint !== fingerprint)
        return reply({ message: "Deze aanvraag is al gebruikt." }, 409);
      try {
        confirmation = await sendIntakeMail({
          record,
          bookingUrl: calendar,
          apiKey: process.env.RESEND_API_KEY,
          store: getStore({
            name: "autopilots-intake-mail",
            consistency: "strong",
          }),
        });
      } catch {
        confirmation = { status: "pending" };
      }
    }
  } catch {
    return reply(
      { message: "Je aanvraag kon niet worden opgeslagen. Probeer opnieuw." },
      503,
    );
  }
  return reply({
    ok: true,
    id,
    bookingUrl: calendar,
    confirmation: confirmation.status,
  });
};
