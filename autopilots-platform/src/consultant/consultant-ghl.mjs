// OS fixed account/calendar adapter. No model-provided calendar IDs.
// Requires a durable booking lock and a scoped contact resolved by the OS caller.
export function consultantGhlCalendar(config, fetchImpl = fetch) {
  async function request(path, method = "GET", body) {
    if (!config.token || !config.calendarId || !config.locationId)
      throw new Error("ghl_not_configured");
    const response = await fetchImpl(
      `https://services.leadconnectorhq.com${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          Version: "2021-04-15",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("ghl_request_failed");
    return response.json();
  }
  async function freeSlots({ start, end, timezone }) {
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 31 * 86400000
    )
      throw new Error("invalid_range");
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    if (!timezone) throw new Error("timezone_required");
    const query = new URLSearchParams({
      startDate: String(start),
      endDate: String(end),
      timezone,
    });
    const data = await request(
      `/calendars/${encodeURIComponent(config.calendarId)}/free-slots?${query}`,
    );
    return Object.entries(data)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .flatMap(([, day]) => (Array.isArray(day.slots) ? day.slots : []))
      .filter(
        (value) =>
          typeof value === "string" &&
          /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
          Number.isFinite(Date.parse(value)),
      );
  }
  return {
    freeSlots,
    async resolveContact({ name, email, phone }) {
      if (
        config.writesEnabled !== true ||
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.length > 100 ||
        typeof email !== "string" ||
        email.length > 160 ||
        !/^\S+@\S+\.\S+$/.test(email)
      )
        throw new Error("invalid_attendee");
      const data = await request("/contacts/upsert", "POST", {
        locationId: config.locationId,
        name: name.trim(),
        email,
        phone,
      });
      if (!data.contact?.id || data.contact.locationId !== config.locationId)
        throw new Error("ghl_contact_scope_mismatch");
      if (
        data.contact.dnd === true ||
        data.contact.dndSettings?.Call?.status === "active" ||
        data.contact.dndSettings?.call?.status === "active"
      )
        throw new Error("contact_suppressed");
      return data.contact.id;
    },
    async isAvailable(slot) {
      if (slot.calendarId !== config.calendarId)
        throw new Error("calendar_scope_mismatch");
      const start = Date.parse(slot.start);
      return (
        await freeSlots({
          start,
          end: start + 86400000,
          timezone: slot.timezone,
        })
      ).some((value) => Date.parse(value) === start);
    },
    async create({ slot, session }) {
      if (
        config.writesEnabled !== true ||
        session.organizationId !== config.organizationId ||
        session.calendarId !== config.calendarId ||
        session.locationId !== config.locationId ||
        slot.calendarId !== config.calendarId ||
        !session.contactId
      )
        throw new Error("ghl_write_not_authorized");
      const start = Date.parse(slot.start);
      const end = Date.parse(slot.end);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end - start !== config.durationMinutes * 60000
      )
        throw new Error("invalid_slot_duration");
      const data = await request("/calendars/events/appointments", "POST", {
        calendarId: config.calendarId,
        locationId: config.locationId,
        contactId: session.contactId,
        title: "Autopilots — kennismaking",
        startTime: slot.start,
        endTime: slot.end,
        appointmentStatus: "confirmed",
        ignoreDateRange: false,
        ignoreFreeSlotValidation: false,
        // GHL notifications/workflows must be reviewed before enabling this write.
        toNotify: true,
      });
      if (
        !data.id ||
        data.calendarId !== config.calendarId ||
        data.contactId !== session.contactId
      )
        throw new Error("ghl_receipt_mismatch");
      return { id: data.id, calendarId: data.calendarId };
    },
  };
}
