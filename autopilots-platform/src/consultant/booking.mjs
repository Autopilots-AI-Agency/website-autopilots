import { capability } from "./security.mjs";

export function consultantBooking(config, store, calendar, clock = Date.now) {
  function authorized(job) {
    if (
      !config.enabled ||
      !config.bookingEnabled ||
      job.organizationId !== config.organizationId ||
      job.approvalVersion !== config.approvalVersion ||
      store.get("suppression", job.phoneHash)
    )
      throw new Error("booking_disabled");
  }
  return {
    async availability(job, input) {
      authorized(job);
      if (typeof input.timezone !== "string" || !input.timezone)
        throw new Error("timezone_required");
      new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format();
      const start = Date.parse(input.start);
      if (
        !Number.isFinite(start) ||
        start < clock() - 60000 ||
        start > clock() + 30 * 86400000
      )
        throw new Error("invalid_range");
      store.transaction(() => {
        const id = job.id + ":availability";
        const previous = store.get("tool_usage", id);
        const recent = previous?.createdAt > clock() - 60000;
        if (recent && previous.count >= 3) throw new Error("rate_limited");
        store.put("tool_usage", {
          id,
          organizationId: config.organizationId,
          status: "requested",
          createdAt: recent ? previous.createdAt : clock(),
          count: recent ? previous.count + 1 : 1,
          risk: "R1",
          cost: null,
        });
      });
      const values = await calendar.freeSlots({
        start,
        end: start + 7 * 86400000,
        timezone: input.timezone,
      });
      const slots = values
        .filter(
          (value) =>
            Date.parse(value) > clock() &&
            Date.parse(value) >= start &&
            Date.parse(value) < start + 7 * 86400000,
        )
        .slice(0, 8)
        .map((value) => ({
          id: capability(),
          organizationId: config.organizationId,
          callId: job.id,
          status: "offered",
          createdAt: clock(),
          expiresAt: clock() + 300000,
          calendarId: config.calendarId,
          start: value,
          end: new Date(Date.parse(value) + 1800000).toISOString(),
          timezone: input.timezone,
        }));
      store.transaction(() => slots.forEach((slot) => store.put("slot", slot)));
      return {
        durationMinutes: 30,
        timezone: input.timezone,
        slots: slots.map((s) => ({
          slotId: s.id,
          start: s.start,
          timezone: s.timezone,
        })),
        instruction:
          "Ask the caller to confirm date, local time and timezone before booking.",
      };
    },
    async book(job, input) {
      authorized(job);
      if (
        input.confirmed !== true ||
        typeof input.name !== "string" ||
        input.name.trim().length < 2 ||
        input.name.length > 100 ||
        typeof input.email !== "string" ||
        input.email.length > 160 ||
        !/^\S+@\S+\.\S+$/.test(input.email)
      )
        throw new Error("booking_confirmation_required");
      const admitted = store.transaction(() => {
        const previous = store.get("booking", job.assessmentId);
        if (previous) return { previous };
        const slot = store.get("slot", input.slotId);
        if (
          !slot ||
          slot.callId !== job.id ||
          slot.expiresAt <= clock() ||
          slot.timezone !== input.timezone ||
          slot.calendarId !== config.calendarId
        )
          throw new Error("invalid_slot");
        const lockId = config.calendarId + ":" + Date.parse(slot.start);
        if (store.get("slot_lock", lockId)) throw new Error("slot_unavailable");
        store.put("slot_lock", {
          id: lockId,
          organizationId: config.organizationId,
          status: "held",
          createdAt: clock(),
          assessmentId: job.assessmentId,
        });
        const booking = {
          id: job.assessmentId,
          organizationId: config.organizationId,
          status: "pending",
          createdAt: clock(),
          callId: job.id,
          slot,
          approvalVersion: config.approvalVersion,
          risk: "R3",
          usage: { cost: null },
          confirmation: {
            at: clock(),
            name: input.name,
            email: input.email,
            timezone: input.timezone,
          },
        };
        store.put("booking", booking);
        return { booking };
      });
      function receipt(b) {
        return {
          status: b.status,
          ...(b.status === "confirmed"
            ? {
                eventId: b.eventId,
                start: b.slot.start,
                timezone: b.slot.timezone,
                durationMinutes: 30,
              }
            : {
                instruction:
                  "Do not claim this appointment is confirmed. Use the booking page if needed. Do not repeat the booking request.",
              }),
        };
      }
      if (admitted.previous) return receipt(admitted.previous);
      const b = admitted.booking;
      try {
        if (!(await calendar.isAvailable(b.slot))) {
          const conflict = { ...b, status: "conflict" };
          store.transaction(() => store.put("booking", conflict));
          return receipt(conflict);
        }
        authorized(job);
        const contactId = await calendar.resolveContact({
          name: input.name,
          email: input.email,
          phone: job.phone,
        });
        authorized(job);
        const event = await calendar.create({
          slot: b.slot,
          session: {
            organizationId: config.organizationId,
            calendarId: config.calendarId,
            locationId: config.locationId,
            contactId,
          },
        });
        if (!event?.id || event.calendarId !== config.calendarId)
          throw new Error("missing_receipt");
        const confirmed = {
          ...b,
          status: "confirmed",
          eventId: event.id,
          contactId,
        };
        store.transaction(() => store.put("booking", confirmed));
        return receipt(confirmed);
      } catch {
        const unknown = { ...b, status: "unknown" };
        store.transaction(() => store.put("booking", unknown));
        return receipt(unknown);
      }
    },
  };
}
