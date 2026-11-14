# NovaCart Policy Desk — running and submission

The organizer README and all 22 files in `policies/` are preserved unchanged. This application uses only Node.js built-ins and the local organizer corpus. There is no database or install step.

## Run locally

Tested runtime: Node.js 24.21.0. Use Node.js 24 for reproducible startup, including the optional environment-file flag.

```powershell
npm.cmd start
```

Open `http://127.0.0.1:3000`. Run the regression suite with:

```powershell
npm.cmd test
```

The app starts in deterministic evidence mode. To enable AI-assisted evidence selection, copy `.env.example` to `.env` and add a Gemini API key from Google AI Studio. `GEMINI_MODEL` can override the default. The model may select complete source sentences or table rows; filename/section pairs and complete text units are verified. Unsupported wording falls back to the deterministic excerpts. Unresolved partial/conflicting answers bypass AI.

Groq is the optional second provider. Get a `gsk_` key from [Groq Console](https://console.groq.com/keys), then set `ENABLE_GROQ_FALLBACK=true` and `GROQ_API_KEY`. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`, hosted by Groq. No OpenAI API key is needed. Use Groq's Free Plan to stay within the no-paid-API requirement; [account quotas](https://console.groq.com/docs/rate-limits) apply. Set `ENABLE_GROQ_FALLBACK=false` to disable it. Keys stay in server environment variables and must never be committed.

## Vercel Hobby deployment

1. Import the team's repository into a personal Vercel Hobby project. Keep this directory as the project root if the repository has a parent folder.
2. Add `GEMINI_API_KEY`, `GROQ_API_KEY`, and `ENABLE_GROQ_FALLBACK=true` in Vercel Project Settings → Environment Variables for Preview and Production. Optional model overrides are `GEMINI_MODEL` and `GROQ_MODEL`. Redeploy after changing environment variables. Remove the obsolete `XAI_API_KEY`, `XAI_MODEL`, and `ENABLE_XAI_FALLBACK` entries if they were previously configured.
3. Deploy. `public/` contains the static chat UI; `api/ask.js`, `api/calculate.js`, `api/health.js`, and `api/library.js` are Node.js Functions. No build command or database is required.
4. Verify `/api/health` reports 22 policy files, then ask a dated policy question in the deployed UI.

The app remains useful without either provider key. Free-tier availability and limits are set by the provider account and can change. Do not put provider keys in browser code, Git, or public build variables.

HTTP 429 responses honor Retry-After (seconds or HTTP date) through a cooldown bounded to 1 second–5 minutes, with a 60-second default. The cooldown is scoped to each warm process/configuration, not a distributed rate limiter. Backup or deterministic evidence is used immediately; no blocking retry loop is run.

## Interface

The default dashboard includes an Ask Nova button, animated geometric artwork, real counts of questions, evidence-backed answers, successful refund calculations and opened evidence, a seven-day activity chart, recent events and the latest retained refund estimate. Counts start at zero and stay in this browser; Web Locks coordinate tabs. Without Web Locks, the dashboard labels counters as visit-only. Clarification replies and retries do not inflate question counts. No example activity is seeded.

The chat uses the remaining viewport height with a single conversation scroller and an anchored composer. Long answers expand in place, source lists and calculation traces are inspectable, and only the latest unresolved follow-up shows a form. It includes local light/dark preference, conversation search (Ctrl/Cmd+K), complete Markdown export with evidence, request cancellation, and retry with collected order details.

There are 25 interface languages including Spanish, German, Italian, French, Urdu and Roman Urdu. Core controls, guided-form labels/options, and topic buttons are localized; Urdu, Arabic and Persian use RTL layout. Guided topic buttons submit canonical English questions. Policy passages, generated policy answers, calculator explanations, and original document titles remain English for source verification. Arbitrary non-English policy questions are not translated by this version; this is interface localization, not a claim of full multilingual policy reasoning.

No desktop/browser automation was performed for this redesign at the user's request. Source review, localization/state tests and HTTP asset/API checks provide evidence; rendered appearance and real-device scrolling remain unverified.

## API contract

`POST /api/ask` accepts JSON with a `question` string and optional `context` fields (`contactDate`, `deliveryDate`, `orderDate`, `region`, `category`). It returns `status` (`answered`, `partial`, `clarification_required`, `not_covered`, or `error`), an answer, verified citations, and expandable source evidence. Policy rules that require missing dates or order details trigger a concise clarification.

`GET /api/health` reports corpus ingestion. `POST /api/calculate` accepts a structured `type` of `return`, `promo`, or `shipping` and returns the computed total, calculation trace, and verified source excerpts. The chat includes a return estimate form; it asks for the contact date and separates amount calculation from return eligibility. International return estimates exclude the customer's separately arranged return shipping.
