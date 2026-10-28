// Only read-only probes are retried. A scan, email, SMS or call is never replayed.
export function createBackendReadiness({
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  totalTimeoutMs = 120000,
  requestTimeoutMs = 15000,
  retryDelayMs = 500,
  cacheMs = 30000,
} = {}) {
  const states = new Map();
  return async (base) => {
    if (!base) return;
    const normalized = base.replace(/\/$/, "");
    const existing = states.get(normalized);
    if (existing?.pending) return existing.pending;
    if (existing && existing.readyUntil > now()) return;
    const state = { readyUntil: 0, pending: null };
    states.set(normalized, state);
    state.pending = (async () => {
      const deadline = now() + totalTimeoutMs;
      while (now() < deadline) {
        try {
          const response = await fetchImpl(normalized + "/health", {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(requestTimeoutMs, deadline - now())),
            ),
          });
          if (response.ok && (await response.json()).status === "ready") {
            state.readyUntil = now() + cacheMs;
            return;
          }
        } catch {
          // A timed-out probe can still wake the service. Never send a write yet.
        }
        if (now() < deadline)
          await delay(Math.min(retryDelayMs, deadline - now()));
      }
      throw new Error("backend_not_ready");
    })()
      .catch((error) => {
        if (states.get(normalized) === state) states.delete(normalized);
        throw error;
      })
      .finally(() => {
        state.pending = null;
      });
    return state.pending;
  };
}

export const ensureBackendReady = createBackendReadiness();
