# Bot protection and operations alerts

Live payments and registrar purchases remain disabled. App Check is an additional abuse barrier, not a guarantee that every bot is blocked.

## Protections

- Firebase App Check with reCAPTCHA Enterprise, domain-restricted public site key, standard 0.5 score threshold and one-hour renewable tokens. No debug token is shipped.
- Callable enforcement in the shared active-account wrapper; verification/reset email, privacy and recovery callables explicitly enforce it too.
- Public visitor analytics and domain resolution intentionally do not require app attestation. Public hosting and Stripe signed webhooks are not browser-callable endpoints and remain accessible through their existing controls.
- Authenticated wrapper requests limited atomically to 120 per account per minute across endpoints. Counters expire after two days. Existing tighter AI, email, reports, domain and checkout limits remain.
- Firebase Authentication App Check enforcement enabled 12 October 2026. Direct Firestore App Check enforcement remains separate; direct draft writes are denied by rules and the guarded save endpoint applies storage limits. Ownership rules, verified-email AI gates and provider authentication limits remain necessary. App Check does not replace authentication or policy enforcement.

## Automatic alerts

Destination: gotyourschase@hotmail.com through the existing PageGenie Resend connection.

- Shared callable unexpected/unavailable failures, account-email delivery failures and Stripe webhook processing failures.
- Every 15 minutes: homepage and Northline HTTPS probes (alert after two consecutive failures), AI daily usage at 80%, latest READY production backup older than 36 hours, backend ERROR logs, and 25 missing/invalid App Check calls within 20 minutes.
- Missing monitoring API permission produces an alert, not a silent healthy result.
- Private operationsAlerts queue: one record per category/service/six-hour window. No customer content, credentials, raw IP or raw provider error messages in alerts. Retention 30 days, asynchronous Firestore TTL.
- Notification delivery retries with a stable Resend idempotency key for up to 20 hours. Failure remains recorded. The same provider cannot guarantee email delivery during its own outage: check Firebase logs/queue if expected email fails. An independent external watchdog remains desirable for total Firebase outages.
- operationsHealth stores probe times, consecutive failures, latest backup time and scheduler heartbeat.

## Responding

1. Check the named service in Firebase; determine whether it affects customers.
2. For AI spending or creation trouble, owner Content review → AI creation & usage → Pause new AI creation. Saved sites stay available.
3. Do not retry real payments or registrations blindly. Reconcile Stripe/domain order state first.
4. For prolonged outage or missing backup, pause launch and investigate before restoring; follow BACKUP-RESTORE-REHEARSAL.md and preserve deletion tombstones.
5. Repeated alerts are grouped for six hours. Keep production billing off until remaining launch gates pass.

## Validation

Local full suite: 145 tests passed. Isolated Firestore concurrency test admits exactly 120 requests in a minute, blocks the rest, allows another account/new minute, and deduplicates concurrent incident records. Live owner browser passed enforced App Check; anonymous requests to aiOperations, generateWebsite and sendAccountEmail returned HTTP 401. Owner confirmed the alert email arrived. Scheduled checks completed and found the READY backup from 12 October 2026 at 14:40 UTC. Both TTL policies are ACTIVE. The phone check also found and corrected missing publication records being mistaken for load errors; emulator proved deleted-owner publications remain denied.

References: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider and https://firebase.google.com/docs/app-check/cloud-functions

## Signup protection — 12 October 2026

Shared browser attestation now initializes before Auth on both the main editor and auth.html. Auth App Check is ENFORCED. After propagation, direct signUp requests with no App Check token and a forged token both returned HTTP 401, “Firebase App Check token is invalid.” Neither created a user. Early propagation probes were accepted; each disposable .invalid account was removed. No customer accounts were touched.

Email enumeration protection was already enabled. Anonymous sign-in is disabled. Eight-character minimum password policy is now enforced on new/reset passwords to match the UI; forceUpgradeOnSignin is false. Existing users are not forced to reset. Verification/reset sending already has atomic caps: 3 per recipient/hour, 20 per IP/hour, 200 overall/day; AI still requires verified email. No custom blanket claim of bot immunity: a legitimate attested browser can still be abused, and provider throttles, storage/AI limits and monitoring remain necessary.

After rejection began, the owner’s real browser successfully reloaded verification status and returned to the dashboard with all eight saved sites. A full new-user phone signup remains part of final acceptance; this check specifically verifies the attestation gate and browser compatibility.

References: https://docs.cloud.google.com/identity-platform/docs/admin/app-check-integration and https://firebase.google.com/docs/app-check/enable-enforcement

The real auth.html browser verification probe also completed successfully under enforcement and returned automatically to PageGenie; Admin Auth confirmed the disposable fixture emailVerified=true, then it was removed. No verification email was sent for this fixture. Full suite 169 passed; eight focused email/action tests passed after final error-message changes; build passed.
