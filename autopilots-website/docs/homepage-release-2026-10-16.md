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

- The former TLS blocker was resolved by certificate renewal on October 18. Production still identifies the old main commit, not this branch.
- `OPENAI_API_KEY`, `ANALYSIS_SIGNING_SECRET` and `RESEND_API_KEY` are configured. `AUTOPILOTS_ANALYSIS_ENABLED` remains off until the preview round trip and release review are complete.
- PR #16 remains a draft without review approval. Complete review and current-commit CI before publishing. Public scan abuse/cost controls also need review before enabling the endpoint; current analysis throttling is instance-local, not a global quota.
- The existing production version must remain untouched until these blockers and the complete reviewed-PR release gate are resolved.

## Release procedure

Review this PR, confirm it descends from current protected main, pass all release checks, merge through GitHub, wait for the main-triggered Netlify production deploy, and verify the merged commit at the release-identity URL over valid HTTPS. Never use a local production deploy.
