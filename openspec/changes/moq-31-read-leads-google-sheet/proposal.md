Jira: MOQ-31
Size: large
Difficulty: tricky
Tier: heavy

# MOQ-31: Read leads from the Google Sheet

## Why

The owner already keeps leads in a spreadsheet (the current Excel file, now a Google Sheet). Finding leads on Google Maps and Instagram (MOQ-5 to MOQ-14) is deferred, so the sheet is the tool's first real lead source: reading it turns rows the owner has not contacted yet into leads waiting for review, and gives MOQ-32 (Review by source) real leads to show. Owner decision 2026-11-04: a Google Sheet, not a local Excel file, so the tool can read it from the always-on server and later write status back.

## What Changes

- **Sync now** on Find leads, and a **daily sync** at 06:00 Asia/Ho_Chi_Minh (the owner's time), read the first tab of the sheet set on Settings through Google's official Sheets API, with a service account the sheet is shared with, read-only.
- Each valid row that matches no lead becomes a lead with the source "Google Sheet", waiting for review, with no fit level, in the sheet's row order (the import position MOQ-32 will order by). Research and qualification are skipped for sheet leads for now.
- The lead keeps the row's values unchanged (Business, Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes, Email); Buyer type gives the client type, Language gives English or French, City / area gives the IANA time zone, from an offline place list bundled with the tool ("City, Country" directly; a city name alone takes its most populous namesake's zone when that one is at least 10 times as populous as every namesake in another zone). Anything that cannot be matched leaves the value empty and flags the lead ("type unknown" with type "Other", "no language", "no time zone", "time zone unclear"); nothing is guessed.
- Rows not imported, each named in the report with its sheet row number: no email, invalid email, no business name, already contacted, do not contact, already decided (a deleted or erased lead), duplicate. A duplicate adds the source "Google Sheet" to the lead it matches and changes nothing else.
- **One lead per business** gains the email address as a match key (ignoring case, surrounding spaces and "mailto:"), next to the website domain and the Instagram handle.
- A sync is all or nothing (a failure keeps no lead from it), one runs at a time, a sheet of more than 2,000 rows is refused, and a sync never writes to the sheet. Each sync ends in a report on Find leads (counts, and each skipped or flagged row with its reason), failures included, with their time and reason.
- **Settings** shows the service account's email to share the sheet with and saves the sheet link. Without a link, Sync now is greyed out with a link to Settings and the daily sync does not run.
- **Leads** (`/leads`) and the lead page (`/leads/:id`) show the real leads, read only: imported values, sources, status and flags. Their actions keep their "Not connected yet" notices.
- The "Sample data" marker (MOQ-30) now marks only pages or sections still on sample data: Leads and the lead page show none; Find leads and Settings mark their sample sections, not their Google Sheet section.
- New tables: the lead and its sources, emails and sheet values, the sync reports, and two keyed-hash tables, the do-not-contact list and the seen businesses (match keys of deleted leads), created now with lookups only; MOQ-18, MOQ-25 and the retention sweep fill them later.
- Two new secrets, like the MOQ-3 secrets: the Google service account key and the key for the keyed hashes.

## Out of scope

- Writing anything back to the sheet (status, dates): a separate ticket.
- Finding leads on Google Maps and Instagram, and adding a lead from a link (MOQ-5 to MOQ-14, deferred). Researching or qualifying sheet leads.
- The Review queue and its source filter (MOQ-32), and the lead-review spec change it brings.
- Filling the do-not-contact list (MOQ-18) and the seen businesses (MOQ-25 erasure, the retention sweep).
- Any AI call. Removing email addresses from Notes before they reach the AI belongs to MOQ-16.
- Actions on a lead (change client type, record a reply, erase): their tickets.
- Sign-in (MOQ-4). This change must not be deployed to the production server before MOQ-4 is merged: imported leads hold personal data.
- The "Template slide", "DM sent", "Prototype" and "Production launched" columns.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lead-sourcing`: "One lead per business" adds the email as a match key and the source "Google Sheet"; new requirements for the sheet sync (Sync now and the daily sync, the rows imported and skipped, the values kept, client type, language and time zone from the row, the report, the sheet's layout, failures, one sync at a time, read-only access), the sheet link and service account on Settings, and the Leads pages showing imported leads.
- `platform`: "Pages show sample data" marks only pages or sections still on sample data; connected pages (Leads, the lead page) show no marker.

## Impact

- New modules: `src/sourcing/` (sheet reader behind an interface with a fake, the sync, the lead tables, the API) and `src/compliance/` (the do-not-contact table and its lookup only). Shared code in `src/platform/`: the client type names, the offline place list and time zone lookup, a `schedule` method on the queue, route registration in `buildApp`.
- Database: a migration adding the lead, sync and keyed-hash tables.
- API: the sheet link setting, starting a sync and reading the last report, the leads list and a lead.
- Pages: Find leads (Sync now and the last report), Settings (Google Sheet section), Leads and the lead page (real data).
- Dependencies: one Google library for the service account's access token (pinned exactly); the GeoNames place data (CC BY 4.0, attribution in the repository).
- Settings: `GOOGLE_SERVICE_ACCOUNT_KEY` and `MATCH_HASH_KEY` in `.env.example`, `deploy/app.env.example` (placeholders only), CI and the container tests.
- A new data processor: Google (Sheets API).
- Knowledge at finish: the decision records named in `design.md`, `okf/integrations/google-sheets.md`, `okf/data/lead.md`, `okf/architecture/overview.md` (external services, jobs), `okf/architecture/tech-stack.md`.

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source | Scenarios |
|---|---|---|---|
| 1 | WHEN the owner starts a sync THEN each valid row whose email, website domain or Instagram handle matches no lead becomes a lead waiting for review, with no fit level, in the sheet's row order | Jira | Sync now imports new rows |
| 2 | WHEN the scheduled sync runs (once a day, at 06:00 Asia/Ho_Chi_Minh) THEN it imports rows the same way as Sync now | Jira (time: answer 8) | Daily sync at six in the owner's morning; Daily sync imports like Sync now |
| 3 | WHEN a row is imported THEN the lead holds the row's Business, Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes and Email values unchanged, and its source is Google Sheet | Jira | Imported lead keeps the row's values |
| 4 | WHEN a row has no email, or no valid address, THEN it is not imported and the report lists it as "no email" or "invalid email" | Jira | Row with no email; Row with an invalid email |
| 5 | WHEN a row has an email but no Business THEN it is not imported and the report lists it as "no business name" | Jira | Row with no business name |
| 6 | WHEN one Email cell holds several addresses THEN the first valid one is kept and the report notes "other addresses ignored" | Jira (wording: QC) | Several addresses in one cell |
| 7 | WHEN "Email sent" or "Responded" holds any value other than empty, unticked, "No" or "FALSE" (ignoring case) THEN the row is not imported and the report lists it as "already contacted"; an empty or unticked cell, "No" or "FALSE" does not skip the row | Jira, rewritten (answer 5) | Row already contacted; Row not contacted yet |
| 8 | WHEN a row's email (ignoring case, surrounding spaces and "mailto:"), website domain or Instagram handle matches an existing lead or an earlier row THEN no second lead is created, the existing lead also lists the source Google Sheet with its status and the owner's decision unchanged, and the report lists the row as "duplicate" | Jira; spec "One lead per business" | Sheet row with a known email; Sheet row with a known website or handle; Same email twice in one sheet |
| 9 | WHEN a row's email is on the do-not-contact list THEN no lead is created and the report lists the row as "do not contact" | Jira | Row on the do-not-contact list |
| 10 | WHEN a row's email belongs to a lead that was deleted or erased THEN no lead is created and the report lists the row as "already decided" | Jira | Row of a deleted lead |
| 11 | WHEN a row already imported changes or is deleted in the sheet THEN the lead is unchanged | Jira | Changed row leaves its lead unchanged; Deleted row leaves its lead unchanged |
| 12 | WHEN "Buyer type" is empty or equals no client type's name, ignoring case and accents, THEN the lead's type is "Other" and it is flagged "type unknown" | Jira (empty: QC MOQ-31-27) | Buyer type matched ignoring case and accents; Unknown or empty buyer type |
| 13 | WHEN "Language", ignoring case, surrounding spaces and accents, is not English, EN, Anglais, French, FR or Français THEN the lead has no language and is flagged "no language"; no language is guessed, then or later | Jira, rewritten (answer 6) | Accepted language values; Other language value; Empty language never filled later |
| 14 | WHEN "City / area" cannot be placed in a time zone THEN no time zone, flagged "no time zone"; WHEN it could be in more than one THEN flagged "time zone unclear"; a city name without a country takes the zone of its most populous match when that match has at least 10 times the people of every match in another zone | Jira, sharpened (answer 4; tie-break: answer of 2026-11-13) | City placed in one time zone; Bare city name with a much larger namesake; City that cannot be placed; City in several time zones |
| 15 | WHEN a sync ends THEN the report gives leads created (of which flagged) and rows skipped, and lists each skipped or flagged row with its sheet row number (header = row 1) and reason | Jira | Report counts and lists rows; Header-only sheet |
| 16 | WHEN a needed column (Business, Buyer type, Email) is missing THEN nothing is imported and the error names the column; columns in another order still work; only the first tab is read | Jira | Needed column missing; Columns in another order; Only the first tab is read |
| 17 | WHEN the sheet cannot be read (not shared, wrong link, Google unavailable) or a sync fails before the end THEN no lead from that sync is kept, existing leads unchanged, Find leads shows the failure with time and reason, for Sync now and the scheduled sync alike | Jira | Sheet not shared with the tool; Sheet link to no sheet; Link that is not a Google Sheet; Google unavailable; Sync fails before the end; Daily sync failure shown |
| 18 | WHEN a sync is already running and another one starts THEN no second sync runs, no duplicate lead, the page says "A sync is already running" | Jira | Second sync while one runs; Daily sync while one runs |
| 19 | WHEN no sheet link is set THEN Sync now is greyed out with a link to Settings, and the scheduled sync does not run | Jira | Sync now without a sheet link; No daily sync without a sheet link |
| 20 | WHEN a sync runs THEN nothing is written to the sheet | Jira | Sync writes nothing to the sheet |
| 21 | WHEN the sheet has more than 2,000 data rows THEN nothing is imported and Find leads shows the failure "The sheet has more than 2,000 rows" | answer 7 (QC open question 8); not in Jira yet | Sheet over 2,000 rows |
| 22 | WHEN the owner opens Settings THEN it shows the service account's email to share the sheet with, and saves the sheet link | ticket description; QC MOQ-31-03; not in Jira yet | Settings shows the service account and saves the link |
| 23 | WHEN the owner opens Leads or a lead's page THEN imported leads show with their values, sources, status and flags (read only) | answer 2; QC MOQ-31-02; not in Jira yet | Imported leads on the Leads list; Imported lead's own page |
| 24 | WHEN a page or a section of a page still shows sample data THEN it shows the "Sample data" marker; WHEN a page is connected (Leads, a lead's page) THEN it shows no marker | platform spec requirement "Pages show sample data" (MOQ-30); answer of 2026-11-13; not in Jira yet | Every page shows the sample data marker (modified); Connected pages show no marker |

Kept from the spec: the existing scenarios of "One lead per business" (Same place found twice, Same business from two sources, Rejected lead found again) stay as they are.

Considered, not needed:
- Permissions: MOQ-4's sign-in protects every page and `/api` once merged; MOQ-31 is not deployed to production before MOQ-4 (QC's MOQ-31-05 runs then). Before MOQ-4 there is no sign-in at all, locally.
- Empty sheet (header only): covered by criterion 15 (report 0 created, 0 skipped, no error).
- Performance: only the 2,000-row limit.
- AI: none in this ticket (MOQ-16 uses the facts; the sheet's text stays data).
- Writing status back: a separate ticket.
- "Market not active": a sheet lead has no country, so the market flag never applies to it.

Open questions: none for this change. "Template slide" (its meaning, for the client) is not used here.

For QC (QC updates its cases, not this change): answers 5 and 6 change the expectations of MOQ-31-14 row 6 and MOQ-31-29 row 5, and the time zone tie-break changes MOQ-31-31 row 2: "London" now resolves to Europe/London with no flag.

## Not in Jira yet

None: written to MOQ-31 on 2026-11-13 (criteria 21 to 24 added; 2, 6, 7, 8, 12, 13 and 14 rewritten as in the coverage table).

## Jira acceptance criteria

Read from MOQ-31 on 2026-11-13 11:03
* WHEN the owner starts a sync THEN each valid row whose email, website domain or Instagram handle matches no lead becomes a lead waiting for review, with no fit level, in the sheet's row order.
* WHEN the scheduled sync runs (once a day, at 06:00 Asia/Ho_Chi_Minh) THEN it imports rows the same way as Sync now.
* WHEN a row is imported THEN the lead holds the row's Business, Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes and Email values unchanged, and its source is Google Sheet.
* WHEN a row has no email, or no valid address, THEN it is not imported and the report lists it as "no email" or "invalid email".
* WHEN a row has an email but no Business THEN it is not imported and the report lists it as "no business name".
* WHEN one Email cell holds several addresses THEN the first valid one is kept and the report notes "other addresses ignored".
* WHEN "Email sent" or "Responded" holds any value other than empty, unticked, "No" or "FALSE" (ignoring case) THEN the row is not imported and the report lists it as "already contacted"; an empty or unticked cell, "No" or "FALSE" does not skip the row.
* WHEN a row's email (ignoring case, surrounding spaces and "mailto:"), website domain or Instagram handle matches an existing lead or an earlier row THEN no second lead is created, the existing lead also lists the source Google Sheet with its status and the owner's decision unchanged, and the report lists the row as "duplicate".
* WHEN a row's email is on the do-not-contact list THEN no lead is created and the report lists the row as "do not contact".
* WHEN a row's email belongs to a lead that was deleted or erased THEN no lead is created and the report lists the row as "already decided".
* WHEN a row already imported changes or is deleted in the sheet THEN the lead is unchanged.
* WHEN "Buyer type" is empty or equals no client type's name, ignoring case and accents, THEN the lead's type is "Other" and it is flagged "type unknown".
* WHEN "Language", ignoring case, surrounding spaces and accents, is not English, EN, Anglais, French, FR or Français THEN the lead has no language and is flagged "no language"; no language is guessed, then or later.
* WHEN "City / area" cannot be placed in a time zone THEN the lead has no time zone and is flagged "no time zone"; WHEN it could be in more than one time zone THEN it is flagged "time zone unclear"; a city name without a country takes the zone of its most populous match when that match has at least 10 times the people of every match in another time zone.
* WHEN a sync ends THEN the report gives the number of leads created (of which flagged) and the number of rows skipped, and lists each skipped or flagged row with its sheet row number (header = row 1) and reason.
* WHEN a needed column (Business, Buyer type, Email) is missing THEN nothing is imported and the error names the column; columns in another order still work; only the first tab is read.
* WHEN the sheet cannot be read (not shared with the tool, wrong link, Google unavailable) or a sync fails before the end THEN no lead from that sync is kept, existing leads are unchanged, and the Find leads page shows the failure with its time and reason, for Sync now and the scheduled sync alike.
* WHEN a sync is already running and another one starts THEN no second sync runs, no duplicate lead is created, and the page says "A sync is already running".
* WHEN no sheet link is set THEN Sync now is greyed out with a link to Settings, and the scheduled sync does not run.
* WHEN a sync runs THEN nothing is written to the sheet.
* WHEN the sheet has more than 2,000 data rows THEN nothing is imported and Find leads shows the failure "The sheet has more than 2,000 rows".
* WHEN the owner opens Settings THEN it shows the service account's email to share the sheet with, and saves the sheet link.
* WHEN the owner opens Leads or a lead's page THEN imported leads show with their values, sources, status and flags (read only).
* WHEN a page or a section of a page still shows sample data THEN it shows the "Sample data" marker; WHEN a page is connected (Leads, a lead's page) THEN it shows no marker.
