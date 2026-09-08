import { VasirCliError } from "./cli-error.js";
import {
  BENCHMARK_PUBLISH_REFERENCE_DOCS_REF,
  BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF
} from "./docs-ref.js";
import { publishBenchmarkSite } from "./benchmark-publish.js";
import { findProjectRootDirectory } from "./path-layout.js";
import { createCommandUi } from "./ui/command-output.js";

const PROGRESS_LABELS = Object.freeze({
  "build-artifact": "Release artifact built",
  "assert-identity": "AWS production target confirmed",
  "converge-infrastructure": "Production infrastructure converged",
  "acquire-lease": "Exclusive publication lease acquired",
  "cleanup-releases": "Versioned storage is within budget",
  "stage-release": "Immutable release staged and checksummed",
  "activate-release": "Release pointer reached LIVE",
  "verify-publication": "Live release verified",
  "release-lease": "Publication lease released"
});

function writeProgressLine({ stdoutWriter, ui, progress }) {
  stdoutWriter(`${ui.formatStatusLine({
    kind: "ok",
    text: PROGRESS_LABELS[progress.id] ?? progress.id,
    detail: progress.id === "acquire-lease" ? "" : progress.detail ?? ""
  })}\n`);
}

function renderHumanResult({ result, outputStream }) {
  const ui = createCommandUi({ stream: outputStream });
  const lines = [
    ui.formatStatusLine({
      kind: result.dryRun ? "info" : "ok",
      text: result.dryRun ? "Production publication plan is valid" : "VasirBench is live",
      detail: result.target.url
    }),
    ui.formatField("release", result.artifact.releaseId),
    ui.formatField("artifact", `${ui.formatCount(result.artifact.fileCount)} files · ${ui.formatCount(result.artifact.totalBytes)} bytes`),
    ui.formatField(
      "projection",
      `${ui.formatCount(result.artifact.projection.benchmarkDefinitionCount)} benchmarks · ${ui.formatCount(result.artifact.projection.settingCount)} settings · ${ui.formatCount(result.artifact.projection.developmentResultSetCount)} development · ${ui.formatCount(result.artifact.projection.eligibleResultSetCount)} verified`
    ),
    ui.formatField("account", `${result.target.profile} · ${result.target.accountId} · ${result.target.region}`),
    ui.formatField("stack", result.target.stackName)
  ];

  if (result.dryRun) {
    lines.push(
      ui.formatField("active now", result.deployment.activeReleaseId ?? "No production stack yet"),
      ui.formatField(
        "next",
        "Run `vasir benchmark publish` to stage, activate, and verify this exact release."
      )
    );
  } else {
    lines.push(
      ui.formatField("distribution", result.deployment.distributionId),
      ui.formatField("origin", result.verification.originPrivate ? "Private · CloudFront OAC only" : "Unverified"),
      ui.formatField("verification", result.verification.mode === "full-audit" ? "Full asset and browser audit" : "Fast changed-file verification"),
      ui.formatField(
        "proof",
        `${result.verification.verifiedFiles} file byte checks · ${result.verification.reusedArtifactFiles ?? 0} unchanged assets reused`
      ),
      ui.formatField("browser", result.verification.browserAuditPerformed
        ? `${result.verification.verifiedCapabilityRoutes} benchmark routes · ${result.verification.verifiedReportRoutes} reports`
        : "Not requested; use --full-audit for browser regression checks")
    );
  }

  return ui.renderPanel({
    title: result.dryRun ? "VasirBench Publish Plan" : "VasirBench Published",
    lines,
    minWidth: 64,
    maxWidth: 110
  });
}

export async function runBenchmark({
  benchmarkArguments,
  dryRunRequested,
  fullAuditRequested = false,
  currentWorkingDirectory,
  projectRootDirectory,
  spawnSyncImplementation,
  stdoutWriter,
  jsonOutput,
  outputStream,
  environmentVariables,
  platform,
  fetchImplementation
}) {
  const subcommand = benchmarkArguments[0] ?? null;
  if (subcommand === null) {
    throw new VasirCliError({
      code: "BENCHMARK_PUBLISH_SUBCOMMAND_REQUIRED",
      message: "`vasir benchmark` requires the explicit `publish` subcommand.",
      suggestion: "Run `vasir benchmark publish --dry-run`, then `vasir benchmark publish`.",
      docsRef: BENCHMARK_PUBLISH_REFERENCE_DOCS_REF,
      context: {
        stage: "acceptance",
        releaseId: null,
        stackName: "vasirbenchmark-production",
        safeRetry: true,
        rollback: { status: "not-needed", releaseId: null }
      }
    });
  }
  if (subcommand !== "publish" || benchmarkArguments.length !== 1) {
    throw new VasirCliError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Unsupported benchmark command: ${benchmarkArguments.join(" ")}`,
      suggestion: "Use only `vasir benchmark publish [--dry-run] [--full-audit] [--json] [--repo-root <path>]`.",
      docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF,
      context: {
        stage: "acceptance",
        releaseId: null,
        stackName: "vasirbenchmark-production",
        safeRetry: false,
        rollback: { status: "not-needed", releaseId: null }
      }
    });
  }

  const ui = createCommandUi({ stream: outputStream });
  const result = await publishBenchmarkSite({
    repoRootDirectory: findProjectRootDirectory({ currentWorkingDirectory, projectRootDirectory }),
    dryRun: dryRunRequested,
    fullAudit: fullAuditRequested,
    spawnSyncImplementation,
    environmentVariables,
    platform,
    fetchImplementation,
    onProgress: jsonOutput
      ? () => {}
      : (progress) => writeProgressLine({ stdoutWriter, ui, progress })
  });

  if (!jsonOutput) stdoutWriter(renderHumanResult({ result, outputStream }));
  return result;
}
