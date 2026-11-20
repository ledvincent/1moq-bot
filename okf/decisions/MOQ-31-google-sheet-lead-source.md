---
type: Decision
title: The owner's Google Sheet is a lead source, read-only through the Sheets API with a service account
description: The tool reads the first tab of the owner's Google Sheet through Sheets API v4 with a company service account and a read-only scope, on Sync now and daily at 06:00 Asia/Ho_Chi_Minh, all or nothing and one sync at a time
owner: vincent.ledreau@dirox.net
status: stable
tags: [sourcing, google-sheets, personal-data]
---
# The owner's Google Sheet is a lead source, read-only through the Sheets API with a service account

Date: 2026-11-13 · Jira: MOQ-31 · Change: `openspec/changes/moq-31-read-leads-google-sheet/` (design D1)

## Context

The owner keeps leads in a spreadsheet and, on 2026-11-04, chose a Google Sheet over a local Excel file so the always-on server can read it (and later write status back). Finding leads on Google Maps and Instagram is deferred, so the sheet is the tool's first lead source. The rows hold personal data (owners' names, addresses, notes). The tool runs unattended on a server, for one owner, within €10 a month, and every external service sits behind an interface with a fake ([lead source policy](/decisions/MOQ-1-lead-source-policy.md), [personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

## Decision

- The tool reads the sheet through Google's official Sheets API v4 with a **service account** of a Google Cloud project owned by the company (Sheets API enabled, no project roles). The owner shares the sheet with the service account's email address as Viewer; Settings shows that address. The key is the secret `GOOGLE_SERVICE_ACCOUNT_KEY`.
- **Read-only**: the access token asks for the `https://www.googleapis.com/auth/spreadsheets.readonly` scope only, and the tool makes two GET requests per sync: the spreadsheet's tab list (`fields=sheets.properties`), then the first tab's values (`valueRenderOption=FORMATTED_VALUE`, rows 1 to 5,002), so a ticked checkbox reads `TRUE` and a date reads as the sheet shows it.
- The access token comes from `google-auth-library` (Google's official Node.js auth library, pinned exactly); the two requests use Node's `fetch` with a 20-second time-out.
- A sync runs on the server as a pg-boss job, when the owner clicks Sync now and **once a day at 06:00 Asia/Ho_Chi_Minh**. It is **all or nothing**: the sheet is read first, then every row is written in one database transaction, so a failure keeps nothing. **One sync runs at a time**, enforced by a partial unique index on the running `sheet_sync` row.
- The adapter sits behind the `SheetSource` interface in `src/sourcing/`, with a fake for tests.

## Alternatives considered

- *A local Excel file uploaded by the owner*: no Google dependency, but the server cannot read the owner's file on a schedule, and writing status back means the owner downloads a file each time. Rejected by the owner (2026-11-04).
- *The owner signs in with Google (OAuth) and the tool reads with the owner's account*: no key file, but the tool would hold a refresh token to all of the owner's spreadsheets, and the consent screen of an unverified app expires tokens after 7 days in testing mode. A service account sees only what is shared with it.
- *A published CSV link ("Publish to the web")*: no credentials at all, but the sheet, personal data included, becomes public to anyone with the link.
- *The full `googleapis` package or `@googleapis/sheets`*: generated clients far larger than two GET requests need. *Signing the service account's JWT by hand with `node:crypto`*: no dependency, but the tool would own token signing, caching and renewal, which Google's library already does.
- *Read and write scope now, for the later status write-back*: the later ticket asks for it when it needs it; until then a leaked key cannot change the sheet.

## Consequences

- Google (Sheets API) becomes a data processor: [Google Sheets](/integrations/google-sheets.md) and the [overview](/architecture/overview.md)'s external services. The Sheets API is free within its quotas (two read requests per sync).
- Setting up a new environment needs the Google Cloud project, the service account and its key ([Google Sheets](/integrations/google-sheets.md) says how). A missing key does not stop the tool; Settings says Google access is not set up and a sync fails with that reason.
- The later write-back ticket changes the scope, and the owner then shares the sheet as Editor.
- The sheet must not hold more than 5,000 rows below its header; a bigger sheet fails with "The sheet has more than 5,000 rows" (raised from 2,000 on 2026-11-13, during the build: the owner's master sheet holds 2,200 leads, all countries on one tab).
- This change is not deployed to the production server before MOQ-4 (sign-in): imported leads hold personal data.
