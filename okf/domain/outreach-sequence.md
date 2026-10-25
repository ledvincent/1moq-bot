---
type: Glossary Term
title: Outreach sequence
description: The contacts an approved lead with an email gets - intro on day 1, an Instagram DM by hand on day 3, follow-ups on days 6 and 12, a last email on day 21 - counted from the intro actually sent, in its client type's morning window, within daily limits, until it replies, opts out or bounces
owner: ledvincent
status: stable
tags: [sending, kickoff]
---
# Outreach sequence

## Definition

The outreach sequence is the series of contacts the client's acquisition plan sets for each approved lead that has an email address. The tool sends the four emails; the owner sends the Instagram DM by hand. The exact behaviour is in `openspec/specs/outreach-sending/spec.md`; this page gives the business view.

| Step | Day | Channel | What it says (from the deck) |
|---|---|---|---|
| Intro | 1 | Email | One personal line about the business, one photo of similar work |
| Instagram DM | 3 | Instagram, sent by the owner | A short message; the tool suggests the text and lists who is due |
| Follow-up 1 | 6 | Email | A free mockup with their logo |
| Follow-up 2 | 12 | Email | Past work, the minimum order and the lead time |
| Last email | 21 | Email | Asks in one line whether to close their file |

## Not to be confused with

- **A search**: finds leads; the sequence starts only after the owner approves one.
- **Contact by hand**: an approved lead with no email gets no sequence; it is listed for the owner instead ([lead status](/domain/lead-status.md)).

## Rules

- **Day 1** is the day the intro was actually sent (not the approval day); every later step counts from it. Example: approved Monday, intro sent Wednesday because of the daily limit, so follow-up 1 is due the following Monday.
- **Send window**: each email goes out in its [client type's](/domain/client-types.md) one-hour window, in the lead's time zone: 8:00 to 9:00 for cafés and roasters, bars and restaurants, and breweries; 9:00 to 10:00 for the others. Editable per type. A lead with no time zone is not scheduled.
- **Sending days**: Monday to Friday for every type, Saturday for the types whose Saturday switch is on (by default the same three as the 8:00 window), never Sunday, judged in the lead's time zone. A step that falls on a non-sending day moves to the next sending day.
- **Minimum gap**: at least 3 days between two emails to the same lead.
- **Daily limits**: at most 25 new intros a day by default (the deck says 20 to 30), and a total limit with follow-ups included. The default total is recommended, not decided: 50 a day (open question 12; row 18). Emails over a limit wait for a later day, oldest first. Sends are spaced out, a minute or more apart at random (row 18).
- **Send now**: the owner can send a queued email at once. It skips only the window, the sending days and the spacing; the daily limits and every other check still apply ([send gate](/decisions/MOQ-1-send-gate.md)).
- **Stops**: a reply (by email, or by another channel the owner records), an opt-out or a bounce stops the sequence; withdrawing the approval cancels every email not yet sent; the pause switch holds all sending. No email after the last one.
- **Volume**: about 50 newly approved leads a week planned.

## Where it is used

Specs: `openspec/specs/outreach-sending/spec.md`, `openspec/specs/email-writing/spec.md`. Data: [/data/outbound-message.md](/data/outbound-message.md).
