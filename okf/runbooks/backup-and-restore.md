---
type: Runbook
title: Back up and restore the production database
description: Create the age key pair and keep the private key apart, run the encrypted backup, restore a dump into an empty stack and compare the row counts of every table
owner: ledvincent
status: stable
tags: [deployment, backup]
---
# Back up and restore the production database

Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/`

Dumps are encrypted with `age`: the stack holds only the public key, so nobody who gets the stack, its settings or its backup folder can read a dump. Locally, first follow [Run the production stack locally](/runbooks/local-production-stack.md) steps 1 to 3 (the variables and `source deploy/lib.sh`). On the server, the defaults (`/etc/1moq`, `/var/backups/1moq`, `/var/lib/1moq`) apply; MOQ-29 adds the daily timer and the alerting.

## 1. Create the key pair (once)

```bash
mkdir -p ~/1moq-keys
age-keygen -o ~/1moq-keys/backup.key
```

- It prints `Public key: age1…`. Put that line's key into `$MOQ_ETC/backup.env` as `BACKUP_RECIPIENT=age1…`.
- The private key file stays outside the repository, outside `$MOQ_ETC` and outside the backup folder. Without it no dump can be read, so keep a second copy apart (for the real key, MOQ-29 sets where).
- Locally this is a throw-away test key.

## 2. Run a backup

```bash
bash deploy/backup/backup.sh
```

- Success: `backup: ok <folder>/moq-<UTC time>.dump.age`, exit 0. Dumps older than 30 days are then removed.
- Failure: `backup: FAILED at <step>` on stderr, a non-zero exit, and no new file in the folder. Steps: `settings` (missing `backup.env` or `age`), `folder`, `dump` (PostgreSQL not running or `pg_dump` failed), `check`, `rename`, `rotate`.
- `deploy/deploy.sh` runs a backup before every release.

## 3. Restore into an empty stack

The restore refuses a database that already has tables, so it cannot overwrite a live one.

1. Point the variables to a fresh stack: a new `COMPOSE_PROJECT_NAME` (for example `export COMPOSE_PROJECT_NAME=moq-restore`) or, for the same project, remove the old data first with `moq_compose down -v`. Keep `app.env` and `release.env` in `$MOQ_ETC`.
2. Record the counts of the source database before, if it still runs: `moq_compose exec -T postgres psql -U moq -d moq -tA -F ' ' < deploy/backup/table-counts.sql > counts-before.txt`
3. Restore: `bash deploy/backup/restore.sh <dump file> ~/1moq-keys/backup.key`. It starts PostgreSQL, decrypts the dump on this machine into `pg_restore`, starts the whole stack and waits for the app to be healthy, then prints `restore: ok`.
4. Compare: run the same `table-counts.sql` command into `counts-after.txt`, then `diff counts-before.txt counts-after.txt` shows nothing.
5. Check: `curl --cacert .deploy-local/caddy-root.crt https://localhost/health` answers 200.
