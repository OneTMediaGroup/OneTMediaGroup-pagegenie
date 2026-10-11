# PageGenie billing — test mode

Launch prices: Starter CAD 9/month; Complete CAD 19/month; Own Your HTML CAD 49 once. Each checkout covers one saved website. Domain registration and its CAD 2 service fee are separate and are not charged by these sessions. Test tax collection is disabled.

Hosted Stripe Checkout uses server-owned price IDs in functions/billing-config.json. Firebase Secret Manager holds STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. The server rejects non-test keys and live webhook events. No Stripe secret or publishable key is needed in the browser.

Verified account + ownership of a saved project are required. A per-project lock and Stripe idempotency prevent concurrent duplicate checkout creation. Existing open sessions are reused; changing plans expires the previous open session. Existing purchases use the dedicated customer portal.

Signed raw-body webhooks and authenticated server reconciliation store payment state in users/{uid}/billing/{projectId}. Clients cannot write billing state. Redirect query parameters never grant a purchase. Subscription updates reconcile Stripe's current status, including cancellation at period end.

Live checks completed: guest/invalid-plan/missing-project rejection; all three hosted checkouts; unpaid status; invalid webhook signature; declined test card; checkout cancellation with project restoration; successful CAD 19 subscription with automatic return; saved paid state; signed duplicate webhook deliveries; customer portal and cancellation at period end. Existing application tests plus billing price/signature checks: 32 passing.

This is payment integration testing, not a production billing launch. Server-enforced hosting, real page-view/enquiry-click analytics, Complete-only promotional kits and domain preferences, and HTML-only export are connected. Refunded HTML purchases and ended subscriptions lose paid access. Custom-domain provisioning, tax configuration, production keys/prices and live-payment rollout remain separate work. Free accounts, verified-account PNG logo downloads and shareable previews remain available.


Paid-feature checks: free/guest/project-isolation/forged entitlement rejection; real $49 test checkout unlocked sanitized server export; a test refund locked it again; a real Stripe test Starter subscription unlocked hosting and analytics while blocking HTML/kit/domain settings; cancellation locked paid access; view deduplication and stored counts passed. Complete publishing and promotional copy verified in the browser. Unit suite: 35 passing.

Visible website content and draft backups remain available in the editor; the paid service is the official standalone export. A client-rendered website cannot prevent someone from manually copying visible content.
