---
type: Integration
title: Jira
description: How this project's Jira is set up - project key, where acceptance criteria live, issue types, the status for each stage, the dependency link type and the ticket labels; read by /dirox-core:jira and the other commands
owner: vincent.ledreau@dirox.net
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
| Group of tickets | `Epic` |

## Status for each stage
The workflow has only `To Do`, `In Progress` and `Done`.

| Stage | Jira status |
|---|---|
| Ticket ready to start | `To Do` |
| Being built | `In Progress` |
| QC testing (optional) | none |
| PR ready for review | `In Progress` (no separate status) |
| Merged | `Done` (moved by the Jira automation in the kit's `jira-done-rule.md`, or by people) |

## Dependencies
- Link type: `Blocks` (outward `blocks`, inward `is blocked by`)

## Ticket labels
| What | Where | Values |
|---|---|---|
| Source | label | `src:intent`, `src:kickoff`, `src:claude`, `src:pm` |
| Feature | label `cap:<feature>` | the feature name, as in `openspec/specs/`, or `tooling` for work outside the specs |
| Size | label `size:<value>` | `trivial`, `normal`, `large` (`big`, written before 3.0.0, reads as `large`) |
| Difficulty | label `difficulty:<value>` | `routine`, `tricky` |

## Fields
- Story points: none (no story points field in the project; points come from the size labels, trivial 1, normal 3, large 8)

## Conventions
- Labels or components the team uses: none yet (no components, no labels on tickets)
- Review turnaround: 2 working days
- Started before the baseline: none
