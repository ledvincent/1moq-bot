---
type: Architecture
title: Tech stack
description: TypeScript on Node.js 24 LTS, Fastify API and a React UI built with Vite in one container, PostgreSQL as the only store and job queue, with the libraries and exact versions pinned by the project scaffold
owner: ledvincent
status: stable
tags: [architecture, stack]
---
# Tech stack

Chosen in [TypeScript on Node.js with Fastify and React](/decisions/MOQ-1-typescript-stack.md) and [PostgreSQL as the only store and queue](/decisions/MOQ-1-postgresql-store-and-queue.md); libraries and versions pinned in [Libraries and pinned versions](/decisions/MOQ-2-libraries-and-versions.md) (MOQ-2). The maintainer confirmed TypeScript. Changing a line here is a decision: it needs a file in `/decisions/`.

## Frameworks and versions

Exact pins as in `package.json`.

| Layer | Choice | Version |
|---|---|---|
| Language | TypeScript, everywhere (UI, API, jobs); type check only, Node runs the files | 6.0.3 (7 waits for typescript-eslint support) |
| Runtime | Node.js 24 LTS, running `.ts` by type stripping | 24.x (`engines` `>=24.11`) |
| Package manager | pnpm | 12.15.0 |
| API and static files | Fastify, with `@fastify/static` serving the built UI | 5.12.7, 10.1.7 |
| UI | React, React DOM, built with Vite and `@vitejs/plugin-react` | 19.3.1, Vite 8.3.5, 6.1.2 |
| Database | PostgreSQL, on the same server as the service (not managed) | 18 (`postgres:18` locally and in CI; `postgres:18.6` in the production stack) |
| ORM and migrations | Drizzle ORM, drizzle-kit, `pg` driver; SQL migrations in `drizzle/`, applied at start | 0.45.4, 0.31.11, 8.23.1 |
| Job queue | pg-boss, on the same PostgreSQL | 12.38.0 |
| Tests | Vitest, unit and integration projects (integration needs `TEST_DATABASE_URL`) | 5.0.5 |
| Lint and format | ESLint, typescript-eslint, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-config-prettier`; Prettier | 10.13.0, 8.72.0, 10.0.1, 7.1.1, 10.1.8; 3.9.10 |
| IANA time zones | Luxon, `@types/luxon` | 3.7.2, 3.7.6 |
| Types | `@types/node` (matches Node 24), `@types/react`, `@types/react-dom`, `@types/pg` | 24.19.2, 19.3.0, 19.3.0, 8.23.1 |
| AI | Anthropic's official TypeScript SDK; model Claude Haiku 5.5 (`claude-haiku-5-5`) | SDK version in row 8 |
| Packaging | One container image (`deploy/Dockerfile`) running the web server and the job worker in one process, migrations at start (can be split into two processes later without code changes) | base `node:24.21-bookworm-slim` |
| Production stack | `deploy/compose.yml`: the app, PostgreSQL and the Caddy HTTPS proxy ([Caddy](/decisions/MOQ-3-caddy-https-proxy.md)) | `postgres:18.6`, `caddy:2.11` |
| Backup encryption | `age` (X25519 key pair) around `pg_dump` ([encrypted backups](/decisions/MOQ-3-encrypted-backups-with-age.md)) | any current `age` on the machine that runs the scripts |
| Local | PostgreSQL and Mailpit (`axllent/mailpit`) in Docker Compose for development; the production stack with `APP_DOMAIN=localhost` ([runbook](/runbooks/local-production-stack.md)) | `postgres:18`, `v1.32.0` |
| CI | GitHub Actions `ci.yml` next to `dirox-checks`: lint, type check, unit and integration tests against a `postgres:18` service container; `image.yml`: image build, shellcheck and container tests | actions at `v4` |

Folder layout: [One package, one folder per module under src](/decisions/MOQ-2-folder-layout.md). Commands are in `.claude/CLAUDE.md`.

## Allowed libraries

- Everything in the table above.
- Anthropic official TypeScript SDK: every AI call, behind the internal AI interface (profile, classify, write). See [Anthropic Claude](/integrations/anthropic-claude.md).
- Others: added by the ticket that needs them, and listed here by that ticket.

## Banned libraries

- Headless browsers or scrapers aimed at Google Maps or Instagram pages, and unofficial Instagram API clients: [source policy](/decisions/MOQ-1-lead-source-policy.md). Use the official APIs.
- Anything that signs in to or automates the company's Instagram account: same decision.
- A second data store or a Redis-based queue: [PostgreSQL only](/decisions/MOQ-1-postgresql-store-and-queue.md). Use pg-boss.
- Transactional or newsletter email services for outreach, and open or click tracking: [company mailbox](/decisions/MOQ-1-company-mailbox-sending.md). Send through the company mailbox.
