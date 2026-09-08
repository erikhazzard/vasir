import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectWritingRun } from '../../../../../cli/eval/writing-publication.js';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const sourceHash = '0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5';
const skillFileHash = 'a4db1b5ea3ae79e9655be2ab793fa71e153571359a88d098a383bf94cd4667e5';
const manifestFileHash = '8f5ab536bc622a096c22a71609d97d632e12d15793419421332954099e7d266e';
const runDirectory = path.join(root, '.agents/vasir-evals/storytelling-core-idea/storytelling-core-idea-v1-2026-09-07');
const archiveDirectory = path.join(root, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', sourceHash);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = filename => fs.readFileSync(filename);
const json = filename => JSON.parse(read(filename));
assert.equal(fs.existsSync(path.join(runDirectory, 'run.lock')), false, 'Wait for the active writer to release its lock before final verification.');
const beforeBytes = read(path.join(archiveDirectory, 'run.json'));
const afterBytes = read(path.join(runDirectory, 'run.json'));
assert.equal(sha(beforeBytes), sourceHash, 'The exact prestate archive changed.');
assert.equal(sha(read(path.join(archiveDirectory, 'skill-snapshot.json'))), skillFileHash);
assert.equal(sha(read(path.join(runDirectory, 'skill-snapshot.json'))), skillFileHash);
assert.equal(sha(read(path.join(runDirectory, 'manifest.json'))), manifestFileHash);
const before = JSON.parse(beforeBytes);
const after = JSON.parse(afterBytes);
for (const field of ['runId', 'benchmarkName', 'benchmark', 'treatment', 'conditions', 'configurations', 'generation', 'storytelling']) {
  assert.deepEqual(after[field], before[field], 'Frozen run field changed: ' + field);
}
assert.equal(after.rows.length, before.rows.length);
const generationEvidence = ({ score, scoreBasisHash, ...row }) => row;
const afterRows = new Map(after.rows.map(row => [row.rowKey, row]));
for (const row of before.rows) {
  assert.deepEqual(generationEvidence(afterRows.get(row.rowKey)), generationEvidence(row), 'Original generation evidence changed: ' + row.rowKey);
}
const batchEvidence = ({ reused, ...batch }) => batch;
let preservedCompletedBatches = 0;
for (const judge of before.judging.judges) {
  const actualJudge = after.judging.judges.find(candidate => candidate.configuration.id === judge.configuration.id);
  assert.ok(actualJudge, 'An original judge seat disappeared.');
  const actualBatches = new Map(actualJudge.batches.map(batch => [batch.batchId, batch]));
  for (const batch of judge.batches.filter(candidate => candidate.status === 'complete')) {
    assert.deepEqual(batchEvidence(actualBatches.get(batch.batchId)), batchEvidence(batch), 'Original completed review changed: ' + judge.configuration.id + '/' + batch.batchId);
    preservedCompletedBatches++;
  }
}
const selection = json(path.join(root, 'benchmarks/storytelling-core-idea/publication.json'));
assert.equal(selection.run.sha256, sourceHash, 'Public source selection changed during recovery.');
const snapshot = json(path.join(runDirectory, 'skill-snapshot.json'));
const projection = projectWritingRun({ run: after, snapshot, sourceSha256: sha(afterBytes) }).projection;
const judges = after.judging.judges.map(judge => ({
  configurationId: judge.configuration.id,
  completeBatches: judge.batches.filter(batch => batch.status === 'complete').length,
  errorBatches: judge.batches.filter(batch => batch.status === 'error').length,
  deferredBatches: judge.batches.filter(batch => batch.status === 'deferred').length,
  individualAssessments: judge.batches.reduce((sum, batch) => sum + (batch.status === 'complete' ? batch.evaluations.length : 0), 0)
}));
console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(), runId: after.runId,
  prestateRunSha256: sourceHash, currentRunSha256: sha(afterBytes),
  preservedGenerationRows: before.rows.length, preservedCompletedBatches,
  frozenManifestUnchanged: true, frozenSkillUnchanged: true, publicSelectionUnchanged: true,
  newCompletedBatches: judges.reduce((sum, judge) => sum + judge.completeBatches, 0) - preservedCompletedBatches,
  judges, coverage: projection.coverage,
  quotaCauses: (after.executionHistory.at(-1)?.judgeQuotaCircuitBreaker?.causes || []).map(cause => ({
    provider: cause.provider, model: cause.model, reason: cause.reason, apiErrorStatus: cause.apiErrorStatus
  }))
}, null, 2));
