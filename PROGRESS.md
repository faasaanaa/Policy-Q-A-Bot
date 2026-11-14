# Progress

## Latest phase: clean answers, PDF/Word export and GitHub publication

- User explicitly requested pushing all work to `https://github.com/faasaanaa/Policy-Q-A-Bot`; origin already matches. Seven earlier commits were local only. Remote `main` was `0da025620ad794d71450c87596477e1927013150` before this release. Use a normal push, never force.
- Added presentation-only cleanup for assistant numbering/dashes and bracket-free blue references. Verified inline references open original source evidence. Copy uses clean text. Original policies and backend evidence are unchanged.
- Replaced Markdown download with PDF (native browser Print / Save as PDF) and real Word `.docx` export. Both contain full transcript, trace and verbatim original excerpts. No dependencies, hosted export service or secrets are involved.
- Files: `public/chat-core.js`, `public/export.js`, `public/export.css`, `public/app.js`, `public/styles.css`, static asset route, export/API tests and release docs. Independent Python ZIP CRC and XML parsing passed for all five DOCX package parts.
- Source reviewer scored all three findings resolved: clipped reference tab stops, export focus restoration, and verbatim exported evidence. Rendered documents and native print behavior remain unverified because the user prohibits computer use.
- Next: final `npm.cmd test`, secret-safe outgoing-history check, commit and push to requested `origin/main`, then redeploy and run `node scripts/deployment-smoke.mjs https://novacart-intelligence.vercel.app`.

## Latest phase: activity dashboard and Vercel release

- Added the default dashboard, Ask Nova action, animated authored SVG, four real counters, seven-day chart, recent activity, conversation count and latest retained refund estimate. No database or dependency added. Chat behavior is preserved.
- Files: `public/activity.js`, `public/app.js`, `public/index.html`, `public/styles.css`, `public/locales.js`, static routes/tests, product/design docs and `scripts/deploy-package.mjs`. Vercel function config explicitly includes all policy files.
- Counters persist in this browser with Web Locks for safe cross-tab updates; unsupported browsers use clearly labelled visit-only counters. Follow-ups/retries are excluded from new-question counts; invalid/failed refunds are excluded. All 25 locales include dashboard labels.
- Executed **65 tests, 65 passed** (`npm.cmd test`), `node --check public/app.js`, `git diff --check`. Source reviewer scored three dashboard findings resolved: cross-tab retention, background focus loss and skip-link target. Mechanical detector flagged only the existing request-bound loading indicator. No rendered visual/device check (user prohibited computer use).
- Created connected Vercel project `novacart-intelligence` (`prj_wMq7LdxwSiUvpIuhZnK5vY76OHem`), configured Gemini/Groq credentials as sensitive production/preview variables, and confirmed all five environment entries created with zero failures. Local `.env` was read only, never packaged or printed.
- Production **READY**: https://novacart-intelligence.vercel.app (`dpl_JA91QGT6jaqYeumSjeSvXaGz1q7V`), source commit `c8f77b9`. Build completed in `/vercel/output`; all 22 policy files loaded as 270 sections. Uploaded only 40 allowlisted application/corpus files, no environment file or Git data.
- Executed `node scripts/deployment-smoke.mjs https://novacart-intelligence.vercel.app`: **12 passed, 0 failed**. Root and all UI assets 200, health/library complete, missing contact date clarification, remote shipping Rs. 600 with original evidence, COD contradiction partial, injection refusal, absent-evidence abstention, refund Rs. 8,300 with two steps/six citations, invalid calculator 400, GET ask 405, `.env` 404. Sample policy answer used deterministic fallback; accepted live model output remains unverified.
- No deployment blocker. Next: rehearse `DEMO.md`, use the live URL for submission, and run organizer leaderboard evaluation when available. Future code edits require a deployment; project has no Git auto-deploy link. Do not push to the organizer remote.

## Latest phase: judging-rubric hardening

- Added adversarial cases and honest scoring evidence in `RED_TEAM.md`, `JUDGING.md`, `README_APP.md`, and a three-minute `DEMO.md`.
- Hardened financial input types/required regions/opened state, dated calculator citations and actual fee/waiver references. BigInt intermediates protect rounding and allocation; unsafe output ranges are rejected.
- Added per-warm-configuration 429 Retry-After cooldown, preserved unresolved conflicts without AI, and replaced word-overlap acceptance with exact complete source-sentence/row validation.
- Executed **59 tests, 59 passed**. `npm.cmd run benchmark` writes `BENCHMARK.json` with explicitly scoped local deterministic CPU timings and zero provider calls.
- Final latest-backend HTTP smoke: international shipping requested USA/UK/UAE, older refund Rs. 8,850 had zero future-dated sources, COD conflict stayed partial/deterministic, UI returned 200. Syntax/diff/secret-pattern checks passed; `.env` remains ignored.
- No organizer leaderboard run, production deployment, or rendered visual test has been performed. Those are not claimed by the local checks.

## Frontend phase: completed before rubric work

- Replaced oversized forest/cream layout with compact light/dark workspace, one chat scroller, anchored growing composer, expandable answers/sources/trace, current follow-up only, search, Markdown export, Stop and context-preserving Retry.
- Added 25 core interface languages, translated guided-form options, and RTL for Urdu/Arabic/Persian. Policy answers and original evidence remain English; arbitrary non-English questions are not translated.
- Files: `public/index.html`, `public/styles.css`, `public/app.js`, `public/locales.js`, `public/chat-core.js`, static module routes in `server.mjs`, interface/API tests, `PRODUCT.md`, `DESIGN.md`, `SUBMISSION.md`.
- Checks: **36 passed, 0 failed** (`npm.cmd test`), syntax and diff checks passed. Live HTTP: all UI modules 200; missing-detail and remote shipping flows valid; two-item partial refund Rs. 11,300 with three calculation steps.
- Source review found eight UI/state/accessibility issues; fixed in one batch and re-reviewed with no material blocker. Mechanical detector only flagged the request-bound working indicator. User prohibited computer use, so no rendered visual/device verification was performed.
- Saved as commit `9f3784c` before beginning rubric work. Organizer README and policy files remain untouched.

## Completed

- Audited the clean organizer repository, Node runtime, all 22 policy documents, metadata, numbered items, regional rules, effective dates, and known embedded prompt-injection text. Original organizer README and policy files remain unchanged.
- Built a dependency-free Node application, item-level corpus loader, BM25-style lexical retrieval with synonym expansion, deterministic answer API, clarifications, dated and regional precedence handling, citations, and source-excerpt UI.
- Added Gemini primary and optional Groq Console fallback. Groq uses `GROQ_API_KEY` with Chat Completions and defaults to `openai/gpt-oss-120b`. Provider output is constrained to supplied evidence and validated; provider errors or absent keys use deterministic answers.
- Added Vercel Node.js function routes and deployment instructions in `SUBMISSION.md`.
- Added whole-rupee half-up, promotional discount allocation, dated shipping-fee calculation, partial-return estimate API, and a chat refund-estimator UI with calculation trace and citations.
- Added one-at-a-time validated follow-up cards, local-browser conversation persistence, source-library API/view, service/provider status, greeting prompts, and clickable citation inspection.
- Wired the conversational refund estimator through the existing deterministic calculator, including whole-rupee input validation and policy evidence; improved minimum UI text size and contrast.

## Test history

- First focused run: **7 passed, 5 failed**. Exposed brand-token false matches, injected policy text leakage assumptions, and an amount formatting assertion.
- Second focused run: **10 passed, 2 failed**. Refined test coverage and matching.
- Latest run before this UI pass: **19 passed, 0 failed** (`npm.cmd test`).
- UI/refund/provider run before Groq migration: **24 passed, 0 failed** (`npm.cmd test`).
- Groq migration run: **31 passed, 0 failed** (`npm.cmd test`). Covers Gemini priority, Groq endpoint/request format, citation metadata, explicit disable, quota errors, malformed/empty responses, and fabricated citations. No dependency was added.
- Groq live connection: authenticated Chat Completions requests returned HTTP 200. Replies with no citations or unsupported wording/dates were rejected by the guard; another call timed out. Deterministic answers and citation metadata remained intact. A live accepted paraphrase is not yet verified.
- Configured app smoke: `/api/health` returned `geminiConfigured=true` and `groqFallbackEnabled=true`; UI returned HTTP 200. The user restored the local Groq key after a migration mistake cleared its entry; `.env` remains ignored and credentials were not logged.
- Live local smoke: `/api/health` returned 22 files; a dated Lahore shipping question returned four verified citations; sequential refund clarifications reached a traced Rs. 9,800 estimate with four evidence sections. Static UI returned HTTP 200.

## Next steps

1. Production deployment and API verification are complete; see `DEPLOYMENT.md`. Re-run `node scripts/deployment-smoke.mjs https://novacart-intelligence.vercel.app` after any future release.
2. Rehearse `DEMO.md`; run the organizer's leaderboard evaluation when available. See `README_APP.md` for known failure cases and the distinction between 25 interface locales and English policy evidence.
3. The user has now explicitly authorized pushing to `https://github.com/faasaanaa/Policy-Q-A-Bot`. Verify normal push success and keep `.env` ignored. There is no Git auto-deploy integration, so use the release procedure for later updates.

## Known limits

- Gemini live inference and final accepted live AI sentence selection remain unverified. Groq authentication previously returned HTTP 200. Warm-instance cooldowns do not enforce a distributed quota. The xAI integration has been removed.
- Promo and shipping calculations are available through the structured API and are covered by unit tests; only return estimates have a dedicated calculator/chat flow.
- Vercel production build and HTTP smoke checks passed. Accepted live AI output, rendered browser appearance and hidden leaderboard performance remain unverified.
- The user prohibited computer use for the redesign. Current UI verification is source review plus localization/state/HTTP checks, not rendered browser/device verification.
