---
type: Glossary Term
title: Base templates
description: The starting text for each client type, outreach step and language (English, French), kept and edited by the owner in the tool, from which the AI writes each message with one personal line drawn from the lead's recorded facts
owner: ledvincent
status: draft
tags: [writing, kickoff]
---
# Base templates

## Definition

A base template is the starting text for one [client type](/domain/client-types.md), one step of the [outreach sequence](/domain/outreach-sequence.md) (intro, follow-up 1, follow-up 2, last email, Instagram DM) and one language (English or French). The AI writes each message from the lead's template and its recorded facts: it names the business, proposes products that suit its type, and adds one personal line.

## Not to be confused with

- **A written message**: the result for one lead and one step ([outbound message](/data/outbound-message.md)); editing a template never changes a message already sent.
- **The legal footer**: company name, postal address and unsubscribe line, added to every email by the `compliance` module, not part of the template.

## Rules

- **Where they live**: in the tool's data, versioned, read and edited by the owner on the templates page. Never in the repo. A change applies to messages written after it.
- **Personal line rule**: every email has one line about the business drawn from its recorded facts. When no recorded fact can carry it, no email is written and the lead is flagged for the owner.
- **Complete only**: no placeholder (such as "[First name]") may be left, and the personal line must be there; otherwise the email is not kept for sending.
- **Missing template**: no message for that step, and the lead is flagged.
- **Language**: the lead's language picks the template ([markets](/domain/markets.md)).

**Open (open question 7):**
- The deck has Instagram DM bases per client group in English and French (confidential, not in the repo); the email bases for the four email steps still have to be written. Recommended, not decided: we draft the English and French email bases from the DM bases and the deck's sequence, and the owner edits them in the tool. This concept stays `draft` until it is settled.
- Which past clients emails may name (the deck plans to ask three).
- The photo of similar work in the intro: an image in the email, or a link to a gallery.
- Whether the owner reads or edits the intro on the review card before approving (open question 6; row 27 if chosen).

## Where it is used

Specs: `openspec/specs/email-writing/spec.md`, `openspec/specs/outreach-sending/spec.md`.
