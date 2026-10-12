# PageGenie content safety — launch gate

Payments and domain registration remain test/sandbox. Policy version 2026-10-11.

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
- Daily Firestore backup schedule enabled, retention seven days, schedule ID `8176285b-401e-4342-a88c-b8d7f0b1bb71`. No backup existed immediately after creation. First successful backup and isolated restore rehearsal remain open gates; this does not cover Firebase Auth or provider configuration by itself.
- Owner approved a 30-day recovery period for website and logo content. Actual recovery/purge workflow and billing/security retention schedule remain open.
- Live Stripe and real registrar purchases remain disabled. No launch approval has been given.
