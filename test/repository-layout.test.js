import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRegistry } from "../registry/build.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = path.join(REPO_ROOT, "skills");

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

test("skills use a flat skills/<name> directory layout", () => {
  const skillManifestPaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "SKILL.md");
  assert.ok(skillManifestPaths.length > 0, "expected at least one skill");

  for (const manifestPath of skillManifestPaths) {
    const relativeManifestPath = path.relative(REPO_ROOT, manifestPath).replace(/\\/g, "/");
    assert.match(
      relativeManifestPath,
      /^skills\/[^/]+\/SKILL\.md$/,
      `root skill manifests must live directly under skills/<name>: ${relativeManifestPath}`
    );
  }
});

test("optional legacy meta.json files only appear at skills/<name>/meta.json", () => {
  const metaFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "meta.json");

  for (const metaFilePath of metaFilePaths) {
    const relativeMetaPath = path.relative(REPO_ROOT, metaFilePath).replace(/\\/g, "/");
    assert.match(
      relativeMetaPath,
      /^skills\/[^/]+\/meta\.json$/,
      `legacy meta.json files must live directly under skills/<name>: ${relativeMetaPath}`
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
      /^skills\/[^/]+\/evals\/suite\.json$/,
      `built-in eval suites must live under skills/<name>/evals: ${relativeSuitePath}`
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
    "templates/AGENTS.md",
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
