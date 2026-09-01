import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildBenchmarkPublicationArtifact,
  readBenchmarkDeploymentConfig,
  validateBenchmarkAcceptance
} from "../cli/benchmark-publication-artifact.js";
import { calculateProjectedPublicationBytes, publishBenchmarkSite } from "../cli/benchmark-publish.js";
import { runCommandLine } from "../cli/command-runner.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ROOT = path.join(REPO_ROOT, "site", "vasirbenchmark.com");
const EXPECTED_ACTION_IDS = [
  "validate-acceptance",
  "build-artifact",
  "assert-identity",
  "converge-infrastructure",
  "acquire-lease",
  "cleanup-releases",
  "stage-release",
  "activate-release",
  "verify-publication",
  "release-lease"
];
const MUTATING_AWS_OPERATIONS = new Set([
  "cloudformation:deploy",
  "cloudformation:delete-stack",
  "route53:change-resource-record-sets",
  "s3api:put-object",
  "s3api:delete-object",
  "s3api:delete-objects",
  "cloudfront:create-function",
  "cloudfront:update-function",
  "cloudfront:publish-function"
]);

function commandResult({ status = 0, stdout = "{}", stderr = "" } = {}) {
  return { status, stdout, stderr, error: null };
}

function createReadOnlyAwsStub({ accountId = "339713108333", stack = null } = {}) {
  const calls = [];
  const spawnSyncImplementation = (command, args) => {
    if (command !== "aws") {
      return commandResult({ status: 127, stderr: `unexpected executable: ${command}` });
    }
    if (args.length === 1 && args[0] === "--version") {
      return commandResult({ stdout: "aws-cli/2.36.23\n" });
    }
    calls.push(args);
    const operation = `${args[0]}:${args[1]}`;
    if (operation === "sts:get-caller-identity") {
      return commandResult({ stdout: JSON.stringify({ Account: accountId, Arn: "arn:aws:iam::339713108333:user/test" }) });
    }
    if (operation === "route53:get-hosted-zone") {
      return commandResult({ stdout: JSON.stringify({ HostedZone: { Name: "vasirbenchmark.com." } }) });
    }
    if (operation === "cloudformation:validate-template") {
      return commandResult({ stdout: JSON.stringify({ Parameters: [] }) });
    }
    if (operation === "cloudformation:describe-stacks") {
      if (stack) return commandResult({ stdout: JSON.stringify({ Stacks: [stack] }) });
      return commandResult({
        status: 255,
        stderr: "ValidationError: Stack with id vasirbenchmark-production does not exist"
      });
    }
    return commandResult({ status: 2, stderr: `unexpected AWS operation: ${operation}` });
  };
  return { calls, spawnSyncImplementation };
}

function publicationEnvironment() {
  return { ...process.env, CHROME_BIN: process.execPath };
}

test("benchmark artifact is deterministic, finite, release-qualified, and inside every budget", () => {
  const first = buildBenchmarkPublicationArtifact({ repoRootDirectory: REPO_ROOT, validateAcceptance: false });
  const second = buildBenchmarkPublicationArtifact({ repoRootDirectory: REPO_ROOT, validateAcceptance: false });
  try {
    assert.match(first.releaseId, /^[a-f0-9]{64}$/);
    assert.equal(first.releaseId, second.releaseId);
    assert.equal(first.fileCount, 9);
    assert.deepEqual(first.sourceManifest, second.sourceManifest);
    assert.deepEqual(first.publicManifest, second.publicManifest);
    assert.deepEqual(first.routes.entrypoints, ["/", "/index.html", "/benchmark-report.html"]);
    assert.equal(first.routes.capabilityFragments.length, 18);
    assert.equal(new Set(first.routes.capabilityFragments).size, 18);
    assert.equal(first.routes.reportFragments.length, 24);
    assert.equal(new Set(first.routes.reportFragments).size, 24);
    assert.ok(first.files.every((file) => file.bytes <= first.config.limits.maxFileBytes));
    assert.ok(first.totalBytes <= first.config.limits.maxArtifactBytes);
    assert.ok(first.compressedLandingBytes <= first.config.limits.maxCompressedLandingBytes);

    const landing = first.files.find((file) => file.path === "index.html").body.toString("utf8");
    assert.match(landing, new RegExp(`/releases/${first.releaseId}/style\\.css`));
    assert.match(landing, new RegExp(`/releases/${first.releaseId}/assets/d3\\.v7\\.min\\.js`));
    assert.match(landing, new RegExp(`/releases/${first.releaseId}/app\\.js`));
    assert.doesNotMatch(landing, /(?:href|src)="\.\/(?:style\.css|assets\/d3\.v7\.min\.js|app\.js|data\.js)"/);
  } finally {
    first.dispose();
    second.dispose();
  }
});

test("accepted benchmark receipt fails closed with only drifted path names", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vasirbenchmark-acceptance-"));
  const copiedSiteRoot = path.join(temporaryRoot, "site", "vasirbenchmark.com");
  fs.mkdirSync(path.dirname(copiedSiteRoot), { recursive: true });
  fs.cpSync(SITE_ROOT, copiedSiteRoot, { recursive: true });
  try {
    const { config, siteRootDirectory } = readBenchmarkDeploymentConfig({ repoRootDirectory: temporaryRoot });
    validateBenchmarkAcceptance({ config, siteRootDirectory });
    fs.appendFileSync(path.join(siteRootDirectory, "index.html"), "\n<!-- acceptance drift -->\n", "utf8");
    assert.throws(
      () => validateBenchmarkAcceptance({ config, siteRootDirectory }),
      (error) => {
        assert.equal(error.code, "BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED");
        assert.deepEqual(error.context.changedPaths, ["index.html"]);
        assert.doesNotMatch(error.message, /acceptance drift/);
        return true;
      }
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("benchmark deployment config cannot substitute accepted QA files into the public boundary", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vasirbenchmark-boundary-"));
  const copiedSiteRoot = path.join(temporaryRoot, "site", "vasirbenchmark.com");
  fs.mkdirSync(path.dirname(copiedSiteRoot), { recursive: true });
  fs.cpSync(SITE_ROOT, copiedSiteRoot, { recursive: true });
  try {
    const configPath = path.join(copiedSiteRoot, "deployment.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config.publicFiles[1] = {
      path: "capture.mjs",
      contentType: "text/css; charset=utf-8",
      cacheClass: "immutable"
    };
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    assert.throws(
      () => readBenchmarkDeploymentConfig({ repoRootDirectory: temporaryRoot }),
      (error) => {
        assert.equal(error.code, "BENCHMARK_PUBLISH_CONFIG_INVALID");
        assert.match(error.message, /canonical nine-file publication contract/);
        return true;
      }
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("storage projection charges only release objects that are not already current", () => {
  const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: REPO_ROOT, validateAcceptance: false });
  try {
    const manifestBytes = Buffer.byteLength(`${JSON.stringify(artifact.publicManifest, null, 2)}\n`);
    const releaseVersions = artifact.files.map((file) => ({
      Key: `releases/${artifact.releaseId}/${file.path}`,
      Size: file.bytes,
      IsLatest: true
    }));
    const listing = {
      versions: [
        ...releaseVersions,
        { Key: `_deploy/manifests/${artifact.releaseId}.json`, Size: manifestBytes, IsLatest: true },
        { Key: "_deploy/control/publish-lock.json", Size: 211, IsLatest: true }
      ],
      deleteMarkers: []
    };
    const projection = calculateProjectedPublicationBytes({ listing, artifact });
    assert.equal(projection.candidateBytes, 0);
    assert.equal(
      projection.projectedBytes,
      artifact.totalBytes + manifestBytes + 211
    );

    listing.versions[0].IsLatest = false;
    listing.deleteMarkers.push({ Key: listing.versions[0].Key, IsLatest: true });
    const hiddenObjectProjection = calculateProjectedPublicationBytes({ listing, artifact });
    assert.equal(hiddenObjectProjection.candidateBytes, artifact.files[0].bytes);
  } finally {
    artifact.dispose();
  }
});

test("benchmark publish dry-run performs read-only AWS calls and returns the exact production plan", async () => {
  const aws = createReadOnlyAwsStub();
  const result = await publishBenchmarkSite({
    repoRootDirectory: REPO_ROOT,
    dryRun: true,
    spawnSyncImplementation: aws.spawnSyncImplementation,
    environmentVariables: publicationEnvironment(),
    platform: process.platform
  });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.subcommand, "publish");
  assert.equal(result.dryRun, true);
  assert.equal(result.target.profile, "faedark");
  assert.equal(result.target.accountId, "339713108333");
  assert.equal(result.target.url, "https://vasirbenchmark.com");
  assert.equal(result.deployment.activeReleaseId, null);
  assert.equal(result.deployment.bucketName, null);
  assert.notEqual(result.deployment.activeReleaseId, result.artifact.releaseId);
  assert.equal(result.verification.status, "planned");
  assert.deepEqual(result.actions.map(({ id }) => id), EXPECTED_ACTION_IDS);
  assert.deepEqual(result.actions.slice(0, 3).map(({ status }) => status), ["completed", "completed", "completed"]);
  assert.ok(result.actions.filter(({ mutatesAws }) => mutatesAws).every(({ status }) => status === "planned"));

  const operations = aws.calls.map((args) => `${args[0]}:${args[1]}`);
  assert.deepEqual(operations, [
    "sts:get-caller-identity",
    "route53:get-hosted-zone",
    "cloudformation:validate-template",
    "cloudformation:describe-stacks"
  ]);
  assert.ok(operations.every((operation) => !MUTATING_AWS_OPERATIONS.has(operation)));
});

test("benchmark publish rejects the wrong AWS account before any production mutation", async () => {
  const aws = createReadOnlyAwsStub({ accountId: "111111111111" });
  await assert.rejects(
    publishBenchmarkSite({
      repoRootDirectory: REPO_ROOT,
      dryRun: false,
      spawnSyncImplementation: aws.spawnSyncImplementation,
      environmentVariables: publicationEnvironment(),
      platform: process.platform
    }),
    (error) => {
      assert.equal(error.code, "BENCHMARK_PUBLISH_ACCOUNT_MISMATCH");
      assert.equal(error.context.expectedAccountId, "339713108333");
      assert.equal(error.context.actualAccountId, "111111111111");
      assert.equal(error.context.safeRetry, false);
      return true;
    }
  );
  assert.deepEqual(aws.calls.map((args) => `${args[0]}:${args[1]}`), ["sts:get-caller-identity"]);
});

test("benchmark publish JSON mode emits one stable success envelope and no progress chatter", async () => {
  const aws = createReadOnlyAwsStub();
  const stdout = [];
  const stderr = [];
  const exitCode = await runCommandLine(
    ["node", "vasir", "benchmark", "publish", "--dry-run", "--json", "--repo-root", REPO_ROOT],
    {
      currentWorkingDirectory: REPO_ROOT,
      spawnSyncImplementation: aws.spawnSyncImplementation,
      environmentVariables: publicationEnvironment(),
      stdoutWriter: (message) => stdout.push(message),
      stderrWriter: (message) => stderr.push(message)
    }
  );
  assert.equal(exitCode, 0);
  assert.equal(stderr.join(""), "");
  assert.equal(stdout.length, 1);
  const result = JSON.parse(stdout[0]);
  assert.equal(result.command, "benchmark");
  assert.equal(result.status, "success");
  assert.equal(result.subcommand, "publish");
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.actions.map(({ id }) => id), EXPECTED_ACTION_IDS);
});
