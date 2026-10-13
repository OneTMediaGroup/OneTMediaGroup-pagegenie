# Stripe cutover review — 13 October 2026

## Current verified state

No live sale, refund, domain purchase, payment link or customer migration was performed. testMode=true; livePlanSales, liveDomainSales, livePlanNotifications, liveDomainProcessing and liveDomainRefunds=false.

Read-only Stripe checks verified active live CAD prices: Starter 900 cents monthly, Complete 1900 cents monthly, HTML 4900 cents once; correct product IDs and exclusive tax. Dedicated live portal is active with PageGenie return URL, invoices/payment-method updates and period-end cancellation; public portal login disabled. No payable live Checkout Session was created, so its rendered checkout remains unverified.

Chrome Stripe dashboard independently showed PageGenie Plan Payments — Live disabled (15 events) and PageGenie Domain Payments — Live disabled (2 events). Restricted checkout credential cannot list webhooks (403), as expected from its scope; no permission expansion. Both deployed endpoints returned 503 with their disabled messages. Other One T Media Group destinations were untouched.

Fifteen deployed billing/access/recovery functions were ACTIVE. Plan consumers currently bind STRIPE_SECRET_KEY; live plan notifications bind their dedicated live read key and signing secret. Domain webhook currently binds test secrets and needs production redeployment before activation. Recovery binds the production read credential, not the staged live refund credential.

45 focused tests passed: live checkout gates/identity, notifications, plan access, cancellation/refund/dispute state, mode isolation, migration and guest handoff. Test/unmarked receipts cannot unlock production paid features. Free publication uses the preview path with no paid-feature requirement; account verification, ownership, contact details and policy/moderation checks still apply. Existing free sites/drafts/logos must not be removed by billing migration.

Read-only billing inventory: 18 records; 9 eligible test records, 8 held (7 subscriptions need ending and 1 unresolved checkout), 1 non-test excluded. This snapshot precedes authorised disposable synthetic-account cleanup. Named testers/owner/example accounts require deliberate per-account handling; never bulk-delete them to remove a launch blocker.

## Future activation sequence — NOT authorised or executed

1. Review named test accounts and end only approved test subscriptions/checkout sessions. Run migration dry-run then exact per-record migration, preserving sites/logos/domains and archives. Resolve all holds before promising live upgrade availability.
2. Prepare production mode with sales/refunds OFF. Deploy all configuration consumers as one reviewed release: createCheckout, billingStatus, createBillingPortal, downloadWebsite, promotionalKit, publishWebsite, websiteAnalytics, saveDomainSettings, cinematicDesign; customerWebsite, recordSiteEvent; connectDomainAfterRegistration, connectDomainAfterPlanChange, connectDomainAfterPublication, domainConnectionStatus, resolveDomain; createDomainCheckout, registerDomain, domainRegistrationStatus, stripeDomainWebhook, fulfilProductionDomains, automaticDomainConnections, reviewDomainService. Verify selected secrets and cached-access isolation. Keep test stripeWebhook isolated.
3. Separately approve activation of live plan notification processing and its Stripe destination, then verify signed delivery. Enable checkout only after notification readiness and explicit launch approval. Enable liveDomainProcessing and deploy its matching production webhook/worker, then activate the domain destination before separately enabling liveDomainSales. Checkout requires processing readiness as well as the sales switch. Do not leave a payable link without working fulfilment.
4. Recheck free generation/account/publication and correct paid access after deployment. A no-charge audit does not prove live card settlement; no real-money rehearsal is authorised.
5. Live refunds remain a separate OFF switch until explicitly approved and the refund credential is deployed.

## Incident/rollback rule

Do not simply flip testMode back after live purchases exist: that would lock live receipts and could re-expose test entitlements. Keep production mode, stop new checkout, preserve sites and billing, and reconcile outstanding payments. Keep plan notifications running to process failures/refunds/cancellations. Domain sales now have a separate gate from liveDomainProcessing. Keep processing enabled when pausing new domain checkout so already-paid, verified jobs can finish. An explicit processing pause is a separate incident action; monitor/replay outstanding events after restoring it. Both gates are false in the current release.

## Authorised synthetic-account cleanup

One machine-created @example.invalid account with four drafts, zero public sites and zero domain records entered the existing 30-day recovery/deletion flow. Verified test billing was archived, its test customer reference removed, and refresh tokens revoked. All its test subscriptions/checkouts were already closed; none needed cancellation/expiry. No real billing or named tester/owner/example account was removed. Remaining inventory: 15 billing records, 6 eligible, 8 held (7 subscription holds, 1 checkout hold), 1 non-test excluded. Cleanup does not make the remaining accounts launch-ready automatically.
