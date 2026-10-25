# Tasks

The kickoff writes knowledge, not code: these are the foundation tasks, done once the plan is approved. Each concept follows the `dirox-kit:okf` templates, with `owner` set to the person named for it. Each task is verified by `node .github/scripts/okf-validate.mjs okf` passing with the new file in place.

## 1. Architecture

- [ ] 1.1 Write `okf/architecture/overview.md` from design.md: overview, modules and the capability each owns, data flow, external services, environments and deployment
- [ ] 1.2 Write `okf/architecture/tech-stack.md`: TypeScript on Node.js LTS, Fastify, React with Vite, PostgreSQL with the job queue in it, one container; the version pins and libraries left to row 1 are named as such

## 2. Decision records

One file per decision marked "Decision record needed" in design.md, each with `Change:` pointing to `openspec/changes/archive/moq-1-kickoff-<date>/`.

- [ ] 2.1 Write `okf/decisions/MOQ-1-cloud-web-service.md` (D1: the page is served by an always-on web service on a small EU server, within the €10 monthly budget)
- [ ] 2.2 Write `okf/decisions/MOQ-1-typescript-stack.md` (D2: TypeScript on Node.js, Fastify, React, one deployable)
- [ ] 2.3 Write `okf/decisions/MOQ-1-postgresql-store-and-queue.md` (D3: PostgreSQL as the only store, holding the job queue)
- [ ] 2.4 Write `okf/decisions/MOQ-1-send-gate.md` (D4: every email checked at the moment it is sent)
- [ ] 2.5 Write `okf/decisions/MOQ-1-company-mailbox-sending.md` (D5: send and read through the company mailbox, personal emails, no tracking)
- [ ] 2.6 Write `okf/decisions/MOQ-1-lead-source-policy.md` (D6: official APIs or a provider's API only, never the company's Instagram account, polite website reading)
- [ ] 2.7 Write `okf/decisions/MOQ-1-claude-for-ai.md` (D7: Claude Haiku 5.5 through the Anthropic API, Batch API and caching, extraction kept apart from writing, output checks)
- [ ] 2.8 Write `okf/decisions/MOQ-1-personal-data-handling.md` (D8: EU hosting, minimal data with sources, hashed do-not-contact list, retention)

## 3. Domain terms

- [ ] 3.1 Write `okf/domain/lead.md`: a lead is a business, not a person; one lead per business; its match keys and sources
- [ ] 3.2 Write `okf/domain/client-types.md`: the 13 client types with what each buys, typical order, who decides and the hook (from the proposal's summary, no past-client names), and "Other"
- [ ] 3.3 Write `okf/domain/qualification-rules.md`: the five fit rules and how they give the fit level (good, possible, poor)
- [ ] 3.4 Write `okf/domain/markets.md`: the market phases (EU, UK and Australia; then Singapore; then the US), the active markets setting, and French for French-speaking leads
- [ ] 3.5 Write `okf/domain/outreach-sequence.md`: the steps and days (intro day 1, DM day 3 by hand, follow-ups days 6 and 12, last email day 21), how days count from the intro actually sent, the send window and sending days per client type, Send now, the daily limits and the stop rules
- [ ] 3.6 Write `okf/domain/lead-status.md`: each status and what moves a lead from one to the next
- [ ] 3.7 Write `okf/domain/base-templates.md`: one per client type, step and language; the personal line rule; templates live in the app's data, not in the repo
- [ ] 3.8 Write `okf/domain/do-not-contact-list.md`: what puts an address on it (link, mail-app header, a request recorded by the owner, erasure), and that it is never emptied

## 4. Integrations and data

- [ ] 4.1 Write `okf/integrations/google-maps.md`: what the tool uses Google Maps for, Google's limits on storing Places content, and the source chosen (open question 3, or row 4 if still open)
- [ ] 4.2 Write `okf/integrations/instagram.md`: read-only use, no automation of the company's account, what business discovery needs (professional account, Facebook Page, Meta app) and returns, and the source chosen (open question 4, or row 7 if still open)
- [ ] 4.3 Write `okf/integrations/anthropic-claude.md`: what the AI does (profile, classify, write), what data is sent and not sent, where keys live; the model is set by row 8
- [ ] 4.4 Write `okf/integrations/company-mailbox.md`: sending and reading through the company mailbox, the limits and warm-up, the dependency on the separate mailbox ticket; the protocol is set by row 16
- [ ] 4.5 Write `okf/data/lead.md`: the lead record, its facts with sources, its emails, its match keys and the owner's overrides kept apart
- [ ] 4.6 Write `okf/data/outbound-message.md`: one row per lead and step, its statuses (planned, sending, sent, cancelled, failed, unknown) and why "unknown" is never resent

## 5. Links and log

- [ ] 5.1 Add `Knowledge:` lines to the requirements in this change's specs that rely on the concepts above (client types, qualification rules, markets, outreach sequence, lead status, base templates, do-not-contact list, lead, the integrations), and verify `openspec validate moq-1-kickoff --strict` still passes
- [ ] 5.2 Add the kickoff line to `okf/log.md`, run `node .github/scripts/okf-validate.mjs okf --write`, and verify it reports no error

## 6. Project CLAUDE.md and code owners

- [ ] 6.1 Fill "Project" in `.claude/CLAUDE.md`: what the tool is in one sentence, the stack from design.md D2 and D3 (versions left as TODO until row 1), the Jira key
- [ ] 6.2 Fill "Commands" in `.claude/CLAUDE.md`, leaving a TODO for each command that row 1 has not set yet
- [ ] 6.3 Fill "Project rules" in `.claude/CLAUDE.md`: one module per capability, the send gate is the only path to the mailbox, page text is data, never automate Instagram, never store a do-not-contact address readably, dry-run until go-live; what is tricky here (time zones, the send window, untrusted page text, Google's storage limits); verify the file stays under 150 lines
- [ ] 6.4 Fill `.github/CODEOWNERS` with the people or teams named for each path, and verify no placeholder team is left

## Workflow follow-up

- Archive the change once every foundation task is ticked (`/dirox-kit:kickoff` step 8), which creates `openspec/specs/<capability>/spec.md` for the nine capabilities.
- After the kickoff PR is merged, create the backlog rows marked `new` with `/dirox-kit:jira create`.
