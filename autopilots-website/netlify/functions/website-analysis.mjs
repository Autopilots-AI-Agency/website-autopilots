import { analyze, websiteUrl } from "./_shared/website-analysis.mjs";
import { signAssessment } from "./_shared/assessment-token.mjs";
import { reserveAnalysis } from "./_shared/analysis-quota.mjs";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const cache = new Map();
let active = 0;
export default async (request, context) => {
  if (request.method !== "POST")
    return json({ message: "Methode niet toegestaan." }, 405);
  if (
    process.env.AUTOPILOTS_ANALYSIS_ENABLED !== "true" ||
    !process.env.OPENAI_API_KEY ||
    !process.env.ANALYSIS_SIGNING_SECRET
  )
    return json({ message: "De analyse is nog niet beschikbaar." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ message: "Ongeldige herkomst." }, 403);
  let input;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 65000)
      return json(
        { message: "Het bestand is te groot. Gebruik maximaal 50 KB." },
        413,
      );
    input = JSON.parse(body);
  } catch {
    return json({ message: "Ongeldige aanvraag." }, 400);
  }
  const id = request.headers.get("idempotency-key");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(id || "") || input.consent !== true)
    return json({ message: "Bevestig toestemming voor de analyse." }, 422);
  if (
    !input.answers ||
    typeof input.answers !== "object" ||
    Array.isArray(input.answers) ||
    JSON.stringify(input.answers).length > 6000
  )
    return json({ message: "Controleer je antwoorden." }, 422);
  const clean = {};
  for (const key of [
    "sector",
    "team",
    "goal",
    "channels",
    "volume",
    "systems",
    "timing",
  ]) {
    const value = input.answers[key];
    if (
      !(typeof value === "string" || Array.isArray(value)) ||
      JSON.stringify(value).length > 1000
    )
      return json({ message: "Vul alle stappen in." }, 422);
    clean[key] = value;
  }
  for (const key of [
    "focusRoute",
    "detailQuestion",
    "scaleQuestion",
    "systemsQuestion",
  ]) {
    if (
      typeof input.answers[key] === "string" &&
      input.answers[key].length < 250
    )
      clean[key] = input.answers[key];
  }
  if (input.uploadText) {
    if (typeof input.uploadText !== "string" || input.uploadText.length > 50000)
      return json(
        { message: "Gebruik een tekstbestand van maximaal 50 KB." },
        422,
      );
  } else if (input.noWebsite !== true) {
    try {
      websiteUrl(input.website || "");
    } catch (error) {
      return json({ message: error.message }, 422);
    }
  }
  const fingerprint = JSON.stringify({
    website: input.website,
    uploadText: input.uploadText,
    noWebsite: input.noWebsite === true,
    answers: clean,
  });
  const existing = cache.get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      return json(
        { message: "Deze aanvraag is gewijzigd. Start een nieuwe analyse." },
        409,
      );
    return (await existing.promise).clone();
  }
  if (active >= 2 || cache.size >= 25)
    return json(
      {
        message:
          "Er lopen nu meerdere analyses. Probeer het over enkele minuten opnieuw.",
      },
      429,
    );
  active++;
  const promise = (async () => {
    try {
      const { getStore } = await import("@netlify/blobs");
      let allowed;
      try {
        allowed = await reserveAnalysis({
          store: getStore({
            name: "autopilots-analysis-quota",
            consistency: "strong",
          }),
          ip: context?.ip,
          secret: process.env.ANALYSIS_SIGNING_SECRET,
          id,
        });
      } catch {
        return json(
          {
            message:
              "De scan is tijdelijk niet beschikbaar. Probeer later opnieuw.",
          },
          503,
        );
      }
      if (!allowed)
        return json(
          {
            message:
              "Het maximum aantal scans is bereikt. Probeer later opnieuw.",
          },
          429,
        );
      const result = await analyze({ ...input, answers: clean });
      const token = signAssessment({
        id,
        ...result,
        answers: clean,
        website: input.website || input.uploadName || "",
        expires: Date.now() + 60 * 60 * 1000,
      });
      return json({ ok: true, id, ...result, token });
    } catch (error) {
      return json(
        { ok: false, message: error.message || "Analyse niet beschikbaar." },
        502,
      );
    } finally {
      active--;
    }
  })();
  cache.set(id, { fingerprint, promise });
  const timeout = setTimeout(() => cache.delete(id), 15 * 60 * 1000);
  timeout.unref?.();
  return (await promise).clone();
};
