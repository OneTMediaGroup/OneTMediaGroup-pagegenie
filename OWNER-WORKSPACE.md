# Owner workspace and homepage separation — October 12, 2026

Owner entry: https://pagegenie.ca/owner.html. This has its own sign-in form, existing owner email-code protection and a server authorization check before showing account-directory and review tools. It reuses the existing Firebase identity/session; it does not introduce another password. Ordinary customer accounts cannot access owner tools. The page is noindex. Legacy ?review links redirect here.

The public homepage does not install owner controls. Its arrival view hides the workspace toolbar, draft backup tools and step tracker, with the builder beside the headline on desktop and below it on mobile. Saved local drafts are preserved and require an explicit Continue action instead of opening the editor automatically. Customer sign-in and My websites remain available.

Validation: 170 existing tests and 3 new owner access tests passed. Live scotfree session opened the owner workspace; Content review loaded reports and privacy requests. Customer dashboard loaded eight sites and Northline opened with editing controls intact. Desktop and 390px phone layouts inspected. Live payments remain disabled (billing-config testMode true).

Security pass: Firestore App Check enforcement enabled; unauthenticated direct document read returned 403, while browser account reads succeeded. Publishing and HTML download checks now include the separately stored publication title and image/accessibility labels. Both affected functions deployed successfully. This closes those coverage gaps; it is not a guarantee that all harmful content can be detected automatically.
