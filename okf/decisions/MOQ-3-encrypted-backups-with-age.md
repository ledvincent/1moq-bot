---
type: Decision
title: Database backups are age-encrypted dumps, kept 30 days, readable only with a private key held outside the stack
description: backup.sh streams pg_dump through age to the backup public key, so nothing unencrypted touches disk, keeps dumps 30 days and fails loudly with no partial file; restore.sh decrypts where the private key is and refuses a non-empty database
owner: ledvincent
status: stable
tags: [deployment, backup, personal-data]
---
# Database backups are age-encrypted dumps, kept 30 days, readable only with a private key held outside the stack

Date: 2026-10-26 · Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/` (design D7 and D8)

## Context

The database holds leads' business contacts and the do-not-contact hashes ([personal data](/decisions/MOQ-1-personal-data-handling.md)) and the job queue ([PostgreSQL store and queue](/decisions/MOQ-1-postgresql-store-and-queue.md)). A backup must not become a readable copy of that data for whoever gets the server or its backup folder, must not grow forever, and must restore exactly. Paid backup storage was deferred by the person (budget); off-server copies come with MOQ-29.

## Decision

- **`deploy/backup/backup.sh`:** `pg_dump -Fc` of the whole database (every schema, pg-boss included) is streamed through `age -r $BACKUP_RECIPIENT` into a `.partial` file, checked non-empty, then renamed `moq-<UTC timestamp>.dump.age`. Only after that, dumps older than 30 days are deleted. Any failure removes the partial file, logs `backup: FAILED at <step>` and exits non-zero.
- **Encryption:** `age` with an X25519 key pair. Only the **public** key is in the stack (`backup.env`); the private key stays on the machine that restores, never in the settings folder, the backup folder or the repository.
- **`deploy/backup/restore.sh <dump> <key>`:** starts PostgreSQL alone, refuses if the database already has tables, decrypts locally and pipes into `pg_restore --exit-on-error`, then starts the stack. Row counts of every table must match the backup, except pg-boss's worker list `pgboss.instance`, which gains a row at each start.
- **Retention:** 30 days, so data erased from the database leaves the backups within about a month.

## Alternatives considered

- **gpg:** heavier to set up and script for the same result.
- **Symmetric encryption:** the key would sit next to the dumps on the server.
- **A provider's server snapshots or a managed backup service:** paid, and the snapshot would not be encrypted with a key the server lacks.

## Consequences

- Losing the private key makes every dump unreadable: it must be kept in at least two safe places (MOQ-29 settles where).
- Dumps stay on the same server until MOQ-29 adds an off-server copy; a lost server loses the backups too until then.
- `deploy/deploy.sh` runs a backup before every release, so each rollback has a fresh dump.
- Runbook: [Back up and restore](/runbooks/backup-and-restore.md).
