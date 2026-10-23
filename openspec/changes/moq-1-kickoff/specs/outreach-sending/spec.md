# Spec Delta

## Purpose

Sends the outreach emails and follow-ups from the company mailbox to approved leads only, at the right local time and in small daily numbers, and stops as soon as a lead replies or opts out.

## ADDED Requirements

### Requirement: Approved leads only
The system SHALL send email only to leads the owner approved, and SHALL check that the approval still stands just before each email is sent.

#### Scenario: Waiting lead not emailed
- **WHEN** a lead is waiting for review or has been rejected
- **THEN** no email is planned or sent to it

#### Scenario: Approval checked at send time
- **WHEN** the owner withdraws an approval after an email to that lead was planned
- **THEN** that email is not sent

### Requirement: Outreach sequence
The system SHALL take each approved lead that has an email address through the sequence: intro email on day 1, follow-up 1 on day 6, follow-up 2 on day 12 and a last email on day 21. No email SHALL be sent after the last one.

#### Scenario: Follow-up on day 6
- **WHEN** a lead got its intro email on day 1 and has not replied
- **THEN** follow-up 1 is sent on day 6

#### Scenario: Sequence ends after the last email
- **WHEN** the last email has been sent to a lead
- **THEN** no further email is planned and the lead's sequence is finished

### Requirement: Instagram DM reminder
The system SHALL list each lead due an Instagram DM on day 3, with a suggested message in the lead's language. It SHALL never send the DM itself; the owner marks it as done.

#### Scenario: DM due on day 3
- **WHEN** a lead with an Instagram profile got its intro email two days ago and has not replied
- **THEN** it appears in the owner's DM list with a suggested message

#### Scenario: DM marked done
- **WHEN** the owner marks a lead's DM as sent
- **THEN** the lead leaves the DM list and its history shows the DM

### Requirement: Leads without an email
The system SHALL NOT plan any email for an approved lead that has no email address, and SHALL list it for the owner to contact by hand.

#### Scenario: Approved lead with no email
- **WHEN** the owner approves a lead marked "no email found"
- **THEN** no email is planned and the lead appears in the list of leads to contact by hand

### Requirement: Morning send window
The system SHALL send each email between 9:00 and 10:00 in the lead's time zone. An email that misses the window SHALL wait for the next day's window. A lead with no time zone SHALL NOT be scheduled.

#### Scenario: Sent in the lead's morning
- **WHEN** an email is due for a lead in Melbourne
- **THEN** it is sent between 9:00 and 10:00 Melbourne time

#### Scenario: Window missed
- **WHEN** an email due today could not go out before 10:00 in the lead's time zone
- **THEN** it is sent in the 9:00 to 10:00 window of a later day

#### Scenario: No time zone
- **WHEN** an approved lead has no time zone
- **THEN** no email is scheduled for it and it is flagged for the owner

### Requirement: Daily limits
The system SHALL send no more new intro emails in a day than the daily intro limit (25 by default), and no more emails in total, follow-ups included, than the daily total limit. Emails over a limit SHALL wait for a later day, oldest first. Emails SHALL be spaced out, never sent in a burst.

#### Scenario: Intro limit reached
- **WHEN** the daily intro limit has been reached
- **THEN** the remaining approved leads get their intro email on a later day

#### Scenario: Total limit reached
- **WHEN** the daily total limit has been reached
- **THEN** the follow-ups due wait for a later day, the oldest first

### Requirement: Send from the company mailbox
The system SHALL send every email from the company mailbox, so that each sent email appears in the mailbox's sent mail and replies arrive in its inbox.

#### Scenario: Sent email in the mailbox
- **WHEN** an email is sent to a lead
- **THEN** a copy of it is in the company mailbox's sent mail

### Requirement: Stop on reply
The system SHALL stop a lead's sequence when a reply from the lead arrives in the company mailbox, checking for replies just before each send. It SHALL also stop it when the owner records that the lead replied by another channel.

#### Scenario: Reply stops the follow-ups
- **WHEN** a lead replies to its intro email
- **THEN** no follow-up is sent to it and its status is "replied"

#### Scenario: Reply just before a send
- **WHEN** a lead's reply arrives shortly before its follow-up is due
- **THEN** the follow-up is not sent

#### Scenario: Reply by Instagram
- **WHEN** the owner records that a lead answered the Instagram DM
- **THEN** no further email is sent to it

### Requirement: Stop on opt-out or bounce
The system SHALL stop a lead's sequence when its address is on the do-not-contact list or an email to it bounces.

#### Scenario: Unsubscribe stops the sequence
- **WHEN** a lead unsubscribes after its intro email
- **THEN** no further email is sent to it

#### Scenario: Bounce stops the sequence
- **WHEN** an email to a lead bounces
- **THEN** no further email is sent to that address and the lead is marked "bounced"

### Requirement: Pause all sending
The system SHALL let the owner pause and resume all sending at once. While sending is paused, no email SHALL be sent.

#### Scenario: Sending paused
- **WHEN** the owner pauses sending
- **THEN** no email is sent until the owner resumes it

#### Scenario: Sending resumed
- **WHEN** the owner resumes sending
- **THEN** the emails that came due during the pause are sent in their leads' next windows, within the daily limits
