#!/usr/bin/env node

// Browser evidence uses the actual selected projection, never synthetic scores or answers.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAIRED_NATIVE_CONFIGURATION_IDS, deriveExpectedWritingCategory, deriveExpectedOverallV3, verifyOverallV3Projection, verifyCandidateCategoryProjection } from '../../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs';
import { inspectCompactWritingReportInDocument } from './writing-compact-browser-evidence.mjs';

function inspectWritingCaseControlsInDocument(expected) {
  const mismatches = [], page = document.querySelector('#report-page');
  const cases = document.querySelector('[data-writing-case]'), trials = document.querySelector('[data-writing-trial]');
  const needsCases = expected.caseIds.length > 1, needsTrials = expected.trialCount > 1 && !expected.aggregateTrials;
  const caseOptions = [...cases?.options || []].map(option => option.value);
  const trialOptions = [...trials?.options || []].map(option => Number(option.value));
  const activeCaseId = page?.dataset.activeWritingCase;
  if (!expected.caseIds.includes(activeCaseId)) mismatches.push('active-case-identity');
  if (needsCases ? !cases || JSON.stringify(caseOptions) !== JSON.stringify(expected.caseIds) || cases.value !== activeCaseId : !!cases) mismatches.push('case-selector-inventory');
  if (needsTrials ? !trials || JSON.stringify(trialOptions) !== JSON.stringify(Array.from({ length: expected.trialCount }, (_, index) => index + 1))
    || Number(trials.value) !== Number(page?.dataset.activeWritingTrial) : !!trials) mismatches.push('trial-selector-inventory');
  if (!!document.querySelector('.writing-case-picker') !== (needsCases || needsTrials)) mismatches.push('redundant-or-missing-picker-row');
  return { activeCaseId, caseOptions, trialOptions, mismatches };
}

function writingOverallPresentation(overall) {
  const included = overall?.scoreBasis?.edition === 'overall-v3';
  return { included, presentationVariant: included ? 'writing-overall-v3-v1' : 'writing-benchmark-leaders-v1' };
}

function expectedWritingWeightToken(weight) {
  const denominator = Math.round(1 / weight);
  if (Number.isInteger(denominator) && denominator >= 1 && denominator <= 100 && Math.abs(weight - 1 / denominator) < 1e-12) return denominator === 1 ? '1' : `1/${denominator}`;
  return String(Number(weight.toFixed(6)));
}

function expectedWritingBenchmarkTopModel(projection, publication) {
  const candidates = projection.entries.filter(entry => entry.condition === 'skill' && entry.eligibleForRank && Number.isFinite(entry.exactScore)).map(skill => ({
    skill, baseline: projection.entries.find(entry => entry.condition === 'baseline' && entry.configurationId === skill.configurationId && entry.eligibleForRank && Number.isFinite(entry.exactScore))
  })).filter(pair => pair.baseline);
  if (!candidates.length) return null;
  const maximum = Math.max(...candidates.map(pair => pair.skill.exactScore));
  const tied = candidates.filter(pair => pair.skill.exactScore === maximum).sort((a, b) => a.skill.configurationId < b.skill.configurationId ? -1 : a.skill.configurationId > b.skill.configurationId ? 1 : 0);
  const { skill, baseline } = tied[0], setting = publication.settings.find(item => (item.configurationId || item.id) === skill.configurationId);
  const exactDelta = skill.exactScore - baseline.exactScore;
  const round = value => Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value)) * 2) * 10) / 10;
  return { settingId: skill.settingId, configurationId: skill.configurationId,
    label: setting?.label || [setting?.family, setting?.reasoning].filter(Boolean).join(' · ') || skill.settingId,
    exactBaseline: baseline.exactScore, exactSkill: skill.exactScore, exactDelta, tiedCount: tied.length,
    baseline: round(baseline.exactScore), skill: round(skill.exactScore), delta: round(exactDelta) };
}

// Runs in the category page; expected values come from the independently
// derived, pinned collection rather than from the rendered category model.
function inspectWritingBenchmarkOverviewInDocument(expected) {
  const format = value => Number.isFinite(value) ? value.toFixed(1) : '';
  const signed = value => value > 0 ? '+' + format(value) : value < 0 ? '−' + format(-value) : '±0.0';
  const mismatches = [], scope = document.querySelector('#capability-benchmarks');
  const visible = node => !!node && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
  const noModelSelector = !scope?.querySelector('#writing-benchmark-model');
  const noBreakdown = !scope?.querySelector('[data-writing-selected-setting],[data-writing-component]');
  const noFormula = !scope?.querySelector('[data-writing-exact-aggregate]');
  const noScoreSelector = !visible(document.querySelector('#writing-score-selection'));
  const noInlineProvisional = !scope?.querySelector('[data-writing-provisional-benchmark]');
  const noExplanationEssay = !scope?.querySelector('[data-writing-field-means],[data-writing-ledger-coverage]');
  const noPartialFootnote = !visible(document.querySelector('[data-writing-partial-footnote]'));
  const noVisibleNoise = !/provisional|score breakdown|exact calculation|weight|\d+\s*\/\s*\d+\s*(?:reviews|answers)/i.test(scope?.innerText || '');
  if (!scope || scope.hidden || scope.dataset.writingPresentation !== (expected.presentationVariant || 'writing-benchmark-leaders-v1')) mismatches.push('clean-ledger-identity');
  for (const [key, value] of Object.entries({ noModelSelector, noBreakdown, noFormula, noScoreSelector, noInlineProvisional, noExplanationEssay, noPartialFootnote, noVisibleNoise })) if (!value) mismatches.push(key);
  const rendered = [...scope?.querySelectorAll('.benchmark-ledger__row') || []];
  const groups = [...scope?.querySelectorAll('[data-writing-track]') || []].map(group => ({ trackId: group.dataset.writingTrack, benchmarkIds: [...group.querySelectorAll('.benchmark-ledger__row')].map(row => row.dataset.benchmarkId) }));
  const rows = expected.fieldMeans.map(source => {
    const row = rendered.find(node => node.dataset.benchmarkId === source.benchmarkId), link = scope?.querySelector('[data-writing-compare-models="' + source.benchmarkId + '"]');
    const url = link ? new URL(link.href) : null, report = row ? new URL(row.href) : null;
    const metadata = { settingCount: Number(row?.dataset.writingSettingCount), caseCount: Number(row?.dataset.writingCaseCount), trialCount: Number(row?.dataset.writingTrialCount), judgeCount: Number(row?.dataset.writingJudgeCount), text: row?.querySelector('.benchmark-ledger__evidence')?.textContent.trim() || '' };
    const renderedDelta = row?.querySelector('.benchmark-ledger__comparison b')?.textContent.replace(/\s*pts\s*$/, '').trim();
    if (!row || row.dataset.baselineScore !== format(source.baseline) || row.dataset.treatmentScore !== format(source.skill) || renderedDelta !== signed(source.delta) || row.dataset.scoreSource !== source.sourceKind) mismatches.push('field-mean-source:' + source.benchmarkId);
    if (!row?.getAttribute('aria-label')?.includes('field mean') || source.provisional && !row.getAttribute('aria-label').includes('Provisional')) mismatches.push('accessible-score-basis:' + source.benchmarkId);
    if (!report || !report.pathname.endsWith('/benchmark-report.html') || report.hash !== '#' + source.benchmarkId) mismatches.push('field-mean-report:' + source.benchmarkId);
    if (!url || url.searchParams.get('score') !== source.selectionId || url.searchParams.get('setting') !== expected.selectedSettingId || url.hash !== '#capabilities/writing') mismatches.push('compare-model-link:' + source.benchmarkId);
    if (!row?.closest('[data-writing-track]') || row.closest('[data-writing-track]').dataset.writingTrack !== source.trackId) mismatches.push('track-placement:' + source.benchmarkId);
    for (const key of ['settingCount', 'caseCount', 'trialCount', 'judgeCount']) if (metadata[key] !== source[key]) mismatches.push('source-metadata:' + source.benchmarkId + ':' + key);
    if (!metadata.text.includes(String(source.settingCount)) || !metadata.text.includes(String(source.judgeCount)) || !/settings?/.test(metadata.text) || !/judges?|reviews?/.test(metadata.text)) mismatches.push('visible-metadata:' + source.benchmarkId);
    const blocks = [...row?.querySelectorAll('[data-benchmark-top-model]') || []], block = blocks[0], wanted = source.topModel;
    let topModel = null;
    if (!wanted) {
      if (blocks.length) mismatches.push('top-model-unavailable:' + source.benchmarkId);
    } else {
      const local = [], fields = ['label', 'baseline', 'skill', 'delta'].map(name => ({ name, node: block?.querySelector('[data-top-model-' + name + ']') }));
      const field = name => fields.find(item => item.name === name)?.node;
      const actualNumber = key => block?.dataset[key] === undefined || block.dataset[key] === '' ? null : Number(block.dataset[key]);
      const label = field('label')?.textContent.trim(), renderedBaseline = field('baseline')?.textContent.trim(), renderedSkill = field('skill')?.textContent.trim(), renderedDelta = field('delta')?.textContent.replace(/\s*pts\s*$/, '').trim();
      const heading = block?.querySelector('.benchmark-ledger__leader-identity > small')?.textContent.trim().replace(/\s+/g, ' ');
      const exactBaseline = actualNumber('exactBaseline'), exactSkill = actualNumber('exactSkill'), exactDelta = actualNumber('exactDelta'), tiedCount = actualNumber('tiedCount');
      const equal = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
      if (blocks.length !== 1 || block?.dataset.settingId !== wanted.settingId || block?.dataset.configurationId !== wanted.configurationId || label !== wanted.label) local.push('identity');
      if (!equal(exactBaseline, wanted.exactBaseline) || !equal(exactSkill, wanted.exactSkill) || !equal(exactDelta, wanted.exactDelta) || !equal(exactDelta, exactSkill - exactBaseline)) local.push('paired-source-scores');
      if (renderedBaseline !== format(wanted.baseline) || renderedSkill !== format(wanted.skill) || renderedDelta !== signed(wanted.delta)) local.push('rounded-paired-scores');
      if (tiedCount !== wanted.tiedCount || heading?.toLowerCase() !== 'top with skill' + (wanted.tiedCount > 1 ? ' · ' + wanted.tiedCount + ' tied' : '')) local.push('top-skill-label-or-ties');
      const nativeVisible = node => !!node && typeof node.checkVisibility === 'function' && node.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true, opacityProperty: true }) && visible(node);
      const isVisible = nativeVisible(block) && fields.every(item => nativeVisible(item.node));
      if (!isVisible) local.push('visibility');
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null; };
      const contains = (outer, inner) => !!outer && !!inner && inner.width > 0 && inner.height > 0 && inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
      const geometry = { viewportWidth: document.documentElement.clientWidth, row: rect(row), comparison: rect(row?.querySelector('.benchmark-ledger__comparison')), block: rect(block), fields: fields.map(item => ({ name: item.name, rect: rect(item.node) })) };
      geometry.withinRow = contains(geometry.row, geometry.block);
      geometry.withinComparison = contains(geometry.comparison, geometry.block);
      geometry.withinViewport = !!geometry.block && geometry.block.left >= -1 && geometry.block.right <= geometry.viewportWidth + 1;
      geometry.fieldsWithinBlock = geometry.fields.every(item => contains(geometry.block, item.rect));
      geometry.fieldsNonOverlapping = geometry.fields.every((a, index) => geometry.fields.slice(index + 1).every(b => !a.rect || !b.rect ? false : Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) <= 1 || Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) <= 1));
      geometry.noTextOverflow = fields.every(item => !!item.node && (!Number.isFinite(item.node.clientWidth) || item.node.scrollWidth <= item.node.clientWidth + 1));
      for (const key of ['withinRow', 'withinComparison', 'withinViewport', 'fieldsWithinBlock', 'fieldsNonOverlapping', 'noTextOverflow']) if (!geometry[key]) local.push('geometry:' + key);
      topModel = { settingId: block?.dataset.settingId || null, configurationId: block?.dataset.configurationId || null, label, heading, exactBaseline, exactSkill, exactDelta, tiedCount, renderedBaseline, renderedSkill, renderedDelta, visible: isVisible, geometry, mismatches: local };
      mismatches.push(...local.map(item => 'top-model:' + source.benchmarkId + ':' + item));
    }
    return { ...source, topModel, renderedBaseline: row?.dataset.baselineScore, renderedSkill: row?.dataset.treatmentScore, renderedDelta, compareHref: link?.href || null, reportHref: row?.href || null, metadata };
  });
  if (rendered.length !== expected.fieldMeans.length || new Set(rendered.map(row => row.dataset.benchmarkId)).size !== rendered.length) mismatches.push('field-mean-inventory');
  const expectedGroups = [...new Set(expected.fieldMeans.map(row => row.trackId))].map(trackId => ({ trackId, benchmarkIds: expected.fieldMeans.filter(row => row.trackId === trackId).map(row => row.benchmarkId) }));
  if (JSON.stringify(groups) !== JSON.stringify(expectedGroups)) mismatches.push('grouped-benchmark-inventory');
  return { selectionId: window.VASIR_WRITING_CATEGORY.writingCategory.selection.id, selectedSettingId: expected.selectedSettingId, rows, groups, noModelSelector, noBreakdown, noFormula, noScoreSelector, noInlineProvisional, noExplanationEssay, noPartialFootnote, noVisibleNoise, mismatches };
}

// Runs inside the real report page. Kept self-contained so isolated tests can
// exercise this exact evidence collector without reimplementing its checks.
async function inspectWritingPredecessorArchiveInDocument() {
  const data = window.VASIR_WRITING, archive = window.VASIR_WRITING_RESPONSES;
  if (data?.benchmarks?.[0]?.id !== 'storytelling-plot-twists' || !data.methodology?.completion) return null;
  const source = archive.supersededResponses || [], element = document.querySelector('[data-writing-predecessor-archive]');
  const mismatches = [], responses = [], parentSourceSha256 = data.methodology.completion.parentSourceSha256;
  const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
  const rendered = [...document.querySelectorAll('[data-writing-predecessor]')];
  if (!element) mismatches.push('archive-missing');
  if (source.length !== data.methodology.completion.retainedOriginalFailedAttemptCount || rendered.length !== source.length) mismatches.push('predecessor-count');
  if (element) {
    element.open = true;
    if (!element.textContent.includes('do not count as additional trials')) mismatches.push('unscored-predecessor-disclosure');
  }
  const identities = new Set();
  for (const response of source) {
    const identity = `${response.configurationId}:${response.trialNumber}`;
    const matches = rendered.filter(candidate => candidate.dataset.writingPredecessor === response.configurationId && Number(candidate.dataset.predecessorTrial) === response.trialNumber);
    if (identities.has(identity) || matches.length !== 1) mismatches.push(`${identity}:identity`);
    identities.add(identity);
    const record = matches[0];
    if (!record) continue;
    record.open = true;
    const output = record.querySelector('[data-writing-predecessor-output]'), copy = record.querySelector('[data-copy-id]');
    const text = output?.textContent || '', outputSha256 = await hash(text), bounds = output?.getBoundingClientRect();
    const visible = Boolean(element?.open && record.open && bounds?.width > 0 && bounds?.height > 0);
    if (text !== response.outputText || outputSha256 !== response.provenance.outputSha256 || record.dataset.predecessorOutputSha256 !== outputSha256) mismatches.push(`${identity}:answer-bytes`);
    if (response.provenance.sourceSha256 !== parentSourceSha256 || record.querySelector('[data-predecessor-provenance="sourceSha256"]')?.textContent !== parentSourceSha256 || record.querySelector('[data-predecessor-provenance="outputSha256"]')?.textContent !== outputSha256) mismatches.push(`${identity}:source-fingerprint`);
    if (response.score !== null || response.judgments.length || response.status !== 'error' || record.querySelector('.model-run__condition-score') || record.closest('[data-report-setting-id]')) mismatches.push(`${identity}:failed-attempt-scored`);
    const readStatus = record.querySelector('[data-required-read-status]')?.textContent;
    if (readStatus !== response.runtime?.requiredSkillReads?.status || readStatus !== 'incomplete') mismatches.push(`${identity}:read-failure-evidence`);
    if (record.querySelector('[data-writing-predecessor-reason]')?.textContent !== response.failureReason) mismatches.push(`${identity}:failure-reason`);
    if (!visible) mismatches.push(`${identity}:not-visible`);
    let copied = null;
    if (copy) {
      const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
      try {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { copied = value; } } });
        copy.click(); await Promise.resolve(); await Promise.resolve();
      } finally {
        if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
        else delete navigator.clipboard;
      }
    }
    const copiedOutputSha256 = typeof copied === 'string' ? await hash(copied) : null;
    if (copied !== response.outputText || copiedOutputSha256 !== outputSha256) mismatches.push(`${identity}:copy-bytes`);
    responses.push({ configurationId: response.configurationId, caseId: response.caseId, trialNumber: response.trialNumber, condition: response.condition,
      sourceSha256: response.provenance.sourceSha256, outputSha256, copiedOutputSha256, status: response.status, score: response.score,
      readStatus, visible, copyAvailable: Boolean(copy) });
  }
  return { parentSourceSha256, declaredCount: source.length, renderedCount: rendered.length, responses, mismatches };
}

// Independently inspect the fresh fixed edition, including the exact originals
// opened through the shared report. Historical editions use their own checks.
async function inspectPairedTwistsReportInDocument({ inspectDocument = true, registeredConfigurationIds = [] } = {}) {
  const data = window.VASIR_WRITING, archive = window.VASIR_WRITING_RESPONSES;
  const mismatches = [], answers = [], requests = [], renderedRequests = new Set();
  const fail = (key, valid) => { if (!valid) mismatches.push(key); };
  const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join('');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const sameIds = (a, b) => same([...a].sort(), [...b].sort());
  const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const close = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
  const words = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
  const benchmarkId = 'storytelling-plot-twists', edition = 'storytelling-plot-twists-paired-v2';
  const originalConfigurations = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium', 'codex:gpt-5.6-terra@medium', 'codex:gpt-5.6-luna@medium', 'claude:claude-opus-5@medium', 'claude:claude-fable-5-1@medium'];
  const addedConfigurations = ['codex:gpt-6-astra@low', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra',
    'claude:claude-fable-5-1@low', 'claude:claude-fable-5-1@xhigh', 'claude:claude-fable-5-1@max', 'claude:claude-opus-5@low', 'claude:claude-opus-5@xhigh'];
  const judges = ['codex:gpt-6-astra@xhigh', 'codex:gpt-5.6-sol@xhigh'];
  if (data?.benchmarks?.[0]?.id !== benchmarkId || data.scoreBasis?.edition !== edition || !archive) return { mismatches: ['paired-edition-missing'] };
  const contract = data.methodology?.sourceContract, extension = contract?.coverageExtension, recovery = contract?.technicalRecovery;
  const declaredAppend = extension?.version === 'paired-declared-coverage-extension-v2';
  const cohorts = declaredAppend ? contract.sourceCohorts : null, history = declaredAppend ? contract.coverageHistory : null;
  let configurations = extension ? [...originalConfigurations, ...addedConfigurations] : originalConfigurations;
  if (declaredAppend) {
    try {
      const require = valid => { if (!valid) throw new Error('Invalid declared cohort history'); };
      require(Array.isArray(cohorts) && cohorts.length >= 2 && Array.isArray(history) && history.length === cohorts.length - 1);
      require(sameIds(cohorts[0].configurationIds, originalConfigurations));
      const retained = [];
      for (const [index, cohort] of cohorts.entries()) {
        require(sameIds(Object.keys(cohort), ['configurationIds', 'sourceCohort', 'sourceSnapshotSha256', 'sourceManifestSha256'])
          && cohort.sourceCohort === (index ? 'supplement' : 'original') && cohort.configurationIds.length > 0
          && new Set(cohort.configurationIds).size === cohort.configurationIds.length
          && cohort.configurationIds.every(id => registeredConfigurationIds.includes(id) && !retained.includes(id))
          && ['sourceSnapshotSha256', 'sourceManifestSha256'].every(field => /^[a-f0-9]{64}$/.test(cohort[field] || '')));
        if (index) {
          const step = history[index - 1], parent = cohorts[index - 1];
          require(['paired-reasoning-coverage-extension-v1', 'paired-declared-coverage-extension-v2'].includes(step.version)
            && typeof step.purpose === 'string' && Boolean(step.purpose.trim())
            && (step.version !== 'paired-reasoning-coverage-extension-v1' || index === 1 && sameIds(step.addedConfigurations, addedConfigurations))
            && step.parentSnapshotSha256 === parent.sourceSnapshotSha256 && step.parentManifestSha256 === parent.sourceManifestSha256
            && step.sourceSnapshotSha256 === cohort.sourceSnapshotSha256 && step.sourceManifestSha256 === cohort.sourceManifestSha256
            && same(step.addedConfigurations, cohort.configurationIds) && step.retainedConfigurationCount === retained.length
            && step.additionalGenerationCount === cohort.configurationIds.length * 2 && step.additionalJudgeRequestCount === cohort.configurationIds.length * judges.length);
        }
        retained.push(...cohort.configurationIds);
      }
      require(new Set(cohorts.map(cohort => cohort.sourceSnapshotSha256)).size === cohorts.length);
      const { sourceSnapshotSha256, sourceManifestSha256, ...lastExtension } = history.at(-1);
      require(same(lastExtension, extension) && sourceSnapshotSha256 === (recovery?.sourceSnapshotSha256 ?? contract.sourceSha256) && sourceManifestSha256 === (recovery?.sourceManifestSha256 ?? contract.manifestSha256)
        && same(contract.configurations.map(item => item.id), retained));
      configurations = retained;
    } catch { return { mismatches: ['declared-cohort-history'] }; }
  } else fail('no-undeclared-cohort-history', !contract?.sourceCohorts && !contract?.coverageHistory);
  const settingCount = configurations.length, answerCount = settingCount * 2, requestCount = settingCount * judges.length;
  fail('matching-source-contract', same(archive.sourceContract, contract));
  if (extension) {
    fail('declared-coverage-extension', (declaredAppend || extension.version === 'paired-reasoning-coverage-extension-v1')
      && typeof extension.purpose === 'string' && Boolean(extension.purpose.trim())
      && ['parentSnapshotSha256', 'parentManifestSha256'].every(field => /^[a-f0-9]{64}$/.test(extension[field] || ''))
      && (declaredAppend || sameIds(extension.addedConfigurations, addedConfigurations) && extension.retainedConfigurationCount === originalConfigurations.length
        && extension.additionalGenerationCount === addedConfigurations.length * 2 && extension.additionalJudgeRequestCount === addedConfigurations.length * judges.length)
      && sameIds(contract.configurations.map(item => item.id), configurations)
      && contract.sourceSha256 === data.scoreBasis.sourceSha256 && contract.manifestSha256 === data.scoreBasis.manifestSha256);
    fail('supplemental-validation-policy', contract.executionValidationPolicy?.version === 'paired-one-turn-last-message-validation-v1'
      && /^[a-f0-9]{64}$/.test(contract.executionValidationPolicy.sha256 || '')
      && typeof contract.executionValidationPolicy.purpose === 'string' && Boolean(contract.executionValidationPolicy.purpose.trim()));
  } else fail('no-undeclared-supplemental-policy', !contract?.executionValidationPolicy);
  const cohortProvenance = configurationId => {
    if (declaredAppend) {
      const { configurationIds, ...provenance } = cohorts.find(item => item.configurationIds.includes(configurationId)) || {};
      return provenance;
    }
    const original = originalConfigurations.includes(configurationId);
    return { sourceCohort: original ? 'original' : 'supplement',
      sourceSnapshotSha256: original ? extension.parentSnapshotSha256 : data.scoreBasis.sourceSha256,
      sourceManifestSha256: original ? extension.parentManifestSha256 : data.scoreBasis.manifestSha256 };
  };
  const slotId = async (kind, configurationId, part) => kind + '-' + (await hash(JSON.stringify([configurationId, 'scifi-outline', part]))).slice(0, 24);
  if (recovery) {
    try {
      const require = valid => { if (!valid) throw new Error('Invalid recovery provenance'); };
      const { sha256, acceptedParentSnapshotSha256, ...original } = recovery;
      require(declaredAppend && recovery.version === 'paired-tool-isolation-recovery-v1'
        && sameIds(Object.keys(original), ['version', 'sourceSnapshotSha256', 'sourceManifestSha256', 'authorization', 'replacementGenerationIds', 'replacementJudgmentIds', 'pendingGenerationIds', 'pendingJudgmentIds', 'retainedGenerationCount', 'retainedJudgmentCount', 'purpose'])
        && await hash(JSON.stringify(original)) === sha256 && ['sha256', 'sourceSnapshotSha256', 'sourceManifestSha256', 'acceptedParentSnapshotSha256'].every(field => /^[a-f0-9]{64}$/.test(recovery[field] || ''))
        && acceptedParentSnapshotSha256 === extension.parentSnapshotSha256 && recovery.sourceSnapshotSha256 !== contract.sourceSha256 && recovery.sourceManifestSha256 !== contract.manifestSha256
        && Number.isFinite(Date.parse(recovery.authorization?.approvedAt)) && typeof recovery.purpose === 'string' && Boolean(recovery.purpose.trim())
        && sameIds(Object.keys(recovery.authorization), ['approvedAt', 'scope', 'userInstruction']) && recovery.authorization.userInstruction === 'please do it'
        && recovery.authorization.scope === 'Rerun only the three skill answers affected by tool errors and their reviews; preserve all clean results and original attempts.');
      require(same(recovery.replacementGenerationIds, await Promise.all(['codex:gpt-6-astra@ultra', 'codex:gpt-5.6-sol@ultra', 'codex:gpt-5.6-terra@ultra'].map(id => slotId('generation', id, 'skill'))))
        && same(recovery.replacementJudgmentIds, await Promise.all([1, 2].map(seat => slotId('judgment', 'codex:gpt-6-astra@ultra', seat)))));
      const inventory = [];
      for (const kind of ['generation', 'judgment']) for (const configurationId of configurations) for (const part of kind === 'generation' ? ['baseline', 'skill'] : [1, 2]) inventory.push({ kind, id: await slotId(kind, configurationId, part), configurationId });
      require(same(contract.recordSources?.map(({ kind, id }) => ({ kind, id })), inventory.map(({ kind, id }) => ({ kind, id }))));
      for (const kind of ['generation', 'judgment']) {
        const replacements = recovery[kind === 'generation' ? 'replacementGenerationIds' : 'replacementJudgmentIds'], pending = recovery[kind === 'generation' ? 'pendingGenerationIds' : 'pendingJudgmentIds'];
        require(Array.isArray(pending));
        const added = [...replacements, ...pending], all = inventory.filter(item => item.kind === kind);
        require(new Set(added).size === added.length && added.every(id => all.some(item => item.id === id))
          && recovery[kind === 'generation' ? 'retainedGenerationCount' : 'retainedJudgmentCount'] === all.length - added.length);
        for (const item of all) {
          const row = contract.recordSources.find(record => record.kind === kind && record.id === item.id);
          const disposition = replacements.includes(item.id) ? 'technical-replacement' : pending.includes(item.id) ? 'previously-unattempted' : 'retained';
          const origin = disposition === 'retained' ? cohortProvenance(item.configurationId) : { sourceCohort: 'recovery', sourceSnapshotSha256: contract.sourceSha256, sourceManifestSha256: contract.manifestSha256 };
          require((disposition !== 'technical-replacement' || /^[a-f0-9]{64}$/.test(row.supersedesRecordSha256 || ''))
            && same(row, { kind, id: item.id, disposition, ...origin, ...(disposition === 'technical-replacement' ? { supersedesRecordSha256: row.supersedesRecordSha256 } : {}) }));
        }
      }
      require(Boolean(contract.toolIsolationPolicy));
    } catch { return { mismatches: ['technical-recovery-provenance'] }; }
  } else fail('no-undeclared-record-recovery', !contract?.recordSources);
  if (contract?.toolIsolationPolicy) {
    const { sha256, purpose, configurationIds, generationIds, judgmentIds, ...policy } = contract.toolIsolationPolicy;
    fail('new-call-isolation-policy', same(policy, { version: 'explicit-agent-tool-isolation-v1', codexConfig: { 'agents.enabled': false }, rejectToolRouterErrors: true, appliesTo: 'newly-prepared-runs-only', historicalResultsReclassified: false })
      && sha256 === await hash(JSON.stringify(policy)) && typeof purpose === 'string' && Boolean(purpose.trim())
      && (recovery ? configurationIds === undefined && same(generationIds, [...recovery.replacementGenerationIds, ...recovery.pendingGenerationIds]) && same(judgmentIds, [...recovery.replacementJudgmentIds, ...recovery.pendingJudgmentIds])
        : same(configurationIds, extension?.addedConfigurations ?? contract.configurations.map(item => item.id)) && generationIds === undefined && judgmentIds === undefined));
  }
  const recordProvenance = (kind, id, configurationId) => {
    if (!recovery) return cohortProvenance(configurationId);
    const { kind: _kind, id: _id, disposition, ...origin } = contract.recordSources.find(row => row.kind === kind && row.id === id) || {};
    return { ...origin, recordDisposition: disposition, ...(disposition !== 'retained' ? { technicalRecoverySha256: recovery.sha256 } : {}) };
  };
  fail('fresh-fixed-inventory', data.benchmarks.length === 1 && data.cases.length === 1 && data.trialCount === 1
    && data.scoreBasis.ratingMinimum === 0 && data.scoreBasis.ratingMaximum === 5
    && data.scoreBasis.method === 'complete-paired-single-prompt-two-judge-mean-v2'
    && data.scoreBasis.aggregation === 'mean-four-ratings-times-twenty-then-mean-two-judges' && data.scoreBasis.dimensions.every(dimension => dimension.weight === 25)
    && sameIds(data.settings.map(setting => setting.configurationId), configurations)
    && sameIds(data.scoreBasis.judges, judges) && !data.methodology?.completion && !archive.supersededResponses);
  const task = data.cases[0], files = new Map(archive.promptFiles.map(file => [file.id, file]));
  fail('unchanged-fixed-task', task.id === 'scifi-outline' && task.wordLimit === 550 && task.prompt === 'Create a brief outline of an original science-fiction story with one or more major plot twists. Include the ending. Maximum 550 words for the entire answer.');
  for (const [field, expected] of Object.entries({ settingCount, expectedResponseCount: answerCount, responseCount: answerCount, scoredResponseCount: answerCount,
    completedSettingCount: settingCount, expectedJudgmentCount: answerCount * judges.length, judgmentCount: answerCount * judges.length,
    pairedJudgeCallCount: requestCount, expectedPairedJudgeCallCount: requestCount, expectedPairs: settingCount, usablePairs: settingCount })) fail('complete-coverage:' + field, data.coverage[field] === expected);
  fail('completed-execution', data.coverage.executionComplete === true);
  const skillFiles = [];
  for (const id of ['paired-skill-bundle', 'paired-skill-root', 'paired-skill-twists']) {
    const file = files.get(id);
    fail(id + ':frozen-bytes', Boolean(file) && await hash(file.content) === file.sha256 && new TextEncoder().encode(file.content).length === file.bytes);
    skillFiles.push({ id, sha256: file?.sha256, bytes: file?.bytes });
  }
  for (const id of ['paired-skill-root', 'paired-skill-twists']) fail(id + ':inline-once', Boolean(files.get(id)?.content) && files.get('paired-skill-bundle')?.content.split(files.get(id).content).length === 2);
  fail('unchanged-established-skill', files.get('paired-skill-root')?.sha256 === '551e0b710e8a60ea7e3f84208f81ec48402ba63f732278885fd13360b5c322c4' && files.get('paired-skill-twists')?.sha256 === 'cb68cc0f2df390bdbe1d11fe14634966a789e29b0281a226e55e477bbc8000b8');
  fail('four-criteria', task.rubric?.length === 4 && sameIds(task.rubric.map(item => item.id), data.scoreBasis.dimensions.map(item => item.id)));
  const requestMap = new Map(archive.judgeRequests.map(request => [request.id, request]));
  fail('fresh-complete-archive', requestMap.size === requestCount && archive.judgeRequests.length === requestCount
    && sameIds(archive.responses.map(response => response.configurationId + '|' + response.condition), configurations.flatMap(id => ['baseline', 'skill'].map(condition => id + '|' + condition))));
  for (const response of archive.responses) {
    const key = response.configurationId + ':' + response.condition;
    const provenance = extension ? recordProvenance('generation', response.provenance.generationId, response.configurationId) : null;
    fail(key + ':generation-identity', response.provenance.generationId === await slotId('generation', response.configurationId, response.condition));
    fail(key + ':source-cohort', extension ? Object.entries(provenance).every(([field, value]) => response.provenance[field] === value)
      : ['sourceCohort', 'sourceSnapshotSha256', 'sourceManifestSha256'].every(field => response.provenance[field] === undefined));
    if (recovery) fail(key + ':recovery-attempt', response.runtime?.attemptNumber === (provenance.recordDisposition === 'technical-replacement' ? 2 : 1)
      && ['technicalRecoverySha256', 'supersedesRecordSha256'].every(field => response.provenance[field] === provenance[field]));
    const messages = archive.messageSets.find(item => item.id === response.messageSetId)?.messages;
    fail(key + ':answer-binding', response.caseId === task.id && response.trialNumber === 1 && Boolean(response.outputText.trim())
      && await hash(response.outputText) === response.provenance.outputSha256
      && response.provenance.sourceSha256 === data.scoreBasis.sourceSha256 && response.provenance.manifestSha256 === data.scoreBasis.manifestSha256
      && response.provenance.questionSha256 === await hash(task.prompt)
      && response.provenance.skillSha256 === (response.condition === 'skill' ? files.get('paired-skill-bundle')?.sha256 : null));
    fail(key + ':exact-host-input', messages?.length === (response.condition === 'skill' ? 2 : 1)
      && messages.at(-1).role === 'user' && messages.at(-1).content === task.prompt
      && await hash(JSON.stringify(messages)) === response.messageSetId
      && (response.condition !== 'skill' || messages[0].fileId === 'paired-skill-bundle' && messages[0].role === (response.configurationId.startsWith('claude:') ? 'system' : 'developer')));
    if (messages) fail(key + ':exact-message-hash', await hash(JSON.stringify(messages.map(message => ({ role: message.role, content: message.fileId ? files.get(message.fileId)?.content : message.content })))) === response.provenance.exactMessagesSha256);
    fail(key + ':word-count', response.wordCount === words(response.outputText));
    fail(key + ':two-judge-panel', sameIds(response.judgments.map(judge => judge.judgeConfigurationId), judges));
    const row = inspectDocument ? [...document.querySelectorAll('[data-report-setting-id]')].find(item => item.dataset.reportSettingId === response.settingId) : null;
    const panel = row?.querySelector('[data-condition="' + response.condition + '"]');
    if (inspectDocument) fail(key + ':rendered-answer', panel?.querySelector('[data-output-text]')?.textContent === response.outputText && !panel.querySelector('[data-output-absence]'));
    const scores = [];
    for (const judge of response.judgments) {
      const request = requestMap.get(judge.requestId), reviewKey = key + ':' + judge.judgeConfigurationId;
      fail(reviewKey + ':request-binding', Boolean(request) && request.configurationId === response.configurationId && request.caseId === task.id && request.trialNumber === 1
        && request.judgeConfigurationId === judge.judgeConfigurationId && request.candidateMap[judge.candidateId] === response.condition
        && request.candidateResponseHashes[judge.candidateId] === response.provenance.outputSha256
        && judge.promptSha256 === request.promptSha256 && judge.answerSha256 === request.outputSha256);
      if (!request) continue;
      try {
        const assessment = JSON.parse(request.outputText)['assessment' + judge.candidateId];
        fail(reviewKey + ':original-ratings', assessment?.candidateLabel === judge.candidateId && sameIds(assessment.ratings.map(item => item.criterionId), task.rubric.map(item => item.id))
          && assessment.ratings.every(rating => { const reading = judge.dimensions[rating.criterionId]; return Number.isInteger(rating.score) && rating.score >= 0 && rating.score <= 5 && reading?.rating === rating.score && reading.evidence === rating.evidence && reading.reason === rating.reason; }));
        const score = 20 * mean(assessment.ratings.map(item => item.score));
        fail(reviewKey + ':original-arithmetic', close(judge.score, score)); scores.push(score);
      } catch { mismatches.push(reviewKey + ':invalid-original'); }
      if (inspectDocument) {
        const review = [...panel?.querySelectorAll('[data-judge-review]') || []].find(item => item.dataset.reviewerId === judge.judgeConfigurationId);
        fail(reviewKey + ':rendered-ratings', Boolean(review) && task.rubric.every(criterion => {
          const dimension = review.querySelector('[data-dimension-id="' + criterion.id + '"]'), reading = judge.dimensions[criterion.id];
          return dimension?.querySelector('[data-dimension-reason]')?.textContent === reading.reason && dimension.querySelector('[data-cited-evidence]')?.textContent === reading.evidence;
        }));
        const original = [...review?.querySelectorAll('[data-creation-judge-evidence]') || []].find(item => item.tagName === 'DETAILS' && item.dataset.creationJudgeEvidence === request.id);
        fail(reviewKey + ':original-disclosure', Boolean(original));
        if (original && !renderedRequests.has(request.id)) {
          const wasOpen = original.open; original.open = true; original.dispatchEvent(new Event('toggle'));
          fail(request.id + ':rendered-original-review', original.querySelector('[data-creation-original-review]')?.textContent === request.outputText);
          const prompt = original.querySelector('[data-creation-judge-prompt]');
          if (prompt) {
            const promptWasOpen = prompt.open; prompt.open = true; prompt.dispatchEvent(new Event('toggle'));
            fail(request.id + ':rendered-original-prompt', prompt.querySelector('[data-creation-original-prompt]')?.textContent === request.promptText); prompt.open = promptWasOpen;
          } else mismatches.push(request.id + ':rendered-original-prompt');
          original.open = wasOpen; renderedRequests.add(request.id);
        }
      }
    }
    const exactScore = mean(scores);
    for (const cells of [data.caseResults, data.benchmarkResults, data.entries]) {
      const cell = cells.find(item => item.configurationId === response.configurationId && item.condition === response.condition);
      fail(key + ':panel-arithmetic', cells.length === answerCount && close(cell?.exactScore, exactScore));
    }
    answers.push({ configurationId: response.configurationId, condition: response.condition, outputSha256: response.provenance.outputSha256,
      ...(extension ? { provenance } : {}), messageSetId: response.messageSetId, requestIds: response.judgments.map(judge => judge.requestId), exactScore });
  }
  for (const request of archive.judgeRequests) {
    const provenance = extension ? recordProvenance('judgment', request.id, request.configurationId) : null;
    fail(request.id + ':request-identity', request.id === await slotId('judgment', request.configurationId, judges.indexOf(request.judgeConfigurationId) + 1));
    fail(request.id + ':source-cohort', extension ? same(request.provenance, provenance) : request.provenance === undefined);
    if (recovery) fail(request.id + ':recovery-attempt', request.attemptNumber === (provenance.recordDisposition === 'technical-replacement' ? 2 : 1));
    fail(request.id + ':original-bytes', await hash(request.promptText) === request.promptSha256 && await hash(request.outputText) === request.outputSha256);
    fail(request.id + ':anonymous-map', sameIds(Object.keys(request.candidateMap), ['A', 'B']) && sameIds(Object.values(request.candidateMap), ['baseline', 'skill']));
    try {
      const candidates = JSON.parse(request.promptText.split('Candidates (complete, untruncated):\n')[1]);
      const criteria = JSON.parse(request.promptText.split('Task criteria:\n')[1].split('\n\n')[0]);
      fail(request.id + ':exact-task-and-criteria', request.promptText.includes('Exact task:\n' + task.prompt) && same(criteria, task.rubric.map(({ id, criterion }) => ({ id, criterion }))));
      fail(request.id + ':complete-candidates', candidates.length === 2 && ['A', 'B'].every(label => {
        const answer = archive.responses.find(item => item.configurationId === request.configurationId && item.condition === request.candidateMap[label]);
        const candidate = candidates.find(item => item.candidateLabel === label);
        return answer && candidate && same(candidate, { candidateLabel: label, wordCount: words(answer.outputText), exceedsWordLimit: words(answer.outputText) > task.wordLimit, answer: answer.outputText }) && request.candidateResponseHashes[label] === answer.provenance.outputSha256;
      }));
    } catch { mismatches.push(request.id + ':original-prompt-json'); }
    requests.push({ requestId: request.id, configurationId: request.configurationId, judgeConfigurationId: request.judgeConfigurationId,
      ...(extension ? { provenance } : {}), promptSha256: request.promptSha256, outputSha256: request.outputSha256, candidateMap: request.candidateMap, candidateResponseHashes: request.candidateResponseHashes, renderedOriginal: inspectDocument ? renderedRequests.has(request.id) : true });
  }
  for (const configurationId of configurations) {
    const pair = archive.judgeRequests.filter(request => request.configurationId === configurationId);
    fail(configurationId + ':opposite-order-panel', sameIds(pair.map(request => request.judgeConfigurationId), judges) && sameIds(pair.map(request => request.candidateMap.A), ['baseline', 'skill']));
    const firstBaseline = (parseInt((await hash(JSON.stringify(['storytelling-plot-twists-paired-v2-20260909', configurationId, task.id, 1]))).slice(0, 2), 16) & 1) === 0;
    fail(configurationId + ':frozen-seeded-order', pair.find(request => request.judgeConfigurationId === judges[0])?.candidateMap.A === (firstBaseline ? 'baseline' : 'skill'));
  }
  if (inspectDocument) {
    fail('complete-rendered-model-settings', document.querySelectorAll('[data-report-setting-id]').length === settingCount && !document.querySelector('[data-output-absence]'));
    for (const criterion of task.rubric) {
      const element = document.querySelector('[data-rubric-dimension="' + criterion.id + '"]');
      fail(criterion.id + ':rubric-and-scale', element?.querySelector('[data-rubric-description]')?.textContent === criterion.criterion && Object.entries(data.methodology.ratingAnchors).every(([rating, text]) => element.querySelector('[data-rubric-anchor="' + rating + '"]')?.textContent === text));
    }
  }
  return { kind: 'vasirbenchmark-paired-twists-browser-evidence', benchmarkId, edition, caseId: task.id, sourceSha256: data.scoreBasis.sourceSha256, manifestSha256: data.scoreBasis.manifestSha256,
    ...(extension ? { coverageExtension: extension, executionValidationPolicy: contract.executionValidationPolicy } : {}),
    ...(declaredAppend ? { sourceCohorts: cohorts, coverageHistory: history } : {}),
    ...(recovery ? { technicalRecovery: recovery, recordSources: contract.recordSources } : {}),
    ...(contract?.toolIsolationPolicy ? { toolIsolationPolicy: contract.toolIsolationPolicy } : {}), skillFiles, answers, requests, mismatches };
}

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, argument, index, all) => {
  if (argument.startsWith('--')) pairs.push([argument.slice(2), all[index + 1]]);
  return pairs;
}, []));
assert.ok(options.url && options['output-dir'], 'Usage: writing-browsercheck.mjs --url URL --output-dir PATH [--width 1440 --height 1000] [--require-scored]');
const requireScored = Object.hasOwn(options, 'require-scored');
const requestedBenchmark = options.benchmark ?? null;
const creationBenchmarkId = 'storytelling-magic-discovery';
const isCreation = requestedBenchmark === creationBenchmarkId;
const writingArchiveRequest = request => /\/writing-(?:(?:creation|twists|dungeon-master)-)?responses\.js$/.test(new URL(request.url).pathname);
const baseUrl = new URL(options.url);
assert.ok(baseUrl.protocol === 'https:' || (baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseUrl.hostname)), 'Use HTTPS or a local HTTP server.');
const width = Number(options.width || 1440);
const height = Number(options.height || 1000);
assert.ok(Number.isInteger(width) && width >= 320 && Number.isInteger(height) && height >= 400);
const output = path.resolve(options['output-dir']);
fs.mkdirSync(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const harnessSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
const acceptanceEvidencePath = new URL('../../docs/work/vasir-benchmarking/writing-category/acceptance-evidence.mjs', import.meta.url);
const acceptanceEvidenceSha256 = sha256(fs.readFileSync(acceptanceEvidencePath));
const compactEvidenceHarnessSha256 = sha256(fs.readFileSync(new URL('./writing-compact-browser-evidence.mjs', import.meta.url)));
const chromePath = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(file => fs.existsSync(file));
assert.ok(chromePath, 'Chrome must be installed or CHROME_BIN set.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-writing-browsercheck-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const deadline = Date.now() + 180000;
const checks = [];
const screenshots = [];
const failureScreenshots = [];
const progressEvidence = [];
const errors = [];
const requests = [];
const responses = new Map();
const loadedFilePromises = [];
const pending = new Map();
let socket;
let nextId = 1;
let coverage;
let overallSha256;

// Preserve the actual loaded bodies, including the expanded response archives,
// outside the renderer across report navigation. These are CDP capture budgets,
// not publication-size limits. No failed capture is replaced by a second fetch.
// https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-enable
const networkCaptureOptions = Object.freeze({ maxTotalBufferSize: 128 * 1024 * 1024, maxResourceBufferSize: 32 * 1024 * 1024, enableDurableMessages: true });
function recordLoadedFile(requestId, response) {
  loadedFilePromises.push(send('Network.getResponseBody', { requestId }).then(result => {
    const bytes = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
    return { url:response.url, bytes:bytes.length, sha256:sha256(bytes) };
  }).catch(error => { errors.push({kind:'loaded-byte-evidence',requestId,url:response.url,detail:error.message}); return null; }));
}
async function drainLoadedFiles() {
  let count, files;
  do {
    count = loadedFilePromises.length;
    files = await Promise.all(loadedFilePromises.slice());
  } while (count !== loadedFilePromises.length);
  return files.filter(Boolean);
}

async function waitFor(check, label, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout && Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const check = (name, condition, detail) => {
  assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`);
  checks.push(name);
};
const click = async selector => {
  await drainLoadedFiles();
  return evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Control missing'); element.scrollIntoView({block:'center',behavior:'instant'}); element.click(); })()`);
};
const pageUrl = (name, fragment = '') => {
  const url = new URL(name, baseUrl);
  if (requestedBenchmark) url.searchParams.set('writing', requestedBenchmark);
  url.hash = fragment;
  return url.href;
};
const navigate = async (url, predicate) => {
  await drainLoadedFiles();
  await send('Page.navigate', { url });
  await waitFor(() => evaluate(`document.readyState === 'complete' && (${predicate})`).catch(() => false), url);
  await evaluate('document.fonts.ready');
  await drainLoadedFiles();
};
const capture = async (name, collection = screenshots, evidence = {}) => {
  // Capture the settled interface, not a transient navigation fade. Infinite
  // decorative animations must never hold the evidence run open.
  await evaluate(`(async () => {
    await document.fonts.ready;
    const finite=document.getAnimations().filter(animation=>{
      const timing=animation.effect?.getComputedTiming();
      return animation.playState==='running'&&Number.isFinite(timing?.endTime)&&timing.endTime<=2000;
    });
    await Promise.race([Promise.allSettled(finite.map(animation=>animation.finished)),new Promise(resolve=>setTimeout(resolve,2000))]);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  })()`);
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(result.data, 'base64');
  fs.writeFileSync(path.join(output, name), bytes);
  collection.push({ path: name, bytes: bytes.length, sha256: sha256(bytes), width, height, ...evidence });
};
const noOverflow = async name => {
  const result = await evaluate('({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
  if (result.scroll > result.viewport + 1) {
    const geometry = await evaluate(`({hash:location.hash,scrollX:window.scrollX,bodyWidth:document.body.clientWidth,openArchives:[...document.querySelectorAll('[data-prompt-file][open]')].map(element=>element.dataset.promptFile),elements:[...document.querySelectorAll('body *')].map(element=>({tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',right:element.getBoundingClientRect().right+window.scrollX,width:element.getBoundingClientRect().width,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflowX:getComputedStyle(element).overflowX})).filter(element=>element.right>document.documentElement.clientWidth+1||element.scrollWidth>element.clientWidth+1).slice(0,40)})`);
    fs.writeFileSync(path.join(output, 'writing-overflow.json'), JSON.stringify({scope:name,...result,...geometry},null,2)+'\n');
    await capture('writing-overflow.png', failureScreenshots, {scope:name});
  }
  check(`${name}: no horizontal page overflow`, result.scroll <= result.viewport + 1, JSON.stringify(result));
};
const verifyWritingAnswerLinkBounds = async scope => {
  const temporarilyOpened=await evaluate(`(() => {const ids=[];for(const node of document.querySelectorAll('details[data-writing-selected-setting]')){const panel=node.closest('#capability-ranking,#capability-efficiency');if(panel&&!panel.hidden&&!node.open){ids.push(panel.id);node.open=true;}}return ids;})()`);
  const proof=await evaluate(`(() => {
    const links=[...document.querySelectorAll('.writing-selection a[data-writing-answer-benchmark]')].filter(link=>link.getBoundingClientRect().width>0&&link.getBoundingClientRect().height>0),viewport=document.documentElement.clientWidth,mismatches=[];
    const evidence=links.map(link=>{
      const box=link.getBoundingClientRect(),style=getComputedStyle(link),number=value=>parseFloat(value)||0;
      const bounds={left:box.left+number(style.borderLeftWidth)+number(style.paddingLeft),right:box.right-number(style.borderRightWidth)-number(style.paddingRight),top:box.top+number(style.borderTopWidth)+number(style.paddingTop),bottom:box.bottom-number(style.borderBottomWidth)-number(style.paddingBottom)};
      if(box.left < -1 || box.right > viewport+1)mismatches.push(link.dataset.writingAnswerBenchmark+':card-outside-viewport');
      const fits=rect=>rect.left>=bounds.left-1.5&&rect.right<=bounds.right+1.5&&rect.top>=bounds.top-1.5&&rect.bottom<=bounds.bottom+1.5;
      const children=[...link.children].map(child=>{
        const rect=child.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(child);const textRects=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
        if(!fits(rect)||textRects.some(rect=>!fits(rect)))mismatches.push(link.dataset.writingAnswerBenchmark+':'+child.tagName+':clipped-content');
        return {tag:child.tagName,text:child.textContent,width:rect.width,lineRects:textRects.length};
      });
      return {benchmarkId:link.dataset.writingAnswerBenchmark,cardWidth:box.width,children};
    });
    return {links:evidence,mismatches};
  })()`);
  check(`Writing ${scope}: answer-card children and actual text lines fit their cards and viewport`,!proof.mismatches.length,JSON.stringify(proof));
  await evaluate(`(${ids=>{for(const id of ids){const node=document.querySelector('#'+id+' details[data-writing-selected-setting]');if(node)node.open=false;}}})(${JSON.stringify(temporarilyOpened)})`);
  return {scope,...proof};
};
const verifyWritingProgress = async scope => {
  const proof = await evaluate(`(() => {
    const data=window.VASIR_WRITING, coverage=data.coverage, element=document.querySelector('[data-writing-progress]'),creation=data.benchmarks[0].id==='storytelling-magic-discovery';
    const common=data.provisionalLeaderboard?.id==='core-idea-astra-common-11-v1'?data.provisionalLeaderboard:null;
    if(common){
      const answers=window.VASIR_WRITING_RESPONSES.responses.filter(answer=>common.caseIds.includes(answer.caseId));
      const assessed=answers.filter(answer=>answer.judgments.filter(judge=>judge.judgeConfigurationId==='codex:gpt-6-astra@xhigh'&&Number.isFinite(judge.score)).length===1).length;
      const expected=common.expectedCaseCount*data.settings.length*2,complete=assessed===expected;
      const counts=Object.fromEntries(['answers','reviews','panels'].map(key=>[key,element?.querySelector('[data-writing-progress-count="'+key+'"]')?.textContent]));
      const status=element?.querySelector('[data-writing-progress-status]')?.textContent,disclosure=element?.querySelector('[data-writing-progress-disclosure]')?.textContent||'',browse=element?.querySelector('[data-writing-browse-answers]'),rect=browse?.getBoundingClientRect(),mismatches=[];
      if(element?.dataset.writingDerivedScope!==common.id||status!==(complete?'COMPLETE':'INCOMPLETE')+' · 1 ASTRA JUDGE')mismatches.push('common-core-progress-scope');
      if(counts.answers!==answers.filter(answer=>answer.outputText).length+'/'+expected+' scored-corpus answers'||counts.reviews!==assessed+'/'+expected+' Astra reviews'||counts.panels!==common.rankedSettingCount+'/'+data.settings.length+' complete '+common.expectedCaseCount+'-story settings')mismatches.push('common-core-progress-counts');
      if(!disclosure.includes('The Matrix is globally excluded')||!disclosure.includes('post-run user-approved')||!disclosure.includes('All '+data.cases.length+' original stories')||!disclosure.includes('additional Fable reviews do not determine this score'))mismatches.push('common-core-progress-disclosure');
      if(!rect||rect.width<=0||rect.height<44||browse?.getAttribute('data-report-section')!=='ranking')mismatches.push('browse-answers-link');
      return {inProgress:!complete,status,counts,failedGenerations:coverage.terminalGenerationFailureCount||0,browseHref:browse?.href||null,scoringScope:common.id,mismatches};
    }
    const inProgress=typeof coverage.executionComplete==='boolean'?!coverage.executionComplete:coverage.judgmentCount<coverage.expectedJudgmentCount || coverage.completedSettingCount<coverage.settingCount;
    const excluded=coverage.executionStatus==='complete-with-exclusions';
    const paired=data.scoreBasis.edition==='storytelling-plot-twists-paired-v2';
    const expected={answers:coverage.responseCount+'/'+coverage.expectedResponseCount+' final answers',reviews:coverage.judgmentCount+'/'+coverage.expectedJudgmentCount+(paired?' planned answer assessments':' planned judge reviews'),panels:coverage.scoredResponseCount+'/'+coverage.expectedResponseCount+' complete '+data.scoreBasis.judgeCount+'-judge answer panels'};
    if(paired) expected['pair-reviews']=coverage.pairedJudgeCallCount+'/'+coverage.expectedPairs*data.scoreBasis.judgeCount+' blind pair reviews';
    const counts=Object.fromEntries(Object.keys(expected).map(key=>[key,element?.querySelector('[data-writing-progress-count="'+key+'"]')?.textContent]));
    const status=element?.querySelector('[data-writing-progress-status]')?.textContent;
    const disclosure=element?.querySelector('[data-writing-progress-disclosure]')?.textContent || '';
    const failures=data.caseResults.filter(cell=>['error','unavailable'].includes(cell.status)).length;
    const browse=element?.querySelector('[data-writing-browse-answers]');
    const rect=browse?.getBoundingClientRect();
    const mismatches=[];
    if(status!==(excluded?creation?'FINAL SNAPSHOT · INCOMPLETE PANELS RETAINED':'FINAL SNAPSHOT · '+coverage.terminallyExcludedPairCount+' EXCLUDED '+(coverage.terminallyExcludedPairCount===1?'PAIR':'PAIRS'):inProgress?'INCOMPLETE SNAPSHOT':'COMPLETE SNAPSHOT')) mismatches.push('progress-status');
    if(Object.keys(expected).some(key=>counts[key]!==expected[key])) mismatches.push('progress-counts');
    if(inProgress && !disclosure.includes('Judging incomplete; available answers and reviews are published.')) mismatches.push('incomplete-disclosure');
    if(!disclosure.includes('Incomplete configurations are not ranked.') || !disclosure.includes('Case scores require the full judge panel.')) mismatches.push('ranking-disclosure');
    if(failures && !excluded && !disclosure.includes(failures+' failed generations are retained; planned totals include unavailable slots.')) mismatches.push('failed-slot-disclosure');
    if(excluded && creation) {
      if(inProgress || coverage.pendingGenerationCount!==0 || coverage.pendingJudgmentCount!==0 || coverage.judgmentCount+coverage.terminalJudgmentFailureCount+coverage.terminallyExcludedJudgmentCount!==coverage.expectedJudgmentCount) mismatches.push('creation-terminal-accounting');
      if(!disclosure.includes(coverage.validResponseCount+' valid final answers') || !disclosure.includes(coverage.terminalGenerationFailureCount+' terminal generation failures') || !disclosure.includes(coverage.terminalJudgmentFailureCount+' failed assessments') || !disclosure.includes('No judge reviews are pending.') || !disclosure.includes('Missing scores remain unassigned.')) mismatches.push('creation-terminal-disclosure');
    } else if(excluded) {
      if(inProgress || coverage.pendingGenerationCount!==0 || coverage.pendingJudgmentCount!==0 || coverage.judgmentCount+coverage.terminallyExcludedJudgmentCount!==coverage.expectedJudgmentCount) mismatches.push('terminal-exclusion-accounting');
      if(!disclosure.includes(coverage.validResponseCount+' valid final answers') || !disclosure.includes(coverage.terminalGenerationFailureCount+' failed full-read verifications') || !disclosure.includes(coverage.terminallyExcludedJudgmentCount+' terminally excluded reviews') || !disclosure.includes('No judge reviews are pending.') || disclosure.includes('Judging incomplete')) mismatches.push('terminal-exclusion-disclosure');
      if(data.caseResults.filter(cell=>cell.generationDisposition==='complete').length!==coverage.validResponseCount || data.caseResults.filter(cell=>cell.generationDisposition==='terminal-protocol-failure').length!==coverage.terminalGenerationFailureCount || data.caseResults.filter(cell=>cell.judgingDisposition==='terminal-excluded').reduce((sum,cell)=>sum+cell.coverage.expectedJudgments,0)!==coverage.terminallyExcludedJudgmentCount) mismatches.push('terminal-exclusion-source-counts');
    }
    if(!rect || rect.width<=0 || rect.height<44 || !browse.textContent.includes('Browse answers')) mismatches.push('browse-answers-link');
    if(coverage.responseCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedResponses,0) || coverage.judgmentCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedJudgments,0) || coverage.scoredResponseCount!==data.caseResults.filter(cell=>Number.isFinite(cell.score)).length) mismatches.push('source-coverage-counts');
    if(location.pathname.endsWith('benchmark-report.html') ? browse?.getAttribute('data-report-section')!=='ranking' : !browse?.href.includes('benchmark-report.html#'+data.benchmarks[0].id)) mismatches.push('browse-answers-destination');
    return {inProgress,status,counts,failedGenerations:failures,browseHref:browse?.href || null,mismatches};
  })()`);
  check(`Writing ${scope}: source-derived progress, planned coverage and direct answer access`, proof.mismatches.length === 0, JSON.stringify(proof));
  progressEvidence.push({scope,...proof});
};
const evaluateFunction = (fn, argument) => evaluate('('+fn.toString()+')('+JSON.stringify(argument??null)+')');
const layout = () => evaluateFunction(() => {
  const row=document.querySelector('#capability-ranking .capability-rank-row'),text=row?.querySelector('.capability-rank-row__model strong'),track=row?.querySelector('.capability-rank-row__track');
  return row&&text?{rowHeight:row.getBoundingClientRect().height,font:getComputedStyle(text).font,fontSize:getComputedStyle(text).fontSize,trackWidth:track?.getBoundingClientRect().width}:null;
});
const selectedProjectionExpression='(() => {const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING;return root.compactBenchmarks?.['+JSON.stringify(requestedBenchmark)+'] || root.additionalBenchmarks?.['+JSON.stringify(requestedBenchmark)+'] || root.benchmarkPublications?.find(item=>item.benchmarkId==='+JSON.stringify(requestedBenchmark)+')?.projection || root;})()';
const inspectWritingComparison = async expected => {
  verifyCandidateCategoryProjection(await evaluate('window.VASIR_WRITING_CATEGORY'),expected);
  const coverageDisclosureEvidence=await evaluate(`(() => {const node=document.querySelector('[data-writing-incomplete-results]'),rows=node?.querySelectorAll('.capability-rank-row'),selectedPartial=!!node?.querySelector('.capability-rank-row.is-selected'),defaultOpen=!!node?.open,mismatches=[];if(node&&(node.tagName!=='DETAILS'||node.dataset.writingCoverageDisplay!=='coverage-summary-v1'||defaultOpen!==selectedPartial))mismatches.push('default-state');if(node)node.open=true;return {present:!!node,selectedPartial,defaultOpen,rowCount:rows?.length||0,opensForAudit:!node||!!rows?.[0]?.getBoundingClientRect().width,mismatches};})()`);
  const modelDisclosureEvidence=await evaluate(`(() => {const node=document.querySelector('#capability-ranking [data-writing-selected-setting]'),defaultClosed=node?.tagName==='DETAILS'&&!node.open;if(node)node.open=true;const component=node?.querySelector('[data-writing-component]');return {defaultClosed,opensForAudit:!!node?.open&&!!component?.getBoundingClientRect().width,mismatches:[]};})()`);
  const evidence=await evaluateFunction(expected=>{
    const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7,format=value=>Number.isFinite(value)?value.toFixed(1):'—',round=(value,scale=Math.abs(value))=>Math.round((value+2*Number.EPSILON*Math.max(1,scale))*10)/10;
    const rows=[...document.querySelectorAll('#capability-ranking .capability-ranking__rows > .capability-rank-row')],mismatches=[];
    const rowEvidence=rows.map(row=>{
      const baseline=expected.entries.find(entry=>entry.settingId===row.dataset.settingId&&entry.condition==='baseline'),skill=expected.entries.find(entry=>entry.settingId===row.dataset.settingId&&entry.condition==='skill');
      const track=row.querySelector('.capability-rank-row__track'),button=row.querySelector('.capability-rank-row__select');
      const readings=['baseline','full'].map(condition=>row.querySelector('.capability-rank-row__reading--'+condition+' strong')?.textContent.trim());
      const setting=window.VASIR_WRITING_CATEGORY.settings.find(item=>item.id===row.dataset.settingId);
      const label=[row.querySelector('.capability-rank-row__model strong')?.textContent.trim(),row.querySelector('.capability-rank-row__model small')?.textContent.trim()].filter(Boolean).join(' · ');
      const evidence={settingId:row.dataset.settingId,configurationId:setting?.configurationId||setting?.id||null,label,exactBaseline:Number(row.dataset.exactBaseline),exactSkill:Number(row.dataset.exactSkill),exactDelta:Number(row.dataset.exactDelta),baselineRank:row.dataset.baselineRank==='null'?null:Number(row.dataset.baselineRank),skillRank:row.dataset.fullRank==='null'?null:Number(row.dataset.fullRank),baselinePosition:parseFloat(row.style.getPropertyValue('--baseline-score')),skillPosition:parseFloat(row.style.getPropertyValue('--full-score')),ariaLabel:button?.getAttribute('aria-label'),partial:row.dataset.partial==='true',asteriskRendered:readings.every(value=>value?.endsWith('*'))};
      if(!baseline||!skill||!Number.isFinite(baseline.exactScore)||!Number.isFinite(skill.exactScore)){mismatches.push('incomplete-row:'+evidence.settingId);return evidence;}
      if(evidence.configurationId!==skill.configurationId||label!==expected.settingLabels[skill.configurationId])mismatches.push('row-source-identity:'+evidence.settingId);
      for(const [value,wanted]of[[evidence.exactBaseline,baseline.exactScore],[evidence.exactSkill,skill.exactScore],[evidence.exactDelta,skill.exactDelta],[evidence.baselinePosition,baseline.score],[evidence.skillPosition,skill.score]])if(!close(value,wanted))mismatches.push('row-math:'+evidence.settingId);
      // A difference can inherit cancellation error from two much larger scores.
      // Bound the display-only half-tenth correction by those source operands;
      // exact scores, deltas, rank eligibility and ranks were checked above.
      if(row.dataset.baselineScore!==format(baseline.score)||row.dataset.fullScore!==format(skill.score)||row.dataset.delta!==format(round(skill.exactDelta,Math.max(Math.abs(baseline.exactScore),Math.abs(skill.exactScore))))||evidence.baselineRank!==baseline.rank||evidence.skillRank!==skill.rank)mismatches.push('row-readings:'+evidence.settingId);
      if(evidence.partial!==skill.partial||readings[0]!==format(baseline.score)+(skill.partial?'*':'')||readings[1]!==format(skill.score)+(skill.partial?'*':'')||/asterisk|some tests are missing/i.test(evidence.ariaLabel)!==skill.partial)mismatches.push('row-partial-marker:'+evidence.settingId);
      if(!evidence.ariaLabel?.includes(format(skill.score))||!track?.getAttribute('aria-label')?.includes('circle')||!track?.getAttribute('aria-label')?.includes('square'))mismatches.push('accessible-pair:'+evidence.settingId);
      const box=track?.getBoundingClientRect();
      if(box?.width>0)for(const [condition,score]of[['baseline',baseline.score],['full',skill.score]]){
        const marker=track.querySelector('.capability-rank-row__marker--'+condition)?.getBoundingClientRect();
        if(!marker||Math.abs((marker.left+marker.width/2)-box.left-box.width*score/100)>1.5)mismatches.push('marker-position:'+evidence.settingId+':'+condition);
      }
      if(row.querySelector('.capability-composition'))mismatches.push('stacked-row:'+evidence.settingId);
      return evidence;
    });
    const eligible=expected.entries.filter(entry=>entry.condition==='skill'&&Number.isFinite(entry.exactScore));
    if(rows.length!==eligible.length||new Set(rowEvidence.map(row=>row.settingId)).size!==rows.length)mismatches.push('complete-row-count');
    const rankedRows=rowEvidence.filter(row=>row.skillRank!==null),partialRows=rowEvidence.filter(row=>row.skillRank===null);
    for(let i=1;i<rankedRows.length;i++)if(rankedRows[i].exactSkill>rankedRows[i-1].exactSkill)mismatches.push('score-order');
    if(partialRows.some(row=>!row.partial)||rankedRows.some(row=>row.partial)||document.querySelectorAll('[data-writing-incomplete-results] .capability-rank-row').length!==partialRows.length)mismatches.push('ranked-partial-separation');
    const panel=document.querySelector('#capability-ranking [data-writing-selected-setting]'),selectedId=panel?.dataset.writingSelectedSetting;
    const componentEvidence=[...panel?.querySelectorAll('[data-writing-component]')||[]].map(node=>({settingId:selectedId,benchmarkId:node.dataset.writingComponent,exactBaseline:Number(node.dataset.exactBaseline),exactSkill:Number(node.dataset.exactSkill),weight:Number(node.dataset.weight)}));
    const selectedSkill=expected.entries.find(entry=>entry.settingId===selectedId&&entry.condition==='skill'),aggregateEvidence=[];
    if(Number.isFinite(selectedSkill?.exactScore)){
      if(componentEvidence.length!==selectedSkill.availableBenchmarkIds.length||componentEvidence.some(item=>!selectedSkill.availableBenchmarkIds.includes(item.benchmarkId)))mismatches.push('component-count');
      for(const component of componentEvidence){
        if(!close(component.weight,selectedSkill.benchmarkWeights[component.benchmarkId]))mismatches.push('component-weight');
        for(const [field,condition]of[['exactBaseline','baseline'],['exactSkill','skill']]){
          const source=expected.entries.find(entry=>entry.settingId===selectedId&&entry.condition===condition)?.benchmarkComponents.find(item=>item.benchmarkId===component.benchmarkId);
          if(!close(component[field],source?.exactScore))mismatches.push('component-source:'+component.benchmarkId+':'+condition);
        }
      }
      const total=panel.querySelector('[data-writing-exact-aggregate]'),baseline=expected.entries.find(entry=>entry.settingId===selectedId&&entry.condition==='baseline');
      if(!total||!close(Number(total.dataset.exactBaseline),baseline.exactScore)||!close(Number(total.dataset.exactSkill),selectedSkill.exactScore))mismatches.push('aggregate-total');
      for(const [field,wanted]of[['exactBaseline',baseline.exactScore],['exactSkill',selectedSkill.exactScore]])if(!close(componentEvidence.reduce((sum,item)=>sum+item[field]*item.weight,0),wanted))mismatches.push('component-sum:'+field);
      const formulas=[...total?.querySelectorAll(':scope > p')||[]].map(node=>node.textContent.trim());
      const divisors=formulas.map(text=>Number(text.match(/÷\s*(\d+)/)?.[1]||1));
      const method=total?.dataset.calculationMethod,sourceCount=Number(total?.dataset.sourceCount),equalWeights=componentEvidence.every(item=>close(item.weight,1/selectedSkill.sourceCount));
      const aggregate={settingId:selectedId,exactBaseline:Number(total?.dataset.exactBaseline),exactSkill:Number(total?.dataset.exactSkill),partial:total?.dataset.partial==='true',asteriskRendered:formulas.length===2&&formulas.every(text=>text.endsWith('*')),divisor:method==='weighted-sum'?null:divisors[0],method,sourceCount,componentWeights:Object.fromEntries(componentEvidence.map(item=>[item.benchmarkId,item.weight])),formulas};
      if(aggregate.partial!==selectedSkill.partial||formulas.length!==2||formulas.some(text=>text.endsWith('*')!==selectedSkill.partial)||sourceCount!==selectedSkill.sourceCount)mismatches.push('aggregate-partial-formula');
      if(method==='weighted-sum'){
        if(formulas.some(text=>text.includes('÷')||text.includes('%')||!text.includes('×'))||componentEvidence.some(item=>formulas.some(text=>!text.includes('× '+expected.weightTokens[item.weight]))))mismatches.push('aggregate-weighted-formula');
      }else if(method!=='arithmetic-mean'||!equalWeights||divisors.some(divisor=>divisor!==selectedSkill.sourceCount))mismatches.push('aggregate-mean-formula');
      for(const [index,result,label]of[[0,baseline,'Plain'],[1,selectedSkill,'Skill']]){
        const terms=result.benchmarkComponents.filter(item=>item.weight>0&&Number.isFinite(item.exactScore)),values=terms.map(item=>format(item.score));
        const expression=equalWeights?values.length>1?'('+values.join(' + ')+') ÷ '+values.length:values[0]:terms.map((item,index)=>values[index]+' × '+expected.weightTokens[item.weight]).join(' + ');
        if(formulas[index]!==label+' '+expression+' ≈ '+format(result.score)+(result.partial?'*':''))mismatches.push('visible-formula-terms:'+label);
      }
      aggregateEvidence.push(aggregate);
    }else mismatches.push('selected-incomplete-setting');
    const noPlaceholderPanels=!document.querySelector('[data-writing-partial-coverage],[data-writing-coverage-gaps],.writing-provisional-overview');
    if(!noPlaceholderPanels)mismatches.push('placeholder-panels');
    const headerEvidence=[...document.querySelectorAll('.capability-canvas__header [data-writing-partial-indicator]')].map(node=>({condition:node.dataset.leaderCondition,entryId:node.dataset.entryId,partial:node.dataset.writingPartialIndicator==='true',asteriskRendered:[...node.querySelector('dd')?.childNodes||[]].filter(child=>child.nodeType===Node.TEXT_NODE).some(child=>child.textContent.includes('*'))}));
    for(const header of headerEvidence){const leaders=expected.entries.filter(entry=>entry.condition===header.condition&&entry.rank===1),displayed=leaders.find(entry=>entry.id===header.entryId);if(header.partial!==leaders.some(entry=>entry.partial)||!displayed||header.asteriskRendered!==displayed.partial)mismatches.push('header-partial-marker:'+header.condition);}
    if(headerEvidence.length!==(expected.entries.some(entry=>entry.condition==='skill'&&entry.rank===1)?1:0)||headerEvidence.some(header=>header.condition!=='skill'))mismatches.push('header-condition-count');
    const sidebar=document.querySelector('#capability-category-writing'),sidebarPartial=sidebar?.dataset.writingSummaryPartial==='true',sidebarAsteriskRendered=sidebar?.querySelector('strong')?.textContent.includes('*')||false;
    if(sidebarPartial!==expected.sidebarPartial||sidebarAsteriskRendered!==expected.sidebarPartial)mismatches.push('sidebar-partial-marker');
    const sidebarScore=[...sidebar?.querySelector('strong')?.childNodes||[]].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim(),sidebarLabel=sidebar?.getAttribute('aria-label')||'';
    if(sidebarScore!==(expected.sidebarScore===null?'Results':format(expected.sidebarScore)+(expected.sidebarPartial?'*':''))||expected.sidebarScore!==null&&!sidebarLabel.includes('All Writing'))mismatches.push('sidebar-all-writing-leader');
    const footnotes=[...document.querySelectorAll('[data-writing-partial-footnote]')],partialFootnote=footnotes[0]?.textContent.trim();
    if(footnotes.length!==1||partialFootnote!=='* Incomplete results are shown separately, without a rank.')mismatches.push('partial-footnote');
    const coverage=window.VASIR_WRITING_CATEGORY.coverage;
    return {selectionId:document.querySelector('#writing-score-selection')?.value,activeBenchmarkIds:expected.activeBenchmarkIds,benchmarkWeights:expected.benchmarkWeights,provisional:window.VASIR_WRITING_CATEGORY.writingCategory.selection?.provisional,completeSettings:coverage.completedSettingCount,rankedSettings:eligible.filter(entry=>entry.eligibleForRank).length,partialSettings:eligible.filter(entry=>entry.partial).length,rowEvidence,componentEvidence,aggregateEvidence,headerEvidence,sidebarPartial,sidebarAsteriskRendered,sidebarScore,sidebarLabel,partialFootnote,noPlaceholderPanels,mismatches};
  },{entries:expected.entries,settingLabels:Object.fromEntries([...expected.publications.values()].flatMap(publication=>publication.settings.map(setting=>[setting.configurationId||setting.id,setting.label||[setting.family,setting.reasoning].filter(Boolean).join(' · ')||setting.id]))),activeBenchmarkIds:expected.activeBenchmarkIds,benchmarkWeights:expected.benchmarkWeights,weightTokens:Object.fromEntries(expected.entries.flatMap(entry=>Object.values(entry.benchmarkWeights).map(weight=>[weight,expectedWritingWeightToken(weight)]))),sidebarPartial:deriveExpectedWritingCategory(expected.collection,'all-writing').entries.find(entry=>entry.condition==='skill'&&entry.rank===1)?.partial||false,sidebarScore:deriveExpectedWritingCategory(expected.collection,'all-writing').entries.find(entry=>entry.condition==='skill'&&entry.rank===1)?.score??null});
  modelDisclosureEvidence.closesAfterAudit=await evaluate(`(() => {const node=document.querySelector('#capability-ranking [data-writing-selected-setting]');if(node)node.open=false;return node?.tagName==='DETAILS'&&!node.open;})()`);
  coverageDisclosureEvidence.restored=await evaluateFunction(wasOpen=>{const node=document.querySelector('[data-writing-incomplete-results]');if(node)node.open=wasOpen;return !node||node.open===wasOpen;},coverageDisclosureEvidence.defaultOpen);
  if(coverageDisclosureEvidence.rowCount!==expected.partialSettings||coverageDisclosureEvidence.present!==(expected.partialSettings>0)||!coverageDisclosureEvidence.opensForAudit||!coverageDisclosureEvidence.restored)coverageDisclosureEvidence.mismatches.push('complete-inspectable-coverage');
  for(const key of ['defaultClosed','opensForAudit','closesAfterAudit'])if(!modelDisclosureEvidence[key])modelDisclosureEvidence.mismatches.push(key);
  evidence.mismatches.push(...modelDisclosureEvidence.mismatches.map(key=>'model-disclosure:'+key));
  evidence.mismatches.push(...coverageDisclosureEvidence.mismatches.map(key=>'coverage-disclosure:'+key));
  return {...evidence,modelDisclosureEvidence,coverageDisclosureEvidence};
};
const chooseWritingScore = async selectionId => {
  await drainLoadedFiles();
  await evaluateFunction(selectionId=>{const select=document.querySelector('#writing-score-selection');select.value=selectionId;select.dispatchEvent(new Event('change',{bubbles:true}));},selectionId);
  await waitFor(()=>evaluateFunction(selectionId=>document.readyState==='complete'&&document.querySelector('#writing-score-selection')?.value===selectionId&&window.VASIR_WRITING_CATEGORY?.writingCategory.selection.id===selectionId&&(selectionId==='all-writing'||new URLSearchParams(location.search).get('score')===selectionId),selectionId).catch(()=>false),'Selected '+selectionId);
  await evaluate('document.fonts.ready');
  await drainLoadedFiles();
};
const inspectWritingSharedControls = async (mode, selectionId, expected, settingId = null) => {
  const proof = await evaluateFunction(({mode,selectionId,settingId,sidebarScore}) => {
    const control=document.querySelector('[data-writing-score-controls]'),select=control?.querySelector('#writing-score-selection'),box=select?.getBoundingClientRect(),mismatches=[];
    const panelId=mode==='models'?'capability-ranking':mode==='benchmarks'?'capability-benchmarks':'capability-efficiency',panel=document.getElementById(panelId);
    if(document.querySelectorAll('#writing-score-selection').length!==1||!control||control.closest('#capability-ranking,#capability-benchmarks,#capability-efficiency')||!box?.width||!box?.height||!panel||panel.hidden)mismatches.push('shared-selector-visibility');
    if(select?.value!==selectionId||window.VASIR_WRITING_CATEGORY.writingCategory.selection.id!==selectionId)mismatches.push('shared-selector-value');
    const route='#capabilities/writing'+(mode==='models'?'':'/'+mode);
    if(location.hash!==route)mismatches.push('shared-selector-route');
    const sidebar=document.querySelector('#capability-category-writing'),reading=[...sidebar?.querySelector('strong')?.childNodes||[]].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim();
    if(reading!==(Number.isFinite(sidebarScore)?sidebarScore.toFixed(1):'Results')||Number.isFinite(sidebarScore)&&!sidebar?.getAttribute('aria-label')?.includes('All Writing'))mismatches.push('shared-sidebar-all-writing');
    const selectedPanel=panel.querySelector('[data-writing-selected-setting]'),selectedSettingId=selectedPanel?.dataset.writingSelectedSetting;
    if(settingId&&selectedSettingId!==settingId)mismatches.push('shared-selected-model');
    return {mode,selectionId,hash:location.hash,selectedSettingId:selectedSettingId||null,sidebarScore:reading,visible:!!box?.width&&!!box?.height,mismatches};
  },{mode,selectionId,settingId,sidebarScore:deriveExpectedWritingCategory(expected.collection,'all-writing').entries.find(entry=>entry.condition==='skill'&&entry.rank===1)?.score??null});
  check(`Shared score selector ${mode}/${selectionId}: visible, correct route, stable category leader and selected model`,!proof.mismatches.length,JSON.stringify(proof));
  return proof;
};
const verifyWritingCategory = async () => {
  await navigate(pageUrl('index.html','capabilities/overall'),'document.querySelector("#capability-category-overall[aria-selected=true]") && window.VASIR_DATA?.writing');
  const initial=await evaluate('({overall:JSON.stringify(window.VASIR_DATA.overall),lazy:!!window.VASIR_WRITING,available:!!document.querySelector("#capability-category-writing:not([disabled])")})');
  const initialOverall=JSON.parse(initial.overall),{included:writingIncludedOverall,presentationVariant}=writingOverallPresentation(initialOverall);
  overallSha256=sha256(initial.overall);
  check('Writing appears in capability navigation',initial.available);
  check('Overall loads without Writing data or answer bundles',!initial.lazy&&!requests.some(request=>/\/writing-data\.js$/.test(new URL(request.url).pathname)||writingArchiveRequest(request)));
  check('Writing Overall participation matches the declared edition',initialOverall.categories.some(category=>category.id==='writing')===writingIncludedOverall);
  await click('#capability-category-engineering');
  await waitFor(()=>evaluate('document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector("#capability-ranking .capability-rank-row")'),'Engineering reference rows');
  const engineeringLayout=await layout();
  await click('#capability-category-writing');
  await waitFor(()=>evaluate('window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-category-writing[aria-selected=true]") && document.activeElement?.id === "capability-category-writing"').catch(()=>false),'Writing loaded with selector focus');
  const collection=await evaluate('window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING'),expected=deriveExpectedWritingCategory(collection,'all-writing');
  let overallIntegrationEvidence;
  if(writingIncludedOverall){
    const originalSources=await evaluate('({engineering:window.VASIR_DATA,aiWorkflows:window.VASIR_DATA.aiWorkflows})');
    const overallExpected=deriveExpectedOverallV3({...originalSources,writing:collection});
    verifyOverallV3Projection(initialOverall,overallExpected);
    overallIntegrationEvidence={edition:overallExpected.edition,includedCategoryIds:overallExpected.categories.map(category=>category.id),categoryWeights:overallExpected.categoryWeights,writingSelectionId:'all-writing',writingBenchmarkWeights:overallExpected.writingBenchmarkWeights,gamesExcluded:overallExpected.gamesExcluded,sourceOverallSha256:overallSha256,sourceScoreVerified:true,lazyBeforeWriting:!initial.lazy,answersLazy:!requests.some(writingArchiveRequest),benchmarkIds:overallExpected.benchmarkIds,eligibleSettingCount:overallExpected.settings.length,mismatches:[]};
    check('Overall v3 reconstructs from original published tasks, including nested All Writing weights',true);
  }
  const defaultEvidence=await inspectWritingComparison(expected);
  check('All Writing ranks complete equal-track totals, retaining incomplete weighted means separately and unranked',!defaultEvidence.mismatches.length,JSON.stringify(defaultEvidence));
  const metadata=await evaluateFunction(()=>{
    const root=window.VASIR_WRITING_COLLECTION||window.VASIR_WRITING,canvas=document.querySelector('.capability-browser__canvas'),header=canvas.querySelector('.capability-canvas__header'),nav=canvas.querySelector('.capability-mode'),selector=document.querySelector('#writing-score-selection');
    const included=window.VASIR_DATA.overall.scoreBasis?.edition==='overall-v3',participation=included?/included in Overall/i.test(header.textContent)&&/25%/.test(header.textContent)&&!/excluded from Overall/i.test(header.textContent):/excluded from Overall/i.test(header.textContent);
    return {overall:JSON.stringify(window.VASIR_DATA.overall),hash:location.hash,rawUnchanged:window.VASIR_WRITING===root,noPicker:!document.querySelector('.writing-subsections,.writing-benchmark-picker,[data-writing-benchmark-picker]'),tabsImmediatelyAfterHeader:header?.nextElementSibling===nav,answersLazy:!window.VASIR_WRITING_RESPONSES&&!window.VASIR_WRITING_CREATION_RESPONSES,disclosure:/development|exploratory|provisional/i.test(header.textContent)&&participation,selectorInsideLeaderboard:!!selector?.closest('#capability-ranking'),sharedScoreSelector:!!selector&&canvas.contains(selector)&&!selector.closest('#capability-ranking,#capability-benchmarks,#capability-efficiency')&&selector.getBoundingClientRect().width>0,selectorOptions:[...selector?.options||[]].map(option=>option.value)};
  });
  const {publications,collection:_collection,entries,efficiencyEvidence:_expectedEfficiency,...expectedMetadata}=expected;
  const proof={...expectedMetadata,...metadata,visibleSettingIds:defaultEvidence.rowEvidence.map(row=>row.settingId),mismatches:defaultEvidence.mismatches};
  check('Writing uses the category route and preserves raw projections',proof.hash==='#capabilities/writing'&&proof.rawUnchanged);
  check('Writing preserves Overall bytes',sha256(proof.overall)===overallSha256);
  check('Shared category header is immediately followed by the shared view tabs',proof.tabsImmediatelyAfterHeader&&proof.noPicker);
  check('Writing qualifies its provisional development aggregate and edition-specific Overall participation',proof.disclosure&&defaultEvidence.provisional);
  check('Writing answers stay lazy on the category leaderboard',proof.answersLazy);
  const leaderboardCleanEvidence=await evaluate(`(() => {const header=document.querySelector('.capability-canvas__header'),method=header.querySelector('[data-writing-index-method]'),text=header.innerText,mismatches=[];const noProvisionalBanner=!/provisional/i.test(header.querySelector('.capability-canvas__status').innerText),noVerboseCounts=!/incomplete settings|Core idea\\s*\\+\\s*Plot twists|\\d+\\s*\\/\\s*\\d+\\s*(?:reviews|answers)/i.test(text),methodologyAvailable=method?.tagName==='DETAILS'&&!!method.querySelector('summary');if(!noProvisionalBanner)mismatches.push('provisional-banner');if(!noVerboseCounts)mismatches.push('verbose-counts');if(!methodologyAvailable)mismatches.push('methodology-missing');return {noProvisionalBanner,noVerboseCounts,methodologyAvailable,mismatches};})()`);
  check('Writing leaderboard keeps a quiet header with accessible methodology',!leaderboardCleanEvidence.mismatches.length,JSON.stringify(leaderboardCleanEvidence));
  const provisionalMethodEvidence=await evaluateFunction(sources=>{
    const method=document.querySelector('[data-writing-index-method]'),defaultClosed=method?.tagName==='DETAILS'&&!method.open;
    if(method)method.open=true;
    const text=method?.innerText||'',openedForAudit=!!method?.open&&!!method.getBoundingClientRect().width;
    const records=sources.map(source=>{
      const publication=window.VASIR_WRITING_CATEGORY.writingCategory.publications.find(item=>item.benchmarks[0].id===source.benchmarkId),actual=publication?.provisionalLeaderboard;
      const report=document.querySelector('#capability-benchmarks [data-benchmark-id="'+source.benchmarkId+'"]'),reportHref=report?.href||null;
      const provisional=/provisional/i.test(text),singleJudge=/single.judge/i.test(text)&&/Astra.only/i.test(text),excludedOverall=/excluded from Overall/i.test(text),includedOverall=/included in Overall/i.test(text),overallWeight=includedOverall&&/25%/.test(text)?0.25:0,mismatches=[];
      const expectedInclusion=window.VASIR_DATA.overall.scoreBasis?.edition==='overall-v3',participation=expectedInclusion?includedOverall&&!excludedOverall&&overallWeight===0.25:excludedOverall&&!includedOverall;
      if(actual?.sourceSha256!==source.sourceSha256||JSON.stringify(actual?.judgeConfigurationIds)!==JSON.stringify(source.judgeConfigurationIds)||actual?.judgeCount!==1)mismatches.push('provisional-source-basis');
      if(source.scoringScope){const scope=method.querySelector('[data-writing-derived-scope="'+source.scoringScope.id+'"]');if(!scope||!scope.innerText.includes(actual.expectedCaseCount+' stories')||!scope.innerText.includes('The Matrix')||!scope.innerText.includes('post-run user-approved')||!scope.innerText.includes(actual.originalCaseCount+' original stories'))mismatches.push('common-core-scope-disclosure');}
      if(!defaultClosed||!openedForAudit||!provisional||!singleJudge||!participation)mismatches.push('methodology-disclosure');
      if(!reportHref||new URL(reportHref).hash!=='#'+source.benchmarkId)mismatches.push('original-report-link');
      return {...source,scope:'category-methodology',defaultClosed,openedForAudit,provisional,singleJudge,excludedOverall,includedOverall,overallWeight,reportHref,mismatches};
    });
    if(method)method.open=false;
    return records.map(record=>({...record,closedAfterAudit:method?.tagName==='DETAILS'&&!method.open}));
  },[...expected.publications].filter(([id])=>expected.sources.get(id)?.provisional).map(([benchmarkId,publication])=>{const source=publication.provisionalLeaderboard;return {benchmarkId,sourceSha256:source.sourceSha256,judgeConfigurationIds:source.judgeConfigurationIds,...(source.id==='core-idea-astra-common-11-v1'?{scoringScope:{id:source.id,caseIds:source.caseIds,excludedCaseIds:source.excludedCaseIds,originalCaseIds:source.originalCaseIds,scoredCorpusSha256:source.scoredCorpusSha256}}:{})};}));
  for(const item of provisionalMethodEvidence)check('Provisional source remains qualified in the closed-by-default Methodology disclosure',!item.mismatches.length&&item.closedAfterAudit,JSON.stringify(item));
  await evaluate(`(() => {const node=document.querySelector('[data-writing-index-method]');node.open=true;node.scrollIntoView({block:'center',behavior:'instant'});})()`);
  await capture('writing-index-method.png');
  await evaluate(`document.querySelector('[data-writing-index-method]').open=false;scrollTo(0,0)`);
  const selectionIds=expected.selectionIds;
  check('Shared score selector exposes All Writing and every registered track and multi-test track benchmark',metadata.sharedScoreSelector&&!metadata.selectorInsideLeaderboard&&JSON.stringify(metadata.selectorOptions)===JSON.stringify(selectionIds));
  const sharedSelectorEvidence=[await inspectWritingSharedControls('models','all-writing',expected)],answerLinkBounds=[await verifyWritingAnswerLinkBounds('leaderboard')],writingLayout=await layout();
  const presentationEvidence={noPlaceholderPanels:defaultEvidence.noPlaceholderPanels,engineeringLayout,writingLayout,
    matchedEngineeringFrame:writingLayout?.font===engineeringLayout?.font&&writingLayout?.fontSize===engineeringLayout?.fontSize&&Math.abs(writingLayout.rowHeight-engineeringLayout.rowHeight)<2&&Math.abs(writingLayout.trackWidth-engineeringLayout.trackWidth)<2,
    compactRows:Math.abs(writingLayout.rowHeight-engineeringLayout.rowHeight)<2,dumbbellGeometry:!defaultEvidence.mismatches.length,
    dumbbellRows:defaultEvidence.rowEvidence,numericPairedSettingIds:defaultEvidence.rowEvidence.map(row=>row.settingId),mismatches:defaultEvidence.mismatches};
  check('Writing reuses Engineering compact dumbbell row geometry and typography',presentationEvidence.matchedEngineeringFrame,JSON.stringify({engineeringLayout,writingLayout}));
  await noOverflow('Writing category leaderboard');
  await capture('writing-models.png');
  await evaluate('document.querySelector("#capability-ranking .capability-ranking__axis")?.scrollIntoView({block:"start",behavior:"instant"})');
  await capture('writing-comparison-rows.png');
  const selectionEvidence=[];
  for(const selectionId of selectionIds){
    if(selectionId!=='all-writing')await chooseWritingScore(selectionId);
    const selectedExpected=deriveExpectedWritingCategory(collection,selectionId),evidence=await inspectWritingComparison(selectedExpected);
    const signature=entry=>JSON.stringify(entry.benchmarkWeights),represented=new Set(evidence.aggregateEvidence.map(item=>signature(selectedExpected.entries.find(entry=>entry.settingId===item.settingId&&entry.condition==='skill'))));
    for(const entry of selectedExpected.entries.filter(entry=>entry.condition==='skill'&&Number.isFinite(entry.exactScore))){
      if(represented.has(signature(entry)))continue;
      await click('#capability-ranking .capability-rank-row__select[data-entry-id="'+entry.id+'"]');
      const additional=await inspectWritingComparison(selectedExpected);
      evidence.componentEvidence.push(...additional.componentEvidence);
      evidence.aggregateEvidence.push(...additional.aggregateEvidence);
      evidence.mismatches.push(...additional.mismatches);
      represented.add(signature(entry));
    }
    check('Selector '+selectionId+': all exact available-score averages, ranks, asterisks and representative component formulas',!evidence.mismatches.length,JSON.stringify(evidence));
    selectionEvidence.push(evidence);
    await noOverflow('Writing selector '+selectionId);
    await evaluate('document.querySelector("#capability-ranking")?.scrollIntoView({block:"start",behavior:"instant"})');
    await capture('writing-selection-'+selectionId+'.png');
  }
  await chooseWritingScore('all-writing');
  const inspectId=defaultEvidence.rowEvidence[0]?.settingId;
  if(inspectId){
    await click('#capability-ranking .capability-rank-row__select[data-entry-id="'+inspectId+'-skill"]');
    const selectedEvidence=await inspectWritingComparison(expected);
    check('Selecting a model preserves a traceable component sum',!selectedEvidence.mismatches.length,JSON.stringify(selectedEvidence));
    check('Selecting a model retains all original benchmark answer links',await evaluateFunction(id=>{
      const data=window.VASIR_WRITING_CATEGORY,panel=document.querySelector('[data-writing-selected-setting]'),publications=data.writingCategory.publications.filter(publication=>publication.settings.some(setting=>setting.id===id)),links=[...panel.querySelectorAll('[data-writing-answer-benchmark]')];
      return panel.dataset.writingSelectedSetting===id&&links.length===publications.length&&publications.every(publication=>{const link=links.find(link=>link.dataset.writingAnswerBenchmark===publication.benchmarks[0].id),url=link&&new URL(link.href);return url&&url.searchParams.get('setting')===id&&url.hash==='#'+publication.benchmarks[0].id+'/'+publication.cases[0].id+((publication.trialCount||1)>1?'/trial-1':'');});
    },inspectId));
    answerLinkBounds.push(await verifyWritingAnswerLinkBounds('selected setting'));
  }
  const benchmarkExpected = (selectionId, selectedSettingId) => {
    const selected=deriveExpectedWritingCategory(collection,selectionId);
    const fieldMeans=[...selected.publications].filter(([benchmarkId])=>!selected.listedBenchmarkIds||selected.listedBenchmarkIds.includes(benchmarkId)).map(([benchmarkId,publication])=>{
      const official=publication.benchmarkSummaries[0],provisional=publication.provisionalLeaderboard;
      const pinnedCore=benchmarkId==='storytelling-core-idea'&&selected.fixedBasis?.coreIdeaScoring==='published-single-judge-provisional';
      const usesProvisional=(pinnedCore||!(Number.isFinite(official.baseline)&&Number.isFinite(official.treatment)))&&provisional?.status==='provisional'&&!!provisional.rankedSettingCount;
      const summary=usesProvisional?provisional.summary:official;
      const perBenchmark = deriveExpectedWritingCategory(collection,benchmarkId);
      return {benchmarkId,selectionId:perBenchmark.selectionId,topModel:expectedWritingBenchmarkTopModel(perBenchmark,publication),trackId:publication.benchmarks[0].trackId||publication.subcategory||'storytelling',baseline:summary.baseline,skill:summary.treatment,delta:summary.delta,provisional:!!usesProvisional,sourceKind:usesProvisional?'provisional-single-judge':Number.isFinite(official.baseline)&&Number.isFinite(official.treatment)?'official-panel':'answers',sourceSha256:publication.scoreBasis.sourceSha256,settingCount:usesProvisional?provisional.rankedSettingCount:publication.coverage.completedSettingCount,caseCount:usesProvisional?provisional.expectedCaseCount:publication.cases.length,trialCount:publication.trialCount||publication.scoreBasis?.trialsPerTask||1,judgeCount:usesProvisional?provisional.judgeCount:publication.scoreBasis.judgeCount};
    });
    return {selectionId,selectedSettingId,fieldMeans,presentationVariant};
  };
  const cleanLedgerEvidence=[];
  const inspectOverview = async (selectionId,settingId) => {
    const result=await evaluateFunction(inspectWritingBenchmarkOverviewInDocument,benchmarkExpected(selectionId,settingId));
    if(result.mismatches.length)await capture('writing-benchmarks-failure.png',failureScreenshots,{scope:'clean-benchmark-ledger'});
    check('Clean Benchmark tests '+selectionId+': unchanged field means, grouped inventory, quiet source metadata and direct links without model controls',!result.mismatches.length,JSON.stringify(result));
    cleanLedgerEvidence.push(result);
    return result;
  };
  await click('[data-capability-mode=benchmarks]');
  await inspectOverview('all-writing',inspectId);
  await click('[data-capability-mode=models]');
  const alternate=expected.entries.find(entry=>entry.condition==='skill'&&entry.settingId!==inspectId&&entry.eligibleForRank)||expected.entries.find(entry=>entry.condition==='skill'&&entry.settingId!==inspectId);
  if(alternate)await click('#capability-ranking .capability-rank-row__select[data-entry-id="'+alternate.id+'"]');
  const retainedSettingId=alternate?.settingId||inspectId;
  await click('[data-capability-mode=benchmarks]');
  await inspectOverview('all-writing',retainedSettingId);
  await click('[data-capability-mode=models]');
  await chooseWritingScore('storytelling-magic-discovery');
  sharedSelectorEvidence.push(await inspectWritingSharedControls('models','storytelling-magic-discovery',expected,retainedSettingId));
  const historyEvidence=[];
  for(const [direction,selectionId]of[['back','all-writing'],['forward','storytelling-magic-discovery']]){
    await drainLoadedFiles();
    const before=await send('Page.getNavigationHistory');
    await evaluate('history.'+direction+'()');
    try {
      await waitFor(()=>evaluateFunction(selectionId=>document.readyState==='complete'&&window.VASIR_WRITING_CATEGORY?.writingCategory.selection.id===selectionId&&document.querySelector('#writing-score-selection')?.value===selectionId,selectionId).catch(()=>false),'Writing score history '+direction);
    } catch(error) {
      const after=await send('Page.getNavigationHistory'),observed=await evaluate('({href:location.href,ready:document.readyState,selection:window.VASIR_WRITING_CATEGORY?.writingCategory.selection.id,selector:document.querySelector("#writing-score-selection")?.value,selectedSetting:document.querySelector("#capability-ranking [data-writing-selected-setting]")?.dataset.writingSelectedSetting})');
      fs.writeFileSync(path.join(output,'writing-history-failure.json'),JSON.stringify({direction,expectedSelectionId:selectionId,before,after,observed},null,2)+'\n');
      await capture('writing-history-failure.png',failureScreenshots,{scope:'history-'+direction});
      throw error;
    }
    historyEvidence.push({direction,...await inspectWritingSharedControls('models',selectionId,expected,retainedSettingId)});
  }
  await click('[data-capability-mode=benchmarks]');
  await inspectOverview('storytelling-magic-discovery',retainedSettingId);
  const comparedBenchmarkId=expected.listedBenchmarkIds[0];
  await click('[data-writing-compare-models="'+comparedBenchmarkId+'"]');
  await waitFor(()=>evaluateFunction(id=>document.readyState==='complete'&&location.hash==='#capabilities/writing'&&window.VASIR_WRITING_CATEGORY?.writingCategory.selection.id===id,comparedBenchmarkId).catch(()=>false),'Benchmark compare-models link');
  sharedSelectorEvidence.push(await inspectWritingSharedControls('models',comparedBenchmarkId,expected,retainedSettingId));
  await click('[data-capability-mode=benchmarks]');
  await inspectOverview(comparedBenchmarkId,retainedSettingId);
  await evaluate('document.querySelector("#capability-benchmarks").scrollIntoView({block:"start",behavior:"instant"})');
  await noOverflow('Writing category benchmarks');
  await capture('writing-benchmarks.png');
  await click('[data-capability-mode=models]');
  await chooseWritingScore('all-writing');
  await click('[data-capability-mode=efficiency]');
  await waitFor(()=>evaluate('!document.querySelector("#capability-efficiency").hidden && !!document.querySelector("#efficiency-view").textContent'),'Writing category efficiency');
  sharedSelectorEvidence.push(await inspectWritingSharedControls('efficiency','all-writing',expected));
  await chooseWritingScore('storytelling-magic-discovery');
  sharedSelectorEvidence.push(await inspectWritingSharedControls('efficiency','storytelling-magic-discovery',expected));
  await chooseWritingScore('all-writing');
  sharedSelectorEvidence.push(await inspectWritingSharedControls('efficiency','all-writing',expected));
  const efficiencyEvidence=[];
  for(const metric of ['latency','tokens']){
    await evaluate(`(() => {const axis=document.querySelector('#resource-axis');axis.value=${JSON.stringify(metric)};axis.dispatchEvent(new Event('change',{bubbles:true}));const entry=window.VASIR_WRITING_CATEGORY.entries.find(entry=>entry.eligibleForRank&&Number.isFinite(entry.score)&&Number.isFinite(entry[${JSON.stringify(metric)}])&&entry[${JSON.stringify(metric)}]>0);if(entry){const select=document.querySelector('#efficiency-entry');select.value=entry.id;select.dispatchEvent(new Event('change',{bubbles:true}));}})()`);
    const efficiency=await evaluate(`(() => {const metric=${JSON.stringify(metric)},data=window.VASIR_WRITING_CATEGORY,eligible=data.entries.filter(entry=>entry.eligibleForRank&&Number.isFinite(entry.score)&&Number.isFinite(entry[metric])&&entry[metric]>0),frontier=eligible.filter(entry=>!eligible.some(other=>other.exactScore>=entry.exactScore&&other[metric]<=entry[metric]&&(other.exactScore>entry.exactScore||other[metric]<entry[metric]))),points=[...document.querySelectorAll('[data-plot-point]')],mismatches=[];if(points.length!==eligible.length)mismatches.push('point-count');for(const point of points){const entry=eligible.find(entry=>entry.id===point.dataset.entryId);if(!entry||point.dataset.score!==entry.score.toFixed(1)||Number(point.dataset.resource)!==entry[metric]||point.dataset.frontier!==String(frontier.some(other=>other.id===entry.id)))mismatches.push('point-evidence');if(!['plotX','plotY'].every(key=>Number.isFinite(Number(point.dataset[key]))&&Number(point.dataset[key])>=0&&Number(point.dataset[key])<=100))mismatches.push('point-geometry');}return {metric,eligiblePoints:eligible.length,frontierPoints:frontier.length,mismatches};})()`);
    check(`Category ${metric} efficiency shows only complete finite scores and recorded resources`,!efficiency.mismatches.length,JSON.stringify(efficiency));
    efficiencyEvidence.push(efficiency);
    answerLinkBounds.push(await verifyWritingAnswerLinkBounds(metric+' efficiency'));
    await noOverflow(`Writing category ${metric} efficiency`);
    await capture(metric==='latency'?'writing-efficiency.png':'writing-efficiency-tokens.png');
  }
  // Bookmarked subsection URLs and the old query still reach the same category.
  for(const alias of ['capabilities/writing/storytelling/benchmarks','capabilities/writing/dungeon-master/benchmarks']){
    await navigate(pageUrl('index.html',alias),'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-benchmarks:not([hidden])")');
    check(`Legacy ${alias} preserves the full category`,await evaluate(`location.hash==='#capabilities/writing/benchmarks' && JSON.stringify(window.VASIR_WRITING_CATEGORY.benchmarks.map(item=>item.id).sort())===${JSON.stringify(JSON.stringify([...proof.benchmarkIds].sort()))}`));
  }
  if(writingIncludedOverall){
    const stale=new URL(pageUrl('index.html','capabilities/overall'));stale.searchParams.set('score','storytelling');
    await navigate(stale.href,'document.querySelector("#capability-category-overall[aria-selected=true]") && document.querySelector(".setting-row [data-source-condition=skill][data-category-id=writing]")');
    const clicked=await evaluate(`(() => {const node=document.querySelector('.setting-row [data-source-condition="skill"][data-category-id="writing"]'),entry=window.VASIR_DATA.overall.entries.find(entry=>entry.id===node.dataset.entryId);return {entryId:entry.id,settingId:entry.settingId,configurationId:entry.configurationId,exactScore:Number(node.dataset.rawExactScore),weight:Number(node.dataset.weight),staleSelection:new URL(location.href).searchParams.get('score')};})()`);
    await click('.setting-row [data-source-condition="skill"][data-category-id="writing"]');
    await waitFor(()=>evaluate('window.VASIR_WRITING_CATEGORY?.writingCategory.selection.id === "all-writing" && document.querySelector("#capability-category-writing[aria-selected=true]")').catch(()=>false),'Overall Writing segment opens the exact All Writing model');
    const destination=await evaluate(`(() => {const url=new URL(location.href),selected=document.querySelector('#capability-ranking [data-writing-selected-setting]'),aggregate=selected?.querySelector('[data-writing-exact-aggregate]');return {selectionId:url.searchParams.get('score'),configurationId:url.searchParams.get('setting'),hash:url.hash,settingId:selected?.dataset.writingSelectedSetting,exactScore:Number(aggregate?.dataset.exactSkill)};})()`);
    const original=expected.entries.find(entry=>entry.condition==='skill'&&entry.configurationId===clicked.configurationId),mismatches=[];
    if(!original?.eligibleForRank||clicked.staleSelection!=='storytelling'||clicked.weight!==0.25||!Number.isFinite(clicked.exactScore)||Math.abs(clicked.exactScore-original.exactScore)>1e-9)mismatches.push('source-segment');
    if(destination.selectionId!=='all-writing'||destination.configurationId!==clicked.configurationId||destination.settingId!==original?.settingId||destination.hash!=='#capabilities/writing'||!Number.isFinite(destination.exactScore)||Math.abs(destination.exactScore-original.exactScore)>1e-9)mismatches.push('source-preserving-navigation');
    overallIntegrationEvidence.writingSegmentNavigation={clicked,destination,mismatches};
    check('Overall Writing segment preserves its same-model All Writing score despite a stale Storytelling selector',!mismatches.length,JSON.stringify(overallIntegrationEvidence.writingSegmentNavigation));
  }
  check('Writing landing routes never download either answer archive', !requests.some(writingArchiveRequest));
  return {...proof,presentationVariant,overallIntegrationEvidence,presentationEvidence,selectionEvidence,sharedSelectorEvidence,cleanLedgerEvidence,historyEvidence,answerLinkBounds,efficiencyEvidence,modelDisclosureEvidence:defaultEvidence.modelDisclosureEvidence,leaderboardCleanEvidence,provisionalMethodEvidence};
};

// Check the single fixed judge against the actual answer archive, after reports
// have legitimately loaded it. This never loads answers into the category page.
const verifyProvisionalArchive = async () => {
  await evaluate(`(async () => {
    if (window.VASIR_WRITING_RESPONSES_COLLECTION) return;
    const selected = window.VASIR_WRITING_RESPONSES;
    const base = [...document.scripts].find(script => new URL(script.src || location.href).pathname.endsWith('/benchmark-report.js'))?.src || location.href;
    await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = new URL('./writing-responses.js', base).href; script.onload = resolve; script.onerror = reject; document.head.append(script); });
    window.VASIR_WRITING_RESPONSES_COLLECTION = window.VASIR_WRITING_RESPONSES;
    window.VASIR_WRITING_RESPONSES = selected;
  })()`);
  const proof=await evaluate(`(async () => {
    const root=window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING,archiveRoot=window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES;
    const publications=[root,...(root.benchmarkPublications || []).map(item=>item.projection),...Object.values(root.additionalBenchmarks || {})].filter(item=>item.provisionalLeaderboard);
    const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null,round=value=>Number.isFinite(value)?Math.round((value+Number.EPSILON)*10)/10:null,close=(left,right)=>right===null?left===null:Number.isFinite(left)&&Math.abs(left-right)<1e-8;
    const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    return await Promise.all(publications.map(async publication=>{
      const source=publication.provisionalLeaderboard,id=publication.benchmarks[0].id,archive=archiveRoot.additionalBenchmarks?.[id]||archiveRoot.benchmarkResponses?.find(item=>item.benchmarkId===id)?.responseBundle||archiveRoot,mismatches=[];
      const commonEleven=source.id==='core-idea-astra-common-11-v1',scoredCases=commonEleven?publication.cases.filter(story=>story.id!=='the-matrix'):publication.cases;
      if(source.judgeCount!==1||JSON.stringify(source.judgeConfigurationIds)!==JSON.stringify(['codex:gpt-6-astra@xhigh']))mismatches.push('fixed-judge-basis');
      if(source.sourceSha256!==publication.scoreBasis.sourceSha256||JSON.stringify(source.caseIds)!==JSON.stringify(scoredCases.map(story=>story.id)))mismatches.push('source-and-corpus');
      if(commonEleven&&(source.method!=='equal-case-paired-common-11-single-judge-mean-v1'||source.expectedCaseCount!==11||publication.cases.length!==12||source.originalCaseCount!==12||JSON.stringify(source.originalCaseIds)!==JSON.stringify(publication.cases.map(story=>story.id))||JSON.stringify(source.excludedCaseIds)!==JSON.stringify(['the-matrix'])||source.selectionTiming!=='post-run-user-approved'||source.scoredCorpusSha256!==await hash(JSON.stringify(scoredCases))))mismatches.push('common-core-scope');
      if(commonEleven)for(const field of ['id','method','caseIds','expectedCaseCount','originalCaseCount','originalCaseIds','excludedCaseIds','scoredCorpusSha256','selectionTiming','exclusionReason','limitations'])if(JSON.stringify(publication.methodology.derivedScoreBasis?.[field])!==JSON.stringify(source[field]))mismatches.push('derived-method:'+field);
      const judgeId=source.judgeConfigurationIds[0],answerMap=new Map(archive.responses.map(answer=>[answer.settingId+'|'+answer.caseId+'|'+answer.condition,answer]));
      if(commonEleven&&(answerMap.size!==publication.settings.length*publication.cases.length*2||publication.settings.some(setting=>publication.cases.some(story=>['baseline','skill'].some(condition=>!answerMap.has(setting.id+'|'+story.id+'|'+condition))))))mismatches.push('retained-twelve-story-archive');
      let reviewedAnswers=0;
      const cohorts=publication.settings.map(setting=>{
        const pairs=scoredCases.map(story=>{const values={caseId:story.id};for(const condition of ['baseline','skill']){const answer=answerMap.get(setting.id+'|'+story.id+'|'+condition),judgments=answer?.judgments.filter(judge=>judge.judgeConfigurationId===judgeId)||[];if(judgments.length>1)mismatches.push('duplicate-fixed-review');const judge=judgments[0];values[condition]=judge?.score??null;if(judge){reviewedAnswers++;const calculated=publication.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judge.dimensions[dimension.id].rating*dimension.weight/10,0);if(!close(judge.score,calculated))mismatches.push('original-rating-total');}}return values;}).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill));
        return {settingId:setting.id,pairs,complete:pairs.length===scoredCases.length,baseline:mean(pairs.map(pair=>pair.baseline)),skill:mean(pairs.map(pair=>pair.skill)),delta:mean(pairs.map(pair=>pair.skill-pair.baseline))};
      });
      const eligible=cohorts.filter(cohort=>cohort.complete);
      for(const cohort of cohorts)for(const condition of ['baseline','skill']){
        const entry=source.entries.find(item=>item.settingId===cohort.settingId&&item.condition===condition),score=cohort.complete?cohort[condition]:null,delta=cohort.complete?condition==='skill'?cohort.delta:0:null,rank=cohort.complete?1+eligible.filter(other=>other[condition]>score).length:null;
        if(!entry||!close(entry.exactScore,score)||!close(entry.score,round(score))||!close(entry.exactDelta,delta)||!close(entry.delta,round(delta))||entry.rank!==rank||entry.eligibleForRank!==cohort.complete||entry.completedPairCount!==cohort.pairs.length)mismatches.push('fixed-review-cohort:'+cohort.settingId+':'+condition);
        if(commonEleven){const cells=publication.caseResults.filter(cell=>cell.settingId===cohort.settingId&&cell.condition===condition&&source.caseIds.includes(cell.caseId));if(cells.length!==scoredCases.length)mismatches.push('common-resource-count');for(const[field,key]of[['meanLatencyMs','latencyMs'],['meanInputTokens','inputTokens'],['meanOutputTokens','outputTokens'],['meanTotalTokens','totalTokens'],['meanWordCount','wordCount']]){const values=cells.map(cell=>cell[key]),wanted=cohort.complete&&values.every(Number.isFinite)?round(mean(values)):null;if(!close(entry?.metrics?.[field]??null,wanted))mismatches.push('common-resource-scope:'+field);}}
      }
      for(const diagnostic of source.incompleteSettings){const cohort=cohorts.find(item=>item.settingId===diagnostic.settingId),missing=source.caseIds.filter(caseId=>!cohort.pairs.some(pair=>pair.caseId===caseId));if(cohort.complete||JSON.stringify(diagnostic.missingCaseIds)!==JSON.stringify(missing)||!close(diagnostic.exactScores.baseline,cohort.baseline)||!close(diagnostic.exactScores.skill,cohort.skill)||!close(diagnostic.exactDelta,cohort.delta))mismatches.push('unranked-diagnostic:'+diagnostic.settingId);}
      const expectedSummary={exactBaseline:mean(eligible.map(cohort=>cohort.baseline)),exactTreatment:mean(eligible.map(cohort=>cohort.skill)),exactDelta:mean(eligible.map(cohort=>cohort.delta))};
      for(const [key,value] of Object.entries(expectedSummary))if(!close(source.summary[key],value))mismatches.push('field-mean:'+key);
      if(source.rankedSettingCount!==eligible.length||source.incompleteSettings.length!==cohorts.length-eligible.length)mismatches.push('corpus-count');
      return {benchmarkId:id,judgeConfigurationId:judgeId,sourceSha256:source.sourceSha256,reviewedAnswers,rankedSettings:eligible.length,incompleteSettings:cohorts.length-eligible.length,...(commonEleven?{scoringScope:{id:source.id,caseIds:source.caseIds,excludedCaseIds:source.excludedCaseIds,originalCaseIds:source.originalCaseIds,scoredCorpusSha256:source.scoredCorpusSha256}}:{}),mismatches};
    }));
  })()`);
  for(const result of proof)check(`Provisional ${result.benchmarkId}: original fixed-judge reviews independently reproduce complete-corpus means, ranks and diagnostics`,!result.mismatches.length,JSON.stringify(result));
  return proof;
};

const verifyCreationArchiveAndContexts = async () => {
  const proof = await evaluate(`(async () => {
    const data=window.VASIR_WRITING,archive=window.VASIR_WRITING_RESPONSES,mismatches=[];
    const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),mean=values=>values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/values.length:null;
    const close=(a,b)=>b===null?a===null:Number.isFinite(a)&&Math.abs(a-b)<1e-8,format=value=>Number.isFinite(value)?value.toFixed(1):'—',signed=value=>Number.isFinite(value)?(value>0?'+':'')+value.toFixed(1):'—';
    const seats=['astra-xhigh-naive','astra-xhigh-informed','sol-xhigh-naive','sol-xhigh-informed'],models=['codex:gpt-6-astra@xhigh','codex:gpt-5.6-sol@xhigh'];
    const files=['SKILL.md','references/core-model.md','references/story-development.md','references/plot-and-structure.md','references/characters.md','references/character-arcs.md','references/relationships-and-cast.md','references/world-and-myth.md','references/antagonism-and-irony.md'];
    const profiles=archive.judgeProfiles||[],context=archive.promptFiles.find(file=>file.id==='frozen-informed-judge-context');
    if(data.benchmarks[0].id!=='storytelling-magic-discovery'||data.trialCount!==3||data.settings.length!==33||data.cases.length!==1||data.scoreBasis.judgeCount!==4||data.scoreBasis.dimensions.length!==10||data.scoreBasis.ratingMinimum!==1||data.scoreBasis.ratingMaximum!==10||data.coverage.expectedResponseCount!==198||data.coverage.expectedJudgmentCount!==792)mismatches.push('creation-inventory');
    if(!same(profiles.map(profile=>profile.id),seats)||new Set(profiles.map(profile=>profile.id)).size!==4||new Set(profiles.map(profile=>profile.configurationId)).size!==2||!same(profiles,data.scoreBasis.reviewers)||!same(profiles,data.methodology.judgeProfiles))mismatches.push('four-frozen-profiles');
    if(!context||!same(data.methodology.informedSkillFiles,files))throw Error('Frozen informed context is missing or its file inventory changed.');
    const contextSha256=await hash(context.content),emptySha256=await hash('');
    if(context.sha256!==contextSha256)mismatches.push('context-content-hash');
    const reconstructedContext=[];
    for(const name of files){
      const prefix='<<<FROZEN_CONTEXT_FILE '+JSON.stringify(name)+'>>>\\n',start=context.content.indexOf(prefix),end=context.content.indexOf('\\n<<<END_FROZEN_CONTEXT_FILE>>>',start+prefix.length),source=data.methodology.skillFiles.find(file=>file.path===name);
      if(start<0||end<0||!source){mismatches.push('context-file:'+name);continue;}
      const contents=context.content.slice(start+prefix.length,end);
      if(await hash(contents)!==source.sha256||new TextEncoder().encode(contents).length!==source.bytes)mismatches.push('context-frozen-bytes:'+name);
      reconstructedContext.push(prefix+contents+'\\n<<<END_FROZEN_CONTEXT_FILE>>>');
    }
    if(reconstructedContext.join('\\n\\n')!==context.content)mismatches.push('context-file-order');
    for(const [index,profile] of profiles.entries())if(profile.configurationId!==models[Math.floor(index/2)]||profile.reasoning!=='xhigh'||profile.contextMode!==(index%2?'informed':'naive')||profile.contextSha256!==(index%2?contextSha256:emptySha256)||profile.contextFileId!==(index%2?'frozen-informed-judge-context':null))mismatches.push('profile-context:'+profile.id);
    const requests=new Map((archive.judgeRequests||[]).map(request=>[request.id,request])),segments=new Map((archive.judgePromptSegments||[]).map(segment=>[segment.sha256,segment.content])),answers=new Map(archive.responses.filter(answer=>answer.provenance?.outputSha256).map(answer=>[answer.provenance.outputSha256,answer.outputText])),finals=new Map();
    if(requests.size!==archive.judgeRequests.length||requests.size>396)mismatches.push('judge-request-inventory');
    for(const [digest,content] of segments)if(await hash(content)!==digest)mismatches.push('prompt-segment-hash');
    for(const [digest,content] of answers)if(await hash(content)!==digest)mismatches.push('answer-content-hash');
    for(const request of requests.values()){
      const profile=profiles.find(profile=>profile.id===request.profileId),parts=request.promptParts?.map(part=>part.textSha256?segments.get(part.textSha256):part.encoding==='json-string'&&answers.has(part.outputSha256)?JSON.stringify(answers.get(part.outputSha256)):null);
      if(!profile||!parts||parts.some(part=>typeof part!=='string')){mismatches.push('request-prompt-parts');continue;}
      const prompt=parts.join('');
      if(await hash(prompt)!==request.promptSha256)mismatches.push('original-prompt-hash');
      const hasContext=prompt.includes('\\n\\nFROZEN CRAFT CONTEXT\\n'+context.content+'\\nEND FROZEN CRAFT CONTEXT.');
      if(hasContext!==(profile.contextMode==='informed'))mismatches.push('request-context-exposure');
      if(request.candidateOrder.length!==2||!same(request.candidateOrder.map(candidate=>candidate.candidateId),['A','B']))mismatches.push('anonymous-candidate-order');
      if(typeof request.outputText==='string'&&await hash(request.outputText)!==request.outputSha256)mismatches.push('original-review-hash');
      if(request.status==='complete'){try{finals.set(request.id,JSON.parse(request.outputText));}catch{mismatches.push('original-review-json');}}
    }
    for(const answer of archive.responses){
      const ids=answer.judgments.map(judge=>judge.reviewerId);
      if(new Set(ids).size!==ids.length||ids.some(id=>!seats.includes(id))||(Number.isFinite(answer.score)&&ids.length!==4))mismatches.push('answer-reviewer-inventory');
      for(const judge of answer.judgments){
        const request=requests.get(judge.requestId),raw=finals.get(judge.requestId)?.evaluations?.find(item=>item.candidateId===judge.candidateId),profile=profiles.find(profile=>profile.id===judge.reviewerId);
        if(!request||!raw||!profile||request.profileId!==profile.id||judge.judgeConfigurationId!==profile.configurationId||judge.contextMode!==profile.contextMode||raw.review!==judge.rationale||raw.dimensions.length!==10||new Set(raw.dimensions.map(item=>item.id)).size!==10){mismatches.push('original-review-identity');continue;}
        let total=0;
        for(const dimension of data.scoreBasis.dimensions){const original=raw.dimensions.find(item=>item.id===dimension.id),reading=judge.dimensions[dimension.id];if(!original||!Number.isInteger(original.rating)||original.rating<1||original.rating>10||reading.rating!==original.rating||reading.evidence!==original.evidence)mismatches.push('original-rating-evidence');total+=original?.rating||0;}
        if(!close(judge.score,total))mismatches.push('original-rating-total');
      }
    }
    const contextRows=[...document.querySelectorAll('[data-creation-setting]')];
    if(contextRows.length!==data.settings.length||!document.querySelector('[data-creation-context-comparison]')?.textContent.includes('four fresh review seats'))mismatches.push('visible-context-inventory');
    for(const setting of data.settings){
      const cells=data.caseResults.filter(cell=>cell.settingId===setting.id),complete=cells.length===6&&cells.every(cell=>Number.isFinite(cell.exactScore)),row=contextRows.find(row=>row.dataset.creationSetting===setting.id);
      if(!row||setting.eligibleForRank!==complete){mismatches.push('context-eligible-setting');continue;}
      for(const mode of ['balanced','naive','informed']){
        const score=condition=>complete?mean(cells.filter(cell=>cell.condition===condition).map(cell=>{
          const answer=archive.responses.find(answer=>answer.settingId===setting.id&&answer.trialNumber===cell.trialNumber&&answer.condition===condition);
          const reviews=answer.judgments.filter(judge=>mode==='balanced'||judge.contextMode===mode);
          return reviews.length===(mode==='balanced'?4:2)?mean(reviews.map(judge=>judge.score)):null;
        })):null;
        const plain=score('baseline'),skill=score('skill'),delta=plain===null||skill===null?null:skill-plain;
        for(const [condition,value] of [['baseline',plain],['skill',skill],['delta',delta]])if(row.querySelector('[data-creation-context="'+mode+'"][data-context-score="'+condition+'"]')?.textContent!==(condition==='delta'?signed(value):format(value)))mismatches.push('visible-context-mean:'+setting.id+':'+mode+':'+condition);
      }
      const effect=data.trialEffects.find(effect=>effect.settingId===setting.id),values=[1,2,3].map(trial=>{const pair=cells.filter(cell=>cell.trialNumber===trial),plain=pair.find(cell=>cell.condition==='baseline')?.exactScore,skill=pair.find(cell=>cell.condition==='skill')?.exactScore;return Number.isFinite(plain)&&Number.isFinite(skill)?skill-plain:null;}),average=mean(values),sd=average===null?null:Math.sqrt(values.reduce((sum,value)=>sum+(value-average)**2,0)/2),range=average===null?null:Math.max(...values)-Math.min(...values);
      if(!close(effect?.mean,average)||!close(effect?.sampleStandardDeviation,sd)||!close(effect?.range,range))mismatches.push('trial-variation-source');
      for(const [index,value] of values.entries())if(row.querySelector('[data-creation-trial-delta="'+(index+1)+'"]')?.textContent!==signed(value))mismatches.push('visible-trial-delta');
      if(row.querySelector('[data-creation-trial-mean]')?.textContent!==signed(average)||row.querySelector('[data-creation-trial-sd]')?.textContent!==format(sd)||row.querySelector('[data-creation-trial-range]')?.textContent!==format(range)+' · '+signed(average===null?null:Math.min(...values))+' to '+signed(average===null?null:Math.max(...values)))mismatches.push('visible-trial-variation');
    }
    return {profiles:profiles.map(({id,configurationId,contextMode,contextSha256})=>({id,configurationId,contextMode,contextSha256})),contextSha256,contextBytes:new TextEncoder().encode(context.content).length,contextFileCount:files.length,verifiedRequestCount:requests.size,verifiedOriginalFinals:finals.size,contextRows:contextRows.length,mismatches};
  })()`);
  check('Creation: four frozen fresh-context seats, exact context bytes, original requests and visible three-trial means',!proof.mismatches.length,JSON.stringify(proof));
  return proof;
};

const verifyCreationExpandedReviews = async (caseId, trialNumber) => {
  const proof=await evaluate(`(async () => {
    const archive=window.VASIR_WRITING_RESPONSES,caseId=${JSON.stringify(caseId)},trial=${trialNumber},mismatches=[],expanded=[];
    const settle=()=>new Promise(resolve=>setTimeout(resolve,0)),hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    for(const profile of archive.judgeProfiles){
      const answer=archive.responses.find(answer=>answer.caseId===caseId&&answer.trialNumber===trial&&answer.judgments.some(judge=>judge.reviewerId===profile.id));
      if(!answer)continue;
      const judge=answer.judgments.find(judge=>judge.reviewerId===profile.id),request=archive.judgeRequests.find(request=>request.id===judge.requestId),row=document.querySelector('[data-report-setting-id="'+answer.settingId+'"]'),panel=row?.querySelector('[data-report-trial="'+trial+'"] [data-condition="'+answer.condition+'"]'),review=panel?.querySelector('[data-reviewer-id="'+profile.id+'"]'),details=review?.querySelector('[data-creation-judge-evidence]');
      if(!details||details.dataset.creationJudgeEvidence!==request.id||review.querySelector('[data-judge-context]')?.dataset.judgeContext!==profile.contextMode){mismatches.push('expand-review-identity');continue;}
      row.querySelector('.model-run').open=true;panel.querySelector('.model-run__judging').open=true;details.open=true;await settle();
      const original=details.querySelector('[data-creation-original-review]')?.textContent;
      if(original!==request.outputText||await hash(original||'')!==request.outputSha256)mismatches.push('expanded-original-review');
      const promptDetails=details.querySelector('[data-creation-judge-prompt]');
      if(!promptDetails){mismatches.push('expand-prompt-control');continue;}
      promptDetails.open=true;await settle();
      const prompt=promptDetails.querySelector('[data-creation-original-prompt]')?.textContent,parts=request.promptParts.map(part=>part.textSha256?archive.judgePromptSegments.find(segment=>segment.sha256===part.textSha256)?.content:part.encoding==='json-string'?JSON.stringify(archive.responses.find(response=>response.provenance?.outputSha256===part.outputSha256)?.outputText):null);
      if(parts.some(part=>typeof part!=='string')||prompt!==parts.join('')||await hash(prompt||'')!==request.promptSha256)mismatches.push('expanded-original-prompt');
      const rect=element=>{const box=element.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};};
      const elementGeometry=element=>{const style=getComputedStyle(element);return {tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',rect:rect(element),clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,display:style.display,visibility:style.visibility,overflowX:style.overflowX,minWidth:style.minWidth,whiteSpace:style.whiteSpace,wordBreak:style.wordBreak,hidden:element.hidden,open:element.tagName==='DETAILS'?element.open:null};};
      const detailsRect=rect(details),promptRect=rect(promptDetails),viewportWidth=document.documentElement.clientWidth,pageScrollWidth=document.documentElement.scrollWidth;
      const failureFlags={evidenceClosed:!details.open,promptClosed:!promptDetails.open,evidenceZeroWidth:detailsRect.width<=0,promptZeroHeight:promptRect.height<=0,pageOverflow:pageScrollWidth>viewportWidth+1};
      const geometry={failureFlags,viewportWidth,pageScrollWidth,windowInnerWidth:window.innerWidth,scrollX:window.scrollX,scrollY:window.scrollY,evidence:elementGeometry(details),prompt:elementGeometry(promptDetails)};
      if(Object.values(failureFlags).some(Boolean)){
        mismatches.push('expanded-evidence-visibility-or-overflow');
        geometry.ancestors=[];
        for(let ancestor=promptDetails.parentElement;ancestor;ancestor=ancestor.parentElement)geometry.ancestors.push(elementGeometry(ancestor));
        geometry.pageOverflowElements=[...document.querySelectorAll('body *')].map(element=>({element,box:element.getBoundingClientRect()})).filter(({box})=>box.width>0&&box.right+window.scrollX>viewportWidth+1).sort((left,right)=>right.box.right-left.box.right).slice(0,40).map(({element})=>elementGeometry(element));
      }
      expanded.push({profileId:profile.id,requestId:request.id,outputSha256:request.outputSha256,promptSha256:request.promptSha256,promptCharacters:prompt?.length||0,geometry});
      promptDetails.open=false;details.open=false;
    }
    return {caseId,trialNumber:trial,expanded,mismatches};
  })()`);
  check(`Creation trial ${trialNumber}: expanded original reviews and reconstructed prompts retain exact bytes`,!proof.mismatches.length,JSON.stringify(proof));
  await noOverflow(`Creation expanded evidence, trial ${trialNumber}`);
  return proof;
};

const ensureWritingReportAuditDetailsOpen = () => evaluate(`(() => {const node=document.querySelector('[data-report-judge-trial-details]');if(!node)throw Error('Judge & trial details missing');node.open=true;return node.open;})()`);
const verifyWritingReportPresentation = async benchmarkId => {
  const proof=await evaluateFunction(benchmarkId=>{
    const hero=document.querySelector('.evidence-hero#overview'),ranking=document.querySelector('section#ranking'),details=document.querySelector('[data-report-judge-trial-details]');
    const head=document.querySelector('#head-to-head');
    const hasPublishedHead=window.VASIR_WRITING_RESPONSES?.headToHeads?.some(item=>item.benchmarkId===benchmarkId);
    const defaultClosed=details?.tagName==='DETAILS'&&!details.open,modelComparisonFirst=!!hero&&(hero.nextElementSibling===ranking||Boolean(hasPublishedHead&&hero.nextElementSibling===head&&head.nextElementSibling===ranking));
    const modelComparisonHeading=ranking?.querySelector('header h2#ranking-title')?.textContent.trim();
    // Native closed details can retain descendant layout boxes without painting
    // them. Require browser visibility, not zero geometry, and verify the
    // converse after opening so permanently hidden evidence cannot pass.
    const secondaryTablesHidden=[...document.querySelectorAll('[data-writing-cohorts],[data-creation-context-comparison]')].every(node=>details?.contains(node)&&typeof node.checkVisibility==='function'&&!node.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true}));
    const mismatches=[];
    if(!defaultClosed||details?.querySelector(':scope > summary')?.textContent.trim()!=='Judge & trial details')mismatches.push('judge-details-default');
    if(!modelComparisonFirst||modelComparisonHeading!=='Model comparison')mismatches.push('model-comparison-first');
    if(!secondaryTablesHidden)mismatches.push('secondary-table-default');
    return {benchmarkId,defaultClosed,modelComparisonFirst,modelComparisonHeading,secondaryTablesHidden,mismatches};
  },benchmarkId);
  check('Writing report starts with the common model comparison and closed judge/trial details',!proof.mismatches.length,JSON.stringify(proof));
  await evaluate('scrollTo(0,0)');
  await capture('writing-report-default.png');
  proof.opensForAudit=await evaluate(`(() => {const node=document.querySelector('[data-report-judge-trial-details]');if(node&&!node.open)node.querySelector(':scope > summary')?.click();return node?.tagName==='DETAILS'&&node.open;})()`);
  check('Writing judge/trial details open for unchanged source audits',proof.opensForAudit);
  proof.secondaryTablesVisibleForAudit=await waitFor(()=>evaluate(`(() => {const details=document.querySelector('[data-report-judge-trial-details]');return [...document.querySelectorAll('[data-writing-cohorts],[data-creation-context-comparison]')].every(node=>details?.contains(node)&&typeof node.checkVisibility==='function'&&node.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true})&&node.getBoundingClientRect().width>0&&node.getBoundingClientRect().height>0);})()`),'Writing secondary tables become visibly available after opening their disclosure',5000);
  check('Writing secondary tables become visibly available after opening their disclosure',proof.secondaryTablesVisibleForAudit);
  return proof;
};
const closeWritingReportAuditDetails = async proof => {
  await evaluate(`(() => {const node=document.querySelector('[data-report-judge-trial-details]');if(node)node.open=false;})()`);
  proof.closesAfterAudit=await waitFor(()=>evaluate(`(() => {const node=document.querySelector('[data-report-judge-trial-details]');return node?.tagName==='DETAILS'&&!node.open&&[...document.querySelectorAll('[data-writing-cohorts],[data-creation-context-comparison]')].every(table=>node.contains(table)&&typeof table.checkVisibility==='function'&&!table.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true}));})()`),'Writing secondary tables become hidden after closing their disclosure',5000);
  check('Writing judge/trial details return to their compact closed presentation',proof.closesAfterAudit);
};

const verifyDungeonMaster = async () => {
  const benchmarkId = 'dungeon-master-adventure-outline';
  const dataExpression = `(window.VASIR_WRITING_COLLECTION || window.VASIR_WRITING).additionalBenchmarks[${JSON.stringify(benchmarkId)}]`;
  const archiveExpression = `(window.VASIR_WRITING_DUNGEON_MASTER_RESPONSES || (window.VASIR_WRITING_RESPONSES_COLLECTION || window.VASIR_WRITING_RESPONSES).additionalBenchmarks[${JSON.stringify(benchmarkId)}])`;
  const categoryEvidence = await verifyWritingCategory();
  await navigate(pageUrl('index.html', 'capabilities/writing'), 'window.VASIR_WRITING_CATEGORY && document.querySelector("#capability-category-writing[aria-selected=true]")');
  check('Dungeon Master is registered separately in the common Writing index', await evaluate(`window.VASIR_DATA.writing.additionalBenchmarks?.[${JSON.stringify(benchmarkId)}]?.subcategory==='dungeon-master' && window.VASIR_WRITING_CATEGORY.benchmarks.some(benchmark=>benchmark.id===${JSON.stringify(benchmarkId)})`));
  await noOverflow('Writing category with Dungeon Master');
  await capture('dungeon-master-models.png');
  await click('[data-capability-mode=benchmarks]');
  check('Writing benchmark tests retain the original Adventure outline report in its declared current or past-edition location', await evaluate(`(() => {const id=${JSON.stringify(benchmarkId)},archive=window.VASIR_WRITING_CATEGORY.writingCategory.catalog?.find(item=>item.id===id)?.archived;const node=archive?document.querySelector('[data-writing-past-edition="'+id+'"]'):[...document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row')].find(row=>row.dataset.benchmarkId===id);return location.hash==='#capabilities/writing/benchmarks'&&node?.href.includes('benchmark-report.html#'+id)&&(!archive||!document.querySelector('.benchmark-ledger__row[data-benchmark-id="'+id+'"]'));})()`));
  await noOverflow('Dungeon Master benchmark listing');
  await capture('dungeon-master-benchmarks.png');
  await click('[data-capability-mode=efficiency]');
  check('Dungeon Master remains available through the common Writing efficiency route', await evaluate(`location.hash==='#capabilities/writing/efficiency'&&window.VASIR_WRITING_CATEGORY.benchmarks.some(benchmark=>benchmark.id===${JSON.stringify(benchmarkId)})`));
  await noOverflow('Writing category efficiency');
  await capture('dungeon-master-efficiency.png');
  await navigate(pageUrl('benchmark-report.html',benchmarkId), `document.querySelector('[data-writing-case]')&&document.querySelector('[data-writing-rubric]')&&${archiveExpression}`);
  const reportPresentationEvidence=await verifyWritingReportPresentation(benchmarkId);
  const provisionalArchiveEvidence=await verifyProvisionalArchive();
  const inventory = await evaluate(`(() => {
    const data=${dataExpression};
    return {coverage:data.coverage,cases:data.cases.map(story=>({id:story.id,sourceCaseId:story.sourceCaseId,trialNumber:story.trialNumber,cohort:story.cohort})),dimensions:data.scoreBasis.dimensions.length,ratingMinimum:data.scoreBasis.ratingMinimum,ratingMaximum:data.scoreBasis.ratingMaximum,judges:data.scoreBasis.judgeCount,overall:JSON.stringify(window.VASIR_DATA.overall),settings:data.settings.map(setting=>({configurationId:setting.configurationId,reasoning:setting.reasoning})),primaryPrompt:document.querySelector('[data-primary-question]').textContent,design:document.querySelector('[data-writing-design]').textContent,pairReviews:document.querySelector('[data-writing-progress-count="pair-reviews"]').textContent,progress:{answers:document.querySelector('[data-writing-progress-count="answers"]').textContent,reviews:document.querySelector('[data-writing-progress-count="reviews"]').textContent}};
  })()`);
  check('Dungeon Master uses six dimensions, two judges, and the exact primary prompt', inventory.dimensions===6 && inventory.ratingMinimum===0 && inventory.ratingMaximum===5 && inventory.judges===2 && inventory.primaryPrompt==='create an outline for TTRPG adventure');
  check('Dungeon Master retains all sixteen pairs per declared setting', inventory.cases.length===16 && inventory.cases.filter(story=>story.cohort==='primary').length===6 && new Set(inventory.cases.map(story=>story.sourceCaseId)).size===6 && inventory.coverage.expectedResponseCount===32*inventory.settings.length && inventory.coverage.expectedJudgmentCount===64*inventory.settings.length);
  check('Dungeon Master retains the original Astra Ultra setting and unique declared configurations', inventory.settings.some(setting=>setting.configurationId==='codex:gpt-6-astra@ultra' && setting.reasoning==='ultra') && new Set(inventory.settings.map(setting=>setting.configurationId)).size===inventory.settings.length);
  check('Dungeon Master report keeps Overall unchanged', sha256(inventory.overall)===overallSha256);
  check('Dungeon Master distinguishes prompts, repetitions and paired reviews', inventory.design.includes('6 distinct prompts · 16 matched pairs') && inventory.design.includes('primary prompt has 6 repetitions; each of 5 secondary prompts has 2 repetitions') && inventory.pairReviews.endsWith(`/${32*inventory.settings.length} blind pair reviews`));
  check('Dungeon Master planned coverage matches source', inventory.progress.answers===`${inventory.coverage.responseCount}/${inventory.coverage.expectedResponseCount} final answers` && inventory.progress.reviews===`${inventory.coverage.judgmentCount}/${inventory.coverage.expectedJudgmentCount} planned answer assessments`);
  if(requireScored) check('Dungeon Master retains at least one fully scored primary model cohort', inventory.coverage.completedSettingCount>0 && inventory.coverage.scoredResponseCount>=12 && inventory.coverage.judgmentCount>=24);
  const verifyCohorts = async scope => {
    const mismatches=await evaluate(`(() => {
      const data=${dataExpression},mismatches=[];
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>!Number.isFinite(value)?'—':${JSON.stringify(scope)}==='report'?(value>0?'+':'')+value.toFixed(1):value>0?'+'+value.toFixed(1):value<0?'−'+Math.abs(value).toFixed(1):'±0.0';
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const predicates={primary:story=>story.cohort==='primary',transfer:story=>story.cohort==='transfer',fantasyTransfer:story=>story.cohort==='transfer'&&story.genre==='fantasy',otherGenreTransfer:story=>story.cohort==='transfer'&&story.genre!=='fantasy'};
      for(const [id,predicate] of Object.entries(predicates)) {
        const cohort=data.cohortSummaries[id],element=document.querySelector('[data-writing-cohort="'+id+'"]'),cases=data.cases.filter(predicate);
        const pairs=data.settings.flatMap(setting=>cases.map(story=>({sourceCaseId:story.sourceCaseId,baseline:data.caseResults.find(cell=>cell.settingId===setting.id&&cell.caseId===story.id&&cell.condition==='baseline')?.exactScore,skill:data.caseResults.find(cell=>cell.settingId===setting.id&&cell.caseId===story.id&&cell.condition==='skill')?.exactScore}))).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill));
        const groups=[...new Set(pairs.map(pair=>pair.sourceCaseId))].map(id=>pairs.filter(pair=>pair.sourceCaseId===id));
        const mean=key=>groups.length?round(groups.reduce((sum,group)=>sum+group.reduce((total,pair)=>total+key(pair),0)/group.length,0)/groups.length):null;
        if(cohort.baseline!==mean(pair=>pair.baseline)||cohort.treatment!==mean(pair=>pair.skill)||cohort.delta!==mean(pair=>pair.skill-pair.baseline)||cohort.usablePairs!==pairs.length||cohort.expectedPairs!==cases.length*data.settings.length)mismatches.push(id+':arithmetic');
        if(!element||element.querySelector('[data-cohort-baseline]').textContent!==format(cohort.baseline)||element.querySelector('[data-cohort-treatment]').textContent!==format(cohort.treatment)||element.querySelector('[data-cohort-delta]').textContent!==signed(cohort.delta)||element.querySelector('[data-cohort-coverage]').textContent!==cohort.usablePairs+'/'+cohort.expectedPairs+(cohort.complete?'':' · incomplete'))mismatches.push(id+':display');
      }
      if(data.adherenceCoverage) {
        const proof=data.adherenceCoverage,text=document.querySelector('[data-writing-adherence]')?.textContent||'';
        if(!text.includes(proof.verifiedTreatmentAnswers+'/'+proof.returnedTreatmentAnswers+' returned treatment answers')||!text.includes(proof.observedChunkCount+'/'+proof.requiredChunkCount+' required chunks'))mismatches.push('read-proof-coverage');
      }
      if(data.entries.some(entry=>{const primary=data.settingCohortSummaries?.find(item=>item.settingId===entry.settingId)?.cohorts.primary || data.cohortSummaries.primary;return entry.score!==(primary.complete?(entry.condition==='baseline'?primary.baseline:primary.treatment):null);}))mismatches.push('primary-headline');
      return mismatches;
    })()`);
    check(`Dungeon Master ${scope}: separate primary and secondary arithmetic`, !mismatches.length, JSON.stringify(mismatches));
  };
  await verifyCohorts('report');
  await noOverflow('Dungeon Master report header');
  check('Dungeon Master report returns to the common Writing benchmark list', await evaluate(`document.querySelector('.report-context__back').getAttribute('href')==='./index.html#capabilities/writing/benchmarks'`));
  const caseEvidence=[];
  for(const story of inventory.cases) {
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(story.id)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(()=>evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(story.id)}`),`Dungeon Master ${story.id}`);
    await ensureWritingReportAuditDetailsOpen();
    const proof=await evaluate(`(() => {
      const data=${dataExpression},archive=${archiveExpression},caseId=${JSON.stringify(story.id)},mismatches=[];
      const story=data.cases.find(story=>story.id===caseId),answers=archive.responses.filter(response=>response.caseId===caseId),format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      if(document.querySelector('[data-writing-case-title]').textContent!==story.title||!document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt))mismatches.push('case-and-task');
      for(const answer of answers) {
        const panel=document.querySelector('[data-report-setting-id="'+answer.settingId+'"] [data-condition="'+answer.condition+'"]');
        if(!panel||(panel.querySelector('[data-output-text]')?.textContent||'')!==answer.outputText)mismatches.push('exact-answer:'+answer.condition);
        if(panel.querySelector('.model-run__condition-score').textContent.trim()!==format(answer.score)+(Number.isFinite(answer.score)?'/100':''))mismatches.push('answer-score:'+answer.condition);
        if(answer.runtime?.requiredSkillReads) {
          const receipt=answer.runtime.requiredSkillReads,element=panel.querySelector('[data-writing-required-reads]');
          if(!element||element.querySelector('[data-required-read-field="status"]').textContent!==receipt.status||!element.querySelector('[data-required-read-coverage]').textContent.startsWith(receipt.observedChunkCount+'/'+receipt.requiredChunkCount+' required chunks'))mismatches.push('required-read-proof');
        }
        const reviews=[...panel.querySelectorAll('[data-judge-review]')];
        if(reviews.length!==answer.judgments.length||new Set(answer.judgments.map(judge=>judge.reviewerId)).size!==answer.judgments.length)mismatches.push('reviewer-inventory');
        answer.judgments.forEach((judge,index)=>{
          const element=reviews[index];
          if(element.dataset.reviewerId!==judge.reviewerId||element.querySelector('[data-judge-rationale]').textContent!==judge.rationale)mismatches.push('review-identity-or-rationale');
          const total=data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judge.dimensions[dimension.id].rating,0)/30*100;
          if(Math.abs(total-judge.score)>1e-8||element.querySelector('[data-judge-score]').textContent!==format(judge.score))mismatches.push('review-score');
          data.scoreBasis.dimensions.forEach(dimension=>{
            const reading=judge.dimensions[dimension.id],row=element.querySelector('[data-dimension-id="'+dimension.id+'"]');
            if(row.querySelector('td').textContent!==String(reading.rating)||row.querySelector('[data-dimension-reason]').textContent!==reading.reason||row.querySelector('[data-cited-evidence]')?.textContent!==reading.evidence)mismatches.push('exact-dimension-evidence');
          });
          for(const [id,flag] of Object.entries(judge.flags))if(element.querySelector('[data-judge-flag="'+id+'"] [data-flag-reason]')?.textContent!==flag.reason)mismatches.push('exact-flag-reason');
        });
      }
      const preferences=data.pairwisePreferences.filter(preference=>preference.caseId===caseId);
      if(document.querySelectorAll('[data-pairwise-review]').length!==preferences.length)mismatches.push('preference-count');
      for(const preference of preferences)if(document.querySelector('[data-pairwise-review="'+preference.reviewerId+'"]'+(preference.settingId?'[data-pairwise-setting="'+preference.settingId+'"]':'')+' [data-preference-reason]')?.textContent!==preference.reason)mismatches.push('exact-preference-reason');
      return {caseId,answers:answers.length,judgments:answers.reduce((sum,answer)=>sum+answer.judgments.length,0),preferences:preferences.length,mismatches};
    })()`);
    check(`Dungeon Master ${story.id}: exact answers, ratings, evidence and preferences`,proof.answers===2*inventory.settings.length&&!proof.mismatches.length,JSON.stringify(proof));
    caseEvidence.push(proof);
  }
  check('Dungeon Master renders every 0–5 rubric anchor exactly',await evaluate(`(() => {const data=${dataExpression};return document.querySelectorAll('[data-rubric-dimension]').length===6&&data.scoreBasis.dimensions.every(dimension=>Object.entries(dimension.anchors).every(([rating,anchor])=>document.querySelector('[data-rubric-dimension="'+dimension.id+'"] [data-rubric-anchor="'+rating+'"]')?.textContent===anchor));})()`));
  const promptArchive=await evaluate(`(${archiveExpression}.promptFiles||[]).map(file=>({id:file.id,title:file.title,characters:file.content.length}))`);
  for(const file of promptArchive) {
    await click(`[data-prompt-file="${file.id}"] > summary`);
    check(`Dungeon Master archive ${file.id}: exact content opens`,await evaluate(`(() => {const element=document.querySelector('[data-prompt-file="${file.id}"]'),file=${archiveExpression}.promptFiles.find(file=>file.id===${JSON.stringify(file.id)});return element.open&&element.querySelector('[data-prompt-file-content]').textContent===file.content;})()`));
    await noOverflow('Dungeon Master archived reference');
    await click(`[data-prompt-file="${file.id}"] > summary`);
  }
  const reference = promptArchive.find(file=>file.title==='references/adventure-design.md') || promptArchive.find(file=>file.id!=='frozen-judge-rubric') || promptArchive[0];
  if(reference) {
    await click(`[data-prompt-file="${reference.id}"] > summary`);
    await noOverflow('Dungeon Master reference evidence');
    await capture('dungeon-master-reference.png');
    await click(`[data-prompt-file="${reference.id}"] > summary`);
  }
  const savedAnswer = await evaluate(`(() => {const data=${dataExpression},archive=${archiveExpression};const answer=archive.responses.find(response=>response.condition==='skill'&&response.outputText.length&&data.cases.find(story=>story.id===response.caseId)?.cohort==='primary')||archive.responses.find(response=>response.outputText.length);return answer?{caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,judgments:answer.judgments.length}:null;})()`);
  const showAnswer = async answer => {
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(answer.caseId)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(()=>evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(answer.caseId)}`),'Dungeon Master saved answer case');
    await evaluate(`document.querySelector('[data-report-setting-id="${answer.settingId}"] .model-run').open=true`);
    return `[data-report-setting-id="${answer.settingId}"] [data-condition="${answer.condition}"]`;
  };
  if(savedAnswer) {
    const selector=await showAnswer(savedAnswer);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
    await noOverflow('Dungeon Master saved answer');
    await capture('dungeon-master-answer.png');
    await evaluate(`(() => {const element=document.querySelector(${JSON.stringify(selector+' .model-run__judging')});element.open=true;element.scrollIntoView({block:'start',behavior:'instant'});})()`);
    await noOverflow('Dungeon Master saved judgments');
    await capture('dungeon-master-judgments.png');
  }
  const savedAdherence = await evaluate(`(() => {const responses=${archiveExpression}.responses;const answer=responses.find(response=>response.runtime?.requiredSkillReads?.status==='incomplete')||responses.find(response=>response.runtime?.requiredSkillReads);return answer?{caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,status:answer.runtime.requiredSkillReads.status}:null;})()`);
  if(savedAdherence) {
    const selector=await showAnswer(savedAdherence);
    await evaluate(`(() => {const panel=document.querySelector(${JSON.stringify(selector)}),execution=panel.querySelector('[data-writing-execution]'),reads=panel.querySelector('[data-writing-required-reads]');execution.open=true;reads.open=true;reads.scrollIntoView({block:'start',behavior:'instant'});})()`);
    await noOverflow('Dungeon Master reference-read adherence');
    await capture('dungeon-master-adherence.png');
  }
  await evaluate(`window.scrollTo({top:0,behavior:'instant'})`);
  await noOverflow('Dungeon Master report');
  await closeWritingReportAuditDetails(reportPresentationEvidence);
  await capture('dungeon-master-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Dungeon Master method');
  await capture('dungeon-master-method.png');
  await click('.report-context__back');
  await waitFor(()=>evaluate(`location.hash==='#capabilities/writing/benchmarks'&&!!document.querySelector('#capability-benchmarks:not([hidden])')`).catch(()=>false),'Dungeon Master return to Writing benchmark list');
  check('Dungeon Master return navigation retains every published Writing benchmark', await evaluate(`window.VASIR_WRITING_CATEGORY.benchmarks.length===${categoryEvidence.benchmarkIds.length}&&!!document.querySelector('[data-benchmark-id="${benchmarkId}"],[data-writing-past-edition="${benchmarkId}"]')`));
  return {benchmarkId,coverage:inventory.coverage,categoryEvidence,provisionalArchiveEvidence,reportPresentationEvidence,caseEvidence,promptArchive,savedAnswer,savedAdherence};
};

try {
  const port = await waitFor(() => {
    try { return fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { return null; }
  }, 'Chrome debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push({ kind: 'runtime', detail: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, type: message.params.type });
    if (message.method === 'Network.responseReceived') responses.set(message.params.requestId, message.params.response);
    if (message.method === 'Network.loadingFinished') {
      const requestId = message.params.requestId;
      const response = responses.get(requestId);
      if (response && /\/(?:app|benchmark-report|writing-data|writing-responses|writing-creation-responses|writing-twists-responses|writing-dungeon-master-responses)\.js$/.test(new URL(response.url).pathname)) {
        recordLoadedFile(requestId, response);
      }
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) errors.push({ kind: 'network', detail: message.params.errorText });
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable', networkCaptureOptions), send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 }), send('Emulation.setTouchEmulationEnabled', { enabled: width < 700 })]);
  await send('Network.setCacheDisabled', { cacheDisabled:true });

  if (requestedBenchmark === 'dungeon-master-adventure-outline') {
    const result = await verifyDungeonMaster();
    const loadedFiles = await drainLoadedFiles();
    check('Dungeon Master has no browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
    check('Dungeon Master has no failed HTTP responses', [...responses.values()].every(response => response.status < 400));
    check('Independent acceptance arithmetic did not change during browser verification',acceptanceEvidenceSha256===sha256(fs.readFileSync(acceptanceEvidencePath)));
    const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',...result,url:baseUrl.href,width,height,harnessSha256,networkCaptureOptions,acceptanceEvidenceSha256,overallSha256,checks,loadedFiles,screenshots,errors,completedAt:new Date().toISOString() };
    fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify(receipt,null,2)}\n`);
    process.stdout.write(`${JSON.stringify({status:'passed',benchmarkId:result.benchmarkId,checks:checks.length,cases:result.caseEvidence.length,width,height,receipt:path.join(output,'writing-browsercheck.json')})}\n`);
  } else {

  const categoryEvidence=await verifyWritingCategory();
  const writing=await evaluate(`(() => {const data=${selectedProjectionExpression};return {benchmarks:data.benchmarks.map(item=>item.id),cases:data.cases.map(story=>({id:story.id,title:story.title})),settings:data.settings.map(setting=>setting.id),conditions:data.conditions.length,dimensions:data.scoreBasis.dimensions.length,trialCount:data.trialCount || 1,coverage:data.coverage};})()`);
  coverage=writing.coverage;
  check('Requested report keeps its original benchmark, cases and trial count',writing.benchmarks.length===1&&(!requestedBenchmark || writing.benchmarks[0]===requestedBenchmark));
  const scoredCollection={completeSettings:categoryEvidence.completeSettings,rankedSettings:categoryEvidence.rankedSettings,partialSettings:categoryEvidence.partialSettings,unscoredSettings:categoryEvidence.unscoredSettings,tiedRankEntries:categoryEvidence.tiedRankEntries,regressionSettings:categoryEvidence.regressionSettings};
  const efficiencyEvidence=categoryEvidence.efficiencyEvidence;
  const chosenSettingId=writing.settings.at(-1);
  const selectedReport=new URL(pageUrl('benchmark-report.html',writing.benchmarks[0]+'/'+writing.cases[0].id+(writing.trialCount>1?'/trial-1':'')));
  selectedReport.searchParams.set('setting',chosenSettingId);
  const selectedReportUrl=selectedReport.href;

  await navigate(selectedReportUrl, 'window.VASIR_WRITING_RESPONSES && document.querySelector("#report-page[data-active-writing-case]") && document.querySelector("[data-writing-rubric]")');
  const caseControls = await evaluateFunction(inspectWritingCaseControlsInDocument, { caseIds: writing.cases.map(story => story.id), trialCount: writing.trialCount, aggregateTrials: isCreation });
  check('Writing report exposes only meaningful case and trial controls', caseControls.mismatches.length === 0, JSON.stringify(caseControls));
  const selectCase = async caseId => {
    if(writing.cases.length===1){check('Single-task Writing report keeps its active case without a prompt selector',await evaluate(`document.querySelector('#report-page').dataset.activeWritingCase===${JSON.stringify(caseId)}&&!document.querySelector('[data-writing-case]')`));return;}
    await evaluate(`(() => {const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(caseId)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  };
  const reportPresentationEvidence=await verifyWritingReportPresentation(writing.benchmarks[0]);
  const provisionalArchiveEvidence=isCreation?[]:await verifyProvisionalArchive();
  check('Selected model opens directly in the report', await evaluate(`document.querySelector('[data-report-setting-id="${chosenSettingId}"] .model-run').open`));
  check('Writing report does not load unrelated response bundles', await evaluate('!window.VASIR_RESPONSES'));
  if(isCreation) check('Creation report loads its dedicated archive without the legacy Writing archive', requests.some(request => new URL(request.url).pathname.endsWith('/writing-creation-responses.js')) && !requests.some(request => new URL(request.url).pathname.endsWith('/writing-responses.js')));
  await verifyWritingProgress('report');
  const creationArchiveEvidence=isCreation?await verifyCreationArchiveAndContexts():null;
  check('Writing case metadata and answer archive share the same pinned source', await evaluate(`(() => { const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;return evidence.responses.filter(response=>response.outputText.length).length===data.coverage.responseCount && evidence.responses.every(response=>{ const cell=data.caseResults.find(cell=>cell.caseId===response.caseId && cell.settingId===response.settingId && cell.condition===response.condition && (cell.trialNumber || 1)===(response.trialNumber || 1));return response.provenance.sourceSha256===data.scoreBasis.sourceSha256 && cell?.status===response.status && cell.score===response.score && cell.wordCount===response.wordCount && cell.failureReason===response.failureReason;}); })()`));
  const verifyCase = async (caseId, trialNumber = 1) => {
    await ensureWritingReportAuditDetailsOpen();
    const proof = await evaluate(`(() => {
      const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES,creation=data.benchmarks[0].id==='storytelling-magic-discovery';
      const caseId=${JSON.stringify(caseId)}, trialNumber=${trialNumber};
      const story=data.cases.find(story=>story.id===caseId);
      const common=data.provisionalLeaderboard?.id==='core-idea-astra-common-11-v1'?data.provisionalLeaderboard:null,commonActive=common?.caseIds.includes(caseId);
      const source=evidence.responses.filter(response=>response.caseId===caseId && (response.trialNumber || 1)===trialNumber);
      const rows=[...document.querySelectorAll('[data-report-setting-id]')];
      const mismatches=[];
      const failures=[];
      const terminalJudgmentLabels=[];
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>Number.isFinite(value)?(value>0?'+':'')+value.toFixed(1):'—';
      const close=(actual,expected)=>expected===null?actual===null:Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8;
      const caseCells=data.caseResults.filter(cell=>cell.caseId===caseId && (cell.trialNumber || 1)===trialNumber);
      const displayExact=response=>{
        if(!commonActive)return caseCells.find(cell=>cell.settingId===response?.settingId&&cell.condition===response?.condition)?.exactScore??null;
        const judges=(response?.judgments||[]).filter(judge=>judge.judgeConfigurationId==='codex:gpt-6-astra@xhigh');
        return judges.length===1&&data.scoreBasis.dimensions.every(dimension=>Number.isInteger(judges[0].dimensions?.[dimension.id]?.rating))?data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judges[0].dimensions[dimension.id].rating*dimension.weight/10,0):null;
      };
      if(common){
        if(document.getElementById('report-page').dataset.writingScoreScope!==(commonActive?common.id:'archived-excluded'))mismatches.push('common-core-report-scope');
        const mast=document.querySelector('.benchmark-mast__issue').textContent;
        if(mast!==(commonActive?'Writing · 1 Astra judge · '+common.rankedSettingCount+'/'+data.settings.length+' complete settings':'Writing · Archived story · excluded from aggregate'))mismatches.push('common-core-masthead');
        const excluded=document.querySelector('[data-writing-case] option[value="the-matrix"]');
        if(!excluded?.textContent.endsWith(' · archived, excluded'))mismatches.push('excluded-core-story-option');
      }
      for (const row of rows) for (const condition of data.conditions) {
        const response=source.find(response=>response.settingId===row.dataset.reportSettingId && response.condition===condition.id);
        const panel=row.querySelector((creation?'[data-report-trial="'+trialNumber+'"] ':'')+'[data-condition="'+condition.id+'"]');
        const output=panel.querySelector('[data-output-text]')?.textContent || '';
        if(output !== (response?.outputText || '')) mismatches.push('output:'+row.dataset.reportSettingId+':'+condition.id);
        if(!output && panel.querySelector('.writing-answer-status')?.textContent!==(response?.failureReason || response?.status || 'No completed answer recorded')) mismatches.push('failure-reason:'+row.dataset.reportSettingId+':'+condition.id);
        if(response && ['error','unavailable'].includes(response.status)) {
          const paired=source.find(other=>other.settingId===response.settingId && other.condition!==response.condition);
          if((output && response.runtime?.requiredSkillReads?.status!=='incomplete') || response.score!==null || response.judgments.length) mismatches.push('failed-response-scored');
          failures.push({caseId,trialNumber,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,failureReason:response.failureReason,renderedFailureReason:panel.querySelector('.writing-answer-status')?.textContent || '',score:response.score,judgments:response.judgments.length,pairedResponse:paired?{condition:paired.condition,status:paired.status,hasOutput:Boolean(paired.outputText),wordCount:paired.wordCount,score:paired.score,judgments:paired.judgments.length}:null});
        }
        const messages=evidence.messageSets.find(set=>set.id===response?.messageSetId)?.messages || [];
        const renderedMessages=[...panel.querySelectorAll('[data-message-content]')];
        if(messages.length!==renderedMessages.length || renderedMessages.some((element,index)=>element.textContent!==(messages[index].content || ''))) mismatches.push('exact-input-messages');
        const fileReferences=[...panel.querySelectorAll('.model-run__prompt [data-open-prompt-file]')].map(element=>element.dataset.openPromptFile);
        if(JSON.stringify(fileReferences)!==JSON.stringify(messages.filter(message=>message.fileId).map(message=>message.fileId))) mismatches.push('prompt-file-reference');
        const verifyFields=(element,source,keys,attribute)=>{
          const expected=keys.filter(key=>source && Object.hasOwn(source,key));
          const rendered=[...element.querySelectorAll('['+attribute+']')];
          if(rendered.length!==expected.length || rendered.some(field=>field.textContent!==(source[field.getAttribute(attribute)]===null?'Not reported':String(source[field.getAttribute(attribute)])))) mismatches.push(attribute);
        };
        const usageKeys=['inputTokens','cachedInputTokens','cacheWriteInputTokens','cacheCreationInputTokens','cacheReadInputTokens','outputTokens','reasoningOutputTokens','totalTokens'];
        const execution=panel.querySelector('[data-writing-execution]');
        if(Boolean(execution)!==Boolean(response?.runtime)) mismatches.push('runtime-presence');
        if(execution) {
          verifyFields(execution,response.runtime,['freshSession','executionMode','modelVerification','reasoningVerification','observedCollaborationEvents','rawProviderStreamRetained','durationMs'],'data-runtime-field');
          verifyFields(execution,response,['characterCount'],'data-response-field');
          verifyFields(execution,response.runtime.usage,usageKeys,'data-resource-usage');
          const requiredReads=response.runtime.requiredSkillReads;
          const readEvidence=execution.querySelector('[data-required-skill-reads]');
          if(Boolean(readEvidence)!==Boolean(requiredReads)) mismatches.push('required-read-presence');
          if(requiredReads && readEvidence) {
            if(readEvidence.querySelector('[data-required-read-status]')?.textContent!==requiredReads.status) mismatches.push('required-read-status');
            verifyFields(readEvidence,requiredReads,['policyVersion','evidence'],'data-required-read-field');
            const files=[...readEvidence.querySelectorAll('[data-required-read-file]')];
            if(files.length!==requiredReads.files.length) mismatches.push('required-read-file-count');
            for(const element of files) {
              const file=requiredReads.files.find(file=>file.relativePath===element.dataset.requiredReadFile);
              if(!file){mismatches.push('required-read-file-identity');continue;}
              verifyFields(element,file,['bytes','sha256','requiredChunkCount'],'data-required-read-file-field');
              if(element.querySelector('[data-required-read-observed-count]')?.textContent!==String(file.observedChunks.length)) mismatches.push('required-read-observed-count');
              const chunks=[...element.querySelectorAll('[data-required-read-chunk]')];
              if(chunks.length!==file.observedChunks.length || chunks.some(chunk=>{const saved=file.observedChunks.find(item=>String(item.index)===chunk.dataset.requiredReadChunk);return !saved || chunk.querySelector('dt')?.textContent!=='Chunk '+saved.index+' · '+saved.bytes+' bytes' || chunk.querySelector('code')?.textContent!==saved.sha256;})) mismatches.push('required-read-chunk-evidence');
            }
          }
          if(response.runtime.usage && !execution.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('usage-normalization-disclosure');
          if(response.characterCount!==undefined && response.characterCount!==Array.from(output).length) mismatches.push('unicode-character-count');
          const references=[...execution.querySelectorAll('[data-reference-path]')].map(element=>element.textContent);
          if(JSON.stringify(references)!==JSON.stringify(response.runtime.referenceFilesRead || [])) mismatches.push('runtime-reference-files');
          for (const button of execution.querySelectorAll('[data-open-prompt-file]')) {
            const reference=button.querySelector('[data-reference-path]').textContent;
            const file=evidence.promptFiles.find(file=>file.id===button.dataset.openPromptFile);
            if(!file || (reference==='SKILL.md'?file.id!==(response.provenance?.completion?.instructionFileId || 'frozen-skill-root'):creation?file.title!==reference:!file.title.startsWith(reference+' · '))) mismatches.push('runtime-reference-archive-link');
          }
        }
        const words=output.trim()?output.trim().split(/\\s+/u).length:0;
        if(Number(panel.querySelector('[data-output-word-count]').dataset.outputWordCount)!==words) mismatches.push('word-count');
        const aggregate=panel.querySelector('.model-run__condition-score').textContent.trim();
        const displayed=commonActive?displayExact(response):response?.score;
        if(aggregate!==(Number.isFinite(displayed)?round(displayed).toFixed(1)+'/100':'—')) mismatches.push('aggregate-score');
        const judgments=response?.judgments || [];
        const pairedResponse=source.find(other=>other.settingId===response?.settingId && other.condition!==condition.id);
        const terminalFailure=candidate=>['error','unavailable'].includes(candidate?.status);
        const terminalUnscored=judgments.length===0 && (response?.judgingDisposition==='terminal-excluded' || terminalFailure(response) || (Boolean(output) && terminalFailure(pairedResponse)));
        if(response?.judgingDisposition==='terminal-excluded') {
          const disclosure=panel.querySelector('[data-writing-exclusion]')?.textContent || '';
          if(!disclosure.includes('required full-read verification') || !disclosure.includes('no further judge reviews are planned') || !output || response.score!==null || judgments.length) mismatches.push('terminal-trial-exclusion');
        }
        const expectedJudgingLabel=judgments.length?'Saved judge reviews':terminalUnscored?'Not scored':'Judgments pending';
        const renderedJudgingLabel=panel.querySelector('.model-run__judging-title')?.textContent;
        if(renderedJudgingLabel!==expectedJudgingLabel) mismatches.push('judgment-status-label:'+row.dataset.reportSettingId+':'+condition.id);
        if(terminalUnscored) terminalJudgmentLabels.push({caseId,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,reason:terminalFailure(response)?'terminal-generation-failure':'completed-answer-with-terminally-failed-counterpart',expectedLabel:expectedJudgingLabel,renderedLabel:renderedJudgingLabel});
        const completePanel=judgments.length===data.scoreBasis.judgeCount && judgments.every(judgment=>Number.isFinite(judgment.score));
        const exactScore=completePanel?judgments.reduce((sum,judgment)=>sum+judgment.score,0)/judgments.length:null;
        const cell=caseCells.find(cell=>cell.settingId===row.dataset.reportSettingId && cell.condition===condition.id);
        if(!close(cell.exactScore,exactScore) || !close(response.score,exactScore===null?null:round(exactScore))) mismatches.push('panel-mean-arithmetic');
        const judgeCoverage=panel.querySelector('[data-judge-coverage]').textContent;
        if(commonActive) {
          if(judgeCoverage!=='One Astra xhigh review determines this score; all saved reviews are preserved below.')mismatches.push('common-core-judge-disclosure');
        } else if(completePanel) {
          const spread=Math.max(...judgments.map(judgment=>judgment.score))-Math.min(...judgments.map(judgment=>judgment.score));
          if(!judgeCoverage.includes('Score disagreement: '+spread.toFixed(1)+' rubric points.')) mismatches.push('complete-panel-disagreement');
        } else if(!judgeCoverage.includes('A complete score requires the full panel.')) mismatches.push('incomplete-panel-disclosure');
        const rendered=[...panel.querySelectorAll('[data-judge-review]')];
        if(rendered.length!==judgments.length) mismatches.push('judge-count');
        rendered.forEach((element,index)=>{
          const judgment=judgments[index];
          if(commonActive&&element.querySelector('.model-run__judge-index')?.textContent!==(judgment.judgeConfigurationId==='codex:gpt-6-astra@xhigh'?'Score source':'Archived review'))mismatches.push('common-core-review-role');
          if(Number.isFinite(judgment.score)) {
            const derived=data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judgment.dimensions[dimension.id].rating*dimension.weight/data.scoreBasis.ratingMaximum,0);
            if(!close(judgment.score,derived)) mismatches.push('judge-dimension-arithmetic');
          }
          if(element.querySelector('[data-judge-score]').textContent.trim()!==(Number.isFinite(judgment.score)?judgment.score.toFixed(1):'—')) mismatches.push('individual-judge-score');
          const dimensions=[...element.querySelectorAll('[data-dimension-id]')];
          if(dimensions.length!==data.scoreBasis.dimensions.length) mismatches.push('dimension-count');
          dimensions.forEach(dimension=>{
            const reading=judgment.dimensions?.[dimension.dataset.dimensionId];
            const cells=dimension.querySelectorAll('td');
            if(reading && (cells[0].textContent!==String(reading.rating) || dimension.querySelector('[data-dimension-reason]')?.textContent!==(reading.reason || '—'))) mismatches.push('dimension-evidence');
            if(reading?.evidence && dimension.querySelector('[data-cited-evidence]')?.textContent!==reading.evidence) mismatches.push('cited-evidence');
          });
          if(element.querySelector('[data-judge-rationale]').textContent!==judgment.rationale) mismatches.push('judge-rationale');
          const resources=element.querySelector('[data-judge-resources]');
          if(Boolean(resources)!==Boolean(judgment.resources)) mismatches.push('judge-resource-presence');
          if(resources) {
            verifyFields(resources,{...judgment.resources,promptSha256:judgment.promptSha256},['scope','candidateCount','durationMs','promptSha256'],'data-judge-resource');
            verifyFields(resources,judgment.resources.usage,usageKeys,'data-resource-usage');
            if(judgment.resources.usage && !resources.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('judge-usage-normalization-disclosure');
            if(!resources.textContent.includes('count each judge and prompt SHA-256 once')) mismatches.push('judge-batch-deduplication-disclosure');
          }
        });
      }
      const pairs=data.settings.map(setting=>({settingId:setting.id,baseline:displayExact(source.find(answer=>answer.settingId===setting.id&&answer.condition==='baseline')),skill:displayExact(source.find(answer=>answer.settingId===setting.id&&answer.condition==='skill'))}));
      const paired=pairs.filter(pair=>Number.isFinite(pair.baseline) && Number.isFinite(pair.skill));
      for(const row of rows) {
        const originalPair=pairs.find(pair=>pair.settingId===row.dataset.reportSettingId);
        const pair=creation?{settingId:originalPair.settingId,baseline:data.benchmarkResults.find(cell=>cell.settingId===originalPair.settingId&&cell.condition==='baseline')?.exactScore??null,skill:data.benchmarkResults.find(cell=>cell.settingId===originalPair.settingId&&cell.condition==='skill')?.exactScore??null}:originalPair;
        const aggregate=data.benchmarkResults.find(result=>result.settingId===pair.settingId&&result.condition==='skill');
        const rank=creation?(Number.isFinite(aggregate?.exactScore)?1+data.benchmarkResults.filter(other=>other.condition==='skill'&&Number.isFinite(other.exactScore)&&other.exactScore>aggregate.exactScore).length:null):Number.isFinite(pair.skill)?1+pairs.filter(other=>Number.isFinite(other.skill)&&other.skill>pair.skill).length:null;
        const delta=Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill)?round(pair.skill-pair.baseline):null;
        const summary=row.querySelector('.model-preview__row');
        if(creation){
          for(const [condition,score] of [['baseline',pair.baseline],['skill',pair.skill]]){
            const trials=data.caseResults.filter(cell=>cell.settingId===pair.settingId&&cell.caseId===caseId&&cell.condition===condition);
            const exact=trials.length===data.coverage.trialCount&&trials.every(cell=>Number.isFinite(cell.exactScore))?trials.reduce((sum,cell)=>sum+cell.exactScore,0)/trials.length:null;
            if(!close(score,exact))mismatches.push('three-trial-aggregate-arithmetic:'+pair.settingId+':'+condition);
            const scoreElement=summary.querySelector(condition==='skill'?'.model-preview__score--treatment':'.model-preview__score:not(.model-preview__score--treatment)');
            const displayed=[...scoreElement.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim();
            if(displayed!==format(Number.isFinite(score)?round(score):null))mismatches.push('three-trial-displayed-score:'+pair.settingId+':'+condition);
            const position=summary.querySelector('.model-preview__plot')?.style.getPropertyValue(condition==='skill'?'--preview-treatment':'--preview-baseline');
            if(Number.isFinite(score)&&position!==round(score)+'%')mismatches.push('three-trial-plot-position:'+pair.settingId+':'+condition);
          }
        }
        if(summary.querySelector('.model-preview__identity small').textContent!==(rank?(creation?'Three-trial balanced skill':data.conditions.find(condition=>condition.id==='skill').label)+' rank #'+rank+' of '+data.settings.length:creation?'Three-trial aggregate incomplete':'Panel total not assessable')) mismatches.push('story-rank');
        if(summary.querySelector('.model-preview__delta').textContent!==signed(delta)+' pts' || summary.classList.contains('is-regression')!==(delta<0)) mismatches.push('story-paired-delta');
      }
      const headlinePairs=creation?data.settings.map(setting=>({baseline:data.benchmarkResults.find(cell=>cell.settingId===setting.id&&cell.condition==='baseline')?.exactScore??null,skill:data.benchmarkResults.find(cell=>cell.settingId===setting.id&&cell.condition==='skill')?.exactScore??null})).filter(pair=>Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill)):paired;
      const means={baseline:headlinePairs.length?round(headlinePairs.reduce((sum,pair)=>sum+pair.baseline,0)/headlinePairs.length):null,skill:headlinePairs.length?round(headlinePairs.reduce((sum,pair)=>sum+pair.skill,0)/headlinePairs.length):null,delta:headlinePairs.length?round(headlinePairs.reduce((sum,pair)=>sum+pair.skill-pair.baseline,0)/headlinePairs.length):null};
      if(document.querySelector('.matched-result__condition--baseline strong').textContent!==format(means.baseline) || document.querySelector('.matched-result__condition--treatment strong').textContent!==format(means.skill) || document.querySelector('.matched-result__delta dd').textContent!==signed(means.delta)+' pts') mismatches.push('story-paired-field-means');
      return {caseId,trialNumber,...(common?{scoringScope:{id:common.id,excluded:!commonActive,judgeConfigurationId:commonActive?'codex:gpt-6-astra@xhigh':null,rows:pairs}}:{}),selectedTrial:creation?Number(document.querySelector('[data-report-trial][open]')?.dataset.reportTrial):Number(document.querySelector('[data-writing-trial]')?.value || 1),selected:document.querySelector('[data-writing-case]')?.value||document.querySelector('#report-page').dataset.activeWritingCase,title:document.querySelector('[data-writing-case-title]').textContent,prompt:document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt || data.benchmarks[0].prompt),rows:rows.length,sourceResponses:source.length,outputCount:source.filter(response=>response.outputText.length).length,runtimeCount:source.filter(response=>response.runtime).length,judgments:source.reduce((total,response)=>total+response.judgments.length,0),singleJudgeResponses:source.filter(response=>response.judgments.length===1).length,completePanelResponses:source.filter(response=>response.judgments.length===data.scoreBasis.judgeCount && response.judgments.every(judgment=>Number.isFinite(judgment.score))).length,scoredPairs:paired.length,regressionPairs:paired.filter(pair=>pair.skill<pair.baseline).length,tiedPairs:paired.filter(pair=>pair.skill===pair.baseline).length,failures,terminalJudgmentLabels,mismatches};
    })()`);
    check(`Case ${caseId}, trial ${trialNumber}: exact question, answers, failure labels, word counts and judge evidence`, proof.selectedTrial === trialNumber && proof.selected === caseId && proof.title === writing.cases.find(story => story.id === caseId).title && proof.prompt && proof.rows === writing.settings.length && proof.mismatches.length === 0, JSON.stringify(proof));
    return proof;
  };
  const selectTrial = async trialNumber => {
    if (writing.trialCount <= 1) return;
    if(isCreation){
      await evaluate(`(() => {for(const trial of document.querySelectorAll('[data-report-trial]'))trial.open=Number(trial.dataset.reportTrial)===${trialNumber};})()`);
      check(`Magic trial ${trialNumber} remains available inside every model`,await evaluate(`document.querySelectorAll('[data-report-trial="${trialNumber}"][open]').length===window.VASIR_WRITING.settings.length&&!document.querySelector('[data-writing-trial]')&&document.querySelector('#report-page').dataset.activeWritingTrial==='all'`));
      return;
    }
    await evaluate(`(() => {const select=document.querySelector('[data-writing-trial]');if(!select)throw Error('Trial selector missing');select.value=${JSON.stringify(String(trialNumber))};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(() => evaluate(`Number(document.querySelector('[data-writing-trial]')?.value)===${trialNumber} && Number(document.querySelector('#report-page')?.dataset.activeWritingTrial)===${trialNumber}`), `Writing trial ${trialNumber}`);
  };
  const caseEvidence = [];
  const compactCaseEvidence = [];
  const isCompact = await evaluate("window.VASIR_WRITING.publication?.adapter==='writing-compact-v1'");
  const isPairedTwists = await evaluate("window.VASIR_WRITING.scoreBasis?.edition==='storytelling-plot-twists-paired-v2'");
  const creationExpandedEvidence = [];
  for (const story of writing.cases) {
    if (writing.cases.length === 1) await selectCase(story.id);
    else if (await evaluate('document.querySelector("[data-writing-case]").value') !== story.id) {
      await selectCase(story.id);
      await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(story.id)} && document.querySelector('[data-writing-case]')?.value===${JSON.stringify(story.id)} && location.hash.includes(${JSON.stringify(story.id)})`).catch(() => false), `Story ${story.id}`).catch(async error => {
        error.message += `: ${JSON.stringify(await evaluate('({hash:location.hash,rendered:document.querySelector("#report-page")?.dataset.activeWritingCase,selected:document.querySelector("[data-writing-case]")?.value,title:document.querySelector("[data-writing-case-title]")?.textContent})'))}`;
        throw error;
      });
    }
    for (let trialNumber = 1; trialNumber <= writing.trialCount; trialNumber += 1) {
      await selectTrial(trialNumber);
      caseEvidence.push(await verifyCase(story.id, trialNumber));
      if(isCompact){
        const compactProof=await evaluateFunction(inspectCompactWritingReportInDocument,{caseId:story.id});
        check(`Compact ${story.id}: original paired reviews, frozen inputs, task rubric and scores`,compactProof.mismatches.length===0,JSON.stringify(compactProof));
        compactCaseEvidence.push(compactProof);
      }
      if(isCreation) creationExpandedEvidence.push(await verifyCreationExpandedReviews(story.id,trialNumber));
    }
  }
  const pairedTwistsEvidence = isPairedTwists ? await evaluateFunction(inspectPairedTwistsReportInDocument, { registeredConfigurationIds: PAIRED_NATIVE_CONFIGURATION_IDS }) : null;
  if (pairedTwistsEvidence) check('Paired Plot twists: exact inline inputs, all declared original paired reviews and independent four-criterion arithmetic', pairedTwistsEvidence.mismatches.length === 0, JSON.stringify(pairedTwistsEvidence));
  const predecessorArchiveEvidence = await evaluate(`(${inspectWritingPredecessorArchiveInDocument.toString()})()`);
  if (predecessorArchiveEvidence) {
    check('Plot twists completion: both original failed attempts remain inspectable, unscored and exactly copyable', !predecessorArchiveEvidence.mismatches.length, JSON.stringify(predecessorArchiveEvidence));
    for (const response of predecessorArchiveEvidence.responses) {
      const selector = `[data-writing-predecessor="${response.configurationId}"][data-predecessor-trial="${response.trialNumber}"] [data-writing-predecessor-output]`;
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'})`);
      await noOverflow('Plot twists original failed predecessor');
      await capture(`writing-predecessor-${response.configurationId}-trial-${response.trialNumber}.png`.replace(/[^a-zA-Z0-9._-]/g, '-'), screenshots, { view: 'original-failed-predecessor', configurationId: response.configurationId, trialNumber: response.trialNumber, outputSha256: response.outputSha256 });
    }
  }
  const selectedRubricExpression=`(() => {const data=window.VASIR_WRITING,story=data.cases.find(item=>item.id===document.querySelector('#report-page').dataset.activeWritingCase);return story?.rubric?.length?story.rubric.map(item=>({...item,id:item.dimensionId||item.id,label:item.label||item.criterion,description:item.description||item.criterion||'',anchors:item.anchors||data.methodology?.ratingAnchors})):data.scoreBasis.dimensions;})()`;
  check('Every declared rubric dimension is present', await evaluate('document.querySelectorAll("[data-rubric-dimension]").length==='+selectedRubricExpression+'.length'));
  check('Every task rubric description and published rating anchor matches the source', await evaluate(`${selectedRubricExpression}.every(dimension=>{ const element=document.querySelector('[data-rubric-dimension="'+dimension.id+'"]');return element?.querySelector('[data-rubric-description]').textContent===(dimension.description || '') && element.querySelectorAll('[data-rubric-anchor]').length===Object.keys(dimension.anchors||{}).length && Object.entries(dimension.anchors||{}).every(([rating,text])=>element.querySelector('[data-rubric-anchor="'+rating+'"]')?.textContent===text); })`));
  check('Execution methodology and resource-accounting text match the source', await evaluate(`(() => { const method=window.VASIR_WRITING.methodology;const element=document.querySelector('[data-method-execution]');const expected=method.execution || {};return Boolean(element)===Boolean(method.execution || method.resourceAccounting) && (!method.resourceAccounting || element.querySelector('[data-resource-accounting]').textContent===method.resourceAccounting) && Object.entries(expected).every(([key,value])=>element.querySelector('[data-method-execution-field="'+key+'"]')?.textContent===(value===null?'Not reported':String(value))); })()`));
  check('Uncertainty disclosure preserves the selected benchmark protocol', await evaluate(`!window.VASIR_WRITING.scoreBasis.uncertainty?.protocol || document.querySelector('#method').textContent.includes(window.VASIR_WRITING.scoreBasis.uncertainty.reason)`));
  check('Shared prompt files render once with exact source text', await evaluate(`(() => { const files=window.VASIR_WRITING_RESPONSES.promptFiles || []; const elements=[...document.querySelectorAll('[data-prompt-file]')]; return elements.length===files.length && elements.every(element=>element.querySelector('[data-prompt-file-content]').textContent===files.find(file=>file.id===element.dataset.promptFile).content); })()`));
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await noOverflow('Writing report');
  await closeWritingReportAuditDetails(reportPresentationEvidence);
  await capture('writing-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Writing method');
  await capture('writing-method.png');
  const rubricDimensions = await evaluate(selectedRubricExpression+'.filter(dimension=>dimension.anchors&&Object.keys(dimension.anchors).length).map(dimension=>dimension.id)');
  for (const dimensionId of rubricDimensions) {
    const selector = `[data-rubric-anchors="${dimensionId}"]`;
    await click(`${selector} > summary`);
    check(`Rubric ${dimensionId}: rating anchors open without overflow`, await evaluate(`document.querySelector(${JSON.stringify(selector)}).open && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`));
    if (dimensionId === rubricDimensions[0]) await capture('writing-rubric-anchors.png');
    await click(`${selector} > summary`);
  }
  if (await evaluate('!!document.querySelector("[data-method-execution]")')) {
    await click('[data-method-execution] > summary');
    await noOverflow('Writing execution methodology');
    await capture('writing-method-execution.png');
    await click('[data-method-execution] > summary');
  }
  const promptReference = await evaluate('!!document.querySelector("[data-open-prompt-file]")');
  if (promptReference) {
    await click('[data-open-prompt-file]');
    check('Input transcript opens the shared frozen prompt file', await evaluate('!!document.querySelector("[data-prompt-file][open]")'));
    await noOverflow('Shared Writing prompt');
  }
  const promptArchive = await evaluate(`window.VASIR_WRITING_RESPONSES.promptFiles.map(file=>({id:file.id,title:file.title,characters:file.content.length}))`);
  for (const file of promptArchive) {
    const selector = `[data-prompt-file="${file.id}"]`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).open=false`);
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: opens its exact archived content`, await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); const source=window.VASIR_WRITING_RESPONSES.promptFiles.find(file=>file.id===${JSON.stringify(file.id)}); return element.open && element.querySelector('[data-prompt-file-content]').textContent===source.content && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1; })()`));
    if (file.characters === Math.max(...promptArchive.map(item=>item.characters))) await capture('writing-reference.png');
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: closes after inspection`, await evaluate(`!document.querySelector(${JSON.stringify(selector)}).open`));
  }
  const savedAnswer = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses; const answer=responses.find(response=>response.outputText.length && Number.isFinite(response.score)) || responses.find(response=>response.outputText.length && response.judgments.length) || responses.find(response=>response.outputText.length); return answer ? {caseId:answer.caseId,trialNumber:answer.trialNumber || 1,settingId:answer.settingId,condition:answer.condition,judgments:answer.judgments.length} : null; })()`);
  if (savedAnswer) {
    await selectCase(savedAnswer.caseId);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedAnswer.caseId)}`), 'Saved answer story');
    await selectTrial(savedAnswer.trialNumber);
    const visibleAnswer=await evaluate(`(async () => {
      await document.fonts.ready;
      const finite=document.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming()?.endTime)&&animation.effect.getComputedTiming().endTime<=2000);
      await Promise.race([Promise.allSettled(finite.map(animation=>animation.finished)),new Promise(resolve=>setTimeout(resolve,2000))]);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const row=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"]');
      row.querySelector('.model-run').open=true;
      const answer=row.querySelector('${isCreation ? '[data-report-trial="' + savedAnswer.trialNumber + '"] ' : ''}[data-condition="${savedAnswer.condition}"] [data-output-text]');
      answer.closest('.model-run__section').scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const rect=answer.getBoundingClientRect();
      const source=window.VASIR_WRITING_RESPONSES.responses.find(item=>item.caseId===${JSON.stringify(savedAnswer.caseId)}&&item.settingId===${JSON.stringify(savedAnswer.settingId)}&&item.condition===${JSON.stringify(savedAnswer.condition)}&&(item.trialNumber||1)===${savedAnswer.trialNumber});
      return {visible:answer.checkVisibility()&&rect.top>=0&&rect.top<innerHeight,exact:answer.textContent===source.outputText};
    })()`);
    check('Saved answer capture shows the exact answer after route scrolling settles',visibleAnswer.visible&&visibleAnswer.exact,JSON.stringify(visibleAnswer));
    await noOverflow('Saved Writing answer');
    await capture('writing-answer.png');
    if (savedAnswer.judgments) {
      await evaluate(`(() => { const judge=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] ${isCreation ? '[data-report-trial="' + savedAnswer.trialNumber + '"] ' : ''}[data-condition="${savedAnswer.condition}"] .model-run__judging');judge.open=true;judge.scrollIntoView({block:'start',behavior:'instant'}); })()`);
      await noOverflow('Writing judge dimensions');
      check('Sparse Writing judgments remain visibly separate from aggregate scores', await evaluate(`(() => { const panel=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] ${isCreation ? '[data-report-trial="' + savedAnswer.trialNumber + '"] ' : ''}[data-condition="${savedAnswer.condition}"]');const response=window.VASIR_WRITING_RESPONSES.responses.find(response=>response.caseId===${JSON.stringify(savedAnswer.caseId)} && response.settingId===${JSON.stringify(savedAnswer.settingId)} && response.condition===${JSON.stringify(savedAnswer.condition)} && (response.trialNumber || 1)===${savedAnswer.trialNumber});return response.judgments.length===window.VASIR_WRITING.scoreBasis.judgeCount || (panel.querySelector('.model-run__condition-score').textContent.trim()==='—' && panel.querySelector('.model-run__judging-meta').textContent.includes('Panel incomplete') && panel.querySelector('[data-judge-coverage]').textContent.includes('A complete score requires the full panel.'));})()`));
      await capture('writing-judgments.png');
      const judgeResources = `[data-report-setting-id="${savedAnswer.settingId}"] ${isCreation ? '[data-report-trial="' + savedAnswer.trialNumber + '"] ' : ''}[data-condition="${savedAnswer.condition}"] [data-judge-resources]`;
      if (await evaluate(`!!document.querySelector(${JSON.stringify(judgeResources)})`)) {
        await click(`${judgeResources} > summary`);
        await noOverflow('Writing shared judge-batch resources');
        await capture('writing-judge-resources.png');
      }
    }
  }
  const savedExecution = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses;const answer=responses.find(response=>response.runtime?.observedCollaborationEvents>0 && response.runtime.referenceFilesRead?.length) || responses.find(response=>response.runtime);return answer ? {caseId:answer.caseId,trialNumber:answer.trialNumber || 1,settingId:answer.settingId,condition:answer.condition,runtime:answer.runtime} : null; })()`);
  if (savedExecution) {
    await selectCase(savedExecution.caseId);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedExecution.caseId)}`), 'Saved execution story');
    await selectTrial(savedExecution.trialNumber);
    const selector = `[data-report-setting-id="${savedExecution.settingId}"] ${isCreation ? '[data-report-trial="' + savedExecution.trialNumber + '"] ' : ''}[data-condition="${savedExecution.condition}"] [data-writing-execution]`;
    await evaluate(`document.querySelector('[data-report-setting-id="${savedExecution.settingId}"] .model-run').open=true`);
    await click(`${selector} > summary`);
    check('Recorded execution opens with literal labels and no inferred agent count', await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)});return element.open && element.textContent.includes('do not establish the number of underlying agents'); })()`));
    await noOverflow('Writing recorded execution');
    await capture('writing-execution.png');
    const reference = await evaluate(`document.querySelector(${JSON.stringify(`${selector} [data-open-prompt-file]`)})?.dataset.openPromptFile`);
    if (reference) {
      await click(`${selector} [data-open-prompt-file]`);
      check('Recorded reference-file read opens its shared archive', await evaluate(`document.querySelector('[data-prompt-file="${reference}"]').open`));
      await noOverflow('Writing recorded reference');
    }
  }

  // Supplementary evidence only: keep the canonical 13 presentation captures stable.
  for (const failure of caseEvidence.flatMap(story => story.failures)) {
    await selectCase(failure.caseId);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(failure.caseId)}`), 'Failed answer story');
    await selectTrial(failure.trialNumber);
    const states = [{ condition:failure.condition, view:'failed-response' }];
    if (failure.pairedResponse?.hasOutput) states.push({ condition:failure.pairedResponse.condition, view:'retained-paired-response' });
    for (const state of states) {
      const selector = `[data-report-setting-id="${failure.settingId}"] ${isCreation ? '[data-report-trial="' + failure.trialNumber + '"] ' : ''}[data-condition="${state.condition}"]`;
      await evaluate(`(() => {document.querySelector('[data-report-setting-id="${failure.settingId}"] .model-run').open=true;document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'});})()`);
      await noOverflow(`Writing ${failure.configurationId} ${failure.caseId} ${state.view}`);
      const name = `writing-failure-${failure.caseId}-trial-${failure.trialNumber}-${failure.settingId}-${state.condition}-${state.view}.png`.replace(/[^a-zA-Z0-9._-]/g, '-');
      await capture(name, failureScreenshots, {caseId:failure.caseId,settingId:failure.settingId,configurationId:failure.configurationId,condition:state.condition,view:state.view});
    }
  }

  const loadedFiles = await drainLoadedFiles();
  if(isCreation) {
    const creationFiles=loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-creation-responses.js'));
    check('Creation archive response bytes and SHA-256 are recorded without downloading the legacy archive',creationFiles.length>0&&creationFiles.every(file=>file.bytes>0&&/^[a-f0-9]{64}$/.test(file.sha256))&&new Set(creationFiles.map(file=>file.sha256)).size===1&&!requests.some(request=>new URL(request.url).pathname.endsWith('/writing-responses.js')));
  }
  check('Writing lazy data bytes stay identical between explorer and report', new Set(loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-data.js')).map(file=>file.sha256)).size===1);
  check('No browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
  check('No failed HTTP responses', [...responses.values()].every(response => response.status < 400), JSON.stringify([...responses.values()].filter(response => response.status >= 400).map(response => ({url:response.url,status:response.status}))));
  const scoredBranchCoverage = {required:requireScored,completeSettings:scoredCollection.completeSettings,rankedSettings:scoredCollection.rankedSettings,partialSettings:scoredCollection.partialSettings,unscoredSettings:scoredCollection.unscoredSettings,tiedRankEntries:scoredCollection.tiedRankEntries,regressionSettings:scoredCollection.regressionSettings,completePanels:caseEvidence.reduce((sum,story)=>sum+story.completePanelResponses,0),singleJudgeResponses:caseEvidence.reduce((sum,story)=>sum+story.singleJudgeResponses,0),scoredPairs:caseEvidence.reduce((sum,story)=>sum+story.scoredPairs,0),regressionPairs:caseEvidence.reduce((sum,story)=>sum+story.regressionPairs,0),tiedPairs:caseEvidence.reduce((sum,story)=>sum+story.tiedPairs,0),efficiency:efficiencyEvidence};
  if (requireScored) check('Scored reports retain complete panels; category efficiency uses available paired scores and complete resource readings on the same subset', scoredBranchCoverage.completePanels > 0 && efficiencyEvidence.every(proof => scoredCollection.rankedSettings > 0 ? proof.eligiblePoints > 0 && proof.frontierPoints > 0 : proof.eligiblePoints === 0 && proof.frontierPoints === 0), JSON.stringify(scoredBranchCoverage));
  check('Independent acceptance arithmetic did not change during browser verification',acceptanceEvidenceSha256===sha256(fs.readFileSync(acceptanceEvidencePath)));
  const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',benchmarkId:writing.benchmarks[0],trialCount:writing.trialCount,url:baseUrl.href,width,height,harnessSha256,networkCaptureOptions,acceptanceEvidenceSha256,overallSha256,coverage,categoryEvidence,provisionalArchiveEvidence,reportPresentationEvidence,...(predecessorArchiveEvidence?{predecessorArchiveEvidence}:{}),...(pairedTwistsEvidence?{pairedTwistsEvidence}:{}),...(isCreation?{creationArchiveEvidence,creationExpandedEvidence}:{}),...(isCompact?{compactCaseEvidence,compactEvidenceHarnessSha256}:{}),checks,caseEvidence,scoredBranchCoverage,progressEvidence,promptArchive,savedAnswer,savedExecution,loadedFiles,screenshots,failureScreenshots,errors,completedAt:new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify(receipt,null,2)}\n`);
  process.stdout.write(`${JSON.stringify({status:'passed',checks:checks.length,cases:caseEvidence.length,width,height,receipt:path.join(output,'writing-browsercheck.json')})}\n`);
  }
} catch (error) {
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify({kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'failed',url:baseUrl.href,width,height,harnessSha256,networkCaptureOptions,checks,screenshots,failureScreenshots,errors,error:error.stack},null,2)}\n`);
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(2000)]);
  if (chrome.exitCode === null) chrome.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
}
