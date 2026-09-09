import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildOverallWritingSource } from '../cli/eval/overall-writing-source.js';
import { buildOverallPublication } from '../cli/eval/overall-publication.js';
import { resolveBenchmarkConfiguration } from '../cli/eval/benchmark-models.js';
import { isBenchmarkAgentRuntimeReceiptCompatible } from '../cli/eval/agent-runtime.js';

const globals = { window: {} };
for (const name of ['data.js', 'writing-data.js']) vm.runInNewContext(fs.readFileSync(new URL(`../site/vasirbenchmark.com/${name}`, import.meta.url), 'utf8'), globals);
const engineering = JSON.parse(JSON.stringify(globals.window.VASIR_DATA));
const writing = JSON.parse(JSON.stringify(globals.window.VASIR_WRITING));
const efforts = ['low', 'medium', 'high', 'xhigh', 'max'];
const policy = 'registered-claude-opus-5-alias-v1';
const twistsPublication = writing.benchmarkPublications.find(item => item.benchmarkId === 'storytelling-plot-twists').projection;
const writingPublications = [writing, ...writing.benchmarkPublications.map(item => item.projection)]
  .filter(publication => writing.writingScoreBasis.benchmarkIds.includes(publication.benchmarks[0].id));
const measuredOpusEfforts = efforts.filter(effort => writingPublications.every(publication =>
  ['baseline', 'skill'].every(condition => (publication.provisionalLeaderboard || publication).entries.some(entry =>
    entry.configurationId === `claude:claude-opus-5@${effort}` && entry.condition === condition && Number.isFinite(entry.exactScore)))));
const sourceWithoutCanonicalOpus = () => {
  const result = structuredClone(engineering);
  result.settings = result.settings.filter(setting => setting.modelId !== 'claude:opus');
  result.aiWorkflows.settings = result.aiWorkflows.settings.filter(setting => setting.modelId !== 'claude:opus');
  return result;
};

test('registered Opus selectors share one canonical target at the same five efforts; Fable versions do not', () => {
  const receipt = target => ({ cli: 'claude', canonicalModels: [target, 'claude-haiku-4-5'], targetCanonicalModel: target, targetCanonicalModelOutputTokens: 1 });
  for (const effort of efforts) for (const model of ['opus', 'claude-opus-5']) {
    const configuration = resolveBenchmarkConfiguration(`claude:${model}@${effort}`);
    assert.equal(configuration.reasoning, effort);
    assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration, runtimeReceipt: receipt('claude-opus-5') }), true);
    assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration, runtimeReceipt: receipt('claude-fable-5-1') }), false);
  }
  assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: resolveBenchmarkConfiguration('claude:fable@low'), runtimeReceipt: receipt('claude-fable-5-1') }), false);
  assert.equal(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: resolveBenchmarkConfiguration('claude:claude-fable-5-1@low'), runtimeReceipt: receipt('claude-fable-5') }), false);
});

test('Overall aliases only proven same-effort Opus identities and preserves every original score, resource and report key', () => {
  const beforeWriting = JSON.stringify(writing), beforeEngineering = JSON.stringify(engineering);
  const original = buildOverallWritingSource(writing, sourceWithoutCanonicalOpus());
  const canonical = buildOverallWritingSource(writing, engineering);
  assert.equal(canonical.scoreBasis.identityAliasPolicy, policy);
  assert.equal(canonical.scoreBasis.identityAliases.length, efforts.length);
  assert.notEqual(canonical.scoreBasis.id, original.scoreBasis.id, 'Identity resolution must be part of the source basis hash');
  assert.equal(canonical.settings.length, original.settings.length);
  assert.equal(canonical.benchmarkResults.length, original.benchmarkResults.length);
  assert.deepEqual(canonical.benchmarkSummaries, original.benchmarkSummaries);
  assert.deepEqual(canonical.benchmarkDisplays, original.benchmarkDisplays);
  assert.deepEqual(canonical.scoreBasis.sources, original.scoreBasis.sources);
  for (const effort of efforts) {
    const sourceConfigurationId = `claude:claude-opus-5@${effort}`, configurationId = `claude:opus@${effort}`;
    const target = engineering.settings.find(setting => setting.configurationId === configurationId);
    const source = original.settings.find(setting => setting.configurationId === sourceConfigurationId);
    assert.deepEqual(canonical.scoreBasis.identityAliases.find(item => item.configurationId === configurationId), {
      configurationId, sourceConfigurationId, sourceSettingId: source.id, sourceModelId: source.modelId, targetCanonicalModel: 'claude-opus-5', policy
    });
    const setting = canonical.settings.find(item => item.configurationId === configurationId);
    for (const field of ['id', 'configurationId', 'modelId', 'provider', 'family', 'reasoning', 'label']) assert.equal(setting[field], target[field]);
    const rows = canonical.benchmarkResults.filter(row => row.configurationId === configurationId);
    assert.equal(rows.length, original.benchmarkResults.filter(row => row.configurationId === sourceConfigurationId).length);
    assert.equal(rows.filter(row => row.benchmarkId === 'storytelling-plot-twists').length,
      twistsPublication.entries.filter(entry => entry.configurationId === sourceConfigurationId).length,
      'aliasing must preserve exactly the declared same-effort paired-edition slots');
    for (const row of rows) {
      const old = original.benchmarkResults.find(item => item.configurationId === sourceConfigurationId && item.benchmarkId === row.benchmarkId && item.condition === row.condition);
      assert.equal(row.sourceConfigurationId, old.configurationId);
      assert.equal(row.sourceSettingId, old.settingId);
      assert.equal(row.sourceModelId, old.modelId);
      const normalized = { ...row };
      for (const field of ['sourceConfigurationId', 'sourceSettingId', 'sourceModelId']) delete normalized[field];
      for (const field of ['id', 'settingId', 'configurationId', 'modelId', 'provider', 'family', 'reasoning', 'label']) normalized[field] = old[field];
      assert.deepEqual(normalized, old);
    }
  }
  for (const row of canonical.benchmarkResults.filter(row => !row.sourceConfigurationId)) assert.deepEqual(row, original.benchmarkResults.find(item => item.configurationId === row.configurationId && item.benchmarkId === row.benchmarkId && item.condition === row.condition));
  assert.equal(JSON.stringify(writing), beforeWriting);
  assert.equal(JSON.stringify(engineering), beforeEngineering);
});

test('Overall aliases neither names, providers, changed effort metadata nor unavailable canonical identities', () => {
  const noTarget = sourceWithoutCanonicalOpus();
  const unaliased = buildOverallWritingSource(writing, noTarget);
  assert.equal(unaliased.scoreBasis.identityAliasPolicy, undefined);
  assert.ok(unaliased.settings.some(setting => setting.configurationId === 'claude:claude-opus-5@low'));
  for (const field of ['provider', 'modelId', 'reasoning']) {
    const changed = structuredClone(engineering);
    for (const collection of [changed, changed.aiWorkflows]) collection.settings.find(setting => setting.configurationId === 'claude:opus@low')[field] = 'incorrect';
    assert.throws(() => buildOverallWritingSource(writing, changed), /canonical identity conflicts/);
  }
  const misleading = sourceWithoutCanonicalOpus();
  for (const setting of misleading.settings.filter(item => item.provider === 'claude')) setting.label = 'Claude Opus 5 · low';
  const result = buildOverallWritingSource(writing, misleading);
  assert.equal(result.scoreBasis.identityAliases, undefined);
  assert.ok(result.settings.some(setting => setting.configurationId === 'claude:claude-fable-5-1@low'));
  assert.equal(result.settings.some(setting => setting.configurationId === 'claude:fable@low'), false);
});

test('a duplicate Writing alias fails closed instead of silently choosing one response set', () => {
  const changed = structuredClone(writing);
  const canonical = engineering.settings.find(setting => setting.configurationId === 'claude:opus@low');
  changed.settings.push(structuredClone(canonical));
  assert.throws(() => buildOverallWritingSource(changed, engineering), /identities collide/);
});

test('each aliased benchmark cell retains that original report setting, not another benchmark’s public ID', () => {
  const changed = structuredClone(writing), configurationId = 'claude:claude-opus-5@medium';
  const publication = changed.benchmarkPublications[0].projection;
  const source = publication.settings.find(setting => setting.configurationId === configurationId);
  assert.ok(source, 'the paired source must declare this exact medium-effort identity');
  source.id = 'benchmark-specific-opus-medium';
  for (const entry of publication.entries.filter(item => item.configurationId === configurationId)) entry.settingId = source.id;
  const result = buildOverallWritingSource(changed, engineering);
  const rows = result.benchmarkResults.filter(item => item.benchmarkId === publication.benchmarks[0].id && item.configurationId === 'claude:opus@medium');
  assert.equal(rows.length, 2);
  for (const row of rows) { assert.equal(row.sourceSettingId, source.id); assert.equal(row.sourceConfigurationId, configurationId); }
});

test('the five proven Opus aliases rank only complete original pairs and cannot invent missing Claude evidence', () => {
  const result = buildOverallPublication({ engineering, aiWorkflows: engineering.aiWorkflows, writing });
  const originalUnion = new Set([...engineering.settings, ...engineering.aiWorkflows.settings, ...writing.settings].map(setting => setting.configurationId));
  assert.equal(result.coverage.totalSettings, originalUnion.size - efforts.length);
  assert.deepEqual(result.entries.filter(entry => entry.modelId === 'claude:opus').map(entry => [entry.configurationId, entry.condition]).sort(),
    measuredOpusEfforts.flatMap(effort => ['baseline', 'skill'].map(condition => [`claude:opus@${effort}`, condition])).sort());
  for (const effort of efforts) {
    const record = result.coverage.records.find(item => item.configurationId === `claude:opus@${effort}`);
    assert.ok(record);
    assert.equal(record.eligible, measuredOpusEfforts.includes(effort));
    if (measuredOpusEfforts.includes(effort)) {
      for (const condition of ['baseline', 'skill']) {
        assert.ok(Number.isInteger(record.ranks[condition]) && record.ranks[condition] > 0);
        assert.ok(Number.isFinite(record.exactScores[condition]));
        assert.deepEqual(record.conditions[condition].missingTaskIds, []);
        assert.deepEqual(record.conditions[condition].unassessableTaskIds, []);
      }
    } else {
      assert.deepEqual(record.ranks, { baseline: null, skill: null });
      assert.deepEqual(record.exactScores, { baseline: null, skill: null });
      for (const condition of ['baseline', 'skill']) {
        assert.ok(record.conditions[condition].missingTaskIds.length + record.conditions[condition].unassessableTaskIds.length > 0);
        assert.ok(!record.conditions[condition].missingTaskIds.includes('storytelling-magic-discovery'));
      }
    }
    assert.equal(result.coverage.records.some(item => item.configurationId === `claude:claude-opus-5@${effort}`), false);
  }
  assert.ok(result.coverage.records.some(item => item.configurationId === 'claude:fable@low'));
  assert.ok(result.coverage.records.some(item => item.configurationId === 'claude:claude-fable-5-1@low'));
  const incomplete = structuredClone(writing);
  const twists = incomplete.benchmarkPublications.find(item => item.benchmarkId === 'storytelling-plot-twists').projection;
  twists.entries = twists.entries.filter(entry => !(entry.configurationId === 'claude:claude-opus-5@medium' && entry.condition === 'skill'));
  const withheld = buildOverallPublication({ engineering, aiWorkflows: engineering.aiWorkflows, writing: incomplete });
  assert.equal(withheld.entries.some(entry => entry.configurationId === 'claude:opus@medium'), false);
  assert.equal(withheld.settings.length, result.settings.length - 1, 'removing one arm must not remove other complete settings');
  const record = withheld.coverage.records.find(item => item.configurationId === 'claude:opus@medium');
  assert.equal(record.eligible, false);
  assert.deepEqual(record.ranks, { baseline: null, skill: null });
  assert.deepEqual(record.exactScores, { baseline: null, skill: null });
});
