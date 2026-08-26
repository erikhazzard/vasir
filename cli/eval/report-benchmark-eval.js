import path from "node:path";
import process from "node:process";

import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF } from "../docs-ref.js";
import { createCommandUi } from "../ui/command-output.js";
import { writeBenchmarkCatalog } from "./benchmark-catalog.js";
import { writeBenchmarkReport } from "./benchmark-report.js";
import { getEvalHistoryRootDirectory, readEvalRunArtifacts } from "./history.js";

function openLocalReport({ reportFilePath, platform, spawnSyncImplementation }) {
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const commandArguments = platform === "win32" ? ["/c", "start", "", reportFilePath] : [reportFilePath];
  const result = spawnSyncImplementation(command, commandArguments, { stdio: "ignore" });
  return result?.status === 0;
}

export function reportBenchmarkEval({
  benchmarkName,
  runId = null,
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null,
  platform = process.platform,
  spawnSyncImplementation,
  openReport = false,
  stdoutWriter = (message) => process.stdout.write(message),
  jsonOutput = false
}) {
  const artifacts = readEvalRunArtifacts({
    currentWorkingDirectory,
    projectRootDirectory,
    skillName: benchmarkName,
    runId
  });
  if (artifacts.run.kind !== "benchmark") {
    throw new VasirCliError({
      code: "EVAL_REPORT_NOT_BENCHMARK",
      message: `Recorded eval ${artifacts.run.runId} is not an independent benchmark run.`,
      suggestion: "Use `vasir eval inspect` for legacy skill-owned eval artifacts.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const reportFilePath = path.join(artifacts.runDirectoryPath, "report.html");
  writeBenchmarkReport({ run: artifacts.run, outputFilePath: reportFilePath });
  const catalogFilePath = writeBenchmarkCatalog({
    historyRootDirectory: getEvalHistoryRootDirectory({
      currentWorkingDirectory,
      projectRootDirectory
    })
  });
  const reportOpened = openReport
    ? openLocalReport({ reportFilePath, platform, spawnSyncImplementation })
    : false;

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: process.stdout });
    stdoutWriter(
      ui.renderPanel({
        title: `Benchmark report ${benchmarkName}`,
        lines: [
          ui.formatField("run", artifacts.run.runId),
          ui.formatField("report", reportFilePath),
          ui.formatField("all prompts", catalogFilePath),
          ...(openReport ? [ui.formatField("opened", reportOpened ? "yes" : "no")] : [])
        ]
      })
    );
  }

  return {
    subcommand: "report",
    benchmarkName,
    runId: artifacts.run.runId,
    reportFilePath,
    catalogFilePath,
    reportOpened
  };
}
