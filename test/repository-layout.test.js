import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRegistry } from "../registry/build.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = path.join(REPO_ROOT, ".agents", "skills");
const AGENTS_TEMPLATE_SNIPPETS_ROOT = path.join(REPO_ROOT, "templates", "agents", "snippets");

const AGENTS_SNIPPET_MARKER_PAIRS = Object.freeze([
  ["<!-- vasir:purpose:start -->", "<!-- vasir:purpose:end -->"],
  ["<!-- vasir:routing:start -->", "<!-- vasir:routing:end -->"],
  ["<!-- vasir:engineering-doctrine-inserts:start -->", "<!-- vasir:engineering-doctrine-inserts:end -->"]
]);

const ROOT_CONTRACT_MARKER_PAIRS = Object.freeze([
  ["<!-- vasir:purpose:start -->", "<!-- vasir:purpose:end -->"],
  ["<!-- vasir:routing:start -->", "<!-- vasir:routing:end -->"],
  ["<!-- vasir:nonobvious:start -->", "<!-- vasir:nonobvious:end -->"],
  ["<!-- vasir:engineering-doctrine-inserts:start -->", "<!-- vasir:engineering-doctrine-inserts:end -->"]
]);

function walkFiles(directoryPath) {
  const discoveredFiles = [];
  for (const directoryEntry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const absoluteEntryPath = path.join(directoryPath, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      discoveredFiles.push(...walkFiles(absoluteEntryPath));
      continue;
    }
    discoveredFiles.push(absoluteEntryPath);
  }
  return discoveredFiles.sort();
}

function findLocalMarkdownLinks(filePath) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const linkMatches = [...fileContents.matchAll(/\]\((?!https?:|mailto:|#)([^)]+)\)/g)];
  return linkMatches.map((matchEntry) => matchEntry[1]);
}

test("skills use a flat .agents/skills/<name> directory layout", () => {
  const skillManifestPaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "SKILL.md");
  assert.ok(skillManifestPaths.length > 0, "expected at least one skill");

  for (const manifestPath of skillManifestPaths) {
    const relativeManifestPath = path.relative(REPO_ROOT, manifestPath).replace(/\\/g, "/");
    assert.match(
      relativeManifestPath,
      /^\.agents\/skills\/[^/]+\/SKILL\.md$/,
      `root skill manifests must live directly under .agents/skills/<name>: ${relativeManifestPath}`
    );
  }
});

test("optional legacy meta.json files only appear at .agents/skills/<name>/meta.json", () => {
  const metaFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "meta.json");

  for (const metaFilePath of metaFilePaths) {
    const relativeMetaPath = path.relative(REPO_ROOT, metaFilePath).replace(/\\/g, "/");
    assert.match(
      relativeMetaPath,
      /^\.agents\/skills\/[^/]+\/meta\.json$/,
      `legacy meta.json files must live directly under .agents/skills/<name>: ${relativeMetaPath}`
    );
  }
});

test("built registry file inventories match checked-in skill files", () => {
  const registry = buildRegistry();
  assert.ok(registry.skills.length > 0, "expected at least one built skill");

  for (const skillEntry of registry.skills) {
    const skillDirectoryPath = path.join(REPO_ROOT, skillEntry.path);
    const actualRelativeFilePaths = walkFiles(skillDirectoryPath)
      .map((filePath) => path.relative(skillDirectoryPath, filePath).replace(/\\/g, "/"))
      .sort();

    assert.deepEqual(
      skillEntry.files,
      actualRelativeFilePaths,
      `file inventory mismatch for ${skillEntry.path}`
    );
  }
});

test("built-in eval suites live with their owning skills and include guidelines", () => {
  const suiteFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "suite.json");
  assert.ok(suiteFilePaths.length > 0, "expected at least one built-in skill eval suite");

  for (const suiteFilePath of suiteFilePaths) {
    const relativeSuitePath = path.relative(REPO_ROOT, suiteFilePath).replace(/\\/g, "/");
    assert.match(
      relativeSuitePath,
      /^\.agents\/skills\/[^/]+\/evals\/suite\.json$/,
      `built-in eval suites must live under .agents/skills/<name>/evals: ${relativeSuitePath}`
    );

    const readmePath = path.join(path.dirname(suiteFilePath), "README.md");
    assert.ok(fs.existsSync(readmePath), `missing eval guidelines beside ${relativeSuitePath}`);

    const suiteDefinition = JSON.parse(fs.readFileSync(suiteFilePath, "utf8"));
    assert.ok(!Object.hasOwn(suiteDefinition, "mode"), `suite should omit mode: ${relativeSuitePath}`);
    assert.ok(!Object.hasOwn(suiteDefinition, "judge"), `suite should use judgePrompt, not judge: ${relativeSuitePath}`);
    assert.ok(!Object.hasOwn(suiteDefinition, "validator"), `suite should not define validator commands: ${relativeSuitePath}`);
    for (const caseDefinition of suiteDefinition.cases) {
      const hardCheckCount =
        (Array.isArray(caseDefinition.requiredSubstrings) ? caseDefinition.requiredSubstrings.length : 0) +
        (Array.isArray(caseDefinition.forbiddenSubstrings) ? caseDefinition.forbiddenSubstrings.length : 0);
      assert.ok(
        hardCheckCount > 0,
        `suite cases must define at least one hard check: ${relativeSuitePath}#${caseDefinition.id}`
      );
    }
  }
});

test("work spec skill owns the current schema and projection rules", () => {
  const workSpecSkillPath = path.join(SKILLS_ROOT, "plan__maintain-work-spec", "SKILL.md");

  const workSpecSkillText = fs.readFileSync(workSpecSkillPath, "utf8");

  assert.match(workSpecSkillText, /Work Spec = Product Requirement Doc \+ Engineering Specification \+ Design Document \+ UX Document/);
  assert.match(workSpecSkillText, /serialization format for judgment state/);
  assert.match(workSpecSkillText, /Schema truth:\*\* the `plan__maintain-work-spec` skill/);
  assert.match(workSpecSkillText, /Stale specs are synced, not versioned/);
  assert.match(workSpecSkillText, /Spec authorship is judgment work/);
  assert.match(workSpecSkillText, /Milestone rungs are self-contained build packets/);
  assert.match(workSpecSkillText, /A spec whose header is richer than its active rung is upside down/);
  assert.match(workSpecSkillText, /Multi-item user asks get an Input Coverage Ledger before synthesis/);
  assert.match(workSpecSkillText, /`tmp\/` artifacts expire; every recorded artifact keeps a surviving summary/);
  assert.match(workSpecSkillText, /Parked/);
  assert.match(workSpecSkillText, /Projection resync/);
  assert.match(workSpecSkillText, /rung bodies \(§5\.2\) are truth/);
  assert.match(workSpecSkillText, /header fields, Human Read, §5\.1 index row, and §6 gate table are projections/);
  assert.match(workSpecSkillText, /gate state resolves toward the eval plan/);
  assert.match(workSpecSkillText, /# WORK SPEC — <FEATURE_NAME>\n\*\*Human Read:\*\*/);
  assert.match(workSpecSkillText, /The first field under the title, always/);
  assert.match(workSpecSkillText, /so that <one-level-higher outcome>/);
  assert.match(workSpecSkillText, /Weak: `We are trying to make incidents easier to scan so that operators can triage incidents confidently\.`/);
  assert.match(workSpecSkillText, /Strong: `We are trying to make incidents easier to scan so that Harbor Pulse reduces time-to-mitigation and customer-impact uncertainty during live incidents\.`/);
  assert.match(workSpecSkillText, /User Journey Unlock/);
  assert.match(workSpecSkillText, /Engineering System Unlock/);
  assert.match(workSpecSkillText, /\| # \| User item \| Disposition \| Where it lives \| Notes \|/);
  assert.match(workSpecSkillText, /Do not reorder or rename top-level sections 1–7 or A1–A5/);
  assert.match(workSpecSkillText, /no naked `M1`\/`Phase 2` anywhere/);
  assert.match(workSpecSkillText, /Contracts live in §4 only/);
  assert.match(workSpecSkillText, /Status vocabulary is root §4's/);
  assert.match(workSpecSkillText, /Objectively Green/);
  assert.match(workSpecSkillText, /Waiting Human/);
  assert.match(workSpecSkillText, /Evidence:/);
  assert.match(workSpecSkillText, /browser-rendered rungs record real route\/scenario captures/);
  assert.match(workSpecSkillText, /Taste-critical rungs/);
  assert.match(workSpecSkillText, /Reference bar:/);
  assert.match(workSpecSkillText, /Must-feel delta:/);
  assert.match(workSpecSkillText, /Must-not-feel delta:/);
  assert.match(workSpecSkillText, /Rejection criteria:/);
  assert.match(workSpecSkillText, /Rung sizing/);
  assert.match(workSpecSkillText, /\| Complexity \|/);
  assert.match(workSpecSkillText, /\| Risk \|/);
  assert.match(workSpecSkillText, /\| Perf impact \|/);
  assert.match(workSpecSkillText, /\| Cost impact \|/);
  assert.match(workSpecSkillText, /\| Rung \| State \| Size \| Unlock \| Proof summary \| Evidence \| Commit \| Notes \|/);
  assert.match(workSpecSkillText, /\*\*Proof plan:\*\* eval-plan gate IDs plus the shortest real journey loop/);
  assert.match(workSpecSkillText, /Rung commit:/);
  assert.match(workSpecSkillText, /Pending — commit after proof, spec sync, and eval sync/);
  assert.match(workSpecSkillText, /Conformance Check \(run before writing — never stored in the doc\)/);
  assert.doesNotMatch(workSpecSkillText, /# S-Tier Work Spec Example/);
});

test("agent template snippets own profile-specific insertion blocks", () => {
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, "templates", "agents", "profiles")), "profiles/ must not return; profile selection composes from snippets/");

  const snippetFilePaths = fs.readdirSync(AGENTS_TEMPLATE_SNIPPETS_ROOT, { withFileTypes: true })
    .filter((directoryEntry) => directoryEntry.isFile() && directoryEntry.name.endsWith(".md"))
    .map((directoryEntry) => path.join(AGENTS_TEMPLATE_SNIPPETS_ROOT, directoryEntry.name))
    .sort();
  assert.ok(snippetFilePaths.length > 0, "expected AGENTS profile snippets");

  for (const snippetFilePath of snippetFilePaths) {
    const relativeSnippetPath = path.relative(REPO_ROOT, snippetFilePath).replace(/\\/g, "/");
    const snippetText = fs.readFileSync(snippetFilePath, "utf8");

    for (const [startMarker, endMarker] of AGENTS_SNIPPET_MARKER_PAIRS) {
      assert.equal(
        (snippetText.match(new RegExp(startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length,
        1,
        `${relativeSnippetPath} must contain exactly one ${startMarker}`
      );
      assert.equal(
        (snippetText.match(new RegExp(endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length,
        1,
        `${relativeSnippetPath} must contain exactly one ${endMarker}`
      );
      assert.ok(
        snippetText.indexOf(startMarker) < snippetText.indexOf(endMarker),
        `${relativeSnippetPath} must place ${startMarker} before ${endMarker}`
      );
    }
  }
});

test("root contract templates use the operating contract shape and required renderer seams", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const exampleAgentsText = fs.readFileSync(path.join(REPO_ROOT, "docs", "example-agents.md"), "utf8");

  assert.match(agentsTemplateText, /# AGENTS\.md — \[Project Name\] Root Operating Contract/);
  assert.match(claudeTemplateText, /# CLAUDE\.md — \[Project Name\] Root Operating Contract/);
  assert.match(agentsTemplateText, /contract for codex and other non-Claude agents/);
  assert.match(claudeTemplateText, /contract for Claude agents \(Fable orchestrator \+ Claude subagents\)/);
  assert.match(agentsTemplateText, /The orchestrator's tier does orchestration/);
  assert.match(agentsTemplateText, /Codex gpt-5\.5-thinking xhigh delegates/);
  assert.match(claudeTemplateText, /Prime Directive — Fable tokens are the scarce resource/);
  assert.match(claudeTemplateText, /Fable xhigh \(main agent or subagents inheriting it\)/);
  assert.match(claudeTemplateText, /In-harness Claude subagents/);

  for (const [templateName, templateText] of [
    ["AGENTS", agentsTemplateText],
    ["CLAUDE", claudeTemplateText]
  ]) {
    assert.doesNotMatch(templateText, /vasir:profile/, `${templateName} template should not persist profile markers`);
    assert.doesNotMatch(templateText, /Last Updated/, `${templateName} template should not carry stale timestamp fields`);
    assert.doesNotMatch(templateText, /update alongside major architectural PRs/, `${templateName} template should not carry legacy boilerplate`);
    for (const [startMarker, endMarker] of ROOT_CONTRACT_MARKER_PAIRS) {
      assert.match(templateText, new RegExp(startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${templateName} template missing ${startMarker}`);
      assert.match(templateText, new RegExp(endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${templateName} template missing ${endMarker}`);
      assert.ok(
        templateText.indexOf(startMarker) < templateText.indexOf(endMarker),
        `${templateName} template must place ${startMarker} before ${endMarker}`
      );
    }
    assert.match(templateText, /# 0\. The Unlock Mandate/);
    assert.match(templateText, /# 1\. Constraint Precedence/);
    assert.match(templateText, /# 3\. The Working Relationship/);
    assert.match(templateText, /# 5\. Proof Doctrine/);
    assert.match(templateText, /# 8\. Custody/);
    assert.match(templateText, /Senior-engineer latitude/);
    assert.match(templateText, /The lane is a journey boundary, not a file list/);
    assert.match(templateText, /Boundary discipline — attribute, don't fix/);
    assert.doesNotMatch(templateText, /Existing files allowed to edit:/);
    assert.doesNotMatch(templateText, /Plan Amendment Protocol/);
    assert.doesNotMatch(templateText, /Escalation triggers:/);
    assert.doesNotMatch(templateText, /ESCALATION_REQUEST/);
    assert.doesNotMatch(templateText, /Approved change envelope:/);
    assert.doesNotMatch(templateText, /file targets exceed the approved envelope/);
  }
  assert.doesNotMatch(exampleAgentsText, /Which exact files and systems will be touched/);
  assert.doesNotMatch(exampleAgentsText, /Do not edit outside the declared lane/);
  assert.doesNotMatch(exampleAgentsText, /approved change boundary/);
});

test("AGENTS taxonomy separates generated roots from folder steering maps", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const templateReadmeText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "README.md"), "utf8");
  const rootReadmeText = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");
  const cliReferenceText = fs.readFileSync(path.join(REPO_ROOT, "docs", "cli-reference.md"), "utf8");
  const folderAgentsSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "agents__creating-folder-agents", "SKILL.md"),
    "utf8"
  );

  for (const documentText of [agentsTemplateText, claudeTemplateText, templateReadmeText, rootReadmeText, cliReferenceText]) {
    assert.match(documentText, /Nested root \/ folder `AGENTS\.md`|Nested root `AGENTS\.md`|nested root `AGENTS\.md`|Nested root AGENTS|nested root AGENTS/);
    assert.match(documentText, /Folder `AGENTS\.md`|Folder AGENTS|folder AGENTS/);
  }

  assert.match(agentsTemplateText, /Folder `AGENTS\.md` files are hand-authored steering maps/);
  assert.match(claudeTemplateText, /Folder `AGENTS\.md` files are hand-authored steering maps/);
  assert.match(rootReadmeText, /Do not use `vasir agents sync --scope` for ordinary folder steering maps/);
  assert.match(cliReferenceText, /Folder `AGENTS\.md` files are different/);
  assert.match(folderAgentsSkillText, /Folder AGENTS are local steering maps/);
  assert.match(folderAgentsSkillText, /No sidecar\. No root template\. No `vasir agents sync --scope`/);
  assert.match(folderAgentsSkillText, /Do not use `AGENTS__non-obvious\.md` for folder steering maps/);
  assert.doesNotMatch(folderAgentsSkillText, /local contract/i);
  assert.doesNotMatch(folderAgentsSkillText, /folder-scoped/i);
});

test("root AGENTS and handoff gate block proof exhaust and script bloat", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const handoffSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "handoff__final-quality-gate", "SKILL.md"),
    "utf8"
  );

  for (const templateText of [agentsTemplateText, claudeTemplateText]) {
    assert.match(templateText, /Raw proof: `tmp\/<datetime>__<semantic-description>\/` — current-run evidence only/);
    assert.match(templateText, /Durable logic, reusable harnesses, and canonical docs never live in `tmp\/`/);
    assert.match(templateText, /the spec keeps the numbers/);
    assert.match(templateText, /`package\.json` scripts are a six-month developer interface, not a proof log/);
  }

  assert.match(handoffSkillText, /Repo shape & command surface/);
  assert.match(handoffSkillText, /Temporary proof lives under `tmp\/\*\*` only/);
  assert.match(handoffSkillText, /Added or changed package scripts name a six-month developer or CI command/);
  assert.match(handoffSkillText, /never a bug, task, date, or proof rung/);
  assert.match(handoffSkillText, /This table \*is\* the audit/);
});

test("root AGENTS ties commits to objectively green Work Spec rungs", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");

  for (const templateText of [agentsTemplateText, claudeTemplateText]) {
    assert.match(templateText, /Objectively Green/);
    assert.match(templateText, /`Complete` — objective gates green, subjective gates accepted, docs synced, audit run/);
    assert.match(templateText, /Git — commit forward, commit often/);
    assert.match(templateText, /The orchestrator commits: at every Objectively Green rung, at lane close, and at coherent stopping points/);
    assert.match(templateText, /No stopgaps — build vFinal/);
    assert.match(templateText, /reduce capability, not correctness/);
    assert.match(templateText, /compatibility shims only for migration\/rollback\/protocol\/persistence\/client-version safety/);
    assert.match(templateText, /A failure state is the user having to run `git commit` himself/);
    assert.doesNotMatch(templateText, /`git add -A` and `git commit` are allowed when committing current workspace progress/);
    assert.doesNotMatch(templateText, /Commit messages should be generated 1-2 line summaries/);
    assert.doesNotMatch(templateText, /When a verified Work Spec milestone is complete/);
    assert.doesNotMatch(templateText, /declared scope/);
    assert.doesNotMatch(templateText, /approved scope/);
    assert.doesNotMatch(templateText, /active scope/);
  }
});

test("root AGENTS keeps generic JS and game test doctrine profile-aware", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const backendSnippetText = fs.readFileSync(
    path.join(REPO_ROOT, "templates", "agents", "snippets", "backend-inserts.md"),
    "utf8"
  );

  for (const templateText of [agentsTemplateText, claudeTemplateText]) {
    assert.match(templateText, /Plain ESM JavaScript in `\.js` files absent a stronger local convention/);
    assert.match(templateText, /Env reads and logging only through the repo's config\/logger boundaries/);
    assert.match(templateText, /games use `games\/<gameId>\/tests\/` absent a local convention/);
    assert.doesNotMatch(templateText, /For Javascript, write plain JavaScript with ESM in `\.js` files only: No `\.mjs`/);
    assert.doesNotMatch(templateText, /For individual games, tests MUST live under `games\/<gameId>\/tests\/`/);
    assert.doesNotMatch(templateText, /Game-Specific:\n  - Individual game tests live under `games\/<gameId>\/tests\/`/);
  }
  assert.match(backendSnippetText, /Backend profile default: ESM in `\.js` files\. Follow stronger repo-local module or file-extension conventions when present/);
  assert.match(backendSnippetText, /Backend profile default: Mocha for backend tests\. Follow stronger repo-local test-runner conventions when present/);
  assert.match(backendSnippetText, /Do not read `process\.env` outside the repo-owned config boundary; backend profile default is `src\/env\.js`/);
  assert.doesNotMatch(backendSnippetText, /Modules: ESM with `\.js` files only\. Do not create `\.mjs`/);
  assert.doesNotMatch(backendSnippetText, /Use Mocha for backend tests/);
  assert.doesNotMatch(backendSnippetText, /approved scope/);
});

test("testing doctrine forbids tombstone absence tests", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const testingSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "testing__enforcing-mandate", "SKILL.md"),
    "utf8"
  );

  for (const templateText of [agentsTemplateText, claudeTemplateText]) {
    assert.match(templateText, /No tombstone tests:/);
    assert.match(templateText, /Absence assertions only guard a named contract/);
  }
  assert.match(testingSkillText, /No tombstone tests/);
  assert.match(testingSkillText, /private locals, variable names, function names/);
  assert.match(testingSkillText, /Writing tombstone tests that only prove removed UI\/API\/backend\/data\/implementation artifacts stayed absent/);
});

test("local markdown links resolve", () => {
  const documentPathsToCheck = [
    "README.md",
    "MANIFESTO.md",
    "docs/cli-reference.md",
    "docs/create-your-first-skill.md",
    "docs/example-agents.md",
    "docs/skill-reference.md",
    "docs/troubleshooting.md",
    "work/WORK.md",
    "docs/writing-skills.md",
    "templates/agents/README.md",
    "templates/agents/AGENTS.md",
    "templates/agents/CLAUDE.md",
    "templates/SKILL.md"
  ];

  for (const relativeDocumentPath of documentPathsToCheck) {
    const absoluteDocumentPath = path.join(REPO_ROOT, relativeDocumentPath);
    for (const relativeLinkPath of findLocalMarkdownLinks(absoluteDocumentPath)) {
      const [relativeFilePath] = relativeLinkPath.split("#");
      const resolvedLinkPath = path.resolve(path.dirname(absoluteDocumentPath), relativeFilePath);
      assert.ok(fs.existsSync(resolvedLinkPath), `${relativeDocumentPath} references missing path ${relativeLinkPath}`);
    }
  }
});
