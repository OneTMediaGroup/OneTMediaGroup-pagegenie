# Domain care — 12 October 2026

Live customer payments remain disabled. This release adds support-managed renewal and transfer requests, production expiry notices, and an owner-only recovery queue. It does not automatically renew domains, enable auto-renew, unlock transfers, expose authorisation codes or submit production purchases.

## Customer and owner workflow

From a saved website's domain step, open **Manage registration · renewal & transfer**. Paid, registered domains can request renewal help or a transfer. An uncertain or failed order can request investigation. Repeated requests for the same action/order/expiry are deduplicated. The customer sees the request status and the operator's outcome. Only the account owner can see its registration information; owner review requires the protected owner session on owner.html.

Open **Domain care & recovery** in the private owner workspace to see up to 50 open requests. Verify the actual registrant, provider record, current price, customer approval, locks and registry rules before acting. Resolve requests with a customer-readable outcome. This closes the support request only: it does not execute a renewal/transfer or update registrar expiry. Never include transfer codes or credentials in an outcome. Deliver sensitive transfer information through a separately verified channel.

A request queues an owner email to gotyourschase@hotmail.com. Resend retries use a stable idempotency key and stop retrying after 20 hours, with an operations alert. Provider acceptance is not proof of inbox delivery. Owner confirmed both renewal and transfer request alerts reached gotyourschase@hotmail.com in the phone test below. Owner also confirmed the seven-day fictional expiry reminder arrived with the correct date, renewal responsibility and sign-in link; see rehearsal below.

## Expiry reminders

Every six hours the scheduler checks 100 domain orders, with a persistent cursor. Production registrations with paid status and a valid recorded expiry queue one notice per expiry cycle at the first observed 60/30/7/1-day stage and at expiry. Missed stages are not backfilled. Sandbox, inactive/deleted accounts, unverified or disabled recipients, stale order references and changed expiry records are excluded. Large inventories require a shorter interval or larger/bounded worker pipeline before reminder timing can be guaranteed.

Reminders distinguish website subscriptions from domain renewals, explain recorded auto-renew settings are not proof of renewal, and point to support. They cannot guarantee recovery after expiry. Automatic refresh of production registrar expiry and fulfilment of renewals/transfers remain launch gates; records must be reconciled after an operator completes those actions.

## Failed and uncertain orders

Unknown, failed-paid and failed-refund writes create a private recovery request; a periodic sweep also catches older pending orders. **Check registrar / refund status** performs read-only sandbox status checks or retrieves an existing Stripe test refund. Exact domain, active registration and completed workflow evidence are required to mark registered. Provider errors leave the order on hold. Production orders require manual provider verification.

**Refund confirmed failed order** is limited to sandbox, failed, paid registrations with the exact paid test checkout and no prior charge refund activity. It refunds the entire order including the $2 fee through the existing idempotent helper. A persisted submission marker prevents replaying a lost-response refund after provider idempotency expiry. Missing refund references require operator investigation; they never trigger another refund. A failed paid order cannot be replaced before financial reconciliation. Recovery checks never submit another registration.

## Verification

- Local automated suite: 190 tests, including expiry stages, deduplication, production/sandbox isolation, exact registrar/refund evidence, lost refund responses, request UI and owner UI.
- Isolated Firestore emulator: concurrent request deduplication, own-account read, cross-account/unverified/non-owner denial, sandbox reminder exclusion, production notice deduplication and deletion hold.
- No real renewal, transfer, refund or domain purchase was performed for this release. Existing production fulfilment and live billing safeguards remain in place.

## Live phone request rehearsal — 12 October

- Chrome at 390 × 844, actual deployed page and protected domainManagement callable. Current signed-in customer test account: gotyourschase@hotmail.com.
- Used a separate, labelled **Northline · domain care test** draft and northline-domain-care.example sandbox fixture. Its paid-registration fields simulate an eligible order only; no Stripe transaction or registrar action exists for this fixture. The original Northline registration was not changed.
- Submitted renewal help and transfer requests through the phone UI. Both persisted as open private requests, both buttons changed to Requested, and both records have notificationSentAt. Owner confirmed both alert emails arrived.
- Dashboard Domains now opens domain care directly for registered domains; other domains retain the search/owner-details route. Ten focused dashboard/domain UI tests and the build passed.
- Requests were subsequently resolved in the owner review rehearsal below. No renewal, transfer, purchase, refund or live-payment enablement occurred.

## Expiry-reminder delivery rehearsal — 12 October

- Seven focused domain-care tests passed, covering all 60/30/7/1/0 boundaries, missing/invalid expiry, production/sandbox exclusions, renewal responsibility, auto-renew caveat, expired-domain recovery wording and explicit TEST labelling for fixtures.
- Used only the existing northline-domain-care.example fictional record. Temporarily simulated a paid production registration with expiry 19 October 2026 at 23:48 UTC, then queued its deterministic seven-day notice using the same core reminder-stage and ID helpers. No real registrar record, purchase or billing status changed.
- Deployed notifyDomainExpiry selected the verified customer email and sent the TEST notice; notificationSentAt recorded 12 October at 23:55 UTC. Owner confirmed receipt and correct content at gotyourschase@hotmail.com. The email contained the domain/date, warning that the website plan does not renew domains, no-charge support-request wording and sign-in link.
- A second create of the same notice was rejected as already existing. Exactly one fixture notice exists. Restored the record to sandbox with its original 2027 expiry after delivery, preventing further production expiry notices for the fixture.
- The production-wide schedule was not manually run: automatic approval review rejected its potential to email unrelated customers. Live delivery testing was deliberately scoped to one fixture; scheduler iteration/deduplication is covered by the earlier isolated Firestore rehearsal. This does not prove future cron uptime or production registrar expiry refresh. Live payments remain off.

## Owner handling and customer update rehearsal — 12 October

- Used the protected scotfree owner dashboard at 390 × 844 to mark both fictional Northline requests handled. Saved explicit customer-facing outcomes explaining that no actual renewal or transfer occurred and no charge was made.
- Read back both records: status resolved and the exact outcome notes persisted.
- In the existing Chrome tab signed in as gotyourschase@hotmail.com, loaded the latest customer controls, opened Domains → Northline · domain care test, and confirmed both resolved outcomes through the actual customer UI at 390 × 844. Screenshot saved outside the repository as domain-care-customer-phone.png.
- Fixed the owner queue's stale open-request count after handling. It now updates the remaining count or shows “All caught up. No open domain requests.” Two focused UI tests, the build and diff checks passed; change pushed as debb920.
- This verifies support-request handling and customer visibility only. It does not perform or prove a registrar renewal or transfer. Live payments remain off.

## Failed-order recovery rehearsal — 12 October

- Created a separate labelled **Northline · failed order test** fixture using northline-recovery.example. No registrar registration was submitted. A real Stripe **test-mode** checkout collected CAD $10 simulated domain cost + $2 service fee using a test card; no real money moved.
- In the protected owner phone UI, an uncertain registrar status stayed on hold and warned against another purchase. Refunding an unknown registration was rejected. Staged a simulated confirmed registrar failure on that fixture, then used the owner refund control: Stripe confirmed one full CAD $12 test refund, including the fee. A repeated refund attempt was rejected; Stripe readback showed exactly one refund, CAD $12 total, and the order was recorded refunded.
- The isolated Firestore concurrency drill initially exposed a discarded transaction callback retaining its registration claim. Changed fulfilment to use only the committed transaction return value. Also made the refund-submission marker an atomic transaction claim, preventing simultaneous calls from submitting the same refund independently.
- Isolated Firestore drill now passes: 12 simultaneous fulfilments → one registrar submission; lost registration response + 12 retries → no extra registration/refund; every unresolved or paid recovery state rejects new checkout; 12 simultaneous refunds → one submission; lost refund response + 12 retries → no extra refund. Providers in this concurrency drill are counted fakes, not real registrar or Stripe requests.
- Full local suite passed 191 tests after the fix. Added a separate regression test for a discarded transaction claim; all 12 domain-payment tests pass including that new case. Live payments remain off. Production registrar fulfilment is not proven by this fictional-domain simulation.

- Deployed the fix successfully to confirmDomainCheckout, registerDomain, domainRegistrationStatus, reviewDomainService and stripeWebhook. Marked the test recovery request handled with its full outcome note; a fresh owner queue read after deployment showed no open requests. Phone proof saved outside the repository as domain-recovery-owner-complete-phone.png.

## Registrar expiry reconciliation — 13 October 2026

The care worker now scans up to 100 records every 15 minutes, stops starting work after a 60-second budget, and resumes from the last processed record. Eligible real production registrations are read via Cloudflare Get Registration before reminders: exact domain, active status and valid expiry are required. Saved expiry and reported auto-renew update transactionally only if the order/expiry/lifecycle has not changed. Sandbox and synthetic fixtures are excluded. Reads time out after ten seconds; failures preserve the old date but mark it unverified and queue a deduplicated owner operations alert. No renewal, transfer, DNS or payment API is invoked.

Reminder delivery also requires a verified record no older than eight hours and the exact queued expiry. A renewal invalidates old notices; stale or unavailable provider evidence suppresses the notice. Nonactive registrar states require operator investigation rather than guessing renewal/transfer status. Large inventories still require capacity monitoring; this is not a guarantee of reminder timing.

325 tests pass, including renewal date changes, provider errors, wrong-domain responses, nonactive states, fixture isolation, concurrent updates/deletion and freshness boundaries. Read-only Cloudflare check of pagegenie-domain-test.com returned active, expiry 2027-10-12T19:15:21Z, auto-renew false. No domain changes or customer emails were initiated by that check. API contract: https://developers.cloudflare.com/api/resources/registrar/subresources/registrations/methods/get/ .

Deployment confirmed: checkDomainCare and notifyDomainExpiry updated successfully on 13 October. The automatic schedule was not manually triggered, avoiding unsolicited customer notices. All live payment/refund flags remain false.


## Scheduled-operation observation — 13 October 2026
Read-only production audit: Cloud Scheduler job firebase-schedule-checkDomainCare-northamerica-northeast1 is ENABLED every 15 minutes. Last attempt 2026-10-13T19:30:01.887508Z reported no error; operationsHealth/domainCare completed at 19:30:02.287Z, checked eight records, and had no remaining cursor. No eligible non-fixture production domain orders existed. This verifies scheduled execution, not a real customer renewal/expiry cycle. No job was manually triggered, and the audit sent no customer notices or registrar changes.

## Owner renewal and transfer handling
1. Match the request to its signed-in owner, saved project and exact registered domain. Check lifecycle/suspension state, current registrar status, expiry and any unresolved order before acting.
2. For renewal, obtain the provider's current renewal quote and term. Show the customer the total, currency, service fee (if any), tax treatment and auto-renew setting. Obtain explicit approval before any paid action; a help request is not payment authorisation.
3. For transfer, verify the customer's request through their account, check provider locks and eligibility, and explain the provider's requirements and any expiry risk. Never put a transfer code in a public note or ordinary support log; use the provider's protected handoff. Do not promise transfer completion until provider confirmation.
4. Perform only the approved provider action. If its result is uncertain, check the existing operation before retrying; do not issue a second purchase or assume failure. Escalate unresolved status and keep the request open.
5. Reconcile provider confirmation into the saved domain state, including verified expiry and auto-renew after renewal, or confirmed transfer status. Check website/DNS/HTTPS separately where applicable. A support note alone must never claim to have renewed a domain or changed its expiry.
6. Mark the request handled only after confirmation, with a plain-language customer outcome and next steps. Retain the minimal receipt/approval evidence under the approved retention policy. A failed registration refund follows the verified owner refund workflow; domain renewals/registrations are not assumed refundable.

These instructions do not authorise charges, transfers or credential disclosure. Live checkout, registrar processing and refunds remain off until separately approved.
