import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { publishBenchmarkSite } from "../cli/benchmark-publish.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACCOUNT_ID = "339713108333";
const REGION = "us-east-1";
const DOMAIN = "vasirbenchmark.com";
const BUCKET_NAME = "vasirbenchmark-production-339713108333";
const STACK_NAME = "vasirbenchmark-production";
const FUNCTION_NAME = "vasirbenchmark-production-release-router";
const FUNCTION_ARN = `arn:aws:cloudfront::${ACCOUNT_ID}:function/${FUNCTION_NAME}`;
const LOCK_KEY = "_deploy/control/publish-lock.json";
const PUBLICATION_STATE_KEY = "_deploy/control/publication-state.json";
const FIXED_NOW = Date.parse("2026-08-29T16:00:00.000Z");
const CANONICAL_CAPTURE_PATHS = [
  "desktop.png",
  "mobile.png",
  "desktop-capabilities.png",
  "mobile-capabilities.png",
  "desktop-capability-benchmarks.png",
  "mobile-capability-benchmarks.png",
  "desktop-efficiency.png",
  "mobile-efficiency.png",
  "desktop-benchmark-report.png",
  "mobile-benchmark-report.png"
];

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

function createPublicationRepoFixture() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vasirbenchmark-state-machine-"));
  const sourceSiteRoot = path.join(REPO_ROOT, "site", "vasirbenchmark.com");
  const siteRoot = path.join(temporaryRoot, "site", "vasirbenchmark.com");
  fs.mkdirSync(path.dirname(siteRoot), { recursive: true });
  fs.cpSync(sourceSiteRoot, siteRoot, { recursive: true });
  createBenchmarkFixtureRoot(temporaryRoot);
  fs.mkdirSync(path.join(temporaryRoot, ".agents"), { recursive: true });
  fs.symlinkSync(path.join(REPO_ROOT, ".agents", "vasir-evals"), path.join(temporaryRoot, ".agents", "vasir-evals"), "dir");
  fs.symlinkSync(path.join(REPO_ROOT, "tmp"), path.join(temporaryRoot, "tmp"), "dir");

  const config = JSON.parse(fs.readFileSync(path.join(siteRoot, "deployment.json"), "utf8"));

  const lockPath = path.join(siteRoot, "template-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const acceptedPaths = [
    ...config.publicFiles.map((file) => file.path).filter((filePath) => !["data.js", "responses.js"].includes(filePath)),
    "capture.mjs",
    "capture.sh"
  ];
  lock.files = acceptedPaths.map((relativePath) => {
    const contents = fs.readFileSync(path.join(siteRoot, relativePath));
    return {
      path: relativePath,
      role: "test-fixture",
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      bytes: contents.length
    };
  });
  lock.captures = CANONICAL_CAPTURE_PATHS.map((relativePath) => {
    const contents = fs.readFileSync(path.join(siteRoot, relativePath));
    return {
      path: relativePath,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      bytes: contents.length
    };
  });
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return temporaryRoot;
}

function optionValue(args, optionName) {
  const optionIndex = args.indexOf(optionName);
  return optionIndex === -1 ? null : args[optionIndex + 1];
}

function success(value = {}) {
  return {
    status: 0,
    stdout: typeof value === "string" ? value : JSON.stringify(value),
    stderr: "",
    error: null
  };
}

function failure(message, status = 255) {
  return { status, stdout: "", stderr: message, error: null };
}

function createAwsPublicationFake() {
  let stack = null;
  let nextEtag = 1;
  let nextVersion = 1;
  const currentObjects = new Map();
  const versions = [];
  const deleteMarkers = [];
  const putCountByKey = new Map();
  const conditionalWrites = [];
  const conditionalDeletes = [];
  const browserCalls = [];
  const browserTimeouts = [];
  const invalidationCalls = [];

  function stackDocument(activeReleaseId, status) {
    return {
      StackName: STACK_NAME,
      StackStatus: status,
      Parameters: [
        { ParameterKey: "DomainName", ParameterValue: DOMAIN },
        { ParameterKey: "HostedZoneId", ParameterValue: "Z08966383N3FDP7DJ59WU" },
        { ParameterKey: "BucketName", ParameterValue: BUCKET_NAME },
        { ParameterKey: "ActiveReleaseId", ParameterValue: activeReleaseId }
      ],
      Outputs: [
        { OutputKey: "BucketName", OutputValue: BUCKET_NAME },
        { OutputKey: "DistributionId", OutputValue: "E2VASIRBENCH" },
        { OutputKey: "ReleaseRouterFunctionName", OutputValue: FUNCTION_ARN },
        { OutputKey: "ActiveReleaseId", OutputValue: activeReleaseId }
      ]
    };
  }

  function writeObject({ key, body, checksumSha256, ifMatch, ifNoneMatch }) {
    const current = currentObjects.get(key) ?? null;
    conditionalWrites.push({ key, ifMatch, ifNoneMatch });
    if (ifNoneMatch === "*" && current) return failure("PreconditionFailed: 412");
    if (ifMatch !== null && current?.etag !== ifMatch) return failure("PreconditionFailed: 412");

    const etag = `\"etag-${nextEtag}\"`;
    const versionId = `version-${nextVersion}`;
    nextEtag += 1;
    nextVersion += 1;
    const storedObject = { body, checksumSha256, etag, versionId };
    currentObjects.set(key, storedObject);
    versions.push({
      Key: key,
      VersionId: versionId,
      LastModified: new Date(FIXED_NOW).toISOString(),
      Size: body.length
    });
    putCountByKey.set(key, (putCountByKey.get(key) ?? 0) + 1);
    return success({ ETag: etag, VersionId: versionId, ChecksumSHA256: checksumSha256 });
  }

  function handleS3(args) {
    const operation = args[1];
    const key = optionValue(args, "--key");
    if (operation === "head-object") {
      const object = currentObjects.get(key);
      if (!object) return failure("An error occurred (404) when calling HeadObject");
      return success({
        ContentLength: object.body.length,
        ChecksumSHA256: object.checksumSha256,
        ETag: object.etag,
        VersionId: object.versionId
      });
    }

    if (operation === "get-object") {
      const object = currentObjects.get(key);
      if (!object) return failure("NoSuchKey: 404");
      fs.writeFileSync(args.at(-1), object.body);
      return success({ ETag: object.etag, VersionId: object.versionId });
    }

    if (operation === "put-object") {
      return writeObject({
        key,
        body: fs.readFileSync(optionValue(args, "--body")),
        checksumSha256: optionValue(args, "--checksum-sha256"),
        ifMatch: optionValue(args, "--if-match"),
        ifNoneMatch: optionValue(args, "--if-none-match")
      });
    }

    if (operation === "delete-object") {
      const current = currentObjects.get(key) ?? null;
      const ifMatch = optionValue(args, "--if-match");
      conditionalDeletes.push({ key, ifMatch });
      if (!current || current.etag !== ifMatch) return failure("PreconditionFailed: 412");
      currentObjects.delete(key);
      deleteMarkers.push({
        Key: key,
        VersionId: `version-${nextVersion}`,
        LastModified: new Date(FIXED_NOW).toISOString()
      });
      nextVersion += 1;
      return success({});
    }

    if (operation === "list-object-versions") {
      return success({ Versions: versions, DeleteMarkers: deleteMarkers });
    }

    if (operation === "delete-objects") {
      return failure("Unexpected release cleanup in a fresh deterministic publication test", 2);
    }

    return failure(`Unexpected S3 operation: ${operation}`, 2);
  }

  function handleCloudFormation(args) {
    const operation = args[1];
    if (operation === "validate-template") return success({ Parameters: [] });
    if (operation === "describe-stacks") {
      if (!stack) return failure(`ValidationError: Stack with id ${STACK_NAME} does not exist`);
      return success({ Stacks: [stack] });
    }
    if (operation === "deploy") {
      const activeOverride = args.find((argument) => argument.startsWith("ActiveReleaseId="));
      assert.ok(activeOverride, "CloudFormation deploy must declare ActiveReleaseId");
      const activeReleaseId = activeOverride.slice("ActiveReleaseId=".length);
      stack = stackDocument(activeReleaseId, stack ? "UPDATE_COMPLETE" : "CREATE_COMPLETE");
      return success("");
    }
    return failure(`Unexpected CloudFormation operation: ${operation}`, 2);
  }

  function spawnSyncImplementation(command, args, options = {}) {
    if (command === process.execPath) {
      browserCalls.push(args);
      browserTimeouts.push(options.timeout);
      return success("");
    }
    if (command !== "aws") return failure(`Unexpected executable: ${command}`, 127);
    if (args.length === 1 && args[0] === "--version") return success("aws-cli/2.36.23\n");

    const service = args[0];
    if (service === "sts" && args[1] === "get-caller-identity") {
      return success({ Account: ACCOUNT_ID, Arn: `arn:aws:iam::${ACCOUNT_ID}:user/test` });
    }
    if (service === "route53" && args[1] === "get-hosted-zone") {
      return success({ HostedZone: { Name: `${DOMAIN}.` } });
    }
    if (service === "cloudformation") return handleCloudFormation(args);
    if (service === "s3api") return handleS3(args);
    if (service === "cloudfront") {
      if (args[1] === "describe-function") {
        assert.equal(optionValue(args, "--name"), FUNCTION_NAME);
        return success({
          FunctionSummary: {
            Name: FUNCTION_NAME,
            Status: "DEPLOYED",
            FunctionMetadata: { Stage: "LIVE" }
          }
        });
      }
      if (args[1] === "create-invalidation") {
        assert.equal(optionValue(args, "--distribution-id"), "E2VASIRBENCH");
        const pathsIndex = args.indexOf("--paths");
        const paths = args.slice(pathsIndex + 1, pathsIndex + 4);
        invalidationCalls.push({ operation: "create", paths });
        return success({ Invalidation: { Id: `I${invalidationCalls.length}`, Status: "InProgress" } });
      }
      if (args[1] === "wait" && args[2] === "invalidation-completed") {
        invalidationCalls.push({
          operation: "wait",
          id: optionValue(args, "--id"),
          distributionId: optionValue(args, "--distribution-id")
        });
        return success("");
      }
    }
    return failure(`Unexpected AWS operation: ${service}:${args[1]}`, 2);
  }

  function response(body, status = 200, headers = {}) {
    return new Response(body, { status, headers });
  }

  async function fetchImplementation(url) {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === "http:") {
      return response(null, 301, { location: `https://${DOMAIN}/` });
    }
    if (parsedUrl.hostname === `${BUCKET_NAME}.s3.${REGION}.amazonaws.com`) {
      return response("Access denied", 403);
    }
    assert.equal(parsedUrl.hostname, DOMAIN);
    if (parsedUrl.pathname === `/${PUBLICATION_STATE_KEY}`) return response("Access denied", 403);

    let key;
    if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
      key = `releases/${stack.Parameters.find(({ ParameterKey }) => ParameterKey === "ActiveReleaseId").ParameterValue}/index.html`;
    } else if (parsedUrl.pathname === "/benchmark-report.html") {
      key = `releases/${stack.Parameters.find(({ ParameterKey }) => ParameterKey === "ActiveReleaseId").ParameterValue}/benchmark-report.html`;
    } else {
      key = parsedUrl.pathname.slice(1);
    }
    const object = currentObjects.get(key);
    if (!object) return response("Not found", 404);
    return response(object.body, 200, {
      "content-security-policy": "default-src 'none'; connect-src 'none'; frame-ancestors 'none'; script-src 'self'",
      "strict-transport-security": "max-age=31536000",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=()"
    });
  }

  return {
    spawnSyncImplementation,
    fetchImplementation,
    browserCalls,
    browserTimeouts,
    invalidationCalls,
    conditionalWrites,
    conditionalDeletes,
    putCountByKey,
    currentObjectJson(key) {
      const object = currentObjects.get(key);
      return object ? JSON.parse(object.body.toString("utf8")) : null;
    }
  };
}

test("first publication and an identical repeat reuse one immutable release through lease and state CAS", async (context) => {
  const publicationRepoRoot = createPublicationRepoFixture();
  context.after(() => fs.rmSync(publicationRepoRoot, { recursive: true, force: true }));
  const aws = createAwsPublicationFake();
  const publish = () => publishBenchmarkSite({
    repoRootDirectory: publicationRepoRoot,
    spawnSyncImplementation: aws.spawnSyncImplementation,
    environmentVariables: { ...process.env, CHROME_BIN: process.execPath },
    platform: process.platform,
    fetchImplementation: aws.fetchImplementation,
    delayImplementation: async () => {},
    now: () => FIXED_NOW
  });

  const first = await publish();
  assert.equal(first.dryRun, false);
  assert.equal(first.verification.status, "passed");
  assert.equal(first.deployment.previousVerifiedReleaseId, null);
  assert.equal(first.deployment.activeReleaseId, first.artifact.releaseId);
  assert.equal(first.deployment.functionName, FUNCTION_NAME);
  assert.equal(first.deployment.rollback.status, "not-needed");

  const releasePrefix = `releases/${first.artifact.releaseId}/`;
  const immutableKeys = first.artifact.files.map(({ path: relativePath }) => `${releasePrefix}${relativePath}`);
  assert.ok(immutableKeys.every((key) => aws.putCountByKey.get(key) === 1));
  assert.equal(aws.putCountByKey.get(`_deploy/manifests/${first.artifact.releaseId}.json`), 1);
  const firstPublicationState = aws.currentObjectJson(PUBLICATION_STATE_KEY);
  assert.match(firstPublicationState.publisherOwnerId, /^[a-f0-9-]{36}$/);
  assert.deepEqual({ ...firstPublicationState, publisherOwnerId: "<owner>" }, {
    kind: "vasirbenchmark-publication-state",
    schemaVersion: 1,
    status: "verified",
    candidateReleaseId: first.artifact.releaseId,
    previousActiveReleaseId: "bootstrap",
    lastVerifiedReleaseId: first.artifact.releaseId,
    previousVerifiedReleaseId: null,
    publisherOwnerId: "<owner>",
    stagedAt: new Date(FIXED_NOW).toISOString(),
    verifiedAt: new Date(FIXED_NOW).toISOString()
  });

  const second = await publish();
  assert.equal(second.artifact.releaseId, first.artifact.releaseId);
  assert.equal(second.verification.status, "passed");
  assert.equal(second.deployment.previousVerifiedReleaseId, first.artifact.releaseId);
  assert.equal(second.deployment.activeReleaseId, first.artifact.releaseId);
  assert.ok(immutableKeys.every((key) => aws.putCountByKey.get(key) === 1));
  assert.equal(aws.putCountByKey.get(`_deploy/manifests/${first.artifact.releaseId}.json`), 1);

  const publicationState = aws.currentObjectJson(PUBLICATION_STATE_KEY);
  assert.equal(publicationState.status, "verified");
  assert.equal(publicationState.lastVerifiedReleaseId, first.artifact.releaseId);
  assert.equal(publicationState.previousVerifiedReleaseId, first.artifact.releaseId);

  const stateWrites = aws.conditionalWrites.filter(({ key }) => key === PUBLICATION_STATE_KEY);
  assert.equal(stateWrites.length, 4);
  assert.equal(stateWrites[0].ifNoneMatch, "*");
  assert.ok(stateWrites.slice(1).every(({ ifMatch }) => /^\"etag-\d+\"$/.test(ifMatch)));

  const leaseWrites = aws.conditionalWrites.filter(({ key }) => key === LOCK_KEY);
  assert.equal(leaseWrites.length, 6);
  assert.deepEqual(leaseWrites.filter(({ ifNoneMatch }) => ifNoneMatch === "*").length, 2);
  assert.ok(leaseWrites.filter(({ ifMatch }) => ifMatch !== null).every(({ ifMatch }) => /^\"etag-\d+\"$/.test(ifMatch)));
  assert.equal(aws.conditionalDeletes.length, 2);
  assert.ok(aws.conditionalDeletes.every(({ key, ifMatch }) => key === LOCK_KEY && /^\"etag-\d+\"$/.test(ifMatch)));
  const workflowPublished = first.artifact.routes.familyFragments.includes("/#capabilities/ai-workflows");
  assert.equal(aws.browserCalls.length, workflowPublished ? 28 : 12);
  assert.deepEqual(
    aws.browserCalls.filter(args => args.at(-1) === "capabilities").map(args => args.slice(-3, -1).join("x")).sort(),
    ["1440x1000", "1440x1000", "390x844", "390x844"],
    "Engineering receives its own desktop and mobile proof on both publications"
  );
  assert.ok(aws.browserTimeouts.every(timeout => timeout === 75 * 1000), "adding Overall retains the existing timeout per browser proof");
  const leaseLimits = JSON.parse(fs.readFileSync(path.join(publicationRepoRoot, "site/vasirbenchmark.com/deployment.json"))).limits;
  const browserBudgetMs = aws.browserTimeouts.reduce((sum, timeout) => sum + timeout, 0) / 2;
  assert.equal(leaseLimits.maxLeaseHeldMinutes, 75, "Overall keeps the existing publication lease ceiling");
  assert.ok(browserBudgetMs < leaseLimits.maxLeaseHeldMinutes * 60_000, "both viewport checks per live view fit within the unchanged lease ceiling");
  if (workflowPublished) {
    for (const target of ["workflows", "workflow-benchmarks", "workflow-efficiency", "workflow-report"]) {
      assert.equal(aws.browserCalls.filter(args => args.at(-1) === target).length, 4, `${target} receives desktop and mobile proof on both publications`);
    }
  }
  assert.deepEqual(aws.invalidationCalls, [
    { operation: "create", paths: ["/", "/index.html", "/benchmark-report.html"] },
    { operation: "wait", id: "I1", distributionId: "E2VASIRBENCH" },
    { operation: "create", paths: ["/", "/index.html", "/benchmark-report.html"] },
    { operation: "wait", id: "I3", distributionId: "E2VASIRBENCH" }
  ]);
});
