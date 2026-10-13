# Database read protection

Verified and deployed 12 October 2026. Live payments remain off.

## Controls

- Firestore App Check service config is ENFORCED (existing enforcement, not newly activated in this pass). Missing-token and forged-token probes to a known public document both returned HTTP 403.
- Owner project collection reads must specify a limit no higher than 100, matching the account storage ceiling.
- Owner logo-version reads must specify a limit no higher than 24. The client uses document-ID cursors and a Load more saved logos button; earlier versions remain stored. Loaded versions are sorted by creation time within the loaded set, not a promise that the initial page contains the newest versions.
- Private billing/domain/design-history collection listing is denied. Required individual owner reads remain allowed; writes and paid feature gates are unchanged.
- Public website individual reads remain available for active owners; collection listing is denied.
- Dashboard summaries read saved billing documents instead of causing one Stripe reconciliation per saved project. Explicit checkout/feature operations still reconcile through trusted endpoints.

## Verification and rollout

193 local tests passed, including pagination across 24 initial and 2 subsequent logos without loss and the existing verified-account download gate. The isolated Auth/Firestore emulator passed 155 assertions, including bounded owner reads, oversized/unbounded reads, cross-account requests, anonymous requests and denied billing listing.

Frontend commit 670688f was pushed and its asset version confirmed served before deploying Firestore rules. Firebase reported successful compilation and rule release. An old open tab should refresh to use the bounded queries; local drafts are preserved.

After deployment, the live scotfree dashboard correctly showed 8 saved sites, 2 published sites and 2 paid plans. Logo screens opened without a permission error; inspected legacy projects had empty logo-version collections despite an embedded saved project logo, so this is not a claim of populated live pagination verification. Public Northline loaded with its saved logo, email and phone links. Screenshot: ../database-read-public-preview.png.

## Limits

These controls bound collection response size and remove unnecessary provider checks. An attested client may still repeat allowed reads, including public single-site reads; rules do not enforce reads-per-minute or a dollar budget. Hosting requests, database rule evaluation, functions and other provider costs remain separate. Continue usage monitoring and existing incident alerts. Final adversarial content-safety and accessibility acceptance remain launch gates.
