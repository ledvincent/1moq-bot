Jira: MOQ-3
Size: big
Difficulty: tricky
Tier: heavy

# MOQ-3: Cloud deployment

## Why

The scaffold (MOQ-2) only runs on the developer's machine. Sending, follow-ups and unsubscribe must work while the owner's Mac is off, so the tool needs its always-on EU server (`okf/decisions/MOQ-1-cloud-web-service.md`). This is row 2 of the MOQ-1 kickoff backlog. It blocks sign-in (MOQ-4) and the footer and unsubscribe page (MOQ-18), which need a public HTTPS address. It also settles what the knowledge left to this row: the hosting provider, the subdomain, staging, where backups go and how long they are kept, automatic security updates, a tested restore, and the confirmed monthly cost.

## What Changes

- One container image (web server, job worker and migrations in one process, as today), built from the repository with no secrets inside it.
- A production setup in a new `deploy/` folder: the app, PostgreSQL 18 and an HTTPS reverse proxy on one small Hetzner Cloud server in Germany or Finland. Only HTTPS, the HTTP redirect and SSH are reachable from the internet.
- The public address is a setting (`app.<company domain>`; placeholder `app.1moq.example`), never written into the code. The proxy and its HTTP-to-HTTPS redirect are tested locally with a local certificate. With the real domain, the free certificate is obtained and renewed automatically.
- Secrets live on the server, outside the repository and the image. A missing required one stops the start and names it (the existing "Required settings checked at start" rule).
- A dry-run setting that fails closed: on unless it is explicitly turned off, an invalid value stops the start, and the mode is logged at start. The production setup keeps it on. Nothing sends email yet: the send gate (a later ticket) will apply it.
- Backups:
  - Every day the server dumps the database, encrypts the dump with a key whose private half is not on the server, and keeps 30 days of dumps on the server. A failed or missing dump alerts the developer.
  - The developer pulls the encrypted dumps to their own machine with a script, and can see the date of the newest copy there.
  - No paid backup storage, as the person decided.
- A restore procedure from a pulled copy onto a blank server, tested once, with the date and result recorded.
- Automatic security updates on the server, with a way for the developer to see when they last ran.
- Release and rollback: each release is a tagged image, and redeploying the previous tag undoes a release without touching the data.
- The server's cost is confirmed against the provider's price (at most €10 a month, mailbox excluded; about €4 to 5 expected) before anything is bought, with a budget alert or its fallback.
- No staging environment: production in dry-run is the safe environment until go-live (row 25), and local Docker Compose is the place to try things.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `platform`: ADDED requirements for the production container image, the dry-run setting, keeping secrets out of the repository, image and logs, the public address over HTTPS, the daily backup and its off-server copy, restore, security updates, release and rollback, and hosting cost and location. Existing requirements are unchanged.

## Out of scope

- The send gate and the internal test address that dry-run sends to: the sending tickets add them. This change adds only the setting, its check and its start-up log.
- Turning dry-run off in production: go-live, row 25. No feature ticket does it.
- Sign-in (MOQ-4). Until it lands, the public address must not show lead data. The UI shell holds none, but MOQ-4 should be deployed before any feature that shows lead data.
- Creating the DNS record. Whoever controls the company domain adds it at deploy time; the company domain is still unknown (see Open questions).
- Buying or running the company mailbox and its domain: the external mailbox and domain ticket.
- Off-server object storage for backups, a staging server, uptime monitoring of `/health`, and the provider's own server snapshots (see "Considered, not needed").
- Writing `okf/` files: the decision notes and runbooks listed in Impact are written at `/dirox-kit:close-change`.

## Impact

- New:
  - `deploy/`: Dockerfile, production Compose file, reverse-proxy config, settings templates with placeholders only, server setup, deploy and rollback script, backup script with its systemd timer, the developer's pull and restore scripts, unattended-upgrades config, status script.
  - `.dockerignore`.
  - `.github/workflows/image.yml`: builds and tests the image on each PR, and publishes a tagged image to GHCR from `main`.
  - `tests/container/` (container and local proxy tests) and `tests/deploy-config.test.ts`.
- Edited: `src/platform/config.ts` (dry-run setting), `src/main.ts` (logs the mode at start), `vitest.config.ts` and `package.json` (a `container` test project and `test:container` script), `.gitignore` (server settings files), `.claude/CLAUDE.md` (hosting provider line, deploy commands).
- Unchanged: `.github/workflows/ci.yml`, `.github/workflows/dirox-checks.yml`, `docker-compose.yml` (local only).
- People:
  - The developer buys the server after the cost check, creates the healthchecks.io account, keeps the backup decryption key and a copy of the server secrets off the server and apart from the pulled dumps, pulls the backups, and runs the manual checks.
  - Whoever controls the company domain adds the DNS record.
- Services: Hetzner (host, a processor holding personal data in the EU). Free and approved by the person: healthchecks.io (receives pings only) and GHCR (holds the image, no personal data). The processor list is updated at close-change (`okf/decisions/MOQ-1-personal-data-handling.md`). Pulled backups on the developer's machine raise an open question (see Open questions).
- Knowledge (at close-change):
  - New decisions: `okf/decisions/MOQ-3-hosting-and-backups.md` and `okf/decisions/MOQ-3-release-and-rollback.md`.
  - New runbooks: `okf/runbooks/server-setup.md`, `okf/runbooks/deploy-and-rollback.md`, `okf/runbooks/backup-and-restore.md`. They are drafted in this change's `runbooks/` folder while building and moved at close-change.
  - Updates: `okf/architecture/overview.md` (Deployment, External services), `okf/architecture/tech-stack.md` (Packaging, production PostgreSQL), `okf/decisions/MOQ-1-cloud-web-service.md` (consequences settled), `okf/decisions/MOQ-1-send-gate.md` (the dry-run setting it applies).

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source | Scenario |
|---|---|---|---|
| 1 | WHEN the container image is built and started with the required settings and a reachable PostgreSQL THEN it serves the UI at `/` and `GET /health` answers 200 (one image, web and worker in one process, migrations at start) | Jira summary; decision MOQ-1-cloud-web-service; architecture overview "Release and rollback" | Container image serves the UI and health |
| 2 | WHEN dry-run is unset THEN it is on (fail closed) and the start-up log says so; WHEN it is explicitly set off THEN it is off; WHEN its value is anything else THEN the service refuses to start with a message naming the setting | Jira summary; decision MOQ-1-send-gate; CLAUDE.md project rule "Production stays in dry-run"; answer from the person | Dry-run on when unset; Dry-run off when set off; Invalid dry-run value refuses to start; Production deploy keeps dry-run on |
| 3 | WHEN the repository, the image or the logs are inspected THEN they hold no secret values: secrets are provided on the server outside the repo and the build context excludes `.env`; a missing required production secret stops the start, naming it | Jira summary; Dirox rule "Never commit secrets"; spec platform "Required settings checked at start" | Server secrets stay outside the repository; Image holds no secret values; Start-up log holds no setting values; Container without a required secret refuses to start |
| 4 | WHEN the owner or anyone reaches the public subdomain over HTTP THEN they are redirected to HTTPS with a valid free certificate that renews automatically; WHEN scanned from the internet THEN only HTTPS, the HTTP redirect and SSH answer, and the PostgreSQL port is closed. The proxy and redirect are tested locally with a local certificate; the real certificate and its renewal are proved only once the company domain exists | Jira summary; decision MOQ-1-cloud-web-service; answers from the person (subdomain is a setting; local proxy test) | Public address comes from a setting; Proxy redirects to HTTPS with a local certificate; HTTP redirects to HTTPS; Certificate renews automatically; Only web and SSH ports answer |
| 5 | WHEN the daily backup runs THEN an encrypted dump is on the server and copies older than 30 days are removed; WHEN a backup fails or is missing THEN the developer is alerted; WHEN the developer runs the pull script THEN the new encrypted dumps are on their machine | Jira description; decisions MOQ-1-cloud-web-service and MOQ-1-personal-data-handling; answers from the person (daily, encrypted, 30 copies; no paid storage, dumps downloaded to the developer's machine) | Daily backup is encrypted on the server; Server dumps older than 30 days are removed; Failed or missing backup alerts the developer; Pull copies new dumps to the developer's machine |
| 6 | WHEN the documented restore procedure is followed on a blank server with a pulled copy THEN the database is rebuilt, including the do-not-contact data, and `/health` answers 200; the procedure was tested once and its date and result recorded | Jira description; decision MOQ-1-cloud-web-service ("restore procedure tested in row 2"); answer from the person | Restore on a blank server |
| 7 | WHEN security updates are published for the server THEN they are applied automatically, and the developer can see the last update run | Jira description; architecture overview "Upkeep" | Security updates applied automatically |
| 8 | WHEN a new release misbehaves THEN redeploying the previous image restores the previous version and the data is unchanged | architecture overview "Release and rollback" | Redeploy the previous image |
| 9 | WHEN the server's cost is confirmed THEN its monthly price is at most €10, recorded with the provider's price before anything is bought, and a budget alert is set (or, if the provider offers none, the fixed monthly price and a monthly invoice check are recorded) | Jira description; decision MOQ-1-cloud-web-service (budget); answer from the person (no paid backup storage) | Costs confirmed within budget before purchase |
| 10 | WHEN the server is created THEN it is in an EU region | decision MOQ-1-personal-data-handling; answer from the person (Hetzner Germany or Finland) | Server in the EU |

Scenarios for criteria 4 to 10 that need the real server, the real domain or the developer's machine (public HTTPS, port scan, backup, pull, restore, updates, rollback, cost, location) are proved by recorded manual checks, not CI tests: see `tasks.md`, Proof.

### Considered, not needed

- Off-server object storage for backups (Backblaze B2, Hetzner Object Storage): deferred for cost and build effort, as the person decided. The developer's pulled copies are the only off-server copy for now. Revisit when the data or the risk grows (for example at go-live, row 25).
- Staging server: not needed at first (answer from the person). One user, low cost; production stays in dry-run until row 25, and local Docker Compose covers trials.
- Uptime monitoring of `/health` from outside: no criterion asks for it; the free healthchecks.io account can add it later at no cost.
- The provider's own server snapshots (an extra charge): not wanted while backups stay unpaid. Snapshots would also hold unencrypted data with the same provider.
- A managed PostgreSQL service: ruled out by `okf/decisions/MOQ-1-postgresql-store-and-queue.md` (same server) and the budget; PostgreSQL stays (answer from the person).
- Building the image on the server: the image tested in CI would then not be the one deployed, and rollback would depend on what is still cached there.
- An HMAC secret and do-not-contact table: they come with the compliance tickets. The restore procedure already restores every table and takes the server secrets from the developer's off-server copy, so the do-not-contact data and its secret come back together once they exist.
- A secret scanner in CI: `dirox-checks` and `.gitignore` already guard the repository; this change adds tests on the deploy files and the image instead.

### Open questions

- **Company domain unknown.** The public address is `app.<company domain>`, with `app.1moq.example` as the placeholder. The real domain is set at deploy time and the DNS record is added by whoever controls it. Until then, the scenarios "HTTP redirects to HTTPS" and "Certificate renews automatically" stay open in the PR. The proxy and redirect are proved locally meanwhile.
- **Budget alert, to confirm.** The person has not answered. The fallback written in the design: set the provider's budget alert if Hetzner offers one; otherwise record the server's fixed monthly price (which caps the bill) and set a monthly invoice check.
- **Personal data on the developer's machine.** The pulled backup copies sit on the developer's machine, probably outside the EU (Vietnam). That is a transfer of leads' personal data out of the EU. `okf/decisions/MOQ-1-personal-data-handling.md` says "Hosting and the database are in the EU" and lists "Hosting outside the EU" as rejected; it says nothing about backup copies. The copies are encrypted at rest, with the key kept apart from them. This is not a blocker for this change: it is recorded here and in the personal-data decision, and goes into the legal check planned before go-live (kickoff open question 9). If that check says the copies must stay in the EU, the pull target changes (an EU machine or EU storage), not the server side of this design.

## Jira acceptance criteria

Read from MOQ-3 on 2026-10-25 22:50
- WHEN the container image is built and started with the required settings and a reachable PostgreSQL THEN it serves the UI at `/` and `GET /health` answers 200 (one container image, web and worker in one process, migrations at start)
- WHEN dry-run is unset THEN it is on (fail closed) and the start-up log says so; WHEN it is explicitly set off THEN it is off; WHEN its value is anything else THEN the service refuses to start with a message naming the setting
- WHEN the repository, the image or the logs are inspected THEN they hold no secret values: secrets are provided on the server outside the repo and the build context excludes `.env`; a missing required production secret stops the start, naming it
- WHEN the owner or anyone reaches the public subdomain over HTTP THEN they are redirected to HTTPS with a valid free certificate that renews automatically; WHEN scanned from the internet THEN only HTTPS, the HTTP redirect and SSH answer, and the PostgreSQL port is closed (the proxy and redirect are tested locally with a local certificate; the real certificate and its renewal are proved once the company domain exists)
- WHEN the daily backup runs THEN an encrypted dump is on the server and copies older than 30 days are removed; WHEN a backup fails or is missing THEN the developer is alerted; WHEN the developer runs the pull script THEN the new encrypted dumps are on their machine
- WHEN the documented restore procedure is followed on a blank server with a pulled copy THEN the database is rebuilt, including the do-not-contact data, and `/health` answers 200; the procedure was tested once and its date and result recorded
- WHEN security updates are published for the server THEN they are applied automatically, and the developer can see the last update run
- WHEN a new release misbehaves THEN redeploying the previous image restores the previous version and the data is unchanged
- WHEN the server's cost is confirmed THEN its monthly price is at most €10, recorded with the provider's price before anything is bought, and a budget alert is set (or, if the provider offers none, the fixed monthly price and a monthly invoice check are recorded)
- WHEN the server is created THEN it is in an EU region
