Verified: 2026-11-20 at 4961af1

Tests: `pnpm test` (run as `node_modules/.bin/vitest run --project unit --project web --project integration`) → 378/378 passed (0 failed, skipped count not reported), 37 files (from the build at 317ac37)
Tests: `pnpm test:unit` (`vitest run --project unit --project web`) → 277/277 passed (0 failed, skipped count not reported), 25 files (from the build at 317ac37)
Tests: `pnpm test:container` (image 1moq-bot:local built from 317ac37) → 10/10 passed (0 failed, skipped count not reported), 5 files (from the build at 317ac37)
Tests: `pnpm lint` passed, `pnpm typecheck` passed (from the build at 317ac37). The two commits after 317ac37 (ff24d0f knowledge, 4961af1 usage) touch only `okf/` and `.dirox/`, so these results cover the final code.
OpenSpec: `openspec validate "moq-31-read-leads-google-sheet" --strict` → Change 'moq-31-read-leads-google-sheet' is valid

Note on the base: local `main` is out of date (6809628). I compared against `origin/main` (7cec1a6), which this branch already merged in. Using local `main` would wrongly count kit-setup files (`.github/scripts/*`, `okf/integrations/jira.md`, `qc.md`) as part of this change.

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One lead per business | Same place found twice | none | n/a | Unchanged scenario. It belongs to MOQ-5/MOQ-6 (deferred), as tasks.md Proof says. |
| One lead per business | Same business from two sources | none | n/a | Unchanged, deferred (MOQ-5/MOQ-6) |
| One lead per business | Rejected lead found again | none | n/a | Unchanged, deferred (MOQ-5/MOQ-6) |
| One lead per business | Sheet row with a known email | src/sourcing/sheet-sync.int.test.ts `Sheet row with a known email: %j` (both spellings) | yes | Checks: one lead only, sources Maps+Sheet (row 2), lead unchanged apart from sources, status approved, line "duplicate" |
| One lead per business | Sheet row with a known website or handle | sheet-sync.int.test.ts `Sheet row with a known website or handle` | yes | Domain and handle both checked; rejected leads stay rejected; both rows "duplicate" |
| One lead per business | Same email twice in one sheet | sheet-sync.int.test.ts `Same email twice in one sheet` | yes | One lead, from row 2; row 3 "duplicate" |
| Sync leads from the Google Sheet | Sync now imports new rows | sheet-sync.int.test.ts `Sync now imports new rows` | yes | Status, null fit, source, and import_position order (non-alphabetical names) |
| Sheet values kept unchanged | Imported lead keeps the row's values | sheet-sync.int.test.ts `Imported lead's values: Imported lead keeps the row's values` | yes | Accents, punctuation, \n and \r\n kept character for character; source Google Sheet |
| Sheet values kept unchanged | Changed row leaves its lead unchanged | sheet-sync.int.test.ts `Changed row leaves its lead unchanged` | yes | |
| Sheet values kept unchanged | Deleted row leaves its lead unchanged | sheet-sync.int.test.ts `Deleted row leaves its lead unchanged` | yes | Whole getLead record compared |
| Rows without a usable email or business name are skipped | Row with no email | sheet-sync.int.test.ts `Row with no email` (+ `Row with no email: a single one counts 1…`) | yes | Counted, no line. The text "No email: 1 row" is checked in find-page.test.tsx `Report counts and lists rows…` |
| Rows without a usable email or business name are skipped | Row with an invalid email | sheet-sync.int.test.ts `Row with an invalid email` | yes | The scenario's three values |
| Rows without a usable email or business name are skipped | Row with no business name | sheet-sync.int.test.ts `Row with no business name` | yes | Empty and spaces-only |
| Rows without a usable email or business name are skipped | Several addresses in one cell | sheet-sync.int.test.ts `Several addresses in one cell` | yes | |
| Rows already contacted are skipped | Row already contacted | sheet-sync.int.test.ts `Row already contacted` | yes | TRUE, a date, Yes, yes, x, each in both columns |
| Rows already contacted are skipped | Row not contacted yet | sheet-sync.int.test.ts `Row not contacted yet` | yes | Empty, FALSE, No, no |
| Rows the tool must not offer again are skipped | Row on the do-not-contact list | sheet-sync.int.test.ts `Row on the do-not-contact list` | yes | Seeded as a keyed hash |
| Rows the tool must not offer again are skipped | Row of a deleted lead | sheet-sync.int.test.ts `Row of a deleted lead` | yes | Email key and domain key |
| Client type from the Buyer type | Buyer type matched ignoring case and accents | sheet-sync.int.test.ts `Buyer type matched ignoring case and accents` | yes | |
| Client type from the Buyer type | Unknown or empty buyer type | sheet-sync.int.test.ts `Unknown or empty buyer type` | yes | Type, flag, and report lines |
| Language from the sheet | Accepted language values | sheet-sync.int.test.ts `Accepted language values` | yes | |
| Language from the sheet | Other language value | sheet-sync.int.test.ts `Other language value` | yes | |
| Language from the sheet | Empty language never filled later | sheet-sync.int.test.ts `Empty language never filled later` | yes | |
| Time zone from City / area | City placed in one time zone | sheet-sync.int.test.ts `City placed in one time zone` | yes | Real shipped place list |
| Time zone from City / area | Bare city name with a much larger namesake | sheet-sync.int.test.ts `Bare city name with a much larger namesake` | yes | |
| Time zone from City / area | City that cannot be placed | sheet-sync.int.test.ts `City that cannot be placed` | yes | |
| Time zone from City / area | City in several time zones | sheet-sync.int.test.ts `City in several time zones` | yes | |
| Sync report | Report counts and lists rows | sheet-sync.int.test.ts `Report counts and lists rows`; web/src/pages/find-page.test.tsx `Report counts and lists rows: …` | yes | Counts, lines (rows 4, 5 only), no "@" in the report, page text |
| Sync report | Header-only sheet | sheet-sync.int.test.ts `Header-only sheet` | yes | |
| Sheet layout | Needed column missing | sheet-sync.int.test.ts `Needed column missing: %s` (Email, Business, Buyer type) | yes | |
| Sheet layout | Columns in another order | sheet-sync.int.test.ts `Columns in another order` | yes | Same lead record compared |
| Sheet layout | Only the first tab is read | src/sourcing/google-sheet-source.test.ts `Only the first tab is read: …` | yes | Can fail: in the canned tab list, index 1 comes first. That the link's tab is ignored is shown separately by sheet-link.test.ts (gid dropped). See non-blocking. |
| Sheet layout | Sheet over 5,000 rows | sheet-sync.int.test.ts `Sheet over 5,000 rows` (+ `imports a sheet of exactly 5,000 rows`) | yes | |
| A failed sync keeps nothing | Sheet not shared with the tool | sheet-sync.int.test.ts `Sheet not shared with the tool` | yes | Existing lead unchanged; reason; finishedAt |
| A failed sync keeps nothing | Sheet link to no sheet | sheet-sync.int.test.ts `Sheet link to no sheet` | yes | Fake gives "not-found" for an unknown id. The real 404/400 mapping is in google-sheet-source.test.ts |
| A failed sync keeps nothing | Google unavailable | sheet-sync.int.test.ts `Google unavailable` | yes | |
| A failed sync keeps nothing | Sync fails before the end | sheet-sync.int.test.ts `Sync fails before the end` | yes | Cut after row 5, after a duplicate source was added: nothing kept, existing lead unchanged, log holds no cell value |
| A failed sync keeps nothing | Daily sync failure shown | sheet-sync.int.test.ts `Daily sync failure shown`; find-page.test.tsx `Daily sync failure shown` | yes | |
| Daily sync | Daily sync at six in the owner's morning | src/sourcing/jobs.test.ts `Daily sync at six in the owner's morning` | yes | Cron and tz stored, plus pg-boss previewSchedule over a whole day: one start, 23:00Z (06:00 +07) |
| Daily sync | Daily sync imports like Sync now | sheet-sync.int.test.ts `Daily sync imports like Sync now` | yes | |
| Daily sync | No daily sync without a sheet link | sheet-sync.int.test.ts `No daily sync without a sheet link` | yes | No report, no lead, no read |
| One sync at a time | Second sync while one runs | src/sourcing/http.int.test.ts `Second sync while one runs`; find-page.test.tsx `Second sync while one runs` | yes | 409 text, one job queued, one lead per row; page alert |
| One sync at a time | Daily sync while one runs | sheet-sync.int.test.ts `Daily sync while one runs` | yes | |
| Read-only access to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts `Sync writes nothing to the sheet: …` | yes | JWT scope is readonly only; every request is a GET |
| Sheet link and service account on Settings | Settings shows the service account and saves the link | http.int.test.ts and web/src/pages/settings-page.test.tsx `Settings shows the service account and saves the link` | yes | Includes a reload |
| Sheet link and service account on Settings | Link that is not a Google Sheet | http.int.test.ts and settings-page.test.tsx `Link that is not a Google Sheet` | yes | API keeps the earlier link; page shows the server's message |
| Sheet link and service account on Settings | Sync now without a sheet link | find-page.test.tsx `Sync now without a sheet link` | yes | Disabled, click sends no POST, link goes to /settings |
| Leads pages show imported leads | Imported leads on the Leads list | http.int.test.ts and web/src/pages/leads-page.test.tsx `Imported leads on the Leads list` | yes | Status filter checked |
| Leads pages show imported leads | Imported lead's own page | http.int.test.ts and leads-page.test.tsx `Imported lead's own page` | yes | Actions still "Not connected yet" |
| Pages show sample data (platform) | Every page shows the sample data marker | web/src/pages/pages.test.tsx `Every page shows the sample data marker` | yes | Sample pages, each sample section of Find leads and Settings, and no marker on the Google Sheet sections |
| Pages show sample data (platform) | Connected pages show no marker | pages.test.tsx `Connected pages show no marker` | yes | |

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Sync imports each new valid row, waiting for review, no fit, row order | Sync now imports new rows | sheet-sync.int.test.ts `Sync now imports new rows` |
| 2 | Daily sync at 06:00 Asia/Ho_Chi_Minh imports like Sync now | Daily sync at six in the owner's morning; Daily sync imports like Sync now | jobs.test.ts `Daily sync at six…`; sheet-sync.int.test.ts `Daily sync imports like Sync now` |
| 3 | Lead holds the row's values unchanged, source Google Sheet | Imported lead keeps the row's values | sheet-sync.int.test.ts `Imported lead's values: Imported lead keeps the row's values` |
| 4 | No email counted; invalid email listed | Row with no email; Row with an invalid email | sheet-sync.int.test.ts `Row with no email`, `Row with an invalid email`; find-page.test.tsx `Report counts and lists rows…` |
| 5 | Email but no Business → "no business name" | Row with no business name | sheet-sync.int.test.ts `Row with no business name` |
| 6 | Several addresses → first valid kept, "other addresses ignored" | Several addresses in one cell | sheet-sync.int.test.ts `Several addresses in one cell` |
| 7 | Email sent / Responded → "already contacted"; empty, unticked, No, FALSE do not skip | Row already contacted; Row not contacted yet | sheet-sync.int.test.ts `Row already contacted`, `Row not contacted yet` |
| 8 | Matches by email, domain or handle → duplicate, source added, nothing else changed | Sheet row with a known email; Sheet row with a known website or handle; Same email twice in one sheet | sheet-sync.int.test.ts (the three tests of those names) |
| 9 | Do-not-contact → "do not contact" | Row on the do-not-contact list | sheet-sync.int.test.ts `Row on the do-not-contact list` |
| 10 | Deleted or erased lead → "already decided" | Row of a deleted lead | sheet-sync.int.test.ts `Row of a deleted lead` |
| 11 | Changed or deleted row leaves its lead unchanged | Changed row leaves its lead unchanged; Deleted row leaves its lead unchanged | sheet-sync.int.test.ts (both tests of those names) |
| 12 | Unknown or empty Buyer type → Other, "type unknown" | Buyer type matched ignoring case and accents; Unknown or empty buyer type | sheet-sync.int.test.ts (both tests of those names) |
| 13 | Language mapping; otherwise "no language", never guessed | Accepted language values; Other language value; Empty language never filled later | sheet-sync.int.test.ts (the three tests of those names) |
| 14 | Time zone from City / area, flags, tie-break of 10 | City placed in one time zone; Bare city name with a much larger namesake; City that cannot be placed; City in several time zones | sheet-sync.int.test.ts (the four tests of those names) |
| 15 | Report counts, no-email count, listed rows with row numbers | Report counts and lists rows; Header-only sheet | sheet-sync.int.test.ts `Report counts and lists rows`, `Header-only sheet`; find-page.test.tsx `Report counts and lists rows…` |
| 16 | Missing needed column fails naming it; any order; first tab only | Needed column missing; Columns in another order; Only the first tab is read | sheet-sync.int.test.ts `Needed column missing: %s`, `Columns in another order`; google-sheet-source.test.ts `Only the first tab is read…` |
| 17 | Unreadable sheet or failure keeps nothing; failure shown with time and reason, both triggers | Sheet not shared with the tool; Sheet link to no sheet; Link that is not a Google Sheet; Google unavailable; Sync fails before the end; Daily sync failure shown | sheet-sync.int.test.ts (the five sync tests); http.int.test.ts and settings-page.test.tsx `Link that is not a Google Sheet`; find-page.test.tsx `Daily sync failure shown` |
| 18 | One sync at a time, "A sync is already running" | Second sync while one runs; Daily sync while one runs | http.int.test.ts and find-page.test.tsx `Second sync while one runs`; sheet-sync.int.test.ts `Daily sync while one runs` |
| 19 | No link: Sync now greyed with a link to Settings; no daily sync | Sync now without a sheet link; No daily sync without a sheet link | find-page.test.tsx `Sync now without a sheet link`; sheet-sync.int.test.ts `No daily sync without a sheet link` |
| 20 | Nothing written to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts `Sync writes nothing to the sheet…` |
| 21 | Over 5,000 rows refused with its message | Sheet over 5,000 rows | sheet-sync.int.test.ts `Sheet over 5,000 rows` |
| 22 | Settings shows the service account and saves the link | Settings shows the service account and saves the link | http.int.test.ts and settings-page.test.tsx (tests of that name) |
| 23 | Leads and lead page show imported leads, read only | Imported leads on the Leads list; Imported lead's own page | http.int.test.ts and leads-page.test.tsx (tests of those names) |
| 24 | Sample marker only on sample pages and sections; none on connected pages | Every page shows the sample data marker; Connected pages show no marker | pages.test.tsx (tests of those names) |

Unit tests:

| File | Unit with logic | Unit test | OK? |
|---|---|---|---|
| src/platform/config.ts | matchHashKey, googleServiceAccount parsing | src/platform/config.test.ts (missing, blank, short, exactly 32, valid key, invalid keys; value never printed) | yes |
| src/platform/keyed-hash.ts | keyedHash | src/platform/keyed-hash.test.ts | yes |
| src/platform/client-types.ts | client type list | src/platform/client-types.test.ts | yes |
| src/platform/places/place-time-zone.ts | placeTimeZone, parsePlaceFiles, foldPlaceName, tie-break, unknown zones dropped | src/platform/places/place-time-zone.test.ts (exactly 10x, just under, same-zone namesake, country named) | yes |
| src/platform/queue.ts | schedule, enqueue options | src/platform/queue.int.test.ts `stores a schedule with its cron expression and time zone`; retryLimit via jobs.test.ts / http.int.test.ts | yes |
| src/platform/http/app.ts | registerRoutes option | src/platform/http/app.test.ts `answers an /api route a module registered…` | yes |
| src/platform/settings.ts | readSetting, writeSetting, clearSetting | src/platform/settings.int.test.ts | yes |
| src/platform/db/client.ts | none needed: type alias only | n/a | n/a |
| src/main.ts | start() context, registerRoutes wiring | src/main.int.test.ts; src/sourcing/module.int.test.ts | yes |
| src/compliance/index.ts | normaliseEmail; isOnDoNotContactList | src/compliance/normalise-email.test.ts; src/compliance/do-not-contact.int.test.ts | yes |
| drizzle/0002_do_not_contact_never_deleted.sql | DELETE/TRUNCATE trigger | do-not-contact.int.test.ts `refuses DELETE`, `refuses TRUNCATE` | yes |
| src/sourcing/schema.ts + drizzle/0001, 0003 | unique keys, one-running index, cascade, status check | src/sourcing/schema.int.test.ts | yes |
| src/sourcing/seen-business.ts | isAlreadyDecided | src/sourcing/seen-business.int.test.ts | yes |
| src/sourcing/sheet-link.ts | spreadsheetIdOf | src/sourcing/sheet-link.test.ts | yes |
| src/sourcing/sheet-rows.ts | readSheetRows (headers, alias, first of two, empty rows, missing columns, 5,000/5,001) | src/sourcing/sheet-rows.test.ts | yes |
| src/sourcing/row-rules.ts | isValidEmail, readEmailCell, isAlreadyContacted, matchClientType, matchLanguage, readWebsiteInstagram, assessRow | src/sourcing/row-rules.test.ts | yes |
| src/sourcing/not-website-domains.ts | isNotWebsiteHost | src/sourcing/row-rules.test.ts (link-in-bio and social hosts) | yes |
| src/sourcing/google-sheet-source.ts | GoogleSheetSource (statuses to kinds, time-out, no key), googleTokenProvider, createGoogleJwt | src/sourcing/google-sheet-source.test.ts | yes |
| src/sourcing/sheet-sync.ts | startSync, runSync, runDailySync, failInterruptedSyncs, failureReason, latestSync | src/sourcing/sheet-sync.int.test.ts | yes |
| src/sourcing/sheet-sync.ts | logSyncEnd | src/sourcing/sheet-sync.test.ts | yes |
| src/sourcing/sheet-sync.ts | failUnqueuedSync | http.int.test.ts `marks the sync failed when its run cannot be queued…` | yes |
| src/sourcing/jobs.ts | registerSheetJobs, enqueueSheetSync | src/sourcing/jobs.test.ts | yes |
| src/sourcing/http.ts | routes and schemas (200/202/400/404/409/500) | src/sourcing/http.int.test.ts | yes |
| src/sourcing/leads.ts | listLeads (order, sources), getLead (UUID check, mapping) | http.int.test.ts (incl. `answers 404 for an unknown or malformed lead id`); sheet-sync.int.test.ts | yes |
| src/sourcing/index.ts | sourcingModule | src/sourcing/module.int.test.ts | yes |
| src/sourcing/fake-sheet-source.ts, sheet-source.ts | none needed: test fake and interface/error class | n/a | n/a |
| scripts/build-places.mjs | cities.tsv and countries.tsv builders, CLI arguments | tests/build-places.test.ts | yes |
| web/src/api/client.ts | getJson, sendJson, error mapping | web/src/api/client.test.ts | yes |
| web/src/api/leads.ts | getLead 404 → null; factName, orderedFacts, languageName | web/src/api/client.test.ts; web/src/pages/leads-page.test.tsx | yes |
| web/src/api/sheet.ts | triggerName (the rest are thin wrappers) | web/src/pages/find-page.test.tsx | yes |
| web/src/app/format.ts | formatDate, formatDateTime | through find-page.test.tsx and leads-page.test.tsx ("13 Nov 2026", "13 Nov 2026, hh:mm") | yes |
| web/src/pages/sheet-sync-section.tsx | disabled state, polling, 409, report, No email count, failure | web/src/pages/find-page.test.tsx | yes |
| web/src/pages/sheet-settings-section.tsx | account or "not set up", save, clear, refusal | web/src/pages/settings-page.test.tsx | yes |
| web/src/pages/leads-page.tsx | real list, filter, empty state | leads-page.test.tsx; pages.test.tsx | yes |
| web/src/pages/lead-page.tsx, use-lead.ts, App.tsx (resolve) | load, 404 → Page not found, server error, facts, history | leads-page.test.tsx; web/src/app/app.test.tsx | yes |
| web/src/pages/find-page.tsx, settings-page.tsx, ui/section-heading.tsx | section markers | pages.test.tsx | yes |

Scope: in line with the tasks. All tasks are ticked, and the knowledge listed in design.md is now in `okf/` (ff24d0f). Extra files, all accounted for: `test-cases/lead-sourcing/MOQ-31.md` (QC's, from write-test-cases), `.dirox/usage/*` (kit log), `scripts/build-places.d.mts` (types for the script's test), and `tests/deploy-config.test.ts` (changed, not named in any task; see non-blocking).

Blocking findings:
- none

Non-blocking findings:
- `Only the first tab is read`: the named test proves the adapter reads the tab at index 0 for a spreadsheet id. The scenario's "the link points at the second tab" part depends on `sheet-link.test.ts` (`reads the id … whatever the tab or gid`). No single test goes from a link with a second-tab gid to the imported rows.
- `tests/deploy-config.test.ts` (`Public address comes from a setting…`) now strips the sheets.googleapis.com, googleapis auth-scope and docs.google.com/spreadsheets addresses before its "no address in src/web" check. The exception is narrow and justified in a comment, but it loosens an existing test and is in no task. Say so in the PR description.
- tasks.md 4.1 and 5.3 still say "the 2,000-row limit" and "rows 1 to 2,002". Task 11.1 supersedes both, and the code and tests use 5,000 and 5,002. The task text is stale.
- design.md D2's `sheet_sync` column list does not name `no_email_count`, which task 11.2 and `drizzle/0003_sheet_sync_no_email_count.sql` added. D5 describes the count. The code and `okf/data/lead.md` are the reference.
- The builder's results give no skipped count for the three suites. My scan of the diff found no `.skip`, `.only` or `xit`.

To run by hand:
- none (the project's CLAUDE.md marks no by-hand-only command, and no scenario has a by-hand proof)
