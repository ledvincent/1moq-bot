Jira: MOQ-3
Size: big
Difficulty: tricky
Tier: heavy

# MOQ-3: Cloud deployment

## Why

The scaffold (MOQ-2) runs only as a development process. Sending, follow-ups and unsubscribe will need an always-on EU server (`okf/decisions/MOQ-1-cloud-web-service.md`). This is row 2 of the MOQ-1 kickoff backlog.

The company has no email address or domain yet, and the server account needs both. So the person decided to build and prove the whole production setup **locally now**, and to connect a real server later in a separate ticket ("MOQ-29"; its key is added later). Nothing is bought in this change.

This change delivers everything MOQ-29 will run unchanged: the container image, the production stack (app, PostgreSQL, HTTPS proxy), the dry-run setting, settings kept outside the repository, encrypted backups, restore, and release and rollback. All of it is proved on the developer's machine and in CI. Sign-in (MOQ-4) and the footer and unsubscribe page (MOQ-18) can be built and tried against this stack. Putting them on a public address waits for MOQ-29.

## What Changes

- One container image (web server, job worker and migrations in one process, as today), built from the repository with no secrets inside it, and built and tested in CI on every pull request.
- A production stack in a new `deploy/` folder: the app, PostgreSQL 18 and the Caddy HTTPS proxy in one Compose file.
  - It runs on the developer's machine with `APP_DOMAIN=localhost` and Caddy's local certificate authority. Plain HTTP is redirected to HTTPS.
  - Only Caddy publishes host ports (80 and 443). PostgreSQL and the app publish none.
  - The public address is a setting, never written into the code.
- Settings come from files outside the repository: a git-ignored local folder now, `/etc/1moq/` on the server later. The templates in the repository hold placeholders only. A missing required secret stops the start and names it (the existing "Required settings checked at start" rule).
- A dry-run setting that fails closed: on unless it is explicitly turned off, an invalid value stops the start, and the mode is logged at start. The production Compose file keeps it on. Nothing sends email yet: the send gate (a later ticket) will apply it.
- A backup script:
  - It writes an encrypted dump of the whole database into a backup folder; only the public key is in the stack.
  - It removes dumps older than 30 days.
  - On failure it exits non-zero with a clear log line and leaves no partial or unencrypted file.
  - It can run daily; MOQ-29 schedules it.
- A restore script that rebuilds a fresh, empty stack from an encrypted dump. Every table's row count must match, except pg-boss's list of worker processes, which gains a row at each start.
- A deploy script that switches the running image tag; redeploying the previous tag rolls a release back without touching the data.
- No paid service and no staging environment.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `platform`: ADDED requirements for the production container image, the dry-run setting, keeping secrets out of the repository, image and logs, the production stack behind HTTPS, encrypted backups, restore, and release and rollback by image tag. Existing requirements are unchanged.

## Out of scope

Moved to **MOQ-29** (Connect the production server):
- Choosing and buying the server (the person's earlier choice: Hetzner Cloud, Germany or Finland, about €4 to 5 a month), and the cost and budget-alert check before buying.
- The provider's firewall and the internet port scan of the server.
- The company domain, the DNS record, the real free certificate and its automatic renewal.
- The server setup script (user, SSH, Docker, folders) and running it on a real server; the systemd timer that runs the backup daily.
- Automatic security updates (unattended-upgrades) and a way to see the last update run.
- Alerting the developer when a daily backup fails or is missing (healthchecks.io, approved by the person).
- Off-server copies: pulling the encrypted dumps to the developer's machine, and seeing the date of the newest copy.
- Restore on a blank real server, tested once with its date and result recorded.
- The server's EU location, and the question of backup copies held outside the EU.
- Publishing the image to a registry (GHCR, approved by the person) and pulling it on the server.
- A server status command, and the server setup runbook.

Elsewhere:
- The send gate and the internal test address that dry-run sends to: the sending tickets add them. This change adds only the setting, its check and its start-up log.
- Turning dry-run off in production: go-live, row 25. No feature ticket does it.
- Buying or running the company mailbox and its domain: the external mailbox and domain ticket.
- Writing `okf/` files: the decision notes and runbooks listed in Impact are written at `/dirox-kit:close-change`.

## Impact

- New:
  - `deploy/`: Dockerfile, production Compose file, Caddyfile, settings templates with placeholders only, deploy and rollback script, backup and restore scripts, table-count query.
  - `.dockerignore`.
  - `.github/workflows/image.yml`: builds the image and runs the container tests on every PR; it publishes nothing.
  - `tests/container/` (image, stack, backup, restore and release tests) and `tests/deploy-config.test.ts`.
- Edited:
  - `src/platform/config.ts` (dry-run setting) and `src/main.ts` (logs the mode at start).
  - `vitest.config.ts` and `package.json` (a `container` test project and `test:container` script).
  - `.gitignore` (the local settings folder and the server settings files).
  - `.claude/CLAUDE.md` (hosting line and the local stack commands).
- Unchanged: `.github/workflows/ci.yml`, `.github/workflows/dirox-checks.yml`, `docker-compose.yml` (local development database and mail catcher).
- People: the developer runs the stack and the checks locally and keeps the test backup key out of the repository. Nothing is bought.
- Services: none new. Docker and `age` are needed on the developer's machine and in CI.
- Knowledge (at close-change):
  - New decisions: `okf/decisions/MOQ-3-production-stack.md` (Caddy proxy, settings files outside the repository, dry-run kept on in the Compose file), `okf/decisions/MOQ-3-backups.md` (age-encrypted dumps, public key only in the stack, 30-day rotation, no paid storage for now) and `okf/decisions/MOQ-3-release-and-rollback.md` (image tags, deploy script, migration rule). The hosting decision note is deferred to MOQ-29.
  - New runbooks: `okf/runbooks/local-production-stack.md`, `okf/runbooks/backup-and-restore.md` and `okf/runbooks/deploy-and-rollback.md`. They are drafted in this change's `runbooks/` folder while building and moved at close-change. MOQ-29 extends them.
  - Updates: `okf/architecture/overview.md` (Deployment: the production stack exists, the server is pending), `okf/architecture/tech-stack.md` (Packaging, production PostgreSQL, Caddy), `okf/decisions/MOQ-1-send-gate.md` (the dry-run setting it applies).

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source | Scenario |
|---|---|---|---|
| 1 | WHEN the container image is built and started with the required settings and a reachable PostgreSQL THEN it serves the UI at `/` and `GET /health` answers 200 (one container image, web and worker in one process, migrations at start) | Jira (synced 2026-10-25); decision MOQ-1-cloud-web-service; architecture overview "Release and rollback" | Container image serves the UI and health |
| 2 | WHEN dry-run is unset THEN it is on (fail closed) and the start-up log says so; WHEN it is explicitly set off THEN it is off; WHEN its value is anything else THEN the service refuses to start with a message naming the setting; the production Compose file keeps it on | Jira (synced 2026-10-25); decision MOQ-1-send-gate; CLAUDE.md project rule "Production stays in dry-run" | Dry-run on when unset; Dry-run off when set off; Invalid dry-run value refuses to start; Production deploy keeps dry-run on |
| 3 | WHEN the repository, the image or the logs are inspected THEN they hold no secret values: settings come from files outside the repository (a git-ignored local folder now, `/etc/1moq/` on the server later), the templates hold placeholders only and the build context excludes `.env`; WHEN a required secret is missing THEN the start stops, naming it | Jira (synced 2026-10-25, reworded for the local scope); Dirox rule "Never commit secrets"; spec platform "Required settings checked at start" | Settings files stay outside the repository; Image holds no secret values; Start-up log holds no setting values; Container without a required secret refuses to start |
| 4 | WHEN the production stack (app, PostgreSQL, Caddy) is started on the developer's machine with `APP_DOMAIN=localhost` THEN plain HTTP is redirected to HTTPS and HTTPS with Caddy's local certificate reaches `GET /health` with 200; only Caddy publishes host ports (80 and 443) and PostgreSQL and the app publish none; the public address comes from a setting, never written into the code | Jira (synced 2026-10-25, rescoped to local by the person); decision MOQ-1-cloud-web-service | Public address comes from a setting; Proxy redirects to HTTPS with a local certificate; Only the proxy publishes ports |
| 5 | WHEN the backup script runs against the stack THEN an encrypted dump, readable only with the private key that is not in the stack, is in the backup folder and dumps older than 30 days are removed; WHEN the backup fails THEN the script exits non-zero with a clear log line and leaves no partial or unencrypted file | Jira (synced 2026-10-25, rescoped to local by the person); decision MOQ-1-personal-data-handling; answers from the person (daily-capable, encrypted, 30 days, no paid storage) | Backup writes an encrypted dump; Dumps older than 30 days are removed; Failed backup exits with an error |
| 6 | WHEN the restore script is run with an encrypted dump into a fresh, empty stack (new database volume) THEN every table's row count matches the backed-up database and `GET /health` answers 200 | Jira (synced 2026-10-25, rescoped to local by the person); decision MOQ-1-cloud-web-service ("restore procedure tested") | Restore into an empty stack |
| 7 | WHEN a new release misbehaves THEN redeploying the previous image tag with the deploy script restores the previous version and the data is unchanged, proved on the local stack with locally built tags | Jira (synced 2026-10-25); architecture overview "Release and rollback" | Redeploy the previous image |

Every scenario is proved by an automated test that runs on the developer's machine and in CI (`tasks.md`, Proof).

### Considered, not needed

- Off-server object storage for backups (Backblaze B2, Hetzner Object Storage): deferred for cost and build effort, as the person decided. Revisit when the data or the risk grows (for example at go-live, row 25).
- Staging server: not needed (answer from the person). One user, low cost; production will stay in dry-run until row 25, and the local production stack covers trials.
- Uptime monitoring of `/health` and the provider's own server snapshots: questions for MOQ-29, if at all.
- A managed PostgreSQL service: ruled out by `okf/decisions/MOQ-1-postgresql-store-and-queue.md` (same server) and the budget. PostgreSQL stays, as a local database for now (answer from the person).
- Building the image on the server: the image tested in CI would then not be the one deployed, and rollback would depend on what is still cached there.
- An HMAC secret and do-not-contact table: they come with the compliance tickets. Backup and restore cover every table in every schema, so the do-not-contact data is covered once it exists. Its secret comes from the settings files, which MOQ-29 keeps off the server too.
- A secret scanner in CI: `dirox-checks` and `.gitignore` already guard the repository; this change adds tests on the deploy files and the image instead.

### Open questions

None.

## Jira acceptance criteria

Read from MOQ-3 on 2026-10-25 23:38
- WHEN the container image is built and started with the required settings and a reachable PostgreSQL THEN it serves the UI at `/` and `GET /health` answers 200 (one container image, web and worker in one process, migrations at start)
- WHEN dry-run is unset THEN it is on (fail closed) and the start-up log says so; WHEN it is explicitly set off THEN it is off; WHEN its value is anything else THEN the service refuses to start with a message naming the setting; the production Compose file keeps it on
- WHEN the repository, the image or the logs are inspected THEN they hold no secret values: settings come from files outside the repository (a git-ignored local folder now, `/etc/1moq/` on the server later), the templates hold placeholders only and the build context excludes `.env`; WHEN a required secret is missing THEN the start stops, naming it
- WHEN the production stack (app, PostgreSQL, Caddy) is started on the developer's machine with `APP_DOMAIN=localhost` THEN plain HTTP is redirected to HTTPS and HTTPS with Caddy's local certificate reaches `GET /health` with 200; only Caddy publishes host ports (80 and 443) and PostgreSQL and the app publish none; the public address comes from a setting, never written into the code
- WHEN the backup script runs against the stack THEN an encrypted dump, readable only with the private key that is not in the stack, is in the backup folder and dumps older than 30 days are removed; WHEN the backup fails THEN the script exits non-zero with a clear log line and leaves no partial or unencrypted file
- WHEN the restore script is run with an encrypted dump into a fresh, empty stack (new database volume) THEN every table's row count matches the backed-up database and `GET /health` answers 200
- WHEN a new release misbehaves THEN redeploying the previous image tag with the deploy script restores the previous version and the data is unchanged, proved on the local stack with locally built tags
