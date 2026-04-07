import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "./cli-error.js";
import { AGENTS_REFERENCE_DOCS_REF } from "./docs-ref.js";
import { readGlobalRegistry } from "./global-catalog.js";
import { buildProjectPaths } from "./path-layout.js";
import { createCommandUi } from "./ui/command-output.js";
import { interactiveSelect } from "./ui/interactive-select.js";
import { resolveEvalEnvironmentVariables } from "./eval/keys-file.js";
import { resolveEvalModels } from "./eval/provider-config.js";
import { generateEvalResponse } from "./eval/providers.js";
import { canPromptInteractively, promptForMissingProviderCredential } from "./eval/interactive.js";

const PURPOSE_START_MARKER = "<!-- vasir:purpose:start -->";
const PURPOSE_END_MARKER = "<!-- vasir:purpose:end -->";
const ROUTING_START_MARKER = "<!-- vasir:routing:start -->";
const ROUTING_END_MARKER = "<!-- vasir:routing:end -->";
const PURPOSE_PLACEHOLDER_FRAGMENT = "Replace this block first.";
const LAST_UPDATED_PLACEHOLDER = "[YYYY-MM-DD - update alongside major architectural PRs]";
const DEFAULT_AGENTS_TEMPLATE = path.join("templates", "agents", "AGENTS.md");

const AGENTS_PROFILE_TEMPLATES = Object.freeze({
  backend: path.join("templates", "agents", "profiles", "backend.md"),
  frontend: path.join("templates", "agents", "profiles", "frontend.md"),
  ios: path.join("templates", "agents", "profiles", "ios.md")
});

const AGENTS_PROFILE_LABELS = Object.freeze({
  backend: "backend",
  frontend: "frontend",
  ios: "ios",
  generic: "generic"
});

const AGENTS_PROFILE_HINTS = Object.freeze({
  backend: "APIs, jobs, workers, and data-layer repos",
  frontend: "React, routes, components, and design-system repos",
  ios: "Swift, Xcode, app lifecycle, and native UI repos",
  generic: "mixed repos or repos without one dominant stack"
});

const IGNORED_PROJECT_DIRECTORY_NAMES = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "tmp",
  "temp",
  "vendor",
  "Pods",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache"
]);

const ROUTING_LANE_DEFINITIONS = Object.freeze([
  {
    id: "api-surface",
    label: "API Surface",
    patterns: ["src/api", "app/api", "api", "server", "src/server"],
    detail: "before changing request, response, or handler behavior.",
    profiles: ["backend"],
    priority: 90
  },
  {
    id: "async-work",
    label: "Async Work",
    patterns: ["src/jobs", "jobs", "workers", "src/workers", "queues"],
    detail: "before changing delivery, retries, or worker behavior.",
    profiles: ["backend"],
    priority: 88
  },
  {
    id: "data-layer",
    label: "Data Layer",
    patterns: ["db", "src/db", "migrations", "prisma", "sql"],
    detail: "before changing schemas, queries, or persistence behavior.",
    profiles: ["backend"],
    priority: 86
  },
  {
    id: "ui-surface",
    label: "UI Surface",
    patterns: ["src/ui", "src/components", "components", "src/app", "app", "pages", "src/pages"],
    detail: "before changing component structure, routes, or page behavior.",
    profiles: ["frontend"],
    priority: 90
  },
  {
    id: "state-data",
    label: "State & Data Fetching",
    patterns: ["src/store", "src/state", "stores", "src/hooks", "hooks", "src/lib/api", "lib/api"],
    detail: "before changing state ownership, loaders, or data-fetching behavior.",
    profiles: ["frontend"],
    priority: 87
  },
  {
    id: "design-system",
    label: "Design System",
    patterns: ["src/styles", "styles", "design-system", "src/design-system"],
    detail: "before introducing new tokens, styling primitives, or layout conventions.",
    profiles: ["frontend"],
    priority: 84
  },
  {
    id: "ios-lifecycle",
    label: "App Lifecycle",
    patterns: ["ios/App", "App", "Sources/App", "Sources"],
    detail: "before changing startup, scene, or lifecycle behavior.",
    profiles: ["ios"],
    priority: 90
  },
  {
    id: "ios-networking",
    label: "Networking & Sync",
    patterns: ["ios/Networking", "Networking", "ios/Sync", "Sync", "Services"],
    detail: "before changing offline, retry, or cache behavior.",
    profiles: ["ios"],
    priority: 88
  },
  {
    id: "ios-ui",
    label: "UI Modules",
    patterns: ["ios/UI", "UI", "Features", "Modules", "DesignSystem"],
    detail: "before changing screens, navigation, or UI primitives.",
    profiles: ["ios"],
    priority: 86
  },
  {
    id: "cli-runtime",
    label: "CLI Runtime",
    patterns: ["cli", "bin"],
    detail: "before changing command parsing, output, or runtime behavior.",
    profiles: ["backend", "generic"],
    priority: 75
  },
  {
    id: "skill-content",
    label: "Skill Content",
    patterns: ["skills"],
    detail: "before changing installed or source skill behavior.",
    profiles: ["generic"],
    priority: 72
  },
  {
    id: "template-content",
    label: "Template Content",
    patterns: ["templates"],
    detail: "before changing starter manifests or scaffolds.",
    profiles: ["generic"],
    priority: 70
  },
  {
    id: "public-docs",
    label: "Public Docs",
    patterns: ["docs"],
    detail: "before changing user-facing documentation contracts.",
    profiles: ["generic"],
    priority: 68
  },
  {
    id: "internal-work",
    label: "Internal Work Docs",
    patterns: ["work"],
    detail: "before changing internal implementation notes or operating guidance.",
    profiles: ["generic"],
    priority: 66
  }
]);

const AGENTS_VALIDATION_RULES = Object.freeze([
  {
    code: "SCAFFOLD_NOTE_LEFT_IN_FILE",
    matches: (line) => line.includes("EDIT THESE FIRST"),
    message: "Remove the scaffold-only edit instructions."
  },
  {
    code: "SCAFFOLD_NOTE_LEFT_IN_FILE",
    matches: (line) => line.includes("Rewrite the `Purpose` block below"),
    message: "Replace the scaffold-only edit instructions with repo truth."
  },
  {
    code: "SCAFFOLD_NOTE_LEFT_IN_FILE",
    matches: (line) => line.includes("Replace the routing bullets"),
    message: "Replace the scaffold routing instructions with repo truth."
  },
  {
    code: "ROUTING_MARKER_LEFT_IN_FILE",
    matches: (line) => line.includes(ROUTING_START_MARKER) || line.includes(ROUTING_END_MARKER),
    message: "Remove the routing write-back markers by finalizing Section 1."
  },
  {
    code: "SCAFFOLD_NOTE_LEFT_IN_FILE",
    matches: (line) => line.includes("Delete any line that is not true"),
    message: "Delete the scaffold cleanup reminder once the file is customized."
  },
  {
    code: "SCAFFOLD_NOTE_LEFT_IN_FILE",
    matches: (line) => line.includes("rerun `vasir agents init"),
    message: "Remove the scaffold-only rerun hint."
  },
  {
    code: "PROJECT_NAME_PLACEHOLDER_LEFT_IN_FILE",
    matches: (line) => line.includes("[Project Name]"),
    message: "Replace the project-name placeholder."
  },
  {
    code: "PURPOSE_PLACEHOLDER_LEFT_IN_FILE",
    matches: (line) => line.includes(PURPOSE_PLACEHOLDER_FRAGMENT),
    message: "Replace the AGENTS purpose placeholder with a repo-specific paragraph."
  },
  {
    code: "PURPOSE_PLACEHOLDER_LEFT_IN_FILE",
    matches: (line) => line.includes("[Describe this "),
    message: "Replace the AGENTS purpose placeholder with a repo-specific paragraph."
  },
  {
    code: "PURPOSE_MARKER_LEFT_IN_FILE",
    matches: (line) => line.includes(PURPOSE_START_MARKER) || line.includes(PURPOSE_END_MARKER),
    message: "Remove the purpose write-back markers by finalizing the purpose block."
  },
  {
    code: "EXAMPLE_PLACEHOLDER_LEFT_IN_FILE",
    matches: (line) => line.includes("[Example]"),
    message: "Replace or delete the example-only guidance."
  },
  {
    code: "REPO_TRUTH_PLACEHOLDER_LEFT_IN_FILE",
    matches: (line) => line.includes("[Replace with repo truth"),
    message: "Replace the repo-truth placeholder."
  }
]);

function normalizeInlineText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPosixPath(value) {
  return String(value ?? "").split(path.sep).join("/");
}

function formatDisplayPath(relativePath) {
  const normalizedPath = toPosixPath(relativePath).replace(/^\/+/, "").replace(/\/+$/, "");
  return normalizedPath.length === 0 ? "/" : `/${normalizedPath}/`;
}

function sanitizePathToken(token) {
  return token.replace(/[),.;:]+$/g, "");
}

function isProjectPathToken(token) {
  if (token.includes(" ")) {
    return false;
  }

  if (/^[A-Za-z]+:/.test(token) && !token.startsWith("../") && !token.startsWith("./")) {
    return false;
  }

  return token.startsWith("/") || token.startsWith("./") || token.startsWith("../") || token.includes("/");
}

function readProjectDirectories(projectRootDirectory, maxDepth = 2) {
  const discoveredDirectories = [];
  const seenRelativePaths = new Set();

  function walk(currentDirectory, relativeDirectory, depth) {
    if (depth > maxDepth) {
      return;
    }

    let directoryEntries = [];
    try {
      directoryEntries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of directoryEntries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name.startsWith(".") || IGNORED_PROJECT_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      const childRelativeDirectory = relativeDirectory.length > 0
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;

      if (!seenRelativePaths.has(childRelativeDirectory)) {
        seenRelativePaths.add(childRelativeDirectory);
        discoveredDirectories.push(childRelativeDirectory);
      }

      walk(path.join(currentDirectory, entry.name), childRelativeDirectory, depth + 1);
    }
  }

  walk(projectRootDirectory, "", 1);

  return discoveredDirectories;
}

function formatPathLabel(relativePath) {
  const pathSegments = toPosixPath(relativePath).split("/").filter((segment) => segment.length > 0);
  if (pathSegments.length === 0) {
    return "Core Area";
  }

  return pathSegments.at(-1)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readJsonFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readReadmeExcerpt(projectRootDirectory) {
  const readmeCandidates = [
    path.join(projectRootDirectory, "README.md"),
    path.join(projectRootDirectory, "README")
  ];
  const readmePath = readmeCandidates.find((candidatePath) => fs.existsSync(candidatePath));
  if (!readmePath) {
    return null;
  }

  const rawReadmeText = fs.readFileSync(readmePath, "utf8");
  const excerptLines = rawReadmeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 18);
  const excerptText = excerptLines.join("\n");

  if (excerptText.length <= 1600) {
    return excerptText;
  }

  return `${excerptText.slice(0, 1597)}...`;
}

function readTopLevelEntries(projectRootDirectory) {
  return fs.readdirSync(projectRootDirectory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .slice(0, 20)
    .map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
    }));
}

function guessProjectName(projectRootDirectory) {
  const packageMetadata = readJsonFileIfPresent(path.join(projectRootDirectory, "package.json"));
  const packageName = normalizeInlineText(packageMetadata?.name ?? "");
  if (packageName.length > 0) {
    return packageName.startsWith("@") ? packageName.split("/").at(-1) : packageName;
  }

  return path.basename(projectRootDirectory);
}

function readAgentsProfileHint(agentsText) {
  const profileMatch = agentsText.match(/<!--\s*vasir:profile:([a-z0-9-]+)\s*-->/i);
  return profileMatch?.[1] ?? null;
}

function resolveAgentsTemplate(profileName) {
  if (profileName === null || profileName === undefined || profileName === "") {
    return {
      profile: "generic",
      templateRelativePath: DEFAULT_AGENTS_TEMPLATE
    };
  }

  const normalizedProfileName = profileName.toLowerCase();
  const templateRelativePath = AGENTS_PROFILE_TEMPLATES[normalizedProfileName];
  if (!templateRelativePath) {
    throw new VasirCliError({
      code: "AGENTS_PROFILE_UNKNOWN",
      message: `Unknown AGENTS profile: ${profileName}`,
      suggestion: "Use one of: backend, frontend, ios.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return {
    profile: normalizedProfileName,
    templateRelativePath
  };
}

export function assertSupportedAgentsProfile(profileName) {
  resolveAgentsTemplate(profileName);
}

function buildRepositoryContext({ projectRootDirectory, agentsText }) {
  const packageMetadata = readJsonFileIfPresent(path.join(projectRootDirectory, "package.json"));
  const packageSummary = packageMetadata && typeof packageMetadata === "object"
    ? {
        name: normalizeInlineText(packageMetadata.name ?? ""),
        description: normalizeInlineText(packageMetadata.description ?? ""),
        scripts: Object.keys(packageMetadata.scripts ?? {}).slice(0, 10),
        dependencies: Object.keys(packageMetadata.dependencies ?? {}).slice(0, 12),
        devDependencies: Object.keys(packageMetadata.devDependencies ?? {}).slice(0, 12)
      }
    : null;

  return {
    projectName: guessProjectName(projectRootDirectory),
    profileHint: readAgentsProfileHint(agentsText),
    topLevelEntries: readTopLevelEntries(projectRootDirectory),
    packageJson: packageSummary,
    readmeExcerpt: readReadmeExcerpt(projectRootDirectory)
  };
}

function inferAgentsProfile({ projectRootDirectory, repositoryContext }) {
  const directoryPaths = readProjectDirectories(projectRootDirectory, 2);
  const directorySet = new Set(directoryPaths);
  const topLevelNames = repositoryContext.topLevelEntries.map((entry) => entry.name);
  const dependencyNames = [
    ...(repositoryContext.packageJson?.dependencies ?? []),
    ...(repositoryContext.packageJson?.devDependencies ?? [])
  ].map((dependencyName) => String(dependencyName).toLowerCase());
  const readmeText = normalizeInlineText(repositoryContext.readmeExcerpt ?? "").toLowerCase();
  const scores = {
    backend: 0,
    frontend: 0,
    ios: 0
  };
  const reasons = {
    backend: [],
    frontend: [],
    ios: []
  };

  function addScore(profileName, scoreDelta, reason) {
    scores[profileName] += scoreDelta;
    reasons[profileName].push(reason);
  }

  function hasDirectory(...candidatePaths) {
    return candidatePaths.some((candidatePath) => directorySet.has(candidatePath));
  }

  function hasDependency(...candidateDependencies) {
    return candidateDependencies.some((candidateDependency) => dependencyNames.includes(candidateDependency));
  }

  function hasTopLevelMatch(matchPredicate) {
    return topLevelNames.some((entryName) => matchPredicate(entryName));
  }

  if (hasDependency("react", "next", "vite", "astro", "svelte", "vue", "@types/react")) {
    addScore("frontend", 4, "package.json includes frontend framework dependencies");
  }

  if (hasDirectory("src/ui", "src/components", "components", "src/app", "app", "pages", "src/pages")) {
    addScore("frontend", 4, "the repo has clear UI or route directories");
  }

  if (hasDirectory("src/styles", "styles", "design-system", "src/design-system")) {
    addScore("frontend", 2, "the repo has styling or design-system directories");
  }

  if (readmeText.includes("design system") || readmeText.includes("component library")) {
    addScore("frontend", 2, "the README describes a UI or design-system product");
  }

  if (hasDependency("express", "fastify", "hono", "koa", "@nestjs/core", "prisma", "pg", "mysql2", "mongoose", "bullmq")) {
    addScore("backend", 4, "package.json includes backend or data-layer dependencies");
  }

  if (hasDirectory("src/api", "app/api", "api", "server", "src/server", "db", "migrations", "workers", "src/workers", "jobs", "prisma")) {
    addScore("backend", 4, "the repo has API, worker, or data-layer directories");
  }

  if (readmeText.includes("api") || readmeText.includes("worker") || readmeText.includes("queue")) {
    addScore("backend", 1, "the README describes backend request or async work");
  }

  if (hasTopLevelMatch((entryName) => entryName.endsWith(".xcodeproj") || entryName.endsWith(".xcworkspace"))) {
    addScore("ios", 5, "the repo has Xcode project files at the root");
  }

  if (fs.existsSync(path.join(projectRootDirectory, "Package.swift"))) {
    addScore("ios", 4, "the repo has a Swift Package manifest");
  }

  if (hasDirectory("ios", "App", "Sources", "Modules", "Features", "UI", "DesignSystem", "Networking", "Sync")) {
    addScore("ios", 4, "the repo has native iOS or Swift module directories");
  }

  if (
    hasDependency("swiftlint", "xcodegen") ||
    readmeText.includes("swiftui") ||
    readmeText.includes("uikit") ||
    readmeText.includes("ios")
  ) {
    addScore("ios", 2, "the repo metadata looks iOS-native");
  }

  const rankedProfiles = Object.entries(scores)
    .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1]);
  const [topProfileName, topScore] = rankedProfiles[0];
  const secondScore = rankedProfiles[1]?.[1] ?? 0;

  if (topScore <= 0) {
    return {
      profileName: null,
      confident: false,
      reason: "Repo signals are too mixed to infer a stack-specific starter confidently."
    };
  }

  const confident = topScore >= secondScore + 2 || (topScore >= 4 && secondScore === 0);

  return {
    profileName: topProfileName,
    confident,
    reason: reasons[topProfileName][0] ?? "Repo structure suggests this stack.",
    scores,
    reasons
  };
}

export async function resolveRecommendedAgentsProfile({
  projectRootDirectory,
  inputStream = process.stdin,
  outputStream = process.stdout,
  jsonOutput = false
}) {
  const repositoryContext = buildRepositoryContext({
    projectRootDirectory,
    agentsText: ""
  });
  const inference = inferAgentsProfile({
    projectRootDirectory,
    repositoryContext
  });

  if (inference.profileName && inference.confident) {
    return {
      profileName: inference.profileName,
      source: "inferred",
      reason: inference.reason
    };
  }

  if (!jsonOutput && canPromptInteractively({ inputStream, outputStream })) {
    const orderedProfiles = [
      inference.profileName,
      "backend",
      "frontend",
      "ios"
    ].filter((profileName, profileIndex, profileList) =>
      profileName && profileList.indexOf(profileName) === profileIndex
    );

    const selection = await interactiveSelect({
      title: "Choose the AGENTS starter profile",
      promptLabel: "Profile",
      clearOnExit: true,
      inputStream,
      outputStream,
      items: [
        ...orderedProfiles.map((profileName) => ({
          value: profileName,
          label: AGENTS_PROFILE_LABELS[profileName],
          hint: profileName === inference.profileName && inference.reason
            ? `${inference.reason} (recommended)`
            : AGENTS_PROFILE_HINTS[profileName]
        })),
        {
          value: "generic",
          label: AGENTS_PROFILE_LABELS.generic,
          hint: AGENTS_PROFILE_HINTS.generic
        }
      ]
    });

    return {
      profileName: selection?.value === "generic" ? null : selection?.value ?? inference.profileName ?? null,
      source: selection ? "prompt" : inference.profileName ? "inferred" : "default-generic",
      reason: selection ? "Selected interactively for this repo." : inference.reason
    };
  }

  return {
    profileName: inference.profileName,
    source: inference.profileName ? "inferred" : "default-generic",
    reason: inference.reason
  };
}

function renderAgentsTemplate({ templateText, projectName, currentDate }) {
  return templateText
    .replace(/\[Project Name\]/g, projectName)
    .replace(LAST_UPDATED_PLACEHOLDER, `${currentDate} - update alongside major architectural PRs`);
}

function createAgentsTemplateMissingError(templateFilePath) {
  return new VasirCliError({
    code: "AGENTS_TEMPLATE_MISSING",
    message: `AGENTS template is missing from the global catalog: ${templateFilePath}`,
    suggestion: "Run `vasir update` to refresh the global catalog, then rerun the AGENTS command.",
    docsRef: AGENTS_REFERENCE_DOCS_REF
  });
}

function findAgentsValidationIssues(agentsText) {
  return agentsText
    .split(/\r?\n/)
    .flatMap((lineText, lineIndex) => {
      const trimmedLine = lineText.trim();
      if (trimmedLine.length === 0) {
        return [];
      }

      const matchingRule = AGENTS_VALIDATION_RULES.find((validationRule) => validationRule.matches(trimmedLine));
      if (!matchingRule) {
        return [];
      }

      return [{
        code: matchingRule.code,
        lineNumber: lineIndex + 1,
        message: matchingRule.message,
        lineText: trimmedLine
      }];
    });
}

function createAgentsValidationError({ agentsFilePath, issues }) {
  const issueSummary = issues
    .slice(0, 3)
    .map((issue) => `L${issue.lineNumber}: ${issue.message}`)
    .join(" ");

  return new VasirCliError({
    code: "AGENTS_VALIDATION_FAILED",
    message: `AGENTS.md still contains scaffold or repo-truth issues. ${issueSummary}`,
    suggestion:
      "Edit the flagged lines, create any missing scoped AGENTS.md files, or rerun `vasir agents init <profile> --replace`, then rerun `vasir agents validate`.",
    context: {
      agentsFilePath,
      issues
    },
    docsRef: AGENTS_REFERENCE_DOCS_REF
  });
}

function resolveProjectPathToken({ projectRootDirectory, pathToken }) {
  const sanitizedToken = sanitizePathToken(pathToken);
  const absolutePath = sanitizedToken.startsWith("/")
    ? path.join(projectRootDirectory, sanitizedToken.replace(/^\/+/, ""))
    : path.resolve(projectRootDirectory, sanitizedToken);

  return {
    token: sanitizedToken,
    absolutePath
  };
}

function findAgentsPathValidationIssues({ agentsText, projectRootDirectory }) {
  const issues = [];
  let inRoutingSection = false;

  for (const [lineIndex, lineText] of agentsText.split(/\r?\n/).entries()) {
    const trimmedLine = lineText.trim();
    if (trimmedLine.startsWith("## ")) {
      inRoutingSection = trimmedLine.startsWith("## 1. Topography & Routing Protocol");
    }

    if (trimmedLine.length === 0) {
      continue;
    }

    const inlineTokens = [...trimmedLine.matchAll(/`([^`\n]+)`/g)]
      .map((match) => match[1].trim())
      .filter((token) => isProjectPathToken(token));

    for (const inlineToken of inlineTokens) {
      const resolvedToken = resolveProjectPathToken({
        projectRootDirectory,
        pathToken: inlineToken
      });
      if (!fs.existsSync(resolvedToken.absolutePath)) {
        issues.push({
          code: "ROUTED_PATH_MISSING",
          lineNumber: lineIndex + 1,
          message: `Referenced repo path does not exist: ${resolvedToken.token}`,
          lineText: trimmedLine
        });
        continue;
      }

      if (
        inRoutingSection &&
        trimmedLine.includes("local `AGENTS.md`") &&
        fs.statSync(resolvedToken.absolutePath).isDirectory()
      ) {
        const scopedAgentsFilePath = path.join(resolvedToken.absolutePath, "AGENTS.md");
        if (!fs.existsSync(scopedAgentsFilePath)) {
          issues.push({
            code: "SCOPED_AGENTS_MISSING",
            lineNumber: lineIndex + 1,
            message:
              `Scoped AGENTS lane is referenced at ${resolvedToken.token}, but /${toPosixPath(path.relative(projectRootDirectory, scopedAgentsFilePath))} does not exist yet.`,
            lineText: trimmedLine
          });
        }
      }
    }
  }

  return issues;
}

function findRoutingLanes({ projectRootDirectory, profileHint }) {
  const directoryPaths = readProjectDirectories(projectRootDirectory, 2);
  const lanes = [];
  const seenLanePaths = new Set();

  for (const laneDefinition of ROUTING_LANE_DEFINITIONS) {
    const matchedDirectory = laneDefinition.patterns.find((candidatePath) => directoryPaths.includes(candidatePath));
    if (!matchedDirectory || seenLanePaths.has(matchedDirectory)) {
      continue;
    }

    seenLanePaths.add(matchedDirectory);
    const profileBoost = laneDefinition.profiles.includes(profileHint)
      ? 20
      : laneDefinition.profiles.includes("generic")
        ? 8
        : 0;

    lanes.push({
      label: laneDefinition.label,
      detail: laneDefinition.detail,
      relativePath: matchedDirectory,
      priority: laneDefinition.priority + profileBoost
    });
  }

  if (lanes.length === 0) {
    const fallbackDirectories = readTopLevelEntries(projectRootDirectory)
      .filter((entry) => entry.kind === "directory")
      .map((entry) => entry.name)
      .filter((entryName) => !IGNORED_PROJECT_DIRECTORY_NAMES.has(entryName) && !entryName.startsWith("."))
      .slice(0, 3);

    for (const fallbackDirectory of fallbackDirectories) {
      lanes.push({
        label: formatPathLabel(fallbackDirectory),
        detail: "before changing local-only behavior in that lane.",
        relativePath: fallbackDirectory,
        priority: 40
      });
    }
  }

  const sortedLanes = lanes
    .sort((leftLane, rightLane) => {
      if (rightLane.priority !== leftLane.priority) {
        return rightLane.priority - leftLane.priority;
      }
      return leftLane.relativePath.localeCompare(rightLane.relativePath);
    })
    .slice(0, 4)
    .map((lane) => ({
      ...lane,
      displayPath: formatDisplayPath(lane.relativePath)
    }));

  if (fs.existsSync(path.join(projectRootDirectory, "docs", "legacy"))) {
    sortedLanes.push({
      label: "Cold Storage",
      detail: "Do not read `AGENTS.md` files under that lane unless the user explicitly tells you to.",
      relativePath: "docs/legacy",
      displayPath: "/docs/legacy/",
      priority: 0,
      coldStorage: true
    });
  }

  return sortedLanes;
}

function formatRoutingLines({ projectRootDirectory, agentsText }) {
  const profileHint = readAgentsProfileHint(agentsText);
  const inferredProfile = inferAgentsProfile({
    projectRootDirectory,
    repositoryContext: buildRepositoryContext({
      projectRootDirectory,
      agentsText
    })
  }).profileName;
  const effectiveProfileHint = profileHint === "generic" ? inferredProfile ?? "generic" : profileHint ?? inferredProfile ?? "generic";
  const lanes = findRoutingLanes({
    projectRootDirectory,
    profileHint: effectiveProfileHint
  });

  return {
    effectiveProfileHint,
    routingLines: lanes.map((lane) => {
      if (lane.coldStorage) {
        return `* **${lane.label}:** Do not read \`${lane.displayPath}\` unless explicitly instructed by the user.`;
      }

      return `* **${lane.label}:** If touching \`${lane.displayPath}\`, you must first read that directory's local \`AGENTS.md\` ${lane.detail}`;
    })
  };
}

export function initializeProjectAgentsFile({
  globalCatalogDirectory,
  projectRootDirectory,
  profileName = null,
  ifExists = "error",
  currentDate = new Date().toISOString().slice(0, 10)
}) {
  const resolvedTemplate = resolveAgentsTemplate(profileName);
  const agentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  const agentsFileExists = fs.existsSync(agentsFilePath);

  if (agentsFileExists && ifExists === "skip") {
    return {
      agentsFilePath,
      profile: resolvedTemplate.profile,
      wroteAgentsFile: false
    };
  }

  if (agentsFileExists && ifExists !== "replace") {
    throw new VasirCliError({
      code: "AGENTS_FILE_EXISTS",
      message: `AGENTS.md already exists at ${agentsFilePath}`,
      suggestion:
        "Review the existing file, or rerun `vasir agents init <profile> --replace` if you explicitly want to overwrite it.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  const templateFilePath = path.join(globalCatalogDirectory, resolvedTemplate.templateRelativePath);
  if (!fs.existsSync(templateFilePath)) {
    throw createAgentsTemplateMissingError(templateFilePath);
  }

  const renderedTemplate = renderAgentsTemplate({
    templateText: fs.readFileSync(templateFilePath, "utf8"),
    projectName: guessProjectName(projectRootDirectory),
    currentDate
  });
  fs.writeFileSync(agentsFilePath, renderedTemplate);

  return {
    agentsFilePath,
    profile: resolvedTemplate.profile,
    wroteAgentsFile: true
  };
}

export function validateProjectAgentsFile({ projectRootDirectory }) {
  const agentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  if (!fs.existsSync(agentsFilePath)) {
    throw new VasirCliError({
      code: "AGENTS_FILE_MISSING",
      message: `AGENTS.md does not exist at ${agentsFilePath}`,
      suggestion: "Run `vasir agents init <backend|frontend|ios>` first, then rerun `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  const issues = [
    ...findAgentsValidationIssues(agentsText),
    ...findAgentsPathValidationIssues({
      agentsText,
      projectRootDirectory
    })
  ];

  return {
    agentsFilePath,
    issues
  };
}

function replaceRoutingPlaceholder({ agentsText, routingLines }) {
  const routingPattern = new RegExp(
    `${escapeRegExp(ROUTING_START_MARKER)}\\n([\\s\\S]*?)\\n${escapeRegExp(ROUTING_END_MARKER)}`,
    "m"
  );
  const routingMatch = agentsText.match(routingPattern);

  if (!routingMatch) {
    throw new VasirCliError({
      code: "AGENTS_ROUTING_PLACEHOLDER_MISSING",
      message: "AGENTS.md does not contain a writable Vasir routing placeholder block.",
      suggestion:
        "Paste the printed routing draft into Section 1 manually, or rerun `vasir agents init <profile> --replace` to restore the writable routing block first.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return agentsText.replace(
    routingPattern,
    `${ROUTING_START_MARKER}\n${routingLines.join("\n")}\n${ROUTING_END_MARKER}`
  );
}

function replacePurposePlaceholder({ agentsText, purposeText }) {
  const purposePattern = new RegExp(
    `${escapeRegExp(PURPOSE_START_MARKER)}\\n([\\s\\S]*?)\\n${escapeRegExp(PURPOSE_END_MARKER)}`,
    "m"
  );
  const purposeMatch = agentsText.match(purposePattern);

  if (!purposeMatch) {
    throw new VasirCliError({
      code: "AGENTS_PURPOSE_PLACEHOLDER_MISSING",
      message: "AGENTS.md does not contain a writable Vasir purpose placeholder.",
      suggestion:
        "Paste the printed draft into `AGENTS.md` manually, or rerun `vasir agents init <profile> --replace` to restore the writable placeholder first.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!purposeMatch[1].includes(PURPOSE_PLACEHOLDER_FRAGMENT)) {
    throw new VasirCliError({
      code: "AGENTS_PURPOSE_ALREADY_EDITED",
      message: "AGENTS.md already has a custom purpose block.",
      suggestion:
        "Review the printed draft and paste it manually if you still want to replace the current purpose paragraph.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return agentsText.replace(purposePattern, `**Purpose:** ${purposeText}`);
}

function parsePurposeDraftResponse(responseText) {
  const trimmedResponse = normalizeInlineText(
    String(responseText ?? "")
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
  );

  if (trimmedResponse.length === 0) {
    throw new VasirCliError({
      code: "AGENTS_DRAFT_EMPTY",
      message: "The model returned an empty AGENTS purpose draft.",
      suggestion: "Rerun `vasir agents draft-purpose` or write the purpose block manually in `AGENTS.md`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  try {
    const parsedResponse = JSON.parse(trimmedResponse);
    const parsedPurpose = normalizeInlineText(parsedResponse?.purpose ?? "");
    if (parsedPurpose.length > 0) {
      return parsedPurpose;
    }
  } catch {
    // fall through to plain-text handling
  }

  return trimmedResponse;
}

function createPurposeDraftPrompt(repositoryContext) {
  return {
    systemPrompt: [
      "You draft only the Purpose paragraph for a repository root AGENTS.md manifest.",
      "Use only the provided repository context.",
      "Do not invent stack details, paths, workflows, or constraints that are not explicitly supported by the context.",
      "Write 2-3 sentences of plain prose for the purpose block.",
      "Mention what the repository appears to do, what correctness or experience matters most, and what agents should optimize for.",
      "Return JSON only with the shape {\"purpose\":\"...\"}."
    ].join(" "),
    userPrompt: `AGENTS Purpose Draft Request\n\nRepository context:\n${JSON.stringify(repositoryContext, null, 2)}`
  };
}

async function resolveDraftModel({
  requestedModelArguments,
  currentWorkingDirectory,
  projectRootDirectory = null,
  environmentVariables,
  inputStream,
  outputStream,
  jsonOutput
}) {
  if (requestedModelArguments.length > 1) {
    throw new VasirCliError({
      code: "AGENTS_DRAFT_MULTI_MODEL_UNSUPPORTED",
      message: "`vasir agents draft-purpose` accepts at most one `--model` value.",
      suggestion:
        "Use one model such as `--model openai`, `--model opus`, `--model mock`, or omit the flag to use the default OpenAI draft model.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  const envResolution = resolveEvalEnvironmentVariables({
    currentWorkingDirectory,
    projectRootDirectory,
    environmentVariables
  });
  const promptForMissingCredential =
    !jsonOutput && canPromptInteractively({ inputStream, outputStream })
      ? (promptOptions) =>
          promptForMissingProviderCredential({
            ...promptOptions,
            inputStream,
            outputStream
          })
      : null;

  const modelResolution = await resolveEvalModels({
    requestedModelArguments: requestedModelArguments.length > 0 ? requestedModelArguments : ["openai"],
    environmentVariables: envResolution.environmentVariables,
    promptForMissingCredential
  });

  return {
    envResolution,
    modelDescriptor: modelResolution.modelDescriptors[0],
    environmentVariables: modelResolution.environmentVariables
  };
}

export async function runAgents({
  agentsArguments,
  replaceExistingAgentsFile = false,
  writeGeneratedOutput = false,
  modelArguments = [],
  homeDirectory,
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null,
  repositoryUrl,
  platform,
  spawnSyncImplementation,
  inputStream = process.stdin,
  outputStream = process.stdout,
  stdoutWriter,
  jsonOutput = false,
  environmentVariables = process.env,
  fetchImplementation = globalThis.fetch
}) {
  const agentsSubcommand = agentsArguments[0];
  if (!agentsSubcommand) {
    throw new VasirCliError({
      code: "AGENTS_SUBCOMMAND_REQUIRED",
      message: "An AGENTS subcommand is required.",
      suggestion:
        "Use `vasir agents init <backend|frontend|ios>`, `vasir agents draft-purpose`, `vasir agents draft-routing`, or `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!["init", "draft-purpose", "draft-routing", "validate"].includes(agentsSubcommand)) {
    throw new VasirCliError({
      code: "UNKNOWN_AGENTS_SUBCOMMAND",
      message: `Unknown AGENTS subcommand: ${agentsSubcommand}`,
      suggestion:
        "Use `vasir agents init <backend|frontend|ios>`, `vasir agents draft-purpose`, `vasir agents draft-routing`, or `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (agentsSubcommand === "init") {
    const requestedProfile = agentsArguments[1];
    if (!requestedProfile) {
      throw new VasirCliError({
        code: "AGENTS_PROFILE_REQUIRED",
        message: "An AGENTS profile is required.",
        suggestion: "Use `vasir agents init backend`, `vasir agents init frontend`, or `vasir agents init ios`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (modelArguments.length > 0) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--model is only supported by `vasir agents draft-purpose`.",
        suggestion: "Run `vasir agents init <profile>` without `--model`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (writeGeneratedOutput) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--write is only supported by `vasir agents draft-purpose`.",
        suggestion: "Run `vasir agents init <profile>` without `--write`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    const { globalPaths } = readGlobalRegistry({
      homeDirectory,
      repositoryUrl,
      platform,
      spawnSyncImplementation
    });
    const projectPaths = buildProjectPaths({
      currentWorkingDirectory,
      projectRootDirectory
    });
    const agentsInitialization = initializeProjectAgentsFile({
      globalCatalogDirectory: globalPaths.globalCatalogDirectory,
      projectRootDirectory: projectPaths.projectRootDirectory,
      profileName: requestedProfile,
      ifExists: replaceExistingAgentsFile ? "replace" : "error"
    });

    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      stdoutWriter(
        ui.renderPanel({
          title: "Agents",
          lines: [
            ui.formatStatusLine({
              kind: "ok",
              text: `Wrote ${agentsInitialization.profile} AGENTS starter`
            }),
            ui.formatField("path", ui.formatPath(agentsInitialization.agentsFilePath)),
            ui.formatField("edit first", "Purpose block, Section 1 routing, and any placeholder lines"),
            ui.formatField(
              "next",
              "vasir agents draft-purpose --write --model openai, vasir agents draft-routing --write, then vasir agents validate"
            )
          ]
        })
      );
    }

    return {
      subcommand: "init",
      profile: agentsInitialization.profile,
      projectRootDirectory: projectPaths.projectRootDirectory,
      agentsFilePath: agentsInitialization.agentsFilePath
    };
  }

  if (agentsSubcommand === "draft-routing") {
    if (modelArguments.length > 0) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--model is only supported by `vasir agents draft-purpose`.",
        suggestion: "Run `vasir agents draft-routing` without `--model`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    const projectPaths = buildProjectPaths({
      currentWorkingDirectory,
      projectRootDirectory
    });
    const validation = validateProjectAgentsFile({
      projectRootDirectory: projectPaths.projectRootDirectory
    });
    const agentsFilePath = validation.agentsFilePath;
    const agentsText = fs.readFileSync(agentsFilePath, "utf8");
    const routingDraft = formatRoutingLines({
      projectRootDirectory: projectPaths.projectRootDirectory,
      agentsText
    });

    let wroteRouting = false;
    if (writeGeneratedOutput) {
      const updatedAgentsText = replaceRoutingPlaceholder({
        agentsText,
        routingLines: routingDraft.routingLines
      });
      fs.writeFileSync(agentsFilePath, updatedAgentsText);
      wroteRouting = true;
    }

    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      stdoutWriter(
        ui.renderPanel({
          title: "Agents Routing Draft",
          lines: [
            ui.formatStatusLine({
              kind: "ok",
              text: wroteRouting ? "Updated AGENTS routing block" : "Drafted AGENTS routing block"
            }),
            ui.formatField("profile", routingDraft.effectiveProfileHint),
            ui.formatField("path", ui.formatPath(agentsFilePath)),
            ui.formatField(
              "next",
              wroteRouting
                ? "Create any referenced local AGENTS.md files or collapse those routes back into the root file, then run `vasir agents validate`."
                : "Rerun with --write to replace the routing placeholder, or paste the draft manually."
            )
          ]
        })
      );
      stdoutWriter(`${routingDraft.routingLines.join("\n")}\n`);
    }

    return {
      subcommand: "draft-routing",
      agentsFilePath,
      wroteRouting,
      profile: routingDraft.effectiveProfileHint,
      routingLines: routingDraft.routingLines
    };
  }

  if (agentsSubcommand === "validate") {
    if (modelArguments.length > 0) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--model is only supported by `vasir agents draft-purpose`.",
        suggestion: "Run `vasir agents validate` without `--model`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (writeGeneratedOutput) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--write is only supported by `vasir agents draft-purpose`.",
        suggestion: "Run `vasir agents validate` without `--write`.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    const projectPaths = buildProjectPaths({
      currentWorkingDirectory,
      projectRootDirectory
    });
    const validation = validateProjectAgentsFile({
      projectRootDirectory: projectPaths.projectRootDirectory
    });

    if (validation.issues.length > 0) {
      throw createAgentsValidationError({
        agentsFilePath: validation.agentsFilePath,
        issues: validation.issues
      });
    }

    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      stdoutWriter(
        ui.renderPanel({
          title: "Agents Validate",
          lines: [
            ui.formatStatusLine({
              kind: "ok",
              text: "AGENTS.md is free of known scaffold markers and broken repo routes"
            }),
            ui.formatField("path", ui.formatPath(validation.agentsFilePath))
          ]
        })
      );
    }

    return {
      subcommand: "validate",
      agentsFilePath: validation.agentsFilePath,
      issues: []
    };
  }

  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const validation = validateProjectAgentsFile({
    projectRootDirectory: projectPaths.projectRootDirectory
  });
  const agentsFilePath = validation.agentsFilePath;

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  const modelResolution = await resolveDraftModel({
    requestedModelArguments: modelArguments,
    currentWorkingDirectory,
    projectRootDirectory,
    environmentVariables,
    inputStream,
    outputStream,
    jsonOutput
  });
  const repositoryContext = buildRepositoryContext({
    projectRootDirectory: projectPaths.projectRootDirectory,
    agentsText
  });
  const prompt = createPurposeDraftPrompt(repositoryContext);
  const providerResponse = await generateEvalResponse({
    modelDescriptor: modelResolution.modelDescriptor,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    environmentVariables: modelResolution.environmentVariables,
    fetchImplementation
  });
  const purposeText = parsePurposeDraftResponse(providerResponse.text);

  let wrotePurpose = false;
  if (writeGeneratedOutput) {
    const updatedAgentsText = replacePurposePlaceholder({
      agentsText,
      purposeText
    });
    fs.writeFileSync(agentsFilePath, updatedAgentsText);
    wrotePurpose = true;
  }

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    stdoutWriter(
      ui.renderPanel({
        title: "Agents Purpose Draft",
        lines: [
          ui.formatStatusLine({
            kind: "ok",
            text: wrotePurpose ? "Updated AGENTS purpose block" : "Drafted AGENTS purpose block"
          }),
          ui.formatField("model", modelResolution.modelDescriptor.id),
          ui.formatField("path", ui.formatPath(agentsFilePath)),
          ui.formatField(
            "next",
            wrotePurpose
              ? "Run `vasir agents draft-routing --write`, then `vasir agents validate` after you finish replacing the remaining example lines"
              : "Rerun with --write to replace the placeholder, or paste the draft manually"
          )
        ]
      })
    );
    stdoutWriter(`${purposeText}\n`);
  }

  return {
    subcommand: "draft-purpose",
    agentsFilePath,
    model: modelResolution.modelDescriptor.id,
    wrotePurpose,
    purpose: purposeText,
    usage: providerResponse.usage ?? null
  };
}
