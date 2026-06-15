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

test("root AGENTS template treats touchpoints as lane evidence, not approval boundaries", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const exampleAgentsText = fs.readFileSync(path.join(REPO_ROOT, "docs", "example-agents.md"), "utf8");

  assert.doesNotMatch(agentsTemplateText, /vasir:profile/);
  assert.doesNotMatch(agentsTemplateText, /Last Updated/);
  assert.doesNotMatch(agentsTemplateText, /update alongside major architectural PRs/);
  assert.match(agentsTemplateText, /<Lane_Contract>/);
  assert.match(agentsTemplateText, /Work source of truth:/);
  assert.match(agentsTemplateText, /Repo evidence read:/);
  assert.match(agentsTemplateText, /Likely starting points:/);
  assert.match(agentsTemplateText, /Active lane:/);
  assert.match(agentsTemplateText, /Neighboring lanes to avoid:/);
  assert.match(agentsTemplateText, /Senior-engineer latitude:/);
  assert.match(agentsTemplateText, /Boundary report triggers:/);
  assert.match(agentsTemplateText, /Treat discovered paths as orientation evidence, not edit permission\./);
  assert.match(agentsTemplateText, /File lists are orientation evidence, not permission\./);
  assert.doesNotMatch(agentsTemplateText, /Existing files allowed to edit:/);
  assert.doesNotMatch(agentsTemplateText, /Plan Amendment Protocol/);
  assert.doesNotMatch(agentsTemplateText, /Escalation triggers:/);
  assert.doesNotMatch(agentsTemplateText, /ESCALATION_REQUEST/);
  assert.doesNotMatch(agentsTemplateText, /Approved change envelope:/);
  assert.doesNotMatch(agentsTemplateText, /file targets exceed the approved envelope/);
  assert.doesNotMatch(exampleAgentsText, /Which exact files and systems will be touched/);
  assert.doesNotMatch(exampleAgentsText, /Do not edit outside the declared lane/);
  assert.doesNotMatch(exampleAgentsText, /approved change boundary/);
});

test("AGENTS taxonomy separates generated roots from folder steering maps", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const templateReadmeText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "README.md"), "utf8");
  const rootReadmeText = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");
  const cliReferenceText = fs.readFileSync(path.join(REPO_ROOT, "docs", "cli-reference.md"), "utf8");
  const folderAgentsSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "agents__creating-folder-agents", "SKILL.md"),
    "utf8"
  );

  for (const documentText of [agentsTemplateText, templateReadmeText, rootReadmeText, cliReferenceText]) {
    assert.match(documentText, /Nested root `AGENTS\.md`|nested root `AGENTS\.md`|Nested root AGENTS|nested root AGENTS/);
    assert.match(documentText, /Folder `AGENTS\.md`|Folder AGENTS|folder AGENTS/);
  }

  assert.match(agentsTemplateText, /Folder AGENTS must steer work/);
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
  const handoffSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "handoff__final-quality-gate", "SKILL.md"),
    "utf8"
  );

  assert.match(agentsTemplateText, /Durable Artifact Admission:/);
  assert.match(agentsTemplateText, /Every new durable file must graduate into production code, canonical test\/eval, reusable tool, folder steering map, or active work doc/);
  assert.match(agentsTemplateText, /Anything else is temporary proof and must stay in `tmp\/\*\*` or be deleted before completion/);
  assert.match(agentsTemplateText, /Package Script Admission:/);
  assert.match(agentsTemplateText, /`package\.json` scripts are a stable developer and CI interface, not a proof log/);
  assert.match(agentsTemplateText, /task, bug, milestone, date, or proof-specific checks/);

  assert.match(handoffSkillText, /Repo Shape & Command Surface/);
  assert.match(handoffSkillText, /<Artifact_Ledger>/);
  assert.match(handoffSkillText, /<Package_Script_Changes>/);
  assert.match(handoffSkillText, /temporary proof outside `tmp\/\*\*`/);
  assert.match(handoffSkillText, /package scripts named for a bug, task, milestone, date, incident, proof rung, or temporary scenario/);
});

test("testing doctrine forbids tombstone absence tests", () => {
  const agentsTemplateText = fs.readFileSync(path.join(REPO_ROOT, "templates", "agents", "AGENTS.md"), "utf8");
  const testingSkillText = fs.readFileSync(
    path.join(REPO_ROOT, ".agents", "skills", "testing__enforcing-mandate", "SKILL.md"),
    "utf8"
  );

  assert.match(agentsTemplateText, /No Tombstone Tests/);
  assert.match(agentsTemplateText, /Every negative assertion must name the positive contract it protects/);
  assert.match(agentsTemplateText, /endpoints\/routes\/handlers, jobs\/workers, events\/messages, DB fields\/tables\/indexes/);
  assert.match(testingSkillText, /No tombstone tests/);
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
