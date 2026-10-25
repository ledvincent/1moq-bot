# Design

## Context

See proposal.md, Why. The service runs only as a development process (MOQ-2): `src/main.ts` starts the Fastify server and the pg-boss worker in one process after the Drizzle migrations; `src/platform/config.ts` reads settings with `loadConfig()` and throws `SettingError` / `MissingSettingError`, which name the setting and never its value. The only required setting is `DATABASE_URL`, and `HOST` defaults to `127.0.0.1`. There is no Dockerfile, no production stack and no dry-run setting. `docker-compose.yml` holds only the development PostgreSQL and Mailpit.

The person decided to build and prove the production setup on the developer's machine now. A real server is connected later by **MOQ-29**, because the company has no email address or domain yet to open the hosting account. So everything here must run unchanged on a server later, and be proved locally and in CI now.

This design follows:
- `okf/decisions/MOQ-1-cloud-web-service.md`: one always-on EU server serving the UI over HTTPS, a daily backup, a tested restore, €10 a month. The server itself is MOQ-29's job.
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md`: PostgreSQL in the same stack is the only store and queue.
- `okf/decisions/MOQ-1-personal-data-handling.md`: personal data is kept minimal, and the HMAC secret is part of the do-not-contact list, so settings and backups are handled with care.
- `okf/decisions/MOQ-1-send-gate.md`: with dry-run on, the gate replaces the recipient with the internal test address.
- `okf/decisions/MOQ-2-folder-layout.md` and `okf/decisions/MOQ-2-libraries-and-versions.md`: one package; `src/platform/` owns settings.
- `okf/architecture/overview.md` (Deployment, Release and rollback) and `okf/architecture/tech-stack.md` (Packaging: "image: MOQ-3"; PostgreSQL 18).

## Goals / Non-Goals

**Goals:**
- The same image, Compose file, Caddyfile and scripts that MOQ-29 will use run on the developer's machine today.
- Every scenario is proved by an automated test that runs on the developer's machine and in CI.
- No secret value ends up in git, in the image or in the logs.
- Little to build, nothing to buy.

**Non-Goals:**
- Anything that needs a real server, a real domain or a paid service (proposal, Out of scope, "MOQ-29"; summarised in D11).
- High availability or zero-downtime deploys. A short outage while redeploying is acceptable (one user; the send gate's "unknown" rule covers a crash mid-send).
- Reading `PUBLIC_URL` in the application: MOQ-4 and MOQ-18 add it to `config.ts` when they need it (D4).

## Decisions

### D0. Where the files go
Everything stays in tooling and `src/platform/`. No feature module is touched.
```
deploy/
  Dockerfile                image (D2)
  compose.yml               production stack: app + postgres + caddy (D3)
  Caddyfile                 HTTPS proxy (D4)
  app.env.example           settings templates, placeholders only (D5)
  backup.env.example
  release.env.example
  lib.sh                    shared: settings paths and the compose command (D1)
  deploy.sh                 deploy a tag or roll back (D9)
  backup/backup.sh          encrypted dump with 30-day rotation (D7)
  backup/restore.sh         restore into an empty stack (D8)
  backup/table-counts.sql   row count of every table in every schema
.dockerignore               build-context exclusions (D2)
.github/workflows/image.yml build the image and run the container tests (D9)
tests/deploy-config.test.ts
tests/container/            image, stack, backup, restore and release tests, plus a stack helper (D10)
src/platform/config.ts, src/main.ts (D6)
```
The runbook drafts (`runbooks/local-production-stack.md`, `runbooks/backup-and-restore.md`, `runbooks/deploy-and-rollback.md`) are written in this change folder while building. `/dirox-kit:close-change` moves them to `okf/runbooks/`, and MOQ-29 extends them.

### D1. Settings folders and one way to run the stack (Decision record needed, with D5)
- **Three folders, each set by a variable with the server path as its default:**
  - `MOQ_ETC` (default `/etc/1moq`): the settings files;
  - `MOQ_BACKUP_DIR` (default `/var/backups/1moq`): the dumps;
  - `MOQ_STATE` (default `/var/lib/1moq`): the releases log.
- **Locally,** the developer points them to a git-ignored `.deploy-local/` folder at the repository root (`etc/`, `backups/`, `state/`), as the local runbook shows. The tests point them to temporary folders.
- **`deploy/lib.sh`**, sourced by every script, resolves the folders and builds the single compose command: `docker compose -f deploy/compose.yml --env-file "$MOQ_ETC/app.env" --env-file "$MOQ_ETC/release.env"`, with the project name from `COMPOSE_PROJECT_NAME` (default `moq`). The scripts, the tests and the developer therefore all start the stack the same way.

### D2. Container image
`deploy/Dockerfile`, built with the repository root as context (`docker build -f deploy/Dockerfile .`):
- **Stages:** a build stage on `node:24-bookworm-slim` (pinned to the Node 24 minor in use) enables pnpm through Corepack, runs `pnpm install --frozen-lockfile` and `pnpm build`. A production-dependencies stage runs `pnpm install --prod --frozen-lockfile`. The runtime stage copies `package.json`, the production `node_modules`, `src/`, `drizzle/` and `dist/web/`.
- **Runtime:** it sets only non-secret defaults (`NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`, `WEB_DIR=dist/web`), runs as the `node` user and starts `node src/main.ts`. Node 24 strips the types, as in local runs. Migrations stay at start (`drizzle-orm`'s migrator is a runtime dependency).
- **No secrets in the image:** no `ARG` or `ENV` names a secret, and nothing copies a settings file.
- **Build context:** a root `.dockerignore` excludes `.env`, `.env.*`, `**/*.env` (keeping `*.env.example`), `.deploy-local`, `.git`, `node_modules`, `dist`, `.claude`, `okf`, `openspec`, `tests`, `test-cases`.
- **Health in Compose:** the container healthcheck runs `node -e` with `fetch('http://127.0.0.1:3000/health')`, so the slim image needs no curl.

### D3. Production Compose file
`deploy/compose.yml`:
- **`app`:**
  - Image `${APP_IMAGE}:${IMAGE_TAG}`, both from `release.env`. Locally `APP_IMAGE=1moq-bot` with locally built tags; MOQ-29 sets the registry path. `pull_policy: missing`, so local tags are used as they are.
  - `env_file: ${MOQ_ETC:-/etc/1moq}/app.env`.
  - `DATABASE_URL=postgres://moq:${POSTGRES_PASSWORD}@postgres:5432/moq`, interpolated by Compose.
  - `PUBLIC_URL=https://${APP_DOMAIN}`.
  - `DRY_RUN: "true"` written in the file (D6).
  - It depends on `postgres` being healthy, and has the healthcheck from D2.
- **`postgres`:** `postgres:18` (same major as development and CI, pinned to a minor), data in a named volume, healthcheck `pg_isready`, no `ports:`.
- **`caddy`:** `caddy:2` (pinned to a minor), ports `${HTTP_PORT:-80}:80` and `${HTTPS_PORT:-443}:443` (TCP only; overridable when 80 and 443 are taken on the developer's machine, and by the tests), the `Caddyfile` mounted read-only, and certificates in a named volume.
- **All services:** `restart: unless-stopped`, and the `json-file` log driver with `max-size: 10m`, `max-file: 5`.
- **Passwords:** the PostgreSQL password is generated as hex (`openssl rand -hex 32`), so it needs no URL escaping inside `DATABASE_URL`.

### D4. HTTPS proxy and the address setting (Decision record needed)
- **`deploy/Caddyfile`:**
  - One site, `{$APP_DOMAIN}`, which runs `reverse_proxy app:3000` and adds a `Strict-Transport-Security` header.
  - The global options set `email {$ACME_EMAIL}` and HTTP/1.1 and HTTP/2 only (TCP 443).
  - Caddy redirects HTTP to HTTPS by default.
  - For `localhost`, Caddy issues the certificate from its own local authority. For a public name it would obtain and renew a Let's Encrypt certificate: that is proved in MOQ-29.
- **Address setting:** `APP_DOMAIN` in `app.env` is the only place the address is written.
  - The template holds the placeholder `app.1moq.example` (the `.example` top-level domain is reserved, so it can never resolve). Locally it is `localhost`.
  - Compose derives `PUBLIC_URL` from it for the app; `config.ts` does not read it yet.
- **Alternatives:**
  - nginx with certbot: two pieces, and renewal is a separate timer.
  - Traefik: more configuration for one site.

### D5. Settings files and secrets (Decision record needed, with D1)
- **The files:**
  - `app.env`: `POSTGRES_PASSWORD`, `APP_DOMAIN`, `ACME_EMAIL`, and later the secrets each ticket adds (the HMAC key, API keys, mailbox credentials).
  - `backup.env`: `BACKUP_RECIPIENT`, the backup **public** key.
  - `release.env`: `APP_IMAGE`, `IMAGE_TAG`.
- **Templates:** `deploy/*.env.example` hold placeholders only.
- **`.gitignore`** gains `.deploy-local/` and `deploy/*.env` with `!deploy/*.env.example`. Its current `.env` and `.env.*` lines do not match `app.env`.
- **The private key:** it never sits in `MOQ_ETC`, in the backup folder or in the repository. Locally, the developer keeps a test key pair outside the repository (runbook); the tests generate a throw-away pair in a temporary folder.
- **Logs:** `main.ts` prints only setting names. Fastify's default request log has method, URL and status, never headers or bodies. A test proves no secret value appears in the start-up output.

### D6. Dry-run setting
- **Values:** `DRY_RUN` is read by `loadConfig()` into `Config.dryRun: boolean`.
  - Unset or blank (blank counts as unset, as for every setting today): `true`.
  - Exactly `true`: `true`.
  - Exactly `false`: `false`.
  - Anything else (`0`, `no`, `FALSE`, `off`): `throw new SettingError('DRY_RUN', 'Invalid setting: DRY_RUN must be true or false')`. The message carries no value, and `main()` already prints it and exits 1.
- **Start-up log:** right after the settings load, `main()` logs one line: `Dry-run is on: every email goes to the internal test address` or `Dry-run is off: emails go to their recipients`.
- **Production stays on:** `deploy/compose.yml` sets `DRY_RUN: "true"` in the `app` service's `environment`, which wins over `env_file`. Turning it off needs a reviewed change to the repository (row 25), not an edit to a settings file. A repository test guards this.
- **Who applies it:** the send gate, when it is built, reads `config.dryRun`. The internal test address setting comes with it.
- **Alternatives:**
  - Defaulting to off outside production: one wrong value would send real email.
  - Accepting many spellings: a typo would silently pick a mode.

### D7. Encrypted backup (Decision record needed)
- **What it does:** `deploy/backup/backup.sh` (bash, `set -euo pipefail`, settings from `$MOQ_ETC/backup.env`) takes one dump per run. Running it daily is MOQ-29's timer; the script is the same.
  1. Stream `<compose> exec -T postgres pg_dump -U moq -Fc moq` through `age -r "$BACKUP_RECIPIENT"` into `$MOQ_BACKUP_DIR/moq-<UTC YYYYMMDDTHHMMSSZ>.dump.age.partial`. The dump covers the whole database, the pg-boss schema included.
  2. Check the file is not empty, and rename it to `.dump.age` (mode 0640).
  3. Only then delete dumps in that folder whose name timestamp is more than 30 days old.
  4. Log `backup: ok <file>` and exit 0.
  - On any error, a trap removes the `.partial` file, logs `backup: FAILED at <step>` to stderr and exits non-zero. Nothing unencrypted is ever written to disk.
- **Hooks for MOQ-29:** the exit code and the log lines are what its alerting (healthchecks.io pings around the script) and its timer use.
- **Encryption:** `age` with an X25519 key pair. Only the public key is in the stack, so whoever gets the stack or its settings cannot read any dump.
  - Rejected: `gpg` (heavier for the same result) and symmetric encryption (the key would sit next to the dumps).
- **No paid storage:** dumps stay in the backup folder. Off-server copies are MOQ-29's job (the person's decision).
- **Retention:** 30 days, so data erased from the database leaves the backups within about a month.

### D8. Restore
- **What it does:** `deploy/backup/restore.sh <dump> <private key file>` restores into the stack that `lib.sh` points to.
  1. Start `postgres` only and wait until it is healthy.
  2. **Refuse** if the database already has tables, so a mistake cannot overwrite a live database.
  3. Stream `age -d -i <key> <dump>` into `<compose> exec -T postgres pg_restore -U moq -d moq --exit-on-error`.
  4. Start the whole stack (the migrations apply nothing, or only newer ones) and wait for the app to be healthy.
  - Decryption happens where the script runs, so the key stays on the machine that holds it.
  - How MOQ-29 points the script at a remote server is its decision. One option: run it on the developer's machine with `DOCKER_HOST=ssh://…`, so the key never reaches the server.
- **Proof:** `backup/table-counts.sql` gives exact row counts for every table in every schema. The test compares its output before the backup and after the restore.

### D9. Release and rollback by image tag (Decision record needed)
- **CI:** `.github/workflows/image.yml` runs on every pull request and on `main`.
  - It builds the image, installs `age`, and runs `pnpm test:container`. It needs no `packages: write` permission.
  - `ci.yml` is unchanged, so `tests/ci-workflow.test.ts` keeps passing as is.
- **GHCR publishing moves to MOQ-29.** Nothing would pull a published image before a server exists, and publishing needs a write permission and a clean-up of old versions. MOQ-29 adds the publish step and sets `APP_IMAGE` to the registry path.
- **Tags:** locally, `docker build -f deploy/Dockerfile -t 1moq-bot:sha-<short commit> .`.
- **`deploy/deploy.sh <tag>|--previous`:**
  1. Runs `backup.sh` first and stops if it fails.
  2. Writes `IMAGE_TAG` into `$MOQ_ETC/release.env`.
  3. Runs `<compose> up -d app`.
  4. Waits up to 90 s for the app's healthcheck.
  5. Appends `<UTC time> <tag> ok|failed` to `$MOQ_STATE/releases.log`.
  - `--previous` picks the last `ok` tag before the current one. The database volume is never touched.
- **Migrations and rollback:** migrations are forward-only. A migration must keep working with the previous release's code (add first, remove in a later release), so a rollback runs old code on the newer schema. Drizzle's migrator then finds nothing newer to apply. A migration that cannot stay compatible must say so in its PR, and its rollback is a restore of the pre-deploy dump (D8).

### D10. Tests
- **`src/platform/config.test.ts` (unit):** the three dry-run outcomes, and that the invalid-value message has no value.
- **`src/main.int.test.ts` (integration):** spawns `node src/main.ts`:
  - the start-up line for each mode;
  - exit 1 naming `DRY_RUN` for an invalid value;
  - a `DATABASE_URL` with a marker password whose marker never appears in stdout or stderr.
- **`tests/deploy-config.test.ts` (unit):** reads the deploy files, as `tests/ci-workflow.test.ts` reads the workflow:
  - `DRY_RUN: "true"` in the `app` environment;
  - no `ports:` on `postgres` or `app`, and only 80 and 443 on `caddy`;
  - the Caddy site is `{$APP_DOMAIN}`, with no domain literal under `deploy/` except the placeholder in the template;
  - `env_file` comes from `MOQ_ETC`;
  - `.gitignore` and `.dockerignore` cover the settings files and `.deploy-local/`;
  - the templates hold placeholder values only.
- **Container tests** (a new Vitest project `container` for `tests/**/*.container.test.ts`):
  - **Setup:**
    - The project is excluded from `unit` and `integration` (whose `tests/**/*.test.ts` glob would otherwise pick it up) and run by `pnpm test:container`.
    - The tests need `IMAGE`, Docker with the Compose plugin, `bash` (Git Bash on Windows) and `age`. They fail with a clear message if any is missing, never skip.
    - A helper in `tests/container/` creates a temporary `MOQ_ETC`, `MOQ_BACKUP_DIR` and `MOQ_STATE`, a random PostgreSQL password, `APP_DOMAIN=localhost`, free random HTTP and HTTPS ports, a unique project name and an `age` key pair. It tears the stack down afterwards (`down -v`).
    - The tests run one file at a time, to keep CI memory and ports simple.
  - **`image.container.test.ts`:**
    - Starts the image alone with `postgres:18` on a private network and checks `/`, `/health`, the migrations table, the pg-boss schema, and that `docker top` shows one Node process.
    - Starts the image without `DATABASE_URL` and expects a non-zero exit with the setting's name and no value.
    - Inspects the image: no `.env*` file under the app folder, and no configuration environment variable whose name contains `PASSWORD`, `SECRET`, `TOKEN`, `KEY` or is `DATABASE_URL`.
  - **`stack.container.test.ts`:**
    - Starts the production stack through `lib.sh`. A plain HTTP request gets a permanent redirect whose `Location` is `https://localhost/…`.
    - It copies Caddy's local root certificate out (`docker cp`) and trusts it for an HTTPS request to `/health` on the published HTTPS port, with the name `localhost`, which answers 200.
    - `docker compose ps --format json` shows published ports on `caddy` only.
  - **`backup.container.test.ts`:**
    - Runs `backup.sh`. The new file starts with the `age` header (not `PGDMP`), and decrypted with the private key it is accepted by `pg_restore --list`.
    - A dummy dump named 31 days ago is removed, and one from yesterday is kept.
    - With `postgres` stopped, the script exits non-zero, stderr says `backup: FAILED`, and the folder gains no file.
  - **`restore.container.test.ts`:** seeds rows, records `table-counts.sql`, and backs up. It then starts a second project (an empty volume), runs `restore.sh`, and checks the counts are equal and `/health` answers 200 through the proxy. A restore into the now non-empty database is refused.
  - **`release.container.test.ts`:**
    - Tags `IMAGE` as the first tag, and builds a second, distinct image from it (a one-line Dockerfile adding a label, so the image ID differs).
    - Runs `deploy.sh` with the first tag, seeds rows, then `deploy.sh` with the second tag, and records the counts.
    - Runs `deploy.sh --previous`. The app container's image ID is the first tag's, `/health` answers 200, and the counts are unchanged.

### D11. Deferred to MOQ-29
The person's choices already made are carried to MOQ-29 and recorded there (its decision note replaces the hosting note planned here):
- **Server and cost:** Hetzner Cloud in Germany or Finland, the smallest plan with 2 vCPU and 4 GB, about €4 to 5 a month, no staging. Confirm the cost before buying. Budget alert: the provider's if it has one, otherwise the fixed monthly price and a monthly invoice check.
- **Access:** the provider firewall (TCP 22, 80 and 443 only) plus no published database port; a `deploy` user with key-only SSH; a server setup script; the internet port scan.
- **Domain:** the company domain, the DNS record, and the real Let's Encrypt certificate with its renewal.
- **Updates:** unattended security updates and a reboot at 02:00 to 02:30 UTC, outside current send windows; a status command showing the last update run.
- **Backups on the server:** a systemd timer running `backup.sh` daily, and healthchecks.io alerting on a failed or missing run.
- **Off-server copy:** pulling the dumps to the developer's machine, with its limits (a copy exists only as of the last pull, and nothing is pulled while that machine is off), and seeing the newest copy.
- **Release:** GHCR publishing and the server's read-only pull token.
- **Restore test:** restore on a blank real server, with its date and result recorded.
- **Location:** the EU location, and the question of backup copies outside the EU.

## Risks / Trade-offs

- [No off-server copy exists until MOQ-29] → There is no production data yet; the stack runs on the developer's machine only. MOQ-29 brings the pull before real leads are stored.
- [Ports 80 and 443 are taken on the developer's machine] → `HTTP_PORT` and `HTTPS_PORT` override the published ports. The redirect still points to `https://localhost/`, which is fine for a local check.
- [`age` or Git Bash missing on the developer's Windows machine] → The local runbook lists the installs (for example `winget install FiloSottile.age`). The tests fail with a clear message instead of skipping.
- [A real certificate is never exercised here] → The Caddyfile is the same; only the issuer differs. MOQ-29 proves Let's Encrypt and renewal.
- [Container tests are slow in CI] → One image build is reused by every file, files run one at a time, and the job is separate from `ci.yml`, so the main checks stay fast.
- [A rollback across an incompatible migration] → Compatible migrations by rule (D9), plus a dump before every deploy.
- [A restore run against a live database by mistake] → `restore.sh` refuses when the database already has tables.
- [Losing the private key makes every dump useless] → Locally the key is a throw-away test key. MOQ-29 sets how the real key is stored (two copies apart from the dumps).

## Migration Plan

Big change: no code before this proposal PR is merged.
1. Build the settings, image, stack, scripts, workflow and tests (tasks 1 to 5), merged through the code PR with CI green.
2. The developer runs the local runbook once by hand to check it reads right.
3. Nothing is deployed. MOQ-29 takes the same files to a real server.

To undo: revert the PR; nothing outside the repository depends on it.

## Open Questions

None.
