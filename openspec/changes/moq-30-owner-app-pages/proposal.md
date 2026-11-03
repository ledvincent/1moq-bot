Jira: MOQ-30
Size: normal
Difficulty: routine
Tier: light

# MOQ-30: Owner's app pages with sample data

## Why

The UI is still the MOQ-2 shell: one heading at `/`. Each feature ticket (MOQ-5 to MOQ-25) needs a page to connect to, and QC needs screens to test against as features go live. Putting every page of the owner's tool in place now, filled with sample data and in the 1moq style, gives both a base. Asked by Dirox (the developer).

## What Changes

- One menu reaching eight pages: Overview (`/`, the home page), Find leads (`/find`), Review (`/review`), Leads (`/leads`, with a page per lead at `/leads/:id`), Emails (`/emails`), Templates (`/templates`), Results (`/results`), Settings (`/settings`). The current page is marked.
- Each page shows its layout filled with invented sample data and a visible "Sample data" marker. Sample data uses the real terms of `okf/domain/` (lead statuses, client types, steps, fit levels, markets).
- Every action that needs a later feature (search, add a link, approve, reject, Send now, pause, save, and the others listed in `design.md`) changes nothing and makes no request; the page says which ticket connects it (for example "Connected by MOQ-19").
- The server answers a page address (reload or opened directly) with the app, which shows that page. An address matching no page shows a "Page not found" page linking back to the Overview. Unknown addresses under `/api/` and `/u/` keep a plain 404; `GET /health` is unchanged.
- The 1moq style: minimal, black and white, big bold clear type, using the system font (no font file, no external request).
- Supersedes the planned page names in `okf/architecture/overview.md` "Entry points": the home page is the Overview at `/`, not `/review`, and there is no `/to-do` page (leads to contact by hand are listed in Emails). The overview is updated at close-change.
- A light DOM for tests (happy-dom) so the pages are proven by automated tests, which MOQ-2 had no way to do.

## Out of scope

- The sign-in and setup pages and Sign out (MOQ-4) and the public unsubscribe page (MOQ-18): those tickets build them in this style; the layout leaves room for Sign out.
- Phone layout: computer browser only (Mac Safari and Chrome).
- Any real search, saving, sending or reading of data: no API route, no table, no job. Sample data lives in the UI bundle only.
- Sign-in in front of the pages (MOQ-4).
- A dry-run indicator: dry-run stays a server setting until go-live (MOQ-26).
- Languages other than English for the interface.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform`: "One process serves the UI and runs the jobs" now serves the owner's app at every page address; new requirements for the menu, the sample data marker, actions not connected yet, the lead page, page addresses, and plain 404s under `/api/` and `/u/`.

## Impact

- `web/`: `App.tsx` becomes the layout and page picker; new pages, shared UI parts, sample data and a stylesheet under `web/src/`; `index.html` gets the title.
- `src/platform/http/app.ts`: a not-found handler returning `index.html` for page addresses (the same rule as MOQ-4's design D8).
- `vitest.config.ts` and `package.json`: a `web` test project on happy-dom (one new dev dependency, pinned exactly), run by `pnpm test` and `pnpm test:unit`.
- Knowledge at close-change: `okf/architecture/overview.md` (entry points), `okf/architecture/tech-stack.md` (happy-dom), decision records named in `design.md`.
- Overlaps MOQ-4 (open, PR #6) in `src/platform/http/app.ts` and `web/src/App.tsx`; see `design.md`, Risks.

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source |
|---|---|---|
| 1 | WHEN the owner opens the tool THEN one menu reaches all eight pages (Overview, Find leads, Review, Leads, Emails, Templates, Results, Settings), and the current page is marked | Jira |
| 2 | WHEN any page opens THEN it shows its layout filled with sample data, with a visible "Sample data" marker | Jira |
| 3 | WHEN the owner uses an action that needs a feature not built yet (search, approve, Send now, save) THEN nothing is searched, saved or sent, and the page says which feature will connect it | Jira |
| 4 | WHEN the owner opens a lead in the Leads list THEN that lead's page opens with its facts and their sources, status and history | Jira |
| 5 | WHEN the owner reloads a page or opens its address directly THEN the same page opens | Jira |
| 6 | WHEN an address matches no page THEN a "Page not found" page in the same style links back to the Overview | Jira |
| 7 | WHEN an unknown address under `/api/` or `/u/` is requested THEN the answer is a plain 404, not the app's page (and `GET /health` is unchanged) | checklist: existing requirements; overview entry points; MOQ-4 design D8 |

Considered, not needed:
- Phone layout: out of scope in the ticket (computer browser only).
- Sign-in and permissions: MOQ-4 (user-access); pages are not behind sign-in in this change.
- Personal data: sample data is invented (no real business, person or email address), shipped in the UI bundle; nothing is stored.
- Performance: no threshold stated.
- Run twice / repeat: nothing is saved, so nothing to repeat.
- Dry-run indicator: not asked; dry-run stays a server setting until go-live (MOQ-26).
- Style: not a WHEN/THEN criterion; the requester's words go into the design, and it is checked by eye in the PR review.

Open questions: none.

## Jira acceptance criteria

Read from MOQ-30 on 2026-11-03 18:55
* WHEN the owner opens the tool THEN one menu reaches all eight pages (Overview, Find leads, Review, Leads, Emails, Templates, Results, Settings), and the current page is marked
* WHEN any page opens THEN it shows its layout filled with sample data, with a visible "Sample data" marker
* WHEN the owner uses an action that needs a feature not built yet (search, approve, Send now, save) THEN nothing is searched, saved or sent, and the page says which feature will connect it
* WHEN the owner opens a lead in the Leads list THEN that lead's page opens with its facts and their sources, status and history
* WHEN the owner reloads a page or opens its address directly THEN the same page opens
* WHEN an address matches no page THEN a "Page not found" page in the same style links back to the Overview
* WHEN an unknown address under `/api/` or `/u/` is requested THEN the answer is a plain 404, not the app's page (and `GET /health` is unchanged)
