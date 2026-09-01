import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { buildBenchmarkPublicationArtifact } from "./benchmark-publication-artifact.js";
import { VasirCliError } from "./cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";

const LOCK_KEY = "_deploy/control/publish-lock.json";
const PUBLICATION_STATE_KEY = "_deploy/control/publication-state.json";
const MANIFEST_PREFIX = "_deploy/manifests/";
const RELEASE_PREFIX = "releases/";
const BOOTSTRAP_RELEASE_ID = "bootstrap";
const DEFAULT_COMMAND_BUFFER_BYTES = 64 * 1024 * 1024;
const INITIAL_STACK_TIMEOUT_MS = 60 * 60 * 1000;
const UPDATE_STACK_TIMEOUT_MS = 30 * 60 * 1000;
const FUNCTION_LIVE_TIMEOUT_MS = 5 * 60 * 1000;
const HTTP_VERIFICATION_TIMEOUT_MS = 2 * 60 * 1000;
const BROWSER_VERIFICATION_TIMEOUT_MS = 5 * 60 * 1000;
const HTTP_ATTEMPTS = 8;
const HTTP_REQUEST_TIMEOUT_MS = 15 * 1000;
const ACTION_DEFINITIONS = Object.freeze([
  { id: "validate-acceptance", stage: "acceptance", mutatesAws: false },
  { id: "build-artifact", stage: "artifact", mutatesAws: false },
  { id: "assert-identity", stage: "identity", mutatesAws: false },
  { id: "converge-infrastructure", stage: "infrastructure", mutatesAws: true },
  { id: "acquire-lease", stage: "lease", mutatesAws: true },
  { id: "cleanup-releases", stage: "cleanup", mutatesAws: true },
  { id: "stage-release", stage: "upload", mutatesAws: true },
  { id: "activate-release", stage: "activation", mutatesAws: true },
  { id: "verify-publication", stage: "verification", mutatesAws: false },
  { id: "release-lease", stage: "lease", mutatesAws: true }
]);
const ACCEPTABLE_STACK_STATUSES = new Set([
  "CREATE_COMPLETE",
  "UPDATE_COMPLETE",
  "UPDATE_ROLLBACK_COMPLETE"
]);
const IN_PROGRESS_STACK_STATUS_PATTERN = /_(?:IN_PROGRESS|CLEANUP_IN_PROGRESS)$/;
const UNSAFE_STACK_STATUSES = new Set([
  "UPDATE_ROLLBACK_FAILED",
  "ROLLBACK_FAILED",
  "DELETE_FAILED",
  "CREATE_FAILED",
  "UPDATE_FAILED"
]);

class AwsCommandFailure extends Error {
  constructor({ args, result }) {
    const diagnostic = String(result?.stderr || result?.stdout || result?.error?.message || "AWS command failed").trim();
    super(diagnostic);
    this.name = "AwsCommandFailure";
    this.args = args;
    this.status = result?.status ?? null;
    this.stderr = String(result?.stderr || "");
    this.stdout = String(result?.stdout || "");
    this.cause = result?.error;
  }
}

function releaseContext({ config, releaseId = null, stage, rollback = null, safeRetry = true, ...context }) {
  return {
    stage,
    releaseId,
    stackName: config?.target?.stackName ?? null,
    safeRetry,
    rollback: rollback ?? { status: "not-needed", releaseId: null },
    ...context
  };
}

function publishError({ code, message, suggestion, config, releaseId = null, stage, rollback, safeRetry = true, context = {}, cause }) {
  return new VasirCliError({
    code,
    message,
    suggestion,
    docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF,
    context: releaseContext({
      config,
      releaseId,
      stage,
      rollback,
      safeRetry,
      ...context
    }),
    cause
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isMissingAwsResource(error) {
  return error instanceof AwsCommandFailure && /(?:does not exist|not found|NoSuchKey|404|NoSuchBucket)/i.test(error.message);
}

function isPreconditionFailure(error) {
  return error instanceof AwsCommandFailure && /(?:PreconditionFailed|precondition|412)/i.test(error.message);
}

function stripEtagQuotes(etag) {
  return String(etag ?? "").replace(/^"|"$/g, "");
}

function createActionLedger({ dryRun }) {
  return ACTION_DEFINITIONS.map((action) => ({
    ...action,
    status: dryRun ? "planned" : "skipped"
  }));
}

function markAction(actions, id, status = "completed") {
  const action = actions.find((candidate) => candidate.id === id);
  if (action) action.status = status;
}

function outputMap(stack) {
  return Object.fromEntries((stack?.Outputs ?? []).map((output) => [output.OutputKey, output.OutputValue]));
}

function parameterMap(stack) {
  return Object.fromEntries((stack?.Parameters ?? []).map((parameter) => [parameter.ParameterKey, parameter.ParameterValue]));
}

function cloudFrontFunctionName(functionIdentifier) {
  const value = String(functionIdentifier ?? "");
  return value.includes("/") ? value.slice(value.lastIndexOf("/") + 1) : value;
}

function serializeFileForResult(file) {
  return {
    path: file.path,
    bytes: file.bytes,
    sha256: file.sha256
  };
}

function buildTargetResult(config) {
  return {
    url: config.target.url,
    domain: config.target.domain,
    profile: config.target.profile,
    accountId: config.target.accountId,
    region: config.target.region,
    stackName: config.target.stackName
  };
}

function createResult({ artifact, stack, dryRun, actions, previousVerifiedReleaseId, activeReleaseId, verification, rollback }) {
  const outputs = outputMap(stack);
  return {
    subcommand: "publish",
    schemaVersion: 1,
    dryRun,
    target: buildTargetResult(artifact.config),
    artifact: {
      releaseId: artifact.releaseId,
      fileCount: artifact.fileCount,
      totalBytes: artifact.totalBytes,
      compressedLandingBytes: artifact.compressedLandingBytes,
      files: artifact.files.map(serializeFileForResult),
      routes: artifact.routes
    },
    deployment: {
      previousVerifiedReleaseId: previousVerifiedReleaseId ?? null,
      activeReleaseId: activeReleaseId ?? null,
      bucketName: outputs.BucketName ?? null,
      distributionId: outputs.DistributionId ?? null,
      functionName: outputs.ReleaseRouterFunctionName
        ? cloudFrontFunctionName(outputs.ReleaseRouterFunctionName)
        : null,
      rollback: rollback ?? { status: "not-needed", releaseId: null }
    },
    verification,
    actions
  };
}

function createAwsRunner({ config, spawnSyncImplementation }) {
  const globalArguments = [
    "--profile", config.target.profile,
    "--region", config.target.region,
    "--no-cli-pager",
    "--output", "json"
  ];

  const runRaw = (args, { timeout = UPDATE_STACK_TIMEOUT_MS, allowFailure = false, outputPath = null } = {}) => {
    const completeArgs = outputPath === null
      ? [...args, ...globalArguments]
      : [...args, ...globalArguments, outputPath];
    const result = spawnSyncImplementation("aws", completeArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      maxBuffer: DEFAULT_COMMAND_BUFFER_BYTES
    });
    if (result?.error || result?.status !== 0) {
      const failure = new AwsCommandFailure({ args: completeArgs, result });
      if (allowFailure) return { ok: false, failure, result };
      throw failure;
    }
    return { ok: true, stdout: String(result.stdout || ""), result };
  };

  const runJson = (args, options = {}) => {
    const response = runRaw(args, options);
    if (!response.ok) return response;
    const trimmed = response.stdout.trim();
    if (trimmed === "") return {};
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new AwsCommandFailure({
        args,
        result: { status: 1, stderr: `AWS CLI returned invalid JSON: ${error.message}` }
      });
    }
  };

  return { runRaw, runJson };
}

function resolveChromeBinary({ environmentVariables, platform, spawnSyncImplementation }) {
  const explicitBinary = environmentVariables.CHROME_BIN;
  const candidates = explicitBinary
    ? [explicitBinary]
    : platform === "darwin"
      ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : platform === "win32"
        ? [
            path.join(environmentVariables.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
            path.join(environmentVariables["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe")
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
    if (!path.isAbsolute(candidate)) {
      const result = spawnSyncImplementation(candidate, ["--version"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000
      });
      if (!result?.error && result?.status === 0) return candidate;
    }
  }
  return null;
}

function assertLocalTools({ artifact, spawnSyncImplementation, environmentVariables, platform }) {
  const awsVersion = spawnSyncImplementation("aws", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5000
  });
  if (awsVersion?.error || awsVersion?.status !== 0) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_TOOL_MISSING",
      message: "AWS CLI v2 is required for VasirBench publication.",
      suggestion: "Install AWS CLI v2, configure the `faedark` profile, then rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "identity",
      context: { tool: "aws" }
    });
  }
  const chromeBinary = resolveChromeBinary({ environmentVariables, platform, spawnSyncImplementation });
  if (!chromeBinary) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_TOOL_MISSING",
      message: "A Chromium-compatible browser is required for terminal publication proof.",
      suggestion: "Install Google Chrome or set CHROME_BIN to a compatible executable, then retry.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "verification",
      context: { tool: "chrome" }
    });
  }
  if (typeof globalThis.WebSocket !== "function") {
    throw publishError({
      code: "BENCHMARK_PUBLISH_TOOL_MISSING",
      message: "This Node runtime does not expose the WebSocket API required by the Chrome proof harness.",
      suggestion: "Run the source-repository publisher with Node 22 or newer.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "verification",
      context: { tool: "node-websocket", nodeVersion: process.version }
    });
  }
  return { chromeBinary };
}

function assertAwsIdentityAndZone({ artifact, aws }) {
  let identity;
  try {
    identity = aws.runJson(["sts", "get-caller-identity"]);
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_ACCOUNT_MISMATCH",
      message: "Could not resolve the AWS caller for profile faedark.",
      suggestion: "Repair or refresh the `faedark` AWS credentials, then rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "identity",
      context: { expectedAccountId: artifact.config.target.accountId, actualAccountId: null },
      cause: error
    });
  }
  if (identity.Account !== artifact.config.target.accountId) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_ACCOUNT_MISMATCH",
      message: `AWS profile faedark resolves to account ${identity.Account ?? "unknown"}, not the pinned production account.`,
      suggestion: "Select credentials for account 339713108333 and rerun; the production target cannot be overridden.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "identity",
      safeRetry: false,
      context: {
        expectedAccountId: artifact.config.target.accountId,
        actualAccountId: identity.Account ?? null
      }
    });
  }

  let hostedZone;
  try {
    hostedZone = aws.runJson(["route53", "get-hosted-zone", "--id", artifact.config.target.hostedZoneId]);
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The pinned Route 53 hosted zone could not be read from the production account.",
      suggestion: "Restore access to the declared vasirbenchmark.com hosted zone before retrying.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "identity",
      context: { hostedZoneId: artifact.config.target.hostedZoneId },
      cause: error
    });
  }
  const hostedZoneName = String(hostedZone.HostedZone?.Name ?? "").replace(/\.$/, "");
  if (hostedZoneName !== artifact.config.target.domain) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Pinned hosted zone resolves to ${hostedZoneName || "unknown"}, not ${artifact.config.target.domain}.`,
      suggestion: "Repair deployment.json rather than overriding the production domain at the command line.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "identity",
      safeRetry: false,
      context: { hostedZoneId: artifact.config.target.hostedZoneId, hostedZoneName }
    });
  }
  try {
    aws.runJson(["cloudformation", "validate-template", "--template-body", `file://${artifact.templatePath}`]);
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
      message: "The checked-in production CloudFormation template did not validate.",
      suggestion: "Repair and locally validate production.yml, then rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "infrastructure",
      context: { templatePath: artifact.templatePath },
      cause: error
    });
  }
  return identity;
}

function inspectStack({ artifact, aws }) {
  try {
    const response = aws.runJson([
      "cloudformation", "describe-stacks",
      "--stack-name", artifact.config.target.stackName
    ]);
    return response.Stacks?.[0] ?? null;
  } catch (error) {
    if (isMissingAwsResource(error)) return null;
    throw publishError({
      code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
      message: "Could not inspect the production CloudFormation stack.",
      suggestion: "Inspect the stack status and AWS access, then rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "infrastructure",
      cause: error
    });
  }
}

function deployArguments({ artifact, activeReleaseId }) {
  const tagArguments = Object.entries(artifact.config.tags ?? {}).map(([key, value]) => `${key}=${value}`);
  return [
    "cloudformation", "deploy",
    "--template-file", artifact.templatePath,
    "--stack-name", artifact.config.target.stackName,
    "--no-fail-on-empty-changeset",
    "--parameter-overrides",
    `DomainName=${artifact.config.target.domain}`,
    `HostedZoneId=${artifact.config.target.hostedZoneId}`,
    `BucketName=${artifact.config.target.bucketName}`,
    `ActiveReleaseId=${activeReleaseId}`,
    ...(tagArguments.length > 0 ? ["--tags", ...tagArguments] : [])
  ];
}

function deployStack({ artifact, aws, activeReleaseId, initial = false, allowFailure = false }) {
  return aws.runRaw(deployArguments({ artifact, activeReleaseId }), {
    timeout: initial ? INITIAL_STACK_TIMEOUT_MS : UPDATE_STACK_TIMEOUT_MS,
    allowFailure
  });
}

function deleteFailedInitialStack({ artifact, aws }) {
  aws.runRaw([
    "cloudformation", "delete-stack",
    "--stack-name", artifact.config.target.stackName
  ], { timeout: 30_000 });
  aws.runRaw([
    "cloudformation", "wait", "stack-delete-complete",
    "--stack-name", artifact.config.target.stackName
  ], { timeout: UPDATE_STACK_TIMEOUT_MS });
}

function convergeInfrastructure({ artifact, aws, existingStack }) {
  let stack = existingStack;
  if (stack && IN_PROGRESS_STACK_STATUS_PATTERN.test(stack.StackStatus)) {
    const waiterName = stack.StackStatus.startsWith("CREATE_")
      ? "stack-create-complete"
      : stack.StackStatus.startsWith("DELETE_")
        ? "stack-delete-complete"
        : "stack-update-complete";
    try {
      aws.runRaw([
        "cloudformation", "wait", waiterName,
        "--stack-name", artifact.config.target.stackName
      ], { timeout: stack.StackStatus.startsWith("CREATE_") ? INITIAL_STACK_TIMEOUT_MS : UPDATE_STACK_TIMEOUT_MS });
    } catch (error) {
      throw publishError({
        code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
        message: `Timed out waiting for stack state ${stack.StackStatus}.`,
        suggestion: "Inspect the named stack, let the current AWS operation reach a terminal state, then rerun.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "infrastructure",
        context: { stackStatus: stack.StackStatus },
        cause: error
      });
    }
    stack = inspectStack({ artifact, aws });
  }

  if (stack?.StackStatus === "ROLLBACK_COMPLETE") {
    deleteFailedInitialStack({ artifact, aws });
    stack = null;
  }
  if (stack && (UNSAFE_STACK_STATUSES.has(stack.StackStatus) || !ACCEPTABLE_STACK_STATUSES.has(stack.StackStatus))) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
      message: `Production stack is in unsupported state ${stack.StackStatus}.`,
      suggestion: "Inspect CloudFormation events and repair the existing stack before rerunning publication.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "infrastructure",
      safeRetry: false,
      context: { stackStatus: stack.StackStatus }
    });
  }

  const initial = stack === null;
  const activeReleaseId = initial
    ? BOOTSTRAP_RELEASE_ID
    : parameterMap(stack).ActiveReleaseId ?? BOOTSTRAP_RELEASE_ID;
  try {
    deployStack({ artifact, aws, activeReleaseId, initial });
  } catch (error) {
    const observedStack = inspectStack({ artifact, aws });
    throw publishError({
      code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
      message: "CloudFormation did not converge the VasirBench production infrastructure.",
      suggestion: "Inspect stack events for vasirbenchmark-production, repair the reported resource, then rerun.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "infrastructure",
      context: { stackStatus: observedStack?.StackStatus ?? null },
      cause: error
    });
  }
  const convergedStack = inspectStack({ artifact, aws });
  if (!convergedStack || !ACCEPTABLE_STACK_STATUSES.has(convergedStack.StackStatus)) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
      message: `CloudFormation ended in ${convergedStack?.StackStatus ?? "an unknown state"}.`,
      suggestion: "Inspect stack events and rerun only after the stack reaches a supported terminal state.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "infrastructure",
      context: { stackStatus: convergedStack?.StackStatus ?? null }
    });
  }
  const outputs = outputMap(convergedStack);
  for (const requiredOutput of ["BucketName", "DistributionId", "ReleaseRouterFunctionName"]) {
    if (!outputs[requiredOutput]) {
      throw publishError({
        code: "BENCHMARK_PUBLISH_INFRASTRUCTURE_FAILED",
        message: `CloudFormation output ${requiredOutput} is missing.`,
        suggestion: "Repair the checked-in stack outputs and rerun publication.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "infrastructure"
      });
    }
  }
  return convergedStack;
}

function writeTemporaryJson(artifact, fileName, value) {
  const filePath = path.join(artifact.temporaryDirectory, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function headObject({ aws, bucketName, key, checksum = false }) {
  try {
    return aws.runJson([
      "s3api", "head-object",
      "--bucket", bucketName,
      "--key", key,
      ...(checksum ? ["--checksum-mode", "ENABLED"] : [])
    ]);
  } catch (error) {
    if (isMissingAwsResource(error)) return null;
    throw error;
  }
}

function getObjectJson({ artifact, aws, bucketName, key, fileName }) {
  const head = headObject({ aws, bucketName, key });
  if (!head) return null;
  const outputPath = path.join(artifact.temporaryDirectory, fileName);
  try {
    aws.runRaw([
      "s3api", "get-object",
      "--bucket", bucketName,
      "--key", key
    ], { outputPath, timeout: 30_000 });
    return {
      value: JSON.parse(fs.readFileSync(outputPath, "utf8")),
      etag: head.ETag,
      versionId: head.VersionId ?? null
    };
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_UPLOAD_FAILED",
      message: `Could not read private publication control object ${key}.`,
      suggestion: "Inspect the private deployment control prefix, then rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "upload",
      context: { key },
      cause: error
    });
  }
}

function putJsonObject({ artifact, aws, bucketName, key, value, ifMatch = null, ifNoneMatch = false }) {
  const bodyPath = writeTemporaryJson(artifact, `control/${crypto.randomUUID()}.json`, value);
  const args = [
    "s3api", "put-object",
    "--bucket", bucketName,
    "--key", key,
    "--body", bodyPath,
    "--content-type", "application/json; charset=utf-8",
    "--cache-control", "no-store",
    "--checksum-sha256", crypto.createHash("sha256").update(fs.readFileSync(bodyPath)).digest("base64")
  ];
  if (ifMatch !== null) args.push("--if-match", ifMatch);
  if (ifNoneMatch) args.push("--if-none-match", "*");
  return aws.runJson(args);
}

function acquireLease({ artifact, aws, bucketName, now }) {
  const ownerId = crypto.randomUUID();
  const acquiredAt = now();
  const leaseDurationMs = artifact.config.limits.leaseDurationMinutes * 60_000;
  const value = {
    kind: "vasirbenchmark-publish-lease",
    schemaVersion: 1,
    ownerId,
    releaseId: artifact.releaseId,
    acquiredAt: new Date(acquiredAt).toISOString(),
    expiresAt: new Date(acquiredAt + leaseDurationMs).toISOString()
  };
  try {
    const response = putJsonObject({
      artifact,
      aws,
      bucketName,
      key: LOCK_KEY,
      value,
      ifNoneMatch: true
    });
    return { ownerId, value, etag: response.ETag, heldStartedAt: acquiredAt };
  } catch (error) {
    if (!isPreconditionFailure(error)) {
      throw publishError({
        code: "BENCHMARK_PUBLISH_BUSY",
        message: "Could not acquire the exclusive VasirBench publication lease.",
        suggestion: "Inspect the private publish lock and retry after the current publisher completes.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "lease",
        cause: error
      });
    }
  }

  const existing = getObjectJson({ artifact, aws, bucketName, key: LOCK_KEY, fileName: "existing-lock.json" });
  const expiresAt = Date.parse(existing?.value?.expiresAt ?? "");
  if (!existing || !Number.isFinite(expiresAt) || expiresAt > now()) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: `Another publisher holds the production lease${existing?.value?.releaseId ? ` for release ${existing.value.releaseId}` : ""}.`,
      suggestion: "Wait for that command to finish, then rerun the same publication command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "lease",
      context: {
        activePublisherReleaseId: existing?.value?.releaseId ?? null,
        leaseExpiresAt: existing?.value?.expiresAt ?? null
      }
    });
  }
  try {
    const response = putJsonObject({
      artifact,
      aws,
      bucketName,
      key: LOCK_KEY,
      value,
      ifMatch: existing.etag
    });
    return { ownerId, value, etag: response.ETag, heldStartedAt: acquiredAt };
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: "The expired publication lease changed while this command attempted recovery.",
      suggestion: "A different publisher won the lease; wait for it to complete and retry.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "lease",
      cause: error
    });
  }
}

function assertLeaseTime({ artifact, lease, now, stage }) {
  const heldMilliseconds = now() - lease.heldStartedAt;
  const maxHeldMilliseconds = artifact.config.limits.maxLeaseHeldMinutes * 60_000;
  const expiresAt = Date.parse(lease.value.expiresAt);
  if (heldMilliseconds >= maxHeldMilliseconds || now() >= expiresAt) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: "The publication lease safety window expired before the next mutation.",
      suggestion: "Do not continue this process; rerun the command so it can reconcile the observed active release.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage,
      rollback: { status: "indeterminate", releaseId: null },
      context: { leaseOwnerId: lease.ownerId, leaseExpiresAt: lease.value.expiresAt }
    });
  }
}

function proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage }) {
  assertLeaseTime({ artifact, lease, now, stage });
  const current = getObjectJson({ artifact, aws, bucketName, key: LOCK_KEY, fileName: "current-lock.json" });
  if (!current || current.value.ownerId !== lease.ownerId || stripEtagQuotes(current.etag) !== stripEtagQuotes(lease.etag)) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: "This process no longer owns the production publication lease.",
      suggestion: "Stop this process and rerun the command so it can reconcile the active and verified releases.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage,
      rollback: { status: "indeterminate", releaseId: null },
      context: { leaseOwnerId: lease.ownerId }
    });
  }
  return current;
}

function renewLease({ artifact, aws, bucketName, lease, now, stage }) {
  proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage });
  const renewedAt = now();
  const value = {
    ...lease.value,
    renewedAt: new Date(renewedAt).toISOString(),
    expiresAt: new Date(renewedAt + artifact.config.limits.leaseDurationMinutes * 60_000).toISOString()
  };
  try {
    const response = putJsonObject({
      artifact,
      aws,
      bucketName,
      key: LOCK_KEY,
      value,
      ifMatch: lease.etag
    });
    lease.value = value;
    lease.etag = response.ETag;
    return lease;
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: "The production lease could not be renewed with its current ownership token.",
      suggestion: "Stop this process and rerun so publication state can be reconciled safely.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage,
      rollback: { status: "indeterminate", releaseId: null },
      context: { leaseOwnerId: lease.ownerId },
      cause: error
    });
  }
}

function releaseLease({ artifact, aws, bucketName, lease, now }) {
  assertLeaseTime({ artifact, lease, now, stage: "lease" });
  proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "lease" });
  try {
    aws.runJson([
      "s3api", "delete-object",
      "--bucket", bucketName,
      "--key", LOCK_KEY,
      "--if-match", lease.etag
    ]);
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_BUSY",
      message: "Publication completed, but the command could not release its lease conditionally.",
      suggestion: "Rerun the command; it will recover the completed publication after the lease expires.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "lease",
      context: { leaseOwnerId: lease.ownerId },
      cause: error
    });
  }
}

function readPublicationState({ artifact, aws, bucketName }) {
  return getObjectJson({
    artifact,
    aws,
    bucketName,
    key: PUBLICATION_STATE_KEY,
    fileName: "publication-state.json"
  });
}

function writePublicationState({ artifact, aws, bucketName, record, previous }) {
  try {
    const response = putJsonObject({
      artifact,
      aws,
      bucketName,
      key: PUBLICATION_STATE_KEY,
      value: record,
      ifMatch: previous?.etag ?? null,
      ifNoneMatch: previous === null
    });
    return { value: record, etag: response.ETag };
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_ACTIVATION_FAILED",
      message: "Could not conditionally persist the private publication state.",
      suggestion: "Stop and rerun; the next command will reconcile the stack pointer with the last control record.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "activation",
      rollback: { status: "indeterminate", releaseId: null },
      cause: error
    });
  }
}

function listObjectVersions({ artifact, aws, bucketName }) {
  try {
    const response = aws.runJson([
      "s3api", "list-object-versions",
      "--bucket", bucketName
    ]);
    return {
      versions: response.Versions ?? [],
      deleteMarkers: response.DeleteMarkers ?? []
    };
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED",
      message: "Could not inspect physical object versions for the storage budget.",
      suggestion: "Restore S3 version-list access, then rerun before uploading another release.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "cleanup",
      cause: error
    });
  }
}

function releaseIdFromKey(key) {
  const match = String(key).match(/^releases\/([a-f0-9]{64})\//);
  return match?.[1] ?? null;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

export function calculateProjectedPublicationBytes({ listing, artifact }) {
  const physicalBytes = listing.versions.reduce((total, entry) => total + Number(entry.Size ?? 0), 0);
  const latestVersionKeys = new Set(
    listing.versions
      .filter((entry) => entry.IsLatest === true)
      .map((entry) => entry.Key)
  );
  const missingReleaseBytes = artifact.files.reduce((total, file) => {
    const key = `${RELEASE_PREFIX}${artifact.releaseId}/${file.path}`;
    return total + (latestVersionKeys.has(key) ? 0 : file.bytes);
  }, 0);
  const manifestKey = `${MANIFEST_PREFIX}${artifact.releaseId}.json`;
  const missingManifestBytes = latestVersionKeys.has(manifestKey)
    ? 0
    : Buffer.byteLength(`${JSON.stringify(artifact.publicManifest, null, 2)}\n`);
  const candidateBytes = missingReleaseBytes + missingManifestBytes;
  return {
    physicalBytes,
    candidateBytes,
    projectedBytes: physicalBytes + candidateBytes
  };
}

function cleanupAndAssertStorageBudget({ artifact, aws, bucketName, lease, publicationState, activeReleaseId, now }) {
  renewLease({ artifact, aws, bucketName, lease, now, stage: "cleanup" });
  const listing = listObjectVersions({ artifact, aws, bucketName });
  const protectedReleaseIds = new Set([
    activeReleaseId,
    publicationState?.value?.lastVerifiedReleaseId,
    publicationState?.value?.previousVerifiedReleaseId,
    artifact.releaseId
  ].filter((value) => typeof value === "string" && value !== BOOTSTRAP_RELEASE_ID));
  const releaseEntries = new Map();
  for (const entry of [...listing.versions, ...listing.deleteMarkers]) {
    const releaseId = releaseIdFromKey(entry.Key);
    if (!releaseId) continue;
    const entries = releaseEntries.get(releaseId) ?? [];
    entries.push(entry);
    releaseEntries.set(releaseId, entries);
  }
  const cutoff = now() - artifact.config.limits.releaseRetentionDays * 24 * 60 * 60 * 1000;
  const expiredReleaseIds = [...releaseEntries.entries()]
    .filter(([releaseId, entries]) => (
      !protectedReleaseIds.has(releaseId) &&
      entries.every((entry) => Date.parse(entry.LastModified) < cutoff)
    ))
    .map(([releaseId]) => releaseId)
    .sort();

  const deletions = [];
  for (const entry of [...listing.versions, ...listing.deleteMarkers]) {
    const releaseId = releaseIdFromKey(entry.Key);
    const manifestReleaseId = String(entry.Key).match(/^_deploy\/manifests\/([a-f0-9]{64})\.json$/)?.[1] ?? null;
    if ((releaseId && expiredReleaseIds.includes(releaseId)) || (manifestReleaseId && expiredReleaseIds.includes(manifestReleaseId))) {
      deletions.push({ Key: entry.Key, VersionId: entry.VersionId });
    }
  }
  for (const deletionChunk of chunk(deletions, 500)) {
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "cleanup" });
    aws.runJson([
      "s3api", "delete-objects",
      "--bucket", bucketName,
      "--delete", JSON.stringify({ Objects: deletionChunk, Quiet: true })
    ]);
  }

  const retained = deletions.length > 0 ? listObjectVersions({ artifact, aws, bucketName }) : listing;
  const { physicalBytes, candidateBytes, projectedBytes } = calculateProjectedPublicationBytes({
    listing: retained,
    artifact
  });
  if (projectedBytes > artifact.config.limits.maxPhysicalStorageBytes) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_STORAGE_BUDGET_EXCEEDED",
      message: `Projected versioned storage ${projectedBytes} bytes exceeds the ${artifact.config.limits.maxPhysicalStorageBytes}-byte production budget.`,
      suggestion: "Inspect retained releases and revise the audited storage policy before publishing more bytes.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "cleanup",
      safeRetry: false,
      context: { physicalBytes, candidateBytes, projectedBytes, expiredReleaseIds }
    });
  }
  return { physicalBytes, candidateBytes, projectedBytes, expiredReleaseIds, deletedVersionCount: deletions.length };
}

function stageFile({ artifact, aws, bucketName, file }) {
  const key = `${RELEASE_PREFIX}${artifact.releaseId}/${file.path}`;
  let existing;
  try {
    existing = headObject({ aws, bucketName, key, checksum: true });
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_UPLOAD_FAILED",
      message: `Could not inspect staged object ${file.path}.`,
      suggestion: "Inspect S3 access and rerun the same release; immutable matching objects will be reused.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "upload",
      context: { key },
      cause: error
    });
  }
  if (existing) {
    if (Number(existing.ContentLength) !== file.bytes || existing.ChecksumSHA256 !== file.checksumSha256Base64) {
      throw publishError({
        code: "BENCHMARK_PUBLISH_UPLOAD_FAILED",
        message: `Immutable release object already exists with different bytes: ${file.path}`,
        suggestion: "Do not overwrite it; inspect the object and source-manifest derivation before retrying.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "upload",
        safeRetry: false,
        context: { key }
      });
    }
    return "reused";
  }

  try {
    aws.runJson([
      "s3api", "put-object",
      "--bucket", bucketName,
      "--key", key,
      "--body", file.outputPath,
      "--content-type", file.contentType,
      "--cache-control", file.cacheControl,
      "--checksum-sha256", file.checksumSha256Base64,
      "--metadata", `release-id=${artifact.releaseId}`,
      "--if-none-match", "*"
    ]);
    const staged = headObject({ aws, bucketName, key, checksum: true });
    if (!staged || Number(staged.ContentLength) !== file.bytes || staged.ChecksumSHA256 !== file.checksumSha256Base64) {
      throw new Error("staged checksum or byte length did not match");
    }
    return "uploaded";
  } catch (error) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_UPLOAD_FAILED",
      message: `Failed to stage immutable release object ${file.path}.`,
      suggestion: "Rerun the same command; matching completed objects will be reused without overwrite.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "upload",
      context: { key },
      cause: error
    });
  }
}

function stageRelease({ artifact, aws, bucketName, lease, now }) {
  proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "upload" });
  const receipts = artifact.files.map((file) => {
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "upload" });
    return { path: file.path, status: stageFile({ artifact, aws, bucketName, file }) };
  });
  const manifestKey = `${MANIFEST_PREFIX}${artifact.releaseId}.json`;
  const existingManifest = getObjectJson({
    artifact,
    aws,
    bucketName,
    key: manifestKey,
    fileName: `manifest-${artifact.releaseId}.json`
  });
  if (existingManifest) {
    if (JSON.stringify(existingManifest.value) !== JSON.stringify(artifact.publicManifest)) {
      throw publishError({
        code: "BENCHMARK_PUBLISH_UPLOAD_FAILED",
        message: "The immutable private release manifest exists with different content.",
        suggestion: "Inspect the release-id derivation and existing private manifest; do not overwrite either artifact.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "upload",
        safeRetry: false,
        context: { key: manifestKey }
      });
    }
  } else {
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "upload" });
    putJsonObject({
      artifact,
      aws,
      bucketName,
      key: manifestKey,
      value: artifact.publicManifest,
      ifNoneMatch: true
    });
  }
  return receipts;
}

async function waitForLiveFunction({ artifact, aws, functionName, expectedReleaseId, delayImplementation }) {
  const resolvedFunctionName = cloudFrontFunctionName(functionName);
  const startedAt = Date.now();
  let lastSummary = null;
  while (Date.now() - startedAt < FUNCTION_LIVE_TIMEOUT_MS) {
    try {
      const response = aws.runJson([
        "cloudfront", "describe-function",
        "--name", resolvedFunctionName,
        "--stage", "LIVE"
      ]);
      lastSummary = response.FunctionSummary ?? null;
      if (
        lastSummary?.FunctionMetadata?.Stage === "LIVE" &&
        ["DEPLOYED", "ASSOCIATED", "UNASSOCIATED"].includes(lastSummary.Status)
      ) {
        return lastSummary;
      }
    } catch {
      // Function publication is globally convergent; bounded retry owns this transient state.
    }
    await delayImplementation(3000);
  }
  throw publishError({
    code: "BENCHMARK_PUBLISH_ACTIVATION_FAILED",
    message: `CloudFront Function did not expose a LIVE stage for release ${expectedReleaseId}.`,
    suggestion: "Inspect the function and stack state, then rerun so the active pointer can be reconciled.",
    config: artifact.config,
    releaseId: artifact.releaseId,
    stage: "activation",
    rollback: { status: "indeterminate", releaseId: null },
    context: { functionName: resolvedFunctionName, functionStatus: lastSummary?.Status ?? null }
  });
}

async function activateRelease({ artifact, aws, targetReleaseId, delayImplementation }) {
  const deployment = deployStack({
    artifact,
    aws,
    activeReleaseId: targetReleaseId,
    allowFailure: true
  });
  const stack = inspectStack({ artifact, aws });
  const observedActiveReleaseId = parameterMap(stack).ActiveReleaseId ?? null;
  const outputs = outputMap(stack);
  if (!stack || !ACCEPTABLE_STACK_STATUSES.has(stack.StackStatus) || observedActiveReleaseId !== targetReleaseId) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_ACTIVATION_FAILED",
      message: `CloudFormation did not expose the requested active release; observed ${observedActiveReleaseId ?? "unknown"}.`,
      suggestion: "Stop and rerun; the next command will reconcile the observed stack pointer with private verified state.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "activation",
      rollback: { status: "indeterminate", releaseId: null },
      context: {
        requestedActiveReleaseId: targetReleaseId,
        observedActiveReleaseId,
        stackStatus: stack?.StackStatus ?? null,
        deployExitStatus: deployment.ok ? 0 : deployment.failure?.status ?? null
      }
    });
  }
  await waitForLiveFunction({
    artifact,
    aws,
    functionName: outputs.ReleaseRouterFunctionName,
    expectedReleaseId: targetReleaseId,
    delayImplementation
  });
  return stack;
}

async function fetchWithTimeout(fetchImplementation, url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_REQUEST_TIMEOUT_MS);
  try {
    return await fetchImplementation(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function responseHeader(response, name) {
  return response.headers?.get?.(name) ?? null;
}

async function verifyHttpOnce({ artifact, manifest, bucketName, fetchImplementation }) {
  const baseUrl = artifact.config.target.url.replace(/\/$/, "");
  const releaseId = manifest.releaseId;
  const httpResponse = await fetchWithTimeout(fetchImplementation, `http://${artifact.config.target.domain}/`, {
    redirect: "manual"
  });
  if (![301, 302, 307, 308].includes(httpResponse.status) || !String(responseHeader(httpResponse, "location") ?? "").startsWith("https://")) {
    throw new Error(`HTTP redirect returned ${httpResponse.status}`);
  }

  const liveFileBodies = new Map();
  for (const file of manifest.files) {
    const response = await fetchWithTimeout(fetchImplementation, `${baseUrl}/releases/${releaseId}/${file.path}`, {
      redirect: "error",
      cache: "no-store"
    });
    if (response.status !== 200) throw new Error(`${file.path} returned ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    const digest = crypto.createHash("sha256").update(body).digest("hex");
    if (body.length !== file.bytes || digest !== file.sha256) throw new Error(`${file.path} hash mismatch`);
    liveFileBodies.set(file.path, body);
  }

  for (const [stablePath, manifestPath] of [["/", "index.html"], ["/index.html", "index.html"], ["/benchmark-report.html", "benchmark-report.html"]]) {
    const response = await fetchWithTimeout(fetchImplementation, `${baseUrl}${stablePath}`, {
      redirect: "error",
      cache: "no-store"
    });
    if (response.status !== 200) throw new Error(`${stablePath} returned ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    if (!body.equals(liveFileBodies.get(manifestPath))) throw new Error(`${stablePath} did not serve release ${releaseId}`);
    if (stablePath === "/") {
      const text = body.toString("utf8");
      if (!text.includes("VasirBench")) throw new Error("homepage marker missing");
      for (const headerName of [
        "content-security-policy",
        "strict-transport-security",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "permissions-policy"
      ]) {
        if (!responseHeader(response, headerName)) throw new Error(`security header missing: ${headerName}`);
      }
    }
  }

  const originUrl = `https://${bucketName}.s3.${artifact.config.target.region}.amazonaws.com/releases/${releaseId}/index.html`;
  const originResponse = await fetchWithTimeout(fetchImplementation, originUrl, { redirect: "manual", cache: "no-store" });
  if (originResponse.status !== 403) throw new Error(`anonymous origin returned ${originResponse.status}`);
  const controlResponse = await fetchWithTimeout(fetchImplementation, `${baseUrl}/${PUBLICATION_STATE_KEY}`, {
    redirect: "manual",
    cache: "no-store"
  });
  if (controlResponse.status !== 403) throw new Error(`CloudFront control prefix returned ${controlResponse.status}`);
  return { verifiedFiles: manifest.files.length, originPrivate: true };
}

async function verifyHttpPublication({ artifact, manifest, bucketName, fetchImplementation, delayImplementation }) {
  const startedAt = Date.now();
  let lastError = null;
  for (let attempt = 1; attempt <= HTTP_ATTEMPTS && Date.now() - startedAt < HTTP_VERIFICATION_TIMEOUT_MS; attempt += 1) {
    try {
      return await verifyHttpOnce({ artifact, manifest, bucketName, fetchImplementation });
    } catch (error) {
      lastError = error;
      if (attempt < HTTP_ATTEMPTS) await delayImplementation(Math.min(1000 * 2 ** (attempt - 1), 15_000));
    }
  }
  throw publishError({
    code: "BENCHMARK_PUBLISH_VERIFICATION_FAILED",
    message: `Public HTTPS verification did not converge: ${lastError?.message ?? "unknown verification failure"}`,
    suggestion: "Keep the release unchanged and rerun; the command will reconcile the observed pointer and last verified state.",
    config: artifact.config,
    releaseId: manifest.releaseId,
    stage: "verification",
    rollback: { status: "pending", releaseId: null },
    cause: lastError
  });
}

function runBrowserProof({ artifact, chromeBinary, spawnSyncImplementation, environmentVariables }) {
  const capturePath = path.join(artifact.siteRootDirectory, "capture.mjs");
  const checks = [
    { page: `${artifact.config.target.url}/`, target: "leaderboard", width: 1440, height: 1000, file: "live-desktop.png" },
    { page: `${artifact.config.target.url}/`, target: "leaderboard", width: 390, height: 844, file: "live-mobile.png" },
    { page: `${artifact.config.target.url}/benchmark-report.html`, target: "report", width: 1440, height: 1000, file: "live-report-desktop.png" },
    { page: `${artifact.config.target.url}/benchmark-report.html`, target: "report", width: 390, height: 844, file: "live-report-mobile.png" }
  ];
  const perCheckTimeout = Math.floor(BROWSER_VERIFICATION_TIMEOUT_MS / checks.length);
  for (const check of checks) {
    const destinationPath = path.join(artifact.temporaryDirectory, check.file);
    const result = spawnSyncImplementation(process.execPath, [
      capturePath,
      check.page,
      destinationPath,
      String(check.width),
      String(check.height),
      check.target
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: perCheckTimeout,
      maxBuffer: DEFAULT_COMMAND_BUFFER_BYTES,
      env: { ...environmentVariables, CHROME_BIN: chromeBinary }
    });
    if (result?.error || result?.status !== 0) {
      const diagnostic = String(result?.stderr || result?.stdout || result?.error?.message || "browser proof failed")
        .trim()
        .slice(-2000);
      throw publishError({
        code: "BENCHMARK_PUBLISH_VERIFICATION_FAILED",
        message: `Chrome production route proof failed: ${diagnostic}`,
        suggestion: "Inspect the live route and capture harness, then rerun so the command can reconcile or roll back safely.",
        config: artifact.config,
        releaseId: artifact.releaseId,
        stage: "verification",
        rollback: { status: "pending", releaseId: null },
        context: { routeClass: check.target, viewport: `${check.width}x${check.height}` },
        cause: result?.error
      });
    }
  }
  return {
    verifiedReportRoutes: artifact.routes.reportFragments.length,
    verifiedCapabilityRoutes: artifact.routes.capabilityFragments.length
  };
}

function readStoredManifest({ artifact, aws, bucketName, releaseId }) {
  const stored = getObjectJson({
    artifact,
    aws,
    bucketName,
    key: `${MANIFEST_PREFIX}${releaseId}.json`,
    fileName: `stored-manifest-${releaseId}.json`
  });
  if (!stored || stored.value?.releaseId !== releaseId || !Array.isArray(stored.value.files)) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_VERIFICATION_FAILED",
      message: `Private manifest for release ${releaseId} is missing or invalid.`,
      suggestion: "Do not guess at rollback bytes; inspect the private manifest and publication state before retrying.",
      config: artifact.config,
      releaseId,
      stage: "verification",
      rollback: { status: "indeterminate", releaseId }
    });
  }
  return stored.value;
}

async function verifyPublication({ artifact, manifest, stack, chromeBinary, spawnSyncImplementation, environmentVariables, fetchImplementation, delayImplementation }) {
  const bucketName = outputMap(stack).BucketName;
  const http = await verifyHttpPublication({
    artifact,
    manifest,
    bucketName,
    fetchImplementation,
    delayImplementation
  });
  const browser = runBrowserProof({
    artifact,
    chromeBinary,
    spawnSyncImplementation,
    environmentVariables
  });
  return {
    status: "passed",
    verifiedFiles: http.verifiedFiles,
    verifiedReportRoutes: browser.verifiedReportRoutes,
    verifiedCapabilityRoutes: browser.verifiedCapabilityRoutes,
    originPrivate: http.originPrivate
  };
}

function stagedStateRecord({ artifact, lease, existingState, previousActiveReleaseId, now }) {
  return {
    kind: "vasirbenchmark-publication-state",
    schemaVersion: 1,
    status: "staged",
    candidateReleaseId: artifact.releaseId,
    previousActiveReleaseId,
    lastVerifiedReleaseId: existingState?.value?.lastVerifiedReleaseId ?? null,
    previousVerifiedReleaseId: existingState?.value?.previousVerifiedReleaseId ?? null,
    publisherOwnerId: lease.ownerId,
    stagedAt: new Date(now()).toISOString(),
    verifiedAt: null
  };
}

function verifiedStateRecord({ stagedRecord, verifiedReleaseId, now }) {
  const priorVerifiedReleaseId = stagedRecord.lastVerifiedReleaseId;
  return {
    ...stagedRecord,
    status: "verified",
    candidateReleaseId: verifiedReleaseId,
    previousActiveReleaseId: stagedRecord.previousActiveReleaseId,
    lastVerifiedReleaseId: verifiedReleaseId,
    previousVerifiedReleaseId: priorVerifiedReleaseId,
    verifiedAt: new Date(now()).toISOString()
  };
}

async function reconcilePublicationState({
  artifact,
  aws,
  stack,
  state,
  lease,
  chromeBinary,
  spawnSyncImplementation,
  environmentVariables,
  fetchImplementation,
  delayImplementation,
  now
}) {
  const bucketName = outputMap(stack).BucketName;
  const activeReleaseId = parameterMap(stack).ActiveReleaseId ?? BOOTSTRAP_RELEASE_ID;
  if (!state && activeReleaseId === BOOTSTRAP_RELEASE_ID) {
    return { state: null, activeReleaseId, recoveredVerification: null };
  }
  if (state?.value?.status === "verified" && state.value.lastVerifiedReleaseId === activeReleaseId) {
    return { state, activeReleaseId, recoveredVerification: null };
  }
  if (state?.value?.status === "staged" && state.value.previousActiveReleaseId === activeReleaseId) {
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "activation" });
    const restoredRecord = {
      ...state.value,
      status: "verified",
      candidateReleaseId: state.value.lastVerifiedReleaseId,
      verifiedAt: state.value.lastVerifiedReleaseId ? state.value.stagedAt : null
    };
    const restoredState = writePublicationState({ artifact, aws, bucketName, record: restoredRecord, previous: state });
    return { state: restoredState, activeReleaseId, recoveredVerification: null };
  }
  if (state?.value?.status === "staged" && state.value.candidateReleaseId === activeReleaseId) {
    const manifest = readStoredManifest({ artifact, aws, bucketName, releaseId: activeReleaseId });
    try {
      const recoveredVerification = await verifyPublication({
        artifact,
        manifest,
        stack,
        chromeBinary,
        spawnSyncImplementation,
        environmentVariables,
        fetchImplementation,
        delayImplementation
      });
      proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "activation" });
      const verifiedRecord = verifiedStateRecord({ stagedRecord: state.value, verifiedReleaseId: activeReleaseId, now });
      const verifiedState = writePublicationState({ artifact, aws, bucketName, record: verifiedRecord, previous: state });
      return { state: verifiedState, activeReleaseId, recoveredVerification };
    } catch (error) {
      const rollbackReleaseId = state.value.lastVerifiedReleaseId;
      if (rollbackReleaseId) {
        renewLease({ artifact, aws, bucketName, lease, now, stage: "activation" });
        const latestStack = inspectStack({ artifact, aws });
        const latestActiveReleaseId = parameterMap(latestStack).ActiveReleaseId ?? null;
        if (latestActiveReleaseId === activeReleaseId) {
          try {
            const restoredStack = await activateRelease({
              artifact,
              aws,
              targetReleaseId: rollbackReleaseId,
              delayImplementation
            });
            const rollbackManifest = readStoredManifest({
              artifact,
              aws,
              bucketName,
              releaseId: rollbackReleaseId
            });
            await verifyPublication({
              artifact,
              manifest: rollbackManifest,
              stack: restoredStack,
              chromeBinary,
              spawnSyncImplementation,
              environmentVariables,
              fetchImplementation,
              delayImplementation
            });
            proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "activation" });
            const restoredRecord = {
              ...state.value,
              status: "verified",
              candidateReleaseId: rollbackReleaseId,
              previousActiveReleaseId: activeReleaseId,
              lastVerifiedReleaseId: rollbackReleaseId,
              verifiedAt: new Date(now()).toISOString()
            };
            const restoredState = writePublicationState({
              artifact,
              aws,
              bucketName,
              record: restoredRecord,
              previous: state
            });
            return {
              state: restoredState,
              activeReleaseId: rollbackReleaseId,
              recoveredVerification: null
            };
          } catch (rollbackError) {
            throw publishError({
              code: "BENCHMARK_PUBLISH_ROLLBACK_FAILED",
              message: `A previously staged release failed proof and the last verified release could not be restored: ${rollbackError.message}`,
              suggestion: "Stop and inspect the observed stack pointer, LIVE function, and private manifests before retrying.",
              config: artifact.config,
              releaseId: activeReleaseId,
              stage: "activation",
              safeRetry: false,
              rollback: { status: "indeterminate", releaseId: rollbackReleaseId },
              context: { observedActiveReleaseId: latestActiveReleaseId, lastVerifiedReleaseId: rollbackReleaseId },
              cause: rollbackError
            });
          }
        }
      }
      throw publishError({
        code: "BENCHMARK_PUBLISH_ACTIVATION_FAILED",
        message: `A previously staged release is active but still unverified: ${activeReleaseId}.`,
        suggestion: "Rerun after inspecting the live failure; the state remains explicit and no new release was activated.",
        config: artifact.config,
        releaseId: activeReleaseId,
        stage: "activation",
        rollback: { status: "indeterminate", releaseId: state.value.lastVerifiedReleaseId ?? null },
        context: { observedActiveReleaseId: activeReleaseId, lastVerifiedReleaseId: state.value.lastVerifiedReleaseId ?? null },
        cause: error
      });
    }
  }
  throw publishError({
    code: "BENCHMARK_PUBLISH_ACTIVATION_FAILED",
    message: "The stack release pointer and private verified publication state do not reconcile.",
    suggestion: "Do not mutate either pointer manually; inspect both records, then rerun after resolving the discrepancy.",
    config: artifact.config,
    releaseId: artifact.releaseId,
    stage: "activation",
    safeRetry: false,
    rollback: { status: "indeterminate", releaseId: state?.value?.lastVerifiedReleaseId ?? null },
    context: {
      observedActiveReleaseId: activeReleaseId,
      stateStatus: state?.value?.status ?? null,
      lastVerifiedReleaseId: state?.value?.lastVerifiedReleaseId ?? null
    }
  });
}

async function rollbackCandidate({
  artifact,
  aws,
  stack,
  state,
  lease,
  chromeBinary,
  spawnSyncImplementation,
  environmentVariables,
  fetchImplementation,
  delayImplementation,
  now,
  verificationError
}) {
  const bucketName = outputMap(stack).BucketName;
  const rollbackReleaseId = state.value.lastVerifiedReleaseId;
  if (!rollbackReleaseId) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_VERIFICATION_FAILED",
      message: verificationError.message,
      suggestion: "This was the first release; rerun to verify or replace the observed active release.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "verification",
      rollback: { status: "indeterminate", releaseId: null },
      context: { observedActiveReleaseId: parameterMap(stack).ActiveReleaseId ?? null },
      cause: verificationError
    });
  }
  renewLease({ artifact, aws, bucketName, lease, now, stage: "activation" });
  const observedStack = inspectStack({ artifact, aws });
  const observedActiveReleaseId = parameterMap(observedStack).ActiveReleaseId ?? null;
  if (observedActiveReleaseId !== artifact.releaseId) {
    throw publishError({
      code: "BENCHMARK_PUBLISH_ROLLBACK_FAILED",
      message: `Rollback was fenced because the active pointer changed to ${observedActiveReleaseId ?? "unknown"}.`,
      suggestion: "Stop and rerun so the new observed pointer can be reconciled without clobbering another publisher.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "activation",
      rollback: { status: "indeterminate", releaseId: rollbackReleaseId },
      context: { observedActiveReleaseId },
      cause: verificationError
    });
  }
  try {
    const restoredStack = await activateRelease({ artifact, aws, targetReleaseId: rollbackReleaseId, delayImplementation });
    const manifest = readStoredManifest({ artifact, aws, bucketName, releaseId: rollbackReleaseId });
    await verifyPublication({
      artifact,
      manifest,
      stack: restoredStack,
      chromeBinary,
      spawnSyncImplementation,
      environmentVariables,
      fetchImplementation,
      delayImplementation
    });
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "activation" });
    const restoredRecord = {
      ...state.value,
      status: "verified",
      candidateReleaseId: rollbackReleaseId,
      previousActiveReleaseId: artifact.releaseId,
      lastVerifiedReleaseId: rollbackReleaseId,
      verifiedAt: new Date(now()).toISOString()
    };
    writePublicationState({ artifact, aws, bucketName, record: restoredRecord, previous: state });
    throw publishError({
      code: "BENCHMARK_PUBLISH_VERIFICATION_FAILED",
      message: verificationError.message,
      suggestion: "The prior verified release was restored; fix the candidate and rerun the same command.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "verification",
      rollback: { status: "restored", releaseId: rollbackReleaseId },
      context: { observedActiveReleaseId: rollbackReleaseId },
      cause: verificationError
    });
  } catch (error) {
    if (error instanceof VasirCliError && error.code === "BENCHMARK_PUBLISH_VERIFICATION_FAILED" && error.context?.rollback?.status === "restored") {
      throw error;
    }
    throw publishError({
      code: "BENCHMARK_PUBLISH_ROLLBACK_FAILED",
      message: `Candidate verification failed and the prior release could not be proven restored: ${error.message}`,
      suggestion: "Stop and inspect the stack pointer, LIVE function, and prior manifest before any further mutation.",
      config: artifact.config,
      releaseId: artifact.releaseId,
      stage: "activation",
      safeRetry: false,
      rollback: { status: "indeterminate", releaseId: rollbackReleaseId },
      cause: error
    });
  }
}

export async function publishBenchmarkSite({
  repoRootDirectory,
  dryRun = false,
  spawnSyncImplementation = childProcess.spawnSync,
  environmentVariables = process.env,
  platform = process.platform,
  fetchImplementation = globalThis.fetch,
  delayImplementation = delay,
  now = Date.now,
  onProgress = () => {}
}) {
  const actions = createActionLedger({ dryRun });
  let artifact;
  try {
    artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory, validateAcceptance: true });
    markAction(actions, "validate-acceptance");
    markAction(actions, "build-artifact");
    onProgress({ id: "build-artifact", stage: "artifact", detail: artifact.releaseId });
  } catch (error) {
    throw error;
  }

  let lease = null;
  let bucketName = null;
  let leaseReleased = false;
  const tools = assertLocalTools({ artifact, spawnSyncImplementation, environmentVariables, platform });
  const aws = createAwsRunner({ config: artifact.config, spawnSyncImplementation });
  try {
    assertAwsIdentityAndZone({ artifact, aws });
    markAction(actions, "assert-identity");
    onProgress({ id: "assert-identity", stage: "identity", detail: artifact.config.target.accountId });

    const observedStack = inspectStack({ artifact, aws });
    const observedActiveReleaseId = observedStack ? parameterMap(observedStack).ActiveReleaseId ?? null : null;
    if (dryRun) {
      return createResult({
        artifact,
        stack: observedStack,
        dryRun: true,
        actions,
        previousVerifiedReleaseId: null,
        activeReleaseId: observedActiveReleaseId,
        verification: {
          status: "planned",
          verifiedFiles: 0,
          verifiedReportRoutes: 0,
          verifiedCapabilityRoutes: 0,
          originPrivate: null
        },
        rollback: { status: "not-needed", releaseId: null }
      });
    }

    let stack = convergeInfrastructure({ artifact, aws, existingStack: observedStack });
    markAction(actions, "converge-infrastructure");
    onProgress({ id: "converge-infrastructure", stage: "infrastructure", detail: stack.StackStatus });
    bucketName = outputMap(stack).BucketName;
    lease = acquireLease({ artifact, aws, bucketName, now });
    markAction(actions, "acquire-lease");
    onProgress({ id: "acquire-lease", stage: "lease", detail: lease.ownerId });

    let publicationState = readPublicationState({ artifact, aws, bucketName });
    const reconciliation = await reconcilePublicationState({
      artifact,
      aws,
      stack,
      state: publicationState,
      lease,
      chromeBinary: tools.chromeBinary,
      spawnSyncImplementation,
      environmentVariables,
      fetchImplementation,
      delayImplementation,
      now
    });
    publicationState = reconciliation.state;
    stack = inspectStack({ artifact, aws });
    const previousVerifiedReleaseId = publicationState?.value?.lastVerifiedReleaseId ?? null;
    const previousActiveReleaseId = parameterMap(stack).ActiveReleaseId ?? BOOTSTRAP_RELEASE_ID;

    cleanupAndAssertStorageBudget({
      artifact,
      aws,
      bucketName,
      lease,
      publicationState,
      activeReleaseId: previousActiveReleaseId,
      now
    });
    markAction(actions, "cleanup-releases");
    onProgress({ id: "cleanup-releases", stage: "cleanup", detail: "within 1 GiB" });

    stageRelease({ artifact, aws, bucketName, lease, now });
    markAction(actions, "stage-release");
    onProgress({ id: "stage-release", stage: "upload", detail: `${artifact.fileCount} files` });

    renewLease({ artifact, aws, bucketName, lease, now, stage: "activation" });
    const stagedRecord = stagedStateRecord({
      artifact,
      lease,
      existingState: publicationState,
      previousActiveReleaseId,
      now
    });
    publicationState = writePublicationState({
      artifact,
      aws,
      bucketName,
      record: stagedRecord,
      previous: publicationState
    });
    stack = await activateRelease({
      artifact,
      aws,
      targetReleaseId: artifact.releaseId,
      delayImplementation
    });
    markAction(actions, "activate-release");
    onProgress({ id: "activate-release", stage: "activation", detail: artifact.releaseId });

    let verification;
    try {
      verification = await verifyPublication({
        artifact,
        manifest: artifact.publicManifest,
        stack,
        chromeBinary: tools.chromeBinary,
        spawnSyncImplementation,
        environmentVariables,
        fetchImplementation,
        delayImplementation
      });
    } catch (error) {
      await rollbackCandidate({
        artifact,
        aws,
        stack,
        state: publicationState,
        lease,
        chromeBinary: tools.chromeBinary,
        spawnSyncImplementation,
        environmentVariables,
        fetchImplementation,
        delayImplementation,
        now,
        verificationError: error
      });
    }
    proveLeaseOwnership({ artifact, aws, bucketName, lease, now, stage: "activation" });
    const verifiedRecord = verifiedStateRecord({ stagedRecord, verifiedReleaseId: artifact.releaseId, now });
    publicationState = writePublicationState({
      artifact,
      aws,
      bucketName,
      record: verifiedRecord,
      previous: publicationState
    });
    markAction(actions, "verify-publication");
    onProgress({ id: "verify-publication", stage: "verification", detail: artifact.config.target.url });

    releaseLease({ artifact, aws, bucketName, lease, now });
    leaseReleased = true;
    markAction(actions, "release-lease");
    onProgress({ id: "release-lease", stage: "lease", detail: "released" });

    return createResult({
      artifact,
      stack,
      dryRun: false,
      actions,
      previousVerifiedReleaseId,
      activeReleaseId: artifact.releaseId,
      verification,
      rollback: { status: "not-needed", releaseId: null }
    });
  } finally {
    if (lease && !leaseReleased && bucketName) {
      try {
        releaseLease({ artifact, aws, bucketName, lease, now });
      } catch {
        // The primary staged error owns the exit. Conditional expiry/recovery prevents an unsafe unlock.
      }
    }
    artifact.dispose();
  }
}
