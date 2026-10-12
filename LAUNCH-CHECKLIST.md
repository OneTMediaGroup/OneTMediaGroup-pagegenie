# PageGenie launch checklist

Updated 12 October 2026. Live payments and real registrar purchases remain disabled. This is the consolidated status record; an implemented feature alone is not launch approval.

## Verified

- Account creation, verification/reset return, dashboard, mobile editor and inline saving.
- Paid entitlements enforced by server; real Stripe test checkout, scheduled/immediate cancellation, refunds, delayed duplicate webhooks, billing return and subscription expiry tested. See BILLING-TEST-RESULTS.md.
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

## Still required, in priority order

1. **Bot protection and operational alerts.** Configure/test App Check without locking out real browsers, enforce it on relevant callables, verify multi-account/rate-limit bypass scenarios, and alert the owner to AI/provider failures, quota pressure, payment/webhook failures and failed backups. Confirm protected owner access/MFA and an incident-response routine.
2. **Commercial and legal finalisation.** Confirm the actual legal operator/contact details, countries served, applicable tax registration/setup with qualified advice, final checkout/renewal disclosures, refund handling and policy review. Set documented retention for billing, audit/security records, support correspondence and third-party systems; content deletion alone does not resolve these.
3. **Complete billing failure/dispute operations.** Test failed renewals, chargebacks/disputes and resolution, plus domain registration failure after payment/refund and reconciliation. Prevent double fulfilment; preserve records and customer access only as intended. Domain renewals, transfer and expiry need a clear owner/customer process.
4. **Production domain fulfilment.** Confirm registrar production access, reseller/registrant eligibility and customer ownership; test actual purchase-to-DNS-to-HTTPS provisioning and failure recovery. A working PageGenie subdomain and registrar sandbox do not prove real registration fulfilment.
5. **Production Stripe preparation.** Separate PageGenie live prices/webhook/customer portal, correct PageGenie receipts/card descriptor, tax configuration and refund/support process. The shared sandbox account currently displays FLOOR FLOW; do not alter other products' shared branding blindly. Keep live-payment safeguards in place until the reviewed switch.
6. **Final launch acceptance.** Repeat clean mobile/desktop end-to-end checks, accessibility and content-safety adversarial tests; verify restore/config recovery instructions and notifications; conduct a tightly controlled real-payment/refund and domain test only with explicit authorisation. Owner signs off only after every gate is closed.

No soft launch or public paid launch is approved. Passing these tests does not replace legal/accounting review or guarantee zero abuse, downtime or AI cost.
