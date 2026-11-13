---
jira: MOQ-31
status: draft
cap: lead-sourcing
scope: risk high, depth standard, focus all, platforms web
---
# MOQ-31 · Read leads from the Google Sheet

Common setup used below: the PR build runs locally (git switch to the PR branch, pnpm install, pnpm db:up, copy .env.example to .env, pnpm dev, open http://localhost:3000), with a test service account key set as a local secret. Test sheets live in a QC Google test account; "shared with the tool" means shared (Viewer) with the service account email shown on Settings. All names, emails, domains and handles below are invented test data.

## Open questions
- [ ] Should "x" in "Email sent" or "Responded" count as "already contacted"? The criteria list only ticked, a date or "Yes"; MOQ-31-14 treats "x" as not contacted (to confirm). (for: PM)
- [ ] Are "yes", "YES", "no" and "false" matched ignoring case in "Email sent" and "Responded"? MOQ-31-14 and MOQ-31-15 assume they are (to confirm). (for: PM)
- [ ] Are Language values matched ignoring case and spaces ("fr", " english ")? MOQ-31-29 assumes they are (to confirm). (for: PM)
- [ ] Where is "the sheet's row order" visible to the owner: the Review queue, the Leads list, or both? MOQ-31-01 checks the Review queue (to confirm). (for: PM)
- [ ] What is the exact report wording for a duplicate row ("duplicate"?) and for the ignored extra addresses? The cases use "duplicate" and "other addresses ignored" (to confirm). (for: PM)
- [ ] Is an empty "Buyer type" cell treated like an unknown type ("Other", flagged "type unknown") or as a skipped row? MOQ-31-27 assumes "Other" and flagged (to confirm). (for: PM)
- [ ] QC's candidate used the city "Springfield" for "no time zone", but Springfield exists in several US time zones and may read as "time zone unclear". MOQ-31-06 uses an invented place for "no time zone" and MOQ-31-31 uses "Springfield" for "time zone unclear" (to confirm). (for: PM)
- [ ] What is the row limit (about 2,000 rows, left to plan-ticket) and what does the owner see above it? No case covers the limit yet. (for: PM)
- [ ] Before MOQ-4 (sign-in) is merged, can a signed-out visitor reach Find leads and Sync now? MOQ-31-05 expects the sign-in page once MOQ-4 is in (to confirm). (for: PM)
- [ ] What does the "Template slide" column mean? Not used in this ticket. (for: client)

## MOQ-31-01 · Sync now turns valid new rows into leads waiting for review, in sheet order
- Priority: High
- Type: smoke
- Proof: automated (needs test sheet "MOQ-31 base" prepared once in Google Sheets and shared with the tool)
- Covers: AC1, a sync creates one lead per valid new row, waiting for review, no fit level, in the sheet's row order

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 base", shared with the tool.
- First tab of "MOQ-31 base", header in row 1 (Business, Buyer type, City / area, Language, Why they fit, Notes, Owner / founder (public), Website / Instagram, Email, Email sent, Responded), then:
- Row 2: Business "Test Cafe Alpha", Buyer type "Cafés and roasters", City / area "Lyon", Language "French", Email "hello@test-cafe-alpha.example", Website / Instagram "https://test-cafe-alpha.example", Email sent and Responded empty
- Row 3: Business "Test Gym Bravo", Buyer type "Gyms", City / area "Manchester", Language "English", Email "team@test-gym-bravo.example", Website / Instagram "@testgymbravo_qc", Email sent and Responded empty
- Row 4: Business "Test Brewery Charlie", Buyer type "Breweries", City / area "Bordeaux", Language "FR", Email "contact@test-brewery-charlie.example", Website / Instagram "https://test-brewery-charlie.example/about", Email sent and Responded empty

Steps:
1. Open http://localhost:3000 and choose Find leads in the menu
2. Click Sync now and wait until the report is shown
3. Choose Review in the menu
4. Note the order of the leads in the review queue
5. Choose Leads in the menu and open each of the three leads

Expected:
1. The report says 3 leads created, 0 rows skipped
2. The Review queue holds "Test Cafe Alpha", "Test Gym Bravo", "Test Brewery Charlie", in that order (sheet row order, to confirm where it is shown)
3. Each lead's status is "waiting for review" and it has no fit level
4. No lead shows as "found" or as being researched or qualified

## MOQ-31-02 · An imported lead keeps every read column unchanged and its source is Google Sheet
- Priority: High
- Type: smoke
- Proof: automated (needs test sheet "MOQ-31 values" prepared once and shared with the tool)
- Covers: AC3, the lead holds the row's values unchanged and its source is Google Sheet

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 values", shared with the tool.
- Row 2 of its first tab: Business "Test Studio Delta & Co.", Buyer type "Yoga and pilates studios", Language "English", City / area "Bristol", Why they fit "Sells its own tote bags at the desk", Website / Instagram "https://test-studio-delta.example", Owner / founder (public) "Julie MARTIN", Notes "Met at a test fair; prefers email", Email "julie@test-studio-delta.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Wait for the report, then choose Leads in the menu
3. Open the lead "Test Studio Delta & Co."
4. Compare each value with row 2 of the sheet

Expected:
1. Business, Buyer type, Language, City / area, Why they fit, Website / Instagram, Owner / founder, Notes and Email show exactly the sheet's text (same spelling, accents, case and punctuation)
2. The lead's source is "Google Sheet"
3. The client type is "Yoga and pilates studios" with no "type unknown" flag

## MOQ-31-03 · Settings shows the service account email and saves the sheet link
- Priority: High
- Type: smoke
- Proof: automated
- Covers: navigation to the feature; AC19 (Sync now available once a link is set)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No sheet link set yet (fresh test database).
- The link of test sheet "MOQ-31 base" is at hand.

Steps:
1. Choose Settings in the menu
2. Find the Google Sheet section and note the service account email shown
3. Paste the link of "MOQ-31 base" in the sheet link field and save
4. Reload the page
5. Choose Find leads in the menu

Expected:
1. Settings shows a service account email to share the sheet with
2. After reload, the saved sheet link is still shown
3. On Find leads, Sync now is enabled (not greyed out)

## MOQ-31-04 · The report counts created, flagged and skipped rows and lists each with its row number and reason
- Priority: High
- Type: smoke
- Proof: automated (needs test sheet "MOQ-31 mixed" prepared once and shared with the tool)
- Covers: AC15, totals and one line per skipped or flagged row with its sheet row number (header = row 1)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 mixed", shared with the tool.
- First tab, header in row 1, then:
- Row 2: valid row, Business "Test Cafe Echo", Buyer type "Cafés and roasters", City / area "Lyon", Language "French", Email "hi@test-cafe-echo.example"
- Row 3: Business "Test Bar Foxtrot", Email empty
- Row 4: Business "Test Club Golf", Buyer type "Run and sports clubs", City / area "Leeds", Language "English", Email "run@test-club-golf.example", Email sent "Yes"
- Row 5: Business "Test Shop Hotel", Buyer type "Surf shop", City / area "Nantes", Language "French", Email "shop@test-shop-hotel.example"
- Row 6: Business "Test Band India", Buyer type "Music artists and bands", City / area "Glasgow", Language "English", Email "band@test-band-india.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Wait for the report and read it

Expected:
1. The report says 3 leads created, of which 1 flagged, and 2 rows skipped
2. It lists row 3 "no email" and row 4 "already contacted"
3. It lists row 5 as flagged "type unknown"
4. Rows 2 and 6 are not listed as skipped or flagged

## MOQ-31-05 · A signed-out visitor cannot start a sync or see the report
- Priority: High
- Type: regression
- Proof: automated (needs MOQ-4 sign-in merged)
- Covers: permission: only the signed-in owner can sync (the ticket says imported leads hold personal data)

Pre-conditions:
- User: Guest (signed out, in a private browser window).
- MOQ-4 sign-in is in the build (to confirm).
- Settings holds the link of test sheet "MOQ-31 base"; at least one sync has already run, so a report exists.

Steps:
1. Open http://localhost:3000/find
2. Open http://localhost:3000/settings

Expected:
1. Each address leads to the sign-in page, not to Find leads or Settings
2. No Sync now button, report, sheet link or service account email is shown
3. No sync starts and no lead is created

## MOQ-31-06 · A row with an unknown type, an unknown language and an unplaceable city is imported with three flags
- Priority: High
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 flags" prepared once and shared with the tool)
- Covers: AC12, AC13, AC14 (no time zone) and AC15, each flag listed with its row number

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 flags", shared with the tool.
- Row 2 of its first tab: Business "Test Gym Juliet", Buyer type "Gym", Language empty, City / area "Qwertyville Nowhere", Email "coach@test-gym-juliet.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report
3. Choose Leads in the menu and open "Test Gym Juliet"

Expected:
1. The report says 1 lead created, of which 1 flagged, 0 rows skipped
2. It lists row 2 with "type unknown", "no language" and "no time zone"
3. The lead's type is "Other", it has no language and no time zone, and it shows the three flags
4. Its status is still "waiting for review" (flags are not a status)

## MOQ-31-07 · The scheduled daily sync imports rows the same way as Sync now
- Priority: High
- Type: regression
- Proof: manual (waits for the once-a-day schedule to run)
- Covers: AC2, the scheduled sync imports like Sync now

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database); the app stays running until the next scheduled sync.
- Settings holds the link of test sheet "MOQ-31 mixed" (same rows as MOQ-31-04), shared with the tool.

Steps:
1. Do not click Sync now; leave the app running past the next daily sync
2. Choose Find leads in the menu and read the last report
3. Choose Leads in the menu

Expected:
1. The last report shows the scheduled sync's time and the same totals and lines as MOQ-31-04: 3 created, 1 flagged, 2 skipped; row 3 "no email", row 4 "already contacted", row 5 "type unknown"
2. The Leads list holds "Test Cafe Echo", "Test Shop Hotel" and "Test Band India", source "Google Sheet", waiting for review

## MOQ-31-08 · A row without an email is skipped as "no email"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 email errors" prepared once and shared with the tool)
- Covers: AC4, no email

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 email errors", shared with the tool.
- Row 2: Business "Test Cafe Kilo", Buyer type "Cafés and roasters", City / area "Lyon", Language "French", Email empty
- Row 3: Business "Test Cafe Lima", same values, Email holding only spaces

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report lists row 2 "no email" and row 3 "no email"
2. No lead "Test Cafe Kilo" or "Test Cafe Lima" exists

## MOQ-31-09 · A row whose email is not a valid address is skipped as "invalid email"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 invalid emails" prepared once and shared with the tool)
- Covers: AC4, invalid email

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 invalid emails", shared with the tool.
- Rows 2 to 5, each with Business "Test Invalid 2" to "Test Invalid 5", Buyer type "Gyms", City / area "Leeds", Language "English", and Email: row 2 "not an email", row 3 "hello@", row 4 "@test-invalid.example", row 5 "see website"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report says 0 leads created, 4 rows skipped
2. Rows 2, 3, 4 and 5 are each listed as "invalid email"
3. No lead named "Test Invalid ..." exists

## MOQ-31-10 · A row with an email but no Business is skipped as "no business name"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 no business" prepared once and shared with the tool)
- Covers: AC5

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 no business", shared with the tool.
- Row 2: Business empty, Buyer type "Breweries", City / area "Lille", Language "French", Email "beer@test-nobiz-mike.example"
- Row 3: Business holding only spaces, same values, Email "beer@test-nobiz-november.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report lists row 2 and row 3 as "no business name"
2. No lead with either email exists

## MOQ-31-11 · Several addresses in one Email cell: the first valid one is kept and the others are noted
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 several emails" prepared once and shared with the tool)
- Covers: AC6

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 several emails", shared with the tool.
- Row 2: Business "Test Hotel Oscar", Buyer type "Hotels and resorts", City / area "Nice", Language "French", Email "gm@test-hotel-oscar.example, events@test-hotel-oscar.example"
- Row 3: Business "Test School Papa", Buyer type "Schools", City / area "Cardiff", Language "English", Email "office@test-school-papa.example; pta@test-school-papa.example / head@test-school-papa.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report
3. Choose Leads in the menu and open each lead

Expected:
1. "Test Hotel Oscar" has the email "gm@test-hotel-oscar.example" only
2. "Test School Papa" has the email "office@test-school-papa.example" only
3. The report notes for rows 2 and 3 that the other addresses were ignored
4. Both rows count as created, not skipped

## MOQ-31-12 · Several addresses where the first is invalid: the first valid one is kept
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 first invalid" prepared once and shared with the tool)
- Covers: AC6, first valid address, not first address

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 first invalid", shared with the tool.
- Row 2: Business "Test Startup Quebec", Buyer type "Tech startups", City / area "Toulouse", Language "French", Email "contact(at)test-startup-quebec, team@test-startup-quebec.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open the lead "Test Startup Quebec" from Leads

Expected:
1. The lead's email is "team@test-startup-quebec.example"
2. The report notes for row 2 that the other address was ignored
3. Row 2 is not listed as "invalid email"

## MOQ-31-13 · "Email sent" or "Responded" ticked, dated or "Yes" skips the row as "already contacted"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 contacted" prepared once and shared with the tool)
- Covers: AC7, the values that skip a row

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 contacted", shared with the tool; "Email sent" and "Responded" are checkbox columns in rows 2 to 3 and text columns below.
- Rows 2 to 7, each valid (Business "Test Contacted 2" to "Test Contacted 7", Buyer type "Gyms", City / area "Leeds", Language "English", a distinct Email "row2@test-contacted.example" to "row7@test-contacted.example"), with:
- Row 2: Email sent ticked
- Row 3: Responded ticked
- Row 4: Email sent "2026-10-03"
- Row 5: Responded "12/10/2026"
- Row 6: Email sent "Yes"
- Row 7: Responded "yes" (to confirm: case ignored)

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report says 0 leads created and 6 rows skipped
2. Rows 2 to 7 are each listed as "already contacted"
3. No lead "Test Contacted ..." exists

## MOQ-31-14 · Empty, unticked, "No", "FALSE" or "x" in "Email sent" and "Responded" does not skip the row
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 not contacted" prepared once and shared with the tool)
- Covers: AC7, the values that do not skip a row (QC candidate: unticked checkbox FALSE)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 not contacted", shared with the tool.
- Rows 2 to 6, each valid (Business "Test Fresh 2" to "Test Fresh 6", Buyer type "Breweries", City / area "Lille", Language "French", distinct Email "row2@test-fresh.example" to "row6@test-fresh.example"), with:
- Row 2: Email sent and Responded empty
- Row 3: Email sent an unticked checkbox (FALSE)
- Row 4: Email sent "No"
- Row 5: Responded "FALSE" typed as text
- Row 6: Email sent "x" (to confirm, see open questions)

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report says 5 leads created, 0 rows skipped
2. Leads "Test Fresh 2" to "Test Fresh 6" exist, waiting for review
3. No row is listed as "already contacted"

## MOQ-31-15 · The same email in another case, with spaces or with "mailto:" counts as a duplicate of an existing lead
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheets "MOQ-31 base" and "MOQ-31 email variants" prepared once and shared with the tool)
- Covers: AC8, email match ignoring case, surrounding spaces and "mailto:" (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Test sheet "MOQ-31 base" as in MOQ-31-01.
- Test sheet "MOQ-31 email variants", first tab: row 2 Business "Test Cafe Alpha Bis", Email "  HELLO@Test-Cafe-Alpha.example  "; row 3 Business "Test Gym Bravo Bis", Email "mailto:team@test-gym-bravo.example"; other columns valid and with no website or handle shared with "MOQ-31 base"

Steps:
1. On Settings, set the link of "MOQ-31 base"; on Find leads, click Sync now and wait for the report
2. Choose Review in the menu and approve "Test Cafe Alpha" (swipe right)
3. On Settings, replace the link with "MOQ-31 email variants" and save
4. On Find leads, click Sync now and read the report
5. Open "Test Cafe Alpha" and "Test Gym Bravo" from Leads

Expected:
1. The second report says 0 leads created and lists rows 2 and 3 as duplicates
2. No lead "Test Cafe Alpha Bis" or "Test Gym Bravo Bis" exists
3. "Test Cafe Alpha" is still "approved"; "Test Gym Bravo" is still "waiting for review"
4. Both leads list the source "Google Sheet" and keep their original values

## MOQ-31-16 · Two rows with the same email in one sheet create one lead and the report names the later row
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 same email" prepared once and shared with the tool)
- Covers: AC8, duplicate of an earlier row (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 same email", shared with the tool.
- Row 2: Business "Test Roaster Romeo", Buyer type "Cafés and roasters", City / area "Lyon", Language "French", Email "beans@test-roaster-romeo.example"
- Row 3: Business "Test Roaster Romeo Shop", Buyer type "Cafés and roasters", City / area "Lyon", Language "French", Email "Beans@test-roaster-romeo.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report says 1 lead created and lists row 3 as a duplicate
2. Only one lead exists, "Test Roaster Romeo", with row 2's values

## MOQ-31-17 · A row with the website domain of an existing lead from another source adds Google Sheet to it and keeps its status and decision
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 same website" prepared once and shared with the tool, and a "Manual" lead added by pasting a website before the sync)
- Covers: AC8, website domain match with a lead from another source (QC candidate, with a Manual lead since Google Maps sourcing is deferred)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- One existing lead with source "Manual", website "https://www.test-bistro-sierra.example", rejected by the owner on Review (prepared through the app, or seeded if adding by website is not built yet).
- Settings holds the link of test sheet "MOQ-31 same website", shared with the tool.
- Row 2: Business "Test Bistro Sierra", Buyer type "Bars and restaurants", City / area "Paris", Language "French", Website / Instagram "https://test-bistro-sierra.example/menu", Email "book@test-bistro-sierra.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report
3. Choose Leads in the menu and open the existing lead
4. Choose Review in the menu

Expected:
1. The report says 0 leads created and lists row 2 as a duplicate
2. The existing lead lists both sources, "Manual" and "Google Sheet"
3. Its status is still "rejected" and the owner's decision is unchanged
4. It is not offered on the Review page

## MOQ-31-18 · A row with the Instagram handle of an existing lead creates no second lead
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 same handle" prepared once and shared with the tool, and an "Instagram" lead added before the sync)
- Covers: AC8, Instagram handle match

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- One existing lead with source "Instagram", handle "testtango_qc", status "waiting for review" (prepared through the app, or seeded if adding by Instagram is not built yet).
- Settings holds the link of test sheet "MOQ-31 same handle", shared with the tool.
- Row 2: Business "Test Brand Tango", Buyer type "Indie clothing brands", City / area "Marseille", Language "French", Website / Instagram "https://www.instagram.com/testtango_qc/", Email "drop@test-brand-tango.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open the existing lead from Leads

Expected:
1. The report says 0 leads created and lists row 2 as a duplicate
2. The existing lead lists the sources "Instagram" and "Google Sheet" and is still "waiting for review"

## MOQ-31-19 · A row whose email is on the do-not-contact list creates no lead
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 do not contact" prepared once and shared with the tool, and the address added to the do-not-contact list before the sync)
- Covers: AC9 (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool; "stop@test-uniform-uniform.example" is on the do-not-contact list (added by the owner directly, or seeded if that screen is not built yet).
- Settings holds the link of test sheet "MOQ-31 do not contact", shared with the tool.
- Row 2: Business "Test Uniform Uniform", Buyer type "Hotels and resorts", City / area "Cannes", Language "French", Email " STOP@test-uniform-uniform.example"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report
3. Choose Review, then Leads in the menu

Expected:
1. The report lists row 2 as "do not contact"
2. No lead "Test Uniform Uniform" exists and nothing is offered on Review

## MOQ-31-20 · A row whose email belongs to an erased lead creates no lead
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 base" prepared once and shared with the tool, and lead erasure available in the build)
- Covers: AC10, erased lead

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 base" (as in MOQ-31-01), shared with the tool.

Steps:
1. On Find leads, click Sync now and wait for the report
2. Choose Leads in the menu, open "Test Gym Bravo" and erase it
3. Return to Find leads and click Sync now again
4. Read the report, then choose Leads and Review in the menu

Expected:
1. The second report lists row 3 as "already decided"
2. No lead "Test Gym Bravo" exists and it is not offered on Review

## MOQ-31-21 · A rejected lead deleted by the retention rule is not offered again on the next sync
- Priority: Normal
- Type: regression
- Proof: manual (waits for the retention period and the daily retention sweep to delete the lead)
- Covers: AC10, deleted lead (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- Settings holds the link of test sheet "MOQ-31 base" (as in MOQ-31-01), shared with the tool.
- "Test Brewery Charlie" was imported from it and rejected on Review, and the retention sweep has since deleted it.

Steps:
1. Choose Leads in the menu and check that "Test Brewery Charlie" is gone
2. Choose Find leads in the menu and click Sync now
3. Read the report, then choose Review in the menu

Expected:
1. The report lists row 4 as "already decided"
2. "Test Brewery Charlie" is not created again and not offered on Review

## MOQ-31-22 · A re-sync with no new rows creates nothing
- Priority: Normal
- Type: regression
- Proof: automated (same prepared data as MOQ-31-01)
- Covers: AC1 and AC8, rows already imported match their lead (zero created)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 base", shared with the tool.

Steps:
1. On Find leads, click Sync now and wait for the report
2. Click Sync now again and read the second report
3. Choose Leads in the menu

Expected:
1. The second report says 0 leads created and lists rows 2, 3 and 4 as duplicates
2. The Leads list still holds exactly three leads

## MOQ-31-23 · A changed row does not change its lead, and the owner's correction survives a re-sync
- Priority: Normal
- Type: regression
- Proof: manual (the sheet is edited in Google Sheets between two syncs)
- Covers: AC11, changed row (QC candidate, with MOQ-32 or the lead page for the correction)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of a copy of test sheet "MOQ-31 base", shared with the tool, that QC may edit.

Steps:
1. On Find leads, click Sync now and wait for the report
2. Open "Test Cafe Alpha" from Leads and change its client type to "Bars and restaurants"; note the lead's values
3. In Google Sheets, change row 2: Business "Test Cafe Alpha Renamed", Buyer type "Breweries", Language "English", Notes "Changed note"; keep the same Email
4. On Find leads, click Sync now again
5. Open "Test Cafe Alpha" from Leads

Expected:
1. The lead keeps the name "Test Cafe Alpha", language French and its original Notes
2. Its client type is still "Bars and restaurants", the owner's correction
3. No lead "Test Cafe Alpha Renamed" exists; the report lists row 2 as a duplicate

## MOQ-31-24 · A row deleted from the sheet leaves its lead unchanged
- Priority: Normal
- Type: regression
- Proof: manual (the sheet is edited in Google Sheets between two syncs)
- Covers: AC11, deleted row

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of an editable copy of test sheet "MOQ-31 base", shared with the tool.

Steps:
1. On Find leads, click Sync now and wait for the report
2. On Review, approve "Test Gym Bravo"
3. In Google Sheets, delete row 3 ("Test Gym Bravo")
4. On Find leads, click Sync now again
5. Open "Test Gym Bravo" from Leads

Expected:
1. "Test Gym Bravo" still exists with all its values, source "Google Sheet" and status "approved"
2. The second report does not mention it as removed and creates no lead

## MOQ-31-25 · Unused columns are ignored and do not skip a row
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 unused columns" prepared once and shared with the tool)
- Covers: AC1 and the ticket's "not used for now" columns (Template slide, DM sent, Prototype, Production launched)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 unused columns", shared with the tool, with the extra columns Template slide, DM sent, Prototype and Production launched.
- Row 2: Business "Test Festival Victor", Buyer type "Events and festivals", City / area "Rennes", Language "French", Email "crew@test-festival-victor.example", Template slide "3", DM sent "Yes", Prototype ticked, Production launched "2026-09-01"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open "Test Festival Victor" from Leads

Expected:
1. The report says 1 lead created, 0 rows skipped
2. The lead is waiting for review; it is not marked as contacted, DM sent or ordered

## MOQ-31-26 · Buyer type matching ignores case and accents
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 type spelling" prepared once and shared with the tool)
- Covers: AC12, a match ignoring case and accents is not flagged

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 type spelling", shared with the tool.
- Row 2: Business "Test Cafe Whiskey", Buyer type "CAFES AND ROASTERS", other columns valid
- Row 3: Business "Test Cafe Xray", Buyer type "cafés and roasters", other columns valid
- Row 4: Business "Test Club Yankee", Buyer type "run and sports CLUBS", other columns valid

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open each lead from Leads

Expected:
1. "Test Cafe Whiskey" and "Test Cafe Xray" have the type "Cafés and roasters"; "Test Club Yankee" has "Run and sports clubs"
2. None of them is flagged "type unknown" and the report lists no flag for rows 2 to 4
3. Each lead still shows the sheet's Buyer type text unchanged

## MOQ-31-27 · A Buyer type that matches no client type gives "Other" and the flag "type unknown"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 unknown types" prepared once and shared with the tool)
- Covers: AC12, partial names, plurals and empty values

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 unknown types", shared with the tool.
- Row 2: Business "Test Type Zulu", Buyer type "Café", other columns valid
- Row 3: Business "Test Type Alpha Two", Buyer type "Bakery", other columns valid
- Row 4: Business "Test Type Bravo Two", Buyer type empty, other columns valid (to confirm)

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open each lead from Leads

Expected:
1. Each of the three leads is created with the type "Other" and the flag "type unknown"
2. The report lists rows 2, 3 and 4 as flagged "type unknown"

## MOQ-31-28 · Each accepted Language value gives English or French with no flag
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 languages" prepared once and shared with the tool)
- Covers: AC13, the six accepted values

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 languages", shared with the tool.
- Rows 2 to 7 valid (Business "Test Lang 2" to "Test Lang 7", distinct emails "row2@test-lang.example" to "row7@test-lang.example"), with Language: row 2 "English", row 3 "EN", row 4 "Anglais", row 5 "French", row 6 "FR", row 7 "Français"

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then open each lead from Leads

Expected:
1. "Test Lang 2", "Test Lang 3" and "Test Lang 4" have the language English
2. "Test Lang 5", "Test Lang 6" and "Test Lang 7" have the language French
3. None is flagged "no language"

## MOQ-31-29 · Any other Language value leaves the language empty, flagged, and never guessed
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 other languages" prepared once and shared with the tool)
- Covers: AC13, other values flagged "no language", no guess then or later

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 other languages", shared with the tool.
- Rows 2 to 6 valid (Business "Test Other Lang 2" to "Test Other Lang 6", City / area "Lyon" for all, distinct emails), with Language: row 2 empty, row 3 "Spanish", row 4 "English/French", row 5 "Francais" (no accent), row 6 "fr" (to confirm: case ignored, see open questions)

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report and open each lead from Leads
3. Click Sync now again, then reopen "Test Other Lang 2"

Expected:
1. Rows 2, 3, 4 and 5 give leads with no language, each flagged "no language" and listed in the report with its row number
2. Row 6 gives a lead with the language French and no flag (to confirm)
3. Although the city is in France, no language is filled in for "Test Other Lang 2", after the first or the second sync

## MOQ-31-30 · A city that can be placed gets its time zone with no flag
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 cities" prepared once and shared with the tool)
- Covers: AC14, the normal case for a placeable city

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 cities", shared with the tool.
- Row 2: Business "Test City Lyon", City / area "Lyon, France", other columns valid
- Row 3: Business "Test City Leeds", City / area "Leeds, UK", other columns valid

Steps:
1. Choose Find leads in the menu and click Sync now
2. Open each lead from Leads

Expected:
1. "Test City Lyon" has the time zone Europe/Paris; "Test City Leeds" has Europe/London
2. Neither is flagged "no time zone" or "time zone unclear"

## MOQ-31-31 · A city that could be in several time zones is flagged "time zone unclear"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 unclear cities" prepared once and shared with the tool)
- Covers: AC14, ambiguous city

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 unclear cities", shared with the tool.
- Row 2: Business "Test Unclear London", City / area "London", other columns valid
- Row 3: Business "Test Unclear Springfield", City / area "Springfield", other columns valid (to confirm, see open questions)
- Row 4: Business "Test Unclear USA", City / area "USA", other columns valid

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report and open each lead from Leads

Expected:
1. Each lead is flagged "time zone unclear" and listed in the report with its row number
2. None of them shows a time zone chosen by the tool

## MOQ-31-32 · A missing "Email" column stops the sync and names the column
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 no email column" prepared once and shared with the tool)
- Covers: AC16, missing needed column (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 no email column", shared with the tool: the same rows as "MOQ-31 base" but no "Email" column (a column "E-mail address" holds the addresses instead).

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read what the page shows, then choose Leads in the menu

Expected:
1. The page shows a failure that names the missing column "Email"
2. No lead is created

## MOQ-31-33 · A missing "Business" or "Buyer type" column stops the sync and names the column
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheets "MOQ-31 no business column" and "MOQ-31 no type column" prepared once and shared with the tool)
- Covers: AC16, each other needed column

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Test sheet "MOQ-31 no business column": the rows of "MOQ-31 base" without the "Business" column.
- Test sheet "MOQ-31 no type column": the rows of "MOQ-31 base" without the "Buyer type" column.

Steps:
1. On Settings, set the link of "MOQ-31 no business column"; on Find leads, click Sync now
2. Note the failure shown and check Leads
3. On Settings, set the link of "MOQ-31 no type column"; on Find leads, click Sync now
4. Note the failure shown and check Leads

Expected:
1. The first failure names the column "Business"; the second names "Buyer type"
2. No lead is created by either sync

## MOQ-31-34 · Reordered columns and headers in another case or with extra spaces import the same leads
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 reordered" prepared once and shared with the tool)
- Covers: AC16, columns in another order still work

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 reordered", shared with the tool: the rows of "MOQ-31 base", with the columns in the order Email, Language, "  business ", City / area, "BUYER TYPE", Website / Instagram, and the other columns after them.

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report and open each lead from Leads

Expected:
1. The report says 3 leads created, 0 rows skipped
2. "Test Cafe Alpha", "Test Gym Bravo" and "Test Brewery Charlie" hold the same values as after MOQ-31-01

## MOQ-31-35 · Only the first tab is read
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 two tabs" prepared once and shared with the tool)
- Covers: AC16, only the first tab is read

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 two tabs", shared with the tool.
- First tab: header and one valid row, Business "Test First Tab", Email "one@test-first-tab.example"
- Second tab: same header and one valid row, Business "Test Second Tab", Email "two@test-second-tab.example"
- The link set in Settings points at the second tab (it ends with the second tab's gid)

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Leads in the menu

Expected:
1. The report says 1 lead created
2. "Test First Tab" exists; "Test Second Tab" does not

## MOQ-31-36 · A sheet that is not shared with the tool fails with its time and reason, and nothing changes
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 not shared" prepared once and not shared with the service account, plus the leads of MOQ-31-01)
- Covers: AC17, sheet not shared

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- The three leads of MOQ-31-01 exist; "Test Cafe Alpha" is approved.
- Settings holds the link of test sheet "MOQ-31 not shared", which holds valid rows but is not shared with the service account.

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read what the page shows and note the time
3. Choose Leads in the menu

Expected:
1. Find leads shows the failure with its time and a reason saying the sheet is not shared with the tool
2. No lead is created; the three existing leads, their values and statuses are unchanged

## MOQ-31-37 · A wrong sheet link fails with its time and reason
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: AC17, wrong link

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).

Steps:
1. On Settings, set the sheet link to "https://docs.google.com/spreadsheets/d/doesnotexist000/edit" and save (if Settings refuses it, note the message and stop)
2. On Settings, set the link to "https://test-not-a-sheet.example/leads" and save (same)
3. For each link the page accepted, go to Find leads and click Sync now

Expected:
1. Each link is either refused on Settings with a message, or the sync fails and Find leads shows the time and a reason saying the sheet cannot be found or the link is wrong
2. No lead is created

## MOQ-31-38 · Google unavailable during Sync now: failure shown, nothing imported
- Priority: Normal
- Type: regression
- Proof: manual (needs Google's API to be unreachable, by cutting the machine's network to Google; not available in the test setup)
- Covers: AC17, Google unavailable

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- The three leads of MOQ-31-01 exist.
- Settings holds the link of test sheet "MOQ-31 mixed", shared with the tool.
- The app can reach localhost but not Google (for example, Google's API host blocked in the hosts file or firewall).

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read what the page shows, then check Leads
3. Restore access to Google

Expected:
1. Find leads shows the failure with its time and a reason saying Google could not be reached
2. No lead is created; existing leads are unchanged

## MOQ-31-39 · A sync that fails halfway keeps no lead from that sync
- Priority: Normal
- Type: regression
- Proof: manual (the failure must be caused while the sync runs, by cutting the network or stopping the database mid-sync)
- Covers: AC17, a sync failing before the end keeps nothing (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- The three leads of MOQ-31-01 exist; "Test Gym Bravo" is approved.
- Settings holds the link of a test sheet "MOQ-31 large", shared with the tool, with about 2,000 valid new rows, so a sync takes long enough to interrupt.

Steps:
1. Choose Find leads in the menu and click Sync now
2. While the sync runs, cut the app's access to Google
3. Wait for the page to show the result, then restore access
4. Choose Leads in the menu

Expected:
1. Find leads shows the failure with its time and reason
2. No lead from "MOQ-31 large" exists, not even its first rows
3. The three existing leads are unchanged; "Test Gym Bravo" is still approved

## MOQ-31-40 · A failed scheduled sync shows as the last report on Find leads
- Priority: Normal
- Type: regression
- Proof: manual (waits for the once-a-day schedule to run)
- Covers: AC17, the scheduled sync's failures shown like Sync now's

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- Settings holds the link of test sheet "MOQ-31 not shared" (not shared with the service account); the app stays running past the next scheduled sync.

Steps:
1. Do not click Sync now; wait past the next daily sync
2. Choose Find leads in the menu

Expected:
1. The last report is the scheduled sync's failure, with its time and a reason saying the sheet is not shared with the tool
2. No lead is created

## MOQ-31-41 · Starting a sync while one is running says "A sync is already running"
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 large" with about 2,000 valid rows, prepared once and shared with the tool)
- Covers: AC18, Sync now twice

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 large", shared with the tool.
- Find leads is open in two browser tabs.

Steps:
1. In the first tab, click Sync now
2. While it runs, click Sync now in the second tab
3. Wait for the first sync to end, then choose Leads in the menu and note the number of leads

Expected:
1. The second tab shows "A sync is already running"
2. Only one report is added
3. The number of leads equals the number of valid rows in "MOQ-31 large": no duplicate lead

## MOQ-31-42 · Sync now during the scheduled sync creates no duplicates
- Priority: Normal
- Type: regression
- Proof: manual (must click while the once-a-day scheduled sync is running)
- Covers: AC18, Sync now during the scheduled sync (QC candidate)

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 large", shared with the tool; the time of the scheduled sync is known.

Steps:
1. Open Find leads just before the scheduled sync's time
2. As soon as the scheduled sync has started, click Sync now
3. When it ends, choose Leads in the menu and note the number of leads

Expected:
1. The page shows "A sync is already running" and no second sync starts
2. The number of leads equals the number of valid rows in "MOQ-31 large": no duplicate lead

## MOQ-31-43 · With no sheet link, Sync now is greyed out and links to Settings
- Priority: Normal
- Type: regression
- Proof: automated
- Covers: AC19, Sync now greyed out with a link to Settings

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No sheet link set (fresh test database, or the link cleared on Settings).

Steps:
1. Choose Find leads in the menu
2. Try to click Sync now
3. Click the link to Settings shown next to it

Expected:
1. Sync now is greyed out and clicking it starts nothing
2. A link to Settings is shown, and it opens the Settings page with the sheet link field
3. No report is added

## MOQ-31-44 · With no sheet link, the scheduled sync does not run
- Priority: Normal
- Type: regression
- Proof: manual (waits for the once-a-day schedule to run)
- Covers: AC19, the scheduled sync does not run without a link

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No sheet link set; no report on Find leads yet; the app stays running past the next scheduled sync.

Steps:
1. Wait past the time of the next daily sync
2. Choose Find leads in the menu, then Leads

Expected:
1. No new report and no failure is shown for that day
2. No lead is created

## MOQ-31-45 · A sync writes nothing to the sheet
- Priority: Normal
- Type: regression
- Proof: manual (checked in Google Sheets' own version history, an external system's screen)
- Covers: AC20

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of an editable copy of test sheet "MOQ-31 mixed", shared with the tool; QC notes the latest entry in its version history (File, Version history) before the test.

Steps:
1. Choose Find leads in the menu and click Sync now, and wait for the report
2. In Google Sheets, open File, Version history, See version history

Expected:
1. No new version or edit appears after the one noted before the test
2. No cell, comment, colour or tab of the sheet has changed; the service account email does not appear as an editor

## MOQ-31-46 · A sheet with only its header row gives an empty report
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 empty" prepared once and shared with the tool)
- Covers: AC15, zero rows

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 empty", shared with the tool: header row only, every needed column present.

Steps:
1. Choose Find leads in the menu and click Sync now
2. Read the report, then choose Review in the menu

Expected:
1. The report says 0 leads created, 0 rows skipped, with no error
2. Review has no lead to show and shows its empty state

## MOQ-31-47 · Long text and special characters are kept unchanged
- Priority: Normal
- Type: regression
- Proof: automated (needs test sheet "MOQ-31 long text" prepared once and shared with the tool)
- Covers: AC3, values unchanged at the boundaries

Pre-conditions:
- User: Logged In (the owner, test account owner@1moq-test.example).
- No lead in the tool (fresh test database).
- Settings holds the link of test sheet "MOQ-31 long text", shared with the tool.
- Row 2: Business "Test Café « Écume » & Fils — L'Atelier", Why they fit a 2,000-character text with line breaks, Notes a text with emoji and quotes ("ok" 'ok'), Owner / founder (public) "Jean-Noël O'BRIEN", other columns valid

Steps:
1. Choose Find leads in the menu and click Sync now
2. Open the lead from Leads and compare each value with the sheet

Expected:
1. The Business, Why they fit, Notes and Owner / founder values are identical to the sheet, with no character cut, replaced or escaped, and line breaks kept
2. The lead page stays readable: the long text wraps without breaking the layout
