---
type: Decision
title: Settings and secrets live in files outside the repository, one compose command runs the stack
description: The production settings (app.env, backup.env, release.env) live in a folder outside the repository - /etc/1moq on the server, a git-ignored .deploy-local/ locally - with placeholder-only templates in deploy/, and deploy/lib.sh builds the one compose command every script, test and person uses
owner: ledvincent
status: stable
tags: [deployment, secrets]
---
# Settings and secrets live in files outside the repository, one compose command runs the stack

Date: 2026-10-26 · Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/` (design D1 and D5)

## Context

The production stack needs a database password, the public address and, later, API keys, the mailbox credentials and the do-not-contact HMAC key. None of these may be in the repository, the image or the logs. The same stack must run on the developer's machine now and on the server later (MOQ-29) without editing the scripts.

## Decision

- **Three folders, each set by a variable whose default is the server path:** `MOQ_ETC` (`/etc/1moq`, the settings files), `MOQ_BACKUP_DIR` (`/var/backups/1moq`, the dumps), `MOQ_STATE` (`/var/lib/1moq`, the releases log). Locally they point to the git-ignored `.deploy-local/`; tests use temporary folders.
- **Three settings files:** `app.env` (`POSTGRES_PASSWORD`, `APP_DOMAIN`, `ACME_EMAIL`, and the secrets later tickets add), `backup.env` (`BACKUP_RECIPIENT`, the backup **public** key), `release.env` (`APP_IMAGE`, `IMAGE_TAG`). The templates `deploy/*.env.example` hold placeholders only. `.gitignore` and `.dockerignore` keep real settings files out of the repository and the image.
- **One command:** `deploy/lib.sh` resolves the folders and defines `moq_compose` (`docker compose -f deploy/compose.yml --env-file $MOQ_ETC/app.env --env-file $MOQ_ETC/release.env`). The scripts, the container tests and the runbooks all start the stack through it.
- **Logs** carry setting names only, never values. A missing or invalid setting stops the start with its name.
- The backup **private** key is never in `MOQ_ETC`, the backup folder or the repository ([encrypted backups](/decisions/MOQ-3-encrypted-backups-with-age.md)).

## Alternatives considered

- **A secrets manager (Vault, a cloud provider's store):** a paid or extra service for one server and a handful of values; ruled out by the €10 budget.
- **Docker secrets (Swarm):** needs Swarm mode for one container.
- **Settings in the repository, encrypted (sops):** another tool and key to manage, and the encrypted values would still travel with every clone.

## Consequences

- A new secret is a new line in `app.env` and its template, never a code or image change.
- The server's `/etc/1moq/` must be backed up apart from the database dumps (MOQ-29); losing it means re-creating the secrets.
- The app container receives every line of `app.env` as an environment variable, `POSTGRES_PASSWORD` included. Nothing logs it, but splitting the files per service is an option if that matters later.
- Runbooks: [Run the production stack locally](/runbooks/local-production-stack.md).
