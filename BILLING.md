# PageGenie billing — test mode

Launch prices: Starter CAD 9/month; Complete CAD 19/month; Own Your HTML CAD 49 once. Each checkout covers one saved website. Domain registration and its CAD 2 service fee are separate and are not charged by these sessions. Test tax collection is disabled.

Hosted Stripe Checkout uses server-owned price IDs in functions/billing-config.json. Firebase Secret Manager holds STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. The server rejects non-test keys and live webhook events. No Stripe secret or publishable key is needed in the browser.

Verified account + ownership of a saved project are required. A per-project lock and Stripe idempotency prevent concurrent duplicate checkout creation. Existing open sessions are reused; changing plans expires the previous open session. Existing purchases use the dedicated customer portal.

Signed raw-body webhooks and authenticated server reconciliation store payment state in users/{uid}/billing/{projectId}. Clients cannot write billing state. Redirect query parameters never grant a purchase. Subscription updates reconcile Stripe's current status, including cancellation at period end.

Live checks completed: guest/invalid-plan/missing-project rejection; all three hosted checkouts; unpaid status; invalid webhook signature; declined test card; checkout cancellation with project restoration; successful CAD 19 subscription with automatic return; saved paid state; signed duplicate webhook deliveries; customer portal and cancellation at period end. Existing application tests plus billing price/signature checks: 32 passing.

This is payment integration testing, not a production billing launch. Paid feature enforcement, actual visitor analytics, custom-domain provisioning, tax configuration, refunds, production keys/prices and live-payment rollout remain separate work. Free accounts, verified-account PNG logo downloads and shareable previews remain available.
