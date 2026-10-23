---
type: Integration
title: Jira
description: How this project's Jira is set up - project key, where acceptance criteria live, issue types, the status for each stage, the dependency link type and the ticket labels; read by /dirox-kit:jira and the other commands
owner: vincentld-dirox
status: stable
resource: https://dirox.atlassian.net/browse/MOQ
tags: [jira]
---
# Jira

## Project
- Site: `dirox.atlassian.net` (cloud ID `95d0c454-e898-47cf-ae79-94d5aee722c2`)
- Project key: `MOQ` (project name "1MOQ", team-managed)
- Kickoff epic: `MOQ-1`

## Acceptance criteria
- Where: description, under the heading "Acceptance criteria"
- Format: bullet list

## Issue types
| Use | Issue type |
|---|---|
| Feature ticket | `Story` |
| Small fix | `Task` (`Bug` for a defect) |
| Bug found by QC | `Subtask` |
| QC check after merge (`qc:after-merge` tickets) | `Task` |
| Group of tickets | `Epic` |

## Status for each stage
The workflow has only `To Do`, `In Progress` and `Done`.

| Stage | Jira status |
|---|---|
| Ticket ready to start | `To Do` |
| Proposal approved | `To Do` (no separate status) |
| Being built | `In Progress` |
| QC testing (optional, `qc:required` tickets) | none |
| PR ready for review | `In Progress` (no separate status) |
| Merged | `Done` (moved by the Done rule in the kit's `docs/jira.md`, or by people) |

## Dependencies
- Link type: `Blocks` (outward `blocks`, inward `is blocked by`)

## Ticket labels
| What | Where | Values |
|---|---|---|
| Source | label | `src:kickoff`, `src:claude`, `src:pm` |
| Capability | label `cap:<capability>` | the capability name, as in `openspec/specs/`, or `tooling` for work outside the specs |
| Size | label `size:<value>` | `trivial`, `normal`, `big` |
| Difficulty | label `difficulty:<value>` | `routine`, `tricky` |
| QC | label `qc:<value>` | `required` (QC tests the PR's build and approves it before merge), `after-merge` (no PR build: QC tests after the merge, a QC check ticket holds back the release), `none`; set by the PM |

## Conventions
- Labels or components the team uses: none yet (no components, no labels on tickets)
- Proposal review turnaround: 2 working days
- Started before the baseline: none
