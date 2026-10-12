# Backup restore readiness — 12 October 2026

Status: actual scheduled-backup restore and deletion-safe reconciliation passed on 12 October 2026. Daily backups retain seven days. This validates recovery into isolation; it does not authorize replacing the production database.

## Rehearsal

Run `npm run test:restore` with Java 21 available. This uses only the demo Firebase Auth/Firestore emulators, with an independent named restore database. It seeds an older snapshot containing active, deleted, recovering and orphaned owners. This is not evidence of a Google-managed backup restore.

The rehearsal checks exact site preservation, both nested logo versions, removal of deleted site/logo content, preservation of the latest deletion tombstone, no recreated Auth identity, blocking non-active/orphaned owners, repeat-safe cleanup, and a financial/domain-record hold. The helper deliberately refuses production access.

The emulator rehearsal passed on 12 October 2026. One deleted owner’s old publication and nested logos were removed; the surviving site and two logo versions were preserved. No production data was touched.

## Actual managed backup restore — passed

- Backup: `projects/onet-pagegenie/locations/northamerica-northeast1/backups/150d49fb-91e6-4f55-a2da-9a33392b3c5f`.
- Snapshot: 12 October 2026, 14:40:05 UTC (10:40 EDT).
- Isolated target: `restore-rehearsal-20261012`, Montréal. Production remained `(default)`.
- Google restore operation: started 14:51:57 UTC, completed successfully 14:59:37 UTC; about 7 minutes 40 seconds. Backup age at restore start: about 12 minutes.
- Snapshot contained 153 documents, including **26 private website drafts, 10 published-site records and three nested logo versions**. Two newer drafts were outside this older snapshot, as expected.
- All 26 restored draft documents and all three logo-version documents matched the current unchanged originals exactly, including embedded image content. Combined comparison digest: `537d999ebf28679c9d19c92a4730ac05759745f553404366443ad3e146ae47cc`.
- Latest authoritative lifecycle, moderation, billing and domain controls were read independently from production. Current Auth identity inventory was paginated completely; 13 identities were present. Backup data was never used to recreate Auth users.
- Deny-all client rules were explicitly released for the named test database. Anonymous access to a recovered published record returned HTTP 403. No hosting or customer functions were redirected to it.
- There were **no actual permanently deleted accounts** in the current lifecycle records. To test stale-content removal, a synthetic deleted owner was added only inside the restored database and reconciled against a synthetic newer deletion tombstone. Eight covered records were removed, including its private draft, both nested logo versions, public site, analytics descendant, usage, policy and privacy-request records. The tombstone remained deleted; no Auth identity was created.
- A separate synthetic deleted owner with billing and domain records was held for manual review, with its records intact. Recovering and missing-identity owners retained blocked lifecycle states. Repeating cleanup removed nothing further.
- Real survivor drafts and logos remained exact after reconciliation. The complete production document contents and current Auth identity/disabled-state inventory matched their pre-test values.
- Verification completed at 15:01:16 UTC. Synthetic fixtures were removed. The isolated database was deleted at 15:02:03 UTC after the successful test; the scheduled backup is retained. Private local copies of customer documents and identity inventories were also removed after verification.

This is an actual Google-managed restore, followed by deletion-safety drills in the real isolated restored database. The deleted-account fixtures were synthetic; no customer account was deleted, recovered or republished. Current restrictions must always be reapplied before any future recovered content is allowed to serve traffic.

[Firebase backup and restore documentation](https://firebase.google.com/docs/firestore/backups) explains that restored databases need their security rules configured separately. Firebase Auth and external billing/domain systems are outside this Firestore recovery test.

## Required procedure for future recovery

1. Confirm a successful scheduled backup exists and record its timestamp/name.
2. Preserve the current authoritative accountLifecycle records and current Auth identity set separately. Do not take these from the older backup. If either cannot be obtained completely, stop.
3. Restore into a new isolated database, never `(default)`. Give it deny-all client rules; do not connect hosting, publishing functions or customer traffic. Keep production serving its existing database. Do not restore Auth identities.
4. Reapply current lifecycle controls, deletion tombstones, moderation restrictions, current AI pause/usage controls, and current billing/domain ownership state before considering promotion. Resolve financial/domain conflicts manually; never surrender domains or cancel subscriptions as a side effect of restoring.
5. Remove already-deleted owners' nested site/logo content and public publications, plus other account content covered by the deletion procedure. Preserve the restricted records that have a documented retention reason. Keep recovering/suspended/orphaned accounts unavailable.
6. Compare representative surviving sites and all nested logo versions with the backup using hashes/counts. Verify current live deletion controls still deny delivery. Test actual access rules separately: backups do not include rules or TTL configuration.
7. Record results, backup age and recovery time. Promotion to production requires a separate reviewed migration; this rehearsal does not authorize it.

No production data, Auth account, billing record, domain or live payment setting is modified by the emulator rehearsal.
