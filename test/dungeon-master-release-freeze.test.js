import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { publishBenchmarkSite } from "../cli/benchmark-publish.js";
import { createSelectionSnapshot, loadSelectionSnapshot, SELECTION_PATHS } from "../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/rehearse-release.mjs";
import { assertExpectedPreviousRelease, createLeaseGuardedSpawn, publishRelease, verifyCandidateInfrastructure, verifyExistingInfrastructure } from "../docs/work/vasir-benchmarking/dungeon-master-adventure-outline/publish-release.mjs";

const RELEASE = "a".repeat(64);
const PREVIOUS = "b".repeat(64);
const NEWER = "c".repeat(64);
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dm-release-freeze-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, "source");
  const repo = path.join(directory, "repo");
  const write = (relative, contents, root = source) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, contents);
    return file;
  };
  for (const selection of SELECTION_PATHS) write(selection, JSON.stringify({ selection }));
  const config = { target: { stackName: "fixture-stack", profile: "fixture-profile", region: "fixture-region", accountId: "123", domain: "fixture.test", hostedZoneId: "ZONE", bucketName: "fixture-bucket" }, tags: { Application: "fixture" } };
  const template = "AWSTemplateFormatVersion: '2010-09-09'\nResources: {}\n";
  const artifact = { config, releaseId: RELEASE, templatePath: write("template.yml", template), dispose() {} };
  const stack = { StackName: config.target.stackName, StackStatus: "UPDATE_COMPLETE", Parameters: [
    { ParameterKey: "DomainName", ParameterValue: config.target.domain }, { ParameterKey: "HostedZoneId", ParameterValue: config.target.hostedZoneId },
    { ParameterKey: "BucketName", ParameterValue: config.target.bucketName }, { ParameterKey: "ActiveReleaseId", ParameterValue: PREVIOUS }
  ], Tags: [{ Key: "Application", Value: "fixture" }] };
  return { directory, source, repo, write, config, template, artifact, stack };
}

test("all seven frozen selections survive canonical drift while immutable evidence retains its original root", t => {
  const f = fixture(t);
  const snapshot = createSelectionSnapshot({ proofDirectory: path.join(f.directory, "proof"), publicationSourceRootDirectory: f.source, repoRootDirectory: f.repo });
  for (const selection of SELECTION_PATHS) {
    f.write(selection, "new canonical selection");
    assert.equal(snapshot.readFileSyncImplementation(path.join(f.source, selection), "utf8"), JSON.stringify({ selection }));
  }
  const reloaded = loadSelectionSnapshot({ snapshotPath: snapshot.identity.path, expectedSha256: snapshot.identity.sha256, expectedSnapshotId: snapshot.identity.snapshotId });
  assert.equal(reloaded.manifest.schemaVersion, 2);
  assert.equal(reloaded.manifest.files.length, 7);
  assert.ok(reloaded.manifest.files.some(file => file.path === 'benchmarks/writing-compact-v1/publication.json'));
  assert.ok(reloaded.manifest.files.some(file => file.path === 'benchmarks/storytelling-magic-discovery/publication.json'));
  const evidence = f.write(".agents/immutable.json", "original immutable evidence");
  assert.equal(reloaded.readFileSyncImplementation(evidence, "utf8"), "original immutable evidence");
  const buffer = reloaded.readFileSyncImplementation(path.join(f.source, SELECTION_PATHS[0])); buffer.fill(0);
  assert.match(reloaded.readFileSyncImplementation(path.join(f.source, SELECTION_PATHS[0]), "utf8"), /selection/);
});

test("historical five-selection snapshots retain their exact schema without admitting grafted selections", t => {
  const f = fixture(t);
  const snapshot = createSelectionSnapshot({ proofDirectory: path.join(f.directory, "proof"), publicationSourceRootDirectory: f.source, repoRootDirectory: f.repo });
  const { snapshotId, ...legacy } = snapshot.manifest;
  legacy.schemaVersion = 1;
  legacy.files = legacy.files.filter(file => !['benchmarks/writing-compact-v1/publication.json', 'benchmarks/storytelling-magic-discovery/publication.json'].includes(file.path));
  const save = manifest => f.write('proof/legacy.json', JSON.stringify({ ...manifest, snapshotId: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex') }), f.directory);
  const legacyPath = save(legacy);
  assert.equal(loadSelectionSnapshot({ snapshotPath: legacyPath }).manifest.files.length, 5);
  legacy.files.push(snapshot.manifest.files.find(file => file.path === 'benchmarks/writing-compact-v1/publication.json'));
  save(legacy);
  assert.throws(() => loadSelectionSnapshot({ snapshotPath: legacyPath }), /Invalid selection snapshot/);
});

test("snapshot tampering, source-root substitution and newly created absent selections fail closed", t => {
  const f = fixture(t); fs.unlinkSync(path.join(f.source, SELECTION_PATHS[2]));
  const snapshot = createSelectionSnapshot({ proofDirectory: path.join(f.directory, "proof"), publicationSourceRootDirectory: f.source, repoRootDirectory: f.repo });
  f.write(SELECTION_PATHS[2], "newly selected");
  assert.throws(() => snapshot.readFileSyncImplementation(path.join(f.source, SELECTION_PATHS[2]), "utf8"), error => error.code === "ENOENT");
  assert.throws(() => loadSelectionSnapshot({ snapshotPath: snapshot.identity.path, publicationSourceRootDirectory: f.repo }), /source root differs/);
  const file = path.join(f.directory, "proof", "selections", SELECTION_PATHS[0]); fs.chmodSync(file, 0o644); fs.writeFileSync(file, "tampered");
  assert.throws(() => loadSelectionSnapshot({ snapshotPath: snapshot.identity.path }), /Frozen selection changed/);
});

test("preview redirects only Dungeon Master evidence and cannot be published", async t => {
  const f = fixture(t); f.write(SELECTION_PATHS[3], "preview selection", f.repo);
  const evidence = ".agents/vasir-evals/dungeon-master-adventure-outline/publication-snapshots/example/run.json";
  f.write(evidence, "original evidence"); f.write(evidence, "preview evidence", f.repo);
  const snapshot = createSelectionSnapshot({ proofDirectory: path.join(f.directory, "proof"), publicationSourceRootDirectory: f.source, repoRootDirectory: f.repo, preview: true });
  assert.equal(snapshot.readFileSyncImplementation(path.join(f.source, evidence), "utf8"), "preview evidence");
  assert.equal(snapshot.readFileSyncImplementation(path.join(f.source, SELECTION_PATHS[4]), "utf8"), JSON.stringify({ selection: SELECTION_PATHS[4] }));
  assert.throws(() => loadSelectionSnapshot({ snapshotPath: snapshot.identity.path, repoRootDirectory: f.repo }), /explicit DM_BENCHMARK_PREVIEW/);
  f.write("proof/candidate.json", JSON.stringify({ releaseId: RELEASE, publicationSourceRootDirectory: f.source, preview: true, selectionSnapshot: snapshot.identity }), f.directory);
  await assert.rejects(publishRelease({ repoRootDirectory: f.repo, environmentVariables: { DM_BENCHMARK_PREVIEW: "1" }, args: ["--expected-release", RELEASE, "--expected-previous-release", PREVIOUS, "--selection-snapshot", snapshot.identity.path, "--output", path.join(f.directory, "receipt.json")] }), /Preview snapshots are for rehearsal and dry-run only/);
});

test("matching Original YAML template, parameters, tags and stable stack yield a read-only no-op", t => {
  const f = fixture(t); const calls = [];
  const aws = { runJson(args) { calls.push(args); return { TemplateBody: f.template }; } };
  assert.equal(verifyExistingInfrastructure({ artifact: f.artifact, aws, existingStack: f.stack, expectedPreviousRelease: PREVIOUS }), f.stack);
  assert.deepEqual(calls, [["cloudformation", "get-template", "--stack-name", "fixture-stack", "--template-stage", "Original"]]);
});

test("candidate infrastructure hashes bind configuration and template before AWS", t => {
  const f = fixture(t);
  const infrastructureSources = ["deployment.json", "infra/production.yml"].map(file => {
    const contents = file === "deployment.json" ? JSON.stringify(f.config) : f.template;
    f.write(`site/vasirbenchmark.com/${file}`, contents, f.repo);
    return { path: file, bytes: Buffer.byteLength(contents), sha256: crypto.createHash("sha256").update(contents).digest("hex") };
  });
  verifyCandidateInfrastructure({ candidate: { infrastructureSources }, repoRootDirectory: f.repo });
  f.write("site/vasirbenchmark.com/deployment.json", "unreviewed configuration", f.repo);
  assert.throws(() => verifyCandidateInfrastructure({ candidate: { infrastructureSources }, repoRootDirectory: f.repo }), /Infrastructure changed after candidate review/);
  assert.throws(() => verifyCandidateInfrastructure({ candidate: {}, repoRootDirectory: f.repo }), /does not bind both infrastructure sources/);
});

test("Original JSON templates support object or string responses without ignoring property changes", t => {
  const f = fixture(t); const body = { Resources: {}, Description: "fixture" }; fs.writeFileSync(f.artifact.templatePath, JSON.stringify(body));
  for (const TemplateBody of [body, JSON.stringify({ Description: "fixture", Resources: {} }, null, 2)]) {
    assert.equal(verifyExistingInfrastructure({ artifact: f.artifact, aws: { runJson: () => ({ TemplateBody }) }, existingStack: f.stack, expectedPreviousRelease: PREVIOUS }), f.stack);
  }
  assert.throws(() => verifyExistingInfrastructure({ artifact: f.artifact, aws: { runJson: () => ({ TemplateBody: { ...body, Extra: true } }) }, existingStack: f.stack, expectedPreviousRelease: PREVIOUS }), /Original template/);
});

for (const [label, mutate, expected] of [
  ["template bytes", f => { f.observedTemplate += "\n"; }, /Original template/],
  ["parameter value", f => { f.stack.Parameters[0].ParameterValue = "other.test"; }, /parameters mismatch/],
  ["extra parameter", f => { f.stack.Parameters.push({ ParameterKey: "Extra", ParameterValue: "value" }); }, /parameters mismatch/],
  ["duplicate parameter", f => { f.stack.Parameters.push(f.stack.Parameters[0]); }, /duplicate parameters/],
  ["tag value", f => { f.stack.Tags[0].Value = "other"; }, /tags mismatch/],
  ["stack status", f => { f.stack.StackStatus = "UPDATE_IN_PROGRESS"; }, /stable terminal state/],
  ["stack identity", f => { f.stack.StackName = "other-stack"; }, /identity mismatch/],
  ["active release", f => { f.stack.Parameters[3].ParameterValue = NEWER; }, /active release changed/]
]) test(`infrastructure no-op rejects ${label} mismatch before mutation`, t => {
  const f = fixture(t); f.observedTemplate = f.template; mutate(f);
  assert.throws(() => verifyExistingInfrastructure({ artifact: f.artifact, aws: { runJson: () => ({ TemplateBody: f.observedTemplate }) }, existingStack: f.stack, expectedPreviousRelease: PREVIOUS }), expected);
});

test("lease guard refuses mutation before verification and permits unchanged activation afterward", () => {
  let verified = false; const calls = [];
  const guarded = createLeaseGuardedSpawn({ isLeaseVerified: () => verified, spawnSyncImplementation: (command, args) => { calls.push(args); return { status: 0, stdout: "{}" }; } });
  assert.throws(() => guarded("aws", ["cloudformation", "deploy"]), /before the verified publication lease/);
  assert.throws(() => guarded("aws", ["cloudformation", "delete-stack"]), /before the verified publication lease/);
  assert.equal(calls.length, 0);
  guarded("aws", ["cloudformation", "validate-template"]);
  verified = true; guarded("aws", ["cloudformation", "deploy", `ActiveReleaseId=${RELEASE}`]);
  assert.equal(calls.at(-1).at(-1), `ActiveReleaseId=${RELEASE}`);
  verified = false; assert.throws(() => guarded("aws", ["cloudformation", "deploy"]), /before the verified publication lease/);
});

test("fresh live release check rejects drift or malformed read-only responses", t => {
  const f = fixture(t);
  const spawn = actual => (command, args) => {
    assert.equal(command, "aws"); assert.deepEqual(args.slice(0, 2), ["cloudformation", "describe-stacks"]);
    return { status: 0, stdout: JSON.stringify({ Stacks: [{ Parameters: [{ ParameterKey: "ActiveReleaseId", ParameterValue: actual }] }] }) };
  };
  assert.equal(assertExpectedPreviousRelease({ config: f.config, expectedPreviousRelease: PREVIOUS, spawnSyncImplementation: spawn(PREVIOUS) }), PREVIOUS);
  assert.throws(() => assertExpectedPreviousRelease({ config: f.config, expectedPreviousRelease: PREVIOUS, spawnSyncImplementation: spawn(NEWER) }), /live release changed/);
  assert.throws(() => assertExpectedPreviousRelease({ config: f.config, expectedPreviousRelease: PREVIOUS, spawnSyncImplementation: () => ({ status: 0, stdout: "malformed" }) }), /invalid JSON/);
});

test("reusable publisher invokes the optional convergence hook after only read-only AWS operations", async t => {
  const f = fixture(t); const sentinel = new Error("stop after verified hook"); const calls = []; let disposed = false;
  f.artifact.dispose = () => { disposed = true; };
  const spawnSyncImplementation = (command, args) => {
    assert.equal(command, "aws"); if (args[0] === "--version") return { status: 0, stdout: "aws-cli/2" };
    calls.push(`${args[0]}:${args[1]}`);
    const result = args[0] === "sts" ? { Account: "123" } : args[0] === "route53" ? { HostedZone: { Name: "fixture.test." } }
      : args[1] === "describe-stacks" ? { Stacks: [f.stack] } : args[1] === "validate-template" ? {} : null;
    assert.notEqual(result, null, "unexpected operation before hook"); return { status: 0, stdout: JSON.stringify(result) };
  };
  await assert.rejects(publishBenchmarkSite({ repoRootDirectory: f.repo, buildArtifactImplementation: () => f.artifact, spawnSyncImplementation,
    convergeInfrastructureImplementation: ({ artifact, existingStack, aws }) => { assert.equal(artifact, f.artifact); assert.deepEqual(existingStack, f.stack); assert.equal(typeof aws.runJson, "function"); throw sentinel; }
  }), error => error === sentinel);
  assert(disposed); assert.deepEqual(calls, ["sts:get-caller-identity", "route53:get-hosted-zone", "cloudformation:validate-template", "cloudformation:describe-stacks"]);
});
