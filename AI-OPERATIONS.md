# AI operations — 12 October 2026

The PageGenie owner can open **Content review → AI creation & usage**, inspect daily/monthly attempts, refresh, or explicitly confirm pause/resume. Customer accounts cannot read or modify these controls. Changes are audited privately. AI creation is enabled by default; current pause state is retained across deploys.

| Creation | Shared daily ceiling | Shared monthly ceiling | Per-account daily attempts |
| --- | ---: | ---: | ---: |
| Website | 100 | 1,500 | 10 |
| Logo | 30 | 300 | 10 |
| Cinematic image | 20 | 200 | 5 |

These are conservative initial launch ceilings, not customer plan promises or dollar spending caps. Attempts begin counting at this release. A reservation is atomic across account/daily/monthly documents, occurs before provider requests, and is never returned after errors, moderation rejection or provider failures. The existing included-success allowances remain: a starter logo with two retries per site, and three cinematic images per paid site. Reopening a saved image/version does not call its provider again.

Malformed control/counter data, deleted/recovering accounts and suspended accounts fail closed. Capacity/pause errors are shown clearly; the previous draft/version stays saved. The pause stops new website/logo/cinematic provider operations; already admitted requests may finish. It does not stop final moderation, logo upload, editing, exporting, publishing or delivery, and does not disable payments or authentication.

Trusted administrators can lower ceilings in `aiControls/global.limits.<kind>.daily/monthly`, including zero. The runtime rejects overrides above the table's hard defaults. Raising these defaults requires a reviewed code change. Changing pause state does not reset usage. Firestore rules deny customer access/writes to controls, usage and audit records.

Per-account attempt keys use SHA-256 UID digests and expire two days after their last counted attempt. Aggregate daily/monthly usage contains no UID or prompt and expires 35/95 days after its last update. `expiresAt` TTL policies are configured for `aiAttemptLimits` and `aiUsage`; expiry is asynchronous, not an exact deletion deadline. Owner control audit records remain restricted security records with their separate retention review still open. No raw prompt, logo, API key or provider response is logged by the limiter.

Before a disaster recovery promotion, preserve/reapply the latest `aiControls`, `aiUsage` and `aiAttemptLimits` as well as lifecycle/moderation/financial controls. Restoring an old counter must not reset capacity or resume a paused service. Do not restore current-period allowance from an old backup without reconciliation.

## Verification

- Unit/UI suite: 142 passing tests, including owner/verified-claim enforcement, required confirmation, failed attempts, UTC rollover, malformed controls, suspension/recovery, shared concurrent ceiling and cancel-without-mutation UI.
- Isolated Firestore emulator: 20 concurrent transactions with shared ceiling four admitted exactly four. Paused real website/logo callable handlers rejected before any OpenAI request, cleaned pending logo reservation, and retained drafts on resume.
- Live verification: all four functions ACTIVE; aiAttemptLimits and aiUsage expiry policies ACTIVE; anonymous aiOperations request returned HTTP 403; GitHub Pages release 5a6c758 succeeded. The signed-in owner opened Content review → AI creation & usage on a 390px phone viewport and received live usage/limits with AI creation running. The initial browser token-refresh connection error recovered on retry.
- Confirmation UI was exercised with simulated local data; pause/provider blocking and resume were exercised in the Firestore emulator. Production was not paused, and no paid OpenAI generation was needed. Evidence: ../pagegenie-ai-controls-phone.png.

## Still open

App Check/bot controls, automated operational alerts and a reviewed dollar-budget policy remain launch work. These ceilings limit generation admissions; they do not cap all Google Cloud/Stripe/email/domain costs, stop distributed Firestore traffic or replace provider billing monitoring.
