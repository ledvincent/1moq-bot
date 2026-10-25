---
type: Decision
title: One package, one folder per module under src
description: One package (no monorepo) with the server in src/<module>/, the UI in web/, tests next to the code and shared platform code in src/platform; a module's folder is created by the first ticket that needs it
owner: ledvincent
status: stable
tags: [architecture, layout]
---
# One package, one folder per module under src

Date: 2026-10-25 · Jira: MOQ-2 · Change: `openspec/changes/archive/moq-2-project-scaffold-2026-10-25/`

## Context

The overview says one module per capability, so a ticket stays inside one folder, and left the layout to the scaffold.

## Decision

- One package: one `package.json`, one lockfile, one CI job for the server and the UI.
- `src/main.ts` is the entry; `src/platform/` holds settings (`config.ts`), the database (`db/`), the queue (`queue.ts`) and the HTTP app (`http/`). Each capability module (`sourcing`, `enrichment`, `qualification`, `review`, `writing`, `sending`, `inbox`, `compliance`, `tracking`, `access`) is `src/<module>/`, created by the first ticket that needs it; empty folders are not created.
- `web/` is the Vite root (the React UI), built to `dist/web/`, which Fastify serves. `drizzle/` holds the generated migrations. `tests/` holds shared helpers, fixtures and repo-level tests.
- Tests sit next to the code: `*.test.ts` are unit tests, `*.int.test.ts` need PostgreSQL. Files and folders are kebab-case.
- A module uses another only through its `index.ts`; lint does not enforce this yet.

## Alternatives considered

- **A monorepo with separate server and UI packages**: two lockfiles and two CI jobs for one developer and one deployable.
- **Creating every module folder now**: empty files to keep in step, and each ticket names its folder anyway.

## Consequences

- A new capability adds `src/<module>/` and its tables to `src/platform/db/schema.ts`'s re-exports; it does not touch another module.
- Splitting the web server and the worker into two processes stays possible: `main.ts` is the only place that starts both.
