# lead-review Specification

## Purpose
Lets the owner judge leads at a glance, one per screen with pictures, and approve or reject each with a swipe; the owner's approval is the only thing that allows a lead to be emailed.

## Requirements

### Requirement: One lead per screen
The system SHALL show the leads waiting for review one at a time. Each card SHALL give the lead's name, client type and reason, fit level with each rule, city and country, what it does, Instagram followers and last post, own-merch evidence, the email found and its source, the owner's name, and links to its website, Instagram profile and map place.
Knowledge: `okf/domain/lead.md`, `okf/domain/qualification-rules.md`

#### Scenario: Card shows the lead
- **WHEN** the owner opens the review and a lead is waiting
- **THEN** one lead is shown with the details above

#### Scenario: Unknown facts shown as unknown
- **WHEN** a fact of the lead is unknown
- **THEN** the card shows it as unknown rather than hiding it

#### Scenario: Nothing to review
- **WHEN** no lead is waiting for review
- **THEN** the owner is told that the review queue is empty

### Requirement: Pictures of the business
The system SHALL show pictures of the business on its card, taken from its map place, its Instagram posts or its website, when any exist.
Knowledge: `okf/integrations/google-maps.md`, `okf/integrations/instagram.md`

#### Scenario: Pictures shown
- **WHEN** a lead has photos on its map place or recent Instagram posts
- **THEN** the card shows several of them

#### Scenario: No pictures
- **WHEN** no picture can be found for a lead
- **THEN** the card says so and still shows the links to its website and profiles

### Requirement: Swipe to decide
The system SHALL let the owner approve a lead by swiping right and reject it by swiping left; on-screen buttons and keyboard keys SHALL do the same. After each decision the next lead SHALL be shown.
Knowledge: `okf/domain/lead-status.md`

#### Scenario: Swipe right approves
- **WHEN** the owner swipes a lead's card to the right
- **THEN** the lead is approved and the next lead is shown

#### Scenario: Swipe left rejects
- **WHEN** the owner swipes a lead's card to the left
- **THEN** the lead is rejected and the next lead is shown

#### Scenario: Keys decide
- **WHEN** the owner presses the right arrow key on a lead's card
- **THEN** the lead is approved, as with a swipe to the right

### Requirement: Best leads first
The system SHALL show waiting leads with a "good" fit level first, then "possible", then "poor", and leads outside the active markets last.
Knowledge: `okf/domain/qualification-rules.md`, `okf/domain/markets.md`

#### Scenario: Good fit first
- **WHEN** a "good" lead and a "poor" lead are both waiting
- **THEN** the "good" lead is shown first

### Requirement: No automatic approval
The system SHALL NOT approve a lead without the owner's decision, whatever its fit level.
Knowledge: `okf/decisions/MOQ-1-send-gate.md`

#### Scenario: Good fit still waits
- **WHEN** a lead is rated "good"
- **THEN** it waits for the owner's decision and no email is planned for it

### Requirement: Change a decision
The system SHALL let the owner change a decision later. Withdrawing an approval SHALL cancel every email not yet sent to that lead.
Knowledge: `okf/domain/lead-status.md`, `okf/decisions/MOQ-1-send-gate.md`

#### Scenario: Approval withdrawn before the first email
- **WHEN** the owner rejects a lead they had approved, before its first email is sent
- **THEN** no email is sent to that lead

#### Scenario: Rejected lead approved later
- **WHEN** the owner approves a lead they had rejected
- **THEN** it is handled like any newly approved lead
