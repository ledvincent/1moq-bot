# Design: lead finder and cold-outreach tool (MOQ-1 kickoff)

## Context

- **Greenfield.** The repo holds the Dirox kit, an empty `openspec/specs/` and `okf/` with the Jira settings only. No `okf/architecture/` or `okf/decisions/` file exists yet: this design is their source, and the foundation writes them (tasks.md). Ticket labels follow `okf/integrations/jira.md`.
- **People.** The owner runs sales, is not technical, uses a Mac and works on Vietnam time (the deck: "Europe is your afternoon, the US your evening"). The developer builds and maintains the tool, possibly remotely.
- **Volume.** About 50 newly approved leads a week, at most 25 to 30 new intro emails a day, up to four emails per lead, a few hundred leads found a week. One owner, thousands of rows a year.
- **Motivation and scope:** see proposal.md (Why, What Changes). **Behaviour:** see `specs/`.

## Goals / Non-Goals

**Goals:**
- One system that the owner opens from the Dock and that the developer updates without touching the Mac.
- Guarantees that hold by construction, not by care: no email without an approval that still stands; no email after a reply, opt-out or bounce; never above the daily limits; never outside the client type's send window and sending days in the lead's time zone, except an email the owner sends now.
- Low running costs: at most €10 a month for everything the tool runs on (server, backups, AI, data APIs), the company mailbox excluded. Each paid service is justified in its own ticket.
- Every lead source, provider, AI call and the mailbox behind a small interface, so a vendor can change inside its own ticket.
- Everything testable without real services: fakes for sources, Instagram, the AI and the mailbox.

**Non-Goals:**
- Several companies or many users: one company, one account (the owner's). The developer works on the server, not through an account.
- A mail client: replies are read and answered in the company mailbox; the tool only notices them.
- Scale beyond hundreds of leads a week.
- A native Mac app.

## Architecture

### Overview

```
Owner's Mac: Safari or Chrome, bookmark or Dock web app
        |  HTTPS, signed-in session
        v
+---------------- Web service (one container, small EU server) ----------------+
|  HTTP: /api/* JSON for the UI  |  React UI as static files  |  /u/:token page   |
|  Job worker, same process: search, enrich, qualify, write, send, inbox, sweep  |
+------+-------------+---------------+----------------+---------------+---------+
       |             |               |                |               |
  PostgreSQL    Google Places   Instagram Graph   Anthropic API   Company mailbox
  (same server)  API             API               (Claude)        (send + read)
                                                                   + lead websites
                                                                     (public pages)
```

### Modules

One module per capability, so a ticket stays inside one folder. Folder names are fixed in row 1.

| Module | Capability | What it does |
|---|---|---|
| `sourcing` | lead-sourcing | Source adapters (Google Maps, Instagram, manual link); matching a business to an existing lead (map place ID, Instagram handle, website domain) |
| `enrichment` | lead-enrichment | Website reader, Instagram profile, email finder (and optional lookup service), AI profile, language, time zone |
| `qualification` | lead-qualification | Client type, the five fit rules, fit level, active markets |
| `review` | lead-review | Review queue and order, decisions, card data, pictures |
| `writing` | email-writing | Templates, AI writer, output checks |
| `sending` | outreach-sending | Sequence planner, send gate, mailbox adapter (send), DM and by-hand tasks |
| `inbox` | outreach-sending | Mailbox reader: replies, auto-replies, bounces, matched to leads |
| `compliance` | outreach-compliance | Footer, unsubscribe tokens and page, do-not-contact list, retention sweep, erase and export |
| `tracking` | outreach-tracking | Status, history, results |
| `access` | user-access | Sign-in, sessions, web app manifest and icon |
| `platform` | (none) | Config and secrets, database and migrations, job queue, AI client, safe HTTP client, settings, audit log |

### Data flow

1. The owner starts a Google Maps search or pastes a link. A `search.run` job calls the source adapter; each business is matched to an existing lead or creates one (status "found").
2. A `lead.enrich` job per new lead: website reader, then Instagram profile, then (if chosen) the lookup service, then the AI profile; language and time zone are set.
3. A `lead.qualify` job: client type (AI), the five rules (code), fit level, market flag. Status "waiting for review".
4. The owner swipes. An approved lead with an email and a time zone gets its sequence planned: one `outbound_message` per email step with its due day (1, 6, 12, 21) and a day-3 DM task. Without an email it gets a "contact by hand" task.
5. An `email.write` job writes the messages from the template and the facts (at approval or just before each step: row 15).
6. A `send.tick` job every five minutes reads the inbox first, then passes each due email through the send gate (D4) to the mailbox.
7. An `inbox.poll` job every five minutes matches new messages to leads (thread headers first, then sender address and domain) and records replies, auto-replies and bounces; the sequence stops.
8. The unsubscribe page or header adds the address to the do-not-contact list; the sequence stops.
9. A `retention.sweep` job runs daily. Results are computed from the recorded events.

### Routes and APIs

Names are a starting point; each row fixes its own.

**UI pages** (signed in): `/review` (home, swipe review), `/leads` and `/leads/:id` (list with filters, detail and history, change type, language or time zone, record a reply or opt-out, erase, export), `/find` (Google Maps search, add from a link, past searches), `/to-do` (DMs due, leads to contact by hand), `/results`, `/templates`, `/settings` (company details, limits, send window and Saturday switch per client type, markets, retention periods, pause).

**Public** (no sign-in): `GET /u/:token` shows the unsubscribe page with a confirm button (mail scanners open links, so a GET never opts out); `POST /u/:token` opts out, for the button and for one-click unsubscribe from mail apps (`List-Unsubscribe` and `List-Unsubscribe-Post` headers). `GET /health` for the host.

**JSON API** (signed in): `POST|GET /api/searches`; `POST /api/leads` (from a link); `GET /api/leads` (filters); `GET|PATCH|DELETE /api/leads/:id`; `GET /api/leads/:id/export`; `GET /api/review/next`; `POST /api/leads/:id/decision`; `POST /api/leads/:id/events` (reply, opt-out or DM recorded by the owner); `GET /api/leads/:id/messages`; `POST /api/messages/:id/send-now`; `GET /api/templates`, `PUT /api/templates/:type/:step/:language`; `GET /api/tasks`, `POST /api/tasks/:id/done`; `GET /api/results`; `GET|PUT /api/settings`; `POST /api/sending/pause|resume`; `POST /api/do-not-contact`.

**Jobs** (PostgreSQL-backed queue): `search.run` (on demand), `lead.enrich` and `lead.qualify` (after a lead is created or refreshed), `email.write`, `send.tick` (every 5 minutes), `inbox.poll` (every 5 minutes and at the start of each `send.tick`), `retention.sweep` (daily).

### Connections

| Service | Used for | Choice | Settled in |
|---|---|---|---|
| Small EU server (VPS) | Running the service and PostgreSQL, storing data | Always on, about €4 to 5 a month, daily backup kept off the server, a subdomain of the company domain | D1, D3; provider in row 2 |
| Google Places API (recommended) | Search by text and place, place details, photos | Official API | D6; row 4 |
| Instagram Graph API, business discovery (recommended) | Followers, bio, website, recent posts of business accounts, by handle | Official API, with a professional Instagram account linked to a Facebook Page and a Meta app | D6; row 7 |
| Lead websites | Email, links, shop pages, language | Own polite reader | D6; row 6 |
| Email lookup service (optional, for example Hunter) | More addresses and owner names, address check | Free tier only; dropped if it does not help | row 9 |
| Anthropic API (Claude) | AI profile, client type, writing | Official TypeScript SDK, Haiku 5.5, Batch API, prompt caching, monthly spend cap | D7; confirmed in row 8 |
| Company mailbox | Sending, sent copy, reading replies and bounces | SMTP and IMAP, Gmail API or Microsoft Graph | D5; row 16, after the external mailbox ticket |
| Sign-in | The owner's access | A free method: Google sign-in or a passkey | row 3 |

### Data model

PostgreSQL; table and column names are fixed in rows 1 and 4.

- `lead`: the business. Match keys: map place ID, Instagram handle, website domain (each unique when set). Name, client type and reason, fit level and rule results, status, country, city, time zone, language, owner name, flags. The owner's overrides (type, language, time zone) are kept apart from researched values, so research never overwrites them.
- `lead_fact`: one researched fact (kind, value, source link or provider, found at). An unknown fact is a missing row, never a guess.
- `lead_email`: an address found, with its source, kind (generic or personal) and check result.
- `search`, `lead_search`: a search (source, query, place, status, result count) and the leads it found.
- `decision`: the owner's approvals and rejections over time; the latest counts.
- `template`: client type, step, language, subject, body, version.
- `outbound_message`: one per lead and step, unique on (lead, step): recipient, subject, body, template version, facts used, due day, status (planned, sending, sent, cancelled, failed, unknown), sent at, mailbox message ID.
- `inbound_event`: reply, auto-reply, bounce or unsubscribe, with its lead, mailbox message ID and date.
- `contact_task`: a DM due on day 3, or a lead to contact by hand, with its suggested text, due date and done date.
- `do_not_contact`: a keyed hash of the normalised address, the reason and the date. Never deleted.
- `seen_business`: keyed hashes of the match keys of deleted leads, with their last decision, so a deleted lead is not offered again.
- `setting`: company name and postal address, sender name, limits, send window and Saturday switch per client type, active markets, retention periods, paused, dry-run.
- `user`, `session`: shape set by row 3.
- `audit_log`: who did what and when (decisions, sends, opt-outs, erasures, setting changes).

Google's terms let map place IDs be stored without limit but restrict how long other Places content may be kept. Names, addresses and photos from Places are therefore refreshed from the API when shown, or replaced by facts from the lead's own website (row 4 checks the current terms).

### Environments

| Environment | What runs |
|---|---|
| Local | The developer's machine: PostgreSQL in Docker Compose, a local mail catcher for sending and reading, sources, Instagram and AI replaced by recorded fixtures in tests; real APIs only with the developer's own keys |
| CI | GitHub Actions: lint, type check, unit and integration tests against a PostgreSQL service container, next to the existing `dirox-checks` workflow |
| Production | One small always-on EU server running the container and PostgreSQL; secrets kept on the server outside the repo; HTTPS on a subdomain of the company domain (a free certificate); a daily backup kept off the server; dry-run on (every email goes to an internal test address) until row 25 |
| Staging | None at first (one user, low cost); row 2 decides whether one is needed |

## Decisions

### D1. The page is served by an always-on web service in the cloud

**Decision record needed.**

One web service, hosted in the cloud in an EU region, serves the UI and runs all background work (searches, research, writing, sending, reading the inbox). The owner opens it in Safari or Chrome from a bookmark or a Dock icon (Safari's "Add to Dock", or Chrome's "Install app"). There is no page opened from a file and no terminal. Sending works while the Mac is off. It runs on one small always-on server (a VPS of about €4 to 5 a month) with PostgreSQL on the same server (D3), and is reached at a subdomain of the company domain. The provider is chosen in row 2, within the budget in Goals.

Sending must work while the Mac is off, for four reasons:
- Emails go out in each client type's morning window in the lead's time zone, Saturdays included for some types. For a café in Melbourne (8:00 to 9:00) that is about 4 to 5 am in Vietnam, and for New York about 7 to 8 pm.
- Follow-ups fall on fixed days (6, 12 and 21), whatever the owner's schedule.
- The stop-on-reply rule needs the inbox read right before each send.
- The unsubscribe link must answer at any hour, and one-click unsubscribe needs a public address.

As a side effect, the owner can also review leads from a phone.

Alternatives considered:
- **Service on the Mac** (a launch agent serving the page at `localhost`). No hosting cost, and the data stays on the Mac. But nothing is sent while the Mac sleeps, so Australian mornings and fixed follow-up days slip. Installing and updating needs the developer on the Mac. The do-not-contact list lives on one laptop, and losing it means emailing people who opted out. Unsubscribing works by reply only.
- **Both** (page and data on the Mac, sender in the cloud). Two copies of the data to keep in step, and the stop rules split across two machines. The most complex option, with no gain over the cloud.
- **A file page calling a cloud API.** Browsers restrict pages opened from files (their origin is "null"), and sign-in is awkward. No gain over serving the page.

### D2. TypeScript on Node.js: Fastify API, React UI, one deployable

**Decision record needed.**

TypeScript everywhere, on the current Node.js LTS. Fastify serves the JSON API and the built UI. The UI is a React single-page app built with Vite. One repository and one container image run the web server and the job worker in one process, which can be split into two processes later without code changes. The package manager, ORM and migrations, job queue library, test runner, lint and format tools, and version pins are chosen in row 1.

Why: one language for the UI, the API and the jobs. Official SDKs exist for Anthropic and Google, and there are mature libraries for sending and reading mail. A typed state machine suits the sequence and the send gate. There is a single process to host.

Alternatives considered:
- **Python** (FastAPI with React or HTMX). Strong data tooling, but two languages with React, and scraping libraries are not needed since the sources are APIs.
- **Next.js.** UI and API in one framework, but the scheduler still needs a separate long-running worker, and server components add little to a single-user app.
- **Rails 8 or Laravel.** Mail, jobs and sign-in built in, so a good fit, but it depends on the maintainer's skills (proposal, open question 14).
- **No-code** (a spreadsheet database, an automation tool and a cold-email service). Fast to start, but the swipe review, the approval gate and the per-type AI writing still need custom code, at a monthly fee per tool.

### D3. PostgreSQL is the only data store, and holds the job queue

**Decision record needed.**

PostgreSQL runs on the same server as the service, not as a managed database: the data is small (a few MB a month) and a managed database would take most of the budget. A daily backup is kept off the server, since the do-not-contact list must never be lost. Background jobs live in the same database (a PostgreSQL-backed queue, chosen in row 1), so a restart never loses a planned send. Planning, claiming and recording a send happen in database transactions (D4).

Alternatives considered:
- **Managed PostgreSQL.** Backups and patching handled by the provider, but it costs about as much as the whole budget allows.
- **SQLite on a disk volume.** Free and simple, but backups have to be built by hand (and the do-not-contact list must never be lost), and only one writer is allowed. It would be the pick for the Mac option.
- **A Redis-based queue.** One more service to host and back up.
- **In-process timers.** Jobs are lost on restart, and two instances would send twice.

### D4. The send gate: every email is checked at the moment it is sent

**Decision record needed.**

Emails are planned ahead as `outbound_message` rows, unique on (lead, step). The `send.tick` job reads the inbox first. Then, for each due email, one transaction claims the row and checks all of the following:
- sending is not paused;
- the lead's approval still stands;
- the address is not on the do-not-contact list;
- no reply, bounce or opt-out is recorded;
- it is inside the client type's send window, on one of its sending days, in the lead's time zone;
- the daily limits are not reached;
- the company's address is set and the footer is present;
- the message passed the writing checks.

Only then is the email handed to the mailbox, and its message ID and the "sent" status recorded. If the result is uncertain (a timeout after the mailbox accepted the email), the row is marked "unknown" and is never resent automatically. With dry-run on, the recipient is replaced by the internal test address. Sends are spaced a minute or more apart, at random, inside the window (row 18).

Send now goes through the same gate: the owner's request claims the row in the same transaction as a `send.tick` would, so a row is sent once whichever comes first. It skips only the window, the sending days and the spacing; every other check, and the daily limits, still apply.

Why: "no email to a lead the owner has not approved" and "stop on reply" must still hold when a decision or a reply arrives after the email was planned.

Alternatives considered:
- **The mailbox's "send later" feature.** It cannot be cancelled reliably when a reply arrives.
- **Checking only when planning.** A withdrawal or reply that comes between planning and sending would be missed.

### D5. Send and read through the company mailbox, with plain personal emails and no tracking

**Decision record needed.**

Emails go out from the company mailbox through its own interface, and replies and bounces are read from the same mailbox. Emails look personal:
- from a person's name;
- plain text or light HTML;
- follow-ups in the same thread as the intro;
- no open-tracking pixel and no click-tracking links.

The protocol (SMTP with IMAP, the Gmail API or Microsoft Graph) is chosen in row 16, once the separate mailbox ticket has picked the provider.

Why: the brief asks for the company mailbox; replies land where the owner reads them; email services built for newsletters or transactional mail generally forbid cold email in their terms; and tracking pixels hurt delivery and, in the EU and UK, need consent.

Alternatives considered:
- **A transactional or newsletter email service.** Their terms forbid unsolicited email, and replies go elsewhere.
- **A cold-email service connected to the same mailbox** (sequences, warm-up and reply detection built in). It would replace rows 16 to 21, but costs a monthly fee, adds another processor holding lead data, and splits the approval gate and the stop rules across two systems. Worth reconsidering if delivery becomes the bottleneck (proposal, open question 2).

### D6. Lead sources only through official APIs or a provider's API; never through the company's Instagram account

**Decision record needed.**

The tool never signs in to or automates the company's Instagram account: no DMs, follows or likes, and the day-3 DM stays manual. Google Maps and Instagram data come through official APIs or, if the client chooses, a data provider's API under that provider's terms. The tool does not scrape Google Maps or Instagram pages itself. A lead's own website is read politely:
- public pages only, a few per site;
- robots rules honoured;
- an identified user agent;
- a rate limit per site;
- private and internal network addresses blocked.

Recommended sources, each settled in its own row:
- **Google Maps: the Google Places API** (row 4). Text search, place details and photos. It stores place IDs and respects Google's storage limits for other content (see Data model).
- **Instagram: the Graph API's business discovery** (row 7). It gives followers, bio, website and recent posts of business and creator accounts, by handle. It needs a professional Instagram account linked to a Facebook Page and a Meta app. It cannot search by hashtag or place, so Instagram leads come from handles found on websites or pasted by the owner. A paid data provider to search by hashtag or place is out of scope for the budget.

Alternatives considered:
- **Own scraping of Google Maps or Instagram with a headless browser.** It breaks both sites' terms, is brittle and gets blocked. With the company's login it would also put the account at risk. Rejected.
- **A scraping data provider for Google Maps.** Cheap per result, but against Google's terms. Kept only as an option the client may accept (proposal, open question 3).

### D7. Claude through the Anthropic API profiles, classifies and writes; untrusted text is kept apart

**Decision record needed.**

One AI provider, Anthropic (Claude), is called from the server through its official TypeScript SDK, behind a small internal interface (profile, classify, write). There are two separate steps:
1. **Extraction** reads website and Instagram text as untrusted data. It returns structured facts with their sources (what the business does, the owner's name, merch evidence, client type and reason), using structured output.
2. **Writing** receives only those structured facts and the base template, never raw page text. It returns the subject, the body and the facts it used.

Code checks every output:
- the language;
- the length;
- no placeholder left;
- a personal line is present;
- no links except the allowed ones;
- the products match the client type.

Only business facts and the first name go to the AI; email addresses do not. Both steps use the smallest current model, Claude Haiku 5.5, kept cheap three ways:
- the Batch API (half price), since research runs overnight and emails are written ahead of their send day;
- prompt caching on the fixed parts of each request (instructions, templates, the client-type table);
- a monthly spend cap on the AI account.

At the planned volume (about 650 leads researched and 860 emails written a month) this is expected to cost a few euros a month at most. Row 8 confirms the quality on sample leads. If Haiku does not pass, row 8 compares a cheap OpenAI or Google Gemini model behind the same interface, and records the new processor for D8. Row 8 also checks the provider's data terms (API data is not used for training by default) and its data processing agreement.

Alternatives considered:
- **A larger Claude model (Sonnet or Opus) from the start.** Better writing, but several to tens of times the cost, which the budget does not allow for extraction and classification.
- **OpenAI or Google Gemini.** Comparable quality and price; kept as the fallback if Haiku does not pass row 8, since Dirox already works with Claude.
- **An EU-based provider** (for example Mistral). Data stays in the EU; a fallback if the legal review asks for EU-only processors.
- **A local open model.** No API cost, but it needs strong hardware and more upkeep.
- **Templates without AI.** They do not meet the brief.

### D8. Personal data: EU hosting, minimal data with sources, a hashed do-not-contact list, retention

**Decision record needed.**

The tool processes business contact data on the basis of legitimate interest. Writing the legitimate-interest assessment is the client's task, not code. Hosting and the database are in the EU. The processors (host, Google, Meta, Anthropic, the mailbox provider, any lookup service) are listed in `okf/`. The data kept:
- Only business facts and business contact data, each with its source. Personal social accounts are not collected.
- The do-not-contact list keeps a keyed hash (HMAC with a server secret) of the normalised address, for good. The readable address goes when the lead is deleted.
- A daily sweep deletes rejected leads and leads that finished without a reply after periods set in the settings (proposal, open question 11). Only hashed match keys are kept, so a deleted lead is not offered again.
- Erasing or exporting a lead on request.

Every email carries the footer (company, postal address, unsubscribe). Pending the legal check (open question 9), every email should also carry one line saying where the contact was found, with a link to a privacy notice on the company website.

Alternatives considered:
- **Readable addresses in the do-not-contact list.** Simpler, but keeps personal data indefinitely.
- **Keeping everything.** Breaks the storage-limitation principle.
- **Hosting outside the EU.** Needs transfer safeguards for no benefit.

### Decided later, in their rows

These are not decisions of the kickoff. Each is settled and recorded by its ticket's change.

| Decision | Decided in |
|---|---|
| Hosting provider and region (within the budget), the subdomain's name, staging or not, backup retention | row 2 |
| Package manager, ORM and migrations, job queue library, test runner, lint and format, folder layout, version pins | row 1 |
| Sign-in method (Google sign-in or a passkey, both free) and session length | row 3 |
| Google Maps data source (Google Places API recommended) and what Places content is stored | row 4 |
| Matching rules for duplicates (for example ignoring link-in-bio and social domains as website keys) | row 4 |
| Instagram data source, and which Instagram account holds the API token | row 7 |
| Prompts, the measured cost, and whether Haiku 5.5 holds or a fallback model is needed | row 8 |
| Email lookup service (free tier only) | row 9 |
| How "a small online store" and "own merch" are judged | row 11 |
| When messages are written (at approval or just before each step) | row 15 |
| Mailbox protocol and credentials | row 16 |
| Unsubscribe token format and confirmation page | row 17 |
| Spacing between sends, the default daily total limit, and what "a day" means for the limits | row 18 |
| Reply matching, and whether auto-replies count as replies | row 19 |
| Retention periods | row 24, after the client answers open question 11 |
| Warm-up schedule and go-live checks | row 25 |

## Risks / Trade-offs

- [Google's terms restrict storing Places content] → Store place IDs; refresh other content when shown or replace it with facts from the lead's website; row 4 checks the current terms.
- [Meta refuses or narrows Instagram API access] → Instagram facts become optional; leads still come from Google Maps, pasted links and websites.
- [Poor delivery from a new domain] → Low limits, spaced sends, a warm-up (row 25), plain emails without tracking, a bounce stop, the pause switch; SPF, DKIM and DMARC belong to the mailbox ticket.
- [The one-hour window caps how many emails go to one time zone] → About 30 to 60 emails per zone per day with spacing, above the planned volume; widening the window is a setting change if the client asks.
- [The AI writes something untrue or odd] → Facts-only writer fed structured facts, output checks, owner-edited templates, and the owner can see emails before they go (open question 6).
- [Instructions hidden in a lead's page steer the AI] → Two-step pipeline; raw text never reaches the writer; output checks.
- [A crash causes a double send] → Unique (lead, step) row, claim before sending, "unknown" results never resent automatically.
- [A reply is missed (sent from another address, or by Instagram)] → Match by thread headers, then by sender domain; the owner can record a reply; the inbox is read right before each send.
- [Time zone and daylight-saving errors] → IANA time zones, conversion by a library, tests around clock changes.
- [The website reader is used to reach internal addresses] → Private and link-local addresses blocked, size and time limits, few redirects.
- [Rules differ between markets] → Legal review (open question 9); the active markets setting can exclude countries.
- [A single developer] → `okf/` concepts and runbooks, small modules, tests.
- [Costs creep up past €10 a month] → Small volume, a spend cap on the AI account, budget alerts on the host, cost measured in row 8.
- [A self-run server and database need upkeep] → Automatic security updates, a daily backup off the server, a restore runbook tested in row 2.

## Migration Plan

Greenfield: nothing to migrate. Work follows the backlog order. Production runs in dry-run from row 2 until row 25: every email goes to an internal test address. Go-live (row 25): the real mailbox is connected, the company details are set, warm-up limits are low, test sends go to seed addresses, then dry-run is turned off. Rollback: the pause switch stops all sending at once; database backups restore data; a release is undone by redeploying the previous image.

## Open Questions

The questions for the reviewers and the client are in proposal.md (Open questions). The points left to later tickets are in "Decided later, in their rows" above.
