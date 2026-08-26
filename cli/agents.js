import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "./cli-error.js";
import { AGENTS_REFERENCE_DOCS_REF } from "./docs-ref.js";
import { readCatalogSourceRegistry, readGlobalRegistry } from "./global-catalog.js";
import { buildProjectPaths } from "./path-layout.js";
import {
  createProjectConfigWithAgentsProfile,
  readProjectConfig,
  writeProjectConfig
} from "./project-config.js";
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
const NONOBVIOUS_START_MARKER = "<!-- vasir:nonobvious:start -->";
const NONOBVIOUS_END_MARKER = "<!-- vasir:nonobvious:end -->";
const NONOBVIOUS_SOURCE_RELATIVE_PATH = "AGENTS__non-obvious.md";
const LEGACY_NONOBVIOUS_SOURCE_RELATIVE_PATH = ".agents/non-obvious.md";
const ENGINEERING_DOCTRINE_INSERTS_START_MARKER = "<!-- vasir:engineering-doctrine-inserts:start -->";
const ENGINEERING_DOCTRINE_INSERTS_END_MARKER = "<!-- vasir:engineering-doctrine-inserts:end -->";
const PURPOSE_PLACEHOLDER_FRAGMENT = "Replace this block first.";
const NONOBVIOUS_PLACEHOLDER_FRAGMENT = "[Add repo-specific landmines here.]";
const EMPTY_NONOBVIOUS_TEXT = "None recorded yet.";
const DEFAULT_AGENTS_TEMPLATE = path.join("templates", "agents", "AGENTS.md");
const DEFAULT_CLAUDE_TEMPLATE = path.join("templates", "agents", "CLAUDE.md");

const AGENTS_PROFILE_SNIPPETS = Object.freeze({
  backend: path.join("templates", "agents", "snippets", "backend-inserts.md"),
  frontend: path.join("templates", "agents", "snippets", "frontend-inserts.md"),
  ios: path.join("templates", "agents", "snippets", "ios-inserts.md")
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
    id: "game-source",
    label: "Game Source",
    patterns: ["games"],
    detail: "before changing game specs, kernels, shells, simulations, or game-local proof.",
    profiles: ["generic", "frontend"],
    priority: 91
  },
  {
    id: "local-tooling",
    label: "Local Tooling",
    patterns: ["tools"],
    detail: "before changing CLI, generators, templates, DevHub, or repo-local automation.",
    profiles: ["generic"],
    priority: 86
  },
  {
    id: "shared-packages",
    label: "Shared Packages",
    patterns: ["packages"],
    detail: "before changing workspace package APIs, SDK contracts, or shared runtime behavior.",
    profiles: ["generic"],
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

const ALLOWED_FAIL_CLOSED_PROHIBITION = "**DO NOT DEFAULT TO FAIL CLOSED!**";
const FAIL_CLOSED_POLICY_PATTERN = /\bfail(?:s|ed|ing)?(?:[\s_\p{Dash_Punctuation}]+)closed\b/iu;

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

function createMarkedBlockPattern({ startMarker, endMarker }) {
  return new RegExp(
    `(^[\\t ]*)${escapeRegExp(startMarker)}\\r?\\n([\\s\\S]*?)\\r?\\n[\\t ]*${escapeRegExp(endMarker)}`,
    "m"
  );
}

function indentBlockLines(blockText, indent) {
  if (!indent) {
    return blockText;
  }

  return blockText
    .split(/\r?\n/)
    .map((lineText) => lineText.length > 0 ? `${indent}${lineText}` : lineText)
    .join("\n");
}

function formatMarkedBlockReplacement({ blockMatch, startMarker, endMarker, replacementText }) {
  const markerIndent = blockMatch[1] ?? "";
  const indentedReplacement = indentBlockLines(replacementText, markerIndent);
  return `${markerIndent}${startMarker}\n${indentedReplacement}\n${markerIndent}${endMarker}`;
}

function formatMarkedBlockFinalization({ blockMatch, replacementText }) {
  const markerIndent = blockMatch[1] ?? "";
  return indentBlockLines(replacementText, markerIndent);
}

function readTemplateBlock({ templateText, startMarker, endMarker, templateFilePath }) {
  const blockPattern = createMarkedBlockPattern({ startMarker, endMarker });
  const blockMatch = templateText.match(blockPattern);

  if (!blockMatch) {
    throw new VasirCliError({
      code: "AGENTS_TEMPLATE_BLOCK_MISSING",
      message: `AGENTS template block is missing from ${templateFilePath}`,
      suggestion: "Restore the Vasir template markers, then rerun the AGENTS command.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return blockMatch[2];
}

function readMarkedBlockIfPresent({ agentsText, startMarker, endMarker }) {
  const blockPattern = createMarkedBlockPattern({ startMarker, endMarker });
  const blockMatch = agentsText.match(blockPattern);
  return blockMatch?.[2] ?? null;
}

function toPosixPath(value) {
  return String(value ?? "").split(path.sep).join("/");
}

function formatDisplayPath(relativePath) {
  const normalizedPath = toPosixPath(relativePath).replace(/^\/+/, "").replace(/\/+$/, "");
  return normalizedPath.length === 0 ? "/" : `/${normalizedPath}/`;
}

function buildProjectRelativeFilePath(projectRootDirectory, relativeFilePath) {
  return path.join(projectRootDirectory, ...relativeFilePath.split("/"));
}

function buildNonobviousSourceFilePath(projectRootDirectory) {
  return buildProjectRelativeFilePath(projectRootDirectory, NONOBVIOUS_SOURCE_RELATIVE_PATH);
}

function buildLegacyNonobviousSourceFilePath(projectRootDirectory) {
  return buildProjectRelativeFilePath(projectRootDirectory, LEGACY_NONOBVIOUS_SOURCE_RELATIVE_PATH);
}

function isPathInsideDirectory({ parentDirectory, candidateDirectory }) {
  const relativePath = path.relative(parentDirectory, candidateDirectory);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function resolveAgentsScopeDirectory({ baseProjectRootDirectory, agentsScopePath }) {
  if (!agentsScopePath) {
    return {
      targetProjectRootDirectory: baseProjectRootDirectory,
      agentsScope: null
    };
  }

  const targetProjectRootDirectory = path.isAbsolute(agentsScopePath)
    ? path.resolve(agentsScopePath)
    : path.resolve(baseProjectRootDirectory, agentsScopePath);

  if (!isPathInsideDirectory({
    parentDirectory: baseProjectRootDirectory,
    candidateDirectory: targetProjectRootDirectory
  })) {
    throw new VasirCliError({
      code: "AGENTS_SCOPE_OUTSIDE_REPO",
      message: `AGENTS scope must stay inside the target repo: ${agentsScopePath}`,
      suggestion: "Use `vasir agents sync --scope frontend` with a folder under the current repo root.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!fs.existsSync(targetProjectRootDirectory)) {
    throw new VasirCliError({
      code: "AGENTS_SCOPE_NOT_FOUND",
      message: `AGENTS scope does not exist: ${targetProjectRootDirectory}`,
      suggestion: "Create the folder first, then rerun `vasir agents sync --scope <folder>`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!fs.statSync(targetProjectRootDirectory).isDirectory()) {
    throw new VasirCliError({
      code: "AGENTS_SCOPE_NOT_DIRECTORY",
      message: `AGENTS scope must be a directory: ${targetProjectRootDirectory}`,
      suggestion: "Pass a folder path such as `--scope frontend` or `--scope packages/web`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return {
    targetProjectRootDirectory,
    agentsScope: toPosixPath(path.relative(baseProjectRootDirectory, targetProjectRootDirectory)) || "."
  };
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

function readConfiguredAgentsProfileName({ projectRootDirectory }) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory
  });
  const projectConfig = readProjectConfig({ projectPaths });

  return projectConfig?.agents?.profile ?? null;
}

function writeConfiguredAgentsProfileName({ projectRootDirectory, profileName }) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory: projectRootDirectory,
    projectRootDirectory
  });
  const existingProjectConfig = readProjectConfig({ projectPaths });

  writeProjectConfig({
    projectPaths,
    projectConfig: createProjectConfigWithAgentsProfile({
      projectConfig: existingProjectConfig,
      agentsProfileName: profileName
    })
  });
}

function resolveAgentsTemplate(profileName) {
  if (profileName === null || profileName === undefined || profileName === "") {
    return {
      profile: "generic",
      templateRelativePath: DEFAULT_AGENTS_TEMPLATE,
      claudeTemplateRelativePath: DEFAULT_CLAUDE_TEMPLATE,
      snippetRelativePath: null
    };
  }

  const normalizedProfileName = profileName.toLowerCase();
  if (normalizedProfileName === "generic") {
    return {
      profile: "generic",
      templateRelativePath: DEFAULT_AGENTS_TEMPLATE,
      claudeTemplateRelativePath: DEFAULT_CLAUDE_TEMPLATE,
      snippetRelativePath: null
    };
  }

  const snippetRelativePath = AGENTS_PROFILE_SNIPPETS[normalizedProfileName];
  if (!snippetRelativePath) {
    throw new VasirCliError({
      code: "AGENTS_PROFILE_UNKNOWN",
      message: `Unknown AGENTS profile: ${profileName}`,
      suggestion: "Use one of: backend, frontend, ios, generic.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return {
    profile: normalizedProfileName,
    templateRelativePath: DEFAULT_AGENTS_TEMPLATE,
    claudeTemplateRelativePath: DEFAULT_CLAUDE_TEMPLATE,
    snippetRelativePath
  };
}

export function assertSupportedAgentsProfile(profileName) {
  resolveAgentsTemplate(profileName);
}

export function inspectRepositoryContext({ projectRootDirectory, agentsText }) {
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

  if (hasDirectory("games") && (hasDirectory("tools") || hasDirectory("packages"))) {
    return {
      profileName: null,
      confident: false,
      reason: "Game workspaces with local tooling or shared packages are mixed repos; use the generic AGENTS profile unless a repo config overrides it."
    };
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

export function inspectRecommendedAgentsProfile({
  projectRootDirectory,
  agentsText = ""
}) {
  const repositoryContext = inspectRepositoryContext({
    projectRootDirectory,
    agentsText
  });
  const inference = inferAgentsProfile({
    projectRootDirectory,
    repositoryContext
  });

  return {
    repositoryContext,
    inference,
    recommendation: {
      profileName: inference.profileName,
      source: inference.profileName ? "inferred" : "default-generic",
      reason: inference.reason
    }
  };
}

export async function resolveRecommendedAgentsProfile({
  projectRootDirectory,
  inputStream = process.stdin,
  outputStream = process.stdout,
  jsonOutput = false
}) {
  const inspectedProfileRecommendation = inspectRecommendedAgentsProfile({
    projectRootDirectory,
    agentsText: ""
  });
  const { inference } = inspectedProfileRecommendation;

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

function replaceTemplateBlock({ templateText, startMarker, endMarker, replacementText, templateFilePath }) {
  const blockPattern = createMarkedBlockPattern({ startMarker, endMarker });
  const blockMatch = templateText.match(blockPattern);

  if (!blockMatch) {
    throw new VasirCliError({
      code: "AGENTS_TEMPLATE_BLOCK_MISSING",
      message: `AGENTS template block is missing from ${templateFilePath}`,
      suggestion: "Restore the Vasir template markers, then rerun the AGENTS command.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return templateText.replace(
    blockPattern,
    () => formatMarkedBlockReplacement({
      blockMatch,
      startMarker,
      endMarker,
      replacementText
    })
  );
}

function renderAgentsTemplate({
  templateText,
  projectName,
  profile,
  profileSnippetText = null,
  templateFilePath = DEFAULT_AGENTS_TEMPLATE,
  snippetFilePath = null
}) {
  let renderedTemplate = templateText
    .replace(/\[Project Name\]/g, () => projectName);

  if (!profileSnippetText) {
    return renderedTemplate;
  }

  const purposeReplacement = readTemplateBlock({
    templateText: profileSnippetText,
    startMarker: PURPOSE_START_MARKER,
    endMarker: PURPOSE_END_MARKER,
    templateFilePath: snippetFilePath ?? templateFilePath
  });
  const routingReplacement = readTemplateBlock({
    templateText: profileSnippetText,
    startMarker: ROUTING_START_MARKER,
    endMarker: ROUTING_END_MARKER,
    templateFilePath: snippetFilePath ?? templateFilePath
  });
  const doctrineReplacement = readTemplateBlock({
    templateText: profileSnippetText,
    startMarker: ENGINEERING_DOCTRINE_INSERTS_START_MARKER,
    endMarker: ENGINEERING_DOCTRINE_INSERTS_END_MARKER,
    templateFilePath: snippetFilePath ?? templateFilePath
  });

  renderedTemplate = replaceTemplateBlock({
    templateText: renderedTemplate,
    startMarker: PURPOSE_START_MARKER,
    endMarker: PURPOSE_END_MARKER,
    replacementText: purposeReplacement,
    templateFilePath
  });
  renderedTemplate = replaceTemplateBlock({
    templateText: renderedTemplate,
    startMarker: ROUTING_START_MARKER,
    endMarker: ROUTING_END_MARKER,
    replacementText: routingReplacement,
    templateFilePath
  });
  return replaceTemplateBlock({
    templateText: renderedTemplate,
    startMarker: ENGINEERING_DOCTRINE_INSERTS_START_MARKER,
    endMarker: ENGINEERING_DOCTRINE_INSERTS_END_MARKER,
    replacementText: doctrineReplacement,
    templateFilePath
  });
}

function renderSynchronizedRootContractText({
  templateText,
  profileSnippetText,
  projectName,
  profile,
  templateFilePath,
  snippetFilePath,
  purposeText,
  routingLines,
  nonobviousText
}) {
  let synchronizedText = removeScaffoldEditBlock(renderAgentsTemplate({
    templateText,
    profileSnippetText,
    projectName,
    profile,
    templateFilePath,
    snippetFilePath
  }));

  synchronizedText = finalizeMarkedBlock({
    agentsText: synchronizedText,
    startMarker: PURPOSE_START_MARKER,
    endMarker: PURPOSE_END_MARKER,
    replacementText: `**Purpose:** ${purposeText}`
  });
  synchronizedText = finalizeMarkedBlock({
    agentsText: synchronizedText,
    startMarker: ROUTING_START_MARKER,
    endMarker: ROUTING_END_MARKER,
    replacementText: routingLines.join("\n")
  });
  return replaceTemplateBlock({
    templateText: synchronizedText,
    startMarker: NONOBVIOUS_START_MARKER,
    endMarker: NONOBVIOUS_END_MARKER,
    replacementText: nonobviousText,
    templateFilePath
  });
}

function removeScaffoldEditBlock(agentsText) {
  return agentsText.replace(
    /^> EDIT THESE FIRST\r?\n(?:> .*\r?\n)+\r?\n?/m,
    ""
  );
}

function finalizeMarkedBlock({ agentsText, startMarker, endMarker, replacementText }) {
  const blockPattern = createMarkedBlockPattern({ startMarker, endMarker });
  const blockMatch = agentsText.match(blockPattern);

  if (!blockMatch) {
    throw new VasirCliError({
      code: "AGENTS_TEMPLATE_BLOCK_MISSING",
      message: `AGENTS template block is missing ${startMarker}`,
      suggestion: "Restore the Vasir template markers in the source template, then rerun `vasir agents sync`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return agentsText.replace(
    blockPattern,
    () => formatMarkedBlockFinalization({
      blockMatch,
      replacementText
    })
  );
}

function isPurposePlaceholderText(purposeText) {
  return (
    purposeText.includes(PURPOSE_PLACEHOLDER_FRAGMENT) ||
    purposeText.includes("[Describe this ")
  );
}

function extractExistingPurposeText(agentsText) {
  if (!agentsText) {
    return null;
  }

  const markedPurposeText = readMarkedBlockIfPresent({
    agentsText,
    startMarker: PURPOSE_START_MARKER,
    endMarker: PURPOSE_END_MARKER
  });
  const markedPurposeMatch = markedPurposeText?.match(/^\s*\*\*Purpose:\*\*\s*(.+)$/m);
  if (markedPurposeMatch && !isPurposePlaceholderText(markedPurposeMatch[1])) {
    return normalizeInlineText(markedPurposeMatch[1]);
  }

  const purposeLineMatch = agentsText.match(/^\*\*Purpose:\*\*\s*(.+)$/m);
  if (purposeLineMatch && !isPurposePlaceholderText(purposeLineMatch[1])) {
    return normalizeInlineText(purposeLineMatch[1]);
  }

  return null;
}

function readFirstReadmeSentence(readmeExcerpt) {
  const normalizedReadmeText = normalizeInlineText(readmeExcerpt ?? "");
  if (normalizedReadmeText.length === 0) {
    return null;
  }

  const sentenceMatch = normalizedReadmeText.match(/^(.+?[.!?])(?:\s|$)/);
  return normalizeInlineText(sentenceMatch?.[1] ?? normalizedReadmeText.slice(0, 220));
}

function createLocalPurposeDraft({ repositoryContext, profileName }) {
  const projectName = repositoryContext.projectName || "This repository";
  const packageDescription = normalizeInlineText(repositoryContext.packageJson?.description ?? "");
  const readmeSentence = readFirstReadmeSentence(repositoryContext.readmeExcerpt);
  const sourceDescription = packageDescription || readmeSentence;
  const openingSentence = sourceDescription
    ? `${projectName}: ${sourceDescription.replace(/[.!?]+$/, "")}.`
    : `${projectName} is a ${profileName === "generic" ? "software" : profileName} repository.`;

  const profileGuidance = {
    backend: {
      correctness: "Correctness means requests, jobs, persistence, retries, and failure behavior match the real production contract.",
      optimization: "Agents should optimize for clear authority boundaries, observable failure paths, deterministic tests, and production-shaped integrations."
    },
    frontend: {
      correctness: "Correctness means the primary screens render, route, fetch, mutate, and recover from failure in the real app environment.",
      optimization: "Agents should optimize for visible user journeys, stable state and data flow, accessible controls, and rendered proof."
    },
    ios: {
      correctness: "Correctness means app lifecycle, navigation, native UI, networking, and local state behave correctly on the target runtime.",
      optimization: "Agents should optimize for native user journeys, explicit lifecycle boundaries, resilient sync, and device-backed proof."
    },
    generic: {
      correctness: "Correctness means the repository's core workflows run through their real entrypoints and fail in predictable, observable ways.",
      optimization: "Agents should optimize for production-shaped changes, explicit ownership, narrow scope, and proof through the real value path."
    }
  };
  const guidance = profileGuidance[profileName] ?? profileGuidance.generic;

  return `${openingSentence} ${guidance.correctness} ${guidance.optimization}`;
}

function extractXmlTagBlockText({ agentsText, tagName }) {
  const tagPattern = new RegExp(
    `<${escapeRegExp(tagName)}>\\s*\\r?\\n([\\s\\S]*?)\\r?\\n\\s*</${escapeRegExp(tagName)}>`,
    "i"
  );
  const tagMatch = agentsText.match(tagPattern);
  return tagMatch?.[1] ?? null;
}

function isNonobviousPlaceholderText(nonobviousText) {
  const normalizedNonobviousText = normalizeInlineText(nonobviousText);
  return (
    normalizedNonobviousText.length === 0 ||
    normalizedNonobviousText === normalizeInlineText(EMPTY_NONOBVIOUS_TEXT) ||
    nonobviousText.includes(NONOBVIOUS_PLACEHOLDER_FRAGMENT)
  );
}

function extractExistingNonobviousText(agentsText) {
  if (!agentsText) {
    return null;
  }

  const markedNonobviousText = readMarkedBlockIfPresent({
    agentsText,
    startMarker: NONOBVIOUS_START_MARKER,
    endMarker: NONOBVIOUS_END_MARKER
  });
  if (markedNonobviousText !== null) {
    return isNonobviousPlaceholderText(markedNonobviousText) ? null : markedNonobviousText.trim();
  }

  const taggedNonobviousText = extractXmlTagBlockText({
    agentsText,
    tagName: "non-obvious_architectural_considerations"
  });
  if (taggedNonobviousText && !isNonobviousPlaceholderText(taggedNonobviousText)) {
    return taggedNonobviousText.trim();
  }

  return null;
}

function resolveNonobviousContext({
  projectRootDirectory,
  existingAgentsText,
  dryRun
}) {
  const nonobviousFilePath = buildNonobviousSourceFilePath(projectRootDirectory);
  const legacyNonobviousFilePath = buildLegacyNonobviousSourceFilePath(projectRootDirectory);

  if (fs.existsSync(nonobviousFilePath)) {
    const sourceText = fs.readFileSync(nonobviousFilePath, "utf8").trim();
    return {
      nonobviousFilePath,
      nonobviousText: isNonobviousPlaceholderText(sourceText) ? EMPTY_NONOBVIOUS_TEXT : sourceText,
      nonobviousSource: isNonobviousPlaceholderText(sourceText) ? "empty-file" : "file",
      pendingNonobviousFileText: null,
      legacyNonobviousFilePath: null,
      wroteNonobviousFile: false,
      wouldWriteNonobviousFile: false,
      removedLegacyNonobviousFile: false,
      wouldRemoveLegacyNonobviousFile: false
    };
  }

  if (fs.existsSync(legacyNonobviousFilePath)) {
    const legacySourceText = fs.readFileSync(legacyNonobviousFilePath, "utf8").trim();
    return {
      nonobviousFilePath,
      nonobviousText: isNonobviousPlaceholderText(legacySourceText) ? EMPTY_NONOBVIOUS_TEXT : legacySourceText,
      nonobviousSource: dryRun ? "would-migrate-from-legacy-file" : "migrated-from-legacy-file",
      pendingNonobviousFileText: isNonobviousPlaceholderText(legacySourceText) ? EMPTY_NONOBVIOUS_TEXT : legacySourceText,
      legacyNonobviousFilePath,
      wroteNonobviousFile: !dryRun,
      wouldWriteNonobviousFile: dryRun,
      removedLegacyNonobviousFile: !dryRun,
      wouldRemoveLegacyNonobviousFile: dryRun
    };
  }

  const legacyNonobviousText = extractExistingNonobviousText(existingAgentsText);
  if (legacyNonobviousText) {
    return {
      nonobviousFilePath,
      nonobviousText: legacyNonobviousText,
      nonobviousSource: dryRun ? "would-migrate-from-agents" : "migrated-from-agents",
      pendingNonobviousFileText: legacyNonobviousText,
      legacyNonobviousFilePath: null,
      wroteNonobviousFile: !dryRun,
      wouldWriteNonobviousFile: dryRun,
      removedLegacyNonobviousFile: false,
      wouldRemoveLegacyNonobviousFile: false
    };
  }

  return {
    nonobviousFilePath,
    nonobviousText: EMPTY_NONOBVIOUS_TEXT,
    nonobviousSource: dryRun ? "would-create-empty-file" : "created-empty-file",
    pendingNonobviousFileText: EMPTY_NONOBVIOUS_TEXT,
    legacyNonobviousFilePath: null,
    wroteNonobviousFile: !dryRun,
    wouldWriteNonobviousFile: dryRun,
    removedLegacyNonobviousFile: false,
    wouldRemoveLegacyNonobviousFile: false
  };
}

function writeNonobviousSourceFile({ nonobviousFilePath, nonobviousText }) {
  fs.mkdirSync(path.dirname(nonobviousFilePath), { recursive: true });
  fs.writeFileSync(nonobviousFilePath, `${nonobviousText.trim()}\n`);
}

function createAgentsTemplateMissingError(templateFilePath) {
  return new VasirCliError({
    code: "AGENTS_TEMPLATE_MISSING",
    message: `AGENTS template is missing from the global catalog: ${templateFilePath}`,
    suggestion: "Run `vasir update` to refresh the global catalog, then rerun the AGENTS command.",
    docsRef: AGENTS_REFERENCE_DOCS_REF
  });
}

function findFailurePolicyValidationIssues(agentsText) {
  const lines = agentsText.split(/\r?\n/);
  const prohibitionLineIndexes = lines.flatMap((lineText, lineIndex) =>
    lineText.trim() === ALLOWED_FAIL_CLOSED_PROHIBITION ? [lineIndex] : []
  );
  const duplicateIssues = prohibitionLineIndexes.slice(1).map((lineIndex) => ({
    code: "DUPLICATE_FAIL_CLOSED_PROHIBITION",
    lineNumber: lineIndex + 1,
    message: "Keep the root prohibition single-homed; remove this duplicate.",
    lineText: ALLOWED_FAIL_CLOSED_PROHIBITION
  }));
  const textWithoutAllowedProhibition = lines
    .map((lineText) => lineText.trim() === ALLOWED_FAIL_CLOSED_PROHIBITION ? "" : lineText)
    .join("\n");
  const prohibitedMatch = FAIL_CLOSED_POLICY_PATTERN.exec(textWithoutAllowedProhibition);

  if (!prohibitedMatch) {
    return duplicateIssues;
  }

  const lineNumber = textWithoutAllowedProhibition.slice(0, prohibitedMatch.index).split("\n").length;
  return [
    ...duplicateIssues,
    {
      code: "GENERIC_FAIL_CLOSED_POLICY",
      lineNumber,
      message:
        `Remove generic failure-policy shorthand. The only permitted use is the exact root prohibition: ${ALLOWED_FAIL_CLOSED_PROHIBITION}`,
      lineText: prohibitedMatch[0].replace(/\s+/g, " ")
    }
  ];
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
    message: `AGENTS.md contains invalid steering, scaffold, or repo-truth content. ${issueSummary}`,
    suggestion:
      "Edit the flagged lines, create any missing required local AGENTS.md files, or rerun `vasir agents sync`, then rerun `vasir agents validate`.",
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
    if (/^#{1,6}\s+/.test(trimmedLine)) {
      inRoutingSection = /^#{1,6}\s+1\.\s+Topography & Routing Protocol/.test(trimmedLine);
    }

    if (trimmedLine.length === 0) {
      continue;
    }

    if (!inRoutingSection) {
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
        const localAgentsFilePath = path.join(resolvedToken.absolutePath, "AGENTS.md");
        if (!fs.existsSync(localAgentsFilePath)) {
          issues.push({
            code: "LOCAL_AGENTS_MISSING",
            lineNumber: lineIndex + 1,
            message:
              `Local AGENTS lane is referenced at ${resolvedToken.token}, but /${toPosixPath(path.relative(projectRootDirectory, localAgentsFilePath))} does not exist yet.`,
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
    if (profileHint === "generic" && !laneDefinition.profiles.includes("generic")) {
      continue;
    }

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

function formatRoutingLineForLane({ lane, requiresLocalAgentsFile = true }) {
  if (lane.coldStorage) {
    return `* **${lane.label}:** Do not read \`${lane.displayPath}\` unless explicitly instructed by the user.`;
  }

  const contextInstruction = requiresLocalAgentsFile
    ? "you must first read that directory's local `AGENTS.md`"
    : "use this root `AGENTS.md`";

  return `* **${lane.label}:** If touching \`${lane.displayPath}\`, ${contextInstruction} ${lane.detail}`;
}

function formatRoutingLines({ projectRootDirectory, agentsText, profileName = null }) {
  const profileHint = profileName ?? readAgentsProfileHint(agentsText);
  const inferredProfile = inferAgentsProfile({
    projectRootDirectory,
    repositoryContext: inspectRepositoryContext({
      projectRootDirectory,
      agentsText
    })
  }).profileName;
  const effectiveProfileHint = profileHint ?? inferredProfile ?? "generic";
  const lanes = findRoutingLanes({
    projectRootDirectory,
    profileHint: effectiveProfileHint
  });

  return {
    effectiveProfileHint,
    lanes,
    routingLines: lanes.map((lane) => formatRoutingLineForLane({
      lane,
      requiresLocalAgentsFile: true
    }))
  };
}

function formatSynchronizedRoutingLines({ projectRootDirectory, agentsText, profileName = null }) {
  const routingDraft = formatRoutingLines({
    projectRootDirectory,
    agentsText,
    profileName
  });

  return {
    ...routingDraft,
    routingLines: routingDraft.lanes.map((lane) => {
      if (lane.coldStorage) {
        return formatRoutingLineForLane({
          lane,
          requiresLocalAgentsFile: true
        });
      }

      return formatRoutingLineForLane({
        lane,
        requiresLocalAgentsFile: fs.existsSync(path.join(projectRootDirectory, lane.relativePath, "AGENTS.md"))
      });
    })
  };
}

export function initializeProjectAgentsFile({
  globalCatalogDirectory,
  projectRootDirectory,
  profileName = null,
  ifExists = "error"
}) {
  const resolvedTemplate = resolveAgentsTemplate(profileName);
  const agentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  const claudeFilePath = path.join(projectRootDirectory, "CLAUDE.md");
  const agentsFileExists = fs.existsSync(agentsFilePath);
  const claudeFileExists = fs.existsSync(claudeFilePath);

  if ((agentsFileExists || claudeFileExists) && ifExists === "skip") {
    return {
      agentsFilePath,
      claudeFilePath,
      profile: resolvedTemplate.profile,
      wroteAgentsFile: false,
      wroteClaudeFile: false
    };
  }

  if ((agentsFileExists || claudeFileExists) && ifExists !== "replace") {
    throw new VasirCliError({
      code: "AGENTS_FILE_EXISTS",
      message: `AGENTS.md or CLAUDE.md already exists in ${projectRootDirectory}`,
      suggestion:
        "Review the existing files, or rerun `vasir agents init <profile> --replace` if you explicitly want to overwrite them.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  const templateFilePath = path.join(globalCatalogDirectory, resolvedTemplate.templateRelativePath);
  if (!fs.existsSync(templateFilePath)) {
    throw createAgentsTemplateMissingError(templateFilePath);
  }
  const snippetFilePath = resolvedTemplate.snippetRelativePath
    ? path.join(globalCatalogDirectory, resolvedTemplate.snippetRelativePath)
      : null;
  if (snippetFilePath && !fs.existsSync(snippetFilePath)) {
    throw createAgentsTemplateMissingError(snippetFilePath);
  }
  const claudeTemplateFilePath = path.join(globalCatalogDirectory, resolvedTemplate.claudeTemplateRelativePath);
  if (!fs.existsSync(claudeTemplateFilePath)) {
    throw createAgentsTemplateMissingError(claudeTemplateFilePath);
  }

  const renderedTemplate = renderAgentsTemplate({
    templateText: fs.readFileSync(templateFilePath, "utf8"),
    profileSnippetText: snippetFilePath ? fs.readFileSync(snippetFilePath, "utf8") : null,
    projectName: guessProjectName(projectRootDirectory),
    profile: resolvedTemplate.profile,
    templateFilePath,
    snippetFilePath
  });
  const renderedClaudeTemplate = renderAgentsTemplate({
    templateText: fs.readFileSync(claudeTemplateFilePath, "utf8"),
    profileSnippetText: snippetFilePath ? fs.readFileSync(snippetFilePath, "utf8") : null,
    projectName: guessProjectName(projectRootDirectory),
    profile: resolvedTemplate.profile,
    templateFilePath: claudeTemplateFilePath,
    snippetFilePath
  });
  fs.writeFileSync(agentsFilePath, renderedTemplate);
  fs.writeFileSync(claudeFilePath, renderedClaudeTemplate);
  writeConfiguredAgentsProfileName({
    projectRootDirectory,
    profileName: resolvedTemplate.profile
  });

  return {
    agentsFilePath,
    claudeFilePath,
    profile: resolvedTemplate.profile,
    wroteAgentsFile: true,
    wroteClaudeFile: true
  };
}

export function validateProjectAgentsFile({ projectRootDirectory }) {
  const agentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  if (!fs.existsSync(agentsFilePath)) {
    throw new VasirCliError({
      code: "AGENTS_FILE_MISSING",
      message: `AGENTS.md does not exist at ${agentsFilePath}`,
      suggestion: "Run `vasir agents init <backend|frontend|ios|generic>` first, then rerun `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  const issues = validateAgentsText({
    agentsText,
    projectRootDirectory
  });

  return {
    agentsFilePath,
    issues
  };
}

function validateAgentsText({ agentsText, projectRootDirectory }) {
  return [
    ...findFailurePolicyValidationIssues(agentsText),
    ...findAgentsValidationIssues(agentsText),
    ...findAgentsPathValidationIssues({
      agentsText,
      projectRootDirectory
    })
  ];
}

function renderSynchronizedAgentsText({
  globalCatalogDirectory,
  projectRootDirectory,
  existingAgentsText,
  existingClaudeText = null,
  profileName = null,
  configuredProfileName = null,
  nonobviousText = EMPTY_NONOBVIOUS_TEXT
}) {
  const existingRootContractText = existingAgentsText ?? existingClaudeText;
  const existingProfileName = existingRootContractText ? readAgentsProfileHint(existingRootContractText) : null;
  const inspectedProfileRecommendation = inspectRecommendedAgentsProfile({
    projectRootDirectory,
    agentsText: existingRootContractText ?? ""
  });
  const requestedProfileName =
    profileName ??
    configuredProfileName ??
    existingProfileName ??
    inspectedProfileRecommendation.recommendation.profileName ??
    null;
  const resolvedTemplate = resolveAgentsTemplate(requestedProfileName);
  const templateFilePath = path.join(globalCatalogDirectory, resolvedTemplate.templateRelativePath);
  if (!fs.existsSync(templateFilePath)) {
    throw createAgentsTemplateMissingError(templateFilePath);
  }
  const claudeTemplateFilePath = path.join(globalCatalogDirectory, resolvedTemplate.claudeTemplateRelativePath);
  if (!fs.existsSync(claudeTemplateFilePath)) {
    throw createAgentsTemplateMissingError(claudeTemplateFilePath);
  }

  const snippetFilePath = resolvedTemplate.snippetRelativePath
    ? path.join(globalCatalogDirectory, resolvedTemplate.snippetRelativePath)
    : null;
  if (snippetFilePath && !fs.existsSync(snippetFilePath)) {
    throw createAgentsTemplateMissingError(snippetFilePath);
  }

  const repositoryContext = inspectRepositoryContext({
    projectRootDirectory,
    agentsText: existingRootContractText ?? ""
  });
  const existingPurposeText = extractExistingPurposeText(existingRootContractText);
  const purposeText = existingPurposeText ?? createLocalPurposeDraft({
    repositoryContext,
    profileName: resolvedTemplate.profile
  });
  const purposeSource = existingPurposeText ? "preserved" : "generated";

  const profileSnippetText = snippetFilePath ? fs.readFileSync(snippetFilePath, "utf8") : null;
  const renderedTemplate = renderAgentsTemplate({
    templateText: fs.readFileSync(templateFilePath, "utf8"),
    profileSnippetText,
    projectName: repositoryContext.projectName,
    profile: resolvedTemplate.profile,
    templateFilePath,
    snippetFilePath
  });
  const synchronizedRouting = formatSynchronizedRoutingLines({
    projectRootDirectory,
    agentsText: existingRootContractText ?? renderedTemplate,
    profileName: resolvedTemplate.profile
  });

  const synchronizedAgentsText = renderSynchronizedRootContractText({
    templateText: fs.readFileSync(templateFilePath, "utf8"),
    profileSnippetText,
    projectName: repositoryContext.projectName,
    profile: resolvedTemplate.profile,
    templateFilePath,
    snippetFilePath,
    purposeText,
    routingLines: synchronizedRouting.routingLines,
    nonobviousText
  });
  const synchronizedClaudeText = renderSynchronizedRootContractText({
    templateText: fs.readFileSync(claudeTemplateFilePath, "utf8"),
    profileSnippetText,
    projectName: repositoryContext.projectName,
    profile: resolvedTemplate.profile,
    templateFilePath: claudeTemplateFilePath,
    snippetFilePath,
    purposeText,
    routingLines: synchronizedRouting.routingLines,
    nonobviousText
  });

  return {
    synchronizedAgentsText,
    synchronizedClaudeText,
    profile: resolvedTemplate.profile,
    profileSource: profileName
      ? "argument"
      : configuredProfileName
        ? "config"
        : existingProfileName
          ? "legacy-agents"
          : inspectedProfileRecommendation.recommendation.profileName
            ? inspectedProfileRecommendation.recommendation.source
            : "default-generic",
    purposeSource,
    routingProfile: synchronizedRouting.effectiveProfileHint,
    routingLines: synchronizedRouting.routingLines
  };
}

export function synchronizeProjectAgentsFile({
  globalCatalogDirectory,
  projectRootDirectory,
  profileName = null,
  dryRun = false,
  persistProfileConfig = false
}) {
  const agentsFilePath = path.join(projectRootDirectory, "AGENTS.md");
  const claudeFilePath = path.join(projectRootDirectory, "CLAUDE.md");
  const agentsFileExists = fs.existsSync(agentsFilePath);
  const claudeFileExists = fs.existsSync(claudeFilePath);
  const existingAgentsText = agentsFileExists ? fs.readFileSync(agentsFilePath, "utf8") : null;
  const existingClaudeText = claudeFileExists ? fs.readFileSync(claudeFilePath, "utf8") : null;
  const existingRootContractText = existingAgentsText ?? existingClaudeText;
  const existingProfileName = existingRootContractText ? readAgentsProfileHint(existingRootContractText) : null;
  const configuredProfileName = persistProfileConfig
    ? readConfiguredAgentsProfileName({ projectRootDirectory })
    : null;
  const nonobviousContext = resolveNonobviousContext({
    projectRootDirectory,
    existingAgentsText: existingRootContractText,
    dryRun
  });
  const synchronizedAgents = renderSynchronizedAgentsText({
    globalCatalogDirectory,
    projectRootDirectory,
    existingAgentsText,
    existingClaudeText,
    profileName,
    configuredProfileName,
    nonobviousText: nonobviousContext.nonobviousText
  });
  const validationIssues = validateAgentsText({
    agentsText: synchronizedAgents.synchronizedAgentsText,
    projectRootDirectory
  });

  if (validationIssues.length > 0) {
    throw createAgentsValidationError({
      agentsFilePath,
      issues: validationIssues
    });
  }

  const agentsFileChanged = existingAgentsText !== synchronizedAgents.synchronizedAgentsText;
  const claudeFileChanged = existingClaudeText !== synchronizedAgents.synchronizedClaudeText;
  const shouldPersistProfileConfig =
    persistProfileConfig &&
    (profileName !== null || configuredProfileName !== null || existingProfileName !== null);
  const profileConfigChanged =
    shouldPersistProfileConfig &&
    configuredProfileName !== synchronizedAgents.profile;
  const changed =
    agentsFileChanged ||
    claudeFileChanged ||
    Boolean(nonobviousContext.pendingNonobviousFileText) ||
    profileConfigChanged;
  if (nonobviousContext.pendingNonobviousFileText && !dryRun) {
    writeNonobviousSourceFile({
      nonobviousFilePath: nonobviousContext.nonobviousFilePath,
      nonobviousText: nonobviousContext.pendingNonobviousFileText
    });
    if (
      nonobviousContext.legacyNonobviousFilePath &&
      fs.existsSync(nonobviousContext.legacyNonobviousFilePath)
    ) {
      fs.unlinkSync(nonobviousContext.legacyNonobviousFilePath);
    }
  }
  if (agentsFileChanged && !dryRun) {
    fs.writeFileSync(agentsFilePath, synchronizedAgents.synchronizedAgentsText);
  }
  if (claudeFileChanged && !dryRun) {
    fs.writeFileSync(claudeFilePath, synchronizedAgents.synchronizedClaudeText);
  }
  if (profileConfigChanged && !dryRun) {
    writeConfiguredAgentsProfileName({
      projectRootDirectory,
      profileName: synchronizedAgents.profile
    });
  }

  return {
    agentsFilePath,
    claudeFilePath,
    mode: !agentsFileExists ? "created" : agentsFileChanged || claudeFileChanged ? "refreshed" : changed ? "refreshed" : "unchanged",
    changed,
    wroteAgentsFile: agentsFileChanged && !dryRun,
    wroteClaudeFile: claudeFileChanged && !dryRun,
    wroteProjectConfigProfile: profileConfigChanged && !dryRun,
    dryRun,
    profile: synchronizedAgents.profile,
    profileSource: synchronizedAgents.profileSource,
    purposeSource: synchronizedAgents.purposeSource,
    nonobviousSource: nonobviousContext.nonobviousSource,
    nonobviousFilePath: nonobviousContext.nonobviousFilePath,
    wroteNonobviousFile: nonobviousContext.wroteNonobviousFile,
    wouldWriteNonobviousFile: nonobviousContext.wouldWriteNonobviousFile,
    legacyNonobviousFilePath: nonobviousContext.legacyNonobviousFilePath,
    removedLegacyNonobviousFile: nonobviousContext.removedLegacyNonobviousFile,
    wouldRemoveLegacyNonobviousFile: nonobviousContext.wouldRemoveLegacyNonobviousFile,
    routingProfile: synchronizedAgents.routingProfile,
    routingLines: synchronizedAgents.routingLines,
    issues: []
  };
}

function replaceRoutingPlaceholder({ agentsText, routingLines }) {
  const routingPattern = createMarkedBlockPattern({
    startMarker: ROUTING_START_MARKER,
    endMarker: ROUTING_END_MARKER
  });
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
    () => formatMarkedBlockReplacement({
      blockMatch: routingMatch,
      startMarker: ROUTING_START_MARKER,
      endMarker: ROUTING_END_MARKER,
      replacementText: routingLines.join("\n")
    })
  );
}

function replacePurposePlaceholder({ agentsText, purposeText }) {
  const purposePattern = createMarkedBlockPattern({
    startMarker: PURPOSE_START_MARKER,
    endMarker: PURPOSE_END_MARKER
  });
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

  if (!purposeMatch[2].includes(PURPOSE_PLACEHOLDER_FRAGMENT)) {
    throw new VasirCliError({
      code: "AGENTS_PURPOSE_ALREADY_EDITED",
      message: "AGENTS.md already has a custom purpose block.",
      suggestion:
        "Review the printed draft and paste it manually if you still want to replace the current purpose paragraph.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  return agentsText.replace(purposePattern, () => `${purposeMatch[1] ?? ""}**Purpose:** ${purposeText}`);
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
  agentsScopePath = null,
  agentsSyncProfileName = null,
  replaceExistingAgentsFile = false,
  writeGeneratedOutput = false,
  dryRunRequested = false,
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
        "Use `vasir agents sync`, `vasir agents init <backend|frontend|ios|generic>`, `vasir agents draft-purpose`, `vasir agents draft-routing`, or `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!["sync", "init", "draft-purpose", "draft-routing", "validate"].includes(agentsSubcommand)) {
    throw new VasirCliError({
      code: "UNKNOWN_AGENTS_SUBCOMMAND",
      message: `Unknown AGENTS subcommand: ${agentsSubcommand}`,
      suggestion:
        "Use `vasir agents sync`, `vasir agents init <backend|frontend|ios|generic>`, `vasir agents draft-purpose`, `vasir agents draft-routing`, or `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (agentsSubcommand === "sync") {
    const positionalProfile = agentsArguments[1] ?? null;
    if (agentsArguments.length > 2) {
      throw new VasirCliError({
        code: "AGENTS_SYNC_TOO_MANY_ARGUMENTS",
        message: "`vasir agents sync` accepts flags for scope/profile, plus one legacy optional profile argument.",
        suggestion: "Use `vasir agents sync --scope frontend --profile frontend` for a nested app/package root, `--profile generic` for mixed repos, or omit `--profile` and let Vasir infer it.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (positionalProfile && agentsSyncProfileName) {
      throw new VasirCliError({
        code: "AGENTS_SYNC_PROFILE_CONFLICT",
        message: "`vasir agents sync` received both a positional profile and `--profile`.",
        suggestion: "Use `vasir agents sync --profile frontend`; the positional profile form is kept only for compatibility.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    const requestedProfile = agentsSyncProfileName ?? positionalProfile;

    if (replaceExistingAgentsFile) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--replace is not supported by `vasir agents sync`.",
        suggestion: "`vasir agents sync` already reconciles AGENTS.md without using an overwrite flag.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (writeGeneratedOutput) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--write is not supported by `vasir agents sync`.",
        suggestion: "`vasir agents sync` writes by default; use `--dry-run` to preview without writing.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    if (modelArguments.length > 0) {
      throw new VasirCliError({
        code: "INVALID_COMMAND_FLAG",
        message: "--model is not supported by `vasir agents sync`.",
        suggestion: "`vasir agents sync` uses deterministic local repo context instead of a model call.",
        docsRef: AGENTS_REFERENCE_DOCS_REF
      });
    }

    const catalogSource = readCatalogSourceRegistry({
      repositoryUrl
    });
    const projectPaths = buildProjectPaths({
      currentWorkingDirectory,
      projectRootDirectory
    });
    const scopeResolution = resolveAgentsScopeDirectory({
      baseProjectRootDirectory: projectPaths.projectRootDirectory,
      agentsScopePath
    });
    const agentsSync = synchronizeProjectAgentsFile({
      globalCatalogDirectory: catalogSource.sourceDirectory,
      projectRootDirectory: scopeResolution.targetProjectRootDirectory,
      profileName: requestedProfile,
      dryRun: dryRunRequested,
      persistProfileConfig: scopeResolution.agentsScope === null
    });

    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      const scopeLine = scopeResolution.agentsScope
        ? [ui.formatField("scope", scopeResolution.agentsScope)]
        : [];
      stdoutWriter(
        ui.renderPanel({
          title: "Agents Sync",
          lines: [
            ui.formatStatusLine({
              kind: agentsSync.changed ? dryRunRequested ? "info" : "ok" : "info",
              text: agentsSync.changed
                ? dryRunRequested ? "Would sync AGENTS.md + CLAUDE.md" : "Synced AGENTS.md + CLAUDE.md"
                : "AGENTS.md + CLAUDE.md already current"
            }),
            ui.formatField("agents", ui.formatPath(agentsSync.agentsFilePath)),
            ui.formatField("claude", ui.formatPath(agentsSync.claudeFilePath)),
            ...scopeLine,
            ui.formatField("profile", `${agentsSync.profile} (${agentsSync.profileSource})`),
            ui.formatField("purpose", agentsSync.purposeSource),
            ui.formatField("routing", `${agentsSync.routingLines.length} lane${agentsSync.routingLines.length === 1 ? "" : "s"} (${agentsSync.routingProfile})`),
            ui.formatField("non-obvious", agentsSync.nonobviousSource),
            ui.formatField("non-obvious source", ui.formatPath(agentsSync.nonobviousFilePath)),
            ui.formatField("validation", "passed")
          ]
        })
      );
    }

    return {
      subcommand: "sync",
      catalogSourceDirectory: catalogSource.sourceDirectory,
      baseProjectRootDirectory: projectPaths.projectRootDirectory,
      projectRootDirectory: scopeResolution.targetProjectRootDirectory,
      agentsScope: scopeResolution.agentsScope,
      ...agentsSync
    };
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
              text: `Wrote ${agentsInitialization.profile} AGENTS + CLAUDE starters`
            }),
            ui.formatField("agents", ui.formatPath(agentsInitialization.agentsFilePath)),
            ui.formatField("claude", ui.formatPath(agentsInitialization.claudeFilePath)),
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
      agentsFilePath: agentsInitialization.agentsFilePath,
      claudeFilePath: agentsInitialization.claudeFilePath
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
    const scopeResolution = resolveAgentsScopeDirectory({
      baseProjectRootDirectory: projectPaths.projectRootDirectory,
      agentsScopePath
    });
    const validation = validateProjectAgentsFile({
      projectRootDirectory: scopeResolution.targetProjectRootDirectory
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
    const scopeResolution = resolveAgentsScopeDirectory({
      baseProjectRootDirectory: projectPaths.projectRootDirectory,
      agentsScopePath
    });
    const validation = validateProjectAgentsFile({
      projectRootDirectory: scopeResolution.targetProjectRootDirectory
    });

    if (validation.issues.length > 0) {
      throw createAgentsValidationError({
        agentsFilePath: validation.agentsFilePath,
        issues: validation.issues
      });
    }

    if (!jsonOutput) {
      const ui = createCommandUi({ stream: outputStream });
      const scopeLine = scopeResolution.agentsScope
        ? [ui.formatField("scope", scopeResolution.agentsScope)]
        : [];
      stdoutWriter(
        ui.renderPanel({
          title: "Agents Validate",
          lines: [
            ui.formatStatusLine({
              kind: "ok",
              text: "AGENTS.md is free of known scaffold markers and broken repo routes"
            }),
            ...scopeLine,
            ui.formatField("path", ui.formatPath(validation.agentsFilePath))
          ]
        })
      );
    }

    return {
      subcommand: "validate",
      baseProjectRootDirectory: projectPaths.projectRootDirectory,
      projectRootDirectory: scopeResolution.targetProjectRootDirectory,
      agentsScope: scopeResolution.agentsScope,
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
  const repositoryContext = inspectRepositoryContext({
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
