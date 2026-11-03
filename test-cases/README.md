# Test cases

One file per Jira ticket: `test-cases/<KEY>.md` (for example `test-cases/PROJ-123.md`). Added by the Dirox kit.

- **Who writes them.** `/dirox-qc:test-cases <KEY>` drafts them from the ticket alone (never from the code), when the ticket enters a sprint, and opens the ticket's draft PR. `/dirox-dev:start-change` drafts them if nobody has yet. Every normal and big change has a file; a trivial change has none (QC smoke-tests its build).
- **Who owns them.** QC: QC edits, adds and validates cases on the ticket's branch, and nobody else edits the file by hand. A developer who disagrees with a case asks in the PR.
- **Frozen once validated.** With `status: validated`, a new case is a bug found while testing; more coverage is a new ticket. Rewording is always fine: only an automated case added, or an automated case's expected result changed, sends the developer back to verify.
- **How they are proven.** Every `Proof: automated` case gets a developer test whose name contains the case ID (`PROJ-123-01`); the verifier checks it. `Proof: manual (<reason>)` cases are run by QC on the PR's build.
- **The merge gate.** CI blocks the merge of every PR that changes code until a QC reviewer listed in `.github/qc-reviewers` has tested its build and approved it, and the approval still covers the code.
- **After the merge** the file stays here: this folder is the project's catalog of test cases, for regression runs.

## Format

Check a file with `node .github/scripts/test-cases-check.mjs test-cases/<KEY>.md` (CI runs it on every PR).

```markdown
---
jira: PROJ-123
status: draft
cap: care-log
folder: App ADV - Carelog reactions
---
# PROJ-123 · Show reactions under care log reports

## Open questions
- [ ] Are reactions also shown in the full report view? (for: PM)

## PROJ-123-01 · Report with one reaction shows the block under a separator line
- Priority: High
- Type: smoke
- Proof: automated
- Covers: Given a report has at least one reaction, the reactions are shown below it

Pre-conditions:
- Logged in as a test agency account that follows test client X
- Report R of client X has one "Merci" reaction from test client X

Steps:
1. Open the care log of client X
2. Scroll to report R

Expected:
1. A separator line is shown under report R
2. Below it: "1" in bold, the heart icon and "Merci", then "Julie MARTIN"
```

- `folder` (optional, projects that use Testmo): the Testmo sub-folder the cases go into, as QC names it (their CSV "Folder" column); without it, the ticket title.
- `cap` (optional): the capability, as in `openspec/specs/`. In a project that uses Testmo, the cases are synced into that capability's folder, so QC's regression suite follows features rather than tickets.
- `status`: `draft` until QC has reviewed the cases, then `validated`.
- Each case: `Priority` (High, Normal), `Type` (smoke, regression), `Proof` (`automated`, or `manual (<reason>)`), `Covers`, and `Testmo: <case id>` once the case is in Testmo (written by `/dirox-qc:testmo sync`, in projects that use Testmo); then `Pre-conditions:`, `Steps:` (numbered, at least one) and `Expected:` (at least one).
- Synthetic test data only: never real customer or personal data.
