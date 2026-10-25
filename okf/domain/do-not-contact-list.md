---
type: Glossary Term
title: Do-not-contact list
description: The email addresses that must never be emailed again, whatever happens to their lead; filled by unsubscribes, requests the owner records and erasures, kept for good as a keyed hash, never emptied
owner: ledvincent
status: stable
tags: [compliance, gdpr, kickoff]
---
# Do-not-contact list

## Definition

The do-not-contact list holds every address that opted out or asked not to be contacted. No email is ever sent to an address on it, whether its lead is found again, approved again or added by hand. It outlives the lead's data.

## Not to be confused with

- **A rejected lead**: the owner's choice; the lead may be approved later, and its data is deleted after the retention period. A rejected lead's address is not on the list.
- **Seen businesses**: the hashed match keys of deleted leads, kept so a deleted lead is not offered for review again. They hold businesses, not addresses.
- **A bounce**: stops the lead's sequence and marks it "bounced" ([lead status](/domain/lead-status.md)).

## Rules

What puts an address on the list:
- the lead confirms on the unsubscribe page reached from an email's link (opening the link alone does not: mail scanners open links);
- the lead's mail app uses the email's one-click unsubscribe header;
- the owner records that the lead asked not to be contacted (in a reply, a DM or a call), or adds an address directly;
- the owner erases a lead on request.

How it is kept:
- as a keyed hash (HMAC with a server secret) of the normalised address, never readably ([personal data handling](/decisions/MOQ-1-personal-data-handling.md)); how addresses are normalised is set when the list is built (row 17);
- for good: never emptied, never swept by retention, never deleted with a lead;
- checked by the [send gate](/decisions/MOQ-1-send-gate.md) right before every email.

## Where it is used

Specs: `openspec/specs/outreach-compliance/spec.md`, `openspec/specs/outreach-sending/spec.md`.
