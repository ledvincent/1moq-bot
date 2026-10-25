---
type: Integration
title: Google Maps
description: Finding businesses by type and city, their place details and photos; the Google Places API is the recommended source (not decided, row 4), and Google's terms limit how long Places content other than place IDs is stored
owner: ledvincent
status: draft
tags: [sourcing, google-maps, kickoff]
---
# Google Maps

## What we use it for

- Searching for businesses by type and city (for example "specialty coffee" in "Melbourne"), each result becoming a [lead](/domain/lead.md) or matching one by its map place ID.
- Place details (name, address, city, country, website) and photos for the review card.

Specs: `openspec/specs/lead-sourcing/spec.md`, `openspec/specs/lead-review/spec.md`.

## How we connect

- **Source: recommended, not decided.** Google's official Places API (text search, place details, photos), within Google's terms. The alternative, a scraping data provider, is cheaper per result but against Google's terms ([source policy](/decisions/MOQ-1-lead-source-policy.md)). Settled by open question 3, or row 4 if still open; this concept stays `draft` until then.
- Called from the server only, behind the `sourcing` module's source adapter. The API key is a server secret, outside the repo (where secrets live is set in row 2).
- Local and CI: recorded fixtures; the real API only with the developer's own key.

## Limits and failure

- **Storage**: Google's terms let map place IDs be stored without limit but restrict how long other Places content may be kept. Names, addresses and photos from Places are refreshed from the API when shown, or replaced by facts from the lead's own website. Row 4 checks the current terms and decides what is stored.
- **Failure**: a failed or refused search is marked failed with a reason the owner can read; leads already stored are unchanged.
- **Cost**: the calls are expected to stay inside Google's free monthly usage, within the €10 monthly budget; rows 2 and 4 confirm before anything is bought. Quotas and rate limits: row 4.
- Google is a data processor for GDPR ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

## Contacts

- Google Cloud account and billing owner on the client side: TODO (not set by the kickoff; row 4).
