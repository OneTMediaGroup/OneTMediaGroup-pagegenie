# PageGenie launch checklist

Updated 12 October 2026. Live payments and real registrar purchases remain disabled. This is the consolidated status record; an implemented feature alone is not launch approval.

## Verified

- Account creation, verification/reset return, dashboard, mobile editor and inline saving.
- Paid entitlements enforced by server; real Stripe test checkout, scheduled/immediate cancellation, refunds, delayed duplicate webhooks, billing return and subscription expiry tested. Actual deployed webhook delivery also passed for failed renewal, successful retry, dispute opening and won-dispute recovery; both isolated subscriptions were cancelled and automatically locked afterwards. See BILLING-TEST-RESULTS.md.
- Logo history, verified-account download gate, cinematic paid access and curated layouts.
- Publishing/contact actions; Northline custom subdomain DNS and HTTPS.
- Moderation before generation/publication/export; reporting, owner review, suspension confirmation, appeals and owner/customer notifications.
- Privacy export, explicit 30-day recovery, safe permanent purge, financial/domain deletion holds, hourly scheduler and ready index.
- Daily managed backup and actual isolated restore: 26 drafts and three nested logo versions recovered exactly; deleted-account drill passed; no Auth resurrection. See BACKUP-RESTORE-REHEARSAL.md.
- Homepage/customer SEO basics; drafts, account pages and free previews excluded from indexing. Search Console acceptance/indexing is a separate external outcome.

## Current release: AI request ceilings and emergency pause

- Server-side atomic shared daily/monthly generation ceilings plus non-refundable per-account daily attempt limits. Failed image requests cannot retry indefinitely by returning the old allowance.
- Private owner usage and confirmed pause/resume inside Content review. Pausing affects new AI creation, not saved drafts, logos, publication or hosted delivery. Existing in-flight generations may finish.
- No dollar-budget guarantee: provider pricing, token/image size, Firestore, functions, moderation and other services are separate. Counts begin with this release and do not retroactively reconstruct earlier provider usage.
- Local suite: 142 tests passed. Firestore emulator: 20 concurrent requests admitted exactly four with ceiling four; paused website/logo callables made no OpenAI requests; resume preserved drafts. Final live release verification recorded in AI-OPERATIONS.md.

## Bot protection and alerts release

- Domain-restricted reCAPTCHA Enterprise/App Check browser tokens and callable enforcement; real owner browser passed the protected canary and a missing-token request was rejected.
- Atomic 120-per-minute account throttle plus existing tighter service/AI ceilings. Isolated concurrent test passed.
- Private, deduplicated owner email alerts, backend-error/automated-traffic checks, HTTPS probes, AI usage warning and stale-backup check. Owner confirmed the actual test email arrived. Monitor located the READY production backup.
- 145 tests passed plus both Firestore concurrency/AI regression drills. Live payments remain off.

## Account isolation and owner sign-in review — 12 October

- Owner uses one email/password sign-in with an inline email code on an unrecognised browser; optional browser trust lasts 30 days. Owner confirmed successful dashboard return. Owner review/privacy/account-list/AI controls require the verified server session; old passkey endpoint retired.
- Owner confirmed both free UptimeRobot monitors activated (PageGenie and Northline). Independent notification test completed: owner confirmed DOWN and UP emails for both monitors. No production outage induced.
- Isolated Auth/Firestore drill: 146 assertions passed covering private customer documents, forged paid records, private security records, publication bypass, recovery state, scoped billing/design access and owner gate rejection. No production customers or provider calls. Reproduce with `npm run test:isolation` using Java 21 and Firebase CLI.
- Found and fixed statistics lookup trusting a private project ID without checking the public owner. The analytics callable now requires the published site to belong to the caller; a duplicate private project ID or absent publication grants no statistics access. Two focused regressions passed.
- Full local suite: 157 tests passed. These tests validate the checked cases; they are not a blanket certification of all abuse paths.

## Still required, in priority order

1. **Final security/operations review.** Browser App Check, request throttles and automatic alerts are implemented and tested; see BOT-PROTECTION-AND-ALERTS.md. Owner email protection and free external monitors are configured; the isolated multi-account pass above is complete. Protected draft saves now enforce atomic per-account storage/creation/write limits (see DRAFT-STORAGE-PROTECTION.md). Direct Auth signup attestation rejection is verified; review remaining allowed-read volume exposure, independent monitor DOWN/UP delivery is confirmed; complete content-safety/accessibility adversarial acceptance.
2. **Owner-managed business setup.** Owner confirmed PageGenie operates under One T Media Group and asked us not to change business/tax setup. Leave those settings untouched; do not mark tax/legal review verified on this basis. Confirm final checkout/renewal disclosures, refund handling and policy review. Set documented retention for billing, audit/security records, support correspondence and third-party systems; content deletion alone does not resolve these.
3. **Complete billing failure/dispute operations.** Dispute access reconciliation and domain refund-state safeguards implemented; 162 tests passed and a real Stripe test dispute/win/cancellation rehearsal passed through the billing-state layer. See BILLING-TEST-RESULTS.md for scope. Deployed-webhook delivery now verified independently: failed renewal, successful retry, dispute opening, won dispute and cleanup cancellations all updated stored billing state automatically without manual reconciliation. Domain renewals, transfer/expiry, operator reconciliation of unknown registrations and failed refunds remain launch gates.
4. **Production domain fulfilment.** Production registrar connection and an approved real .com API purchase now verified with inline owner contacts; see DOMAIN-PRODUCTION-READINESS.md. Test-domain DNS is now applied and verified publicly; backend routing passed. Finish certificate issuance/browser HTTPS proof, customer production order automation, registrar/reseller eligibility and failure recovery. A working PageGenie subdomain and registrar sandbox do not prove real registration fulfilment.
5. **Production Stripe preparation.** Separate PageGenie live prices/webhook/customer portal, correct PageGenie receipts/card descriptor, tax configuration and refund/support process. The shared sandbox account currently displays FLOOR FLOW; do not alter other products' shared branding blindly. Keep live-payment safeguards in place until the reviewed switch.
6. **Final launch acceptance.** Repeat clean mobile/desktop end-to-end checks, accessibility and content-safety adversarial tests; verify restore/config recovery instructions and notifications; conduct a tightly controlled real-payment/refund and domain test only with explicit authorisation. Owner signs off only after every gate is closed.

No soft launch or public paid launch is approved. Passing these tests does not replace legal/accounting review or guarantee zero abuse, downtime or AI cost.

## Draft storage protection — 12 October
- All 12 browser draft-save paths use the App Check protected saveProject endpoint. Direct project create/update writes are denied by Firestore rules.
- Isolated emulator: concurrent creation cap, daily/minute caps, edits at the cap, logo/contact preservation, deleted-account refusal and 146 isolation checks passed. Full unit suite: 169 passed; frontend build passed.
- Live payments remain disabled. Auth signup attestation and independent alert delivery checks are complete. Allowed-read volume review and final acceptance remain launch gates.

- 12 October: Auth App Check enforced; missing/forged attestation signup probes both returned 401 after propagation. Owner account refresh still works. Password minimum aligned with the eight-character UI requirement, without forcing existing-user resets.
- Real test domain HTTPS now passes normal certificate validation (Google Trust Services, TLS 1.3), HTTP redirects to HTTPS, and Northline returns 200 with logo/email/phone links. Customer live billing remains off.

## Customer polish — 12 October

- Removed the early-preview badge, development footer and demo generation selector from the built customer site. Website creation uses AI; examples remain explicitly labelled fictional demonstrations.
- Builder starts empty; saved drafts require an explicit Continue action. Domain search no longer starts with a sample name.
- Removed fabricated visitor statistics and the placeholder QR image from the delivered customer document. Analytics use actual server counts or a plan/empty state; QR appears after successful publication.
- Publication and plan messages use customer language. Domain receipts still explain when no real domain was purchased; production domain purchasing remains unavailable and must not be implied by cosmetic changes.
- Build and 173 tests passed. Billing configuration remains testMode true; no live keys, prices, webhooks or registrar purchase routes were enabled.
