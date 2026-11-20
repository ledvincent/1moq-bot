---
type: Data Entity
title: lead
description: One business found for outreach - tables lead, lead_email, lead_fact, lead_source and sheet_sync (built by MOQ-31) - with its facts and their sources, its email addresses, its match keys and the owner's overrides kept apart from research
owner: vincent.ledreau@dirox.net
status: draft
tags: [data, kickoff]
---
# lead

The [lead](/domain/lead.md) record and the tables that hang off it, in PostgreSQL. The first tables were built by MOQ-31 ([lead tables](/decisions/MOQ-31-lead-tables.md)); the schema is `src/sourcing/schema.ts` and `src/compliance/schema.ts`. Columns and tables other tickets add are marked *later*; this stays `draft` until they are built. Fields marked **personal** are personal data.

# Schema

**`lead`** (module `sourcing`): the business.

| Column | Meaning | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | the business's name | from the sheet's Business; Places content is refreshed when shown ([Google Maps](/integrations/google-maps.md)) |
| `status`, `status_changed_at` | [lead status](/domain/lead-status.md) | |
| `client_type` | one of the [client types](/domain/client-types.md), or `Other` | null until known |
| `fit_level` | [qualification rules](/domain/qualification-rules.md) | null for sheet leads |
| `language` | `en`, `fr` or null | never guessed |
| `time_zone` | IANA zone or null | [offline place lookup](/decisions/MOQ-31-offline-place-lookup.md) |
| `flags` | text array: `type unknown`, `no language`, `no time zone`, `time zone unclear`; later tickets add more (no email found, market not active, and the like) | |
| `website_domain`, `instagram_handle` | match keys | each unique when set; domains that are not a website: `src/sourcing/not-website-domains.ts` |
| `import_position` | bigint from a sequence, set when a sync creates the lead | the sheet's row order across syncs; MOQ-32 sorts the Review queue by it |
| `created_at`, `updated_at` | | |
| map place ID | Google Maps place, match key, unique when set | *later*, MOQ-5 |
| country, city, reason, rule results, owner name | from research and qualification | *later*; owner name is **personal** |
| owner's overrides | client type, language, time zone set by the owner | *later*, MOQ-11; kept apart so research never overwrites them |

**`lead_email`**: `address` (as written, without surrounding spaces and "mailto:"; **personal** when it names a person), `address_normalised` (unique across leads: the email match key; the rule is in [do-not-contact list](/domain/do-not-contact-list.md)), `source`, `created_at`. Kind (generic or personal) and check result: *later* (MOQ-7, MOQ-10).

**`lead_fact`**: one fact: `kind`, `value`, `source`, `found_at`; unique on (lead, kind, source). The sheet gives the kinds `buyer_type`, `language`, `city_area`, `why_they_fit`, `website_instagram`, `owner_founder` (**personal**) and `notes` (may hold **personal** data), stored exactly as read. An unknown fact is a missing row, never a guess.

**`lead_source`**: primary key (lead, source): `Google Sheet` now; `Google Maps`, `Instagram`, `Manual` later; with `sheet_sync_id`, `sheet_row` and `added_at`. A lead matched again by another source gets a row; nothing else of it changes.

**`sheet_sync`**: one per sync of the [Google Sheet](/integrations/google-sheets.md): `trigger` (`now`, `daily`), `status` (`running`, `done`, `failed`), `started_at`, `finished_at`, `created_count`, `flagged_count`, `skipped_count`, `no_email_count`, `lines` (JSON: row number, outcome, reasons; never a name or an address), `failure` (the reason shown to the owner). A partial unique index on `status = 'running'` allows one running sync.

## Relations

- `search` and `lead_search` (*later*): a search (source, query, place, status, result count) and the leads it found; a lead found again gets a new `lead_search` row.
- `decision` (*later*): the owner's approvals and rejections over time; the latest counts.
- [`outbound_message`](/data/outbound-message.md): one per lead and step.
- `inbound_event` (*later*): reply, auto-reply, bounce or unsubscribe, with its lead, mailbox message ID and date.
- `contact_task` (*later*): a DM due on day 3, or a lead to contact by hand, with its suggested text, due date and done date.
- `seen_business` (built by MOQ-31): `key_hash` (HMAC-SHA256 under `MATCH_HASH_KEY` of `email:`, `domain:` or `instagram:` and the key), `last_decision`, `created_at`; one row per match key of a deleted lead.
- `do_not_contact` (built by MOQ-31, module `compliance`): `address_hash`, `reason`, `added_at`; a trigger refuses `DELETE` and `TRUNCATE` ([do-not-contact list](/domain/do-not-contact-list.md)); not linked to a lead, so it survives the lead's deletion.
- `audit_log` (*later*): who did what and when (decisions, sends, opt-outs, erasures, setting changes).

## Lifecycle

- **Created** by a sheet sync (status "waiting for review", source Google Sheet), a `search.run` job or a pasted link (status "found"); a business already known is matched by its email, website domain, handle or map place, not duplicated.
- **Updated** by `lead.enrich` (facts, emails, language, time zone) and `lead.qualify` (type, rules, fit level), by the owner's decisions and overrides, and by the outreach (status). A sheet row that changes after its import leaves the lead unchanged.
- **Deleted** by the daily `retention.sweep` (rejected leads, and leads whose sequence finished without a reply, after the periods in the settings) or by erasure on request, with its facts, emails, sources, messages and history. Its match keys stay as hashes in `seen_business`; on erasure its address joins the do-not-contact list.
- Retention periods are recommended, not decided: 30 days for rejected leads, 12 months after the last email for leads that never replied (open question 11; row 24). See [personal data handling](/decisions/MOQ-1-personal-data-handling.md).
- **Export**: on request, one file with everything held about the lead and the source of each fact.
