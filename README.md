# PageGenie

Your Wish. Your Website. Powered by One T Media Group. Proudly Canadian.

## Current preview

GitHub Pages serves `index.html` with Firebase email/password accounts, private saved projects, and public shareable previews. Email verification is required before publishing. The standalone `PageGenie.html` works offline with simulated generation and local drafts.

The editor supports text and image changes, section controls, themes, mobile preview, local backup/restore, and HTML export. Public previews have real share links and QR codes. Domain searches, prices, subscriptions, analytics, and promotional examples remain demonstrations; no domains are purchased or payments collected. Preview contact buttons do not send messages.

Firebase project: `onet-pagegenie`. Firestore is in Montréal. Rules limit private drafts to their owner, public document reads to individual published previews, and publication to verified owners. Image data is stored with the draft; use small images (cloud draft limit approximately 650 KB).

## Development

Run `npm ci`, then `npm run build`. Commit the generated `index.html` and `assets/cloud.js` for GitHub Pages. Run `npm test` for the generation service tests. The build uses `PageGenie.html` as its visual foundation.

## Enable real AI later

Real AI is disabled in `src/config.js`. The server implementation is prepared in `functions/`, but has not been deployed or tested against a paid provider.

1. Create an OpenAI API project and enable API billing in the OpenAI platform. Create its secret key; never place it in the public repository, browser code, or chat.
2. Enable Firebase Blaze billing for `onet-pagegenie` after reviewing costs and setting budget alerts.
3. Install function dependencies with `npm ci --prefix functions` (use `npm install --prefix functions` if creating the initial lockfile).
4. Store the key securely with `firebase functions:secrets:set OPENAI_API_KEY --project onet-pagegenie`.
5. Deploy with `firebase deploy --only functions --project onet-pagegenie`. The default model is `gpt-4.1-mini`; review it before launch.
6. Verify a real generation using a verified test account, then set `liveAI: true` in `src/config.js`, rebuild, and push.

The callable requires verified accounts and limits each account to ten attempts per UTC day. It uses structured responses and does not store provider responses. Before a public paid launch, add abuse protection, operational monitoring, real checkout, legal/privacy documents, account deletion, and production limits. Budget alerts are not hard spending caps.

## Hosting

The public repository is `OneTMediaGroup/OneTMediaGroup-pagegenie`. GitHub Pages publishes the root of `main`; `CNAME` selects `pagegenie.ca`. Cloudflare DNS uses an unproxied root CNAME and `www` CNAME pointing to `onetmediagroup.github.io`. GitHub must provision the domain certificate before HTTPS enforcement can be enabled. Use HTTPS for account access.

Firebase client configuration is public by design; Firestore rules provide data access protection. OpenAI credentials belong only in Firebase Secret Manager.
