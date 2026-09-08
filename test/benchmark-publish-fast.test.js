import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { publishBenchmarkSite } from "../cli/benchmark-publish.js";
import { GAME_ARTIFACT_ORIGIN } from "../cli/eval/games-publication.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "site/vasirbenchmark.com/deployment.json"), "utf8"));
const PRIOR_RELEASE = "a".repeat(64);
const CANDIDATE_RELEASE = "b".repeat(64);
const LOCK_KEY = "_deploy/control/publish-lock.json";
const STATE_KEY = "_deploy/control/publication-state.json";
const NOW = Date.parse("2026-09-07T12:00:00Z");
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const HTML_CACHE = "public, max-age=0, s-maxage=31536000, must-revalidate";
const digest = (body) => crypto.createHash("sha256").update(body).digest("hex");
const success = (value = {}) => ({ status: 0, stdout: JSON.stringify(value), stderr: "" });
const failure = (message) => ({ status: 255, stdout: "", stderr: message });
const option = (args, name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const manifestFile = ({ path: filePath, bytes, sha256, contentType, cacheControl }) => ({ path: filePath, bytes, sha256, contentType, cacheControl });
const manifestArtifact = ({ key, publicUrl, bytes, sha256, contentType, cacheControl }) => ({ key, publicUrl, bytes, sha256, contentType, cacheControl });

// Exercise the publisher state machine without reading or rebuilding production
// artifacts. Every process, AWS response, and HTTP body belongs to this fixture.
function createFixture(context, { artifactCount = 527, changedArtifact = false } = {}) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasir-publish-fast-"));
  context.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const config = structuredClone(CONFIG);
  const remote = new Map();
  const awsCalls = [];
  const browserCalls = [];
  const httpCalls = [];
  const deploys = [];
  const delays = [];
  const hooks = {};
  let activeReleaseId = PRIOR_RELEASE;
  let sequence = 0;
  let activeRequests = 0;
  let peakRequests = 0;

  function makeFile(filePath, bodyText, contentType, cacheControl = IMMUTABLE_CACHE) {
    const body = Buffer.from(bodyText);
    const outputPath = path.join(temporaryDirectory, "local", filePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, body);
    const sha256 = digest(body);
    return { path: filePath, body, outputPath, bytes: body.length, sha256, checksumSha256Base64: Buffer.from(sha256, "hex").toString("base64"), contentType, cacheControl };
  }

  const files = config.publicFiles.map((file) => makeFile(
    file.path, `VasirBench candidate ${file.path}`, file.contentType,
    file.cacheClass === "html" ? HTML_CACHE : IMMUTABLE_CACHE
  ));
  const priorFiles = files.map((file) => {
    const body = Buffer.from(`VasirBench previous ${file.path}`);
    return { ...file, body, bytes: body.length, sha256: digest(body), checksumSha256Base64: crypto.createHash("sha256").update(body).digest("base64") };
  });
  const priorArtifacts = Array.from({ length: artifactCount }, (_, index) => {
    const file = makeFile(`game-${index}/${index === 0 ? "index.html" : "data.bin"}`, `game artifact ${index}`, index === 0 ? "text/html; charset=utf-8" : "application/octet-stream");
    const key = `artifacts/${file.sha256}/${file.path}`;
    return { ...file, key, publicUrl: `${GAME_ARTIFACT_ORIGIN}/${key}` };
  });
  const artifactFiles = [...priorArtifacts];
  if (changedArtifact) {
    const file = makeFile("changed/data.bin", "new game artifact", "application/octet-stream");
    const key = `artifacts/${file.sha256}/${file.path}`;
    artifactFiles[artifactFiles.length - 1] = { ...file, key, publicUrl: `${GAME_ARTIFACT_ORIGIN}/${key}` };
  }
  const routes = { entrypoints: ["/", "/benchmark-report.html", "/games.html"], familyFragments: [], viewFragments: [], reportFragments: ["#report"] };
  const priorManifest = { kind: "vasirbenchmark-release-manifest", schemaVersion: 1, releaseId: PRIOR_RELEASE, files: priorFiles.map(manifestFile), artifacts: priorArtifacts.map(manifestArtifact), artifactOrigin: GAME_ARTIFACT_ORIGIN, routes };
  const publicManifest = { ...priorManifest, releaseId: CANDIDATE_RELEASE, files: files.map(manifestFile), artifacts: artifactFiles.map(manifestArtifact) };
  const artifact = {
    config, temporaryDirectory, siteRootDirectory: temporaryDirectory,
    templatePath: path.join(temporaryDirectory, "production.yml"),
    releaseId: CANDIDATE_RELEASE, publicManifest, files, artifactFiles, routes,
    fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    artifactTotalBytes: artifactFiles.reduce((sum, file) => sum + file.bytes, 0),
    compressedLandingBytes: 0, projection: {}, dispose() {}
  };

  function store(key, { body, checksumSha256Base64, contentType = "application/json; charset=utf-8", cacheControl = "no-store" }) {
    sequence += 1;
    const object = { body, checksumSha256Base64: checksumSha256Base64 ?? crypto.createHash("sha256").update(body).digest("base64"), contentType, cacheControl, etag: `"etag-${sequence}"`, versionId: `v${sequence}` };
    remote.set(key, object);
    return object;
  }
  function storeJson(key, value) { return store(key, { body: Buffer.from(JSON.stringify(value)) }); }
  for (const file of priorFiles) store(`releases/${PRIOR_RELEASE}/${file.path}`, file);
  for (const file of priorArtifacts) store(file.key, file);
  storeJson(`_deploy/manifests/${PRIOR_RELEASE}.json`, priorManifest);
  storeJson(STATE_KEY, { kind: "vasirbenchmark-publication-state", schemaVersion: 1, status: "verified", candidateReleaseId: PRIOR_RELEASE, lastVerifiedReleaseId: PRIOR_RELEASE, previousVerifiedReleaseId: null, previousActiveReleaseId: "bootstrap", verifiedAt: new Date(NOW).toISOString() });

  function stackDocument() {
    return {
      StackName: config.target.stackName, StackStatus: "UPDATE_COMPLETE",
      Parameters: [{ ParameterKey: "ActiveReleaseId", ParameterValue: activeReleaseId }],
      Outputs: Object.entries({ BucketName: config.target.bucketName, DistributionId: "TEST-DISTRIBUTION", DistributionDomainName: new URL(GAME_ARTIFACT_ORIGIN).hostname, ReleaseRouterFunctionName: "test-release-router" }).map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue }))
    };
  }

  function spawnSyncImplementation(command, args) {
    if (command === "test-chrome") return success("test browser");
    if (command === process.execPath) { browserCalls.push(args); return success(); }
    assert.equal(command, "aws", "unexpected executable; real processes are forbidden");
    awsCalls.push({ service: args[0], operation: args[1], key: option(args, "--key"), args });
    const [service, operation] = args;
    const key = option(args, "--key");
    if (service === "--version") return success("aws-cli/2.test");
    if (service === "sts") return success({ Account: config.target.accountId });
    if (service === "route53") return success({ HostedZone: { Name: `${config.target.domain}.` } });
    if (service === "cloudformation") {
      if (operation === "validate-template") return success();
      if (operation === "describe-stacks") return success({ Stacks: [stackDocument()] });
      if (operation === "deploy") {
        activeReleaseId = args.find((value) => value.startsWith("ActiveReleaseId=")).split("=")[1];
        deploys.push(activeReleaseId);
        return success();
      }
    }
    if (service === "cloudfront") {
      if (operation === "describe-function") return success({ FunctionSummary: { Status: "DEPLOYED", FunctionMetadata: { Stage: "LIVE" } } });
      if (operation === "create-invalidation") return success({ Invalidation: { Id: "TEST-INVALIDATION" } });
      if (operation === "wait") return success();
    }
    if (service === "s3api") {
      const current = remote.get(key);
      if (operation === "list-object-versions") return success({ Versions: [...remote].filter(([objectKey]) => objectKey !== hooks.omitListingKey).map(([Key, object]) => ({ Key, IsLatest: true, Size: object.body.length, VersionId: object.versionId, LastModified: new Date(NOW).toISOString() })), DeleteMarkers: [] });
      if (operation === "get-object") {
        if (!current) return failure("NoSuchKey: 404");
        fs.writeFileSync(args.at(-1), current.body);
        return success({ ...(key === hooks.omitGetEtagKey ? {} : { ETag: current.etag }), VersionId: current.versionId });
      }
      if (operation === "head-object") {
        if (!current) return failure("NoSuchKey: 404");
        return success({ ETag: current.etag, ContentLength: current.body.length, ChecksumSHA256: current.checksumSha256Base64, ContentType: current.contentType, CacheControl: current.cacheControl });
      }
      if (operation === "put-object") {
        const ifMatch = option(args, "--if-match");
        const ifNoneMatch = option(args, "--if-none-match");
        assert.ok(ifMatch || ifNoneMatch === "*", `unconditional write to ${key}`);
        if ((ifMatch && ifMatch !== current?.etag) || (ifNoneMatch === "*" && current)) return failure("PreconditionFailed: 412");
        const body = fs.readFileSync(option(args, "--body"));
        const checksum = option(args, "--checksum-sha256");
        assert.equal(checksum, crypto.createHash("sha256").update(body).digest("base64"));
        const object = store(key, { body, checksumSha256Base64: checksum, contentType: option(args, "--content-type"), cacheControl: option(args, "--cache-control") });
        return success({ ETag: object.etag, ChecksumSHA256: key === hooks.checksumMismatchKey ? "invalid-checksum" : checksum });
      }
      if (operation === "delete-object") {
        assert.equal(key, LOCK_KEY, "only the lease may be deleted in this fixture");
        if (!current || option(args, "--if-match") !== current.etag) return failure("PreconditionFailed: 412");
        remote.delete(key);
        return success();
      }
    }
    assert.fail(`unexpected fake AWS operation ${service}:${operation}`);
  }

  async function fetchImplementation(url) {
    httpCalls.push(url);
    activeRequests += 1;
    peakRequests = Math.max(peakRequests, activeRequests);
    // Let independent requests overlap without adding artificial wait times.
    await new Promise((resolve) => setImmediate(resolve));
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:") return new Response(null, { status: 301, headers: { location: config.target.url } });
      if (parsed.hostname === `${config.target.bucketName}.s3.${config.target.region}.amazonaws.com`) return new Response(null, { status: 403 });
      if (parsed.origin === config.target.url && (parsed.pathname.startsWith("/artifacts/") || parsed.pathname.startsWith("/_deploy/"))) return new Response(null, { status: 403 });
      let key = parsed.pathname.slice(1);
      if (["/", "/index.html", "/benchmark-report.html", "/games.html"].includes(parsed.pathname)) key = `releases/${activeReleaseId}/${parsed.pathname === "/" ? "index.html" : parsed.pathname.slice(1)}`;
      if (hooks.failCandidateHomepage && activeReleaseId === CANDIDATE_RELEASE && parsed.pathname === "/") return new Response("bad candidate", { status: 503 });
      const object = remote.get(key);
      if (!object) return new Response(null, { status: 404 });
      const headers = {
        "content-type": object.contentType,
        "content-security-policy": parsed.origin === GAME_ARTIFACT_ORIGIN
          ? `sandbox allow-scripts allow-same-origin; worker-src 'none'; frame-ancestors ${config.target.url}`
          : "default-src 'none'; connect-src 'none'; frame-ancestors 'none'; script-src 'self'",
        "strict-transport-security": "max-age=31536000", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=()"
      };
      return new Response(object.body, { status: 200, headers });
    } finally { activeRequests -= 1; }
  }

  async function publish(options = {}) {
    return publishBenchmarkSite({
      repoRootDirectory: temporaryDirectory, buildArtifactImplementation: () => artifact,
      spawnSyncImplementation, fetchImplementation, now: () => NOW,
      delayImplementation: async (milliseconds) => { delays.push(milliseconds); },
      environmentVariables: { CHROME_BIN: options.fullAudit ? "test-chrome" : "browser-must-not-be-required" },
      platform: "linux", ...options
    });
  }
  return { artifact, priorManifest, priorArtifacts, remote, hooks, awsCalls, httpCalls, browserCalls, deploys, delays, storeJson, publish, get activeReleaseId() { return activeReleaseId; }, get peakRequests() { return peakRequests; } };
}

const artifactCalls = (fixture) => fixture.awsCalls.filter(({ service, key }) => service === "s3api" && key?.startsWith("artifacts/"));
const publicArtifactCalls = (fixture) => fixture.httpCalls.filter((url) => url.startsWith(`${GAME_ARTIFACT_ORIGIN}/artifacts/`));
const stateWrites = (fixture) => fixture.awsCalls.filter(({ operation, key }) => operation === "put-object" && key === STATE_KEY);

test("fast publish request count stays bounded with 527 previously verified artifacts", async (context) => {
  const counts = [];
  for (const artifactCount of [2, 527]) {
    const fixture = createFixture(context, { artifactCount });
    const startedAt = performance.now();
    const result = await fixture.publish();
    const elapsedMs = performance.now() - startedAt;
    assert.equal(result.artifact.fileCount, 15);
    assert.equal(result.verification.mode, "fast");
    assert.equal(result.verification.browserAuditPerformed, false);
    assert.equal(result.verification.reusedArtifactFiles, artifactCount - 1);
    assert.equal(result.verification.verifiedFiles, 16);
    assert.equal(result.deployment.activeReleaseId, CANDIDATE_RELEASE);
    assert.equal(artifactCalls(fixture).length, 0);
    assert.equal(publicArtifactCalls(fixture).length, 1);
    assert.equal(fixture.browserCalls.length, 0);
    assert.ok(fixture.awsCalls.length <= 50);
    assert.ok(fixture.httpCalls.length <= 30);
    assert.ok(fixture.peakRequests > 1 && fixture.peakRequests <= 8);
    assert.equal(fixture.delays.length, 0);
    assert.ok(fixture.awsCalls.filter(({ operation }) => operation === "head-object").every(({ key }) => !key.startsWith("_deploy/")));
    counts.push(fixture.awsCalls.length);
    context.diagnostic(JSON.stringify({ artifactCount, awsCommands: fixture.awsCalls.length, httpRequests: fixture.httpCalls.length, peakConcurrency: fixture.peakRequests, elapsedMs: Number(elapsedMs.toFixed(1)) }));
  }
  assert.equal(counts[0], counts[1]);
});

test("fast publish uploads and publicly verifies only the changed artifact plus the isolation sample", async (context) => {
  const fixture = createFixture(context, { changedArtifact: true });
  const changed = fixture.artifact.artifactFiles.at(-1);
  const result = await fixture.publish();
  assert.deepEqual(artifactCalls(fixture).map(({ operation, key }) => ({ operation, key })), [{ operation: "put-object", key: changed.key }]);
  assert.deepEqual(publicArtifactCalls(fixture).sort(), [fixture.artifact.artifactFiles[0].publicUrl, changed.publicUrl].sort());
  assert.equal(result.verification.verifiedFiles, 17);
  assert.equal(result.verification.reusedArtifactFiles, 525);
  assert.ok(fixture.peakRequests <= 8);
});

test("full audit retains all artifact HEADs, public proofs, and browser checks", async (context) => {
  const fixture = createFixture(context);
  const startedAt = performance.now();
  const result = await fixture.publish({ fullAudit: true });
  assert.equal(artifactCalls(fixture).length, 527);
  assert.ok(artifactCalls(fixture).every(({ operation }) => operation === "head-object"));
  assert.equal(publicArtifactCalls(fixture).length, 527);
  assert.ok(fixture.browserCalls.length > 0);
  assert.equal(result.verification.mode, "full-audit");
  assert.equal(result.verification.browserAuditPerformed, true);
  assert.equal(result.verification.verifiedFiles, 542);
  assert.equal(result.verification.reusedArtifactFiles, 0);
  assert.ok(fixture.peakRequests <= 8);
  context.diagnostic(JSON.stringify({ awsCommands: fixture.awsCalls.length, httpRequests: fixture.httpCalls.length, browserChecks: fixture.browserCalls.length, peakConcurrency: fixture.peakRequests, elapsedMs: Number((performance.now() - startedAt).toFixed(1)) }));
});

test("a trusted artifact missing from the latest listing is uploaded again", async (context) => {
  const fixture = createFixture(context, { artifactCount: 3 });
  const missing = fixture.artifact.artifactFiles.at(-1);
  fixture.remote.delete(missing.key);
  await fixture.publish();
  assert.deepEqual(artifactCalls(fixture).map(({ operation, key }) => ({ operation, key })), [{ operation: "put-object", key: missing.key }]);
  assert.deepEqual(fixture.remote.get(missing.key).body, missing.body);
});

test("existing immutable objects reject different bytes or response metadata", async (context) => {
  for (const mismatch of ["bytes", "checksum", "contentType", "cacheControl"]) {
    await context.test(mismatch, async (subcontext) => {
      const fixture = createFixture(subcontext, { artifactCount: 3 });
      const file = fixture.artifact.artifactFiles.at(-1);
      fixture.priorManifest.artifacts.pop();
      fixture.storeJson(`_deploy/manifests/${PRIOR_RELEASE}.json`, fixture.priorManifest);
      const object = fixture.remote.get(file.key);
      if (mismatch === "bytes") object.body = Buffer.from("different bytes with a different length");
      else if (mismatch === "checksum") object.checksumSha256Base64 = crypto.createHash("sha256").update("different bytes").digest("base64");
      else object[mismatch] = "wrong metadata";
      await assert.rejects(fixture.publish(), (error) => error.code === "BENCHMARK_PUBLISH_UPLOAD_FAILED" && error.context.safeRetry === false);
      assert.equal(fixture.activeReleaseId, PRIOR_RELEASE);
      assert.equal(stateWrites(fixture).length, 0);
      assert.ok(!artifactCalls(fixture).some(({ operation }) => operation === "put-object"));
    });
  }
});

test("a new PUT with an incorrect returned checksum never activates the candidate", async (context) => {
  const fixture = createFixture(context, { artifactCount: 2, changedArtifact: true });
  fixture.hooks.checksumMismatchKey = fixture.artifact.artifactFiles.at(-1).key;
  await assert.rejects(fixture.publish(), { code: "BENCHMARK_PUBLISH_UPLOAD_FAILED" });
  assert.equal(fixture.activeReleaseId, PRIOR_RELEASE);
  assert.equal(stateWrites(fixture).length, 0);
});

test("a control GET without an ETag prevents unsafe publication state writes", async (context) => {
  const fixture = createFixture(context, { artifactCount: 2 });
  fixture.hooks.omitGetEtagKey = STATE_KEY;
  await assert.rejects(fixture.publish(), { code: "BENCHMARK_PUBLISH_UPLOAD_FAILED" });
  assert.equal(stateWrites(fixture).length, 0);
  assert.equal(fixture.activeReleaseId, PRIOR_RELEASE);
});

test("a conditional upload race safely reuses a matching HEAD without overwrite", async (context) => {
  const fixture = createFixture(context, { artifactCount: 3 });
  const raced = fixture.artifact.artifactFiles.at(-1);
  const originalEtag = fixture.remote.get(raced.key).etag;
  fixture.hooks.omitListingKey = raced.key;
  await fixture.publish();
  assert.deepEqual(artifactCalls(fixture).map(({ operation }) => operation), ["put-object", "head-object"]);
  assert.equal(fixture.remote.get(raced.key).etag, originalEtag);
});

test("losing lease ownership after staging fences candidate activation", async (context) => {
  const fixture = createFixture(context, { artifactCount: 3 });
  await assert.rejects(fixture.publish({ onProgress(event) {
    if (event.id === "stage-release") fixture.storeJson(LOCK_KEY, { ownerId: "another-publisher", expiresAt: new Date(NOW + 3_600_000).toISOString() });
  } }), { code: "BENCHMARK_PUBLISH_BUSY" });
  assert.deepEqual(fixture.deploys, [PRIOR_RELEASE]);
  assert.equal(stateWrites(fixture).length, 0);
  assert.equal(JSON.parse(fixture.remote.get(LOCK_KEY).body).ownerId, "another-publisher");
});

test("failed fast homepage proof restores and verifies the prior release", async (context) => {
  const fixture = createFixture(context, { artifactCount: 3 });
  fixture.hooks.failCandidateHomepage = true;
  await assert.rejects(fixture.publish(), (error) => error.code === "BENCHMARK_PUBLISH_VERIFICATION_FAILED" && error.context.rollback.status === "restored" && error.context.rollback.releaseId === PRIOR_RELEASE);
  assert.deepEqual(fixture.deploys, [PRIOR_RELEASE, CANDIDATE_RELEASE, PRIOR_RELEASE]);
  assert.equal(fixture.activeReleaseId, PRIOR_RELEASE);
  const state = JSON.parse(fixture.remote.get(STATE_KEY).body);
  assert.equal(state.status, "verified");
  assert.equal(state.lastVerifiedReleaseId, PRIOR_RELEASE);
  assert.equal(publicArtifactCalls(fixture).length, 1, "rollback retains the live artifact isolation sample");
  assert.equal(fixture.browserCalls.length, 0);
  assert.equal(fixture.delays.length, 7, "retry delays are observed but never slept");
  assert.ok(fixture.peakRequests <= 8);
});
