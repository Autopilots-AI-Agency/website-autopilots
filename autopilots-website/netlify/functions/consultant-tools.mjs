import {
  runConsultant,
  readJson,
  reply,
  failure,
} from "./_shared/consultant-n8n.mjs";

export default async function (request) {
  if (request.method !== "POST") return reply({ ok: false }, 405);
  const action = new URL(request.url).searchParams.get("action");
  if (!["availability", "book", "suppress"].includes(action))
    return reply({ ok: false }, 404);
  try {
    return reply(
      await runConsultant(action, {
        session: request.headers.get("X-Consultant-Session"),
        parameters: await readJson(request),
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
