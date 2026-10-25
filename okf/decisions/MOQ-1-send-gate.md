---
type: Decision
title: Every email is checked by the send gate at the moment it is sent
description: Emails are planned ahead as one row per lead and step, and each is claimed and checked in one transaction right before it goes to the mailbox (approval, opt-out, reply, window, limits, footer), so a late reply or withdrawal is never missed and nothing is sent twice
owner: ledvincent
status: stable
tags: [sending, compliance, kickoff]
---
# Every email is checked by the send gate at the moment it is sent

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The brief's guarantees are "no email to a lead the owner has not approved" and "stop on reply". Both must still hold when a decision, a reply or an opt-out arrives after the email was planned. A crash or a double click must not send an email twice.

## Decision

Emails are planned ahead as [outbound messages](/data/outbound-message.md), unique on (lead, step). The `send.tick` job reads the inbox first. Then, for each due email, one transaction claims the row and checks all of the following:
- sending is not paused;
- the lead's approval still stands;
- the address is not on the [do-not-contact list](/domain/do-not-contact-list.md);
- no reply, bounce or opt-out is recorded;
- it is inside the client type's send window, on one of its sending days, in the lead's time zone ([outreach sequence](/domain/outreach-sequence.md));
- the daily limits are not reached;
- the company's address is set and the footer is present;
- the message passed the writing checks.

Only then is the email handed to the mailbox, and its message ID and the "sent" status recorded. If the result is uncertain (a timeout after the mailbox accepted the email), the row is marked "unknown" and is never resent automatically. With dry-run on, the recipient is replaced by the internal test address. Sends are spaced a minute or more apart, at random, inside the window (row 18).

**Send now** goes through the same gate: the owner's request claims the row in the same transaction a `send.tick` would, so a row is sent once whichever comes first. It skips only the window, the sending days and the spacing; every other check, and the daily limits, still apply.

## Alternatives considered

- **The mailbox's "send later" feature.** It cannot be cancelled reliably when a reply arrives.
- **Checking only when planning.** A withdrawal or reply that comes between planning and sending would be missed.

## Consequences

- The send gate is the only path to the mailbox: no other code sends email, and every new check goes into the gate.
- A withdrawn approval, a reply, an opt-out or a pause takes effect at the next send, whatever was planned.
- "Unknown" rows need a person: the tool never resends them.
- The checks run in a database transaction, which relies on [PostgreSQL](/decisions/MOQ-1-postgresql-store-and-queue.md).
