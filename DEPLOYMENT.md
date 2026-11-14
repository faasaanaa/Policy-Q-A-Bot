# Production release

Live URL: **https://novacart-intelligence.vercel.app**

Project: `novacart-intelligence` (`prj_wMq7LdxwSiUvpIuhZnK5vY76OHem`). Deployment: `dpl_JA91QGT6jaqYeumSjeSvXaGz1q7V`, production state **READY**. Application source commit: `c8f77b9646e6060cf6bec6e9098ca9adf78b808a`. Deployment performed on 2026-11-14 through the connected Vercel account.

The source package contained 40 explicitly allowlisted files from `api/`, `src/`, `public/`, `policies/`, plus `package.json` and `vercel.json`. It excluded `.env`, Git data, browser history, tests and local tooling. Credentials were configured separately as sensitive server environment variables for Production/Preview. No database or dependency was added. The organizer README, policy files and remote remain unchanged.

## Executed verification

`npm.cmd test`: **65 passed, 0 failed**. JavaScript syntax and Git diff checks passed. A source-only finish review scored the three dashboard findings resolved. The mechanical design scan flagged only the existing request-bound loading indicator. No browser or computer automation was performed, as requested.

The production build log reported `Build Completed in /vercel/output [1s]` and `Deployment completed`. It warned that the existing Node engine range `>=20` can upgrade automatically; the project is configured for Node 24. No application build error was reported.

```powershell
node scripts/deployment-smoke.mjs https://novacart-intelligence.vercel.app
```

All **12 checks passed, 0 failed**:

| Check | Observed result |
| --- | --- |
| Root and five UI assets | HTTP 200, including dashboard activity module |
| Health | 22 files, 270 sections; Gemini and Groq configuration enabled |
| Library | All 22 documents and 270 sections |
| Missing order details | `clarification_required`, contact date requested |
| Gilgit-Baltistan shipping | Rs. 600, three verified citations; deterministic fallback |
| Conflicting COD maximum | `partial`, Rs. 40,000 and Rs. 50,000 retained with support escalation |
| User prompt injection | `not_covered`, no citations |
| Absent evidence | `not_covered`, no citations |
| Opened electronics refund | Rs. 8,300, two calculation steps and six verified citations |
| Invalid calculator flags | HTTP 400, typed error, no citations |
| GET on ask endpoint | HTTP 405 |
| Environment file access | HTTP 404 |

The script verifies deployed citation filenames, sections and original excerpts against the repository corpus. These are live HTTP checks; they do not establish accepted live AI output, rendered UI quality, real-device scrolling or a hidden leaderboard score. Provider failures remain safe through deterministic evidence.

Dashboard activity is browser-local and begins at zero. Successful refunds, root questions, evidence-backed answers and evidence openings are tracked; clarification replies and retries do not increase new-question counts. Web Locks coordinate tabs; other browsers show labelled visit-only totals.

## Future releases

This project has no Git deployment integration. Use the team's submission repository when connecting Git, or deploy this directory to the existing Vercel project. Do not push application work into the organizer remote. Preserve the server environment variables, `public` output directory and `policies/**` function inclusion. Run the smoke command after redeployment. The source allowlist helper is `node scripts/deploy-package.mjs`; its ignored manifest contains deployment source only and is not a submission artifact.
