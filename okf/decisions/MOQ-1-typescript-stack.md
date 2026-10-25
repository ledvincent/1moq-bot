---
type: Decision
title: TypeScript on Node.js with Fastify and React, one deployable
description: TypeScript everywhere on the current Node.js LTS, a Fastify API serving a React UI built with Vite, web server and job worker in one container, so one language covers the UI, the API and the jobs
owner: ledvincent
status: stable
tags: [architecture, stack, kickoff]
---
# TypeScript on Node.js with Fastify and React, one deployable

Date: 2026-10-25 · Jira: MOQ-1 · Change: `openspec/changes/archive/moq-1-kickoff-2026-10-25/`

## Context

A single-user web tool with a swipe UI, a JSON API and long-running background jobs (research, writing, a scheduler that sends email). One developer builds and maintains it, possibly remotely. The sources are APIs (Google Places, the Instagram Graph API, Anthropic), so scraping libraries are not needed. The sequence and the send gate are state machines that benefit from types.

## Decision

TypeScript everywhere, on the current Node.js LTS. Fastify serves the JSON API and the built UI. The UI is a React single-page app built with Vite. One repository and one container image run the web server and the job worker in one process, which can be split into two processes later without code changes. The package manager, ORM and migrations, job queue library, test runner, lint and format tools, and version pins are chosen in row 1 and listed in [Tech stack](/architecture/tech-stack.md).

Why: one language for the UI, the API and the jobs; official SDKs exist for Anthropic and Google, and there are mature libraries for sending and reading mail; a typed state machine suits the sequence and the send gate; a single process to host.

## Alternatives considered

- **Python** (FastAPI with React or HTMX). Strong data tooling, but two languages with React, and its scraping strengths are not needed since the sources are APIs.
- **Next.js.** UI and API in one framework, but the scheduler still needs a separate long-running worker, and server components add little to a single-user app.
- **Rails 8 or Laravel.** Mail, jobs and sign-in built in, so a good fit, but it depends on the maintainer's skills.
- **No-code** (a spreadsheet database, an automation tool and a cold-email service). Fast to start, but the swipe review, the approval gate and the per-type AI writing still need custom code, at a monthly fee per tool.

## Consequences

- One toolchain and one CI pipeline; fakes for every external service are written in the same language as the code.
- The versions and libraries are not pinned yet: row 1 does it.
- Open question 14 (the Tech lead confirms the developer who will maintain the tool is comfortable with TypeScript, or names another stack) has no answer at the time of writing. If another stack is chosen, a new decision supersedes this one before row 1 starts.
