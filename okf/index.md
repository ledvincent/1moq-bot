---
okf_version: "0.2"
---
# Project knowledge

* [Log](log.md) - what changed in this knowledge, newest first

# Architecture

* [Architecture overview](architecture/overview.md) - One always-on TypeScript web service on a small EU server serves the owner's UI and runs every background job (search, research, qualification, writing, sending, inbox), with PostgreSQL on the same server as its only store and job queue
* [Tech stack](architecture/tech-stack.md) - TypeScript on Node.js 24 LTS, Fastify API and a React UI built with Vite in one container, PostgreSQL as the only store and job queue, with the libraries and exact versions pinned by the project scaffold

# Domain

* [Base templates](domain/base-templates.md) - The starting text for each client type, outreach step and language (English, French), kept and edited by the owner in the tool, from which the AI writes each message with one personal line drawn from the lead's recorded facts
* [Client types](domain/client-types.md) - The 13 kinds of business 1moqcustom targets (cafés and roasters to associations), plus "Other"; a lead's type decides the products proposed, its base templates, its hook, its send window and its Saturday switch
* [Do-not-contact list](domain/do-not-contact-list.md) - The email addresses that must never be emailed again, whatever happens to their lead; filled by unsubscribes, requests the owner records and erasures, kept for good as a keyed hash, never emptied
* [Lead](domain/lead.md) - A business that might order custom merch from 1moqcustom, never a person; one lead per business whichever source found it, matched by its map place, Instagram handle or website domain
* [Lead status](domain/lead-status.md) - The one current status of each lead in the outreach - found, waiting for review, approved, rejected, to contact by hand, emailed, replied, opted out, bounced, sequence finished - and what moves a lead from one to the next
* [Markets](domain/markets.md) - The countries 1moqcustom targets in three phases (EU, UK and Australia; then Singapore; then the United States), the active markets setting that flags leads elsewhere, and the language each lead is written to
* [Outreach sequence](domain/outreach-sequence.md) - The contacts an approved lead with an email gets - intro on day 1, an Instagram DM by hand on day 3, follow-ups on days 6 and 12, a last email on day 21 - counted from the intro actually sent, in its client type's morning window, within daily limits, until it replies, opts out or bounces
* [Qualification rules and fit level](domain/qualification-rules.md) - The client's five rules for a lead worth emailing (own merch, 2,000 to 50,000 Instagram followers, 1 to 10 locations or a small online store, posted in the last 30 days, a nameable owner) and the fit level they give - good, possible or poor

# Decisions

* [Claude through the Anthropic API profiles, classifies and writes](decisions/MOQ-1-claude-for-ai.md) - One AI provider, Claude Haiku 5.5 through the Anthropic API (Batch API, prompt caching, monthly spend cap), with extraction of facts from untrusted page text kept apart from writing, and every output checked by code
* [Every email is checked by the send gate at the moment it is sent](decisions/MOQ-1-send-gate.md) - Emails are planned ahead as one row per lead and step, and each is claimed and checked in one transaction right before it goes to the mailbox (approval, opt-out, reply, window, limits, footer), so a late reply or withdrawal is never missed and nothing is sent twice
* [Lead sources only through official or provider APIs, never the company's Instagram account](decisions/MOQ-1-lead-source-policy.md) - Google Maps and Instagram data come only through official APIs (or a provider's API if the client chooses), the tool never signs in to or automates the company's Instagram account, and lead websites are read politely
* [Libraries and pinned versions for the scaffold](decisions/MOQ-2-libraries-and-versions.md) - pnpm, Drizzle, pg-boss, Vitest, ESLint, Prettier and Luxon on Node 24 with exact version pins, TypeScript held at 6.0.3 until typescript-eslint supports 7; versions change only through a ticket
* [One package, one folder per module under src](decisions/MOQ-2-folder-layout.md) - One package (no monorepo) with the server in src/<module>/, the UI in web/, tests next to the code and shared platform code in src/platform; a module's folder is created by the first ticket that needs it
* [Personal data: EU hosting, minimal data, hashed do-not-contact list, retention](decisions/MOQ-1-personal-data-handling.md) - Leads' data is processed on legitimate interest, hosted in the EU, limited to business facts and contacts with their sources, deleted after retention periods, while opt-outs are kept for good as a keyed hash of the address
* [PostgreSQL is the only data store and holds the job queue](decisions/MOQ-1-postgresql-store-and-queue.md) - PostgreSQL on the same server as the service holds all data and the background job queue, with a daily backup kept off the server, so a restart never loses a planned send and the do-not-contact list is never lost
* [Send and read through the company mailbox, plain personal emails, no tracking](decisions/MOQ-1-company-mailbox-sending.md) - Outreach emails go out from the company mailbox and replies and bounces are read from it, as plain personal emails with no open or click tracking, so replies land where the owner reads them and delivery is not hurt
* [The page is served by an always-on web service in the cloud](decisions/MOQ-1-cloud-web-service.md) - One web service on a small always-on EU server serves the owner's UI and runs all background work, so emails, follow-ups and unsubscribe work while the owner's Mac is off, within €10 a month
* [TypeScript on Node.js with Fastify and React, one deployable](decisions/MOQ-1-typescript-stack.md) - TypeScript everywhere on the current Node.js LTS, a Fastify API serving a React UI built with Vite, web server and job worker in one container, so one language covers the UI, the API and the jobs

# Data

* [lead](data/lead.md) - One business found for outreach, with its researched facts and their sources, its email addresses, its match keys and the owner's overrides kept apart from research
* [outbound_message](data/outbound-message.md) - One planned or sent outreach email, one row per lead and step (unique), carrying its text, due day and send status - planned, sending, sent, cancelled, failed or unknown

# Integrations

* [Anthropic Claude](integrations/anthropic-claude.md) - The AI that profiles leads, picks their client type and writes their emails, Claude Haiku 5.5 through the Anthropic API with the Batch API, prompt caching and a monthly spend cap; business facts and first names are sent, email addresses never
* [Company mailbox](integrations/company-mailbox.md) - Sending every outreach email from the company mailbox and reading its inbox for replies, auto-replies and bounces; blocked by the separate mailbox and domain ticket, protocol chosen in row 16
* [Google Maps](integrations/google-maps.md) - Finding businesses by type and city, their place details and photos; the Google Places API is the recommended source (not decided, row 4), and Google's terms limit how long Places content other than place IDs is stored
* [Instagram](integrations/instagram.md) - Read-only Instagram facts for leads whose handle is known (followers, bio, website, recent posts) through the Graph API's business discovery (recommended, not decided, row 7); the company's own account is never signed in to or automated
* [Jira](integrations/jira.md) - How this project's Jira is set up - project key, where acceptance criteria live, issue types, the status for each stage, the dependency link type and the ticket labels; read by /dirox-kit:jira and the other commands
