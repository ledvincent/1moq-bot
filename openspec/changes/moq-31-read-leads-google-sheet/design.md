# Design: MOQ-31 read leads from the Google Sheet

## Context

See proposal.md, Why. Today:
- No lead is stored anywhere. `src/platform/db/schema.ts` holds one table, `app_setting` (`key` text primary key, `value` jsonb, `updated_at`), the owner's settings store owned by `platform` (MOQ-2 design D4). There is no `src/sourcing/` folder yet.
- `src/platform/queue.ts` wraps pg-boss 12.38.0 behind a `Queue` interface with `registerJob`, `enqueue` and `stop`; it has no schedule method. pg-boss's own `schedule(name, cron, data, { tz, missed })` exists. `src/main.ts` `start()` takes a `registerJobs` hook and builds the app with `buildApp({ pool, webDir, logger })`.
- `src/platform/http/app.ts` has `GET /health`, the static UI and the page-address not-found handler (MOQ-30 D2). No `/api/*` route exists yet.
- `src/platform/config.ts` reads `DATABASE_URL`, `PORT`, `HOST`, `WEB_DIR`, `DRY_RUN` and throws `SettingError` naming the setting, never its value.
- Find leads (`web/src/pages/find-page.tsx`) and Settings (`web/src/pages/settings-page.tsx`) show sample data with the page-level "Sample data" marker (MOQ-30). `web/src/app/connected-by.ts` has no entry for Sync now or the sheet link: the MOQ-30 page-map record says MOQ-31 connects them.
- The planned lead model is in `okf/data/lead.md` (draft): match keys, owner's overrides kept apart from researched values, `lead_fact`, `lead_email`.

The design follows:
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md`: leads, sync runs and the schedule live in PostgreSQL and pg-boss; no other store.
- `okf/decisions/MOQ-1-lead-source-policy.md`: official APIs only. The Sheets API is Google's official API; nothing is scraped.
- `okf/decisions/MOQ-1-personal-data-handling.md`: business contact data with its source; Google becomes a processor for this use (listed in `okf/integrations/google-sheets.md` at close-change).
- `okf/decisions/MOQ-2-folder-layout.md`: the `sourcing` module in `src/sourcing/`, its tables re-exported from `src/platform/db/schema.ts`, tests next to the code.
- `okf/decisions/MOQ-2-libraries-and-versions.md` and `okf/architecture/tech-stack.md`: no new library (D2); Luxon for zone checks.
- `okf/decisions/MOQ-3-settings-and-secrets.md`: the key is a new line in `app.env` and its template; logs carry names only.
- `okf/decisions/MOQ-30-page-map-and-addresses.md` and `okf/architecture/ui-style.md`: Sync now on Find leads (`/find`), the sheet link on Settings (`/settings`), no new page or menu item.
- `okf/architecture/overview.md`: every external service behind a small interface with a fake.

Earlier decisions kept: the MOQ-1 kickoff's lead model (one lead per business, match keys, overrides apart, unknown facts missing); MOQ-30's pages and its "Sample data" rule; MOQ-3's secrets handling. One kickoff plan is departed from, not undone: the overview's data flow has every lead created as "found" by `search.run` and moved to "waiting for review" by qualification. Sheet leads enter at "waiting for review" directly, because the ticket says so and the owner already chose them; `okf/domain/lead-status.md` and the overview get the new way in at close-change.

## Goals / Non-Goals

**Goals:**
- The `lead` tables in their first real form, usable by MOQ-32 (filter by source), MOQ-13 (review) and the later research tickets without a rename.
- A sync that is all-or-nothing: either the whole report and its new leads are saved, or nothing changes.
- The Google adapter testable without Google: tests never call a real API.

**Non-Goals:**
- Showing leads on Review or Leads (MOQ-13, MOQ-23, MOQ-32).
- Google Maps and Instagram columns of the lead (`map_place_id` and the like): their tickets add them.
- Editing a lead, or the owner's overrides UI.
- Any write to Google.

## Decisions

### D1. The Google Sheet is a lead source, read with a service account. Decision record needed

To be copied to `okf/decisions/MOQ-31-google-sheet-lead-source.md` at close-change.

**Context.** The owner keeps leads in a spreadsheet (the current Excel file). Finding leads on Google Maps and Instagram (MOQ-5 to MOQ-14) is deferred, so this list is the tool's first real source of leads. The kickoff named three sources (Google Maps, Instagram, Manual); `okf/decisions/MOQ-1-lead-source-policy.md` allows official APIs only. The tool runs on an always-on server (`okf/decisions/MOQ-1-cloud-web-service.md`) where no one is signed in to Google, the budget is €10 a month, and a later ticket writes status back to the sheet. Owner decision 2026-11-04: a Google Sheet, not a local Excel file.

**Decision.**
- "Google Sheet" is a fourth lead source, next to Google Maps, Instagram and Manual.
- The tool reads the sheet through the Google Sheets API v4 (`https://sheets.googleapis.com/v4/`), with a Google Cloud **service account** that the owner shares the sheet with, as Viewer. The token asks for the read-only scope `https://www.googleapis.com/auth/spreadsheets.readonly`, so Google itself refuses any write. The write-back ticket asks for the write scope and Editor sharing then.
- The service account key (Google's JSON key file) is a secret, `GOOGLE_SERVICE_ACCOUNT_KEY`, holding the key file's content in base64 on one line (D2).
- No Google library: the adapter signs the service account's token request itself (a JWT signed RS256 with `node:crypto`, exchanged at `https://oauth2.googleapis.com/token`) and calls two read endpoints with the built-in `fetch`. Token and API addresses are constants in the code; the key file's own `token_uri` is not used.
- The reader sits behind a small interface, `SheetReader` (`readSheet(link) → { title, rows }`, or a typed error), with a fake for tests.
- Sheets API use is free (quota of 300 read requests a minute per project); a sync makes three requests (token, sheet properties, values).

**Alternatives considered.**
- **A local Excel file uploaded to the tool**: works without Google, but the owner would re-upload after every edit, and no status can be written back. The owner chose the Google Sheet.
- **OAuth with the owner's Google account**: no service account to share with, but a refresh token of the owner's whole Google account sits on the server, it expires when the Google Cloud app stays in testing mode, and it asks the owner for a consent screen. The service account only sees what is shared with it.
- **Published-to-web CSV export of the sheet**: no credentials, but the sheet, with the founders' names and emails, would be public to anyone with the link.
- **`googleapis` (the official all-API client)**: hundreds of APIs for two calls, a large install and image, and harder to fake. **`google-auth-library`**: official and smaller, but brings its own HTTP stack (gaxios, gtoken) that the tests would have to intercept. The hand-written token request is about 40 lines of standard RS256 signing, tested against a generated key pair (D11); if it proves fragile, `google-auth-library` is the fallback, pinned exactly and added to the tech stack by its own change.

**Consequences.**
- Google becomes a processor for the lead data in the sheet; `okf/integrations/google-sheets.md` lists it with the setup steps (Google Cloud project, Sheets API on, service account, key, sharing).
- A new secret in `app.env` and its template; losing it means creating a new key in Google Cloud and sharing nothing again (the sheet is shared with the account, not the key).
- The owner must share the sheet with the service account's address, shown on Settings.
- The write-back ticket changes the scope and the sharing role, and records it.
- The kickoff's list of sources in `okf/domain/lead.md` gains "Google Sheet".

### D2. The service account key setting

- `GOOGLE_SERVICE_ACCOUNT_KEY` is **optional**: without it the tool starts, Settings says the service account is not set up (a developer task, naming the setting), and Sync now is unavailable with the same words. This keeps `pnpm dev` and CI working without a key.
- When set, `loadConfig` decodes it at start: base64, then JSON with `type: "service_account"`, `client_email` and `private_key` (PEM), and `crypto.createPrivateKey` must accept the key. Anything else stops the start with `Invalid setting: GOOGLE_SERVICE_ACCOUNT_KEY must be a base64 Google service account key file` (`SettingError`, no value printed, as for `DRY_RUN`).
- Base64 on one line, because the key file holds a multi-line PEM and quotes that Docker's `env_file` and Node's `--env-file` read differently. `deploy/app.env.example` and `.env.example` get a commented placeholder line with the command to make it (`base64 -w0 key.json`).
- `Config` keeps `{ clientEmail, privateKey }` (a `KeyObject`), never the raw string. The private key is used only by the adapter; it is never logged, returned by the API or put in an error. `client_email` is not secret: `GET /api/sheet` returns it for Settings.

### D3. Lead tables. Decision record needed

To be copied to `okf/decisions/MOQ-31-lead-tables.md` at close-change; `okf/data/lead.md` is updated to these names then and leaves `draft` for the parts built.

**Context.** `okf/data/lead.md` planned the lead record and left table and column names to rows 1 and 4. This change stores the first leads, from the sheet; MOQ-32 filters Review by source, and the research and qualification tickets add facts, types and time zones to the same leads. The owner's overrides (client type, language, time zone) must stay apart from researched values, so research never overwrites them. Unknown facts are missing rows, never guesses.

**Decision.** Tables in `src/sourcing/schema.ts`, re-exported from `src/platform/db/schema.ts`; one migration adding new tables only. Codes are stored as lowercase snake-case text with check constraints; the UI shows the words of `okf/`.

| Table | Columns | Notes |
|---|---|---|
| `lead` | `id` uuid PK; `name` text (empty when unknown); `status` text not null (the statuses of `okf/domain/lead-status.md`: `found`, `waiting_for_review`, `approved`, `rejected`, `contact_by_hand`, `emailed`, `replied`, `opted_out`, `bounced`, `sequence_finished`); `city_area` text; `country` text; `time_zone` text; `language` text (`en`, `fr`); `client_type` text (the 14 types of `okf/domain/client-types.md`, `other` included); `client_type_source`, `language_source`, `time_zone_source` text (where each researched value came from: `google_sheet` now, research and qualification sources later); `owner_client_type`, `owner_language`, `owner_time_zone` (the owner's overrides, same checks; empty on import); `website_url` text; `website_domain` text unique; `instagram_handle` text unique; `owner_name` text (**personal**); `flags` text[] not null default `{}` (`client_type_other`, `no_language`, `no_time_zone` for now); `created_at`, `updated_at` | Effective value = the owner's override, else the researched one |
| `lead_source` | `id` uuid PK; `lead_id` FK on delete cascade; `source` text (`google_sheet`, `google_maps`, `instagram`, `manual`); `detail` jsonb (for the sheet: `{ syncId, row }`); `found_at` | A lead keeps every source; index on `source` for MOQ-32 |
| `lead_email` | `id` uuid PK; `lead_id` FK on delete cascade; `address` text not null unique (trimmed, lowercased); `source` text; `found_at` | **Personal** when it names a person; kind and check result come with the email finder (MOQ-9) |
| `lead_fact` | `id` uuid PK; `lead_id` FK on delete cascade; `kind` text; `value` text; `source` text; `source_detail` text; `found_at` | Sheet kinds: `why_they_fit`, `notes`, and the row's own `buyer_type` or `language` text when it matched nothing (so the owner sees what the row said) |
| `sheet_sync` | `id` uuid PK; `trigger` text (`owner`, `schedule`); `status` text (`running`, `succeeded`, `failed`); `started_at`, `finished_at`; `error` text; `imported`, `skipped`, `flagged` int; `report` jsonb | Partial unique index on `(status) WHERE status = 'running'`: one sync at a time (D8). The last 30 runs are kept |

- **Where sheet values go** (answer 2026-11-04). Sheet values are **researched values**, not the owner's overrides: a Buyer type that matches a client type goes into `client_type`, a Language that is English or French into `language`, each with source `google_sheet` in `client_type_source` and `language_source`. An unmatched buyer type sets `client_type = 'other'` with the `client_type_other` flag; an unmatched or empty language leaves `language` empty with the `no_language` flag. The time zone placed from City / area goes into `time_zone` with `time_zone_source = 'google_sheet'`; unplaced, it stays empty with the `no_time_zone` flag. The override columns `owner_client_type`, `owner_language` and `owner_time_zone` stay empty on import, so later qualification (MOQ-11) or research may replace the client type, language or time zone; only the owner's own overrides, set in the tool by a later ticket, are never overwritten. Unknown values stay missing and flagged, never guessed. City / area goes into `city_area` as written; `country` stays empty (unknown).
- The sheet link is an `app_setting` row, key `sourcing.sheet_link`, value `{ url, spreadsheetId, sheetId }` (D5).

**Alternatives considered.**
- **One `lead` table with every sheet column** (why they fit, notes as columns): simpler for this ticket, but research facts need their source and date, which `lead_fact` already gives; the kickoff planned it.
- **Sheet values as the owner's overrides** (`owner_client_type`, `owner_language`): research would then never replace them. Rejected by the person on 2026-11-04: the sheet's buyer type and language are a starting point that qualification (MOQ-11) and research may correct; the overrides are kept for what the owner sets in the tool.
- **A `flags` table** instead of an array: flags are a handful of fixed codes read with the lead; an array with a check is enough, and a later ticket can move to a table if flags need dates.
- **Postgres enums** for status and codes: adding a value needs `ALTER TYPE`, which cannot run inside a transaction in every case; text with a check is changed by an ordinary migration.
- **The sync report as rows in a `sheet_sync_row` table**: the report is read whole and never queried by row; jsonb is enough.

**Consequences.**
- The lead tables live in `sourcing` for now. Later modules (enrichment, qualification, review, tracking) update leads through `sourcing`'s `index.ts`, or a later decision moves the tables to a shared place.
- Qualification and research may replace a sheet-sourced client type, language or time zone (and must then update its `_source` column); they never touch the `owner_` columns.
- Unique `website_domain`, `instagram_handle` and email address make "one lead per business" hold in the database, not only in code.
- Adding Google Maps (`map_place_id`), the `search` and `lead_search` tables, `decision`, `seen_business` and the other planned tables is left to their tickets.
- `okf/data/lead.md`, `okf/domain/lead.md` and `okf/domain/lead-status.md` are updated at close-change.

### D4. Module layout

```
src/sourcing/
  index.ts                 registerSourcing(app, deps) and registerSheetJobs(queue, deps)
  schema.ts                D3 tables
  sheet/reader.ts          SheetReader interface and its error types
  sheet/google-reader.ts   the Sheets API adapter (D1)
  sheet/fake-reader.ts     the fake for tests
  sheet/link.ts            parse a sheet link (D5)
  sheet/columns.ts         header matching (D5)
  sheet/rows.ts            one row to a candidate lead or a skip (D6)
  sheet/client-types.ts    Buyer type to client type (D6)
  sheet/place-time-zone.ts City / area to an IANA zone (D7)
  sheet/import.ts          match and save in one transaction (D8)
  sheet/sync.ts            sync runs: claim, run, finish (D8)
  sheet/routes.ts          /api/sheet/* (D10)
```

`buildApp` gets an optional `register` hook list so `main.ts` registers the sourcing routes without `platform` importing `sourcing`; `main.ts` already registers jobs through `registerJobs`. Pure parts (`link`, `columns`, `rows`, `client-types`, `place-time-zone`) have unit tests; `import` and `sync` have integration tests on PostgreSQL.

### D5. Reading the sheet

- **Link.** Settings accepts a link of the form `https://docs.google.com/spreadsheets/d/<id>/...`, optionally with `gid=<n>` (in the query or the `#` part). Anything else is refused on save: "This is not a Google Sheets link". The link is saved as `{ url, spreadsheetId, sheetId }` (`sheetId` null without `gid`).
- **Tab.** The adapter reads the sheet's properties (`GET /v4/spreadsheets/<id>?fields=sheets.properties(sheetId,title,index)`) and takes the tab whose `sheetId` is the link's `gid`, else the first tab. A `gid` that no longer exists fails the sync: "The tab in the sheet link no longer exists. Copy the link again from the tab with the leads."
- **Values.** `GET /v4/spreadsheets/<id>/values/<quoted tab title>?valueRenderOption=FORMATTED_VALUE` returns the rows as the owner sees them. Row 1 is the header row; row numbers in the report are the sheet's own row numbers (the first data row is row 2). Rows whose cells are all empty are ignored and not counted.
- **Headers.** Matched after trimming, lowercasing and collapsing spaces (also around `/`), so `City/Area` matches `City / area`; a bracketed part is optional, so `Owner / founder` matches `Owner / founder (public)`. Needed: Business, Buyer type, Email; when one or more is missing the sync fails and nothing is imported: "The sheet has no column named Email" (each missing one named). Optional: City / area, Language, Why they fit, Notes, Owner / founder (public), Website / Instagram, Email sent, Responded; a missing optional column reads as empty cells (so a missing Language column flags every lead). Ignored: Template slide, DM sent, Prototype, Production launched, and any other column. A header present twice uses the first and the report says so once.
- **Errors**, each a typed error with an owner-readable message; the Google answer body is never shown or logged:
  - token refused (400 or 401 `invalid_grant`): "Google refused the tool's service account. The developer must check GOOGLE_SERVICE_ACCOUNT_KEY."
  - 403: "The sheet is not shared with the tool. Share it with <client_email> as Viewer, then sync again."
  - 404 or a malformed id: "No sheet was found at this link. Check the link on Settings."
  - 429, 5xx, a network error or no answer within 20 seconds per request: "Google Sheets did not answer. Try again later."

### D6. From a row to a lead

Each data row is checked in this order; the first reason that applies is the row's skip reason:
1. **No email.** The Email cell is split on commas, semicolons, slashes and spaces; each part is trimmed, lowercased and kept if it looks like one address (`local@domain.tld`, no spaces). No address kept → skipped, "no email" (the reason says "the Email cell holds no address" when the cell was not empty). Every address kept is saved on the lead; the first is its main address.
2. **Already contacted.** "Email sent" or "Responded" filled: a cell is filled unless it is empty or `FALSE` (an unchecked checkbox), so any other value, "No" included, counts as filled (the safe side: a contacted lead is never imported again). Decided, answer 2026-11-04; re-check it against the real sheet's values when the sheet is first connected (task 7.4). Skipped, "already contacted".
3. **Duplicate**, checked against the database, then against the rows earlier in the same sheet:
   - an address equal to a stored lead's address: "duplicate: already imported (row N)" when that lead came from the sheet with this address, else "duplicate: same email as <lead name>";
   - a website domain or Instagram handle equal to a stored lead's: "duplicate: same website <domain> as <lead name>" or "same Instagram handle @<handle> as <lead name>";
   - the same against an earlier row: "duplicate of row N (same email | same website <domain> | same Instagram handle @<handle>)".
   No lead is changed and no address is added (answer 2026-11-04). This is also how a row already imported is read once: its address is in the tool, so the row is a duplicate whatever else changed (criterion 15).
4. Otherwise the row is **imported**, with flags:
   - **Business** → `name`. Business is a needed column, not a needed value: a row with an email but an empty Business cell is still imported (criterion 1), with no name (nothing is made up from the address), shown as "(no business name)".
   - **Buyer type** → `client_type` (below) with source `google_sheet`, else `other` and flag `client_type_other`, and the cell's text as a `buyer_type` fact. A researched value, never the owner's override (D3).
   - **Language**: `English`, `EN`, `Anglais` → `en`; `French`, `FR`, `Français`, `Francais` → `fr` (case and accents ignored), into `language` with source `google_sheet`; anything else, empty included → no language, flag `no_language`, and a non-empty cell kept as a `language` fact. Nothing is inferred from the city or the website. A researched value, never the owner's override (D3).
   - **City / area** → `city_area` as written, and a time zone by D7 into `time_zone` with source `google_sheet`, else flag `no_time_zone`. The owner's time zone override stays empty.
   - **Website / Instagram**: split on spaces, commas and slashes between items; an `instagram.com/<handle>` link or an `@handle` gives `instagram_handle` (lowercased, without `@`); another link or bare domain gives `website_url` and `website_domain` (host lowercased, `www.` removed). Hosts of social and link pages (`instagram.com`, `facebook.com`, `tiktok.com`, `linktr.ee`, `linkin.bio`, `beacons.ai`, `x.com`, `twitter.com`, `linkedin.com`) never count as a website domain; row 4 owns the final list. A cell that gives neither is kept as a `notes`-like fact of kind `website_instagram`.
   - **Why they fit**, **Notes** → `lead_fact` rows; **Owner / founder (public)** → `owner_name`. All facts have source `Google Sheet` and source detail `row N`.

**Client type matching** (`client-types.ts`): the Buyer type text is lowercased, accents removed, `&` read as `and`, and a final plural `s` dropped per word; it then matches a client type's name (`Cafés and roasters` → `cafe and roaster`) or one of a short alias list reviewed in the PR: each half of a two-part type alone (`Café`, `Roaster`, `Coffee roaster`, `Bar`, `Restaurant`), `Brewery`, `Clothing brand`, `Gym`, `Yoga studio`, `Pilates studio`, `Hotel`, `Resort`, `School`, `Run club`, `Sports club`, `Event`, `Festival`, `Startup`, `Tech startup`, `Band`, `Artist`, `Musician`, `Association`. Anything else is "Other" and flagged: no fuzzy matching, no AI.

### D7. City / area to a time zone, offline. Decision record needed

To be copied to `okf/decisions/MOQ-31-time-zone-from-place.md` at close-change.

**Context.** Sending windows are judged in the lead's IANA time zone, and a lead without one is never scheduled (`okf/domain/outreach-sequence.md`, CLAUDE.md "What is tricky here"). The sheet gives a free-text City / area, not coordinates. The budget allows no paid geocoding service, and a free one (Nominatim) adds a processor, a usage policy and a network call per row. An unknown fact must stay unknown, never guessed.

**Decision.**
- A place table in the code, `src/sourcing/sheet/place-time-zone.ts`, maps normalised place names to IANA zones:
  - **countries** with one zone on the mainland: every EU country, the United Kingdom (and England, Scotland, Wales, Northern Ireland, UK), Ireland, Switzerland, Norway, Singapore (`France` → `Europe/Paris`; Spain → `Europe/Madrid` and Portugal → `Europe/Lisbon` for the mainland, their islands named separately);
  - **regions** that decide the zone inside a country with several: Australia's states and territories with their abbreviations (`NSW`, `VIC`, `QLD`, `SA`, `WA`, `TAS`, `NT`, `ACT`), the Canary Islands, Madeira, the Azores, and US states later with phase 3;
  - **cities**: the city part of every zone name the runtime knows (`Intl.supportedValuesOf('timeZone')`, so `London`, `Paris`, `Melbourne`, `Brussels` need no entry), plus a reviewed list of other cities in the active markets (for example `Manchester`, `Brighton`, `Bristol`, `Lyon`, `Bordeaux`, `Marseille`, `Antwerp`, `Ghent`, `Geelong`, `Byron Bay`), first filled from the City / area values of the owner's sheet at build time (place names only).
- The cell is normalised (lowercase, accents removed) and split on commas, slashes, dashes and `(`; each part (and the whole cell) is looked up. The zone is set only when every part that matched gives the **same** zone. No part matched, or two parts give different zones (`Perth, Scotland`), means no time zone and the `no_time_zone` flag.
- Names that are cities in two markets with different zones (`Perth`, `Richmond`, `Newcastle`, `Cambridge`) are marked ambiguous: alone they place nothing; with a country or region part that agrees, they place.
- Every zone in the table must be valid for Luxon (`IANAZone.isValidZone`), checked by a unit test, so a typo cannot reach the sending schedule.

**Alternatives considered.**
- **A geocoding API** (Google Geocoding, Nominatim): paid, or a processor with a usage policy and rate limits, for a list of a few hundred rows; and a wrong first match is a silent guess.
- **A city dataset package** (for example `city-timezones`): thousands of cities, but a third-party dataset to pin and trust, and it returns the most populous match for ambiguous names, which is a guess.
- **Asking the AI**: emails and page text rules aside, an AI answer is a guess by nature.
- **The owner's zone or the server's as a default**: the very mistake the send schedule forbids.

**Consequences.**
- Places not in the table give no time zone and a flag; research may place it later, or the owner sets the zone in the tool (the owner's override, a later ticket). Coverage grows by adding names to the table in a reviewed change.
- Enrichment (MOQ-8 and the lead's location) can reuse the table; if it does, the file moves to a shared place by that ticket.
- A country with several zones (Australia, the United States) never places by its name alone.

### D8. A sync run: one at a time, all or nothing

- **Claim.** `claimSync(trigger)` runs one transaction: it first marks as `failed` ("The sync stopped before it finished; run it again.") any `running` row started more than 10 minutes ago (a crash or a restart mid-sync), then inserts a `running` row. The partial unique index makes a second insert fail while one is running: Sync now then answers 409 "A sync is already running (started HH:MM)", and a scheduled run logs `Sheet sync skipped: a sync is running` and ends.
- **Job.** Sync now claims, then enqueues `sheet.sync` with `{ syncId }` and answers 202 with the run. The scheduled job arrives with no `syncId` and claims for itself with trigger `schedule`. The `sheet.sync` queue has `retryLimit: 0` (a failed sync is reported, not retried behind the owner's back) and `expireInSeconds: 300`.
- **Run.** Read the link and the key (none: the run fails with the Settings message); read the whole sheet (D5); check the headers; parse every row (D6). Any failure here ends the run `failed` with its message and touches no lead.
- **Save.** One transaction: match each candidate against the database (D6 step 3) with the stored addresses, domains and handles read inside the transaction, insert the new leads with their `lead_source`, `lead_email` and `lead_fact` rows, write the report and counts, set the run `succeeded`, and delete runs beyond the last 30. A database error rolls everything back and the run is set `failed` ("The leads could not be saved; nothing was imported. Try again.") in a separate statement. The unique indexes (D3) stop a duplicate even if another way of adding leads (MOQ-6 later) races the sync.
- **Report** (`report` jsonb): `{ sheetTitle, rows: [{ row, business, outcome: 'skipped' | 'flagged', reasons: [{ code, text }] }] }`. Codes: `no_email`, `already_contacted`, `duplicate` (with what it matches), `client_type_other`, `no_language`, `no_time_zone`. Counts: imported (flagged included), skipped, flagged. The report holds row numbers, business names and reasons, never email addresses, notes or founders' names. Logs carry the run id, counts and the error code only.

### D9. Do-not-contact is not checked at import

Confirmed from the coverage table: the do-not-contact list (MOQ-18) does not exist yet, and the send gate refuses a do-not-contact address at the moment of sending (`okf/decisions/MOQ-1-send-gate.md`), so a listed address imported from the sheet is never emailed. Whether review should also hide such leads is for MOQ-18 to decide.

### D10. Daily schedule, API and pages

- **Schedule.** `Queue` gets `schedule(name, cron, options: { tz })`, a thin wrapper over pg-boss's `schedule` (an upsert by name, so a restart keeps one schedule). `registerSheetJobs` schedules `sheet.sync` at `0 6 * * *` in `Asia/Ho_Chi_Minh` (06:00 for the owner, before their day; Vietnam has no daylight saving) with `missed: 'once'`, so a server that was down at 06:00 runs one sync on its next pass. A scheduled run without a sheet link or a key does nothing and logs which is missing. The time is a constant in `src/sourcing/index.ts`, not a setting (one owner, Sync now covers the rest).
- **API** (JSON, behind MOQ-4's gate once merged):
  - `GET /api/sheet` → `{ link: { url } | null, serviceAccountEmail: string | null, latest: SyncRun | null, running: boolean }`.
  - `PUT /api/sheet/link` `{ url }` → 200 with the saved link, 400 "This is not a Google Sheets link"; `{ url: "" }` clears it.
  - `POST /api/sheet/syncs` → 202 with the run; 409 when no link is set ("Set the sheet link on Settings first"), when the key is not set, or when a sync is running.
  - `GET /api/sheet/syncs/latest` → the latest run, running or finished.
- **Find leads.** A "Google Sheet" section first on the page: the sheet title and link; **Sync now**. Without a link, Sync now is disabled and the section says "Set the sheet link on Settings" with a link to `/settings`; without a key, it says the service account is not set up. While a run is running the button is disabled, the section says "A sync is running, started HH:MM", and the page asks for the latest run every 2 seconds until it ends. The latest report: date and time (the owner's browser time), started by the owner or the schedule, the three counts, then a table (Row, Business, Outcome, Reason). Duplicates marked "already imported" are grouped under a closed `<details>` with their count, so the daily report stays short. A failed run shows its message instead.
- **Settings.** A "Google Sheet" section first on the page: the link field with Save, and "Share the sheet with <service account email> as Viewer" (or "Not set up yet: the developer sets GOOGLE_SERVICE_ACCOUNT_KEY").
- **Sample data.** Both pages keep their other sections as sample data and keep the page-level "Sample data" marker, so the platform requirement "Pages show sample data" and its test stay as they are. The Google Sheet sections say "Live data from your sheet" under their heading. No `connected-by.ts` entry changes (none existed for these actions).
- `web/src/api.ts`: a small `fetch` helper (JSON in and out, error message from the answer). MOQ-4 adds a helper with the same name; see Risks.

### D11. Tests

- **Fake reader** (`fake-reader.ts`): returns given rows, or throws a given error; counts calls. Every sync, import and route test uses it.
- **Google adapter** tested with an injected `fetch` and a key pair generated in the test (`crypto.generateKeyPairSync('rsa')`): the token request's JWT verifies with the public key, has the read-only scope, the service account as issuer and a lifetime of at most one hour; only `GET` requests go to the Sheets API (proof that nothing is written); each error status maps to its message; a timeout maps to "did not answer".
- **Integration** (`*.int.test.ts`, real PostgreSQL): import, duplicates, read-once, all-or-nothing on a failed read, one sync at a time (two claims in parallel: one wins), the schedule row in `pgboss.schedule` (one row, `0 6 * * *`, `Asia/Ho_Chi_Minh`, still one after a second start).
- **Pages** (happy-dom, `fetch` stubbed): Find leads with no link, running, with a report; Settings with the share address.

## Risks / Trade-offs

- [MOQ-4 (open) also edits `src/platform/config.ts`, `src/platform/http/app.ts`, `.env.example`, `deploy/app.env.example`, adds a `web/src/api.ts` and its own migration] → Whoever merges second regenerates the migration (`pnpm db:generate` on top of the other's journal), keeps both settings and one `api.ts` (MOQ-4's 401 redirect plus this change's JSON helper). Name it in both PRs.
- [Until MOQ-4 merges, `/api/sheet/*` is not behind sign-in] → Local only: the production server does not exist (MOQ-29) and this change must not reach it before MOQ-4 (proposal). Once MOQ-4 merges, its root `onRequest` gate covers these routes and its Origin check covers the `PUT` and `POST` (the UI calls from the same origin).
- [The real sheet's headers or values differ from the ticket's table (another header row, checkbox values, multi-address cells)] → Header errors name the missing columns; the report shows every skip with its reason; the filled-cell rule (D6) and the seeded tables (Open Questions 1) are re-checked when the real sheet is first connected (task 7.4).
- [Place table coverage: many cities unplaced at first] → Flagged, never scheduled; seeded from the sheet's own City / area values; grows by reviewed additions.
- [An owner who edits a row's Email creates a new lead for the same business, unless its website or handle matches] → Documented in `okf/integrations/google-sheets.md`; the write-back ticket can keep a row id in the sheet.
- [Hand-written token signing] → Standard RS256 over two JSON parts, tested by verifying the signature with the matching public key; scope and endpoints are constants. Fallback: `google-auth-library`.
- [The key reaches the app container as an environment variable, like every `app.env` line (MOQ-3 consequence)] → Never logged or returned; `Config` holds a `KeyObject`; the key only grants read access to sheets shared with it.
- [pg-boss's schedule outlives a rollback: the previous image has no `sheet.sync` worker] → Its daily job waits in the queue and expires; harmless. The runbook note says `unschedule` if the rollback is kept.

## Migration Plan

1. The migration adds tables only (`lead`, `lead_source`, `lead_email`, `lead_fact`, `sheet_sync`), so the previous image still runs on the migrated database (`okf/decisions/MOQ-3-release-by-image-tag.md`).
2. Locally: create the service account (steps in `okf/integrations/google-sheets.md`), put the base64 key in `.env`, share a test sheet, set its link on Settings, Sync now.
3. Production: only after MOQ-4 is merged and MOQ-29 has set up the server; the key goes into `/etc/1moq/app.env`.
4. Rollback: `bash deploy/deploy.sh --previous`; the tables and imported leads stay; see the schedule note in Risks.

Knowledge at close-change: decision records from D1, D3 and D7; `okf/integrations/google-sheets.md` (new: setup, scope, sharing, quotas, the processor entry); `okf/data/lead.md`, `okf/domain/lead.md`, `okf/domain/lead-status.md`; `okf/architecture/overview.md` (`sheet.sync` job, the API, the external service, the sourcing data flow); `okf/decisions/MOQ-1-personal-data-handling.md` processor list if it is kept there; the lead-sourcing spec's Purpose (names the Google Sheet).

## Open Questions

Deferrable: it changes neither the specs nor the tasks.

1. **Real header names and City / area values.** The header matching (D5), the client type aliases (D6) and the place table (D7) are seeded from the owner's sheet when the developer first connects it.

Answered 2026-11-04 (no longer open): the "Email sent" / "Responded" rule (D6 step 2, kept as designed; re-check against the real sheet when it is connected) and where sheet values go (D3: researched values, the overrides empty on import).
