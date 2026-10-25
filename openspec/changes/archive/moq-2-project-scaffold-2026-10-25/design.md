# Design

## Context

The repository holds only specs, knowledge and the Dirox CI (`.github/workflows/dirox-checks.yml`, `.github/scripts/`). This change builds the first code. It follows:
- `okf/decisions/MOQ-1-typescript-stack.md`: TypeScript on Node.js LTS, Fastify serving the API and the built React UI (Vite), web server and job worker in one process that can later be split in two without code changes. Confirmed by the maintainer (kickoff open question 14).
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md`: PostgreSQL is the only store and holds the job queue; no Redis, no in-process timers.
- `okf/architecture/overview.md`: one module per capability, `platform` holds config and secrets, database and migrations, job queue; `GET /health` is a public entry point; local run is PostgreSQL in Docker Compose plus a mail catcher; CI is GitHub Actions next to `dirox-checks`.
- `okf/architecture/tech-stack.md`: lists what row 1 settles (package manager, ORM and migrations, queue library, test runner, lint and format, folder layout, version pins, time-zone library) and the banned libraries.
- `okf/decisions/MOQ-1-cloud-web-service.md`: hosting, container image and HTTPS belong to MOQ-3; not built here.

## Goals / Non-Goals

**Goals:**
- One command installs, one starts: web server plus job worker in one Node.js process, UI shell at `/`, `GET /health`.
- Drizzle migrations at start, pg-boss queue in the same database, settings checked at start.
- Lint, type check, unit and integration tests runnable locally and in a new CI workflow.
- Every library choice and version pin written down once, here, then moved to `okf/architecture/tech-stack.md` at close-change.

**Non-Goals:**
- Container image, Dockerfile, hosting, dry-run mode (MOQ-3); sign-in (MOQ-4).
- External service interfaces and fakes (their own tickets).
- Any domain table or feature behaviour; any time-zone logic (Luxon is only installed).
- Browser end-to-end tests: no tool for them is in the agreed set.

## Decisions

### D1. Libraries and versions (Decision record needed)

Install exactly these, pinned to exact versions (`save-exact`); the versions below are the current ones on 2026-10-25, and the implementer records in `package.json` what it actually installs.

| Concern | Library | Version to install | Why |
|---|---|---|---|
| Runtime | Node.js 24 LTS | 24.x (local: 24.21.0); `.nvmrc` `24`, `engines.node` `>=24.11` | Current LTS; runs TypeScript directly by type stripping, so the server needs no build step |
| Package manager | pnpm | 12.15.0 (`packageManager` field) | Fast, strict about undeclared dependencies, one lockfile; supported by `pnpm/action-setup` in CI |
| Language | TypeScript | 7.0.2 (type check only) | Required by the stack decision; used only for `tsc --noEmit`, Node runs the files |
| API and static files | Fastify | 5.12.7, with `@fastify/static` 10.1.7 | Stack decision; small, fast, typed; `@fastify/static` serves the built UI |
| UI | React, React DOM | 19.3.1 | Stack decision |
| UI build | Vite, `@vitejs/plugin-react` | 8.3.5, 6.1.2 | Stack decision; builds the UI to static files Fastify serves |
| ORM and migrations | Drizzle ORM, drizzle-kit, `pg` driver | 0.45.4, 0.31.11, 8.23.1 | Typed SQL close to plain PostgreSQL, SQL migration files kept in the repo and readable in review, a migrator callable at start; no code generation step or engine binary |
| Job queue | pg-boss | 12.38.0 | Queue on PostgreSQL as the queue decision requires: jobs are rows, survive restarts, retries and schedules (cron for `send.tick`, `inbox.poll`, `retention.sweep` later) built in; no Redis |
| Tests | Vitest | 5.0.5 | Same config and transform as Vite, native TypeScript, separate unit and integration projects |
| Lint | ESLint, `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-config-prettier` | 10.13.0, 8.72.0, current at install | Standard TypeScript and React rules; `eslint-config-prettier` leaves formatting to Prettier |
| Format | Prettier | 3.9.10 | One formatting, checked in CI with `prettier --check` |
| IANA time zones | Luxon, `@types/luxon` | 3.7.2, 3.7.6 | Converts between IANA zones with daylight-saving rules from the runtime's ICU data, immutable values; used from MOQ-7 and MOQ-19 |
| Types | `@types/node`, `@types/react`, `@types/react-dom`, `@types/pg` | current at install | Type check |
| Local services | PostgreSQL image `postgres:18`, Mailpit image `axllent/mailpit` (current v1 tag, pinned) | 18 | Same major as production should use (MOQ-3 confirms it); Mailpit catches SMTP locally for MOQ-17 and later |

If `typescript-eslint` at install time does not support TypeScript 7 for typed linting, pin the latest TypeScript 6.x instead and say so in the PR. No other library is added by this change; `okf/architecture/tech-stack.md` "Allowed libraries" gets the list at close-change.

### D2. Folder layout (Decision record needed)

One package, not a monorepo: the UI and the server share one `package.json`, one lockfile, one CI job.

```
src/
  main.ts                 entry: read settings, migrate, start queue and worker, start web server, stop cleanly
  platform/
    config.ts             settings from the environment, checked at start
    db/client.ts          pg pool and Drizzle instance
    db/schema.ts          Drizzle tables (re-exports each module's tables later)
    db/migrate.ts         runs drizzle/ migrations
    queue.ts              pg-boss start/stop, job registration
    http/app.ts           buildApp(): Fastify instance, health route, static UI
    http/health.ts        GET /health
  <module>/               sourcing, enrichment, qualification, review, writing, sending,
                          inbox, compliance, tracking, access: created by the ticket that
                          first needs it, not now
web/                      Vite root: index.html, src/main.tsx, src/App.tsx (UI shell)
drizzle/                  generated SQL migrations and drizzle-kit metadata
tests/                    shared test helpers (fresh database per test file) and fixtures
dist/web/                 built UI (git-ignored)
```

- Tests sit next to the code: `*.test.ts` are unit tests, `*.int.test.ts` integration tests (need PostgreSQL). Repo-level tests (check commands, CI workflow) go in `tests/`.
- Files and folders in kebab-case; a module imports another module only through its `index.ts` (not enforced by lint: no decision asks for it).
- Empty module folders are not created: they would be empty files to keep in step, and each ticket names its folder anyway.

### D3. Running TypeScript

The server runs `.ts` files directly with Node 24's type stripping (`node --env-file-if-exists=.env src/main.ts`), with `erasableSyntaxOnly`, `verbatimModuleSyntax` and `allowImportingTsExtensions` in `tsconfig.json`, and `.ts` extensions in imports. No server build, no `tsx`. The UI is built by Vite to `dist/web/`. One `tsconfig.json` for `src/` and `tests/`, one for `web/` (DOM types, JSX).

### D4. Start-up order and shutdown

`main.ts` calls `start(config)`, which tests also call (port 0):
1. Read settings (`platform/config.ts`). Required: `DATABASE_URL`. Optional: `PORT` (default 3000), `HOST` (default `127.0.0.1` locally, set to `0.0.0.0` by MOQ-3), `WEB_DIR` (default `dist/web`). Missing required setting: print `Missing required setting: DATABASE_URL` to stderr and exit with code 1, before any connection. Values are never printed.
2. Run Drizzle migrations (`migrate()` from `drizzle-orm/node-postgres/migrator`, folder `drizzle/`). Drizzle records applied migrations in `drizzle.__drizzle_migrations`, so a second start applies nothing.
3. Start pg-boss on the same `DATABASE_URL` (it creates and upgrades its own `pgboss` schema), then register the workers.
4. Build the Fastify app and listen.
Shutdown on SIGINT and SIGTERM: stop listening, `boss.stop({ graceful: true })`, end the pool.

Migrations run in-process because there is one instance; if the service is ever split or scaled, migrations move to a separate step (MOQ-3 may decide).

The first migration creates one table, `app_setting` (`key` text primary key, `value` jsonb, `updated_at` timestamptz), the store for the owner's settings that `platform` owns per the overview. It gives the migration scenarios something real to apply; later tickets add their tables in their own migrations.

### D5. Job queue wiring

`platform/queue.ts` wraps pg-boss: `startQueue(databaseUrl)`, `registerJob(name, handler)` (creates the queue and calls `boss.work`), `enqueue(name, data)`, `stopQueue()`. Modules register their jobs from their own folder later; the scaffold registers none in production code. The restart test enqueues with one pg-boss instance that has no worker, stops it, starts a fresh service instance with a worker for that job, and expects it to run.

### D6. Health check

`GET /health` runs `select 1` on the pool with a 2-second timeout. Reachable: 200 `{"status":"ok"}`. Error or timeout: 503 `{"status":"unavailable"}`, the error logged, never returned. No sign-in exists yet; MOQ-4 must keep this route public (`openspec/specs/user-access/spec.md`, "Sign-in required"). The down test builds the app with a pool pointing at a closed port.

### D7. UI shell

`web/index.html` with `<div id="root">`, `web/src/main.tsx` mounting `App`, which shows the tool's name and nothing else. Fastify serves `dist/web/` with `@fastify/static` at `/`. Local development: `pnpm dev` builds the UI once, then runs the server with `node --watch`; `pnpm dev:web` runs Vite's dev server on 5173 with a proxy to 3000 for hot reload while working on the UI.

### D8. Commands (pnpm scripts)

| Script | Does |
|---|---|
| `pnpm install` | Install |
| `pnpm db:up` | `docker compose up -d` (PostgreSQL on 5432, Mailpit SMTP 1025 and UI 8025) |
| `pnpm dev` | Build the UI, start the service with `.env` (copy of `.env.example`) |
| `pnpm start` | Start the service without watching (expects a built UI) |
| `pnpm build` | `vite build` |
| `pnpm lint` | `eslint .` then `prettier --check .` |
| `pnpm format` | `prettier --write .` |
| `pnpm typecheck` | `tsc --noEmit` on both tsconfigs |
| `pnpm test` | Vitest, unit and integration projects; integration needs `TEST_DATABASE_URL` and fails with a clear message without it (never skips) |
| `pnpm test:unit` | Unit project only |
| `pnpm db:generate` | `drizzle-kit generate` |

Integration tests use `TEST_DATABASE_URL` as an admin connection to create a fresh, randomly named database per test file and drop it after, so "empty database" is real and files can run in parallel. A Vitest global setup builds the UI once into a temp folder for the UI-shell test.

### D9. CI workflow

New `.github/workflows/ci.yml` (`name: CI`), on `pull_request` and `push` to `main`, `permissions: contents: read`. One job `checks` on `ubuntu-latest` with a `postgres:18` service (health-checked, port 5432), steps: checkout, `pnpm/action-setup`, `actions/setup-node` with Node 24 and pnpm cache, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` with `TEST_DATABASE_URL`. No `continue-on-error`, so any failed step fails the run. `dirox-checks.yml` is not touched.

## Risks / Trade-offs

- New majors (TypeScript 7, Vite 8, Vitest 5, ESLint 10, pg-boss 12): plugin support may lag. Mitigation: the TypeScript fallback in D1; any other substitution is named in the PR.
- Type stripping forbids enums, namespaces and parameter properties: a small style limit, enforced by `erasableSyntaxOnly`.
- Migrations at start would race with two instances: there is one instance (D4).
- pg-boss owns its schema and upgrades it on start: an upgrade of pg-boss is a migration; pin it exactly and read its release notes before bumping.
- No browser test proves React renders: the UI-shell test checks the served HTML and bundle; a manual check in the browser completes it.
- The CI scenarios are proven by a test reading the workflow file plus the PR's own run; the test cannot run GitHub itself.
