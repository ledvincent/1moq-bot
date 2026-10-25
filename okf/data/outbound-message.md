---
type: Data Entity
title: outbound_message
description: One planned or sent outreach email, one row per lead and step (unique), carrying its text, due day and send status - planned, sending, sent, cancelled, failed or unknown
owner: ledvincent
status: draft
tags: [data, sending, kickoff]
---
# outbound_message

One email of a lead's [outreach sequence](/domain/outreach-sequence.md), in PostgreSQL. Unique on (lead, step), so a step can never exist twice for a lead. Planned in the kickoff design; column names and types are fixed in row 1, so this stays `draft` until then. Fields marked **personal** are personal data.

# Schema

| Field | Meaning | Notes |
|---|---|---|
| lead, step | the [lead](/data/lead.md) and the step (intro, follow-up 1, follow-up 2, last email) | unique together |
| recipient | the address it goes to | **personal** when it names a person; replaced by the internal test address in dry-run |
| subject, body | the written email | written from a [base template](/domain/base-templates.md) and the lead's facts |
| template version | the template it came from | editing a template never changes a sent email |
| facts used | the recorded facts the writer used | |
| due day | 1, 6, 12 or 21 | counted from the day the intro was actually sent; moved to the next sending day, at least 3 days after the previous email |
| status | see below | |
| sent at | when the mailbox accepted it | |
| mailbox message ID | the ID the mailbox gave it | threads follow-ups, and matches replies and bounces |

**Statuses**

| Status | Meaning |
|---|---|
| planned | waiting for its due day and window |
| sending | claimed by the [send gate](/decisions/MOQ-1-send-gate.md), in the transaction that hands it to the mailbox |
| sent | the mailbox accepted it; message ID recorded |
| cancelled | will never go: the approval was withdrawn, or the lead replied, opted out or bounced |
| failed | the send did not go out; retry rules are not set by the kickoff (rows 16 and 18) |
| unknown | the result is uncertain, such as a timeout after the mailbox accepted the email |

**Why "unknown" is never resent**: the email may already be in the lead's inbox. Resending it automatically would risk the double send the send gate exists to prevent, so the tool never resends an "unknown" row on its own.

## Relations

- Belongs to one [lead](/data/lead.md).
- `inbound_event` rows (reply, auto-reply, bounce) are matched to it by the mailbox message ID and thread headers.

## Lifecycle

- **Created** when an approved lead with an email and a time zone gets its sequence planned: one row per email step.
- **Written** by the `email.write` job, at approval or just before each step (row 15).
- **Claimed and sent** by the send gate, from `send.tick` or the owner's Send now, whichever comes first; a row is sent once.
- **Cancelled** when the sequence stops; a paused row is not cancelled, it waits.
- **Deleted** with its lead (retention sweep or erasure).
