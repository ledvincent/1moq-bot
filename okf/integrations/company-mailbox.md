---
type: Integration
title: Company mailbox
description: Sending every outreach email from the company mailbox and reading its inbox for replies, auto-replies and bounces; blocked by the separate mailbox and domain ticket, protocol chosen in row 16
owner: ledvincent
status: draft
tags: [sending, email, kickoff]
---
# Company mailbox

## What we use it for

- Sending every outreach email, so a copy is in the mailbox's sent mail and replies arrive in its inbox ([company mailbox sending](/decisions/MOQ-1-company-mailbox-sending.md)).
- Reading the inbox every five minutes and right before each send: replies, auto-replies and bounces, matched to leads, stop the [outreach sequence](/domain/outreach-sequence.md).

The owner reads and answers replies in the mailbox; the tool only notices them. Specs: `openspec/specs/outreach-sending/spec.md`, `openspec/specs/outreach-compliance/spec.md`.

## How we connect

- **Dependency**: a separate ticket, outside the MOQ-1 epic ("External" in the backlog), sets up the mailbox and the domain, including SPF, DKIM and DMARC. It blocks real sending (rows 16 and 25). Until then: a test mailbox, and a local mail catcher in development.
- **Provider and sending domain** are inputs to that ticket (open question 12): Google Workspace, Microsoft 365 or another; the main company domain or a separate outreach domain. This concept stays `draft` until they are known.
- **Protocol**: SMTP with IMAP, the Gmail API or Microsoft Graph, chosen in row 16 once the provider is known. Credentials are server secrets, outside the repo.
- Only the [send gate](/decisions/MOQ-1-send-gate.md) hands email to the mailbox. With dry-run on (until go-live, row 25), every email goes to an internal test address.
- **Emails**: from a person's name, plain text or light HTML, follow-ups in the intro's thread, no open or click tracking, with the standard unsubscribe headers (`List-Unsubscribe`, `List-Unsubscribe-Post`) for one-click unsubscribe.

## Limits and failure

- **Daily limits**: 25 new intros a day by default; a total limit with follow-ups included, recommended, not decided at 50 a day (open question 12; row 18). Sends spaced a minute or more apart at random. A warm-up with low limits at go-live (row 25).
- **Uncertain send** (a timeout after the mailbox accepted the email): the message is marked "unknown" and never resent automatically ([outbound message](/data/outbound-message.md)).
- **Bounce**: the lead is marked "bounced" and gets no further email.
- **Reply matching**: thread headers first, then sender address and domain; whether auto-replies count as replies is set in row 19.
- The mailbox provider's own sending limits: TODO, known once the provider is chosen.
- The mailbox is outside the €10 monthly budget. The mailbox provider is a data processor for GDPR.

## Contacts

- Mailbox and domain administrator on the client side: TODO (the separate mailbox ticket).
