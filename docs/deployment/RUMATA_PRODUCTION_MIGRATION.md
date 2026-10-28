# Rumata production migration

Status: complete Rumata migration resumed on explicit user authority, 2026-10-28.
The existing Netlify production host remains active until full acceptance.

## Current scope and checklist — 2026-10-28

The user requested starting the complete website and website-backend migration,
including checking what already exists. This supersedes the deferred migration
decision below, not the protected-main or full acceptance requirements. Finance,
the wider OS, unrelated n8n workflows and other client factories are out of scope.

- [x] Recheck canonical repository, protected main and existing migration PR.
- [x] Read existing production and migration factory metadata before creating anything.
- [x] Inspect actual PostgreSQL tables and count existing scan/email rows.
- [x] Inventory all seven Netlify stores without printing personal records.
- [x] Implement factory-scoped PostgreSQL compatibility storage and conflict-safe import.
- [x] Reuse unchanged campaign lead/event/admin handlers with request-local storage.
- [x] Add persisted idempotency receipts; unknown CRM outcomes cannot auto-repeat.
- [x] Verify synthetic migration/import/concurrent retry/restart against local PostgreSQL.
- [x] Fix bodyless scan polling sending a JSON content-type rejected by the managed parser.
- [x] Add authenticated-encryption backup and read-back verification tooling.
- [x] Capture and verify the current encrypted Netlify snapshot; prove full restore
  into an isolated local PostgreSQL database (not yet hosted Rumata restore).
- [ ] Port conversion webhooks while preserving signature checks and raw request bytes.
- [ ] Prove same-origin legacy `/api/*` and `/backend/*` routes on Rumata. The managed
  `/backend-api/<service>` binding alone does not prove old absolute paths work.
- [ ] Bind campaign-specific CRM settings, webhook signing keys and private admin credentials.
- [ ] Import actual records, reconcile counts/hashes, and handle post-snapshot changes.
- [ ] Decide compatibility/expiry for old signed result links and old quota state.
- [ ] Move the production release path from Netlify to Rumata in a reviewed change.
- [ ] Merge the complete accepted release, then bind/build/deploy that exact main SHA.
- [ ] Test six-language hosted scan/email/result/booking flows; approved pilot call last.
- [ ] Attach domain, verify HTTPS/redirects/security headers and preserve mail DNS.
- [ ] Verify the release manifest on the actual domain; observe and retire old hosting.

Do not merge a partial migration to publish a hybrid website. New campaign routes
default disabled (`CAMPAIGN_ENABLED` and `CAMPAIGN_CRM_ENABLED` must be explicitly
activated after configuration/acceptance). No new account system is enabled.
CRM also requires `CAMPAIGN_APPROVAL_VERSION=rumata-campaign-migration-2026-10-28.1`
and a documented human approval for that current context; the version is persisted
on each R3 command. No such activation is performed by this migration preparation.

## Live inventory — 2026-10-28

| Component | Observed state |
| --- | --- |
| Actual domain | Netlify; release `762685c31b23ef904226e4be45e10555174b7a55`, built 2026-10-20 |
| Rumata frontend | No deployments |
| Rumata production API | Revision 3, unpublished, `not_deployed`, zero builds/deployments |
| Domain eligibility | Eligible, limit 10; no domains attached |
| Production-factory database | `scan_jobs`: 1 row; `scan_email_deliveries`: 1 row |
| Old migration database | `scan_jobs`: 7 rows; `scan_email_deliveries`: 4 rows |
| Bound secret references | Factory JWT, workflow API key, Resend, Telnyx, GoHighLevel |

Existing rows and secret references prove preparation/persistence only, not live
traffic, successful current provider authentication, or a completed migration.
Production scan/email/consultant activation flags remain false. The existing
disk is retained; its presence is not backup or restore proof.

Netlify site `0bb28006-2398-4e63-b2c5-f8a6871196c4`:

| Store | Records |
| --- | ---: |
| autopilots-funnel | 883 (879 events, 4 leads) |
| autopilots-conversions | 0 |
| autopilots-analysis-quota | 7 |
| autopilots-assessment-requests | 2 |
| autopilots-intake-mail | 4 |
| autopilots-consultant-tickets-v1 | 0 |
| autopilots-consultant-ledger-v1 | 0 |

Counts are an inventory, not an export/import receipt. Empty stores still require
route and next-write acceptance. No original source was removed or modified.

Headless preflight currently selects frontend main `762685c3` but backend branch
`44158ff4`. Both must be changed to the same reviewed merged release before
publication; a successful preview must not hide this mismatch.

## Compatibility storage and backups

`website_legacy_records` is private factory-scoped PostgreSQL, not a public blob
browser. The allowlist retains original store/key identities and delivery/CRM
states. Import validates JSON and SHA256; equal repeats are no-ops, conflicting
records stop without overwrite. Import itself never executes a provider action.

`website_campaign_commands` records input hash, risk, zero provider-spend usage
for the compatibility operation, state and HTTP receipt. CRM mutations remain
separately gated. Pending/unknown outcomes require reconciliation, never blind
retries. Original Netlify handling is retained outside a scoped Rumata request.

`legacy-backup.ts` is a private operator tool, not an HTTP endpoint. It uses an
existing Netlify login through an in-memory environment variable, reads records
with ETag checks, writes only AES-256-GCM authenticated ciphertext, keeps the
random key in a separate private file, and verifies decryption/read-back. Source
data is read-only. Keep ciphertext/key outside Git, browser assets and logs.
The local encrypted snapshot does not establish an independent off-host backup.
Store the key separately and prove destination restore before source retirement.

Capture receipt: 2026-10-28T10:14:06.266Z, 896 records across the seven stores;
ciphertext SHA256 `2b509721cbe28597e393a053831b9cbd8c2b30d68b37838249ad9dae25d7a410`.
AES-GCM decryption and file read-back succeeded. Ciphertext and separate key files
are private (0600), outside the repository. Existing Netlify login was used only
in process memory; no credential was printed or committed.

Full restore acceptance: imported all 896 real source records into an isolated
local PostgreSQL schema, repeated the import (0 new / 896 unchanged), closed and
reopened the database pool, independently checked every source hash and each
nonempty store count. The temporary schema was then dropped. This proves local
transfer/restore tooling, not that those records have been imported into Rumata.
The hosted databases and original Netlify stores remain untouched by this test.

During DNS propagation, both hosts may receive writes. Before cutover choose and
verify forwarding or a bounded write pause plus final delta import. DNS rollback
alone is insufficient after Rumata has accepted new data: preserve/reconcile the
new records before resuming old workers. Never reset dedupe/opt-out/budget state
or resend imported requests. Retention for imported personal data and command
receipts must be explicitly checked before production activation.

## Release decision — 2026-10-23

The user explicitly requested publishing the approved local design through Netlify. Release PR #28 contains the isolated website/mobile changes on a fresh branch from protected main, retaining the existing Netlify scan, email, consultant and campaign handlers. This supersedes the earlier full-Rumata-only constraint for the current website release. Rumata migration PR #27 remains draft and must not be merged to publish the website design. Its domain, API and stored-data migration requirements remain open for a later complete migration.

## MCP verification — 2026-10-23

- The MCP connection resolves the production factory and its linked organization repository correctly.
- Frontend deployment history is empty. The native API remains unpublished at configuration revision 3, with production scan, email and consultant activation disabled.
- Frontend deployment preflight identifies both the website and API as not deployed. The development checkout was still at `18b0428`; the API build source points to the migration branch at `21d1f046`.
- The discovered deployment operation accepts `factoryId`, `subdomain` and `workflowSelections`. A search for domain operations returns only subdomain availability and frontend deployment; it does not establish a custom-domain/TLS configuration path.
- Updating the private development checkout is preparation for acceptance, not a production cutover. Existing uncommitted workspace files must be preserved.

## Historical release decision — 2026-10-21

The user explicitly chose a complete migration only, not temporary Netlify frontend plus Rumata backend. Do not merge this PR merely to publish a hybrid release: protected main automatically deploys the Netlify website. Keep the PR in draft until the complete Rumata cutover is demonstrably supported and accepted.

Remaining hosting evidence:

- The discovered frontend deploy API and Studio deployment dialog expose only a `*.sites.rumata.dev` subdomain. No custom-domain operation was advertised; this is unverified support, not proof the provider can never support it.
- The deployment guide linked by Studio (`https://docs.rumata.dev/guides/publishing#deploy`) returned “404 · PAGE UNAVAILABLE” during verification.
- Existing campaign lead/event routes, booking/payment webhooks, redirect semantics and administration handlers still depend on Netlify. Static page preservation does not migrate these routes or their stored data.
- Do not change DNS until Rumata supplies the verified custom-domain/TLS path and the required route and storage migration can be accepted end-to-end.

Verified development evidence: a real Dutch scan succeeded and recovered after backend restart; its Resend receipt `01a15eaa-a51c-7746-8b3d-4b25f0514c5f` was delivered to the approved test recipient. All 160 synthetic desktop/mobile browser journeys passed. All 61 governed platform tests passed. Six separate consultant assistants have pinned Telnyx versions and are bound to a dedicated disabled outbound profile. No SMS or phone call was initiated. This is not evidence of a completed live migration.

## Source and ownership

- Canonical source: `Autopilots-AI-Agency/website-autopilots` (stable repository ID 1263233950).
- Website remains `autopilots-website`; backend is `autopilots-website-api`.
- Consultant business rules remain in `autopilots-platform/src/consultant`; no second CRM or identity store.
- Production factory: `5c3bd768-20b7-470b-9c0b-2b8f635f4e43`.
- Native API service: `b05f7168-a0d2-46df-a25a-818ec27416d6`.
- Old migration factory and its PostgreSQL data remain retained. Its development machine is stopped, not deleted.

## Admission and costs

- Scan jobs and email delivery receipts use managed PostgreSQL and random, hashed visitor capabilities.
- Consultant storage requires the persistent single-replica volume at `/app/data`; development uses a separate temporary database.
- Factory signing keys and provider credentials are bound as secret references, never committed or shipped to browsers.
- Combined test ceiling is USD 10/day: scan reservations at most USD 1/day and consultant admission at most USD 9/day.
- Outbound calling remains disabled until its provider configuration and pinned multilingual assistants pass acceptance.
- Pilot remains restricted to the approved test destination in runtime settings; caller is +31850835827. No widening of this allowlist is implied by a deployment.
- Existing GHL calendar/location and consent/phone-verification gates are retained. Unknown call or email outcomes are not blindly retried.

## Release and rollback

1. Run website release checks, API checks/tests and governed consultant tests.
2. Review and merge an up-to-date pull request through protected main.
3. Build/deploy the exact merged commit to Rumata. Verify capabilities, six locales, result reload, email receipt and persistence there before changing DNS.
4. Perform the explicitly approved pilot call last, within the remaining daily budget.
5. Change the production domain only after acceptance; verify HTTPS and `/.well-known/autopilots-release.json` against merged main.
6. Retain the previous Netlify deployment and DNS settings for rollback. Never call a preview or branch push live.

Persistent disks have no automatic backup. Before production state-bearing redeployment, capture an encrypted, provider-supported backup and document its restore proof. Do not delete old runtime data or revoke old credentials until migration acceptance and retention requirements have been confirmed.
