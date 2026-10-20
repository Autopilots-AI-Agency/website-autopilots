import { capability, digest, same, assessmentToken } from "./security.mjs";
import {
  callConsentVersion,
  normalizeCallbackPhone,
  requestConsultantCall,
  dispatchConsultantCall,
} from "./consultant-service.mjs";

// Human-approved pilot ceiling, 2026-10-20. Raising an environment value
// cannot expand this approval; a higher ceiling requires a reviewed change.
export const pilotBudget = Object.freeze({ currency: "USD", dailyCents: 1000 });

export function createConsultantRuntime(
  config,
  store,
  providers,
  clock = Date.now,
) {
  const org = config.organizationId;
  const hash = (value) => digest(config.hashSecret, value);
  const enabled = () =>
    config.enabled === true &&
    !!config.approvalVersion &&
    config.budgetCurrency === pilotBudget.currency &&
    config.dailyBudgetCents <= pilotBudget.dailyCents &&
    [config.dailyBudgetCents, config.maxCallCents, config.maxSmsCents].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) &&
    providers.ready === true;
  function policy() {
    return { ...config, enabled: enabled() };
  }
  function assessment(token) {
    const a = assessmentToken(token, config.assessmentSecret, clock());
    if (!a.id || !["nl", "en", "es", "de", "it", "fr"].includes(a.locale))
      throw new Error("invalid_assessment");
    return a;
  }
  function allowed(phone) {
    if (!enabled()) throw new Error("calls_disabled");
    // Pilot is allowlist-only. Broad country activation is a separate release decision.
    if (!config.allowedPhones?.includes(phone))
      throw new Error("destination_not_enabled");
    if (store.get("suppression", hash(phone)))
      throw new Error("calls_suppressed");
  }
  function budget(cents) {
    // Rolling 24h prevents a second full allowance immediately after midnight.
    const start = clock() - 86400000;
    const usage = store.list("usage").filter((x) => x.createdAt >= start);
    if (
      usage.some(
        (x) =>
          x.currency !== pilotBudget.currency ||
          !Number.isSafeInteger(x.reservedCents) ||
          x.reservedCents <= 0,
      )
    )
      throw new Error("usage_review_required");
    const reserved = usage.reduce((sum, x) => sum + x.reservedCents, 0);
    if (reserved + cents > config.dailyBudgetCents)
      throw new Error("daily_limit");
  }
  function reserve(id, cents, type) {
    budget(cents);
    store.put("usage", {
      id,
      organizationId: org,
      status: "reserved",
      createdAt: clock(),
      reservedCents: cents,
      currency: pilotBudget.currency,
      actualCost: null,
      type,
      risk: "R3",
      approvalVersion: config.approvalVersion,
    });
  }
  function challenge(id, key) {
    const c = store.get("challenge", id);
    if (!c || !same(c.keyHash, hash(key || "")) || c.expiresAt <= clock())
      throw new Error("verification_expired");
    return c;
  }
  const repository = {
    admit(call, { proofId }) {
      return store.transaction(() => {
        const old = store.get("call", call.id);
        if (old) {
          if (
            old.assessmentId !== call.assessmentId ||
            old.phone !== call.phone
          )
            throw new Error("id_conflict");
          return old;
        }
        allowed(call.phone);
        const proof = store.get("challenge", proofId);
        if (!proof || proof.status !== "verified" || proof.used)
          throw new Error("phone_verification_required");
        if (
          store.list("call").some((x) => x.assessmentId === call.assessmentId)
        )
          throw new Error("already_requested");
        if (
          store
            .list("call")
            .filter(
              (x) =>
                x.phoneHash === call.phoneHash &&
                x.createdAt > clock() - 86400000,
            ).length >= 2
        )
          throw new Error("daily_limit");
        if (
          store.list("call").filter((x) => x.createdAt > clock() - 86400000)
            .length >= 10
        )
          throw new Error("daily_limit");
        reserve(`call:${call.id}`, config.maxCallCents, "call");
        store.put("challenge", { ...proof, used: true });
        return store.put("call", {
          ...call,
          statusKey: capability(),
          toolToken: capability(),
        });
      });
    },
    claim(id, p, now) {
      return store.transaction(() => {
        const job = store.get("call", id);
        if (!job || job.status !== "queued") return null;
        if (
          !p.enabled ||
          job.expiresAt <= now ||
          job.approvalVersion !== p.approvalVersion ||
          store.get("suppression", job.phoneHash)
        ) {
          store.put("call", { ...job, status: "cancelled" });
          return null;
        }
        allowed(job.phone);
        if (
          store
            .list("call")
            .some(
              (x) =>
                x.id !== id &&
                [
                  "dispatching",
                  "provider_accepted",
                  "ringing",
                  "in-progress",
                  "provider_unknown",
                ].includes(x.status) &&
                x.createdAt > now - 600000,
            )
        )
          return null;
        return store.put("call", {
          ...job,
          status: "dispatching",
          dispatchAt: now,
          usage: { ...job.usage, attempts: 1 },
        });
      });
    },
    finish(id, patch) {
      return store.transaction(() =>
        store.put("call", { ...store.get("call", id), ...patch }),
      );
    },
  };
  let ticking = false;
  return {
    ready: enabled,
    async start(input, ip) {
      const a = assessment(input.token);
      const phone = normalizeCallbackPhone(input.phone);
      if (input.consent !== true || input.consentVersion !== callConsentVersion)
        throw new Error("consent_required");
      if (!/^[\w-]{16,80}$/.test(input.id || "") || !ip)
        throw new Error("invalid_request");
      const key = capability();
      const fingerprint = hash(`${a.id}:${phone}:${ip}`);
      const admission = store.transaction(() => {
        const previous = store.get("challenge", input.id);
        if (previous) {
          if (previous.fingerprint !== fingerprint)
            throw new Error("id_conflict");
          return { previous };
        }
        allowed(phone);
        const recent = store
          .list("challenge")
          .filter((x) => x.createdAt > clock() - 3600000);
        if (
          recent.filter((x) => x.ipHash === hash(ip)).length >= 5 ||
          recent.filter((x) => x.phoneHash === hash(phone)).length >= 3
        )
          throw new Error("rate_limited");
        reserve(`sms:${input.id}`, config.maxSmsCents, "verification");
        const c = {
          id: input.id,
          organizationId: org,
          status: "sending",
          createdAt: clock(),
          expiresAt: clock() + 300000,
          phone,
          phoneHash: hash(phone),
          ipHash: hash(ip),
          assessmentId: a.id,
          fingerprint,
          keyHash: hash(key),
          key,
          attempts: 0,
          approvalVersion: config.approvalVersion,
        };
        store.put("challenge", c);
        return { created: c };
      });
      if (admission.previous) {
        const c = admission.previous;
        if (c.status !== "pending" || c.expiresAt <= clock())
          throw new Error("verification_unavailable");
        return { id: c.id, key: c.key, status: "pending" };
      }
      try {
        const receipt = await providers.verification.start(phone);
        store.transaction(() =>
          store.put("challenge", {
            ...admission.created,
            status: "pending",
            providerId: receipt.id,
          }),
        );
        return { id: input.id, key, status: "pending" };
      } catch {
        store.transaction(() =>
          store.put("challenge", {
            ...admission.created,
            status: "provider_unknown",
          }),
        );
        throw new Error("verification_unavailable");
      }
    },
    async verify(input) {
      const c = store.transaction(() => {
        const c = challenge(input.id, input.key);
        allowed(c.phone);
        if (c.status === "verified") return c;
        if (
          c.status !== "pending" ||
          c.attempts >= 5 ||
          !/^\d{4,10}$/.test(input.code || "")
        )
          throw new Error("invalid_verification");
        return store.put("challenge", {
          ...c,
          status: "checking",
          attempts: c.attempts + 1,
        });
      });
      if (c.status === "verified") return { verified: true };
      let valid = false;
      try {
        valid = await providers.verification.check(
          c.providerId,
          input.code,
          c.phone,
        );
      } catch {
        /* user can retry code, not the SMS */
      }
      store.transaction(() =>
        store.put("challenge", {
          ...c,
          status: valid ? "verified" : "pending",
          ...(valid ? { verifiedAt: clock() } : {}),
        }),
      );
      if (!valid) throw new Error("invalid_verification");
      return { verified: true };
    },
    async call(input, ip) {
      const a = assessment(input.token);
      const c = challenge(input.challengeId, input.key);
      if (c.assessmentId !== a.id) throw new Error("assessment_mismatch");
      const job = await requestConsultantCall(
        { ...input, phone: c.phone, proof: c.id },
        {
          policy: policy(),
          repository,
          verifyAssessment: () => a,
          trustedIp: ip,
          now: clock(),
          verifyPhone: () =>
            c.status === "verified"
              ? {
                  id: c.id,
                  expires: c.expiresAt,
                  phone: c.phone,
                  assessmentId: c.assessmentId,
                  organizationId: org,
                  verifiedAt: c.verifiedAt,
                }
              : null,
        },
      );
      return { id: job.id, key: job.statusKey, status: job.status };
    },
    status(input) {
      const job = store.get("call", input.id);
      if (!job || !same(job.statusKey, input.key)) throw new Error("not_found");
      return {
        id: job.id,
        status: job.status,
        booking: store.get("booking", job.assessmentId)?.status || null,
      };
    },
    async tick() {
      if (ticking) return;
      ticking = true;
      try {
        for (const job of store.list("call")) {
          if (job.status === "queued" && !enabled()) {
            repository.finish(job.id, { status: "cancelled" });
            continue;
          }
          if (job.status === "queued")
            await dispatchConsultantCall(job.id, {
              repository,
              provider: providers.calls,
              currentPolicy: policy,
              now: clock(),
            });
          else if (
            job.status === "dispatching" &&
            job.dispatchAt < clock() - 60000
          )
            repository.finish(job.id, { status: "provider_unknown" });
          else if (
            ["provider_accepted", "ringing", "in-progress"].includes(
              job.status,
            ) &&
            providers.reader
          ) {
            try {
              const status = await providers.reader.status(job.providerId);
              if (
                [
                  "ringing",
                  "in-progress",
                  "completed",
                  "busy",
                  "failed",
                  "no-answer",
                  "canceled",
                ].includes(status) &&
                !(job.status === "in-progress" && status === "ringing")
              )
                repository.finish(job.id, { status });
            } catch {
              /* retain last verified status; never invent an outcome */
            }
          }
        }
        store.prune(clock());
      } finally {
        ticking = false;
      }
    },
    authorizeTool(token) {
      if (!enabled() || typeof token !== "string" || token.length < 32)
        throw new Error("unauthorized");
      const job = store.list("call").find((x) => same(x.toolToken, token));
      if (
        !job ||
        ![
          "dispatching",
          "provider_accepted",
          "ringing",
          "in-progress",
        ].includes(job.status) ||
        clock() > job.createdAt + 900000 ||
        job.approvalVersion !== config.approvalVersion
      )
        throw new Error("unauthorized");
      return job;
    },
    suppress(job) {
      store.transaction(() => {
        if (store.get("suppression", job.phoneHash)) return;
        store.put("suppression", {
          id: job.phoneHash,
          idempotencyKey: `suppress:${job.phoneHash}`,
          organizationId: org,
          status: "suppressed",
          createdAt: clock(),
          risk: "R1",
          usage: { providerRequests: 0, cost: 0, currency: "USD" },
          approvalVersion: job.approvalVersion,
          source: "consultant_refusal",
        });
      });
      return { status: "suppressed" };
    },
  };
}
