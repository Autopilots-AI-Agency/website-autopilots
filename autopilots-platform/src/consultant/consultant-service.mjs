import { createHmac } from "node:crypto";
import { consultantContext, consultantVersion } from "./consultant-agent.mjs";

export const callConsentVersion = "ai-callback-2026-10-20";
export function normalizeCallbackPhone(value) {
  if (typeof value !== "string" || value.length > 32)
    throw new Error("invalid_phone");
  let phone = value.replace(/[\s().-]/g, "");
  if (/^06\d{8}$/.test(phone)) phone = "+31" + phone.slice(1);
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("invalid_phone");
  return phone;
}

// Internal service contract, not an anonymous HTTP endpoint. Supply durable,
// transactional repository/verification adapters before enabling in production.
export async function requestConsultantCall(input, deps) {
  const {
    policy,
    repository,
    verifyAssessment,
    verifyPhone,
    now = Date.now(),
  } = deps;
  if (
    !policy?.enabled ||
    !policy.organizationId ||
    !policy.approvalVersion ||
    !policy.hashSecret
  )
    throw new Error("calls_disabled");
  if (!/^[\w-]{16,80}$/.test(input.id || "")) throw new Error("invalid_id");
  if (input.consent !== true || input.consentVersion !== callConsentVersion)
    throw new Error("consent_required");
  const assessment = verifyAssessment(input.token);
  if (!Number.isFinite(assessment.expires) || assessment.expires <= now)
    throw new Error("expired_assessment");
  const context = consultantContext(assessment);
  const phone = normalizeCallbackPhone(input.phone);
  const proof = await verifyPhone(input.proof);
  if (
    !proof ||
    typeof proof.id !== "string" ||
    !proof.id ||
    !Number.isFinite(proof.expires) ||
    proof.phone !== phone ||
    proof.assessmentId !== assessment.id ||
    proof.organizationId !== policy.organizationId ||
    proof.expires <= now ||
    !Number.isFinite(proof.verifiedAt) ||
    proof.verifiedAt > now ||
    now - proof.verifiedAt > 300000
  )
    throw new Error("phone_verification_required");
  const phoneHash = createHmac("sha256", policy.hashSecret)
    .update(phone)
    .digest("hex");
  const call = {
    id: input.id,
    organizationId: policy.organizationId,
    assessmentId: assessment.id,
    phone,
    phoneHash,
    locale: assessment.locale,
    context,
    status: "queued",
    createdAt: now,
    expiresAt: Math.min(now + 300000, assessment.expires),
    consent: { version: callConsentVersion, at: now, proofId: proof.id },
    approvalVersion: policy.approvalVersion,
    agentVersion: consultantVersion,
    risk: "R3",
    usage: {
      provider: "telnyx",
      attempts: 0,
      cost: null,
      costStatus: "unknown",
    },
  };
  // MUST atomically enforce proof single-use, id/fingerprint conflict, one call per
  // assessment, phone/IP limits, suppression, allowed destinations and daily budget.
  return repository.admit(call, {
    proofId: proof.id,
    trustedIp: deps.trustedIp,
  });
}

export async function dispatchConsultantCall(id, deps) {
  const { repository, provider, now = Date.now() } = deps;
  const policy = await deps.currentPolicy();
  if (!policy.enabled) return { status: "disabled" };
  // claim must recheck suppression, expiration, authorization version and budget,
  // reserve maximum call cost, and persist dispatching BEFORE any provider request.
  const job = await repository.claim(id, policy, now);
  if (!job) return { status: "not_claimed" };
  if (job.expiresAt <= now || job.approvalVersion !== policy.approvalVersion)
    return repository.finish(id, { status: "cancelled" });
  let receipt;
  try {
    receipt = await provider.dial(job);
  } catch {
    // A network error does not prove no call was placed. Reconcile, never redial.
    return repository.finish(id, {
      status: "provider_unknown",
      retryAllowed: false,
    });
  }
  return repository.finish(id, {
    status: "provider_accepted",
    providerId: receipt.id,
    retryAllowed: false,
  });
}

export async function bookConsultantMeeting(input, deps) {
  // All scope comes from a verified call session, never the model's arguments.
  const session = await deps.authorizeSession();
  if (
    !session?.active ||
    input.confirmed !== true ||
    !input.slotId ||
    !input.timezone
  )
    throw new Error("booking_confirmation_required");
  const key = `booking:${session.organizationId}:${session.assessmentId}`;
  const previous = await deps.repository.booking(key);
  if (previous) return previous;
  const slot = await deps.calendar.resolveSlot(input.slotId, session);
  if (
    !slot ||
    slot.timezone !== input.timezone ||
    slot.calendarId !== session.calendarId
  )
    throw new Error("invalid_slot");
  if (!(await deps.repository.claimBooking(key, slot, session)))
    return { status: "pending" };
  try {
    if (!(await deps.calendar.isAvailable(slot)))
      return await deps.repository.finishBooking(key, { status: "conflict" });
    const event = await deps.calendar.create({
      slot,
      session,
      attendee: input.attendee,
      idempotencyKey: key,
    });
    if (!event?.id || event.calendarId !== session.calendarId)
      throw new Error("missing_receipt");
    return await deps.repository.finishBooking(key, {
      status: "confirmed",
      eventId: event.id,
      slot,
    });
  } catch {
    return deps.repository.finishBooking(key, {
      status: "unknown",
      retryAllowed: false,
    });
  }
}
