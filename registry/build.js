import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_FILE_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(MODULE_FILE_PATH), "..");
const SKILLS_ROOT = path.join(REPO_ROOT, "skills");
const REGISTRY_PATH = path.join(REPO_ROOT, "registry.json");

const REGISTRY_HEADER = {
  version: "0.1.0",
  repo: "https://github.com/erikhazzard/vasir",
  raw_base: "https://raw.githubusercontent.com/erikhazzard/vasir/main"
};

const CATEGORY_ORDER = new Map([
  ["games", 0],
  ["frontend", 1],
  ["infra", 2],
  ["testing", 3]
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
    const metaPath = path.join(skillDirectory, "meta.json");
    if (!fs.existsSync(metaPath)) {
      throw new Error(`Every direct child of skills/ must be a skill directory with meta.json: ${toRepoPath(skillDirectory)}`);
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

function readMeta(metaPath) {
  const raw = fs.readFileSync(metaPath, "utf8");
  const meta = JSON.parse(raw);
  const dir = path.dirname(metaPath);

  if (!meta.name) throw new Error(`Missing name in ${toRepoPath(metaPath)}`);
  if (!meta.description) throw new Error(`Missing description in ${toRepoPath(metaPath)}`);
  if (!meta.category) throw new Error(`Missing category in ${toRepoPath(metaPath)}`);
  if (!Array.isArray(meta.tags)) throw new Error(`Missing tags[] in ${toRepoPath(metaPath)}`);
  if (!Array.isArray(meta.recommends)) throw new Error(`Missing recommends[] in ${toRepoPath(metaPath)}`);
  if (!Array.isArray(meta.files)) throw new Error(`Missing files[] in ${toRepoPath(metaPath)}`);

  for (const file of meta.files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`meta.json in ${toRepoPath(dir)} references missing file ${file}`);
    }
  }

  return {
    ...meta,
    path: toRepoPath(dir),
    entry: "SKILL.md"
  };
}

export function buildRegistry() {
  const skills = listSkillDirectories()
    .map((skillDirectory) => readMeta(path.join(skillDirectory, "meta.json")))
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

function runRegistryBuildCommand(argumentVector) {
  const mode = argumentVector[2] ?? "--write";
  const registry = buildRegistry();
  const output = formatRegistry(registry);

  if (mode === "--print") {
    process.stdout.write(output);
    return 0;
  }

  if (mode === "--check") {
    const current = fs.existsSync(REGISTRY_PATH) ? fs.readFileSync(REGISTRY_PATH, "utf8") : "";
    if (current !== output) {
      process.stderr.write("registry.json is out of date. Run `npm run build:registry`.\n");
      return 1;
    }
    return 0;
  }

  if (mode === "--write") {
    fs.writeFileSync(REGISTRY_PATH, output);
    process.stdout.write(`Wrote ${toRepoPath(REGISTRY_PATH)} with ${registry.skills.length} skills.\n`);
    return 0;
  }

  process.stderr.write(`Unknown mode: ${mode}\n`);
  return 1;
}

if (process.argv[1] === MODULE_FILE_PATH) {
  process.exitCode = runRegistryBuildCommand(process.argv);
}
