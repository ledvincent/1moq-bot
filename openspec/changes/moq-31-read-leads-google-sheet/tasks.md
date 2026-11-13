# Tasks

## 1. Settings and shared platform code

- [ ] 1.1 Add `MATCH_HASH_KEY` (required, at least 32 characters) and `GOOGLE_SERVICE_ACCOUNT_KEY` (optional, base64 JSON key with `type`, `client_email`, `private_key`) to `Config` in `src/platform/config.ts` (design D7); unit tests in `src/platform/config.test.ts` for missing, short, invalid and valid values, each error naming the setting and never its value
- [ ] 1.2 Add both settings as placeholders, with a comment on how to make each, to `.env.example` and `deploy/app.env.example`; give test-only values to the CI workflow and the container tests' settings; verify `pnpm test` and `pnpm test:container` start the app
- [ ] 1.3 Add `src/platform/keyed-hash.ts` (HMAC-SHA256 with `MATCH_HASH_KEY` over `email:`, `domain:` or `instagram:` inputs, design D2) with unit tests (same input same hash, kinds kept apart, another key another hash)
- [ ] 1.4 Add `src/platform/client-types.ts` with the 13 client type names and `Other` from `okf/domain/client-types.md`; unit test that the list matches the concept's table
- [ ] 1.5 Add `schedule(name, cron, data, { tz })` to `Queue` in `src/platform/queue.ts` (pg-boss schedule); extend `src/platform/queue.int.test.ts` to check a schedule is stored with its cron and time zone
- [ ] 1.6 Add a `registerRoutes` option to `buildApp` (`src/platform/http/app.ts`) and pass it from `start()` in `src/main.ts`; unit test in `src/platform/http/app.test.ts` that a registered `/api` route answers and unknown `/api` addresses keep their plain 404
- [ ] 1.7 Add `src/platform/settings.ts` (read and write an `app_setting` value by key) with an integration test

## 2. Data model

- [ ] 2.1 Add `src/sourcing/schema.ts` (`lead`, `lead_email`, `lead_fact`, `lead_source`, `sheet_sync`, `seen_business`, the `import_position` sequence, the unique keys and the one-running-sync partial index) and `src/compliance/schema.ts` (`do_not_contact`), re-exported from `src/platform/db/schema.ts` (design D2); generate the migration with `pnpm db:generate`
- [ ] 2.2 Add a custom migration with the trigger refusing `DELETE` and `TRUNCATE` on `do_not_contact`; integration test that both are refused and an insert works
- [ ] 2.3 Integration test of the constraints: a second `running` sheet sync is refused, two leads cannot share an email, a website domain or a handle, deleting a lead removes its emails, facts and sources
- [ ] 2.4 Add `src/compliance/index.ts` exporting `normaliseEmail` (trim, drop `mailto:`, lower-case) and `isOnDoNotContactList`, and `src/sourcing/seen-business.ts` (`isAlreadyDecided` over the keyed hashes of email, domain and handle); unit tests for `normaliseEmail`, integration tests for both lookups with seeded hashes

## 3. Place list and time zone lookup

- [ ] 3.1 Write `scripts/build-places.mjs` (GeoNames `cities15000` with each city's population, `countryInfo`, `timeZones` given as arguments, design D3) and commit its output in `src/platform/places/data/` with the download date and the CC BY 4.0 attribution in each file's first line; add `THIRD_PARTY_NOTICES.md`; verify the image built from `deploy/Dockerfile` contains the data files
- [ ] 3.2 Add `placeTimeZone(text)` in `src/platform/places/` with the country aliases, the steps of design D3 and the factor-of-10 tie-break for bare city names, dropping zones Luxon does not know; unit tests on the shipped list: "Lyon, France", "Leeds, UK", "France", "Paris", "London", "Manchester", "Springfield", "USA", "Brooklyn, NY", an invented place, empty text, accents and case, and the tie-break at exactly 10 times and just under

## 4. Row rules

- [ ] 4.1 Add `src/sourcing/sheet-rows.ts`: header matching (case, extra spaces, `Owner / founder` alias, first of two same-named columns), needed columns with every missing one named, the 2,000-row limit, empty rows ignored, row numbers (design D5); unit tests for each
- [ ] 4.2 Add `src/sourcing/row-rules.ts`: email splitting, `mailto:`, validity, first valid address and the "other addresses ignored" note; already contacted; client type matching; language mapping; website domain and Instagram handle from the Website / Instagram cell with `src/sourcing/not-website-domains.ts`; unit tests for each rule, edge values included (checkbox `TRUE`/`FALSE`, "x", "No", dates, "contact(at)shop", `instagram.com/p/…`, `www.`, link-in-bio hosts)

## 5. Sheet source

- [ ] 5.1 Add `google-auth-library` as an exact pin (`save-exact`, the latest release that day); verify `pnpm install`, `pnpm typecheck` and `pnpm lint` pass
- [ ] 5.2 Add `src/sourcing/sheet-source.ts` (the `SheetSource` interface, `SheetReadError` and its kinds), `src/sourcing/sheet-link.ts` (Google Sheets address to spreadsheet id, any tab, anything else refused) with unit tests, and `src/sourcing/fake-sheet-source.ts`
- [ ] 5.3 Add `src/sourcing/google-sheet-source.ts` (read-only scope, the two GET requests, first tab by index, rows 1 to 2,002, 20-second time-out, answers mapped to kinds, design D1 and D6); unit tests against a local Fastify server for values, 403, 404, 400, 401, 429, 500, a time-out, and no key set

## 6. Sync

- [ ] 6.1 Add `src/sourcing/sheet-sync.ts`: `startSync(trigger)` (no link, one running sync), `runSync(id)` (read, checks, one transaction, report, failure reasons of design D6, the `afterRow` test hook), and the start-up step that fails any `running` sync; integration tests in `src/sourcing/sheet-sync.int.test.ts` for the report lines and counts, the order of the checks of design D5 and the restart case
- [ ] 6.2 Add `src/sourcing/jobs.ts`: the `sheet.sync` job (no retry) and the `sheet.sync.daily` schedule (`0 6 * * *`, `Asia/Ho_Chi_Minh`) whose handler starts and runs a sync; wire it from `src/main.ts` through `registerJobs`; unit tests in `src/sourcing/jobs.test.ts` with a fake queue
- [ ] 6.3 Log each sync's id, trigger, counts or failure kind, never a cell value, address or link; a unit test checks a failed sync's log line holds no cell value

## 7. API

- [ ] 7.1 Add `src/sourcing/http.ts` with the routes of design D8 and their Fastify schemas, registered through `registerRoutes` in `src/main.ts`; integration tests in `src/sourcing/http.int.test.ts` for each answer (200, 202, 400, 404, 409)

## 8. Pages

- [ ] 8.1 Add `web/src/api/client.ts`, `web/src/api/sheet.ts`, `web/src/api/leads.ts`; unit tests for error answers turned into messages
- [ ] 8.2 Find leads: the Google Sheet section (Sync now, greyed without a link with the link to Settings, running state with polling, "A sync is already running", the last report and failures with time and trigger), section markers on the sample sections (design D9); tests in `web/src/pages/find-page.test.tsx`
- [ ] 8.3 Settings: the Google Sheet section (service account email or "not set up", link field, Save, refusal message), section markers on the sample sections; tests in `web/src/pages/settings-page.test.tsx`
- [ ] 8.4 Leads and the lead page on the API (no marker, empty state, status filter, flags, sources, facts with source, history from sources, "Page not found" on 404, long text wrapping); tests in `web/src/pages/leads-page.test.tsx`
- [ ] 8.5 Make the MOQ-30 page tests (`web/src/pages/pages.test.tsx`, `web/src/app/app.test.tsx`) follow the modified `platform` requirement "Pages show sample data": the test `Every page shows the sample data marker` checks the marker on the sample pages and on each sample section of Find leads and Settings, and none on their Google Sheet sections; `fetch` is stubbed with fixtures (a lead `lead-01` for the `connected-by.ts` entries) and "no request" is counted after the action (design D9)

## 9. Checks

- [ ] 9.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:container`, and `openspec validate moq-31-read-leads-google-sheet --strict`; all pass

## 10. Proof

The scenarios "Same place found twice", "Same business from two sources" and "Rejected lead found again" of "One lead per business" are unchanged and belong to MOQ-5 and MOQ-6 (deferred); they get no test here.

- [ ] 10.1 Test `Sheet row with a known email` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.2 Test `Sheet row with a known website or handle` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.3 Test `Same email twice in one sheet` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.4 Test `Sync now imports new rows` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.5 Test `Imported lead keeps the row's values` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.6 Test `Changed row leaves its lead unchanged` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.7 Test `Deleted row leaves its lead unchanged` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.8 Test `Row with no email` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.9 Test `Row with an invalid email` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.10 Test `Row with no business name` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.11 Test `Several addresses in one cell` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.12 Test `Row already contacted` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.13 Test `Row not contacted yet` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.14 Test `Row on the do-not-contact list` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.15 Test `Row of a deleted lead` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.16 Test `Buyer type matched ignoring case and accents` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.17 Test `Unknown or empty buyer type` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.18 Test `Accepted language values` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.19 Test `Other language value` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.20 Test `Empty language never filled later` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.21 Test `City placed in one time zone` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.22 Test `Bare city name with a much larger namesake` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.23 Test `City that cannot be placed` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.24 Test `City in several time zones` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.25 Test `Report counts and lists rows` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.26 Test `Header-only sheet` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.27 Test `Needed column missing` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.28 Test `Columns in another order` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.29 Test `Only the first tab is read` in `src/sourcing/google-sheet-source.test.ts`
- [ ] 10.30 Test `Sheet over 2,000 rows` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.31 Test `Sheet not shared with the tool` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.32 Test `Sheet link to no sheet` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.33 Test `Google unavailable` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.34 Test `Sync fails before the end` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.35 Test `Daily sync failure shown` in `src/sourcing/sheet-sync.int.test.ts` and `web/src/pages/find-page.test.tsx`
- [ ] 10.36 Test `Daily sync at six in the owner's morning` in `src/sourcing/jobs.test.ts`
- [ ] 10.37 Test `Daily sync imports like Sync now` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.38 Test `No daily sync without a sheet link` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.39 Test `Second sync while one runs` in `src/sourcing/http.int.test.ts` and `web/src/pages/find-page.test.tsx`
- [ ] 10.40 Test `Daily sync while one runs` in `src/sourcing/sheet-sync.int.test.ts`
- [ ] 10.41 Test `Sync writes nothing to the sheet` in `src/sourcing/google-sheet-source.test.ts`
- [ ] 10.42 Test `Settings shows the service account and saves the link` in `src/sourcing/http.int.test.ts` and `web/src/pages/settings-page.test.tsx`
- [ ] 10.43 Test `Link that is not a Google Sheet` in `src/sourcing/http.int.test.ts` and `web/src/pages/settings-page.test.tsx`
- [ ] 10.44 Test `Sync now without a sheet link` in `web/src/pages/find-page.test.tsx`
- [ ] 10.45 Test `Imported leads on the Leads list` in `src/sourcing/http.int.test.ts` and `web/src/pages/leads-page.test.tsx`
- [ ] 10.46 Test `Imported lead's own page` in `src/sourcing/http.int.test.ts` and `web/src/pages/leads-page.test.tsx`
- [ ] 10.47 Test `Every page shows the sample data marker` in `web/src/pages/pages.test.tsx`
- [ ] 10.48 Test `Connected pages show no marker` in `web/src/pages/pages.test.tsx`
