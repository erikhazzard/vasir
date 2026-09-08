import assert from 'node:assert/strict';
import crypto from 'node:crypto';

export const DM_EXPANSION_EDITION = 'dm-outline-v1-declared-model-extension-v1';
export const DM_ORIGINAL_RUN_SHA256 = '0a78c5dba07da35e01448fcf6e2ab3ed16b248156089ecbb97b7e37ccbd0b95a';
export const DM_ORIGINAL_JUDGES_SHA256 = '44fc6639a4afcb2963621a07dc3d24444cfce0d0b9bfe09bc9dabbf5781455ce';
export const DM_FIXED_JUDGE = Object.freeze({ id: 'codex:gpt-6-astra@ultra', provider: 'codex', model: 'gpt-6-astra', reasoning: 'ultra' });
export const DM_COMMON_CONFIGURATION_IDS = Object.freeze([
  ...['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra'].flatMap(model => ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(effort => `codex:${model}@${effort}`)),
  ...['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `codex:gpt-5.6-luna@${effort}`),
  ...['claude-fable-5-1', 'claude-opus-5'].flatMap(model => ['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `claude:${model}@${effort}`))
]);
export const dmDigest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

export function validateDungeonMasterExpansion(run) {
  const extension = run.cohortExtension;
  assert.equal(extension?.edition, DM_EXPANSION_EDITION, 'Unknown DM expansion edition.');
  assert.equal(dmDigest(extension.parent.runText), DM_ORIGINAL_RUN_SHA256, 'Original run bytes changed.');
  assert.equal(dmDigest(extension.parent.judgesText), DM_ORIGINAL_JUDGES_SHA256, 'Original judge bytes changed.');
  const original = JSON.parse(extension.parent.runText), originalJudges = JSON.parse(extension.parent.judgesText);
  assert.equal(run.benchmark.hash, original.benchmark.hash, 'DM corpus/rubric changed.');
  assert.deepEqual(run.benchmark.definition, original.benchmark.definition, 'Original benchmark declaration changed.');
  assert.equal(run.treatment.hash, original.treatment.hash, 'DM frozen skill changed.');
  assert.deepEqual(run.conditions, original.conditions, 'DM conditions changed.');
  assert.deepEqual(run.configurations, extension.configurations, 'Declared model roster changed.');
  assert.equal(run.configurations.length, 33, 'The declared completion roster requires 33 configurations.');
  assert.deepEqual(run.configurations.map(item => item.id).sort(), [...DM_COMMON_CONFIGURATION_IDS].sort(), 'The exact common Writing roster changed.');
  assert.equal(new Set(run.configurations.map(item => item.id)).size, run.configurations.length, 'Duplicate configurations.');
  assert.ok(run.configurations.some(item => item.id === DM_FIXED_JUDGE.id), 'Original model is missing.');
  for (const configuration of run.configurations) {
    assert.ok(['codex', 'claude'].includes(configuration.provider), 'Unsupported provider.');
    assert.equal(configuration.id, `${configuration.provider}:${configuration.model}@${configuration.reasoning}`, 'Configuration identity mismatch.');
  }
  assert.equal(run.rows.length, run.configurations.length * 32, 'DM planned row inventory changed.');
  assert.equal(new Set(run.rows.map(row => row.rowKey)).size, run.rows.length, 'Duplicate row identity.');
  assert.equal(run.generation.expectedRows, run.rows.length);
  assert.equal(run.generation.expectedPairs, run.configurations.length * 16);
  for (const configuration of run.configurations) for (const story of original.benchmark.definition.cases) {
    for (let trial = 1; trial <= story.repetitions; trial++) for (const condition of ['clean', 'skill:dungeon-master']) {
      const key = `${configuration.id}::${story.id}::trial-${trial}::${condition}`;
      const row = run.rows.find(item => item.rowKey === key);
      assert.ok(row && row.configurationId === configuration.id && row.caseId === story.id && row.trialNumber === trial && row.conditionId === condition && row.promptText === story.task, 'Declared row identity/input changed.');
      for (const field of ['provider', 'model', 'reasoning']) assert.equal(row[field], configuration[field], 'Row model routing changed.');
    }
  }
  for (const row of original.rows) assert.deepEqual(run.rows.find(item => item.rowKey === row.rowKey), row, 'A preserved original writer record changed.');
  for (const pair of originalJudges.pairs) {
    const current = run.judging.pairs.find(item => item.pairId === pair.pairId);
    assert.deepEqual(current, pair, 'A preserved original paired review record changed.');
  }
  assert.equal(new Set(run.judging.pairs.map(pair => pair.pairId)).size, run.judging.pairs.length, 'Duplicate judged pair.');
  for (const pair of run.judging.pairs) {
    const rows = run.rows.filter(row => row.configurationId === pair.configurationId && row.caseId === pair.caseId && row.trialNumber === pair.trialNumber);
    assert.equal(rows.length, 2, 'Judge pair is outside the declared corpus.');
    assert.equal(pair.pairId, `${pair.configurationId}::${pair.caseId}::trial-${pair.trialNumber}`, 'Judge pair identity changed.');
    assert.equal(new Set(pair.judges.map(judge => judge.judgeId)).size, pair.judges.length, 'Duplicate reviewer seat.');
    assert.ok(pair.judges.every(judge => ['astra-ultra-review-1', 'astra-ultra-review-2'].includes(judge.judgeId)), 'Unknown reviewer seat.');
  }
  assert.deepEqual(run.judging.panel, originalJudges.panel, 'Fixed original Astra Ultra review seats changed.');
  assert.equal(extension.judgeConfiguration.id, DM_FIXED_JUDGE.id);
  assert.deepEqual(extension.judgeConfiguration, DM_FIXED_JUDGE);
  assert.equal(extension.primaryRepetitions, 6);
  assert.equal(extension.transferRepetitions, 2);
  return { original, originalJudges };
}
