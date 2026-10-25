---
type: Decision
title: Claude through the Anthropic API profiles, classifies and writes
description: One AI provider, Claude Haiku 5.5 through the Anthropic API (Batch API, prompt caching, monthly spend cap), with extraction of facts from untrusted page text kept apart from writing, and every output checked by code
owner: ledvincent
status: stable
tags: [ai, kickoff]
---
# Claude through the Anthropic API profiles, classifies and writes

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The brief asks for AI-written emails personalised from each lead's facts, and the plan uses AI to profile and classify leads. Website and Instagram text is untrusted: it may contain instructions meant to steer the AI. The budget allows a few euros a month for AI at the planned volume (about 650 leads researched and 860 emails written a month). Dirox already works with Claude.

## Decision

One AI provider, Anthropic (Claude), called from the server through its official TypeScript SDK, behind a small internal interface (profile, classify, write). There are two separate steps:
1. **Extraction** reads website and Instagram text as untrusted data. It returns structured facts with their sources (what the business does, the owner's name, merch evidence, client type and reason), using structured output.
2. **Writing** receives only those structured facts and the base template, never raw page text. It returns the subject, the body and the facts it used.

Code checks every output: the language; the length; no placeholder left; a personal line is present; no links except the allowed ones; the products match the client type.

Only business facts and the first name go to the AI; email addresses do not. Both steps use Claude Haiku 5.5, kept cheap three ways:
- the Batch API (half price), since research runs overnight and emails are written ahead of their send day;
- prompt caching on the fixed parts of each request (instructions, templates, the client-type table);
- a monthly spend cap on the AI account.

Row 8 confirms the quality on sample leads and measures the cost. If Haiku does not pass, row 8 compares a cheap OpenAI or Google Gemini model behind the same interface. Row 8 also checks the provider's data terms (API data not used for training by default) and its data processing agreement. See [Anthropic Claude](/integrations/anthropic-claude.md).

## Alternatives considered

- **A larger Claude model (Sonnet or Opus) from the start.** Better writing, but several to tens of times the cost, which the budget does not allow for extraction and classification.
- **OpenAI or Google Gemini.** Comparable quality and price; kept as the fallback if Haiku does not pass row 8.
- **An EU-based provider** (for example Mistral). Data stays in the EU; a fallback if the legal review asks for EU-only processors.
- **A local open model.** No API cost, but it needs strong hardware and more upkeep.
- **Templates without AI.** They do not meet the brief.

## Consequences

- Instructions hidden in a lead's page cannot reach the writer: raw text stops at extraction, and output checks catch what slips through.
- Anthropic is a data processor for business facts and first names ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).
- Batch processing is asynchronous: AI work is planned ahead of when it is needed, not done on demand.
- If row 8 switches to a fallback model, that is a new decision superseding this one, and the new processor is added to the personal data records.
