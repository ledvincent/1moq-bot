## MODIFIED Requirements

### Requirement: Sign-in required
The system SHALL require a signed-in user for every page and action, except the unsubscribe page (`/u/...`), the health check, the sign-in page, the setup link page, the sign-in and setup steps themselves, and the UI's script and style files, which hold no data. A signed-out page request SHALL show the sign-in page; a signed-out call to the tool's API SHALL be refused with "401 Unauthorized" and no data.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`, `okf/architecture/overview.md`

#### Scenario: Signed-out visitor
- **WHEN** someone who is not signed in opens any page of the tool
- **THEN** they see the sign-in page and no lead data

#### Scenario: Signed-out API call refused
- **WHEN** someone who is not signed in calls any route under `/api/` other than the sign-in and setup steps
- **THEN** the call is refused with 401 and the answer holds no data

#### Scenario: Unsubscribe without sign-in
- **WHEN** a lead opens the unsubscribe link from an email (an address under `/u/`)
- **THEN** it answers without asking anyone to sign in

#### Scenario: Health check without sign-in
- **WHEN** the host calls the health check without a session
- **THEN** it answers without sign-in

#### Scenario: Sign-in pages open without sign-in
- **WHEN** someone who is not signed in opens the sign-in page or a setup link page
- **THEN** the page opens without sign-in and shows no lead data

### Requirement: Owner only
The system SHALL have a single account, the owner's, and SHALL let no one else sign in. It SHALL offer no way to create an account: no sign-up page, and a passkey can be registered only through a valid setup link. The account holds a display name only, no email or other personal details. The developer maintains the tool through the server, not through an account in the tool.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Unknown person refused
- **WHEN** anyone signs in with a passkey that is not registered to the owner's account
- **THEN** the sign-in is refused and no session is created

#### Scenario: No sign-up
- **WHEN** anyone tries to create an account or register a passkey without a valid setup link
- **THEN** it is refused, nothing is stored, and the tool shows no sign-up page

### Requirement: Stay signed in
The system SHALL keep the owner signed in on a device between visits, for a period set by the developer through a setting (default 30 days) and counted from the last use: each use renews the session. A session unused for longer than the period SHALL end, and the owner signs in again. Sessions SHALL be kept in the tool's database.
Knowledge: `okf/decisions/MOQ-1-postgresql-store-and-queue.md`, `okf/decisions/MOQ-3-settings-and-secrets.md`

#### Scenario: Back the next day
- **WHEN** the owner opens the tool the day after last using it, within 30 days of last use
- **THEN** the tool opens without asking them to sign in again

#### Scenario: Idle too long
- **WHEN** the owner opens the tool more than 30 days after last using it
- **THEN** the session has ended and the sign-in page shows

#### Scenario: Session length from the setting
- **WHEN** the developer sets the session length setting to another number of days and restarts the tool
- **THEN** sessions end after that many days without use; an invalid value stops the start with a message naming the setting

## ADDED Requirements

### Requirement: Passkey sign-in
The system SHALL sign the owner in with a passkey registered to the owner's account (Touch ID on the Mac, synced by the owner's password manager to their other devices), with no password and no third-party sign-in service. Passkeys SHALL be tied to the tool's public address.
Knowledge: `okf/decisions/MOQ-3-caddy-https-proxy.md`

#### Scenario: Owner signs in with a passkey
- **WHEN** the owner, signed out, uses a passkey registered to their account on the sign-in page
- **THEN** a session starts and the tool opens, signed in

### Requirement: Setup link
The system SHALL let the developer, with a command run on the server, create a one-time setup link through which the owner registers a passkey and is signed in. A setup link SHALL work once and SHALL expire 24 hours after it was created. Registering through a setup link adds a passkey and leaves passkeys already registered in place. The link's secret SHALL never be written to the logs.
Knowledge: `okf/decisions/MOQ-3-settings-and-secrets.md`

#### Scenario: Owner enrols with a setup link
- **WHEN** the developer creates a setup link on the server and the owner opens it and confirms with Touch ID
- **THEN** the owner's passkey is registered and the owner is signed in

#### Scenario: Setup link used twice refused
- **WHEN** a setup link that has already registered a passkey is used again
- **THEN** it is refused and no passkey is added

#### Scenario: Expired setup link refused
- **WHEN** a setup link is used more than 24 hours after it was created
- **THEN** it is refused and no passkey is added

### Requirement: Reset access
The system SHALL let the developer, with a command run on the server, reset access when a device is lost or stolen: the reset removes every registered passkey, ends every session and cancels every unused setup link. Only a setup link created after the reset lets the owner in again.

#### Scenario: Reset ends all access
- **WHEN** the developer resets access on the server
- **THEN** every registered passkey is removed, every session ends, every unused setup link is refused, and a passkey registered before the reset can no longer sign in

#### Scenario: Back in after a reset
- **WHEN** the developer creates a new setup link after a reset and the owner uses it
- **THEN** the owner registers a passkey and is signed in

### Requirement: Sign out
The system SHALL let the owner sign out. Signing out SHALL end the session of that device only and show the sign-in page.

#### Scenario: Owner signs out
- **WHEN** the signed-in owner signs out on one device
- **THEN** that device's session ends and the sign-in page shows, while sessions on the owner's other devices go on

### Requirement: Protected session
The system SHALL refuse every state-changing request that does not come from the tool's own address, signed in or not. The session cookie SHALL be unreadable by page scripts, sent only over HTTPS, and not sent with requests that other sites start in the background. The database SHALL hold only a one-way hash of each session secret and setup link secret, never the secret itself.
Knowledge: `okf/decisions/MOQ-3-caddy-https-proxy.md`

#### Scenario: Cross-site request refused
- **WHEN** a request that changes something (any method other than GET, HEAD or OPTIONS) comes from another site or without the tool's own origin, even with a valid session cookie
- **THEN** it is refused with 403 and nothing changes

#### Scenario: Session cookie protected
- **WHEN** a session starts
- **THEN** its cookie is marked HttpOnly, Secure and SameSite=Lax, and the database holds only a hash of its secret
