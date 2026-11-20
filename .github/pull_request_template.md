
## Ticket
Jira: <!-- PROJ-123, a link to the ticket: the kit fills it when it opens or updates this PR -->
Size: <!-- trivial · normal · large -->
OpenSpec change: <!-- openspec/changes/<change>/ (or archive/<change>-<date>/ once finished); "none" for a trivial change -->
<!-- Small team, and nobody but you on .github/code-reviewers? Add a line "Self-reviewed: <reason>" here (the reason is required).
     It passes the code review only with review-pr's posted pre-review still covering the code.
     QC still approves; the line is not an approval. -->

## What changed
<!-- Two or three lines. -->

## How to test
<!-- For QC, filled by /dirox-ticket:build-ticket when the PR is marked ready; CI warns when it is empty.
     - Build: the preview URL, or the local commands (okf/integrations/qc.md)
     - Test accounts and data: by name only, never passwords or keys
     - Manual cases to run: from test-cases/<feature>/<KEY>.md (a trivial change: the smoke test)
     - What changed for the user, in two lines -->
_Pending: `/dirox-ticket:build-ticket` fills this when it hands the PR to QC._

## Acceptance criteria
<!-- One row per criterion of the proposal's coverage table: the scenarios that state it, and in Proven the tests that prove it, "by hand: <check>", or "no" (from verification.md). /dirox-ticket:plan-ticket lists the rows with "not yet"; /dirox-ticket:build-ticket fills Proven when it hands the PR over; /dirox-ticket:fix-bug and /dirox-ticket:finish-ticket update it when their test check changes it. Trivial change: "none (no behaviour change)". -->
_Pending: `/dirox-ticket:plan-ticket` lists the criteria; `/dirox-ticket:build-ticket` names the test that proves each when it hands the PR over._

## Test cases
<!-- Only when QC wrote test-cases/<feature>/<KEY>.md: one row per case, all QC's to run (automated in QC's own automation, or by hand).
     CI waits for a QC reviewer's approval on every PR that changes code. -->
_Pending: QC writes them with `/dirox-ticket:write-test-cases` (or says none are needed)._

## Tests run
<!-- Filled by /dirox-ticket:build-ticket when it hands the PR over: a first line "Run at <short sha> (<what ran them>)", the commit the results come from; then every test command (unit, API, end-to-end, QC automation) with its counts, or "not run: <why>"; then the unit tests that cover the changed logic.
     /dirox-ticket:fix-bug and /dirox-ticket:finish-ticket rewrite it when they run the suites again. -->
_Pending: `/dirox-ticket:build-ticket` lists every test suite's result when it hands the PR over._

## Knowledge (okf/)
<!-- The okf/ files added, updated or deprecated, or "No OKF change: <reason>". /dirox-ticket:build-ticket fills it when it hands the PR over; /dirox-ticket:finish-ticket adds what a fix after the hand-over brought. CI fails when it is empty.
     A decision marked "Decision record needed" that is not recorded: one "No decision record: <decision> - <reason>" line. -->
_Pending: `/dirox-ticket:build-ticket` decides it in the knowledge retro when it hands the PR over. Until then CI reads this as no OKF change._

## Claude usage
<!-- Filled by the kit from the ticket's usage log (.dirox/usage/<KEY>.md and .jsonl), and refreshed by each kit command that writes this PR: one row per command run (who, the model and effort of the session and each agent, tokens, agent time), the totals, and a hidden dirox-kit-usage block for the DORA loader. Never edit it by hand. -->

## Checklist
- [ ] Every scenario has a test whose name contains the scenario name
- [ ] The changed logic has unit tests, and every test suite passes
- [ ] `/dirox-ticket:check-tests` has no blocking findings (not needed for trivial)
- [ ] OKF retro done, and the Dirox CI checks pass (`specs-and-knowledge`, `pr-checks`)
- [ ] OpenSpec change archived (not needed for trivial)

## Follow-ups
<!-- Work found but not done, as suggested Jira tickets. -->
_Pending: `/dirox-ticket:finish-ticket` lists any._
