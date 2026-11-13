Verified: 2026-11-13 at 0195159

Tests: `pnpm test` (pnpm is not on PATH, so I ran the script's own command `node_modules/.bin/vitest run --project unit --project web --project integration`) → 374/374 passed (0 failed, 0 skipped), 37 files
Tests: `pnpm test:unit` (`vitest run --project unit --project web`) → 274/274 passed (0 failed, 0 skipped), 25 files
Tests: `pnpm test:container` (`IMAGE=1moq-bot:local vitest run --project container`) → 10/10 passed (0 failed, 0 skipped). I could not confirm that the local image was built from this branch.
OpenSpec: `openspec validate moq-31-read-leads-google-sheet --strict` → "Change 'moq-31-read-leads-google-sheet' is valid"

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One lead per business | Same place found twice / Same business from two sources / Rejected lead found again | none | n/a | Unchanged scenarios. tasks.md gives them to MOQ-5/MOQ-6 (deferred). They are not criteria of this change. |
| One lead per business | Sheet row with a known email | src/sourcing/sheet-sync.int.test.ts (it.each, both spellings) | Yes | Checks one lead only, the Google Sheet source added at row 2, every other value and the status unchanged, and the report line "duplicate" |
| One lead per business | Sheet row with a known website or handle | sheet-sync.int.test.ts | Yes | Domain and handle each tested on a rejected lead: it stays rejected and gets the source |
| One lead per business | Same email twice in one sheet | sheet-sync.int.test.ts | Yes | |
| Sync leads from the Google Sheet | Sync now imports new rows | sheet-sync.int.test.ts | Yes | Checks the status, fitLevel null, the source, and the order by `import_position` (rows in non-alphabetical order) |
| Sheet values kept unchanged | Imported lead keeps the row's values | sheet-sync.int.test.ts ("Imported lead's values: Imported lead keeps the row's values") | Yes | Accents, CRLF, punctuation and surrounding spaces kept |
| Sheet values kept unchanged | Changed row leaves its lead unchanged | sheet-sync.int.test.ts | Yes | |
| Sheet values kept unchanged | Deleted row leaves its lead unchanged | sheet-sync.int.test.ts | Yes | Compares the whole lead, sources included |
| Rows without a usable email… | Row with no email | sheet-sync.int.test.ts | Yes | Empty value and spaces only |
| Rows without a usable email… | Row with an invalid email | sheet-sync.int.test.ts | Yes | All three example values |
| Rows without a usable email… | Row with no business name | sheet-sync.int.test.ts | Yes | |
| Rows without a usable email… | Several addresses in one cell | sheet-sync.int.test.ts | Yes | |
| Rows already contacted are skipped | Row already contacted | sheet-sync.int.test.ts | Yes | TRUE, a date, Yes, yes and x, in both columns |
| Rows already contacted are skipped | Row not contacted yet | sheet-sync.int.test.ts | Yes | |
| Rows the tool must not offer again… | Row on the do-not-contact list | sheet-sync.int.test.ts | Yes | Keyed hash seeded; " STOP@" normalised |
| Rows the tool must not offer again… | Row of a deleted lead | sheet-sync.int.test.ts | Yes | Matched by email and by domain |
| Client type from the Buyer type | Buyer type matched ignoring case and accents | sheet-sync.int.test.ts | Yes | |
| Client type from the Buyer type | Unknown or empty buyer type | sheet-sync.int.test.ts | Yes | Report lines and flaggedCount checked |
| Language from the sheet | Accepted language values | sheet-sync.int.test.ts | Yes | All 9 values |
| Language from the sheet | Other language value | sheet-sync.int.test.ts | Yes | |
| Language from the sheet | Empty language never filled later | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City placed in one time zone | sheet-sync.int.test.ts | Yes | Uses the real place list |
| Time zone from City / area | Bare city name with a much larger namesake | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City that cannot be placed | sheet-sync.int.test.ts | Yes | |
| Time zone from City / area | City in several time zones | sheet-sync.int.test.ts | Yes | |
| Sync report | Report counts and lists rows | sheet-sync.int.test.ts | Yes | Also checks that the report holds no "@" |
| Sync report | Header-only sheet | sheet-sync.int.test.ts | Yes | |
| Sheet layout | Needed column missing | sheet-sync.int.test.ts (it.each over the 3 columns) | Yes | Checks the stored failure. The page renders failures through the same code path (find-page.test.tsx). |
| Sheet layout | Columns in another order | sheet-sync.int.test.ts | Yes | |
| Sheet layout | Only the first tab is read | src/sourcing/google-sheet-source.test.ts | Yes | The adapter fetches only the tab at index 0 when tabs are listed out of order. The "link points at the second tab" part is proven in sheet-link.test.ts (gid ignored), not in this test. |
| Sheet layout | Sheet over 2,000 rows | sheet-sync.int.test.ts | Yes | Exactly 2,000 rows also tested |
| A failed sync keeps nothing | Sheet not shared with the tool | sheet-sync.int.test.ts | Yes | Through the fake's kind. The real 403 → not-shared mapping is in google-sheet-source.test.ts. |
| A failed sync keeps nothing | Sheet link to no sheet | sheet-sync.int.test.ts | Yes | The fake answers not-found for an unknown id. The 404/400 mapping is in the adapter test. |
| A failed sync keeps nothing | Link that is not a Google Sheet (under the Settings requirement) | src/sourcing/http.int.test.ts + web/src/pages/settings-page.test.tsx | Yes | 400 with the message, and the saved link is kept |
| A failed sync keeps nothing | Google unavailable | sheet-sync.int.test.ts | Yes | The 5xx/429/time-out/network mapping is in the adapter test |
| A failed sync keeps nothing | Sync fails before the end | sheet-sync.int.test.ts | Yes | Uses the afterRow hook. The existing lead is unchanged, the duplicate's source is rolled back, and the log holds no cell value. |
| A failed sync keeps nothing | Daily sync failure shown | sheet-sync.int.test.ts + web/src/pages/find-page.test.tsx | Yes | |
| Daily sync | Daily sync at six in the owner's morning | src/sourcing/jobs.test.ts | Yes | Checks the cron and tz, and that pg-boss previewSchedule gives one start in the day, at 23:00Z |
| Daily sync | Daily sync imports like Sync now | sheet-sync.int.test.ts | Yes | |
| Daily sync | No daily sync without a sheet link | sheet-sync.int.test.ts | Yes | No report, no lead, no read |
| One sync at a time | Second sync while one runs | http.int.test.ts + find-page.test.tsx | Yes | A real 409 from the database index, and the alert text on the page |
| One sync at a time | Daily sync while one runs | sheet-sync.int.test.ts | Yes | |
| Read-only access to the sheet | Sync writes nothing to the sheet | google-sheet-source.test.ts | Yes | Scope is read-only only; every request is a GET |
| Sheet link and service account on Settings | Settings shows the service account and saves the link | http.int.test.ts + settings-page.test.tsx | Yes | Reload covered |
| Sheet link and service account on Settings | Sync now without a sheet link | find-page.test.tsx | Yes | Button disabled, a click sends no POST, the link goes to /settings |
| Leads pages show imported leads | Imported leads on the Leads list | http.int.test.ts + leads-page.test.tsx | Yes | Status filter checked |
| Leads pages show imported leads | Imported lead's own page | http.int.test.ts + leads-page.test.tsx | Yes | Actions still "Not connected yet" |
| Pages show sample data (platform) | Every page shows the sample data marker | web/src/pages/pages.test.tsx | Yes | Sample pages, each sample section, and no marker on the Google Sheet sections |
| Pages show sample data (platform) | Connected pages show no marker | pages.test.tsx | Yes | |

Each Proof task (10.1 to 10.48) names the file that holds the matching test.

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Sync imports rows that match no lead, waiting for review, no fit level, in row order | Sync now imports new rows | Yes |
| 2 | Daily sync at 06:00 Asia/Ho_Chi_Minh imports like Sync now | Daily sync at six in the owner's morning; Daily sync imports like Sync now | Yes |
| 3 | Values kept unchanged, source Google Sheet | Imported lead keeps the row's values | Yes |
| 4 | No email / invalid email | Row with no email; Row with an invalid email | Yes |
| 5 | No business name | Row with no business name | Yes |
| 6 | Several addresses: first valid one kept, note | Several addresses in one cell | Yes |
| 7 | Already contacted / not contacted | Row already contacted; Row not contacted yet | Yes |
| 8 | Duplicate by email, domain or handle, or by an earlier row | Sheet row with a known email; Sheet row with a known website or handle; Same email twice in one sheet | Yes |
| 9 | Do not contact | Row on the do-not-contact list | Yes |
| 10 | Already decided | Row of a deleted lead | Yes |
| 11 | Changed or deleted row leaves its lead unchanged | Changed row leaves its lead unchanged; Deleted row leaves its lead unchanged | Yes |
| 12 | Buyer type matched, or Other + "type unknown" | Buyer type matched ignoring case and accents; Unknown or empty buyer type | Yes |
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
| src/platform/config.ts | MATCH_HASH_KEY, GOOGLE_SERVICE_ACCOUNT_KEY parsing | src/platform/config.test.ts (missing, blank, short, exactly 32, base64/JSON/type/field errors, value never printed) | Yes |
| src/platform/keyed-hash.ts | keyedHash | src/platform/keyed-hash.test.ts (literal HMAC, same input, kinds apart, another key) | Yes |
| src/platform/client-types.ts | the list, checked against the okf table | src/platform/client-types.test.ts | Yes |
| src/platform/queue.ts | schedule(), enqueue options | src/platform/queue.int.test.ts | Yes |
| src/platform/http/app.ts | registerRoutes option | src/platform/http/app.test.ts | Yes |
| src/platform/settings.ts | read, write, clear | src/platform/settings.int.test.ts | Yes |
| src/platform/places/place-time-zone.ts | placeTimeZone, tie-break, name folding, file parsing, unknown Luxon zones | src/platform/places/place-time-zone.test.ts (exactly 10 times and just under, same-zone rival, named country) | Yes |
| scripts/build-places.mjs | GeoNames column mapping, filters, sort, TSV output, argument check | tests/build-places.test.ts (14 tests, added in 0195159) | Yes |
| src/compliance/index.ts | normaliseEmail, isOnDoNotContactList | src/compliance/normalise-email.test.ts, src/compliance/do-not-contact.int.test.ts | Yes |
| drizzle/0002_do_not_contact_never_deleted.sql | trigger refusing DELETE and TRUNCATE | src/compliance/do-not-contact.int.test.ts | Yes |
| src/sourcing/schema.ts + drizzle/0001 | unique keys, one-running index, cascades, status check | src/sourcing/schema.int.test.ts | Yes |
| src/sourcing/seen-business.ts | isAlreadyDecided | src/sourcing/seen-business.int.test.ts | Yes |
| src/sourcing/sheet-rows.ts | readSheetRows (headers, alias, duplicate names, needed columns, limit, empty rows, row numbers) | src/sourcing/sheet-rows.test.ts | Yes |
| src/sourcing/row-rules.ts | isValidEmail, readEmailCell, isAlreadyContacted, matchClientType, matchLanguage, readWebsiteInstagram, assessRow | src/sourcing/row-rules.test.ts | Yes |
| src/sourcing/sheet-link.ts | spreadsheetIdOf | src/sourcing/sheet-link.test.ts | Yes |
| src/sourcing/google-sheet-source.ts | readFirstTab, statusFailure, tokenFailure, googleTokenProvider | src/sourcing/google-sheet-source.test.ts (now also token 5xx/429/network) | Yes |
| src/sourcing/sheet-sync.ts | startSync, runSync, failureReason, logSyncEnd, runDailySync, failUnqueuedSync, failInterruptedSyncs, latestSync | src/sourcing/sheet-sync.int.test.ts (incl. NoLinkError path, restart), src/sourcing/sheet-sync.test.ts (log lines) | Yes |
| src/sourcing/jobs.ts | registerSheetJobs, enqueueSheetSync | src/sourcing/jobs.test.ts | Yes |
| src/sourcing/http.ts | link trim/clear/refuse, 202/409/500 (enqueue failure), 404 | src/sourcing/http.int.test.ts | Yes |
| src/sourcing/leads.ts | listLeads order, getLead (UUID check, 404) | http.int.test.ts, sheet-sync.int.test.ts | Yes |
| src/sourcing/index.ts, src/main.ts | wiring, failInterruptedSyncs at start-up | src/sourcing/module.int.test.ts, src/main.int.test.ts | Yes |
| src/sourcing/fake-sheet-source.ts, sheet-source.ts, not-website-domains.ts, compliance/schema.ts | none needed: test fake, interface and error type, a data list (used by row-rules.test.ts), table definition | — | n/a |
| web/src/api/client.ts | getJson, sendJson, error mapping | web/src/api/client.test.ts | Yes |
| web/src/api/leads.ts, web/src/api/sheet.ts | getLead 404 → null, factName, orderedFacts, languageName, triggerName | client.test.ts, leads-page.test.tsx, find-page.test.tsx | Yes |
| web/src/app/format.ts | formatDate, formatDateTime | through find-page and leads-page tests ("13 Nov 2026", "13 Nov 2026, hh:mm") | Yes |
| web/src/pages/use-lead.ts, web/src/App.tsx | lead load: found, not found, error | leads-page.test.tsx (incl. the new 500 → error test), pages.test.tsx | Yes |
| web/src/pages/sheet-sync-section.tsx | disabled state, polling every 2 s, 409, report, failure | web/src/pages/find-page.test.tsx | Yes |
| web/src/pages/sheet-settings-section.tsx | save, refuse, clear, not set up | web/src/pages/settings-page.test.tsx | Yes |
| web/src/pages/leads-page.tsx, lead-page.tsx | list, filter, empty state, facts, history, text as text | leads-page.test.tsx, pages.test.tsx | Yes |
| web/src/ui/section-heading.tsx, find-page.tsx, settings-page.tsx | section markers | pages.test.tsx | Yes |

Scope: extra files: `okf/integrations/jira.md` and `okf/log.md` (a kit Jira template update that MOQ-31 does not plan), `.dirox/usage/*` (the kit's log), `test-cases/lead-sourcing/MOQ-31.md` (QC's own commit 189bedf). Planned but not done: none found. Unticked tasks: none.

Blocking findings:
- none

Non-blocking findings:
- `openspec/changes/moq-31-read-leads-google-sheet/verification.md` is out of date. It says "Verified: 2026-11-13 at 7a62319" and still lists `scripts/build-places.mjs` with no unit test as blocking, with 348 tests. Commit 0195159 fixed that (tests/build-places.test.ts) and closed the untested branches it listed (failUnqueuedSync, NoLinkError, token 5xx/network, the lead page's error state). Refresh it before review.
- For Sync now, the failure scenarios (not shared, no sheet, Google unavailable, column missing, over 2,000 rows) check the stored report and its `finishedAt`. Only the daily-sync failure is checked as text on Find leads. The page renders every failure through the same code path, so the risk is low.
- "Only the first tab is read" is proven at the adapter level (tab index 0). That the link's `gid` is ignored is proven separately in sheet-link.test.ts. No single test runs the scenario's exact WHEN (a link to the second tab, then a sync).
- In `tests/deploy-config.test.ts`, an existing check now strips the Sheets API, auth-scope and Sheets-link URLs from source files before looking for addresses. The exception is narrow and explained in a comment, but a reviewer should confirm it is intended.
- The container tests passed with `IMAGE=1moq-bot:local`, but I could not confirm the image was built from this branch. Rebuild it with `docker build -f deploy/Dockerfile -t 1moq-bot:local .` and rerun before relying on tasks 1.2 and 3.1.
- `pnpm` could not be run directly: it is not on PATH, and Corepack's pnpm 12.15.0 is not installed. I ran each script's vitest command instead.
- Diff hygiene: the only key-like values are test placeholders (the CI `MATCH_HASH_KEY` is labelled test-only, and the config tests use a fake private key). There are no `.skip`, `.only`, debug tags or new TODOs. The new `console.log` lines are the sync logger (`consoleSyncLog`, which logs ids, counts and kinds only) and the build-places CLI output.
