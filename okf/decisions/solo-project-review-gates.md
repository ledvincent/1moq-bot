---
type: Decision
title: "Solo project: review gates are warnings"
description: While one person builds 1moq-bot, the Dirox PR check reports the QC, code review and design gates as warnings instead of blocking the merge; the other Dirox checks still block
owner: vincent.ledreau@dirox.net
status: deprecated
tags: [workflow, ci]
---
# Solo project: review gates are warnings

Superseded by [Review gates block merges again](/decisions/dirox-kit-3-2-0-review-gates-block-merges.md).

Date: 2026-11-03 · Jira: none (kit setup, `chore/dirox-kit-2.1.5`)

## Context

Dirox kit 2.1 makes every PR that changes code wait for a QC approval and a code review from two different people other than the author, and a big change for a design approval. 1moq-bot is built by one person, with two GitHub accounts (`vincentld-dirox` opens PRs, `ledvincent` owns the repository), so the QC and code review gates could never both pass.

## Decision

- `.github/workflows/dirox-checks.yml` does not pass `PR_NUMBER` or `GITHUB_TOKEN` to `pr-check.mjs`. Without them the script cannot read the reviews and reports the three gates as warnings.
- Every other check still blocks: the Knowledge section, decision records, archived and verified changes, tests named after scenarios and test cases, the test case files.
- `.github/qc-reviewers`, `design-reviewers` and `code-reviewers` keep `ledvincent`, so the commands still know whom to ask when a review is wanted.
- The workflow is a kit file: `/dirox-techlead:setup-project` puts the kit's version back, so the two lines are removed again after each setup.

## Consequences

- PRs merge without approvals. The kit's commands still verify and pre-review each change.
- When a second person joins, put the two env lines back (or rerun `/dirox-techlead:setup-project`), list them in the reviewer files and retire this decision.
