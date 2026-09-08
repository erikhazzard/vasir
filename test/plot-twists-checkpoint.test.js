import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { projectTwistsCheckpointEvidence } from '../benchmarks/storytelling-plot-twists/checkpoint-codex.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = 'cc357218c44344dc9d7e981e46e5c99d9f8ef8f9a77ebff3fb7c410555d28d24';
const directory = path.join(repo, '.agents/vasir-evals/storytelling-plot-twists/publication-snapshots', sha);
test('checkpoint uses exact publication scores with object-shaped harness aggregates', { skip: !fs.existsSync(directory) }, () => {
  const run = JSON.parse(fs.readFileSync(path.join(directory, 'run.json')));
  const snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'skill-snapshot.json')));
  const original = JSON.stringify(run);
  assert.ok(run.rows.some(row => typeof row.score === 'object' && Number.isFinite(row.score?.total)));
  const { projection, fullSettings } = projectTwistsCheckpointEvidence({ run, snapshot, sourceSha256: sha });
  assert.equal(projection.caseResults.filter(cell => cell.status === 'scored' && Number.isFinite(cell.exactScore)
    && cell.coverage.completedJudgments === 2).length, 80);
  assert.equal(fullSettings.length, 4);
  assert.ok(fullSettings.some(setting => setting.exactScores.baseline !== setting.scores.baseline
    || setting.exactScores.skill !== setting.scores.skill), 'Exact panel means must not collapse into rounded display means.');
  for (const setting of fullSettings) for (const condition of ['baseline', 'skill']) {
    const entry = projection.entries.find(item => item.configurationId === setting.configurationId && item.condition === condition);
    assert.equal(setting.exactScores[condition], entry.exactScore);
  }
  assert.equal(JSON.stringify(run), original, 'Auditing must not modify any original evidence.');
  for (const summary of run.summary.configurationScores) { summary.cleanScore = -999; summary.treatmentScore = -999; }
  assert.deepEqual(projectTwistsCheckpointEvidence({ run, snapshot, sourceSha256: sha }).fullSettings, fullSettings,
    'Harness configuration summaries are not the score authority.');
});
