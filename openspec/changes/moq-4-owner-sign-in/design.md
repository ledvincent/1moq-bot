# Design

## Context

See proposal.md, Why. Today `src/platform/http/app.ts` builds the Fastify app with the health route and `@fastify/static` serving `dist/web` at `/`. Nothing is behind sign-in, there is no `/api/*` route yet, and an unknown path is a 404 (no fallback to the UI's page). `src/platform/config.ts` reads `DATABASE_URL`, `PORT`, `HOST`, `WEB_DIR` and `DRY_RUN`, and throws `SettingError` naming the setting. `src/platform/db/schema.ts` holds only `app_setting`. In the production stack (`deploy/compose.yml`), the app already receives `PUBLIC_URL=https://${APP_DOMAIN}`, which MOQ-3 left for MOQ-4 to read. Caddy terminates HTTPS in front of the app. The UI is a one-line React shell (`web/src/App.tsx`).

This design follows:
- `okf/decisions/MOQ-1-cloud-web-service.md`: sign-in on every page except the unsubscribe page and the health check.
- `okf/architecture/overview.md`: the entry points (UI pages and `/api/*` signed in; `GET/POST /u/:token` and `GET /health` public); the `access` module owns sign-in and sessions (the manifest and the icon come with the Dock follow-up ticket).
- `okf/decisions/MOQ-1-postgresql-store-and-queue.md`: sessions, passkeys and setup links live in PostgreSQL. No second store.
- `okf/decisions/MOQ-1-personal-data-handling.md`: the account keeps a display name only.
- `okf/decisions/MOQ-3-settings-and-secrets.md`: new settings go in `app.env` and its template; logs carry names, never values; a missing or invalid setting stops the start and names it.
- `okf/decisions/MOQ-3-caddy-https-proxy.md`: HTTPS ends at Caddy, and the address comes only from `APP_DOMAIN`.
- `okf/decisions/MOQ-3-release-by-image-tag.md`: migrations must stay compatible with the previous release.
- `okf/decisions/MOQ-2-folder-layout.md` and `okf/decisions/MOQ-2-libraries-and-versions.md`: `src/access/`, tests next to the code, exact version pins.

## Goals / Non-Goals

**Goals:**
- One gate in front of every route, with a short, explicit list of public paths.
- Nothing for the owner to remember: Touch ID on the Mac, and the synced passkey on the iPhone.
- Enrolment and recovery done by the developer on the server, with nothing in the UI that creates an account.
- Every scenario proved by an automated test, without a real authenticator.

**Non-Goals:**
- Sign-in with a passkey from another person's phone by QR code (cross-device). Browsers allow it, and nothing blocks it, but it is not tested.
- Passkey autofill in the browser's form field (conditional UI): a button is enough for one user.
- An audit log of sign-ins: it comes with the platform audit log (later ticket).
- Opening from the Dock (web app manifest, icon): moved to a follow-up ticket by the person on 2026-10-26. That ticket adds the manifest and icon paths to the public list in D8.

## Decisions

### D1. Passkeys (WebAuthn), not Google sign-in. Decision record needed

The owner signs in with a passkey: Touch ID on the Mac, synced by iCloud Keychain to the iPhone. On a Windows PC (where the tool is used for now, at `localhost`), Chrome and Edge use Windows Hello or a password manager's passkey; nothing in the tool differs. The tool is the WebAuthn relying party itself, so no outside service sits in the sign-in path.

Alternatives considered:
- **Google sign-in (OpenID Connect)** was rejected. It needs the owner's Google account and a Google Cloud OAuth client per environment (local, production). It adds a data processor, and it needs an external-service interface with a fake (project rule). It also makes sign-in depend on Google being up and on the owner's Google account staying the same.
- **A password**: something to remember and to brute-force. It would need rate limiting and a reset flow by email, and the tool has no mailbox for that.
- **Magic links by email**: no company mailbox yet, and the send gate is the only path to the mailbox.

### D2. Libraries. Decision record needed (with D1)

- **`@simplewebauthn/server`** (registration and authentication checks) and **`@simplewebauthn/browser`** (the browser calls). They are widely used, typed, have no native code, and support passkeys, `none` attestation and discoverable credentials. The test helper uses the server package's `helpers` export (`isoCBOR`, `isoBase64URL`) to build authenticator data, so the tests need no CBOR library of their own.
- **`@fastify/cookie`** for reading and setting the cookies.
- Each is pinned at an exact version (`save-exact`): the latest stable release at build time that supports Node 24 and Fastify 5. They are listed in `okf/architecture/tech-stack.md` at close-change.
- Rejected: writing WebAuthn checks by hand (CBOR, COSE keys and signature formats are easy to get subtly wrong); `@fastify/session` (cookie-signing and store adapters we do not need; the session is one table lookup); `@fastify/csrf-protection` (tokens in every form; an Origin check is enough for a JSON API used by one origin, see D8).

### D3. Relying party is the public address. Decision record needed

- The tool reads a new `PUBLIC_URL` setting in `src/platform/config.ts`. It defaults to `http://localhost:<PORT>` for `pnpm dev`. It must be `https://<host>`, or `http://localhost[:port]`, with no path. Anything else stops the start with "Invalid setting: PUBLIC_URL ...".
- The WebAuthn relying party ID is the host of `PUBLIC_URL`, and the expected origin is its origin. In production, the Compose file sets it from `APP_DOMAIN`.
- A passkey is bound to its relying party ID. Changing `APP_DOMAIN` (for example, from `localhost` to the real subdomain at MOQ-29, or to a later rename) makes every registered passkey useless: the owner needs a new setup link. That is why the decision is costly to reverse, and why the production domain must be final before the owner enrols on production.
- WebAuthn needs a secure context: `https://` or `localhost`. Both the local stack (`https://localhost`) and `pnpm dev` (`http://localhost:3000`) qualify.

### D4. Data model. Decision record needed

The tables are defined in `src/access/schema.ts` and re-exported from `src/platform/db/schema.ts` (`drizzle.config.ts` reads that file). One migration is generated with `pnpm db:generate`. Only new tables are added, so the previous release still runs on the migrated database (`okf/decisions/MOQ-3-release-by-image-tag.md`).

| Table | Columns (main) | Notes |
|---|---|---|
| `app_user` | `id` uuid PK, `singleton` boolean unique, default true, check true; `display_name` text; `webauthn_user_id` bytea (16 random bytes); `created_at` | At most one row: the owner. Created by the first setup link. No email. |
| `passkey_credential` | `id` text PK (credential ID, base64url); `user_id` FK; `public_key` bytea; `counter` bigint; `transports` text[]; `backed_up` boolean; `created_at`; `last_used_at` | Public keys only: nothing secret. |
| `user_session` | `id` text PK (SHA-256 of the session secret, hex); `user_id` FK; `created_at`; `last_used_at`; `expires_at` | The secret itself is only in the cookie. |
| `setup_link` | `id` text PK (SHA-256 of the link secret, hex); `created_at`; `expires_at`; `used_at` nullable; `cancelled_at` nullable | |
| `webauthn_challenge` | `challenge` text PK; `purpose` text (`sign-in` or `setup`); `setup_link_id` nullable; `expires_at` | Single use, 5 minutes. |

- Secrets (sessions, setup links) are 32 random bytes from `crypto.randomBytes`, base64url. Only their SHA-256 hash is stored. A plain hash is enough because the secrets are long random values (no HMAC key to manage). A database dump or backup therefore holds no usable session or link.
- Every expiry is compared against a time from an injected clock (`now()` passed to the access service), not SQL `now()`. That lets the tests move time.
- Expired sessions, challenges and setup links are deleted whenever a sign-in or a setup finishes. That keeps the tables small without a scheduled job.

### D5. Setup link and enrolment

- The server command is `src/access/cli.ts`. On the server: `moq_compose exec app node src/access/cli.ts setup-link [--name "<display name>"]`. Locally: `pnpm access:setup-link`, which runs `node --env-file-if-exists=.env src/access/cli.ts setup-link`.
- The command creates the `app_user` row if there is none (display name from `--name`, default "Owner"), stores the link's hash with `expires_at = now + 24 hours`, and prints `<PUBLIC_URL>/setup#<secret>` and its expiry time. The output goes to the developer's terminal, not to the container's log.
- **The secret is in the URL fragment.** Browsers never send the fragment to the server, so it does not appear in Caddy's or Fastify's request logs. The setup page reads it from `location.hash`, removes it from the address bar (`history.replaceState`), and sends it in POST bodies, which are not logged.
- `POST /api/access/setup/options {token}` checks that the link exists, is unused, not cancelled and not expired. It then returns registration options:
  - resident key required, user verification required, `none` attestation;
  - the existing passkeys listed in `excludeCredentials`;
  - ES256 and RS256 as algorithms.
  It stores the challenge tied to the link.
- `POST /api/access/setup/verify {token, response}`, in one transaction:
  1. Consume the challenge (`DELETE ... RETURNING`, D7).
  2. Verify the registration against the expected origin and relying party ID.
  3. Mark the link used with `UPDATE setup_link SET used_at = $now WHERE id = $hash AND used_at IS NULL AND cancelled_at IS NULL AND expires_at > $now RETURNING id`. If no row comes back, the request is refused, which also covers two uses at the same time.
  4. Insert the credential and start a session (D6).
- A failed or cancelled Touch ID prompt does not use up the link: the owner can retry until it is used or expires.
- A refused link shows "This setup link has been used or has expired. Ask the developer for a new one." A missing, malformed, used and expired link all get the same answer (400, no detail).
- Enrolling again through a new link adds a passkey and keeps the others (for example, a second browser profile). Reset (D9) is the way to remove them.
- Safari asks for WebAuthn only after a user gesture, so the setup page shows a "Create passkey" button. It does not start the ceremony on load.

### D6. Sessions

- The cookie is `__Host-moq_session`: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<SESSION_DAYS × 86400>`. The `__Host-` prefix makes the browser refuse it without `Secure`, from another subdomain, or with a `Domain` attribute.
- `Secure` is always set: browsers treat `http://localhost` as secure, and production is HTTPS through Caddy. `SameSite=Lax`, not `Strict`: `Strict` would drop the cookie when the owner opens the tool from a link in another app, and the Origin check (D8) already guards changes.
- Each signed-in request looks the session up by the hash of the cookie and checks `expires_at > now`. If `last_used_at` is more than one minute old, it sets `last_used_at = now` and `expires_at = now + SESSION_DAYS`, and sends the cookie again with a fresh `Max-Age`. This is the sliding 30 days, with at most one write a minute.
- `SESSION_DAYS` is a new setting: an integer from 1 to 365, default 30. Any other value stops the start with "Invalid setting: SESSION_DAYS must be a whole number of days from 1 to 365". It is added, commented, with its default to `deploy/app.env.example` and `.env.example`. A change takes effect at the next restart; existing sessions keep their `expires_at` until their next renewal.
- Sign-out (`POST /api/access/sign-out`) deletes that session's row and clears the cookie. Other sessions stay.

### D7. Sign-in

- `POST /api/access/sign-in/options` (public) returns authentication options: empty `allowCredentials` (discoverable passkeys, so no username field) and user verification required. It stores the challenge with purpose `sign-in`.
- `POST /api/access/sign-in/verify {response}` (public) takes the challenge from the response's `clientDataJSON` and consumes it with `DELETE FROM webauthn_challenge WHERE challenge = $1 AND purpose = $2 AND expires_at > $now RETURNING`, so each challenge works once. Then it:
  1. looks up the credential by ID;
  2. verifies the signature, the origin, the relying party ID and user verification;
  3. updates the counter and `last_used_at`;
  4. starts a session.
- An unknown credential, a used or expired challenge, or a failed check gets the same answer, 401 `{ "error": "sign-in refused" }`, and creates nothing.
- A passkey made for another site cannot even be offered: the browser scopes passkeys to the relying party ID.

### D8. Gate, public paths and cross-site protection

`registerAccess(app, deps)` from `src/access/index.ts` is called by `buildApp` in `src/platform/http/app.ts` before the static files. It adds root-level `onRequest` hooks, so they cover every route, the not-found handler included.

**Public paths** are one list in `src/access/public-paths.ts`:
- `GET /health`
- everything under `/u/` (the unsubscribe page, built later by compliance)
- `GET /sign-in` and `GET /setup`
- `POST /api/access/sign-in/options|verify` and `POST /api/access/setup/options|verify`
- `GET /assets/*`: Vite's hashed script and style files. They are code with no data, and the sign-in page needs them.

**Signed-out requests elsewhere:**
- A page request (GET or HEAD, not under `/api/`) is redirected with 303 to `/sign-in`.
- `/api/*` gets 401 `{ "error": "sign-in required" }`.
- Every `/api/*` answer carries `Cache-Control: no-store`.
- A signed-in request to `/sign-in` is redirected to `/`.

**Pages:** `buildApp` gets a not-found handler. A GET for a page path outside `/api/` and `/u/` returns `index.html`, and the React app picks the page from `location.pathname`. `/api/*` and `/u/*` keep a plain 404. This way `/u/<token>` answers without sign-in but shows nothing until compliance builds it.

**Cross-site check:** another `onRequest` hook refuses every method other than GET, HEAD and OPTIONS with 403 `{ "error": "cross-site request refused" }`, unless the `Origin` header equals the origin of `PUBLIC_URL`. A request with no `Origin` header is refused too: browsers send it on every POST and fetch.
- It runs before the session check, and it covers the public sign-in and setup POSTs as well (login CSRF).
- **`/u/*` is exempt.** The one-click unsubscribe POST (RFC 8058) comes from mail providers' servers without an Origin. Its protection is the token, owned by the compliance ticket.
- Rejected: CSRF tokens. They add state and a header to every call, for no gain over the Origin check with one origin and SameSite cookies.

**Logs:** Fastify's default request log has the method, URL, host and remote address. It has no cookies and no bodies, and the setup secret is in the fragment (D5), so no secret reaches the log. A test asserts this (task 6.3).

### D9. Reset access

`moq_compose exec app node src/access/cli.ts reset --yes` (locally `pnpm access:reset --yes`) runs one transaction:
- delete every `passkey_credential`, every `user_session` and every `webauthn_challenge`;
- set `cancelled_at` on every unused setup link.

It keeps the `app_user` row, so the display name survives. It prints how many passkeys and sessions it removed. Without `--yes`, it prints what it would do and exits with 1, so a mistyped command does not lock the owner out. Afterwards, the owner's devices still show the old passkey in their password manager, but it is refused (D7). The owner may delete it from iCloud Keychain; the tool cannot.

### D10. UI pages

- `web/src/App.tsx` chooses by `location.pathname`:
  - `/sign-in`: a "Sign in with passkey" button. It calls options, then `startAuthentication`, then verify, then goes to `/`.
  - `/setup`: D5.
  - Anything else: the current shell, plus a "Sign out" button.
- A `fetch` wrapper in `web/src/api.ts` sends `/sign-in` on any 401.
- The pages show no lead data, and none exists yet.
- Vite's dev server (`pnpm dev:web`, port 5173) proxies `/api` to port 3000 and sets the `Origin` header to `http://localhost:3000`, so the cross-site check accepts it. The developer signs in once on port 3000: cookies are shared across ports on `localhost`.

### D11. Tests without a real authenticator

- `tests/helpers/soft-authenticator.ts` holds a P-256 key pair from `node:crypto`. It builds:
  - a `none`-attestation registration response: authenticator data with the relying party ID hash, UP and UV flags, and attested credential data with a COSE key;
  - assertion responses signed with the key, for a given challenge, origin and relying party ID.
- A second instance is the "unregistered passkey". This is the "software authenticator" the scenarios need. The `@simplewebauthn/server` checks run unchanged.
- Integration tests (`*.int.test.ts`) build the app with `buildApp` against the test database and call it with `app.inject`. They use a fixed `PUBLIC_URL` (`http://localhost:3000`) and a controllable clock, so "the next day", "31 days later" and "25 hours later" are clock moves.
- The setup link and reset are tested by calling the functions behind `src/access/cli.ts`. A container test runs the real command in the image through `moq_compose exec` once (task 6.2).

## Risks / Trade-offs

- [Rolling back to the MOQ-3 image removes sign-in, because that release has no gate] → Only matters once the address is public. At MOQ-29, add a release note in `okf/runbooks/deploy-and-rollback.md` (at close-change) saying not to roll back past MOQ-4 on a public server.
- [Changing `APP_DOMAIN` makes every passkey useless (D3)] → Recovery is a new setup link. The runbook says to enrol on production only after the domain is final.
- [The owner loses every Apple device, or the iCloud Keychain] → The developer resets access and sends a new setup link. No self-service recovery by design (spec "Owner only").
- [The developer sends the setup link over an insecure channel and someone else uses it first] → It works once and for 24 hours. If the owner's link is refused, the developer resets access, which removes the intruder's passkey too. The runbook says to send the link through a private channel and to check that the owner used it.
- [Safari on `http://localhost:3000` may not keep a `Secure` cookie] → Develop with Chrome or Edge on `pnpm dev` (the Windows PC). Use the local production stack at `https://localhost` for Safari.
- [The `/assets/*` files are public] → They are the built UI code, the same for everyone, with no data. Data only comes from `/api/*`, which is gated.

## Migration Plan

1. Deploy the new image with `bash deploy/deploy.sh <tag>`. The migration only adds tables, so `--previous` still runs on the migrated database (with the gate caveat above).
2. Create a setup link with `moq_compose exec app node src/access/cli.ts setup-link --name "<owner's name>"` and send it to the owner privately. The owner opens it on the Mac and confirms with Touch ID.
3. Locally, the same steps run against `https://localhost`. On production they wait for MOQ-29 and the final domain.
