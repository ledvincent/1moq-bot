Jira: MOQ-4
Size: big
Difficulty: tricky
Tier: heavy

# MOQ-4: Owner sign-in

## Why

The tool will sit at a public address (`okf/decisions/MOQ-1-cloud-web-service.md`), so every page except the unsubscribe page and the health check must need sign-in, and only the owner may sign in. The kickoff left the free sign-in method to this ticket (row 3 of the MOQ-1 kickoff backlog).

This change builds on the production stack of MOQ-3 (PR #5, not merged yet; the person chose to start anyway). It is proved on the developer's machine, where the tool is opened at `http://localhost:3000` (`pnpm dev`) or `https://localhost` (local production stack) in a browser on Windows. It reaches a public address with MOQ-29.

The ticket also covered opening the tool from the Mac's Dock. On 2026-10-26 the person moved that to a follow-up ticket (see Out of scope).

## What Changes

- **Sign-in with a passkey** (WebAuthn). For the owner: Touch ID on the Mac, with iCloud Keychain syncing the passkey to the iPhone. On a Windows PC, the browser's own passkey (Windows Hello) works the same way. No password, and no third-party sign-in service.
- **One account, no sign-up.** The developer enrols the owner with a **one-time setup link** made by a command run in the app container on the server (`moq_compose exec`). The owner opens it and registers a passkey. The link works once and expires after 24 hours. There is no sign-up page and no account for the developer.
- **Reset access**, a second server command for a lost or stolen device: it removes every passkey and ends every session. After that, only a new setup link lets the owner in.
- **Sessions** kept in PostgreSQL. They last 30 days, renewed on use: after 30 days without use the owner signs in again. The length is a new setting (default 30 days). Sign-out ends the session on that device.
- **A gate in front of the whole app.** A signed-out page request goes to the sign-in page. A signed-out `/api/*` call gets 401 with no data. These stay public:
  - the unsubscribe path `/u/*` (its page comes in a later compliance ticket);
  - `GET /health`;
  - the sign-in and setup pages;
  - the UI's built script and style files, which hold no data.
- **Request protection.** A state-changing request from another site is refused. The session cookie cannot be read by page scripts and is sent only over HTTPS.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `user-access`:
  - MODIFIED: "Sign-in required" (the public paths, 401 for `/api/*`), "Owner only" (passkeys, no sign-up), "Stay signed in" (30 days renewed on use, set by a setting).
  - ADDED: "Passkey sign-in", "Setup link", "Reset access", "Sign out", "Protected session".
  - "Open without a terminal" is not changed by this change.

## Out of scope

- **Opening the tool from the Dock**: the web app manifest, a placeholder icon, and the check with Safari's "Add to Dock" and Chrome's "Install app". The person moved it to a follow-up ticket on 2026-10-26. For now the tool opens at its address in a browser. The requirement "Open without a terminal" and its scenario "Open from the Dock" stay in the main spec, unchanged, for that ticket. Note for that ticket: browsers fetch the manifest and icons without the session, so it must add them to the gate's public paths.
- The unsubscribe page and its tokens: a later compliance ticket. This change only keeps `/u/*` public.
- Putting the tool on a public address, the real domain and its certificate: MOQ-29. The owner's real passkey is registered on production after MOQ-29. A passkey is tied to the address it was made on, so the production domain must be final before the owner enrols (design D3).
- Several accounts or roles, the owner's email or personal details, and Google sign-in (see Considered, not needed).
- An audit log of sign-ins: the platform audit log comes with a later ticket.
- Writing `okf/` files: the decision notes and the runbook listed in Impact are written at `/dirox-kit:close-change`.

## Impact

- New:
  - `src/access/`: the gate, sessions, passkey sign-in and enrolment, setup links, reset, the server command and the tables (re-exported from `src/platform/db/schema.ts`). Plus a migration in `drizzle/`.
  - The sign-in and setup pages in `web/src/`.
  - `tests/helpers/soft-authenticator.ts`: a software passkey for tests, so no real authenticator is needed.
- Edited:
  - `src/platform/config.ts` (the `PUBLIC_URL` and `SESSION_DAYS` settings) and `src/platform/http/app.ts` (register the access module, serve the UI's pages to the browser).
  - `vite.config.ts` (development proxy).
  - `deploy/app.env.example` and `.env.example` (`SESSION_DAYS`).
  - `package.json` (new pinned libraries) and `.claude/CLAUDE.md` (setup link and reset commands).
- APIs: new public `POST /api/access/sign-in/*` and `POST /api/access/setup/*`, and the signed-in `GET /api/access/session` and `POST /api/access/sign-out`. Every other `/api/*` route now needs sign-in.
- Dependencies (exact pins, listed in `okf/architecture/tech-stack.md` at close-change): `@simplewebauthn/server`, `@simplewebauthn/browser` and `@fastify/cookie`.
- Services: none new; no cost.
- Knowledge (at close-change):
  - New decision `okf/decisions/MOQ-4-passkey-sign-in.md`: passkeys over Google sign-in; setup link and reset from the server; the passkey tied to `APP_DOMAIN`; sessions in PostgreSQL.
  - New runbook `okf/runbooks/owner-access.md`: create a setup link, reset access.
  - Updates: `okf/architecture/overview.md` (the access entry points), `okf/architecture/tech-stack.md` (the libraries).

## Criteria coverage

| # | Criterion (WHEN / THEN) | Source | Scenario |
|---|---|---|---|
| 1 | WHEN someone not signed in opens any page of the tool THEN they see the sign-in page and no lead data; a signed-out call to `/api/*` is refused (401) with no data | spec "Sign-in required" | Signed-out visitor; Signed-out API call refused |
| 2 | WHEN a lead opens the unsubscribe page, or the host calls the health check THEN it answers without sign-in (also the sign-in page and the setup link page) | spec "Sign-in required", Jira description | Unsubscribe without sign-in; Health check without sign-in; Sign-in pages open without sign-in |
| 3 | WHEN the owner signs in with their registered passkey THEN the tool opens, signed in | checklist: main result | Owner signs in with a passkey |
| 4 | WHEN anyone signs in with a passkey that is not registered, or tries to create an account THEN the sign-in is refused and there is no way to sign up | spec "Owner only" | Unknown person refused; No sign-up |
| 5 | WHEN the developer creates a setup link on the server and the owner opens it THEN the owner registers a passkey and is signed in; the same link used again, or after it expires, is refused | checklist: enrolment, run twice | Owner enrols with a setup link; Setup link used twice refused; Expired setup link refused |
| 6 | WHEN the developer resets access on the server THEN all passkeys are removed and every session ends; only a new setup link lets the owner in again | checklist: lost device | Reset ends all access; Back in after a reset |
| 7 | WHEN the owner comes back the next day (within 30 days of last use) THEN the tool opens without asking to sign in; after 30 days without use they must sign in again | spec "Stay signed in" (period set by the developer) | Back the next day; Idle too long; Session length from the setting |
| 8 | WHEN the owner signs out THEN that device's session ends and the sign-in page shows | checklist: user action | Owner signs out |
| 9 | WHEN a state-changing request comes from another site THEN it is refused; the session cookie is not readable by page scripts and only sent over HTTPS | checklist: security | Cross-site request refused; Session cookie protected |

Every scenario is proved by an automated test (`tasks.md`, Proof).

### Considered, not needed

- Rate limiting sign-in attempts: passkeys cannot be guessed and setup tokens are long random values. There is no password to brute force.
- Several accounts or roles: one account only (spec "Owner only").
- The owner's email or personal details: a passkey does not need them. Only a display name is stored.
- Fakes and an external-service interface for Google sign-in: passkeys use no external service.
- The phone: the synced passkey works in Safari on iPhone. Nothing extra to build.
- Opening the tool from the Dock (web app manifest, placeholder icon, the Safari "Add to Dock" and Chrome "Install app" check): moved by the person to a follow-up ticket on 2026-10-26 (see Out of scope).

### Open questions

None.

## Jira acceptance criteria

Read from MOQ-4 on 2026-10-26 17:03
- WHEN someone not signed in opens any page of the tool THEN they see the sign-in page and no lead data; a signed-out call to `/api/*` is refused (401) with no data
- WHEN a lead opens the unsubscribe page, or the host calls the health check THEN it answers without sign-in (also the sign-in page and the setup link page)
- WHEN the owner signs in with their registered passkey THEN the tool opens, signed in
- WHEN anyone signs in with a passkey that is not registered, or tries to create an account THEN the sign-in is refused and there is no way to sign up
- WHEN the developer creates a setup link on the server and the owner opens it THEN the owner registers a passkey and is signed in; the same link used again, or after it expires, is refused
- WHEN the developer resets access on the server THEN all passkeys are removed and every session ends; only a new setup link lets the owner in again
- WHEN the owner comes back the next day (within 30 days of last use) THEN the tool opens without asking to sign in; after 30 days without use they must sign in again
- WHEN the owner signs out THEN that device's session ends and the sign-in page shows
- WHEN a state-changing request comes from another site THEN it is refused; the session cookie is not readable by page scripts and only sent over HTTPS
