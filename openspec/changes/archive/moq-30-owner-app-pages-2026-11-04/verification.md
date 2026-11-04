Verified: 2026-11-03 at 0b6e504

Tests: pnpm test → not run in full. `pnpm` is not on PATH and Corepack fails ("Cannot find module …pnpm\12.15.0\bin\pnpm.cjs"), so I ran the script's own command, `node_modules/.bin/vitest run --project unit --project web --project integration`. It stopped at startup: TEST_DATABASE_URL is not set and no PostgreSQL is running, so the integration project could not start ("No test files found, exiting with code 1").
Tests: pnpm test:unit (`vitest run --project unit --project web`) → 58/58 passed (0 failed, 0 skipped)
Tests: pnpm test:container → not run (needs Docker and IMAGE; this change touches nothing in deploy/)
OpenSpec: `openspec validate moq-30-owner-app-pages --strict` → "Change 'moq-30-owner-app-pages' is valid"

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One process serves the UI and runs the jobs | Local start serves the UI shell | src/main.int.test.ts "Local start serves the UI shell: one start() runs…" | Not run | Integration test; it now also checks the bundle contains `Overview` (D8). It could not run here (no DB). Re-run with TEST_DATABASE_URL set. |
| One menu reaches every page | Menu reaches every page | web/src/app/app.test.tsx "Menu reaches every page" | Yes | Checks the 8 labels, their hrefs and order, then clicks each item: address, h1, only that item has aria-current, and document.title. The lead page marking Leads is tested separately. |
| Pages show sample data | Every page shows the sample data marker | web/src/pages/pages.test.tsx "Every page shows the sample data marker" | Yes | Covers the 8 pages and /leads/lead-01: the marker text is "Sample data" and main has content. The rule "no real business, person or address" is covered by sample.test.ts (.example websites, example.com addresses). |
| Actions not connected yet change nothing | Unconnected action changes nothing | pages.test.tsx "Unconnected action changes nothing" | Yes | Goes through every entry of connected-by.ts and requires search, approve, sendNow, saveTemplate and saveLimits. Checks zero fetch/XHR calls, the address unchanged and the exact notice naming the ticket. |
| Lead page from the list | Open a lead from the list | pages.test.tsx "Open a lead from the list" | Yes | Clicks a row link, then checks the address /leads/lead-07, the title, the status, facts with their source and the history. |
| Page addresses open their page | Reload keeps the page | src/platform/http/app.test.ts "Reload keeps the page: …" and app.test.tsx "Reload keeps the page: mounting at each address…" | Yes | Server answers index.html for every page address, /leads/ and /leads/lead-01. The UI mounted at each address opens that page. |
| Page addresses open their page | Unknown address shows Page not found | app.test.tsx "Unknown address shows Page not found" and app.test.ts "Unknown address shows Page not found: …" | Yes | Covers /to-do and /leads/lead-99: no marker, menu shown, no menu item marked, and the link back goes to `/`. |
| Plain 404 outside the app's pages | Unknown API or unsubscribe address gets a plain 404 | app.test.ts "Unknown API or unsubscribe address gets a plain 404, and GET /health answers as before" | Yes | Covers /api, /api/nope (GET and POST), /u, /u/nope, and POST/PUT on page addresses: 404 as JSON, not the app's page. /health returns 200 {status:ok}. |

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Menu reaches the 8 pages, current page marked | Menu reaches every page | Yes |
| 2 | Every page shows sample data and the marker | Every page shows the sample data marker | Yes |
| 3 | Unconnected action changes nothing and names its feature | Unconnected action changes nothing | Yes |
| 4 | Lead page from the list with facts and sources, status, history | Open a lead from the list | Yes |
| 5 | Reload or direct address opens the same page | Reload keeps the page | Yes |
| 6 | Unknown address shows "Page not found" with a link to the Overview | Unknown address shows Page not found | Yes |
| 7 | /api and /u get a plain 404, /health unchanged | Unknown API or unsubscribe address gets a plain 404 (also Local start serves the UI shell for the UI part) | Yes (unit); the integration scenario was not run |

Unit tests:

| File | Unit with logic | Unit test | OK? |
|---|---|---|---|
| src/platform/http/app.ts | isPageAddress and the not-found handler (method and prefix branches) | src/platform/http/app.test.ts (GET, HEAD, POST, PUT, /api, /apix, /u, /unsubscribe, query string, static files) | Yes |
| web/src/app/routes.ts | matchRoute (home, page, trailing slash, lead id, not found) | web/src/app/routes.test.ts | Yes |
| web/src/app/navigation.ts | usePathname, navigate, popstate | web/src/app/navigation.test.tsx | Yes |
| web/src/app/link.tsx | plain click vs modified or middle click | web/src/app/navigation.test.tsx | Yes |
| web/src/ui/not-connected-action.tsx | notice, preventDefault, clearing form | web/src/ui/not-connected-action.test.tsx | Yes |
| web/src/App.tsx | page picker, menu aria-current, document.title, not found | web/src/app/app.test.tsx | Yes |
| web/src/pages/leads-page.tsx | status filter | pages.test.tsx "Leads filters by status" | Yes |
| web/src/pages/review-page.tsx | previous/next index | pages.test.tsx "Review moves through the waiting leads locally" | Yes (the ends of the list are not tested) |
| web/src/pages/lead-page.tsx | unknown id → not found; time zone fallback | app.test.tsx (/leads/lead-99) | Yes |
| web/src/pages/emails-page.tsx | "to contact by hand" filter, lead-name fallback | pages.test.tsx "Emails shows queued send times…" | Yes |
| web/src/pages/overview-page.tsx | sending On/Paused text | pages.test.tsx "Overview figures link to their pages" | Yes (only the On case) |
| web/src/sample/*.ts, connected-by.ts, ui/page-header, stat, table, sample-data-marker, styles.css | none needed: data, types and presentation only (sample data is checked by sample.test.ts) | — | Yes |

Scope: no extra files; all the planned work is done. Unticked tasks: 4.7 (lint, typecheck, full `pnpm test`, then checking the style by eye in Chrome and Safari, to be noted in the PR). The local `main` branch is stale: it is at "Initial commit" 8ad6b27, so `git diff main...HEAD` lists the whole repo. I judged the scope from f6576a3..HEAD, which lists only the change's files.

Blocking findings:
- The integration suite (`pnpm test`) could not run here: no TEST_DATABASE_URL or PostgreSQL. So the scenario "Local start serves the UI shell" (src/main.int.test.ts, which now also checks `Overview` in the bundle) is not proven by this run. It must be run with a database before merge, and task 4.7's `pnpm test` must be confirmed then.

Non-blocking findings:
- Task 4.7 is unticked: lint, typecheck and the check by eye in the browser are not recorded yet. I did not run lint or typecheck, because they are outside the commands I am allowed to run.
- Thin coverage: Review previous/next at the first and last lead, and Overview with sending "Paused", are not tested.
- `pnpm` through Corepack is broken on this machine (pnpm 12.15.0 is not downloaded). This is an environment problem, not a problem in the code.
- Local `main` is stale; update it before computing the PR diff.
- No secrets, debug leftovers, skipped tests or new TODOs in the diff. The only `console.log(1)` is the content of a static test file in app.test.ts.

## Follow-up run (main session, 2026-11-03, at 0b6e504)

The blocking finding was environmental (no database). With the project's Docker Compose PostgreSQL running and `TEST_DATABASE_URL` set:
- `pnpm test` (unit, web, integration): 15 files, 74/74 passed, including "Local start serves the UI shell".
- `pnpm lint`: passed (ESLint and Prettier). `pnpm typecheck`: passed.

No blocking finding left. Task 4.7's check by eye in Chrome and Safari stays for a person, noted in the PR.
