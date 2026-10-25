---
type: Integration
title: Anthropic Claude
description: The AI that profiles leads, picks their client type and writes their emails, Claude Haiku 5.5 through the Anthropic API with the Batch API, prompt caching and a monthly spend cap; business facts and first names are sent, email addresses never
owner: ledvincent
status: stable
tags: [ai, kickoff]
---
# Anthropic Claude

## What we use it for

Three uses behind one internal AI interface ([Claude for AI](/decisions/MOQ-1-claude-for-ai.md)):
- **profile**: extract structured facts with their sources from a lead's website and Instagram text (what it does, the owner's name, own-merch evidence);
- **classify**: the lead's [client type](/domain/client-types.md) and a one-line reason;
- **write**: each email and the suggested DM text, from the [base template](/domain/base-templates.md) and the structured facts.

Specs: `openspec/specs/lead-enrichment/spec.md`, `openspec/specs/lead-qualification/spec.md`, `openspec/specs/email-writing/spec.md`.

## How we connect

- Anthropic's official TypeScript SDK, called from the server only (the `platform` module's AI client).
- Model: Claude Haiku 5.5 (`claude-haiku-5-5`) for every step. Row 8 confirms the quality on sample leads and measures the cost; if Haiku does not pass, row 8 compares a cheap OpenAI or Google Gemini model behind the same interface.
- **Batch API** (half price) for research and for emails written ahead of their send day; **prompt caching** on the fixed parts of each request (instructions, templates, the client-type table; a cached prefix must reach the model's minimum length to be cached); a **monthly spend cap** on the AI account.
- The API key is a server secret, outside the repo (row 2 sets where). Local and CI: fakes and recorded fixtures; the real API only with the developer's own key.

## Data sent

- Sent: business facts and the first name of the lead's owner. Website and Instagram text goes to the extraction step only, as untrusted data; the writing step never sees raw page text.
- Never sent: email addresses.
- Row 8 checks the provider's data terms (API data not used for training by default) and its data processing agreement. Anthropic is a data processor for GDPR ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

## Limits and failure

- Every output is checked by code before use: language, length, no placeholder, a personal line, only allowed links, products that match the client type. An email that fails, such as one with a placeholder left, is not kept for sending and the lead is flagged for the owner.
- Expected cost: a few euros a month at the planned volume (about 650 leads researched and 860 emails written a month), inside the €10 budget; measured in row 8.
- What the tool does when the spend cap is reached or the API is down is not set by the kickoff (row 8).

## Contacts

- Anthropic account and billing owner: TODO (not set by the kickoff; row 8).
