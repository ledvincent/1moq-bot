---
type: Runbook
title: Deploy a release and roll it back
description: Build and tag an image, deploy the tag with deploy/deploy.sh (backup first, health check, releases log), roll back with --previous, and the rule that keeps migrations compatible with the previous release
owner: ledvincent
status: draft
tags: [deployment, release]
---
# Deploy a release and roll it back

Jira: MOQ-3 · Change: `openspec/changes/moq-3-cloud-deployment/`

A release is a container image identified by its tag. Locally, first follow `local-production-stack.md` steps 1 to 5 (the stack is running, the variables are set). On the server the image comes from a registry: MOQ-29 adds the publishing and sets `APP_IMAGE`.

## Deploy a tag

```bash
docker build -f deploy/Dockerfile -t "1moq-bot:sha-$(git rev-parse --short HEAD)" .
bash deploy/deploy.sh "sha-$(git rev-parse --short HEAD)"
```

`deploy.sh`:
1. runs `deploy/backup/backup.sh` and stops if it fails (nothing is deployed);
2. writes `IMAGE_TAG` into `$MOQ_ETC/release.env`;
3. replaces the app container (`moq_compose up -d app`); PostgreSQL, Caddy and the data stay;
4. waits up to 90 seconds for the app to be healthy;
5. appends `<UTC time> <tag> ok|failed` to `$MOQ_STATE/releases.log`, prints `deploy: ok <tag>`, or exits non-zero with `deploy: FAILED …`.

Check: `moq_compose ps` shows the app `healthy`, and `tail $MOQ_STATE/releases.log` shows the tag `ok`.

## Roll back

```bash
bash deploy/deploy.sh --previous
```

It deploys the last tag recorded `ok` before the current one, the same way (backup first), and keeps the data. To go to a specific older tag, run `bash deploy/deploy.sh <tag>`.

## Migrations and rollback

- Migrations are forward-only and run at the app's start.
- A migration must keep working with the previous release's code: add first, remove in a later release. A rollback then runs the old code on the newer schema, and the migrator finds nothing newer to apply.
- A migration that cannot stay compatible says so in its PR. Its rollback is a restore of the dump taken just before the deploy (`backup-and-restore.md`, step 3).
