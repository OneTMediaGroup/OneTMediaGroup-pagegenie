# PageGenie content safety — launch gate

Live payments remain off. Customer domain fulfilment remains gated separately from the previously approved real-domain readiness test. Policy version 2026-10-11.

## Implemented
- Server-side OpenAI moderation for website prompts/output, generated logos, uploaded logos, cinematic prompts/images, final publishing and HTML export. Edited text, contact fields, raster uploads and rendered SVG artwork are included. Provider failure blocks the new operation; the previous public version is unchanged.
- Acceptance recorded with authenticated account, policy version and server timestamp before publishing and both checkout types. Acceptance is explicit and unchecked by default.
- Report form on public previews; policy/report links on hosted domains. Anonymous reports are rate-limited and privately stored in contentReports.
- Content review restricted to Firebase custom claim contentAdmin. Suspend deletes public content and adds a server-enforced restriction preventing republishing; hosted delivery also checks restrictions. Restore permits republishing through moderation; dismiss does not restrict the site. Decisions recorded in contentAudit.
- Public policies: policies.html. Support and appeals: support@pagegenie.ca.

## Owner routine
Sign in as the designated verified owner, then use Content review in the header. Review the queue daily and prioritise urgent reports. Review context and preserve decision reasons; do not trust a report alone. Contact the customer about restrictions and provide appeal instructions when appropriate. Appeals currently arrive by email and require human handling. Privacy requests appear in the same restricted review area; follow PRIVACY-REQUEST-PROCEDURE.md before recording an outcome. Never download or circulate suspected child sexual abuse material; obtain appropriate specialist/legal handling and required reporting procedures. Monitor provider failures and abuse attempts in Firebase logs without adding raw sensitive content to logs.

## Required before real payments
- Canadian counsel review of Terms, Privacy, Content Policy, refunds/cancellation and checkout disclosure; verify legal business identity/contact details and jurisdictions served.
- Decide retention periods and implement deletion/expiry jobs, access/deletion request handling and incident/breach response procedures; current expiresAt fields do not themselves guarantee deletion.
- Verify report ownership/coverage, response targets, escalation and appeal workflow, and backups/restore procedure. Automated checks are not a guarantee and do not continuously monitor external Twitch/YouTube content.
- Test production notifications and moderation with realistic red-team cases, evasive spellings, multilingual text, image symbols and legitimate contextual content; calibrate false positives with human review.
- Homepage showcase audit completed 11 October 2026 (local time): cinematic Northline, Maple & Main, One T Media Group, Streamer X and cinematic Juniper & Hearth all passed live text/image/artwork moderation. See demo-safety-audit.json. Other previously published customer records were not accessed or audited; review them only within an explicitly authorised scope. Future showcase releases must repeat this audit.
- Confirm live Stripe taxes, refund operations, subscriptions, registrar eligibility/renewals and production domain fulfilment separately. Do not change test-key protections as part of this pass.

## Limits
Reports do not automatically trigger removal. New reports and privacy requests trigger an email alert to the owner inbox. Delivery failures retry for up to 20 hours; the owner must still inspect Content review regularly rather than rely on email alone. We cannot revoke an HTML file already downloaded, control a copied website, or guarantee the contents of changing external streams. Suspensions prevent future PageGenie publication and hosted delivery. No AI tool replaces legal review or ongoing human moderation.

## Regression verification
103 tests pass, including all 19 curated layouts passing text and rasterised vector artwork into the final moderation gate, CSS-generated text coverage, unreadable-image rejection and fail-closed provider failures. A passed automated audit is a point-in-time check, not a guarantee of legal compliance or continuously changing external embeds.

## Launch work recorded 12 October 2026
- Private self-service account export and deletion-impact review deployed and tested live after fresh owner sign-in. Unauthenticated export returns 401. Automated suite: 117 passing checks before the additional owner-navigation regression check.
- Daily Firestore backup schedule enabled, retention seven days, schedule ID `8176285b-401e-4342-a88c-b8d7f0b1bb71`. Actual first managed-backup restore and deletion-safety drill passed; see BACKUP-RESTORE-REHEARSAL.md. Firebase Auth and provider configuration remain outside the Firestore snapshot.
- Owner approved a 30-day recovery period for website and logo content. Recovery/purge is deployed and tested; billing/security retention schedule remains open.
- Live Stripe and real registrar purchases remain disabled. No launch approval has been given.


## Recovery release — owner approved 12 October 2026

The 30-day account recovery and permanent content/Auth removal workflow is implemented and has passed isolated Firebase Auth/Firestore integration tests, including real rule enforcement, preservation/recovery of nested logo data, refusal for billing/domain records and simulated-expiry destruction. Production deployment was blocked by automatic approval review because it enables irreversible removal for real accounts. The owner subsequently explicitly approved deployment and activation on 12 October 2026. Backend deployment succeeded and the hourly scheduler is enabled; release completion includes checking the index is ready and the customer controls are live. Billing/domain accounts remain held for human resolution; policy/security records and backup restore handling still require their separate reviewed process.

Release verification — 12 October 2026: recovery and cleanup services ACTIVE; hourly scheduler ENABLED; accountLifecycle index READY; GitHub Pages release 126aad5 succeeded; live signed-in status control verified without scheduling deletion; anonymous recovery call returned 401; Northline HTTPS returned 200. All 127 automated tests passed. Live payments remain disabled.

Consolidated launch status: LAUNCH-CHECKLIST.md. AI generation request ceilings and owner pause controls: AI-OPERATIONS.md. These do not replace the remaining bot protection and alerting work.

## Attribute coverage and isolation acceptance — 12 October 2026
- Found a final-gate coverage gap: CSS `content:attr(data-...)` could display text stored outside alt/title/aria-label. Safety extraction now includes every retained non-src attribute, so CSS attribute text and expanded accessibility descriptions reach moderation. Raster payloads continue through image checks rather than duplicated text.
- Regression fixtures verify attribute-only wording reaches the rejecting moderator, multilingual/disguised text is preserved for review, image payload separation, unreadable-image refusal and fail-closed provider responses. These are integration-wiring fixtures, not a live model accuracy or false-positive calibration exercise.
- Full local suite: 181 passing tests. Fresh isolated Auth/Firestore rehearsal: 146 passing access-isolation assertions; no production account data or provider calls.
- Deploy target: publishWebsite and downloadWebsite. Existing publication is not retroactively audited by this change. Realistic multilingual/image adversarial provider acceptance, allowed-read volume and other consolidated launch gates remain open. Live payments stay off.

## Final acceptance — 12 October 2026
The standard moderation endpoint does not cover hate/harassment for image-only input (https://developers.openai.com/api/docs/guides/moderation). Each retained image now also receives a strict allow/block/review vision policy assessment using gpt-4.1-mini with storage disabled. A review result requests a changed image or human support; it does not publish automatically. Provider failures/refusals/malformed responses block the new operation. This adds a paid vision request per image; request-count ceilings are not a dollar-cost guarantee.

34 live synthetic/layout cases and 200 local tests passed; see LAUNCH-CHECKLIST.md and content-safety-acceptance.json for finite scope and rate-limit interruptions. No harmful fixture was published. Continue human review and realistic calibration; these checks do not guarantee detection of every harmful image, language or future external stream.


## Case retention — 13 October 2026

Apply the monthly owner review in PRIVACY-REQUEST-PROCEDURE.md: reports, decisions and appeals are retained 24 months after final resolution; routine support correspondence 12 months after closure. Open appeals and documented legal/safety holds are protected and reviewed quarterly. A reviewed report is not necessarily resolved. Do not delete active `siteRestrictions` or restore a website as a side effect of disposing of an old report. Email copies and attachments are included. This is a manual operating procedure, not a newly enabled database purge.
