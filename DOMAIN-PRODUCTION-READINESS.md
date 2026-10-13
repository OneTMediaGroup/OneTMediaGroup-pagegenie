# Production domain setup — 12 October 2026

Customer Stripe payments remain test-only. The production registrar adapter is not wired to test checkout: a sandbox payment must never purchase a real domain.

## Real registration proof

Owner explicitly approved one year of `pagegenie-domain-test.com`, US$10.46 plus tax capped at US$15, auto-renew off, and the Cloudflare registration agreement. Cloudflare checkout showed US$10.46 due. The purchase was submitted once through the production Registrar API with **inline customer contact fields**, not an omitted/default contact.

- Registration succeeded, resource reports active.
- Expires 12 October 2027, auto-renew false, WHOIS redaction requested.
- Cloudflare's domain-specific Contact screen confirms Scot Anderson / One T Media Group and the approved contact details. Private contact data and keys are not stored here.
- `CLOUDFLARE_REGISTRAR_TOKEN` is in Firebase Secret Manager, registrar-only account scope, expires 10 January 2027. No function currently binds it, and no public route can purchase with it.
- Firebase Hosting resource created for the purchased domain under `onet-pagegenie-sites`.

## Implementation and safeguards

`functions/domain-provisioning.js` provides guarded production registration, Firebase domain creation/reuse, DNS planning/application, and separate DNS/HTTPS readiness. Production registration requires a fresh exact-domain quote and explicit registrant/agreement approval supplied by trusted orchestration. Only .com/.net purchases are enabled in this adapter until other extension contact schemas are implemented. Real availability checks also confirmed .ca support at the provider; that alone does not implement .ca eligibility.

DNS writes verify zone identity, preserve existing email/TXT records, refuse routing conflicts and out-of-domain records, and only add missing Firebase-requested records. No record deletion or overwrite is automated. DNS-only A/AAAA/CNAME records avoid proxy/certificate confusion. A domain is ready only when Firebase reports active ownership, routing and usable certificate with no issues.

The purchase adapter is not an order-processing service: durable order claims, payment environment verification, provider-result reconciliation, retry scheduling and owner alerts must wrap it before customer checkout is enabled. Never retry a registration POST after an unknown outcome; query its status first. The controlled rehearsal retains its submission journal privately outside Git.

## Remaining before customer domain sales

- Finish the actual test-domain DNS/HTTPS and hosted-content verification (status recorded below).
- Connect production order orchestration to verified **live** Stripe domain payments only after separate launch approval. Do not reuse test-mode receipts as authorisation for production purchases.
- Approve DNS credential scope for new customer zones and assign only necessary Hosting permissions to the provisioning worker. This rehearsal's DNS key is restricted to its single test domain.
- Implement .ca eligibility/schema and any other advertised extension requirements before offering purchase.
- Document ownership verification emails, renewals, expiry reminders, transfer requests and manual reconciliation. Cloudflare's current beta does not expose renewals, transfers or contact updates through this API.
- Confirm applicable registrar/reseller obligations before operating registration for third-party customers. Inline registrant ownership does not transfer control of the Cloudflare account itself.
- Production keys expire 10 January 2027; rotate before expiry.

Sources: [Cloudflare Registrar API](https://developers.cloudflare.com/registrar/registrar-api/), [Firebase custom domains](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites.customDomains).

## Rehearsal status

Registration and domain-specific owner verification passed. Owner approved and created the 90-day DNS key restricted to pagegenie-domain-test.com (Zone Read, DNS Write), stored as CLOUDFLARE_TEST_DOMAIN_DNS_TOKEN in Firebase Secret Manager. Temporary plaintext copy removed after storage.

Applied only three new records with the provisioning adapter, no conflicts/deletions/overwrites: apex A 199.36.158.100 (DNS only), Firebase hosting ownership TXT, and the requested ACME TXT. Both 1.1.1.1 and 8.8.8.8 resolve the A record and expected TXT values. New alias maps to the existing published Northline demo; original domain mapping and billing remain unchanged.

Deployed customerWebsite adds support for operator-marked seoNoIndex aliases: robots meta + X-Robots-Tag, no advertised sitemap and an empty sitemap. Ordinary customer sites remain indexable. Direct HTTPS function request with the test hostname returns 200, Northline title, logo, tel/mailto links and noindex. This proves backend routing, not the new domain's certificate.

Last direct domain check at 19:26 UTC: certificate hostname mismatch, Firebase CERT_VALIDATING, no reported certificate issue. HTTPS completion and the browser walkthrough remain pending; do not call this domain launch-ready until normal validated HTTPS succeeds. All 169 tests passed; customerWebsite deployment succeeded. Live payments and customer production purchases remain disabled.

## HTTPS readiness update — 12 October 2026, 19:50 UTC

Normal certificate validation now succeeds for pagegenie-domain-test.com: TLS 1.3, Google Trust Services certificate matching the domain, expiry 10 January 2027. Both public resolvers return 199.36.158.100. HTTPS returns 200 with Northline title, logo, email and phone; HTTP redirects 301 to HTTPS. Browser opened successfully without any bypass. Contact links point to the fictional demo email and phone, not live customer contacts. This completes the approved single-domain TLS check, not the remaining customer registrar orchestration/renewal/transfer work.

## Staged production order core — 13 October 2026

`production-domain-orders.js` adds a disabled-by-default server-only worker core. It is not exported as a Firebase function, not wired to webhooks and has no bound production credentials. No real registration or payment was made by these tests.

- Requires matching live Stripe checkout, expanded successful PaymentIntent and unrefunded/undisputed paid charge; test payments are rejected.
- Revalidates exact domain, fresh approved price and customer registrant before acquiring an atomic order/domain reservation.
- Duplicate delivery cannot submit a second purchase; an uncertain response is reconciled by status only. Domain collision and non-active accounts stop processing.
- A completed registration survives DNS failure; connection work can retry separately. Delayed pending results cannot overwrite success.
- Records nextAttemptAt and ownerAlertRequired for future scheduler/alert integration. These fields alone do not schedule jobs or deliver alerts.
- Nine focused fixture tests pass. Combined domain tests passed before the final additional delayed-response regression; existing production adapter and sandbox-payment behaviour unchanged. Transaction concurrency tests use a serialised in-memory harness, not a deployed Firestore rehearsal.

Remaining: authoritative live quote/checkout creation and tax/total review; production webhook/scheduler wiring; credential scope; actual connection/alias ownership and eligibility checks in the connector; production status reconciliation rehearsal; durable owner alert delivery; .ca provider schema; renewal/transfer fulfilment and reseller requirements. Reconciliation status domain matching does not replace a future end-to-end ownership check. Live purchases remain disabled.

## Recovery alert integration — 13 October 2026

The existing domain-care trigger and scheduled sweep now recognise production `ownerAlertRequired` holds, including price/consent review and registered domains whose DNS connection failed. They create the same deduplicated owner recovery request used by the existing Resend notification path. Refunded orders do not generate immediate recovery alerts. Successful connection recovery clears the outstanding flag without another registration submission.

Validation: all 259 automated tests pass, including the added hold/connection alert eligibility and successful recovery regressions. This validates code behaviour, not a newly received production-order email. Production purchase processing remains unexported and disabled: no production scheduler, live Stripe checkout, or expanded DNS credentials were activated by this change. Billing config remains testMode=true.

## Production connection and .ca schema — 13 October 2026

Read-only discovery against the existing production registrar returned HTTP 200 for `/registrar/extensions/ca`. Its registration schema is saved in `tests/fixtures/cloudflare-ca-registration-schema.json` (public field definitions only). All 18 CIRA declaration categories now map to provider `ca_legal_type` values. The production payload requires current recorded CIRA consent and includes the required organization key, empty for an individual rather than inventing a business. The existing CIRA email heads-up remains. Sandbox remains .com/.net only. No .ca purchase was made; schema validation is not a successful registry-registration rehearsal.

`production-domain-connection.js` now binds Firebase Hosting and Cloudflare DNS adapters to an explicitly approved exact domain/zone. It checks the paid production order, permanent ownership claim, active account, Complete entitlement, publication owner and suspension state before provisioning and again before enabling the hosted alias. Cross-owner mappings are refused. DNS conflicts and pending TLS do not enable an alias. Its factory requires server-supplied credentials and approved-zone lookup, not customer input. Production response parsing also accepts Cloudflare's documented context.domain_name and rejects conflicting domain identities.

All 266 tests passed before the additional discovery-snapshot mapping test. The code is staged, not exported or activated. Remaining operational wiring: a production service identity with Hosting access; approved DNS credentials for customer zones (the existing key remains test-domain-only); a durable worker/scheduler bound to these adapters; live payment orchestration separately gated; actual .ca registration rehearsal only after explicit purchase approval. Customer payments remain test-only.

## Automatic connection deployment — 13 October 2026

Owner approved a dedicated 90-day account token: PageGenie Production DNS, Zone Read + DNS Write, expiring 11 January 2027. Stored in Firebase Secret Manager as CLOUDFLARE_PRODUCTION_DNS_TOKEN version 1; temporary plaintext file removed. Existing registrar key expiry remains 10 January 2027. Read-only readiness checks using stored credentials confirm the exact test-domain zone, active registrar record and HOST_ACTIVE / OWNERSHIP_ACTIVE / CERT_ACTIVE.

The connection-only automaticDomainConnections scheduler runs every five minutes, scanning bounded pages and processing at most two eligible connections per invocation. It does not submit registrations or use Stripe. It ignores sandbox/test fixtures, requires a registered paid production order and permanent matching ownership claim, leases work to avoid duplicate processing, discovers only the exact domain in the approved account, and saves connection progress to customer domainSettings. Errors retry after five minutes and use the existing owner-alert flag/queue. Production purchase orchestration remains disabled and live payments remain off.

Validation: 271 automated tests pass, including duplicate connection deliveries, provider errors, due-time checks and replacement orders. A paid customer purchase and fresh certificate issuance through this scheduler have not been rehearsed; the existing test domain already had active TLS. This deployment activates connection processing, not customer domain sales.

## Durable payment handoff — 13 October 2026

The signed Stripe webhook can now queue an exact matching paid production domain checkout. A deterministic job key deduplicates events. The fulfilProductionDomains scheduler leases jobs, independently retrieves and verifies the Stripe payment through the existing production processor, and uses its permanent purchase claim and unknown-result reconciliation before handing registered domains to automatic connection. Held/exhausted jobs flag owner review. Test receipts cannot enter this path.

Both switches are required: testMode=false AND liveDomainSales=true. Current settings remain testMode=true and liveDomainSales=false, so the new scheduler exits before accessing providers. The existing test checkout is unchanged. No new real registration was attempted.

Remaining cutover work: customer review/checkout callables still create sandbox orders and use test Stripe credentials. They must prepare production approval records and authoritative CAD totals/tax treatment, bind live Stripe credentials and webhook configuration, and support live plan lifecycle before sales activation. Merely flipping these switches is NOT a launch procedure. The owner declined another paid .ca rehearsal; first real .ca registration remains untested.

## Customer checkout wiring — 13 October 2026

Customer review, checkout, confirmation and status now distinguish sandbox from production using server configuration. Production review supports .com/.net/.ca, records the holder and current CIRA declaration, and checkout requires separate unchecked owner/agreement confirmations. The approval window covers checkout; registration still requires a fresh exact price. Production orders use CAD registrar cost plus exactly $2 and Stripe automatic tax, verified against the returned subtotal, tax, total and successful undisputed/unrefunded charge. Tax settings must be reviewed before the checkout can open.

Production checkout claims are leased and use persisted Stripe parameters and a stable per-order idempotency key. An ambiguous create resumes that same session rather than making another charge. Old/unknown/paid orders cannot be overwritten with a new review. Customer confirmation only verifies and queues fulfilment, then returns to the dashboard with truthful processing copy. Production connection status reads the saved DNS/HTTPS state rather than invoking sandbox connection code.

Deployed the customer domain functions, production fulfilment worker and separate `stripeDomainWebhook` endpoint. Its URL is https://northamerica-northeast1-onet-pagegenie.cloudfunctions.net/stripeDomainWebhook. The endpoint returns 503 while disabled. Existing plan/test webhook and plan credentials are unchanged. Backend secret selection uses STRIPE_LIVE_SECRET_KEY and STRIPE_LIVE_WEBHOOK_SECRET only at the future production configuration/deployment; stored live credentials alone do not activate checkout. Test mode is still true, liveDomainSales is false, taxSettingsReviewed is false.

286 tests pass. The additional focused simulated production checkout-to-registration-to-connection test also passes; all provider mutations there are mocks. No real charge, live Checkout session, or domain purchase was made. Actual live credential and webhook delivery verification remain pending Stripe identity verification and setup. Stripe Tax shows 0/2 setup steps; owner reports GST/HST registration, but no number has been collected or entered. Confirm registration, business origin and correct tax classifications privately in Stripe before setting taxSettingsReviewed. Do not assume tax collection includes filing/remittance.

## Live credentials and notification destination prepared — 13 October 2026

STRIPE_LIVE_SECRET_KEY version 1 is stored in Firebase Secret Manager. Read-only verification matched the expected One T Media Group account. Stripe Tax settings are active and the owner-entered Canadian GST/HST registration is active; automatic filing was not enabled. Product classifications and full launch tax review remain separate from recording that registration.

Created Stripe destination we_1UQ99G1uRlTVrdirNqIRXQXd, named PageGenie Domain Payments — Live, pointing to the stripeDomainWebhook URL above. It listens only to checkout.session.completed and checkout.session.async_payment_succeeded, using snapshot API version 2026-05-27.dahlia. With explicit user approval it was created briefly active and immediately disabled; Stripe showed zero deliveries. STRIPE_LIVE_WEBHOOK_SECRET version 1 is stored privately in Firebase and the temporary local secret file was removed.

Verified the destination is Disabled, its displayed secret is hidden, and the deployed endpoint still returns HTTP 503 while sales are disabled. testMode=true and liveDomainSales=false remain unchanged. No charge, checkout session, or domain purchase was created. This is staged configuration, not an end-to-end live delivery test: cutover still requires binding the live secrets through production deployment and enabling this destination after approval. Live subscription/plan lifecycle setup is separate; this destination only handles domain-payment handoff.

## Live plan notifications staged — 13 October 2026

Created the approved read-only Stripe key with exactly Checkout Sessions, Subscriptions, Invoices, Payment Intents, Charges/Refunds and Payment Disputes Read. Stored as STRIPE_LIVE_PLAN_READ_KEY version 1; each of the six read-only API checks returned 200 without logging customer payloads. Created destination we_1UQ9Ku1uRlTVrdirTX8vVyrt (PageGenie Plan Payments — Live), immediately disabled with explicit owner approval, and stored STRIPE_LIVE_PLAN_WEBHOOK_SECRET version 1. Temporary secret files were removed. Destination uses snapshot API version 2025-02-24.acacia and the 15 explicit event names in functions/live-plan-events.js.

The separate stripeLivePlanWebhook verifies signatures, ignores test/domain/unrelated events, and only updates existing server-created live billing records after matching their saved checkout, customer, owner, website and plan. It reads current Stripe state so delayed notifications do not resurrect canceled or refunded access. Full/partial HTML refunds, full current-invoice subscription refunds, failed renewals, cancellations and disputes use the existing entitlement policy. Notifications cannot create checkout sessions, purchases or billing records.

291 tests pass, including five new lifecycle/isolation tests. livePlanNotifications=false, testMode=true and liveDomainSales=false. The plan destination remains Disabled. Live plan product prices, checkout/customer/portal mode separation and a controlled delivery rehearsal are still separate cutover work; the read-only key cannot open checkout or create the live catalog. Do not describe this as live checkout activated or end-to-end live payment delivery tested.

## Live plan catalog and checkout prepared — 13 October 2026

Created and independently retrieved the three live Stripe prices: Starter CAD 900/month (price_1UQ9RM1uRlTVrdirIx7y3mf0), Complete CAD 1900/month (price_1UQ9Ro1uRlTVrdirs0E388Yi), and HTML CAD 4900 once (price_1UQ9SF1uRlTVrdir72m5YcMY). Each is active, live, CAD and exclusive of tax. Product IDs and prices are saved separately from the test catalog. Products use the account's General Electronically Supplied Services preset; final classification review remains gated by productionPlans.taxSettingsReviewed=false.

Created the expressly approved STRIPE_LIVE_PLAN_CHECKOUT_KEY version 1: Customers, Customer Portal and Checkout Sessions Write; Prices, Subscriptions, Invoices, Payment Intents, Charges/Refunds and Payment Disputes Read. Stored privately in Firebase; temporary plaintext removed. Dedicated live portal bpc_1UQ9Z61uRlTVrdirfy9bovzO supports invoice history, payment-method/address/email updates, and period-end cancellation. Plan changes and public portal login are disabled. No payable session, customer or charge was created.

Live checkout requires testMode=false, livePlanSales=true, livePlanNotifications=true and the plan tax review flag. All remain off/unreviewed. It validates the authoritative live price, collects the billing address and automatic tax, uses card payments, binds website/owner metadata, and keeps liveCustomerId separate from test customerId on the existing billingCustomers record (so privacy deletion blockers still apply). An immutable persisted attempt retries the same Stripe idempotency key after an ambiguous response; attempts older than 23 hours require support review rather than risking a second charge. Existing test billing records require explicit migration before live checkout; they are not silently treated as real purchases. Test webhooks cannot overwrite live records.

Signed-handler tests cover valid signatures, modified bodies, disabled processing and retryable failures; existing lifecycle tests cover failed renewal, cancellation, refunds, disputes and delayed delivery. This does not constitute a Stripe-originated live payment delivery rehearsal. Both live destinations remain disabled. Before launch: review product tax classifications, resolve test customer/site billing migration, deploy all billing consumers with production secret bindings, enable notification destinations and verify delivery under a separately approved controlled procedure, then explicitly approve sales activation. Do not simply flip testMode alone.

## Tax classification and Stripe-originated test delivery — 13 October 2026

Reviewed Stripe's official tax-code catalogue (https://docs.stripe.com/tax/tax-codes). Updated and verified live Starter and Complete products to business-use SaaS (`txcd_10103001`): the purchased product is access to the hosted business website builder, with hosting bundled. Updated and verified Own Your HTML to Website Design (`txcd_10701200`), using the customer's address for location. Prices remain CAD 9/month, CAD 19/month and CAD 49 once, exclusive of applicable tax. Business-use classification assumes commercial websites; review the category before expanding US sales to personal-use products.

There is no domain-registration-specific entry in the catalogue. Explicitly classified production registration and its ancillary CAD 2 service fee as General Electronically Supplied Services (`txcd_10000000`), instead of inheriting an account-wide default. This is the implementation's classification judgment, not a tax authority ruling. Both line items retain automatic tax and mandatory billing address. Sandbox pricing is unchanged.

Read-only Stripe checks confirmed active tax settings, Canadian/Ontario origin and active Canadian standard registration. No tax identifier was copied into the repository or chat. The technical taxSettingsReviewed flags are now true; this does not enable sales, constitute filing/remittance setup, or establish registration obligations in other jurisdictions.

Fresh Stripe test-clock rehearsal at 17:40–17:42 UTC passed six actual delivered notifications: failed renewal revoked paid access; successful retry restored it; cancellation revoked it; dispute revoked it; won dispute restored it; final cancellation revoked it. Firestore billing records were seeded only before the scenarios; subsequent transitions were performed by the deployed webhook. Both isolated test subscriptions ended canceled. Evidence: test subscriptions sub_1UQ9h61uRlTVrdir1NwcwwzM and sub_1UQ9ha1uRlTVrdirt6bXQNsP; webhook we_1UPUBg1uRlTVrdirC3zobhQj. No live charge, payable live session or domain purchase occurred.

301 automated tests pass, including explicit production line-item classification and unchanged sandbox behavior. testMode=true, livePlanSales=false, livePlanNotifications=false, liveDomainSales=false. Both live endpoints returned 503 in independent probes. Live destinations were not enabled; Stripe-originated LIVE delivery remains untested and must not be inferred from the test-mode rehearsal.

## Test billing cutover preparation — 13 October 2026

Added operator-only `scripts/migrate-test-billing.mjs`. It requires an exact billing document, defaults to dry-run, requires a test Stripe credential and all live switches off. It independently checks customer mode, terminal checkout state and ended subscriptions (including subscriptions referenced only by Checkout). Explicit `--apply` archives the original receipt and atomically replaces only that billing record with unpaid/free production state. A fingerprint prevents overwriting concurrent webhook changes. Sites, logos, publication, domains and both customer references remain untouched. Archived records remain inside the user's subtree for existing recursive deletion; the original billing/customer deletion-review blockers remain in place. No public endpoint exposes migration.

Read-only inventory found 18 billing records: nine eligible test records, seven held for active test subscriptions, one held for an unresolved checkout, and one non-test/unmarked record excluded. No account was migrated and no Stripe object was changed. This is cutover preparation, not a completed data migration: immediately before approved production cutover, end only reviewed test subscriptions/expire test sessions, repeat dry-run, apply each reviewed path, and verify the same sites remain available as free sites. Never grant real paid access from a test receipt; any owner demonstration entitlement needs a separate explicit policy.

Current remaining launch work (supersedes historical status paragraphs above):
- Execute the reviewed test-billing cutover at the agreed launch window; preserve test history and customer content.
- Audit and deploy all billing consumers with matching production credentials/configuration, with sales still disabled first.
- Enable and verify live Stripe notification destinations under explicit approval; test-mode delivery and signed unit tests already pass, but live delivery has not been demonstrated.
- Recheck existing real-domain HTTPS and published content; no additional domain purchase is authorized. The owner declined a fresh real .ca purchase rehearsal, so that limitation remains.
- Confirm operational registrar/reseller responsibilities and tax filing/remittance arrangements; Stripe tax collection alone is not evidence of remittance setup.
- Final customer/mobile smoke check and explicit owner approval before enabling sales. No real charge is authorized.

## Production settings audit — 13 October 2026

Read-only Cloud Functions inventory confirmed ACTIVE status for checkout, billing status/portal, HTML download, promotions, publishing, analytics, custom-domain settings, cinematic generation, custom-domain serving, event recording, both live notification endpoints and domain checkout. Current plan consumers bind STRIPE_SECRET_KEY as expected in test mode; the separate live plan notification endpoint binds the live read key and signing secret. Domain webhook currently binds test credentials because configuration is still test mode; it must be redeployed with production configuration before its live destination is enabled. No secret values were printed.

Fixed cached entitlement paths: custom-host serving, event recording and sandbox-domain resolution now reject billing from the wrong configured environment. Production domain provisioning always requires an explicitly live receipt before Hosting or DNS access. Existing unmarked legacy fixtures remain usable only in test mode, never production. Interactive paid features already use readBilling and mode-selected secrets. Added plan-matrix and revoked-access tests. Owner domain recovery is currently sandbox-only: added an explicit production-order refusal before provider access; live recovery remains a manual Stripe/registrar workflow, not an automated feature claimed ready.

Production cutover deployment set (deploy together; first with sales off): createCheckout, billingStatus, createBillingPortal, downloadWebsite, promotionalKit, publishWebsite, websiteAnalytics, saveDomainSettings, cinematicDesign; customerWebsite, recordSiteEvent, connectDomainAfterRegistration, connectDomainAfterPlanChange, connectDomainAfterPublication, domainConnectionStatus, resolveDomain; createDomainCheckout, registerDomain, domainRegistrationStatus, stripeDomainWebhook, fulfilProductionDomains, automaticDomainConnections. The live plan webhook is separately gated by livePlanNotifications and requires deployment when that flag changes. Keep the test stripeWebhook isolated. Do not infer readiness from a secret merely existing in Secret Manager.

The audit does not authorize sales, refunds or domain purchases. Live Stripe permission/delivery verification at cutover and manual production domain recovery remain operational requirements. Test receipt migration is still staged, not applied.

## Production domain owner recovery — 13 October 2026

Owner domain recovery now reads the production registrar status and exact live Stripe payment/refund. Successful registrations return to the connection queue without another purchase; unknown/mismatched/provider-error results cannot refund. Confirmed failed submissions require the permanent matching ownership claim. Orders held before submission can refund only while still needs-review, with no submission marker or claim. Refunds include the entire verified amount (registration, fee and tax); disputed or already-refunded charges are refused.

Refund submission claims the order transactionally before Stripe and uses a stable per-order idempotency key. An unknown response with no saved refund ID is held for operator reconciliation, never automatically repeated beyond the idempotency window. Known refund IDs are read and reconciled for pending/succeeded/failed outcomes. The dashboard has a confirmation and shows live refunds disabled while the separate liveDomainRefunds flag is false. Current sales switches remain off. Existing production read credentials support checks only; actual refunds require a separately approved STRIPE_LIVE_DOMAIN_REFUND_KEY with appropriate permissions and deployment. No live refund was attempted. Provider-injected tests cover six failure/success families; full suite passed 318 tests before the additional never-submitted guard refinement.

Refund credential completion: owner approved the exact scope and completed Stripe identity verification. Created PageGenie Domain Refunds — Live with only Charges and Refunds Write, Payment Intents Read and Checkout Sessions Read; verified the saved permission selections. Stored STRIPE_LIVE_DOMAIN_REFUND_KEY version 1 in Firebase Secret Manager and removed the temporary local plaintext file. Read-only Stripe checks for all three resources returned 200. No live write request was made. liveDomainRefunds=false remains unchanged; the deployed recovery function continues using its read-only production credential until a separately approved activation/deployment binds the refund key. Seven focused recovery tests pass, including never-submitted held orders. Actual live refund execution is intentionally untested.


## Owner dashboard sandbox refund rehearsal — 13 October 2026

Created a fresh disposable northline-refund-retest.example order and completed an actual Stripe test Checkout for CAD 12 (CAD 10 cost plus CAD 2 fee). Registration failure was simulated; no registrar submission or real domain purchase occurred. Owner status check refused to infer a registrar result for the dummy domain (503), without submitting a purchase. With the fixture staged as confirmed failed and paid, the owner dashboard confirmed the entire refund. A second dashboard refund attempt was rejected (400); independent Stripe readback still showed exactly one succeeded test refund for CAD 12, matching the saved refund ID. The actual recovery request was marked handled through the dashboard with an explanatory customer-visible note. An extra manually seeded companion request had a nonstandard ID and was rejected by validation; it was closed directly as fixture cleanup. Seven provider-injected production recovery tests passed. All live sales, notifications and refund flags remain false. This validates sandbox UI/refund handling and mocked production safeguards, not execution of a live production refund.

## Production billing transition — 13 October (current)

The approved 14 test billing records are archived and migrated to free production state, with sites/logos/examples preserved. Production configuration and matching credential bindings are deployed and verified across 27 services, including domain review/search/confirmation and the production domain webhook. All 328 tests pass. All live sales/processing/notification/refund switches remain false, both notification endpoints return disabled 503 responses, and no real checkout or purchase was created. This supersedes earlier migration and credential-deployment pending notes. Notification activation and final acceptance still require completion before sales approval.

## Notification-only activation — 13 October (current)

Live domain notification intake now has its own liveDomainNotifications switch, enabled alongside plan notifications. Both Stripe destinations are active with their original 2/15 event sets. Actual Stripe product-update delivery returned 200 to each, after which the temporary product.updated event selection was removed. Domain fulfilment, both checkout switches and refunds remain disabled. No charge or registration occurred. This completes transport/signature verification, not a live settlement or .ca purchase rehearsal.
