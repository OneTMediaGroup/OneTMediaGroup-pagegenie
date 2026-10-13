# PageGenie launch checklist

Updated 13 October 2026. Live payments and real registrar purchases remain disabled. This is the consolidated status record; an implemented feature alone is not launch approval.

## Current launch gates — 13 October (supersedes the historical priority list below)

Completed: production billing migration (14 records), production credential/configuration deployment, Stripe notification activation with genuine signed delivery, free guest → account → publication acceptance, and the contact-before-policy phone check. Checkout, domain purchasing/processing and live refunds remain off. Scheduled domain-care operation was observed on 13 October (details in DOMAIN-CARE-OPERATIONS.md).

Remaining:
1. Owner business/policy sign-off: support/moderation retention periods and manual monthly review adopted 13 October (see PRIVACY-REQUEST-PROCEDURE.md). Owner will arrange tax filing/remittance; completion remains owner-confirmed before launch. Technical tax collection is not proof of remittance setup. Apply documented holds and provider-specific retention limitations.
2. Final release preflight immediately before launch: recheck service health, credential expiry, live price/portal configuration and off-switches against the agreed release. Prior successful checks are recorded; repeat only time-sensitive checks rather than restarting the test programme.
3. Explicit owner approval of the exact switches to enable. Notification intake is already enabled; checkout, domain processing and live refunds are separate controls and must not be enabled implicitly.

Known acceptance limits: no real-money transaction or real .ca purchase rehearsal is authorised. Production provider behaviour at that boundary remains untested. Renewals and transfers are owner-managed requests, not automatic fulfilment. Domain-care schedule runs successfully, but there are currently no eligible paid production orders to reconcile end-to-end. Phone acceptance used a responsive Chrome viewport, not a physical handset.

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

1. **Final security/operations review.** Browser App Check, request throttles and automatic alerts are implemented and tested; see BOT-PROTECTION-AND-ALERTS.md. Owner email protection and free external monitors are configured; the isolated multi-account pass above is complete. Protected draft saves now enforce atomic per-account storage/creation/write limits (see DRAFT-STORAGE-PROTECTION.md). Direct Auth signup attestation rejection and database read protection are verified (DATABASE-READ-PROTECTION.md); independent monitor DOWN/UP delivery is confirmed. Content-safety/accessibility acceptance completed with the scope below. Read protections reduce exposure but are not a hard spending cap.
2. **Owner-managed business setup.** Owner confirmed PageGenie operates under One T Media Group and asked us not to change business/tax setup. Leave those settings untouched; do not mark tax/legal review verified on this basis. Confirm final checkout/renewal disclosures, refund handling and policy review. Set documented retention for billing, audit/security records, support correspondence and third-party systems; content deletion alone does not resolve these.
3. **Complete billing failure/dispute operations.** Dispute access reconciliation and domain refund-state safeguards implemented; 162 tests passed and a real Stripe test dispute/win/cancellation rehearsal passed through the billing-state layer. See BILLING-TEST-RESULTS.md for scope. Deployed-webhook delivery now verified independently: failed renewal, successful retry, dispute opening, won dispute and cleanup cancellations all updated stored billing state automatically without manual reconciliation. Domain-care requests, expiry notices and guarded sandbox recovery are implemented (DOMAIN-CARE-OPERATIONS.md). Production renewal/transfer fulfilment, registrar expiry reconciliation and production reminder schedule/registrar reconciliation remain launch gates. Seven-day fixture reminder inbox delivery is now confirmed. Renewal/transfer request alerts were confirmed received during the live phone rehearsal.
4. **Production domain fulfilment.** Production registrar connection and an approved real .com API purchase now verified with inline owner contacts; see DOMAIN-PRODUCTION-READINESS.md. Test-domain DNS is now applied and verified publicly; backend routing passed. Real test-domain certificate/HTTPS proof is complete. Finish customer production order automation, customer registrant ownership, registrar/reseller eligibility, .ca production eligibility/schema validation and production failure recovery. A working PageGenie subdomain and registrar sandbox do not prove real registration fulfilment.
5. **Production Stripe preparation.** Separate PageGenie live prices/webhook/customer portal, correct PageGenie receipts/card descriptor, tax configuration and refund/support process. Verify the final PageGenie checkout branding without altering other products’ shared settings. Keep live-payment safeguards in place until the reviewed switch.
6. **Final launch acceptance.** Repeat clean mobile/desktop end-to-end checks after final polish; safety/accessibility acceptance is recorded below; verify restore/config recovery instructions and notifications; conduct a tightly controlled real-payment/refund and domain test only with explicit authorisation. Owner signs off only after every gate is closed.

No soft launch or public paid launch is approved. Passing these tests does not replace legal/accounting review or guarantee zero abuse, downtime or AI cost.

## Draft storage protection — 12 October
- All 12 browser draft-save paths use the App Check protected saveProject endpoint. Direct project create/update writes are denied by Firestore rules.
- Isolated emulator: concurrent creation cap, daily/minute caps, edits at the cap, logo/contact preservation, deleted-account refusal and 146 isolation checks passed. Full unit suite: 169 passed; frontend build passed.
- Live payments remain disabled. Auth signup attestation and independent alert delivery checks are complete. Allowed-read volume review is recorded in DATABASE-READ-PROTECTION.md; final acceptance remains a launch gate.

- 12 October: Auth App Check enforced; missing/forged attestation signup probes both returned 401 after propagation. Owner account refresh still works. Password minimum aligned with the eight-character UI requirement, without forcing existing-user resets.
- Real test domain HTTPS now passes normal certificate validation (Google Trust Services, TLS 1.3), HTTP redirects to HTTPS, and Northline returns 200 with logo/email/phone links. Customer live billing remains off.

## Customer polish — 12 October

- Removed the early-preview badge, development footer and demo generation selector from the built customer site. Website creation uses AI; examples remain explicitly labelled fictional demonstrations.
- Builder starts empty; saved drafts require an explicit Continue action. Domain search no longer starts with a sample name.
- Removed fabricated visitor statistics and the placeholder QR image from the delivered customer document. Analytics use actual server counts or a plan/empty state; QR appears after successful publication.
- Publication and plan messages use customer language. Domain receipts still explain when no real domain was purchased; production domain purchasing remains unavailable and must not be implied by cosmetic changes.
- Build and 173 tests passed. Billing configuration remains testMode true; no live keys, prices, webhooks or registrar purchase routes were enabled.

## Domain search and .ca intake — 12 October
- Domain step starts with an empty, prominent search. Results show availability, CAD first-year total, separate $2 fee and renewal estimate before owner details. Only confirmed available/priced results enable selection; failures offer retry and unsupported .ca checks never imply the name is taken.
- .ca owner intake requires an explicit Canadian Presence category and current CIRA agreement consent, validated server-side, saved privately with a server timestamp. Confirmation includes the expected CIRA email heads-up. This records a declaration, not independent eligibility verification.
- Cloudflare sandbox .ca support remains unavailable. Production .ca registration schema/orchestration still requires verification; no purchase support was enabled by this work.
- 179 local tests pass, including late search responses, invalid quotes, unavailable domains and .ca consent. Phone search layout checked. Live payments remain off.

## Safety acceptance follow-up — 12 October
- Closed a moderation coverage gap for CSS-generated attribute text and expanded accessibility descriptions. Publication and HTML export now send retained non-image attribute values through the final safety check.
- 181 local tests passed; a fresh isolated Auth/Firestore drill passed all 146 access checks. See CONTENT-SAFETY-OPERATIONS.md for scope. Live model calibration and remaining launch gates are not marked complete by these fixture checks.

## Domain care — 12 October
- Added customer renewal/transfer requests, private owner recovery queue and production-only expiry reminders. Requests do not execute registrar actions.
- Guarded sandbox status reconciliation and full failed-order refunds; uncertain submissions cannot trigger another purchase or an unsafe refund replay.
- 190 tests plus isolated Firestore domain-care checks passed. Live payments remain off. See DOMAIN-CARE-OPERATIONS.md for limits and outstanding production fulfilment.

- Domain-care phone rehearsal: both renewal and transfer requests saved; server delivery markers present; owner confirmed both inbox alerts. Registered-domain dashboard shortcut now opens management directly. Live payments remain off.

- Expiry reminder rehearsal: correct seven-day TEST email accepted by the deployed delivery function and confirmed received by owner; duplicate notice creation blocked; fictional record restored to sandbox. All reminder boundaries covered by seven focused tests. Production-wide mail run was not invoked. Live payments remain off.

- Owner/customer domain-care rehearsal: both fictional requests marked handled in protected phone UI; customer phone UI shows both saved outcomes. Fixed stale owner queue count; two focused UI tests and build passed. No registrar action or charge; live payments remain off.

- Failed domain recovery: owner phone UI keeps uncertain registrations on hold, rejects unsafe refunds, and refunds the matched confirmed-failure Stripe test order in full including the $2 fee. Repeat refund blocked; exactly one CAD $12 test refund verified. Fixed a simultaneous-fulfilment transaction race and made refund claims atomic; isolated 12-way retry drills and local regression checks pass. Live payments remain off; real registrar rejection behaviour remains outside this simulation.

## Database read protection — 12 October 2026
- Firestore App Check was already ENFORCED; live missing-token and forged-token probes both returned HTTP 403. No enforcement downgrade was made.
- Private project queries require a limit of at most 100; logo version queries require at most 24 and use Load more. Other private collection listing and public-site listing are denied.
- Dashboard billing summaries use webhook-saved account records instead of checking Stripe once per site on every refresh. Feature access and checkout reconciliation remain server enforced.
- Frontend 670688f was verified served before the rules were released successfully. Live scotfree dashboard showed 8 saved sites, 2 published and 2 paid; public Northline loaded its logo and contact links.
- 193 local tests and 155 isolated account-access checks passed. Logo pagination preservation is verified by automated tests; the inspected legacy live projects had empty version collections, so a populated live pagination rehearsal is not claimed.
- Live payments remain off.

## Content safety and accessibility acceptance — 12 October 2026
- Found and closed image-only hate/harassment coverage: standard moderation is supplemented by a separate vision policy review of visible wording and symbols. Ambiguous results and provider failures block the new operation. Generation, logos, cinematic imagery, publishing and export inherit this check.
- All 34 live acceptance cases passed: eight text cases, seven image cases and all 19 curated layouts. Includes French, disguised wording, image instructions, extremist symbols and legitimate business/inclusion context. Two provider rate-limit interruptions blocked safely; resumed cases passed. No harmful fixture was published. See content-safety-acceptance.json.
- All 200 automated tests passed. Axe reported zero violations in 16 tested pages/dialogs. Its colour-contrast rule was excluded because jsdom does not render; core secondary-text contrast was measured separately. This is scoped acceptance, not formal WCAG certification or a full assistive-technology audit.
- Added keyboard community selection, skip navigation, visible focus, named dialogs, status announcements, reduced-motion support and stronger secondary-text contrast. Saved-site buttons now identify their website. Live keyboard selection and Escape focus return passed; phone account controls checked at 390px.
- Seven affected Firebase functions deployed successfully. Live payments remain off. Human moderation, report review and ongoing false-positive calibration remain necessary; changing external video streams cannot be continuously moderated by this point-in-time check.

## Guided creation and logo refinement — 12 October 2026
- Optional Get enquiries / Show my work / Grow my audience choices feed generation and refinements, persist in saved drafts and reset for a new project. Short descriptions get a nonblocking brief suggestion; three editor suggestions fill the request for explicit review and Ask. No extra onboarding screen.
- Saved-logo refinement uses the owner's current-project version as an image reference to the edits endpoint. References cannot be arbitrary URLs or another customer's path. Reference and output moderation remain required. A description of the change is required; the original stays saved and the new version records its reference. Refinements share the existing three-concept allowance, verified-account gate, daily ceilings and idempotent reservation.
- 205 automated tests pass, including goal validation/toggle/restore, image-edit multipart reference submission, refusal of malformed references, explicit refinement selection and exhausted allowance. The 16-context accessibility scan passes. Live synthetic Northline generation selected trade and Request a Consultation; live image refinement preserved its name and roofline and passed safety review. These provider checks did not publish or modify a customer's site or logo history.
- generateWebsite and generateLogo deployed successfully. Live payments remain off.

## Production order preparation — 13 October 2026
- Added a staged, disabled-by-default production order core with live-payment checks, atomic order/domain reservation, no blind purchase retries, separate connection recovery, and nine passing fixture tests.
- This does not close production domain fulfilment: no trigger, credentials, retry scheduler or alert delivery is bound. See DOMAIN-PRODUCTION-READINESS.md for remaining integration and live verification.
- Live payments remain off; no purchase performed.

## Final Stripe/access review — 13 October

See STRIPE-CUTOVER-REVIEW.md for verified prices, portal, disabled destinations/endpoints, deployed secret bindings, activation/rollback order and remaining named-account migration holds. Added separate domain processing gate so stopping new sales need not strand paid orders; all gates remain off. One disposable synthetic account is in 30-day recovery; owner, named testers and public examples preserved. The eight billing holds were subsequently resolved by the authorised test cleanup below; the approved 14-record production billing migration is complete. No real charges, refunds or purchases.

## Test subscription cleanup — 13 October

- Seven approved Stripe test subscriptions cancelled without proration/immediate invoices; one unfinished test checkout expired. Prior billing records archived. No real charges, refunds or purchases.
- Fresh migration audit: 14 eligible records, zero holds, one non-test record excluded. Migration was subsequently applied in the production transition below.
- All 89 protected site/logo/publication/domain records unchanged. Five homepage examples and both Northline domains remain online (HTTP 200). Exact operator-showcase hosting exception preserves Northline without paid-feature entitlements; 12 focused tests passed.
- Live payments, notification processing, domain processing and refunds remain off.

## Production billing transition — 13 October

- All 14 eligible test receipts archived and reset to production free/unpaid; zero marked test billing records remain. The one other record was excluded.
- 56 site/publication/domain records and 33 logo-history records preserved; all five homepage examples and both Northline custom domains return 200.
- Production mode and matching credentials deployed to 27 services, all verified ACTIVE. All 328 tests pass. Sales, live notification processing, domain processing and refunds remain disabled. No real-money operation or purchase.
- Remaining cutover work: explicitly approved notification activation and delivery verification, final operations/policy review and customer acceptance, followed by explicit sales approval.

## Live notification delivery — 13 October (current)

- Both existing Stripe live destinations activated and independently show Delivered / HTTP 200 for a genuine harmless product-update event. Temporary product subscription removed; permanent counts restored to 15 plan events and 2 domain events.
- Plan/domain notification receivers enabled; domain fulfilment remains independently paused. Checkout, refunds and domain purchases remain off. No real charge or customer purchase.
- 330 tests pass; deployed unsigned requests rejected with 400. Notification transport gate is complete; real settlement remains intentionally untested. Final operations/policy/customer acceptance and separate sales/fulfilment approval remain.

## Free customer acceptance — 13 October 2026
- Chrome guest generated Cedar Trail Garden Care without sign-in or checkout. Owner created and verified support@pagegenie.ca; the exact guest design appeared in its saved projects and saved again successfully.
- Published free at https://pagegenie.ca/?site=eca26283-7f51-40f0-8288-59d82f4f128c after owner-authorised policies acceptance. Used business-name branding and fictional contact hello@cedartrail.example; no logo generation, checkout, real charge or domain purchase in this run.
- Published layout visually checked at 390×844 and 1440×900 browser viewports; estimate navigation reaches contact. This is responsive browser testing, not a physical-device test.
- Existing in-app guest allowance correctly blocked a second distinct build; clarified misleading “website is ready” limit copy, deployed generateGuestWebsite, and passed eight focused guest/handoff tests.
- Polish follow-up: missing contact information is requested after the policy agreement, causing the agreement to repeat after details are saved. Publication succeeds, but this ordering should be simplified.
- Live plan/domain sales, domain processing and refunds remain off; notification intake stays enabled.

## Publish-order polish — 13 October 2026
- Missing business contact details now open before policy acceptance. Save & continue advances directly to the policy prompt, then publication; blank details and cancellation stop the flow. Existing details skip the form. Repeated taps cannot create duplicate publication dialogs.
- 331 tests pass, including contact-save → one policy acceptance → publication and cancellation coverage; production bundle rebuilt. Checkout and money-movement configuration unchanged and off.
- Live phone-sized Chrome follow-up completed after reconnect: Cedar Trail's missing-details form appeared first; Save & continue opened exactly one policy agreement; accepting led directly to free publication of the same project eca26283-7f51-40f0-8288-59d82f4f128c. No repeated agreement or checkout. Temporary viewport reset; sales/processing/refund switches remain false.

## Final read-only service/settings preflight — 13 October 2026, 19:43–19:45 UTC
- All 60 Cloud Functions report ACTIVE; all 27 release consumers have expected credential bindings. All 12 distinct bound Secret Manager latest versions are ENABLED. Secret metadata is not proof of every provider permission; actual Stripe price/portal/tax reads and Cloudflare registrar/token checks also succeeded.
- PageGenie homepage, owner-page shell, sitemap, Northline subdomain and real test domain return HTTPS 200. An owner shell 200 does not establish privileged access; earlier owner access tests remain the evidence for that boundary.
- Live CAD prices verified: Starter 900/month, Complete 1900/month, HTML 4900 once, tax exclusive. Live customer portal active, returns to https://pagegenie.ca/?billing=return, supports end-of-period cancellation without proration, and has public login disabled. Stripe tax settings and Canadian registration active; remittance responsibility still requires owner review.
- Stripe dashboard confirms active PageGenie destinations with exactly 15 plan and 2 domain event types, both showing 0% error rate. Unsigned endpoint probes rejected with HTTP 400 Invalid signature. No new event, customer, checkout session or financial transaction created in this audit.
- Cloudflare account-token verification succeeded: registrar expires 2027-01-10T23:59:59Z; production DNS expires 2027-01-11T23:59:59Z. Rotate before expiry. The user-token verification endpoint does not apply to these account-owned tokens; account verification was used per https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/ . Read-only registrar GET confirmed pagegenie-domain-test.com active, expiry 2027-10-12T19:15:21Z, auto-renew off.
- Rechecked all 14 migrated billing records, zero remaining marked test billing, and 33 protected logo records unchanged.
- testMode=false; plan/domain notifications=true; plan sales, domain sales, domain processing and live refunds=false. These are the reviewed deployed release settings; no switches changed. Known limits remain actual live settlement and real .ca purchase (owner declined rehearsal), independent provider permission scope/expiry details unavailable through restricted Stripe keys, and the remaining owner policy/retention/remittance sign-off.


## Policy wording and retention — 13 October 2026

Removed obsolete claims that all checkout/domain transactions are sandbox tests and the internal prelaunch-review caption. Public policy now explains free build/account/publication, optional purchases, currently unavailable paid checkout and real purchases when enabled. Support/completed privacy cases: 12 months from closure; moderation/appeals: 24 months from final resolution; monthly manual disposal with quarterly hold reviews. No automated purge, existing record deletion, credential changes or payment switch changes in this release. Tax filing is owner-managed and not yet verified complete. Terms/content acceptance version remains unchanged: these edits clarify the privacy retention schedule and current payment availability without changing accepted content rules or fees.


## Final readiness recheck — 13 October 2026, 19:50 UTC

Read-only provider checks passed: 60/60 Cloud Functions ACTIVE; homepage, owner shell, sitemap, Northline and existing test domain returned HTTPS 200. All 12 bound secret latest versions ENABLED (metadata only, not a claim of every provider permission). Cloudflare registrar and production DNS token verification returned active; expire January 10 and 11, 2027 UTC respectively. Stripe live prices remain CAD 9/19/49, exclusive tax; live portal active with end-of-period cancellation and correct return URL. Canadian tax registration/settings active; owner arranging filing, not verified complete. Both webhook endpoints reject unsigned requests with 400 Invalid signature. Restricted key cannot list Stripe destinations (403); their enabled status and genuine signed delivery were verified in the earlier notification acceptance, not repeated here.

No code/configuration deployment since the preceding production audit; repository switches still disable plan checkout, domain checkout/processing and live refunds, with notification intake enabled. No checkout sessions, charges, refunds, registrations or provider-setting changes made. Public policy correction and support/moderation schedule are live at release ebdb164. Monthly case/email disposal is owner-managed, not a new automated purge. Existing free customer acceptance stands; no redundant account creation or paid AI generation in this check.

Remaining before enabling sales: owner confirms tax filing arrangement, then explicitly approves launch switches. At launch update the policy's currently-unavailable-checkout sentence to match availability. Known limitations above remain: no real settlement/.ca purchase rehearsal, owner-managed renewal/transfer fulfilment. Rotate Cloudflare credentials before their January expiries. Stripe SDK reports a newer API version is available; keep the tested pinned version for this release and assess an upgrade separately.


Domain/refund preparation: 61 focused tests passed; no production orders or queued jobs at read-only inspection; existing refund secret enabled. Processing and refund activation deliberately deferred to explicit go (see STRIPE-CUTOVER-REVIEW.md). No new deployment or money movement needed for this readiness pass.
