---
type: Glossary Term
title: Qualification rules and fit level
description: The client's five rules for a lead worth emailing (own merch, 2,000 to 50,000 Instagram followers, 1 to 10 locations or a small online store, posted in the last 30 days, a nameable owner) and the fit level they give - good, possible or poor
owner: ledvincent
status: stable
tags: [qualification, kickoff]
---
# Qualification rules and fit level

## Definition

The qualification rules are the client's test of whether a lead is worth emailing (deck: "email a lead only if it..."). The **fit level** sums them up as good, possible or poor. It orders the review; it never approves a lead: only the owner does.

## Not to be confused with

- **Client type** ([client types](/domain/client-types.md)): what kind of business the lead is, not how well it fits.
- **Market not active** ([markets](/domain/markets.md)): a separate flag about where the lead is.
- **Approval**: the owner's decision; a "good" lead still waits for it.

## Rules

A lead should:
1. already sell or wear its own merch;
2. have 2,000 to 50,000 Instagram followers;
3. run 1 to 10 locations or a small online store;
4. have posted in the last 30 days;
5. have an owner or founder who can be named.

Each rule is **met**, **not met** or **unknown** (the fact was not found). Examples: 120,000 followers is "not met"; no Instagram profile on record makes rules 2 and 4 "unknown".

| Fit level | When |
|---|---|
| good | every rule is met |
| possible | no rule is failed, at least one is unknown |
| poor | at least one rule is not met |

Review order: good, then possible, then poor; leads outside the active markets last.

How "a small online store" and "own merch" are judged is set in row 11.

## Where it is used

Specs: `openspec/specs/lead-qualification/spec.md`, `openspec/specs/lead-review/spec.md`. Data: [/data/lead.md](/data/lead.md).
