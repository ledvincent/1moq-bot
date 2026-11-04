## ADDED Requirements

### Requirement: Import leads from the Google Sheet
When the owner starts a sync or the scheduled sync runs, each row of the owner's Google Sheet with an email not yet in the tool SHALL become a lead with status "waiting for review", source "Google Sheet", and the row's business, client type, language, city / area, why they fit, website / Instagram, owner / founder, notes and email.
Knowledge: `okf/domain/lead.md`, `okf/domain/lead-status.md`

#### Scenario: Sheet row becomes a lead
- **WHEN** the owner starts a sync, or the scheduled sync runs, and the sheet has a row whose email is not yet in the tool
- **THEN** that row becomes a lead with status "waiting for review"
- **AND** the lead holds the row's business, client type, language, city / area, why they fit, website / Instagram, owner / founder, notes and email

#### Scenario: Sheet lead records its source
- **WHEN** a lead is imported from the sheet
- **THEN** its source is recorded as "Google Sheet"

### Requirement: Read-only access to the sheet
The system SHALL read the sheet only through Google's official Sheets API, with a service account the owner shares the sheet with and read-only access, and a sync SHALL never write to the sheet.
Knowledge: `okf/integrations/google-sheets.md`, `okf/decisions/MOQ-1-lead-source-policy.md`

#### Scenario: Sync writes nothing to the sheet
- **WHEN** a sync runs
- **THEN** the tool only reads the sheet, with read-only access, and nothing is written to it

### Requirement: Rows the sync skips
A sheet row without an email, or with "Email sent" or "Responded" filled, SHALL not be imported, and the sync report SHALL list it with its reason.
Knowledge: `okf/domain/lead.md`

#### Scenario: Row without email skipped
- **WHEN** a row has no email
- **THEN** it is not imported
- **AND** the report lists it as "no email"

#### Scenario: Contacted row skipped
- **WHEN** a row has "Email sent" or "Responded" filled
- **THEN** it is not imported
- **AND** the report lists it as "already contacted"

### Requirement: Flags on imported leads
An imported lead SHALL get a client type, a language and a time zone only from what the row clearly says. A buyer type matching no client type SHALL give the type "Other"; a language that is not English or French SHALL give no language; a city / area that cannot be placed in one time zone SHALL give no time zone. Each of these SHALL flag the lead, and nothing SHALL be guessed.
Knowledge: `okf/domain/client-types.md`, `okf/domain/markets.md`, `okf/domain/lead-status.md`

#### Scenario: Unknown buyer type is Other
- **WHEN** a row's "Buyer type" matches no client type
- **THEN** the lead's client type is "Other"
- **AND** the lead is flagged

#### Scenario: Unknown language left empty
- **WHEN** a row's "Language" is empty, or is neither English nor French
- **THEN** the lead has no language and is flagged
- **AND** no language is guessed

#### Scenario: Unplaced city has no time zone
- **WHEN** a row's "City / area" cannot be placed in a time zone
- **THEN** the lead has no time zone and is flagged

### Requirement: Imported rows are read once
A sheet row already imported SHALL be read once: a later sync SHALL leave its lead unchanged, whatever was edited in the row since.
Knowledge: `okf/domain/lead.md`

#### Scenario: Changed row leaves its lead unchanged
- **WHEN** a row already imported is changed in the sheet and a sync runs
- **THEN** its lead is unchanged
- **AND** no second lead is created for it

### Requirement: Sheet columns by header name
The system SHALL find the sheet's columns by their header names, in any order. When a needed column (Business, Buyer type or Email) is missing, the sync SHALL import nothing and fail with an error naming the missing column.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Needed column missing
- **WHEN** the sheet has no "Business", "Buyer type" or "Email" column
- **THEN** nothing is imported
- **AND** the sync fails with an error that names the missing column

#### Scenario: Columns in another order
- **WHEN** the sheet's columns are in another order than usual
- **THEN** the sync reads each value from the column with its header name and imports the rows as usual

### Requirement: Unreadable sheet
When the sheet cannot be read (not shared with the tool, a wrong link, or Google unavailable), the sync SHALL fail with a message saying why in words the owner can act on, and the leads already stored SHALL stay unchanged.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Sheet cannot be read
- **WHEN** a sync runs and the sheet is not shared with the tool, the link points to no sheet, or Google does not answer
- **THEN** the sync fails with a clear message for that cause
- **AND** the leads already stored are unchanged

### Requirement: Sync report
When a sync ends, the owner SHALL see its report on Find leads: how many rows were imported, skipped and flagged, and each skipped or flagged row with its row number in the sheet and its reason. A failed sync SHALL show its error instead.

#### Scenario: Sync report lists skipped and flagged rows
- **WHEN** a sync ends
- **THEN** the owner sees the number of rows imported, skipped and flagged
- **AND** each skipped or flagged row is listed with its row number and reason

### Requirement: Sync now and the sheet link
The owner SHALL set the sheet's link on Settings, which SHALL also show the service account's email address to share the sheet with. While no link is set, Sync now SHALL be unavailable and Find leads SHALL say where to set the link.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Sync now without a sheet link
- **WHEN** no sheet link is set
- **THEN** Sync now is unavailable on Find leads, which says the link is set on Settings
- **AND** Settings shows the email address to share the sheet with

### Requirement: One sync at a time
A sync started, by the owner or by the schedule, while another sync is running SHALL not run alongside it. The owner SHALL be told that a sync is running.

#### Scenario: Sync started while one runs
- **WHEN** a sync is started while another is running
- **THEN** no second sync runs at the same time
- **AND** the owner is told a sync is running

### Requirement: Daily sheet sync
The system SHALL run the sheet sync on a schedule, once a day, while a sheet link is set.
Knowledge: `okf/decisions/MOQ-1-postgresql-store-and-queue.md`

#### Scenario: Scheduled sync runs once a day
- **WHEN** the scheduled sync is set up
- **THEN** it runs once a day, at one fixed time

## MODIFIED Requirements

### Requirement: One lead per business
The system SHALL keep a single lead per business. A business found again, by the same map place, the same Instagram handle or the same website domain, SHALL be matched to the existing lead, which keeps every source and search it was found in. Its status and the owner's decision SHALL stay as they were. A sheet row also matches by email, and against the sheet's other rows; a matching row SHALL change no lead and be reported as a duplicate.
Knowledge: `okf/domain/lead.md`, `okf/data/lead.md`

#### Scenario: Same place found twice
- **WHEN** a Google Maps search returns a place that is already a lead
- **THEN** no new lead is created and the existing lead also lists the new search

#### Scenario: Same business from two sources
- **WHEN** the owner adds an Instagram profile whose website domain matches an existing lead
- **THEN** the profile is attached to that lead and no new lead is created

#### Scenario: Rejected lead found again
- **WHEN** a search returns a business the owner already rejected
- **THEN** the lead stays rejected and is not offered for review again

#### Scenario: Sheet row with a known email
- **WHEN** a row's email matches an existing lead's email
- **THEN** no second lead is created and the existing lead is unchanged
- **AND** the report lists the row as a duplicate

#### Scenario: Same email twice in the sheet
- **WHEN** two rows of the sheet have the same email
- **THEN** only the first becomes a lead
- **AND** the report lists the other as a duplicate of that row

#### Scenario: Sheet row matching a known website or handle
- **WHEN** a row with a new email has a Website / Instagram matching an existing lead's website domain or Instagram handle
- **THEN** no second lead is created and the existing lead is unchanged, its email not added
- **AND** the report lists the row as a duplicate naming what it matches

#### Scenario: Sheet rows sharing a website or handle
- **WHEN** two rows with different emails have the same website domain or Instagram handle
- **THEN** only the first becomes a lead
- **AND** the report lists the other as a duplicate of that row, naming what it matches
