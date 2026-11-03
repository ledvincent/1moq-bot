---
type: Runbook
title: Run the production stack on the developer's machine
description: Install the tools, create the git-ignored .deploy-local settings, build and tag the image, start and stop the app, PostgreSQL and Caddy stack, and open it at https://localhost
owner: ledvincent
status: stable
tags: [deployment, local]
---
# Run the production stack on the developer's machine

Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/`

The same image, `deploy/compose.yml`, `deploy/Caddyfile` and scripts that the server will run (MOQ-29), started locally with `APP_DOMAIN=localhost` and Caddy's local certificate authority. Commands are for bash (Git Bash on Windows), run from the repository root.

## 1. Install the tools (once)

- Docker with the Compose plugin: Docker Desktop on Windows or macOS. Check: `docker compose version`
- Git Bash (Windows): comes with Git for Windows. Check: `bash --version`
- age: `winget install FiloSottile.age` (Windows), `sudo apt-get install age` (Debian or Ubuntu), `brew install age` (macOS). Check: `age --version`
- openssl, for the password: comes with Git Bash. Check: `openssl version`

## 2. Create the local settings folder (once)

`.deploy-local/` is git-ignored. Never copy a real secret into the repository or the templates.

```bash
mkdir -p .deploy-local/etc .deploy-local/backups .deploy-local/state
cp deploy/app.env.example .deploy-local/etc/app.env
cp deploy/backup.env.example .deploy-local/etc/backup.env
cp deploy/release.env.example .deploy-local/etc/release.env
```

Then edit `.deploy-local/etc/app.env`:
- `POSTGRES_PASSWORD=` the output of `openssl rand -hex 32`
- `APP_DOMAIN=localhost`
- `ACME_EMAIL=` any address of yours (not used for `localhost`)

`backup.env` needs the backup public key: see [Back up and restore](/runbooks/backup-and-restore.md), step 1.

## 3. Point the scripts to the local folder (each shell)

```bash
export MOQ_ETC="$PWD/.deploy-local/etc" MOQ_BACKUP_DIR="$PWD/.deploy-local/backups" MOQ_STATE="$PWD/.deploy-local/state"
source deploy/lib.sh
```

`moq_compose` is now the one command that runs the stack. If ports 80 or 443 are taken on your machine, also `export HTTP_PORT=8080 HTTPS_PORT=8443`.

## 4. Build and tag the image

```bash
docker build -f deploy/Dockerfile -t "1moq-bot:sha-$(git rev-parse --short HEAD)" .
```

Write that tag into `.deploy-local/etc/release.env` (`APP_IMAGE=1moq-bot`, `IMAGE_TAG=sha-<short commit>`) for the first start. Later releases go through `deploy/deploy.sh` ([Deploy and roll back](/runbooks/deploy-and-rollback.md)).

## 5. Start, check and stop

- Start: `moq_compose up -d`
- Status: `moq_compose ps` (the app shows `healthy` after about a minute)
- Logs: `moq_compose logs -f app`
- Open `https://localhost` (or `https://localhost:8443`). The browser warns once: the certificate comes from Caddy's local authority. To trust it, copy the root out with `moq_compose exec -T caddy cat /data/caddy/pki/authorities/local/root.crt > .deploy-local/caddy-root.crt` and import it into your browser or system store.
- Check the health: `curl --cacert .deploy-local/caddy-root.crt https://localhost/health`. In Git Bash on Windows, add `--ssl-no-revoke`: its curl asks Windows to check revocation, which Caddy's local authority cannot answer (`CERT_TRUST_REVOCATION_STATUS_UNKNOWN`).
- The start-up log says `Dry-run is on`: the stack always runs in dry-run.
- Stop, keeping the data: `moq_compose down`
- Remove everything, data included: `moq_compose down -v`

## 6. Run the automated checks of the stack

```bash
docker build -f deploy/Dockerfile -t 1moq-bot:local .
IMAGE=1moq-bot:local pnpm test:container
```

They start their own stacks with temporary folders and random ports, and remove them afterwards.
