# PageGenie privacy request procedure

Owner: One T Media Group. Intake: verified account request in Account → Your privacy & data, or support@pagegenie.ca. Notifications go to the owner's existing gotyourschase@hotmail.com inbox; full details stay in the restricted review queue.

## Review every request
1. Open Content review → Privacy requests from the owner account. Record receipt and review promptly. Check the applicable legal response deadline; obtain advice on jurisdiction, exemptions and any extension rather than promising a universal deadline.
2. Verify the requester controls the account. Never rely solely on an email claiming to represent another account. Collect only the additional information needed to resolve a genuine identity doubt. Do not ask for passwords or API keys.
3. Establish scope and communicate with the verified account email. For complex, disputed or legally sensitive requests, involve counsel.

## Data copy
Inventory only that user's Firebase Auth account, projects/drafts, selected logos and version histories, design/cinematic histories, billing metadata, domain orders/settings and policy acceptance. Check relevant support/privacy/security records without disclosing other people's information, secrets or raw payment credentials. Deliver through a private, authenticated channel; never publish an export or use a public site URL. Record scope, delivery and any justified exclusions. The request button does not automatically generate an export.

## Deletion
Before action, confirm the customer's intent, affected websites and data, active subscriptions, domain ownership/transfer/renewals, and any retention obligations. Explain the impact and obtain final confirmation for irreversible deletion. Do not cancel a customer's domain or strand their ownership. Coordinate subscription cancellation/refunds separately; deleting Firebase Auth does not cancel Stripe billing.

Unpublish and disable hosted mappings as appropriate, handle provider-side data and account-owned subcollections, then delete applicable account information using an approved deletion process. Check backups and provider retention; disclose residual records and their purpose. Keep only necessary billing/legal/security records with restricted access and a defined retention basis. Do not call a request fulfilled until the work is completed and the customer has been told what was deleted or retained.

## Record outcome
Use Record as fulfilled/declined only after manual processing. Explain the action and reasons in the review note; never include credentials or unnecessary sensitive details. Declines must have a lawful reason and a route to ask questions or challenge the decision. These controls only record the outcome: they do not delete accounts, export records or cancel payments.

## Incident handling
Treat a suspected privacy breach separately from a deletion request. Restrict exposure, preserve appropriate incident evidence, determine affected data and people, obtain legal advice on required notifications, and document decisions. Do not send raw sensitive incident details in alert emails.

## Launch items still open
Set formal retention periods and expiry/deletion jobs; validate private export delivery and deletion across providers/backups; confirm legal identity and response deadlines with counsel. Live payments remain disabled until the separate launch gates are closed.

## Authenticated self-service export and deletion impact

The Account screen offers a private JSON download of the signed-in user's account profile, policy acceptance and recursively paginated private user collections. Both callable endpoints require verified email and authentication within the last ten minutes. Export files are assembled locally, not placed at a public download URL. This does not replace a reviewed access request covering support correspondence, restricted security records, third-party-held records or any other applicable records.

The deletion-impact review counts saved/published websites, billing records, domain orders and domain connections. It deletes nothing and does not cancel subscriptions. Actual deletion remains a launch blocker until a reviewed retention schedule, billing/domain handoff and tested deletion procedure are complete.

## Owner retention decision — 12 October 2026

The owner approved a 30-day recovery period for website and logo content before permanent removal. This is a product decision, not a claim that all statutory retention requirements have been resolved. Billing and security records need a documented purpose and separate retention schedule. Implementation and a disposable-account recovery/purge test remain required before launch.


## Recovery workflow — activated 12 October 2026

Implementation: `functions/account-lifecycle.js`, `functions/active-call.js`, `src/account-recovery-ui.js` and the account lifecycle Firestore rules. This revision has been tested against isolated Firebase Auth and Firestore emulators. The owner explicitly approved activation on 12 October 2026. Recovery functions, guards, Firestore rules and the hourly cleanup service were deployed successfully; the database index and live customer controls must be verified as part of release completion.

- The verified account holder must authenticate within ten minutes and type `DELETE MY ACCOUNT`. The server chooses the UID and a fixed 30-day deadline; caller-supplied UID or time values cannot change these.
- Administrator accounts cannot schedule deletion until responsibilities are transferred. Billing records, Stripe customer mappings, domain orders/requests/settings, registered-domain connections or hosted-domain mappings all place deletion on hold. Local `cancelled` or `disconnected` flags do not clear these obligations. There is no self-service override.
- Support must resolve subscription status, open checkout/payment/refund/dispute obligations and domain ownership/transfer/renewals separately, then document lawful retention and move any records that must be retained into an appropriately restricted reviewed record process. Do not delete a billing or domain record merely to bypass the guard. This release deliberately refuses automatic deletion of accounts with those records.
- Eligible accounts enter `recovery`; published-site reads and hosted delivery stop, and normal server actions and client writes are blocked. Drafts/logos remain private and intact. A fresh verified sign-in can recover the account before the deadline. Restoring an account does not override content restrictions.
- At expiry, the hourly job claims `purging` atomically against recovery, rechecks all obligations and administrator status, and stops in `review-required` if a late obligation appears. Otherwise it recursively removes private user content, owned public sites and their analytics, own dated generation counters, policy acceptance and privacy-request records, then removes Firebase Auth. Failures retain `purging` for retry and cannot reopen a partially removed account.
- A minimal UID/status/deletion-time tombstone remains to block stale authentication tokens. Restricted content/security audit records and already delivered support correspondence are outside this automatic content purge and require the reviewed retention process. No payment, refund, subscription cancellation, domain surrender or DNS mutation occurs in the purge.
- Daily database backups may retain removed content for up to seven additional days. Before restoring a database, preserve and reapply deletion tombstones and re-run removal of accounts already deleted; never restore deleted customer content to the public service. The separate backup restore rehearsal remains required.

Validation: `npm test` and `npm run test:recovery` (requires Java 21 and Firebase CLI). The integration runner refuses to execute without both emulator environment variables, uses project `demo-pagegenie-recovery`, and advances only an injected service clock in the isolated test. No production endpoint accepts a custom deadline or clock.

Release verification — 12 October 2026: recovery and cleanup services ACTIVE; hourly scheduler ENABLED; accountLifecycle index READY; GitHub Pages release 126aad5 succeeded; live signed-in status control verified without scheduling deletion; anonymous recovery call returned 401; Northline HTTPS returned 200. All 127 automated tests passed. Live payments remain disabled.


## Retention schedule — effective 13 October 2026

This schedule supersedes earlier open retention decisions for support and moderation. One T Media Group owns the monthly review; no automated support/moderation purge or inbox cleanup is claimed or enabled by this policy release.

| Record | Default period and trigger |
| --- | --- |
| Routine support email, attachments and completed privacy requests | 12 months after documented case closure |
| Content reports, moderation decisions and appeals | 24 months after final case resolution, including appeals |
| Open cases | Keep necessary records while resolving; review quarterly for progress and minimisation |
| Continuing site/account restrictions | Keep minimum enforcement record while restriction applies; review quarterly; never delete a restriction merely because a related report expires |
| Required billing/tax records | Generally six years after end of relevant tax year; apply longer statutory requirements or documented holds |
| Personal-information breach records, where PIPEDA applies | At least 24 months from determination that breach occurred; retain longer if another obligation applies |

Existing guest/account deletion, 30-day operational-alert expiry and seven-day database backup schedules are unchanged. Minimal deletion markers must remain while needed to prevent resurrection from retained backups/archives; review that need quarterly. Do not apply this case schedule blindly to account lifecycle, domain ownership, payments, restriction or deletion-marker records.

### Monthly owner procedure

1. Review the support inbox (including forwarded copies in gotyourschase@hotmail.com, sent mail, folders and attachments), `privacyRequests`, `contentReports`, `contentAudit`, and related appeal correspondence. Do not export full personal details into a retention spreadsheet.
2. Establish final closure date from the case outcome. `privacyRequests.reviewedAt` can be used only for a genuinely completed case. `contentReports.reviewedAt` and `contentAudit.createdAt` alone do not prove final resolution: check restrictions and pending appeals. If closure is unknown, investigate and document it; do not guess or delete by creation date.
3. Before disposal, check legal, billing, domain, complaint, investigation and safety holds. Document the minimum record scope, reason, responsible owner and next review date (within three months). A hold is not permission to retain unrelated content indefinitely. On release, apply the original retention deadline; if already overdue, dispose during this review.
4. Delete or irreversibly anonymise eligible records and linked unnecessary attachments/copies using a reviewed, narrowly scoped action. Preserve active restrictions and all unrelated customer sites/logos. Remove email trash copies where supported. No current records were deleted as part of adopting this schedule.
5. Record completion date, categories/counts removed, reviewer and next monthly review; retain no report text, email bodies or credentials in the disposal log. Restricted backup copies age out within seven additional days. Keep a minimal disposal manifest through that backup window so a restore cannot reintroduce removed records; apply it before recovered data becomes accessible.
6. Confirm deletion capabilities and residual retention with relevant providers. Do not promise to erase records a provider holds independently for legal obligations. The inbox review is manual; no recurring automation has been created.

Reference: [OPC retention guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_rd_201406/), [OPC breach records](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/privacy-breaches-at-your-business/breach_101/breach_records/), [CRA recordkeeping](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc188/keeping-records.html).

Owner will arrange tax filing/remittance. This does not verify that filing is configured or transfer responsibility to Stripe. Checkout and real charges remain disabled.
