# Design

## Context

See proposal.md, Why. The service runs locally only (MOQ-2): `src/main.ts` starts the Fastify server and the pg-boss worker in one process after the Drizzle migrations; `src/platform/config.ts` reads settings with `loadConfig()` and throws `SettingError` / `MissingSettingError`, which name the setting and never its value. The only required setting is `DATABASE_URL`, and `HOST` defaults to `127.0.0.1`. There is no Dockerfile, no production setup and no dry-run setting. `docker-compose.yml` is for local PostgreSQL and Mailpit only.

This design follows:
- `okf/decisions/MOQ-1-cloud-web-service.md`: one always-on EU server, a subdomain over HTTPS, €10 a month, a daily backup off the server, automatic security updates, a tested restore. The off-server copy is the developer's pull (D9, D10), not cloud storage: the person decided not to pay for backup storage yet.
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md`: PostgreSQL on the same server is the only store and queue (kept, as the person confirmed).
- `okf/decisions/MOQ-1-personal-data-handling.md`: EU hosting, processors listed, the HMAC secret is part of the do-not-contact list. It does not cover backup copies outside the EU (Risks, Open Questions).
- `okf/decisions/MOQ-1-send-gate.md`: with dry-run on, the gate replaces the recipient with the internal test address.
- `okf/decisions/MOQ-2-folder-layout.md` and `okf/decisions/MOQ-2-libraries-and-versions.md`: one package; `src/platform/` owns settings.
- `okf/architecture/overview.md` (Deployment) and `okf/architecture/tech-stack.md` (Packaging: "image: MOQ-3"; PostgreSQL 18, "production confirmed by MOQ-3").

## Goals / Non-Goals

**Goals:**
- The repository can be turned into a running, HTTPS-served production service on one blank server by following scripts and runbooks, and rebuilt the same way from a pulled backup.
- No secret value ends up in git, in the image or in the logs.
- Everything that can be checked without the real server is checked in CI, including the proxy and its HTTPS redirect with a local certificate. Everything else is a recorded manual check with a named script or command.
- As little to build and pay for as the criteria allow (the person: "less to build").

**Non-Goals:**
- High availability, zero-downtime deploys, or more than one server. A restart or a short outage while redeploying is acceptable (one user; the send gate's "unknown" rule covers a crash mid-send).
- Off-server cloud storage for backups: deferred (proposal, "Considered, not needed").
- Infrastructure-as-code tooling (Terraform, Ansible). One server is set up by one idempotent shell script.
- Reading `PUBLIC_URL` in the application: MOQ-4 and MOQ-18 add it to `config.ts` when they need it (D6).

## Decisions

### D0. Where the files go
Everything stays in tooling and `src/platform/`. No feature module is touched.
```
deploy/
  Dockerfile                    image (D3)
  compose.yml                   production app + postgres + caddy (D4)
  Caddyfile                     HTTPS reverse proxy (D5)
  app.env.example               settings template, placeholders only (D6, D7)
  backup.env.example            backup settings template, placeholders only (D7, D9)
  deploy.sh                     deploy a tag or roll back, on the server (D10)
  status.sh                     what the developer checks on the server (D11)
  server/setup-server.sh        one-time, idempotent server setup (D2)
  server/52moq-unattended-upgrades
  server/moq-backup.service, server/moq-backup.timer
  backup/backup.sh              daily encrypted dump kept on the server (D9)
  backup/pull-backups.sh        copies dumps to the developer's machine, run there (D10)
  backup/restore.sh             restore from a pulled dump, run on the developer's machine (D10)
  backup/table-counts.sql       per-table row counts for restore and rollback checks
.dockerignore                   build-context exclusions (D3)
.github/workflows/image.yml     build, test and publish the image (D10)
tests/deploy-config.test.ts, tests/container/image.container.test.ts,
tests/container/proxy.container.test.ts (D13)
src/platform/config.ts, src/main.ts (D8)
```
The runbook drafts (server setup, deploy and rollback, backup and restore) are written in this change folder under `runbooks/` while building and testing. `/dirox-kit:close-change` moves them to `okf/runbooks/`.

### D1. Hosting: Hetzner Cloud, one small server, no staging (Decision record needed)
- **Provider and region:** Hetzner Cloud, location Germany (Falkenstein or Nuremberg) or Finland (Helsinki), chosen at purchase. All are in the EU.
- **Plan:** the smallest shared-vCPU plan with 2 vCPU and 4 GB RAM (x86 or Arm), with a public IPv4 address. Node, PostgreSQL and the proxy fit in 4 GB, and 30 days of small dumps fit on its disk.
- **Operating system:** the newest Ubuntu LTS image Hetzner offers. It ships unattended-upgrades and packages `age`.
- **Price:** about €4 to 5 a month with IPv4, confirmed in task 1 before buying (D12). This is the only paid item.
- **Staging:** none, as the person decided. Production stays in dry-run until row 25, so it is the safe environment, and local Docker Compose is where to try things. The restore test (D10) uses a temporary second server for an hour (billed hourly, cents), then deletes it.
- **Alternatives:**
  - Other EU VPS providers (OVH, Scaleway, netcup): similar prices, but the person chose Hetzner.
  - A platform-as-a-service with managed PostgreSQL: over budget, and against the same-server decision.

### D2. Server access and firewall (Decision record needed)
- **Firewall:** a Hetzner Cloud Firewall attached to the server lets in only TCP 22, 80 and 443 (and ICMP); everything else is dropped before it reaches the server. `ufw` on the host repeats the same rules as a second layer.
- **Database port:** Docker publishes ports around `ufw`, so the real guarantee for the database is that **PostgreSQL publishes no port at all**. It sits only on the Compose network. The app publishes no port either; only the proxy publishes 80 and 443.
- **SSH:** key-only login for a `deploy` user with sudo. Password login and root login are off. The server clock is in UTC: sending is judged in the lead's time zone, never the server's (`.claude/CLAUDE.md`, What is tricky here).
- **Setup script:** `deploy/server/setup-server.sh` (idempotent, run once as root on a new server) does all of this. It also:
  - installs Docker Engine and the Compose plugin, and `age`;
  - installs the unattended-upgrades config (D11) and the backup timer (D9);
  - creates `/etc/1moq/` (mode 0700), `/var/lib/1moq/`, and `/var/backups/1moq/` (owner root, group `deploy`, mode 0750, so the `deploy` user can read the encrypted dumps for the pull).

### D3. Container image
`deploy/Dockerfile`, built with the repository root as context (`docker build -f deploy/Dockerfile .`):
- **Stages:** a build stage on `node:24-bookworm-slim` (pinned to the Node 24 minor in use) enables pnpm through Corepack, runs `pnpm install --frozen-lockfile` and `pnpm build`. A production-dependencies stage runs `pnpm install --prod --frozen-lockfile`. The runtime stage copies `package.json`, the production `node_modules`, `src/`, `drizzle/` and `dist/web/`.
- **Runtime:** it sets only non-secret defaults (`NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`, `WEB_DIR=dist/web`), runs as the `node` user and starts `node src/main.ts`. Node 24 strips the types, as in local runs (tech stack). Migrations stay at start (`drizzle-orm`'s migrator is a runtime dependency).
- **No secrets in the image:** no `ARG` or `ENV` names a secret, and nothing copies a settings file.
- **Build context:** a root `.dockerignore` excludes `.env`, `.env.*`, `**/*.env` (keeping `*.env.example`), `.git`, `node_modules`, `dist`, `.claude`, `okf`, `openspec`, `tests`, `test-cases`. It sits at the root because the context is the root, so every builder honours it.
- **Health in Compose:** the container healthcheck runs `node -e` with `fetch('http://127.0.0.1:3000/health')`, so the slim image needs no curl.

### D4. Production Compose file
`deploy/compose.yml`, run on the server from `/opt/1moq/` with `docker compose --env-file /etc/1moq/app.env --env-file /etc/1moq/release.env`:
- **`app`:**
  - Image `ghcr.io/<owner>/1moq-bot:${IMAGE_TAG}`, with `env_file: /etc/1moq/app.env`.
  - `DATABASE_URL=postgres://moq:${POSTGRES_PASSWORD}@postgres:5432/moq`, interpolated by Compose.
  - `PUBLIC_URL=https://${APP_DOMAIN}`.
  - `DRY_RUN: "true"` written in the file (D8). It depends on `postgres` being healthy.
- **`postgres`:** `postgres:18` (same major as local and CI, pinned to a minor), data in a named volume, no `ports:`.
- **`caddy`:** `caddy:2` (pinned to a minor), ports `80:80` and `443:443` (TCP only), the `Caddyfile` mounted read-only, and certificates in a named volume.
- **All services:** `restart: unless-stopped`, and the `json-file` log driver with `max-size: 10m`, `max-file: 5`, so logs (which may later hold personal data) do not grow without limit.
- **Passwords:** the PostgreSQL password is generated as hex (`openssl rand -hex 32`), so it needs no URL escaping inside `DATABASE_URL`.

### D5. HTTPS: Caddy as the reverse proxy (Decision record needed)
- **Config:** `deploy/Caddyfile` has one site, `{$APP_DOMAIN}`, which runs `reverse_proxy app:3000` and adds a `Strict-Transport-Security` header. The global options set `email {$ACME_EMAIL}` (expiry notices to the developer) and HTTP/1.1 and HTTP/2 only, so only TCP 443 is used.
- **Certificates:** for a public name, Caddy obtains a Let's Encrypt certificate, redirects HTTP to HTTPS, and renews about 30 days before expiry, all by default. For `localhost` it issues the certificate from its own local authority, with the same redirect.
- **Testing before the domain exists:** the same `Caddyfile` is tested locally and in CI with `APP_DOMAIN=localhost` (D13, scenario "Proxy redirects to HTTPS with a local certificate"). That proves the proxy configuration and the redirect. The real free certificate and its renewal are proved only on the real domain (manual).
- **Alternatives:**
  - nginx with certbot: two pieces, and renewal is a separate timer to keep working.
  - Traefik: more configuration for one site.
  - Hetzner's load balancer with a managed certificate: about €5 a month, over budget.

### D6. The public address is a setting
- **Setting:** `APP_DOMAIN` in `/etc/1moq/app.env` is the only place the address is written. The template `deploy/app.env.example` holds the placeholder `app.1moq.example` (the `.example` top-level domain is reserved, so it can never resolve).
- **Who uses it:** Caddy reads `APP_DOMAIN`, and Compose derives `PUBLIC_URL` from it for the app. `config.ts` does not read `PUBLIC_URL` yet. Sign-in (MOQ-4) and unsubscribe links (MOQ-18) add it as a required setting when they use it, so no unused setting is checked now.
- **DNS:** at deploy time, whoever controls the company domain adds an `A` record (and an `AAAA` record if IPv6 is used) for `app` pointing to the server.
- **Before the domain is known:** the server runs with `APP_DOMAIN=localhost` (Caddy's local certificate, no Let's Encrypt attempt), and the developer checks it over SSH. The public HTTPS scenarios stay open in the PR (proposal, Open questions).

### D7. Secrets on the server (Decision record needed)
- **App settings:** `/etc/1moq/app.env` (root, 0600) holds `POSTGRES_PASSWORD`, `APP_DOMAIN`, `ACME_EMAIL`, and later the secrets each ticket adds (the HMAC key, API keys, mailbox credentials).
- **Backup settings:** `/etc/1moq/backup.env` (root, 0600) holds the healthchecks.io ping URL and the backup recipient's **public** key. There is no storage credential.
- **Release:** `/etc/1moq/release.env` holds only `IMAGE_TAG`.
- **Templates:** `deploy/app.env.example` and `deploy/backup.env.example` hold placeholders only. `.gitignore` gains `deploy/*.env` with `!deploy/*.env.example` (its current `.env` and `.env.*` lines do not match `app.env`).
- **Developer's copies:** the developer keeps a copy of both settings files and the backup private key in their password manager, and a second offline copy of the private key.
  - These are **never stored in the folder of pulled dumps** (D10), so whoever gets the dumps does not also get the key.
  - The restore (D10) needs them: without the HMAC key, stored do-not-contact hashes match nothing (`okf/decisions/MOQ-1-personal-data-handling.md`).
- **Image registry login:** if the image package is private, the server logs in to GHCR once with a read-only token (`read:packages`), stored in root's Docker config on the server only.
- **Logs:** `main.ts` prints only setting names. Fastify's default request log has method, URL and status, never headers or bodies. A test proves no secret value appears in the start-up output (spec "Start-up log holds no setting values").

### D8. Dry-run setting
- **Values:** `DRY_RUN` is read by `loadConfig()` into `Config.dryRun: boolean`.
  - Unset or blank (blank counts as unset, as for every setting today): `true`.
  - Exactly `true`: `true`.
  - Exactly `false`: `false`.
  - Anything else (`0`, `no`, `FALSE`, `off`): `throw new SettingError('DRY_RUN', 'Invalid setting: DRY_RUN must be true or false')`. The message carries no value, and `main()` already prints it and exits 1.
- **Start-up log:** right after the settings load, `main()` logs one line: `Dry-run is on: every email goes to the internal test address` or `Dry-run is off: emails go to their recipients`.
- **Production stays on:** `deploy/compose.yml` sets `DRY_RUN: "true"` in the `app` service's `environment`, which wins over `env_file`. Turning it off therefore needs a reviewed change to the repository (row 25), not an edit on the server. A repository test guards this.
- **Who applies it:** the send gate, when it is built, reads `config.dryRun`. The internal test address setting comes with it.
- **Alternatives:**
  - Defaulting to off outside production: one wrong environment value would send real email.
  - Accepting many spellings: a typo would silently pick a mode.

### D9. Daily encrypted backup on the server (Decision record needed)
- **Schedule:** `deploy/server/moq-backup.timer` runs `moq-backup.service` daily at 01:30 UTC (`Persistent=true`, a few minutes of `RandomizedDelaySec`). The service runs `deploy/backup/backup.sh` with `/etc/1moq/backup.env`.
- **Steps of `backup.sh`** (`set -euo pipefail`):
  1. Ping the healthchecks.io check's `/start`.
  2. Stream `docker compose exec -T postgres pg_dump -U moq -Fc moq` through `age -r "$BACKUP_RECIPIENT"` into `/var/backups/1moq/moq-<UTC timestamp>.dump.age.partial`. The dump covers the whole database, the pg-boss queue schema included.
  3. Check the file is not empty, rename it to `.dump.age` (mode 0640), and only then delete dumps in that folder whose name timestamp is more than 30 days old.
  4. Ping success. On any error, a trap removes the `.partial` file and pings `/fail` with the exit code.
  5. Nothing unencrypted is ever written to disk.
- **Encryption:** `age` with an X25519 key pair. The server holds only the public key, so a compromised server cannot read any dump. The developer holds the private key (D7).
  - Rejected: `gpg` (heavier for the same result) and symmetric encryption (the key would sit on the server).
- **Where dumps live:** the server keeps the last 30 days. The only off-server copy is the developer's pull (D10). There is no cloud storage, no storage key and no storage cost (the person's decision).
- **Alerting:** a free healthchecks.io check (approved by the person; daily period, 2-hour grace) emails the developer when a run fails **or no ping arrives** (the timer did not run, or the server is down). It receives only pings, no personal data.
  - Rejected: systemd `OnFailure` email (needs mail on the server and misses a dead server), and checking by hand (silent failures).

### D10. Off-server copy, restore, and release and rollback (Decision record needed for release and rollback)
- **`deploy/backup/pull-backups.sh [--status]`**, run on the **developer's machine** by hand or from its scheduler (cron, launchd or Windows Task Scheduler; the runbook shows each):
  - It is POSIX `sh` using only `ssh` and `scp`, which ship with macOS, Linux and Windows' OpenSSH / Git Bash, so it needs no `rsync`.
  - It reads the server address and the local folder from the developer's environment (`MOQ_SERVER`, `MOQ_BACKUP_DIR`, default `~/1moq-backups`). Neither is secret.
  - It lists `moq-*.dump.age` in `/var/backups/1moq/` and copies each one not yet in the local folder: to `.partial`, then renamed. Copies stay encrypted.
  - It deletes local copies whose name timestamp is more than 30 days old, matching the server, so erased leads leave every copy within about a month.
  - It writes the pull time to `last-pull` in the folder, and prints the last pull time, the newest local copy's date and the number of copies.
  - `--status` prints the same without pulling. This is how the developer sees how fresh the off-server copy is.
- **What this copy guarantees, plainly:**
  - A copy exists off the server only as of the developer's last pull.
  - If the server dies, all data since the last pull is lost: the server's own dumps die with it.
  - Nothing is pulled while the developer's machine is off or asleep, whatever its scheduler says.
  - The person accepted this to avoid paying for and building cloud storage.
- **Release image:** `.github/workflows/image.yml` runs on every pull request: it builds the image and runs `pnpm test:container` against it (image and proxy tests). On a push to `main` it also pushes `ghcr.io/<owner>/1moq-bot:sha-<short commit>` (GHCR approved by the person). Only that job gets `packages: write`, and an old-versions clean-up keeps the newest 10 tags, inside GHCR's free storage. `ci.yml` is unchanged, so `tests/ci-workflow.test.ts` keeps passing as is.
  - Rejected: building on the server (the deployed image is not the tested one, and rollback depends on the local cache) and Docker Hub (pull limits, private repository limits).
- **`deploy/deploy.sh <tag>|--previous`** (on the server):
  1. Runs `backup.sh` first (a pre-deploy dump on the server) and stops if it fails.
  2. Writes `IMAGE_TAG` to `/etc/1moq/release.env`.
  3. Runs `docker compose pull app` and `up -d app`.
  4. Waits up to 90 s for the container healthcheck to report healthy.
  5. Appends `<UTC time> <tag> ok|failed` to `/var/lib/1moq/releases.log`.
  - `--previous` picks the last `ok` tag before the current one. The database volume is never touched.
- **Migrations and rollback:** migrations are forward-only. A migration must keep working with the previous release's code (add first, remove in a later release), so a rollback runs old code on the newer schema. Drizzle's migrator then finds nothing newer to apply. A migration that cannot stay compatible must say so in its PR. Its rollback is a restore from the pre-deploy dump: pull it, then `restore.sh` (the key is not on the server).
- **`deploy/backup/restore.sh <file|latest>`** runs on the **developer's machine**, so the private key never reaches a server: `age -d -i <key>` on a pulled dump, then `ssh deploy@<server> docker compose exec -T postgres pg_restore -U moq -d moq --clean --if-exists`.
- **Restore runbook:**
  1. Create the server, run `setup-server.sh` and copy `deploy/` to `/opt/1moq/`.
  2. Put back both settings files from the password manager.
  3. Start `postgres` only and run `restore.sh latest`.
  4. Deploy the last `ok` tag; the migrations apply nothing or only newer ones.
  5. Check health.
  6. Compare per-table row counts (`deploy/backup/table-counts.sql`, every table in every schema) with the counts taken from production when that dump was made.
- **The one test:** run on a temporary second server with `APP_DOMAIN=localhost` (Caddy's local certificate, so no Let's Encrypt attempt for a domain the test server does not own). Its date and result are recorded in the runbook draft.

### D11. Automatic security updates
- **Config:** `deploy/server/52moq-unattended-upgrades` enables the Ubuntu security origin and Docker's repository (Docker restarts the containers, and `restart: unless-stopped` brings them back). It turns on `Automatic-Reboot` at 02:30 UTC.
- **Timing:** `setup-server.sh` moves `apt-daily-upgrade.timer` to 02:00 to 02:30 UTC. That hour is outside every current send window (EU and UK mornings are about 05 to 10 UTC, Australian mornings about 21 to 23 UTC, US mornings about 12 to 15 UTC, Singapore about 00 to 01 UTC; `okf/domain/outreach-sequence.md`).
- **Container images:** PostgreSQL, Caddy and the Node base image are not covered by unattended-upgrades. They are updated by bumping their pinned minor in a release (D3, D4).
- **`deploy/status.sh`**, the developer's one command on the server, prints:
  - the running image tag and its health;
  - the last dry-run line from the app's log;
  - the last backup run and its result (from the journal), the newest dump on the server and the number of dumps, and free disk space;
  - the last unattended-upgrades run and the packages it installed (from `/var/log/unattended-upgrades/`), and whether a reboot is pending;
  - the certificate's expiry date (`openssl s_client` against `APP_DOMAIN`, once it is set).
- The freshness of the off-server copy is shown on the developer's machine by `pull-backups.sh --status` (D10), not by the server.

### D12. Costs and budget alert, before buying
- **Before buying (task 1):** the developer reads the current prices on the providers' pages and records them, with the date, in this design and in the decision note:
  - Hetzner plan plus IPv4: the only paid line, expected about €4 to 5;
  - healthchecks.io: free tier;
  - GHCR: free within its storage.
  - The total must be at most €10 a month. There is no backup-storage line.
- **Budget alert (fallback, to confirm with the person):**
  - if Hetzner's console offers a billing or usage alert, set it;
  - if it does not, the decision note records that the server's price is fixed (hourly billing up to a monthly maximum, which caps the bill), and the developer sets a monthly invoice check.
- **Who buys:** the developer makes every purchase, never the agent.

### D13. Tests
- **`config.test.ts` (unit):** the three dry-run outcomes, and that the invalid-value message has no value.
- **`src/main.int.test.ts` (integration):** spawns `node src/main.ts`:
  - the start-up line for each mode;
  - exit 1 naming `DRY_RUN` for an invalid value;
  - a `DATABASE_URL` with a marker password whose marker never appears in stdout or stderr.
- **`tests/deploy-config.test.ts` (unit):** reads the deploy files, like `tests/ci-workflow.test.ts` reads the workflow:
  - `DRY_RUN: "true"` in the `app` environment;
  - no `ports:` on `postgres` or `app`;
  - the Caddy site is `{$APP_DOMAIN}`, with no domain literal under `deploy/` except the placeholder in the `.example` template;
  - secrets come from `/etc/1moq/` files;
  - `.gitignore` and `.dockerignore` cover the settings files;
  - the templates hold placeholder values only.
- **Container tests:** a new Vitest project `container` for `tests/**/*.container.test.ts`, excluded from `unit` and `integration` (whose `tests/**/*.test.ts` glob would otherwise pick them up), run by `pnpm test:container`. They need `IMAGE` and a Docker CLI, and fail with a clear message if either is missing (never skip). Each test file creates its own Docker network and starts `postgres:18` on it.
  - **`tests/container/image.container.test.ts`:**
    - Starts the image with a published random port and checks `/`, `/health`, the migrations table, the pg-boss schema, and that `docker top` shows one Node process.
    - Starts the image without `DATABASE_URL` and expects a non-zero exit, the setting's name and no value.
    - Inspects the image: no `.env*` file under the app folder, and no configuration environment variable whose name contains `PASSWORD`, `SECRET`, `TOKEN`, `KEY` or is `DATABASE_URL`.
  - **`tests/container/proxy.container.test.ts`:**
    - Starts the image as `app` and `caddy:2` (the version pinned in `deploy/compose.yml`) with `deploy/Caddyfile` mounted and `APP_DOMAIN=localhost`, with ports 80 and 443 published to random host ports.
    - A plain HTTP request is answered with a permanent redirect whose `Location` is `https://localhost/...`.
    - It copies Caddy's local root certificate out of the container (`docker cp`) and trusts it for an HTTPS request to `/health`, sent to the published 443 port with the name `localhost`, which answers 200.
- **Manual checks:** for the scenarios that need the real server, the real domain or the developer's machine (D5, D9 to D12), see tasks.md, Proof. Each names its command and is recorded with its date.

## Risks / Trade-offs

- [The server dies between pulls] → All data since the developer's last pull is lost, because the server's own dumps go with it. Nothing is pulled while the developer's machine is off. Accepted by the person for cost and build effort.
  - Mitigations: the developer schedules the pull and checks `pull-backups.sh --status`. Off-server storage is the first thing to add when the data or the risk grows (go-live, row 25, is the natural point). A second free healthchecks.io check pinged by the pull would make a missed pull visible; it is one line, left out until the person wants it.
- [Leads' personal data copied outside the EU] → The pulled dumps sit on the developer's machine, probably in Vietnam. `okf/decisions/MOQ-1-personal-data-handling.md` puts hosting and the database in the EU and rejects hosting outside it, but says nothing about backup copies. The copies are encrypted at rest with the key kept apart. Whether that is enough, needs a safeguard, or the copies must stay in the EU is **not decided here** (Open Questions).
- [The developer's machine is lost or stolen] → The dumps are encrypted and the key is not in the dump folder (D7).
- [The server's disk fills] → Dumps are a few MB and are kept 30 days, logs rotate (D4), and `status.sh` shows free space.
- [Docker publishes ports around `ufw`] → The database and app publish no port (tested), and the Hetzner Cloud Firewall sits outside the host.
- [One server is a single point of failure] → Accepted for one user. Restore from the newest pulled dump takes about an hour; data since that pull is lost (first risk).
- [Losing the backup private key or the settings file makes backups or do-not-contact hashes useless] → Two copies apart from the dumps (password manager and offline). The restore test proves they work.
- [A compromised server deletes the dumps on the server] → The pulled copies on the developer's machine are out of its reach; the server cannot delete them.
- [A rollback across an incompatible migration] → Compatible migrations by rule (D10), plus a pre-deploy dump before every deploy.
- [An automatic reboot or Docker restart in the middle of a send] → Updates and reboots happen at 02:00 to 02:30 UTC, outside current send windows. A crash mid-send becomes "unknown", never resent (`okf/data/outbound-message.md`). If client types gain windows in that hour, the timer moves.
- [The company domain is still unknown] → The proxy and its redirect are proved locally. Everything but the real certificate and its renewal can be done and checked first. The domain is one setting and a DNS record.
- [Prices change before purchase] → Task 1 reads them on the day and stops if the total goes over €10.
- [Let's Encrypt rate limits during repeated tries] → Local tests and the restore test use `APP_DOMAIN=localhost` (local certificate). Production gets one certificate, kept in a volume across restarts.
- [The public address shows the UI before sign-in exists] → The shell holds no lead data. MOQ-4 must be deployed before any ticket that shows lead data (proposal, Out of scope).

## Migration Plan

Big change: no code before this proposal PR is merged.
1. Cost check and record (task 1), then the developer buys the server and creates the healthchecks.io account.
2. Build: settings, image, proxy, deploy files, workflow and tests (tasks 2 to 5), merged through the code PR with CI green.
3. Run `setup-server.sh`, copy `deploy/`, write the settings files, deploy the first `main` image, enable the backup timer, and set up the pull on the developer's machine.
4. When the company domain is known: DNS record, then the public HTTPS and port checks.
5. Restore test from a pulled dump on a temporary server, then the rollback test on production (two tags), with results recorded.

To undo: nothing depends on the server yet. Stop the containers or delete the server; the repository changes are reverted by a PR.

## Open Questions

- The company domain (proposal, Open questions): it changes only a setting and a DNS record, not this design.
- The budget alert fallback (D12): to confirm with the person. Either answer fits this design.
- Whether pulled copies outside the EU are acceptable (Risks): for the person and the personal-data decision. If the answer is "keep them in the EU", the pull target changes (for example an EU machine or EU storage), not the server side of this design.
- Whether the GHCR image package is private: it decides only whether the server needs the read-only token (D7).
