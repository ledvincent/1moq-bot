---
type: Decision
title: Page tests render React with happy-dom, without a testing library
description: A web Vitest project runs page tests in happy-dom 21.0.4, mounting with createRoot inside act through a small helper, with no testing library; layout and style stay checked by eye
owner: vincent.ledreau@dirox.net
status: stable
tags: [testing, ui]
---
# Page tests render React with happy-dom, without a testing library

Date: 2026-11-04 · Jira: MOQ-30 · Change: `openspec/changes/archive/moq-30-owner-app-pages-2026-11-04/` (design D7)

## Context

The scenarios are about what the pages show and do (menu marking, marker, notices, navigation to the lead page). MOQ-2 had no way to render React in tests; its UI-shell test only checks the served HTML. The [tech stack](/architecture/tech-stack.md) says a new library is added by the ticket that needs it, and changing the stack is a decision.

## Decision

- Add `happy-dom` `21.0.4` as an exact dev dependency, Node `>=20`. Vitest 5.0.5 lists it as an optional peer.
- A fourth Vitest project, `web`: `environment: 'happy-dom'`, including `web/src/**/*.test.tsx` and `web/src/**/*.test.ts`, with `@vitejs/plugin-react` as in `vite.config.ts`. `pnpm test` and `pnpm test:unit` add `--project web`, so CI runs it with no workflow change.
- No testing library: `web/src/test/render.tsx` mounts a component with `createRoot` inside React's `act`, sets `globalThis.IS_REACT_ACT_ENVIRONMENT = true`, sets the address with `history.replaceState` before mounting, and unmounts after each test. Queries use the DOM; clicks use `element.click()` or a dispatched `MouseEvent` inside `act`.
- "No request" is proven by spying on `globalThis.fetch` and `XMLHttpRequest.prototype.send` and asserting zero calls, and by checking `location.pathname` is unchanged.
- The server rule for page addresses is tested with `buildApp` and `app.inject` in `src/platform/http/app.test.ts`, with a temporary web folder and a pool stub, so `GET /health` is checked in the same test.

## Alternatives considered

- `jsdom`: the most complete DOM, but larger and slower to start; the pages need only elements, events and `history`.
- `@testing-library/react`: nicer queries, two more dependencies for a few dozen assertions; can be added later without changing the tests' meaning.
- Vitest browser mode with Playwright: a real browser, but a browser download in CI and a heavier setup; MOQ-2 kept browser tests out.
- `react-dom/server` rendering to a string: no events, so it cannot prove clicks, navigation or notices.

## Consequences

Later UI tickets test their pages the same way. Layout and visual style are still checked by eye ([UI style](/architecture/ui-style.md)); happy-dom does not lay pages out.
