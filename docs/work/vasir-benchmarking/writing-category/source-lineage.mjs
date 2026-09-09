import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateTwistsCompletion, TWISTS_PARENT_SHA256 } from '../../../../cli/eval/plot-twists-completion.js';
import { validateDungeonMasterExpansion, DM_ORIGINAL_RUN_SHA256 } from '../../../../cli/eval/dungeon-master-expansion-manifest.js';
import { buildPlotTwistsPairedPublication, PLOT_TWISTS_PAIRED_EDITION, PLOT_TWISTS_PAIRED_SOURCE_KIND } from '../../../../cli/eval/plot-twists-paired-publication.js';

export const CORE_PARENT_SHA256 = '0f29483fa808cf70d7431ff6a257b73e6d055585bbceab91c7183ba1bdc433e5';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const generation = ({ score, scoreBasisHash, ...row }) => row;
const batchEvidence = ({ reused, ...batch }) => batch;
const parentHashes = {
  'storytelling-core-idea': CORE_PARENT_SHA256,
  'storytelling-plot-twists': TWISTS_PARENT_SHA256,
  'dungeon-master-adventure-outline': DM_ORIGINAL_RUN_SHA256
};

// A score backfill may append reviews, but it cannot quietly replace an answer,
// old judgment, prompt, treatment, or experiment declaration.
export function verifyPreservedWritingEvidence(before, after, { allRows = false, allowedPredecessorReplacements = [] } = {}) {
  const appendOnly = (prior = [], current = [], label) => {
    assert.ok(current.length >= prior.length, label + ' lost retained attempts.');
    assert.deepEqual(current.slice(0, prior.length), prior, label + ' rewrote retained attempts.');
  };
  const rows = new Map(after.rows.map(row => [row.rowKey, row]));
  assert.equal(rows.size, after.rows.length, 'Duplicate current answer identity.');
  for (const row of before.rows) {
    assert.ok(rows.has(row.rowKey), 'A previously retained answer disappeared.');
    const current = rows.get(row.rowKey);
    appendOnly(row.attempts, current.attempts, 'Answer ' + row.rowKey);
    if (allRows || row.rowStatus === 'complete' || row.outputText?.trim() && !allowedPredecessorReplacements.includes(row.rowKey)) {
      assert.deepEqual(generation(current), generation(row), 'A previously retained answer changed.');
    }
  }
  for (const judge of before.judging?.judges || []) {
    const current = after.judging?.judges.find(item => item.configuration.id === judge.configuration.id);
    assert.ok(current, 'A previous judge disappeared.');
    for (const batch of judge.batches.filter(item => item.status === 'complete')) {
      const found = current.batches.find(item => item.batchId === batch.batchId);
      assert.ok(found, 'A completed original review disappeared.');
      assert.deepEqual(batchEvidence(found), batchEvidence(batch), 'A completed original review changed.');
    }
  }
  for (const pair of before.judging?.pairs || []) for (const judge of pair.judges) {
    const found = after.judging?.pairs.find(item => item.pairId === pair.pairId)?.judges.find(item => item.judgeId === judge.judgeId);
    assert.ok(found, 'An original Dungeon Master reviewer seat disappeared.');
    appendOnly(judge.attempts, found.attempts, 'Dungeon Master reviewer ' + pair.pairId + '/' + judge.judgeId);
    if (judge.status === 'completed') assert.deepEqual(found, judge, 'A completed Dungeon Master review changed.');
  }
  for (const field of ['generationDispatches', 'generationAttempts', 'judgeAttempts']) appendOnly(before.completion?.[field], after.completion?.[field], 'Plot twists ' + field);
  if (before.expansionExecution) appendOnly(before.expansionExecution.attempts, after.expansionExecution?.attempts, 'Dungeon Master execution');
}

export function verifyCoreJudgeOnlyRecovery(before, after) {
  for (const field of ['kind', 'harnessVersion', 'runId', 'benchmarkName', 'benchmark', 'treatment', 'conditions', 'configurations', 'generation', 'storytelling']) {
    assert.deepEqual(after[field], before[field], 'Core judge-only recovery changed ' + field);
  }
  assert.equal(after.rows.length, before.rows.length, 'Core answer inventory changed.');
  verifyPreservedWritingEvidence(before, after, { allRows: true });
}

export function verifyPairedTwistsCoverageAppend(before, after, parentSnapshotSha256) {
  const extension = after.coverageExtension;
  assert.equal(extension?.version, 'paired-reasoning-coverage-extension-v1', 'A changed paired snapshot requires the declared coverage append.');
  assert.ok(!before.coverageExtension && !before.parentSnapshot, 'Only the original paired cohort can be extended.');
  assert.equal(extension.parentSnapshotSha256, parentSnapshotSha256, 'Coverage append must retain the accepted paired source.');
  assert.equal(extension.parentManifestSha256, before.manifestSha256, 'Coverage append changed the accepted parent manifest.');
  assert.deepEqual(after.parentSnapshot, before, 'Coverage append rewrote the accepted parent snapshot.');
  assert.equal(digest(JSON.stringify(after.parentSnapshot, null, 2) + '\n'), parentSnapshotSha256, 'Coverage append parent bytes changed.');
  assert.deepEqual(after.manifest.coverageExtension, extension, 'Coverage append declaration differs from its frozen manifest.');
  assert.deepEqual(after.manifest.frozenBundle, before.manifest.frozenBundle, 'Coverage append changed the original treatment.');
  for (const kind of ['generations', 'judgments']) {
    const current = new Map(after[kind].map(row => [row.id, row]));
    assert.equal(current.size, after[kind].length, 'Coverage append has duplicate ' + kind + ' identities.');
    for (const row of before[kind]) assert.deepEqual(current.get(row.id), row, 'Coverage append changed an original ' + kind + ' record.');
    const added = after[kind].filter(row => !before[kind].some(original => original.id === row.id));
    assert.equal(added.length, kind === 'generations' ? extension.additionalGenerationCount : extension.additionalJudgeRequestCount);
    assert.ok(added.every(row => extension.addedConfigurations.includes(row.configurationId)), 'Coverage append reran an original setting.');
  }
}

export function verifyWritingSourceSelections({ repo, previousSelections }) {
  const contained = relative => {
    assert.ok(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\') && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe source path.');
    return path.join(repo, relative);
  };
  const pin = relative => {
    const bytes = fs.readFileSync(contained(relative));
    return { path: relative, bytes: bytes.length, sha256: digest(bytes) };
  };
  const pinnedJson = selected => {
    const observed = pin(selected.path);
    assert.equal(observed.sha256, selected.sha256, 'A selected original source changed.');
    if (selected.bytes !== undefined) assert.equal(observed.bytes, selected.bytes, 'A selected source size changed.');
    return JSON.parse(fs.readFileSync(contained(selected.path), 'utf8'));
  };
  assert.equal(previousSelections.length, 4, 'The four original Writing sources are required.');
  assert.equal(new Set(previousSelections.map(item => item.benchmarkId)).size, 4, 'Duplicate Writing source selection.');
  return previousSelections.map(previous => {
    for (const source of previous.sources) pinnedJson(source);
    for (let lineage = previous.lineage; lineage; lineage = lineage.previousLineage) {
      for (const source of lineage.previousSources ?? []) pinnedJson(source);
    }
    const observed = pin(previous.path);
    const selected = JSON.parse(fs.readFileSync(contained(previous.path), 'utf8'));
    const selectedSources = Object.values(selected).filter(value => value && typeof value === 'object' && value.path && value.sha256);
    for (const source of selectedSources) pinnedJson(source);
    const unchanged = observed.bytes === previous.bytes && observed.sha256 === previous.sha256;
    const record = { benchmarkId: previous.benchmarkId, ...observed, sources: selectedSources.map(source => pin(source.path)) };
    if (selected.kind === PLOT_TWISTS_PAIRED_SOURCE_KIND) {
      assert.equal(previous.benchmarkId, 'storytelling-plot-twists', 'Only Plot twists has a declared paired replacement.');
      assert.equal(selectedSources.length, 1, 'Paired replacement must select one complete immutable snapshot.');
      buildPlotTwistsPairedPublication({ repoRootDirectory: repo, selection: selected });
      if (unchanged) {
        assert.ok(['declared-writing-source-replacement', 'declared-writing-coverage-extension'].includes(previous.lineage?.kind), 'The paired edition lost its original source history.');
        record.lineage = structuredClone(previous.lineage);
      } else {
        const previousSnapshot = previous.sources.find(source => path.basename(source.path) === 'snapshot.json');
        if (previousSnapshot) {
          assert.equal(previous.sources.length, 1, 'The accepted paired source must have one immutable snapshot.');
          assert.equal(previous.lineage?.kind, 'declared-writing-source-replacement', 'Coverage append requires the original paired source history.');
          const before = pinnedJson(previousSnapshot), after = pinnedJson(selected.snapshot);
          verifyPairedTwistsCoverageAppend(before, after, previousSnapshot.sha256);
          record.lineage = { kind: 'declared-writing-coverage-extension', edition: PLOT_TWISTS_PAIRED_EDITION,
            parentSourceSha256: previousSnapshot.sha256, coverageExtension: structuredClone(after.coverageExtension),
            previousSelection: { path: previous.path, bytes: previous.bytes, sha256: previous.sha256 },
            previousSources: previous.sources, previousLineage: previous.lineage,
            originalEvidencePreserved: true, answersAndCompletedReviewsPreserved: true, originalSettingsRerun: false };
          return record;
        }
        assert.ok(previous.sources.some(source => path.basename(source.path) === 'run.json'), 'An accepted paired measurement cannot be silently rerun or replaced within its edition.');
        record.lineage = { kind: 'declared-writing-source-replacement', edition: PLOT_TWISTS_PAIRED_EDITION,
          previousSelection: { path: previous.path, bytes: previous.bytes, sha256: previous.sha256 },
          previousSources: previous.sources, ...(previous.lineage ? { previousLineage: previous.lineage } : {}),
          originalEvidencePreserved: true, priorAnswersAndReviewsReused: false };
      }
      return record;
    }
    assert.equal(selectedSources.length, previous.sources.length, 'Selected source inventory changed.');
    if (unchanged) return record;
    assert.ok(Object.hasOwn(parentHashes, previous.benchmarkId), 'Magic discovery must remain byte-identical; no backfill is authorized.');
    const oldRunSource = previous.sources.find(source => path.basename(source.path) === 'run.json');
    const oldSkillSource = previous.sources.find(source => path.basename(source.path) === 'skill-snapshot.json');
    assert.ok(oldRunSource && oldSkillSource && selected.run && selected.skill, 'Missing original run/skill lineage.');
    assert.equal(selected.skill.sha256, oldSkillSource.sha256, 'Frozen skill changed during score completion.');
    const before = pinnedJson(oldRunSource), after = pinnedJson(selected.run), snapshot = pinnedJson(selected.skill);
    const parentSha256 = parentHashes[previous.benchmarkId];
    const parentSource = { path: `.agents/vasir-evals/${previous.benchmarkId}/publication-snapshots/${parentSha256}/run.json`, sha256: parentSha256 };
    const parent = pinnedJson(parentSource);
    if (previous.benchmarkId === 'storytelling-core-idea') verifyCoreJudgeOnlyRecovery(parent, after);
    else if (previous.benchmarkId === 'storytelling-plot-twists') validateTwistsCompletion({ run: after, snapshot });
    else validateDungeonMasterExpansion(after);
    // Also preserve progress published after the original parent checkpoint.
    const allowedPredecessorReplacements = previous.benchmarkId === 'storytelling-plot-twists' && oldRunSource.sha256 === TWISTS_PARENT_SHA256
      ? after.completion.failedAttempts.map(row => row.rowKey) : [];
    verifyPreservedWritingEvidence(before, after, { allRows: previous.benchmarkId === 'storytelling-core-idea', allowedPredecessorReplacements });
    if (before.completion) assert.deepEqual(after.completion.manifest, before.completion.manifest, 'Published completion manifest changed.');
    if (before.cohortExtension) assert.deepEqual(after.cohortExtension, before.cohortExtension, 'Published Dungeon Master extension changed.');
    record.lineage = { kind: 'authorized-writing-score-completion', parentSourceSha256: parentSha256, previousSelection: { path: previous.path, bytes: previous.bytes, sha256: previous.sha256 }, previousSources: previous.sources, answersAndCompletedReviewsPreserved: true };
    return record;
  });
}
