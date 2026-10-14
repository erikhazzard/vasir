import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareRefreshRun, createRefreshJudgePrompt, createRefreshInlineInstruction } from '../benchmarks/storytelling-skill-refresh/run.mjs';
import { projectWritingRefreshSnapshot, validateWritingRefreshPublication, WRITING_REFRESH_BENCHMARK_IDS, WRITING_REFRESH_SELECTION_PATH } from '../cli/eval/writing-refresh-publication.js';
import { buildWritingPublication } from '../cli/eval/writing-publication.js';
import { buildWritingCategoryCollection } from '../cli/eval/writing-navigation.js';
import { writingParentPathScanSource } from '../cli/benchmark-publication-artifact.js';

const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-refresh-publication-test-'));
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));
const specification = JSON.parse(fs.readFileSync(new URL('../benchmarks/storytelling-skill-refresh/specification.json', import.meta.url)));
// Isolated fixture answers never enter a public source selection. Frozen input
// assembly and source validation still run against the real declared references.
const baseline = { rows: specification.cases.filter(task => task.kind === 'core-idea').flatMap(task => specification.models.map(configuration => {
  const outputText = `Plain fixture for ${task.id}.`;
  return { caseId: task.id, configurationId: configuration.id, conditionId: 'clean', rowStatus: 'complete', rowKey: `${task.id}:${configuration.id}`,
    promptText: task.task, outputText, durationMs: 50, usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    runtimeReceipt: { outputSha256: hash(outputText) } };
})) };
const specificationPath = path.join(directory, 'specification.json'), sourceRunPath = path.join(directory, 'baseline.json');
fs.writeFileSync(specificationPath, JSON.stringify(specification)); fs.writeFileSync(sourceRunPath, JSON.stringify(baseline));
const snapshot = prepareRefreshRun({ runDirectoryPath: path.join(directory, 'run'), specificationPath, sourceRunPath });
snapshot.generations = snapshot.generations.map(row => {
  if (row.status === 'complete') return row;
  const task = specification.cases.find(task => task.id === row.caseId), outputText = `New ${row.conditionId} fixture for ${row.caseId}.`;
  return { ...row, status: 'complete', promptText: task.task, promptSha256: hash(task.task), outputText, outputSha256: hash(outputText),
    ...(row.conditionId === 'skill' ? { skillInstructionText: createRefreshInlineInstruction(snapshot.skillSnapshot, task.requiredSkillFiles) } : {}),
    durationMs: 50, usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
    runtimeReceipt: { outputSha256: hash(outputText), refreshProtocol: { version: 1, violation: null }, ...(row.inlineDelivery ? { inlineDelivery: row.inlineDelivery } : {}) } };
});
snapshot.judgments = snapshot.judgments.map(row => {
  const task = specification.cases.find(task => task.id === row.caseId), rubric = specification.rubrics[task.rubricId];
  const candidates = row.candidateOrder.map(id => snapshot.generations.find(generation => generation.id === id));
  const parsed = { assessments: candidates.map((candidate, index) => ({ candidateLabel: index ? 'B' : 'A',
    ratings: rubric.dimensions.map(dimension => ({ dimensionId: dimension.id, score: (candidate.conditionId === 'skill' ? 0.8 : 0.2) + (row.judgeConfigurationId.includes('sol') ? 0.1 : 0), evidence: `Evidence for ${candidate.id}.` })),
    factualConfidence: 'high', factualNotes: ['Fixture review.'] })), preference: { candidate: candidates[0].conditionId === 'skill' ? 'A' : 'B', reason: 'Fixture preference.', confidence: 'high' } };
  const outputText = JSON.stringify(parsed), promptText = createRefreshJudgePrompt({ task, rubric, candidates });
  return { ...row, status: 'complete', promptText, promptSha256: hash(promptText), outputText, outputSha256: hash(outputText), parsed,
    runtimeReceipt: { outputSha256: hash(outputText), refreshProtocol: { version: 1, violation: null } } };
});
const project = benchmarkId => projectWritingRefreshSnapshot({ snapshot, sourceSha256: hash(snapshot), benchmarkId });

test('Core Idea refresh binds both judges and preserves exact answers without joining the established aggregate', () => {
  for (const benchmarkId of WRITING_REFRESH_BENCHMARK_IDS) {
    const { projection, responseBundle } = project(benchmarkId);
    assert.equal(projection.publication.scoreBasisIncluded, false);
    assert.deepEqual(projection.settings.map(setting => setting.scores), [{ baseline: 25, skill: 85 }, { baseline: 25, skill: 85 }]);
    assert.ok(projection.settings.every(setting => setting.deltas.skill === 60));
    assert.ok(responseBundle.responses.every(response => response.outputText === snapshot.generations.find(row => row.id === response.provenance.generationId).outputText));
    assert.equal(responseBundle.judgeRequests.length, responseBundle.responses.length, 'one paired call per seat, two assessments per call');
    const before = JSON.stringify(responseBundle);
    const scan = writingParentPathScanSource({ benchmarkPublications: [{ benchmarkId, projection }] }, { benchmarkResponses: [{ benchmarkId, responseBundle }] });
    assert.doesNotMatch(scan, /(?:^|[^.])\.\.\//);
    assert.equal(JSON.stringify(responseBundle), before, 'privacy normalization must not rewrite public skill bytes');
  }
});

test('publication refuses altered scores, candidate mapping, review evidence, and input bytes', () => {
  for (const mutate of [
    publication => { publication.projection.caseResults[0].exactScore += 1; },
    publication => { publication.responseBundle.responses[0].outputText += ' Altered.'; },
    publication => { publication.responseBundle.judgeRequests[0].candidateMap.A = 'other'; },
    publication => { publication.responseBundle.responses[0].judgments[0].dimensions['governing-value'].evidence = 'Invented review.'; },
    publication => { publication.responseBundle.promptFiles[0].content += ' Altered instruction.'; }
  ]) {
    const publication = project(WRITING_REFRESH_BENCHMARK_IDS[0]);
    mutate(publication);
    assert.throws(() => validateWritingRefreshPublication(publication.projection, publication.responseBundle));
  }
});

test('decimal panel means round half-points consistently in public cells and model scores', () => {
  const decimalSnapshot = structuredClone(snapshot);
  for (const judge of decimalSnapshot.judgments) {
    const plainIndex = judge.candidateOrder.findIndex(id => decimalSnapshot.generations.find(row => row.id === id).conditionId === 'plain');
    const assessment = judge.parsed.assessments.find(item => item.candidateLabel === (plainIndex ? 'B' : 'A'));
    for (const rating of assessment.ratings) rating.score = judge.judgeConfigurationId.includes('sol') ? 0.942 : 0.913;
    judge.outputText = JSON.stringify(judge.parsed);
    judge.outputSha256 = judge.runtimeReceipt.outputSha256 = hash(judge.outputText);
  }
  const { projection, responseBundle } = projectWritingRefreshSnapshot({ snapshot: decimalSnapshot, sourceSha256: hash(decimalSnapshot), benchmarkId: WRITING_REFRESH_BENCHMARK_IDS[0] });
  assert.deepEqual(projection.caseResults.filter(cell => cell.condition === 'baseline').map(cell => [cell.exactScore, cell.score]), Array.from({ length: 6 }, () => [92.75, 92.8]));
  assert.ok(projection.settings.every(setting => setting.scores.baseline === 92.8));
  assert.ok(responseBundle.responses.filter(response => response.condition === 'baseline').every(response => response.score === 92.8));
});

test('the shared Writing catalog lists only Core Idea refresh alongside the original three inputs', t => {
  const repoRootDirectory = path.resolve(new URL('../', import.meta.url).pathname);
  const selected = JSON.parse(fs.readFileSync(path.join(repoRootDirectory, 'benchmarks/storytelling-core-idea/publication.json')));
  if (!fs.existsSync(path.join(repoRootDirectory, selected.run.path))) return t.skip('Private retained Writing sources are unavailable.');
  const snapshotText = JSON.stringify(snapshot), snapshotPath = 'test-only-refresh-snapshot.json';
  const reader = (filename, ...arguments_) => filename === path.join(repoRootDirectory, WRITING_REFRESH_SELECTION_PATH)
    ? JSON.stringify({ kind: 'vasirbenchmark-writing-refresh-source', schemaVersion: 1, snapshot: { path: snapshotPath, sha256: hash(snapshotText) } })
    : filename === path.join(repoRootDirectory, snapshotPath) ? snapshotText : fs.readFileSync(filename, ...arguments_);
  const { projection, responseBundle } = buildWritingPublication({ repoRootDirectory, readFileSyncImplementation: reader });
  assert.equal(projection.catalog.length, 4);
  assert.deepEqual(projection.catalog.filter(item => !item.scoreBasisIncluded).map(item => item.id), WRITING_REFRESH_BENCHMARK_IDS);
  const withPilots = buildWritingCategoryCollection(projection);
  const withoutPilots = { ...projection, catalog: projection.catalog.filter(item => item.scoreBasisIncluded),
    benchmarkPublications: projection.benchmarkPublications.filter(child => !WRITING_REFRESH_BENCHMARK_IDS.includes(child.benchmarkId)) };
  const original = buildWritingCategoryCollection(withoutPilots);
  assert.deepEqual(withPilots.writingCategory.activeBenchmarkIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
  assert.deepEqual(withPilots.entries.map(entry => [entry.configurationId, entry.condition, entry.exactScore, entry.rank]),
    original.entries.map(entry => [entry.configurationId, entry.condition, entry.exactScore, entry.rank]));
  assert.equal(responseBundle.benchmarkResponses.filter(child => WRITING_REFRESH_BENCHMARK_IDS.includes(child.benchmarkId)).length, 1);
  assert.doesNotMatch(JSON.stringify({ projection, responseBundle }), /storytelling-mmorpg-narrative|river-valley-opening/);
});
