# Tasks

Big change: start only after the proposal PR is merged. It builds on MOQ-3's production stack (PR #5). Everything here runs on the developer's machine and in CI; a public address waits for MOQ-29.

## 1. Settings and libraries

- [ ] 1.1 Add `@simplewebauthn/server`, `@simplewebauthn/browser` and `@fastify/cookie` at exact versions (design D2). Done when `pnpm install`, `pnpm typecheck` and `pnpm test` still pass and `package.json` has no range specifiers
- [ ] 1.2 `src/platform/config.ts`: add `publicUrl` from `PUBLIC_URL` and `sessionDays` from `SESSION_DAYS`, with the defaults and checks in design D3 and D6. Each error names the setting, never its value. Done when the unit tests in `src/platform/config.test.ts` cover the defaults, valid values and each invalid case, and `pnpm test:unit` passes
- [ ] 1.3 Add `SESSION_DAYS` (commented, default 30) to `deploy/app.env.example` and `.env.example`. Done when `tests/deploy-config.test.ts` still passes (placeholders only)

## 2. Data model

- [ ] 2.1 `src/access/schema.ts` with `app_user`, `passkey_credential`, `user_session`, `setup_link` and `webauthn_challenge` (design D4), re-exported from `src/platform/db/schema.ts`. Then run `pnpm db:generate`. Done when the new migration in `drizzle/` only creates tables, and `src/platform/db/migrate.int.test.ts` passes
- [ ] 2.2 Secret helpers in `src/access/secrets.ts`: a 32-byte random value as base64url and its SHA-256 hex (design D4). Done when unit tests in `src/access/secrets.test.ts` check the length, the URL-safe alphabet and that the hash is stable

## 3. Sessions, gate and cross-site check

- [ ] 3.1 `src/access/sessions.ts`: create, look up with sliding renewal (at most one write a minute), and end, all against an injected clock (design D6). Done when `src/access/session.int.test.ts` covers renewal and expiry by moving the clock
- [ ] 3.2 `src/access/public-paths.ts` and the gate hook in `src/access/gate.ts` (design D8):
  - a page request without a session gets 303 to `/sign-in`;
  - `/api/*` gets 401 with no data and `Cache-Control: no-store`;
  - a signed-in request to `/sign-in` goes to `/`.

  Done when `src/access/gate.int.test.ts` covers every public path and a sample of gated ones
- [ ] 3.3 The cross-site check hook in `src/access/origin-check.ts` (design D8). It refuses with 403 any method other than GET, HEAD and OPTIONS unless `Origin` equals the origin of `PUBLIC_URL`, before the session check, with `/u/*` exempt. Done when `src/access/origin-check.int.test.ts` passes
- [ ] 3.4 `src/access/index.ts` exports `registerAccess`. `src/platform/http/app.ts` registers `@fastify/cookie` and `registerAccess` before the static files, and adds the not-found handler that serves `index.html` for page paths and a plain 404 for `/api/*` and `/u/*` (design D8). `buildApp` and `start` pass `publicUrl`, `sessionDays` and the clock. Done when `src/platform/http/health.int.test.ts` and `src/main.int.test.ts` still pass and `GET /some/page` signed in returns the UI's page
- [ ] 3.5 `GET /api/access/session` (the display name) and `POST /api/access/sign-out` (design D6). Done when covered in `src/access/session.int.test.ts`

## 4. Passkeys: sign-in, setup link and reset

- [ ] 4.1 `tests/helpers/soft-authenticator.ts`: a software passkey that makes registration and assertion responses for a given challenge, origin and relying party ID (design D11). Done when a unit test in `tests/helpers/soft-authenticator.test.ts` shows `@simplewebauthn/server` accepting its registration and assertion
- [ ] 4.2 Challenges in `src/access/challenges.ts`: store with purpose and 5-minute expiry, and consume once with `DELETE ... RETURNING` (design D4, D7). Done when `src/access/sign-in.int.test.ts` shows a challenge used twice is refused
- [ ] 4.3 Sign-in routes `POST /api/access/sign-in/options` and `/verify` in `src/access/sign-in.ts`. They use discoverable passkeys with user verification required; every refusal gets the same 401 and creates nothing (design D7). Done when `src/access/sign-in.int.test.ts` passes
- [ ] 4.4 Setup links in `src/access/setup-links.ts`: create (with the `app_user` row on first use), and consume atomically with the used, cancelled and expiry checks against the clock (design D5). Done when `src/access/setup-link.int.test.ts` covers create, use, reuse, expiry and two uses at the same time
- [ ] 4.5 Setup routes `POST /api/access/setup/options` and `/verify` in `src/access/setup.ts` (design D5): register the passkey, use up the link and start a session, in one transaction. A cancelled ceremony leaves the link usable. Done when `src/access/setup-link.int.test.ts` passes
- [ ] 4.6 Reset in `src/access/reset.ts` (design D9): one transaction that deletes passkeys, sessions and challenges and cancels unused links. Done when `src/access/reset.int.test.ts` passes
- [ ] 4.7 The server command `src/access/cli.ts` with `setup-link [--name]` and `reset --yes` (design D5, D9), and the `package.json` scripts `access:setup-link` and `access:reset`. Done when `src/access/cli.int.test.ts` checks:
  - the printed link has the form `<PUBLIC_URL>/setup#<secret>` and the stored hash matches;
  - `reset` without `--yes` changes nothing and exits 1;
  - no secret is printed to stderr.

## 5. UI pages

- [ ] 5.1 `web/src/api.ts`: a fetch wrapper that sends the browser to `/sign-in` on 401. `web/src/App.tsx` picks the page by path (design D10). Done when `pnpm typecheck` and `pnpm build` pass
- [ ] 5.2 The sign-in page (`web/src/sign-in.tsx`) and the setup page (`web/src/setup.tsx`): the token read from the fragment and removed from the address bar, a button before the ceremony, and the refused-link message (design D5, D10). Then a sign-out button in the shell. Done when the flow works by hand in Chrome on `pnpm dev`, with the link from `pnpm access:setup-link`
- [ ] 5.3 `vite.config.ts`: the dev proxy for `/api` sets `Origin` to `http://localhost:3000` (design D10). Done when a sign-out from `pnpm dev:web` on port 5173 works

## 6. Integration checks

- [ ] 6.1 Run the whole flow on the local production stack (`moq_compose up -d`, then the setup link from `moq_compose exec app node src/access/cli.ts setup-link`), then sign in, sign out, reset and sign in again, at `https://localhost` in Chrome or Edge on the Windows PC. Done when every step behaves as in the specs, noted in the PR
- [ ] 6.2 A container test in `tests/container/stack.container.test.ts` runs `node src/access/cli.ts setup-link` in the app container through `moq_compose exec` (design D11). Done when it prints a link starting with `https://localhost/setup#` and `pnpm test:container` passes
- [ ] 6.3 A log test in `src/main.int.test.ts` runs a setup and a sign-in with the soft authenticator. Done when it checks that the service's log has no session cookie, no setup secret and no challenge (design D8), and `pnpm test` passes
- [ ] 6.4 `.claude/CLAUDE.md` Commands: add the setup link and reset commands (local and in the stack). Done when the commands as written run on the local stack
- [ ] 6.5 Drafts for close-change in this change's folder:
  - `runbooks/owner-access.md`: create a setup link, send it privately, reset access, and enrol on production only once the domain is final;
  - the rollback caveat for `okf/runbooks/deploy-and-rollback.md` (design, Risks).

  Done when both files exist and `pnpm lint` passes

## 7. Proof

Every scenario is proved by an automated test. The `*.int.test.ts` files run with `pnpm test` (the soft authenticator stands in for Touch ID); the `*.test.ts` files run with `pnpm test:unit`.

- [ ] 7.1 Test `Signed-out visitor` in `src/access/gate.int.test.ts`
- [ ] 7.2 Test `Signed-out API call refused` in `src/access/gate.int.test.ts`
- [ ] 7.3 Test `Unsubscribe without sign-in` in `src/access/gate.int.test.ts` (GET and POST under `/u/` are neither redirected to sign-in nor refused with 401 or 403)
- [ ] 7.4 Test `Health check without sign-in` in `src/access/gate.int.test.ts`
- [ ] 7.5 Test `Sign-in pages open without sign-in` in `src/access/gate.int.test.ts`
- [ ] 7.6 Test `Unknown person refused` in `src/access/sign-in.int.test.ts`
- [ ] 7.7 Test `No sign-up` in `src/access/setup-link.int.test.ts` (setup options and verify without a token or with a made-up token are refused, and no `app_user` or `passkey_credential` row is added)
- [ ] 7.8 Test `Back the next day` in `src/access/session.int.test.ts`
- [ ] 7.9 Test `Idle too long` in `src/access/session.int.test.ts`
- [ ] 7.10 Test `Session length from the setting` in `src/access/session.int.test.ts` (with `SESSION_DAYS=7`) and `src/platform/config.test.ts` (an invalid value names `SESSION_DAYS`)
- [ ] 7.11 Test `Owner signs in with a passkey` in `src/access/sign-in.int.test.ts`
- [ ] 7.12 Test `Owner enrols with a setup link` in `src/access/setup-link.int.test.ts`
- [ ] 7.13 Test `Setup link used twice refused` in `src/access/setup-link.int.test.ts`
- [ ] 7.14 Test `Expired setup link refused` in `src/access/setup-link.int.test.ts`
- [ ] 7.15 Test `Reset ends all access` in `src/access/reset.int.test.ts`
- [ ] 7.16 Test `Back in after a reset` in `src/access/reset.int.test.ts`
- [ ] 7.17 Test `Owner signs out` in `src/access/session.int.test.ts`
- [ ] 7.18 Test `Cross-site request refused` in `src/access/origin-check.int.test.ts`
- [ ] 7.19 Test `Session cookie protected` in `src/access/session.int.test.ts`
