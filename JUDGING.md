# Evidence against the supplied rubric

This maps shipped work to the organizer's criteria. It does not predict judge decisions or claim an automated leaderboard score.

| Criterion | Weight | Reviewable evidence |
|---|---:|---|
| Problem Understanding & Relevance | 15% | [Adversarial probes](RED_TEAM.md), [known failure cases](README_APP.md#known-failure-cases-and-limits), unchanged organizer corpus and version-specific source citations. |
| Innovation & Creativity | 20% | Multi-stage retrieval/precedence/clarification pipeline, conflict preservation, exact-money calculator, constrained source selection by optional AI, and inspectable evidence. The result does more than send a single prompt to a model. |
| Technical Implementation & AI Integration | 25% | Source in `src/`, local and Vercel API routes, meaningful commits, typed statuses, strict calculator validation, provider timeouts, 429 Retry-After cooldown, model citation/sentence validation, 59 executed regression tests. |
| Functionality & Demo Performance | 20% | `npm.cmd test` and live local HTTP smoke checks. **Organizer leaderboard evaluation is still required.** Local tests cannot establish unseen-test accuracy. |
| Practicality & User Impact | 10% | No database or runtime package dependencies; deterministic operation without provider keys; compact interface with 25 core interface locales; reproducible p50/p95 [local CPU timings](BENCHMARK.json). Network, model and cold-start time are excluded. |
| Presentation, Explanation & Q&A | 10% | [Three-minute demo and judge answers](DEMO.md), clickable evidence, calculation trace, explicit limits, and reproducible startup in [application README](README_APP.md). |

The organizer's original README remains intact. `README_APP.md` is the application's README, including the requested known failure cases.
