import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveSkillSource } from "../eval/skill-source.js";
import {
  DEFAULT_SKILL_CATEGORY,
  DEFAULT_SKILL_VERSION,
  listSkillPromptMarkdownFiles,
  readSkillMetadata
} from "../install/skill-metadata.js";

function createTemporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vasir-skill-meta-"));
}

function writeFile(filePath, fileContents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, fileContents);
}

test("readSkillMetadata infers defaults and description without meta.json", () => {
  const repositoryDirectory = createTemporaryDirectory();
  const skillDirectoryPath = path.join(repositoryDirectory, "skills", "example-constraints");

  writeFile(
    path.join(skillDirectoryPath, "SKILL.md"),
    [
      "# Example Constraints",
      "",
      "Repo-specific constraints that keep generated changes inside the supported architecture.",
      "",
      "## Core Principle",
      "",
      "- Stay inside the supported boundary."
    ].join("\n")
  );
  writeFile(path.join(skillDirectoryPath, "references", "patterns.md"), "# Patterns\n");

  const skillMetadata = readSkillMetadata(skillDirectoryPath);

  assert.equal(skillMetadata.name, "example-constraints");
  assert.equal(
    skillMetadata.description,
    "Repo-specific constraints that keep generated changes inside the supported architecture."
  );
  assert.equal(skillMetadata.category, DEFAULT_SKILL_CATEGORY);
  assert.deepEqual(skillMetadata.tags, []);
  assert.equal(skillMetadata.version, DEFAULT_SKILL_VERSION);
  assert.deepEqual(skillMetadata.recommends, []);
  assert.deepEqual(skillMetadata.files, ["SKILL.md", "references/patterns.md"]);
});

test("readSkillMetadata prefers manifest prose over stale legacy description", () => {
  const repositoryDirectory = createTemporaryDirectory();
  const skillDirectoryPath = path.join(repositoryDirectory, "skills", "example-constraints");

  writeFile(
    path.join(skillDirectoryPath, "SKILL.md"),
    [
      "# Example Constraints",
      "",
      "Fresh manifest guidance should drive the catalog description.",
      "",
      "## Core Principle",
      "",
      "Stay inside the supported boundary."
    ].join("\n")
  );
  writeFile(
    path.join(skillDirectoryPath, "meta.json"),
    JSON.stringify({ description: "stale compatibility description" }, null, 2)
  );

  const skillMetadata = readSkillMetadata(skillDirectoryPath);

  assert.equal(skillMetadata.description, "Fresh manifest guidance should drive the catalog description.");
});

test("readSkillMetadata prefers SKILL.md frontmatter and keeps file inventory inferred", () => {
  const repositoryDirectory = createTemporaryDirectory();
  const skillDirectoryPath = path.join(repositoryDirectory, "skills", "react");

  writeFile(
    path.join(skillDirectoryPath, "SKILL.md"),
    [
      "---",
      "name: react",
      "description: React component boundaries and effect discipline.",
      "category: frontend",
      "tags:",
      "  - react",
      "  - ui",
      "recommends: [ui-layout]",
      "version: 2.1.0",
      "---",
      "",
      "# React",
      "",
      "Use local state first."
    ].join("\n")
  );
  writeFile(path.join(skillDirectoryPath, "meta.json"), "{\"description\":\"stale\"}\n");
  writeFile(path.join(skillDirectoryPath, "references", "patterns.md"), "# Patterns\n");

  const skillMetadata = readSkillMetadata(skillDirectoryPath);

  assert.equal(skillMetadata.description, "React component boundaries and effect discipline.");
  assert.equal(skillMetadata.category, "frontend");
  assert.deepEqual(skillMetadata.tags, ["react", "ui"]);
  assert.deepEqual(skillMetadata.recommends, ["ui-layout"]);
  assert.equal(skillMetadata.version, "2.1.0");
  assert.deepEqual(skillMetadata.files, ["SKILL.md", "meta.json", "references/patterns.md"]);
  assert.deepEqual(listSkillPromptMarkdownFiles(skillDirectoryPath), ["SKILL.md", "references/patterns.md"]);
});

test("resolveSkillSource accepts repo skills that only define manifest metadata", () => {
  const repositoryDirectory = createTemporaryDirectory();
  const skillDirectoryPath = path.join(repositoryDirectory, "skills", "react");

  writeFile(
    path.join(skillDirectoryPath, "SKILL.md"),
    [
      "---",
      "name: react",
      "description: React component boundaries and effect discipline.",
      "---",
      "",
      "# React",
      "",
      "Use AbortController in async effects."
    ].join("\n")
  );
  writeFile(path.join(skillDirectoryPath, "references", "patterns.md"), "# Patterns\n");
  writeFile(path.join(skillDirectoryPath, "evals", "README.md"), "# Eval\n");
  writeFile(
    path.join(skillDirectoryPath, "evals", "suite.json"),
    JSON.stringify({ id: "react-core", cases: [] }, null, 2)
  );

  const skillSource = resolveSkillSource({
    skillName: "react",
    currentWorkingDirectory: repositoryDirectory
  });

  assert.equal(skillSource.sourceType, "repo-source");
  assert.equal(skillSource.skillMetadata.name, "react");
  assert.equal(skillSource.skillMetadata.description, "React component boundaries and effect discipline.");
  assert.deepEqual(
    skillSource.promptFiles.map((promptFile) => promptFile.relativeFilePath),
    ["SKILL.md", "references/patterns.md"]
  );
});
