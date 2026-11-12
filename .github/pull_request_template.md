
## Ticket
Jira: <!-- PROJ-123, a link to the ticket: the kit fills it when it opens or updates this PR -->
Size: <!-- trivial · normal · large -->
OpenSpec change: <!-- openspec/changes/<change>/ (or archive/<change>-<date>/ once finished); "none" for a trivial change -->
<!-- Small team, and nobody but you on .github/code-reviewers? Add a line "Self-reviewed: <reason>" here (the reason is required).
     It passes the code review only with review-pr's posted pre-review still covering the code, and never on a large change
     (ask a reviewer from another project). QC still approves; the line is not an approval. -->

## What changed
<!-- Two or three lines. -->

## How to test
<!-- For QC, filled by /dirox-ticket:build-ticket when the PR is marked ready; CI warns when it is empty.
     - Build: the preview URL, or the local commands (okf/integrations/qc.md)
     - Test accounts and data: by name only, never passwords or keys
     - Manual cases to run: from test-cases/<feature>/<KEY>.md (a trivial change: the smoke test)
     - What changed for the user, in two lines -->

## Acceptance criteria
<!-- Filled by /dirox-ticket:finish-ticket: each criterion of the proposal's coverage table, the scenarios that state it, and whether the verification proved them. Trivial change: "none (no behaviour change)". -->
| # | Criterion | Scenarios | Proven |
|---|---|---|---|

## Scenarios and tests
<!-- One row per spec scenario. Trivial change: the tests that cover it. -->
| Requirement | Scenario | Test |
|---|---|---|

## Test cases
<!-- Only when QC wrote test-cases/<feature>/<KEY>.md: one row per case, all QC's to run (automated in QC's own automation, or by hand).
     CI waits for a QC reviewer's approval on every PR that changes code. -->
| Case | Title | Proof |
|---|---|---|

## Tests run
<!-- Filled by /dirox-ticket:finish-ticket: every test command (unit, API, end-to-end) run on the final code with the base branch in, with its counts, and the unit tests that cover the changed logic. -->

## Knowledge (okf/)
<!-- The okf/ files added, updated or deprecated, or "No OKF change: <reason>". /dirox-ticket:finish-ticket fills it; CI fails when it is empty.
     A decision marked "Decision record needed" that is not recorded: one "No decision record: <decision> - <reason>" line. -->

## Claude usage
<!-- Filled by the kit from the ticket's usage log (.dirox/usage/<KEY>.md and .jsonl), and refreshed by each kit command that writes this PR: one row per command run (who, the model and effort of the session and each agent, tokens, agent time), the totals, and a hidden dirox-kit-usage block for the DORA loader. Never edit it by hand. -->

## Checklist
- [ ] Large change only: a design reviewer approved the proposal before any code
- [ ] Every scenario has a test whose name contains the scenario name
- [ ] The changed logic has unit tests, and every test suite passes
- [ ] `/dirox-ticket:check-tests` has no blocking findings (not needed for trivial)
- [ ] OKF retro done, and the Dirox CI checks pass (`specs-and-knowledge`, `pr-checks`)
- [ ] OpenSpec change archived (not needed for trivial)

## Follow-ups
<!-- Work found but not done, as suggested Jira tickets. -->
