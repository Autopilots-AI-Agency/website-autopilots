import bindings from "../../../rumata.backends.json" with { type: "json" };

const base = bindings.VITE_AUTOPILOTS_SCAN_URL.production;
const scanId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const capability = /^[A-Za-z0-9_-]{43}$/;

export function validRumataScan(id, token) {
  return scanId.test(id || "") && capability.test(token || "");
}

export function rumataIntake(input, answers) {
  return {
    locale: input.locale,
    website: input.website || "",
    noWebsite: input.noWebsite === true,
    consent: true,
    answers,
    industry: String(answers.sector || ""),
    goal: Array.isArray(answers.goal) ? answers.goal.join("; ") : answers.goal,
    focusRoute: answers.focusRoute || "combined",
    systems: Array.isArray(answers.systems)
      ? answers.systems.join("; ")
      : answers.systems,
    channels: Array.isArray(answers.channels) ? answers.channels : [],
  };
}

export async function requestRumataScan({ id, token, intake }) {
  const submitting = intake !== undefined;
  const response = await fetch(
    new URL(submitting ? "scans" : `scans/${id}`, base),
    {
      method: submitting ? "POST" : "GET",
      headers: {
        "x-scan-token": token,
        ...(submitting
          ? { "content-type": "application/json", "idempotency-key": id }
          : {}),
      },
      ...(submitting ? { body: JSON.stringify(intake) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    const status = [400, 404, 409, 422, 429].includes(response.status)
      ? response.status
      : 503;
    return { status };
  }
  return { status: response.status, scan: await response.json() };
}
