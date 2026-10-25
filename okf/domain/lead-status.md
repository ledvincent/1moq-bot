---
type: Glossary Term
title: Lead status
description: The one current status of each lead in the outreach - found, waiting for review, approved, rejected, to contact by hand, emailed, replied, opted out, bounced, sequence finished - and what moves a lead from one to the next
owner: ledvincent
status: stable
tags: [tracking, kickoff]
---
# Lead status

## Definition

Each [lead](/domain/lead.md) has exactly one current status that follows its outreach. The owner filters the lead list by it, and the results count the moves between statuses.

## Not to be confused with

- **Flags**: marks that ask for the owner's attention without being a status: "no email found", client type "Other", no time zone, "market not active", template missing, no fact for a personal line. A flagged lead keeps its status.
- **Fit level** ([qualification rules](/domain/qualification-rules.md)): how well a lead fits, not where it stands.

## Rules

| Status | What puts a lead there |
|---|---|
| found | A Google Maps search or a pasted link creates it |
| waiting for review | Research and qualification are done |
| approved | The owner swipes right (or approves a lead rejected earlier, which is then handled like any new approval) |
| rejected | The owner swipes left, or withdraws an approval: every email not yet sent is cancelled |
| to contact by hand | The owner approves a lead with no email address: no email is planned, it is listed for the owner |
| emailed (with the last step sent) | The intro is sent; the step moves on with each follow-up |
| replied (with the date) | A reply is found in the mailbox, or the owner records one by another channel (for example an answer to the Instagram DM) |
| opted out | The lead unsubscribes, or the owner records that it asked not to be contacted |
| bounced | An email to the lead bounces |
| sequence finished | The last email is sent and no reply came |

- An approved lead with no time zone stays "approved", flagged, and gets no email until the owner sets one.
- A business found again by a new search keeps its status.
- Replied, opted out, bounced and withdrawn leads get no further email ([outreach sequence](/domain/outreach-sequence.md)).
- Rejected leads and leads whose sequence finished without a reply are deleted after their retention period; any lead can be erased on request ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

## Where it is used

Specs: `openspec/specs/outreach-tracking/spec.md`, `openspec/specs/lead-review/spec.md`, `openspec/specs/outreach-sending/spec.md`. Data: [/data/lead.md](/data/lead.md).
