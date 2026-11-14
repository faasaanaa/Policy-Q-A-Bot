# NovaCart Intelligence
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
NovaCart customers and hackathon evaluators need to understand documented shopping policies and calculate supported refunds.

## Product Purpose
Answer policy questions with verified filenames, sections, dates, and original evidence. Ask for missing order details one at a time and abstain when evidence is absent or contradictory.

## Operating Context
The organizer corpus contains 22 policy documents. The existing dependency-free Node/vanilla JavaScript app runs locally and targets Vercel Hobby. Gemini is primary, Groq is optional backup, and deterministic evidence remains available without providers.

## Capabilities and Constraints
Preserve organizer documents, history, existing tests, citation validation, and deterministic money calculations. No database, paid dependencies, or secrets in source. Browser-local conversation storage. The user requested compact responsive layout, smooth appropriate scrolling, a replacement palette, meaningful interactions, and approximately 25 languages. Language implementation details were delegated; interface and guided forms will be localized while original source passages remain English.

## Product Principles
- Keep evidence and calculations inspectable.
- Show one actionable follow-up at a time.
- Keep the conversation readable on laptop and phone screens.
- Respect reading position and reduced-motion preferences.

## Dashboard activity
The user requested a dashboard with an Ask Nova entry point and counts of questions, answered policy requests and refund calculations. Tracking is local to each browser, excludes clarification/retry inputs from new-question counts, and records successful calculations only. It is not store-wide reporting. The dashboard adds evidence views, conversation counts, a seven-day chart and recent activity without a database or third-party analytics.
