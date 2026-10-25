# Tasks

Big change: start only after the proposal PR is merged. Purchases and server work are done by the developer, never the agent.

## 1. Costs, before anything is bought (manual)

- [ ] 1.1 Read today's prices on the providers' pages and record each with its URL and date in design D12: the Hetzner plan with 2 vCPU and 4 GB plus IPv4 (Germany or Finland), the healthchecks.io free tier, and GHCR storage. Done when the total is at most €10 a month; if it is over, stop and ask the person (design D1, D12)
- [ ] 1.2 Buy the Hetzner server in an EU location and create the healthchecks.io account; record the location in design D12. Done when the server appears in the Hetzner console (developer)
- [ ] 1.3 Budget alert, as design D12's fallback (to confirm with the person): set Hetzner's alert if its console offers one, otherwise record the fixed monthly price and set a monthly invoice reminder. Done when the choice is recorded in design D12

## 2. Dry-run setting

- [ ] 2.1 `src/platform/config.ts`: add `dryRun` read from `DRY_RUN` as in design D8 (unset or blank gives on, exactly `true` or `false`, otherwise a `SettingError` naming `DRY_RUN` without the value); unit tests in `src/platform/config.test.ts` pass with `pnpm test:unit`
- [ ] 2.2 `src/main.ts`: log the dry-run line right after the settings load (design D8); integration tests in `src/main.int.test.ts` cover both lines, the invalid-value exit, and no secret value in the output; `pnpm test` passes

## 3. Container image

- [ ] 3.1 `deploy/Dockerfile` (multi-stage, non-root, non-secret defaults only, design D3) and a root `.dockerignore`. Done when `docker build -f deploy/Dockerfile .` succeeds and `docker run` with a local `DATABASE_URL` serves `/health`
- [ ] 3.2 `vitest.config.ts`: a `container` project for `tests/**/*.container.test.ts`, excluded from `unit` and `integration`; `package.json` script `test:container`. Done when `pnpm test` does not pick up container tests, and `pnpm test:container` without `IMAGE` fails with a clear message
- [ ] 3.3 `tests/container/image.container.test.ts` as in design D13 (own Docker network and `postgres:18`; checks the UI, health, migrations, the pg-boss schema and one process; a start without `DATABASE_URL`; image files and configuration). Done when `pnpm test:container` passes locally against the built image

## 4. Production setup files

- [ ] 4.1 `deploy/compose.yml` (design D4: `DRY_RUN: "true"`, secrets from `/etc/1moq/` files, no ports on `postgres` or `app`, log rotation, pinned image minors), `deploy/Caddyfile` (design D5, site `{$APP_DOMAIN}`), and `deploy/app.env.example` and `deploy/backup.env.example` with placeholders only (`app.1moq.example`, no storage credentials). Done when `docker compose -f deploy/compose.yml config` succeeds with the example files
- [ ] 4.2 `.gitignore`: add `deploy/*.env` and `!deploy/*.env.example` (design D7). Done when `git status` does not show a test `deploy/app.env`
- [ ] 4.3 `tests/deploy-config.test.ts` as in design D13. Done when `pnpm test:unit` passes
- [ ] 4.4 `tests/container/proxy.container.test.ts` as in design D13 (the image and `caddy:2` with `deploy/Caddyfile` and `APP_DOMAIN=localhost`: HTTP is redirected to HTTPS, and HTTPS trusting Caddy's local root reaches `/health`). Done when `pnpm test:container` passes locally
- [ ] 4.5 `.github/workflows/image.yml` (design D10): build and `pnpm test:container` (image and proxy tests) on every PR; on push to `main`, push `sha-<short commit>` to GHCR with `packages: write` on that job only, and keep the newest 10 versions. Done when the PR's own run is green; `ci.yml` is unchanged and `tests/ci-workflow.test.ts` still passes

## 5. Server scripts and runbook drafts

- [ ] 5.1 `deploy/server/setup-server.sh` (design D2: `deploy` user, key-only SSH, `ufw` 22/80/443, Docker Engine and Compose, `age`, `/etc/1moq/` 0700, `/var/lib/1moq/`, `/var/backups/1moq/` root:deploy 0750, UTC clock, installs 5.2 and 5.3). Done when a second run changes nothing and `shellcheck` is clean
- [ ] 5.2 `deploy/server/52moq-unattended-upgrades` and the `apt-daily-upgrade.timer` override at 02:00 to 02:30 UTC, with automatic reboot at 02:30 UTC (design D11). Done when `unattended-upgrade --dry-run --debug` on the server lists the security origin
- [ ] 5.3 `deploy/backup/backup.sh`, `deploy/server/moq-backup.service`, `deploy/server/moq-backup.timer` (design D9: stream `pg_dump` through `age` into a `.partial` file, rename, delete dumps older than 30 days, pings for start, success and fail, nothing unencrypted on disk). Done when a manual run leaves one `.dump.age` in `/var/backups/1moq/`, the check turns green, and `shellcheck` is clean
- [ ] 5.4 `deploy/backup/pull-backups.sh [--status]` (design D10: `ssh`/`scp` only, copies missing dumps still encrypted, removes local copies older than 30 days, writes `last-pull`, prints the last pull time, the newest local copy and the count). Done when it runs under macOS or Linux `sh` and Git Bash, and `shellcheck` is clean
- [ ] 5.5 `deploy/backup/restore.sh <file|latest>` and `deploy/backup/table-counts.sql` (design D10: decrypt a pulled dump on the developer's machine and stream it to `pg_restore` over SSH; the key never goes to the server). Done when `shellcheck` is clean
- [ ] 5.6 `deploy/deploy.sh <tag>|--previous` (design D10: pre-deploy dump first, write `IMAGE_TAG`, pull and start, wait for healthy, append to `releases.log`) and `deploy/status.sh` (design D11). Done when `shellcheck` is clean
- [ ] 5.7 Draft the runbooks in this change folder:
  - `runbooks/server-setup.md`: firewall, setup script, settings files, the developer's copies kept apart from the dumps, the DNS record.
  - `runbooks/deploy-and-rollback.md`: deploy, roll back, the migration rule.
  - `runbooks/backup-and-restore.md`: the backup check, the pull and how to schedule it on macOS, Linux and Windows, the plain statement that only pulled copies survive the server, the restore steps, and a line for the test date and result.
  - Done when each step names its command.

## 6. Bring-up on the server (manual, developer)

- [ ] 6.1 Attach the Hetzner Cloud Firewall (TCP 22, 80 and 443, ICMP), run `setup-server.sh`, copy `deploy/` to `/opt/1moq/`, and write `/etc/1moq/app.env` (with `APP_DOMAIN=localhost` until the domain exists) and `backup.env` from the templates. Keep their copies and the backup private key in the password manager, plus an offline copy of the key, never in the pulled-dump folder. Done when `status.sh` runs
- [ ] 6.2 Deploy the first `main` image with `deploy.sh sha-<commit>`. Done when `status.sh` shows the tag healthy and "Dry-run is on"
- [ ] 6.3 Enable `moq-backup.timer` and the healthchecks.io check. Done when the next scheduled run succeeds and the check is green
- [ ] 6.4 On the developer's machine, set `MOQ_SERVER` and `MOQ_BACKUP_DIR` and schedule `pull-backups.sh` (daily, as the runbook shows). Done when `pull-backups.sh --status` shows today's pull
- [ ] 6.5 When the company domain is known, have its owner add the `app` DNS record and set `APP_DOMAIN`. Done when `https://app.<domain>/health` answers 200. Until then, Proof tasks 8.12 and 8.13 stay open in the PR

## 7. Docs and checks

- [ ] 7.1 `.claude/CLAUDE.md`: replace "Hosting provider: TODO (row 2)" with Hetzner Cloud (EU), and add `pnpm test:container`, `deploy/deploy.sh`, `deploy/status.sh` and `deploy/backup/pull-backups.sh` to Commands. Done when the file reads correctly
- [ ] 7.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:container` and `openspec validate moq-3-cloud-deployment --strict`. Done when all pass

## 8. Proof

Automated tasks are tests run in CI. Manual tasks need the real server, the real domain, the public internet, real elapsed time, the developer's machine or the provider's console, which CI cannot reach. Each manual task is run once by the developer with the named command, and its date and result are recorded in the named runbook draft and in the PR description.

- [ ] 8.1 Test `Container image serves the UI and health` in `tests/container/image.container.test.ts` (automated, `image.yml`)
- [ ] 8.2 Test `Container without a required secret refuses to start` in `tests/container/image.container.test.ts` (automated, `image.yml`)
- [ ] 8.3 Test `Dry-run on when unset` in `src/platform/config.test.ts` and `src/main.int.test.ts` (automated; the second checks the start-up line)
- [ ] 8.4 Test `Dry-run off when set off` in `src/platform/config.test.ts` and `src/main.int.test.ts` (automated)
- [ ] 8.5 Test `Invalid dry-run value refuses to start` in `src/platform/config.test.ts` and `src/main.int.test.ts` (automated; exit 1, names `DRY_RUN`, no value)
- [ ] 8.6 Test `Production deploy keeps dry-run on` in `tests/deploy-config.test.ts` (automated)
- [ ] 8.7 Test `Server secrets stay outside the repository` in `tests/deploy-config.test.ts` (automated)
- [ ] 8.8 Test `Image holds no secret values` in `tests/container/image.container.test.ts` (automated, `image.yml`)
- [ ] 8.9 Test `Start-up log holds no setting values` in `src/main.int.test.ts` (automated)
- [ ] 8.10 Test `Public address comes from a setting` in `tests/deploy-config.test.ts` (automated)
- [ ] 8.11 Test `Proxy redirects to HTTPS with a local certificate` in `tests/container/proxy.container.test.ts` (automated, `image.yml`)
- [ ] 8.12 Manual check `HTTP redirects to HTTPS` in `runbooks/server-setup.md`: `curl -sI http://app.<domain>/` gives a 301 or 308 to `https://`, and `curl -sv https://app.<domain>/health` gives 200 with a Let's Encrypt certificate (manual: needs the real domain and DNS; open until the company domain exists)
- [ ] 8.13 Manual check `Certificate renews automatically` in `runbooks/server-setup.md`: record the expiry date from `status.sh`, confirm Caddy's log shows the certificate as managed, and check again after the first renewal date that the expiry has moved later (manual: needs the real domain, and renewal happens about 60 days in)
- [ ] 8.14 Manual check `Only web and SSH ports answer` in `runbooks/server-setup.md`: `nmap -Pn -p- <server IP>` from outside shows only 22, 80 and 443 open, and 5432 closed or filtered (manual: needs the public internet)
- [ ] 8.15 Manual check `Daily backup is encrypted on the server` in `runbooks/backup-and-restore.md`: after a scheduled run, `ls -l /var/backups/1moq/` shows the new `.dump.age`, its first bytes are the `age` header (not `PGDMP`), no `.partial` or unencrypted dump is on disk, and no private key exists on the server (manual: needs the real server and timer)
- [ ] 8.16 Manual check `Server dumps older than 30 days are removed` in `runbooks/backup-and-restore.md`: place a dummy `moq-<timestamp 31 days ago>.dump.age` in `/var/backups/1moq/`, run `backup.sh`, and the dummy is gone while the newer dumps stay (manual: runs on the server)
- [ ] 8.17 Manual check `Failed or missing backup alerts the developer` in `runbooks/backup-and-restore.md`: run `backup.sh` once with PostgreSQL stopped, and once pause the timer past the grace period; both send the developer a healthchecks.io alert email (manual: needs the real alert service)
- [ ] 8.18 Manual check `Pull copies new dumps to the developer's machine` in `runbooks/backup-and-restore.md`: run `pull-backups.sh` after a new daily dump. The new `.dump.age` files are in `MOQ_BACKUP_DIR` and still encrypted, a second run copies nothing, and `--status` shows this pull's time and the newest copy's date (manual: needs the server and the developer's machine)
- [ ] 8.19 Manual check `Restore on a blank server` in `runbooks/backup-and-restore.md`: on a temporary second server with `APP_DOMAIN=localhost`, follow the runbook with `restore.sh latest` from the pulled copies. The `table-counts.sql` output matches production's counts for that dump, the container is healthy and `/health` answers 200. Record the date and result in the runbook, then delete the server (manual: needs a real server and the developer's key)
- [ ] 8.20 Manual check `Security updates applied automatically` in `runbooks/server-setup.md`: after a few days, `status.sh` shows the last unattended-upgrades run, its date and the packages installed (manual: needs real published updates)
- [ ] 8.21 Manual check `Redeploy the previous image` in `runbooks/deploy-and-rollback.md`: with two `main` tags released, deploy the newer, take `table-counts.sql`, run `deploy.sh --previous`, and `status.sh` shows the older tag healthy with the same counts (manual: needs the registry and the server)
- [ ] 8.22 Manual check `Costs confirmed within budget before purchase` in design D12: the server's price with its URL and date (at most €10), and the budget alert or its fallback, were recorded before the purchase date on the invoice (manual: the provider's prices and console)
- [ ] 8.23 Manual check `Server in the EU` in `runbooks/server-setup.md`: the Hetzner console shows a German or Finnish location (manual: the provider's console)

## Workflow follow-up

- At `/dirox-kit:close-change`:
  - Write `okf/decisions/MOQ-3-hosting-and-backups.md` (D1, D2, D5, D7, D9, D10, D12). It covers the provider, region, no staging, firewall, HTTPS, secrets custody, and the costs with the budget alert or its fallback. On backups it says they are encrypted daily dumps kept 30 days on the server, plus copies pulled to the developer's machine (not cloud storage), with the stated limit that data since the last pull is lost if the server dies, the healthchecks.io alerting, and the answer on copies outside the EU.
  - Write `okf/decisions/MOQ-3-release-and-rollback.md` (D10: GHCR, tags, deploy script, migration rule).
  - Move the `runbooks/` drafts to `okf/runbooks/`.
  - Update `okf/architecture/overview.md` (Deployment; External services: Hetzner as a processor, healthchecks.io, GHCR), `okf/architecture/tech-stack.md` (Packaging, production PostgreSQL, Caddy), `okf/decisions/MOQ-1-cloud-web-service.md` (the off-server copy is the developer's pull), `okf/decisions/MOQ-1-send-gate.md` (the dry-run setting), and, if the person's answer requires it, `okf/decisions/MOQ-1-personal-data-handling.md` (backup copies outside the EU).
