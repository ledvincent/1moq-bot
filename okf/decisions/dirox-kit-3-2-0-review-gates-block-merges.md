---
type: Decision
title: "Review gates block merges again"
description: The QC, code review and design gates of the Dirox PR check block the merge again, because the project now has a second account (ledvincent) for QC and review besides the developer account (vincentld-dirox)
owner: vincent.ledreau@dirox.net
status: stable
tags: [workflow, ci]
---
# Review gates block merges again

Date: 2026-11-12 · Jira: none (kit setup, `chore/dirox-kit-3.2.0`)

Supersedes [Solo project: review gates are warnings](/decisions/solo-project-review-gates.md).

## Context

The earlier decision turned the QC, code review and design gates into warnings because one person built the project and the gates could never pass. The project now works with two GitHub accounts: `vincentld-dirox` develops and opens the PRs, and `ledvincent` does the QC, the code review and the design approval.

## Decision

- `.github/workflows/dirox-checks.yml` is the kit's 3.2.0 version again, with `PR_NUMBER` and `GITHUB_TOKEN` passed to `pr-check.mjs`. The QC, code review and design gates block the merge.
- `.github/qc-reviewers`, `code-reviewers` and `design-reviewers` list `ledvincent`.
- A PR passes with the approval of `ledvincent`, or with a `Self-reviewed:` line in its description, as the kit allows on a small team (never on a large ticket).

## Alternatives considered

- Keep the gates as warnings (remove the two env lines after each setup): rejected, since a second account now exists to approve.

## Consequences

- Every PR that changes code needs `ledvincent`'s approval, given after testing and still covering the final code. A large change also needs the design approval before any code.
- Setting up the kit again keeps the workflow as the kit ships it, with no manual edit to redo.
