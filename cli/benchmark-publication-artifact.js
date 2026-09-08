import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

import { VasirCliError } from "./cli-error.js";
import { GAME_ARTIFACT_ORIGIN } from "./eval/games-publication.js";
import { validateWritingPublication } from "./eval/writing-publication.js";
import { WRITING_CREATION_ARCHIVE, hydrateWritingResponseArchives } from "./eval/writing-response-archives.js";
import { BENCHMARK_PUBLISH_TROUBLESHOOTING_DOCS_REF } from "./docs-ref.js";
import {
  buildBenchmarkPublicationProjection,
  buildBenchmarkPublicationRoutes,
  validateBenchmarkPublicationProjection,
  validateBenchmarkPublicationResponses
} from "./eval/benchmark-publication-projection.js";

const DEPLOYMENT_CONFIG_PATH = path.join("site", "vasirbenchmark.com", "deployment.json");
const TEMPLATE_LOCK_FILE_NAME = "template-lock.json";
const GENERATED_PUBLIC_FILE_PATHS = new Set(["data.js", "responses.js", "writing-data.js", "writing-responses.js", WRITING_CREATION_ARCHIVE.path]);
const RELEASE_ID_PATTERN = /^[a-f0-9]{64}$/;
const PRIVATE_LOCAL_PATH_PATTERN = /(?:^|[^A-Za-z0-9_])\.agents(?:[/\\]|$)|file:\/\/(?=[^'"`\s),;])|(?:^|[\s"'(=>])[A-Za-z]:[/\\]|(?:^|[^A-Za-z0-9_])vasir-evals(?:[/\\]|$)/i;
const PRIVATE_PARENT_PATH_PATTERN = /(?:^|[^.])\.\.[/\\]/i;
const ACCEPTANCE_QA_FILE_PATHS = Object.freeze(["capture.mjs", "capture.sh", "games-browsercheck.mjs", "writing-browsercheck.mjs"]);
const FIXTURE_TOKEN_PATTERN = /\b(?:fake|illustrative|synthetic|simulated|fixture|mock)\b/i;
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
  { path: "responses.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable", kind: "response-archive" },
  { path: "benchmark-report.html", contentType: "text/html; charset=utf-8", cacheClass: "html" },
  { path: "benchmark-report.css", contentType: "text/css; charset=utf-8", cacheClass: "immutable" },
  { path: "benchmark-report.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "assets/kanit-latin-900-normal.woff2", contentType: "font/woff2", cacheClass: "immutable" },
  { path: "games.html", contentType: "text/html; charset=utf-8", cacheClass: "html" },
  { path: "games.css", contentType: "text/css; charset=utf-8", cacheClass: "immutable" },
  { path: "games.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "writing-data.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable" },
  { path: "writing-responses.js", contentType: "text/javascript; charset=utf-8", cacheClass: "immutable", kind: "response-archive" },
  { path: WRITING_CREATION_ARCHIVE.path, contentType: "text/javascript; charset=utf-8", cacheClass: "immutable", kind: "response-archive" }
]);
function sha256(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

export function getBenchmarkPublicationFileByteLimit(config, relativePath) {
  return config.publicFiles.find(file => file.path === relativePath)?.kind === "response-archive"
    ? (config.limits.maxResponseFileBytes ?? config.limits.maxFileBytes)
    : config.limits.maxFileBytes;
}

// This affects only the parent-path privacy scan, never archived/public bytes.
// The Writing projector has already validated the frozen archive and its hashes.
export function writingParentPathScanSource(writing, responses) {
  const source = structuredClone(responses);
  const id = "dungeon-master-adventure-outline";
  const skillPaths = new Set(writing?.additionalBenchmarks?.[id]?.methodology?.skillFiles?.map(file => file.path) ?? []);
  const archive = source?.additionalBenchmarks?.[id]?.promptFiles ?? [];
  for (const file of archive) {
    if (!skillPaths.has(file.title)) continue;
    file.content = file.content.replace(/(\]\()(\.\.\/[^\s)]+)(\))/gu, (match, opening, href, closing) => {
      const destination = path.posix.normalize(path.posix.join(path.posix.dirname(file.title), href.split("#")[0]));
      return skillPaths.has(destination) ? `${opening}<verified-frozen-skill-link>${closing}` : match;
    });
  }
  return JSON.stringify(source);
}

// The creation archive retains frozen references both as individual files and
// inside the exact informed-judge context. Normalize only hash-verified copies
// for this one privacy check; candidate answers and original reviews stay raw.
export function writingCreationParentPathScanSource(writing, responses) {
  const source = structuredClone(responses);
  if (!source) return JSON.stringify(source);
  const id = WRITING_CREATION_ARCHIVE.benchmarkId;
  const projection = writing?.benchmarks?.[0]?.id === id ? writing
    : writing?.benchmarkPublications?.find(child => child.benchmarkId === id)?.projection;
  const methodology = projection?.methodology;
  const pins = new Map((methodology?.skillFiles ?? [])
    .filter(file => isNormalizedRelativePublicPath(file.path) && /^[a-f0-9]{64}$/.test(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes >= 0)
    .map(file => [file.path, file]));
  const verifiedFile = (name, content) => {
    const pin = pins.get(name);
    return pin && typeof content === "string" && Buffer.byteLength(content) === pin.bytes && sha256(content) === pin.sha256;
  };
  const normalizeLinks = (name, content) => content.replace(/(\]\()(\.\.\/[^\s)]+)(\))/gu, (match, opening, href, closing) => {
    const [target, fragment = "", ...extraFragments] = href.split("#");
    if (extraFragments.length || target.includes("?") || PRIVATE_PARENT_PATH_PATTERN.test(fragment)) return match;
    const destination = path.posix.normalize(path.posix.join(path.posix.dirname(name), target));
    return pins.has(destination) ? `${opening}<verified-frozen-skill-link>${closing}` : match;
  });
  for (const file of source.promptFiles ?? []) {
    if (verifiedFile(file.title, file.content) && file.sha256 === pins.get(file.title).sha256) {
      file.content = normalizeLinks(file.title, file.content);
    }
  }

  const context = (responses.promptFiles ?? []).find(file => file.id === "frozen-informed-judge-context");
  const contextHash = typeof context?.content === "string" ? sha256(context.content) : null;
  const informedProfiles = (methodology?.judgeProfiles ?? []).filter(profile => profile.contextMode === "informed");
  if (!contextHash || context.sha256 !== contextHash || !informedProfiles.length ||
    informedProfiles.some(profile => profile.contextSha256 !== contextHash)) return JSON.stringify(source);
  const sections = [...context.content.matchAll(/<<<FROZEN_CONTEXT_FILE ("(?:\\.|[^"\\])*")>>>\n([\s\S]*?)\n<<<END_FROZEN_CONTEXT_FILE>>>/gu)];
  const names = methodology.informedSkillFiles ?? [];
  if (sections.length !== names.length || sections.map(section => section[0]).join("\n\n") !== context.content) return JSON.stringify(source);
  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index][1] !== JSON.stringify(names[index]) || !verifiedFile(names[index], sections[index][2])) return JSON.stringify(source);
  }
  const sanitizedContext = sections.map((section, index) =>
    `<<<FROZEN_CONTEXT_FILE ${section[1]}>>>\n${normalizeLinks(names[index], section[2])}\n<<<END_FROZEN_CONTEXT_FILE>>>`
  ).join("\n\n");
  source.promptFiles.find(file => file.id === context.id).content = sanitizedContext;
  const rootIndex = names.indexOf("SKILL.md");
  const rootFile = (source.promptFiles ?? []).find(file => file.id === "frozen-skill-root");
  if (rootIndex >= 0 && typeof rootFile?.content === "string" && sha256(rootFile.content) === rootFile.sha256) {
    const rootContent = sections[rootIndex][2];
    rootFile.content = rootFile.content.replaceAll(rootContent, normalizeLinks("SKILL.md", rootContent));
  }
  for (const segment of source.judgePromptSegments ?? []) {
    if (typeof segment.content === "string" && sha256(segment.content) === segment.sha256) {
      segment.content = segment.content.replaceAll(context.content, sanitizedContext);
    }
  }
  return JSON.stringify(source);
}

// JSON escaping can turn a possessive followed by a newline ("saint's:\n")
// into something the Windows-drive detector reads as s:\. Normalize control
// characters only in the scan copy of an exact, hash-verified answer literal.
// Real backslashes, other source code, reviews and every public byte stay intact.
export function writingCreationLocalPathScanSource(source, responses) {
  const literal = value => JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  for (const response of responses?.responses ?? []) {
    const answer = response.outputText;
    if (typeof answer !== "string" || sha256(answer) !== response.provenance?.outputSha256) continue;
    const encoded = literal(answer);
    if (!PRIVATE_LOCAL_PATH_PATTERN.test(encoded)) continue;
    const normalized = answer.replace(/[\u0000-\u001f\u2028\u2029]/gu, " ");
    if (normalized !== answer) source = source.replaceAll(encoded, literal(normalized));
  }
  return source;
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

function isNormalizedRelativePublicPath(filePath) {
  return typeof filePath === "string" &&
    filePath !== "" &&
    filePath === path.posix.normalize(filePath) &&
    !path.posix.isAbsolute(filePath) &&
    !filePath.includes("\\") &&
    !filePath.includes("%") &&
    !filePath.includes("?") &&
    !filePath.includes("#") &&
    !filePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function assertPublicFileConfig({ fileConfig, fieldName, configuredPaths }) {
  assertString(fileConfig?.path, `${fieldName}.path`);
  assertString(fileConfig?.contentType, `${fieldName}.contentType`);
  if (!(fileConfig.cacheClass in CACHE_CONTROL_BY_CLASS)) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Unsupported cache class for ${fileConfig.path}: ${fileConfig.cacheClass}`,
      suggestion: "Use only `html` or `immutable` cache classes.",
      stage: "acceptance"
    });
  }
  if (!isNormalizedRelativePublicPath(fileConfig.path)) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Public file path must be a normalized path inside the site root: ${fileConfig.path}`,
      suggestion: "Use a normalized relative POSIX allowlist path without escapes, URL encoding, query strings, or fragments.",
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
  let siteUrl;
  try {
    siteUrl = new URL(config.target.url);
  } catch (error) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: `Production site URL must be a valid absolute URL: ${error.message}`,
      suggestion: "Restore the reviewed HTTPS site URL in deployment.json.",
      stage: "acceptance"
    });
  }
  if (
    siteUrl.protocol !== "https:" ||
    siteUrl.pathname !== "/" ||
    siteUrl.search || siteUrl.hash ||
    siteUrl.hostname !== config.target.domain
  ) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The production site must use the configured domain as its root HTTPS URL.",
      suggestion: "Keep target.url on the reviewed apex HTTPS site without a path, query, or fragment.",
      stage: "acceptance"
    });
  }
  assertString(config.templatePath, "templatePath");
  if (!Array.isArray(config.publicFiles) || config.publicFiles.length !== CANONICAL_PUBLIC_FILES.length) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The production allowlist must contain exactly sixteen files.",
      suggestion: "Restore the reviewed sixteen-file allowlist in deployment.json.",
      stage: "acceptance"
    });
  }

  const publicContractDrift = CANONICAL_PUBLIC_FILES
    .map((expected, index) => {
      const observed = config.publicFiles[index];
      return observed?.path === expected.path &&
        observed?.contentType === expected.contentType &&
        observed?.cacheClass === expected.cacheClass &&
        (observed?.kind ?? null) === (expected.kind ?? null)
        ? null
        : expected.path;
    })
    .filter(Boolean);
  if (publicContractDrift.length > 0) {
    throw artifactError({
      code: "BENCHMARK_PUBLISH_CONFIG_INVALID",
      message: "The production allowlist drifted from the canonical sixteen-file publication contract.",
      suggestion: "Restore the reviewed paths, content types, cache classes, archive classifications, and ordering in deployment.json.",
      stage: "acceptance",
      context: { expectedPaths: CANONICAL_PUBLIC_FILES.map(({ path: filePath }) => filePath) }
    });
  }

  const configuredPaths = new Set();
  for (const [fileIndex, fileConfig] of config.publicFiles.entries()) {
    assertPublicFileConfig({ fileConfig, fieldName: `publicFiles[${fileIndex}]`, configuredPaths });
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
  if (
    invalidReceipt ||
    !Array.isArray(lock.files) ||
    !Array.isArray(lock.captures) ||
    lock.captures.length === 0
  ) {
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
    if (GENERATED_PUBLIC_FILE_PATHS.has(record.path)) continue;
    inspectLockedPath({ siteRootDirectory, record, driftedPaths });
  }

  const lockedFilePaths = new Set([...lock.files, ...lock.captures]
    .filter((record) => !GENERATED_PUBLIC_FILE_PATHS.has(record.path))
    .map((record) => record.path));
  const requiredAcceptedPaths = [
    ...config.publicFiles
      .map((fileConfig) => fileConfig.path)
      .filter((filePath) => !GENERATED_PUBLIC_FILE_PATHS.has(filePath)),
    ...ACCEPTANCE_QA_FILE_PATHS
  ];
  for (const requiredPath of requiredAcceptedPaths) {
    if (!lockedFilePaths.has(requiredPath)) driftedPaths.push(requiredPath);
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

function evaluateSiteModule({ source, filePath, globalName, publicPath, allowNull = false }) {
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(source, sandbox, {
      filename: filePath,
      timeout: 1000
    });
  } catch (error) {
    throw artifactError({
      message: `Cannot evaluate the generated public module ${publicPath}: ${error.message}`,
      suggestion: `Repair ${publicPath} so it produces window.${globalName} without external dependencies.`,
      context: { path: publicPath }
    });
  }
  const value = sandbox.window[globalName];
  if (!value && !(allowNull && value === null)) {
    throw artifactError({
      message: `${publicPath} did not produce the required window.${globalName} data.`,
      suggestion: `Repair the public projector so ${publicPath} assigns window.${globalName}.`,
      context: { path: publicPath }
    });
  }
  return value;
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


function validateHtmlTargets({ filesByPath, releaseId, routes }) {
  const allowedStableTargets = new Set(["/", "/index.html", "/benchmark-report.html", "/games.html"]);
  const allowedDocumentFragments = new Map([
    ["index.html", new Set(["#top", "#benchmark-results"])],
    ["benchmark-report.html", new Set(["#top", "#overview", "#ranking", "#method", "#limitations"])],
    ["games.html", new Set(["#top", "#game-comparison", "#game-results", "#game-reference", "#game-method"])]
  ]);
  const allowedFragmentTargets = new Set([
    // Games is a native shell category even in a release with no selected game dataset.
    "/#capabilities/games",
    ...routes.familyFragments,
    ...routes.viewFragments,
    ...routes.reportFragments
  ]);
  const failures = [];
  for (const htmlPath of ["index.html", "benchmark-report.html", "games.html"]) {
    const contents = filesByPath.get(htmlPath)?.body.toString("utf8") ?? "";
    const attributePattern = /\b(?:href|src)="([^"]+)"/g;
    for (const match of contents.matchAll(attributePattern)) {
      const target = match[1];
      if (target.startsWith("#")) {
        const normalizedRoute = htmlPath === "index.html"
          ? `/${target}`
          : `/benchmark-report.html${target}`;
        if (
          allowedDocumentFragments.get(htmlPath)?.has(target) ||
          allowedFragmentTargets.has(normalizedRoute)
        ) continue;
        failures.push(`${htmlPath}:${target}`);
        continue;
      }
      if (target.startsWith(`/releases/${releaseId}/`)) continue;
      if (target === "data:,") continue;
      if (allowedStableTargets.has(target) || (target.startsWith("./") && allowedStableTargets.has(`/${target.slice(2)}`))) continue;
      if (target.startsWith("./index.html#") && allowedFragmentTargets.has(`/${target.slice("./index.html".length)}`)) continue;
      if (target.startsWith("./benchmark-report.html#") && allowedFragmentTargets.has(`/${target.slice(2)}`)) continue;
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
  validateAcceptance = true,
  publicationSourceRootDirectory = repoRootDirectory,
  publicationReadFileSyncImplementation = fs.readFileSync
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

  // A reviewed presentation checkout may use the original immutable evidence
  // root. In particular, historical Games receipts retain absolute build paths.
  // Source pins and all artifact validators still run against that source root.
  const publicationProjection = buildBenchmarkPublicationProjection({
    repoRootDirectory: publicationSourceRootDirectory,
    readFileSyncImplementation: publicationReadFileSyncImplementation
  });
  const generatedFiles = new Map([
    ["data.js", Buffer.from(publicationProjection.dataSource, "utf8")],
    ["responses.js", Buffer.from(publicationProjection.responsesSource, "utf8")],
    ["writing-data.js", Buffer.from(publicationProjection.writingDataSource, "utf8")],
    ["writing-responses.js", Buffer.from(publicationProjection.writingResponsesSource, "utf8")],
    [WRITING_CREATION_ARCHIVE.path, Buffer.from(publicationProjection.writingCreationResponsesSource, "utf8")]
  ]);
  const fileByteLimit = relativePath => getBenchmarkPublicationFileByteLimit(config, relativePath);
  const sourceFiles = config.publicFiles.map((fileConfig) => {
    const generatedContents = generatedFiles.get(fileConfig.path);
    if (generatedContents) {
      if (generatedContents.length > fileByteLimit(fileConfig.path)) {
        throw artifactError({
          message: `Generated production file exceeds the ${fileByteLimit(fileConfig.path)}-byte limit: ${fileConfig.path}`,
          suggestion: "Reduce the public projection or explicitly revise and re-audit the publication budget.",
          context: { path: fileConfig.path, bytes: generatedContents.length }
        });
      }
      return {
        ...fileConfig,
        filePath: null,
        contents: generatedContents,
        bytes: generatedContents.length,
        sha256: sha256(generatedContents),
        generated: true
      };
    }

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
    if (contents.length > fileByteLimit(fileConfig.path)) {
      throw artifactError({
        message: `Production file exceeds the ${fileByteLimit(fileConfig.path)}-byte limit: ${fileConfig.path}`,
        suggestion: "Reduce the file size or explicitly revise and re-audit the publication budget.",
        context: { path: fileConfig.path, bytes: contents.length }
      });
    }
    return {
      ...fileConfig,
      filePath,
      contents,
      bytes: contents.length,
      sha256: sha256(contents),
      generated: false
    };
  }).sort((leftFile, rightFile) => leftFile.path.localeCompare(rightFile.path));

  const sourceManifest = sourceFiles.map(({ path: relativePath, bytes, sha256: fileSha256, contentType, cacheClass }) => ({
    path: relativePath,
    bytes,
    sha256: fileSha256,
    contentType,
    cacheClass
  }));
  const releaseId = sha256(Buffer.from(`${JSON.stringify({
    sourceManifest,
    projectionBasisSha256: publicationProjection.basisSha256
  })}\n`, "utf8"));
  if (!RELEASE_ID_PATTERN.test(releaseId)) {
    throw artifactError({ message: "Could not derive a valid deterministic release identifier." });
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vasirbenchmark-release."));
  const files = [];
  const artifactFiles = [];
  try {
    for (const file of publicationProjection.artifactFiles ?? []) {
      const outputPath = path.join(temporaryDirectory, file.key);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.copyFileSync(file.sourcePath, outputPath);
      const body = fs.readFileSync(outputPath);
      if (body.length !== file.bytes || sha256(body) !== file.sha256) throw artifactError({ message: "A selected game artifact changed during packaging." });
      artifactFiles.push({ ...file, outputPath, checksumSha256Base64: Buffer.from(file.sha256, "hex").toString("base64"), cacheClass: "immutable", cacheControl: CACHE_CONTROL_BY_CLASS.immutable });
    }
    for (const sourceFile of sourceFiles) {
      const body = sourceFile.cacheClass === "html"
        ? transformHtmlDependencies({
            contents: sourceFile.contents,
            releaseId,
            publicFiles: config.publicFiles
          })
        : sourceFile.contents;
      if (body.length > fileByteLimit(sourceFile.path)) {
        throw artifactError({
          message: `Release-qualified production file exceeds the ${fileByteLimit(sourceFile.path)}-byte limit: ${sourceFile.path}`,
          suggestion: "Reduce the file size or explicitly revise and re-audit the publication budget.",
          context: { path: sourceFile.path, bytes: body.length, releaseId }
        });
      }
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
    const data = evaluateSiteModule({
      source: dataFile.body.toString("utf8"),
      filePath: dataFile.outputPath,
      globalName: "VASIR_DATA",
      publicPath: "data.js"
    });
    validateBenchmarkPublicationProjection(data);
    const responsesFile = filesByPath.get("responses.js");
    const responseBundle = evaluateSiteModule({
      source: responsesFile.body.toString("utf8"),
      filePath: responsesFile.outputPath,
      globalName: "VASIR_RESPONSES",
      publicPath: "responses.js"
    });
    validateBenchmarkPublicationResponses(responseBundle, data);
    const writingFile = filesByPath.get("writing-data.js");
    const writingResponsesFile = filesByPath.get("writing-responses.js");
    const writing = evaluateSiteModule({ source: writingFile.body.toString("utf8"), filePath: writingFile.outputPath, globalName: "VASIR_WRITING", publicPath: "writing-data.js", allowNull: true });
    const primaryWritingResponses = evaluateSiteModule({ source: writingResponsesFile.body.toString("utf8"), filePath: writingResponsesFile.outputPath, globalName: "VASIR_WRITING_RESPONSES", publicPath: "writing-responses.js", allowNull: true });
    const writingCreationFile = filesByPath.get(WRITING_CREATION_ARCHIVE.path);
    const writingCreationResponses = evaluateSiteModule({ source: writingCreationFile.body.toString("utf8"), filePath: writingCreationFile.outputPath, globalName: WRITING_CREATION_ARCHIVE.globalName, publicPath: WRITING_CREATION_ARCHIVE.path, allowNull: true });
    const writingResponses = hydrateWritingResponseArchives(primaryWritingResponses, writingCreationResponses);
    if (data.writing) {
      validateWritingPublication(writing, writingResponses);
      const expectedResponseArchives = writingCreationResponses ? {
        [WRITING_CREATION_ARCHIVE.benchmarkId]: { href: WRITING_CREATION_ARCHIVE.href, globalName: WRITING_CREATION_ARCHIVE.globalName }
      } : {};
      if (JSON.stringify(data.writing.responseArchives ?? {}) !== JSON.stringify(expectedResponseArchives)) throw artifactError({ message: "Writing response archive descriptors differ from the generated evidence.", suggestion: "Regenerate the landing descriptor and all Writing archives from the same selected sources." });
      if (JSON.stringify(writing.coverage) !== JSON.stringify(data.writing.coverage)) throw artifactError({ message: "Writing lazy evidence and landing coverage differ.", suggestion: "Regenerate both bundles from the same pinned source." });
      if (JSON.stringify(Object.keys(writing.additionalBenchmarks ?? {})) !== JSON.stringify(Object.keys(data.writing.additionalBenchmarks ?? {})) || JSON.stringify(writing.allWritingCoverage) !== JSON.stringify(data.writing.allWritingCoverage)) throw artifactError({ message: "Additional Writing selections differ between landing and lazy evidence.", suggestion: "Regenerate the entire Writing collection from the same pinned sources." });
      for (const [id, additional] of Object.entries(writing.additionalBenchmarks ?? {})) {
        if (JSON.stringify(additional.coverage) !== JSON.stringify(data.writing.additionalBenchmarks[id].coverage)) throw artifactError({ message: "Additional Writing coverage differs from its landing descriptor.", suggestion: "Regenerate all Writing bundles from the pinned source." });
      }
      if (JSON.stringify(writing.collectionCoverage) !== JSON.stringify(data.writing.collectionCoverage)) throw artifactError({ message: "Writing benchmark collection coverage differs from the landing summary.", suggestion: "Regenerate the collection and summary from the same selected sources." });
      const writingBenchmarkIds = [writing.benchmarks[0].id, ...(writing.benchmarkPublications ?? []).map(child => child.benchmarkId), ...Object.keys(writing.additionalBenchmarks ?? {})];
      if (JSON.stringify(writingBenchmarkIds) !== JSON.stringify(data.writing.benchmarkIds ?? [data.writing.benchmarkId])) throw artifactError({ message: "Writing report identities differ from the selected benchmark collection.", suggestion: "Preserve each selected Writing benchmark and its own report route." });
    } else if (writing !== null || writingResponses !== null || writingCreationResponses !== null) throw artifactError({ message: "Unselected Writing evidence reached the artifact.", suggestion: "Keep lazy modules empty until the source is selected." });
    const benchmarkRoutes = buildBenchmarkPublicationRoutes(data);
    if (JSON.stringify(benchmarkRoutes) !== JSON.stringify(publicationProjection.routes)) {
      throw artifactError({
        message: "The generated data and publication route manifest disagree.",
        suggestion: "Repair the deterministic public projector before publishing.",
        context: { releaseId }
      });
    }
    routes = benchmarkRoutes;
    validateHtmlTargets({ filesByPath, releaseId, routes });

    const textualLeakPaths = files
      .filter((file) => /^(?:text\/|application\/(?:javascript|json))/.test(file.contentType))
      .filter((file) => {
        const source = file.body.toString("utf8");
        // Candidate documents can legitimately route their authored supporting
        // files through ../work-spec.md. They are preserved as response text,
        // independently validated against pinned evidence before reaching here.
        const authoredResponseText = file.path === "responses.js" && publicationProjection.projection.aiWorkflows;
        // Preserve authored /users/ API routes while rejecting the literal Mac /Users/ home prefix.
        const parentPathSource = file.path === "writing-responses.js" ? writingParentPathScanSource(writing, primaryWritingResponses)
          : file.path === WRITING_CREATION_ARCHIVE.path ? writingCreationParentPathScanSource(writing, writingCreationResponses) : source;
        const localPathSource = file.path === WRITING_CREATION_ARCHIVE.path ? writingCreationLocalPathScanSource(source, writingCreationResponses) : source;
        return PRIVATE_LOCAL_PATH_PATTERN.test(localPathSource) || source.includes("/Users/") || (!authoredResponseText && PRIVATE_PARENT_PATH_PATTERN.test(parentPathSource));
      })
      .map((file) => file.path);
    if (textualLeakPaths.length > 0) {
      throw artifactError({
        message: "The production artifact contains a local benchmark-evidence path.",
        suggestion: "Remove local evidence paths from the public projection.",
        context: { paths: textualLeakPaths, releaseId }
      });
    }

    const fixtureTokenPaths = files
      .filter((file) => config.publicFiles.some((fileConfig) => fileConfig.path === file.path))
      .filter((file) => /^(?:text\/|application\/(?:javascript|json))/.test(file.contentType))
      // Story fact packets can describe a simulated world (The Matrix) or a
      // simulated relationship. Their pinned source is validated structurally;
      // retired-demo vocabulary is not a valid test of that literary evidence.
      .filter((file) => !["responses.js", "writing-responses.js", "writing-data.js", WRITING_CREATION_ARCHIVE.path].includes(file.path))
      .filter((file) => FIXTURE_TOKEN_PATTERN.test(file.body.toString("utf8")))
      .map((file) => file.path);
    if (fixtureTokenPaths.length > 0) {
      throw artifactError({
        message: "The production artifact contains retired fixture language.",
        suggestion: "Remove fake, illustrative, synthetic, simulated, fixture, and mock copy from public release files.",
        context: { paths: fixtureTokenPaths, releaseId }
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
    projection: {
      basisSha256: publicationProjection.basisSha256,
      developmentResultSetCount: publicationProjection.counts.developmentResultSets,
      eligibleResultSetCount: publicationProjection.counts.eligibleResultSets,
      withheldResultSetCount: publicationProjection.counts.withheldResultSets,
      familyCount: publicationProjection.counts.families,
      trackCount: publicationProjection.counts.tracks,
      benchmarkDefinitionCount: publicationProjection.counts.benchmarks,
      categoryCount: publicationProjection.counts.categories,
      conditionCount: publicationProjection.counts.conditions,
      settingCount: publicationProjection.counts.settings,
      resultEntryCount: publicationProjection.counts.resultEntries,
      responseCount: publicationProjection.counts.responses
    },
    files: files.map(({ path: relativePath, bytes, sha256: fileSha256, contentType, cacheClass, cacheControl }) => ({
      path: relativePath,
      bytes,
      sha256: fileSha256,
      contentType,
      cacheClass,
      cacheControl
    })),
    routes,
    ...(artifactFiles.length ? { artifactOrigin: GAME_ARTIFACT_ORIGIN, artifacts: artifactFiles.map(({ key, publicUrl, bytes, sha256, contentType, cacheControl }) => ({ key, publicUrl, bytes, sha256, contentType, cacheControl })) } : {})
  };

  return {
    config,
    configPath,
    siteRootDirectory,
    templatePath,
    acceptance,
    projection: publicManifest.projection,
    releaseId,
    sourceManifest,
    publicManifest,
    files,
    artifactFiles,
    artifactTotalBytes: artifactFiles.reduce((sum, file) => sum + file.bytes, 0),
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
