# Test cases

One folder per feature, one file per Jira ticket: `test-cases/<feature>/<KEY>.md`, where `<feature>` is the ticket's `cap:` value, the `openspec/specs/<feature>/` folder name (for example `test-cases/care-log/PROJ-123.md`). A file from before kit 3.0.0 at `test-cases/<KEY>.md` still works; `/dirox-project:set-up-repo` moves it into its feature's folder when it can tell which. Added by the Dirox kit.

- **Who writes them.** `/dirox-ticket:write-test-cases <KEY>` drafts them from the ticket alone (never from the code), when the ticket enters a sprint, on the ticket's branch; `/dirox-ticket:plan-ticket` opens the PR, so QC is not its author and can approve it. A ticket with no `cap:` label: the writer picks the feature from `openspec/specs/` and says which. They are optional: QC writes them for the tickets that need them, and a small fix usually does not. A ticket without a file is proven by its scenarios' tests, and QC still tests its build before approving the PR.
- **Who owns them.** QC: QC edits, adds and validates cases on the ticket's branch, and nobody else edits the file by hand. A developer who disagrees with a case asks in the PR.
- **Frozen once validated.** With `status: validated`, a new case is a bug found while testing; more coverage is a new ticket. Rewording is always fine.
- **How they are run.** All by QC. `Proof: automated` cases QC scripts end to end in its own automation, with the case ID (`PROJ-123-01`) in the test's name so Testmo links the results; `Proof: manual (<reason>)` cases QC runs by hand on the PR's build. Developers write no test for them: their unit and scenario tests prove the code.
- **The merge gate.** CI blocks the merge of every PR that changes code until a QC reviewer listed in `.github/qc-reviewers` has tested its build and approved it, and the approval still covers the code.
- **After the merge** the file stays here: this folder is the project's catalog of test cases, for regression runs.

## Format

Check a file with `node .github/scripts/test-cases-check.mjs test-cases/<feature>/<KEY>.md` (CI runs it on every PR: the format only, since QC's automation and testing prove the cases).

```markdown
---
jira: PROJ-123
status: draft
cap: care-log
scope: risk medium, depth standard, focus all, platforms web
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
- `module` (optional, projects that use Testmo): the module folder, under the Testmo root folder, that the sub-folder goes into (for example `Profil`), one of the `Modules` in `okf/integrations/testmo.md`; without it, the sub-folder sits right under the root.
- `scope` (optional): what QC asked for when the cases were written (`/dirox-ticket:write-test-cases` asks): the risk (low, medium, high), the depth (smoke, standard, thorough), the areas to focus on and the platforms. A later add-only run keeps it.
- `cap`: the feature, as in `openspec/specs/`, the same as the file's folder. In a project that uses Testmo and groups by feature, the cases are synced into that feature's folder, so QC's regression suite follows features rather than tickets.
- `status`: `draft` until QC has reviewed the cases, then `validated`.
- Each case: `Priority` (High, Normal), `Type` (smoke, regression), `Proof` (`automated`, optionally with what automating it needs, such as `automated (needs a staging report that already has one reaction)`; or `manual (<reason>)`), `Covers`, and `Testmo: <case id>` once the case is in Testmo (written by `/dirox-ticket:testmo sync-cases`, in projects that use Testmo); then `Pre-conditions:`, `Steps:` (numbered, at least one) and `Expected:` (at least one).
- Synthetic test data only: never real customer or personal data.
