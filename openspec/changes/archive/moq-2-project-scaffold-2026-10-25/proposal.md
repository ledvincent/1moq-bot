Jira: MOQ-2
Size: normal
Difficulty: tricky
Tier: standard

# MOQ-2: Project scaffold

## Why

There is no code yet. Every feature ticket (MOQ-3 cloud deployment, MOQ-5 Google Maps sourcing, MOQ-17 company mailbox and the rest of the kickoff backlog) needs a running service to build on: a web server that serves the UI, a database with migrations, a PostgreSQL-backed job queue with its worker, settings read at start, and checks that run on every PR. This is row 1 of the MOQ-1 kickoff backlog, and it settles the choices the tech stack left to it.

Open question 14 of the kickoff (does the maintainer confirm TypeScript?) is answered: the maintainer confirmed TypeScript, so `okf/decisions/MOQ-1-typescript-stack.md` stands and no superseding decision is needed.

## What Changes

- A TypeScript project on Node.js 24 LTS managed with pnpm: one process runs the Fastify web server and the pg-boss job worker; Fastify serves the built React UI shell (Vite) at `/`.
- `GET /health`, open without sign-in: 200 while the database answers, 503 when it does not.
- PostgreSQL access through Drizzle ORM; drizzle-kit migrations applied at start, each only once.
- A job queue in the same PostgreSQL (pg-boss), whose jobs survive a restart.
- Settings read from the environment at start; a missing required setting stops the start with a message naming it.
- Lint (ESLint, Prettier), type check and tests (Vitest, unit and integration against a real PostgreSQL), as pnpm scripts.
- Local run: PostgreSQL and a mail catcher (Mailpit, no behaviour attached yet) in Docker Compose.
- A new GitHub Actions workflow running lint, type check, unit and integration tests (PostgreSQL service container) on every PR, next to the unchanged `dirox-checks` workflow.
- Library choices and version pins, including Luxon for IANA time zones (no time-zone behaviour yet), recorded in `design.md`.
- The Commands section of `.claude/CLAUDE.md` filled in.

## Capabilities

### New Capabilities
- `platform`: the running service itself: start-up, settings, migrations, job queue and worker, health check, UI shell, and the developer's check commands and CI. Matches the `platform` module in `okf/architecture/overview.md`.

### Modified Capabilities
None. The health check is already exempt from sign-in in `openspec/specs/user-access/spec.md` ("Sign-in required"); this change keeps that exemption and adds no sign-in.

## Out of scope

- Sign-in: MOQ-4 (row 3). Until it lands, the local UI shell has no sign-in.
- Dry-run mode, hosting, the container image, the Dockerfile, backups, HTTPS: MOQ-3 (row 2). The scaffold stays local for now (`okf/decisions/MOQ-1-cloud-web-service.md` is built there).
- Any external service (Google Maps, Instagram, the AI, the mailbox) and its fake: each integration ticket brings its own interface and fake.
- Time-zone behaviour: Luxon is chosen and pinned here; windows and sending days come with MOQ-7 and MOQ-19.
- Empty folders for the feature modules: each ticket creates its module folder (layout in `design.md`).
- Updating `okf/architecture/tech-stack.md` and `okf/architecture/overview.md` with the pins and layout: done at `/dirox-kit:close-change`.

## Impact

- New: `package.json`, `pnpm-lock.yaml`, TypeScript, ESLint, Prettier, Vite, Vitest and drizzle-kit config, `src/` (entry point and `platform` module), `web/` (UI shell), `drizzle/` (migrations), `docker-compose.yml`, `.env.example`, `.nvmrc`, `.github/workflows/ci.yml`.
- Edited: `.claude/CLAUDE.md` (Commands section), `.gitignore` (build output, `node_modules`).
- Unchanged: `.github/workflows/dirox-checks.yml`, `.github/scripts/`.
- Knowledge: `okf/architecture/overview.md`, `okf/architecture/tech-stack.md`, `okf/decisions/MOQ-1-typescript-stack.md`, `okf/decisions/MOQ-1-postgresql-store-and-queue.md`.

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source | Scenario |
|---|---|---|---|
| 1 | WHEN the developer runs the install and run-locally commands (PostgreSQL in Docker Compose) THEN one process starts the web server and the job worker, and the browser shows the React UI shell at `/` | Jira description; decision MOQ-1-typescript-stack | Local start serves the UI shell |
| 2 | WHEN `GET /health` is called without signing in THEN it answers 200 while the database is reachable | design entry points; spec user-access "sign-in except ... the health check" | Health with the database up |
| 3 | WHEN the database is unreachable THEN `GET /health` answers 503 | checklist: errors; confirmed by the person | Health with the database down |
| 4 | WHEN the service starts on an empty database THEN migrations bring the schema up to date; WHEN it starts again THEN nothing is re-applied | platform module "database and migrations"; checklist: run twice | Migrations on an empty database; Migrations on a second start |
| 5 | WHEN a job is queued THEN the worker in the same process runs it; WHEN the service restarts before the job runs THEN it still runs after the restart | decision MOQ-1-postgresql-store-and-queue | Queued job runs in the same process; Queued job survives a restart |
| 6 | WHEN a required setting (such as the database URL) is missing THEN the service refuses to start, with a message naming the setting | platform "config and secrets"; checklist: errors | Missing required setting |
| 7 | WHEN the lint, type-check or test command finds a problem THEN it exits non-zero and names the file; the test command includes integration tests against a real PostgreSQL | Jira "tests"; design CI row | Check commands fail on a problem; Integration tests use a real PostgreSQL |
| 8 | WHEN a PR is opened THEN GitHub Actions runs lint, type check, unit and integration tests (PostgreSQL service container) next to `dirox-checks`, and any failure fails the run | design CI row | CI runs the checks on a pull request; CI fails when a check fails |

### Considered, not needed

- Sign-in: MOQ-4 (row 3). Dry-run mode: MOQ-3 (row 2).
- Container image and Dockerfile: the scaffold stays local for now, for testing; MOQ-3 (cloud deployment) adds the image.
- External services: none yet, so no fakes now; each later integration ticket brings its interface and fake.
- Time-zone library: chosen and pinned here (Luxon), with no behaviour until MOQ-7 and MOQ-19.
- The Commands section of `.claude/CLAUDE.md` and the pins in `okf/architecture/tech-stack.md`: tasks, not criteria. The Commands section is edited in this change because the ticket asks for it; the okf updates are made at close-change.
- Unknown routes and module-boundary lint rules: no spec or decision asks for them.

### Open questions

None.

## Jira acceptance criteria

Read from MOQ-2 on 2026-10-25 19:44
WHEN the developer runs the install and run-locally commands (PostgreSQL in Docker Compose) THEN one process starts the web server and the job worker, and the browser shows the React UI shell at `/`
WHEN `GET /health` is called without signing in THEN it answers 200 while the database is reachable
WHEN the database is unreachable THEN `GET /health` answers 503
WHEN the service starts on an empty database THEN migrations bring the schema up to date; WHEN it starts again THEN nothing is re-applied
WHEN a job is queued THEN the worker in the same process runs it; WHEN the service restarts before the job runs THEN it still runs after the restart
WHEN a required setting (such as the database URL) is missing THEN the service refuses to start, with a message naming the setting
WHEN the lint, type-check or test command finds a problem THEN it exits non-zero and names the file; the test command includes integration tests against a real PostgreSQL
WHEN a PR is opened THEN GitHub Actions runs lint, type check, unit and integration tests (PostgreSQL service container) next to `dirox-checks`, and any failure fails the run
