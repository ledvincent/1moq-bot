# Spec Delta

## Purpose

Sends the outreach emails and follow-ups from the company mailbox to approved leads only, in each client type's local send window on its sending days and in small daily numbers, lets the owner send a queued email at once, and stops as soon as a lead replies or opts out.

## ADDED Requirements

### Requirement: Approved leads only
The system SHALL send email only to leads the owner approved, and SHALL check that the approval still stands just before each email is sent.
Knowledge: `okf/decisions/MOQ-1-send-gate.md`

#### Scenario: Waiting lead not emailed
- **WHEN** a lead is waiting for review or has been rejected
- **THEN** no email is planned or sent to it

#### Scenario: Approval checked at send time
- **WHEN** the owner withdraws an approval after an email to that lead was planned
- **THEN** that email is not sent

### Requirement: Outreach sequence
The system SHALL take each approved lead that has an email address through the sequence: intro email on day 1, follow-up 1 on day 6, follow-up 2 on day 12 and a last email on day 21. Day 1 SHALL be the day the intro email was actually sent, and every later step SHALL count from it. A step that falls on a day its lead's client type does not send SHALL move to the next sending day. Each email SHALL be sent at least 3 days after the previous one. No email SHALL be sent after the last one.

#### Scenario: Follow-up on day 6
- **WHEN** a lead got its intro email on day 1 and has not replied
- **THEN** follow-up 1 is sent on day 6

#### Scenario: Days count from the intro actually sent
- **WHEN** a lead approved on Monday gets its intro email on Wednesday because of the daily limit
- **THEN** Wednesday is day 1 and follow-up 1 is due on the following Monday

#### Scenario: Step moved off a non-sending day
- **WHEN** a café's follow-up falls on a Sunday
- **THEN** it is sent on the Monday after

#### Scenario: Minimum gap between emails
- **WHEN** a moved step would come less than 3 days after the previous email
- **THEN** it waits until 3 days have passed

#### Scenario: Sequence ends after the last email
- **WHEN** the last email has been sent to a lead
- **THEN** no further email is planned and the lead's sequence is finished

### Requirement: Instagram DM reminder
The system SHALL list each lead due an Instagram DM on day 3, with a suggested message in the lead's language. It SHALL never send the DM itself; the owner marks it as done.
Knowledge: `okf/domain/outreach-sequence.md`, `okf/decisions/MOQ-1-lead-source-policy.md`

#### Scenario: DM due on day 3
- **WHEN** a lead with an Instagram profile got its intro email two days ago and has not replied
- **THEN** it appears in the owner's DM list with a suggested message

#### Scenario: DM marked done
- **WHEN** the owner marks a lead's DM as sent
- **THEN** the lead leaves the DM list and its history shows the DM

### Requirement: Leads without an email
The system SHALL NOT plan any email for an approved lead that has no email address, and SHALL list it for the owner to contact by hand.
Knowledge: `okf/domain/lead-status.md`

#### Scenario: Approved lead with no email
- **WHEN** the owner approves a lead marked "no email found"
- **THEN** no email is planned and the lead appears in the list of leads to contact by hand

### Requirement: Send window per client type
The system SHALL send each email inside the one-hour window of its lead's client type, in the lead's time zone, and the owner SHALL be able to change each window. By default it is 8:00 to 9:00 for cafés and roasters, bars and restaurants, and breweries, and 9:00 to 10:00 for the other types. A due email SHALL wait for its window, or for the next sending day's window if it missed it. A lead with no time zone SHALL NOT be scheduled.
Knowledge: `okf/domain/outreach-sequence.md`

#### Scenario: Café sent at opening time
- **WHEN** an email is due for a café in Melbourne
- **THEN** it is sent between 8:00 and 9:00 Melbourne time

#### Scenario: Other type in the default window
- **WHEN** an email is due for a gym in London
- **THEN** it is sent between 9:00 and 10:00 London time

#### Scenario: Owner changes a window
- **WHEN** the owner sets the window of breweries to 10:00 to 11:00
- **THEN** the emails due for breweries from then on are sent between 10:00 and 11:00 in each lead's time zone

#### Scenario: Window missed
- **WHEN** an email due today could not go out before its window closed
- **THEN** it is sent in the window of a later sending day

#### Scenario: No time zone
- **WHEN** an approved lead has no time zone
- **THEN** no email is scheduled for it and it is flagged for the owner

### Requirement: Sending days
The system SHALL send email from Monday to Friday for every client type, and on Saturday only for the client types whose Saturday switch is on, judged in the lead's time zone. Each client type SHALL have a Saturday switch the owner can change: on by default for cafés and roasters, bars and restaurants, and breweries, and off for every other type. No email SHALL be sent on Sunday.
Knowledge: `okf/domain/outreach-sequence.md`, `okf/domain/client-types.md`

#### Scenario: Café on Saturday
- **WHEN** an email is due on a Saturday for a café, and the Saturday switch of cafés is on
- **THEN** it is sent in that Saturday's window

#### Scenario: Other type on Saturday
- **WHEN** an email is due on a Saturday for an indie clothing brand, and the Saturday switch of indie clothing brands is off
- **THEN** it is sent in the window of the next Monday

#### Scenario: Never on Sunday
- **WHEN** an email is due on a Sunday for any client type
- **THEN** it is not sent that day

### Requirement: Send now
The system SHALL let the owner send a queued email at once. Send now SHALL skip only the send window, the sending days and the spacing between sends: every other check made before a send, and the daily limits, SHALL still apply. The email SHALL leave the queue as it is sent and SHALL never be sent twice.
Knowledge: `okf/decisions/MOQ-1-send-gate.md`, `okf/data/outbound-message.md`

#### Scenario: Sent outside the window
- **WHEN** the owner presses Send now on a queued intro email at 15:00 in the lead's time zone
- **THEN** the email is sent at once and leaves the queue

#### Scenario: Never sent twice
- **WHEN** the owner presses Send now on an email at the moment its window opens
- **THEN** the email is sent exactly once

#### Scenario: Refused at the daily limit
- **WHEN** the owner presses Send now on an intro email after the daily intro limit has been reached
- **THEN** the email is not sent, stays in the queue, and the owner is told the limit is reached

#### Scenario: Refused after a reply
- **WHEN** the owner presses Send now on a follow-up for a lead that has replied
- **THEN** the email is not sent

### Requirement: Daily limits
The system SHALL send no more new intro emails in a day than the daily intro limit (25 by default), and no more emails in total, follow-ups included, than the daily total limit. Emails over a limit SHALL wait for a later day, oldest first. Emails SHALL be spaced out, never sent in a burst.
Knowledge: `okf/domain/outreach-sequence.md`, `okf/integrations/company-mailbox.md`

#### Scenario: Intro limit reached
- **WHEN** the daily intro limit has been reached
- **THEN** the remaining approved leads get their intro email on a later day

#### Scenario: Total limit reached
- **WHEN** the daily total limit has been reached
- **THEN** the follow-ups due wait for a later day, the oldest first

### Requirement: Send from the company mailbox
The system SHALL send every email from the company mailbox, so that each sent email appears in the mailbox's sent mail and replies arrive in its inbox.
Knowledge: `okf/integrations/company-mailbox.md`, `okf/decisions/MOQ-1-company-mailbox-sending.md`

#### Scenario: Sent email in the mailbox
- **WHEN** an email is sent to a lead
- **THEN** a copy of it is in the company mailbox's sent mail

### Requirement: Stop on reply
The system SHALL stop a lead's sequence when a reply from the lead arrives in the company mailbox, checking for replies just before each send. It SHALL also stop it when the owner records that the lead replied by another channel.
Knowledge: `okf/domain/outreach-sequence.md`, `okf/integrations/company-mailbox.md`

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
Knowledge: `okf/domain/do-not-contact-list.md`, `okf/domain/lead-status.md`

#### Scenario: Unsubscribe stops the sequence
- **WHEN** a lead unsubscribes after its intro email
- **THEN** no further email is sent to it

#### Scenario: Bounce stops the sequence
- **WHEN** an email to a lead bounces
- **THEN** no further email is sent to that address and the lead is marked "bounced"

### Requirement: Pause all sending
The system SHALL let the owner pause and resume all sending at once. While sending is paused, no email SHALL be sent.
Knowledge: `okf/decisions/MOQ-1-send-gate.md`

#### Scenario: Sending paused
- **WHEN** the owner pauses sending
- **THEN** no email is sent until the owner resumes it

#### Scenario: Sending resumed
- **WHEN** the owner resumes sending
- **THEN** the emails that came due during the pause are sent in their leads' next windows, within the daily limits
