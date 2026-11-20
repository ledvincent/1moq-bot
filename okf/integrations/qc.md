---
type: Integration
title: QC
description: How QC gets a build of each PR to test - a preview, or the commands to run it locally; read by /dirox-ticket:build-ticket (the PR's "How to test"), /dirox-core:show-next-step and QC
owner: vincent.ledreau@dirox.net
status: stable
tags: [qc, testing]
---
# QC

<!-- Saved as okf/integrations/qc.md by /dirox-project:set-up-repo or /dirox-project:record-qc-config.
     The commands read the backticked values; keep the "- Label: `value`" form. The QC reviewers,
     whose approval every PR that changes code needs, are in .github/qc-reviewers, where CI reads
     them; the Jira statuses are in okf/integrations/jira.md. -->

## PR builds
- PR build: `local`
- Preview: `none`
- Local: `git switch <PR branch>, pnpm install, pnpm db:up, copy .env.example to .env, pnpm dev (http://localhost:3000)`

QC tests every PR that changes code on this build before it merges, then approves it. There is no way around QC: a project with no preview runs the PR locally.

## Conventions
- `ledvincent` tests and reviews the PRs that `vincentld-dirox` opens; the QC gate blocks the merge (`okf/decisions/dirox-kit-3-2-0-review-gates-block-merges.md`).
