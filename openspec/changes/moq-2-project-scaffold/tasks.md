# Tasks

## 1. Project and tooling

- [x] 1.1 `package.json` (pnpm `packageManager`, `engines.node`, `type: module`, exact versions per design D1), `.nvmrc`, `.npmrc` (`save-exact=true`), `pnpm install`; add `node_modules/`, `dist/`, `.env` to `.gitignore`
- [x] 1.2 `tsconfig.json` (server and tests: type stripping options, design D3) and `web/tsconfig.json` (DOM, JSX); `pnpm typecheck`
- [x] 1.3 ESLint flat config (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`), Prettier config and ignore; `pnpm lint`, `pnpm format`
- [x] 1.4 Vitest config with `unit` and `integration` projects (design D8); `pnpm test`, `pnpm test:unit`; integration project fails with a clear message when `TEST_DATABASE_URL` is missing
- [x] 1.5 `docker-compose.yml` (PostgreSQL 18, Mailpit), `.env.example` (`DATABASE_URL`, `TEST_DATABASE_URL`, `PORT`), `pnpm db:up`

## 2. Platform

- [x] 2.1 `src/platform/config.ts`: read and check settings, named error for a missing required one, values never printed
- [x] 2.2 `src/platform/db/`: pool and Drizzle client, `app_setting` table in `schema.ts`, `drizzle.config.ts`, first migration generated in `drizzle/`, `migrate.ts`
- [x] 2.3 `src/platform/queue.ts`: pg-boss start/stop, `registerJob`, `enqueue` (design D5)
- [x] 2.4 `src/platform/http/`: `buildApp()` with `GET /health` (design D6) and static UI from `WEB_DIR`
- [x] 2.5 `src/main.ts`: `start(config)` in the order of design D4, clean shutdown on SIGINT and SIGTERM; `pnpm start`, `pnpm dev`
- [x] 2.6 `tests/helpers/test-db.ts`: fresh database per test file from `TEST_DATABASE_URL`, dropped after

## 3. UI shell

- [x] 3.1 `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx` (the tool's name only), `vite.config.ts` building to `dist/web/` with a dev proxy to 3000; `pnpm build`, `pnpm dev:web`
- [x] 3.2 Vitest global setup building the UI once for integration tests
- [x] 3.3 Manual check: `pnpm db:up`, `pnpm dev`, open `http://localhost:3000` and see the shell

## 4. CI and docs

- [x] 4.1 `.github/workflows/ci.yml` per design D9; `dirox-checks.yml` unchanged
- [x] 4.2 Fill the Commands section of `.claude/CLAUDE.md` (install, run locally, test, lint and format) from design D8
- [x] 4.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` locally; all pass

## 5. Proof

- [x] 5.1 Test `Local start serves the UI shell` in `src/main.int.test.ts` (one `start()` call runs the server and the worker; `GET /` returns the shell HTML with the `root` element and its script)
- [x] 5.2 Test `Health with the database up` in `src/platform/http/health.int.test.ts`
- [x] 5.3 Test `Health with the database down` in `src/platform/http/health.int.test.ts`
- [x] 5.4 Test `Migrations on an empty database` in `src/platform/db/migrate.int.test.ts`
- [x] 5.5 Test `Migrations on a second start` in `src/platform/db/migrate.int.test.ts`
- [x] 5.6 Test `Queued job runs in the same process` in `src/platform/queue.int.test.ts`
- [x] 5.7 Test `Queued job survives a restart` in `src/platform/queue.int.test.ts`
- [x] 5.8 Test `Missing required setting` in `src/platform/config.test.ts` (and the process exits with code 1 naming `DATABASE_URL` in `src/main.int.test.ts`)
- [x] 5.9 Test `Check commands fail on a problem` in `tests/check-commands.int.test.ts` (runs lint, type check and Vitest on fixtures with a known problem; expects a non-zero exit and the fixture's path in the output)
- [x] 5.10 Test `Integration tests use a real PostgreSQL` in `tests/check-commands.int.test.ts` (the integration project's database answers `select version()` as PostgreSQL)
- [ ] 5.11 Test `CI runs the checks on a pull request` in `tests/ci-workflow.test.ts` (reads `.github/workflows/ci.yml`: `pull_request` trigger, PostgreSQL service, lint, typecheck and test steps), plus the PR's own CI run
- [x] 5.12 Test `CI fails when a check fails` in `tests/ci-workflow.test.ts` (no `continue-on-error` in the workflow)
