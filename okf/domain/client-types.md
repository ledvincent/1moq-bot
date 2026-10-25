---
type: Glossary Term
title: Client types
description: The 13 kinds of business 1moqcustom targets (cafés and roasters to associations), plus "Other"; a lead's type decides the products proposed, its base templates, its hook, its send window and its Saturday switch
owner: ledvincent
status: draft
tags: [qualification, kickoff]
---
# Client types

## Definition

A client type is the kind of business a lead is, as the client's acquisition plan (deck "Reach out plan", confidential, not in the repo) groups them. Each lead has exactly one type, set by the AI with a one-line reason, and the owner can change it. A lead that fits no type is "Other" and is flagged for the owner.

## Not to be confused with

- **Fit level**: how well a lead matches the [qualification rules](/domain/qualification-rules.md), whatever its type.
- **Market**: where the lead is ([markets](/domain/markets.md)).

## Rules

The type decides the products proposed, the [base templates](/domain/base-templates.md) and the hook of the emails.

| Client type | What they buy | Typical order | Who decides | Hook |
|---|---|---|---|---|
| Cafés and roasters | Aprons, staff tees, tote bags, coasters, retail merch | 30-150 per item | Owner or brand manager | Merch that sells at the counter, not only uniforms |
| Bars and restaurants | Staff shirts, caps, coasters, event merch, gift boxes | 50-200 per item | Owner, GM or marketing lead | Branded pieces for launches, events and staff |
| Breweries | Staff tees, aprons, caps, retail merch, coasters | 50-200 per item | Owner or taproom manager | Merch fans buy at the bar |
| Indie clothing brands | Cut-and-sew tees, hoodies, embroidered caps, labels, packaging | 50-300 per style | Founder or designer | A small first run to test a drop |
| Gyms | Staff tees, member hoodies, shorts, joggers, caps | 50-200, plus resale merch | Owner or head coach | Gym merch already made for a UK gym |
| Yoga and pilates studios | Leggings, tees, sweats, tote bags, resale merch | 30-150 per drop | Studio owner | Soft premium fabrics, small test drops |
| Hotels and resorts | Staff uniforms, aprons, robes, tote bags, retail merch | 100-300 per role | GM or F&B manager | Uniforms that match the hotel brand |
| Schools | Graduating-class hoodies, PE kits, staff polos, event tees | 50-300 every school year | Principal, PTA or student council | Class hoodies already made for a school |
| Run and sports clubs | Jerseys, running tees, shorts, hoodies, caps | 30-200 per season | Club president or committee | Members can order sizes one by one |
| Events and festivals | Crew tees, merch tees, hoodies, tote bags, caps | 100-300 per event | Event producer or marketing lead | Fixed date, so quote a delivery date |
| Tech startups | Team hoodies, tees, caps, tote bags, welcome kits | 20-150, again with each new hire | Founder, office or people manager | Swag the team wants to wear |
| Music artists and bands | Tour tees, hoodies, caps, tote bags | 50-300 per tour or release | Artist, manager or label | Ready before the tour starts |
| Associations | TODO: open question 13 | TODO | TODO | TODO |
| Other | None of the above: flagged for the owner | - | - | - |

**Send window and Saturday switch** (defaults, editable per type in the settings): cafés and roasters, bars and restaurants, and breweries send from 8:00 to 9:00 with Saturday on; every other type sends from 9:00 to 10:00 with Saturday off. Sunday is never a sending day. See [outreach sequence](/domain/outreach-sequence.md).

**Open:**
- Associations are named in the brief but not described in the deck: what they buy, who decides and the hook are open question 13. This concept stays `draft` until it is answered.
- The deck names past clients per type; they are left out here. Which past clients emails may name is open question 7.

## Where it is used

Specs: `openspec/specs/lead-qualification/spec.md`, `openspec/specs/email-writing/spec.md`, `openspec/specs/outreach-sending/spec.md`, `openspec/specs/outreach-tracking/spec.md`. Data: [/data/lead.md](/data/lead.md).
