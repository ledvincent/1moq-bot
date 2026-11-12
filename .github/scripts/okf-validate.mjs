#!/usr/bin/env node
// okf-validate.mjs: checks an OKF v0.2 bundle and generates its index.md files.
// Part of dirox-core. /dirox-project:set-up-repo copies it into projects as
// .github/scripts/okf-validate.mjs and replaces it on later runs: do not edit the copy.
// No dependencies: Node 20 or later.
//
// Usage: node okf-validate.mjs [bundle-dir] [--write] [--json] [--root full|folders]
//   bundle-dir  defaults to "okf"
//   --write     regenerate every index.md first, then check
//   --json      print the results as JSON
//   --root      the root index's layout, kept in its frontmatter (root_layout) so every later run,
//               CI's included, writes the same root: "full" (the default) lists every concept
//               under its folder's heading; "folders" lists the root's own concepts, then each
//               folder with its count, like a folder index
// Exit code: 0 = no errors (warnings allowed), 1 = errors, 2 = bad usage.
//
// Errors: the OKF conformance rules (frontmatter, non-empty `type`, reserved index.md and
// log.md structures) plus three Dirox rules: every concept has an `owner`, the optional
// `collaborators` (since 3.0.0: everyone who changed a concept they do not own) is a list of
// emails, and every index.md matches what this script generates. Warnings: broken links (OKF readers must tolerate
// them), missing title or description, an owner or a "human:" verifier that is not an email
// (since 2.1.3; a GitHub username from an older kit), unknown status, passed stale_after, and two decisions
// sharing a number (NNN-*.md, from two PRs merged at once; new decisions are named after
// their ticket instead).

import fs from "node:fs";
import path from "node:path";

const OKF_VERSION = "0.2";
const SECTION_ORDER = ["architecture", "domain", "decisions", "data", "integrations", "runbooks"];
const SECTION_TITLES = {
  architecture: "Architecture", domain: "Domain", decisions: "Decisions", data: "Data",
  integrations: "Integrations", runbooks: "Runbooks",
};

const ROOT_LAYOUTS = ["full", "folders"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const rootFlag = rootAt >= 0 ? args[rootAt + 1] : null;
const rest = rootAt >= 0 ? args.filter((a, i) => i !== rootAt && i !== rootAt + 1) : args;
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const unknown = [...flags].filter((f) => !["--write", "--json"].includes(f));
const positional = rest.filter((a) => !a.startsWith("--"));
if (unknown.length || positional.length > 1 || (rootAt >= 0 && !ROOT_LAYOUTS.includes(rootFlag))) {
  console.error("Usage: node okf-validate.mjs [bundle-dir] [--write] [--json] [--root full|folders]");
  process.exit(2);
}
const bundle = path.resolve(positional[0] || "okf");
if (!fs.existsSync(bundle) || !fs.statSync(bundle).isDirectory()) {
  console.error(`okf-validate: no OKF bundle at ${bundle}`);
  process.exit(2);
}

const findings = [];
const rel = (p) => path.relative(bundle, p).split(path.sep).join("/") || ".";
const error = (file, msg) => findings.push({ level: "error", file: rel(file), msg });
const warn = (file, msg) => findings.push({ level: "warning", file: rel(file), msg });

// ---------- reading ----------

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

// Splits "---\n<yaml>\n---\n<body>". Returns { yaml: null } when there is no frontmatter.
function splitFrontmatter(text) {
  if (!text.startsWith("---\n")) return { yaml: null, body: text, bodyLine: 1 };
  const lines = text.split("\n");
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---" || lines[i] === "...") {
      return { yaml: lines.slice(1, i).join("\n"), body: lines.slice(i + 1).join("\n"), bodyLine: i + 2 };
    }
  }
  return { yaml: undefined, body: text, bodyLine: 1 }; // opened but never closed
}

// A small YAML reader for frontmatter. It reads the top-level mapping: plain, quoted and
// flow scalars, block scalars (| and >), and nested blocks (kept as raw text). It reports
// what YAML itself rejects at that level: tabs in indentation, lines that are not keys,
// duplicate keys, unclosed quotes and brackets. It is not a full YAML parser.
function parseYaml(yaml) {
  const data = {};
  const problems = [];
  const lines = yaml.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const n = i + 2; // line number in the file (after the opening ---)
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    if (/^\t/.test(line) || /^ *\t/.test(line)) { problems.push(`line ${n}: tab used for indentation`); continue; }
    if (/^\s/.test(line)) { problems.push(`line ${n}: indented line outside a key`); continue; }
    const m = line.match(/^("[^"]*"|'[^']*'|[^\s#:"'][^:]*?)\s*:(?:\s+(.*))?$/);
    if (!m) { problems.push(`line ${n}: expected "key: value"`); continue; }
    const key = unquote(m[1].trim());
    if (key in data) problems.push(`line ${n}: duplicate key "${key}"`);
    const rest = (m[2] || "").trim();
    // Collect the indented lines that belong to this key.
    const block = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || /^\s*$/.test(lines[i + 1]))) {
      if (/^ *\t/.test(lines[i + 1])) problems.push(`line ${i + 3}: tab used for indentation`);
      block.push(lines[++i]);
    }
    while (block.length && /^\s*$/.test(block[block.length - 1])) block.pop();
    if (/^[|>][+-]?\d*\s*(#.*)?$/.test(rest)) {
      const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      const text = block.map((l) => l.slice(indent));
      data[key] = rest.startsWith(">") ? text.join(" ").replace(/\s+/g, " ").trim() : text.join("\n");
    } else if (rest === "" || /^#/.test(rest)) {
      data[key] = block.length ? { block: block.join("\n") } : null;
    } else {
      if (block.length) problems.push(`line ${n}: "${key}" has both a value and indented lines`);
      const v = parseScalar(rest);
      if (v.problem) problems.push(`line ${n}: ${v.problem}`);
      data[key] = v.value;
    }
  }
  return { data, problems };
}

function unquote(s) {
  if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/\\"/g, '"');
  if (/^'.*'$/.test(s)) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s.startsWith('"')) {
    const m = s.match(/^"((?:[^"\\]|\\.)*)"\s*(#.*)?$/);
    if (m) return { value: m[1].replace(/\\(.)/g, "$1") };
    return { problem: /^"(?:[^"\\]|\\.)*"/.test(s) ? "text after a closing quote" : "unclosed double quote" };
  }
  if (s.startsWith("'")) {
    const m = s.match(/^'((?:[^']|'')*)'\s*(#.*)?$/);
    if (!m) return { problem: "unclosed or malformed single quote" };
    return { value: m[1].replace(/''/g, "'") };
  }
  const value = s.replace(/\s+#.*$/, "").trim();
  if (value.startsWith("[") || value.startsWith("{")) {
    // A quote opens only where an item or a value starts (after "[", "{", "," or ": "): an
    // apostrophe inside a plain item ([Banqup CFO, Vincent's term]) is just a character.
    let depth = 0, quote = null, start = true;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (quote) {
        if (quote === '"' && ch === "\\") i++;
        else if (ch === quote && quote === "'" && value[i + 1] === "'") i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === " " || ch === "\t") continue;
      if ((ch === '"' || ch === "'") && start) { quote = ch; start = false; continue; }
      if (ch === "[" || ch === "{") { depth++; start = true; }
      else if (ch === "]" || ch === "}") { depth--; start = false; }
      else if (ch === "," || (ch === ":" && /\s/.test(value[i + 1] || " "))) start = true;
      else start = false;
    }
    if (depth !== 0 || quote) return { problem: "unclosed [ ] or { }" };
    return { value: { flow: value } };
  }
  if (/: |:$/.test(value)) return { problem: 'unquoted value contains ": " (put the value in quotes)' };
  if (/^[@`]/.test(value)) return { problem: `a value cannot start with ${value[0]} unless it is quoted` };
  return { value };
}

// The items of a YAML list of plain or quoted scalars, flow ([a, b]) or block ("- a" lines); [] for
// an empty value; null when the value is not such a list (a single value, a map, nested lists).
function emailList(value) {
  if (value === null || value === undefined) return [];
  const item = (raw) => {
    const t = raw.trim();
    if (!t || /^[[{]/.test(t)) return null;
    if (/^["']/.test(t)) { const v = parseScalar(t); return v.problem ? null : v.value; }
    return t.includes(": ") ? null : t;
  };
  if (value.flow !== undefined) {
    const inner = value.flow.trim().match(/^\[([\s\S]*)\]$/);
    if (!inner) return null;
    if (!inner[1].trim()) return [];
    // Split on the commas outside quotes.
    const parts = [];
    let cur = "", quote = null;
    for (const ch of inner[1]) {
      if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === ",") { parts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    parts.push(cur);
    const items = parts.map(item);
    return items.includes(null) ? null : items;
  }
  if (value.block !== undefined) {
    const items = value.block.split("\n").filter((l) => l.trim() && !/^\s*#/.test(l)).map((l) => {
      const m = l.match(/^\s*-\s+(.*?)\s*(#.*)?$/);
      return m ? item(m[1]) : null;
    });
    return items.includes(null) ? null : items;
  }
  return null;
}

// ---------- walking ----------

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules");
  return {
    dir,
    files: entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md")).map((e) => path.join(dir, e.name)),
    dirs: entries.filter((e) => e.isDirectory()).map((e) => walk(path.join(dir, e.name))),
  };
}

const tree = walk(bundle);
const concepts = new Map(); // file -> { title, description }

function collect(node) {
  for (const file of node.files) {
    const name = path.basename(file);
    if (name === "index.md" || name === "log.md") continue;
    checkConcept(file);
  }
  node.dirs.forEach(collect);
}

// ---------- checks ----------

function checkConcept(file) {
  const text = readText(file);
  const { yaml, body, bodyLine } = splitFrontmatter(text);
  if (yaml === null) return error(file, "no YAML frontmatter (every concept file needs one, starting on line 1)");
  if (yaml === undefined) return error(file, "frontmatter is opened with --- but never closed");
  const { data, problems } = parseYaml(yaml);
  problems.forEach((p) => error(file, `frontmatter is not valid YAML: ${p}`));
  const str = (k) => (typeof data[k] === "string" ? data[k].trim() : "");
  if (!str("type")) error(file, 'missing or empty "type"');
  if (!str("owner")) error(file, 'missing "owner" (Dirox rule: the person accountable for this concept)');
  else if (!EMAIL.test(str("owner"))) warn(file, `owner "${str("owner")}" is not an email: write the person's email (their git user.email); /dirox-project:set-up-repo converts usernames`);
  if ("collaborators" in data) {
    const list = emailList(data.collaborators);
    if (!list) error(file, '"collaborators" must be a list of emails: collaborators: [name@example.com, other@example.com]');
    else for (const c of list.filter((x) => !EMAIL.test(x))) error(file, `collaborator "${c}" is not an email: write the person's email (their git user.email)`);
  }
  for (const m of yaml.matchAll(/human:([^\s"',}\]]+)/g)) {
    if (!EMAIL.test(m[1])) warn(file, `verified by "human:${m[1]}": write "human:<email>"; /dirox-project:set-up-repo converts usernames`);
  }
  if (!str("title")) warn(file, 'no "title" (the file name is used in the index)');
  if (!str("description")) warn(file, 'no "description" (its index line will be empty)');
  if (str("status") && !["draft", "stable", "deprecated"].includes(str("status"))) {
    warn(file, `status "${str("status")}" is not draft, stable or deprecated`);
  }
  if (str("stale_after") && !Number.isNaN(Date.parse(str("stale_after"))) && Date.parse(str("stale_after")) <= Date.now()) {
    warn(file, `stale since ${str("stale_after")}: check it is still true, then update stale_after`);
  }
  checkLinks(file, body, bodyLine);
  concepts.set(file, {
    title: str("title") || path.basename(file, ".md"),
    description: str("description").replace(/\s+/g, " "),
  });
}

function checkLinks(file, body, firstLine) {
  let inFence = false;
  // HTML comments are not rendered: blank them out, keeping the line numbers.
  const visible = body.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, " "));
  visible.split("\n").forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) return;
    for (const m of line.replace(/`[^`]*`/g, "").matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
      let clean = target.split("#")[0].split("?")[0];
      try { clean = decodeURIComponent(clean); } catch { /* keep as written */ }
      if (!clean) continue;
      const resolved = clean.startsWith("/") ? path.join(bundle, clean) : path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(resolved)) warn(file, `line ${firstLine + i}: broken link ${target}`);
    }
  });
}

function checkIndex(file, isRoot) {
  const { yaml } = splitFrontmatter(readText(file));
  if (yaml === undefined) return error(file, "frontmatter is opened with --- but never closed");
  if (yaml === null) {
    if (isRoot) warn(file, `no okf_version: generated root index declares okf_version "${OKF_VERSION}"`);
    return;
  }
  if (!isRoot) return error(file, "index.md below the bundle root must not have frontmatter");
  const { data, problems } = parseYaml(yaml);
  problems.forEach((p) => error(file, `frontmatter is not valid YAML: ${p}`));
  const extra = Object.keys(data).filter((k) => k !== "okf_version" && k !== "root_layout");
  if (extra.length) error(file, `root index.md frontmatter may only hold okf_version and root_layout (found: ${extra.join(", ")})`);
  if (data.root_layout !== undefined && !ROOT_LAYOUTS.includes(data.root_layout)) {
    error(file, `root_layout "${data.root_layout}" must be ${ROOT_LAYOUTS.join(" or ")}`);
  }
}

function checkLog(file) {
  const { yaml, body, bodyLine } = splitFrontmatter(readText(file));
  if (yaml !== null) warn(file, "log.md has frontmatter; the OKF log format has none");
  const dates = [];
  body.split("\n").forEach((line, i) => {
    const h = line.match(/^##\s+(.*?)\s*$/);
    if (!h) return;
    const d = h[1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) {
      error(file, `line ${bodyLine + i}: date heading "${d}" must be YYYY-MM-DD`);
    } else dates.push(d);
  });
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > dates[i - 1]) { warn(file, "entries should be newest first"); break; }
  }
  const repeated = [...new Set(dates.filter((d, i) => dates.indexOf(d) !== i))];
  if (repeated.length) warn(file, `date heading repeated (${repeated.join(", ")}): put that day's entries under one heading`);
}

function checkReserved(node, isRoot) {
  for (const file of node.files) {
    const name = path.basename(file);
    if (name === "index.md") checkIndex(file, isRoot);
    if (name === "log.md") checkLog(file);
  }
  node.dirs.forEach((d) => checkReserved(d, false));
}

// ---------- index generation ----------

const titleOf = (dirName) => SECTION_TITLES[dirName]
  || dirName.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const linkText = (s) => s.replace(/([\[\]])/g, "\\$1");
const urlOf = (from, to, isDir) => {
  const r = path.relative(from, to).split(path.sep).map(encodeURIComponent).join("/");
  return isDir ? `${r}/` : r;
};
const entry = (from, file) => {
  const c = concepts.get(file);
  return `* [${linkText(c.title)}](${urlOf(from, file)})${c.description ? ` - ${c.description}` : ""}`;
};
const byTitle = (a, b) => {
  const ta = concepts.get(a).title.toLowerCase(), tb = concepts.get(b).title.toLowerCase();
  return ta < tb ? -1 : ta > tb ? 1 : a < b ? -1 : 1;
};
const ownConcepts = (node) => node.files.filter((f) => concepts.has(f)).sort(byTitle);
const allConcepts = (node) => [...ownConcepts(node), ...node.dirs.flatMap(allConcepts)].sort(byTitle);
const sortDirs = (dirs) => [...dirs].sort((a, b) => {
  const na = path.basename(a.dir), nb = path.basename(b.dir);
  const ia = SECTION_ORDER.indexOf(na), ib = SECTION_ORDER.indexOf(nb);
  if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return na < nb ? -1 : 1;
});

// Root index: one section per top-level folder listing every concept below it, so the
// session-start hook gives Claude the whole map in one file.
// The root index, in the bundle's layout: "full" lists every concept under its folder's heading;
// "folders" lists the root's own concepts, then each folder with its count, like a folder index.
function rootIndex(node) {
  const front = ["---", `okf_version: "${OKF_VERSION}"`, ...(rootLayout === "folders" ? ["root_layout: folders"] : []), "---"];
  const out = [...front, "# Project knowledge", ""];
  ownConcepts(node).forEach((f) => out.push(entry(node.dir, f)));
  if (node.files.some((f) => path.basename(f) === "log.md")) out.push("* [Log](log.md) - what changed in this knowledge, newest first");
  if (rootLayout === "folders") {
    for (const d of sortDirs(node.dirs)) {
      const n = allConcepts(d).length;
      if (n) out.push(`* [${linkText(titleOf(path.basename(d.dir)))}](${urlOf(node.dir, d.dir, true)}) - ${n} concept${n === 1 ? "" : "s"}`);
    }
    return out.join("\n") + "\n";
  }
  for (const d of sortDirs(node.dirs)) {
    const list = allConcepts(d);
    if (!list.length) continue;
    out.push("", `# ${titleOf(path.basename(d.dir))}`, "");
    list.forEach((f) => out.push(entry(node.dir, f)));
  }
  return out.join("\n") + "\n";
}

// Folder index: its own concepts, then its sub-folders.
function folderIndex(node) {
  const out = [`# ${titleOf(path.basename(node.dir))}`];
  const own = ownConcepts(node);
  const subs = sortDirs(node.dirs);
  if (own.length || subs.length) out.push("");
  own.forEach((f) => out.push(entry(node.dir, f)));
  subs.forEach((d) => {
    const n = allConcepts(d).length;
    out.push(`* [${linkText(titleOf(path.basename(d.dir)))}](${urlOf(node.dir, d.dir, true)}) - ${n} concept${n === 1 ? "" : "s"}`);
  });
  return out.join("\n") + "\n";
}

function indexes(node, isRoot, list = []) {
  list.push({ file: path.join(node.dir, "index.md"), content: isRoot ? rootIndex(node) : folderIndex(node) });
  node.dirs.forEach((d) => indexes(d, false, list));
  return list;
}

// ---------- run ----------

collect(tree);
const write = flags.has("--write");
// The root's layout: --root sets it; otherwise the one the root index declares; otherwise "full".
let rootLayout = rootFlag;
if (!rootLayout) {
  const rootFile = path.join(bundle, "index.md");
  const { yaml } = fs.existsSync(rootFile) ? splitFrontmatter(readText(rootFile)) : { yaml: null };
  const declared = yaml ? parseYaml(yaml).data.root_layout : undefined;
  rootLayout = ROOT_LAYOUTS.includes(declared) ? declared : "full";
}
let written = 0;
for (const { file, content } of indexes(tree, true)) {
  const current = fs.existsSync(file) ? readText(file) : null;
  if (current === content) continue;
  if (write) { fs.writeFileSync(file, content); written++; }
  else error(file, current === null
    ? "missing: run `node okf-validate.mjs --write` to generate it"
    : "out of date: run `node okf-validate.mjs --write` (index files are generated, never edited by hand)");
}
checkReserved(walk(bundle), true);

// Numbered decisions (NNN-title.md) written by two PRs at once can take the same number.
const decisionsDir = path.join(bundle, "decisions");
if (fs.existsSync(decisionsDir)) {
  const byNumber = new Map();
  for (const name of fs.readdirSync(decisionsDir)) {
    const m = name.match(/^(\d+)-.*\.md$/);
    if (m) byNumber.set(Number(m[1]), [...(byNumber.get(Number(m[1])) || []), name]);
  }
  for (const names of byNumber.values()) {
    if (names.length > 1) warn(decisionsDir, `decisions share a number: ${names.join(", ")}. Rename the newer one after its ticket (<KEY-123>-short-title.md) and fix the links to it`);
  }
}

const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warning");
if (flags.has("--json")) {
  console.log(JSON.stringify({ bundle: path.relative(process.cwd(), bundle) || ".", okf_version: OKF_VERSION, concepts: concepts.size, indexesWritten: written, errors, warnings }, null, 2));
} else {
  for (const f of [...errors, ...warnings]) console.log(`${f.level === "error" ? "ERROR" : "WARN "} ${f.file}: ${f.msg}`);
  const summary = `okf-validate: ${concepts.size} concept(s), ${errors.length} error(s), ${warnings.length} warning(s)`;
  console.log(write ? `${summary}, ${written} index file(s) written` : summary);
}
process.exit(errors.length ? 1 : 0);
