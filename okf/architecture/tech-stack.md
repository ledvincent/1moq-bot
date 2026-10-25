---
type: Architecture
title: Tech stack
description: TypeScript on Node.js LTS, Fastify API and a React UI built with Vite in one container, PostgreSQL as the only store and job queue; exact versions and libraries are pinned by backlog row 1
owner: ledvincent
status: draft
tags: [architecture, stack, kickoff]
---
# Tech stack

Chosen in [TypeScript on Node.js with Fastify and React](/decisions/MOQ-1-typescript-stack.md) and [PostgreSQL as the only store and queue](/decisions/MOQ-1-postgresql-store-and-queue.md). Stays `draft` until row 1 (project scaffold) pins the versions and picks the libraries. Changing a line here is a decision: it needs a file in `/decisions/`.

Open question 14 (does the developer who will maintain the tool confirm TypeScript?) has no answer yet. If another stack is named, a new decision supersedes the TypeScript one and this page changes with it.

## Frameworks and versions

| Layer | Choice | Version |
|---|---|---|
| Language | TypeScript, everywhere (UI, API, jobs) | TODO: row 1 |
| Runtime | Node.js, current LTS | TODO: row 1 |
| API and static files | Fastify, serving the JSON API and the built UI | TODO: row 1 |
| UI | React single-page app, built with Vite | TODO: row 1 |
| Database | PostgreSQL, on the same server as the service (not managed) | TODO: row 1 or 2 |
| Job queue | A PostgreSQL-backed queue library | TODO: library and version in row 1 |
| AI | Anthropic's official TypeScript SDK; model Claude Haiku 5.5 (`claude-haiku-5-5`) | SDK version in row 1 or 8; model confirmed in row 8 |
| Packaging | One container image running the web server and the job worker in one process (can be split into two processes later without code changes) | - |
| Local | PostgreSQL in Docker Compose, a local mail catcher | TODO: row 1 |
| CI | GitHub Actions: lint, type check, unit and integration tests against a PostgreSQL service container | TODO: row 1 |

Left to row 1: package manager, ORM and migrations, job queue library, test runner, lint and format tools, folder layout, version pins, and the library that converts IANA time zones.

## Allowed libraries

- Anthropic official TypeScript SDK: every AI call, behind the internal AI interface (profile, classify, write). See [Anthropic Claude](/integrations/anthropic-claude.md).
- Others: added by the ticket that needs them, and listed here by that ticket.

## Banned libraries

- Headless browsers or scrapers aimed at Google Maps or Instagram pages, and unofficial Instagram API clients: [source policy](/decisions/MOQ-1-lead-source-policy.md). Use the official APIs.
- Anything that signs in to or automates the company's Instagram account: same decision.
- A second data store or a Redis-based queue: [PostgreSQL only](/decisions/MOQ-1-postgresql-store-and-queue.md). Use the PostgreSQL-backed queue.
- Transactional or newsletter email services for outreach, and open or click tracking: [company mailbox](/decisions/MOQ-1-company-mailbox-sending.md). Send through the company mailbox.
