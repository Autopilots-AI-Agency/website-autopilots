import {
  n8nConfiguration,
  connectionReady,
  ticketStore,
  readJson,
  reply,
  failure,
} from "./_shared/consultant-n8n.mjs";

// n8n exchanges a one-use 60s capability for a fixed provider operation.
// Never accepts a provider URL, phone, account or credential from the caller.
export default async function (request) {
  if (request.method !== "POST") return reply({ ok: false }, 405);
  try {
    const config = n8nConfiguration();
    if (!connectionReady(config)) throw new Error("calls_disabled");
    return reply(await ticketStore(config).claim(await readJson(request)));
  } catch (e) {
    return failure(e);
  }
}
