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

Registration and domain-specific owner verification passed. Firebase resource is awaiting DNS; DNS key is prepared with Zone Read and DNS Write for pagegenie-domain-test.com only, but creation is awaiting the owner's explicit approval. No DNS mutation or HTTPS completion is claimed yet. All 168 automated tests and frontend build passed; focused provisioning tests also passed after the DNS conflict refinement.
