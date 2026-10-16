# Connected homepage release

## Scope

- Promote the approved ConnectedStory preview to `/` and `/nl/`.
- Replace the mandatory root language gateway with a complete homepage.
- Add a keyboard-accessible language menu and an optional suggestion on `/`, preferring an explicitly saved choice over browser language. No IP lookup or automatic redirect.
- Preserve every existing translated homepage, SEO route, sitemap and redirect. All standard BaseLayout pages now share the navy/bronze editorial skin, compact localized header, scan CTA and progressive reading motion. Showcase and locked landing templates are excluded. The intake itself remains Dutch; its translation is not represented as complete.
- Preserve the current interactive intake and its server-side safeguards. No provider configuration or production activation is changed.
- Import only the approved design and its intake dependencies from the design checkout, not unrelated pricing changes or abandoned concepts.

## Validation

- Production build: 418 pages.
- Type check, lint and formatting passed.
- 22 unit/integration checks passed, including editorial isolation and reduced-motion regressions.
- Release content checks: 19,547 internal links, 56 redirects, metadata and strict locale/sitemap checks passed.
- Browser checked desktop/mobile homepage, language menu, English destination and remembered-language suggestion. Existing preview tested website flip and editable demo title/color.
- Editorial browser samples: Dutch product, branch overview, knowledge index, article and privacy; five translated homepages at 393px with no horizontal overflow. Desktop knowledge/branch/article checked at 1440px. This is representative template QA, not a manual review of all 418 pages.
- Remote browser/accessibility CI must pass again for the editorial update before merge.

## Release blockers

- `https://auto-pilots.io/.well-known/autopilots-release.json` fails hostname certificate verification. Do not bypass this to declare production healthy.
- Netlify account/site environment inventory did not contain `AUTOPILOTS_ANALYSIS_ENABLED`, `OPENAI_API_KEY` or `ANALYSIS_SIGNING_SECRET`. Verify/provision the intended production configuration securely and validate the analysis/request round trip before launch.
- The existing production version must remain untouched until these blockers and the complete reviewed-PR release gate are resolved.

## Release procedure

Review this PR, confirm it descends from current protected main, pass all release checks, merge through GitHub, wait for the main-triggered Netlify production deploy, and verify the merged commit at the release-identity URL over valid HTTPS. Never use a local production deploy.
