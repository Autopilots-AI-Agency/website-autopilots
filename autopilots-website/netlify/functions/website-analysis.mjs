import { analyze, websiteUrl } from "./_shared/website-analysis.mjs";
import { signAssessment } from "./_shared/assessment-token.mjs";
import { reserveAnalysis } from "./_shared/analysis-quota.mjs";
import { scanLocale, scanLocales, scanError } from "./_shared/intake-i18n.mjs";
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
  let locale = scanLocale(request.headers.get("x-autopilots-locale"));
  const reply = (body, status = 200) =>
    json(
      body.message
        ? { ...body, message: scanError(body.message, locale) }
        : body,
      status,
    );
  if (request.method !== "POST")
    return reply({ message: "Methode niet toegestaan." }, 405);
  if (
    process.env.AUTOPILOTS_ANALYSIS_ENABLED !== "true" ||
    !process.env.OPENAI_API_KEY ||
    !process.env.ANALYSIS_SIGNING_SECRET
  )
    return reply({ message: "De analyse is nog niet beschikbaar." }, 503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return reply({ message: "Ongeldige herkomst." }, 403);
  let input;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 65000)
      return reply(
        { message: "Het bestand is te groot. Gebruik maximaal 50 KB." },
        413,
      );
    input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return reply({ message: "Ongeldige aanvraag." }, 400);
  } catch {
    return reply({ message: "Ongeldige aanvraag." }, 400);
  }
  const id = request.headers.get("idempotency-key");
  if (input.locale !== undefined && !scanLocales.includes(input.locale))
    return reply({ message: "Ongeldige aanvraag." }, 422);
  locale = scanLocale(input.locale ?? locale);
  input.locale = locale;
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(id || "") || input.consent !== true)
    return reply({ message: "Bevestig toestemming voor de analyse." }, 422);
  if (
    !input.answers ||
    typeof input.answers !== "object" ||
    Array.isArray(input.answers) ||
    JSON.stringify(input.answers).length > 6000
  )
    return reply({ message: "Controleer je antwoorden." }, 422);
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
      return reply({ message: "Vul alle stappen in." }, 422);
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
      return reply(
        { message: "Gebruik een tekstbestand van maximaal 50 KB." },
        422,
      );
  } else if (input.noWebsite !== true) {
    try {
      websiteUrl(input.website || "");
    } catch (error) {
      return reply({ message: error.message }, 422);
    }
  }
  const fingerprint = JSON.stringify({
    locale,
    website: input.website,
    uploadText: input.uploadText,
    noWebsite: input.noWebsite === true,
    answers: clean,
  });
  const existing = cache.get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      return reply(
        { message: "Deze aanvraag is gewijzigd. Start een nieuwe analyse." },
        409,
      );
    return (await existing.promise).clone();
  }
  if (active >= 2 || cache.size >= 25)
    return reply(
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
        return reply(
          {
            message:
              "De scan is tijdelijk niet beschikbaar. Probeer later opnieuw.",
          },
          503,
        );
      }
      if (!allowed)
        return reply(
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
      return reply({ ok: true, id, ...result, token });
    } catch (error) {
      return reply(
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
