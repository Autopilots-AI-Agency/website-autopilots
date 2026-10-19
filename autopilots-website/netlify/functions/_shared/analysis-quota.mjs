import { createHmac } from "node:crypto";

// Atomic, shared reservations. Failed analyses consume their reservation too.
// Never fall back to an in-memory limit when the shared store is unavailable.
async function reserve(store, prefix, limit, evidence) {
  for (let slot = 0; slot < limit; slot++) {
    const result = await store.setJSON(`${prefix}/${slot}`, evidence, {
      onlyIfNew: true,
    });
    if (result.modified === true) return true;
  }
  return false;
}

export async function reserveAnalysis({
  store,
  ip,
  secret,
  id,
  now = Date.now(),
}) {
  if (!ip || !secret) throw new Error("Missing trusted quota context");
  const day = new Date(now).toISOString().slice(0, 10);
  const hour = Math.floor(now / 3600000);
  const visitor = createHmac("sha256", secret)
    .update(`${day}:${ip}`)
    .digest("hex");
  const evidence = {
    requestId: id,
    reservedAt: new Date(now).toISOString(),
    risk: "R1",
    usage: { analysisAttempts: 1 },
  };
  if (!(await reserve(store, `visitor/${hour}/${visitor}`, 3, evidence)))
    return false;
  return reserve(store, `global/${day}`, 50, evidence);
}
