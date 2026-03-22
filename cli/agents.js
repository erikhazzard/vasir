import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "./cli-error.js";
import { AGENTS_REFERENCE_DOCS_REF } from "./docs-ref.js";
import { readGlobalRegistry } from "./global-catalog.js";
import { buildProjectPaths } from "./path-layout.js";
import { createCommandUi } from "./ui/command-output.js";
import { resolveEvalEnvironmentVariables } from "./eval/keys-file.js";
import { resolveEvalModels } from "./eval/provider-config.js";
import { generateEvalResponse } from "./eval/providers.js";
import { canPromptInteractively, promptForMissingProviderCredential } from "./eval/interactive.js";

const PURPOSE_START_MARKER = "<!-- vasir:purpose:start -->";
const PURPOSE_END_MARKER = "<!-- vasir:purpose:end -->";
const PURPOSE_PLACEHOLDER_FRAGMENT = "Replace this block first.";
const LAST_UPDATED_PLACEHOLDER = "[YYYY-MM-DD - update alongside major architectural PRs]";
const DEFAULT_AGENTS_TEMPLATE = path.join("templates", "agents", "AGENTS.md");

const AGENTS_PROFILE_TEMPLATES = Object.freeze({
  backend: path.join("templates", "agents", "profiles", "backend.md"),
  frontend: path.join("templates", "agents", "profiles", "frontend.md"),
  ios: path.join("templates", "agents", "profiles", "ios.md")
});

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
    message: `AGENTS.md still contains scaffold placeholders. ${issueSummary}`,
    suggestion:
      "Edit the flagged lines or rerun `vasir agents init <profile> --replace`, then rerun `vasir agents validate`.",
    context: {
      agentsFilePath,
      issues
    },
    docsRef: AGENTS_REFERENCE_DOCS_REF
  });
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
  const issues = findAgentsValidationIssues(agentsText);

  return {
    agentsFilePath,
    issues
  };
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
      suggestion: "Use `vasir agents init <backend|frontend|ios>`, `vasir agents draft-purpose`, or `vasir agents validate`.",
      docsRef: AGENTS_REFERENCE_DOCS_REF
    });
  }

  if (!["init", "draft-purpose", "validate"].includes(agentsSubcommand)) {
    throw new VasirCliError({
      code: "UNKNOWN_AGENTS_SUBCOMMAND",
      message: `Unknown AGENTS subcommand: ${agentsSubcommand}`,
      suggestion: "Use `vasir agents init <backend|frontend|ios>`, `vasir agents draft-purpose`, or `vasir agents validate`.",
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
    const projectPaths = buildProjectPaths({ currentWorkingDirectory });
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
            ui.formatField("next", "vasir agents draft-purpose --write --model openai, then vasir agents validate")
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

    const projectPaths = buildProjectPaths({ currentWorkingDirectory });
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
              text: "AGENTS.md is free of known scaffold placeholders"
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

  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
  const validation = validateProjectAgentsFile({
    projectRootDirectory: projectPaths.projectRootDirectory
  });
  const agentsFilePath = validation.agentsFilePath;

  const agentsText = fs.readFileSync(agentsFilePath, "utf8");
  const modelResolution = await resolveDraftModel({
    requestedModelArguments: modelArguments,
    currentWorkingDirectory,
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
              ? "Run `vasir agents validate` after you finish replacing the remaining example lines"
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
