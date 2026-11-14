# NovaCart Intelligence

Application README for the Tech Fusion '26 submission. The organizer's `README.md` and all 22 policy files are preserved unchanged.

Use Node.js 24 for the documented startup commands (tested on v24.21.0); no package installation or database is needed.

```powershell
npm.cmd start
npm.cmd test
npm.cmd run benchmark
```

Open `http://127.0.0.1:3000`. Copy `.env.example` to the ignored `.env` for optional Gemini primary and Groq backup credentials. Keep provider accounts within their free plans. The deterministic policy engine works without either key. [Startup, environment and Vercel instructions](SUBMISSION.md).

The application combines section retrieval, date/region precedence, sequential clarification, verified evidence, and a separate exact-money calculator. AI can select complete source sentences; unsupported wording never replaces the evidence answer. Unresolved policy conflicts bypass AI. HTTP 429 responses trigger a bounded warm-instance cooldown before backup/deterministic recovery.

The compact UI includes light/dark themes, expandable evidence and answers, conversation search/export, request cancellation and retry, and 25 interface languages. Original policy answers remain English. [Demo script](DEMO.md) · [Red-team cases](RED_TEAM.md) · [Rubric evidence](JUDGING.md).

## Known failure cases and limits

- Lexical retrieval may miss unusual wording or nuanced compound questions. The app returns relevant excerpts; it does not prove that every eligibility condition is satisfied.
- Missing or unknown required facts can prevent an answer. International shipping needs a specific destination; it must not guess a country rate.
- The 25 languages cover core interface controls, guided prompts/options and RTL layout. Topic shortcuts submit canonical English questions. Arbitrary foreign-language questions, source documents, and calculator explanations are not automatically translated.
- AI is optional and deliberately constrained to exact complete source sentences or rows. Provider failure, quota exhaustion, timeout or an invalid response uses deterministic evidence. Live Groq authentication previously returned HTTP 200, but accepted live AI wording has not been verified for the final code.
- Cooldown state lives only in each warm server instance. It is not a distributed account quota manager or durable rate limiter.
- Refund estimates assume an eligible return and already allocated paid prices. Original checkout shipping refunds and eligibility are separate policy questions. Only return estimates have a dedicated UI form; promo/shipping calculations are structured API tools.
- Values and aggregate results outside JavaScript's safe integer range are rejected. BigInt intermediate arithmetic prevents multiplication/rounding precision loss within the supported output range.
- Chat history lives only on the current browser/device and can be cleared there. No real orders are accessed or changed.
- Rendered visual/device behavior was not inspected because the user prohibited computer use. Source review and automated state/localization/API checks are the available evidence.
- Vercel deployment and the organizer's hidden leaderboard evaluation have not been run. Local pass counts are not a leaderboard score.

Current executed checks: **59 tests passed**, including injected text, contradictions, regional/date rules, rounding/allocation, API failures, provider quotas, and interface state/localization. [Benchmark scope and results](BENCHMARK.json) exclude providers, network and rendering.
