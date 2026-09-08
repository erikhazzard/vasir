import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCoreJudgeOnlyRecovery } from '../writing-category/source-lineage.mjs';
import { projectWritingRun } from '../../../../cli/eval/writing-publication.js';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const baselineHash = '0b47f5bfa55fdce4c3fba9044bac1270ec57df9ee1ae85030a9970c8cfb156ac';
const skillHash = 'a4db1b5ea3ae79e9655be2ab793fa71e153571359a88d098a383bf94cd4667e5';
const manifestHash = '8f5ab536bc622a096c22a71609d97d632e12d15793419421332954099e7d266e';
const directory = path.join(repo, '.agents/vasir-evals/storytelling-core-idea/storytelling-core-idea-v1-2026-09-07');
const archive = path.join(repo, '.agents/vasir-evals/storytelling-core-idea/publication-snapshots', baselineHash);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.ok(!fs.existsSync(path.join(directory, 'run.lock')), 'Wait for the current writer to release its lock.');
const beforeBytes = fs.readFileSync(path.join(archive, 'run.json'));
const afterBytes = fs.readFileSync(path.join(directory, 'run.json'));
const skillBytes = fs.readFileSync(path.join(directory, 'skill-snapshot.json'));
assert.equal(digest(beforeBytes), baselineHash, 'Immutable pre-resume archive changed.');
assert.equal(digest(skillBytes), skillHash, 'Frozen skill changed.');
assert.equal(digest(fs.readFileSync(path.join(archive, 'skill-snapshot.json'))), skillHash);
assert.equal(digest(fs.readFileSync(path.join(directory, 'manifest.json'))), manifestHash, 'Frozen manifest changed.');
const before = JSON.parse(beforeBytes), after = JSON.parse(afterBytes);
verifyCoreJudgeOnlyRecovery(before, after);
const judges = after.judging.judges.map(judge => ({
  configurationId: judge.configuration.id,
  completedPairReviews: judge.batches.filter(batch => batch.status === 'complete').length,
  missingPairReviews: judge.batches.filter(batch => batch.status !== 'complete').length,
  individualAssessments: judge.batches.reduce((sum, batch) => sum + (batch.status === 'complete' ? batch.evaluations.length : 0), 0)
}));
const { projection } = projectWritingRun({ run: after, snapshot: JSON.parse(skillBytes), sourceSha256: digest(afterBytes) });
console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(), runId: after.runId,
  prestateRunSha256: baselineHash, currentRunSha256: digest(afterBytes),
  generationRowsPreserved: before.rows.length,
  completedPairReviewsPreserved: before.judging.judges.reduce((sum, judge) => sum + judge.batches.filter(batch => batch.status === 'complete').length, 0),
  frozenManifestUnchanged: true, frozenSkillUnchanged: true,
  judges, coverage: projection.coverage
}, null, 2));
