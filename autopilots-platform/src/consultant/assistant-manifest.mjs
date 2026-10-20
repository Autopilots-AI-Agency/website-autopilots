import {
  consultantLanguages,
  consultantInstructions,
  consultantVersion,
} from "./consultant-agent.mjs";

// Pure configuration builder. No provider writes, no number rebinding, no calls.
export function assistantManifest(locale, { serviceUrl, voice, model, transport = "server" }) {
  const language = consultantLanguages[locale];
  if (!language || !voice || !model)
    throw new Error("verified_model_and_voice_required");
  const origin = new URL(serviceUrl);
  if (origin.protocol !== "https:" || origin.username || origin.password)
    throw new Error("invalid_service");
  function tool(name, description, properties, required) {
    return {
      type: "webhook",
      webhook: {
        name,
        description,
        url: new URL(transport === "n8n" ? "/.netlify/functions/consultant-tools?action=" + name : "/tools/" + name, origin).href,
        method: "POST",
        async: false,
        headers: [{ name: "X-Consultant-Session", value: "{{tool_token}}" }],
        body_parameters: { type: "object", properties, required },
      },
    };
  }
  return {
    name: `Autopilots Quiz Consultant ${locale.toUpperCase()} ${consultantVersion}`,
    model,
    instructions: consultantInstructions(locale),
    greeting: language.greeting,
    voice_settings: { voice },
    tools: [
      tool(
        "availability",
        "Get available 30-minute introductions with Tim. Ask the caller for their timezone first.",
        {
          start: {
            type: "string",
            description:
              "ISO 8601 timestamp, current time or the date requested by the caller.",
          },
          timezone: {
            type: "string",
            description: "Confirmed IANA timezone, e.g. Europe/Amsterdam.",
          },
        },
        ["start", "timezone"],
      ),
      tool(
        "book",
        "Book only after caller confirms the offered date, time, timezone and invitation details. Never retry unknown/pending outcomes.",
        {
          slotId: { type: "string" },
          timezone: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          confirmed: { type: "boolean" },
        },
        ["slotId", "timezone", "name", "email", "confirmed"],
      ),
      tool(
        "suppress",
        "Respect a request not to be called again. Suppress further consultant callbacks.",
        {},
        [],
      ),
      {
        type: "hangup",
        hangup: {
          description:
            "End politely when done, declined, wrong person, voicemail or no response.",
        },
      },
    ],
  };
}
