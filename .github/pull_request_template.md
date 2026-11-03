
## Ticket
Jira: <!-- PROJ-123 -->
Size: <!-- trivial · normal · big -->
OpenSpec change: <!-- openspec/changes/<change>/ (or archive/<change>-<date>/ once closed); "none" for a trivial change -->

## What changed
<!-- Two or three lines. -->

## How to test
<!-- For QC, filled by /dirox-dev:implement when the PR is marked ready; CI warns when it is empty.
     - Build: the preview URL, or the local commands (okf/integrations/qc.md)
     - Test accounts and data: by name only, never passwords or keys
     - Manual cases to run: from test-cases/<KEY>.md (a trivial change: the smoke test)
     - What changed for the user, in two lines -->

## Scenarios and tests
<!-- One row per spec scenario. Trivial change: the tests that cover it. -->
| Requirement | Scenario | Test |
|---|---|---|

## Test cases
<!-- From test-cases/<KEY>.md and the verification. One row per case; a manual case shows "QC" as its test.
     CI waits for a QC reviewer's approval on every PR that changes code. -->
| Case | Title | Proof | Test | Result |
|---|---|---|---|---|

## Knowledge (okf/)
<!-- The okf/ files added, updated or deprecated, or "No OKF change: <reason>". /dirox-dev:close-change fills it; CI fails when it is empty.
     A decision marked "Decision record needed" that is not recorded: one "No decision record: <decision> - <reason>" line. -->

## Model use
<!-- Filled by /dirox-dev:close-change: each agent run from openspec/changes/<change>/model-use.md (model, effort, escalations), then the tokens measured on this ticket's branches. -->

## Checklist
- [ ] Big change only: a design reviewer approved the proposal before any code
- [ ] Every scenario has a test whose name contains the scenario name
- [ ] `/dirox-qc:verify` has no blocking findings (not needed for trivial)
- [ ] OKF retro done, and the Dirox CI checks pass (`specs-and-knowledge`, `pr-checks`)
- [ ] OpenSpec change archived (not needed for trivial)

## Follow-ups
<!-- Work found but not done, as suggested Jira tickets. -->
