---
type: Decision
title: "Personal data: EU hosting, minimal data, hashed do-not-contact list, retention"
description: Leads' data is processed on legitimate interest, hosted in the EU, limited to business facts and contacts with their sources, deleted after retention periods, while opt-outs are kept for good as a keyed hash of the address
owner: ledvincent
status: stable
tags: [gdpr, compliance, kickoff]
---
# Personal data: EU hosting, minimal data, hashed do-not-contact list, retention

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The tool emails businesses in the EU, the UK and Australia (later Singapore and the US). Business contact data often names a person (an owner, a founder, a personal address), so GDPR applies in the EU and the UK. Cold-email rules also require a sender address and a working unsubscribe, and opt-outs must be honoured even after the data is deleted.

## Decision

The tool processes business contact data on the basis of legitimate interest. Writing the legitimate-interest assessment is the client's task, not code. Hosting and the database are in the EU. The processors (host, Google, Meta, Anthropic, the mailbox provider, any lookup service) are listed in `okf/`, in `/integrations/` and the [architecture overview](/architecture/overview.md). The data kept:
- Only business facts and business contact data, each with its source. Personal social accounts are not collected.
- The [do-not-contact list](/domain/do-not-contact-list.md) keeps a keyed hash (HMAC with a server secret) of the normalised address, for good. The readable address goes when the lead is deleted.
- A daily sweep deletes rejected leads and leads that finished without a reply after periods set in the settings. Only hashed match keys are kept, so a deleted lead is not offered again.
- A lead can be erased or exported on request.

Every email carries the footer (company, postal address, unsubscribe). Pending the legal check (open question 9), every email should also carry one line saying where the contact was found, with a link to a privacy notice on the company website.

## Alternatives considered

- **Readable addresses in the do-not-contact list.** Simpler, but keeps personal data indefinitely.
- **Keeping everything.** Breaks the storage-limitation principle.
- **Hosting outside the EU.** Needs transfer safeguards for no benefit.

## Consequences

- Retention periods are recommended, not decided: rejected leads deleted after 30 days, leads that never replied deleted 12 months after their last email, opt-outs kept for good as a hash (open question 11; row 24 sets them).
- The company's legal name, postal address, sender name and privacy notice address come from the client (open question 8); no email is sent while the address is not set.
- Rules differ between markets (open question 9): the recommended path, not decided, is a short legal review before go-live, then excluding countries or kinds of business as advised.
- The HMAC secret is part of the do-not-contact list: without it, stored hashes no longer match any address.
- A new processor (a fallback AI model, a lookup service) means updating the processor list.
