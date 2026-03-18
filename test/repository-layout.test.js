import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const metaFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "meta.json");
  assert.ok(metaFilePaths.length > 0, "expected at least one skill");

  for (const metaFilePath of metaFilePaths) {
    const relativeMetaPath = path.relative(REPO_ROOT, metaFilePath).replace(/\\/g, "/");
    assert.match(
      relativeMetaPath,
      /^skills\/[^/]+\/meta\.json$/,
      `skill metadata must live directly under skills/<name>: ${relativeMetaPath}`
    );
  }
});

test("every skill metadata inventory matches checked-in files", () => {
  const metaFilePaths = walkFiles(SKILLS_ROOT).filter((filePath) => path.basename(filePath) === "meta.json");
  assert.ok(metaFilePaths.length > 0, "expected at least one skill");

  for (const metaFilePath of metaFilePaths) {
    const skillDirectoryPath = path.dirname(metaFilePath);
    const skillMetadata = JSON.parse(fs.readFileSync(metaFilePath, "utf8"));
    const actualRelativeFilePaths = walkFiles(skillDirectoryPath)
      .map((filePath) => path.relative(skillDirectoryPath, filePath).replace(/\\/g, "/"))
      .filter((relativeFilePath) => relativeFilePath !== "meta.json")
      .sort();

    assert.deepEqual(
      skillMetadata.files,
      actualRelativeFilePaths,
      `file inventory mismatch for ${path.relative(REPO_ROOT, skillDirectoryPath)}`
    );
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
    "docs/work/WORK.md",
    "docs/writing-skills.md",
    "templates/AGENTS.md",
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
