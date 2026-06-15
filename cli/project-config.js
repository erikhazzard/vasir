import fs from "node:fs";
import path from "node:path";

import { VasirCliError } from "./cli-error.js";
import { COMMANDS_REFERENCE_DOCS_REF } from "./docs-ref.js";

const PROJECT_CONFIG_SCHEMA_VERSION = 1;
const SUPPORTED_AGENTS_PROFILE_NAMES = new Set(["backend", "frontend", "ios", "generic"]);

export function createEmptyProjectConfig() {
  return {
    schemaVersion: PROJECT_CONFIG_SCHEMA_VERSION,
    tracking: null,
    agents: null
  };
}

function normalizeTrackingPolicy(rawTrackingPolicy) {
  if (rawTrackingPolicy === null || rawTrackingPolicy === undefined) {
    return null;
  }

  if (typeof rawTrackingPolicy !== "object" || Array.isArray(rawTrackingPolicy)) {
    throw new Error("Unexpected tracking policy shape.");
  }

  if (rawTrackingPolicy.mode === "all") {
    return {
      mode: "all",
      skillNames: []
    };
  }

  if (rawTrackingPolicy.mode === "selected") {
    if (!Array.isArray(rawTrackingPolicy.skillNames)) {
      throw new Error("Unexpected selected skillNames shape.");
    }

    const normalizedSkillNames = [...new Set(rawTrackingPolicy.skillNames)]
      .filter((skillName) => typeof skillName === "string" && skillName.length > 0)
      .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName));

    return {
      mode: "selected",
      skillNames: normalizedSkillNames
    };
  }

  throw new Error("Unexpected tracking policy mode.");
}

function normalizeAgentsPolicy(rawAgentsPolicy) {
  if (rawAgentsPolicy === null || rawAgentsPolicy === undefined) {
    return null;
  }

  if (typeof rawAgentsPolicy !== "object" || Array.isArray(rawAgentsPolicy)) {
    throw new Error("Unexpected agents policy shape.");
  }

  if (rawAgentsPolicy.profile === null || rawAgentsPolicy.profile === undefined || rawAgentsPolicy.profile === "") {
    return null;
  }

  if (typeof rawAgentsPolicy.profile !== "string") {
    throw new Error("Unexpected agents profile shape.");
  }

  const normalizedProfile = rawAgentsPolicy.profile.toLowerCase();
  if (!SUPPORTED_AGENTS_PROFILE_NAMES.has(normalizedProfile)) {
    throw new Error("Unexpected agents profile value.");
  }

  return {
    profile: normalizedProfile
  };
}

function normalizeProjectConfig(parsedProjectConfig) {
  if (
    !parsedProjectConfig ||
    typeof parsedProjectConfig !== "object" ||
    Array.isArray(parsedProjectConfig)
  ) {
    throw new Error("Unexpected repo config shape.");
  }

  if (parsedProjectConfig.schemaVersion !== PROJECT_CONFIG_SCHEMA_VERSION) {
    throw new Error("Unexpected repo config schema version.");
  }

  return {
    schemaVersion: PROJECT_CONFIG_SCHEMA_VERSION,
    tracking: normalizeTrackingPolicy(parsedProjectConfig.tracking),
    agents: normalizeAgentsPolicy(parsedProjectConfig.agents)
  };
}

export function getProjectConfigFilePath(projectPaths) {
  return path.join(projectPaths.agentsDirectory, "vasir.json");
}

export function readProjectConfig({ projectPaths }) {
  const projectConfigFilePath = getProjectConfigFilePath(projectPaths);
  if (!fs.existsSync(projectConfigFilePath)) {
    return null;
  }

  try {
    return normalizeProjectConfig(
      JSON.parse(fs.readFileSync(projectConfigFilePath, "utf8"))
    );
  } catch (error) {
    throw new VasirCliError({
      code: "INVALID_PROJECT_CONFIG",
      message: `Project repo config is invalid at ${projectConfigFilePath}.`,
      suggestion: "Repair `.agents/vasir.json`, or rerun `vasir adopt` to rebuild the repo config from the current skill tree.",
      docsRef: COMMANDS_REFERENCE_DOCS_REF,
      cause: error
    });
  }
}

export function writeProjectConfig({ projectPaths, projectConfig }) {
  fs.mkdirSync(projectPaths.agentsDirectory, { recursive: true });
  fs.writeFileSync(
    getProjectConfigFilePath(projectPaths),
    `${JSON.stringify(projectConfig, null, 2)}\n`
  );
}

export function createTrackingProjectConfig({
  trackingMode,
  selectedSkillNames = [],
  existingProjectConfig = null,
  agentsProfileName
}) {
  if (trackingMode !== "all" && trackingMode !== "selected") {
    throw new Error(`Unsupported tracking mode: ${trackingMode}`);
  }

  const agentsPolicy = agentsProfileName === undefined
    ? existingProjectConfig?.agents ?? null
    : normalizeAgentsPolicy({ profile: agentsProfileName });

  return {
    schemaVersion: PROJECT_CONFIG_SCHEMA_VERSION,
    tracking:
      trackingMode === "all"
        ? {
            mode: "all",
            skillNames: []
          }
        : {
            mode: "selected",
            skillNames: [...new Set(selectedSkillNames)]
              .sort((leftSkillName, rightSkillName) => leftSkillName.localeCompare(rightSkillName))
          },
    agents: agentsPolicy
  };
}

export function createProjectConfigWithAgentsProfile({
  projectConfig = null,
  agentsProfileName
}) {
  const normalizedProjectConfig = projectConfig ?? createEmptyProjectConfig();

  return {
    schemaVersion: PROJECT_CONFIG_SCHEMA_VERSION,
    tracking: normalizedProjectConfig.tracking ?? null,
    agents: normalizeAgentsPolicy({ profile: agentsProfileName })
  };
}
