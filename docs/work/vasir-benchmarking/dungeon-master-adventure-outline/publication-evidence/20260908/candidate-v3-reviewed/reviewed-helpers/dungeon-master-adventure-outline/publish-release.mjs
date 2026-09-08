import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { loadSelectionSnapshot } from "./rehearse-release.mjs";

export function verifyCandidateInfrastructure({ candidate, repoRootDirectory }) {
  const paths = ["deployment.json", "infra/production.yml"];
  if (!Array.isArray(candidate.infrastructureSources) || candidate.infrastructureSources.length !== paths.length) throw new Error("The reviewed candidate does not bind both infrastructure sources.");
  for (const [index, entry] of candidate.infrastructureSources.entries()) {
    if (entry.path !== paths[index]) throw new Error("The candidate infrastructure source allowlist changed.");
    const contents = fs.readFileSync(path.join(repoRootDirectory, "site/vasirbenchmark.com", entry.path));
    if (contents.length !== entry.bytes || crypto.createHash("sha256").update(contents).digest("hex") !== entry.sha256) throw new Error(`Infrastructure changed after candidate review: ${entry.path}; no AWS action was started.`);
  }
}

export function createLeaseGuardedSpawn({ isLeaseVerified, spawnSyncImplementation = spawnSync }) {
  const readOnlyCloudFormationCommands = new Set(["describe-stacks", "describe-stack-events", "describe-stack-resources", "get-template", "get-template-summary", "list-stack-resources", "validate-template", "wait"]);
  return (command, args, options) => {
    if (path.basename(command) === "aws" && args[0] === "cloudformation" && !isLeaseVerified() && !readOnlyCloudFormationCommands.has(args[1])) {
      throw new Error("CloudFormation mutation before the verified publication lease was refused; no deployment was started. The reusable publisher requires a separately verified no-op or lease-safe infrastructure convergence path.");
    }
    return spawnSyncImplementation(command, args, options);
  };
}

export function verifyExistingInfrastructure({ artifact, aws, existingStack, expectedPreviousRelease }) {
  const fail = detail => { throw new Error(`Infrastructure differs from the reviewed release: ${detail}. No infrastructure deployment was started; converge it under a separate verified lease before publishing.`); };
  if (!existingStack || !["CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"].includes(existingStack.StackStatus)) fail("the existing stack is missing or not in a stable terminal state");
  if (existingStack.StackName !== artifact.config.target.stackName) fail("stack identity mismatch");
  const pairs = (records, key, value, label) => {
    if (!Array.isArray(records) || records.some(record => typeof record?.[key] !== "string" || typeof record?.[value] !== "string") || new Set(records.map(record => record[key])).size !== records.length) fail(`invalid or duplicate ${label}`);
    return Object.fromEntries(records.map(record => [record[key], record[value]]));
  };
  const parameters = pairs(existingStack.Parameters, "ParameterKey", "ParameterValue", "parameters");
  if (!/^[a-f0-9]{64}$/.test(expectedPreviousRelease ?? "") || parameters.ActiveReleaseId !== expectedPreviousRelease) fail("the active release changed after review");
  delete parameters.ActiveReleaseId;
  const desired = { DomainName: artifact.config.target.domain, HostedZoneId: artifact.config.target.hostedZoneId, BucketName: artifact.config.target.bucketName };
  if (!isDeepStrictEqual(parameters, desired)) fail("non-release parameters mismatch");
  if (!isDeepStrictEqual(pairs(existingStack.Tags ?? [], "Key", "Value", "tags"), artifact.config.tags ?? {})) fail("stack tags mismatch");
  const response = aws.runJson(["cloudformation", "get-template", "--stack-name", artifact.config.target.stackName, "--template-stage", "Original"], { timeout: 30_000 });
  const expected = fs.readFileSync(artifact.templatePath, "utf8");
  let matches = typeof response.TemplateBody === "string" && response.TemplateBody === expected;
  if (!matches) {
    // The CLI decodes JSON templates to objects; YAML Original bodies stay strings.
    // Preserve YAML bytes exactly and compare every JSON property and value.
    try {
      const expectedObject = JSON.parse(expected);
      const observedObject = typeof response.TemplateBody === "string" ? JSON.parse(response.TemplateBody) : response.TemplateBody;
      matches = expectedObject !== null && typeof expectedObject === "object" && !Array.isArray(expectedObject) && isDeepStrictEqual(expectedObject, observedObject);
    } catch { matches = false; }
  }
  if (!matches) fail("the deployed Original template does not exactly match the artifact template");
  return existingStack;
}

export function assertExpectedPreviousRelease({ config, expectedPreviousRelease, spawnSyncImplementation = spawnSync }) {
  if (!/^[a-f0-9]{64}$/.test(expectedPreviousRelease ?? "")) throw new Error("An exact --expected-previous-release is required before checking live publication state.");
  const result = spawnSyncImplementation("aws", ["cloudformation", "describe-stacks", "--stack-name", config.target.stackName,
    "--profile", config.target.profile, "--region", config.target.region, "--no-cli-pager", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (result?.error || result?.status !== 0) throw new Error("Could not verify the active release while holding the publication lease; cleanup and staging were not started.");
  let response;
  try { response = JSON.parse(result.stdout); } catch { throw new Error("The live release check returned invalid JSON; cleanup and staging were not started."); }
  const stacks = response.Stacks;
  const active = Array.isArray(stacks) && stacks.length === 1 ? stacks[0].Parameters?.find(parameter => parameter.ParameterKey === "ActiveReleaseId")?.ParameterValue : null;
  if (active !== expectedPreviousRelease) throw new Error(`The live release changed after review (expected ${expectedPreviousRelease}, observed ${active ?? "missing"}); cleanup and staging were not started. Review the new live release before publishing.`);
  return active;
}

export async function publishRelease({ args = process.argv.slice(2), repoRootDirectory = process.cwd(), environmentVariables = process.env,
  publishBenchmarkSiteImplementation, buildBenchmarkPublicationArtifactImplementation, spawnSyncImplementation = spawnSync } = {}) {
  const { values } = parseArgs({ args, options: {
    "dry-run": { type: "boolean", default: false },
    "expected-release": { type: "string" },
    "expected-previous-release": { type: "string" },
    "selection-snapshot": { type: "string" },
    output: { type: "string" }
  } });
  if (!/^[a-f0-9]{64}$/.test(values["expected-release"] ?? "") || !values.output || !values["selection-snapshot"]) throw new Error("Pass the reviewed --expected-release, --selection-snapshot, and an --output receipt path.");
  if ((!values["dry-run"] || values["expected-previous-release"] !== undefined) && !/^[a-f0-9]{64}$/.test(values["expected-previous-release"] ?? "")) throw new Error("Actual publication requires the reviewed --expected-previous-release hash.");
  const repo = path.resolve(repoRootDirectory);
  const progress = [];
  const startedAt = new Date().toISOString();
  let selectionSnapshot, publicationSourceRootDirectory, observedPreviousRelease;
  const writeReceipt = fields => {
    fs.mkdirSync(path.dirname(path.resolve(values.output)), { recursive: true });
    fs.writeFileSync(values.output, JSON.stringify({ startedAt, completedAt: new Date().toISOString(), publicationSourceRootDirectory,
      expectedRelease: values["expected-release"], expectedPreviousRelease: values["expected-previous-release"] ?? null,
      observedPreviousRelease: observedPreviousRelease ?? null, selectionSnapshot: selectionSnapshot?.identity ?? null, progress, ...fields }, null, 2) + "\n");
  };
  try {
    const snapshotPath = path.resolve(values["selection-snapshot"]);
    const candidate = JSON.parse(fs.readFileSync(path.join(path.dirname(snapshotPath), "candidate.json"), "utf8"));
    if (candidate.releaseId !== values["expected-release"] || !/^[a-f0-9]{64}$/.test(candidate.selectionSnapshot?.sha256 ?? "") || !/^[a-f0-9]{64}$/.test(candidate.selectionSnapshot?.snapshotId ?? "")) throw new Error("The candidate does not bind this reviewed release to a selection snapshot. Rehearse a new candidate.");
    selectionSnapshot = loadSelectionSnapshot({ snapshotPath, expectedSha256: candidate.selectionSnapshot.sha256,
      expectedSnapshotId: candidate.selectionSnapshot.snapshotId, publicationSourceRootDirectory: environmentVariables.DM_BENCHMARK_SOURCE_ROOT,
      repoRootDirectory: repo, allowPreview: environmentVariables.DM_BENCHMARK_PREVIEW === "1" });
    publicationSourceRootDirectory = selectionSnapshot.publicationSourceRootDirectory;
    if (candidate.publicationSourceRootDirectory !== publicationSourceRootDirectory || candidate.preview !== selectionSnapshot.manifest.preview) throw new Error("The candidate source roots or preview mode differ from its selection snapshot.");
    if (selectionSnapshot.manifest.preview && !values["dry-run"]) throw new Error("Preview snapshots are for rehearsal and dry-run only; actual publication requires a non-preview candidate.");
    verifyCandidateInfrastructure({ candidate, repoRootDirectory: repo });
    const publishBenchmarkSite = publishBenchmarkSiteImplementation ?? (await import(pathToFileURL(path.join(repo, "cli/benchmark-publish.js")))).publishBenchmarkSite;
    const buildBenchmarkPublicationArtifact = buildBenchmarkPublicationArtifactImplementation ?? (await import(pathToFileURL(path.join(repo, "cli/benchmark-publication-artifact.js")))).buildBenchmarkPublicationArtifact;
    let builtArtifact;
    let leaseVerified = false;
    const guardedSpawn = createLeaseGuardedSpawn({ isLeaseVerified: () => leaseVerified, spawnSyncImplementation });
    const result = await publishBenchmarkSite({ repoRootDirectory: repo, dryRun: values["dry-run"], fullAudit: true,
      spawnSyncImplementation: guardedSpawn,
      convergeInfrastructureImplementation: options => verifyExistingInfrastructure({ ...options, expectedPreviousRelease: values["expected-previous-release"] }),
      buildArtifactImplementation: options => {
        builtArtifact = buildBenchmarkPublicationArtifact({ ...options, publicationSourceRootDirectory,
          publicationReadFileSyncImplementation: selectionSnapshot.readFileSyncImplementation });
        return builtArtifact;
      }, onProgress: event => {
        progress.push({ ...event, at: new Date().toISOString() });
        if (event.id === "build-artifact" && event.detail !== values["expected-release"]) throw new Error("The source or presentation changed after review; no AWS action was started. Rehearse the new candidate.");
        if (event.id === "acquire-lease" && !values["dry-run"]) {
          if (!builtArtifact) throw new Error("The publication lease was acquired before its reviewed artifact was available.");
          observedPreviousRelease = assertExpectedPreviousRelease({ config: builtArtifact.config,
            expectedPreviousRelease: values["expected-previous-release"], spawnSyncImplementation });
          leaseVerified = true;
          progress.push({ id: "assert-previous-release", stage: "lease", detail: observedPreviousRelease, at: new Date().toISOString() });
        }
        if (event.id === "release-lease") leaseVerified = false;
        process.stdout.write(JSON.stringify(event) + "\n");
      } });
    writeReceipt({ result });
    process.stdout.write(JSON.stringify({ status: result.status, dryRun: values["dry-run"], artifact: result.artifact, verification: result.verification }) + "\n");
    return result;
  } catch (error) {
    writeReceipt({ error: { code: error.code ?? null, message: error.message, context: error.context ?? null } });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await publishRelease();
