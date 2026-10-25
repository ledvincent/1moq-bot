---
type: Decision
title: Send and read through the company mailbox, plain personal emails, no tracking
description: Outreach emails go out from the company mailbox and replies and bounces are read from it, as plain personal emails with no open or click tracking, so replies land where the owner reads them and delivery is not hurt
owner: ledvincent
status: stable
tags: [sending, email, kickoff]
---
# Send and read through the company mailbox, plain personal emails, no tracking

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

The brief asks for emails sent from the company mailbox. The owner answers replies there. Volume is small (at most 25 to 30 new intros a day, up to four emails per lead). Email services built for newsletters or transactional mail generally forbid cold email in their terms. Tracking pixels hurt delivery and, in the EU and UK, need consent.

## Decision

Emails go out from the company mailbox through its own interface, and replies and bounces are read from the same mailbox. Emails look personal:
- from a person's name;
- plain text or light HTML;
- follow-ups in the same thread as the intro;
- no open-tracking pixel and no click-tracking links.

The protocol (SMTP with IMAP, the Gmail API or Microsoft Graph) is chosen in row 16, once the separate mailbox ticket has picked the provider. See [Company mailbox](/integrations/company-mailbox.md).

## Alternatives considered

- **A transactional or newsletter email service.** Their terms forbid unsolicited email, and replies go elsewhere.
- **A cold-email service connected to the same mailbox** (sequences, warm-up and reply detection built in). It would replace rows 16 to 21, but costs a monthly fee, adds another processor holding lead data, and splits the approval gate and the stop rules across two systems. Worth reconsidering if delivery becomes the bottleneck.

## Consequences

- Every sent email is in the mailbox's sent mail, and replies arrive in its inbox, where the owner answers them; the tool only notices them.
- Delivery depends on the mailbox and its domain: SPF, DKIM and DMARC belong to the separate mailbox ticket; low limits, spaced sends and a warm-up (row 25) protect the domain.
- The results stop at replies: there are no open or click figures.
- Real sending waits for the separate mailbox and domain ticket; until then, a test mailbox and dry-run.
