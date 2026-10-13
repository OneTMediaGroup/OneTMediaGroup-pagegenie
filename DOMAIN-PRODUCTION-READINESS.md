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
