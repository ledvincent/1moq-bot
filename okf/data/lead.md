---
type: Data Entity
title: lead
description: One business found for outreach, with its researched facts and their sources, its email addresses, its match keys and the owner's overrides kept apart from research
owner: ledvincent
status: draft
tags: [data, kickoff]
---
# lead

The [lead](/domain/lead.md) record and the tables that hang off it, in PostgreSQL. Planned in the kickoff design; table and column names, and their types, are fixed in rows 1 and 4, so this stays `draft` until then. Fields marked **personal** are personal data.

# Schema

**`lead`**: the business.

| Field | Meaning | Notes |
|---|---|---|
| map place ID | Google Maps place | match key, unique when set |
| Instagram handle | Instagram profile | match key, unique when set |
| website domain | the lead's own site | match key, unique when set; which domains count is set in row 4 |
| name, country, city | where it is | Places content is refreshed when shown ([Google Maps](/integrations/google-maps.md)) |
| time zone | IANA zone, from the location | none until known or set by the owner |
| language | English or French | |
| client type, reason | [client types](/domain/client-types.md) | |
| fit level, rule results | [qualification rules](/domain/qualification-rules.md) | each rule met, not met or unknown |
| status | [lead status](/domain/lead-status.md) | |
| owner name | the lead's owner or founder | **personal** |
| flags | no email found, type "Other", no time zone, market not active, and the like | |
| owner's overrides | client type, language, time zone set by the owner | kept apart from the researched values, so research never overwrites them |

**`lead_fact`**: one researched fact: kind, value, source (a link or a provider), found at. An unknown fact is a missing row, never a guess.

**`lead_email`**: an address found: the address (**personal** when it names a person), its source, its kind (generic or personal) and its check result.

## Relations

- `search` and `lead_search`: a search (source, query, place, status, result count) and the leads it found; a lead found again gets a new `lead_search` row.
- `decision`: the owner's approvals and rejections over time; the latest counts.
- [`outbound_message`](/data/outbound-message.md): one per lead and step.
- `inbound_event`: reply, auto-reply, bounce or unsubscribe, with its lead, mailbox message ID and date.
- `contact_task`: a DM due on day 3, or a lead to contact by hand, with its suggested text, due date and done date.
- `seen_business`: keyed hashes of the match keys of deleted leads, with their last decision.
- `do_not_contact`: keyed hashes of addresses, never deleted ([do-not-contact list](/domain/do-not-contact-list.md)); not linked to a lead, so it survives the lead's deletion.
- `audit_log`: who did what and when (decisions, sends, opt-outs, erasures, setting changes).

## Lifecycle

- **Created** by a `search.run` job or a pasted link (status "found"); a business already known is matched, not duplicated.
- **Updated** by `lead.enrich` (facts, emails, language, time zone) and `lead.qualify` (type, rules, fit level), by the owner's decisions and overrides, and by the outreach (status).
- **Deleted** by the daily `retention.sweep` (rejected leads, and leads whose sequence finished without a reply, after the periods in the settings) or by erasure on request, with its facts, emails, messages and history. Its match keys stay as hashes in `seen_business`; on erasure its address joins the do-not-contact list.
- Retention periods are recommended, not decided: 30 days for rejected leads, 12 months after the last email for leads that never replied (open question 11; row 24). See [personal data handling](/decisions/MOQ-1-personal-data-handling.md).
- **Export**: on request, one file with everything held about the lead and the source of each fact.
