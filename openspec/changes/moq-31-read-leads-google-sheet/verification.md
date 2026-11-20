Verified: 2026-11-20 at ee2b62c

Tests: `pnpm test` → 378/378 passed (0 failed, 0 skipped), 37 files (from the build at ee2b62c)
Tests: `pnpm test:unit` → 277/277 passed (0 failed, 0 skipped), 25 files (from the build at ee2b62c)
Tests: `pnpm test:container` → 10/10 passed (0 failed, 0 skipped), 5 files, image 1moq-bot:local (from the build at ee2b62c)
OpenSpec: `openspec validate moq-31-read-leads-google-sheet --strict` → Change 'moq-31-read-leads-google-sheet' is valid

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One lead per business | Same place found twice | none (unchanged, MOQ-5) | n/a | Existing scenario, not changed by this change. tasks.md 10 says it belongs to MOQ-5/MOQ-6 (deferred) |
| One lead per business | Same business from two sources | none (unchanged, MOQ-6) | n/a | Same as above |
| One lead per business | Rejected lead found again | none (unchanged, MOQ-5) | n/a | Same as above |
| One lead per business | Sheet row with a known email | src/sourcing/sheet-sync.int.test.ts `Sheet row with a known email: %j` (both cell forms) | yes | Checks 1 lead, sources Maps+Sheet, the rest of the lead deep-equal to before, status approved, line [2, duplicate] |
| One lead per business | Sheet row with a known website or handle | sheet-sync.int.test.ts `Sheet row with a known website or handle` | yes | Domain and handle cases. Both leads stay rejected, gain Google Sheet, no new lead |
| One lead per business | Same email twice in one sheet | sheet-sync.int.test.ts `Same email twice in one sheet` | yes | Lead comes from row 2, row 3 is a duplicate |
| Sync leads from the Google Sheet | Sync now imports new rows | sheet-sync.int.test.ts `Sync now imports new rows` | yes | Status, no fit level, source and import_position order (non-alphabetical names) |
| Sheet values kept unchanged | Imported lead keeps the row's values | sheet-sync.int.test.ts `Imported lead's values: Imported lead keeps the row's values` | yes | Accents, punctuation, \n and \r\n, literal expected values |
| Sheet values kept unchanged | Changed row leaves its lead unchanged | sheet-sync.int.test.ts `Changed row leaves its lead unchanged` | yes | |
| Sheet values kept unchanged | Deleted row leaves its lead unchanged | sheet-sync.int.test.ts `Deleted row leaves its lead unchanged` | yes | Whole lead deep-equal |
| Rows without a usable email… | Row with no email | sheet-sync.int.test.ts `Row with no email` (+ `…a single one counts 1…`) | yes | noEmailCount, no line for the row. The UI text "No email: 1 row" is checked in find-page.test.tsx |
| Rows without a usable email… | Row with an invalid email | sheet-sync.int.test.ts `Row with an invalid email` | yes | The scenario's three values |
| Rows without a usable email… | Row with no business name | sheet-sync.int.test.ts `Row with no business name` | yes | |
| Rows without a usable email… | Several addresses in one cell | sheet-sync.int.test.ts `Several addresses in one cell` | yes | |
| Rows already contacted are skipped | Row already contacted | sheet-sync.int.test.ts `Row already contacted` | yes | TRUE, a date, Yes, yes, x, for both columns |
| Rows already contacted are skipped | Row not contacted yet | sheet-sync.int.test.ts `Row not contacted yet` | yes | |
| Rows the tool must not offer again… | Row on the do-not-contact list | sheet-sync.int.test.ts `Row on the do-not-contact list` | yes | Seeded keyed hash |
| Rows the tool must not offer again… | Row of a deleted lead | sheet-sync.int.test.ts `Row of a deleted lead` | yes | Email and domain hashes |
| Client type from the Buyer type | Buyer type matched ignoring case and accents | sheet-sync.int.test.ts `Buyer type matched ignoring case and accents` | yes | |
| Client type from the Buyer type | Unknown or empty buyer type | sheet-sync.int.test.ts `Unknown or empty buyer type` | yes | Type, flag and report lines |
| Language from the sheet | Accepted language values | sheet-sync.int.test.ts `Accepted language values` | yes | |
| Language from the sheet | Other language value | sheet-sync.int.test.ts `Other language value` | yes | |
| Language from the sheet | Empty language never filled later | sheet-sync.int.test.ts `Empty language never filled later` | yes | |
| Time zone from City / area | City placed in one time zone | sheet-sync.int.test.ts `City placed in one time zone` | yes | Real place list |
| Time zone from City / area | Bare city name with a much larger namesake | sheet-sync.int.test.ts `Bare city name with a much larger namesake` | yes | |
| Time zone from City / area | City that cannot be placed | sheet-sync.int.test.ts `City that cannot be placed` | yes | |
| Time zone from City / area | City in several time zones | sheet-sync.int.test.ts `City in several time zones` | yes | |
| Sync report | Report counts and lists rows | sheet-sync.int.test.ts `Report counts and lists rows`; web/src/pages/find-page.test.tsx `Report counts and lists rows: …` | yes | Exact lines (rows 2, 3 and 6 not listed), no "@" in the report. The page shows the counts, "No email: 1 row" and the rows |
| Sync report | Header-only sheet | sheet-sync.int.test.ts `Header-only sheet` | yes | |
| Sheet layout | Needed column missing | sheet-sync.int.test.ts `Needed column missing: %s` (Email, Business, Buyer type) | yes | |
| Sheet layout | Columns in another order | sheet-sync.int.test.ts `Columns in another order` | yes | Compares with the usual order's lead |
| Sheet layout | Only the first tab is read | src/sourcing/google-sheet-source.test.ts `Only the first tab is read: …` | yes | Takes index 0 even when it is listed second. The "link points at the second tab" part comes from sheet-link.test.ts (any tab or gid gives the same id), not from this test (see non-blocking) |
| Sheet layout | Sheet over 5,000 rows | sheet-sync.int.test.ts `Sheet over 5,000 rows` | yes | 5,001 rows refused. Exactly 5,000 are accepted in a separate test |
| A failed sync keeps nothing | Sheet not shared with the tool | sheet-sync.int.test.ts `Sheet not shared with the tool` | yes | Existing lead unchanged, reason, finishedAt |
| A failed sync keeps nothing | Sheet link to no sheet | sheet-sync.int.test.ts `Sheet link to no sheet` | yes | The fake gives not-found for an unknown id. The real adapter's 404/400 → not-found is unit-tested |
| A failed sync keeps nothing | Link that is not a Google Sheet | src/sourcing/http.int.test.ts, web/src/pages/settings-page.test.tsx `Link that is not a Google Sheet` | yes | 400 with the message, saved link unchanged. The page shows the refusal |
| A failed sync keeps nothing | Google unavailable | sheet-sync.int.test.ts `Google unavailable` | yes | |
| A failed sync keeps nothing | Sync fails before the end | sheet-sync.int.test.ts `Sync fails before the end` | yes | The duplicate's source is rolled back too. The log holds no cell value |
| A failed sync keeps nothing | Daily sync failure shown | sheet-sync.int.test.ts, find-page.test.tsx `Daily sync failure shown` | yes | |
| Daily sync | Daily sync at six in the owner's morning | src/sourcing/jobs.test.ts `Daily sync at six in the owner's morning` | yes | Cron and tz, plus pg-boss previewSchedule over one day: one start at 23:00Z |
| Daily sync | Daily sync imports like Sync now | sheet-sync.int.test.ts `Daily sync imports like Sync now` | yes | Expected values come from the Sync now run of the same sheet, not from the code under test |
| Daily sync | No daily sync without a sheet link | sheet-sync.int.test.ts `No daily sync without a sheet link` | yes | No report, no lead, no read |
| One sync at a time | Second sync while one runs | http.int.test.ts, find-page.test.tsx `Second sync while one runs` | yes | 409 with its text, one job queued, one lead per row. The page shows the alert |
| One sync at a time | Daily sync while one runs | sheet-sync.int.test.ts `Daily sync while one runs` | yes | |
| Read-only access to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts `Sync writes nothing to the sheet: …` | yes | JWT scope readonly, every request is a GET |
| Sheet link and service account on Settings | Settings shows the service account and saves the link | http.int.test.ts, settings-page.test.tsx `Settings shows the service account and saves the link` | yes | Includes a reload |
| Sheet link and service account on Settings | Sync now without a sheet link | find-page.test.tsx `Sync now without a sheet link` | yes | Button disabled, no POST, link goes to /settings |
| Leads pages show imported leads | Imported leads on the Leads list | http.int.test.ts, leads-page.test.tsx `Imported leads on the Leads list` | yes | Includes the status filter |
| Leads pages show imported leads | Imported lead's own page | http.int.test.ts, leads-page.test.tsx `Imported lead's own page` | yes | Values, email, language, zone, flags. Actions say "Not connected yet" |
| Pages show sample data (platform) | Every page shows the sample data marker | web/src/pages/pages.test.tsx `Every page shows the sample data marker` | yes | Sample pages, each sample section, none on the Google Sheet sections |
| Pages show sample data (platform) | Connected pages show no marker | pages.test.tsx `Connected pages show no marker` | yes | |

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Sync imports valid unmatched rows, waiting for review, no fit, in row order | Sync now imports new rows | sheet-sync.int.test.ts `Sync now imports new rows` |
| 2 | Daily sync at 06:00 Asia/Ho_Chi_Minh imports like Sync now | Daily sync at six in the owner's morning; Daily sync imports like Sync now | jobs.test.ts; sheet-sync.int.test.ts |
| 3 | Imported lead holds row values unchanged, source Google Sheet | Imported lead keeps the row's values | sheet-sync.int.test.ts |
| 4 | No email counted; invalid email listed | Row with no email; Row with an invalid email | sheet-sync.int.test.ts (both); find-page.test.tsx |
| 5 | No Business → "no business name" | Row with no business name | sheet-sync.int.test.ts |
| 6 | Several addresses → first valid, "other addresses ignored" | Several addresses in one cell | sheet-sync.int.test.ts |
| 7 | Email sent / Responded → "already contacted"; empty/FALSE/No not skipped | Row already contacted; Row not contacted yet | sheet-sync.int.test.ts (both) |
| 8 | Email/domain/handle match → no second lead, source added, "duplicate" | Sheet row with a known email; Sheet row with a known website or handle; Same email twice in one sheet | sheet-sync.int.test.ts (all three) |
| 9 | Do-not-contact → "do not contact" | Row on the do-not-contact list | sheet-sync.int.test.ts |
| 10 | Deleted or erased lead → "already decided" | Row of a deleted lead | sheet-sync.int.test.ts |
| 11 | Changed or deleted row leaves its lead unchanged | Changed row leaves its lead unchanged; Deleted row leaves its lead unchanged | sheet-sync.int.test.ts (both) |
| 12 | Unknown or empty Buyer type → Other, "type unknown" | Buyer type matched ignoring case and accents; Unknown or empty buyer type | sheet-sync.int.test.ts (both) |
| 13 | Language mapping, otherwise "no language", never guessed | Accepted language values; Other language value; Empty language never filled later | sheet-sync.int.test.ts (all three) |
| 14 | Time zone, "no time zone", "time zone unclear", factor-10 tie-break | City placed in one time zone; Bare city name with a much larger namesake; City that cannot be placed; City in several time zones | sheet-sync.int.test.ts (all four); the tie-break edges are in place-time-zone.test.ts |
| 15 | Report counts, No email count, listed rows | Report counts and lists rows; Header-only sheet | sheet-sync.int.test.ts; find-page.test.tsx |
| 16 | Needed column missing named; another order works; first tab only | Needed column missing; Columns in another order; Only the first tab is read | sheet-sync.int.test.ts; google-sheet-source.test.ts |
| 17 | Read or run failure keeps nothing, failure shown with time and reason, both triggers | Sheet not shared with the tool; Sheet link to no sheet; Link that is not a Google Sheet; Google unavailable; Sync fails before the end; Daily sync failure shown | sheet-sync.int.test.ts; http.int.test.ts; settings-page.test.tsx; find-page.test.tsx |
| 18 | One sync at a time, "A sync is already running" | Second sync while one runs; Daily sync while one runs | http.int.test.ts; find-page.test.tsx; sheet-sync.int.test.ts |
| 19 | No link → Sync now greyed with link to Settings; no daily sync | Sync now without a sheet link; No daily sync without a sheet link | find-page.test.tsx; sheet-sync.int.test.ts |
| 20 | Nothing written to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts |
| 21 | Over 5,000 rows → nothing imported, failure text | Sheet over 5,000 rows | sheet-sync.int.test.ts |
| 22 | Settings shows the service account and saves the link | Settings shows the service account and saves the link | http.int.test.ts; settings-page.test.tsx |
| 23 | Leads list and lead page show imported leads, read only | Imported leads on the Leads list; Imported lead's own page | http.int.test.ts; leads-page.test.tsx |
| 24 | Sample marker only on sample pages and sections; none on connected pages | Every page shows the sample data marker; Connected pages show no marker | pages.test.tsx |

Unit tests:

| File | Unit with logic | Unit test | OK? |
|---|---|---|---|
| src/platform/config.ts | MATCH_HASH_KEY and GOOGLE_SERVICE_ACCOUNT_KEY parsing | src/platform/config.test.ts (missing, blank, short, exactly 32, valid, invalid key; value never printed) | yes |
| src/platform/keyed-hash.ts | keyedHash | src/platform/keyed-hash.test.ts | yes |
| src/platform/client-types.ts | client type list | src/platform/client-types.test.ts (matches the okf table) | yes |
| src/platform/places/place-time-zone.ts | placeTimeZone, foldPlaceName, the tie-break, unknown zones dropped | src/platform/places/place-time-zone.test.ts (exactly 10 times and just under, same-zone namesake, country named) | yes |
| src/platform/queue.ts | schedule | src/platform/queue.int.test.ts `stores a schedule with its cron expression and time zone` | yes |
| src/platform/http/app.ts | registerRoutes option | src/platform/http/app.test.ts `answers an /api route a module registered…` | yes |
| src/platform/settings.ts | readSetting, writeSetting, clearSetting | src/platform/settings.int.test.ts | yes |
| src/platform/db/client.ts | none needed: type alias only | n/a | n/a |
| src/main.ts | start() context and registerRoutes wiring | src/main.int.test.ts, src/sourcing/module.int.test.ts | yes |
| src/compliance/index.ts | normaliseEmail; isOnDoNotContactList | src/compliance/normalise-email.test.ts; src/compliance/do-not-contact.int.test.ts | yes |
| drizzle/0002_do_not_contact_never_deleted.sql | DELETE and TRUNCATE trigger | src/compliance/do-not-contact.int.test.ts | yes |
| src/sourcing/schema.ts (+ migrations) | unique keys, one-running index, cascade | src/sourcing/schema.int.test.ts | yes |
| src/sourcing/seen-business.ts | isAlreadyDecided | src/sourcing/seen-business.int.test.ts | yes |
| src/sourcing/sheet-link.ts | spreadsheetIdOf | src/sourcing/sheet-link.test.ts | yes |
| src/sourcing/sheet-rows.ts | readSheetRows (headers, alias, duplicates, empty rows, missing columns, 5,000/5,001) | src/sourcing/sheet-rows.test.ts | yes |
| src/sourcing/row-rules.ts | isValidEmail, readEmailCell, isAlreadyContacted, matchClientType, matchLanguage, readWebsiteInstagram, assessRow | src/sourcing/row-rules.test.ts | yes |
| src/sourcing/not-website-domains.ts | isNotWebsiteHost | src/sourcing/row-rules.test.ts `reads no website from %s` | yes |
| src/sourcing/google-sheet-source.ts | GoogleSheetSource (status → kind, time-out, no key), googleTokenProvider, createGoogleJwt | src/sourcing/google-sheet-source.test.ts | yes |
| src/sourcing/sheet-sync.ts | startSync, runSync, runDailySync, failInterruptedSyncs, failureReason, latestSync | src/sourcing/sheet-sync.int.test.ts | yes |
| src/sourcing/sheet-sync.ts | logSyncEnd | src/sourcing/sheet-sync.test.ts | yes |
| src/sourcing/sheet-sync.ts | failUnqueuedSync | src/sourcing/http.int.test.ts `marks the sync failed when its run cannot be queued…` | yes |
| src/sourcing/jobs.ts | registerSheetJobs, enqueueSheetSync | src/sourcing/jobs.test.ts | yes |
| src/sourcing/http.ts | routes and schemas (200/202/400/404/409/500) | src/sourcing/http.int.test.ts | yes |
| src/sourcing/leads.ts | listLeads, getLead | src/sourcing/http.int.test.ts, src/sourcing/sheet-sync.int.test.ts | yes |
| src/sourcing/index.ts | sourcingModule | src/sourcing/module.int.test.ts | yes |
| src/sourcing/fake-sheet-source.ts, sheet-source.ts | none needed: test fake and interface, used by the integration tests | n/a | n/a |
| scripts/build-places.mjs | cities.tsv and countries.tsv builders, command arguments | tests/build-places.test.ts | yes |
| web/src/api/client.ts | getJson, sendJson, error mapping | web/src/api/client.test.ts | yes |
| web/src/api/leads.ts | getLead 404 → null; factName, orderedFacts, languageName | web/src/api/client.test.ts; web/src/pages/leads-page.test.tsx | yes |
| web/src/api/sheet.ts | triggerName (other functions are thin wrappers) | web/src/pages/find-page.test.tsx | yes |
| web/src/app/format.ts | formatDate, formatDateTime | find-page.test.tsx, leads-page.test.tsx ("13 Nov 2026", "13 Nov 2026, hh:mm") | yes |
| web/src/pages/sheet-sync-section.tsx | disabled state, polling, 409, report, No email count, failure | web/src/pages/find-page.test.tsx | yes |
| web/src/pages/sheet-settings-section.tsx | account or "not set up", save, clear, refusal | web/src/pages/settings-page.test.tsx | yes |
| web/src/pages/leads-page.tsx | real list, filter, empty state | web/src/pages/leads-page.test.tsx, pages.test.tsx | yes |
| web/src/pages/lead-page.tsx, use-lead.ts | load, 404 → Page not found, server error, facts, history | web/src/pages/leads-page.test.tsx | yes |
| web/src/pages/find-page.tsx, settings-page.tsx, ui/section-heading.tsx | section markers | web/src/pages/pages.test.tsx | yes |
| web/src/App.tsx | routes | web/src/app/app.test.tsx | yes |

Scope: extra files: okf/integrations/jira.md and okf/log.md (kit 3.2.0 template update to the Jira concept, committed in 7a62319 "MOQ-31: build", in no task). Planned but not done: the knowledge listed in design.md "Knowledge to write at finish" (okf/decisions/MOQ-31-*.md, okf/integrations/google-sheets.md, okf/data/lead.md, and the others) is not in the diff yet. It is due at build-ticket's hand-over. No unticked tasks.

Blocking findings:
- none

Non-blocking findings:
- okf/integrations/jira.md and its okf/log.md entry change the project's Jira conventions, which is outside MOQ-31's tasks. Move them to their own PR, or say why they are here in the PR description.
- The knowledge named in design.md (three decision records D1 to D3, okf/integrations/google-sheets.md, okf/data/lead.md, okf/domain/lead.md, lead-status.md, do-not-contact-list.md, overview.md, tech-stack.md) is not written yet. It must be added at the hand-over, and the PR's Knowledge section filled in.
- tests/deploy-config.test.ts: an existing test (`Public address comes from a setting: no domain is written…`) was loosened. It now strips the sheets.googleapis.com, googleapis auth-scope and docs.google.com/spreadsheets addresses before checking. This looks justified (external services, not the tool's address), but a reviewer should confirm it.
- `Only the first tab is read`: the named test proves that the adapter picks the tab at index 0. The scenario's "link points at the second tab" part rests on sheet-link.test.ts (`reads the id … whatever the tab or gid`). There is no single test that goes from a link with a second-tab gid to the rows imported. Coverage is thin, not missing.
- tasks.md 4.1 and 5.3 still say "2,000-row limit" and "rows 1 to 2,002". Task 11.1 supersedes both. The text is stale; the code and tests use 5,000 and 5,002.

To run by hand:
- none (the project's CLAUDE.md marks no by-hand-only command, and no scenario has a by-hand proof)
