import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import zlib from "node:zlib";

import {
  buildBenchmarkPublicationArtifact,
  readBenchmarkDeploymentConfig,
  validateBenchmarkAcceptance
} from "../cli/benchmark-publication-artifact.js";
import { calculateProjectedPublicationBytes, publishBenchmarkSite } from "../cli/benchmark-publish.js";
import { runCommandLine } from "../cli/command-runner.js";
import { resolveBenchmarkConfigurations } from "../cli/eval/benchmark-models.js";
import {
  buildBenchmarkPublicationProjection,
  validateBenchmarkPublicationResponses
} from "../cli/eval/benchmark-publication-projection.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ROOT = path.join(REPO_ROOT, "site", "vasirbenchmark.com");
const WORKFLOW_SELECTED = Boolean(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "benchmarks/public-results.json"))).workSpecRun);
const EXPECTED_BENCHMARK_COUNT = 3;
const EXPECTED_CONDITION_COUNT = 2;
const EXPECTED_SETTING_COUNT = 36;
const EXPECTED_RESULT_ENTRY_COUNT = EXPECTED_SETTING_COUNT * EXPECTED_CONDITION_COUNT;
const EXPECTED_RESPONSE_COUNT = EXPECTED_RESULT_ENTRY_COUNT * EXPECTED_BENCHMARK_COUNT;
const CANONICAL_CAPTURE_RECORDS = [
  { path: "desktop.png", route: "#capabilities/overall", width: 1440, height: 1000 },
  { path: "mobile.png", route: "#capabilities/overall", width: 390, height: 844 },
  { path: "desktop-capabilities.png", route: "#capabilities/engineering", width: 1440, height: 1000 },
  { path: "mobile-capabilities.png", route: "#capabilities/engineering", width: 390, height: 844 },
  { path: "desktop-capability-benchmarks.png", route: "#capabilities/engineering/benchmarks", width: 1440, height: 1000 },
  { path: "mobile-capability-benchmarks.png", route: "#capabilities/engineering/benchmarks", width: 390, height: 844 },
  { path: "desktop-efficiency.png", route: "#capabilities/overall/efficiency", width: 1440, height: 1000 },
  { path: "mobile-efficiency.png", route: "#capabilities/overall/efficiency", width: 390, height: 844 },
  { path: "desktop-benchmark-report.png", route: "#hyper-scale-chat", width: 1440, height: 1000 },
  { path: "mobile-benchmark-report.png", route: "#hyper-scale-chat", width: 390, height: 844 }
];
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
  "cloudfront:create-invalidation",
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

function createBenchmarkFixtureRoot(temporaryRoot) {
  const fixtureRoot = path.join(temporaryRoot, "benchmarks");
  fs.mkdirSync(fixtureRoot, { recursive: true });
  for (const entry of [
    "capability-taxonomy.json",
    "public-results.json",
    "hyper-scale-chat",
    "personalized-home-feed",
    "device-telemetry",
    "work-spec-chat"
  ]) {
    const source = path.join(REPO_ROOT, "benchmarks", entry);
    fs.symlinkSync(source, path.join(fixtureRoot, entry), fs.statSync(source).isDirectory() ? "dir" : "file");
  }
}

function createPublicationRepoCopy(prefix) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const copiedSiteRoot = path.join(temporaryRoot, "site", "vasirbenchmark.com");
  fs.mkdirSync(path.dirname(copiedSiteRoot), { recursive: true });
  fs.cpSync(SITE_ROOT, copiedSiteRoot, { recursive: true });
  // This historical fixture omits Writing sources, so its navigation must reflect that selection.
  const gamesHtmlPath = path.join(copiedSiteRoot, "games.html");
  fs.writeFileSync(gamesHtmlPath, fs.readFileSync(gamesHtmlPath, "utf8").replace(
    '<a class="game-capabilities__link" href="./index.html#capabilities/writing">Writing</a>',
    '<span class="game-capabilities__unavailable">Writing <small>Coming soon</small></span>'
  ), "utf8");
  createBenchmarkFixtureRoot(temporaryRoot);
  fs.mkdirSync(path.join(temporaryRoot, ".agents"), { recursive: true });
  fs.symlinkSync(path.join(REPO_ROOT, ".agents", "vasir-evals"), path.join(temporaryRoot, ".agents", "vasir-evals"), "dir");
  fs.symlinkSync(path.join(REPO_ROOT, "tmp"), path.join(temporaryRoot, "tmp"), "dir");
  const configPath = path.join(copiedSiteRoot, "deployment.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const lockPath = path.join(copiedSiteRoot, "template-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const acceptedPaths = [
    ...config.publicFiles.map((file) => file.path).filter((filePath) => !["data.js", "responses.js", "writing-data.js", "writing-responses.js", "writing-creation-responses.js"].includes(filePath)),
    "capture.mjs",
    "capture.sh",
    "games-browsercheck.mjs",
    "writing-browsercheck.mjs"
  ];
  lock.files = acceptedPaths.map((relativePath) => {
    const contents = fs.readFileSync(path.join(copiedSiteRoot, relativePath));
    return {
      path: relativePath,
      role: "test-fixture",
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      bytes: contents.length
    };
  });
  lock.captures = CANONICAL_CAPTURE_RECORDS.map((record) => {
    const contents = fs.readFileSync(path.join(copiedSiteRoot, record.path));
    return {
      ...record,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      bytes: contents.length
    };
  });
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return { temporaryRoot, copiedSiteRoot };
}

test("public Engineering cohort preserves selected historical evidence while remaining registered", () => {
  const registeredConfigurationIds = resolveBenchmarkConfigurations().map(({ id }) => id);
  const { projection } = buildBenchmarkPublicationProjection({ repoRootDirectory: REPO_ROOT });
  const publicConfigurationIds = projection.settings.map(({ configurationId }) => configurationId);
  assert.equal(publicConfigurationIds.length, EXPECTED_SETTING_COUNT);
  assert.equal(new Set(publicConfigurationIds).size, EXPECTED_SETTING_COUNT);
  assert.ok(publicConfigurationIds.every((id) => registeredConfigurationIds.includes(id)));
  assert.ok(registeredConfigurationIds.includes("claude:claude-fable-5-1@low"));
  assert.ok(!publicConfigurationIds.includes("claude:claude-fable-5-1@low"),
    "Newly advertised reasoning settings do not retroactively enter frozen Engineering evidence");
  assert.deepEqual(
    publicConfigurationIds.filter((configurationId) => (
      configurationId.startsWith("claude:claude-fable-5-1@")
    )).sort(),
    [
      "claude:claude-fable-5-1@xhigh",
      "claude:claude-fable-5-1@max",
      "claude:claude-fable-5-1@ultracode"
    ].sort()
  );
});

test("benchmark artifact is deterministic, finite, release-qualified, and inside every budget", () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-artifact-");
  const first = buildBenchmarkPublicationArtifact({ repoRootDirectory: temporaryRoot, validateAcceptance: false });
  const second = buildBenchmarkPublicationArtifact({ repoRootDirectory: temporaryRoot, validateAcceptance: false });
  try {
    assert.match(first.releaseId, /^[a-f0-9]{64}$/);
    assert.equal(first.releaseId, second.releaseId);
    assert.equal(first.fileCount, 16);
    assert.deepEqual(first.sourceManifest, second.sourceManifest);
    assert.deepEqual(first.publicManifest, second.publicManifest);
    assert.deepEqual(first.routes.entrypoints, ["/", "/index.html", "/benchmark-report.html"]);
    assert.deepEqual(first.routes.familyFragments, [
      "/#capabilities/overall",
      "/#capabilities/engineering",
      ...(WORKFLOW_SELECTED ? ["/#capabilities/ai-workflows"] : [])
    ]);
    assert.deepEqual(first.routes.viewFragments, [
      "/#capabilities/overall/benchmarks",
      "/#capabilities/overall/efficiency",
      "/#capabilities/engineering/benchmarks",
      "/#capabilities/engineering/efficiency",
      ...(WORKFLOW_SELECTED ? ["/#capabilities/ai-workflows/benchmarks", "/#capabilities/ai-workflows/efficiency"] : [])
    ]);
    assert.equal(first.routes.reportFragments.length, WORKFLOW_SELECTED ? 4 : 3);
    assert.equal(new Set(first.routes.reportFragments).size, WORKFLOW_SELECTED ? 4 : 3);
    assert.deepEqual(first.projection, {
      basisSha256: first.projection.basisSha256,
      developmentResultSetCount: WORKFLOW_SELECTED ? 4 : 3,
      eligibleResultSetCount: 0,
      withheldResultSetCount: 0,
      familyCount: WORKFLOW_SELECTED ? 2 : 1,
      trackCount: WORKFLOW_SELECTED ? 2 : 1,
      benchmarkDefinitionCount: EXPECTED_BENCHMARK_COUNT + (WORKFLOW_SELECTED ? 1 : 0),
      categoryCount: WORKFLOW_SELECTED ? 2 : 1,
      conditionCount: EXPECTED_CONDITION_COUNT,
      settingCount: EXPECTED_SETTING_COUNT,
      resultEntryCount: EXPECTED_RESULT_ENTRY_COUNT + (WORKFLOW_SELECTED ? 52 : 0),
      responseCount: EXPECTED_RESPONSE_COUNT + (WORKFLOW_SELECTED ? 52 : 0)
    }, "publication coverage counts original result sets; derived Overall rows are not new evidence");
    assert.match(first.projection.basisSha256, /^[a-f0-9]{64}$/);
    assert.ok(first.files.every((file) => file.bytes <= (file.path === "responses.js" ? first.config.limits.maxResponseFileBytes : first.config.limits.maxFileBytes)));
    assert.ok(first.totalBytes <= first.config.limits.maxArtifactBytes);
    assert.ok(first.compressedLandingBytes <= first.config.limits.maxCompressedLandingBytes);
    assert.equal(first.config.limits.maxFileBytes, 2 * 1024 * 1024);
    assert.equal(first.config.limits.maxResponseFileBytes, 8 * 1024 * 1024);
    assert.equal(first.config.limits.maxArtifactBytes, 24 * 1024 * 1024);
    const landingDependencyPaths = new Set([
      "index.html",
      "style.css",
      "assets/d3.v7.min.js",
      "app.js",
      "data.js",
      "assets/kanit-latin-900-normal.woff2"
    ]);
    const recomputedLandingBytes = first.files
      .filter((file) => landingDependencyPaths.has(file.path))
      .reduce((total, file) => total + zlib.gzipSync(file.body, { level: 9 }).length, 0);
    assert.equal(first.compressedLandingBytes, recomputedLandingBytes);

    const responseFile = first.files.find((file) => file.path === "responses.js");
    assert.ok(responseFile);
    assert.equal(responseFile.contentType, "text/javascript; charset=utf-8");
    assert.equal(responseFile.cacheClass, "immutable");
    assert.equal(responseFile.cacheControl, "public, max-age=31536000, immutable");
    const responseSandbox = { window: {} };
    vm.runInNewContext(responseFile.body.toString("utf8"), responseSandbox);
    const publicResponses = JSON.parse(JSON.stringify(responseSandbox.window.VASIR_RESPONSES));
    const dataFile = first.files.find((file) => file.path === "data.js");
    const dataSandbox = { window: {} };
    vm.runInNewContext(dataFile.body.toString("utf8"), dataSandbox);
    const publicData = JSON.parse(JSON.stringify(dataSandbox.window.VASIR_DATA));
    validateBenchmarkPublicationResponses(publicResponses, publicData);
    assert.equal(publicData.schemaVersion, WORKFLOW_SELECTED ? 4 : 2);
    assert.equal(publicResponses.schemaVersion, WORKFLOW_SELECTED ? 3 : 2);
    if (WORKFLOW_SELECTED) {
      assert.ok(publicData.overall, "the published Overall view includes every selected benchmark");
      assert.equal(publicResponses.aiWorkflows.counts.responses, 52);
      assert.equal(publicResponses.aiWorkflows.counts.judgments, 104);
    }
    assert.equal(
      responseFile.body.toString("utf8"),
      fs.readFileSync(path.join(SITE_ROOT, "responses.js"), "utf8"),
      "publishing a derived Overall score preserves the canonical model responses and judgments byte-for-byte"
    );
    assert.deepEqual(publicResponses.counts, {
      benchmarks: 3,
      settings: 36,
      conditions: 2,
      responses: 216,
      messageSets: 12,
      judgments: 432
    });
    assert.equal(publicResponses.responses.length, EXPECTED_RESPONSE_COUNT);
    assert.equal(
      publicResponses.responses.reduce((total, response) => total + response.judgments.length, 0),
      432
    );
    assert.ok(publicResponses.messageSets.length < publicResponses.responses.length);
    assert.doesNotMatch(dataFile.body.toString("utf8"), /VASIR_RESPONSES|"outputText"|"exactMessages"/);
    assert.doesNotMatch(responseFile.body.toString("utf8"), /"(?:reviewerId|evaluationHash|promptText|runtimeReceipt|costUsd|usage)"\s*:/);

    const landing = first.files.find((file) => file.path === "index.html").body.toString("utf8");
    const report = first.files.find((file) => file.path === "benchmark-report.html").body.toString("utf8");
    assert.match(landing, new RegExp(`/releases/${first.releaseId}/style\\.css`));
    assert.match(landing, new RegExp(`/releases/${first.releaseId}/app\\.js`));
    assert.match(landing, /<link rel="icon" href="data:,">/);
    assert.match(report, /<link rel="icon" href="data:,">/);
    assert.match(report, new RegExp(`/releases/${first.releaseId}/benchmark-report\\.js`));
    assert.doesNotMatch(report, /src="[^"]*\/responses\.js"/);
    const reportRuntime = first.files.find((file) => file.path === "benchmark-report.js").body.toString("utf8");
    for (const [benchmarkId, expectedResources] of [
      ["hyper-scale-chat", ["responses.js"]],
      ["storytelling-core-idea", ["writing-data.js", "writing-responses.js"]]
    ]) {
      const requestedUrls = [];
      vm.runInNewContext(reportRuntime, {
        window: {
          VASIR_DATA: { ...publicData, writing: { benchmarkId: "storytelling-core-idea" } },
          location: { href: "https://vasirbenchmark.com/benchmark-report.html", hash: `#${benchmarkId}` }
        },
        document: {
          currentScript: { src: `https://vasirbenchmark.com/releases/${first.releaseId}/benchmark-report.js` },
          createElement: () => ({}),
          head: { append: (script) => requestedUrls.push(script.src) }
        },
        URL
      });
      assert.deepEqual(requestedUrls, expectedResources.map((resource) =>
        `https://vasirbenchmark.com/releases/${first.releaseId}/${resource}`
      ), "lazy response modules stay bound to the active release and requested benchmark family");
    }
    assert.doesNotMatch(landing, /responses\.js/);
    assert.doesNotMatch(landing, /(?:href|src)="\.\/(?:style\.css|assets\/d3\.v7\.min\.js|app\.js|data\.js)"/);
  } finally {
    first.dispose();
    second.dispose();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("artifact inspection accepts lowercase users API routes while retaining private Mac home rejection", () => {
  const { temporaryRoot, copiedSiteRoot } = createPublicationRepoCopy("vasirbenchmark-api-path-");
  let artifact;
  try {
    const appPath = path.join(copiedSiteRoot, "app.js");
    const source = fs.readFileSync(appPath, "utf8");
    fs.writeFileSync(appPath, `${source}\n// Example API routes: /users/me and /users/lookup?handle=friend\n`);
    artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: temporaryRoot, validateAcceptance: false });
    assert.ok(artifact.files.some(file => file.path === "app.js"));
    fs.writeFileSync(appPath, `${source}\n// Private source: /Users/private-user/code/work-spec.md\n`);
    assert.throws(() => buildBenchmarkPublicationArtifact({ repoRootDirectory: temporaryRoot, validateAcceptance: false }), /local benchmark-evidence path/);
  } finally {
    if (artifact) fs.rmSync(artifact.temporaryDirectory, { recursive: true, force: true });
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("accepted benchmark receipt fails closed with only drifted path names", () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-acceptance-");
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
        assert.match(error.message, /canonical sixteen-file publication contract/);
        return true;
      }
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("storage projection charges only release objects that are not already current", () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-storage-");
  const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: temporaryRoot, validateAcceptance: false });
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
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("benchmark publish dry-run performs read-only AWS calls and returns the exact production plan", async () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-dry-run-");
  const aws = createReadOnlyAwsStub();
  let result;
  try {
    result = await publishBenchmarkSite({
      repoRootDirectory: temporaryRoot,
      dryRun: true,
      spawnSyncImplementation: aws.spawnSyncImplementation,
      environmentVariables: publicationEnvironment(),
      platform: process.platform
    });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }

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
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-account-");
  const aws = createReadOnlyAwsStub({ accountId: "111111111111" });
  try {
    await assert.rejects(
      publishBenchmarkSite({
        repoRootDirectory: temporaryRoot,
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
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  assert.deepEqual(aws.calls.map((args) => `${args[0]}:${args[1]}`), ["sts:get-caller-identity"]);
});

test("benchmark publish JSON mode emits one stable success envelope and no progress chatter", async () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-json-");
  const aws = createReadOnlyAwsStub();
  const stdout = [];
  const stderr = [];
  let exitCode;
  try {
    exitCode = await runCommandLine(
      ["node", "vasir", "benchmark", "publish", "--dry-run", "--json", "--repo-root", temporaryRoot],
      {
        currentWorkingDirectory: REPO_ROOT,
        spawnSyncImplementation: aws.spawnSyncImplementation,
        environmentVariables: publicationEnvironment(),
        stdoutWriter: (message) => stdout.push(message),
        stderrWriter: (message) => stderr.push(message)
      }
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
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

test("benchmark publish --full-audit reaches the publisher through CLI parsing", async () => {
  const { temporaryRoot } = createPublicationRepoCopy("vasirbenchmark-full-audit-");
  const aws = createReadOnlyAwsStub();
  const stdout = [];
  const stderr = [];
  try {
    const exitCode = await runCommandLine(
      ["node", "vasir", "benchmark", "publish", "--full-audit", "--dry-run", "--json", "--repo-root", temporaryRoot],
      {
        currentWorkingDirectory: REPO_ROOT,
        spawnSyncImplementation: aws.spawnSyncImplementation,
        environmentVariables: publicationEnvironment(),
        stdoutWriter: (message) => stdout.push(message),
        stderrWriter: (message) => stderr.push(message)
      }
    );
    assert.equal(exitCode, 0, stderr.join(""));
    assert.equal(JSON.parse(stdout.join("")).verification.mode, "full-audit");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
