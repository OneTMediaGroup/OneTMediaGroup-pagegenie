# PageGenie

Your Wish. Your Website. Powered by One T Media Group. Proudly Canadian.

## Current preview

GitHub Pages serves `index.html` with Firebase email/password accounts, private saved projects, and public shareable previews. Email verification is required before publishing. The standalone `PageGenie.html` works offline with simulated generation and local drafts.

The editor supports text and image changes, section controls, themes, mobile preview, local backup/restore, and HTML export. Public previews have real share links and QR codes. Domain searches, prices, subscriptions, analytics, and promotional examples remain demonstrations; no domains are purchased or payments collected. Preview contact buttons do not send messages.

Firebase project: `onet-pagegenie`. Firestore is in Montréal. Rules limit private drafts to their owner, public document reads to individual published previews, and publication to verified owners. Image data is stored with the draft; use small images (cloud draft limit approximately 650 KB).

## Development

Run `npm ci`, then `npm run build`. Commit the generated `index.html` and `assets/cloud.js` for GitHub Pages. Run `npm test` for the generation service tests. The build uses `PageGenie.html` as its visual foundation.

## Live AI configuration

Real AI is enabled in `src/config.js`. The `generateWebsite` callable is deployed in Montréal and has passed a verified-account generation test using GPT-4.1 mini. Its OpenAI key is stored in Firebase Secret Manager. The instructions below describe initial setup or future reconfiguration.

1. Create an OpenAI API project and enable API billing in the OpenAI platform. Create its secret key; never place it in the public repository, browser code, or chat.
2. Enable Firebase Blaze billing for `onet-pagegenie` after reviewing costs and setting budget alerts.
3. Install function dependencies with `npm ci --prefix functions` (use `npm install --prefix functions` if creating the initial lockfile).
4. Store the key securely with `firebase functions:secrets:set OPENAI_API_KEY --project onet-pagegenie`.
5. Deploy with `firebase deploy --only functions --project onet-pagegenie`. The default model is `gpt-4.1-mini`; review it before launch.
6. Verify a real generation using a verified test account, then set `liveAI: true` in `src/config.js`, rebuild, and push.

The callable requires verified accounts and limits each account to ten attempts per UTC day. It uses structured responses and does not store provider responses. Before a public paid launch, add abuse protection, operational monitoring, real checkout, legal/privacy documents, account deletion, and production limits. Budget alerts are not hard spending caps.

## Hosting

The public repository is `OneTMediaGroup/OneTMediaGroup-pagegenie`. GitHub Pages publishes the root of `main`; `CNAME` selects `pagegenie.ca`. Cloudflare DNS uses an unproxied root CNAME and `www` CNAME pointing to `onetmediagroup.github.io`. The domain certificate is active and HTTPS enforcement is enabled. Use HTTPS for account access.

Firebase client configuration is public by design; Firestore rules provide data access protection. OpenAI credentials belong only in Firebase Secret Manager.

## Gary demo

`Gary-demo.html` is a downloadable fictional sample with real AI-written copy, generated through the deployed callable. No domains are sold or enquiries sent.

## Email verification recovery

Firebase currently rejects changes to its default email callback URL with `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`. Account emails therefore retain the default Firebase destination. If a mail client fails to open the link, signed-in users can expand **Verification link not opening?** in My projects and paste the full link there. PageGenie validates the host, project, action type, and account email, then redeems the one-time code directly with Firebase. The link is cleared immediately and is not saved in drafts. `auth.html` is a prepared standalone handler; it is not the default email destination until Firebase permits the callback change.


### Custom website composition

Live generation now asks OpenAI GPT-4.1 for original HTML, CSS, section structure and inline SVG art for each business; it does not select one of the old four visual templates. Responses remain structured and validated. Account verification and daily limits still apply. Generation can take a minute or two. Model selection remains configurable through OPENAI_MODEL in the functions environment.

Custom pages are sanitized with DOMPurify and displayed in an opaque-origin sandboxed iframe. Only the app-owned editing/resize bridge executes, with a nonce-based CSP; generated scripts, forms, external resources and external links are excluded. Inline edits, uploaded hero photographs, section ordering/visibility, themes, mobile preview, JSON backup/restore, private cloud projects, public shareable previews and standalone HTML export retain custom HTML/CSS. Legacy saved projects remain compatible. Uploaded photos are resized and compressed; cloud drafts retain the existing 650 KB payload limit.

These are generated first drafts, not a guarantee that every layout is perfect or unique. Review business claims and responsive design before publishing. Contact invitations remain previews until contact details or enquiry services are connected. Domain purchasing, billing plans and visitor analytics are still demonstrations.
