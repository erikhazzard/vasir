import fs from "node:fs";
import path from "node:path";

export const DEFAULT_SKILL_CATEGORY = "uncategorized";
export const DEFAULT_SKILL_VERSION = "0.1.0";
export const SKILL_MANIFEST_FILE_NAME = "SKILL.md";

function listRelativeFilePathsRecursively(rootDirectoryPath, currentDirectoryPath = rootDirectoryPath) {
  const relativeFilePaths = [];
  const directoryEntries = fs.readdirSync(currentDirectoryPath, { withFileTypes: true });

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(currentDirectoryPath, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      relativeFilePaths.push(...listRelativeFilePathsRecursively(rootDirectoryPath, entryPath));
      continue;
    }

    if (directoryEntry.isFile()) {
      relativeFilePaths.push(path.relative(rootDirectoryPath, entryPath).replace(/\\/g, "/"));
    }
  }

  return relativeFilePaths.sort();
}

function normalizeScalarText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const firstCharacter = trimmedValue[0];
  const lastCharacter = trimmedValue.at(-1);
  if (
    (firstCharacter === "\"" && lastCharacter === "\"") ||
    (firstCharacter === "'" && lastCharacter === "'")
  ) {
    return trimmedValue.slice(1, -1).trim() || null;
  }

  return trimmedValue;
}

function parseInlineList(rawValue) {
  const trimmedValue = rawValue.trim();
  if (trimmedValue === "[]") {
    return [];
  }

  const innerValue = trimmedValue.slice(1, -1).trim();
  if (!innerValue) {
    return [];
  }

  return innerValue
    .split(",")
    .map((entry) => normalizeScalarText(entry))
    .filter(Boolean);
}

function parseManifestFrontmatter(skillManifestContents) {
  const lines = skillManifestContents.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return {};
  }

  const endMarkerIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endMarkerIndex === -1) {
    return {};
  }

  const frontmatter = {};
  let activeListKey = null;

  for (const rawLine of lines.slice(1, endMarkerIndex)) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    if (activeListKey) {
      const listMatch = trimmedLine.match(/^-\s+(.*)$/);
      if (listMatch) {
        frontmatter[activeListKey].push(normalizeScalarText(listMatch[1]) ?? "");
        continue;
      }
    }

    const fieldMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) {
      activeListKey = null;
      continue;
    }

    const [, key, rawValue] = fieldMatch;
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      frontmatter[key] = [];
      activeListKey = key;
      continue;
    }

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      frontmatter[key] = parseInlineList(trimmedValue);
      activeListKey = null;
      continue;
    }

    frontmatter[key] = normalizeScalarText(trimmedValue) ?? "";
    activeListKey = null;
  }

  return frontmatter;
}

function stripManifestFrontmatter(skillManifestContents) {
  const lines = skillManifestContents.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return skillManifestContents;
  }

  const endMarkerIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endMarkerIndex === -1) {
    return skillManifestContents;
  }

  return lines.slice(endMarkerIndex + 1).join("\n");
}

function inferDescriptionFromManifestBody(skillManifestContents) {
  const manifestBody = stripManifestFrontmatter(skillManifestContents);
  const lines = manifestBody.split(/\r?\n/);
  const paragraphLines = [];
  let insideCodeFence = false;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (trimmedLine.startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }

    if (insideCodeFence) {
      continue;
    }

    if (!trimmedLine) {
      if (paragraphLines.length > 0) {
        break;
      }
      continue;
    }

    if (
      paragraphLines.length === 0 &&
      (
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith("- ") ||
        trimmedLine.startsWith("* ") ||
        /^\d+\.\s/.test(trimmedLine)
      )
    ) {
      continue;
    }

    paragraphLines.push(trimmedLine);
  }

  const description = paragraphLines.join(" ").trim();
  return description || null;
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeScalarText(String(entry)))
      .filter(Boolean);
  }

  const normalizedValue = normalizeScalarText(value);
  if (!normalizedValue) {
    return [];
  }

  return normalizedValue.split(",").map((entry) => normalizeScalarText(entry)).filter(Boolean);
}

function readLegacyMetaFile(skillDirectoryPath) {
  const metaFilePath = path.join(skillDirectoryPath, "meta.json");
  if (!fs.existsSync(metaFilePath)) {
    return null;
  }

  const parsedMetadata = JSON.parse(fs.readFileSync(metaFilePath, "utf8"));
  if (!parsedMetadata || Array.isArray(parsedMetadata) || typeof parsedMetadata !== "object") {
    throw new Error(`Legacy skill metadata must be a JSON object: ${metaFilePath}`);
  }

  return parsedMetadata;
}

function ensureCanonicalSkillName({ declaredName, skillDirectoryPath }) {
  const directoryName = path.basename(skillDirectoryPath);
  const normalizedDeclaredName = normalizeScalarText(declaredName);
  if (!normalizedDeclaredName) {
    return directoryName;
  }

  if (normalizedDeclaredName !== directoryName) {
    throw new Error(
      `Skill name must match the directory name. Expected "${directoryName}" but found "${normalizedDeclaredName}" in ${path.join(skillDirectoryPath, SKILL_MANIFEST_FILE_NAME)}`
    );
  }

  return directoryName;
}

export function listSkillFiles(skillDirectoryPath) {
  return listRelativeFilePathsRecursively(skillDirectoryPath);
}

export function listSkillPromptMarkdownFiles(skillDirectoryPath) {
  return listSkillFiles(skillDirectoryPath)
    .filter(
      (relativeFilePath) =>
        relativeFilePath.endsWith(".md") && !relativeFilePath.startsWith("evals/")
    )
    .sort((leftPath, rightPath) => {
      if (leftPath === SKILL_MANIFEST_FILE_NAME) return -1;
      if (rightPath === SKILL_MANIFEST_FILE_NAME) return 1;
      return leftPath.localeCompare(rightPath);
    });
}

export function readSkillMetadata(skillDirectoryPath) {
  const manifestFilePath = path.join(skillDirectoryPath, SKILL_MANIFEST_FILE_NAME);
  if (!fs.existsSync(manifestFilePath)) {
    throw new Error(`Skill manifest is missing: ${manifestFilePath}`);
  }

  const skillManifestContents = fs.readFileSync(manifestFilePath, "utf8");
  const frontmatter = parseManifestFrontmatter(skillManifestContents);
  const legacyMeta = readLegacyMetaFile(skillDirectoryPath);

  const name = ensureCanonicalSkillName({
    declaredName: frontmatter.name ?? legacyMeta?.name,
    skillDirectoryPath
  });
  const description =
    normalizeScalarText(frontmatter.description) ??
    inferDescriptionFromManifestBody(skillManifestContents) ??
    normalizeScalarText(legacyMeta?.description);

  if (!description) {
    throw new Error(
      `Skill description is missing. Add frontmatter description or an opening prose paragraph in ${manifestFilePath}`
    );
  }

  return {
    name,
    description,
    category:
      normalizeScalarText(frontmatter.category) ??
      normalizeScalarText(legacyMeta?.category) ??
      DEFAULT_SKILL_CATEGORY,
    tags: normalizeStringList(frontmatter.tags ?? legacyMeta?.tags),
    version:
      normalizeScalarText(frontmatter.version) ??
      normalizeScalarText(legacyMeta?.version) ??
      DEFAULT_SKILL_VERSION,
    recommends: normalizeStringList(frontmatter.recommends ?? legacyMeta?.recommends),
    files: listSkillFiles(skillDirectoryPath)
  };
}

export function buildSkillCatalogEntry({
  skillDirectoryPath,
  relativeSkillDirectoryPath
}) {
  return {
    ...readSkillMetadata(skillDirectoryPath),
    path: relativeSkillDirectoryPath,
    entry: SKILL_MANIFEST_FILE_NAME
  };
}
