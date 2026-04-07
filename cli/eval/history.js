import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";
import { buildProjectPaths } from "../path-layout.js";

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new VasirCliError({
      code: "EVAL_RUN_INVALID",
      message: `Eval run artifact is invalid at ${filePath}.`,
      suggestion: "Repair or delete the broken eval artifact, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF,
      cause: error
    });
  }
}

function writeJsonFileAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryFilePath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.renameSync(temporaryFilePath, filePath);
}

function normalizeRunPayload(payload, { runFilePath, skillName }) {
  if (!payload || typeof payload !== "object") {
    throw new VasirCliError({
      code: "EVAL_RUN_INVALID",
      message: `Eval run artifact is invalid at ${runFilePath}.`,
      suggestion: "Repair or delete the broken eval artifact, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (typeof payload.runId !== "string" || payload.runId.trim().length === 0) {
    throw new VasirCliError({
      code: "EVAL_RUN_INVALID",
      message: `Eval run artifact is missing runId at ${runFilePath}.`,
      suggestion: "Repair or delete the broken eval artifact, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  if (!payload.summary || typeof payload.summary !== "object" || !Array.isArray(payload.rows)) {
    throw new VasirCliError({
      code: "EVAL_RUN_INVALID",
      message: `Eval run artifact is missing summary or rows at ${runFilePath}.`,
      suggestion: "Repair or delete the broken eval artifact, then rerun the eval.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  return {
    ...payload,
    skillName: payload.skillName ?? skillName,
    judgeModels: Array.isArray(payload.judgeModels) ? payload.judgeModels : [],
    pairs: Array.isArray(payload.pairs) ? payload.pairs : []
  };
}

function readRunPayload(runFilePath, { skillName }) {
  return normalizeRunPayload(readJsonFile(runFilePath), {
    runFilePath,
    skillName
  });
}

function listRunFilePaths(skillHistoryDirectoryPath) {
  if (!fs.existsSync(skillHistoryDirectoryPath)) {
    return [];
  }

  return fs.readdirSync(skillHistoryDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillHistoryDirectoryPath, entry.name, "run.json"))
    .filter((runFilePath) => fs.existsSync(runFilePath))
    .sort();
}

export function getEvalHistoryRootDirectory({ currentWorkingDirectory, projectRootDirectory = null }) {
  const projectPaths = buildProjectPaths({
    currentWorkingDirectory,
    projectRootDirectory
  });
  return path.join(projectPaths.agentsDirectory, "vasir-evals");
}

export function buildRunDirectoryPath({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName,
  runId
}) {
  return path.join(
    getEvalHistoryRootDirectory({
      currentWorkingDirectory,
      projectRootDirectory
    }),
    skillName,
    runId
  );
}

export function listSkillHistorySummaries({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName
}) {
  const skillHistoryDirectoryPath = path.join(
    getEvalHistoryRootDirectory({
      currentWorkingDirectory,
      projectRootDirectory
    }),
    skillName
  );

  const runs = [];
  for (const runFilePath of listRunFilePaths(skillHistoryDirectoryPath)) {
    try {
      runs.push(readRunPayload(runFilePath, { skillName }));
    } catch (error) {
      if (error?.code === "EVAL_RUN_INVALID") {
        continue;
      }

      throw error;
    }
  }

  return runs;
}

export function readPreviousRunSummary({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName
}) {
  const runs = listSkillHistorySummaries({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName
  });
  return runs.length === 0 ? null : runs.at(-1);
}

export function readPreviousVersionSummary({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName,
  currentSkillHash
}) {
  const runs = listSkillHistorySummaries({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName
  });

  for (let runIndex = runs.length - 1; runIndex >= 0; runIndex -= 1) {
    const run = runs[runIndex];
    if (run?.skillHash && run.skillHash !== currentSkillHash) {
      return run;
    }
  }

  return null;
}

export function writeEvalRunArtifacts({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName,
  runId,
  runPayload
}) {
  const normalizedRunPayload = normalizeRunPayload(runPayload, {
    runFilePath: path.join(
      buildRunDirectoryPath({
        currentWorkingDirectory,
        projectRootDirectory,
        skillName,
        runId: runPayload?.runId ?? runId
      }),
      "run.json"
    ),
    skillName
  });
  const runDirectoryPath = buildRunDirectoryPath({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName,
    runId: normalizedRunPayload.runId
  });

  fs.mkdirSync(runDirectoryPath, { recursive: true });
  writeJsonFileAtomic(path.join(runDirectoryPath, "run.json"), normalizedRunPayload);

  return runDirectoryPath;
}

export function readEvalRunArtifacts({
  currentWorkingDirectory,
  projectRootDirectory = null,
  skillName,
  runId = null
}) {
  const runs = listSkillHistorySummaries({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName
  });
  const resolvedRunId = runId ?? runs.at(-1)?.runId ?? null;

  if (!resolvedRunId) {
    throw new VasirCliError({
      code: "EVAL_RUN_NOT_FOUND",
      message: `No eval runs were found for ${skillName}.`,
      suggestion: "Run `vasir eval run <skill>` first, then inspect or rescore that recorded run.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const runDirectoryPath = buildRunDirectoryPath({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName,
    runId: resolvedRunId
  });
  const runFilePath = path.join(runDirectoryPath, "run.json");

  if (!fs.existsSync(runFilePath)) {
    throw new VasirCliError({
      code: "EVAL_RUN_NOT_FOUND",
      message: `Eval run not found for ${skillName}: ${resolvedRunId}`,
      suggestion:
        "Use a valid recorded run id under `.agents/vasir-evals/<skill>/`, or rerun the eval to create a fresh artifact.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  return {
    runDirectoryPath,
    runFilePath,
    run: readRunPayload(runFilePath, { skillName })
  };
}
