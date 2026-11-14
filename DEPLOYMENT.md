# Production release

Live URL: **https://novacart-intelligence.vercel.app**

Project: `novacart-intelligence` (`prj_wMq7LdxwSiUvpIuhZnK5vY76OHem`). Current deployment: `dpl_CsBh47XQs9TZkvtoBjrVp4bz3yKc`, production state **READY**. Application source commit: `288a9a49311c1756ce2e81e0e26168102252d076`. Updated on 2026-11-14 through the connected Vercel account. Source and earlier local commits were successfully pushed to [faasaanaa/Policy-Q-A-Bot](https://github.com/faasaanaa/Policy-Q-A-Bot) on `main`, as explicitly requested.

The current source package contained 42 explicitly allowlisted files from `api/`, `src/`, `public/`, `policies/`, plus `package.json` and `vercel.json`. It excluded `.env`, Git data, browser history, tests and local tooling. Credentials remain sensitive server environment variables for Production/Preview. No database or dependency was added. The organizer README and policy files remain unchanged. All eight outgoing commits were checked for tracked environment files and credential-like keys before the initial push; no findings were reported.

## Executed verification

`npm.cmd test`: **69 passed, 0 failed**. JavaScript syntax and Git diff checks passed. A source-only finish review scored the three new export findings resolved: clipped reference tab stops, export focus restoration and verbatim evidence. The targeted design scan reported no findings. Independent Python ZIP checksum and XML parsing checks passed for the five-part DOCX package. No browser or computer automation was performed, as requested.

Vercel reports the current deployment READY with the production alias assigned and no alias error. The earlier build warned that the existing Node engine range `>=20` can upgrade automatically; the project is configured for Node 24.

```powershell
node scripts/deployment-smoke.mjs https://novacart-intelligence.vercel.app
```

All **12 checks passed, 0 failed**:

| Check | Observed result |
| --- | --- |
| Root and seven UI assets | HTTP 200, including `export.js` and `export.css` |
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

Answers and copied text now use clean numbering and blue, bracket-free references. The export menu offers PDF and Word only. PDF opens native Print / Save as PDF; Word downloads a genuine `.docx` archive. Both export full messages, calculation traces and unchanged original evidence. Native print behavior and rendered PDF/Word documents remain unverified under the user's no-computer-use constraint.

Dashboard activity is browser-local and begins at zero. Successful refunds, root questions, evidence-backed answers and evidence openings are tracked; clarification replies and retries do not increase new-question counts. Web Locks coordinate tabs; other browsers show labelled visit-only totals.

## Future releases

This project has no Git deployment integration. The requested GitHub target is `https://github.com/faasaanaa/Policy-Q-A-Bot` on `main`; a normal push has succeeded. Deploy this directory to the existing Vercel project after future source edits, or connect that repository for automatic deployments. Preserve the server environment variables, `public` output directory and `policies/**` function inclusion. Run the smoke command after redeployment. The source allowlist helper is `node scripts/deploy-package.mjs`; its ignored manifest contains deployment source only and is not a submission artifact.
