---
type: Glossary Term
title: Markets
description: The countries 1moqcustom targets in three phases (EU, UK and Australia; then Singapore; then the United States), the active markets setting that flags leads elsewhere, and the language each lead is written to
owner: ledvincent
status: stable
tags: [qualification, compliance, kickoff]
---
# Markets

## Definition

A market is a country (or group of countries) the client targets. The **active markets** are a setting: the markets being worked now. A lead whose country is outside them is flagged "market not active".

## Not to be confused with

- **Time zone**: set from the lead's location, and used for the send window; a market is about whether to work the country at all.
- **Language**: decided by what the lead writes in, not by its country (below).

## Rules

| Phase | Markets |
|---|---|
| 1 | EU countries, United Kingdom, Australia (the active markets at start) |
| 2 | Singapore |
| 3 | United States |

- The owner adds or removes active markets in the settings; leads in a newly added market are no longer flagged.
- Leads outside the active markets are shown last in the review. The flag does not, as specified today, stop an approved lead from being emailed: whether the send gate should also refuse them is not settled (see open question 9).
- **Language**: French when the lead's website or Instagram profile is written in French, English otherwise; the owner can change it. The deck's French-speaking targets are France, Belgium and Switzerland.

**Open (open question 9):**
- Cold-email rules differ between markets: the UK treats sole traders like consumers, Germany is strict about unsolicited B2B email, Australia relies on consent inferred from a published business address, Singapore has rules for unsolicited bulk email. Recommended, not decided: a short legal review before go-live, then excluding countries or kinds of business as advised.
- Whether Switzerland (not in the EU, but in the deck's French-language list) is an active market.

## Where it is used

Specs: `openspec/specs/lead-qualification/spec.md`, `openspec/specs/lead-enrichment/spec.md`, `openspec/specs/email-writing/spec.md`, `openspec/specs/outreach-tracking/spec.md`.
