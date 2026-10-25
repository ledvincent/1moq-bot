# Knowledge log

## 2026-10-25
* **Added**: [Architecture overview](/architecture/overview.md) - MOQ-1 kickoff foundation: modules, data flow, external services, deployment.
* **Added**: [Tech stack](/architecture/tech-stack.md) - MOQ-1 kickoff: TypeScript, Fastify, React, PostgreSQL; pins left to row 1.
* **Added**: [The page is served by an always-on web service in the cloud](/decisions/MOQ-1-cloud-web-service.md) - MOQ-1 kickoff decision D1.
* **Added**: [TypeScript on Node.js with Fastify and React, one deployable](/decisions/MOQ-1-typescript-stack.md) - MOQ-1 kickoff decision D2.
* **Added**: [PostgreSQL is the only data store and holds the job queue](/decisions/MOQ-1-postgresql-store-and-queue.md) - MOQ-1 kickoff decision D3.
* **Added**: [Every email is checked by the send gate at the moment it is sent](/decisions/MOQ-1-send-gate.md) - MOQ-1 kickoff decision D4.
* **Added**: [Send and read through the company mailbox, plain personal emails, no tracking](/decisions/MOQ-1-company-mailbox-sending.md) - MOQ-1 kickoff decision D5.
* **Added**: [Lead sources only through official or provider APIs, never the company's Instagram account](/decisions/MOQ-1-lead-source-policy.md) - MOQ-1 kickoff decision D6.
* **Added**: [Claude through the Anthropic API profiles, classifies and writes](/decisions/MOQ-1-claude-for-ai.md) - MOQ-1 kickoff decision D7.
* **Added**: [Personal data: EU hosting, minimal data, hashed do-not-contact list, retention](/decisions/MOQ-1-personal-data-handling.md) - MOQ-1 kickoff decision D8.
* **Added**: [Lead](/domain/lead.md) - MOQ-1 kickoff domain term.
* **Added**: [Client types](/domain/client-types.md) - MOQ-1 kickoff domain term; associations wait for open question 13.
* **Added**: [Qualification rules and fit level](/domain/qualification-rules.md) - MOQ-1 kickoff domain term.
* **Added**: [Markets](/domain/markets.md) - MOQ-1 kickoff domain term.
* **Added**: [Outreach sequence](/domain/outreach-sequence.md) - MOQ-1 kickoff domain term, as revised in the feature review.
* **Added**: [Lead status](/domain/lead-status.md) - MOQ-1 kickoff domain term.
* **Added**: [Base templates](/domain/base-templates.md) - MOQ-1 kickoff domain term; email bases wait for open question 7.
* **Added**: [Do-not-contact list](/domain/do-not-contact-list.md) - MOQ-1 kickoff domain term.
* **Added**: [Google Maps](/integrations/google-maps.md) - MOQ-1 kickoff integration; source settled by open question 3 or row 4.
* **Added**: [Instagram](/integrations/instagram.md) - MOQ-1 kickoff integration; source settled by open question 4 or row 7.
* **Added**: [Anthropic Claude](/integrations/anthropic-claude.md) - MOQ-1 kickoff integration.
* **Added**: [Company mailbox](/integrations/company-mailbox.md) - MOQ-1 kickoff integration; protocol in row 16.
* **Added**: [lead](/data/lead.md) - MOQ-1 kickoff data entity.
* **Added**: [outbound_message](/data/outbound-message.md) - MOQ-1 kickoff data entity.

## 2026-10-22
* **Created**: [Jira](integrations/jira.md) - this project's Jira settings, by /dirox-kit:jira setup.
* **Created**: the knowledge bundle, by /dirox-kit:setup-project.
