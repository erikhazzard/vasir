import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectWritingRun } from '../../../../cli/eval/writing-publication.js';
import { projectDungeonMasterRun } from '../../../../cli/eval/dungeon-master-publication.js';
import { buildStorytellingCreationPublication } from '../../../../cli/eval/storytelling-creation-publication.js';

// Read-only snapshot: compare live checkpoint evidence with immutable selected
// publication sources. Selected does not itself mean deployed to production.
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
assert.ok(process.argv.slice(2).every(argument => argument === '--summary'), 'Only --summary is supported.');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = filename => fs.readFileSync(path.join(repo, filename));
const json = filename => JSON.parse(read(filename));
const source = pin => {
  const bytes = read(pin.path);
  assert.equal(digest(bytes), pin.sha256, 'Pinned source changed: ' + pin.path);
  return JSON.parse(bytes);
};
const summarize = projection => {
  const baseline = new Map(projection.entries.filter(entry => entry.condition === 'baseline')
    .map(entry => [entry.settingId, entry]));
  const completeSettings = projection.entries.filter(entry => entry.condition === 'skill'
    && entry.eligibleForRank !== false && Number.isFinite(entry.exactScore)
    && baseline.get(entry.settingId)?.eligibleForRank !== false
    && Number.isFinite(baseline.get(entry.settingId)?.exactScore)).map(entry => ({
      configurationId: entry.configurationId ?? projection.settings.find(setting => setting.id === entry.settingId)?.configurationId,
      baseline: baseline.get(entry.settingId).exactScore,
      skill: entry.exactScore
    }));
  assert.equal(completeSettings.length, projection.coverage.completedSettingCount,
    'Listed complete settings must agree with the source validator.');
  return { coverage: projection.coverage,
    provisionalSettingCount: projection.provisionalLeaderboard?.status === 'provisional'
      ? projection.provisionalLeaderboard.rankedSettingCount : 0,
    completeSettings };
};
const benchmarks = [];
for (const [id, runId] of [
  ['storytelling-core-idea', 'storytelling-core-idea-v1-2026-09-07'],
  ['storytelling-plot-twists', 'storytelling-plot-twists-v1-completion-2026-09-08'],
  ['dungeon-master-adventure-outline', 'dm-model-coverage-20260908-v2']
]) {
  const selected = json(`benchmarks/${id}/publication.json`);
  const project = id === 'dungeon-master-adventure-outline' ? projectDungeonMasterRun : projectWritingRun;
  const published = project({ run: source(selected.run), snapshot: source(selected.skill), sourceSha256: selected.run.sha256 });
  const directory = `.agents/vasir-evals/${id}/${runId}`;
  const bytes = read(`${directory}/run.json`), run = JSON.parse(bytes);
  const live = project({ run, snapshot: json(`${directory}/skill-snapshot.json`), sourceSha256: digest(bytes) });
  const generationStates = run.rows.reduce((counts, row) => {
    counts[row.rowStatus] = (counts[row.rowStatus] || 0) + 1;
    return counts;
  }, {});
  const lockPaths = ['run.lock', 'completion.lock', 'judging.lock'].filter(name => fs.existsSync(path.join(repo, directory, name)));
  const latest = run.expansionExecution?.sessions?.at(-1) ?? run.executionHistory?.at(-1);
  const execution = {
    lockFilesPresent: lockPaths,
    latestInvocation: latest ? Object.fromEntries(['id', 'mode', 'stage', 'status', 'startedAt', 'completedAt', 'concurrency', 'providers', 'calls', 'providerCalls']
      .filter(key => latest[key] !== undefined).map(key => [key, latest[key]])) : null,
    unresolvedGenerationDispatches: run.completion ? run.completion.generationDispatches
      .filter(dispatch => !run.completion.generationAttempts.some(attempt => attempt.id === dispatch.id)).length : null,
    activeExpansionAttempts: run.expansionExecution?.attempts.filter(attempt => attempt.status === 'running').length ?? null
  };
  benchmarks.push({ benchmarkId: id,
    checkpointAt: run.lastCheckpointAt,
    liveRunSha256: digest(bytes), selectedRunSha256: selected.run.sha256,
    liveMatchesSelected: digest(bytes) === selected.run.sha256,
    generationStates, execution, live: summarize(live.projection), selected: summarize(published.projection)
  });
}
const magicSelection = json('benchmarks/storytelling-magic-discovery/publication.json');
const magic = buildStorytellingCreationPublication({ repoRootDirectory: repo });
benchmarks.push({ benchmarkId: 'storytelling-magic-discovery', untouched: true,
  selectedRunSha256: magicSelection.run.sha256, selected: summarize(magic.projection) });
console.log(JSON.stringify({ observedAt: new Date().toISOString(),
  note: 'Live checkpoints may have active writers. Only verified immutable selections can be published; selecting a source is not proof of deployment. Counts come from the existing publication validators, not inferred scores.',
  benchmarks: process.argv.includes('--summary') ? benchmarks.map(benchmark => ({
    benchmarkId: benchmark.benchmarkId,
    checkpointAt: benchmark.checkpointAt,
    untouched: benchmark.untouched ?? false,
    liveMatchesSelected: benchmark.liveMatchesSelected ?? true,
    execution: benchmark.execution,
    live: (benchmark.live ?? benchmark.selected).coverage,
    selected: benchmark.selected.coverage,
    provisionalSettingCount: (benchmark.live ?? benchmark.selected).provisionalSettingCount
  })) : benchmarks }, null, 2));
