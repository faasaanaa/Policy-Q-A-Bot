# NovaCart Policy Desk — running and submission

The organizer README and all 22 files in `policies/` are preserved unchanged. This application uses only Node.js built-ins and the local organizer corpus. There is no database or install step.

## Run locally

Requirements: Node.js 20 or newer.

```powershell
npm.cmd start
```

Open `http://127.0.0.1:3000`. Run the regression suite with:

```powershell
npm.cmd test
```

The app starts in deterministic evidence mode. To enable model-assisted paraphrasing, copy `.env.example` to `.env` and add a Gemini API key from Google AI Studio. `GEMINI_MODEL` can override the default. The model receives only the question and retrieved source excerpts; source sections and citations are validated, and any failed or unsupported response falls back to the exact policy excerpts.

Grok is an optional second provider. Set `ENABLE_XAI_FALLBACK=true` and `XAI_API_KEY` to enable it. **The xAI API is usage-billed; a free console/playground account does not make API calls free.** Keep the toggle off to meet a no-paid-API requirement. Keys stay in environment variables and must never be committed.

## Vercel Hobby deployment

1. Import the team's repository into a personal Vercel Hobby project. Keep this directory as the project root if the repository has a parent folder.
2. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables for Preview and Production. Leave Grok disabled unless paid usage is approved.
3. Deploy. `public/` contains the static chat UI; `api/ask.js` and `api/health.js` are Node.js Functions. No build command or database is required.
4. Verify `/api/health` reports 22 policy files, then ask a dated policy question in the deployed UI.

The app remains useful without either provider key. Free-tier availability and limits are set by the provider account and can change. Do not put provider keys in browser code, Git, or public build variables.

## API contract

`POST /api/ask` accepts JSON with a `question` string and optional `context` fields (`contactDate`, `deliveryDate`, `orderDate`, `region`, `category`). It returns `status` (`answered`, `partial`, `clarification_required`, `not_covered`, or `error`), an answer, verified citations, and expandable source evidence. Policy rules that require missing dates or order details trigger a concise clarification.

`GET /api/health` reports corpus ingestion. `POST /api/calculate` accepts a structured `type` of `return`, `promo`, or `shipping` and returns the computed total, calculation trace, and verified source excerpts. The chat includes a return estimate form; it asks for the contact date and separates amount calculation from return eligibility. International return estimates exclude the customer's separately arranged return shipping.
