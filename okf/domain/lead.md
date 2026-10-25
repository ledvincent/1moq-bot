---
type: Glossary Term
title: Lead
description: A business that might order custom merch from 1moqcustom, never a person; one lead per business whichever source found it, matched by its map place, Instagram handle or website domain
owner: ledvincent
status: stable
tags: [sourcing, kickoff]
---
# Lead

## Definition

A lead is a business that might order small runs of custom clothing or accessories from 1moqcustom: a café, a gym, a school, a band. It is never a person. The person to write to (its owner or founder) and its email addresses are facts of the lead. Each business is one lead, whichever source found it and however many times.

## Not to be confused with

- **The owner** (in this project): 1moqcustom's owner, the only user of the tool. A lead's own owner or founder is called "the lead's owner" or "the founder".
- **A contact email**: a lead may have several addresses, or none ("no email found").
- **A search result**: a search can return a business that is already a lead; it then adds to that lead.
- **A client**: a lead becomes a client outside the tool, by ordering. The tool stops at the reply.

## Rules

- **Sources**: "Google Maps" (a map search), "Instagram" (a pasted profile link or handle) or "Manual" (a pasted website). A lead keeps every source and search it was found in.
- **Match keys**: the map place ID, the Instagram handle and the website domain, each unique across leads when set. A business found again by any of them is the same lead; its status and the owner's decision stay as they were. Which domains do not count as a website (link-in-bio pages, social sites) is set in row 4.
- **Facts**: each researched fact keeps its source; an unknown fact stays unknown, never guessed.
- **Owner's overrides**: client type, language and time zone set by the owner win over research, which never overwrites them.
- **After deletion**: the match keys are kept as keyed hashes with the last decision, so a deleted lead is not offered again.
- Its [status](/domain/lead-status.md), [client type](/domain/client-types.md) and [fit level](/domain/qualification-rules.md) are described in their own concepts.

## Where it is used

Specs: `openspec/specs/lead-sourcing/spec.md`, `openspec/specs/lead-enrichment/spec.md`, `openspec/specs/lead-review/spec.md`, `openspec/specs/outreach-tracking/spec.md`. Data: [/data/lead.md](/data/lead.md).
