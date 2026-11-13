Verified: 2026-11-13 at 7a62319

Tests: `pnpm test` (pnpm is not on PATH and Corepack's pnpm 12.15.0 is not installed, so I ran the script's own command `vitest run --project unit --project web --project integration`) → 348/348 passed (0 failed, 0 skipped): unit 193, web 57, integration 98. PostgreSQL was reached through the `.env` that vitest.config loads.
Tests: `pnpm test:unit` (`vitest run --project unit --project web`) → 250/250 passed (0 failed, 0 skipped)
Tests: `pnpm test:container` (`IMAGE=1moq-bot:local vitest run --project container`) → 10/10 passed (0 failed, 0 skipped). I could not confirm that the local image was built from this branch.
OpenSpec: `openspec validate moq-31-read-leads-google-sheet --strict` → "Change 'moq-31-read-leads-google-sheet' is valid"

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One lead per business | Same place found twice / Same business from two sources / Rejected lead found again | none | n/a | Unchanged scenarios. tasks.md assigns them to MOQ-5/MOQ-6 (deferred). Not a criterion of this change. |
| One lead per business | Sheet row with a known email | sheet-sync.int.test.ts (both spellings, it.each) | Yes | Checks: one lead only, Google Sheet source added at row 2, all other values and the status unchanged, report says "duplicate" |
| One lead per business | Sheet row with a known website or handle | sheet-sync.int.test.ts | Yes | Domain and handle both checked on rejected leads: they stay rejected and get the source |
| One lead per business | Same email twice in one sheet | sheet-sync.int.test.ts | Yes | |
| Sync leads from the Google Sheet | Sync now imports new rows | sheet-sync.int.test.ts | Yes | Checks the status, fitLevel null, the source, and the order by import_position |
| Sheet values kept unchanged | Imported lead keeps the row's values | sheet-sync.int.test.ts ("Imported lead's values: Imported lead keeps the row's values") | Yes | Accents, line breaks, punctuation and spaces kept character for character |
| Sheet values kept unchanged | Changed row leaves its lead unchanged | sheet-sync.int.test.ts | Yes | |
| Sheet values kept unchanged | Deleted row leaves its lead unchanged | sheet-sync.int.test.ts | Yes | Compares the whole lead, sources included |
| Rows without a usable email… | Row with no email | sheet-sync.int.test.ts | Yes | |
| Rows without a usable email… | Row with an invalid email | sheet-sync.int.test.ts | Yes | All three example values |
| Rows without a usable email… | Row with no business name | sheet-sync.int.test.ts | Yes | |
| Rows without a usable email… | Several addresses in one cell | sheet-sync.int.test.ts | Yes | |
| Rows already contacted are skipped | Row already contacted | sheet-sync.int.test.ts | Yes | TRUE, a date, Yes, yes, x, in both columns |
| Rows already contacted are skipped | Row not contacted yet | sheet-sync.int.test.ts | Yes | |
| Rows the tool must not offer again… | Row on the do-not-contact list | sheet-sync.int.test.ts | Yes | Hash seeded; spaces and case normalised |
| Rows the tool must not offer again… | Row of a deleted lead | sheet-sync.int.test.ts | Yes | By email and by domain |
| Client type from the Buyer type | Buyer type matched ignoring case and accents | sheet-sync.int.test.ts | Yes | |
| Client type from the Buyer type | Unknown or empty buyer type | sheet-sync.int.test.ts | Yes | |
| Language from the sheet | Accepted language values | sheet-sync.int.test.ts | Yes | |
| Language from the sheet | Other language value | sheet-sync.int.test.ts | Yes | |
| Language from the sheet | Empty language never filled later | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City placed in one time zone | sheet-sync.int.test.ts | Yes | Uses the real place list |
| Time zone from City / area | Bare city name with a much larger namesake | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City that cannot be placed | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City in several time zones | sheet-sync.int.test.ts | Yes | |
| Sync report | Report counts and lists rows | sheet-sync.int.test.ts | Yes | Also checks the report holds no "@" |
| Sync report | Header-only sheet | sheet-sync.int.test.ts | Yes | |
| Sheet layout | Needed column missing | sheet-sync.int.test.ts (it.each over the 3 columns) | Yes | Shown on Find leads through the shared failure rendering (find-page.test.tsx) |
| Sheet layout | Columns in another order | sheet-sync.int.test.ts | Yes | |
| Sheet layout | Only the first tab is read | google-sheet-source.test.ts | Yes | Tabs listed out of order; only the tab at index 0 is fetched |
| Sheet layout | Sheet over 2,000 rows | sheet-sync.int.test.ts | Yes | Exactly 2,000 rows also tested |
| A failed sync keeps nothing | Sheet not shared with the tool | sheet-sync.int.test.ts | Yes | Uses the fake kind. The real adapter's mapping of 403 to not-shared is in google-sheet-source.test.ts |
| A failed sync keeps nothing | Sheet link to no sheet | sheet-sync.int.test.ts | Yes | Mapping of 404/400 is in the adapter test |
| A failed sync keeps nothing | Google unavailable | sheet-sync.int.test.ts | Yes | Mapping of 5xx/429/time-out/network errors is in the adapter test |
| A failed sync keeps nothing | Sync fails before the end | sheet-sync.int.test.ts | Yes | afterRow hook. Existing lead unchanged, including the duplicate row's source; the log holds no cell value |
| A failed sync keeps nothing | Daily sync failure shown | sheet-sync.int.test.ts + find-page.test.tsx | Yes | |
| Daily sync | Daily sync at six in the owner's morning | jobs.test.ts | Yes | Checks the cron and tz, plus pg-boss previewSchedule giving one start in the day, 23:00Z |
| Daily sync | Daily sync imports like Sync now | sheet-sync.int.test.ts | Yes | |
| Daily sync | No daily sync without a sheet link | sheet-sync.int.test.ts | Yes | No report, no lead, no read |
| One sync at a time | Second sync while one runs | http.int.test.ts + find-page.test.tsx | Yes | Real 409 from the database index, and the alert text on the page |
| One sync at a time | Daily sync while one runs | sheet-sync.int.test.ts | Yes | Daily sync fires during the Sync now read |
| Read-only access to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts | Yes | Scope is readonly only; every request is a GET |
| Sheet link and service account on Settings | Settings shows the service account and saves the link | http.int.test.ts + settings-page.test.tsx | Yes | Reload covered |
| Sheet link and service account on Settings | Link that is not a Google Sheet | http.int.test.ts + settings-page.test.tsx | Yes | |
| Sheet link and service account on Settings | Sync now without a sheet link | find-page.test.tsx (+ http.int "refuses Sync now without a sheet link") | Yes | Button disabled, click makes no POST, link goes to /settings |
| Leads pages show imported leads | Imported leads on the Leads list | http.int.test.ts + leads-page.test.tsx | Yes | Status filter checked |
| Leads pages show imported leads | Imported lead's own page | http.int.test.ts + leads-page.test.tsx | Yes | Actions still "Not connected yet" |
| Pages show sample data (platform) | Every page shows the sample data marker | pages.test.tsx | Yes | Sample pages, each sample section, and no marker on the Google Sheet sections |
| Pages show sample data (platform) | Connected pages show no marker | pages.test.tsx | Yes | |

Every Proof task (10.1 to 10.48) names the file that holds the matching test.

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Sync imports rows matching no lead, waiting for review, no fit, in row order | Sync now imports new rows | Yes |
| 2 | Daily sync at 06:00 Asia/Ho_Chi_Minh imports like Sync now | Daily sync at six in the owner's morning; Daily sync imports like Sync now | Yes |
| 3 | Values kept unchanged, source Google Sheet | Imported lead keeps the row's values | Yes |
| 4 | No email / invalid email | Row with no email; Row with an invalid email | Yes |
| 5 | No business name | Row with no business name | Yes |
| 6 | Several addresses: first valid kept, note | Several addresses in one cell | Yes |
| 7 | Already contacted, and not contacted | Row already contacted; Row not contacted yet | Yes |
| 8 | Duplicate by email/domain/handle, or by an earlier row | Sheet row with a known email; Sheet row with a known website or handle; Same email twice in one sheet | Yes |
| 9 | Do not contact | Row on the do-not-contact list | Yes |
| 10 | Already decided | Row of a deleted lead | Yes |
| 11 | Changed or deleted row leaves its lead unchanged | Changed row leaves its lead unchanged; Deleted row leaves its lead unchanged | Yes |
| 12 | Buyer type match, or Other + type unknown | Buyer type matched ignoring case and accents; Unknown or empty buyer type | Yes |
| 13 | Language mapping, no guess | Accepted language values; Other language value; Empty language never filled later | Yes |
| 14 | Time zone, flags, tie-break | City placed in one time zone; Bare city name with a much larger namesake; City that cannot be placed; City in several time zones | Yes |
| 15 | Report counts and rows | Report counts and lists rows; Header-only sheet | Yes |
| 16 | Needed column missing, any order, first tab only | Needed column missing; Columns in another order; Only the first tab is read | Yes |
| 17 | Failures keep nothing and are shown | Sheet not shared with the tool; Sheet link to no sheet; Link that is not a Google Sheet; Google unavailable; Sync fails before the end; Daily sync failure shown | Yes |
| 18 | One sync at a time | Second sync while one runs; Daily sync while one runs | Yes |
| 19 | No link: Sync now greyed out, no daily sync | Sync now without a sheet link; No daily sync without a sheet link | Yes |
| 20 | Nothing written to the sheet | Sync writes nothing to the sheet | Yes |
| 21 | Over 2,000 rows refused | Sheet over 2,000 rows | Yes |
| 22 | Settings shows the service account and saves the link | Settings shows the service account and saves the link | Yes |
| 23 | Leads list and lead page show imported leads | Imported leads on the Leads list; Imported lead's own page | Yes |
| 24 | Marker only on sample pages and sections | Every page shows the sample data marker; Connected pages show no marker | Yes |

Unit tests:

| File | Unit with logic | Unit test | OK? |
|---|---|---|---|
| src/platform/config.ts | MATCH_HASH_KEY and GOOGLE_SERVICE_ACCOUNT_KEY parsing | src/platform/config.test.ts (missing, short, exactly 32, not base64, not JSON, wrong type, missing fields) | Yes |
| src/platform/keyed-hash.ts | keyedHash | src/platform/keyed-hash.test.ts | Yes |
| src/platform/client-types.ts | the list (data, checked against okf) | src/platform/client-types.test.ts | Yes |
| src/platform/queue.ts | schedule() | src/platform/queue.int.test.ts "stores a schedule with its cron expression and time zone" | Yes |
| src/platform/http/app.ts | registerRoutes option | src/platform/http/app.test.ts | Yes |
| src/platform/settings.ts | read, write and clear a setting | src/platform/settings.int.test.ts | Yes |
| src/platform/places/place-time-zone.ts | foldPlaceName, parsePlaceFiles, placeTimeZone, tieBreak | src/platform/places/place-time-zone.test.ts (shipped list, exactly 10 times and just under, same-zone rival, named country, unknown Luxon zone) | Yes |
| scripts/build-places.mjs | GeoNames column mapping, filter, sort, TSV output | none | No |
| src/compliance/index.ts | normaliseEmail, isOnDoNotContactList | src/compliance/normalise-email.test.ts, src/compliance/do-not-contact.int.test.ts | Yes |
| drizzle/0002_do_not_contact_never_deleted.sql | trigger refusing DELETE and TRUNCATE | src/compliance/do-not-contact.int.test.ts | Yes |
| src/sourcing/schema.ts + drizzle/0001 | unique keys, one-running index, cascades, status check | src/sourcing/schema.int.test.ts | Yes |
| src/sourcing/seen-business.ts | isAlreadyDecided | src/sourcing/seen-business.int.test.ts | Yes |
| src/sourcing/sheet-rows.ts | readSheetRows (headers, aliases, needed columns, limit, empty rows, row numbers) | src/sourcing/sheet-rows.test.ts | Yes |
| src/sourcing/row-rules.ts | isValidEmail, readEmailCell, isAlreadyContacted, matchClientType, matchLanguage, readWebsiteInstagram, assessRow | src/sourcing/row-rules.test.ts | Yes |
| src/sourcing/sheet-link.ts | spreadsheetIdOf | src/sourcing/sheet-link.test.ts | Yes |
| src/sourcing/google-sheet-source.ts | readFirstTab, statusFailure, tokenFailure, googleTokenProvider | src/sourcing/google-sheet-source.test.ts | Yes. The network/5xx branch of tokenFailure is not tested. |
| src/sourcing/sheet-sync.ts | startSync, runSync, failureReason, logSyncEnd, runDailySync, failInterruptedSyncs, latestSync | src/sourcing/sheet-sync.int.test.ts, src/sourcing/sheet-sync.test.ts | Yes. Not tested: the NoLinkError path (link cleared between start and run) and failUnqueuedSync. |
| src/sourcing/jobs.ts | registerSheetJobs, enqueueSheetSync | src/sourcing/jobs.test.ts | Yes |
| src/sourcing/http.ts | routes (link trim/clear/refuse, 202/409, 404) | src/sourcing/http.int.test.ts | Yes. Not tested: the enqueue-failure branch. |
| src/sourcing/leads.ts | listLeads order, getLead (UUID check, 404) | src/sourcing/http.int.test.ts, src/sourcing/sheet-sync.int.test.ts | Yes |
| src/sourcing/index.ts, src/main.ts | wiring, start-up failInterruptedSyncs | src/sourcing/module.int.test.ts, src/main.int.test.ts, sheet-sync.int "restart" | Yes |
| src/sourcing/fake-sheet-source.ts, sheet-source.ts, not-website-domains.ts, compliance/schema.ts | none needed: test fake, interface and error type, data list (exercised by row-rules.test.ts), table definition | — | n/a |
| web/src/api/client.ts | getJson, sendJson, error mapping | web/src/api/client.test.ts | Yes |
| web/src/api/leads.ts, web/src/api/sheet.ts | getLead 404 to null, factName, orderedFacts, languageName, triggerName | client.test.ts ("reads a 404 lead as no lead"), leads-page.test.tsx (fact order, "none"), find-page.test.tsx (trigger names) | Yes |
| web/src/app/format.ts | formatDate, formatDateTime | covered through find-page and leads-page tests ("13 Nov 2026", "13 Nov 2026, hh:mm") | Yes |
| web/src/pages/use-lead.ts, web/src/App.tsx | lead loading, found, not-found, error | leads-page.test.tsx, app.test.tsx, pages.test.tsx | Yes. The "error" branch is not tested. |
| web/src/pages/sheet-sync-section.tsx | disabled state, polling, 409, report, failure | web/src/pages/find-page.test.tsx | Yes |
| web/src/pages/sheet-settings-section.tsx | save, refuse, clear, not set up | web/src/pages/settings-page.test.tsx | Yes |
| web/src/pages/leads-page.tsx, lead-page.tsx | list, filter, empty state, facts, history, text as text | web/src/pages/leads-page.test.tsx, pages.test.tsx | Yes |
| web/src/ui/section-heading.tsx, find-page.tsx, settings-page.tsx | section markers | web/src/pages/pages.test.tsx | Yes |

Scope: extra files: `okf/integrations/jira.md` and `okf/log.md` (a kit 3.2.0 Jira template update that MOQ-31 does not plan), `.dirox/usage/*` (the kit's log). Planned but not done: nothing found. Unticked tasks: none.

Blocking findings:
- `scripts/build-places.mjs` has logic but no unit test. It maps GeoNames columns 1, 2, 8, 14 and 17, filters, sorts and writes the TSV files, and `test-rules.md` puts parsing and mapping in the scope of unit tests. What softens this: `src/platform/places/place-time-zone.test.ts` runs on the committed output (Lyon, Paris, London, Manchester, Springfield and others), so a wrong column would show up after the data is rebuilt. The script itself is still never tested directly. If this tool script is ruled outside the unit-test rule, this item becomes non-blocking.

Non-blocking findings:
- Some branches are not tested:
  - In `src/sourcing/http.ts`, a failed enqueue marks the sync failed (`failUnqueuedSync`); no test covers it.
  - In `src/sourcing/sheet-sync.ts`, the `NoLinkError` path ("No sheet link is set." when the link is cleared between start and run) has no test.
  - The network and 5xx branch of `tokenFailure` in `src/sourcing/google-sheet-source.ts` has no test.
  - The "error" branch of the lead page load (`web/src/App.tsx`, `web/src/pages/use-lead.ts`) has no test.
- `tests/deploy-config.test.ts` changes an existing check: before looking for addresses, it strips Google Sheets API, auth-scope and Sheets-link URLs from the source. The change is narrow and explained in a comment, but a reviewer should confirm it is the intended exception and not a way to make the test pass.
- The failure scenarios for Sync now (not shared, no sheet, Google unavailable, column missing, over 2,000 rows) check the stored report and its `finishedAt`. Only the daily-sync failure is checked on the Find leads page itself. That page renders failures the same way whatever the trigger, so the risk is low.
- The container tests passed with a local `IMAGE=1moq-bot:local`, but I could not confirm it was built from this branch. An older image ignores the new `MATCH_HASH_KEY`, so a pass does not prove task 1.2/3.1 for this code.
- `pnpm` could not be run directly: Corepack's pnpm 12.15.0 is not installed on this machine. I ran the scripts' vitest commands instead.
- The diff contains only test-only placeholder keys (`-----BEGIN PRIVATE KEY-----\nabc…` in the config tests, and the labelled CI `MATCH_HASH_KEY`). There are no debug leftovers, skipped tests or new TODOs. I did not read `.env.example` or `deploy/app.env.example`, by the rule on env files. `tests/deploy-config.test.ts` "the templates hold placeholders only" passes.
