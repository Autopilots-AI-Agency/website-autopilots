import { tokenMatches } from "../../../autopilots-platform/src/consultant/n8n-executor.mjs";
import { runConsultant, reply, failure } from "./_shared/consultant-n8n.mjs";

// Called by the isolated n8n schedule, not by a visitor. No call payload accepted.
export default async function (request) {
  if (request.method !== "POST") return reply({ ok: false }, 405);
  if (
    !tokenMatches(
      request.headers.get("X-Consultant-Worker"),
      process.env.CONSULTANT_WORKER_KEY,
    )
  )
    return reply({ ok: false }, 401);
  try {
    return reply(await runConsultant("tick", {}));
  } catch (e) {
    return failure(e);
  }
}
