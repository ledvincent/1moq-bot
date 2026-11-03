---
type: Architecture
title: Architecture overview
description: One always-on TypeScript web service on a small EU server serves the owner's UI and runs every background job (search, research, qualification, writing, sending, inbox), with PostgreSQL on the same server as its only store and job queue
owner: ledvincent
status: draft
tags: [architecture, kickoff]
---
# Architecture overview

Planned in the MOQ-1 kickoff (`openspec/changes/archive/moq-1-kickoff-2026-10-25/design.md`). The project scaffold (MOQ-2) and the production setup proven locally (MOQ-3) are built; this stays `draft` until a real server runs it (MOQ-29). Behaviour is in `openspec/specs/`; the "row" numbers below are the kickoff backlog in that change's `proposal.md`.

## Overview

1moqcustom's owner (not technical, on a Mac, on Vietnam time) uses the tool to find small businesses, approve or reject each with a swipe, and have the approved ones emailed from the company mailbox in each lead's local morning. One web service, always on in an EU region, serves the UI and runs all background work, so sending, follow-ups and unsubscribe work while the Mac is off ([cloud web service](/decisions/MOQ-1-cloud-web-service.md)). One company, one account (the owner's); the developer maintains the tool on the server, not through an account.

```
Owner's Mac: Safari or Chrome, bookmark or Dock web app
        |  HTTPS, signed-in session
        v
+---------------- Web service (one container, small EU server) ----------------+
|  HTTP: /api/* JSON for the UI  |  React UI as static files  |  /u/:token page   |
|  Job worker, same process: search, enrich, qualify, write, send, inbox, sweep  |
+------+-------------+---------------+----------------+---------------+---------+
       |             |               |                |               |
  PostgreSQL    Google Places   Instagram Graph   Anthropic API   Company mailbox
  (same server)  API             API               (Claude)        (send + read)
                                                                   + lead websites
                                                                     (public pages)
```

## Modules

One module per capability, so a ticket stays inside one folder. Folder names and layout are set in row 1.

| Module | Capability | Does |
|---|---|---|
| `sourcing` | lead-sourcing | Source adapters (Google Maps, Instagram, manual link); matching a business to an existing [lead](/domain/lead.md) |
| `enrichment` | lead-enrichment | Website reader, Instagram profile, email finder (and the optional lookup service), AI profile, language, time zone |
| `qualification` | lead-qualification | [Client type](/domain/client-types.md), the five [fit rules](/domain/qualification-rules.md), fit level, [active markets](/domain/markets.md) |
| `review` | lead-review | Review queue and order, decisions, card data, pictures |
| `writing` | email-writing | [Base templates](/domain/base-templates.md), AI writer, output checks |
| `sending` | outreach-sending | Sequence planner, [send gate](/decisions/MOQ-1-send-gate.md), mailbox adapter (send), DM and by-hand tasks |
| `inbox` | outreach-sending | Mailbox reader: replies, auto-replies, bounces, matched to leads |
| `compliance` | outreach-compliance | Footer, unsubscribe tokens and page, [do-not-contact list](/domain/do-not-contact-list.md), retention sweep, erase and export |
| `tracking` | outreach-tracking | [Lead status](/domain/lead-status.md), history, results |
| `access` | user-access | Sign-in, sessions, web app manifest and icon |
| `platform` | (none) | Config and secrets, database and migrations, job queue, AI client, safe HTTP client, settings, audit log |

## Data flow

1. The owner starts a Google Maps search or pastes a link. A `search.run` job calls the source adapter; each business is matched to an existing lead or creates one (status "found").
2. A `lead.enrich` job per new lead: website reader, then Instagram profile, then (if chosen, row 9) the lookup service, then the AI profile; language and time zone are set.
3. A `lead.qualify` job: client type (AI), the five rules (code), fit level, market flag. Status "waiting for review".
4. The owner swipes. An approved lead with an email and a time zone gets its [outreach sequence](/domain/outreach-sequence.md) planned: one [outbound message](/data/outbound-message.md) per email step and a day-3 DM task. Day 1 is the day the intro actually goes out; later steps count from it. Without an email the lead gets a "contact by hand" task.
5. An `email.write` job writes the messages from the template and the facts (at approval or just before each step: row 15).
6. A `send.tick` job every five minutes reads the inbox first, then passes each due email through the send gate to the mailbox. Send now from the UI goes through the same gate.
7. An `inbox.poll` job every five minutes matches new messages to leads (thread headers first, then sender address and domain) and records replies, auto-replies and bounces; the sequence stops.
8. The unsubscribe page or the mail-app header adds the address to the do-not-contact list; the sequence stops.
9. A `retention.sweep` job runs daily. Results are computed from the recorded events.

## Entry points

Names are a starting point; each row fixes its own.
- **UI pages** (signed in): `/review` (home), `/leads` and `/leads/:id`, `/find`, `/to-do`, `/results`, `/templates`, `/settings`.
- **Public** (no sign-in): `GET /u/:token` shows the unsubscribe page with a confirm button (mail scanners open links, so a GET never opts out); `POST /u/:token` opts out, for the button and for one-click unsubscribe from mail apps. `GET /health` for the host.
- **JSON API** under `/api/*` (signed in), listed in the kickoff design.
- **Jobs** (PostgreSQL-backed queue): `search.run`, `lead.enrich`, `lead.qualify`, `email.write`, `send.tick` (every 5 minutes), `inbox.poll` (every 5 minutes and at the start of each `send.tick`), `retention.sweep` (daily).

## External services

Each one is a data processor to list for GDPR ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

| Service | Used for | Status | More |
|---|---|---|---|
| Small EU server (VPS) | Runs the container and PostgreSQL | Decided ([D1](/decisions/MOQ-1-cloud-web-service.md), [D3](/decisions/MOQ-1-postgresql-store-and-queue.md)); provider Hetzner Cloud (EU) chosen, not bought, connected in MOQ-29 | below |
| PostgreSQL, same server | All data and the job queue | Decided (D3) | [lead](/data/lead.md), [outbound message](/data/outbound-message.md) |
| Google Places API | Search, place details, photos | Recommended, not decided (open question 3, row 4) | [Google Maps](/integrations/google-maps.md) |
| Instagram Graph API, business discovery | Profile facts by handle | Recommended, not decided (open question 4, row 7) | [Instagram](/integrations/instagram.md) |
| Lead websites | Email, links, shop pages, language | Own polite reader ([source policy](/decisions/MOQ-1-lead-source-policy.md)); row 6 | - |
| Anthropic API, Claude Haiku 5.5 | Profile, classify, write | Decided ([D7](/decisions/MOQ-1-claude-for-ai.md)); confirmed in row 8 | [Anthropic Claude](/integrations/anthropic-claude.md) |
| Company mailbox | Send, sent copy, read replies and bounces | Decided ([D5](/decisions/MOQ-1-company-mailbox-sending.md)); protocol in row 16 | [Company mailbox](/integrations/company-mailbox.md) |
| Email lookup service, free tier (for example Hunter) | More addresses, address check | Optional (open question 5, row 9) | - |
| Sign-in | The owner's access | Google sign-in or a passkey, both free (row 3) | - |

## Deployment

| Environment | What runs |
|---|---|
| Local | The developer's machine: PostgreSQL in Docker Compose, a local mail catcher for sending and reading; sources, Instagram and AI replaced by recorded fixtures in tests; real APIs only with the developer's own keys. The production stack also runs here with `APP_DOMAIN=localhost` ([runbook](/runbooks/local-production-stack.md)) |
| CI | GitHub Actions: lint, type check, unit and integration tests against a PostgreSQL service container, next to the existing `dirox-checks` workflow; `image.yml` builds the image and runs the container tests (stack, backup, restore, rollback) |
| Production | The stack in `deploy/` (MOQ-3): the app container, PostgreSQL and the Caddy HTTPS proxy, the only service publishing ports ([Caddy](/decisions/MOQ-3-caddy-https-proxy.md)); settings and secrets in `/etc/1moq/`, outside the repo and the image ([settings](/decisions/MOQ-3-settings-and-secrets.md)); age-encrypted daily dumps kept 30 days ([backups](/decisions/MOQ-3-encrypted-backups-with-age.md)); dry-run forced on in the Compose file until go-live (row 25). The server, real domain, firewall, timer and off-server copy come with MOQ-29 |
| Staging | None (one user, low cost); the local production stack and CI stand in for it |

- **Release and rollback.** A release is an image tag; `deploy/deploy.sh` backs up, switches the tag and checks health, and `--previous` rolls back with the data untouched; migrations stay compatible with the previous release ([release by image tag](/decisions/MOQ-3-release-by-image-tag.md), [runbook](/runbooks/deploy-and-rollback.md)). The pause switch stops all sending at once; backups restore data ([runbook](/runbooks/backup-and-restore.md)).
- **Upkeep.** Automatic security updates and a restore on the real server in MOQ-29; the go-live procedure in row 25.
- **Budget.** At most €10 a month for everything the tool runs on, the company mailbox excluded: about €4 to 5 for the server, about €1 for backups, a few euros at most for AI, Google Maps calls likely inside Google's free monthly usage. Rows 2 and 8 confirm the figures before anything is bought.

## Decisions

- [The page is served by an always-on web service in the cloud](/decisions/MOQ-1-cloud-web-service.md)
- [TypeScript on Node.js with Fastify and React, one deployable](/decisions/MOQ-1-typescript-stack.md) (versions: [tech stack](/architecture/tech-stack.md))
- [PostgreSQL is the only data store and holds the job queue](/decisions/MOQ-1-postgresql-store-and-queue.md)
- [Every email is checked by the send gate at the moment it is sent](/decisions/MOQ-1-send-gate.md)
- [Send and read through the company mailbox, plain personal emails, no tracking](/decisions/MOQ-1-company-mailbox-sending.md)
- [Lead sources only through official or provider APIs, never the company's Instagram account](/decisions/MOQ-1-lead-source-policy.md)
- [Claude through the Anthropic API profiles, classifies and writes](/decisions/MOQ-1-claude-for-ai.md)
- [Personal data: EU hosting, minimal data, hashed do-not-contact list, retention](/decisions/MOQ-1-personal-data-handling.md)
- Deployment (MOQ-3): [settings and secrets](/decisions/MOQ-3-settings-and-secrets.md), [Caddy HTTPS proxy](/decisions/MOQ-3-caddy-https-proxy.md), [encrypted backups](/decisions/MOQ-3-encrypted-backups-with-age.md), [release by image tag](/decisions/MOQ-3-release-by-image-tag.md)

The choices left to tickets (hosting provider, libraries, sign-in method, data sources, mailbox protocol, limits, retention periods) are listed in the kickoff design, "Decided later, in their rows". Each ticket records its own.
