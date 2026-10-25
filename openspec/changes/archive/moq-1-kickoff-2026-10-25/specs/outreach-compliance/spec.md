# Spec Delta

## Purpose

Keeps every outreach email within the basic cold-email rules of the target markets (sender address, unsubscribe, opt-outs honoured) and handles the leads' personal data responsibly, as GDPR requires in the EU and the UK.

## ADDED Requirements

### Requirement: Legal footer in every email
The system SHALL end every email with the company's name, its postal address and an unsubscribe line in the email's language. The system SHALL send no email while the company's address is not set.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Footer present
- **WHEN** any email is sent
- **THEN** it ends with the company's name, postal address and an unsubscribe line

#### Scenario: Footer in French
- **WHEN** an email is written in French
- **THEN** its unsubscribe line is in French

#### Scenario: No address, no email
- **WHEN** the company's postal address is not set in the settings
- **THEN** no email is sent and the owner is told why

### Requirement: Unsubscribe in one step
The system SHALL give every email an unsubscribe link that opts the lead out in one step, without signing in, and confirms it. Each email SHALL also carry the standard unsubscribe header that mail apps offer as a button.
Knowledge: `okf/domain/do-not-contact-list.md`

#### Scenario: Unsubscribe by link
- **WHEN** a lead opens the unsubscribe link from an email and confirms
- **THEN** the address is on the do-not-contact list at once and the lead sees a confirmation

#### Scenario: Unsubscribe from the mail app
- **WHEN** the lead's mail app uses the email's unsubscribe header
- **THEN** the address is on the do-not-contact list at once

#### Scenario: Altered link
- **WHEN** someone opens an unsubscribe link whose token has been altered
- **THEN** no address is opted out and no lead data is shown

### Requirement: Do-not-contact list
The system SHALL keep a do-not-contact list and SHALL never send an email to an address on it, whether its lead is found again, approved again or added by hand. The owner SHALL be able to add an address that asked by another channel.
Knowledge: `okf/domain/do-not-contact-list.md`

#### Scenario: Opted-out lead found again
- **WHEN** a search finds a business whose email address is on the do-not-contact list
- **THEN** no email is ever sent to that address

#### Scenario: Owner records an opt-out
- **WHEN** the owner records that a lead asked not to be contacted, in a reply, a DM or a call
- **THEN** its address is on the do-not-contact list and its sequence stops

### Requirement: Opt-outs kept after deletion
The system SHALL keep each opt-out after the lead's data is deleted, in a form that lets it recognise the address without storing it readably.
Knowledge: `okf/domain/do-not-contact-list.md`, `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Opt-out survives erasure
- **WHEN** the data of an opted-out lead is deleted and the same address is found again later
- **THEN** the address is recognised as opted out and no email is sent to it

### Requirement: Keep only what outreach needs
The system SHALL store only business facts and business contact data needed for the outreach. It SHALL delete a lead's data when its retention period ends; rejected leads and leads whose sequence finished without a reply each have a retention period set in the settings.
Knowledge: `okf/decisions/MOQ-1-personal-data-handling.md`, `okf/data/lead.md`

#### Scenario: Rejected lead expires
- **WHEN** a rejected lead is older than the retention period for rejected leads
- **THEN** its data is deleted

#### Scenario: Finished lead expires
- **WHEN** a lead's sequence finished without a reply longer ago than its retention period
- **THEN** its data is deleted

### Requirement: Erase or export a lead on request
The system SHALL let the owner erase a lead with all its data, or export all the data held about it, when the person concerned asks.
Knowledge: `okf/data/lead.md`, `okf/decisions/MOQ-1-personal-data-handling.md`

#### Scenario: Lead erased
- **WHEN** the owner erases a lead
- **THEN** its facts, messages and history are deleted, and its address is added to the do-not-contact list

#### Scenario: Lead exported
- **WHEN** the owner exports a lead
- **THEN** they get one file with all the data held about that lead and the source of each fact
