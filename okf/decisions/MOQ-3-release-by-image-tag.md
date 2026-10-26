---
type: Decision
title: A release is an image tag, deployed and rolled back with deploy.sh, with migrations kept compatible with the previous release
description: Each release is a container image tag; deploy.sh backs up, switches the tag, waits for health and logs the result, --previous rolls back without touching the data, and every migration must keep working with the previous release's code
owner: ledvincent
status: stable
tags: [deployment, release]
---
# A release is an image tag, deployed and rolled back with deploy.sh, with migrations kept compatible with the previous release

Date: 2026-10-26 · Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/` (design D9)

## Context

The [cloud web service](/decisions/MOQ-1-cloud-web-service.md) runs one container. A bad release must be undone in minutes without losing planned sends or the do-not-contact list, and the image tested in CI must be the one that runs.

## Decision

- **CI:** `.github/workflows/image.yml` builds the image and runs shellcheck and the container tests (`pnpm test:container`) on every pull request and on `main`. Publishing to a registry (GHCR) waits for MOQ-29, which sets `APP_IMAGE` to the registry path.
- **Tags:** `sha-<short commit>`; locally built with `docker build -f deploy/Dockerfile -t 1moq-bot:sha-<commit> .`.
- **`deploy/deploy.sh <tag>|--previous`:** runs `backup.sh` first and stops if it fails, writes `IMAGE_TAG` into `release.env`, restarts only the app, waits up to 90 s for its health check, and appends `<time> <tag> ok|failed` to `$MOQ_STATE/releases.log`. `--previous` picks the last `ok` tag that is not the current one. The database volume is never touched.
- **Migrations are forward-only and compatible with the previous release** (add first, remove in a later release), so a rollback runs old code on the newer schema. A migration that cannot stay compatible says so in its PR; its rollback is a restore of the pre-deploy dump.

## Alternatives considered

- **Building the image on the server:** the image tested in CI would not be the one deployed, and rollback would depend on what is still cached there.
- **Down migrations on rollback:** they risk data loss and are rarely tested; a compatible schema plus a pre-deploy dump is safer.
- **A staging server:** extra cost for one user; the local production stack and CI cover it for now.

## Consequences

- Every migration PR must be reviewed for compatibility with the previous release.
- Running `--previous` twice switches back to the release just left, it does not walk further back; name the tag for that.
- Runbook: [Deploy and roll back](/runbooks/deploy-and-rollback.md).
