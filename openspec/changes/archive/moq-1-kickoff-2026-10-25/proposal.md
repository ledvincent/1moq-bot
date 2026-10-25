Jira: MOQ-1
Size: big

# Proposal: lead finder and cold-outreach tool for 1moqcustom (kickoff)

## Why

1moqcustom makes custom clothing and accessories in Vietnam in small runs (from 1 piece, typically 50 to 300) for small businesses that large factories turn away. Today the owner finds leads by hand on Google Maps and Instagram, logs them in a spreadsheet and emails them one by one. This project automates finding and researching leads and sending personalised emails and follow-ups, while the owner keeps the final say on who is contacted. The client's acquisition plan (deck "Reach out plan", confidential, not stored in the repo) supplies the client types, the qualification rules, the outreach sequence and the volumes summarised below.

## What Changes

### In scope

- **Find leads** on Google Maps by type of business and city, and add leads from an Instagram profile or a website link. One lead per business, whatever the source.
- **Research each lead**: contact email (from its own website first), what it does, size, location and time zone, Instagram followers and last post, owner or founder name, whether it already has its own merch, and the language to write in. Every fact keeps its source; unknown facts stay unknown.
- **Qualify each lead**: client type (13 types, summarised below) and a fit level (good, possible, poor) from the five qualification rules, plus a flag for leads outside the active markets.
- **Swipe review**: one lead per screen with its facts and pictures; swipe right to approve, left to reject. Nothing is approved automatically.
- **AI-written emails**: from a base template per client type, step and language, plus the lead's facts; English, or French for French-speaking leads. Every email has a personal line built from recorded facts.
- **Automatic sending** from the company mailbox to approved leads: intro on day 1, follow-ups on days 6 and 12, last email on day 21, counted from the day the intro went out. Each email goes out in its client type's one-hour window in the lead's time zone (8 to 9 am for cafés, bars and restaurants, and breweries, 9 to 10 am for the rest, editable), Monday to Friday, plus Saturday for the types whose Saturday switch is on, never on Sunday, within a daily limit (25 new emails a day by default; the deck says 20 to 30). The owner can send a queued email at once with Send now. A day-3 Instagram DM is suggested to the owner, who sends it by hand.
- **Stop rules**: sending stops when a lead replies (by email, or by another channel the owner records), unsubscribes or bounces.
- **Compliance**: company name, postal address and an unsubscribe line in every email; one-step unsubscribe; a do-not-contact list that survives data deletion; retention, erasure and export of lead data (GDPR in the EU and UK).
- **Tracking**: each lead's status and history, and the results (leads found and approved, emails sent, replies and reply rate, opt-outs, bounces), by client type and market.
- **Access**: the owner opens the tool in the Mac's browser from a bookmark or Dock icon, with no terminal; only the owner can sign in.
- **Low running costs**: at most €10 a month for everything the tool runs on, the company mailbox excluded.

### Out of scope

- Setting up the company mailbox and domain (a separate ticket, outside this epic; it blocks real sending, see Impact).
- Sending Instagram DMs, follows or likes automatically, or any automation of the company's Instagram account.
- Finding Instagram accounts by hashtag or place through a paid data provider (over the budget).
- Mockups, quotes, orders and production tracking.
- Other lead sources named in the deck (Shopify, Etsy, LinkedIn); the source design allows adding them later.
- A/B testing of subject lines (deck, weeks 3 to 8), saved searches that run on their own, and open or click tracking.

## Capabilities

### New Capabilities

- `lead-sourcing`: finding businesses on Google Maps and Instagram (or by hand), one lead per business, without using the company's Instagram account.
- `lead-enrichment`: gathering each lead's contact email and facts (what it does, size, location, time zone, language, social presence, own merch), each with its source.
- `lead-qualification`: client type, fit level against the qualification rules, and the active markets.
- `lead-review`: the swipe review where the owner approves or rejects each lead.
- `email-writing`: base templates per client type, step and language, and the AI personalisation from the lead's facts.
- `outreach-sending`: the outreach sequence, the send window and sending days per client type, Send now, the daily limits, sending through the company mailbox, and the stop rules.
- `outreach-compliance`: legal footer, unsubscribe, the do-not-contact list, and the handling of leads' personal data.
- `outreach-tracking`: lead status, lead list and history, and the results.
- `user-access`: opening the tool without a terminal, and sign-in for the owner only.

### Modified Capabilities

None (no specs exist yet).

## What the plan takes from the client deck

**Client types.** Each type decides the products proposed, the base template and the hook. Past clients named in the deck are left out here; which ones emails may mention is an open question.

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
| Associations | Named in the brief, not described in the deck | - | - | - |

**Qualification rules** (deck: "email a lead only if it..."): already sells or wears its own merch; has 2,000 to 50,000 Instagram followers; runs 1 to 10 locations or a small online store; posted in the last 30 days; has an owner or founder who can be named.

**Markets.** Phase 1: EU, UK, Australia. Phase 2: Singapore. Phase 3: United States. Write in French to France, Belgium and Switzerland; English elsewhere.

**Sequence and volume.** Day 1 intro email (one personal line, one photo of similar work); day 3 Instagram DM by hand; day 6 follow-up (free mockup with their logo); day 12 follow-up (past work, MOQ and lead time); day 21 last email (ask in one line whether to close their file). 20 to 30 new emails a day at most, about 50 new leads a week planned, sent at 9 to 10 am in the buyer's city.

**Templates.** The deck has Instagram DM bases per client group in English and French; the email bases for the four email steps still have to be written (open question 7).

**Results.** The deck measures emails sent, replies, mockups, samples and orders. This plan counts up to replies; later stages are out of scope unless the owner wants to mark them by hand (open question 10).

## Backlog

Every row is new (the epic has no child tickets yet). `#` is the row number used in "Depends on" until the tickets get Jira keys. "External" is the mailbox and domain ticket, which is outside this epic. Rows 27 and 28 are only needed if the client picks that option in the open questions. Row 26 (an Instagram data provider) was dropped for the budget; the other numbers are kept.

| # | Jira | Title | Size | Depends on | Capability |
|---|---|---|---|---|---|
| 1 | new | Project scaffold: web service, UI shell, database, job queue, tests and CI | normal | - | tooling |
| 2 | new | Cloud deployment: small EU server with PostgreSQL (within €10 a month), subdomain and HTTPS, secrets, off-server backups, dry-run mode | big | 1 | tooling |
| 3 | new | Owner sign-in (free method), and opening the tool from the Mac's Dock | big | 2 | user-access |
| 4 | new | Find leads on Google Maps by type of business and city (lead record, duplicates) | big | 1 | lead-sourcing |
| 5 | new | Add a lead by hand from an Instagram profile or a website link | normal | 4 | lead-sourcing |
| 6 | new | Read each lead's website: contact email, Instagram link, shop pages, language, time zone | big | 4 | lead-enrichment |
| 7 | new | Instagram profile facts: followers, last post, recent posts | big | 6 | lead-enrichment |
| 8 | new | AI profile of each lead: what it does, owner name, own-merch evidence (first AI use) | big | 7 | lead-enrichment |
| 9 | new | Email lookup fallback and address check through a lookup service's free tier (dropped if it does not help) | big | 6 | lead-enrichment |
| 10 | new | Client type for each lead, with its reason and the owner's correction | normal | 8 | lead-qualification |
| 11 | new | Fit level from the five qualification rules, and the active markets | normal | 10 | lead-qualification |
| 12 | new | Swipe review: one lead per screen, approve or reject, best fit first | normal | 11 | lead-review |
| 13 | new | Pictures of the business on the review card | normal | 12 | lead-review |
| 14 | new | Base templates per client type, step and language (English, French), editable by the owner | normal | 10 | email-writing |
| 15 | new | AI-written emails from the template and the lead's facts, with output checks | normal | 14 | email-writing |
| 16 | new | Connect the company mailbox: send, save to sent mail, read the inbox | big | 1, External (a test mailbox until then) | outreach-sending |
| 17 | new | Legal footer, one-step unsubscribe and the do-not-contact list | big | 2 | outreach-compliance |
| 18 | new | Send the intro email to approved leads in their client type's window and sending days, within the daily limit, with Send now and a pause switch | big | 12, 15, 16, 17 | outreach-sending |
| 19 | new | Stop the sequence on reply, bounce or opt-out, read from the mailbox or recorded by the owner | big | 18 | outreach-sending |
| 20 | new | Follow-ups on days 6, 12 and 21 | normal | 19 | outreach-sending |
| 21 | new | Day-3 Instagram DM reminder and the list of leads to contact by hand | normal | 20 | outreach-sending |
| 22 | new | Lead list, status and history | normal | 12 | outreach-tracking |
| 23 | new | Results for a period, by client type and market | normal | 22, 19 | outreach-tracking |
| 24 | new | Personal data: retention periods, erasure and export on request | normal | 17 | outreach-compliance |
| 25 | new | Go live: launch runbook, warm-up limits, test sends, dry-run off | trivial | 3, 19, External | tooling |
| 27 | new | (If chosen) Read and edit the intro email on the review card before approving | normal | 13, 15 | lead-review |
| 28 | new | (If chosen) Mark a replied lead's outcome (mockup, sample, order) and count it in the results | normal | 23 | outreach-tracking |

Notes on the backlog:
- **Split rows.** No existing ticket was split (there were none). The feature areas were cut so each row fits one PR: enrichment is four rows (website, Instagram, AI profile, lookup service) and sending is five (mailbox, intro, stop rules, follow-ups, DM reminder).
- **Same capability, no dependency.** Rows 7 and 9 both touch `lead-enrichment` and can run side by side: row 7 changes only the profile facts requirement and row 9 only the contact email requirement. Every other pair on one capability is ordered by a dependency.
- **Order of the sending rows.** The stop rules (row 19) come before the follow-ups (row 20), so no follow-up can be built that ignores a reply. Production stays in dry-run until row 25.
- **Labels.** Each ticket gets `src:kickoff`, `cap:<capability>` and `size:<size>`, as set in `okf/integrations/jira.md`.

## Impact

- **Code.** All new: one TypeScript web service with a React UI and a PostgreSQL database (see design.md). There is no existing code.
- **External services.** A small EU server running the service and its database; Google Maps data (Google Places API recommended); Instagram data (the official Instagram Graph API recommended); an AI provider (Claude Haiku 5.5 through the Anthropic API); the company mailbox; optionally an email lookup service's free tier. Each one is a data processor to list for GDPR.
- **Running costs.** At most €10 a month, the company mailbox excluded: about €4 to 5 for the server, about €1 for backups, a few euros at most for AI, and Google Maps calls likely inside Google's free monthly usage. Row 2 and row 8 confirm these figures before anything is bought.
- **Dependency outside this epic.** The mailbox and domain ticket blocks real sending (rows 16 and 25). Rows 1 to 24 can be built and tested against a test mailbox.
- **People.** The owner reviews leads, edits the templates and answers replies in the mailbox. The developer builds and maintains the tool and holds the API keys.
- **Repo.** `okf/` gets the architecture, decisions, domain terms, integrations and data concepts; `.claude/CLAUDE.md` and `.github/CODEOWNERS` are filled (foundation tasks).

## Open questions

1. **Where the service runs.** (a) In the cloud, always on, EU region (recommended): emails go out at 9-10 am in the buyer's city while the Mac is off, the unsubscribe link always works, and the developer updates it remotely. Costs a monthly fee. (b) On the owner's Mac: free, but nothing is sent while the Mac sleeps (9 am in Sydney is about 5-6 am in Vietnam, 9 am in New York about 8-9 pm), installing and updating needs the developer on the Mac, and losing the laptop loses the do-not-contact list. (c) Both: page and data on the Mac, sender in the cloud; two copies of the data, the most complex. The plan assumes (a). With (b), rows 2 and 3 change and unsubscribing works by reply only. **Answered in the feature review (2026-10-23): (a), on a small EU server within the budget of question 2.**
2. **Budget for paid services.** Which of these may cost money each month: hosting and database (needed with option 1a), Google Maps data, AI calls, an email lookup service (row 9)? A cold-email service could replace rows 16 to 21 for a monthly fee; we recommend building them instead, since the volume is small. **Answered in the feature review (2026-10-23): at most €10 a month for everything, the company mailbox excluded; no paid lookup service or Instagram data provider.**
3. **Google Maps data.** (a) Google's official Places API (recommended; within Google's terms, which limit how long some data may be stored). (b) A scraping data provider: cheaper per result but against Google's terms.
4. **Instagram data.** (a) The official Instagram API (recommended first): followers, bio and recent posts for business accounts whose handle we already have (from their website or pasted by the owner); needs a professional Instagram account linked to a Facebook Page. Should it be the company's account or a separate one? (A paid data provider to find accounts by hashtag or place was dropped for the budget.)
5. **Email lookup.** (a) The lead's own website only (free). (b) Also the free plan of a lookup service such as Hunter (more addresses and owner names; row 9). A paid plan is over the budget.
6. **Reading emails before they go out.** (a) The review card shows the intro email; approving the lead approves it, and the owner can edit it (recommended, row 27). (b) The owner approves the lead only; emails go out as written. (c) A separate review of each email before it is sent.
7. **Email base templates.** The deck has DM bases only. (a) We draft the English and French email bases from the DM bases and the deck's sequence, and the owner edits them in the tool (recommended). (b) The owner or a copywriter supplies them. Also: which past clients agreed to be named in emails (the deck plans to ask three), and the photo of similar work in the intro: an image in the email, or a link to a gallery?
8. **Company details for the footer.** The company's legal name, postal address and sender name, and the address of a privacy notice on the company website.
9. **Legal check per market.** Rules for B2B cold email differ between the target markets: for example, the UK treats sole traders like consumers, Germany is strict about unsolicited B2B email, Australia relies on consent inferred from a published business address, and Singapore has rules for unsolicited bulk email. (a) A short legal review before go-live, then exclude countries or kinds of business as advised (the active markets setting supports this) (recommended). (b) Go live in all phase-1 markets on the basic rules only, with the risk on the client. Also: should Switzerland be an active market (not in the EU, but in the deck's French-language list)?
10. **Results beyond replies.** Mark a replied lead's outcome by hand (mockup, sample, order) so the results show the deck's whole funnel (row 28), or stop at replies?
11. **Retention periods.** Suggested: rejected leads deleted after 30 days, leads that never replied deleted 12 months after their last email, opt-outs kept for good as an unreadable fingerprint of the address. Confirm or change.
12. **Daily limits and sending domain** (inputs to the separate mailbox ticket). 25 new emails a day by default, and a total limit with follow-ups included (suggested: 50 a day). Send from the main company domain, or from a separate outreach domain to protect the main one? Which mailbox provider (Google Workspace, Microsoft 365, other)?
13. **Associations.** They are in the brief but not in the deck: what do they buy, who decides, and what is the hook?
14. **Stack fit (Tech lead).** The plan picks TypeScript (design.md, D2). Confirm the developer who will maintain the tool is comfortable with it, or name the stack they prefer.

## Not in Jira yet

The epic MOQ-1 has no acceptance criteria, so every scenario in `specs/` (9 capabilities) is new to Jira. Under the kit's just-in-time rule, they are not copied into the epic: each feature ticket gets its acceptance criteria from these scenarios when it starts (`/dirox-kit:start-change`).

## Criteria coverage

The epic has no WHEN/THEN criteria. The table maps each point of its description to the requirements that cover it.

| Epic point (MOQ-1 description) | Covered by | Source |
|---|---|---|
| 1. Find leads on Google Maps and Instagram, e.g. by type of business and city | `lead-sourcing`: Search Google Maps by business type and city; Add a lead from an Instagram profile or website; One lead per business | Jira |
| 2. Find the email and what can be known (what they do, size, location, social presence, own merch) | `lead-enrichment`: Find a contact email; Gather the lead's profile; Language; Time zone | Jira |
| 2. Classify by client type and flag the fit | `lead-qualification`: Client type; Fit rules; Fit level; Active markets | Jira, deck (qualification rules) |
| 3. Swipe review, one lead per screen with pictures | `lead-review`: One lead per screen; Pictures of the business; Swipe to decide; Best leads first | Jira |
| 4. AI emails from a base template and the lead's facts, in English or French | `email-writing`: all requirements | Jira, deck (personal line rule) |
| 5. Automatic sending from the company mailbox, follow-ups included; stop on reply or unsubscribe | `outreach-sending`: Outreach sequence; Send from the company mailbox; Stop on reply; Stop on opt-out or bounce | Jira, deck (sequence days) |
| 6. Status of each lead and overall results | `outreach-tracking`: all requirements | Jira, deck (funnel) |
| Easy for a non-technical person on a Mac, no terminal | `user-access`: Open without a terminal; Stay signed in | Jira |
| How the page and a background service work together; sending while the computer is off | design.md D1 | Jira |
| No email to a lead the owner has not approved | `lead-review`: No automatic approval; Change a decision. `outreach-sending`: Approved leads only. design.md D4 | Jira |
| Google Maps and Instagram terms; the company's Instagram account kept safe | `lead-sourcing`: No use of the company's Instagram account. `lead-enrichment`: Read websites politely. design.md D6 | Jira |
| Company address, unsubscribe, opt-outs honoured, GDPR | `outreach-compliance`: all requirements. design.md D8 | Jira |
| Sending volume low enough to protect the domain | `outreach-sending`: Daily limits; Morning send window; Pause all sending | Jira, deck (20-30 a day) |

Considered, not needed:
- Automatic Instagram DMs, follows and likes: out of scope in the epic, and they would put the company's account at risk.
- Open and click tracking: not asked for, hurts deliverability, and needs consent in the EU and UK (design.md D5).
- Mockup, quote and order tracking: out of scope in the epic (row 28 only counts outcomes the owner marks, if chosen).
- Shopify, Etsy and LinkedIn as sources: not in the epic; can be added later as sources.
- Subject line A/B tests: in the deck, not in the epic.

Open questions left: see "Open questions" above (14).

## Jira acceptance criteria

Read from MOQ-1 on 2026-10-22 18:57
None in Jira
