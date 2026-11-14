# Three-minute demo

Before the demo: run `npm.cmd test`, then `npm.cmd start`. Keep this app directory as the Vercel project root. Configure keys only through local ignored `.env` or Vercel environment settings. Evidence mode is a real working mode if providers are unavailable; do not present it as a live model success.

1. **0:00–0:30 — Show the workflow.** Start a new chat. Choose Spanish, German or Urdu to show interface localization, then return to English. Explain that policy evidence stays in its original English. Ask “Can I return my item?” and answer one follow-up at a time. The app asks for details that select the dated/regional rule.
2. **0:30–1:00 — Show grounding.** Ask “What is the shipping fee in Gilgit-Baltistan?” and enter 2026-11-14 when asked. Open Sources and inspect file 19, Section 2.1 and its date. Show the policy library. Explain why regional evidence takes precedence.
3. **1:00–1:30 — Show honesty.** Ask “What is the maximum COD order total on 2026-11-14?” Show both conflicting limits, partial status, and the support referral. Explain that same-date/scope contradictions bypass AI and remain unresolved.
4. **1:30–2:00 — Show money correctness.** Open the refund calculator. Use 2026-11-14, Lahore, electronics, Rs. 10,000, opened, no NovaCart error. Expect Rs. 8,300: Rs. 1,500 restocking and one Rs. 200 label fee. Open the trace and fee evidence. State that eligibility is a separate question. The two-item API case is Rs. 11,300 and is covered by tests.
5. **2:00–2:30 — Show reliability.** Ask an out-of-policy request or a prompt-injection request. Explain deterministic recovery, strict source-sentence validation, 3.2-second provider timeouts and warm-instance cooldown on 429. Cite the mocked outage tests; do not pretend a mock was a live outage.
6. **2:30–3:00 — Show practical features and limits.** Expand a long answer, search with Ctrl/Cmd+K, export the conversation with evidence, and switch light/dark mode. Show the 59-test result and the explicitly scoped local benchmark. Name pending production/device/leaderboard checks.

## Concise answers for judges

- **Why not one prompt?** Retrieval, effective dates, regional precedence, required-fact collection, contradictions and money are deterministic stages. AI can only select complete sentences/rows from verified evidence.
- **How do you prevent invented sources?** Only filename/section pairs in the actual retrieved corpus are accepted. Calculator citations are looked up against the corpus and checked against the contact date.
- **How do you prevent financial hallucinations?** The model does no arithmetic. Whole-PKR calculations use BigInt intermediates, half-up rounding at each documented step, allocation reconciliation, and safe-range checks.
- **What happens at a free-tier quota limit?** The next provider or deterministic source answer takes over. Retry-After cools down the affected provider in that warm instance. There is no claim of distributed quota enforcement.
- **Is this fully multilingual AI?** No. It has 25 core interface/guided-form languages. The policy corpus, policy answers and calculation explanations remain English; arbitrary foreign-language questions are not translated.
- **What has been measured?** Local regression tests, deterministic CPU timings and HTTP smoke checks. Not the organizer's hidden score, Vercel cold-start latency, or device rendering.
