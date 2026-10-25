---
type: Decision
title: Lead sources only through official or provider APIs, never the company's Instagram account
description: Google Maps and Instagram data come only through official APIs (or a provider's API if the client chooses), the tool never signs in to or automates the company's Instagram account, and lead websites are read politely
owner: ledvincent
status: stable
tags: [sourcing, instagram, google-maps, kickoff]
---
# Lead sources only through official or provider APIs, never the company's Instagram account

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The brief asks to find leads on Google Maps and Instagram, and to keep within both sites' terms and keep the company's Instagram account safe. Scraping either site breaks its terms, is brittle and gets blocked; doing it with the company's login puts the account at risk. Lead websites are the best source for contact emails, but must be read without harming them or exposing the server.

## Decision

The tool never signs in to or automates the company's Instagram account: no DMs, follows or likes, and the day-3 DM stays manual. Google Maps and Instagram data come through official APIs or, if the client chooses, a data provider's API under that provider's terms. The tool does not scrape Google Maps or Instagram pages itself. A lead's own website is read politely:
- public pages only, a few per site;
- robots rules honoured;
- an identified user agent;
- a rate limit per site;
- private and internal network addresses blocked.

Recommended sources, each settled in its own row (recommended, not decided):
- **Google Maps: the Google Places API** (open question 3, row 4). See [Google Maps](/integrations/google-maps.md).
- **Instagram: the Graph API's business discovery** (open question 4, row 7). It cannot search by hashtag or place, so Instagram leads come from handles found on websites or pasted by the owner. A paid data provider to search by hashtag or place is out of scope for the budget. See [Instagram](/integrations/instagram.md).

## Alternatives considered

- **Own scraping of Google Maps or Instagram with a headless browser.** It breaks both sites' terms, is brittle and gets blocked. With the company's login it would also put the account at risk. Rejected.
- **A scraping data provider for Google Maps.** Cheap per result, but against Google's terms. Kept only as an option the client may accept (open question 3).

## Consequences

- The tool holds no password or browser session for the company's Instagram account.
- Google's terms limit how long Places content other than place IDs may be stored: names, addresses and photos are refreshed when shown or replaced by facts from the lead's website (row 4 checks the current terms).
- If Meta refuses or narrows Instagram API access, Instagram facts become optional; leads still come from Google Maps, pasted links and websites.
- The website reader is a way into the network: private and link-local addresses blocked, size and time limits, few redirects.
