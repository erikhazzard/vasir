import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { CATALOG_MANIFEST_FILE_NAME } from "../cli/global-catalog.js";
import { buildSkillCatalogEntry, SKILL_MANIFEST_FILE_NAME } from "../cli/skill-metadata.js";

const MODULE_FILE_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(MODULE_FILE_PATH), "..");
const SKILLS_ROOT = path.join(REPO_ROOT, ".agents", "skills");
const REGISTRY_PATH = path.join(REPO_ROOT, "registry.json");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const CATALOG_MANIFEST_PATH = path.join(REPO_ROOT, CATALOG_MANIFEST_FILE_NAME);
const HASHED_CATALOG_ROOTS = Object.freeze(["registry.json", ".agents/skills", "templates"]);

const REGISTRY_HEADER = {
  version: "0.1.0",
  repo: "https://github.com/erikhazzard/vasir",
  raw_base: "https://raw.githubusercontent.com/erikhazzard/vasir/main"
};

const CATEGORY_ORDER = new Map([
  ["games", 0],
  ["frontend", 1],
  ["infra", 2],
  ["testing", 3],
  ["uncategorized", 4]
]);

function toRepoPath(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath).replace(/\\/g, "/");
}

function walkFiles(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkFiles(fullPath));
      continue;
    }
    output.push(fullPath);
  }
  return output.sort();
}

function listSkillDirectories() {
  const entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  const skillDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(SKILLS_ROOT, entry.name))
    .sort();

  for (const skillDirectory of skillDirectories) {
    const manifestPath = path.join(skillDirectory, SKILL_MANIFEST_FILE_NAME);
    if (!fs.existsSync(manifestPath)) {
      throw new Error(
        `Every direct child of .agents/skills/ must be a skill directory with ${SKILL_MANIFEST_FILE_NAME}: ${toRepoPath(skillDirectory)}`
      );
    }
  }

  const nestedMetaFiles = walkFiles(SKILLS_ROOT)
    .filter((filePath) => path.basename(filePath) === "meta.json")
    .filter((filePath) => path.relative(SKILLS_ROOT, filePath).replace(/\\/g, "/").split("/").length !== 2);

  if (nestedMetaFiles.length > 0) {
    throw new Error(`Nested skill metadata is forbidden: ${nestedMetaFiles.map(toRepoPath).join(", ")}`);
  }

  return skillDirectories;
}

export function buildRegistry() {
  const skills = listSkillDirectories()
    .map((skillDirectory) =>
      buildSkillCatalogEntry({
        skillDirectoryPath: skillDirectory,
        relativeSkillDirectoryPath: toRepoPath(skillDirectory)
      })
    )
    .sort((leftSkillEntry, rightSkillEntry) => {
      if (leftSkillEntry.category !== rightSkillEntry.category) {
        return (CATEGORY_ORDER.get(leftSkillEntry.category) ?? Number.MAX_SAFE_INTEGER) -
          (CATEGORY_ORDER.get(rightSkillEntry.category) ?? Number.MAX_SAFE_INTEGER);
      }
      return leftSkillEntry.name.localeCompare(rightSkillEntry.name);
    });

  return {
    ...REGISTRY_HEADER,
    skills
  };
}

export function formatRegistry(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

function readPackageVersion() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8")).version;
}

function buildCatalogSourceHash({ registryOutput }) {
  const hash = crypto.createHash("sha256");
  hash.update("registry.json");
  hash.update("\n");
  hash.update(registryOutput);
  hash.update("\n");

  for (const catalogRoot of [SKILLS_ROOT, path.join(REPO_ROOT, "templates")]) {
    const catalogRootFiles = walkFiles(catalogRoot);
    for (const absoluteFilePath of catalogRootFiles) {
      hash.update(toRepoPath(absoluteFilePath));
      hash.update("\n");
      hash.update(fs.readFileSync(absoluteFilePath));
      hash.update("\n");
    }
  }

  return hash.digest("hex");
}

export function buildCatalogManifest({ registryOutput }) {
  return {
    kind: "catalogManifest",
    schemaVersion: 1,
    packageVersion: readPackageVersion(),
    sourceHash: buildCatalogSourceHash({ registryOutput }),
    includedRoots: HASHED_CATALOG_ROOTS
  };
}

export function formatCatalogManifest(catalogManifest) {
  return `${JSON.stringify(catalogManifest, null, 2)}\n`;
}

function runRegistryBuildCommand(argumentVector) {
  const mode = argumentVector[2] ?? "--write";
  const registry = buildRegistry();
  const registryOutput = formatRegistry(registry);
  const catalogManifest = buildCatalogManifest({ registryOutput });
  const catalogManifestOutput = formatCatalogManifest(catalogManifest);

  if (mode === "--print") {
    process.stdout.write(registryOutput);
    return 0;
  }

  if (mode === "--check") {
    const currentRegistryOutput = fs.existsSync(REGISTRY_PATH) ? fs.readFileSync(REGISTRY_PATH, "utf8") : "";
    const currentCatalogManifestOutput = fs.existsSync(CATALOG_MANIFEST_PATH)
      ? fs.readFileSync(CATALOG_MANIFEST_PATH, "utf8")
      : "";
    if (currentRegistryOutput !== registryOutput || currentCatalogManifestOutput !== catalogManifestOutput) {
      process.stderr.write("registry.json or .vasir-catalog-manifest.json is out of date. Run `npm run build:registry`.\n");
      return 1;
    }
    return 0;
  }

  if (mode === "--write") {
    fs.writeFileSync(REGISTRY_PATH, registryOutput);
    fs.writeFileSync(CATALOG_MANIFEST_PATH, catalogManifestOutput);
    process.stdout.write(
      `Wrote ${toRepoPath(REGISTRY_PATH)} and ${toRepoPath(CATALOG_MANIFEST_PATH)} with ${registry.skills.length} skills.\n`
    );
    return 0;
  }

  process.stderr.write(`Unknown mode: ${mode}\n`);
  return 1;
}

if (process.argv[1] === MODULE_FILE_PATH) {
  process.exitCode = runRegistryBuildCommand(process.argv);
}
