import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isIgnoredCatalogEntry } from "../cli/catalog-file-policy.js";
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
    if (isIgnoredCatalogEntry({
      entryName: directoryEntry.name,
      isDirectory: directoryEntry.isDirectory()
    })) {
      continue;
    }

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

function findConcreteSkillResourceReferences(filePath) {
  const fileContents = fs.readFileSync(filePath, "utf8");
  const referenceMatches = [
    ...fileContents.matchAll(/^\s*-\s+`((?:references|scripts|templates|assets)\/[^`*<>]+)`/gm)
  ];
  return referenceMatches.map((matchEntry) => matchEntry[1]);
}

function extractUniqueTaggedBlock(documentText, tagName) {
  const blockPattern = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "g");
  const matches = documentText.match(blockPattern) ?? [];
  assert.equal(matches.length, 1, `expected exactly one <${tagName}> block`);
  return matches[0];
}

test("root skills stay flat and routed reference skills use one controlled nesting level", () => {
  const skillManifestPaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "SKILL.md");
  assert.ok(skillManifestPaths.length > 0, "expected at least one skill");

  for (const manifestPath of skillManifestPaths) {
    const relativeManifestPath = path.relative(REPO_ROOT, manifestPath).replace(/\\/g, "/");
    const isRootSkill = /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(relativeManifestPath);
    const isRoutedReferenceSkill = /^\.agents\/skills\/[^/]+\/references\/[^/]+\/SKILL\.md$/.test(relativeManifestPath);
    assert.ok(
      isRootSkill || isRoutedReferenceSkill,
      `skill manifests must be root skills or one-level routed references: ${relativeManifestPath}`
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

test("root contract templates preserve renderer marker structure", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");

  for (const [templateName, templateText] of [
    ["AGENTS", agentsTemplateText],
    ["CLAUDE", claudeTemplateText]
  ]) {
    for (const [startMarker, endMarker] of ROOT_CONTRACT_MARKER_PAIRS) {
      const escapedStartMarker = startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedEndMarker = endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.equal(
        (templateText.match(new RegExp(escapedStartMarker, "g")) ?? []).length,
        1,
        `${templateName} template must contain exactly one ${startMarker}`
      );
      assert.equal(
        (templateText.match(new RegExp(escapedEndMarker, "g")) ?? []).length,
        1,
        `${templateName} template must contain exactly one ${endMarker}`
      );
      assert.ok(
        templateText.indexOf(startMarker) < templateText.indexOf(endMarker),
        `${templateName} template must place ${startMarker} before ${endMarker}`
      );
    }
  }
});

test("root contract twins preserve the generic code-audit routing contract", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const agentsRoutingBlock = extractUniqueTaggedBlock(agentsTemplateText, "code_audit_routing");
  const claudeRoutingBlock = extractUniqueTaggedBlock(claudeTemplateText, "code_audit_routing");

  assert.equal(agentsRoutingBlock, claudeRoutingBlock, "AGENTS and CLAUDE must share one code-audit routing law");
  assert.match(
    agentsRoutingBlock,
    /unqualified phrases[\s\S]*`audit the code`[\s\S]*`audit this code`[\s\S]*`do a code audit`[\s\S]*`run a code audit`[\s\S]*applying both `\$code__auditing` and `\$audit-ai-code-accretion`/i
  );
  assert.match(agentsRoutingBlock, /focused code review[\s\S]*uses `\$code__auditing` alone/i);
  assert.match(agentsRoutingBlock, /single named specialist audit[\s\S]*uses only that named lens/i);
  assert.match(agentsRoutingBlock, /boundary-only suffix[\s\S]*retains the standard pair/i);
  assert.match(agentsRoutingBlock, /explicitly asks for multiple distinct audit lenses[\s\S]*uses only those named lenses/i);
  assert.match(agentsRoutingBlock, /canonical report and release verdict/);
  assert.match(agentsRoutingBlock, /without a second report or rival ship verdict/);
  assert.match(agentsRoutingBlock, /independent-review topology above owns freshness and exactly-once delegation/i);
  assert.match(agentsRoutingBlock, /One reviewer applies the standard pair/);
});

test("root contract twins preserve exactly-once independent-review topology", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const agentsTopologyBlock = extractUniqueTaggedBlock(agentsTemplateText, "independent_review_topology");
  const claudeTopologyBlock = extractUniqueTaggedBlock(claudeTemplateText, "independent_review_topology");

  assert.equal(agentsTopologyBlock, claudeTopologyBlock, "AGENTS and CLAUDE must share one independent-review topology");
  assert.match(agentsTopologyBlock, /explicitly requested or specifically warranted/);
  assert.match(agentsTopologyBlock, /authored or materially shaped the candidate/);
  assert.match(agentsTopologyBlock, /user explicitly asks for a fresh reviewer/);
  assert.match(agentsTopologyBlock, /delegate it once to a fresh review conversation/);
  assert.match(agentsTopologyBlock, /already that fresh reviewer[\s\S]*do not delegate again/);
  assert.match(agentsTopologyBlock, /creates no automatic review gate/);
  assert.match(agentsTopologyBlock, /current request[\s\S]*candidate artifact or diff[\s\S]*directly relevant evidence/);
  assert.match(agentsTopologyBlock, /not the author's trajectory or conclusions/);
});

test("root contract twins preserve scoped failure semantics without false-green outcomes", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const claudeTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "CLAUDE.md"), "utf8");
  const agentsFailureBlock = extractUniqueTaggedBlock(agentsTemplateText, "failure_semantics");
  const claudeFailureBlock = extractUniqueTaggedBlock(claudeTemplateText, "failure_semantics");

  assert.equal(agentsFailureBlock, claudeFailureBlock, "AGENTS and CLAUDE must share one failure-semantics law");
  assert.equal((agentsFailureBlock.match(/fail(?:s|ed|ing)?[ _-]?closed/gi) ?? []).length, 1);
  assert.doesNotMatch(agentsTemplateText.replace(agentsFailureBlock, ""), /fail(?:s|ed|ing)?[ _-]?closed/i);
  assert.doesNotMatch(claudeTemplateText.replace(claudeFailureBlock, ""), /fail(?:s|ed|ing)?[ _-]?closed/i);
  assert.match(agentsFailureBlock, /specifically named protected disclosure, privilege\/value change, canonical write, destructive action/);
  assert.match(agentsFailureBlock, /control posture, never an operation, journey, task, proof, or completion verdict/);
  assert.match(agentsFailureBlock, /subject, scope, and promised terminal outcome/);
  assert.match(agentsFailureBlock, /`SUCCEEDED`, `DEGRADED`, `PENDING_OR_UNKNOWN`, `DENIED`, `UNAVAILABLE`, or `FAILED`/);
  assert.match(agentsFailureBlock, /Control preservation never upgrades the runtime outcome/);
  assert.match(agentsFailureBlock, /proof claim is `GREEN`, `RED`, or `UNVERIFIED`/);
  assert.match(agentsFailureBlock, /`NO_SIGNAL` is an evidence reason, never a product outcome/);
  assert.match(agentsFailureBlock, /may not promote subsystem\/task success into user-journey success/);

  for (const templateText of [agentsTemplateText, claudeTemplateText]) {
    assert.match(templateText, /\| Validation \| Report `FAILED` with a typed `INVALID_INPUT` reason \|/);
    assert.match(templateText, /\| Known policy \| Report `DENIED` after an evaluated policy refusal \|/);
    assert.doesNotMatch(templateText, /typed invalid or denied outcome/);
  }

  const normativeSkillFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) =>
    [".js", ".json", ".md", ".txt", ".yaml", ".yml"].includes(path.extname(filePath))
  );
  for (const skillFilePath of normativeSkillFilePaths) {
    const relativeSkillFilePath = path.relative(REPO_ROOT, skillFilePath).replace(/\\/g, "/");
    const skillFileText = fs.readFileSync(skillFilePath, "utf8");
    assert.doesNotMatch(
      skillFileText,
      /fail(?:s|ed|ing)?[ _-]?closed/i,
      `${relativeSkillFilePath} must use a precise failure outcome and cite root failure semantics instead of repeating the phrase`
    );
  }
});

test("failure-owning skills preserve runtime, proof, and completion truth", () => {
  const codeAuditText = fs.readFileSync(path.join(SKILLS_ROOT, "code__auditing", "SKILL.md"), "utf8");
  const fixBugsText = fs.readFileSync(path.join(SKILLS_ROOT, "code__fixing-bugs", "SKILL.md"), "utf8");
  const designProofText = fs.readFileSync(path.join(SKILLS_ROOT, "eval__design-proof-gates", "SKILL.md"), "utf8");
  const implementProofText = fs.readFileSync(path.join(SKILLS_ROOT, "eval__implement-proof-gate", "SKILL.md"), "utf8");
  const implementProofCasesText = fs.readFileSync(
    path.join(SKILLS_ROOT, "eval__implement-proof-gate", "references", "eval-cases.md"),
    "utf8"
  );
  const replayText = fs.readFileSync(path.join(SKILLS_ROOT, "game__adding-replays", "SKILL.md"), "utf8");
  const coreLoopText = fs.readFileSync(path.join(SKILLS_ROOT, "game__building-core-loop", "SKILL.md"), "utf8");
  const implementWorkSpecText = fs.readFileSync(path.join(SKILLS_ROOT, "plan__implement-work-spec", "SKILL.md"), "utf8");
  const maintainWorkSpecText = fs.readFileSync(path.join(SKILLS_ROOT, "plan__maintain-work-spec", "SKILL.md"), "utf8");
  const questionWorkSpecText = fs.readFileSync(path.join(SKILLS_ROOT, "plan__question-spec", "SKILL.md"), "utf8");

  assert.match(codeAuditText, /Failure truth:[\s\S]*empty data, hidden UI, a swallowed error, blocked work, or a successful no-op falsely look green/);
  assert.match(codeAuditText, /control flow never proves the promised user\/system terminal outcome/);
  assert.match(fixBugsText, /Diagnosis: UNRESOLVED — no mutation made/);
  assert.match(fixBugsText, /product claim `RED`[\s\S]*otherwise `UNVERIFIED`/);

  assert.match(designProofText, /gate lifecycle states, not unqualified task or product outcomes/);
  assert.match(designProofText, /only Objectively Green can carry `GREEN`/);
  assert.match(implementProofText, /Harness: VALID \| DEFECTIVE \| UNVERIFIED/);
  assert.match(implementProofText, /Run: COMPLETED \| BLOCKED \| NOT_RUN/);
  assert.match(implementProofText, /ProductClaim: GREEN \| RED \| UNVERIFIED/);
  assert.match(implementProofText, /`GREEN` and `RED` are legal only when `Harness: VALID` and `Run: COMPLETED`/);
  assert.match(implementProofText, /`NO_SIGNAL` is only an `EvidenceReason`/);
  assert.doesNotMatch(implementProofText, /Skill outcome: PASS/);
  for (const caseNumber of [1, 2, 3, 4, 5, 6, 7]) {
    assert.match(implementProofCasesText, new RegExp(`^## ${caseNumber}\\.`, "m"));
  }

  assert.match(coreLoopText, /state: 'UNSAVED'[\s\S]*recovery: 'retry-save'/);
  assert.match(coreLoopText, /state: 'EMPTY'[\s\S]*state: 'LOAD_FAILED'[\s\S]*state: 'SAVE_INCOMPATIBLE'[\s\S]*state: 'LOAD_UNAVAILABLE'/);
  assert.match(coreLoopText, /read, parse, expiry, or version failure must likewise remain distinct from confirmed `EMPTY`/);
  assert.match(replayText, /`EMPTY` is a data state only after a `SUCCEEDED` discovery response/);
  assert.match(replayText, /failed refresh\/load-more preserves existing rows, playback actions, and the captured cursor/);

  assert.match(maintainWorkSpecText, /subject, scope, promised terminal outcome, surviving valid state\/value/);
  assert.match(questionWorkSpecText, /Failure-contract truth:[\s\S]*rung remains open/);
  assert.match(implementWorkSpecText, /Failure truth is completion truth[\s\S]*keep the rung open/);
});

test("paired code-audit skill and eval contracts agree with root routing", () => {
  const codeAuditText = fs.readFileSync(path.join(SKILLS_ROOT, "code__auditing", "SKILL.md"), "utf8");
  const accretionAuditText = fs.readFileSync(path.join(SKILLS_ROOT, "audit-ai-code-accretion", "SKILL.md"), "utf8");
  const nodePerformanceAuditText = fs.readFileSync(
    path.join(SKILLS_ROOT, "audit__optimizing-node-backend", "SKILL.md"),
    "utf8"
  );
  const accretionEvalText = fs.readFileSync(
    path.join(SKILLS_ROOT, "audit-ai-code-accretion", "references", "eval-cases.md"),
    "utf8"
  );

  assert.match(codeAuditText, /Root §6 owns first-match request classification/);
  assert.match(codeAuditText, /invoke `\$audit-ai-code-accretion` in `EMBEDDED` mode/);
  assert.match(codeAuditText, /explicitly combined review containing both code\/release and accretion/);
  assert.match(codeAuditText, /owns the canonical report/);
  assert.match(accretionAuditText, /Root §6 owns first-match request classification/);
  assert.match(accretionAuditText, /`EMBEDDED`[\s\S]*write no separate report/);
  assert.match(accretionAuditText, /explicitly combined code-plus-accretion review/);
  assert.match(accretionAuditText, /structural disposition[\s\S]*not a second verdict/i);
  assert.match(accretionAuditText, /do not use for implementation-only deletion\/refactor requests/);
  assert.match(accretionEvalText, /^- “Run a code audit on this diff\.” → `EMBEDDED` beside `\$code__auditing`, using `CHANGESET` scope\.$/m);
  assert.match(accretionEvalText, /^- “Audit the code in this package\.” → `EMBEDDED` beside `\$code__auditing`; a boundary-only suffix retains the standard pair\.$/m);
  assert.match(accretionEvalText, /^- “Audit this code for release readiness\.” → `\$code__auditing`; the focused qualifier wins\.$/m);
  assert.match(accretionEvalText, /^- “Audit this code for correctness\.” → `\$code__auditing`; the focused qualifier wins\.$/m);
  assert.match(accretionEvalText, /^- “Review this code for performance\.” → `\$code__auditing`; general performance is a focused code review\.$/m);
  assert.match(accretionEvalText, /^- “Audit this Node backend for latency, scale, and cost\.” → `\$audit__optimizing-node-backend`; the explicit specialist domain wins\.$/m);
  assert.match(accretionEvalText, /^- “Security audit this code\.” → `\$security__auditing-code`; the named specialist wins\.$/m);
  assert.match(accretionEvalText, /^- “Delete this obsolete adapter exactly as approved\.” → normal implementation; an implementation-only deletion request is not an audit\.$/m);
  assert.match(accretionEvalText, /does not spawn another reviewer/);
  assert.match(nodePerformanceAuditText, /explicitly frames a Node-backend latency, scale, cost/);
  assert.match(nodePerformanceAuditText, /generic code performance or release review stays with code__auditing/);
});

test("question-spec routing, capability compression, and fresh-review contracts agree", () => {
  const questionSpecText = fs.readFileSync(path.join(SKILLS_ROOT, "plan__question-spec", "SKILL.md"), "utf8");
  const questionSpecEvalText = fs.readFileSync(
    path.join(SKILLS_ROOT, "plan__question-spec", "references", "eval-cases.md"),
    "utf8"
  );

  assert.match(questionSpecText, /^description: [^\n]+$/m);
  assert.doesNotMatch(questionSpecText, /^description: >-/m);
  assert.match(questionSpecText, /generic requests to audit, question, or adversarially review a work spec/);
  assert.match(questionSpecText, /focused architecture or moving-parts-only requests/);
  assert.match(questionSpecText, /performance, scale, or cost-only requests stay with their named sibling skills/);
  assert.match(questionSpecText, /never runs as an automatic pre-implementation gate/);
  assert.match(questionSpecText, /Freshness, bounded reviewer inputs, and exactly-once delegation follow root/);
  assert.match(questionSpecText, /never creates its own review hop/);
  assert.match(questionSpecText, /Every retained mechanism must trace to a real user outcome, observable contract/);
  assert.match(questionSpecText, /If B, C, and D exist only because of A, challenge A first/);
  assert.match(questionSpecText, /delete the whole chain and specify the smallest direct behavior/);
  assert.match(questionSpecEvalText, /## 1\. Baseline failure/);
  assert.match(questionSpecEvalText, /## 2\. With-skill behavior/);
  assert.match(questionSpecEvalText, /## 3\. Should trigger/);
  assert.match(questionSpecEvalText, /## 4\. Should not trigger/);
  assert.match(questionSpecEvalText, /## 5\. Borderline/);
  assert.match(questionSpecEvalText, /## 6\. Collision and fresh-review topology/);
  assert.match(questionSpecEvalText, /## 7\. Attention drift/);
  assert.match(questionSpecEvalText, /fresh reviewer loads this skill, runs directly, and does not delegate again/);
  assert.match(questionSpecEvalText, /A coherent approved spec[\s\S]*do not invent a gate/);
});

test("local markdown links and declared skill resources resolve", () => {
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

  const rootSkillManifestPaths = walkFiles(SKILLS_ROOT).filter((filePath) => {
    const relativeSkillPath = path.relative(SKILLS_ROOT, filePath);
    return path.basename(filePath) === "SKILL.md" && relativeSkillPath.split(path.sep).length === 2;
  });

  for (const manifestPath of rootSkillManifestPaths) {
    const relativeManifestPath = path.relative(REPO_ROOT, manifestPath).replace(/\\/g, "/");
    for (const relativeResourcePath of findConcreteSkillResourceReferences(manifestPath)) {
      const resolvedResourcePath = path.resolve(path.dirname(manifestPath), relativeResourcePath);
      assert.ok(
        fs.existsSync(resolvedResourcePath),
        `${relativeManifestPath} references missing packaged resource ${relativeResourcePath}`
      );
    }
  }
});
