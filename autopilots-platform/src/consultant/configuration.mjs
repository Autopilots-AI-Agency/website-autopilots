// Shared configuration: no server, SQLite or provider side effects on import.
export function configuration(env = process.env) {
  const assistants = JSON.parse(env.CONSULTANT_ASSISTANTS_JSON || "{}");
  return {
    enabled: env.CONSULTANT_ENABLED === "true",
    organizationId: env.CONSULTANT_ORGANIZATION_ID,
    approvalVersion: env.CONSULTANT_APPROVAL_VERSION,
    hashSecret: env.CONSULTANT_HASH_SECRET,
    assessmentSecret: env.ANALYSIS_SIGNING_SECRET,
    bridgeSecret: env.CONSULTANT_BRIDGE_SECRET,
    dailyBudgetCents: Number(env.CONSULTANT_DAILY_BUDGET_CENTS || 0),
    budgetCurrency: env.CONSULTANT_BUDGET_CURRENCY,
    maxCallCents: Number(env.CONSULTANT_MAX_CALL_CENTS || 0),
    maxSmsCents: Number(env.CONSULTANT_MAX_SMS_CENTS || 0),
    allowedPhones: (env.CONSULTANT_ALLOWED_PHONES || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    apiKey: env.TELNYX_API_KEY,
    verifyProfileId: env.TELNYX_VERIFY_PROFILE_ID,
    accountId: env.TELNYX_ACCOUNT_ID,
    connectionId: env.CONSULTANT_TEXML_CONNECTION_ID,
    from: env.CONSULTANT_FROM,
    callbackUrl: env.CONSULTANT_STATUS_CALLBACK_URL,
    assistants,
    bookingEnabled: env.CONSULTANT_BOOKING_ENABLED === "true",
    token: env.GHL_API_TOKEN,
    locationId: env.CONSULTANT_GHL_LOCATION_ID,
    calendarId: env.CONSULTANT_GHL_CALENDAR_ID,
    durationMinutes: 30,
    writesEnabled: env.CONSULTANT_BOOKING_ENABLED === "true",
  };
}
