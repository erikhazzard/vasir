import path from "node:path";
import process from "node:process";

import { createCommandUi } from "../ui/command-output.js";
import { createFailedRowSummary, createMovementSummary } from "./analysis.js";
import { readEvalRunArtifacts } from "./history.js";

function toRelativeResultsPath({ currentWorkingDirectory, runDirectoryPath }) {
  const relativePath = path.relative(currentWorkingDirectory, runDirectoryPath);
  return relativePath.length > 0 && !relativePath.startsWith("..")
    ? relativePath
    : runDirectoryPath;
}

function createExcerpt(text, maxLength = 120) {
  const singleLineText = String(text ?? "").trim().replace(/\s+/g, " ");
  if (singleLineText.length === 0) {
    return "(empty)";
  }

  if (singleLineText.length <= maxLength) {
    return singleLineText;
  }

  return `${singleLineText.slice(0, maxLength - 1).trimEnd()}…`;
}

function createMovementEntries(rows) {
  const movementSummary = createMovementSummary(rows);
  return [
    ...movementSummary.regressions,
    ...movementSummary.improvements
  ];
}

export function inspectSkillEval({
  skillName,
  runId = null,
  currentWorkingDirectory = process.cwd(),
  outputStream = process.stdout,
  stdoutWriter,
  jsonOutput
}) {
  const { runDirectoryPath, run } = readEvalRunArtifacts({
    currentWorkingDirectory,
    skillName,
    runId
  });
  const movementEntries = createMovementEntries(run.rows);
  const failureEntries = createFailedRowSummary(run.rows);

  if (!jsonOutput) {
    const ui = createCommandUi({ stream: outputStream });
    const labelWidth = 14;
    const renderedLines = [
      ui.formatField("skill", ui.colors.bold(skillName), { labelWidth }),
      ui.formatField("run", run.runId, { labelWidth }),
      ui.formatField("hash", ui.colors.muted(run.skillHash.slice(0, 12)), { labelWidth }),
      ui.formatField("status", ui.formatOutcome(run.runStatus), { labelWidth }),
      ui.formatField("suite", run.suiteId, { labelWidth }),
      ui.formatField("trials", String(run.trialCount ?? 1), { labelWidth }),
      ui.formatField(
        "artifacts",
        ui.formatPath(toRelativeResultsPath({
          currentWorkingDirectory,
          runDirectoryPath
        })),
        { labelWidth }
      ),
      ui.formatField("tokens", `${ui.formatCount(run.summary?.usage?.total?.totalTokens ?? 0)} total`, { labelWidth }),
      ui.formatField(
        "judge toks",
        `${ui.formatCount(run.summary?.usage?.judges?.totalTokens ?? 0)} total`,
        { labelWidth }
      ),
      ui.formatField(
        "self-judge",
        `${ui.formatCount(run.summary?.judge?.selfJudgedPairCount ?? 0)} pairs / ${ui.formatCount(run.summary?.judge?.selfJudgedVoteCount ?? 0)} votes`,
        { labelWidth }
      ),
      "",
      ui.colors.header("Bottom Line"),
      ui.formatField("result", run.bottomLine?.overallVerdict ?? "NO SIGNAL", { labelWidth }),
      ui.formatField("source", run.bottomLine?.evidenceSource ?? "n/a", { labelWidth }),
      ui.formatField("so what", run.bottomLine?.soWhat ?? "n/a", { labelWidth }),
      "",
      ui.colors.header("Pair Breakdown")
    ];

    if (movementEntries.length === 0) {
      renderedLines.push(ui.formatBullet("No pair changed. Baseline and treatment tied on every comparable pair."));
    } else {
      for (const movement of movementEntries.slice(0, 8)) {
        renderedLines.push(ui.formatBullet(`${movement.modelId} / ${movement.caseId} / trial ${movement.trialNumber}`));
        renderedLines.push(
          ui.formatField(
            "result",
            movement.outcome?.toUpperCase() ?? "NO CHANGE",
            { labelWidth }
          )
        );
        renderedLines.push(
          ui.formatField(
            "why",
            [...movement.regressionReasons, ...movement.improvementReasons].join(" | ") || "measured checks tied",
            { labelWidth }
          )
        );
        renderedLines.push(ui.formatField("baseline txt", createExcerpt(movement.baselineRow?.outputText), { labelWidth }));
        renderedLines.push(ui.formatField("treat txt", createExcerpt(movement.treatmentRow?.outputText), { labelWidth }));

        const pairJudgment = movement.treatmentRow?.pairJudgment ?? movement.baselineRow?.pairJudgment ?? null;
        if (pairJudgment?.judges) {
          for (const [judgeModelId, judgeResult] of Object.entries(pairJudgment.judges)) {
            const verdict = judgeResult?.status === "scored"
              ? `${judgeResult.winner}${judgeResult.selfJudged ? " (self)" : ""}`
              : `error${judgeResult?.selfJudged ? " (self)" : ""}`;
            renderedLines.push(
              ui.formatField(
                judgeModelId,
                judgeResult?.status === "scored"
                  ? `${verdict} ${judgeResult.summaryReason || ""}`.trim()
                  : `${verdict} ${judgeResult?.message ?? ""}`.trim(),
                { labelWidth }
              )
            );
          }
        }
      }
    }

    if (failureEntries.length > 0) {
      renderedLines.push("");
      renderedLines.push(ui.colors.header("Failures"));
      for (const failureEntry of failureEntries.slice(0, 8)) {
        renderedLines.push(
          ui.formatBullet(
            `${failureEntry.modelId} / ${failureEntry.caseId} / trial ${failureEntry.trialNumber} / ${failureEntry.conditionId} ${failureEntry.code}`
          )
        );
        renderedLines.push(ui.formatField("error", failureEntry.message, { labelWidth }));
      }
    }

    stdoutWriter(
      ui.renderPanel({
        title: `Inspect Eval ${skillName}`,
        lines: renderedLines
      })
    );
  }

  return {
    subcommand: "inspect",
    skillName,
    runId: run.runId,
    outputDirectory: runDirectoryPath,
    summary: run,
    rows: run.rows,
    pairs: run.pairs ?? [],
    movementEntries,
    failureEntries
  };
}
