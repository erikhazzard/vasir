import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { isBenchmarkAgentRuntimeReceiptCompatible } from '../cli/eval/agent-runtime.js';
import { buildOverallPublication } from '../cli/eval/overall-publication.js';
import { deriveExpectedOverallV3, deriveExpectedOverallAvailableCategories, verifyOverallV3Projection, OVERALL_OPUS_ALIAS_POLICY } from '../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';

const box = { window: {} };
for (const name of ['data.js', 'writing-data.js']) vm.runInNewContext(fs.readFileSync(new URL('../site/vasirbenchmark.com/' + name, import.meta.url), 'utf8'), box);
const clone = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const { overall, aiWorkflows, games, writing: compact, ...engineering } = clone(box.window.VASIR_DATA);
  return { engineering, aiWorkflows, writing: clone(box.window.VASIR_WRITING_COLLECTION || box.window.VASIR_WRITING) };
}
function publications(collection) {
  const found = new Map();
  const visit = value => { const id = value?.benchmarks?.[0]?.id; if (id && !found.has(id)) found.set(id, value); for (const child of value?.benchmarkPublications || []) visit(child.projection); for (const child of Object.values(value?.additionalBenchmarks || {})) visit(child); };
  visit(collection); return [...found.values()];
}
const aliased = sources => deriveExpectedOverallV3({ ...sources, identityAliasPolicy: OVERALL_OPUS_ALIAS_POLICY });

test('Pinned capture and acceptance controllers preserve the original alias policy when separating source families', () => {
  for (const [file, local] of [
    ['storytelling-plot-twists/capture-candidate.mjs', '_writing'],
    ['writing-category/accept-candidate.mjs', '_sourceWritingSummary']
  ]) {
    const code = fs.readFileSync(new URL('../docs/work/vasir-benchmarking/' + file, import.meta.url), 'utf8');
    const expression = code.match(/identityAliasPolicy: ([^\n]+?) \}\);/)?.[1];
    assert.ok(expression, file + ' must forward the policy from the original compact Writing source');
    assert.equal(vm.runInNewContext(expression, { [local]: { overallSource: { scoreBasis: { identityAliasPolicy: OVERALL_OPUS_ALIAS_POLICY } } } }), OVERALL_OPUS_ALIAS_POLICY);
    assert.equal(vm.runInNewContext(expression, { [local]: {} }), null);
    assert.equal(vm.runInNewContext(expression, { [local]: undefined }), null);
  }
});

test('Available-category oracle uses complete paired leaf scores, nested weights and original alias links without inventing partial means', () => {
  const expected = aliased(fixture());
  const readings = deriveExpectedOverallAvailableCategories(expected, 'claude:opus@high');
  assert.deepEqual(readings.map(reading => reading.weight), [.5, .25, .25]);
  assert.equal(readings[0].complete, true); assert.equal(readings[2].complete, true);
  assert.equal(readings[1].complete, false); assert.deepEqual(readings[1].scores, { baseline: null, skill: null });
  assert.equal(readings[1].configurationId, 'claude:claude-opus-5@high');
  const identity = expected.entries.find(entry => entry.condition === 'skill');
  const complete = deriveExpectedOverallAvailableCategories(expected, identity.configurationId);
  for (const reading of complete) assert.ok(Math.abs(reading.scores.skill - identity.categories.find(category => category.category === reading.categoryId).exactScore) < 1e-10);
  const zero = clone(expected), engineering = zero.sourceCells.filter(cell => cell.configurationId === identity.configurationId && cell.category === 'engineering');
  for (const cell of engineering) cell.value = 0;
  const zeroReading = deriveExpectedOverallAvailableCategories(zero, identity.configurationId)[0];
  assert.equal(zeroReading.complete, true); assert.deepEqual(zeroReading.scores, { baseline: 0, skill: 0 });
  engineering.find(cell => cell.condition === 'baseline').value = null;
  const missing = deriveExpectedOverallAvailableCategories(zero, identity.configurationId)[0];
  assert.equal(missing.complete, false); assert.equal(missing.available, missing.expected - 1);
  assert.deepEqual(missing.scores, { baseline: null, skill: null }, 'A missing plain arm also forbids a numeric skill category mean');
});

test('The independent Opus allowlist is backed by the runtime registry, never display-label similarity', () => {
  const receipt = { canonicalModels: ['claude-opus-5'], targetCanonicalModel: 'claude-opus-5', targetCanonicalModelOutputTokens: 1 };
  for (const model of ['opus', 'claude-opus-5']) assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: { provider: 'claude', model }, runtimeReceipt: receipt }), true);
  for (const model of ['fable', 'claude-fable-5-1']) assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: { provider: 'claude', model }, runtimeReceipt: receipt }), false);
});

test('Legacy Overall v3 keeps distinct identities while the declared alias policy merges exactly five original Opus configurations', () => {
  const sources = fixture(), legacy = deriveExpectedOverallV3(sources), current = aliased(sources);
  assert.equal(legacy.coverage.totalSettings, 44); assert.equal(legacy.identityAliases.length, 0);
  assert.equal(current.coverage.totalSettings, 39); assert.equal(current.coverage.eligibleSettings, 19); assert.equal(current.coverage.incompleteSettings, 20);
  assert.equal(current.coverage.observedResponseCount, 532); assert.equal(current.coverage.expectedResponseCount, 624);
  assert.deepEqual(current.entries, legacy.entries, 'Alias correction must not change the current complete-cohort scores or ranks');
  assert.equal(current.identityAliases.length, 5);
  for (const alias of current.identityAliases) {
    const effort = alias.sourceConfigurationId.split('@')[1];
    assert.equal(alias.configurationId, 'claude:opus@' + effort);
    assert.equal(alias.targetCanonicalModel, 'claude-opus-5');
    assert.equal(alias.policy, OVERALL_OPUS_ALIAS_POLICY);
    const cells = current.sourceCells.filter(cell => cell.configurationId === alias.configurationId && cell.category === 'writing');
    assert.equal(cells.length, 8);
    for (const cell of cells) assert.equal(cell.sourceConfigurationId, alias.sourceConfigurationId);
  }
  assert.ok(current.coverage.records.some(record => record.configurationId === 'claude:fable@max'));
  assert.ok(current.coverage.records.some(record => record.configurationId === 'claude:claude-fable-5-1@max'));
  assert.doesNotThrow(() => verifyOverallV3Projection(buildOverallPublication(sources), current));
});

test('Original compact source must declare and exactly substantiate every alias', () => {
  const sources = fixture(), expected = aliased(sources);
  sources.engineering.writing = { overallSource: { scoreBasis: { identityAliasPolicy: OVERALL_OPUS_ALIAS_POLICY, identityAliases: clone(expected.identityAliases) } } };
  assert.equal(deriveExpectedOverallV3(sources).coverage.totalSettings, 39);
  sources.engineering.writing.overallSource.scoreBasis.identityAliases[0].sourceSettingId = 'invented';
  assert.throws(() => deriveExpectedOverallV3(sources), /alias lineage/);
  assert.throws(() => deriveExpectedOverallV3({ ...fixture(), identityAliasPolicy: 'same-display-label' }), /Unknown Overall/);
});

test('Mapped task cells retain each publication-specific original model and setting identity', () => {
  const sources = fixture(), publication = publications(sources.writing).find(source => source.benchmarks[0].id === 'storytelling-magic-discovery');
  const setting = publication.settings.find(setting => setting.configurationId === 'claude:claude-opus-5@high');
  setting.id = 'original-magic-opus-high-report-id';
  const expected = aliased(sources);
  const alias = expected.identityAliases.find(alias => alias.sourceConfigurationId === setting.configurationId);
  assert.notEqual(alias.sourceSettingId, setting.id, 'Category navigation preserves its first published Writing identity');
  const cell = expected.sourceCells.find(cell => cell.benchmarkId === 'storytelling-magic-discovery' && cell.configurationId === 'claude:opus@high');
  assert.equal(cell.sourceSettingId, setting.id);
  assert.equal(cell.sourceModelId, setting.modelId);
  assert.equal(cell.sourceConfigurationId, setting.configurationId);
  const actual = buildOverallPublication(sources);
  assert.doesNotThrow(() => verifyOverallV3Projection(actual, expected));
  actual.benchmarkResults.find(row => row.benchmarkId === cell.benchmarkId && row.configurationId === cell.configurationId).sourceSettingId = alias.sourceSettingId;
  assert.throws(() => verifyOverallV3Projection(actual, expected), /alias lineage/);
});

test('A conflicting provider, model or effort cannot masquerade as the registered Opus alias target', () => {
  for (const [field, value] of [['provider', 'codex'], ['modelId', 'claude:fable'], ['reasoning', 'max']]) {
    const sources = fixture();
    for (const source of [sources.engineering, sources.aiWorkflows]) {
      const setting = source.settings.find(setting => setting.configurationId === 'claude:opus@high');
      if (setting) setting[field] = value;
    }
    assert.throws(() => aliased(sources), /Opus alias target/);
  }
  const sources = fixture();
  for (const publication of publications(sources.writing)) {
    const setting = publication.settings.find(setting => setting.configurationId === 'claude:claude-opus-5@high');
    if (setting) setting.reasoning = 'low';
  }
  assert.throws(() => aliased(sources), /configuration identity/);
});
