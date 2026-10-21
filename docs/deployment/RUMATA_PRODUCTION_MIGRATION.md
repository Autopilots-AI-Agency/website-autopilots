# Rumata production migration

Status: implementation and acceptance in progress; no domain cutover yet.

## Release decision — 2026-10-21

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
