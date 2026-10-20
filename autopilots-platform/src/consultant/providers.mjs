export function telnyxVerification(config, fetchImpl = fetch) {
  async function request(path, body) {
    if (!config.apiKey || !config.verifyProfileId)
      throw new Error("verification_unavailable");
    const response = await fetchImpl("https://api.telnyx.com/v2" + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("verification_provider_error");
    return (await response.json()).data;
  }
  return {
    async start(phone) {
      const data = await request("/verifications/sms", {
        phone_number: phone,
        verify_profile_id: config.verifyProfileId,
        timeout_secs: 300,
      });
      if (!data?.id || data.status !== "pending" || data.phone_number !== phone)
        throw new Error("verification_receipt_mismatch");
      return { id: data.id };
    },
    async check(id, code, phone) {
      const data = await request(
        `/verifications/${encodeURIComponent(id)}/actions/verify`,
        { code },
      );
      return data?.response_code === "accepted" && data.phone_number === phone;
    },
  };
}

// Read provider status rather than trusting unauthenticated TeXML form callbacks.
export function telnyxCallReader(config, fetchImpl = fetch) {
  return {
    async status(id) {
      const r = await fetchImpl(
        `https://api.telnyx.com/v2/texml/Accounts/${encodeURIComponent(config.accountId)}/Calls/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok) throw new Error("status_unavailable");
      const data = await r.json();
      if (data.sid !== id) throw new Error("status_receipt_mismatch");
      return data.status;
    },
  };
}
