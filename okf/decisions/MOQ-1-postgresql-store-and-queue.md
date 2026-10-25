---
type: Decision
title: PostgreSQL is the only data store and holds the job queue
description: PostgreSQL on the same server as the service holds all data and the background job queue, with a daily backup kept off the server, so a restart never loses a planned send and the do-not-contact list is never lost
owner: ledvincent
status: stable
tags: [architecture, database, kickoff]
---
# PostgreSQL is the only data store and holds the job queue

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The data is small (a few MB a month, thousands of rows a year). The budget is at most €10 a month for everything ([cloud web service](/decisions/MOQ-1-cloud-web-service.md)). Planned sends must survive a restart, and planning, claiming and recording a send must be atomic ([send gate](/decisions/MOQ-1-send-gate.md)). The do-not-contact list must never be lost.

## Decision

PostgreSQL runs on the same server as the service, not as a managed database. It is the only data store. Background jobs live in the same database (a PostgreSQL-backed queue; the library is chosen in row 1). Planning, claiming and recording a send happen in database transactions. A daily backup is kept off the server.

## Alternatives considered

- **Managed PostgreSQL.** Backups and patching handled by the provider, but it costs about as much as the whole budget allows.
- **SQLite on a disk volume.** Free and simple, but backups have to be built by hand (and the do-not-contact list must never be lost), and only one writer is allowed. It would be the pick for a service on the Mac.
- **A Redis-based queue.** One more service to host and back up.
- **In-process timers.** Jobs are lost on restart, and two instances would send twice.

## Consequences

- One service to back up and restore; a restart never loses a planned send.
- The team runs the database: automatic security updates, the off-server backup and a restore procedure tested in row 2 (backup retention also set in row 2).
- The backup holds lead data and the do-not-contact hashes; row 2 chooses where it is kept ([personal data handling](/decisions/MOQ-1-personal-data-handling.md) puts hosting and the database in the EU).
- No second store or queue may be added without a new decision.
