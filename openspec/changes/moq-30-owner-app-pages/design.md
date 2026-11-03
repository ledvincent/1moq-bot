# Design: MOQ-30 owner's app pages with sample data

## Context

See proposal.md, Why. Today:
- `web/src/App.tsx` renders one heading, `1moq-bot`; `web/src/main.tsx` mounts it in `#root` (MOQ-2 design D7).
- `src/platform/http/app.ts` `buildApp()` registers `GET /health` and `@fastify/static` on `dist/web/` at `/`. Any other address gets Fastify's default JSON 404, so reloading a page other than `/` would fail.
- The image (MOQ-3) copies `dist/web/` and serves it the same way; nothing in `deploy/` changes.
- Tests: Vitest projects `unit`, `integration`, `container` (`vitest.config.ts`), all in the `node` environment. MOQ-2 noted that no test proves React renders: the UI-shell test (`src/main.int.test.ts`) checks the served HTML and that the bundle contains `1moq-bot`.

The design follows:
- `okf/decisions/MOQ-1-typescript-stack.md` (React and Vite, Fastify serving the built UI);
- `okf/decisions/MOQ-2-folder-layout.md` (UI in `web/`, tests next to the code, kebab-case);
- `okf/architecture/tech-stack.md` (exact pins; a new library is listed there by the ticket that adds it);
- `okf/architecture/overview.md` (modules, entry points).

It builds on the open MOQ-4 design (`openspec/changes/moq-4-owner-sign-in/design.md` on branch `proposal/MOQ-4-owner-sign-in`), D8 "Pages" and D10 "UI pages", so the two changes merge in either order.

## Goals / Non-Goals

**Goals:**
- Every page, its address, the menu and the style in place, so a feature ticket only swaps a page's sample data for real data and wires its actions.
- Automated tests that render the React pages (menu, marker, actions, lead page, addresses).
- The same server rule for page addresses as MOQ-4.

**Non-Goals:**
- Any API route, table, job or time-zone computation. Send times in the sample data are fixed text, not computed.
- A router library, a UI component library, a CSS framework or a hosted font.
- Browser end-to-end tests (still no tool for them in the agreed set; MOQ-2).
- Responsive or phone layout.

## Decisions

### D1. Page map and addresses. Decision record needed

**Context.** `okf/architecture/overview.md` "Entry points" planned `/review` as the home page and a `/to-do` page, and said each row fixes its own names. Every feature ticket from MOQ-5 on connects to one of these pages, and the owner will bookmark them, so the names should be fixed once.

**Decision.** The owner's app has these pages, in this menu order:

| Menu item | Address | Connected later by |
|---|---|---|
| Overview (home) | `/` | MOQ-13, MOQ-19, MOQ-20 (its figures) |
| Find leads | `/find` | MOQ-5, MOQ-6 |
| Review | `/review` | MOQ-13, MOQ-14 (MOQ-27 if chosen) |
| Leads | `/leads`, and `/leads/:id` for one lead | MOQ-23 |
| Emails | `/emails` | MOQ-19, MOQ-20, MOQ-21, MOQ-22 |
| Templates | `/templates` | MOQ-15 |
| Results | `/results` | MOQ-24 |
| Settings | `/settings` | MOQ-12, MOQ-17, MOQ-18, MOQ-19, MOQ-25 |

- The home page is the Overview at `/`, not `/review`. There is no `/to-do` page: the leads to contact by hand and the day-3 Instagram DMs due are a section of Emails. This undoes the planned names in `okf/architecture/overview.md` "Entry points" (MOQ-1 kickoff); the overview is updated at close-change.
- MOQ-4 adds `/sign-in` and `/setup` outside this menu; MOQ-18 owns `/u/*`.
- A trailing slash is ignored (`/leads/` opens Leads). Any other address, and `/leads/<id>` for an id with no lead, shows "Page not found".

**Alternatives considered.**
- Keep `/review` as home: the person chose an Overview as the first screen (waiting reviews, today's emails, replies, sending state), and Review is one click away.
- A separate `/to-do` page: the hand-contact list is about outreach, next to the queued emails; one page fewer in the menu.

**Consequences.** Feature tickets reuse these addresses and do not add menu items without a new decision. `okf/architecture/overview.md` "Entry points" lists this map. MOQ-22 builds its list inside Emails.

### D2. Server: page addresses return the app (same rule as MOQ-4 D8)

`buildApp` gets a not-found handler (`app.setNotFoundHandler`), after `@fastify/static`:
- A `GET` or `HEAD` whose path is not `/api` or `/u`, and does not start with `/api/` or `/u/`, gets `index.html` from the web folder (`reply.sendFile('index.html')`, status 200, `text/html`). The React app then picks the page from `location.pathname` (D3). An address that matches no page is therefore answered by the app, which shows "Page not found".
- Everything else (any method under `/api/` or `/u/`, and non-GET methods elsewhere) gets Fastify's default 404 JSON answer: a plain 404, never `index.html`.
- `GET /health` and the static files (`/`, `/assets/*`) are matched before the not-found handler, so they are unchanged.

This is the wording of MOQ-4 design D8 "Pages", so whichever change merges second keeps one handler. MOQ-4's access hooks are root-level `onRequest` hooks and run before this handler, so its sign-in redirect still covers page addresses.

Alternatives considered: `@fastify/static`'s `wildcard` options or one route per page address (the page list would live in the server as well as in the UI, and would drift); hash addresses (`/#/leads`) (they work without the server change but MOQ-4 already plans path addresses, and `#` is used by MOQ-4's setup link).

### D3. UI: page picking without a router library

- `web/src/app/routes.ts` holds the page map of D1 (path, menu label, page component) and `matchRoute(pathname)`, which returns a page, a lead id, or "not found". It is a pure function, unit-tested.
- `web/src/app/navigation.ts`: a `usePathname()` hook reading `location.pathname` and listening to `popstate`, and `navigate(path)` (`history.pushState` plus a notification to the hook).
- `web/src/app/link.tsx`: a `Link` that renders a real `<a href>`, and handles a plain left click with `navigate` (a click with Cmd, Ctrl, Shift or Alt, or a middle click, is left to the browser, so Cmd-click opens a new tab on the Mac).
- `document.title` is `<Page> · 1moq-bot` on each page.
- MOQ-4 D10 picks pages from `location.pathname` in `App.tsx` as well: its `/sign-in` and `/setup` become two more entries handled before the layout (no menu), and its Sign out button goes in the header slot (D4).

Alternative considered: React Router (one more dependency, and a second routing model next to MOQ-4's `location.pathname`), for eight fixed pages and one parameter.

### D4. Layout and style

The requester's words: "very precise design / style that's close to 1moq's way. Some sort of minimalistic black and white website. big fonts, clear", "kind of like apple i guess. minimalistic with bold clear fonts."

- One stylesheet, `web/src/styles.css`, imported by `main.tsx`, with CSS custom properties for the few tokens: black `#000` text on white `#fff`, one grey for secondary text and lines, no other colour (a state such as "paused" is shown by words and weight, not colour).
- Type: the system font stack `-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Helvetica, Arial, sans-serif`, which gives SF Pro on the Mac with no font file and no external request (no paid or hosted font, budget rule). Page titles large and bold (about 48px, weight 700), section titles about 24px, body about 17px, generous line height and white space; numbers on Overview and Results set large.
- Layout: a top bar with the name `1moq` on the left, the eight menu items, and an empty slot on the right kept for MOQ-4's Sign out. Below it, the page in one centred column with a maximum width (about 1100px). Desktop only: no breakpoints.
- Current menu item: `aria-current="page"` plus bold weight and an underline, so it is marked for eyes and for tests.
- Shared parts in `web/src/ui/`: `PageHeader` (title, the "Sample data" marker), `SampleDataMarker` (a black-outlined pill reading "Sample data", next to the page title), `Table`, `Stat` (a big number with its label), `NotConnectedAction` (D6), `NotConnectedNotice`.
- "Page not found" uses the same layout and menu, a large title "Page not found", one line, and a link "Back to the Overview" to `/`. It shows no "Sample data" marker (it has no data).
- Checked by eye in the PR review (not a criterion), on the Mac in Safari and Chrome.

### D5. Sample data

- Invented, in `web/src/sample/` (one file per page area: `leads.ts`, `emails.ts`, `templates.ts`, `results.ts`, `settings.ts`, `overview.ts`) with the shared types in `web/src/sample/types.ts`. A header comment in each file says the data is invented. Pages import from there only, so a feature ticket replaces one import with its API call.
- No real business, person or email address: business names are made up; websites use the reserved `.example` top-level domain (for example `https://harbour-roasters.example`); email addresses use `example.com`; Instagram handles are shown as text, never as links. Pictures on Review are plain grey blocks, no image files and no external images.
- Domain terms as in `okf/`:
  - statuses from `okf/domain/lead-status.md` (every status appears at least once in the Leads list, so its filter has something to show), flags shown separately from the status;
  - client types from `okf/domain/client-types.md`, and their default windows and Saturday switch in Settings (8:00 to 9:00 with Saturday on for cafés and roasters, bars and restaurants, breweries; 9:00 to 10:00 with Saturday off for the others; Associations listed with its window like the others);
  - steps from `okf/domain/outreach-sequence.md` (intro day 1, Instagram DM day 3, follow-ups days 6 and 12, last email day 21) and the daily limits (25 new intros, 50 in total);
  - fit levels good, possible, poor, and the five rules met, not met or unknown, from `okf/domain/qualification-rules.md`;
  - markets from `okf/domain/markets.md` (EU countries, United Kingdom and Australia active) and languages English and French (`okf/domain/base-templates.md`);
  - IANA time zones on leads (for example `Europe/London`, `Europe/Paris`, `Australia/Melbourne`); queued send times are written as fixed text in the lead's time zone (for example "Tue 4 Nov, 8:12, Europe/London").
- About 12 sample leads, each with an id (`lead-01` …), facts with their source (Google Maps, website, Instagram profile, AI profile, set by the owner), a status and a dated history (found, waiting for review, approved, intro sent, …).

### D6. Pages, and their actions not connected yet

What each page shows (sample data, D5), and the actions it offers. Every listed action is a `NotConnectedAction`: a normal, clickable button (not disabled, so the owner can try it). Using it calls no `fetch`, submits no form (`preventDefault`) and does not navigate. It shows a `NotConnectedNotice` in a `role="status"` region on the page: "Not connected yet. <Action> is connected by <KEY>." Inputs and selects can be typed in or changed locally, but nothing keeps their value after a reload. Filtering and opening pages are not actions of this kind: they work on the sample data.

| Page | Shows | Actions not connected yet (ticket) |
|---|---|---|
| Overview | Leads waiting for review, emails going out today, new replies, sending on or paused, each as a big figure linking to its page | none (figures link to Review, Emails) |
| Find leads | Google Maps search form (business type, city) with sample recent searches; "Add a lead from a link" form (Instagram or website link) | Search (MOQ-5); Add lead (MOQ-6) |
| Review | One lead per screen: grey picture blocks, facts, client type with its reason, fit level with the five rules, market; position "3 of 12" | Approve, Reject (MOQ-13); Previous / next lead move through the sample data (work locally) |
| Leads | Table of leads (name, client type, market, status, fit, last change) with a status filter (all statuses of `lead-status.md`); each row's name links to `/leads/:id` | none on the list |
| Lead page | Name, status with its date, flags, facts table (fact, value, source), history (date, event), client type, language and time zone | Change client type (MOQ-11, the owner's correction); Record a reply (MOQ-20, recorded by the owner); Erase this lead's data (MOQ-25) |
| Emails | Sending on or paused with the pause switch; queued emails (lead, step, send time in the lead's time zone) with Send now; sent emails; replies; Instagram DMs due and leads to contact by hand | Pause sending / Resume sending (MOQ-19); Send now (MOQ-19); Mark DM as sent (MOQ-22) |
| Templates | Choice of client type, step (intro, Instagram DM, follow-up 1, follow-up 2, last email) and language (English, French); the base text in a text area | Save (MOQ-15) |
| Results | Period choice (this week, this month, last 30 days); totals by client type and by market: found, approved, sent, replies, reply rate, opt-outs, bounces | Change the period (MOQ-24): the figures stay the sample ones, no computation in this change |
| Settings | Daily limits; send window and Saturday switch per client type; active markets; mailbox status; do-not-contact list (count and an "add an address" field); personal data requests (erase, export) | Save limits and windows (MOQ-19); Save active markets (MOQ-12); Check mailbox (MOQ-17); Add to do-not-contact list (MOQ-18); Erase or export a lead's data (MOQ-25) |

- Daily limit, send windows and the Saturday switch are mapped to MOQ-19 (backlog row 18: "in their client type's window and sending days, within the daily limit"); the ticket's Settings line lists MOQ-12, MOQ-17, MOQ-18 and MOQ-25 for the rest.
- The do-not-contact field never shows or keeps an address after use: the notice appears and the field is cleared (the list is stored hashed later, `okf/domain/do-not-contact-list.md`).
- The connecting ticket for each action is one map, `web/src/app/connected-by.ts`, so a feature ticket removes its entry when it wires the action, and a test can check every entry.

### D7. Tests render the pages with happy-dom. Decision record needed

**Context.** The scenarios are about what the pages show and do (menu marking, marker, notices, navigation to the lead page). MOQ-2 had no way to render React in tests; its UI-shell test only checks the served HTML. `okf/architecture/tech-stack.md` says a new library is added by the ticket that needs it, and changing the stack is a decision.

**Decision.**
- Add `happy-dom` `21.0.4` as an exact dev dependency (`save-exact`), the latest release on 2026-11-03, Node `>=20`. Vitest 5.0.5 lists it as an optional peer.
- A fourth Vitest project, `web`: `environment: 'happy-dom'`, `include: ['web/src/**/*.test.tsx', 'web/src/**/*.test.ts']`, with `@vitejs/plugin-react` as in `vite.config.ts`. `pnpm test` and `pnpm test:unit` add `--project web`, so CI (`pnpm test`) runs it with no workflow change.
- No testing library: a small helper `web/src/test/render.tsx` mounts a component with `createRoot` inside React's `act`, sets `globalThis.IS_REACT_ACT_ENVIRONMENT = true`, sets the address with `history.replaceState` before mounting, and unmounts after each test. Queries use the DOM (`querySelector`, `textContent`, roles and `aria-current`); clicks use `element.click()` or a dispatched `MouseEvent` inside `act`.
- "No request" is proven by spying on `globalThis.fetch` (and `XMLHttpRequest.prototype.send`) and asserting zero calls, and by checking that `location.pathname` is unchanged.
- The server rule (D2) is tested with `buildApp` and `app.inject` in a unit test, `src/platform/http/app.test.ts`, with a temporary web folder holding a small `index.html` and a pool stub that answers the health query, so `GET /health` is checked unchanged in the same test.

**Alternatives considered.**
- `jsdom`: the most complete DOM, but larger and slower to start; the pages need only elements, events and `history`.
- `@testing-library/react` (and `@testing-library/dom`): nicer queries, two more dependencies for a few dozen assertions; can be added later without changing the tests' meaning.
- Vitest browser mode with Playwright: a real browser, but a browser download in CI and a heavier setup than the agreed set; MOQ-2 kept browser tests out.
- `react-dom/server` rendering to a string in the `node` environment: no events, so it cannot prove clicks, navigation or notices.

**Consequences.** `okf/architecture/tech-stack.md` gets a line for happy-dom at close-change. Later UI tickets test their pages the same way. Layout and visual style are still checked by eye; happy-dom does not lay pages out.

### D8. Existing UI-shell test

The scenario "Local start serves the UI shell" keeps its meaning (one process, the React UI at `/`). Its test in `src/main.int.test.ts` keeps its name and checks: `GET /` answers the HTML with `#root`, the bundle loads, and the bundle contains `1moq-bot` (the app's name stays in the bundle through `document.title`) and `Overview`. The test is not weakened: it gains the `Overview` check.

## Risks / Trade-offs

- [MOQ-4 (PR #6, not merged) also changes `src/platform/http/app.ts` (the not-found handler, `registerAccess`) and `web/src/App.tsx` (`/sign-in`, `/setup`, Sign out)] → D2 uses MOQ-4 D8's exact rule and D3/D4 leave the slots MOQ-4 needs. Whoever merges second resolves the conflict: one not-found handler, MOQ-4's pages as entries before the layout in `App.tsx`, Sign out in the header slot. Name it in both PRs.
- [A missing file under `/assets/` (an old tab after a release) gets `index.html` instead of a 404, as in MOQ-4's rule] → Vite's hashed names make this rare; reloading the page fixes it. Changing the rule is left to a later ticket so the two changes keep one rule.
- [Sample data could be mistaken for real data, or a reviewer could think an action worked] → The "Sample data" marker on every page and the "Not connected yet" notice on every action (the scenarios).
- [happy-dom differs from Safari in details] → Tests check structure and behaviour, not layout; the PR review checks the pages in Safari and Chrome on the Mac.
- [Feature tickets might bypass the shared parts and drift from the style] → The shared parts in `web/src/ui/` and the tokens in `styles.css` are the one place for the style; the decision record for D1 points to them.

## Migration Plan

Nothing to migrate: no data and no setting changes. The next image serves the new pages at the same address; rolling back to the MOQ-3 image brings back the one-line shell and its 404 on page reloads, with no data effect.
