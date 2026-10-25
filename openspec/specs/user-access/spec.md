# user-access Specification

## Purpose
Lets the owner open the tool on their Mac like a web page, with no terminal, while keeping the tool and the lead data closed to anyone but the owner.

## Requirements

### Requirement: Open without a terminal
The system SHALL open in the owner's Mac web browser from a bookmark or a Dock icon, with nothing to install, start or keep running by hand, and no terminal.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Open from the Dock
- **WHEN** the owner clicks the tool's icon in the Mac's Dock
- **THEN** the tool opens in the browser, ready to use

### Requirement: Sign-in required
The system SHALL require a signed-in user for every page and action, except the unsubscribe page and the health check.
Knowledge: `okf/decisions/MOQ-1-cloud-web-service.md`

#### Scenario: Signed-out visitor
- **WHEN** someone who is not signed in opens the tool
- **THEN** they see the sign-in page and no lead data

#### Scenario: Unsubscribe without sign-in
- **WHEN** a lead opens the unsubscribe link from an email
- **THEN** the unsubscribe page opens without asking anyone to sign in

### Requirement: Owner only
The system SHALL have a single account, the owner's, and SHALL let no one else sign in. The developer maintains the tool through the server, not through an account in the tool.

#### Scenario: Unknown person refused
- **WHEN** anyone other than the owner tries to sign in
- **THEN** the sign-in is refused

### Requirement: Stay signed in
The system SHALL keep the owner signed in on their Mac between visits, for a period set by the developer.

#### Scenario: Back the next day
- **WHEN** the owner opens the tool the day after signing in
- **THEN** the tool opens without asking them to sign in again
