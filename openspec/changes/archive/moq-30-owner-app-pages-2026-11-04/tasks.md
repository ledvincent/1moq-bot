# Tasks

## 1. Test setup for the pages

- [x] 1.1 Add `happy-dom` `21.0.4` as an exact dev dependency (`pnpm add -D -E happy-dom@21.0.4`); verify `pnpm install --frozen-lockfile` succeeds with the updated lockfile (design D7)
- [x] 1.2 Add the `web` Vitest project (`happy-dom`, `web/src/**/*.test.ts(x)`, `@vitejs/plugin-react`) to `vitest.config.ts`, and `--project web` to the `test` and `test:unit` scripts; verify `pnpm test:unit` runs it (D7)
- [x] 1.3 Write `web/src/test/render.tsx` (mount at an address inside `act`, unmount after each test, `fetch` and `XMLHttpRequest` spies); verify with a first test that mounts the current `App` and finds `1moq-bot`, and that `pnpm typecheck` and `pnpm lint` pass (D7)

## 2. Server: page addresses return the app

- [x] 2.1 Add the not-found handler to `buildApp` in `src/platform/http/app.ts`: `GET`/`HEAD` outside `/api`, `/api/*`, `/u`, `/u/*` get `index.html`; everything else keeps Fastify's default 404 (D2); verify with `src/platform/http/app.test.ts` (`app.inject`, temporary web folder, pool stub) and the existing `src/platform/http/health.int.test.ts` still passing

## 3. Layout, menu and addresses

- [x] 3.1 Write `web/src/app/routes.ts` (page map of D1, `matchRoute`, trailing slash, `/leads/:id`, not found) with unit tests in `web/src/app/routes.test.ts`
- [x] 3.2 Write `web/src/app/navigation.ts` (`usePathname`, `navigate`, `popstate`) and `web/src/app/link.tsx` (plain left click navigates, modified clicks left to the browser); verify with tests in `web/src/app/navigation.test.tsx`
- [x] 3.3 Write `web/src/styles.css` (tokens, system font stack, type scale, top bar, column) and the shared parts in `web/src/ui/` (`PageHeader`, `SampleDataMarker`, `Table`, `Stat`) (D4); verify `pnpm build` succeeds and the built CSS requests no external font or file
- [x] 3.4 Rewrite `web/src/App.tsx` as the layout (top bar, menu with `aria-current`, empty right slot for MOQ-4's Sign out, `document.title`) and the page picker, with the "Page not found" page and an empty page component per address; set the title in `web/index.html`; verify the menu and not-found tests of the Proof group pass

## 4. Sample data and pages

- [x] 4.1 Write the invented sample data and its types in `web/src/sample/` (D5: domain terms from `okf/domain/`, `.example` websites, `example.com` addresses, every lead status present, fixed send-time text); verify with `web/src/sample/sample.test.ts` that every status of `okf/domain/lead-status.md` appears, every website ends in `.example` and every address in `@example.com`
- [x] 4.2 Write `web/src/app/connected-by.ts` (action to ticket map of D6) and `web/src/ui/not-connected-action.tsx` with its notice in a `role="status"` region; verify with `web/src/ui/not-connected-action.test.tsx` (notice text names the ticket, `preventDefault` on form submit)
- [x] 4.3 Build the Overview, Find leads and Review pages in `web/src/pages/` from the sample data, with their actions (D6); verify the page tests in `web/src/pages/pages.test.tsx` for these pages pass
- [x] 4.4 Build the Leads list (status filter on the sample data) and the lead page (`/leads/:id`: facts with source, status, flags, history; unknown id shows "Page not found"); verify the Leads tests in `web/src/pages/pages.test.tsx` pass
- [x] 4.5 Build the Emails, Templates, Results and Settings pages with their actions (D6; the do-not-contact field is cleared after use); verify the page tests in `web/src/pages/pages.test.tsx` for these pages pass
- [x] 4.6 Update the UI-shell test in `src/main.int.test.ts` to also check the bundle contains `Overview` (D8, same test name); verify `pnpm test` passes
- [x] 4.7 Run `pnpm lint`, `pnpm typecheck` and `pnpm test`; then `pnpm dev` and open each page in Chrome (and Safari on the Mac when available) to check the style by eye, reloading each address once; note the result in the PR

## 5. Proof

- [x] 5.1 Test `Local start serves the UI shell` in `src/main.int.test.ts`
- [x] 5.2 Test `Menu reaches every page` in `web/src/app/app.test.tsx`
- [x] 5.3 Test `Every page shows the sample data marker` in `web/src/pages/pages.test.tsx` (each of the eight pages and a lead's page)
- [x] 5.4 Test `Unconnected action changes nothing` in `web/src/pages/pages.test.tsx` (every entry of `connected-by.ts`, at least Search, Approve, Send now and Save: no `fetch` or `XMLHttpRequest`, address unchanged, notice names the ticket)
- [x] 5.5 Test `Open a lead from the list` in `web/src/pages/pages.test.tsx`
- [x] 5.6 Test `Reload keeps the page` in `src/platform/http/app.test.ts` (each page address and `/leads/lead-01` answers `index.html`) and in `web/src/app/app.test.tsx` (mounting at each address opens that page)
- [x] 5.7 Test `Unknown address shows Page not found` in `web/src/app/app.test.tsx` (an unknown address and an unknown lead id; the link goes to `/`) and in `src/platform/http/app.test.ts` (an unknown page address answers `index.html`)
- [x] 5.8 Test `Unknown API or unsubscribe address gets a plain 404` in `src/platform/http/app.test.ts` (`/api/nope`, `/u/nope`, a POST outside both: 404, not HTML; `GET /health` answers 200)
