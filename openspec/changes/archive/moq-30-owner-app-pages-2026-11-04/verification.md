Verified: 2026-11-04 at 3e229a4

Tests: `pnpm test` could not run as written: pnpm is not on PATH, and `corepack pnpm` fails because the pnpm 12.15.0 shim is missing. I ran the same projects with `npx vitest run --project unit --project web --project integration` → 74/74 passed (0 failed, 0 skipped), 15 test files.
Tests: `pnpm test:container` → not run (it needs Docker, `age` and an `IMAGE`; this change touches nothing in `deploy/`).
OpenSpec: the change is archived, so `openspec validate moq-30-owner-app-pages --strict` answers "Unknown item". The merged spec passes: `openspec validate platform --type spec --strict` → valid.

| Requirement | Scenario | Proven by | OK? | Note |
|---|---|---|---|---|
| One process serves the UI and runs the jobs | Local start serves the UI shell | src/main.int.test.ts "Local start serves the UI shell: …" | Yes | Now also checks the bundle contains `Overview` (D8). Matches Proof 5.1. |
| One menu reaches every page | Menu reaches every page | web/src/app/app.test.tsx "Menu reaches every page" | Yes | Checks the labels and links in order, clicks each, then checks the address, the h1, that only that item is marked, and the title. Separate test: a lead's page marks Leads. |
| Pages show sample data | Every page shows the sample data marker | web/src/pages/pages.test.tsx "Every page shows the sample data marker" | Yes | Covers the 8 pages and /leads/lead-01. "No real data" is covered by sample.test.ts. |
| Actions not connected yet change nothing | Unconnected action changes nothing | pages.test.tsx "Unconnected action changes nothing" | Yes | Goes through every entry of connected-by.ts: no fetch or XHR, address unchanged, exact notice text with the ticket. |
| Lead page from the list | Open a lead from the list | pages.test.tsx "Open a lead from the list" | Yes | Checks the address, the name, the status, facts with their source, and history. |
| Page addresses open their page | Reload keeps the page | src/platform/http/app.test.ts and web/src/app/app.test.tsx "Reload keeps the page…" | Yes | Server answers every page address, `/leads/` and a lead page with index.html; the UI opens the page when mounted at each address. |
| Page addresses open their page | Unknown address shows Page not found | app.test.tsx and app.test.ts "Unknown address shows Page not found…" | Yes | Covers an unknown address and an unknown lead id; the back link goes to `/`; the server answers index.html. |
| Plain 404 outside the app's pages | Unknown API or unsubscribe address gets a plain 404 | app.test.ts "Unknown API or unsubscribe address gets a plain 404, …" | Yes | `/api`, `/api/*`, `/u`, `/u/*`, POST and PUT elsewhere all get a JSON 404 without the app's HTML; /health still answers 200 `{status:'ok'}`. |

Acceptance criteria:

| # | Criterion | Scenarios | Proven |
|---|---|---|---|
| 1 | Menu reaches all eight pages, current page marked | Menu reaches every page | Yes |
| 2 | Sample data and "Sample data" marker on every page | Every page shows the sample data marker | Yes |
| 3 | Unconnected actions change nothing and name the ticket | Unconnected action changes nothing | Yes |
| 4 | Lead page from the list with facts, sources, status and history | Open a lead from the list | Yes |
| 5 | Reload or direct address opens the same page | Reload keeps the page | Yes |
| 6 | Unknown address shows "Page not found" linking to the Overview | Unknown address shows Page not found | Yes |
| 7 | Plain 404 under /api/ and /u/; /health unchanged | Unknown API or unsubscribe address gets a plain 404 | Yes |

Unit tests:

| File | Unit with logic | Unit test | OK? |
|---|---|---|---|
| src/platform/http/app.ts | not-found handler (GET/HEAD outside /api and /u get index.html, the rest a 404) | src/platform/http/app.test.ts | Yes |
| web/src/app/routes.ts | matchRoute (home, page, trailing slash, lead id, not found) | web/src/app/routes.test.ts | Yes |
| web/src/app/navigation.ts | usePathname, navigate, popstate | web/src/app/navigation.test.tsx | Yes |
| web/src/app/link.tsx | Link: plain left click vs modified or middle click | web/src/app/navigation.test.tsx | Yes |
| web/src/app/connected-by.ts | notConnectedText | not-connected-action.test.tsx and pages.test.tsx (exact text) | Yes |
| web/src/ui/not-connected-action.tsx | notice, preventDefault on submit, field cleared after use | web/src/ui/not-connected-action.test.tsx | Yes |
| web/src/App.tsx | page picker, aria-current, document.title, not-found | web/src/app/app.test.tsx | Yes |
| web/src/pages/leads-page.tsx | status filter | pages.test.tsx "Leads filters by status" | Yes |
| web/src/pages/review-page.tsx | previous / next lead | pages.test.tsx "Review moves through the waiting leads locally" | Yes |
| web/src/pages/lead-page.tsx | unknown id shows not found | app.test.tsx (/leads/lead-99) | Yes |
| web/src/sample/*.ts | none needed: static data and types (checked by sample.test.ts) | web/src/sample/sample.test.ts | Yes |
| web/src/ui/page-header, sample-data-marker, stat, table; other pages | none needed: rendering only, covered by the scenario tests | — | Yes |

Scope: in line with the tasks; all tasks are ticked. The diff against main also includes files from the merged kit setup (#8) and the MOQ-4 proposal (#6): `.github/*`, `okf/*`, `openspec/changes/moq-4-owner-sign-in/*`. Those come from the merge of main. The OKF files that belong to this change (two decision records, `okf/architecture/ui-style.md`, overview and tech-stack updates) were planned for close-change.

Blocking findings:
- none

Non-blocking findings:
- `pnpm` is not runnable in this environment (corepack shim missing), so the tests ran through `npx vitest` with the same projects. `pnpm test:container` was not run.
- The `openspec validate <name>` step does not apply after archiving; only the merged `platform` spec was validated.
- Accepted risk from design.md: a missing `/assets/*` file gets index.html instead of a 404.
- The only `console.log` in the diff is fixture content in `src/platform/http/app.test.ts`, not debug output. No TODOs and no skipped tests were added.
