# Tasks

Big change: start only after the proposal PR is merged. Everything here runs on the developer's machine and in CI. Nothing is bought, and no real server is used: that is MOQ-29.

## 1. Dry-run setting

- [x] 1.1 `src/platform/config.ts`: add `dryRun` read from `DRY_RUN` as in design D6 (unset or blank gives on, exactly `true` or `false`, otherwise a `SettingError` naming `DRY_RUN` without the value). Done when the unit tests in `src/platform/config.test.ts` pass with `pnpm test:unit`
- [x] 1.2 `src/main.ts`: log the dry-run line right after the settings load (design D6). Done when the integration tests in `src/main.int.test.ts` cover both lines, the invalid-value exit and no secret value in the output, and `pnpm test` passes

## 2. Container image

- [x] 2.1 `deploy/Dockerfile` (multi-stage, non-root, non-secret defaults only, design D2) and a root `.dockerignore`. Done when `docker build -f deploy/Dockerfile .` succeeds and `docker run` with a development `DATABASE_URL` serves `/health`
- [x] 2.2 `vitest.config.ts`: a `container` project for `tests/**/*.container.test.ts`, excluded from `unit` and `integration`, one file at a time; `package.json` script `test:container`. Done when `pnpm test` does not pick up container tests, and `pnpm test:container` without `IMAGE` fails with a clear message
- [x] 2.3 `tests/container/image.container.test.ts` as in design D10. Done when `pnpm test:container` passes locally against the built image
- [x] 2.4 `.github/workflows/image.yml` (design D9): on every PR and on `main`, build the image, install `age`, run `pnpm test:container`; no publishing and no `packages: write`. Done when the PR's own run is green, `ci.yml` is unchanged and `tests/ci-workflow.test.ts` still passes

## 3. Production stack

- [x] 3.1 `deploy/lib.sh` (design D1: `MOQ_ETC`, `MOQ_BACKUP_DIR`, `MOQ_STATE` with server defaults, and the one compose command). Done when `shellcheck` is clean
- [x] 3.2 `deploy/compose.yml` (design D3: `${APP_IMAGE}:${IMAGE_TAG}` with `pull_policy: missing`, `env_file` from `MOQ_ETC`, `DRY_RUN: "true"`, no ports on `postgres` or `app`, overridable Caddy ports, healthchecks, log rotation, pinned image minors), `deploy/Caddyfile` (design D4, site `{$APP_DOMAIN}`), and `deploy/app.env.example`, `backup.env.example` and `release.env.example` with placeholders only (`app.1moq.example`). Done when the compose command from `lib.sh` with the example files passes `config`
- [x] 3.3 `.gitignore`: add `.deploy-local/`, `deploy/*.env` and `!deploy/*.env.example` (design D5). Done when `git status` shows neither a test `.deploy-local/etc/app.env` nor a `deploy/app.env`
- [x] 3.4 `tests/deploy-config.test.ts` as in design D10. Done when `pnpm test:unit` passes
- [x] 3.5 The stack helper and `tests/container/stack.container.test.ts` as in design D10 (temporary settings folders, `APP_DOMAIN=localhost`, random ports, the redirect, HTTPS trusting Caddy's local root, ports on `caddy` only). Done when `pnpm test:container` passes locally

## 4. Backup and restore

- [x] 4.1 `deploy/backup/backup.sh` (design D7: `pg_dump` through `age` into a `.partial` file, rename, then remove dumps older than 30 days; `backup: ok` or `backup: FAILED at <step>`, non-zero exit, nothing unencrypted on disk). Done when `shellcheck` is clean and `tests/container/backup.container.test.ts` passes
- [x] 4.2 `deploy/backup/restore.sh <dump> <key>` and `deploy/backup/table-counts.sql` (design D8: start `postgres` alone, refuse a non-empty database, decrypt into `pg_restore`, start the stack, wait for health). Done when `shellcheck` is clean and `tests/container/restore.container.test.ts` passes

## 5. Release and rollback

- [x] 5.1 `deploy/deploy.sh <tag>|--previous` (design D9: backup first, write `IMAGE_TAG` into `release.env`, `up -d app`, wait for health, append to `releases.log`; `--previous` picks the last `ok` tag before the current one). Done when `shellcheck` is clean and `tests/container/release.container.test.ts` passes

## 6. Runbooks, docs and checks

- [x] 6.1 Draft the runbooks in this change folder. Done when each step names its command and the developer has followed `local-production-stack.md` once by hand on their machine:
  - `runbooks/local-production-stack.md`: install Docker, Git Bash and `age`; create `.deploy-local/` from the templates; build and tag the image; start and stop the stack; open `https://localhost`.
  - `runbooks/backup-and-restore.md`: run a backup; keep the private key outside the repository and the backup folder; restore into an empty stack; compare the table counts.
  - `runbooks/deploy-and-rollback.md`: deploy a tag, roll back, the migration rule.
- [x] 6.2 `.claude/CLAUDE.md`: change "Hosting provider: TODO (row 2)" to Hetzner Cloud (EU), not set up yet, connected by MOQ-29; add `pnpm test:container` and the local production stack commands (`deploy/deploy.sh`, `deploy/backup/backup.sh`, `deploy/backup/restore.sh`) to Commands, pointing to the runbook. Done when the file reads correctly
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:container` and `openspec validate moq-3-cloud-deployment --strict`. Done when all pass

## 7. Proof

Every scenario is proved by an automated test. The `*.container.test.ts` files run with `pnpm test:container` on the developer's machine and in CI (`image.yml`); the others run with `pnpm test` in `ci.yml`.

- [x] 7.1 Test `Container image serves the UI and health` in `tests/container/image.container.test.ts`
- [x] 7.2 Test `Container without a required secret refuses to start` in `tests/container/image.container.test.ts`
- [x] 7.3 Test `Dry-run on when unset` in `src/platform/config.test.ts` and `src/main.int.test.ts` (the second checks the start-up line)
- [x] 7.4 Test `Dry-run off when set off` in `src/platform/config.test.ts` and `src/main.int.test.ts`
- [x] 7.5 Test `Invalid dry-run value refuses to start` in `src/platform/config.test.ts` and `src/main.int.test.ts` (exit 1, names `DRY_RUN`, no value)
- [x] 7.6 Test `Production deploy keeps dry-run on` in `tests/deploy-config.test.ts`
- [x] 7.7 Test `Settings files stay outside the repository` in `tests/deploy-config.test.ts`
- [x] 7.8 Test `Image holds no secret values` in `tests/container/image.container.test.ts`
- [x] 7.9 Test `Start-up log holds no setting values` in `src/main.int.test.ts`
- [x] 7.10 Test `Public address comes from a setting` in `tests/deploy-config.test.ts`
- [x] 7.11 Test `Proxy redirects to HTTPS with a local certificate` in `tests/container/stack.container.test.ts`
- [x] 7.12 Test `Only the proxy publishes ports` in `tests/container/stack.container.test.ts` (running stack), together with the static check in `tests/deploy-config.test.ts`
- [x] 7.13 Test `Backup writes an encrypted dump` in `tests/container/backup.container.test.ts`
- [x] 7.14 Test `Dumps older than 30 days are removed` in `tests/container/backup.container.test.ts`
- [x] 7.15 Test `Failed backup exits with an error` in `tests/container/backup.container.test.ts`
- [x] 7.16 Test `Restore into an empty stack` in `tests/container/restore.container.test.ts`
- [x] 7.17 Test `Redeploy the previous image` in `tests/container/release.container.test.ts`

## Workflow follow-up

- At `/dirox-kit:close-change`:
  - Write `okf/decisions/MOQ-3-production-stack.md` (D1, D3, D4, D5, D6: settings folders, Compose layout, Caddy, settings files and secrets, dry-run kept on in the Compose file), `okf/decisions/MOQ-3-backups.md` (D7, D8: age-encrypted dumps, public key only in the stack, 30-day rotation, no paid storage for now, off-server copy left to MOQ-29) and `okf/decisions/MOQ-3-release-and-rollback.md` (D9: image tags, deploy script, migration rule, GHCR left to MOQ-29). The hosting decision note is deferred to MOQ-29.
  - Move the `runbooks/` drafts to `okf/runbooks/`.
  - Update `okf/architecture/overview.md` (Deployment: the production stack exists and is proved locally, the server is pending in MOQ-29), `okf/architecture/tech-stack.md` (Packaging, production PostgreSQL, Caddy, `age`) and `okf/decisions/MOQ-1-send-gate.md` (the dry-run setting).
