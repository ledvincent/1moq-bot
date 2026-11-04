---
type: Decision
title: The owner's app has eight pages at fixed addresses, with the Overview as home
description: Menu and addresses of the owner's app - Overview at /, Find leads, Review, Leads (and /leads/:id), Emails, Templates, Results, Settings - with no /to-do page; feature tickets reuse them and add no menu item without a new decision
owner: vincent.ledreau@dirox.net
status: stable
tags: [architecture, ui]
---
# The owner's app has eight pages at fixed addresses, with the Overview as home

Date: 2026-11-04 · Jira: MOQ-30 · Change: `openspec/changes/archive/moq-30-owner-app-pages-2026-11-04/` (design D1)

## Context

The [architecture overview](/architecture/overview.md) "Entry points" planned `/review` as the home page and a `/to-do` page, and said each row fixes its own names. Every feature ticket from MOQ-5 on connects to one of these pages, and the owner will bookmark them, so the names should be fixed once.

## Decision

The owner's app has these pages, in this menu order:

| Menu item | Address | Connected later by |
|---|---|---|
| Overview (home) | `/` | MOQ-13, MOQ-19, MOQ-20 (its figures) |
| Find leads | `/find` | MOQ-5, MOQ-6 |
| Review | `/review` | MOQ-13, MOQ-14 (MOQ-27 if chosen) |
| Leads | `/leads`, and `/leads/:id` for one lead | MOQ-23 |
| Emails | `/emails` | MOQ-19, MOQ-20, MOQ-21, MOQ-22 |
| Templates | `/templates` | MOQ-15 |
| Results | `/results` | MOQ-24 |
| Settings | `/settings` | MOQ-12, MOQ-17, MOQ-18, MOQ-19, MOQ-25 |

- The home page is the Overview at `/`, not `/review`. There is no `/to-do` page: the leads to contact by hand and the day-3 Instagram DMs due are a section of Emails.
- MOQ-4 adds `/sign-in` and `/setup` outside this menu; MOQ-18 owns `/u/*`.
- A trailing slash is ignored (`/leads/` opens Leads). Any other address, and `/leads/<id>` for an id with no lead, shows "Page not found".
- The pages and shared parts follow [the UI style](/architecture/ui-style.md).

Changed since the design: the ticket for each action is kept in `web/src/app/connected-by.ts`, the one source for that column. MOQ-31 (Google Sheet sync, created 2026-11-04) will connect Find leads (Sync now) and Settings (sheet link), and MOQ-32 (Review by source) will connect Review; MOQ-5 is now deferred, though the Find leads search notice still names it.

## Alternatives considered

- Keep `/review` as home: the person chose an Overview as the first screen (waiting reviews, today's emails, replies, sending state), and Review is one click away.
- A separate `/to-do` page: the hand-contact list is about outreach, next to the queued emails; one page fewer in the menu.

## Consequences

Feature tickets reuse these addresses and do not add menu items without a new decision. The overview's "Entry points" lists this map. MOQ-22 builds its list inside Emails.
