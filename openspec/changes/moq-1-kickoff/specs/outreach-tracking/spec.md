# Spec Delta

## Purpose

Shows where each lead stands in the outreach and the overall results, so the owner can follow replies and see which client types and markets respond.

## ADDED Requirements

### Requirement: Lead status
The system SHALL give each lead one current status that follows its outreach: found, waiting for review, rejected, approved, emailed (with the last step sent), replied, opted out, bounced, sequence finished, or to contact by hand.

#### Scenario: Status after the intro
- **WHEN** a lead's intro email is sent
- **THEN** its status is "emailed" with the step "intro"

#### Scenario: Status after a reply
- **WHEN** a reply from a lead is found
- **THEN** its status is "replied", with the date of the reply

### Requirement: Lead list
The system SHALL let the owner list the leads and filter them by status, client type, market and fit level.

#### Scenario: Replied leads listed
- **WHEN** the owner filters the lead list on "replied"
- **THEN** only leads with a reply are listed, the most recent reply first

### Requirement: Lead history
The system SHALL show, for each lead, its history: when and how it was found, the owner's decisions, each email sent with its date, the DMs marked as sent, and any reply, bounce or opt-out.

#### Scenario: History of a contacted lead
- **WHEN** the owner opens a lead that got an intro email and replied
- **THEN** its history shows the search that found it, the approval, the intro email with its date and the reply

### Requirement: Results
The system SHALL show, for a period the owner picks, the number of leads found and approved, emails sent (intros and follow-ups), replies and the reply rate, opt-outs and bounces, overall and by client type and by market.

#### Scenario: Results for a week
- **WHEN** the owner picks last week
- **THEN** the results show that week's leads found and approved, emails sent, replies, reply rate, opt-outs and bounces

#### Scenario: Results by client type
- **WHEN** the owner views the results by client type
- **THEN** each client type shows its own emails sent, replies and reply rate
