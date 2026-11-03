---
type: Decision
title: Caddy is the HTTPS proxy and the only service that publishes ports
description: Caddy in front of the app terminates HTTPS, redirects HTTP, and gets and renews certificates by itself (Caddy's local authority for localhost, Let's Encrypt for a public name); the address comes only from the APP_DOMAIN setting, and PostgreSQL and the app publish no port
owner: ledvincent
status: stable
tags: [deployment, https]
---
# Caddy is the HTTPS proxy and the only service that publishes ports

Date: 2026-10-26 · Jira: MOQ-3 · Change: `openspec/changes/archive/moq-3-cloud-deployment-2026-10-26/` (design D4)

## Context

The owner's UI, sign-in and the unsubscribe page must be served over HTTPS with a free certificate. The public address does not exist yet (no company domain); the same files must work on `localhost` now and on the real name later (MOQ-29).

## Decision

- **Caddy 2** (`caddy:2.11`) in the production Compose stack, with one site `{$APP_DOMAIN}` that runs `reverse_proxy app:3000` and adds `Strict-Transport-Security`. HTTP is redirected to HTTPS; HTTP/1.1 and HTTP/2 only.
- **Certificates:** for `localhost`, Caddy's own local authority; for a public name, Caddy obtains and renews a Let's Encrypt certificate (`ACME_EMAIL`), proved in MOQ-29. Certificates live in a named volume.
- **Only Caddy publishes host ports** (80 and 443, overridable with `HTTP_PORT` and `HTTPS_PORT`). The app and PostgreSQL publish none. A repository test guards this.
- **The address is a setting:** `APP_DOMAIN` in `app.env` is the only place it is written; Compose derives `PUBLIC_URL=https://$APP_DOMAIN` for the app. The template holds `app.1moq.example`, which can never resolve.

## Alternatives considered

- **nginx with certbot:** two pieces, and renewal is a separate timer to keep running.
- **Traefik:** more configuration for a single site.
- **Publishing the app's port 3000 directly:** no HTTPS, and the database-facing service would be exposed.

## Consequences

- Going live on a real name is a settings change (`APP_DOMAIN`, `ACME_EMAIL`) plus DNS, not a code change.
- Locally the browser warns once about Caddy's local certificate; on Windows, Git Bash's curl needs `--ssl-no-revoke` ([Run the production stack locally](/runbooks/local-production-stack.md)).
- For day-to-day UI work, `pnpm dev` on http://localhost:3000 stays the development path; the stack behind Caddy is for checking what the server will run.
