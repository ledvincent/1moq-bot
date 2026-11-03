#!/usr/bin/env node
// pr-check.mjs: checks on a pull request that closing a change was not skipped: the OKF retro
// is answered, a finished OpenSpec change is archived, verified and proven by its tests, and the
// review gates passed (design for a big change, QC and a code review for any code).
// Part of dirox-core. /dirox-techlead:setup-project copies it into projects as
// .github/scripts/pr-check.mjs and replaces it on later runs: do not edit the copy.
// No dependencies: Node 20 or later. Run by .github/workflows/dirox-checks.yml on pull requests,
// so it holds whether or not /dirox-dev:close-change or /dirox-techlead:review-pr were run.
//
// Environment:
//   PR_BODY         the PR description
//   PR_AUTHOR       the PR author's GitHub login: their own approval never passes a gate. A bot's PR
//                   (a login ending in "[bot]") gets every check too, but one that changes nothing in
//                   okf/ needs no Knowledge section: "No OKF change: automated dependency update".
//   PR_DRAFT        "true" for a draft PR: every error is reported as a warning, since a draft
//                   cannot merge and the kit opens drafts long before /dirox-dev:close-change
//                   writes the Knowledge section, archives the change and QC approves. The
//                   workflow runs again when the PR is marked ready, and then they are errors.
//   PR_HEAD_REF     the PR's branch, for the ticket key (checks 11 to 14); locally, the current branch
//   PR_NUMBER, PR_HEAD_SHA, GITHUB_TOKEN, GITHUB_REPOSITORY
//                   to read the PR's reviews for the gates (checks 11 to 13); without them it warns
//   BASE_REF        the base to compare with (for example origin/main). In CI it can stay
//                   unset: the checkout is the PR's merge commit, compared with its first parent.
//                   Check 8 reads the history: check out with fetch-depth 0.
// Local run: PR_BODY="$(gh pr view --json body -q .body)" BASE_REF=origin/main node pr-check.mjs
// Exit code: 0 = no errors (warnings allowed), 1 = errors, 2 = bad usage.
//
// Errors:
//   1. The description's "## Knowledge" section is missing or empty, says "No OKF change" with
//      no reason, or the PR changes nothing in okf/ and the section does not say
//      "No OKF change: <reason>" (so "n/a" is not an answer). A bot's PR that changes nothing in
//      okf/ and has no Knowledge section passes ("No OKF change: automated dependency update").
//   2. A change archived by this PR marks more decisions "Decision record needed" in its
//      design.md than okf/decisions/ files link to it, plus "No decision record: <reason>"
//      lines in the Knowledge section. "No decision record needed" is not a mark.
//   3. An OpenSpec change this PR touches is still open (openspec/changes/<name>/, not archive/)
//      although every task in its tasks.md is ticked: the work is done but was never archived,
//      so openspec/specs/ would not get its behaviour.
//      An open change with tasks not ticked yet is not built: merging it would leave the ticket
//      with its tests and proposal on the base branch and no code (and a Jira "Done on merge" rule
//      would close it).
//   5. A change archived by this PR (the kickoff aside) has no verification.md, its verification
//      lists blocking findings, or a scenario of its specs is missing from the verification.
//   6. A Proof task of a change archived by this PR ("Test `<scenario>` in `<file>`") names a
//      test file that does not exist, or that does not contain the scenario's name (compared
//      without case, spaces or punctuation, so test_order_total_rounds_up matches
//      "Order total rounds up").
//   9. A test case file this PR adds or changes (test-cases/<KEY>.md) is not well formed
//      (test-cases-check.mjs, which sits next to this script).
//  10. A change archived by this PR has a test case file, and an automated case has no Proof task,
//      or a case is missing from the verification.
//  11. QC gate: the PR changes code, and no QC reviewer (.github/qc-reviewers) has an approval
//      that still covers it (approval.mjs, which sits next to this script, says what code is).
//  12. Code review gate: the PR changes code, and no code reviewer (.github/code-reviewers) other
//      than the author and QC's approver has an approval that still covers it.
//  13. Design gate: the PR's change is big, and no design reviewer (.github/design-reviewers)
//      approved it on a commit with no code before it.
//  14. The PR's change is normal or big, and test-cases/<KEY>.md is missing: QC's test cases are
//      written for every such change.
// Warnings:
//   4. The PR touches structural paths (schema, dependencies, deployment, env files) and changes
//      nothing in okf/. The paths come from .github/okf-triggers.json when it exists
//      ({"okf/data/": ["**/migrations/**"], ...}, replacing the defaults below).
//   8. A spec this PR changes loses lines that another change added after this PR's change
//      started (git blame on the base): archiving may have dropped them. A warning, because
//      a deliberate rewording looks the same.
//  15. A ready PR that changes code has an empty "## How to test" section: QC needs the build, the
//      test accounts and data, and the manual cases to run.
//  16. A big change passed the design gate, and its proposal.md, design.md or spec deltas changed
//      after the approved commit: the author tells the design reviewers on the PR. The approval
//      still counts (design edits do not reopen the gate), so it is never an error.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DEFAULT_TRIGGERS = {
  "okf/data/": ["**/migrations/**", "**/alembic/**", "**/*.prisma", "**/schema.sql", "**/schema.rb"],
  "okf/architecture/": [
    "**/package.json", "**/requirements*.txt", "**/pyproject.toml", "**/go.mod", "**/Cargo.toml",
    "**/Gemfile", "**/pom.xml", "**/build.gradle*", "**/composer.json",
  ],
  "okf/runbooks/": [
    "**/Dockerfile*", "**/docker-compose*.y*ml", "**/compose.y*ml", "infra/**", "terraform/**", "**/*.tf",
    "k8s/**", "helm/**", "Procfile", "fly.toml", "vercel.json", "netlify.toml", ".github/workflows/**",
  ],
  "okf/integrations/": ["**/.env.example", "**/.env.sample", "**/.env.template"],
};
// Kit-owned files: updating the kit must not ask for an OKF change.
const IGNORED = [".github/workflows/dirox-checks.yml", ".github/scripts/**"];

const inActions = Boolean(process.env.GITHUB_ACTIONS);
const draft = process.env.PR_DRAFT === "true";
let errors = 0;
let warnings = 0;
function report(level, msg, title = "OKF retro") {
  if (level === "error" && draft) {
    level = "warning";
    msg += " (Draft PR: this becomes an error once the PR is ready for review; /dirox-dev:implement marks it ready.)";
  }
  if (level === "error") errors++;
  else warnings++;
  console.log(inActions ? `::${level} title=${title}::${msg}` : `${level === "error" ? "ERROR" : "WARN "} ${msg}`);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
const matchesAny = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

// A section of the PR description ("Knowledge", "How to test"), without HTML comments; null when absent.
function bodySection(body, heading) {
  const lines = body.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\b`, "i").test(l.trim()));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l.trim()));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim();
}

// The base the PR merges into, and the PR's own head.
function commits() {
  if (process.env.BASE_REF) return { base: git("merge-base", process.env.BASE_REF, "HEAD"), head: git("rev-parse", "HEAD") };
  const parents = git("rev-list", "--parents", "-n", "1", "HEAD").split(" ");
  if (parents.length === 3) return { base: parents[1], head: parents[2] };
  console.error("pr-check: HEAD is not a merge commit; set BASE_REF (for example origin/main)");
  process.exit(2);
}

// The change ID of an archive folder: <id>-<date>, or <date>-<id> before kit 1.4.0.
const changeId = (dir) => dir.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
// Text compared without case, spaces or punctuation.
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function specScenarios(dir) {
  const out = [];
  const walkSpecs = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walkSpecs(p);
      else if (e.name === "spec.md") {
        for (const m of fs.readFileSync(p, "utf8").matchAll(/^####\s+Scenario:\s*(.+?)\s*$/gm)) out.push(m[1]);
      }
    }
  };
  walkSpecs(path.join(dir, "specs"));
  return out;
}

function isAncestor(a, b) {
  try { execFileSync("git", ["merge-base", "--is-ancestor", a, b], { stdio: "ignore" }); return true; } catch { return false; }
}

if (process.env.PR_BODY === undefined) {
  console.error("pr-check: PR_BODY is not set (the PR description)");
  process.exit(2);
}

const { base, head } = commits();
const changed = git("diff", "--name-status", "--no-renames", base, "HEAD")
  .split("\n").filter(Boolean)
  .map((line) => { const [status, file] = line.split("\t"); return { status, file }; });
const okfChanged = changed.some((c) => c.file.startsWith("okf/"));
// A bot's dependency update that touches no knowledge is assumed to say so.
const bot = /\[bot\]$/i.test(process.env.PR_AUTHOR || "");
const written = bodySection(process.env.PR_BODY, "Knowledge");
const knowledge = !written && bot && !okfChanged ? "No OKF change: automated dependency update" : written;

// 1. The Knowledge section is answered.
// /dirox-dev:close-change writes this section; the messages say what to put there by hand.
if (knowledge === null) {
  report("error", 'The PR description has no "## Knowledge" section. Run /dirox-dev:close-change, or add the section from .github/pull_request_template.md.');
} else if (!knowledge) {
  report("error", 'The "Knowledge" section of the PR description is empty. Name the okf/ files this PR adds or changes, or write "No OKF change: <why>".');
} else {
  const none = knowledge.match(/No OKF change\b\s*:?\s*(.*)/i);
  if (none && !none[1].replace(/<reason>/i, "").trim()) {
    report("error", 'Say why there is no OKF change: "No OKF change: <why>".');
  } else if (!none && !okfChanged) {
    report("error", 'This PR changes nothing in okf/, so the "Knowledge" section must say "No OKF change: <why>".');
  }
  if (none && okfChanged) {
    report("warning", 'The description says "No OKF change" but the PR changes files in okf/. List them in the Knowledge section.');
  }
}

// 2. Every "Decision record needed" in a change archived by this PR is recorded or excused.
const excused = (knowledge || "").split("\n").filter((l) => /No decision record\s*:\s*\S/i.test(l)).length;
let neededTotal = 0;
let missingTotal = 0;
const missingIn = [];
const decisionsDir = "okf/decisions";
const decisions = fs.existsSync(decisionsDir)
  ? fs.readdirSync(decisionsDir).filter((f) => f.endsWith(".md") && f !== "index.md")
    .map((f) => fs.readFileSync(path.join(decisionsDir, f), "utf8"))
  : [];
for (const { status, file } of changed) {
  const m = file.match(/^openspec\/changes\/archive\/([^/]+)\/design\.md$/);
  if (status !== "A" || !m || !fs.existsSync(file)) continue;
  // "No decision record needed" is not a mark.
  const needed = (fs.readFileSync(file, "utf8").match(/(?<!\bno\s+)Decision record needed/gi) || []).length;
  if (!needed) continue;
  const dir = m[1];
  const id = changeId(dir);
  const recorded = decisions.filter((d) => d.includes(`openspec/changes/archive/${dir}`) || d.includes(`openspec/changes/${id}/`)).length;
  neededTotal += needed;
  if (recorded < needed) { missingTotal += needed - recorded; missingIn.push(`${dir} (${needed} marked, ${recorded} recorded)`); }
}
if (missingTotal > excused) {
  report("error", `Some decisions marked "Decision record needed" have no file in okf/decisions/: ${missingIn.join(", ")}. /dirox-dev:close-change records them. To leave one out, add a line "No decision record: <decision> - <why>" to the Knowledge section.`, "Decision not recorded");
}

// 3. A finished change that this PR touches is archived, and an unbuilt one does not merge.
const openChanges = new Set(changed
  .map((c) => c.file.match(/^openspec\/changes\/([^/]+)\//))
  .filter((m) => m && m[1] !== "archive")
  .map((m) => m[1]));
for (const name of openChanges) {
  const tasks = path.join("openspec/changes", name, "tasks.md");
  if (!fs.existsSync(tasks)) continue;
  const text = fs.readFileSync(tasks, "utf8");
  const open = (text.match(/^\s*[-*]\s+\[ \]/gm) || []).length;
  const done = (text.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
  if (done && !open) {
    report("error", `Every task in openspec/changes/${name}/ is done, but the change was never closed, so the main specs miss it. Run /dirox-dev:close-change.`, "Change not closed");
  } else if (open) {
    report("error", `openspec/changes/${name}/ has ${open} task(s) not done: the change is not built yet, so this PR must not merge (its ticket would be left with no code). Build it with /dirox-dev:implement, then /dirox-dev:close-change.`, "Change not built");
  }
}

// 4. Structural paths changed with nothing in okf/.
if (!okfChanged) {
  let triggers = DEFAULT_TRIGGERS;
  const custom = ".github/okf-triggers.json";
  if (fs.existsSync(custom)) {
    try { triggers = JSON.parse(fs.readFileSync(custom, "utf8")); } catch (e) {
      report("warning", `${custom} is not valid JSON (${e.message}); using the defaults`);
    }
  }
  const files = changed.map((c) => c.file).filter((f) => !matchesAny(f, IGNORED));
  for (const [folder, globs] of Object.entries(triggers)) {
    const hits = files.filter((f) => matchesAny(f, globs));
    if (!hits.length) continue;
    const shown = hits.slice(0, 3).join(", ") + (hits.length > 3 ? ` and ${hits.length - 3} more` : "");
    report("warning", `This PR changes ${shown} and nothing in okf/. Check whether ${folder} needs an update.`);
  }
}

// Changes this PR archives (the kickoff writes no code, so it has no verification or proof).
const archived = [...new Set(changed
  .filter((c) => c.status === "A")
  .map((c) => c.file.match(/^openspec\/changes\/archive\/([^/]+)\//))
  .filter(Boolean)
  .map((m) => m[1]))]
  .filter((dir) => !changeId(dir).endsWith("-kickoff"));

for (const dir of archived) {
  const root = path.join("openspec/changes/archive", dir);
  const id = changeId(dir);
  const scenarios = specScenarios(root);
  if (!scenarios.length) continue;

  // 5. Verified, with no blocking findings, against every scenario.
  const vfile = path.join(root, "verification.md");
  if (!fs.existsSync(vfile)) {
    report("error", `${id} was closed without being verified. Run /dirox-qc:verify, then /dirox-dev:close-change again.`, "Not verified");
  } else {
    const v = fs.readFileSync(vfile, "utf8").replace(/\r\n?/g, "\n");
    const blocking = (v.match(/(?<![-\w])Blocking findings:[ \t]*\n([\s\S]*?)(?=\n\s*Non-blocking findings:|$)/i) || [])[1] || "";
    const open = blocking.split("\n").map((l) => l.replace(/^\s*[-*]\s*/, "").trim()).filter((l) => l && !/^none\.?$/i.test(l));
    if (open.length) report("error", `${id}: the verification still lists blocking findings (${open.length}). Fix them and run /dirox-qc:verify again.`, "Not verified");
    const vs = squash(v);
    const missing = scenarios.filter((s) => !vs.includes(squash(s)));
    if (missing.length) report("error", `${id}: the verification does not cover ${missing.map((s) => `"${s}"`).join(", ")} (added after it ran?). Run /dirox-qc:verify again.`, "Not verified");
  }

  // 6. Each Proof task's test file exists and names the scenario.
  const tasksFile = path.join(root, "tasks.md");
  if (fs.existsSync(tasksFile)) {
    const unproven = [];
    for (const m of fs.readFileSync(tasksFile, "utf8").matchAll(/Test\s+`([^`]+)`\s+in\s+`([^`]+)`/g)) {
      const file = m[2].replace(/::.*$/, "").replace(/:\d+$/, "");
      if (!fs.existsSync(file)) unproven.push(`"${m[1]}" (${file} does not exist)`);
      else if (!squash(fs.readFileSync(file, "utf8")).includes(squash(m[1]))) unproven.push(`"${m[1]}" (not found in ${file})`);
    }
    if (unproven.length) report("error", `${id}: no test proves ${unproven.join(", ")}. Each scenario needs a test whose name contains it, in the file its Proof task names.`, "Scenario not proven");
  }
}

// 8. Spec lines another change added after this one started, removed by this PR.
for (const dir of archived) {
  const id = changeId(dir);
  const starts = git("log", "--format=%H", "--diff-filter=A", head, "--", `openspec/changes/${id}/proposal.md`).split("\n").filter(Boolean);
  if (!starts.length) continue;
  const start = starts[starts.length - 1];
  for (const { status, file } of changed) {
    if (status !== "M" || !/^openspec\/specs\/[^/]+\/spec\.md$/.test(file)) continue;
    const dropped = [];
    for (const h of git("diff", "-U0", base, "HEAD", "--", file).matchAll(/^@@ -(\d+)(?:,(\d+))? /gm)) {
      const from = Number(h[1]), count = h[2] === undefined ? 1 : Number(h[2]);
      if (!count) continue;
      for (const line of git("blame", "-l", "-s", "-L", `${from},+${count}`, base, "--", file).split("\n")) {
        const b = line.match(/^\^?([0-9a-f]{40})\s+\d+\)\s?(.*)$/);
        if (b && b[2].trim() && !isAncestor(b[1], start)) dropped.push(b[2].trim());
      }
    }
    if (dropped.length) {
      const shown = dropped.slice(0, 3).map((l) => `"${l.slice(0, 80)}"`).join(", ") + (dropped.length > 3 ? ` and ${dropped.length - 3} more` : "");
      report("warning", `${file} loses lines another change added after ${id} started: ${shown}. If they were not meant to go, add them back to ${id}'s spec.`, "Spec lines dropped");
    }
  }
}

// 9-10. Test cases (test-cases/<KEY>.md). The checker sits next to this script; a project set up
// before kit 1.17.0 has no copy, so the checks are skipped with a warning.
let testCases = null;
try {
  testCases = await import(new URL("./test-cases-check.mjs", import.meta.url));
} catch {
  if (fs.existsSync("test-cases")) report("warning", "test-cases-check.mjs is missing next to pr-check.mjs, so the test cases were not checked. Run /dirox-techlead:setup-project.", "Test cases");
}
const keyOf = (s) => ((s || "").match(/[A-Z][A-Z0-9]*-\d+/i) || [""])[0].toUpperCase();
const headRef = process.env.PR_HEAD_REF || (() => { try { return git("branch", "--show-current"); } catch { return ""; } })();
const readCases = (key) => {
  const file = `test-cases/${key}.md`;
  return key && testCases && fs.existsSync(file) ? testCases.checkTestCases(fs.readFileSync(file, "utf8"), file) : null;
};
if (testCases) {
  // 9. Every test case file this PR adds or changes is well formed.
  for (const { status, file } of changed) {
    if (status === "D" || !/^test-cases\/[^/]+\.md$/.test(file) || /README\.md$/i.test(file) || !fs.existsSync(file)) continue;
    for (const e of testCases.checkTestCases(fs.readFileSync(file, "utf8"), file).errors) report("error", e, "Test cases");
  }
  // 10. A change archived by this PR: every automated case has a Proof task, and the verification covers every case.
  for (const dir of archived) {
    const id = changeId(dir);
    const tc = readCases(keyOf(id));
    if (!tc || !tc.cases.length) continue;
    const root = path.join("openspec/changes/archive", dir);
    const tasks = fs.existsSync(path.join(root, "tasks.md")) ? squash(fs.readFileSync(path.join(root, "tasks.md"), "utf8")) : "";
    const noTask = tc.cases.filter((c) => c.proof === "automated" && !tasks.includes(squash(c.id))).map((c) => c.id);
    if (noTask.length) report("error", `${id}: the automated test cases ${noTask.join(", ")} have no Proof task. Add "Test \`<case ID>\` in \`<file>\`" tasks and their tests, then /dirox-qc:verify.`, "Test cases");
    const vfile = path.join(root, "verification.md");
    if (fs.existsSync(vfile)) {
      const v = squash(fs.readFileSync(vfile, "utf8"));
      const uncovered = tc.cases.filter((c) => !v.includes(squash(c.id))).map((c) => c.id);
      if (uncovered.length) report("error", `${id}: the verification does not cover the test cases ${uncovered.join(", ")} (added after it ran?). Run /dirox-qc:verify again.`, "Test cases");
    }
  }
}

// 11-13. The review gates (approval.mjs, next to this script, also says what counts as code).
const prKey = keyOf(headRef) || keyOf(archived.map(changeId)[0]);
let approval = null;
try {
  approval = await import(new URL("./approval.mjs", import.meta.url));
} catch {
  report("error", "approval.mjs is missing next to pr-check.mjs, so the review gates were not checked. Run /dirox-techlead:setup-project.", "Review gates");
}
const TITLES = { design: "Design gate", qc: "QC gate", code: "Code review gate" };
let code = [];
if (approval) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, PR_HEAD_SHA, PR_AUTHOR } = process.env;
  const prHead = PR_HEAD_SHA || head;
  const online = Boolean(GITHUB_TOKEN && GITHUB_REPOSITORY && PR_NUMBER);
  let reviews = null;
  if (online) {
    try {
      const api = process.env.GITHUB_API_URL || "https://api.github.com";
      const res = await fetch(`${api}/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews?per_page=100`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      });
      if (res.ok) reviews = await res.json();
    } catch { /* reported below */ }
  }
  code = approval.codeFiles(base, prHead);
  for (const v of approval.checkGates({ reviews: reviews || [], author: PR_AUTHOR, base, head: prHead, key: prKey })) {
    // 16. The design changed after the design reviewers approved it.
    if (v.gate === "design" && v.ok && v.needed && v.at) {
      const moved = approval.designChangedSince(prKey, v.at, prHead);
      if (moved.length) report("warning", `${prKey}'s design changed after ${v.by} approved it at ${v.at.slice(0, 7)}: ${moved.join(", ")}. Tell the design reviewers on the PR (one comment naming what changed); their approval still counts.`, "Design changed");
    }
    if (v.ok) continue;
    if (v.reason === "no-reviewers") report("error", approval.explain(v), TITLES[v.gate]);
    else if (!online) report("warning", `${TITLES[v.gate]}: ${prKey || "this PR"} needs an approval from ${v.reviewers.join(", ")}; it could not be checked here (no GitHub token or PR number).`, TITLES[v.gate]);
    else if (!reviews) report("error", `${TITLES[v.gate]}: the reviews could not be read from GitHub. Re-run the check.`, TITLES[v.gate]);
    else report("error", approval.explain(v), TITLES[v.gate]);
  }
}

// 14. A normal or big change has QC's test cases.
const changeDirs = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => d !== "archive").map((d) => path.join(dir, d)) : []);
const ownChange = prKey
  ? [...changeDirs("openspec/changes"), ...changeDirs("openspec/changes/archive")]
    .find((d) => changeId(path.basename(d)).startsWith(`${prKey.toLowerCase()}-`) && fs.existsSync(path.join(d, "proposal.md")))
  : null;
if (ownChange && !changeId(path.basename(ownChange)).endsWith("-kickoff")) {
  const size = ((fs.readFileSync(path.join(ownChange, "proposal.md"), "utf8").match(/^Size:\s*(\w+)/im) || [])[1] || "").toLowerCase();
  if (["normal", "big"].includes(size) && !fs.existsSync(`test-cases/${prKey}.md`)) {
    report("error", `${prKey} is a ${size} change, and test-cases/${prKey}.md is missing: every normal and big change has QC's test cases. Run /dirox-qc:test-cases ${prKey} (or /dirox-dev:start-change writes them).`, "Test cases");
  }
}

// 15. A ready PR that changes code tells QC how to test it.
if (!draft && code.length && !bodySection(process.env.PR_BODY, "How to test")) {
  report("warning", 'The "How to test" section of the PR description is empty: give QC the build (preview URL or local commands), the test accounts and data by name, and the manual cases to run. /dirox-dev:implement fills it.', "How to test");
}

console.log(`pr-check: ${draft ? "draft PR, errors reported as warnings, " : ""}${changed.length} file(s) changed, ${neededTotal} decision(s) to record, ${archived.length} change(s) closed, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
