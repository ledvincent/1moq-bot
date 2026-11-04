Jira: MOQ-31
Size: big
Difficulty: tricky
Tier: heavy

# MOQ-31: Read leads from the Google Sheet

## Why

The owner already keeps leads in a spreadsheet (the current Excel file, uploaded to Google Sheets). Finding leads on Google Maps and Instagram (MOQ-5 to MOQ-14) is deferred, so the sheet is the tool's first real source of leads: reading it turns the owner's own list into leads waiting for review, which the review (MOQ-13, MOQ-32) and the outreach then work from. Owner decision 2026-11-04: a Google Sheet, not a local Excel file, so the tool can read it from the always-on server and later write status back.

## What Changes

- **Sheet sync.** The tool reads the owner's Google Sheet through Google's official Sheets API, with a service account the owner shares the sheet with (read-only). A sync runs when the owner presses **Sync now** on Find leads, and once a day on a schedule (a `sheet.sync` job on the existing PostgreSQL job queue). Only one sync runs at a time.
- **Rows become leads.** Each row with an email not yet in the tool becomes a lead with status "waiting for review" and source "Google Sheet", with the row's business, client type, language, city / area (and the time zone it gives), why they fit, website / Instagram, owner / founder, notes and email. Columns are found by header name, in any order.
- **Rows skipped:** no email; "Email sent" or "Responded" filled (already contacted); a duplicate of an existing lead or of another row, by email, website domain or Instagram handle. A row already imported is read once: later edits in the sheet do not change its lead.
- **Leads flagged, never guessed:** a buyer type matching no client type gives "Other"; a language other than English or French gives no language; a city / area that cannot be placed gives no time zone (so the lead is never scheduled).
- **Report.** Each sync ends with a report on Find leads: rows imported, skipped and flagged, each skipped or flagged row with its row number and reason. A sheet that cannot be read, or a missing needed column, fails the sync with a clear message and changes no lead.
- **Settings.** The sheet link is set on Settings, which also shows the service account's email address to share the sheet with. Without a link, Sync now is unavailable and Find leads says where to set it.
- **New data:** the `lead` table and the tables around it (sources, email addresses, facts), and a table of sync runs with their reports. The service account key is a new secret, kept like the MOQ-3 secrets.
- The tool never writes to the sheet.

## Out of scope

- Writing status back to the sheet (a separate ticket).
- Showing imported leads on Review and Leads, and filtering Review by source (MOQ-13, MOQ-23, MOQ-32). This change stores them and shows the sync report only.
- Finding leads on Google Maps and Instagram (MOQ-5 to MOQ-14, deferred). Their Find leads parts stay sample data.
- The columns Template slide, DM sent, Prototype and Production launched (not used now).
- Researching or qualifying imported leads (enrichment and qualification tickets); the owner's corrections of client type, language and time zone in the tool (MOQ-11 and the lead page actions).
- Checking imported addresses against the do-not-contact list (MOQ-18): the send gate refuses those addresses at send time (design D9).
- Production: imported leads hold personal data, so this change must not reach the production server before sign-in (MOQ-4). The server itself comes with MOQ-29.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lead-sourcing`:
  - MODIFIED: "One lead per business" (a sheet row also matches by its email address; a sheet row that matches is not imported and is reported as a duplicate).
  - ADDED: "Import leads from the Google Sheet", "Read-only access to the sheet", "Rows the sync skips", "Flags on imported leads", "Imported rows are read once", "Sheet columns by header name", "Unreadable sheet", "Sync report", "Sync now and the sheet link", "One sync at a time", "Daily sheet sync".
  - The capability's Purpose names Google Maps and Instagram only; it is updated to name the Google Sheet at close-change.

## Impact

- New module `src/sourcing/`: the sheet reader interface, its Google adapter and its fake, the row parser (headers, client type, language, place to time zone, website and Instagram keys), the import, the sync runs, the `sheet.sync` job and the `/api/sheet/*` routes. Its tables in `src/sourcing/schema.ts`, re-exported from `src/platform/db/schema.ts`, and one migration in `drizzle/`.
- `src/platform/`: `config.ts` (the optional `GOOGLE_SERVICE_ACCOUNT_KEY` setting), `queue.ts` (a `schedule` method on the queue interface), `http/app.ts` and `src/main.ts` (register the module's routes and job).
- `web/`: the Google Sheet section on Find leads (Sync now, the running state, the last report) and on Settings (sheet link, service account email); a small API helper.
- `deploy/app.env.example` and `.env.example`: the new secret, placeholder only. No new dependency (design D2).
- APIs: `GET /api/sheet`, `PUT /api/sheet/link`, `POST /api/sheet/syncs`, `GET /api/sheet/syncs/latest`.
- Knowledge at close-change: `okf/decisions/` records named in `design.md`; new `okf/integrations/google-sheets.md` (also a new processor for `MOQ-1-personal-data-handling.md`'s list); `okf/data/lead.md` (table names fixed, sheet source); `okf/domain/lead.md` (the Google Sheet source and the email as a sheet match key); `okf/domain/lead-status.md` (a sheet import is a new way into "waiting for review", skipping "found"); `okf/architecture/overview.md` (module, job, entry points, external services); `okf/architecture/tech-stack.md` if the library choice changes.
- Overlaps MOQ-4 (open, not merged) in `src/platform/config.ts`, `src/platform/http/app.ts`, `.env.example`, `deploy/app.env.example`, the `drizzle/` migration journal and a web API helper; see `design.md`, Risks.

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source |
|---|---|---|
| 1 | WHEN the owner starts a sync or the scheduled sync runs THEN each row with an email not yet in the tool becomes a lead waiting for review, with the row's business, client type, language, city / area, why they fit, website / Instagram, owner / founder, notes and email. | Jira |
| 2 | WHEN a lead is imported from the sheet THEN its source is recorded as Google Sheet. | Jira |
| 3 | WHEN a row has no email THEN it is not imported and the report lists it as "no email". | Jira |
| 4 | WHEN a row has "Email sent" or "Responded" filled THEN it is not imported and the report lists it as "already contacted". | Jira |
| 5 | WHEN a row's email matches an existing lead or another row of the sheet THEN no second lead is created and the report lists it as a duplicate. | Jira |
| 6 | WHEN "Buyer type" matches no client type THEN the lead's type is "Other" and the lead is flagged. | Jira |
| 7 | WHEN "Language" is empty or neither English nor French THEN the lead has no language and is flagged; no language is guessed. | Jira |
| 8 | WHEN "City / area" cannot be placed in a time zone THEN the lead has no time zone and is flagged. | Jira |
| 9 | WHEN a sync ends THEN the owner sees a report: rows imported, skipped and flagged, each skipped or flagged row with its row number and reason. | Jira |
| 10 | WHEN a needed column (Business, Buyer type, Email) is missing THEN nothing is imported and the error names the column; columns in another order still work. | Jira |
| 11 | WHEN the sheet cannot be read (not shared with the tool, wrong link, Google unavailable) THEN the sync fails with a clear message and existing leads are unchanged. | Jira |
| 12 | WHEN no sheet link is set THEN Sync now is unavailable and the page says where to set it. | Jira |
| 13 | WHEN a sync runs THEN nothing is written to the sheet. | Jira |
| 14 | WHEN a row's Website / Instagram matches an existing lead's website domain or Instagram handle, or another row's, THEN no second lead is created and the report lists it as a duplicate. | spec "One lead per business"; answer 2026-11-04 |
| 15 | WHEN a row already imported is changed in the sheet THEN the next sync leaves its lead unchanged. | Jira open question; answer 2026-11-04 |
| 16 | WHEN the scheduled sync is set up THEN it runs once a day. | Jira open question; answer 2026-11-04 |
| 17 | WHEN a sync is started while another is running THEN no second sync runs at the same time and the owner is told a sync is running. | checklist: run twice |

### Considered, not needed

- Template slide, DM sent, Prototype and Production launched columns: not used now (the ticket's column table).
- Writing status back to the sheet: a separate ticket; this change only reads (criterion 13).
- Permissions and sign-in: MOQ-4 (user-access) gates every `/api/*` route once merged. Here it is a deployment constraint only: not on the production server before MOQ-4; the server is not set up yet (MOQ-29).
- Do-not-contact check on import: the list is MOQ-18, not built; the send gate refuses do-not-contact addresses at send time, so an imported address on the list is never emailed (design D9).
- Deleted-lead hashes (`seen_business`): the retention sweep (row 24) is not built, so no lead has been deleted yet; the sweep's ticket makes imports check them.
- Performance: no threshold given; the sheet is a few hundred rows, read in two API calls.
- Google Maps and Instagram search: deferred (MOQ-5 to MOQ-14).

### Open questions

None from the ticket. Design choices to confirm in review are listed in `design.md`, Open Questions.

## Jira acceptance criteria

Read from MOQ-31 on 2026-11-04 16:12
* WHEN the owner starts a sync or the scheduled sync runs THEN each row with an email not yet in the tool becomes a lead waiting for review, with the row's business, client type, language, city / area, why they fit, website / Instagram, owner / founder, notes and email.
* WHEN a lead is imported from the sheet THEN its source is recorded as Google Sheet.
* WHEN a row has no email THEN it is not imported and the report lists it as "no email".
* WHEN a row has "Email sent" or "Responded" filled THEN it is not imported and the report lists it as "already contacted".
* WHEN a row's email matches an existing lead or another row of the sheet THEN no second lead is created and the report lists it as a duplicate.
* WHEN "Buyer type" matches no client type THEN the lead's type is "Other" and the lead is flagged.
* WHEN "Language" is empty or neither English nor French THEN the lead has no language and is flagged; no language is guessed.
* WHEN "City / area" cannot be placed in a time zone THEN the lead has no time zone and is flagged.
* WHEN a sync ends THEN the owner sees a report: rows imported, skipped and flagged, each skipped or flagged row with its row number and reason.
* WHEN a needed column (Business, Buyer type, Email) is missing THEN nothing is imported and the error names the column; columns in another order still work.
* WHEN the sheet cannot be read (not shared with the tool, wrong link, Google unavailable) THEN the sync fails with a clear message and existing leads are unchanged.
* WHEN no sheet link is set THEN Sync now is unavailable and the page says where to set it.
* WHEN a sync runs THEN nothing is written to the sheet.
* WHEN a row's Website / Instagram matches an existing lead's website domain or Instagram handle, or another row's, THEN no second lead is created and the report lists it as a duplicate.
* WHEN a row already imported is changed in the sheet THEN the next sync leaves its lead unchanged.
* WHEN the scheduled sync is set up THEN it runs once a day.
* WHEN a sync is started while another is running THEN no second sync runs at the same time and the owner is told a sync is running.
