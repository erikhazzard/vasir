import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = join(repoRoot, 'site', 'vasirbenchmark.com');
const generatedPublicFiles = new Set(['data.js', 'responses.js', 'writing-data.js', 'writing-responses.js', 'writing-creation-responses.js', 'writing-twists-responses.js', 'writing-dungeon-master-responses.js']);
const acceptanceOnlyFiles = [
  'capture.mjs',
  'capture.sh',
  'games-browsercheck.mjs',
  'writing-browsercheck.mjs'
];
const focusedBenchmarkId = 'storytelling-magic-discovery';
const focusedViewports = [{ width: 1440, height: 1000 }, { width: 820, height: 1000 }, { width: 390, height: 844 }];
const sharedBenchmarks = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', focusedBenchmarkId];
const sharedMethod = 'planned-roster-finalized-equal-subcategory-complete-paired-index-v2';
const selectedMethod = 'selected-benchmarks-equal-weight-complete-paired-index-v3';
const availableMethod = 'common-benchmark-ranking-with-visible-partials-v5';
const isSelectedMethod = method => [selectedMethod, availableMethod].includes(method);
const selectedFields = ['storytelling', 'storytelling-core-idea', 'storytelling-plot-twists', focusedBenchmarkId, 'dungeon-master'];
const storyBenchmarks = selectedFields.slice(1, 4);
const sharedCanonicalViews = [
  ['leaderboard', ''], ['capabilities', '-capabilities'], ['capability-benchmarks', '-capability-benchmarks'],
  ['efficiency', '-efficiency'], ['report', '-benchmark-report'], ['workflows', '-workflows'],
  ['workflow-benchmarks', '-workflow-benchmarks'], ['workflow-efficiency', '-workflow-efficiency'],
  ['workflow-report', '-workflow-report'], ['games', '-game-models'],
  ['game-benchmarks', '-game-benchmarks'], ['game-efficiency', '-game-efficiency']
];
const sharedCanonicalTasks = ['desktop', 'mobile'].flatMap(viewport => sharedCanonicalViews.map(([target, suffix]) => ({ target, viewport, width: viewport === 'desktop' ? 1440 : 390, height: viewport === 'desktop' ? 1000 : 844, filename: `${viewport}${suffix}.png` })));
for (const target of ['leaderboard', 'capabilities', 'report', 'workflows', 'workflow-report', 'games', 'game-benchmarks', 'game-efficiency']) sharedCanonicalTasks.push({ target, viewport: 'tablet', width: 820, height: 1000, filename: `tablet-${target}.png` });
const expectedCaptures = [
  'desktop.png',
  'mobile.png',
  'desktop-capabilities.png',
  'mobile-capabilities.png',
  'desktop-capability-benchmarks.png',
  'mobile-capability-benchmarks.png',
  'desktop-efficiency.png',
  'mobile-efficiency.png',
  'desktop-benchmark-report.png',
  'mobile-benchmark-report.png',
  'desktop-workflows.png',
  'mobile-workflows.png',
  'desktop-workflow-benchmarks.png',
  'mobile-workflow-benchmarks.png',
  'desktop-workflow-efficiency.png',
  'mobile-workflow-efficiency.png',
  'desktop-workflow-report.png',
  'mobile-workflow-report.png',
  'desktop-game-models.png',
  'desktop-game-benchmarks.png',
  'desktop-game-efficiency.png',
  'mobile-game-models.png',
  'mobile-game-benchmarks.png',
  'mobile-game-efficiency.png',
  'desktop-games.png',
  'mobile-games.png',
  'desktop-games-ratings.png',
  'mobile-games-ratings.png',
  'desktop-games-playback.png',
  'mobile-games-playback.png',
  'desktop-games-play.png',
  'mobile-games-play.png',
  'desktop-games-fullscreen.png',
  'mobile-games-fullscreen.png',
  ...['desktop', 'mobile'].flatMap(viewport => [
    'writing-models',
    'writing-benchmarks',
    'writing-efficiency',
    'writing-efficiency-tokens',
    'writing-report',
    'writing-method',
    'writing-rubric-anchors',
    'writing-method-execution',
    'writing-reference',
    'writing-answer',
    'writing-judgments',
    'writing-judge-resources',
    'writing-execution'
  ].map(state => `${viewport}-${state}.png`))
];

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

function pngDimensions(contents) {
  const signature = contents.subarray(0, 8).toString('hex');
  assert.equal(signature, '89504e470d0a1a0a', 'capture must be a PNG');
  assert.equal(contents.subarray(12, 16).toString('ascii'), 'IHDR', 'capture must have a PNG IHDR');
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20)
  };
}

async function assertLockedFile(record, root = siteRoot) {
  assert.equal(typeof record.path, 'string');
  assert.ok(record.path && !record.path.includes('\\') && record.path.split('/').every(part => part && part !== '.' && part !== '..'), 'locked evidence must use a contained relative path');
  assert.match(record.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(record.bytes) && record.bytes >= 0);
  const contents = await readFile(join(root, record.path));
  assert.equal(contents.length, record.bytes, `${record.path} byte length drifted`);
  assert.equal(sha256(contents), record.sha256, `${record.path} SHA-256 drifted`);
  return contents;
}

async function assertCapture(record) {
  const contents = await assertLockedFile(record);
  assert.deepEqual(pngDimensions(contents), { width: record.width, height: record.height }, `${record.path} viewport dimensions drifted`);
}

function selectedSourceReferences(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (typeof value.path === 'string' && /^[a-f0-9]{64}$/.test(value.sha256 ?? '')) found.push({ path: value.path, sha256: value.sha256 });
  for (const child of Object.values(value)) if (child && typeof child === 'object') selectedSourceReferences(child, found);
  return found;
}

async function assertSelectedSourceEvidence(selection, readLockedFile = assertLockedFile) {
  assert.equal(selection.path, `benchmarks/${selection.benchmarkId}/publication.json`);
  // The tracked source selection is always required and byte-verified, even on a bare checkout.
  const selected = JSON.parse(await readLockedFile(selection, repoRoot));
  assert.ok(selection.sources.length >= 2);
  const byPath = (left, right) => left.path.localeCompare(right.path) || left.sha256.localeCompare(right.sha256);
  assert.deepEqual(selection.sources.map(({ path, sha256 }) => ({ path, sha256 })).sort(byPath), selectedSourceReferences(selected).sort(byPath), 'accepted source metadata differs from the tracked selection');
  const unavailable = [];
  for (const source of selection.sources) {
    assert.ok(source.path.startsWith(`.agents/vasir-evals/${selection.benchmarkId}/publication-snapshots/`), 'optional private evidence must belong to the selected immutable archive');
    try { await readLockedFile(source, repoRoot); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Raw runtime archives are intentionally ignored by Git. Absence is not a byte-verification pass.
      unavailable.push(source.path);
    }
  }
  return unavailable;
}

async function assertFocusedEvidence(manifest, deployment) {
  const { acceptance } = manifest, verification = acceptance.verification;
  assert.deepEqual(acceptance.scope, { kind: 'focused-writing-benchmark', schemaVersion: 1, benchmarkId: focusedBenchmarkId, viewports: focusedViewports });
  assert.deepEqual(verification.viewports, focusedViewports);
  assert.equal(verification.fullGamesAudit, false, 'a focused review must not claim a fresh exhaustive Games audit');
  assert.match(acceptance.basis, /no fresh human screenshot approval is claimed/);
  assert.match(verification.releaseId, /^[a-f0-9]{64}$/);
  assert.equal(verification.coverage.executionComplete, true);
  assert.ok(['complete', 'complete-with-exclusions'].includes(verification.coverage.executionStatus));
  for (const [key, value] of Object.entries({ settingCount: 33, expectedResponseCount: 198, expectedPairs: 99, expectedJudgmentCount: 792, expectedJudgeRequestCount: 396, pendingGenerationCount: 0, pendingJudgmentCount: 0 })) assert.equal(verification.coverage[key], value);
  assert.equal(verification.coverage.judgmentCount + verification.coverage.terminalJudgmentFailureCount + verification.coverage.terminallyExcludedJudgmentCount, 792);
  const sourceIds = ['storytelling-core-idea', 'storytelling-plot-twists', 'dungeon-master-adventure-outline', focusedBenchmarkId];
  assert.deepEqual(verification.sourceSelections.map(selection => selection.benchmarkId), sourceIds);
  const unavailablePrivateSources = [];
  for (const selection of verification.sourceSelections) unavailablePrivateSources.push(...await assertSelectedSourceEvidence(selection));

  const candidate = JSON.parse(await assertLockedFile(verification.candidateManifest));
  assert.equal(candidate.releaseId, verification.releaseId);
  assert.deepEqual(candidate.files.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  const loadedFileMap = new Map(candidate.files.map(file => [`/releases/${verification.releaseId}/${file.path}`, file]));
  const check = JSON.parse(await assertLockedFile(verification.browserProof));
  assert.equal(check.kind, 'vasirbenchmark-creation-release-check');
  assert.equal(check.status, 'passed');
  assert.equal(check.mode, 'local-frozen-bytes');
  assert.equal(check.releaseId, verification.releaseId);
  assert.deepEqual(check.sourceSelections, verification.sourceSelections);
  assert.deepEqual(check.reports.map(({ width, height }) => ({ width, height })), focusedViewports);
  assert.deepEqual(verification.browserReports.map(({ width, height }) => ({ width, height })), focusedViewports);
  const expectedCurrentCaptures = [];
  for (const [index, report] of verification.browserReports.entries()) {
    assert.equal(report.sha256, check.reports[index].proof.sha256);
    assert.equal(report.bytes, check.reports[index].proof.bytes);
    const proof = JSON.parse(await assertLockedFile(report));
    assert.equal(proof.kind, 'vasirbenchmark-writing-browsercheck');
    assert.equal(proof.status, 'passed');
    assert.equal(proof.benchmarkId, focusedBenchmarkId);
    assert.equal(proof.trialCount, 3);
    assert.equal(proof.width, report.width);
    assert.equal(proof.height, report.height);
    assert.equal(proof.harnessSha256, manifest.files.find(file => file.path === 'writing-browsercheck.mjs').sha256);
    assert.deepEqual(proof.coverage, verification.coverage);
    assert.deepEqual(proof.errors, []);
    assert.ok(proof.checks.length > 0);
    assert.equal(new URL(proof.url).origin, new URL(check.baseUrl).origin);
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), expected = loadedFileMap.get(url.pathname);
      assert.equal(url.origin, new URL(check.baseUrl).origin);
      assert.ok(expected, `unexpected browser asset: ${url.pathname}`);
      assert.equal(loaded.bytes, expected.bytes);
      assert.equal(loaded.sha256, expected.sha256);
    }
    assert.ok(proof.loadedFiles.some(file => new URL(file.url).pathname === `/releases/${verification.releaseId}/writing-creation-responses.js`), 'each viewport must load the dedicated Magic archive');
    const captures = [...proof.screenshots, ...(proof.failureScreenshots ?? [])];
    assert.ok(captures.length > 0);
    for (const capture of captures) {
      assert.equal(capture.width, report.width);
      assert.equal(capture.height, report.height);
      expectedCurrentCaptures.push({ ...capture, path: `${dirname(report.path)}/${capture.path}` });
    }
  }
  assert.deepEqual(manifest.captures, expectedCurrentCaptures, 'only freshly checked Magic captures may be current');
  assert.ok(manifest.captures.every(capture => capture.path.startsWith(`reviews/${focusedBenchmarkId}/`)));

  const historicalCaptures = [];
  let retained = manifest.retainedCaptureEvidence;
  assert.ok(retained, 'a focused receipt must retain the previous acceptance evidence');
  while (retained) {
    const previous = JSON.parse(await assertLockedFile(retained.receipt));
    assert.equal(previous.version, retained.version);
    assert.deepEqual(previous.captures, retained.captures);
    assert.deepEqual(previous.retainedCaptureEvidence ?? null, retained.previousRetainedEvidence ?? null);
    for (const capture of retained.captures) {
      assert.ok(!manifest.captures.some(current => current.path === capture.path), 'historical captures must not be claimed as current');
      await assertCapture(capture);
    }
    historicalCaptures.push(...retained.captures);
    retained = retained.previousRetainedEvidence;
  }
  assert.deepEqual(historicalCaptures.filter(capture => expectedCaptures.includes(capture.path)).map(capture => capture.path), expectedCaptures, 'all 60 prior peer captures remain historical evidence');
  return unavailablePrivateSources;
}

// The category correction is a full candidate review, not a focused Magic
// exception. Its inventory is the exact union of fresh, immutable receipts.
function assertSelectedWritingReceipt(category, index) {
  const close = (actual, expected) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8);
  const available = index.method === availableMethod;
  const presentation = category.presentationEvidence;
  for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedEngineeringFrame', 'dumbbellGeometry']) assert.equal(presentation[field], true);
  assert.deepEqual(presentation.mismatches, []);
  assert.ok(!presentation.packedBars);
  assert.deepEqual(category.selectionEvidence.map(item => item.selectionId), selectedFields);
  for (const selection of category.selectionEvidence) {
    const ids = selection.selectionId === 'storytelling' ? storyBenchmarks : selection.selectionId === 'dungeon-master' ? ['dungeon-master-adventure-outline'] : [selection.selectionId];
    assert.deepEqual(selection.activeBenchmarkIds, ids);
    assert.deepEqual(selection.benchmarkWeights, Object.fromEntries(ids.map(id => [id, 1 / ids.length])));
    assert.equal(typeof selection.provisional, 'boolean');
    assert.deepEqual(selection.mismatches, []);
    const rankedSettings = available ? selection.rankedSettings : selection.completeSettings;
    const visibleSettings = rankedSettings + (available ? selection.partialSettings : 0);
    assert.equal(selection.rowEvidence.length, visibleSettings);
    assert.equal(new Set(selection.rowEvidence.map(row => row.settingId)).size, visibleSettings);
    if (available) {
      assert.equal(selection.partialSettings, selection.rowEvidence.filter(row => row.partial).length);
      assert.equal(selection.completeSettings, rankedSettings);
      assert.equal(selection.partialFootnote, '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.');
      assert.deepEqual(selection.headerEvidence.map(item => item.condition), ['skill']);
      for (const header of selection.headerEvidence) {
        const rankKey = header.condition === 'baseline' ? 'baselineRank' : 'skillRank';
        const leaders = selection.rowEvidence.filter(row => row[rankKey] === 1);
        const displayed = leaders.find(row => `${row.settingId}-${header.condition}` === header.entryId);
        assert.ok(displayed);
        assert.equal(header.partial, leaders.some(row => row.partial));
        assert.equal(header.asteriskRendered, displayed.partial);
      }
    }
    for (const row of selection.rowEvidence) {
      if (available) {
        assert.equal(typeof row.partial, 'boolean');
        assert.equal(row.asteriskRendered, row.partial);
        if (row.partial) assert.match(row.ariaLabel, /asterisk|\*/i, 'Partial aggregate must disclose its asterisk accessibly.');
      }
      for (const field of ['exactBaseline', 'exactSkill']) assert.ok(Number.isFinite(row[field]) && row[field] >= 0 && row[field] <= 100);
      close(row.exactDelta, row.exactSkill - row.exactBaseline);
      close(row.baselinePosition, Math.round(row.exactBaseline * 10) / 10);
      close(row.skillPosition, Math.round(row.exactSkill * 10) / 10);
      assert.equal(row.baselineRank, row.partial ? null : 1 + selection.rowEvidence.filter(other => !other.partial && other.exactBaseline > row.exactBaseline).length);
      assert.equal(row.skillRank, row.partial ? null : 1 + selection.rowEvidence.filter(other => !other.partial && other.exactSkill > row.exactSkill).length);
      assert.ok(typeof row.ariaLabel === 'string' && row.ariaLabel.includes(row.baselinePosition.toFixed(1)) && row.ariaLabel.includes(row.skillPosition.toFixed(1)));
    }
    const selectedModels = [...new Set(selection.componentEvidence.map(item => item.settingId))];
    if (rankedSettings) assert.ok(selectedModels.length);
    for (const settingId of selectedModels) {
      const row = selection.rowEvidence.find(item => item.settingId === settingId);
      assert.ok(row);
      const components = selection.componentEvidence.filter(item => item.settingId === settingId);
      if (available) {
        assert.ok(components.length > 0 && components.length <= ids.length);
        assert.equal(new Set(components.map(item => item.benchmarkId)).size, components.length);
        assert.ok(components.every(component => ids.includes(component.benchmarkId)));
        assert.equal(row.partial, components.length < ids.length);
      } else assert.deepEqual(components.map(item => item.benchmarkId).sort(), [...ids].sort());
      for (const component of components) {
        close(component.weight, 1 / (available ? components.length : ids.length));
        for (const field of ['exactBaseline', 'exactSkill']) assert.ok(Number.isFinite(component[field]) && component[field] >= 0 && component[field] <= 100);
      }
      close(row.exactBaseline, components.reduce((sum, item) => sum + item.exactBaseline * item.weight, 0));
      close(row.exactSkill, components.reduce((sum, item) => sum + item.exactSkill * item.weight, 0));
      if (available) {
        const formula = selection.aggregateEvidence.find(item => item.settingId === settingId);
        assert.ok(formula);
        close(formula.exactBaseline, row.exactBaseline);
        close(formula.exactSkill, row.exactSkill);
        assert.equal(formula.divisor, components.length);
        assert.equal(formula.partial, row.partial);
        assert.equal(formula.asteriskRendered, row.partial);
      }
    }
  }
  const aggregate = category.selectionEvidence.find(item => item.selectionId === 'storytelling');
  assert.equal(aggregate.provisional, category.selectionEvidence.filter(item => storyBenchmarks.includes(item.selectionId)).some(item => item.provisional));
  assert.equal(aggregate.provisional, index.provisional);
  assert.equal(aggregate.completeSettings, index.completeSettings);
  if (available) {
    assert.equal(aggregate.rankedSettings, index.rankedSettings);
    assert.equal(aggregate.partialSettings, index.partialSettings);
    const sidebarLeaders = aggregate.rowEvidence.filter(row => row.skillRank === 1);
    for (const selection of category.selectionEvidence) {
      assert.ok(sidebarLeaders.some(row => row.partial === selection.sidebarPartial));
      assert.equal(selection.sidebarPartial, selection.sidebarAsteriskRendered);
    }
    // Every aggregate row must reconcile to the independently observed single-
    // benchmark rows, not merely to the currently selected model's detail view.
    const tests = category.selectionEvidence.filter(item => storyBenchmarks.includes(item.selectionId));
    const union = [...new Set(tests.flatMap(item => item.rowEvidence.map(row => row.settingId)))].sort();
    assert.deepEqual(aggregate.rowEvidence.map(row => row.settingId).sort(), union);
    for (const row of aggregate.rowEvidence) {
      const sources = tests.flatMap(item => item.rowEvidence.filter(source => source.settingId === row.settingId));
      close(row.exactBaseline, sources.reduce((sum, source) => sum + source.exactBaseline, 0) / sources.length);
      close(row.exactSkill, sources.reduce((sum, source) => sum + source.exactSkill, 0) / sources.length);
      assert.equal(row.partial, sources.length < storyBenchmarks.length);
    }
  }
  assert.deepEqual(presentation.dumbbellRows, aggregate.rowEvidence);
  assert.deepEqual([...presentation.numericPairedSettingIds].sort(), aggregate.rowEvidence.map(item => item.settingId).sort());
  assert.deepEqual([...category.visibleSettingIds].sort(), [...presentation.numericPairedSettingIds].sort());
}

function assertSharedFrameInventory(manifest, candidate, canonical, writing, games) {
  const verification = manifest.acceptance.verification;
  assert.deepEqual(manifest.acceptance.scope, { kind: 'shared-writing-category-frame', schemaVersion: 1, benchmarkIds: sharedBenchmarks, viewports: focusedViewports });
  assert.match(verification.releaseId, /^[a-f0-9]{64}$/);
  assert.equal(candidate.releaseId, verification.releaseId);
  const root = `reviews/writing-category/${verification.releaseId}`;
  assert.equal(verification.freshCaptureRoot, root);
  assert.equal(verification.candidate.path, `${root}/candidate.json`);
  assert.equal(verification.canonicalRun.path, `${root}/canonical/canonical-receipt.json`);
  assert.equal(verification.previousAcceptance.path, `${root}/previous-template-lock.json`);
  assert.deepEqual(verification.sourceSelections.map(item => item.benchmarkId).sort(), [...sharedBenchmarks].sort());
  assert.equal(canonical.kind, 'vasirbenchmark-canonical-candidate-review');
  assert.equal(canonical.status, 'passed');
  assert.equal(canonical.releaseId, verification.releaseId);
  assert.equal(verification.localBrowserChecks, 32);
  assert.equal(canonical.results.length, 32);
  assert.equal(new Set(canonical.results.map(result => result.filename)).size, 32);
  assert.deepEqual(verification.preservedProjectionFields, canonical.preservation);
  const captures = [];
  for (const task of sharedCanonicalTasks) {
    const result = canonical.results.find(item => item.filename === task.filename);
    assert.ok(result, `missing canonical task: ${task.filename}`);
    assert.equal(result.code, 0);
    for (const key of ['target', 'viewport', 'width', 'height']) assert.equal(result[key], task[key]);
    captures.push({ path: `${root}/canonical/${task.filename}`, bytes: result.bytes, sha256: result.sha256, width: task.width, height: task.height });
  }
  const index = verification.categoryIndex;
  assert.ok([sharedMethod, selectedMethod, availableMethod].includes(index.method));
  assert.deepEqual([...index.benchmarkIds].sort(), [...sharedBenchmarks].sort());
  if (isSelectedMethod(index.method)) {
    assert.equal(index.selectionId, 'storytelling');
    assert.deepEqual(index.selectionIds, selectedFields);
    assert.deepEqual(index.activeBenchmarkIds, storyBenchmarks);
    assert.deepEqual(index.benchmarkWeights, Object.fromEntries(storyBenchmarks.map(id => [id, 1 / 3])));
    assert.ok((index.method === availableMethod ? index.rankedSettings : index.completeSettings) > 0);
    if (index.method === availableMethod) {
      assert.equal(index.completeSettings, index.rankedSettings);
      assert.ok(index.partialSettings >= 0);
    }
    assert.equal(typeof index.provisional, 'boolean');
    assert.equal(verification.acceptanceEvidence.path, `${root}/acceptance-evidence.mjs`);
    assert.match(verification.acceptanceEvidence.sha256, /^[a-f0-9]{64}$/);
  } else {
  assert.equal(index.declaredRosterSelection, 'widest-finalized-official-source');
  assert.ok(index.completeSettings > 0, 'the shared frame may not hide all completed results');
  assert.ok(index.declaredConfigurationIds.length >= index.completeSettings);
  assert.ok(index.sourceCoverage.some(source => source.benchmarkId === index.declaredRosterBenchmarkId && source.executionComplete && source.completedSettingCount > 0));
  const included = index.sourceCoverage.filter(source => source.included);
  assert.deepEqual(included.map(source => source.benchmarkId).sort(), [...index.activeBenchmarkIds].sort());
  assert.ok(included.every(source => source.executionComplete && source.readyForComparison && source.matchesDeclaredRoster && source.completedSettingCount >= index.completeSettings && source.exclusionReason === null));
  assert.equal(index.sourceCoverage.length, sharedBenchmarks.length);
  assert.deepEqual(index.sourceCoverage.map(source => source.benchmarkId).sort(), [...sharedBenchmarks].sort());
  assert.ok(Math.abs(Object.values(index.benchmarkWeights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-8);
  }
  assert.equal(writing.length, 12, 'each of four Writing benchmarks needs three fresh viewport proofs');
  assert.equal(verification.writingBrowserProofs.length, writing.length);
  assert.equal(new Set(writing.map(proof => `${proof.benchmarkId}/${proof.width}`)).size, writing.length);
  const names = new Map(sharedBenchmarks.map((id, i) => [id, ['core', 'twists', 'dm', 'magic'][i]]));
  for (const benchmarkId of sharedBenchmarks) for (const viewport of focusedViewports) {
    const proof = writing.find(item => item.benchmarkId === benchmarkId && item.width === viewport.width);
    const record = verification.writingBrowserProofs.find(item => item.benchmark === names.get(benchmarkId) && item.width === viewport.width);
    assert.ok(proof && record, `missing Writing proof: ${benchmarkId}/${viewport.width}`);
    assert.equal(record.path, `${root}/writing-${names.get(benchmarkId)}-${viewport.width}/writing-browsercheck.json`);
    assert.equal(proof.kind, 'vasirbenchmark-writing-browsercheck');
    assert.equal(proof.status, 'passed');
    if (isSelectedMethod(index.method)) assert.equal(proof.acceptanceEvidenceSha256, verification.acceptanceEvidence.sha256, 'Writing browser derivation pin changed');
    assert.equal(proof.height, viewport.height);
    assert.deepEqual(proof.errors, []);
    assert.ok(proof.checks.length > 0);
    assert.deepEqual(record.coverage, proof.coverage);
    assert.deepEqual(record.categoryEvidence, proof.categoryEvidence);
    const category = proof.categoryEvidence;
    assert.equal(category.method, index.method);
    for (const field of isSelectedMethod(index.method) ? ['benchmarkIds', 'activeBenchmarkIds', 'groupIds', 'benchmarkWeights'] : ['benchmarkIds', 'activeBenchmarkIds', 'declaredConfigurationIds', 'sourceCoverage', 'groupIds']) assert.deepEqual(category[field], index[field]);
    for (const field of isSelectedMethod(index.method) ? ['selectionId', 'provisional', 'completeSettings', 'unscoredSettings'] : ['declaredRosterBenchmarkId', 'declaredRosterSelection', 'completeSettings', 'unscoredSettings']) assert.equal(category[field], index[field]);
    if (index.method === availableMethod) for (const field of ['rankedSettings', 'partialSettings']) assert.equal(category[field], index[field]);
    assert.deepEqual(category.mismatches, []);
    for (const field of ['rawUnchanged', 'noPicker', 'tabsImmediatelyAfterHeader', 'answersLazy', 'disclosure']) assert.equal(category[field], true);
    assert.ok(!category.partialEvidence, 'rejected partial placeholders are not accepted');
    const presentation = category.presentationEvidence;
    if (isSelectedMethod(index.method)) {
      assertSelectedWritingReceipt(category, index);
    } else {
    for (const field of ['noPlaceholderPanels', 'compactRows', 'matchedOverallFrame', 'packedSegments']) assert.equal(presentation[field], true);
    assert.deepEqual(presentation.mismatches, []);
    assert.equal(presentation.numericPairedSettingIds.length, index.completeSettings);
    assert.equal(new Set(presentation.numericPairedSettingIds).size, index.completeSettings);
    assert.ok(category.visibleSettingIds.length > 0);
    assert.ok(category.visibleSettingIds.every(id => presentation.numericPairedSettingIds.includes(id)));
    assert.equal(new Set(presentation.packedBars.map(bar => `${bar.settingId}/${bar.condition}`)).size, presentation.packedBars.length);
    for (const settingId of category.visibleSettingIds) for (const condition of ['baseline', 'skill']) {
      const bar = presentation.packedBars.find(item => item.settingId === settingId && item.condition === condition);
      assert.ok(bar && Number.isFinite(bar.score) && Number.isFinite(bar.total));
      assert.ok(bar.score >= 0 && bar.score <= 100 && Math.abs(bar.score - bar.total) < 1e-8);
      assert.equal(bar.segmentCount, index.groupIds.length);
    }
    }
    assert.deepEqual(category.provisionalDisplayEvidence.map(item => item.benchmarkId), verification.provisionalSourceEvidence.map(item => item.benchmarkId));
    for (const original of verification.provisionalSourceEvidence) {
      const display = category.provisionalDisplayEvidence.find(item => item.benchmarkId === original.benchmarkId);
      for (const field of ['sourceSha256', 'rankedSettings', 'incompleteSettings']) assert.equal(display[field], original[field]);
      assert.deepEqual(display.judgeConfigurationIds, [original.judgeConfigurationId]);
      assert.deepEqual(display.activeBenchmarkIds, index.activeBenchmarkIds);
      assert.deepEqual(display.mismatches, []);
    }
    const screenshotNames = new Set(proof.screenshots.map(capture => capture.path));
    assert.equal(screenshotNames.size, proof.screenshots.length);
    for (const name of ['writing-models.png', ...(isSelectedMethod(index.method) ? ['writing-comparison-rows.png', ...selectedFields.map(id => `writing-selection-${id}.png`)] : ['writing-stacked-rows.png']), 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', ...(benchmarkId === 'dungeon-master-adventure-outline' ? ['dungeon-master-report.png'] : ['writing-report.png']), ...(verification.provisionalSourceEvidence.length ? ['writing-provisional.png'] : [])]) assert.ok(screenshotNames.has(name), `missing Writing capture: ${name}`);
    assert.ok(!screenshotNames.has('writing-partial.png'));
    for (const capture of proof.screenshots) {
      assert.equal(capture.width, viewport.width); assert.equal(capture.height, viewport.height);
      captures.push({ path: `${dirname(record.path)}/${capture.path}`, bytes: capture.bytes, sha256: capture.sha256, width: capture.width, height: capture.height });
    }
  }
  assert.equal(games.length, 2);
  assert.equal(verification.gamesBrowserProofs.length, 2);
  assert.deepEqual(games.map(proof => proof.width), [1440, 390]);
  for (const proof of games) {
    const record = verification.gamesBrowserProofs.find(item => item.width === proof.width);
    assert.equal(record.path, `${root}/games-${proof.width}/games-browsercheck-${proof.width}.json`);
    assert.equal(proof.kind, 'vasirbenchmark-games-browser-proof');
    assert.ok(!proof.error);
    for (const failures of [proof.coverageFailures, proof.runtimeErrors, proof.mediaFailures, proof.delivery.failures]) assert.deepEqual(failures, []);
    assert.equal(proof.delivery.mode, 'local-pinned-bytes');
    assert.equal(proof.delivery.siteScope.releaseId, verification.releaseId);
    for (const field of ['rows', 'clipsAdvanced', 'gamesLoadedAndInputObserved']) assert.equal(proof.coverage[field], 10);
    for (const field of ['clipsFailed', 'gamesWithObservedFailure', 'gamesUnverified', 'unavailableRows']) assert.equal(proof.coverage[field], 0);
    const prefix = proof.width === 1440 ? 'desktop' : 'mobile';
    for (const suffix of ['', '-ratings', '-playback', '-play', '-fullscreen']) assert.ok(proof.screenshots.some(capture => capture.path === `${prefix}-games${suffix}.png`));
    for (const capture of proof.screenshots) {
      assert.equal(capture.width, proof.width); assert.equal(capture.height, proof.width === 1440 ? 1000 : 844);
      captures.push({ path: `${dirname(record.path)}/${capture.path}`, bytes: capture.bytes, sha256: capture.sha256, width: capture.width, height: capture.height });
    }
  }
  assert.equal(new Set(captures.map(item => item.path)).size, captures.length);
  assert.equal(verification.freshCaptureCount, captures.length);
  assert.deepEqual(manifest.captures, captures, 'fresh capture inventory must exactly equal all canonical/Writing/Games receipts');
  assert.deepEqual(manifest.retainedCaptureEvidence.receipt, verification.previousAcceptance);
}

async function assertSharedFrameEvidence(manifest, deployment) {
  const verification = manifest.acceptance.verification;
  const candidate = JSON.parse(await assertLockedFile(verification.candidate));
  const canonical = JSON.parse(await assertLockedFile(verification.canonicalRun));
  const writing = await Promise.all(verification.writingBrowserProofs.map(async record => JSON.parse(await assertLockedFile(record))));
  const games = await Promise.all(verification.gamesBrowserProofs.map(async record => JSON.parse(await assertLockedFile(record))));
  assertSharedFrameInventory(manifest, candidate, canonical, writing, games);
  if (isSelectedMethod(verification.categoryIndex.method)) await assertLockedFile(verification.acceptanceEvidence);
  assert.deepEqual(candidate.siteFiles.map(file => file.path).sort(), deployment.publicFiles.map(file => file.path).sort());
  assert.equal(new Set(candidate.siteFiles.map(file => file.path)).size, candidate.siteFiles.length);
  const fileMap = new Map(candidate.siteFiles.map(file => [file.path, file]));
  const sourceMap = new Map(candidate.presentationSources.map(file => [file.path, file]));
  assert.equal(sourceMap.size, candidate.presentationSources.length);
  for (const file of manifest.files.filter(file => fileMap.has(file.path))) {
    assertReleasePresentationFile(file, sourceMap.get(file.path), fileMap.get(file.path), await assertLockedFile(file), candidate.releaseId, deployment.publicFiles);
  }
  const harness = name => manifest.files.find(file => file.path === name).sha256;
  assert.equal(canonical.source.path, 'site/vasirbenchmark.com/capture.mjs');
  assert.equal(canonical.source.initialSha256, harness('capture.mjs'));
  assert.equal(canonical.source.sha256, harness('capture.mjs'));
  for (const proof of writing) {
    assert.equal(proof.harnessSha256, harness('writing-browsercheck.mjs'));
    assert.equal(proof.overallSha256, canonical.preservation.overall);
    assert.equal(sha256(proof.categoryEvidence.overall), canonical.preservation.overall);
    const loadedPaths = [];
    for (const loaded of proof.loadedFiles) {
      const url = new URL(loaded.url), prefix = `/releases/${candidate.releaseId}/`;
      assert.equal(url.origin, new URL(proof.url).origin);
      assert.ok(url.pathname.startsWith(prefix));
      const name = url.pathname.slice(prefix.length), expected = fileMap.get(name);
      assert.ok(expected, `unexpected candidate module: ${name}`);
      assert.equal(loaded.sha256, expected.sha256); assert.equal(loaded.bytes, expected.bytes);
      loadedPaths.push(name);
    }
    const magic = proof.benchmarkId === focusedBenchmarkId;
    const splitArchives = candidate.siteFiles.some(file => file.path === 'writing-twists-responses.js');
    const archivePath = magic ? 'writing-creation-responses.js' : splitArchives && proof.benchmarkId === 'storytelling-plot-twists' ? 'writing-twists-responses.js' : splitArchives && proof.benchmarkId === 'dungeon-master-adventure-outline' ? 'writing-dungeon-master-responses.js' : 'writing-responses.js';
    for (const required of ['app.js', 'writing-data.js', 'benchmark-report.js', archivePath]) assert.ok(loadedPaths.includes(required));
    if (magic) assert.ok(!loadedPaths.includes('writing-responses.js'));
  }
  for (const proof of games) {
    assert.equal(proof.harnessSha256, harness('games-browsercheck.mjs'));
    assert.equal(proof.projectionSha256, candidate.projectionSha256);
    assert.equal(proof.delivery.projectionSha256, candidate.projectionSha256);
    assert.equal(proof.delivery.apexCspSha256, candidate.cspSha256);
    for (const loaded of proof.presentationFiles) {
      const expected = fileMap.get(loaded.path);
      assert.ok(expected); assert.equal(loaded.sha256, expected.sha256); assert.equal(loaded.bytes, expected.bytes);
    }
  }
  const unavailable = [];
  for (const selection of verification.sourceSelections) unavailable.push(...await assertSelectedSourceEvidence(selection));
  const historical = [], seen = new Set();
  for (let retained = manifest.retainedCaptureEvidence; retained; retained = retained.previousRetainedEvidence) {
    assert.ok(!seen.has(retained.receipt.path), 'historical receipt cycle'); seen.add(retained.receipt.path);
    const previous = JSON.parse(await assertLockedFile(retained.receipt));
    assert.equal(previous.version, retained.version);
    assert.deepEqual(previous.captures, retained.captures);
    assert.deepEqual(previous.retainedCaptureEvidence ?? null, retained.previousRetainedEvidence ?? null);
    for (const capture of retained.captures) {
      assert.ok(!manifest.captures.some(current => current.path === capture.path));
      await assertCapture(capture);
    }
    historical.push(...retained.captures);
  }
  assert.deepEqual(historical.filter(capture => expectedCaptures.includes(capture.path)).map(capture => capture.path), expectedCaptures, 'all original 60 peer captures remain historical evidence');
  return unavailable;
}

function assertReleasePresentationFile(accepted, source, released, contents, releaseId, publicFiles) {
  assert.ok(source, `missing raw presentation source pin: ${accepted.path}`);
  assert.equal(source.path, accepted.path);
  assert.equal(source.sha256, accepted.sha256);
  assert.equal(source.bytes, accepted.bytes);
  assert.equal(contents.length, accepted.bytes);
  assert.equal(sha256(contents), accepted.sha256);
  // The publisher keeps source HTML unchanged and qualifies only immutable
  // relative dependencies. Recompute that exact boundary independently; do
  // not equate source-HTML hashes with published release-qualified HTML.
  let published = contents;
  if (publicFiles.find(file => file.path === accepted.path)?.cacheClass === 'html') {
    let text = contents.toString('utf8');
    for (const file of publicFiles) if (file.cacheClass === 'immutable') text = text.replaceAll(`./${file.path}`, `/releases/${releaseId}/${file.path}`);
    published = Buffer.from(text, 'utf8');
  }
  assert.equal(released.path, accepted.path);
  assert.equal(released.bytes, published.length, `release transform byte length: ${accepted.path}`);
  assert.equal(released.sha256, sha256(published), `release transform SHA-256: ${accepted.path}`);
}

test('canonical VasirBench site matches its accepted template lock', async t => {
  const manifest = JSON.parse(await readFile(join(siteRoot, 'template-lock.json'), 'utf8'));
  const deployment = JSON.parse(await readFile(join(siteRoot, 'deployment.json'), 'utf8'));
  const focused = manifest.acceptance.scope?.kind === 'focused-writing-benchmark';
  const shared = manifest.acceptance.scope?.kind === 'shared-writing-category-frame';
  assert.ok(!manifest.acceptance.scope || focused || shared, 'unrecognized acceptance scope');
  const expectedFiles = [...new Set([
    ...deployment.publicFiles.map(({ path }) => path).filter((path) => !generatedPublicFiles.has(path)),
    ...acceptanceOnlyFiles,
    ...(focused || shared ? ['deployment.json', 'infra/production.yml'] : [])
  ])].sort();

  assert.equal(manifest.kind, 'vasirbenchmark-site-template-lock');
  assert.equal(manifest.status, 'accepted');
  assert.equal(manifest.canonicalPath, 'site/vasirbenchmark.com');
  assert.equal(manifest.acceptance.authority, 'user');
  assert.equal(manifest.deployment.status, 'active');
  assert.equal(manifest.deployment.targetDomain, 'vasirbenchmark.com');
  assert.equal(manifest.deployment.awsAccountAlias, 'faedark');
  assert.equal(deployment.publicFiles.length, 18);
  assert.equal(new Set(deployment.publicFiles.map(({ path }) => path)).size, 18);
  assert.deepEqual(manifest.deployment.topology, {
    owner: 'CloudFormation',
    stack: 'vasirbenchmark-production',
    origin: 'private-s3-oac',
    edge: 'cloudfront-release-router',
    dns: 'route53-apex-alias'
  });

  assert.deepEqual(manifest.files.map(({ path }) => path).sort(), expectedFiles);
  if (focused || shared) {
    const unavailable = await (shared ? assertSharedFrameEvidence(manifest, deployment) : assertFocusedEvidence(manifest, deployment));
    if (unavailable.length) t.diagnostic(`Tracked selection hashes and archived source metadata verified; ${unavailable.length} gitignored private source files are absent. Restore their exact selected publication-snapshots to repeat private-byte verification or rebuild/publish. Their byte assertions were not performed; presentation and portable browser-evidence assertions remain mandatory.`);
  }
  else assert.deepEqual(manifest.captures.map(({ path }) => path), expectedCaptures);

  for (const record of manifest.files) await assertLockedFile(record);
  for (const record of manifest.captures) await assertCapture(record);
});

test('focused acceptance source pins keep tracked selections mandatory and disclose absent private bytes', async () => {
  const sources = ['run.json', 'skill-snapshot.json'].map((name, index) => ({ path: `.agents/vasir-evals/${focusedBenchmarkId}/publication-snapshots/example/${name}`, bytes: 10, sha256: String(index + 1).repeat(64) }));
  const selection = { benchmarkId: focusedBenchmarkId, path: `benchmarks/${focusedBenchmarkId}/publication.json`, bytes: 10, sha256: 'a'.repeat(64), sources };
  const selectedBytes = Buffer.from(JSON.stringify({ run: sources[0], skill: sources[1] }));
  const calls = [];
  const absentArchive = async record => {
    calls.push(record.path);
    if (record.path === selection.path) return selectedBytes;
    throw Object.assign(new Error('Private archive absent'), { code: 'ENOENT' });
  };
  assert.deepEqual(await assertSelectedSourceEvidence(selection, absentArchive), sources.map(source => source.path));
  assert.equal(calls[0], selection.path);
  await assert.rejects(assertSelectedSourceEvidence(selection, async () => { throw Object.assign(new Error('Tracked selection absent'), { code: 'ENOENT' }); }), /Tracked selection absent/);
  const substituted = structuredClone(selection); substituted.sources[0].sha256 = 'b'.repeat(64);
  await assert.rejects(assertSelectedSourceEvidence(substituted, absentArchive), /accepted source metadata differs/);
});

test('focused acceptance source pins do not skip available-byte drift or non-missing archive errors', async () => {
  const sources = ['run.json', 'skill-snapshot.json'].map(name => ({ path: `.agents/vasir-evals/${focusedBenchmarkId}/publication-snapshots/example/${name}`, bytes: 10, sha256: 'c'.repeat(64) }));
  const selection = { benchmarkId: focusedBenchmarkId, path: `benchmarks/${focusedBenchmarkId}/publication.json`, sources };
  const selectedBytes = Buffer.from(JSON.stringify({ run: sources[0], skill: sources[1] }));
  for (const failure of [new Error('SHA-256 drifted'), Object.assign(new Error('Permission denied'), { code: 'EACCES' })]) {
    await assert.rejects(assertSelectedSourceEvidence(selection, async record => { if (record.path === selection.path) return selectedBytes; throw failure; }), error => error === failure);
  }
});

function sharedFrameFixture() {
  const releaseId = 'd'.repeat(64), root = `reviews/writing-category/${releaseId}`;
  const candidate = { releaseId };
  const image = (path, width, height) => ({ path, width, height, bytes: 100, sha256: 'e'.repeat(64) });
  const canonical = { kind: 'vasirbenchmark-canonical-candidate-review', status: 'passed', releaseId, preservation: { overall: 'f'.repeat(64) }, results: sharedCanonicalTasks.map(task => ({ ...task, code: 0, bytes: 100, sha256: 'e'.repeat(64) })) };
  const sourceCoverage = sharedBenchmarks.map(benchmarkId => ({ benchmarkId, plannedSettingCount: 1, completedSettingCount: benchmarkId === focusedBenchmarkId ? 1 : 0, executionComplete: benchmarkId === focusedBenchmarkId, matchesDeclaredRoster: true, readyForComparison: benchmarkId === focusedBenchmarkId, included: benchmarkId === focusedBenchmarkId, exclusionReason: benchmarkId === focusedBenchmarkId ? null : 'official-scores-unavailable' }));
  const categoryIndex = { method: sharedMethod, benchmarkIds: sharedBenchmarks, activeBenchmarkIds: [focusedBenchmarkId], declaredConfigurationIds: ['model'], declaredRosterBenchmarkId: focusedBenchmarkId, declaredRosterSelection: 'widest-finalized-official-source', sourceCoverage, groupIds: ['storytelling'], benchmarkWeights: { [focusedBenchmarkId]: 1 }, completeSettings: 1, unscoredSettings: 0 };
  const categoryEvidence = { ...categoryIndex, mismatches: [], rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, visibleSettingIds: ['model'], provisionalDisplayEvidence: [], presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedOverallFrame: true, packedSegments: true, mismatches: [], numericPairedSettingIds: ['model'], packedBars: ['baseline', 'skill'].map(condition => ({ settingId: 'model', condition, segmentCount: 1, score: 80, total: 80 })) } };
  const writing = sharedBenchmarks.flatMap(benchmarkId => focusedViewports.map(({ width, height }) => ({ kind: 'vasirbenchmark-writing-browsercheck', status: 'passed', benchmarkId, width, height, errors: [], checks: ['passed'], coverage: { completedSettingCount: 1 }, categoryEvidence: structuredClone(categoryEvidence), screenshots: ['writing-models.png', 'writing-stacked-rows.png', 'writing-benchmarks.png', 'writing-efficiency.png', 'writing-efficiency-tokens.png', benchmarkId === 'dungeon-master-adventure-outline' ? 'dungeon-master-report.png' : 'writing-report.png'].map(path => image(path, width, height)) })));
  const games = [1440, 390].map(width => ({ kind: 'vasirbenchmark-games-browser-proof', width, height: width === 1440 ? 1000 : 844, coverageFailures: [], runtimeErrors: [], mediaFailures: [], delivery: { mode: 'local-pinned-bytes', failures: [], siteScope: { releaseId } }, coverage: { rows: 10, clipsAdvanced: 10, gamesLoadedAndInputObserved: 10, clipsFailed: 0, gamesWithObservedFailure: 0, gamesUnverified: 0, unavailableRows: 0 }, screenshots: ['', '-ratings', '-playback', '-play', '-fullscreen'].map(suffix => image(`${width === 1440 ? 'desktop' : 'mobile'}-games${suffix}.png`, width, width === 1440 ? 1000 : 844)) }));
  const writingBrowserProofs = writing.map(proof => { const benchmark = ['core', 'twists', 'dm', 'magic'][sharedBenchmarks.indexOf(proof.benchmarkId)]; return { benchmark, width: proof.width, path: `${root}/writing-${benchmark}-${proof.width}/writing-browsercheck.json`, coverage: proof.coverage, categoryEvidence: proof.categoryEvidence }; });
  const gamesBrowserProofs = games.map(proof => ({ width: proof.width, path: `${root}/games-${proof.width}/games-browsercheck-${proof.width}.json` }));
  const captures = [
    ...canonical.results.map(result => image(`${root}/canonical/${result.filename}`, result.width, result.height)),
    ...writing.flatMap((proof, index) => proof.screenshots.map(capture => ({ ...capture, path: `${dirname(writingBrowserProofs[index].path)}/${capture.path}` }))),
    ...games.flatMap((proof, index) => proof.screenshots.map(capture => ({ ...capture, path: `${dirname(gamesBrowserProofs[index].path)}/${capture.path}` })))
  ];
  const previousAcceptance = { path: `${root}/previous-template-lock.json`, bytes: 100, sha256: 'a'.repeat(64) };
  const manifest = { acceptance: { scope: { kind: 'shared-writing-category-frame', schemaVersion: 1, benchmarkIds: sharedBenchmarks, viewports: focusedViewports }, verification: { releaseId, freshCaptureRoot: root, candidate: { path: `${root}/candidate.json` }, canonicalRun: { path: `${root}/canonical/canonical-receipt.json` }, previousAcceptance, sourceSelections: sharedBenchmarks.map(benchmarkId => ({ benchmarkId })), localBrowserChecks: 32, preservedProjectionFields: canonical.preservation, categoryIndex, writingBrowserProofs, gamesBrowserProofs, provisionalSourceEvidence: [], freshCaptureCount: captures.length } }, captures, retainedCaptureEvidence: { receipt: previousAcceptance } };
  return { manifest, candidate, canonical, writing, games };
}

test('shared-frame acceptance requires the exact full canonical, four-benchmark and Games capture union', () => {
  const fixture = sharedFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing.pop(); },
    value => { value.writing[0].benchmarkId = focusedBenchmarkId; },
    value => { value.writing[0].height = 999; },
    value => { value.canonical.results[0].code = 1; },
    value => { value.canonical.results[0].filename = value.canonical.results[1].filename; },
    value => { value.manifest.captures.pop(); },
    value => { value.manifest.captures[0].sha256 = 'b'.repeat(64); },
    value => { value.manifest.captures[0].path = 'desktop.png'; },
    value => { value.manifest.acceptance.verification.freshCaptureCount++; },
    value => { value.manifest.acceptance.verification.sourceSelections.pop(); },
    value => { value.games[0].coverage.gamesLoadedAndInputObserved = 9; },
    value => { value.games[0].delivery.siteScope.releaseId = 'c'.repeat(64); }
  ]) {
    const changed = sharedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function selectedFrameFixture() {
  const fixture = sharedFrameFixture();
  const { manifest, writing } = fixture;
  const verification = manifest.acceptance.verification;
  const index = { method: selectedMethod, selectionId: 'storytelling', selectionIds: selectedFields, provisional: true, benchmarkIds: sharedBenchmarks, activeBenchmarkIds: storyBenchmarks, groupIds: ['storytelling'], benchmarkWeights: Object.fromEntries(storyBenchmarks.map(id => [id, 1 / 3])), completeSettings: 1, unscoredSettings: 0 };
  verification.categoryIndex = index;
  verification.acceptanceEvidence = { path: `${verification.freshCaptureRoot}/acceptance-evidence.mjs`, bytes: 100, sha256: 'b'.repeat(64) };
  const rows = [{ settingId: 'model', exactBaseline: 60, exactSkill: 80, exactDelta: 20, baselineRank: 1, skillRank: 1, baselinePosition: 60, skillPosition: 80, ariaLabel: 'Plain 60.0, skill 80.0' }];
  const selectionEvidence = selectedFields.map(selectionId => {
    const ids = selectionId === 'storytelling' ? storyBenchmarks : selectionId === 'dungeon-master' ? ['dungeon-master-adventure-outline'] : [selectionId];
    return { selectionId, activeBenchmarkIds: ids, benchmarkWeights: Object.fromEntries(ids.map(id => [id, 1 / ids.length])), provisional: ['storytelling', 'storytelling-core-idea'].includes(selectionId), completeSettings: 1, rowEvidence: structuredClone(rows), componentEvidence: ids.map(benchmarkId => ({ settingId: 'model', benchmarkId, exactBaseline: 60, exactSkill: 80, weight: 1 / ids.length })), mismatches: [] };
  });
  for (const proof of writing) {
    proof.acceptanceEvidenceSha256 = verification.acceptanceEvidence.sha256;
    proof.categoryEvidence = { ...structuredClone(index), rawUnchanged: true, noPicker: true, tabsImmediatelyAfterHeader: true, answersLazy: true, disclosure: true, mismatches: [], visibleSettingIds: ['model'], provisionalDisplayEvidence: [], selectionEvidence: structuredClone(selectionEvidence), presentationEvidence: { noPlaceholderPanels: true, compactRows: true, matchedEngineeringFrame: true, dumbbellGeometry: true, mismatches: [], numericPairedSettingIds: ['model'], dumbbellRows: structuredClone(rows) } };
    const name = ['core', 'twists', 'dm', 'magic'][sharedBenchmarks.indexOf(proof.benchmarkId)];
    verification.writingBrowserProofs.find(record => record.benchmark === name && record.width === proof.width).categoryEvidence = proof.categoryEvidence;
    proof.screenshots.find(image => image.path === 'writing-stacked-rows.png').path = 'writing-comparison-rows.png';
    for (const selectionId of selectedFields) proof.screenshots.push({ ...proof.screenshots[0], path: `writing-selection-${selectionId}.png` });
  }
  const oldWriting = manifest.captures.filter(image => /\/writing-(?:core|twists|dm|magic)-/.test(image.path));
  const first = manifest.captures.indexOf(oldWriting[0]);
  const replacements = writing.flatMap((proof, index) => proof.screenshots.map(image => ({ ...image, path: `${dirname(verification.writingBrowserProofs[index].path)}/${image.path}` })));
  manifest.captures.splice(first, oldWriting.length, ...replacements);
  verification.freshCaptureCount = manifest.captures.length;
  return fixture;
}

test('selected-score acceptance preserves historical branches and requires all five new dumbbell captures', () => {
  const fixture = selectedFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.selectionEvidence.pop(); },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].benchmarkWeights[storyBenchmarks[0]] = 1; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].provisional = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[1].rowEvidence[0].skillPosition = 81; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[1].componentEvidence[0].exactSkill = 90; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.matchedEngineeringFrame = false; },
    value => { value.writing[0].acceptanceEvidenceSha256 = 'c'.repeat(64); },
    value => { value.writing[0].screenshots = value.writing[0].screenshots.filter(image => image.path !== 'writing-selection-storytelling.png'); }
  ]) {
    const changed = selectedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

function availableFrameFixture() {
  const fixture = selectedFrameFixture();
  const { manifest, writing } = fixture;
  const index = manifest.acceptance.verification.categoryIndex;
  Object.assign(index, { method: availableMethod, rankedSettings: 1, partialSettings: 2 });
  for (const proof of writing) {
    const category = proof.categoryEvidence;
    Object.assign(category, { method: availableMethod, rankedSettings: 1, partialSettings: 2, visibleSettingIds: ['model', 'two-tests', 'one-test'] });
    for (const selection of category.selectionEvidence) {
      const story = selection.selectionId === 'storytelling';
      const roster = ['model'];
      if (story || ['storytelling-core-idea', focusedBenchmarkId].includes(selection.selectionId)) roster.push('two-tests');
      if (story || selection.selectionId === focusedBenchmarkId) roster.push('one-test');
      selection.rowEvidence = roster.map(settingId => {
        const partial = story && settingId !== 'model';
        return { settingId, exactBaseline: 60, exactSkill: 80, exactDelta: 20, baselineRank: partial ? null : 1, skillRank: partial ? null : 1, baselinePosition: 60, skillPosition: 80, partial, asteriskRendered: partial, ariaLabel: `Plain 60.0${partial ? '*' : ''}, skill 80.0${partial ? '*' : ''}` };
      });
      Object.assign(selection, { completeSettings: story ? 1 : roster.length, rankedSettings: story ? 1 : roster.length, partialSettings: story ? 2 : 0 });
      selection.componentEvidence = roster.flatMap(settingId => {
        const ids = !story || settingId === 'model' ? selection.activeBenchmarkIds
          : settingId === 'two-tests' ? ['storytelling-core-idea', focusedBenchmarkId] : [focusedBenchmarkId];
        return ids.map(benchmarkId => ({ settingId, benchmarkId, exactBaseline: 60, exactSkill: 80, weight: 1 / ids.length }));
      });
      selection.headerEvidence = [{ condition: 'skill', entryId: 'model-skill', partial: false, asteriskRendered: false }];
      selection.sidebarPartial = false;
      selection.sidebarAsteriskRendered = false;
      selection.partialFootnote = '* Unranked mean of available scores, not a comparable aggregate. Missing tests are not zero. Only models with every selected test receive a rank.';
      selection.aggregateEvidence = roster.map(settingId => ({ settingId, exactBaseline: 60, exactSkill: 80, partial: story && settingId !== 'model', asteriskRendered: story && settingId !== 'model', divisor: selection.componentEvidence.filter(component => component.settingId === settingId).length }));
    }
    const aggregate = category.selectionEvidence[0];
    category.presentationEvidence.numericPairedSettingIds = ['model', 'two-tests', 'one-test'];
    category.presentationEvidence.dumbbellRows = structuredClone(aggregate.rowEvidence);
  }
  return fixture;
}

test('common-test acceptance keeps incomplete means visible without ranking them', () => {
  const fixture = availableFrameFixture();
  assert.doesNotThrow(() => assertSharedFrameInventory(fixture.manifest, fixture.candidate, fixture.canonical, fixture.writing, fixture.games));
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].asteriskRendered = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].partial = false; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence.find(component => component.settingId === 'two-tests').weight = 1 / 3; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].componentEvidence.find(component => component.settingId === 'one-test').weight = 1 / 3; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rankedSettings = 2; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].partialSettings = 0; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence[1].ariaLabel = 'Plain 60.0, skill 80.0'; },
    value => { value.writing[0].categoryEvidence.selectionEvidence[0].rowEvidence.pop(); }
  ]) {
    const changed = availableFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

test('shared-frame acceptance rejects placeholder panels, missing numeric pairs, incoherent bars and an unready source index', () => {
  for (const mutate of [
    value => { value.writing[0].categoryEvidence.partialEvidence = {}; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.noPlaceholderPanels = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.compactRows = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.matchedOverallFrame = false; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.numericPairedSettingIds = []; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars.pop(); },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].total = null; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].score = 0; },
    value => { value.writing[0].categoryEvidence.presentationEvidence.packedBars[0].segmentCount = 2; },
    value => { value.manifest.acceptance.verification.categoryIndex.completeSettings = 0; },
    value => { value.manifest.acceptance.verification.categoryIndex.sourceCoverage.at(-1).executionComplete = false; },
    value => { value.manifest.acceptance.verification.categoryIndex.benchmarkWeights[focusedBenchmarkId] = 0.5; },
    value => { value.manifest.acceptance.verification.categoryIndex.declaredRosterSelection = 'widest-planned-fallback'; }
  ]) {
    const changed = sharedFrameFixture(); mutate(changed);
    assert.throws(() => assertSharedFrameInventory(changed.manifest, changed.candidate, changed.canonical, changed.writing, changed.games));
  }
});

test('shared-frame HTML source pins reproduce the exact release dependency transform without changing stable routes', () => {
  const releaseId = 'a'.repeat(64);
  const contents = Buffer.from('<script src="./app.js"></script><a href="./games.html">Games</a>');
  const accepted = { path: 'index.html', bytes: contents.length, sha256: sha256(contents) };
  const publicFiles = [{ path: 'index.html', cacheClass: 'html' }, { path: 'app.js', cacheClass: 'immutable' }, { path: 'games.html', cacheClass: 'html' }];
  const published = Buffer.from(`<script src="/releases/${releaseId}/app.js"></script><a href="./games.html">Games</a>`);
  const released = { path: accepted.path, bytes: published.length, sha256: sha256(published) };
  assert.doesNotThrow(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted, sha256: 'b'.repeat(64) }, released, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, { ...accepted }, contents, releaseId, publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, 'c'.repeat(64), publicFiles));
  assert.throws(() => assertReleasePresentationFile(accepted, { ...accepted }, released, contents, releaseId, publicFiles.map(file => ({ ...file, cacheClass: 'immutable' }))));
});
