# Progress

## Completed

- Audited the clean organizer repository, Node runtime, all 22 policy documents, metadata, numbered items, regional rules, effective dates, and known embedded prompt-injection text. Original organizer README and policy files remain unchanged.
- Built a dependency-free Node application, item-level corpus loader, BM25-style lexical retrieval with synonym expansion, deterministic answer API, clarifications, dated and regional precedence handling, citations, and source-excerpt UI.
- Added optional Gemini primary and opt-in xAI/Grok fallback. Provider output is constrained to supplied evidence and validated; provider errors or absent keys use deterministic answers.
- Added Vercel Node.js function routes and deployment instructions in `SUBMISSION.md`.
- Added whole-rupee half-up, promotional discount allocation, dated shipping-fee calculation, partial-return estimate API, and a chat refund-estimator UI with calculation trace and citations.
- Added one-at-a-time validated follow-up cards, local-browser conversation persistence, source-library API/view, service/provider status, greeting prompts, clickable citation inspection, and a Nova dock.
- Wired the conversational refund estimator through the existing deterministic calculator, including whole-rupee input validation and policy evidence; improved minimum UI text size and contrast.

## Test history

- First focused run: **7 passed, 5 failed**. Exposed brand-token false matches, injected policy text leakage assumptions, and an amount formatting assertion.
- Second focused run: **10 passed, 2 failed**. Refined test coverage and matching.
- Latest run before this UI pass: **19 passed, 0 failed** (`npm.cmd test`).
- Current UI/refund/provider run: **24 passed, 0 failed** (`npm.cmd test`); Node syntax checks and `git diff --check` passed. Mocked outage tests cover deterministic recovery and validated xAI backup citation metadata.
- Live local smoke: `/api/health` returned 22 files; a dated Lahore shipping question returned four verified citations; sequential refund clarifications reached a traced Rs. 9,800 estimate with four evidence sections. Static UI returned HTTP 200.

## Next steps

1. Configure Gemini API key in the team's Vercel Hobby project and deploy.
2. Configure a free-tier eligible Gemini model and verify `/api/health`, a dated return question, and a remote-area shipping question on the deployment.
3. Urdu and Roman Urdu localization is not implemented; the language menu labels those choices as coming soon and policy answers remain in English.
4. Do not push this local commit to the organizer remote; use the team's submission repository.

## Known limits

- No Gemini or xAI credentials were supplied, so live provider calls cannot be verified here; deterministic mode is the tested path. xAI fallback is disabled by default because API requests are billed.
- Promo and shipping calculations are available through the structured API and are covered by unit tests; only return estimates have a dedicated calculator/chat flow.
- Vercel deployment itself requires the team's Vercel project and was not performed from this workspace.
- Native browser preview could not start because the local browser access host and accessibility state were unavailable; HTTP checks verified the served UI and its API integration.
