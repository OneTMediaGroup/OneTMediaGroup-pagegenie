# Backup restore readiness — 12 October 2026

Status: deletion-safe snapshot rehearsal passed; actual scheduled-backup restore remains a launch gate. Firebase reports no backups yet after the daily schedule was enabled. Retention is seven days.

## Rehearsal

Run `npm run test:restore` with Java 21 available. This uses only the demo Firebase Auth/Firestore emulators, with an independent named restore database. It seeds an older snapshot containing active, deleted, recovering and orphaned owners. This is not evidence of a Google-managed backup restore.

The rehearsal checks exact site preservation, both nested logo versions, removal of deleted site/logo content, preservation of the latest deletion tombstone, no recreated Auth identity, blocking non-active/orphaned owners, repeat-safe cleanup, and a financial/domain-record hold. The helper deliberately refuses production access.

The emulator rehearsal passed on 12 October 2026. One deleted owner’s old publication and nested logos were removed; the surviving site and two logo versions were preserved. No production data was touched.

## Actual backup restore — still required

1. Confirm a successful scheduled backup exists and record its timestamp/name.
2. Preserve the current authoritative accountLifecycle records and current Auth identity set separately. Do not take these from the older backup. If either cannot be obtained completely, stop.
3. Restore into a new isolated database, never `(default)`. Give it deny-all client rules; do not connect hosting, publishing functions or customer traffic. Keep production serving its existing database. Do not restore Auth identities.
4. Reapply current lifecycle controls, deletion tombstones, moderation restrictions and current billing/domain ownership state before considering promotion. Resolve financial/domain conflicts manually; never surrender domains or cancel subscriptions as a side effect of restoring.
5. Remove already-deleted owners' nested site/logo content and public publications, plus other account content covered by the deletion procedure. Preserve the restricted records that have a documented retention reason. Keep recovering/suspended/orphaned accounts unavailable.
6. Compare representative surviving sites and all nested logo versions with the backup using hashes/counts. Verify current live deletion controls still deny delivery. Test actual access rules separately: backups do not include rules or TTL configuration.
7. Record results, backup age and recovery time. Promotion to production requires a separate reviewed migration; this rehearsal does not authorize it.

No production data, Auth account, billing record, domain or live payment setting is modified by the emulator rehearsal.
