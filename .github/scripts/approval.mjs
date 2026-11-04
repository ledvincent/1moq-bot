#!/usr/bin/env node
// approval.mjs: the review gates of a pull request (design, qc, code) and what counts as code.
// Used by pr-check.mjs in CI, and locally by /dirox-dev:implement, /dirox-dev:close-change,
// /dirox-core:next and /dirox-techlead:review-pr. Part of dirox-core.
// /dirox-techlead:setup-project copies it into projects as .github/scripts/approval.mjs, next to
// pr-check.mjs, which imports it: do not edit the copy.
// No dependencies: Node 20 or later, and git with the PR's history (CI: checkout with fetch-depth 0).
//
// Code is every file outside NOT_CODE below: behaviour (openspec/), knowledge (okf/), QC's test
// cases (test-cases/), what OpenSpec generates and the files setup-project writes, plus what the
// project lists in .github/not-code (read from the base; same format: one path or folder per line,
// "*" for one path segment, "#" comments). Markdown is code.
//
// The gates. Each is passed by an approval, as the PR's reviews give it:
//   design  a big change ("Size: big" in its proposal.md) whose proposal is not on the base yet (a
//           change approved through a 2.0 proposal PR passes), the kickoff aside: an approval from
//           someone in .github/design-reviewers, not the PR's author, given on a commit A with no code
//           committed before it (git log --no-merges merge-base(base, A)..A touches no code file).
//           Code committed before any design approval means this branch can never pass.
//   qc      a PR that changes code: the latest review of someone in .github/qc-reviewers is an
//           approval that still covers the code.
//   code    a PR that changes code: the latest review of someone in .github/code-reviewers, not the
//           author, is an approval that still covers the code (codeReviewPolicy says how many).
// An approval at commit A covers the head H when the PR's net code diff is the same at both,
//   git diff -U0 merge-base(base, A)..A   versus   git diff -U0 merge-base(base, H)..H,
// compared file by file with `git patch-id --stable` (line numbers and whitespace ignored). Merging
// the base in, archiving the change and writing knowledge keep an approval; changing the code does not.
// One person passes at most one gate on a PR, so QC and the code review come from two people.
// The reviewer files are read from the base, so a PR cannot add its own reviewers.
//
// CLI:
//   gh pr view <n> --json reviews,author | node approval.mjs --gate design|qc|code|all --base <ref> [--head HEAD] [--key PROJ-123]
//     prints a JSON verdict ({gate, needed, ok, reason, by, at, changed, firstCode, message}; for
//     "all", {ok, gates: [...]}). Exit code: 0 = passed or not needed, 1 = not passed, 2 = bad usage.
//   node approval.mjs --code-files --base <ref> [--head HEAD]
//     prints the PR's code files as a JSON array ([] = the PR changes no code). Exit code 0.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Not code: folders end with "/", files are exact paths, a "*" stands for one path segment.
export const NOT_CODE = [
  "openspec/", "okf/", "test-cases/",
  ".claude/CLAUDE.md", ".claude/settings.json", ".claude/skills/openspec-*/", ".claude/commands/opsx/",
  ".github/workflows/dirox-checks.yml", ".github/workflows/testmo.yml",
  ".github/scripts/approval.mjs", ".github/scripts/okf-validate.mjs", ".github/scripts/pr-check.mjs",
  ".github/scripts/test-cases-check.mjs", ".github/scripts/testmo.mjs", ".github/scripts/qc-approval.mjs",
  ".github/pull_request_template.md", ".github/CODEOWNERS", ".github/okf-triggers.json",
  ".github/qc-reviewers", ".github/design-reviewers", ".github/code-reviewers", ".github/not-code",
  ".gitattributes", ".gitignore",
];
const pattern = (p) => new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}${p.endsWith("/") ? "" : "$"}`);
const kitPatterns = NOT_CODE.map(pattern);
// Whether a file is code, by the kit's list alone (codeFilter adds the project's .github/not-code).
export const isCode = (file) => !kitPatterns.some((re) => re.test(file));

export const GATES = ["design", "qc", "code"];
const PLACEHOLDER = { design: "DESIGN-REVIEWER", qc: "QC-REVIEWER", code: "CODE-REVIEWER" };

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });
}
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
const exists = (c) => Boolean(c) && tryGit("cat-file", "-e", `${c}^{commit}`) !== null;

// GitHub usernames, one per line, "#" comments and the template's placeholder ignored. Read from the
// base commit only, when there is one (a PR cannot add its own reviewers); else from the working tree.
export function readReviewers(gate, base) {
  const file = `.github/${gate}-reviewers`;
  const text = base ? tryGit("show", `${base}:${file}`) ?? "" : fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return text.split("\n").map((l) => l.replace(/#.*/, "").trim().replace(/^@/, "")).filter((l) => l && l !== PLACEHOLDER[gate]);
}

// The project's own entries in .github/not-code, read like the reviewer files.
export function projectNotCode(base) {
  const file = ".github/not-code";
  const text = base ? tryGit("show", `${base}:${file}`) ?? "" : fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return text.split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
}

// Whether a file is code for this project: the kit's list plus .github/not-code on the base.
const filters = new Map();
export function codeFilter(base) {
  if (!filters.has(base)) {
    const extra = projectNotCode(base).map(pattern);
    filters.set(base, (file) => isCode(file) && !extra.some((re) => re.test(file)));
  }
  return filters.get(base);
}

// How many code approvals a PR needs. The risk-based review policy (A10) will change only this.
export function codeReviewPolicy(/* pr */) {
  return 1;
}

// Reviews from the REST API ({user:{login}, state, commit_id}) or from `gh pr view --json reviews`
// ({author:{login}, state, commit:{oid}}), oldest first, as [{login, who, state, commit}].
export function normalizeReviews(reviews) {
  return (reviews || []).map((r) => {
    const login = r.user?.login || r.author?.login || "";
    return { login, who: login.toLowerCase(), state: r.state, commit: r.commit_id || r.commit?.oid || "" };
  }).filter((r) => r.who && r.state !== "COMMENTED" && r.state !== "PENDING");
}

// Code files touched by each commit of a range, oldest first: [{sha, files}].
function codeCommits(range, isCodeFile) {
  const out = [];
  let cur = null;
  for (const line of (tryGit("log", "--no-merges", "--reverse", "--format=@%H", "--name-only", range) || "").split("\n")) {
    if (line.startsWith("@")) { cur = { sha: line.slice(1), files: [] }; out.push(cur); }
    else if (line.trim() && cur && isCodeFile(line.trim())) cur.files.push(line.trim());
  }
  return out.filter((c) => c.files.length);
}

// The PR's net code diff from where it left the base, as {file: patch-id}.
function netCodeDiff(base, commit) {
  const mb = git("merge-base", base, commit).trim();
  const out = {};
  for (const f of git("diff", "--name-only", "--no-renames", mb, commit).split("\n").filter(Boolean).filter(codeFilter(base))) {
    const diff = git("diff", "-U0", "--no-renames", mb, commit, "--", f);
    let id = "";
    try { id = execFileSync("git", ["patch-id", "--stable"], { input: diff, encoding: "utf8" }).split(" ")[0]; } catch { /* binary or empty */ }
    out[f] = id || `blob:${(tryGit("rev-parse", `${commit}:${f}`) || "deleted").trim()}`;
  }
  return out;
}

export function codeFiles(base, head = "HEAD") {
  return Object.keys(netCodeDiff(base, head)).sort();
}

// Files whose code differs between the approved commit and the head; [] when the approval covers it,
// null when the approved commit is gone (force-pushed away).
export function codeChangedSince(base, approved, head) {
  if (!exists(approved)) return null;
  const a = netCodeDiff(base, approved);
  const h = netCodeDiff(base, head);
  return [...new Set([...Object.keys(a), ...Object.keys(h)])].filter((f) => a[f] !== h[f]).sort();
}

// The OpenSpec change of a ticket at a commit: {name, path, size} or null.
export function findChange(key, commit = "HEAD") {
  if (!key) return null;
  const k = key.toLowerCase();
  const paths = (tryGit("ls-tree", "-r", "--name-only", commit, "openspec/changes/") || "").split("\n");
  const hit = paths.find((p) => new RegExp(`^openspec/changes/(archive/)?(\\d{4}-\\d{2}-\\d{2}-)?${k}-[^/]+/proposal\\.md$`).test(p));
  if (!hit) return null;
  const text = tryGit("show", `${commit}:${hit}`) || "";
  const dir = hit.split("/").slice(-2, -1)[0];
  const name = dir.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return { name, path: hit, size: ((text.match(/^Size:\s*(\w+)/im) || [])[1] || "").toLowerCase() };
}

// The design files of a ticket's change (proposal.md, design.md, the spec deltas) that differ between
// two commits, relative to the change folder; the change may have been archived in between.
export function designChangedSince(key, approved, head = "HEAD") {
  if (!key || !exists(approved)) return [];
  const k = key.toLowerCase();
  const dirOf = (commit) => {
    const hit = (tryGit("ls-tree", "-r", "--name-only", commit, "openspec/changes/") || "").split("\n")
      .find((p) => new RegExp(`^openspec/changes/(archive/)?(\\d{4}-\\d{2}-\\d{2}-)?${k}-[^/]+/proposal\\.md$`).test(p));
    return hit ? hit.slice(0, -"/proposal.md".length) : null;
  };
  const designFiles = (commit, dir) => (dir ? (tryGit("ls-tree", "-r", "--name-only", commit, `${dir}/`) || "").split("\n").filter(Boolean)
    .map((p) => p.slice(dir.length + 1)).filter((r) => r === "proposal.md" || r === "design.md" || r.startsWith("specs/")) : []);
  const a = dirOf(approved), h = dirOf(head);
  if (!a) return [];
  const blob = (commit, dir, rel) => (dir ? (tryGit("rev-parse", `${commit}:${dir}/${rel}`) || "").trim() : "");
  return [...new Set([...designFiles(approved, a), ...designFiles(head, h)])].filter((rel) => blob(approved, a, rel) !== blob(head, h, rel)).sort();
}

// Whether a gate applies to this PR, with the facts the checks need.
function facts({ base, head, key }) {
  const code = codeFiles(base, head);
  const change = findChange(key, head);
  let design = false, designWhy = "";
  if (change && change.size === "big" && !change.name.endsWith("-kickoff")) {
    const onBase = tryGit("cat-file", "-e", `${base}:openspec/changes/${change.name}/proposal.md`) !== null
      || (tryGit("ls-tree", "--name-only", base, "openspec/changes/archive/") || "").split("\n").some((p) => p.split("/").pop().startsWith(`${change.name}-`));
    if (onBase) designWhy = "approved through its proposal PR, already on the base";
    else design = true;
  }
  return { code, change, design, designWhy };
}

// Candidates for one gate: the approvals that pass it, by person.
function candidates(gate, { reviews, reviewers, author, base, head, f }) {
  const list = new Set(reviewers.map((r) => r.toLowerCase()));
  const mine = reviews.filter((r) => list.has(r.who) && r.who !== (author || "").toLowerCase());
  const latest = {};
  for (const r of mine) latest[r.who] = r;
  const pass = [];
  const fail = [];
  if (gate === "design") {
    for (const who of Object.keys(latest)) {
      if (latest[who].state === "CHANGES_REQUESTED") continue;
      for (const r of mine.filter((x) => x.who === who && x.state === "APPROVED")) {
        if (!exists(r.commit)) { fail.push({ ...r, reason: "commit-missing" }); continue; }
        const mb = git("merge-base", base, r.commit).trim();
        const before = codeCommits(`${mb}..${r.commit}`, codeFilter(base));
        if (before.length) fail.push({ ...r, reason: "code-before-approval", firstCode: before[0].sha });
        else pass.push(r);
      }
    }
  } else {
    for (const r of Object.values(latest)) {
      if (r.state !== "APPROVED") continue;
      const changed = codeChangedSince(base, r.commit, head);
      if (changed && !changed.length) pass.push(r);
      else fail.push({ ...r, reason: changed ? "code-changed" : "commit-missing", changed: changed || [] });
    }
  }
  return { pass, fail, approvals: Object.values(latest).filter((r) => r.state === "APPROVED") };
}

// One person per gate: the assignment that passes the most gates, in the order design, qc, code.
function assign(needs) {
  let best = null;
  const walk = (i, used, picks, score) => {
    if (i === needs.length) {
      if (!best || score > best.score) best = { score, picks: [...picks] };
      return;
    }
    const { pass, count } = needs[i];
    const choose = (start, chosen) => {
      if (chosen.length === count) {
        walk(i + 1, new Set([...used, ...chosen.map((r) => r.who)]), [...picks, chosen], score + 2 ** (needs.length - i));
        return;
      }
      for (let j = start; j < pass.length; j++) {
        if (!used.has(pass[j].who) && !chosen.some((c) => c.who === pass[j].who)) choose(j + 1, [...chosen, pass[j]]);
      }
    };
    choose(0, []);
    walk(i + 1, used, [...picks, null], score);
  };
  walk(0, new Set(), [], 0);
  return best.picks;
}

// The verdict of every gate: [{gate, needed, ok, reason, by, at, changed, firstCode, reviewers}].
export function checkGates({ reviews, author, base, head = "HEAD", key, gates = GATES }) {
  const r = normalizeReviews(reviews);
  const f = facts({ base, head, key });
  const out = {};
  const needs = [];
  for (const gate of GATES) {
    const reviewers = readReviewers(gate, base);
    const needed = gate === "design" ? f.design : f.code.length > 0;
    const v = { gate, needed, ok: !needed, reason: "not-needed", reviewers, changed: [], key, size: f.change?.size || "", why: gate === "design" ? f.designWhy : "" };
    out[gate] = v;
    if (!needed) continue;
    if (!reviewers.length) { Object.assign(v, { reason: "no-reviewers" }); continue; }
    const c = candidates(gate, { reviews: r, reviewers, author, base, head, f });
    v.candidates = c;
    needs.push({ gate, pass: c.pass, count: gate === "code" ? codeReviewPolicy({ key, files: f.code }) : 1 });
  }
  const picks = assign(needs);
  needs.forEach(({ gate, pass }, i) => {
    const v = out[gate];
    const c = v.candidates;
    delete v.candidates;
    if (picks[i]) return Object.assign(v, { ok: true, reason: "covered", by: picks[i].map((p) => p.login).join(", "), at: picks[i][0].commit });
    if (pass.length) {
      const other = GATES.find((g) => g !== gate && out[g].ok && pass.some((p) => out[g].by?.toLowerCase().split(", ").includes(p.who)));
      return Object.assign(v, { reason: "same-person", by: pass[0].login, other });
    }
    if (gate === "design") {
      const early = c.fail.find((x) => x.reason === "code-before-approval");
      if (early) return Object.assign(v, { reason: "code-before-approval", by: early.login, at: early.commit, firstCode: early.firstCode });
      if (c.fail.length) return Object.assign(v, { reason: "commit-missing", by: c.fail[0].login, at: c.fail[0].commit });
      const first = codeCommits(`${git("merge-base", base, head).trim()}..${head}`, codeFilter(base))[0];
      if (first) return Object.assign(v, { reason: "code-before-approval", firstCode: first.sha });
      return Object.assign(v, { reason: "not-approved" });
    }
    if (!c.approvals.length) return Object.assign(v, { reason: "not-approved" });
    const best = [...c.fail].sort((a, b) => (a.reason === "commit-missing") - (b.reason === "commit-missing") || a.changed.length - b.changed.length)[0];
    if (best) return Object.assign(v, { reason: best.reason, by: best.login, at: best.commit, changed: best.changed });
    return Object.assign(v, { reason: "not-approved" });
  });
  return gates.map((g) => out[g]);
}

const short = (s) => (s || "").slice(0, 7);
const list = (files) => files.slice(0, 5).join(", ") + (files.length > 5 ? ` and ${files.length - 5} more` : "");

// The message for a verdict, in the words CI and the commands share.
export function explain(v) {
  const key = v.key || "This ticket";
  const names = v.reviewers?.length ? v.reviewers.join(", ") : "";
  const file = `.github/${v.gate}-reviewers`;
  if (v.ok && v.reason === "not-needed") {
    if (v.gate === "design") return v.why ? `Design gate: ${key} was ${v.why}.` : `Design gate: not needed (${key} is not a big change).`;
    return `${v.gate === "qc" ? "QC" : "Code review"} gate: not needed (the PR changes no code).`;
  }
  if (v.ok) return `${v.gate === "design" ? "Design" : v.gate === "qc" ? "QC" : "Code review"} gate: passed by ${v.by}'s approval at ${short(v.at)}.`;
  if (v.reason === "no-reviewers") {
    if (v.gate === "design") return `${key} is a big change, but ${file} lists nobody: add the BA's and the Architect's GitHub usernames.`;
    return `${file} lists nobody, and every PR that changes code needs ${v.gate === "qc" ? "a QC approval" : "a code review"}: add their GitHub usernames.`;
  }
  if (v.reason === "same-person") {
    return `${v.by}'s approval already passes the ${v.other === "qc" ? "QC" : v.other} gate, and one person passes one gate per PR: ${v.gate === "code" ? "the code review" : `the ${v.gate} gate`} needs someone else from ${file} (${names}).`;
  }
  if (v.gate === "design") {
    if (v.reason === "code-before-approval") {
      return `${key} is a big change, and code was committed (${short(v.firstCode)}) before a design reviewer approved: this branch can never pass the design gate. Start a new branch from the base with only the change folder and the test cases, open a draft PR for the design reviewers (${names}), and build there once they approve.`;
    }
    if (v.reason === "commit-missing") return `${v.by} approved the design at ${short(v.at)}, which is no longer in the branch's history (force-pushed?). A design reviewer approves again.`;
    return `Waiting for design approval: ${key} is a big change, so a design reviewer (${names}) approves the proposal on the draft PR before any code is committed.`;
  }
  const who = v.gate === "qc" ? "QC" : "the code reviewer";
  if (v.reason === "commit-missing") return `${v.by} approved commit ${short(v.at)}, which is no longer in the branch's history (force-pushed?). ${v.gate === "qc" ? "QC looks" : "A code reviewer looks"} at the PR again and re-approves.`;
  if (v.reason === "code-changed") {
    return `The code changed since ${v.gate === "qc" ? "QC" : "the code review"} approved (${v.by}, at ${short(v.at)}): ${list(v.changed)}. ${v.gate === "qc" ? "QC looks at that diff and re-approves; they re-run cases only if behaviour they tested changed." : `${who[0].toUpperCase()}${who.slice(1)} looks at that diff and re-approves.`}`;
  }
  if (v.gate === "qc") return `Waiting for QC: a QC reviewer (${names}) tests the PR's build and approves it.`;
  return `Waiting for a code review: a code reviewer (${names}), not the PR's author, approves the PR.`;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const usage = () => {
    console.error("usage: gh pr view <n> --json reviews,author | approval.mjs --gate design|qc|code|all --base <base ref> [--head HEAD] [--key PROJ-123]\n       approval.mjs --code-files --base <base ref> [--head HEAD]");
    process.exit(2);
  };
  const base = opt("base");
  const head = opt("head", "HEAD");
  if (!base) usage();
  if (!exists(base) || !exists(head)) { console.error(`approval: ${exists(base) ? head : base} is not a commit here (git fetch?)`); process.exit(2); }
  if (args.includes("--code-files")) {
    console.log(JSON.stringify(codeFiles(base, head)));
    process.exit(0);
  }
  const gate = opt("gate");
  if (![...GATES, "all"].includes(gate)) usage();
  let input = "";
  try { input = fs.readFileSync(0, "utf8"); } catch { /* no stdin */ }
  let pr;
  try { const j = JSON.parse(input || "{}"); pr = Array.isArray(j) ? { reviews: j } : j; } catch { console.error("approval: stdin is not the JSON of `gh pr view --json reviews,author`"); process.exit(2); }
  const branch = (tryGit("branch", "--show-current") || "").trim();
  const key = (opt("key") || ((branch.match(/[A-Z][A-Z0-9]*-\d+/i) || [""])[0])).toUpperCase();
  const verdicts = checkGates({ reviews: pr.reviews, author: pr.author?.login, base, head, key, gates: gate === "all" ? GATES : [gate] })
    .map((v) => ({ gate: v.gate, needed: v.needed, ok: v.ok, reason: v.reason, by: v.by || "", at: v.at || "", changed: v.changed, firstCode: v.firstCode || "", reviewers: v.reviewers, message: explain(v) }));
  const ok = verdicts.every((v) => v.ok);
  console.log(JSON.stringify(gate === "all" ? { ok, gates: verdicts } : verdicts[0], null, 2));
  process.exit(ok ? 0 : 1);
}
