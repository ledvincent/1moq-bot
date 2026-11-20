---
type: Decision
title: Leads live in lead, lead_email, lead_fact and lead_source, and deleted or opted-out addresses only as keyed hashes
description: The lead data model's first tables (lead, lead_email, lead_fact, lead_source, sheet_sync, seen_business, do_not_contact), facts kept with their source, keyed HMAC-SHA256 hashes under MATCH_HASH_KEY, and one email normalisation rule
owner: vincent.ledreau@dirox.net
status: stable
tags: [data, sourcing, compliance, personal-data]
---
# Leads live in lead, lead_email, lead_fact and lead_source, and deleted or opted-out addresses only as keyed hashes

Date: 2026-11-13 · Jira: MOQ-31 · Change: `openspec/changes/moq-31-read-leads-google-sheet/` (design D2)

## Context

The kickoff design planned `lead`, `lead_fact`, `lead_email`, `seen_business` and `do_not_contact` and left names and types to the first ticket that builds them (rows 1 and 4). MOQ-5 is deferred, so MOQ-31 is that ticket. The sheet adds the email address as a match key, a "Google Sheet" source, and a row order that MOQ-32 sorts the Review queue by. The do-not-contact check and the "already decided" check must not store addresses readably ([do-not-contact list](/domain/do-not-contact-list.md), [personal data handling](/decisions/MOQ-1-personal-data-handling.md)).

## Decision

In PostgreSQL, through Drizzle, one migration (columns: [lead](/data/lead.md)):
- `lead` (module `sourcing`): the business, its status, client type, fit level, language, time zone, flags, the match keys `website_domain` and `instagram_handle` (each unique when set), and `import_position` (from a sequence, set when a sync creates the lead, so it follows the sheet's row order and the order of syncs). The map place ID comes with MOQ-5; the owner's override columns with MOQ-11.
- `lead_email` (`sourcing`): the address as written (without surrounding spaces and "mailto:") and `address_normalised`, unique across leads: the email match key.
- `lead_fact` (`sourcing`): kind, value, source, found at; unique on (lead, kind, source). The sheet's values are facts with the source `Google Sheet`, stored exactly as read; an empty cell is no row.
- `lead_source` (`sourcing`): primary key (lead, source), so a lead lists each source once, with the sync and sheet row that brought it.
- `sheet_sync` (`sourcing`): one row per sync, its counts and report lines (row numbers and reasons only, never a name or an address); a partial unique index on `status = 'running'` allows one running sync.
- `seen_business` (`sourcing`): `key_hash` (bytea, primary key) and the last decision, one row per match key of a deleted lead.
- `do_not_contact` (module `compliance`): `address_hash` (bytea, primary key). A trigger refuses `DELETE` and `TRUNCATE` on it, so the list is never emptied, even by mistake (a custom migration, since drizzle-kit does not generate triggers).
- **Keyed hashes**: HMAC-SHA256 with the secret `MATCH_HASH_KEY` over a typed input: `email:<normalised address>`, `domain:<website domain>`, `instagram:<handle>`. One function serves both tables (`src/platform/keyed-hash.ts`).
- **Email normalisation** (one rule for matching and for the do-not-contact list): trim, drop a leading `mailto:` (any case), lower-case the whole address. It is the compliance module's rule, `normaliseEmail`, exported from `src/compliance/index.ts`.

## Alternatives considered

- *The sheet's columns as columns of `lead`*: simpler queries, but the kickoff model keeps each fact with its source, and Maps, Instagram and the AI profile add the same kinds of facts from other sources later.
- *A JSON column holding the whole row*: no schema for the values, and the "unknown fact is a missing row" rule would not hold.
- *Ordering by `created_at`*: rows of one sync are written within the same milliseconds; a sequence gives an exact order.
- *Readable addresses in `seen_business` or `do_not_contact`*: simpler, but keeps personal data after deletion, against the personal data decision.
- *A plain SHA-256 without a key*: an address can be confirmed by hashing a guess; the key makes the hashes useless without the server's secret.
- *A database lock (advisory lock) instead of the unique index for one running sync*: held only by the session, invisible to the page; the `running` row also tells Find leads that a sync runs.

## Consequences

- `MATCH_HASH_KEY` is part of the data: changing or losing it makes every do-not-contact and seen-business hash unmatchable. It is required at start (at least 32 characters), kept with the other secrets in `/etc/1moq/` and backed up apart from the database (MOQ-29).
- MOQ-18 writes `do_not_contact` with `normaliseEmail` and the keyed hash; MOQ-25 and the retention sweep write `seen_business` before deleting a lead (each match key, the email included, with the last decision).
- MOQ-5 adds the map place ID; MOQ-11 the override columns; MOQ-7 the email kind and the language and time zone from research.
- MOQ-32 orders the Review queue by `import_position` and filters on `lead_source`.
