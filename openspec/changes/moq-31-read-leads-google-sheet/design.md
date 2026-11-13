# Design: MOQ-31 read leads from the Google Sheet

## Context

See proposal.md, Why. Today:
- The database holds one table, `app_setting` (key, JSON value), owned by `platform` (`src/platform/db/schema.ts`). No `lead` table, no module folder other than `src/platform/`.
- `src/platform/queue.ts` wraps pg-boss: `registerJob`, `enqueue`, `stop`; no schedules yet. `src/main.ts` `start()` takes a `registerJobs` hook; `buildApp()` (`src/platform/http/app.ts`) registers `/health`, the static UI and the page-address fallback, no `/api` route.
- `src/platform/config.ts` reads the settings at start and stops on a missing or invalid one, naming it, never printing a value.
- The pages are MOQ-30's, on sample data: `web/src/pages/find-page.tsx`, `settings-page.tsx`, `leads-page.tsx`, `lead-page.tsx`; `PageHeader` takes `sample` (the "Sample data" pill); every action not built yet is a `NotConnectedAction` listed in `web/src/app/connected-by.ts`.
- MOQ-4 (sign-in, `openspec/changes/moq-4-owner-sign-in/`) is planned, not built: its root `onRequest` hooks will cover every `/api` route added here, and its cross-site check needs the `Origin` header the browser sends on `fetch`.

The design follows:
- `okf/architecture/overview.md` (modules, data flow, external services as processors) and `okf/decisions/MOQ-2-folder-layout.md` (`src/<module>/`, tables re-exported from `src/platform/db/schema.ts`, a module used only through its `index.ts`, tests next to code);
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md` (PostgreSQL only, pg-boss for jobs and schedules) and `okf/decisions/MOQ-2-libraries-and-versions.md` (exact pins, Luxon for IANA zones, a new library listed in `okf/architecture/tech-stack.md`);
- `okf/decisions/MOQ-3-settings-and-secrets.md` (a new secret is a line in `app.env` and its template, never in the repo, the image or the logs);
- `okf/decisions/MOQ-1-personal-data-handling.md` and `okf/domain/do-not-contact-list.md` (keyed HMAC hashes, never deleted, a new processor listed);
- `okf/decisions/MOQ-1-lead-source-policy.md` (official APIs only), `okf/decisions/MOQ-30-page-map-and-addresses.md` and `okf/architecture/ui-style.md` (pages, shared UI parts).

## Goals / Non-Goals

**Goals:**
- One code path for Sync now and the daily sync, all or nothing, one at a time.
- Every rule on a row is a pure function, unit-tested apart from the database and Google.
- Google behind a small interface with a fake: tests never call Google.
- The lead tables MOQ-5 to MOQ-25 build on, without columns nobody fills yet.

**Non-Goals:**
- Retrying a failed sync automatically: the owner clicks Sync now again, or the next day's sync runs.
- Writing the do-not-contact list or the seen businesses (MOQ-18, MOQ-25, the retention sweep); only their tables and lookups.
- Lead history, filters other than status, and the owner's overrides (MOQ-11, MOQ-23).
- Translating city names: the place list holds each city's main and ASCII names only.

## Decisions

### D1. The Google Sheet as a lead source, read through the Sheets API with a service account. Decision record needed

To be copied to `okf/decisions/MOQ-31-google-sheet-lead-source.md`.

**Context.** The owner keeps leads in a spreadsheet and, on 2026-11-04, chose a Google Sheet over a local Excel file so the always-on server can read it (and later write status back). Finding leads on Google Maps and Instagram is deferred, so the sheet is the tool's first lead source. The rows hold personal data (owners' names, addresses, notes). The tool runs unattended on a server, for one owner, within €10 a month, and every external service sits behind an interface with a fake ([lead source policy](/decisions/MOQ-1-lead-source-policy.md), [personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

**Decision.**
- The tool reads the sheet through Google's official Sheets API v4 with a **service account** of a Google Cloud project owned by the company (Sheets API enabled, no project roles). The owner shares the sheet with the service account's email address as Viewer; Settings shows that address. The key is the secret `GOOGLE_SERVICE_ACCOUNT_KEY` (D7).
- **Read-only**: the access token asks for the `https://www.googleapis.com/auth/spreadsheets.readonly` scope only, and the tool makes two GET requests per sync: the spreadsheet's tab list (`fields=sheets.properties`), then the first tab's values (`valueRenderOption=FORMATTED_VALUE`, rows 1 to 2,002), so a ticked checkbox reads `TRUE` and a date reads as the sheet shows it.
- The access token comes from `google-auth-library` (Google's official Node.js auth library, pinned exactly, the latest release on the day it is added); the two requests use Node's `fetch` with a 20-second time-out.
- A sync runs on the server as a pg-boss job, when the owner clicks Sync now and **once a day at 06:00 Asia/Ho_Chi_Minh**. It is **all or nothing**: the sheet is read first, then every row is written in one database transaction, so a failure keeps nothing. **One sync runs at a time**, enforced by the database (D4).
- The adapter sits behind the `SheetSource` interface in `src/sourcing/`, with a fake for tests.

**Alternatives considered.**
- *A local Excel file uploaded by the owner*: no Google dependency, but the server cannot read the owner's file on a schedule, and writing status back means the owner downloads a file each time. Rejected by the owner (2026-11-04).
- *The owner signs in with Google (OAuth) and the tool reads with the owner's account*: no key file, but the tool would hold a refresh token to all of the owner's spreadsheets, and the consent screen of an unverified app expires tokens after 7 days in testing mode. A service account sees only what is shared with it.
- *A published CSV link ("Publish to the web")*: no credentials at all, but the sheet, personal data included, becomes public to anyone with the link.
- *The full `googleapis` package or `@googleapis/sheets`*: generated clients far larger than two GET requests need. *Signing the service account's JWT by hand with `node:crypto`*: no dependency, but the tool would own token signing, caching and renewal, which Google's library already does.
- *Read and write scope now, for the later status write-back*: the later ticket asks for it when it needs it; until then a leaked key cannot change the sheet.

**Consequences.**
- Google (Sheets API) becomes a data processor: listed in `okf/integrations/google-sheets.md` and the overview's external services. The Sheets API is free within its quotas (two read requests per sync).
- Setting up a new environment needs the Google Cloud project, the service account and its key (`okf/integrations/google-sheets.md` says how). A missing key does not stop the tool; Settings says Google access is not set up and a sync fails with that reason.
- The later write-back ticket changes the scope, and the owner then shares the sheet as Editor.
- The sheet must not hold more than 2,000 rows below its header; a bigger sheet fails with "The sheet has more than 2,000 rows".
- This change is not deployed to the production server before MOQ-4 (sign-in): imported leads hold personal data.

### D2. Lead tables and keyed-hash tables. Decision record needed

To be copied to `okf/decisions/MOQ-31-lead-tables.md`; `okf/data/lead.md` is updated with the table and column names at finish.

**Context.** The kickoff design planned `lead`, `lead_fact`, `lead_email`, `seen_business` and `do_not_contact` and left names and types to the first ticket that builds them (rows 1 and 4). MOQ-5 is deferred, so MOQ-31 is that ticket. The sheet adds the email address as a match key, a "Google Sheet" source, and a row order that MOQ-32 sorts the Review queue by. The do-not-contact check and the "already decided" check must not store addresses readably ([do-not-contact list](/domain/do-not-contact-list.md), [personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

**Decision.** In PostgreSQL, through Drizzle, one migration:
- `lead` (module `sourcing`): `id` (uuid), `name`, `status` (a lead status of `okf/domain/lead-status.md`, as text with a check), `status_changed_at`, `client_type` (one of the 13 client types or `Other`; null until known), `fit_level` (null), `language` (`en`, `fr` or null), `time_zone` (an IANA zone or null), `flags` (text array: `type unknown`, `no language`, `no time zone`, `time zone unclear`), `website_domain` and `instagram_handle` (match keys, each unique when set), `import_position` (bigint from a sequence, set when a lead is created by a sync, so it follows the sheet's row order and the order of syncs), `created_at`, `updated_at`. The map place ID column comes with MOQ-5; the owner's override columns with MOQ-11.
- `lead_email` (`sourcing`): `lead_id` (cascade), `address` (as written in the sheet, without surrounding spaces and "mailto:"), `address_normalised` (unique across leads: the email match key), `source`, `created_at`. Kind and check result come with MOQ-7 and MOQ-10.
- `lead_fact` (`sourcing`): `lead_id` (cascade), `kind`, `value`, `source`, `found_at`; unique on (lead, kind, source). The sheet's values are facts with the source `Google Sheet` and the kinds `buyer_type`, `language`, `city_area`, `why_they_fit`, `website_instagram`, `owner_founder`, `notes`, stored exactly as read; an empty cell is no row. Business is the lead's `name`; Email is the `lead_email` row.
- `lead_source` (`sourcing`): `lead_id` (cascade), `source` (`Google Sheet` here; `Google Maps`, `Instagram`, `Manual` later), `sheet_sync_id`, `sheet_row`, `added_at`; primary key (lead, source), so a lead lists each source once.
- `sheet_sync` (`sourcing`): `id`, `trigger` (`now` or `daily`), `status` (`running`, `done`, `failed`), `started_at`, `finished_at`, `created_count`, `flagged_count`, `skipped_count`, `lines` (JSON: row number, outcome, reasons), `failure` (the reason shown to the owner). A partial unique index on `status` where it is `running` allows one running sync. The report holds row numbers and reasons only, never a name or an address.
- `seen_business` (`sourcing`, with the lead data): `key_hash` (bytea, primary key), `last_decision`, `created_at`. One row per match key of a deleted lead.
- `do_not_contact` (module `compliance`): `address_hash` (bytea, primary key), `reason`, `added_at`. A trigger refuses `DELETE` and `TRUNCATE` on it, so the list is never emptied, even by mistake (written as a custom migration, since drizzle-kit does not generate triggers).
- **Keyed hashes**: HMAC-SHA256 with the secret `MATCH_HASH_KEY` (D7) over a typed input: `email:<normalised address>`, `domain:<website domain>`, `instagram:<handle>`. The same function serves both tables (`src/platform/keyed-hash.ts`).
- **Email normalisation** (one rule for matching and for the do-not-contact list): trim, drop a leading `mailto:` (any case), lower-case the whole address. It is the compliance module's rule, exported from `src/compliance/index.ts`.

**Alternatives considered.**
- *The sheet's columns as columns of `lead`*: simpler queries, but the kickoff model keeps each fact with its source, and Maps, Instagram and the AI profile add the same kinds of facts from other sources later.
- *A JSON column holding the whole row*: no schema for the values, and the "unknown fact is a missing row" rule would not hold.
- *Ordering by `created_at`*: rows of one sync are written within the same milliseconds; a sequence gives an exact order.
- *Readable addresses in `seen_business` or `do_not_contact`*: simpler, but keeps personal data after deletion, against the personal data decision.
- *A plain SHA-256 without a key*: an address can be confirmed by hashing a guess; the key makes the hashes useless without the server's secret.
- *A database lock (advisory lock) instead of the unique index for one running sync*: held only by the session, invisible to the page; the `running` row also tells Find leads that a sync runs.

**Consequences.**
- `MATCH_HASH_KEY` is part of the data: changing or losing it makes every do-not-contact and seen-business hash unmatchable. It is kept with the other secrets in `/etc/1moq/` and backed up apart from the database (MOQ-29).
- MOQ-18 writes `do_not_contact` with `normaliseEmail` and the keyed hash; MOQ-25 and the retention sweep write `seen_business` before deleting a lead (each match key, the email included, with the last decision).
- MOQ-5 adds the map place ID; MOQ-11 the override columns; MOQ-7 the email kind and the language and time zone from research (see "Constraints left to later tickets").
- MOQ-32 orders the Review queue by `import_position` and filters on `lead_source`.

### D3. City / area to time zone through an offline place list. Decision record needed

To be copied to `okf/decisions/MOQ-31-offline-place-lookup.md`.

**Context.** Sending is judged in the lead's IANA time zone, and a lead without one is never scheduled. The sheet gives a free-text "City / area". A geocoding API would be a new paid service or processor, against the €10 budget. An unknown fact must stay unknown, never guessed.

**Decision.**
- The tool ships a place list built from GeoNames (CC BY 4.0): cities with at least 15,000 people (`cities15000`), with their main and ASCII names, country code, IANA zone and population, and the countries (`countryInfo`, ISO codes and English names) with the zones in each (`timeZones`), plus a short alias list in code (UK, Great Britain, England, Scotland, Wales, Northern Ireland, USA, US, America, and French names of the market countries such as Angleterre, Royaume-Uni, Allemagne, Belgique, Suisse, États-Unis, Australie).
- A developer script, `scripts/build-places.mjs`, turns downloaded GeoNames files (given as arguments) into two tab-separated files in `src/platform/places/data/`, committed with the download date and the attribution in their first line; `THIRD_PARTY_NOTICES.md` gives the attribution. The image carries them with the code; nothing is downloaded at build or run time. Zones Luxon does not know are dropped when the list loads.
- `placeTimeZone(text)` in `src/platform/places/` returns a zone, "unclear" or "none". Names are compared after trimming, lower-casing, removing accents and dots, and collapsing spaces:
  1. Empty → none.
  2. "City, …, Country" whose last part is a country: the zones of the cities of that name in that country; if no city matches, the country's zones. One distinct zone → that zone; more than one → unclear (no tie-break: the owner named the country).
  3. Otherwise the first part. If it is a country's name or code: the country's zones; one → that zone, more than one → unclear.
  4. Otherwise a bare city name: the cities of that name. None → none. One distinct zone → that zone. Several zones → the **tie-break**: the most populous match wins when its population is at least 10 times that of every match in another zone (matches in its own zone do not count against it); otherwise unclear.
  So "Lyon, France" gives Europe/Paris, "Leeds, UK" Europe/London, "France" Europe/Paris, "Paris" Europe/Paris (Paris, Texas is about 25,000 people), "London" Europe/London (London, Ontario is about 400,000 against about 9 million), "Springfield" (Missouri, Massachusetts, Illinois, Oregon and Ohio, of comparable size) and "USA" are unclear, an invented place is none. "Manchester" is expected to stay unclear too: GeoNames counts about 400,000 people for Manchester, England against about 115,000 for Manchester, New Hampshire, under the factor of 10. The populations are GeoNames'; the unit tests use the shipped list, so a refreshed list that changes an outcome shows up there.
- The tie-break was chosen by the person on 2026-11-13, replacing "any name in more than one zone is unclear" (answer 4 of the same day): a bare city name in the owner's sheet almost always means the far larger city, and the factor of 10 keeps comparable namesakes unclear.
- It lives in `platform` because sourcing uses it now and enrichment (MOQ-7) will use it for leads found elsewhere.

**Alternatives considered.**
- *A geocoding API (Google Geocoding, Mapbox, OpenCage)*: better at messy input, but a paid or rate-limited service, a new processor receiving lead locations, and network failures inside a sync.
- *The AI*: a guess, against "an unknown fact is never a guess", and a new place where sheet text reaches the AI.
- *Always picking the most populous match*: Springfield, Missouri would win over Springfield, Massachusetts by a few thousand people, a guess with no flag.
- *No tie-break (every name in more than one zone is unclear)*: safe, but Paris and London, the commonest entries, would all need the owner's attention. Replaced on 2026-11-13.
- *GeoNames with alternate names (every language)*: finds "München" or "Londres", but the file grows about tenfold.
- *Downloading the list when the image is built*: a network call and a moving input in every build.

**Consequences.**
- A bare city name with a namesake of comparable size in another zone (Springfield) is flagged "time zone unclear"; writing "City, Country" fixes it. The report lists those rows so the owner can correct the sheet; the owner's own time zone setting comes with a later ticket.
- A bare name the owner meant as the small namesake (Paris, Texas) gets the large city's zone; writing "City, Country" avoids it, and the lead page shows the zone.
- Towns under 15,000 people resolve only through their country, and only when the country has one zone.
- The list is refreshed by rerunning the script, in a ticket; the attribution travels with the data.

### D4. The sync run

`src/sourcing/sheet-sync.ts`, used by both triggers:
1. **Start** (`startSync(trigger)`): read the sheet link (`app_setting` key `sheet.link`). No link: Sync now answers "No sheet link is set"; the daily sync returns without a trace (no report). Otherwise insert a `sheet_sync` row with status `running` in its own statement; a unique-index violation means "A sync is already running" (Sync now answers it; the daily sync logs it and stops).
2. **Run** (`runSync(id)`): read the first tab through `SheetSource` (outside any transaction), check the header and the row limit (D5), then in **one transaction** handle the rows in order (D5), write the leads, emails, facts and sources, and set the `sheet_sync` row to `done` with its counts and lines. Commit.
3. **Failure**: any error rolls the transaction back; the `sheet_sync` row is then set to `failed` with the owner-readable reason (D6) and `finished_at`. The error itself is logged with the sync id, never with cell values.
4. **Jobs**: Sync now enqueues `sheet.sync` with the sync id (no retry); the API answers at once with the id. The daily schedule is a pg-boss schedule on the queue `sheet.sync.daily` with cron `0 6 * * *` and the time zone `Asia/Ho_Chi_Minh`; its handler calls start and run in turn. `Queue` gets a `schedule(name, cron, data, { tz })` method in `src/platform/queue.ts`.
5. **Restart**: at start-up, before the jobs are registered, any `running` sync is set to `failed` with "The tool restarted during the sync", so the index never stays held. A `sheet.sync` job whose sync is no longer `running` does nothing.
6. **Test hook**: `runSync` takes an optional `afterRow` callback (tests only) so a test can make a sync fail after some rows were written.

Rows of 2,000 leads mean about 10,000 statements in one transaction: a few seconds, well inside the job's limits.

### D5. Reading a row

Pure functions in `src/sourcing/sheet-rows.ts` and `src/sourcing/row-rules.ts`:
- **Header**: row 1 of the first tab. A header is compared after trimming, collapsing inner spaces and lower-casing. Columns: `Business`, `Buyer type`, `City / area`, `Language`, `Why they fit`, `Notes`, `Owner / founder (public)` (also accepted as `Owner / founder`), `Website / Instagram`, `Email`, `Email sent`, `Responded`. Needed: Business, Buyer type, Email; missing ones fail the sync with `The sheet has no "<name>" column` (every missing one named). Another column is ignored; a missing optional column reads as empty; with two columns of one name, the first counts.
- **Row limit**: values are requested for rows 1 to 2,002; more than 2,001 rows returned (header plus 2,001) fails the sync with "The sheet has more than 2,000 rows" before anything is written. Google returns no trailing empty rows; an empty row in the middle is ignored, neither imported nor listed.
- **Row number**: its position in the tab, the header being row 1.
- **Checks, in this order, the first that applies decides** (a skipped row has one reason):
  1. *Email*: the cell is split on commas, semicolons, slashes and spaces; each piece loses a leading `mailto:`. No piece → "no email". No valid piece → "invalid email". Otherwise the first valid one is kept, and any other piece adds the note "other addresses ignored". Valid: one `@`, a local part of 1 to 64 characters (letters, digits and ``!#$%&'*+/=?^_`{|}~.-``, no leading, trailing or double dot), a domain of at least two labels of letters, digits and hyphens (no label starting or ending with a hyphen, a last label of at least two letters), 254 characters at most.
  2. *Business* empty after trimming → "no business name".
  3. *Email sent* or *Responded*, trimmed and lower-cased, anything but empty, `false` or `no` → "already contacted".
  4. *Do-not-contact*: the keyed hash of the normalised address is in `do_not_contact` → "do not contact".
  5. *Seen business*: the keyed hash of the address, the website domain or the handle is in `seen_business` → "already decided".
  6. *Duplicate*: a lead with that normalised address, else that website domain, else that handle (earlier rows of the same sync included, since they are already written in the transaction) → "duplicate". The lead gets a `lead_source` row "Google Sheet" for this sync and row if it has none; nothing else of it changes.
  7. Otherwise a lead is created (status "waiting for review", next `import_position`, source "Google Sheet").
- **Website / Instagram**: each piece of the cell (split on spaces and commas) is read as `@handle`, an `instagram.com` link (its first path part is the handle, unless it is `p`, `reel`, `reels`, `explore`, `stories`) or a website (the host, lower-cased, without `www.`). A host that is, or is under, a social or link-in-bio domain (`instagram.com`, `facebook.com`, `fb.com`, `tiktok.com`, `x.com`, `twitter.com`, `linkedin.com`, `youtube.com`, `linktr.ee`, `beacons.ai`, `lnk.bio`, `bio.link`, `carrd.co`, `google.com`, `goo.gl`) is not a website. A handle is lower-cased and kept only if it is 1 to 30 letters, digits, dots or underscores. The first domain and the first handle found are kept. The list is `src/sourcing/not-website-domains.ts`; the kickoff left it to row 4 (MOQ-5), deferred, so it starts here and MOQ-5 extends it.
- **Client type**: the Buyer type, with accents removed (Unicode NFD without combining marks), lower-cased, trimmed and spaces collapsed, equal to one of the 13 client type names treated the same way. Anything else, an empty cell or "Other" included, gives `Other` and the flag "type unknown". The names live in `src/platform/client-types.ts` (shared by qualification, writing and sending later).
- **Language**: the same normalisation; `english`, `en`, `anglais` → `en`; `french`, `fr`, `francais` → `fr`; anything else, empty included → none and the flag "no language".
- **Time zone**: `placeTimeZone` (D3); unclear → the flag "time zone unclear", none → "no time zone".
- A created lead with at least one flag counts as flagged; its line in the report lists its flags and its note, if any.

### D6. Failure reasons shown to the owner

| Cause | Reason on Find leads |
|---|---|
| Google answers 403 | The sheet is not shared with the tool. Share it with <service account email> as Viewer. |
| Google answers 404, or 400 on the spreadsheet id | The sheet cannot be found. Check the link on Settings. |
| Time-out, network error, 429 or 5xx | Google could not be reached. Try again later. |
| Token refused (401, invalid key) | Google refused the tool's access key. The service account key needs checking. |
| No key set | The tool's Google access is not set up. |
| Needed column missing | The sheet has no "Email" column. (each missing column named) |
| Over the limit | The sheet has more than 2,000 rows |
| Any other error during the run | The sync stopped before the end. Nothing was imported. |
| Restart during the run | The tool restarted during the sync. Nothing was imported. |

`SheetSource` throws a `SheetReadError` with a kind (`not-shared`, `not-found`, `unavailable`, `access-refused`, `not-set-up`); the sync turns kinds into these texts.

### D7. Settings and secrets

- `GOOGLE_SERVICE_ACCOUNT_KEY`: optional. The JSON key file Google gives for the service account, base64-encoded on one line (an `app.env` line cannot hold the multi-line JSON). When set, it must decode to JSON with `type` `service_account`, `client_email` and `private_key`, or the start stops with "Invalid setting: GOOGLE_SERVICE_ACCOUNT_KEY must be the service account's JSON key, base64-encoded". Only `client_email` is ever shown (on Settings).
- `MATCH_HASH_KEY`: required, at least 32 characters (generated with `openssl rand -base64 48`); missing or shorter stops the start, naming it. Required, not optional, so the do-not-contact check can never run without its key.
- Both are added to `Config` in `src/platform/config.ts`, to `.env.example` and `deploy/app.env.example` as placeholders with a comment saying how to make them, to the CI workflow and the container tests as test-only values. No compose change: the app container already receives every line of `app.env` ([settings and secrets](/decisions/MOQ-3-settings-and-secrets.md)).
- The sheet link is an owner setting in `app_setting` (key `sheet.link`, value `{ url, spreadsheetId }`), read and written through small helpers in `src/platform/settings.ts`. A link is accepted when it is a `https://docs.google.com/spreadsheets/d/<id>/…` address (any tab or `gid`; the id is kept, the tab is ignored) or an empty value, which clears it.

### D8. API

Registered by `src/sourcing/http.ts` through a new `registerRoutes` option of `buildApp` (the same pattern as `registerJobs` in `start()`), so `platform` does not import a module. JSON bodies are checked with Fastify schemas.

| Route | Answer |
|---|---|
| `GET /api/settings/sheet` | `{ link, serviceAccountEmail }` (each may be null) |
| `PUT /api/settings/sheet` `{ link }` | 200 `{ link }`; 400 `{ error: "This is not a Google Sheets link." }` |
| `POST /api/sheet-syncs` | 202 `{ id }`; 409 `{ error: "A sync is already running" }` or `{ error: "No sheet link is set" }` |
| `GET /api/sheet-syncs/latest` | `{ linkSet, sync }`: the last sync (running, done or failed) with its trigger, times, counts, lines and failure, or null |
| `GET /api/leads` | every lead: id, name, client type, status, status date, fit level, sources, flags; by `import_position`, then creation |
| `GET /api/leads/:id` | the lead with its facts (kind, value, source), email address, sources (with sheet row and date), language, time zone; 404 `{ error }` for an unknown or malformed id |

The leads routes sit in `sourcing` with the lead tables for now; MOQ-23 (lead list, filters, history, in `tracking`) may move them.

### D9. Pages

- A small fetch helper, `web/src/api/client.ts` (`getJson`, `sendJson`), and one file per area (`sheet.ts`, `leads.ts`).
- **Find leads**: a first section "Google Sheet" with Sync now and the last report. Without a link, Sync now is `disabled` (greyed by the stylesheet) and a link "Set the sheet link in Settings" goes to `/settings`. While a sync runs, the button is disabled, the page shows "Sync running since <time>" and polls `GET /api/sheet-syncs/latest` every 2 seconds. A 409 shows its text ("A sync is already running"). The report: "<date and time>, Sync now" or "daily sync"; "<n> leads created, of which <m> flagged · <k> rows skipped"; a table Row · Result · Reasons. A failure: "Sync failed, <date and time>, <trigger>: <reason>". Times are shown in the browser's time zone.
- **Settings**: a first section "Google Sheet": "Share the sheet with this address, as Viewer:" and the service account's email (or "Google access is not set up: the setting GOOGLE_SERVICE_ACCOUNT_KEY is missing."), the link field and a Save button (real), with the server's message when it refuses the link.
- **Leads**: `GET /api/leads`; columns Name (link to its page), Client type, Status, Sources, Flags, Market and Fit ("–" when unknown), Last change; the status filter of MOQ-30 on the real list; an empty state "No leads yet. Sync the Google Sheet on Find leads."
- **Lead page**: `GET /api/leads/:id` (404 shows "Page not found", as MOQ-30 D1 says); name, status and its date, flags, client type, language ("none" when empty), time zone ("none" when empty), email address, the facts table (Fact, Value, Source) with the sheet's column names as fact names, sources, and a history built from the sources ("Imported from the Google Sheet, row 5, 13 Nov 2026"). Long text wraps and keeps its line breaks (`white-space: pre-wrap; overflow-wrap: anywhere`). Its three actions stay `NotConnectedAction`s.
- **Sample data marker**: Leads and the lead page show real data only, so their `PageHeader` has `sample={false}`. Find leads and Settings mix real and sample sections: their header has no marker, and each section still on sample data (Search Google Maps, Recent searches, Add a lead from a link; limits, windows, markets, mailbox, do-not-contact, personal data requests) shows the `SampleDataMarker` next to its heading. This is the modified `platform` requirement "Pages show sample data" (delta in `specs/platform/`): the marker marks only pages or sections still on sample data. Its scenario keeps its name, "Every page shows the sample data marker" (a modified requirement keeps its scenarios), with the new meaning, and "Connected pages show no marker" is added.
- Sheet text is shown as text (React escapes it), never as HTML or as a link, like MOQ-30's handles: a website or handle from the sheet is plain text.
- `connected-by.ts` keeps every entry (Sync now and the sheet link were never in it). Its three lead-page entries name the page `/leads/lead-01`: the web tests stub `fetch` to serve a lead with that id. The requirement "Actions not connected yet change nothing" is unchanged: using such an action makes no request; the lead page's own load is not the action's, so the test counts requests made after the action.

### D10. Tests and fakes

- `FakeSheetSource` (`src/sourcing/fake-sheet-source.ts`): holds a grid per spreadsheet id and can throw any `SheetReadError` kind; records every call.
- The real adapter (`google-sheet-source.ts`) takes its base address and a token provider, so its unit test runs it against a local Fastify server with canned answers (values, 403, 404, 500, a slow answer) and checks the scope asked for and that every request is a GET.
- Integration tests (`*.int.test.ts`, real PostgreSQL) run the sync with the fake, seed `do_not_contact`, `seen_business` and leads from other sources directly (their own tickets fill them later), and use the real place list.
- Web tests (happy-dom, MOQ-30's `web/src/test/render.tsx`) stub `fetch` with fixtures.
- Scenario tests are named after their scenario (tasks.md, Proof).

### Earlier decisions this change departs from

- **Sheet leads skip research and qualification** (MOQ-1 kickoff design, "Data flow" steps 1 to 3, and `okf/domain/lead-status.md`: "waiting for review: research and qualification are done"): a sheet lead is created directly as "waiting for review" with no fit level. Settled in the Jira criteria review (2026-11-12): the owner's sheet already holds the facts and the owner's own judgement. The okf concept is updated at finish.
- **Email as a match key** (MOQ-1 kickoff design, "Data model", and `okf/domain/lead.md`: map place, handle, domain): the sheet's main key is the email address; added to the requirement "One lead per business".
- **Domains that do not count as a website** (kickoff: "set in row 4", MOQ-5): MOQ-5 is deferred, so the first list starts here (D5).
- **Leads pages on real data, and the marker per section** (MOQ-30 design D4 to D6 and its `platform` requirement "Pages show sample data", whose scenario put the marker on every page): Leads and the lead page switch to real data and drop the marker; Find leads and Settings mark their remaining sample sections (D9). Chosen by the person on 2026-11-13; the `platform` delta changes the requirement and its scenario.
- **Email normalisation** (`okf/domain/do-not-contact-list.md`: "set when the list is built (row 17)"): set here, because the sheet's duplicate check and the do-not-contact check must use the same rule; MOQ-18 reuses it.

### Constraints left to later tickets

- **MOQ-7 (research)**: a lead whose language is empty from the sheet keeps it empty until the owner sets it; research must not fill it. The lead-enrichment requirement "Language" ("English otherwise") is changed by MOQ-7 to honour this. Research must not overwrite the sheet's client type, language or time zone either.
- **MOQ-16 (writing)**: Notes are stored as they are; email addresses in Notes are removed before they reach the AI; sheet text stays data.
- **MOQ-18, MOQ-25, retention sweep**: fill `do_not_contact` and `seen_business` with `normaliseEmail` and the keyed hash (D2).
- **MOQ-32**: orders by `import_position` and filters on `lead_source`; brings the lead-review delta.
- **Write-back ticket**: changes the scope (D1).

### Knowledge to write at finish

- `okf/decisions/MOQ-31-google-sheet-lead-source.md` (D1), `okf/decisions/MOQ-31-lead-tables.md` (D2), `okf/decisions/MOQ-31-offline-place-lookup.md` (D3).
- `okf/integrations/google-sheets.md`: a new processor concept (what is read, read-only scope, setting up the Google Cloud project, the service account and its key, sharing the sheet, the error answers, quotas, the personal data it carries).
- `okf/data/lead.md` (table and column names, `lead_source`, `sheet_sync`), `okf/domain/lead.md` (email key, Google Sheet source), `okf/domain/lead-status.md` (sheet leads), `okf/domain/do-not-contact-list.md` (normalisation rule).
- `okf/architecture/overview.md` (Google Sheets API in external services, the `sheet.sync` jobs, the sheet in the data flow), `okf/architecture/tech-stack.md` (`google-auth-library`, the GeoNames place list).

## Risks / Trade-offs

- [The tie-break gives a bare name the large city's zone when the owner meant a small namesake] → Only at a factor of 10 or more; "City, Country" is never tie-broken; the lead page shows the zone.
- [The service account key leaks] → Read-only scope, sees only sheets shared with it; the key lives only in `app.env` (not in the repo, the image or the logs) and can be revoked in Google Cloud.
- [`MATCH_HASH_KEY` lost or changed] → Every hash stops matching; kept and backed up with the other secrets (D2 Consequences).
- [A crash leaves a sync "running" and blocks every later sync] → Marked failed at start-up (D4).
- [MOQ-4 also edits `src/platform/http/app.ts`] → `registerRoutes` is one option next to MOQ-4's `registerAccess` call; whoever merges second keeps both. MOQ-4's cross-site check passes the UI's `fetch` calls, which send `Origin`.
- [Imported leads are personal data on a server with no sign-in] → Not deployed to production before MOQ-4; locally the stack listens on 127.0.0.1 by default.
- [Two businesses share an email address, or one business uses two] → Matched only by the keys the criteria name; a second lead or a missed duplicate is visible on Leads and is handled on Review (MOQ-32).
- [Google changes the Sheets API's answers] → The adapter is small, behind `SheetSource`, with its answers mapped in one place (D6).
- [Sheet text with hidden instructions] → Stored and shown as text only; nothing in this change reads it as instructions or sends it to the AI.

## Migration Plan

- One migration adds the tables, the sequence, the partial unique index and the do-not-contact trigger; it only adds, so the previous image still runs on the migrated database (`okf/decisions/MOQ-3-release-by-image-tag.md`).
- Before the image starts in an environment, add `MATCH_HASH_KEY` (and `GOOGLE_SERVICE_ACCOUNT_KEY` where syncs are wanted) to its `app.env` or `.env`.
- Production: not deployed before MOQ-4 is merged. Rollback: redeploy the previous image; the new tables stay and are unused.
