---
type: Decision
title: Libraries and pinned versions for the scaffold
description: pnpm, Drizzle, pg-boss, Vitest, ESLint, Prettier and Luxon on Node 24 with exact version pins, TypeScript held at 6.0.3 until typescript-eslint supports 7; versions change only through a ticket
owner: ledvincent
status: stable
tags: [architecture, stack, libraries]
---
# Libraries and pinned versions for the scaffold

Date: 2026-10-25 · Jira: MOQ-2 · Change: `openspec/changes/archive/moq-2-project-scaffold-2026-10-25/`

## Context

[TypeScript on Node.js with Fastify and React](/decisions/MOQ-1-typescript-stack.md) and [PostgreSQL as the only store and queue](/decisions/MOQ-1-postgresql-store-and-queue.md) left the package manager, ORM, queue library, test runner, lint and format tools, time-zone library and version pins to the scaffold.

## Decision

Exact pins (`save-exact`) in `package.json`; the table is in [Tech stack](/architecture/tech-stack.md). Choices:

- **pnpm** (strict about undeclared dependencies, one lockfile) on **Node.js 24 LTS**, which runs `.ts` files by type stripping: no server build, TypeScript is used for `tsc --noEmit` only.
- **Drizzle ORM and drizzle-kit** with SQL migration files in `drizzle/`, applied in-process at start.
- **pg-boss** for the job queue on the same PostgreSQL.
- **Vitest** with separate unit and integration projects; **ESLint** with typescript-eslint and **Prettier**.
- **Luxon** for IANA time zones.
- **TypeScript 6.0.3, not 7.0.2**: typescript-eslint 8.72.0 needs TypeScript below 6.1.0. Move to 7 when typescript-eslint supports it.

## Alternatives considered

- **Prisma**: a generated client and an engine binary; Drizzle keeps SQL close to plain PostgreSQL and the migrations readable in review.
- **graphile-worker or a hand-written queue**: pg-boss has retries, schedules and cron built in, which `send.tick`, `inbox.poll` and `retention.sweep` need later.
- **npm or yarn**: pnpm is stricter and faster in CI.
- **Day.js or date-fns-tz** for time zones: Luxon takes daylight-saving rules from the runtime's ICU data and has immutable values.

## Consequences

- A library or a version changes only through a ticket, listed in [Tech stack](/architecture/tech-stack.md).
- No enums, namespaces or parameter properties in server code (`erasableSyntaxOnly`).
- pg-boss owns its `pgboss` schema and upgrades it on start: read its release notes before bumping it.
- Migrations run at start because there is one instance; if the service is ever scaled out, they move to a separate step.
