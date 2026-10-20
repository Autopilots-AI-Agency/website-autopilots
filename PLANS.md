# Autopilots OS Execution Plan

Status labels: `verified`, `inferred`, `proposed`, `blocked`.

## Isolated website consultant boundary — 2026-10-20

This file's OS milestones below are historical, not a competing execution mandate.
The active shared backend/Finance scope remains the primary workspace's
`BUILD_PLAN.md`; this website branch does not migrate or deploy that platform.

For the isolated quiz consultant, the current source of truth and activation
checklist is `autopilots-platform/src/consultant/n8n/README.md`.
Tim selected the existing n8n and Telnyx accounts, the existing own GoHighLevel
calendar, and a USD 10 rolling-24-hour private test ceiling. No new Render service.
Netlify hosts the website, signed assessment admission, encrypted Blobs ledger,
cost reservations and one-use operation tickets; n8n executes scoped provider
requests, Telnyx hosts voice, and GHL remains the CRM/calendar owner.

Verified: local release tests, preview landing, existing Telnyx caller identity
and read-only access to the exact own GHL calendar. Not verified: production
Blobs concurrency, new outbound assistants/voices, provider cost bounds, GHL
booking/synchronization, or a real end-to-end call. New internal authentication
requires confirmation. Outbound remains disabled until those gates pass; the
approved test call is last. Public activation and additional destinations need
separate acceptance. Existing inbound agents, client workflows, Finance and the
governed OS demo remain unchanged. Website publication follows reviewed PR,
protected main, Netlify deployment and exact live release identity verification.

## Current checkpoint — 2026-07-21

The Phase 0–3 sandbox lighthouse is implemented in `autopilots-platform`: personalized AI employee preview → requirements/legal gates → sandbox payment → Secure Data Room → internal workflow → versioned human approval. Server sessions, role policy, tenant scope, audit, execution evidence, kill switches, idempotency and an append-only demo cost ledger are verified by automated tests.

## Website release safety checkpoint — 2026-07-26

Status: `verified` locally and externally enforced.

- `autopilots-website` is documented as the only source of truth for
  `auto-pilots.io`.
- The website quality workflow lives in the active root GitHub workflow folder.
- Ordinary pushes no longer trigger the legacy GitHub Pages deployment.
- The release contract blocks stale branch bases, protected-file deletion,
  excessive rollback-sized deletions, missing critical routes and artifacts
  without a commit identity.
- Local Netlify production deploys are break-glass only and require a clean
  `main` exactly equal to `origin/main`.
- GitHub protects `main` with a pull-request requirement, a strict required
  `Verify complete website release` status check, and deletion/force-push
  protection without bypass.
- Netlify is linked to `TIMKUIPER1/website-autopilots`, publishes only `main`,
  runs `npm run build && npm run release:verify`, and automatically publishes
  only after a checked pull request reaches protected `main`.
- Codex must finish every requested website publication by verifying that the
  live release identity matches the merged `main` commit.
- The full French visible-language audit remains `blocked`: the existing
  campaign components contain Dutch copy on two French funnel routes. The
  production release gate still enforces route, canonical, hreflang,
  placeholder, public-safety and link integrity checks while that separate
  localization repair is pending.

## Phase gates

- [x] Phase 0: inventory, baseline, risk containment and explicit demo boundary.
- [x] Phase 1: lighthouse, architecture, source truth, risks and decisions documented.
- [x] Phase 2: minimum server-governed platform for the lighthouse.
- [x] Phase 3 sandbox: reusable, measurable vertical slice with human approval.
- [ ] Phase 3 production: durable database, managed identity, real provider verification and deployment.
- [ ] Phase 4: deepen command center only after production foundation passes.
- [ ] Phase 5: add finance/delivery/marketing slices one evaluated workflow at a time.
- [ ] Phase 6: production hardening, SLOs, restore rehearsal and incident readiness.

## Next unblocked actions

1. Replace the in-memory repository with PostgreSQL and enforced row-level tenant policies.
2. Replace local demo credentials with managed authentication, memberships and MFA for internal operators.
3. Add a provider adapter contract and sandbox contract tests for Stripe first; keep live mode off.
4. Persist workflow checkpoints, approvals, audit and usage adjustments transactionally.
5. Add CI gates for tests, secret scanning and architecture fitness checks.

## Genuine blockers

- Production credentials and explicit authority for provider reads/writes.
- Selected hosting, managed database, identity provider and secrets vault.
- Approved legal document contents and production retention policy.
- A designated internal approver and escalation owner.

Rollback: stop `autopilots-platform`; the existing `sales-dashboard` remains untouched as the legacy operational application.
