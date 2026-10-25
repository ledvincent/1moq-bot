---
type: Decision
title: The page is served by an always-on web service in the cloud
description: One web service on a small always-on EU server serves the owner's UI and runs all background work, so emails, follow-ups and unsubscribe work while the owner's Mac is off, within €10 a month
owner: ledvincent
status: stable
tags: [architecture, hosting, kickoff]
---
# The page is served by an always-on web service in the cloud

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The owner is not technical, uses a Mac and works on Vietnam time. The brief asks for a tool opened like a web page, with no terminal, that sends emails on its own. Sending must work while the Mac is off, for four reasons:
- Emails go out in each client type's morning window in the lead's time zone, Saturdays included for some types. For a café in Melbourne (8:00 to 9:00) that is about 4 to 5 am in Vietnam; for New York about 7 to 8 pm.
- Follow-ups fall on fixed days (6, 12 and 21), whatever the owner's schedule.
- The stop-on-reply rule needs the inbox read right before each send.
- The unsubscribe link must answer at any hour, and one-click unsubscribe needs a public address.

The client set the budget in the feature review: at most €10 a month for everything the tool runs on, the company mailbox excluded (open questions 1 and 2, answered).

## Decision

One web service, in the cloud in an EU region, serves the UI and runs all background work (searches, research, writing, sending, reading the inbox). It runs on one small always-on server (a VPS of about €4 to 5 a month) with PostgreSQL on the same server ([PostgreSQL only](/decisions/MOQ-1-postgresql-store-and-queue.md)), reached at a subdomain of the company domain over HTTPS. The owner opens it in Safari or Chrome from a bookmark or a Dock icon (Safari's "Add to Dock", or Chrome's "Install app"). There is no page opened from a file and no terminal.

## Alternatives considered

- **Service on the Mac** (a launch agent serving the page at `localhost`). No hosting cost, and the data stays on the Mac. But nothing is sent while the Mac sleeps, so Australian mornings and fixed follow-up days slip; installing and updating needs the developer on the Mac; the do-not-contact list lives on one laptop, and losing it means emailing people who opted out; unsubscribing works by reply only.
- **Both** (page and data on the Mac, sender in the cloud). Two copies of the data to keep in step, and the stop rules split across two machines. The most complex option, with no gain over the cloud.
- **A file page calling a cloud API.** Browsers restrict pages opened from files (their origin is "null"), and sign-in is awkward. No gain over serving the page.

## Consequences

- Sending, follow-ups and unsubscribe work at any hour; the developer updates the tool remotely; the owner can also review leads from a phone.
- A public address needs sign-in on every page except the unsubscribe page and the health check (row 3 picks a free method).
- A monthly fee, inside the €10 budget; the hosting provider, the subdomain's name, staging and backup retention are chosen in row 2.
- One self-run server to keep up: automatic security updates, a daily backup off the server, a restore procedure tested in row 2.
- The host is a data processor holding lead data in the EU ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).
