# Connected homepage release

## Scope

- Promote the approved ConnectedStory preview to `/` and `/nl/`.
- Replace the mandatory root language gateway with a complete homepage.
- Add a keyboard-accessible language menu and an optional suggestion on `/`, preferring an explicitly saved choice over browser language. No IP lookup or automatic redirect.
- Preserve every existing translated homepage, SEO route, sitemap and redirect. All standard BaseLayout pages now share the navy/bronze editorial skin, compact localized header, scan CTA and progressive reading motion. Showcase and locked landing templates are excluded. The intake itself remains Dutch; its translation is not represented as complete.
- Preserve the current interactive intake and its server-side safeguards. Provider setup and confirmation email status are recorded below; configuration alone is not production activation.
- Import only the approved design and its intake dependencies from the design checkout, not unrelated pricing changes or abandoned concepts.

## Validation

- Production build: 418 pages.
- Type check, lint and formatting passed.
- 22 unit/integration checks passed, including editorial isolation and reduced-motion regressions.
- Release content checks: 19,547 internal links, 56 redirects, metadata and strict locale/sitemap checks passed.
- Browser checked desktop/mobile homepage, language menu, English destination and remembered-language suggestion. Existing preview tested website flip and editable demo title/color.
- Editorial browser samples: Dutch product, branch overview, knowledge index, article and privacy; five translated homepages at 393px with no horizontal overflow. Desktop knowledge/branch/article checked at 1440px. This is representative template QA, not a manual review of all 418 pages.
- Remote browser/accessibility CI must pass again for the editorial update before merge.

## AI-scan mail setup — 2026-10-19

- Resend verified `auto-pilots.io`. Existing mailbox MX and website DNS were preserved.
- Dedicated `Autopilots AI Scan` key has sending-only access for `auto-pilots.io`; `RESEND_API_KEY` is configured for Netlify functions in production and deploy-preview. No secret is stored in source.
- Sender/reply-to: `support@auto-pilots.io`. One explicitly authorized test to `tim@auto-pilots.io` was accepted as `01a1531c-5921-7c85-9e85-82a69f4549b7`; Resend showed Delivered. This is a provider delivery test, not a live funnel round trip.
- Confirmation is transactional HTML plus plain text. Local intake mode does not send email. Production persists an immutable message per signed assessment before sending; Resend idempotency protects concurrent retries. A separate receipt prevents later resends. Ambiguous attempts older than 23 hours require manual reconciliation, not automatic retry.
- `confirmation: accepted` means accepted by Resend, not inbox delivery. `pending`, `unavailable`, `conflict` and `review_required` must not be presented as delivered. The request remains saved even if mail fails.
- Operational reconciliation: inspect `autopilots-intake-mail` messages/receipts and Resend using the assessment-derived idempotency key. Do not delete a message or change its payload to force a retry. There is no scheduled retry worker in this release.
- Local mail tests and the wider unit/integration suite passed (30 tests); lint passed.

## Release blockers

### Online test evidence — 2026-10-19

- Temporary branch deployment `6ad5dfaf265a89688053dbb7` verified release identity `d3453aac031414607ef9badf48e035decbbd24c5`, context `branch-deploy` (not production).
- Synthetic architecture-business intake without a website returned HTTP 200 with an AI assessment and signed token. Contact submission to the authorized test recipient returned HTTP 200, saved request `b6f592ac-f90b-49d0-b041-e417a1f5d3e3`, confirmation `accepted`.
- Repeating the identical contact request returned HTTP 200 without an additional email. Resend showed exactly one new message, `01a15372-b16e-7d82-8507-dbae3f23a721`, Delivered, addressed to `tim@auto-pilots.io` from `support@auto-pilots.io`, greeting `Tim — online ketentest`.
- This verifies the online function chain, persistence and email delivery; the earlier browser quiz test was local. No appointment was booked and production was not deployed.
- Temporary activation was set back to false; branch rebuild `6ad5e003807222b081dd8f9f` reached ready. The branch URL returned HTTP 503 with the analysis-unavailable message, confirming shutdown there.

- The former TLS blocker was resolved by certificate renewal on October 18. Production still identifies the old main commit, not this branch.
- `OPENAI_API_KEY`, `ANALYSIS_SIGNING_SECRET` and `RESEND_API_KEY` are configured. The online round trip passed; `AUTOPILOTS_ANALYSIS_ENABLED` is off again pending release review and public abuse/cost controls.
- PR #16 has no review approval. Complete review and current-commit CI before publishing.
- Shared scan reservations now cap attempts at 50 per UTC day across all instances and three per visitor IP per UTC hour. Netlify's trusted function context supplies the IP; only a daily HMAC is stored. Atomic create-only slots prevent concurrent overspending; storage or missing-context errors fail closed. Failures consume slots, with no automatic refund. These conservative limits bound analysis calls, not all hosting/storage traffic, and are not an exact monetary budget. Review and verify the new guard in a deployed preview before activation.
- Quota records contain only hashed visitor keys, request IDs, timestamps and attempt usage. Historical quota slots are not automatically pruned in this release; do not delete current-day slots, which would reset limits. Operational cleanup may remove expired day/hour prefixes separately after a retention policy is agreed.
- The existing production version must remain untouched until these blockers and the complete reviewed-PR release gate are resolved.

## Release procedure

Review this PR, confirm it descends from current protected main, pass all release checks, merge through GitHub, wait for the main-triggered Netlify production deploy, and verify the merged commit at the release-identity URL over valid HTTPS. Never use a local production deploy.
