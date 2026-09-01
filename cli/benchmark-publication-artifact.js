import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

import { VasirCliError } from "./cli-error.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";

const DEPLOYMENT_CONFIG_PATH = path.join("site", "vasirbenchmark.com", "deployment.json");
const TEMPLATE_LOCK_FILE_NAME = "template-lock.json";
const RELEASE_ID_PATTERN = /^[a-f0-9]{64}$/;
const CACHE_CONTROL_BY_CLASS = Object.freeze({
  html: "public, max-age=0, s-maxage=31536000, must-revalidate",
  immutable: "public, max-age=31536000, immutable"
});
const LANDING_DEPENDENCIES = new Set([
  "index.html",
  "style.css",
  "assets/d3.v7.min.js",
  "app.js",
  "data.js",
  "assets/kanit-latin-900-normal.woff2"
]);
const CANONICAL_PUBLIC_FILES = Object.freeze([
  { path: "index.html", contentType: "text/html; charset=utf-8", cacheClass: "html" },
  { path: "style.css", contentType: "text/css; charset=utf-8", cacheClass: "immutable" },
  { path: "assets/d3.v7.min.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "app.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "data.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "benchmark-report.html", contentType: "text/html; charset=utf-8", cacheClass: "html" },
  { path: "benchmark-report.css", contentType: "text/css; charset=utf-8", cacheClass: "immutable" },
  { path: "benchmark-report.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "assets/kanit-latin-900-normal.woff2", contentType: "font/woff2", cacheClass: "immutable" }
]);

function sha256(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function artifactError({ code = "BENCHMARK_PUBLISH_ARTIFACT_INVALID", message, suggestion, stage = "artifact", context = {} }) {
  return new VasirCliError({
    code,
    message,
    suggestion,
    docsRef: BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF,
    context: {
      stage,
      releaseId: context.releaseId ?? null,
      stackName: context.stackName ?? null,
      safeRetry: context.safeRetry ?? true,
      rollback: context.rollback ?? { status: "not-needed", releaseId: null },
      ...context
    }
  });
}

function readJsonFile(filePath, errorLabel) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Cannot read ${errorLabel}: ${filePath}`,
      suggestion: "Run the command from the Vasir source repository, or pass `--repo-root` to that checkout.",
      context: { path: filePath },
      stage: "acceptance"
    });
  }

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `${errorLabel} is not valid JSON: ${filePath}`,
      suggestion: "Repair the checked-in publication configuration before retrying.",
      context: { path: filePath },
      stage: "acceptance"
    });
  }
}

function assertString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Publication config field ${fieldName} must be a non-empty string.`,
      suggestion: "Repair `site/vasirbenchmark.com/deployment.json` and retry.",
      stage: "acceptance",
      context: { field: fieldName }
    });
  }
}

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Publication config field ${fieldName} must be a positive integer.`,
      suggestion: "Repair `site/vasirbenchmark.com/deployment.json` and retry.",
      stage: "acceptance",
      context: { field: fieldName }
    });
  }
}

export function readBenchmarkDeploymentConfig({ repoRootDirectory }) {
  const configPath = path.join(repoRootDirectory, DEPLOYMENT_CONFIG_PATH);
  const config = readJsonFile(configPath, "VasirBench deployment config");
  if (config.kind !== "vasirbenchmark-production-deployment" || config.schemaVersion !== 1) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "Unsupported VasirBench deployment config kind or schema version.",
      suggestion: "Restore the checked-in schema version 1 production deployment config.",
      stage: "acceptance",
      context: { configPath }
    });
  }

  for (const fieldName of [
    "profile",
    "accountId",
    "region",
    "domain",
    "url",
    "stackName",
    "hostedZoneId",
    "bucketName"
  ]) {
    assertString(config.target?.[fieldName], `target.${fieldName}`);
  }
  assertString(config.templatePath, "templatePath");
  if (!Array.isArray(config.publicFiles) || config.publicFiles.length !== CANONICAL_PUBLIC_FILES.length) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The production allowlist must contain exactly nine files.",
      suggestion: "Restore the reviewed nine-file allowlist in deployment.json.",
      stage: "acceptance"
    });
  }

  const publicContractDrift = CANONICAL_PUBLIC_FILES
    .map((expected, index) => {
      const observed = config.publicFiles[index];
      return observed?.path === expected.path &&
        observed?.contentType === expected.contentType &&
        observed?.cacheClass === expected.cacheClass
        ? null
        : expected.path;
    })
    .filter(Boolean);
  if (publicContractDrift.length > 0) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The production allowlist drifted from the canonical nine-file publication contract.",
      suggestion: "Restore the reviewed paths, content types, cache classes, and ordering in deployment.json.",
      stage: "acceptance",
      context: { expectedPaths: CANONICAL_PUBLIC_FILES.map(({ path: filePath }) => filePath) }
    });
  }

  const configuredPaths = new Set();
  for (const [fileIndex, fileConfig] of config.publicFiles.entries()) {
    assertString(fileConfig?.path, `publicFiles[${fileIndex}].path`);
    assertString(fileConfig?.contentType, `publicFiles[${fileIndex}].contentType`);
    if (!(fileConfig.cacheClass in CACHE_CONTROL_BY_CLASS)) {
      throw artifactError({
        code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
        message: `Unsupported cache class for ${fileConfig.path}: ${fileConfig.cacheClass}`,
        suggestion: "Use only `html` or `immutable` cache classes.",
        stage: "acceptance"
      });
    }
    if (path.isAbsolute(fileConfig.path) || fileConfig.path.split("/").includes("..")) {
      throw artifactError({
        code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
        message: `Public file path must stay inside the site root: ${fileConfig.path}`,
        suggestion: "Use a normalized relative allowlist path.",
        stage: "acceptance"
      });
    }
    if (configuredPaths.has(fileConfig.path)) {
      throw artifactError({
        code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
        message: `Duplicate production allowlist path: ${fileConfig.path}`,
        suggestion: "Keep each public file exactly once in deployment.json.",
        stage: "acceptance"
      });
    }
    configuredPaths.add(fileConfig.path);
  }

  for (const [limitName, limitValue] of Object.entries(config.limits ?? {})) {
    assertPositiveInteger(limitValue, `limits.${limitName}`);
  }
  for (const requiredLimitName of [
    "maxFileBytes",
    "maxArtifactBytes",
    "maxCompressedLandingBytes",
    "maxPhysicalStorageBytes",
    "releaseRetentionDays",
    "controlNoncurrentRetentionDays",
    "leaseDurationMinutes",
    "maxLeaseHeldMinutes"
  ]) {
    assertPositiveInteger(config.limits?.[requiredLimitName], `limits.${requiredLimitName}`);
  }
  if (config.limits.maxLeaseHeldMinutes >= config.limits.leaseDurationMinutes) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The maximum lease-held interval must be shorter than the lease duration.",
      suggestion: "Restore the reviewed 75-minute held / 120-minute lease bounds.",
      stage: "acceptance"
    });
  }

  return {
    config,
    configPath,
    siteRootDirectory: path.dirname(configPath),
    templatePath: path.resolve(path.dirname(configPath), config.templatePath)
  };
}

function inspectLockedPath({ siteRootDirectory, record, driftedPaths }) {
  const targetPath = path.join(siteRootDirectory, record.path);
  let stats;
  let contents;
  try {
    stats = fs.lstatSync(targetPath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      driftedPaths.push(record.path);
      return;
    }
    contents = fs.readFileSync(targetPath);
  } catch {
    driftedPaths.push(record.path);
    return;
  }
  if (contents.length !== record.bytes || sha256(contents) !== record.sha256) {
    driftedPaths.push(record.path);
  }
}

export function validateBenchmarkAcceptance({ config, siteRootDirectory }) {
  const lockPath = path.join(siteRootDirectory, TEMPLATE_LOCK_FILE_NAME);
  const lock = readJsonFile(lockPath, "VasirBench template acceptance receipt");
  const invalidReceipt =
    lock.kind !== "vasirbenchmark-site-template-lock" ||
    lock.status !== "accepted" ||
    lock.acceptance?.authority !== "user" ||
    lock.deployment?.targetDomain !== config.target.domain ||
    lock.deployment?.awsAccountAlias !== config.target.profile;
  if (invalidReceipt || !Array.isArray(lock.files) || !Array.isArray(lock.captures)) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED",
      message: "The VasirBench production acceptance receipt is missing, stale, or targets a different deployment.",
      suggestion: "Regenerate the canonical capture suite and renew template-lock.json from explicit user acceptance before publishing.",
      stage: "acceptance",
      context: { changedPaths: [TEMPLATE_LOCK_FILE_NAME] }
    });
  }

  const driftedPaths = [];
  for (const record of [...lock.files, ...lock.captures]) {
    if (!record || typeof record.path !== "string" || !Number.isInteger(record.bytes) || typeof record.sha256 !== "string") {
      driftedPaths.push(TEMPLATE_LOCK_FILE_NAME);
      break;
    }
    inspectLockedPath({ siteRootDirectory, record, driftedPaths });
  }

  const lockedFilePaths = new Set(lock.files.map((record) => record.path));
  for (const fileConfig of config.publicFiles) {
    if (!lockedFilePaths.has(fileConfig.path)) driftedPaths.push(fileConfig.path);
  }

  const changedPaths = [...new Set(driftedPaths)].sort();
  if (changedPaths.length > 0) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_ACCEPTANCE_REQUIRED",
      message: `The accepted VasirBench source drifted at ${changedPaths.length} path${changedPaths.length === 1 ? "" : "s"}.`,
      suggestion: "Review the changed paths, rerun the canonical capture suite, and renew template-lock.json only with explicit user acceptance.",
      stage: "acceptance",
      context: { changedPaths }
    });
  }

  return lock;
}

function evaluateSiteData(dataSource, filePath) {
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(dataSource, sandbox, {
      filename: filePath,
      timeout: 1000
    });
  } catch (error) {
    throw artifactError({
      message: `Cannot evaluate the accepted public data fixture: ${error.message}`,
      suggestion: "Repair data.js so it produces window.VASIR_DATA without external dependencies.",
      context: { path: "data.js" }
    });
  }
  const data = sandbox.window.VASIR_DATA;
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.benchmarks) || !Array.isArray(data.benchmarkSummaries)) {
    throw artifactError({
      message: "data.js did not produce the required VasirBench route data.",
      suggestion: "Restore window.VASIR_DATA with categories, benchmarks, and benchmark summaries.",
      context: { path: "data.js" }
    });
  }
  return data;
}

function buildRouteManifest(data) {
  const categoryIds = Array.from(data.categories, (category) => category.id);
  const benchmarkIds = Array.from(data.benchmarks, (benchmark) => benchmark.id);
  if (categoryIds.length !== 5 || new Set(categoryIds).size !== 5) {
    throw artifactError({
      message: `Expected five unique job-family route ids; found ${categoryIds.length}.`,
      suggestion: "Restore the accepted Combined plus five-job-family navigation contract."
    });
  }
  if (benchmarkIds.length !== 24 || new Set(benchmarkIds).size !== 24) {
    throw artifactError({
      message: `Expected 24 unique benchmark report ids; found ${benchmarkIds.length}.`,
      suggestion: "Restore the accepted 24-report route manifest."
    });
  }

  const capabilityFragments = [];
  for (const categoryId of ["overall", ...categoryIds]) {
    capabilityFragments.push(`/#capabilities/${categoryId}`);
    capabilityFragments.push(`/#capabilities/${categoryId}/benchmarks`);
    capabilityFragments.push(`/#capabilities/${categoryId}/efficiency`);
  }
  return {
    entrypoints: ["/", "/index.html", "/benchmark-report.html"],
    capabilityFragments,
    reportFragments: benchmarkIds.map((benchmarkId) => `/benchmark-report.html#${benchmarkId}`)
  };
}

function validatePublicEvidenceBoundary(data) {
  const leakingBenchmarks = data.benchmarks
    .filter((benchmark) => typeof benchmark.sourceHref === "string" && benchmark.sourceHref.trim() !== "")
    .map((benchmark) => benchmark.id);
  const leakingSummaries = data.benchmarkSummaries
    .filter((summary) => typeof summary.sourceHref === "string" && summary.sourceHref.trim() !== "")
    .map((summary) => summary.benchmarkId);
  if (leakingBenchmarks.length > 0 || leakingSummaries.length > 0) {
    throw artifactError({
      message: "The public data fixture still links to local-only benchmark evidence.",
      suggestion: "Remove local sourceHref values and keep the public report's evidence boundary explicit.",
      context: { benchmarkIds: [...new Set([...leakingBenchmarks, ...leakingSummaries])].sort() }
    });
  }
  for (const summary of data.benchmarkSummaries) {
    if (summary.detailHref !== `./benchmark-report.html#${summary.benchmarkId}`) {
      throw artifactError({
        message: `Benchmark report route is outside the public route manifest: ${summary.benchmarkId}`,
        suggestion: "Use the stable benchmark-report.html fragment route for every summary.",
        context: { benchmarkId: summary.benchmarkId, detailHref: summary.detailHref }
      });
    }
  }
}

function transformHtmlDependencies({ contents, releaseId, publicFiles }) {
  let transformed = contents.toString("utf8");
  for (const fileConfig of publicFiles) {
    if (fileConfig.cacheClass !== "immutable") continue;
    const sourceReference = `./${fileConfig.path}`;
    const releaseReference = `/releases/${releaseId}/${fileConfig.path}`;
    transformed = transformed.replaceAll(sourceReference, releaseReference);
  }
  return Buffer.from(transformed, "utf8");
}

function validateHtmlTargets({ filesByPath, releaseId }) {
  const allowedStableTargets = new Set(["/", "/index.html", "/benchmark-report.html"]);
  const failures = [];
  for (const htmlPath of ["index.html", "benchmark-report.html"]) {
    const contents = filesByPath.get(htmlPath)?.body.toString("utf8") ?? "";
    const attributePattern = /\b(?:href|src)="([^"]+)"/g;
    for (const match of contents.matchAll(attributePattern)) {
      const target = match[1];
      if (target.startsWith("#")) continue;
      if (target.startsWith(`/releases/${releaseId}/`)) continue;
      if (target === "./index.html" || allowedStableTargets.has(target)) continue;
      if (/^https:\/\//.test(target)) continue;
      failures.push(`${htmlPath}:${target}`);
    }
  }
  if (failures.length > 0) {
    throw artifactError({
      message: "The production HTML contains targets outside the finite public artifact.",
      suggestion: "Use a release-qualified asset, stable site entrypoint, fragment, or explicitly approved HTTPS destination.",
      context: { targets: failures }
    });
  }
}

function assertFileWithinSiteRoot({ siteRootDirectory, filePath, relativePath }) {
  const siteRealPath = fs.realpathSync(siteRootDirectory);
  const fileRealPath = fs.realpathSync(filePath);
  if (fileRealPath !== siteRealPath && !fileRealPath.startsWith(`${siteRealPath}${path.sep}`)) {
    throw artifactError({
      message: `Allowlisted file escapes the canonical site root: ${relativePath}`,
      suggestion: "Replace the path with a regular file inside site/vasirbenchmark.com.",
      context: { path: relativePath }
    });
  }
}

export function buildBenchmarkPublicationArtifact({
  repoRootDirectory,
  validateAcceptance = true
}) {
  const { config, configPath, siteRootDirectory, templatePath } = readBenchmarkDeploymentConfig({ repoRootDirectory });
  const acceptance = validateAcceptance
    ? validateBenchmarkAcceptance({ config, siteRootDirectory })
    : null;
  if (!fs.existsSync(templatePath) || !fs.statSync(templatePath).isFile()) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `CloudFormation template is missing: ${templatePath}`,
      suggestion: "Restore the checked-in production template before publishing.",
      stage: "acceptance",
      context: { path: templatePath }
    });
  }

  const sourceFiles = config.publicFiles.map((fileConfig) => {
    const filePath = path.join(siteRootDirectory, fileConfig.path);
    let stats;
    try {
      stats = fs.lstatSync(filePath);
    } catch {
      throw artifactError({
        message: `Allowlisted production file is missing: ${fileConfig.path}`,
        suggestion: "Restore the file or repair the reviewed production allowlist.",
        context: { path: fileConfig.path }
      });
    }
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw artifactError({
        message: `Allowlisted production path is not a regular file: ${fileConfig.path}`,
        suggestion: "Replace the path with a regular checked-in file.",
        context: { path: fileConfig.path }
      });
    }
    assertFileWithinSiteRoot({ siteRootDirectory, filePath, relativePath: fileConfig.path });
    const contents = fs.readFileSync(filePath);
    if (contents.length > config.limits.maxFileBytes) {
      throw artifactError({
        message: `Production file exceeds the ${config.limits.maxFileBytes}-byte limit: ${fileConfig.path}`,
        suggestion: "Reduce the file size or explicitly revise and re-audit the publication budget.",
        context: { path: fileConfig.path, bytes: contents.length }
      });
    }
    return {
      ...fileConfig,
      filePath,
      contents,
      bytes: contents.length,
      sha256: sha256(contents)
    };
  }).sort((leftFile, rightFile) => leftFile.path.localeCompare(rightFile.path));

  const sourceManifest = sourceFiles.map(({ path: relativePath, bytes, sha256: fileSha256 }) => ({
    path: relativePath,
    bytes,
    sha256: fileSha256
  }));
  const releaseId = sha256(Buffer.from(`${JSON.stringify(sourceManifest)}\n`, "utf8"));
  if (!RELEASE_ID_PATTERN.test(releaseId)) {
    throw artifactError({ message: "Could not derive a valid deterministic release identifier." });
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasirbenchmark-release."));
  const files = [];
  try {
    for (const sourceFile of sourceFiles) {
      const body = sourceFile.cacheClass === "html"
        ? transformHtmlDependencies({
            contents: sourceFile.contents,
            releaseId,
            publicFiles: config.publicFiles
          })
        : sourceFile.contents;
      const outputPath = path.join(temporaryDirectory, sourceFile.path);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, body);
      files.push({
        path: sourceFile.path,
        outputPath,
        body,
        bytes: body.length,
        sha256: sha256(body),
        checksumSha256Base64: crypto.createHash("sha256").update(body).digest("base64"),
        contentType: sourceFile.contentType,
        cacheClass: sourceFile.cacheClass,
        cacheControl: CACHE_CONTROL_BY_CLASS[sourceFile.cacheClass]
      });
    }
  } catch (error) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  if (totalBytes > config.limits.maxArtifactBytes) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw artifactError({
      message: `Production artifact exceeds the ${config.limits.maxArtifactBytes}-byte limit.`,
      suggestion: "Reduce the artifact or explicitly revise and re-audit the publication budget.",
      context: { totalBytes, releaseId }
    });
  }

  const compressedLandingBytes = files
    .filter((file) => LANDING_DEPENDENCIES.has(file.path))
    .reduce((total, file) => total + zlib.gzipSync(file.body, { level: 9 }).length, 0);
  if (compressedLandingBytes > config.limits.maxCompressedLandingBytes) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw artifactError({
      message: `Compressed landing dependencies exceed the ${config.limits.maxCompressedLandingBytes}-byte budget.`,
      suggestion: "Reduce first-load bytes or explicitly revise and re-audit the transfer budget.",
      context: { compressedLandingBytes, releaseId }
    });
  }

  let routes;
  try {
    const dataFile = filesByPath.get("data.js");
    const data = evaluateSiteData(dataFile.body.toString("utf8"), dataFile.outputPath);
    validatePublicEvidenceBoundary(data);
    routes = buildRouteManifest(data);
    validateHtmlTargets({ filesByPath, releaseId });

    const textualLeakPaths = files
      .filter((file) => /^(?:text\/|application\/(?:javascript|json))/.test(file.contentType))
      .filter((file) => /\.agents\/vasir-evals|\.\.\/(?:hyper-scale-chat|personalized-home-feed|device-telemetry)\//.test(file.body.toString("utf8")))
      .map((file) => file.path);
    if (textualLeakPaths.length > 0) {
      throw artifactError({
        message: "The production artifact contains a local benchmark-evidence path.",
        suggestion: "Remove local evidence paths from the public projection.",
        context: { paths: textualLeakPaths, releaseId }
      });
    }
  } catch (error) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }

  const publicManifest = {
    kind: "vasirbenchmark-release-manifest",
    schemaVersion: 1,
    releaseId,
    files: files.map(({ path: relativePath, bytes, sha256: fileSha256, contentType, cacheClass, cacheControl }) => ({
      path: relativePath,
      bytes,
      sha256: fileSha256,
      contentType,
      cacheClass,
      cacheControl
    })),
    routes
  };

  return {
    config,
    configPath,
    siteRootDirectory,
    templatePath,
    acceptance,
    releaseId,
    sourceManifest,
    publicManifest,
    files,
    routes,
    fileCount: files.length,
    totalBytes,
    compressedLandingBytes,
    temporaryDirectory,
    dispose() {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  };
}
