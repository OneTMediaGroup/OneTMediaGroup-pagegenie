# Owner security and independent monitoring

## Current flow — supersedes the historical TOTP/passkey notes below

Owner email/password sign-in now completes in one dialog with a six-digit email code for unrecognised browsers. Optional 30-day browser trust; server owner session expires after 12 hours. Password reset invalidates trust/session records through the Firebase token-valid-after time. Review/content/accounts/AI endpoints enforce that session. Old passkey callable is retired. Owner confirmed successful code-to-dashboard return after the same-account session handoff fix. Live payments remain off.

## Historical implementation notes

2026-10-12: UptimeRobot free-monitor activation requested for https://pagegenie.ca/ and https://northline.pagegenie.ca/ using gotyourschase@hotmail.com. Owner confirmed both activated. No paid plan requested. Five-minute external checks supplement Firebase alerts; the independent notification delivery drill is now complete (see below).

Firebase Identity Platform TOTP provider enabled with adjacentIntervals 1. Frontend enrollment/sign-in support published in bcb52ac. Owner must enroll personally through Account > Owner security and complete a fresh sign-in with the authenticator. No seeds or OTPs are stored in project files or sent to external QR services.

Backend enforcement changes are prepared locally, tested (146 tests passed), but NOT deployed pending successful owner enrollment. ReviewContent, listCustomerAccounts, reviewPrivacy, aiOperations will require verified contentAdmin and firebase.sign_in_second_factor=totp. Do not mark owner MFA complete before enrollment and a successful two-factor session.

Recovery: a password reset does not remove the enrolled second factor. A verified Firebase project administrator must independently verify the owner before removing a lost factor, revoke existing sessions and supervise re-enrollment. Do not add a public MFA-bypass endpoint. Secure authenticator backup is the owner's responsibility. Infrastructure administrator account MFA is a separate launch check.

Live Stripe payments and real registrar purchases remain off; no billing configuration changed in this task.

## Passkey replacement — 2026-10-12

Owner requested native Face ID/fingerprint/PIN instead of TOTP enrollment. The existing TOTP sign-in resolver remains for any already-enrolled account; no factors were removed. Read-only auth check found no enrolled factor on scotfree at implementation time.

New ownerPasskey callable uses SimpleWebAuthn 13.3, required user verification, pagegenie.ca RP and exact https://pagegenie.ca origin, 5-minute consumed challenges, App Check and 60 requests/IP/hour. Registration needs a recent verified owner session; additions need an existing passkey session. Private ownerPasskeys records store public keys/counters and a hashed 256-bit recovery key; client Firestore access is denied by existing default rules. Recovery invalidates the epoch, deletes old passkeys and consumes its key. Only the recovery session can enroll the replacement; a password-only session cannot. Recovery key is displayed once and downloaded only by the owner. No seed, private passkey or recovery key is logged.

Dedicated signer pagegenie-passkey-signer@onet-pagegenie.iam.gserviceaccount.com has no project roles. The existing function runtime has Token Creator on that signer only; no service-account private key was exported. IAM Credentials API enabled already. Passkey proof expires after 12 hours and intended owner gates compare its epoch against current server state.

Deployment is staged: ownerPasskey service and setup UI first. Owner enforcement stays UNDEPLOYED until personal enrollment and live sign-in succeed. Unit tests cover expiry/replay/recovery, wrong-origin/challenge/UV rejection with real signed WebAuthn data, and UI recovery-key acknowledgement. Physical biometric enrollment/login and real-device recovery remain pending user handoff.

Manual total-loss recovery requires independently verifying the project owner through an already-secured infrastructure administrator account. Do not accept email alone or silently reset passkeys. Review owner access after recovery and re-enroll. Infrastructure MFA and external monitor outage-delivery drill remain separate outstanding checks.

## Independent alert delivery — 12 October 2026

Both free HTTP/S monitors are active and checking every five minutes: PageGenie monitor 804248797 and Northline monitor 804248799. Both showed UP with recent checks. Used each monitor’s Test Notification action with its attached gotyourschase email contact. The owner confirmed receipt of DOWN and UP test messages for both. No Firebase/Resend dependency, paid upgrade or site outage was introduced.

This verifies the independent notification delivery route, not a deliberately induced production outage. UptimeRobot documents that its test notifications use the real delivery pipeline: https://help.uptimerobot.com/en/articles/11602913-how-to-test-notifications-in-uptimerobot-quick-guide
