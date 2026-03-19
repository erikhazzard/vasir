import fs from "node:fs";
import path from "node:path";

import { buildProjectPaths } from "../install/path-layout.js";

function listSummaryFilePaths(skillHistoryDirectoryPath) {
  if (!fs.existsSync(skillHistoryDirectoryPath)) {
    return [];
  }

  const summaryFilePaths = [];
  for (const directoryEntry of fs.readdirSync(skillHistoryDirectoryPath, { withFileTypes: true })) {
    if (!directoryEntry.isDirectory()) {
      continue;
    }

    const summaryFilePath = path.join(skillHistoryDirectoryPath, directoryEntry.name, "summary.json");
    if (fs.existsSync(summaryFilePath)) {
      summaryFilePaths.push(summaryFilePath);
    }
  }

  return summaryFilePaths.sort();
}

function readSummaryFile(summaryFilePath) {
  return JSON.parse(fs.readFileSync(summaryFilePath, "utf8"));
}

function listSkillHistorySummaries({ currentWorkingDirectory, skillName }) {
  const skillHistoryDirectoryPath = path.join(
    getEvalHistoryRootDirectory({ currentWorkingDirectory }),
    skillName
  );
  return listSummaryFilePaths(skillHistoryDirectoryPath).map(readSummaryFile);
}

export function getEvalHistoryRootDirectory({ currentWorkingDirectory }) {
  const projectPaths = buildProjectPaths({ currentWorkingDirectory });
  return path.join(projectPaths.agentsDirectory, "vasir-evals");
}

export function buildRunDirectoryPath({
  currentWorkingDirectory,
  skillName,
  runId
}) {
  return path.join(getEvalHistoryRootDirectory({ currentWorkingDirectory }), skillName, runId);
}

export function readPreviousRunSummary({
  currentWorkingDirectory,
  skillName
}) {
  const summaries = listSkillHistorySummaries({
    currentWorkingDirectory,
    skillName
  });
  if (summaries.length === 0) {
    return null;
  }

  return summaries.at(-1);
}

export function readPreviousVersionSummary({
  currentWorkingDirectory,
  skillName,
  currentSkillHash
}) {
  const summaries = listSkillHistorySummaries({
    currentWorkingDirectory,
    skillName
  });

  for (let summaryIndex = summaries.length - 1; summaryIndex >= 0; summaryIndex -= 1) {
    const summary = summaries[summaryIndex];
    if (summary?.skillHash && summary.skillHash !== currentSkillHash) {
      return summary;
    }
  }

  return null;
}

export function writeEvalRunArtifacts({
  currentWorkingDirectory,
  skillName,
  runId,
  summaryPayload,
  rowsPayload
}) {
  const runDirectoryPath = buildRunDirectoryPath({
    currentWorkingDirectory,
    skillName,
    runId
  });
  fs.mkdirSync(runDirectoryPath, { recursive: true });
  fs.writeFileSync(path.join(runDirectoryPath, "summary.json"), `${JSON.stringify(summaryPayload, null, 2)}\n`);
  fs.writeFileSync(path.join(runDirectoryPath, "rows.json"), `${JSON.stringify(rowsPayload, null, 2)}\n`);
  return runDirectoryPath;
}
