# Scan backend — development integration

Service: 09a06d8f-ad23-4ee4-9940-4674176e96bc
Workflow: ca1a680d-59b0-42ad-b85a-6c701e57c830 (published v1)

## Scope and gates
This is the first intake-only API slice, NOT the complete website migration. Development is enabled; production SCAN_ENABLED=false. No production deployment or DNS change has taken place. Do not wire the existing public funnel to this service until website-source extraction, complete quiz-field mapping, consent copy, existing signed assessment/email/consultant contracts, per-client abuse limits, retention cleanup, browser recovery and release checks are complete. No calls or emails are sent by these routes.

## Contract
POST /scans: locale (nl/en/de/fr/es/it), industry, goal, focusRoute (ai/software/website/combined), optional systems and channels. Headers Idempotency-Key (UUID) and X-Scan-Token (cryptographically random 32+ bytes in base64url; never a user password or service credential). The same token and UUID recover the same job; changed input with the same UUID returns 409. Only the token hash is stored. GET /scans/:id requires the same token and returns the stored result only after schema validation. Results expire for reads after 7 days. Physical deletion remains a release gate.

## Safety and cost
Factory-scoped PostgreSQL tables scan_jobs, scan_daily_budget, scan_audit; parameterized values. A global transaction lock serializes admission; USD 0.10 reserved per attempted run, daily maximum USD 10 UTC, no refunds for uncertain submissions. Each day's initial USD 0.10 is held as conservative headroom for the earlier manual test. This budget covers this backend only; direct Studio executions are separate and must be included in operational spending. Three active jobs maximum. Production remains disabled until rate-limiting/abuse checks are added.

A transport failure can occur after paid admission: mark submission_unknown and reconcile manually using runName scan-<UUID>; never blindly submit again. Restarted workers read stored run IDs and idempotently persist terminal results. Submitting rows left by a crash also require manual reconciliation; do not clear or resubmit them automatically.

## Credential
WORKFLOW_API_KEY binds the stored Rumata secret (never source). Key expiry 2027-01-21; renew before then. Workflow Public/All Rumata users have no access; API-key factory group has only Execute and Deep read. No own OpenAI or n8n key is needed for native AI generation. JWT guard remains intact for other protected routes.

## Verified 2026-10-21
- Typecheck passed; 33 tests passed, one unrelated native-account DB test skipped.
- Real POST accepted job 591d6ef0-9377-4a11-8228-fe5fdbef421b; workflow run 44854bab-6eaa-4ea4-a0f2-eb14e26ea8b2 succeeded.
- Repeating POST produced no extra workflow run (run listing total 2 includes the earlier manual test).
- Wrong capability returned 404.
- Managed backend stop/start completed; GET recovered the successful persisted Dutch advice after restart.

## Rollback
Keep existing Netlify production unchanged. Stop the development backend if needed. Do not delete persisted jobs or budget rows to retry tests; they prevent duplicate paid execution. This file supersedes the prior permission-blocker note, which is retained as historical evidence.
