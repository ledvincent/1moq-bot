Verified: 2026-10-25 at 5109869

Tests: `pnpm test` - 18/18 passed (7 files; integration project ran against a real PostgreSQL).
OpenSpec: `openspec validate moq-2-project-scaffold --strict` - valid.

| Requirement | Scenario | Proven by | OK? |
|---|---|---|---|
| One process serves the UI and runs the jobs | Local start serves the UI shell | src/main.int.test.ts | Yes (React render in a browser: manual task 3.3) |
| Health check | Health with the database up | src/platform/http/health.int.test.ts | Yes |
| Health check | Health with the database down | src/platform/http/health.int.test.ts | Yes |
| Migrations at start | Migrations on an empty database | src/platform/db/migrate.int.test.ts | Yes |
| Migrations at start | Migrations on a second start | src/platform/db/migrate.int.test.ts | Yes |
| Durable job queue | Queued job runs in the same process | src/platform/queue.int.test.ts | Yes |
| Durable job queue | Queued job survives a restart | src/platform/queue.int.test.ts | Yes |
| Required settings checked at start | Missing required setting | src/platform/config.test.ts, src/main.int.test.ts | Yes |
| Check commands | Check commands fail on a problem | tests/check-commands.int.test.ts (3 tests; calls the tools directly, not the pnpm scripts) | Yes |
| Check commands | Integration tests use a real PostgreSQL | tests/check-commands.int.test.ts | Yes |
| Checks on every pull request | CI runs the checks on a pull request | tests/ci-workflow.test.ts | Partial: the PR's own CI run is still needed (task 5.11, unticked) |
| Checks on every pull request | CI fails when a check fails | tests/ci-workflow.test.ts | Yes |

Scope: extra files not in the Impact list, all tooling: pnpm-workspace.yaml, .prettierignore, .prettierrc.json, tests/fixtures/*, model-use.md. Planned but not done: none (okf updates deferred to close-change).

Blocking findings: none

Non-blocking findings:
- TypeScript is pinned to 6.0.3, not 7.0.2 (design D1 fallback): the PR description must say so, and close-change must record 6.0.3 in okf/architecture/tech-stack.md.
- @eslint/js 10.0.1, eslint-config-prettier 10.1.8, eslint-plugin-react-hooks 7.1.1 and the @types/* packages are pinned at install-time versions (allowed by D1); Mailpit pinned to v1.32.0.
- Update local main or rebase before opening the PR so the diff shows only MOQ-2 (local main lacks the MOQ-1 commits).
- The Vite dev server proxies only /api and /health to port 3000.
- .env.example was not read (.env read rule), so task 1.5's content was not checked.
