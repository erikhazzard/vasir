import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

import {
  buildBenchmarkPublicationArtifact,
  getBenchmarkPublicationFileByteLimit,
  readBenchmarkDeploymentConfig,
  writingCreationLocalPathScanSource,
  writingCreationParentPathScanSource
} from "../cli/benchmark-publication-artifact.js";
import { WRITING_CREATION_ARCHIVE } from "../cli/eval/writing-response-archives.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const id = WRITING_CREATION_ARCHIVE.benchmarkId;

function archiveFixture() {
  const files = [
    { path: "SKILL.md", content: "Use the frozen story references." },
    { path: "references/story.md", content: "Use [session](../assets/session.md#starting) for the story." },
    { path: "assets/session.md", content: "A known frozen session reference." }
  ];
  const context = files.map(file => `<<<FROZEN_CONTEXT_FILE ${JSON.stringify(file.path)}>>>\n${file.content}\n<<<END_FROZEN_CONTEXT_FILE>>>`).join("\n\n");
  const segment = `Fixed judge instructions\n${context}\nAnonymous candidates`;
  const projection = { benchmarks: [{ id }], methodology: {
    skillFiles: files.map(file => ({ path: file.path, bytes: Buffer.byteLength(file.content), sha256: hash(file.content) })),
    informedSkillFiles: files.map(file => file.path),
    judgeProfiles: ["astra", "sol"].map(model => ({ id: `${model}-informed`, contextMode: "informed", contextSha256: hash(context) }))
  } };
  const responses = {
    promptFiles: [
      { id: "frozen-skill-root", title: "Frozen root instruction", content: `Provider wrapper\n${files[0].content}`, sha256: hash(`Provider wrapper\n${files[0].content}`) },
      ...files.slice(1).map(file => ({ id: file.path, title: file.path, content: file.content, sha256: hash(file.content) })),
      { id: "frozen-informed-judge-context", content: context, sha256: hash(context) }
    ],
    judgePromptSegments: [{ sha256: hash(segment), content: segment }],
    responses: [{ benchmarkId: id, outputText: "A retained original story.", judgments: [{ rationale: "A retained review." }] }],
    judgeRequests: [{ outputText: "An original paired review." }]
  };
  return { writing: { benchmarkPublications: [{ benchmarkId: id, projection }] }, projection, responses, context };
}

test("declared response archives retain the 8 MiB limit while ordinary files retain 2 MiB", () => {
  const { config } = readBenchmarkDeploymentConfig({ repoRootDirectory: repo });
  assert.equal(config.publicFiles.length, 16);
  assert.equal(config.limits.maxFileBytes, 2 * 1024 * 1024);
  assert.equal(config.limits.maxResponseFileBytes, 8 * 1024 * 1024);
  assert.equal(config.limits.maxCompressedLandingBytes, 300000);
  assert.deepEqual(config.publicFiles.filter(file => file.kind === "response-archive").map(file => file.path), [
    "responses.js", "writing-responses.js", WRITING_CREATION_ARCHIVE.path
  ]);
  for (const file of config.publicFiles) {
    assert.equal(getBenchmarkPublicationFileByteLimit(config, file.path), file.kind === "response-archive" ? 8 * 1024 * 1024 : 2 * 1024 * 1024);
  }
});

test("creation privacy scan recognizes verified frozen links in files, context, and prompt fragments without altering evidence", () => {
  const { writing, projection, responses } = archiveFixture();
  const original = JSON.stringify(responses);
  const scanned = writingCreationParentPathScanSource(writing, responses);
  assert.ok(!scanned.includes("../"));
  assert.match(scanned, /verified-frozen-skill-link/);
  assert.equal(JSON.stringify(responses), original);
  assert.equal(writingCreationParentPathScanSource(projection, responses), scanned);
  assert.equal(writingCreationParentPathScanSource(writing, null), "null");
});

test("creation privacy scan keeps candidate text, reviews, raw paths, and unknown frozen destinations visible", () => {
  const { writing, responses, context } = archiveFixture();
  responses.responses[0].outputText = `Candidate copied context: ${context}\n[private](../assets/session.md)`;
  responses.responses[0].judgments[0].rationale = "[private](../assets/session.md)";
  responses.judgeRequests[0].outputText = "[private](../assets/session.md)";
  const fragment = `${context}\nRaw ../assets/session.md and [unknown](../../evidence/answer.md)`;
  responses.judgePromptSegments = [{ sha256: hash(fragment), content: fragment }];
  const scanned = JSON.parse(writingCreationParentPathScanSource(writing, responses));
  assert.equal(scanned.responses[0].outputText, responses.responses[0].outputText);
  assert.equal(scanned.responses[0].judgments[0].rationale, responses.responses[0].judgments[0].rationale);
  assert.equal(scanned.judgeRequests[0].outputText, responses.judgeRequests[0].outputText);
  assert.match(scanned.judgePromptSegments[0].content, /Raw \.\.\/assets\/session\.md/);
  assert.match(scanned.judgePromptSegments[0].content, /\.\.\/\.\.\/evidence\/answer\.md/);
});

test("creation privacy scan does not trust reference titles or self-consistent substituted context", () => {
  const { writing, projection, responses } = archiveFixture();
  const reference = responses.promptFiles.find(file => file.title === "references/story.md");
  reference.content = "Injected [session](../assets/session.md)";
  reference.sha256 = hash(reference.content);
  const context = responses.promptFiles.find(file => file.id === "frozen-informed-judge-context");
  context.content = context.content.replace("Use [session]", "Injected [session]");
  context.sha256 = hash(context.content);
  for (const profile of projection.methodology.judgeProfiles) profile.contextSha256 = context.sha256;
  const scanned = JSON.parse(writingCreationParentPathScanSource(writing, responses));
  assert.equal(scanned.promptFiles.find(file => file.id === reference.id).content, reference.content);
  assert.equal(scanned.promptFiles.find(file => file.id === context.id).content, context.content);
  const unselected = writingCreationParentPathScanSource({ benchmarkPublications: [] }, responses);
  assert.equal(unselected, JSON.stringify(responses));
});

test("creation local-path scan does not mistake an exact answer's escaped newline for a Windows drive", () => {
  const outputText = "It is not a saint's:\n\nIt says it does not know.\n";
  const responses = { responses: [{ outputText, provenance: { outputSha256: hash(outputText) } }] };
  const source = JSON.stringify(responses), before = structuredClone(responses);
  const drive = /(?:^|[\s"'(=>])[A-Za-z]:[/\\]/u;
  assert.ok(drive.test(source));
  const scanned = writingCreationLocalPathScanSource(source, responses);
  assert.ok(!drive.test(scanned));
  assert.deepEqual(responses, before);
  assert.equal(JSON.parse(source).responses[0].outputText, outputText);
  assert.equal(hash(JSON.parse(source).responses[0].outputText), responses.responses[0].provenance.outputSha256);
  responses.responses[0].provenance.outputSha256 = "f".repeat(64);
  assert.equal(writingCreationLocalPathScanSource(source, responses), source);
});

test("creation newline normalization retains real Windows paths, other private paths, reviews and source code", () => {
  const outputText = "A saint's:\n'C:\\new\\file.txt' and C:/private/file.txt\n.agents/private and vasir-evals/private";
  const review = "Untouched review's:\n'C:\\private\\review.txt'";
  const responses = { responses: [{ outputText, provenance: { outputSha256: hash(outputText) }, judgments: [{ rationale: review }] }], judgeRequests: [{ outputText: review }] };
  const source = `const privatePath = 'C:\\code\\private.txt';\n${JSON.stringify(responses)}`;
  const scanned = writingCreationLocalPathScanSource(source, responses);
  assert.match(scanned, /C:\\\\new\\\\file\.txt/u);
  assert.ok(scanned.includes("C:/private/file.txt"));
  assert.ok(scanned.includes(".agents/private"));
  assert.ok(scanned.includes("vasir-evals/private"));
  assert.ok(scanned.startsWith("const privatePath = 'C:\\code\\private.txt';\n"));
  assert.ok(scanned.includes(JSON.stringify(review)));
  assert.equal(responses.responses[0].outputText, outputText);
  const literalBackslash = "A saint's:\\n";
  const literalSource = JSON.stringify({ responses: [{ outputText: literalBackslash, provenance: { outputSha256: hash(literalBackslash) } }] });
  assert.equal(writingCreationLocalPathScanSource(literalSource, JSON.parse(literalSource)), literalSource);
});

test("generated creation archive participates in the immutable release without entering landing dependencies", () => {
  const artifact = buildBenchmarkPublicationArtifact({ repoRootDirectory: repo, validateAcceptance: false });
  try {
    const file = artifact.files.find(file => file.path === WRITING_CREATION_ARCHIVE.path);
    assert.ok(file);
    assert.equal(artifact.fileCount, 16);
    assert.equal(file.contentType, "text/javascript; charset=utf-8");
    assert.equal(file.cacheControl, "public, max-age=31536000, immutable");
    assert.equal(file.sha256, hash(file.body));
    assert.equal(artifact.sourceManifest.find(item => item.path === file.path).sha256, file.sha256);
    assert.equal(artifact.publicManifest.files.find(item => item.path === file.path).sha256, file.sha256);
    assert.ok(file.bytes <= artifact.config.limits.maxResponseFileBytes);
    assert.ok(artifact.compressedLandingBytes <= 300000);
    const globals = { window: {} };
    vm.runInNewContext(file.body.toString("utf8"), globals);
    assert.deepEqual(Object.keys(globals.window), [WRITING_CREATION_ARCHIVE.globalName]);
    assert.ok(globals.window[WRITING_CREATION_ARCHIVE.globalName] === null || globals.window[WRITING_CREATION_ARCHIVE.globalName].kind === "vasirbenchmark-writing-responses");
    assert.ok(!artifact.files.find(file => file.path === "index.html").body.toString("utf8").includes(WRITING_CREATION_ARCHIVE.path));
    assert.ok(!fs.readFileSync(path.join(repo, "site/vasirbenchmark.com/benchmark-report.html"), "utf8").includes(WRITING_CREATION_ARCHIVE.path));
  } finally {
    artifact.dispose();
  }
});
