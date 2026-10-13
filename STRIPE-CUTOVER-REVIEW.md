# Stripe cutover review — 13 October 2026

## Current verified state

No live sale, refund, domain purchase or payment link was created. The approved 14-record billing migration is complete. testMode=false; livePlanNotifications=true and liveDomainNotifications=true. livePlanSales, liveDomainSales, liveDomainProcessing and liveDomainRefunds=false.

Read-only Stripe checks verified active live CAD prices: Starter 900 cents monthly, Complete 1900 cents monthly, HTML 4900 cents once; correct product IDs and exclusive tax. Dedicated live portal is active with PageGenie return URL, invoices/payment-method updates and period-end cancellation; public portal login disabled. No payable live Checkout Session was created, so its rendered checkout remains unverified.

Chrome Stripe dashboard independently showed PageGenie Plan Payments — Live disabled (15 events) and PageGenie Domain Payments — Live disabled (2 events). Restricted checkout credential cannot list webhooks (403), as expected from its scope; no permission expansion. Both deployed endpoints returned 503 with their disabled messages. Other One T Media Group destinations were untouched.

Fifteen deployed billing/access/recovery functions were ACTIVE. Before the production transition, plan consumers bound STRIPE_SECRET_KEY; live plan notifications bind their dedicated live read key and signing secret. The domain webhook previously bound test secrets; production bindings are verified in the transition below. Recovery binds the production read credential, not the staged live refund credential.

45 focused tests passed: live checkout gates/identity, notifications, plan access, cancellation/refund/dispute state, mode isolation, migration and guest handoff. Test/unmarked receipts cannot unlock production paid features. Free publication uses the preview path with no paid-feature requirement; account verification, ownership, contact details and policy/moderation checks still apply. Existing free sites/drafts/logos must not be removed by billing migration.

Historical pre-cleanup billing inventory: 18 records; 9 eligible test records, 8 held (7 subscriptions need ending and 1 unresolved checkout), 1 non-test excluded. This snapshot precedes authorised disposable synthetic-account cleanup. Named testers/owner/example accounts require deliberate per-account handling; never bulk-delete them to remove a launch blocker.

## Activation sequence — billing migration and notification activation completed; sales remain unauthorised

1. Approved test subscriptions/checkouts are now closed (see cleanup below). Run a fresh migration dry-run then exact per-record migration, preserving sites/logos/domains and archives. The 14 eligible records have now been migrated, with zero test billing records remaining.
2. Production mode is now selected with sales/refunds OFF; deployment verification is recorded below. Deploy all configuration consumers as one reviewed release: createCheckout, billingStatus, createBillingPortal, downloadWebsite, promotionalKit, publishWebsite, websiteAnalytics, saveDomainSettings, cinematicDesign; customerWebsite, recordSiteEvent; connectDomainAfterRegistration, connectDomainAfterPlanChange, connectDomainAfterPublication, domainConnectionStatus, resolveDomain; createDomainCheckout, registerDomain, domainRegistrationStatus, stripeDomainWebhook, fulfilProductionDomains, automaticDomainConnections, reviewDomainService. Verify selected secrets and cached-access isolation. Keep test stripeWebhook isolated.
3. Separately approve activation of live plan notification processing and its Stripe destination, then verify signed delivery. Enable checkout only after notification readiness and explicit launch approval. Enable liveDomainProcessing and deploy its matching production webhook/worker, then activate the domain destination before separately enabling liveDomainSales. Checkout requires processing readiness as well as the sales switch. Do not leave a payable link without working fulfilment.
4. Recheck free generation/account/publication and correct paid access after deployment. A no-charge audit does not prove live card settlement; no real-money rehearsal is authorised.
5. Live refunds remain a separate OFF switch until explicitly approved and the refund credential is deployed.

## Incident/rollback rule

Do not simply flip testMode back after live purchases exist: that would lock live receipts and could re-expose test entitlements. Keep production mode, stop new checkout, preserve sites and billing, and reconcile outstanding payments. Keep plan notifications running to process failures/refunds/cancellations. Domain sales now have a separate gate from liveDomainProcessing. Keep processing enabled when pausing new domain checkout so already-paid, verified jobs can finish. An explicit processing pause is a separate incident action; monitor/replay outstanding events after restoring it. Both gates are false in the current release.

## Authorised synthetic-account cleanup

One machine-created @example.invalid account with four drafts, zero public sites and zero domain records entered the existing 30-day recovery/deletion flow. Verified test billing was archived, its test customer reference removed, and refresh tokens revoked. All its test subscriptions/checkouts were already closed; none needed cancellation/expiry. No real billing or named tester/owner/example account was removed. Inventory immediately after synthetic-account cleanup: 15 billing records, 6 eligible, 8 held (7 subscription holds, 1 checkout hold), 1 non-test excluded. Cleanup does not make the remaining accounts launch-ready automatically.

## Authorised test billing cleanup — 13 October

Cancelled the seven explicitly approved Stripe test subscriptions without proration or an immediate invoice, and expired the one unfinished test Checkout Session. Verified test mode and exact customer ownership before each provider operation. Archived prior billing records and reconciled current provider state: seven canceled, one expired, all unpaid. No live financial operation or account deletion occurred.

Latest read-only migration inventory: 15 records, 14 eligible, zero held, one non-test excluded. No production-mode migration was applied; testMode remains true and all five live gates remain false.

Before cancelling Northline's test subscription, deployed an exact operator-showcase exception for northline.pagegenie.ca and pagegenie-domain-test.com, restricted to their existing owner/project mapping. Publication, suspension, account lifecycle and enabled mapping checks still apply. This preserves public examples without granting paid editing features or customer-domain access. Twelve focused hosting/settings tests passed.

After cleanup, hashes of all 89 protected site, logo, publication and domain records were unchanged. All five homepage examples and both connected Northline domains returned HTTP 200 with unchanged titles and response lengths.

## Production billing transition completed — 13 October

User explicitly authorised the 14-record migration and production preparation with live payments off and no real charges. Revalidated all 14 against Stripe TEST customer/subscription/session state, archived each original receipt, and replaced only its billing record with production free/unpaid state. Zero marked test billing records remain; the other pre-existing non-test record was excluded. Content and customer references were not migrated or deleted.

The 56 project/publication/domain snapshot records were identical before and after migration. Separately verified all 33 saved logo-project/version records against the previous protected snapshot, also unchanged. All seven public example URLs (including both Northline custom domains) return HTTP 200 with their prior titles and lengths.

Set testMode=false and retained livePlanSales=false, liveDomainSales=false, livePlanNotifications=false, liveDomainProcessing=false and liveDomainRefunds=false. All 328 automated tests passed; updated environment-dependent paid fixtures to explicit production receipts. Deployed 27 affected services, including domain search/review and checkout confirmation, and independently verified all ACTIVE. Plan consumers bind STRIPE_LIVE_PLAN_CHECKOUT_KEY; the domain webhook binds STRIPE_LIVE_SECRET_KEY and STRIPE_LIVE_WEBHOOK_SECRET; live plan notifications retain their dedicated read/signing credentials. Refund write access remains unbound.

Both notification endpoints return HTTP 503 with their explicit disabled messages. Stripe destinations were not enabled. No checkout session, charge, refund or registration was created. Existing test webhook remains isolated and refuses migrated production billing records. Next: separately approve notification activation/delivery verification, complete final operations/customer acceptance, then explicit sales approval. Free publishing remains available; test paid entitlements were intentionally removed.

## Live notification activation and delivery — 13 October

Owner authorised notification activation only, with checkout off and no real charges. Added independent liveDomainNotifications gate so receiving/queueing signed events does not activate the domain fulfilment worker. Domain sales now require notifications AND processing readiness; both sales and processing remain false. Plan notifications enabled; sales/refunds remain false. Deployed eight affected functions successfully; 330 tests passed, including notifications while fulfilment is paused and sales refusal without notifications.

Activated the existing PageGenie Plan Payments — Live and PageGenie Domain Payments — Live Stripe destinations. With no historical live checkout event available, temporarily subscribed each to product.updated and re-saved the existing PageGenie HTML product unchanged. Stripe itself delivered the resulting live events to both endpoints with HTTP 200. Confirmed event evt_1UQB1n1uRlTVrdirEOfmzIMM marked Delivered at both destinations. No customer, checkout, charge, refund, domain registration or paid entitlement was created. Product name/description/tax code/default price remained unchanged.

Removed product.updated from both destinations after verification; final active subscriptions are exactly the original 15 plan events and 2 domain checkout events. Updated descriptions to reflect the disabled sales state. Unsigned probes to both deployed endpoints return HTTP 400 Invalid signature. Verified all 27 release functions ACTIVE, 14 migrated billing records preserved and all 33 logo records unchanged.

This verifies genuine Stripe-to-production transport and signature validation without money movement. Paid lifecycle logic remains covered by the prior Stripe test-mode rehearsal and automated tests; actual live settlement and .ca purchase remain untested by owner choice. Evidence screenshots: verification/stripe-plan-delivered.png and verification/stripe-domain-delivered.png. Next gates are final operations/policy/customer acceptance and separate fulfilment/sales approval.


## Domain processing and owner refund readiness — 13 October 2026

Owner requested readiness only, with checkout off and no charges or domain purchases until explicit go. All four gates remain false: livePlanSales, liveDomainSales, liveDomainProcessing, liveDomainRefunds. No deployment is needed merely to repeat readiness: fulfilProductionDomains is already deployed with its processing guard. Do not turn it on as a preparatory task; it authorises real registrar calls.

Read-only production inventory: zero productionDomainJobs and zero production-environment domainOrders. STRIPE_LIVE_DOMAIN_REFUND_KEY latest version ENABLED (metadata check only, not a write-permission proof). 61 focused production-domain, payment and settings tests passed, including recovery safeguards. No live refund or registration request submitted.

After explicit activation approval:
1. Recheck pending jobs/orders and configuration immediately before activation; this empty inventory is only a point-in-time check.
2. Set liveDomainProcessing=true and deploy fulfilProductionDomains and other consumers of that gate, keeping both sales switches false. Verify deployed function/scheduler readiness before opening domain checkout.
3. Separately set liveDomainRefunds=true and deploy reviewDomainService; this binds the existing restricted STRIPE_LIVE_DOMAIN_REFUND_KEY instead of its current read-only credential. Verify owner authentication, deployment binding and enabled control. Do not submit a refund as a readiness check. Recovery validates the paid order, registrar outcome and duplicate-refund claim before any money movement.
4. Only after owner approval open checkout. If stopping new sales later, leave processing available for already-paid orders unless a processing incident requires its own pause. Preserve all customer sites and records.

Current preparation adds no scheduler changes, permission grants, credentials, charges or domain purchases. The refund write credential remains unbound until the separately approved activation deployment.


## Authorised activation — 13 October 2026, 19:57 UTC

Owner explicitly approved domain processing and owner refund controls while keeping checkout off and forbidding charges, refunds or purchases during verification. Supersedes the earlier preparation-only status. Set liveDomainProcessing=true and liveDomainRefunds=true; livePlanSales=false and liveDomainSales=false remain unchanged. Production mode and both notification switches remain enabled.

61 focused tests passed. Deployed fulfilProductionDomains, reviewDomainService, stripeWebhook, createDomainCheckout, confirmDomainCheckout, registerDomain and domainRegistrationStatus; all seven independently confirmed ACTIVE. Verified billing-config.json inside the deployed source archive: processing/refunds true, both sales false. reviewDomainService binds STRIPE_LIVE_DOMAIN_REFUND_KEY; worker binds production Stripe/registrar/DNS credentials. Five-minute scheduler ENABLED; this check verified scheduler configuration, not a paid fulfilment cycle.

Read-only checks before and after deployment found zero production jobs and zero production domain orders. No checkout, charge, registrar create or refund request submitted. Refund write capability was not exercised; existing isolated recovery tests verify duplicate/uncertain-outcome protections. Customer sites and examples untouched. Next step remains separate explicit approval to open checkout; enabling these controls is not approval to run a real transaction test.


## Owner-authorised sales launch — 13 October 2026

Explicit go received. Production mode retained; livePlanSales and liveDomainSales enabled, with domain processing/refunds and both notification switches already active. Deployed createCheckout, createDomainCheckout, confirmDomainCheckout, reviewDomainRegistration, registerDomain and domainRegistrationStatus; all confirmed ACTIVE. Deployed source archive confirms all six enable flags true and testMode false. No production jobs/orders at verification. No real transaction test performed.

Full suite ran 331 tests: 330 passed; the sole failure was the previous release assertion that deployed checkout must be off. Updated it to explicitly exercise the emergency sales-off configuration; all ten focused checkout/settings checks then passed. Customer checkout and policy unavailability wording removed. No price, tax classification or provider account changes.
