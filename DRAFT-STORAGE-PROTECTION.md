# Draft storage protection

Browser draft saves use saveProject, protected by App Check, authentication, lifecycle checks and the existing shared request throttle. User identity comes from the verified auth token, never a submitted owner ID. Firestore rules reject direct project creation and updates.

A server-owned transaction gate serializes concurrent saves across project IDs. It allows 60 saves per minute, 20 new projects per UTC day, 3 stored projects before email verification and 100 after verification. Existing projects remain editable at the daily creation and total storage caps. Payloads must be JSON objects with a nonempty name, bounded project ID and at most 650,000 UTF-8 bytes. Server timestamps cannot be forged.

Limits are an abuse ceiling, not paid-plan entitlements. Project deletion does not reset daily creation usage. Recovery/deleted accounts cannot save. Draft editing does not publish or bypass publication moderation. The transaction also reads lifecycle state to prevent a racing deletion from silently reopening saving.

Validation: `scripts/test-project-save.mjs` runs only with the isolated Firestore emulator; concurrent unverified saves admit exactly three projects, limits deny creation but preserve edits, logo/contact data round-trips, malformed inputs and inactive accounts fail. The account-isolation script verifies direct writes are refused. Existing 169 tests and frontend build pass.

Rollout: deploy saveProject first, publish the frontend next, then enforce Firestore rules after confirming the new frontend is served. A stale open tab must refresh to use protected saving; local drafts are preserved.

Remaining: Firebase Auth signup abuse and allowed-read volume need separate evaluation. This is not a claim of complete abuse prevention. Live Stripe payments stay off.
