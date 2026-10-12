# Cancellation and refund rehearsal — 12 October 2026

Stripe test mode only. Existing customer plans, Northline and live payment settings were not changed. Dedicated QA purchases were created; no real card was charged.

## Verified against Stripe and deployed Firebase endpoints

- Complete active: backend paid status, analytics and promotional kit open.
- Scheduled cancellation: real Stripe webhook saves the cancellation flag while access stays active.
- Undo cancellation: webhook removes the flag and access remains active.
- Full current-period Complete refund: real refund webhook sets paid=false; analytics, promotional kit and custom domain settings return 403. Cinematic status reports paid=false.
- Immediate cancellation: paid features remain locked; draft remains saved.
- Starter: paid analytics opens, Complete promotions remain locked. A Stripe test clock advanced beyond the actual cancellation date; webhook set canceled/paid=false and analytics returned 403. Draft remained saved.
- HTML: completed an actual CA$49 test Checkout in the browser, confirmed by webhook/backend. Full refund automatically revoked access; actual download endpoint returned 403 and cinematic status reported paid=false. Draft remained saved.
- Canceled/refunded purchases can open a fresh checkout; replacement purchases remain locked until paid. The replacement test sessions were expired without payment. A free project status read creates no billing record.
- Signed duplicate/delayed checkout completion and subscription update notifications were replayed after refunds. Both were accepted safely and did not restore access.
- A partial monthly refund preserves subscription access. Full refund of its latest invoice locks access; a later valid paid invoice can restore it. Existing HTML policy continues to lock export after any refund, including partial refunds.

The test webhook now includes charge.refunded, refund.created/updated, invoice.paid/payment_failed and existing subscription/Checkout events. Domain payment handling remains separate; a domain refund is not treated as a website-plan refund and never surrenders a registration.

## Implemented safeguards

All paid-feature endpoints reconcile current Stripe state. Replayed event snapshots cannot grant stale access. Transactions retry on concurrent billing writes. Free status reads do not create billing records (which would otherwise interfere with deletion holds). Unchanged status does not trigger extra billing/domain writes.

Billing portal return includes the selected project, refreshes its status and opens the dashboard. Dashboard billing cards show scheduled cancellation dates and explain canceled/refunded locks. Site drafts and logos are not deleted by billing reconciliation. Existing downloaded HTML files cannot be recalled by refunding; future downloads are locked.

## Operations and remaining launch work

Refunding does not itself cancel future subscription invoices in Stripe. An owner issuing a full refund to end service must also cancel the subscription; both actions were tested separately. Customer portal cancellation is configured for period end. Refund amounts/eligibility remain an owner decision under the published policy, not an automatic refund promise.

Live keys and live webhook configuration remain disabled. Before enabling them, repeat a controlled live-mode verification, finish tax/refund operations and recognizable PageGenie billing descriptors. The shared Stripe account currently shows a FLOOR FLOW statement descriptor in sandbox; do not change the shared account globally without reviewing its other products. Backup restore and other launch gates remain open.

All 136 automated tests passed; the frontend build and whitespace checks passed.

QA evidence: `../pagegenie-stripe-refund-proof.png`. Dedicated QA subscriptions were canceled; refunds are recorded in Stripe test history. Test fixtures are private drafts and remain identifiable by Billing QA names. No API keys or account tokens are stored in this repository.
