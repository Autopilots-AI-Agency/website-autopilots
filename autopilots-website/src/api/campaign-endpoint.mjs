export function campaignEndpoint(path, base = "") {
  if (!["/api/funnel-lead", "/api/funnel-event"].includes(path)) {
    throw new Error("Unsupported campaign endpoint");
  }
  if (!base) return path;
  const normalized = base.replace(/\/$/, "");
  if (!/^\/backend-api\/[a-f0-9-]{36}$/.test(normalized) &&
      !/^https:\/\/[a-z0-9.-]+\/(?:backend-api|backend-preview)\/[a-f0-9-]{36}$/.test(normalized)) {
    throw new Error("Invalid managed backend binding");
  }
  return normalized + path;
}
