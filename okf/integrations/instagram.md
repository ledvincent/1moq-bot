---
type: Integration
title: Instagram
description: Read-only Instagram facts for leads whose handle is known (followers, bio, website, recent posts) through the Graph API's business discovery (recommended, not decided, row 7); the company's own account is never signed in to or automated
owner: ledvincent
status: draft
tags: [sourcing, enrichment, instagram, kickoff]
---
# Instagram

## What we use it for

- Adding a lead from a pasted Instagram profile link or handle.
- Profile facts: followers count, bio, website, recent posts (date of the last post, pictures for the review card, evidence of own merch). Two [qualification rules](/domain/qualification-rules.md) depend on them (followers, posted in the last 30 days).

Read only. The tool never signs in to or automates the company's Instagram account and never sends a DM, follows or likes. The day-3 DM of the [outreach sequence](/domain/outreach-sequence.md) is sent by the owner by hand ([source policy](/decisions/MOQ-1-lead-source-policy.md)).

Specs: `openspec/specs/lead-sourcing/spec.md`, `openspec/specs/lead-enrichment/spec.md`, `openspec/specs/lead-review/spec.md`.

## How we connect

- **Source: recommended, not decided.** The official Instagram Graph API's business discovery. Settled by open question 4, or row 7 if still open; this concept stays `draft` until then.
- What it needs: a professional Instagram account linked to a Facebook Page, and a Meta app. Which account holds the API token (the company's account or a separate one) is open question 4.
- What it gives: followers, bio, website and recent posts of business and creator accounts, by handle. It cannot search by hashtag or place: Instagram leads come from handles found on lead websites or pasted by the owner. A paid data provider to search by hashtag or place was dropped for the budget.
- Called from the server only, behind the `enrichment` module. The access token is a server secret, outside the repo (row 2 sets where). Local and CI: recorded fixtures.

## Limits and failure

- If Meta refuses or narrows API access, Instagram facts become optional: leads still come from Google Maps, pasted links and websites, and the rules that depend on Instagram show as unknown.
- Personal accounts are not collected ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)). Meta is a data processor for GDPR.
- Rate limits: row 7.

## Contacts

- Meta app and Facebook Page owner on the client side: TODO (open question 4).
