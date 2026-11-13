## MODIFIED Requirements

### Requirement: One lead per business
The system SHALL keep a single lead per business. A business found again, by the same map place, the same Instagram handle, the same website domain or the same email address, SHALL be matched to the existing lead, which keeps every source and search it was found in, the Google Sheet included. Its status and the owner's decision SHALL stay as they were. Email addresses SHALL be compared ignoring case, surrounding spaces and a leading "mailto:".
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
- **WHEN** a sheet row's Email is "  HELLO@Cafe.example " or "mailto:hello@cafe.example" and a lead already has the address "hello@cafe.example"
- **THEN** no new lead is created and the existing lead also lists the source "Google Sheet"
- **AND** the lead's status, the owner's decision and its values are unchanged
- **AND** the report lists the row as "duplicate"

#### Scenario: Sheet row with a known website or handle
- **WHEN** a sheet row's email is new but its Website / Instagram names the website domain or the Instagram handle of an existing rejected lead
- **THEN** no new lead is created, the lead lists the source "Google Sheet" and stays rejected
- **AND** the report lists the row as "duplicate"

#### Scenario: Same email twice in one sheet
- **WHEN** rows 2 and 3 of the sheet hold the same email address in a different case
- **THEN** one lead is created, from row 2
- **AND** the report lists row 3 as "duplicate"

## ADDED Requirements

### Requirement: Sync leads from the Google Sheet
The system SHALL let the owner start a sync of the Google Sheet set on Settings (Sync now on Find leads). A sync SHALL turn each valid row that matches no lead into a lead with the source "Google Sheet", the status "waiting for review" and no fit level, in the sheet's row order. A lead from the sheet SHALL NOT be researched or qualified.
Knowledge: `okf/integrations/google-sheets.md`, `okf/domain/lead.md`, `okf/domain/lead-status.md`

#### Scenario: Sync now imports new rows
- **WHEN** the sheet holds three valid rows that match no lead and the owner clicks Sync now
- **THEN** three leads are created, each with the source "Google Sheet", the status "waiting for review" and no fit level
- **AND** their import order is the order of their rows in the sheet

### Requirement: Sheet values kept unchanged
An imported lead SHALL hold its row's Business (as its name), Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes and kept Email address exactly as read from the sheet; an empty cell gives no value. A later sync SHALL never change an imported lead, whatever happens to its row.
Knowledge: `okf/domain/lead.md`, `okf/data/lead.md`

#### Scenario: Imported lead keeps the row's values
- **WHEN** a row with accents, capitals, punctuation and line breaks in its cells is imported
- **THEN** the lead's name, Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes and Email are character for character the row's values
- **AND** its source is "Google Sheet"

#### Scenario: Changed row leaves its lead unchanged
- **WHEN** an imported row's Business, Buyer type, Language and Notes are changed in the sheet, its Email kept, and the sheet is synced again
- **THEN** the lead keeps the values of the first import and no new lead is created

#### Scenario: Deleted row leaves its lead unchanged
- **WHEN** an imported row is deleted from the sheet and the sheet is synced again
- **THEN** the lead keeps its values, sources and status

### Requirement: Rows without a usable email or business name are skipped
A row SHALL be imported only with a valid email address and a Business. An Email cell holding several addresses SHALL keep the first valid one. Addresses are compared after dropping surrounding spaces and a leading "mailto:".
Knowledge: `okf/domain/lead.md`

#### Scenario: Row with no email
- **WHEN** a row's Email is empty or holds only spaces
- **THEN** no lead is created from it and the report lists the row as "no email"

#### Scenario: Row with an invalid email
- **WHEN** a row's Email holds no valid address, such as "hello@", "@shop.example" or "see website"
- **THEN** no lead is created from it and the report lists the row as "invalid email"

#### Scenario: Row with no business name
- **WHEN** a row has a valid email but its Business is empty or holds only spaces
- **THEN** no lead is created from it and the report lists the row as "no business name"

#### Scenario: Several addresses in one cell
- **WHEN** a row's Email is "contact(at)shop, team@shop.example; sales@shop.example"
- **THEN** the lead is created with the address "team@shop.example" only
- **AND** the report notes the row as "other addresses ignored"

### Requirement: Rows already contacted are skipped
A row whose "Email sent" or "Responded" cell holds any value other than empty, unticked, "No" or "FALSE", ignoring case and surrounding spaces, SHALL NOT be imported.
Knowledge: `okf/domain/lead.md`

#### Scenario: Row already contacted
- **WHEN** a row's "Email sent" or "Responded" is ticked, or holds "2026-10-03", "Yes", "yes" or "x"
- **THEN** no lead is created from it and the report lists the row as "already contacted"

#### Scenario: Row not contacted yet
- **WHEN** a valid row's "Email sent" and "Responded" are each empty, unticked, "No", "no" or "FALSE"
- **THEN** a lead is created from it

### Requirement: Rows the tool must not offer again are skipped
A row whose email address is on the do-not-contact list SHALL NOT be imported. A row whose email address, website domain or Instagram handle belonged to a lead that was deleted or erased SHALL NOT be imported either. Both checks compare keyed hashes, never readable addresses.
Knowledge: `okf/domain/do-not-contact-list.md`, `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Row on the do-not-contact list
- **WHEN** a row's Email is " STOP@shop.example" and "stop@shop.example" is on the do-not-contact list
- **THEN** no lead is created from it and the report lists the row as "do not contact"

#### Scenario: Row of a deleted lead
- **WHEN** a row's email belonged to a lead that was deleted or erased
- **THEN** no lead is created from it and the report lists the row as "already decided"

### Requirement: Client type from the Buyer type
An imported lead's client type SHALL be the client type whose name equals the row's Buyer type, ignoring case, accents and extra spaces. Otherwise, an empty Buyer type included, its type SHALL be "Other" and the lead SHALL be flagged "type unknown".
Knowledge: `okf/domain/client-types.md`

#### Scenario: Buyer type matched ignoring case and accents
- **WHEN** rows hold the Buyer type "CAFES AND ROASTERS", "cafés and roasters" and "run and sports CLUBS"
- **THEN** their leads have the types "Cafés and roasters", "Cafés and roasters" and "Run and sports clubs", with no "type unknown" flag

#### Scenario: Unknown or empty buyer type
- **WHEN** rows hold the Buyer type "Café", "Bakery" or nothing
- **THEN** each lead's type is "Other" and it is flagged "type unknown"
- **AND** the report lists each row as flagged "type unknown"

### Requirement: Language from the sheet
An imported lead's language SHALL be English when the row's Language is English, EN or Anglais, and French when it is French, FR or Français, ignoring case, surrounding spaces and accents. Any other value, an empty one included, SHALL leave the lead with no language, flagged "no language". No language SHALL be guessed, then or later; it stays empty until the owner sets it.
Knowledge: `okf/domain/lead.md`

#### Scenario: Accepted language values
- **WHEN** rows hold the Language "English", "EN", "Anglais", " english ", "French", "FR", "Français", "fr" or "Francais"
- **THEN** the first four leads have the language English and the others French, none flagged "no language"

#### Scenario: Other language value
- **WHEN** a row's Language is empty, "Spanish" or "English/French"
- **THEN** its lead has no language and is flagged "no language"
- **AND** the report lists the row as flagged "no language"

#### Scenario: Empty language never filled later
- **WHEN** a lead imported with no language and the City / area "Lyon, France" is synced again
- **THEN** it still has no language and is still flagged "no language"

### Requirement: Time zone from City / area
An imported lead's IANA time zone SHALL come from the row's City / area (a city, a country, or "City, Country") looked up in a place list held by the tool. A city name without a country SHALL take the zone of its most populous match when that match has at least 10 times the people of every match in another zone. Not found: no time zone, flagged "no time zone"; still in more than one zone: no time zone, flagged "time zone unclear".
Knowledge: `okf/data/lead.md`, `okf/domain/lead.md`

#### Scenario: City placed in one time zone
- **WHEN** rows hold the City / area "Lyon, France" and "Leeds, UK"
- **THEN** their leads have the time zones Europe/Paris and Europe/London, with no time zone flag

#### Scenario: Bare city name with a much larger namesake
- **WHEN** rows hold the City / area "Paris" (also a town in Texas) and "London" (also a city in Ontario)
- **THEN** their leads have the time zones Europe/Paris and Europe/London, with no time zone flag

#### Scenario: City that cannot be placed
- **WHEN** a row's City / area is "Qwertyville Nowhere" or empty
- **THEN** its lead has no time zone and is flagged "no time zone"

#### Scenario: City in several time zones
- **WHEN** rows hold the City / area "Springfield" (cities of comparable size in several US time zones) or "USA"
- **THEN** each lead has no time zone and is flagged "time zone unclear"

### Requirement: Sync report
Each sync SHALL end in a report on Find leads: when it ran, whether it was Sync now or the daily sync, the number of leads created (of which flagged) and of rows skipped, and each skipped, flagged or noted row with its sheet row number (the header is row 1) and its reasons. The report SHALL hold no email address.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Report counts and lists rows
- **WHEN** a sync reads a valid row 2, a row 3 with no email, a row 4 with "Email sent" "Yes", a row 5 with the Buyer type "Surf shop" and a valid row 6
- **THEN** the report says 3 leads created, of which 1 flagged, and 2 rows skipped
- **AND** it lists row 3 "no email", row 4 "already contacted" and row 5 "type unknown", and not rows 2 and 6

#### Scenario: Header-only sheet
- **WHEN** the sheet's first tab holds its header row only
- **THEN** the report says 0 leads created and 0 rows skipped, with no error

### Requirement: Sheet layout
A sync SHALL read only the sheet's first tab, row 1 being the header. Columns SHALL be found by their header name, ignoring case and extra spaces, in any order. A sheet missing a needed column (Business, Buyer type, Email) or holding more than 2,000 rows below the header SHALL import nothing.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Needed column missing
- **WHEN** the first tab has no "Email" column, or no "Business", or no "Buyer type"
- **THEN** no lead is created and Find leads shows the failure naming the missing column

#### Scenario: Columns in another order
- **WHEN** the columns are in another order, with headers such as "  business " and "BUYER TYPE"
- **THEN** the sync imports the same leads with the same values as with the usual order

#### Scenario: Only the first tab is read
- **WHEN** the sheet has two tabs with valid rows and the link set on Settings points at the second tab
- **THEN** only the first tab's rows are imported

#### Scenario: Sheet over 2,000 rows
- **WHEN** the first tab holds 2,001 rows below the header
- **THEN** no lead is created and Find leads shows the failure "The sheet has more than 2,000 rows"

### Requirement: A failed sync keeps nothing
A sync SHALL keep its leads only if it reaches its end. When the sheet cannot be read or the sync fails before its end, no lead and no source from that sync SHALL be kept, existing leads SHALL be unchanged, and Find leads SHALL show the failure with its time and a reason the owner can read, for Sync now and the daily sync alike.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Sheet not shared with the tool
- **WHEN** the sheet set on Settings is not shared with the service account and the owner clicks Sync now
- **THEN** no lead is created or changed and Find leads shows the failure, its time and a reason saying the sheet is not shared with the tool

#### Scenario: Sheet link to no sheet
- **WHEN** the link set on Settings is a Google Sheets address of a sheet that does not exist and the owner clicks Sync now
- **THEN** no lead is created and Find leads shows the failure, its time and a reason saying the sheet cannot be found

#### Scenario: Google unavailable
- **WHEN** Google cannot be reached or answers with a server error during a sync
- **THEN** no lead is created or changed and Find leads shows the failure, its time and a reason saying Google could not be reached

#### Scenario: Sync fails before the end
- **WHEN** a sync fails after some of its rows were turned into leads
- **THEN** none of that sync's leads or sources is kept and existing leads, statuses and decisions are unchanged
- **AND** Find leads shows the failure with its time and reason

#### Scenario: Daily sync failure shown
- **WHEN** the daily sync fails because the sheet is not shared with the tool
- **THEN** Find leads shows it as the last report, a failure of the daily sync with its time and reason

### Requirement: Daily sync
The system SHALL sync the sheet once a day at 06:00 in Asia/Ho_Chi_Minh, the owner's time zone, the same way as Sync now. Without a sheet link the daily sync SHALL NOT run and SHALL leave no report.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Daily sync at six in the owner's morning
- **WHEN** the tool runs through a whole day with a sheet link set
- **THEN** one daily sync starts, at 06:00 Asia/Ho_Chi_Minh

#### Scenario: Daily sync imports like Sync now
- **WHEN** the daily sync runs on the sheet of "Report counts and lists rows"
- **THEN** it creates the same leads and the same report as Sync now would, marked as the daily sync

#### Scenario: No daily sync without a sheet link
- **WHEN** 06:00 Asia/Ho_Chi_Minh comes and no sheet link is set
- **THEN** no sync runs, no report or failure is added and no lead is created

### Requirement: One sync at a time
At most one sync SHALL run at a time, whether started by Sync now or by the daily sync. A sync asked for while another runs SHALL NOT start.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Second sync while one runs
- **WHEN** a sync is running and the owner clicks Sync now again
- **THEN** no second sync runs, the page says "A sync is already running", and each valid row gives one lead only

#### Scenario: Daily sync while one runs
- **WHEN** the daily sync starts while a Sync now is running
- **THEN** no second sync runs and no duplicate lead is created

### Requirement: Read-only access to the sheet
The system SHALL read the sheet with read-only access and SHALL never write to it.
Knowledge: `okf/integrations/google-sheets.md`, `okf/decisions/MOQ-1-lead-source-policy.md`

#### Scenario: Sync writes nothing to the sheet
- **WHEN** a sync runs
- **THEN** the tool asks Google for read-only access to spreadsheets and makes only read requests, so no cell, tab or format of the sheet changes

### Requirement: Sheet link and service account on Settings
Settings SHALL show the email address of the tool's Google service account, to share the sheet with, and SHALL let the owner save, change or clear the sheet link. Find leads SHALL offer Sync now only while a link is saved.
Knowledge: `okf/integrations/google-sheets.md`

#### Scenario: Settings shows the service account and saves the link
- **WHEN** the owner opens Settings, saves a Google Sheets link and reloads the page
- **THEN** Settings shows the service account's email address to share the sheet with, and the saved link

#### Scenario: Link that is not a Google Sheet
- **WHEN** the owner saves "https://shop.example/leads" as the sheet link
- **THEN** the link is not saved and Settings says it is not a Google Sheets link

#### Scenario: Sync now without a sheet link
- **WHEN** no sheet link is saved and the owner opens Find leads
- **THEN** Sync now is greyed out, clicking it starts nothing, and a link leads to Settings

### Requirement: Leads pages show imported leads
The Leads list and each lead's page SHALL show the real leads, read only: on the list each lead's name, client type, status, sources and flags; on its page also its values from the sheet, its email address, language and time zone. Their actions SHALL stay not connected until their own tickets.
Knowledge: `okf/domain/lead.md`, `okf/domain/lead-status.md`

#### Scenario: Imported leads on the Leads list
- **WHEN** the owner opens Leads after a sync
- **THEN** each imported lead is listed with its name, client type, status "waiting for review", the source "Google Sheet" and its flags, and the status filter works on them

#### Scenario: Imported lead's own page
- **WHEN** the owner opens an imported lead from the list
- **THEN** its page shows the row's values with the source "Google Sheet", its email address, status, flags, language and time zone
- **AND** its actions still say they are not connected yet
