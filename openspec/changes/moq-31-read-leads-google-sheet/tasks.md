# Tasks

## 1. Platform: key setting, queue schedule, route hook

- [ ] 1.1 Add the optional `GOOGLE_SERVICE_ACCOUNT_KEY` setting to `src/platform/config.ts` (D2: base64, JSON service account key, `createPrivateKey` accepts it; `Config` holds `{ clientEmail, privateKey }`; invalid stops the start naming the setting, never the value); add the commented placeholder line to `deploy/app.env.example` and `.env.example`; verify with new cases in `src/platform/config.test.ts` (unset, valid, not base64, not a service account, bad PEM; the message holds no value) and `tests/deploy-config.test.ts` still passing
- [ ] 1.2 Add `schedule(name, cron, { tz, missed })` to the `Queue` interface in `src/platform/queue.ts`, wrapping pg-boss's upsert, and queue options `retryLimit` and `expireInSeconds` on `registerJob`/`enqueue`; verify with a case in `src/platform/queue.int.test.ts` (one row in `pgboss.schedule` after scheduling twice)
- [ ] 1.3 Let `buildApp` in `src/platform/http/app.ts` take a list of route registrars (D4), so `src/main.ts` registers module routes without `platform` importing them; verify `src/platform/http/app.test.ts` and `src/main.int.test.ts` still pass

## 2. Lead tables

- [ ] 2.1 Write `src/sourcing/schema.ts` with `lead`, `lead_source`, `lead_email`, `lead_fact` and `sheet_sync` as in D3 (check constraints on codes, the researched `client_type`, `language`, `time_zone` with their `_source` columns next to the separate `owner_` override columns, unique `website_domain`, `instagram_handle`, `lead_email.address`, partial unique index on running syncs, index on `lead_source.source`), re-export it from `src/platform/db/schema.ts`, and generate the migration with `pnpm db:generate`; verify `src/platform/db/migrate.int.test.ts` passes and a new `src/sourcing/schema.int.test.ts` shows a second running sync and a duplicate address, domain or handle are refused by the database

## 3. Reading the sheet

- [ ] 3.1 Write `src/sourcing/sheet/reader.ts` (the `SheetReader` interface, the typed errors of D5 with their owner messages) and `src/sourcing/sheet/fake-reader.ts`; verify with `src/sourcing/sheet/fake-reader.test.ts`
- [ ] 3.2 Write `src/sourcing/sheet/link.ts` (D5: accept `docs.google.com/spreadsheets/d/<id>` with an optional `gid`, refuse anything else); verify with `src/sourcing/sheet/link.test.ts`
- [ ] 3.3 Write `src/sourcing/sheet/google-reader.ts` (D1, D5: RS256 JWT with `node:crypto`, read-only scope, fixed token and API addresses, tab by `gid` or the first, `FORMATTED_VALUE`, 20-second timeout, status to error mapping, no body or key in messages) with `fetch` injected; verify with `src/sourcing/sheet/google-reader.test.ts` (generated key pair, signature verified, scope, GET only, each error, timeout)

## 4. From rows to candidate leads

- [ ] 4.1 Write `src/sourcing/sheet/columns.ts` (D5: normalised header matching, needed and optional columns, missing needed columns named, duplicate header noted); verify with `src/sourcing/sheet/columns.test.ts`
- [ ] 4.2 Write `src/sourcing/sheet/client-types.ts` (D6: normalisation and the reviewed alias list, else Other) and the language rule; verify with `src/sourcing/sheet/client-types.test.ts` (every client type name of `okf/domain/client-types.md`, each alias, unmatched text, both languages and their synonyms, other languages, empty)
- [ ] 4.3 Write `src/sourcing/sheet/place-time-zone.ts` (D7: countries, regions, zone-name cities, the reviewed city list seeded from the sheet's City / area values, ambiguous names, agreement of all matched parts); verify with `src/sourcing/sheet/place-time-zone.test.ts` (placed cities, country alone, Australian city with and without state, ambiguous name alone and with a country, conflicting parts, unknown place, empty; every zone in the table valid for Luxon)
- [ ] 4.4 Write `src/sourcing/sheet/rows.ts` (D6: skip order no email then already contacted, address splitting and checks, `FALSE` as empty, website and Instagram keys with the social host list, facts and flags, empty rows ignored, sheet row numbers); verify with `src/sourcing/sheet/rows.test.ts`

## 5. Sync runs and import

- [ ] 5.1 Write `src/sourcing/sheet/import.ts` (D6 step 3, D8 save: match against stored addresses, domains and handles and earlier rows, insert leads with source, emails and facts, write the report and counts, all in one transaction) and `src/sourcing/sheet/sync.ts` (D8: claim with stale-run recovery, run, finish, failure messages, keep the last 30 runs, logs without row content); verify with `src/sourcing/sheet/sync.int.test.ts` on PostgreSQL with the fake reader
- [ ] 5.2 Write `src/sourcing/index.ts` with `registerSheetJobs` (the `sheet.sync` worker, `retryLimit: 0`, `expireInSeconds: 300`, and the daily schedule `0 6 * * *` in `Asia/Ho_Chi_Minh` with `missed: 'once'`; a scheduled run without link or key logs and ends) and wire it in `src/main.ts`; verify with `src/sourcing/sheet/schedule.int.test.ts`

## 6. API

- [ ] 6.1 Write `src/sourcing/sheet/routes.ts` (D10: `GET /api/sheet`, `PUT /api/sheet/link`, `POST /api/sheet/syncs`, `GET /api/sheet/syncs/latest`; 400 and 409 messages; no key or address in answers) and register it from `src/main.ts`; verify with `src/sourcing/sheet/routes.int.test.ts` (`app.inject`, fake reader)

## 7. Pages

- [ ] 7.1 Write `web/src/api.ts` (JSON `fetch` helper with the answer's error message)
- [ ] 7.2 Add the Google Sheet section to `web/src/pages/find-page.tsx` (D10: Sync now, unavailable without link or key with the way to Settings, the running state and polling, the latest report with counts and its row table, "already imported" duplicates in a closed `<details>`, a failed run's message, "Live data from your sheet"); verify with `web/src/pages/sheet-sync.test.tsx` (happy-dom, `fetch` stubbed) and `web/src/pages/pages.test.tsx` still passing
- [ ] 7.3 Add the Google Sheet section to `web/src/pages/settings-page.tsx` (link field and Save with its error, the share address or "not set up yet"); verify with `web/src/pages/sheet-settings.test.tsx` and `web/src/pages/pages.test.tsx` still passing
- [ ] 7.4 Run `pnpm lint`, `pnpm typecheck` and `pnpm test`; then with a test service account key in `.env` and a test sheet with invented rows shared with it, run `pnpm dev`, set the link, Sync now, and check the report by eye; when the owner's real sheet is first connected, re-check its "Email sent" and "Responded" values against the filled-cell rule (D6 step 2, answer 2026-11-04) and seed the client type aliases and the place table from its values (design Open Questions 1); note the results in the PR

## 8. Proof

- [ ] 8.1 Test `Sheet row becomes a lead` in `src/sourcing/sheet/sync.int.test.ts` (started by the owner and by the scheduled job; every listed field stored, status "waiting for review"; client type, language and time zone stored as researched values with source Google Sheet, the owner's override columns empty)
- [ ] 8.2 Test `Sheet lead records its source` in `src/sourcing/sheet/sync.int.test.ts`
- [ ] 8.3 Test `Sync writes nothing to the sheet` in `src/sourcing/sheet/google-reader.test.ts` (read-only scope in the signed token, only GET requests to the Sheets API during a whole read)
- [ ] 8.4 Test `Row without email skipped` in `src/sourcing/sheet/sync.int.test.ts` (empty cell and a cell with no address)
- [ ] 8.5 Test `Contacted row skipped` in `src/sourcing/sheet/sync.int.test.ts` ("Email sent" filled, "Responded" filled, `FALSE` not counted)
- [ ] 8.6 Test `Unknown buyer type is Other` in `src/sourcing/sheet/sync.int.test.ts`
- [ ] 8.7 Test `Unknown language left empty` in `src/sourcing/sheet/sync.int.test.ts` (empty, "German", and no language taken from a French city)
- [ ] 8.8 Test `Unplaced city has no time zone` in `src/sourcing/sheet/sync.int.test.ts` (unknown place, ambiguous name alone, empty)
- [ ] 8.9 Test `Changed row leaves its lead unchanged` in `src/sourcing/sheet/sync.int.test.ts` (sync, edit business, buyer type and notes in the fake sheet, sync again: lead unchanged, one lead, reported as already imported)
- [ ] 8.10 Test `Needed column missing` in `src/sourcing/sheet/sync.int.test.ts` (each of Business, Buyer type, Email: nothing imported, the error names it)
- [ ] 8.11 Test `Columns in another order` in `src/sourcing/sheet/sync.int.test.ts`
- [ ] 8.12 Test `Sheet cannot be read` in `src/sourcing/sheet/sync.int.test.ts` (not shared, no sheet at the link, Google unavailable: run failed with that message, stored leads unchanged)
- [ ] 8.13 Test `Sync report lists skipped and flagged rows` in `src/sourcing/sheet/sync.int.test.ts` (counts, row numbers and reasons stored) and in `web/src/pages/sheet-sync.test.tsx` (the owner sees them on Find leads)
- [ ] 8.14 Test `Sync now without a sheet link` in `web/src/pages/sheet-sync.test.tsx` (Sync now unavailable, the page links to Settings), in `web/src/pages/sheet-settings.test.tsx` (the share address shown) and in `src/sourcing/sheet/routes.int.test.ts` (`POST /api/sheet/syncs` answers 409 and starts nothing)
- [ ] 8.15 Test `Sync started while one runs` in `src/sourcing/sheet/sync.int.test.ts` (two claims at once: one runs; a scheduled run while one runs does not start), in `src/sourcing/sheet/routes.int.test.ts` (409 "A sync is already running") and in `web/src/pages/sheet-sync.test.tsx` (the owner is told)
- [ ] 8.16 Test `Scheduled sync runs once a day` in `src/sourcing/sheet/schedule.int.test.ts` (one `sheet.sync` schedule, `0 6 * * *` in `Asia/Ho_Chi_Minh`, still one after a second start)
- [ ] 8.17 Test `Sheet row with a known email` in `src/sourcing/sheet/sync.int.test.ts`
- [ ] 8.18 Test `Same email twice in the sheet` in `src/sourcing/sheet/sync.int.test.ts`
- [ ] 8.19 Test `Sheet row matching a known website or handle` in `src/sourcing/sheet/sync.int.test.ts` (website domain and Instagram handle; the existing lead gains no address)
- [ ] 8.20 Test `Sheet rows sharing a website or handle` in `src/sourcing/sheet/sync.int.test.ts`
