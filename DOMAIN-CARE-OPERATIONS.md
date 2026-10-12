# Domain care — 12 October 2026

Live customer payments remain disabled. This release adds support-managed renewal and transfer requests, production expiry notices, and an owner-only recovery queue. It does not automatically renew domains, enable auto-renew, unlock transfers, expose authorisation codes or submit production purchases.

## Customer and owner workflow

From a saved website's domain step, open **Manage registration · renewal & transfer**. Paid, registered domains can request renewal help or a transfer. An uncertain or failed order can request investigation. Repeated requests for the same action/order/expiry are deduplicated. The customer sees the request status and the operator's outcome. Only the account owner can see its registration information; owner review requires the protected owner session on owner.html.

Open **Domain care & recovery** in the private owner workspace to see up to 50 open requests. Verify the actual registrant, provider record, current price, customer approval, locks and registry rules before acting. Resolve requests with a customer-readable outcome. This closes the support request only: it does not execute a renewal/transfer or update registrar expiry. Never include transfer codes or credentials in an outcome. Deliver sensitive transfer information through a separately verified channel.

A request queues an owner email to gotyourschase@hotmail.com. Resend retries use a stable idempotency key and stop retrying after 20 hours, with an operations alert. Provider acceptance is not proof of inbox delivery. Actual new domain-care email delivery has not yet been confirmed by the owner.

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
