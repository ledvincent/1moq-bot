## Ticket
Jira: <!-- PROJ-123 -->
Size: <!-- trivial · normal · big -->
OpenSpec change: <!-- openspec/changes/<change>/ (or archive/<change>-<date>/ once closed); "none" for a trivial change -->

## What changed
<!-- Two or three lines. -->

## Scenarios and tests
<!-- One row per spec scenario. Trivial change: the tests that cover it. -->
| Requirement | Scenario | Test |
|---|---|---|

## Test cases
<!-- From test-cases/<KEY>.md and the verification. First line: "QC: required" or "QC: none".
     One row per case; a manual case shows "QC" as its test. With QC required, CI waits for a QC reviewer's approval. -->
| Case | Title | Proof | Test | Result |
|---|---|---|---|---|

## Knowledge (okf/)
<!-- The okf/ files added, updated or deprecated, or "No OKF change: <reason>". /dirox-kit:close-change fills it; CI fails when it is empty.
     A decision marked "Decision record needed" that is not recorded: one "No decision record: <decision> - <reason>" line. -->

## Model use
<!-- Filled by /dirox-kit:close-change: each agent run from openspec/changes/<change>/model-use.md (model, effort, escalations), then the tokens measured on this ticket's branches. -->

## Checklist
- [ ] Big change only: proposal PR merged before code, BA and Architect approved
- [ ] Every scenario has a test whose name contains the scenario name
- [ ] `/dirox-kit:verify` has no blocking findings (not needed for trivial)
- [ ] OKF retro done, and the Dirox CI checks pass (`specs-and-knowledge`, `pr-checks`)
- [ ] OpenSpec change archived (not needed for trivial)

## Follow-ups
<!-- Work found but not done, as suggested Jira tickets. -->
