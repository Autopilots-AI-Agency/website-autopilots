# Rumata production migration

Status: complete Rumata migration resumed on explicit user authority, 2026-10-28.
The existing Netlify production host remains active until full acceptance.

## Current www authority and next release — 2026-10-28

### Scope clarification: private dashboard deferred

The user explicitly authorized continuing without the password-protected
autobedrijven administration overview. This does not remove the public quiz,
AI scan, email delivery, booking routes or any stored customer records.
`CAMPAIGN_ADMIN_ENABLED=false` is now the explicit server-side default and must
remain false in both Rumata environments. Requests to that overview return 404
before database access; old credentials cannot accidentally reopen it. The missing
`FUNNEL_ADMIN_PASSWORD` is no longer a migration blocker and is not requested.
Reopening the private overview is a separate authorized change with secure login.

The user explicitly authorized continuing through `www.auto-pilots.io` temporarily
and finishing all unblocked migration work. Rumata support confirmed direct www
custom-domain connection, automatic HTTPS and the managed same-origin backend
gateway. Root-domain support is a provider feature request, not a reason to stop
independent work. Apex DNS/HTTPS redirection remains separate and unchanged.

The Rumata build now targets `https://www.auto-pilots.io`, preserving page paths,
six locale clusters and robots/sitemap/canonical consistency. The Netlify build's
default apex origin remains unchanged for rollback. `rumata.frontend.json`
specifies repository-root monorepo commands and an explicit immutable Git-SHA
release identity; the build refuses to publish an unknown commit. Website checks
and source tests run before the build, then built-site/release tests run after it.

Unprotected appointment forms and campaign telemetry now use the documented
managed backend binding, avoiding reliance on unknown edge rewrite support.
The locked `CampaignLeadForm.astro` still needs the separate contract-first,
funnel-only release procedure from
`autopilots-website/docs/deployment/AUTODEALER_FUNNEL_INCIDENT_2026-07-27.md`.
Do not bypass its integrity check with a fetch monkeypatch or build transform.

Netlify environment inventory confirms the current source has no booking/Stripe
webhook signing keys configured. Those signed conversion routes therefore remain
disabled on Rumata too; enabling them is separate from preserving their code and
records. Existing GHL location/pipeline/stage IDs and admin username were read
without disclosing tokens/passwords. The existing Rumata GHL secret is bound to
the legacy variable name; actual provider scope verification remains required.

Backend configuration now stages www via `WEBSITE_ORIGIN`, retains all activation
flags as false, and preserves database/disk/provider bindings. `PUBLIC_ORIGIN`
was rejected as a reserved platform/frontend name and was not saved. One secure
setup form was provided for the missing existing `FUNNEL_ADMIN_PASSWORD`; no new
provider key was requested, no password was printed, and no admin access was
weakened. Bind it only after metadata confirms it has been saved.

## Current scope and checklist — 2026-10-28

### WWW verification checkpoint — 2026-10-28 12:33 UTC

- Candidate `a30a3180b74971083abae8cdbb451edf7342c3fb` is pushed to draft
  PR #27. No merge, frontend publication, DNS change or provider activation occurred.
- The complete Rumata frontend build passed: 430 HTML pages, 18,767 internal
  links, canonical/hreflang/sitemap/robots and source/release/unit checks. The
  generated release artifact identifies that exact candidate and the www origin.
- Native API typecheck and tests completed locally: 61 passed, 3 optional
  PostgreSQL tests skipped without a configured test database. The separate GitHub
  native-API gate passed against the candidate. These are tests, not hosted
  provider acceptance.
- Rumata managed backend build `e8f6491a-6647-4b96-8aa8-adfd532a98d8`
  succeeded for the same candidate, producing immutable image digest
  `sha256:83711c8a599fe6963fea318f81e491cc7ca1811b6b4931279e8be05822a3ed10`.
  The service remains unpublished, revision 4, with no active deployment.
- Local browser runs were not uniformly green: 160/162 and 154/162 executable
  scenarios passed, with varying timeout/layout failures. The isolated consultant
  rerun passed all 24 desktop/mobile scenarios. The independent GitHub website
  gate subsequently passed at 12:33 UTC: 162 browser scenarios passed and two
  intentionally skipped; all four candidate checks are green. Do not erase or
  reclassify the local failures, and repeat the gate for any subsequent code head.
- Draft contract-only PR #29 declares the future isolated campaign transport
  change. The protected component itself is still unchanged. A temporary proposed
  component was tested against the existing original: five answers, required
  contact fields, consent, exactly one intercepted POST and correct experience
  navigation all passed. Proposed POST targets the managed same-origin backend;
  no CRM write, email, SMS or call was made. Contact-form screenshots were
  byte-identical (SHA-256
  `906b186fcbd221d50044990976c55b11ed5dc30b54637bcb736d12dde590f80c`).
  Temporary proposal files and the local preview server were removed afterward.
- Secret metadata still reports `FUNNEL_ADMIN_PASSWORD` missing. The existing
  password must be saved through the secure Studio form before binding; it is
  not read out of Netlify or copied through MCP arguments.
- Both captured legacy assessment expirations were inspected in memory without
  logging customer records. Neither remains valid; the latest expired at
  `2026-10-19T11:36:14.909Z`. Preserve original records, do not revive expired
  tokens or weaken verification. At cutover repeat this check against the final
  source delta; wait for any newer one-hour tokens to expire or explicitly stage
  a short compatibility window before removing the old handler. Old quota rows
  remain archived; native scan budget/accounting must not be reset or bypassed.
- Rumata currently has no frontend deployments or attached domains. The existing
  Netlify host is retained. Do not attach/switch www to an unaccepted deployment
  or claim the migration live from a successful container build.

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
- [x] Port conversion webhooks, preserving raw request bodies and signature checks;
  local verification passed. Hosted callback acceptance/configuration remains open.
- [ ] Prove same-origin legacy `/api/*` and `/backend/*` routes on Rumata. The managed
  `/backend-api/<service>` binding alone does not prove old absolute paths work.
- [ ] Bind campaign-specific CRM settings, webhook signing keys and private admin credentials.
- [x] Import and independently verify the initial 896-record snapshot in Rumata.
- [ ] Reconcile post-snapshot source changes and perform the final delta at cutover.
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

### Hosted import receipt — 2026-10-28

The initial snapshot is now imported into the production factory's private
`website_legacy_records` table. 45 transactional batches committed between
10:37:32Z and 10:38:59Z: 896 inserts, 896 source JSON/checksum matches independently
read back, no conflicts. A separate final query confirms 883 funnel, 7 quota,
2 assessment-request and 4 intake-mail records. Empty stores remain empty.
`website_migration_batches` retains immutable batch receipts, source snapshot
SHA256, R2 classification and zero external-provider spend for these copy operations.
Rumata infrastructure consumption is not included in that provider-spend field.

The authenticated Studio SQL capability was used with a private operator transport:
strict UUID schema selection, validated JSON/checksums, base64-only data transport,
server-side checksum checks, transaction/advisory locks, conflict rejection and
per-batch independent verification. No customer plaintext, signing key or API key
was printed in the user-facing output or committed to Git. Application SQL remains
parameterized. This import executes no CRM, mail, payment or telephone action.

The hosted import is a snapshot, not a live-write cutover: Netlify still serves
production and may accept newer records. Final delta/reconciliation is required
before DNS changes. No original source record was changed or removed.

### Confirmed domain limitation — 2026-10-28

The current Studio Deploy Project dialog explicitly states: only owned subdomains
are supported; root domains are not supported yet. A website must be published
before a custom domain can be attached. Therefore eligibility for ten domains is
not proof that `auto-pilots.io` can be connected: only e.g. `www.auto-pilots.io`
is currently advertised. No domain or DNS change has been performed.

The user wants a provider message prepared asking Rumata to support the root
domain, HTTPS, www-to-root redirects, same-origin API/admin routes and self-service
Studio/MCP management. Do not silently switch the canonical site to www, keep a
Netlify proxy, or claim the complete migration is live. Root-domain support and
existing-path routing require a verified provider solution before the cutover.

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
