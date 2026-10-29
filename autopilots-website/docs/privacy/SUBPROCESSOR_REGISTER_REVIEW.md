# Subprocessor register — 29 October 2026

## Requested change

Restore `/subprocessors/`, referenced in the existing customer DPA, and link it from the privacy pages. Do not replace the DPA with a privacy notice. The page is a review draft until the items below are resolved. No customer notification has been sent.

## Evidence and boundaries

- Tim confirmed inclusion of Telnyx, ElevenLabs, OpenAI, GoHighLevel, Hostinger, Supabase, Railway, Render, Netlify, Rumata, Resend, Pinecone, Airtable, ClickUp and Google Drive on 29 October 2026. This confirms the inventory, not each vendor's contractual role or geographic configuration.
- Stripe is separately described as a payment/administration provider, not automatically a processor of customer assignment content.
- Microsoft Outlook / OneDrive and PCA may be customer-contracted systems. Determine the contracting chain per implementation.
- Self-hosted n8n software is distinguished from its host and any additional cloud services.
- Public production release identity returned commit `762685c31b23ef904226e4be45e10555174b7a55`; origin/main was `f6a83fd3bd8f7981fa46008ba046a42e5dd5a61f`. Do not bypass the release gate or initiate a domain migration as part of this legal-content task.

## Required before treating this as the definitive DPA annex

For each applicable provider, record evidence of:

1. Contracting legal entity and its contact/address details.
2. Actual product, account/project, processing purpose and categories of personal data.
3. Storage, backup and processing regions, including remote support access.
4. Executed DPA, relevant transfer mechanism and any required transfer assessment.
5. Retention/deletion and applicable model-training settings.
6. Which customers use the provider, and authorization/advance-notice/objection requirements in their DPA.

Do not infer EEA-only processing from an EU database region. Do not infer that every listed supplier receives every customer's data. Publication alone does not notify customers of a proposed subprocessor change.

## Review sources

- Existing Autopilots DPA supplied with customer correspondence, sections 8.3 and 16.3 reference `https://www.auto-pilots.io/subprocessors`.
- Existing website data-flow register is dated 16 July 2026 and is not a complete/current service inventory.
- EDPB Guidelines 07/2020, final version, section on sub-processors: https://www.edpb.europa.eu/system/files_en?file=2023-10%2FEDPB_guidelines_202007_controllerprocessor_final_en.pdf

## Implementation

- One stable Dutch URL, explicitly labelled Dutch when linked from other locales.
- Purpose and relevant data categories per service.
- Explicit draft status and `noindex` while contractual verification is outstanding.
- No changes to customer DPA terms, prices, payment links, application integrations or campaign funnel.

## Validation

- Dependency install with frozen lockfile; build: 431 pages.
- Formatting, lint, TypeScript, 70 unit/integration tests and static release/link/i18n checks passed.
- Browser inspection: all 15 suppliers present, no horizontal overflow at 1440px or 390px; dedicated links verified on NL, EN and DE privacy pages.
- Full browser suite: 154 passed, 2 skipped, 12 failed across showcase, intake and mobile journeys. Do not treat this as a passed production gate.
- No production publication and no customer notification.
