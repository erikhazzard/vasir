import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildPairedJudgePrompt, exportPairedRun, PAIRED_RUNTIME_VERSION, PAIRED_VALIDATION_ERRATUM_VERSION, validatePairedAssessment, validatePairedRunExport } from './plot-twists-paired-runtime.js';
import { resolveBenchmarkConfiguration } from './benchmark-models.js';

export const PLOT_TWISTS_PAIRED_EDITION = 'storytelling-plot-twists-paired-v2';
export const PLOT_TWISTS_PAIRED_SOURCE_KIND = 'vasirbenchmark-plot-twists-paired-source';
export const PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH = 'benchmarks/storytelling-plot-twists/head-to-head-astra-fable-v1.json';
export const PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256 = 'f747f36bbddf08f0f6f4f65a7cbe9b16745967baebfc5edd9642b4327c3e3637';
const HEAD_TO_HEAD_SOURCE_SHA256 = 'f50472e807d05802ee2f62e1e29d4aef425c3b1c776d253e9e4fa7ba7fb048e7';
export const WRITING_PAIRED_SCORE_BASIS = Object.freeze({
  id: 'writing-storytelling-paired-v2',
  benchmarkIds: Object.freeze(['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']),
  coreIdeaScoring: 'published-single-judge-provisional', method: 'equal-benchmark-mean',
  benchmarkEditions: Object.freeze({ 'storytelling-plot-twists': PLOT_TWISTS_PAIRED_EDITION })
});
const ID = 'storytelling-plot-twists';
const ERRATUM_PURPOSE = 'A pinned validation correction permits the exact pre-turn disabled-Code-Mode diagnostic and selects the last assistant message from the same completed turn. Original records and all messages are retained; no replacement calls were made.';
const PANEL = ['codex:gpt-6-astra@xhigh', 'codex:gpt-5.6-sol@xhigh'];
const MODELS = ['codex:gpt-6-astra@medium', 'codex:gpt-5.6-sol@medium', 'codex:gpt-5.6-terra@medium',
  'codex:gpt-5.6-luna@medium', 'claude:claude-fable-5-1@medium', 'claude:claude-opus-5@medium'];
const ADDED_MODELS = ['codex:gpt-6-astra@low', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6-astra@ultra',
  'claude:claude-fable-5-1@low', 'claude:claude-fable-5-1@xhigh', 'claude:claude-fable-5-1@max',
  'claude:claude-opus-5@low', 'claude:claude-opus-5@xhigh'];
const EXTENSION_VERSION = 'paired-reasoning-coverage-extension-v1';
const DECLARED_EXTENSION_VERSION = 'paired-declared-coverage-extension-v2';
const EXECUTION_VALIDATION_VERSION = 'paired-one-turn-last-message-validation-v1';
const EXECUTION_VALIDATION_PURPOSE = 'Supplemental calls use the pinned one-turn validation policy: the exact pre-turn disabled-Code-Mode notice is allowed, tools are forbidden, and the last completed assistant message is the answer.';
const TOOL_ISOLATION_POLICY = { version: 'explicit-agent-tool-isolation-v1', codexConfig: { 'agents.enabled': false },
  rejectToolRouterErrors: true, appliesTo: 'newly-prepared-runs-only', historicalResultsReclassified: false };
const TOOL_ISOLATION_PURPOSE = 'Only newly attempted calls in this manifest use the explicit Codex agents.enabled=false override and reject tool-router errors. Retained historical answers and reviews are not retrospectively certified or reclassified by this policy.';
const TECHNICAL_RECOVERY_VERSION = 'paired-tool-isolation-recovery-v1';
const RECOVERY_MODELS = ['codex:gpt-6-astra@ultra', 'codex:gpt-5.6-sol@ultra', 'codex:gpt-5.6-terra@ultra'];
const LABELS = { 'gpt-6-astra': 'GPT-6 Astra', 'gpt-5.6-sol': 'GPT-5.6 Sol', 'gpt-5.6-terra': 'GPT-5.6 Terra',
  'gpt-5.6-luna': 'GPT-5.6 Luna', 'claude-fable-5-1': 'Claude Fable 5.1', 'claude-opus-5': 'Claude Opus 5' };
const CONDITIONS = [{ id: 'baseline', sourceId: 'baseline', label: 'Plain answer', short: 'Plain', color: '#72777f', shape: 'circle' },
  { id: 'skill', sourceId: 'skill', label: 'Storytelling skill', short: 'Storytelling', color: '#1f6fff', shape: 'square' }];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const mean = values => values.length && values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) / values.length : null;
const round = value => Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 10) / 10 : null;
const words = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
const publicToolIsolationPolicy = (policy, sha256, configurationIds, recovery = null) => ({ ...policy, sha256,
  purpose: TOOL_ISOLATION_PURPOSE, ...(recovery ? {
    generationIds: [...recovery.replacementGenerationIds, ...recovery.pendingGenerationIds],
    judgmentIds: [...recovery.replacementJudgmentIds, ...recovery.pendingJudgmentIds]
  } : { configurationIds }) });
const requireEvidence = (value, message) => { if (!value) throw new Error(`Paired Plot twists publication: ${message}`); };
const usage = value => Object.fromEntries(['inputTokens', 'cachedInputTokens', 'cacheWriteInputTokens', 'cacheCreationInputTokens', 'cacheReadInputTokens', 'outputTokens', 'reasoningOutputTokens', 'totalTokens']
  .map(key => [key, Number.isFinite(value?.[key]) && value[key] >= 0 ? value[key] : null]));
const metrics = responses => ({ meanLatencyMs: round(mean(responses.map(item => item.runtime?.durationMs))),
  meanInputTokens: round(mean(responses.map(item => item.runtime?.usage?.inputTokens))),
  meanOutputTokens: round(mean(responses.map(item => item.runtime?.usage?.outputTokens))),
  meanTotalTokens: round(mean(responses.map(item => item.runtime?.usage?.totalTokens))),
  meanWordCount: round(mean(responses.map(item => item.wordCount))), meanCostUsd: null, costCoverage: 'not-comparable' });
const identity = configuration => ({ id: configuration.id.replace(/[^a-zA-Z0-9-]/g, '-'), configurationId: configuration.id,
  modelId: `${configuration.provider}:${configuration.model}`, provider: configuration.provider, family: LABELS[configuration.model],
  reasoning: configuration.reasoning, label: `${LABELS[configuration.model]} · ${configuration.reasoning}` });
const dimensionsFor = contract => contract.task.rubric.map(item => ({ id: item.id, title: item.criterion ?? item.title,
  label: item.criterion ?? item.title, description: item.description ?? item.criterion ?? item.title, weight: 25, anchors: contract.anchors }));
const cohortProvenance = (contract, configurationId) => {
  if (!contract.coverageExtension) return {};
  if (contract.sourceCohorts) {
    const cohort = contract.sourceCohorts.find(item => item.configurationIds.includes(configurationId));
    requireEvidence(cohort, 'answer has no declared source cohort.');
    const { configurationIds, ...provenance } = cohort;
    return provenance;
  }
  const original = MODELS.includes(configurationId);
  return { sourceCohort: original ? 'original' : 'supplement',
    sourceSnapshotSha256: original ? contract.coverageExtension.parentSnapshotSha256 : contract.sourceSha256,
    sourceManifestSha256: original ? contract.coverageExtension.parentManifestSha256 : contract.manifestSha256 };
};
const recordProvenance = (contract, kind, id, configurationId) => {
  if (!contract.technicalRecovery) return cohortProvenance(contract, configurationId);
  const record = contract.recordSources.find(item => item.kind === kind && item.id === id);
  requireEvidence(record, 'effective answer or review has no original record source.');
  const { kind: _kind, id: _id, disposition, ...source } = record;
  return { ...source, recordDisposition: disposition,
    ...(disposition !== 'retained' ? { technicalRecoverySha256: contract.technicalRecovery.sha256 } : {}) };
};
const slotId = (kind, configurationId, caseId, conditionOrSeat) => `${kind}-` + hash(JSON.stringify([configurationId, caseId, conditionOrSeat])).slice(0, 24);

// This explicitly authorized, non-scoring sidecar is pinned independently of
// the unchanged benchmark snapshot. Never discover mutable experiments or
// reinterpret a failed original record inside the benchmark scoring pipeline.
function validateHeadToHeads(projection, responseBundle) {
  const heads = projection.headToHeads;
  if (!heads) {
    requireEvidence(!responseBundle?.headToHeads, 'head-to-head response evidence has no corresponding public comparison.');
    return;
  }
  requireEvidence(Array.isArray(heads) && heads.length === 1, 'head-to-head inventory changed.');
  const { evidenceSha256, ...head } = heads[0];
  const originalSidecar = { kind: 'vasirbenchmark-writing-head-to-head-evidence', schemaVersion: 1, headToHead: head };
  requireEvidence(evidenceSha256 === PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256
    && hash(JSON.stringify(originalSidecar, null, 2) + '\n') === evidenceSha256, 'head-to-head evidence differs from its explicitly pinned source.');
  requireEvidence(head.sourceSnapshotSha256 === HEAD_TO_HEAD_SOURCE_SHA256
    && projection.scoreBasis.sourceSha256 === head.sourceSnapshotSha256
    && head.benchmarkId === ID && head.caseId === projection.cases[0].id && head.condition === 'skill'
    && head.scoreEffect === 'none', 'head-to-head comparison changes source identity or scoring scope.');
  for (const candidate of head.candidates) {
    const setting = projection.settings.find(item => item.id === candidate.settingId);
    requireEvidence(setting?.configurationId === candidate.configurationId && setting.label === candidate.label,
      'head-to-head candidate setting changed.');
    if (responseBundle) {
      const response = responseBundle.responses.find(item => item.settingId === candidate.settingId && item.condition === head.condition);
      requireEvidence(response?.provenance.outputSha256 === candidate.outputSha256
        && hash(response.outputText) === candidate.outputSha256 && response.wordCount === candidate.wordCount,
      'head-to-head candidate differs from the original published answer.');
    }
  }
  for (const review of head.reviews) {
    requireEvidence(hash(review.rawText) === review.rawTextSha256, 'head-to-head original review text changed.');
    let parsed = null;
    try { parsed = JSON.parse(review.rawText); } catch { /* Preserve invalid original JSON verbatim. */ }
    const label = review.preferredCandidateId === 'tie' ? 'tie'
      : review.preferredCandidateId === review.firstCandidateId ? 'A'
      : review.preferredCandidateId === review.secondCandidateId ? 'B' : null;
    requireEvidence(label !== null, 'head-to-head preference is not explicitly mapped to an original candidate.');
    const preference = { candidate: label, reason: review.reason, confidence: review.confidence };
    if (review.interpretation === 'structured-preference') {
      requireEvidence(parsed && review.originalValidation.schemaValid && review.originalValidation.status === 'succeeded'
        && review.originalValidation.error === null && same(parsed.preference, preference), 'head-to-head structured preference differs from its original review.');
      validatePairedAssessment(parsed, JSON.parse(JSON.stringify(projection.methodology.sourceContract.task)));
    } else {
      requireEvidence(review.id === 'review-04' && review.interpretation === 'explicit-text-transcription'
        && parsed === null && review.originalValidation.schemaValid === false && review.originalValidation.status === 'failed'
        && typeof review.originalValidation.error === 'string'
        && review.rawText.includes('"preference":' + JSON.stringify(preference)),
      'head-to-head clear-text transcription changed or its original schema failure was concealed.');
    }
  }
  const judges = head.judges.map(judge => {
    const reviews = head.reviews.filter(review => review.judgeId === judge.id);
    requireEvidence(reviews.length === 2 && same(judge.reviewIds, reviews.map(review => review.id))
      && reviews[0].firstCandidateId === reviews[1].secondCandidateId && reviews[0].secondCandidateId === reviews[1].firstCandidateId,
    'head-to-head reversed-order judge coverage changed.');
    const consistent = reviews[0].preferredCandidateId === reviews[1].preferredCandidateId;
    requireEvidence(judge.orderConsistent === consistent && judge.preferredCandidateId === (consistent ? reviews[0].preferredCandidateId : null),
      'head-to-head order consistency differs from the explicit preferences.');
    return judge;
  });
  requireEvidence(same(head.summary, { preferredCandidateId: judges.every(judge => judge.orderConsistent
      && judge.preferredCandidateId === judges[0].preferredCandidateId) ? judges[0].preferredCandidateId : null,
    judgeCount: judges.length, reviewCount: head.reviews.length,
    orderConsistentJudgeCount: judges.filter(judge => judge.orderConsistent).length,
    structuredReviewCount: head.reviews.filter(review => review.interpretation === 'structured-preference').length,
    transcribedReviewCount: head.reviews.filter(review => review.interpretation === 'explicit-text-transcription').length }),
  'head-to-head summary does not preserve every explicit preference and interpretation.');
  if (responseBundle) requireEvidence(same(heads, responseBundle.headToHeads), 'head-to-head projection and response evidence differ.');
}

function originalRecordSource(snapshot, sourceSha256, kind, id) {
  const collection = kind === 'generation' ? 'generations' : 'judgments';
  if (snapshot.parentSnapshot?.[collection].some(row => row.id === id))
    return originalRecordSource(snapshot.parentSnapshot, snapshot.coverageExtension.parentSnapshotSha256, kind, id);
  return { sourceCohort: snapshot.coverageExtension ? 'supplement' : 'original', sourceSnapshotSha256: sourceSha256,
    sourceManifestSha256: snapshot.manifestSha256 };
}

function publicRecoveryRecordSources(snapshot, sourceSha256) {
  const recovery = snapshot.manifest.technicalRecovery, source = snapshot.recoverySourceSnapshot;
  return ['generation', 'judgment'].flatMap(kind => {
    const rows = source[kind === 'generation' ? 'generations' : 'judgments'];
    const replacements = recovery[kind === 'generation' ? 'replacementGenerationIds' : 'replacementJudgmentIds'];
    const pending = recovery[kind === 'generation' ? 'pendingGenerationIds' : 'pendingJudgmentIds'];
    return rows.map(row => {
      const disposition = replacements.includes(row.id) ? 'technical-replacement' : pending.includes(row.id) ? 'previously-unattempted' : 'retained';
      return { kind, id: row.id, disposition, ...(disposition === 'retained'
        ? originalRecordSource(source, recovery.sourceSnapshotSha256, kind, row.id)
        : { sourceCohort: 'recovery', sourceSnapshotSha256: sourceSha256, sourceManifestSha256: snapshot.manifestSha256 }),
      ...(disposition === 'technical-replacement' ? { supersedesRecordSha256: hash(JSON.stringify(row)) } : {}) };
    });
  });
}

function publicCoverageHistory(snapshot, sourceSha256) {
  const extension = snapshot.coverageExtension;
  const inherited = extension ? publicCoverageHistory(snapshot.parentSnapshot, extension.parentSnapshotSha256)
    : { sourceCohorts: [], coverageHistory: [] };
  const configurationIds = extension ? extension.addedConfigurations : snapshot.manifest.configurations.map(item => item.id);
  const sourceIdentity = { sourceSnapshotSha256: sourceSha256, sourceManifestSha256: snapshot.manifestSha256 };
  return { sourceCohorts: [...inherited.sourceCohorts,
    { configurationIds, sourceCohort: extension ? 'supplement' : 'original', ...sourceIdentity }],
  coverageHistory: [...inherited.coverageHistory, ...(extension ? [{ ...extension, ...sourceIdentity }] : [])] };
}

function validateDeclaredConfigurations(added, retained) {
  requireEvidence(Array.isArray(added) && added.length > 0 && new Set(added).size === added.length,
    'coverage append requires unique explicit new configurations.');
  for (const id of added) {
    const configuration = resolveBenchmarkConfiguration(id);
    requireEvidence(configuration.id === id && Object.hasOwn(LABELS, configuration.model)
      && configuration.reasoning !== 'ultracode' && !retained.includes(id), 'coverage append changed a canonical identity or reran a retained setting.');
  }
}

function validateCoverageHistory(contract) {
  const cohorts = contract.sourceCohorts, history = contract.coverageHistory;
  requireEvidence(Array.isArray(cohorts) && cohorts.length > 1 && Array.isArray(history) && history.length === cohorts.length - 1,
    'declared coverage history is missing.');
  const seen = [];
  for (const [index, cohort] of cohorts.entries()) {
    requireEvidence(same(Object.keys(cohort), ['configurationIds', 'sourceCohort', 'sourceSnapshotSha256', 'sourceManifestSha256'])
      && ['sourceSnapshotSha256', 'sourceManifestSha256'].every(key => /^[a-f0-9]{64}$/.test(cohort[key] ?? '')),
    'source cohort identity changed.');
    if (index === 0) requireEvidence(cohort.sourceCohort === 'original' && same(cohort.configurationIds, MODELS), 'original cohort changed.');
    else {
      const step = history[index - 1], previous = cohorts[index - 1];
      validateDeclaredConfigurations(cohort.configurationIds, seen);
      requireEvidence([EXTENSION_VERSION, DECLARED_EXTENSION_VERSION].includes(step.version)
        && typeof step.purpose === 'string' && step.purpose.trim()
        && (step.version !== EXTENSION_VERSION || index === 1 && same(cohort.configurationIds, ADDED_MODELS))
        && cohort.sourceCohort === 'supplement' && same(step.addedConfigurations, cohort.configurationIds)
        && step.retainedConfigurationCount === seen.length && step.additionalGenerationCount === cohort.configurationIds.length * CONDITIONS.length
        && step.additionalJudgeRequestCount === cohort.configurationIds.length * PANEL.length
        && step.parentSnapshotSha256 === previous.sourceSnapshotSha256 && step.parentManifestSha256 === previous.sourceManifestSha256
        && step.sourceSnapshotSha256 === cohort.sourceSnapshotSha256 && step.sourceManifestSha256 === cohort.sourceManifestSha256,
      'coverage history no longer binds each append to its complete parent.');
    }
    seen.push(...cohort.configurationIds);
  }
  requireEvidence(new Set(seen).size === seen.length && same(seen, contract.configurations.map(item => item.id))
    && new Set(cohorts.map(item => item.sourceSnapshotSha256)).size === cohorts.length
    && new Set(cohorts.map(item => item.sourceManifestSha256)).size === cohorts.length,
  'source cohorts overlap or differ from the declared roster.');
  const { sourceSnapshotSha256, sourceManifestSha256, ...latest } = history.at(-1);
  requireEvidence(same(latest, contract.coverageExtension)
    && sourceSnapshotSha256 === (contract.technicalRecovery?.sourceSnapshotSha256 ?? contract.sourceSha256)
    && sourceManifestSha256 === (contract.technicalRecovery?.sourceManifestSha256 ?? contract.manifestSha256),
  'latest coverage history differs from the selected source or its declared recovery predecessor.');
}

function publicContract(snapshot, sourceSha256) {
  const { manifest } = snapshot, specification = manifest.specification;
  let erratumSource = snapshot;
  while (erratumSource.parentSnapshot) erratumSource = erratumSource.parentSnapshot;
  return { edition: PLOT_TWISTS_PAIRED_EDITION, benchmarkId: ID, runId: snapshot.runId,
    runtimeVersion: manifest.runtimePolicy.version, runtimeInventory: manifest.runtimeInventory,
    ...(erratumSource.runtimeValidationErratum ? { runtimeValidationErratum: {
      version: erratumSource.runtimeValidationErratum.version, sha256: erratumSource.runtimeValidationErratumSha256,
      purpose: ERRATUM_PURPOSE, additionalInferenceCalls: erratumSource.runtimeValidationErratum.policy.additionalInferenceCallsForCorrection } } : {}),
    ...(snapshot.coverageExtension ? { coverageExtension: { ...snapshot.coverageExtension },
      executionValidationPolicy: { version: manifest.executionValidationPolicy.version,
        sha256: manifest.executionValidationPolicySha256, purpose: EXECUTION_VALIDATION_PURPOSE } } : {}),
    ...(snapshot.coverageExtension?.version === DECLARED_EXTENSION_VERSION ? publicCoverageHistory(snapshot.recoverySourceSnapshot ?? snapshot,
      manifest.technicalRecovery?.sourceSnapshotSha256 ?? sourceSha256) : {}),
    ...(manifest.technicalRecovery ? { technicalRecovery: { ...manifest.technicalRecovery, sha256: manifest.technicalRecoverySha256,
      acceptedParentSnapshotSha256: snapshot.coverageExtension.parentSnapshotSha256 },
    recordSources: publicRecoveryRecordSources(snapshot, sourceSha256) } : {}),
    ...(manifest.toolIsolationPolicy ? { toolIsolationPolicy: publicToolIsolationPolicy(manifest.toolIsolationPolicy,
      manifest.toolIsolationPolicySha256, snapshot.coverageExtension?.addedConfigurations ?? manifest.configurations.map(item => item.id), manifest.technicalRecovery) } : {}),
    sourceSha256, manifestSha256: snapshot.manifestSha256,
    specificationSha256: manifest.specificationSha256 ?? hash(JSON.stringify(specification)),
    task: { id: specification.benchmark.caseId, title: specification.benchmark.title, prompt: specification.benchmark.prompt,
      wordLimit: specification.benchmark.wordLimit, rubric: specification.benchmark.rubric },
    configurations: manifest.configurations, judges: specification.judging.panel,
    anchors: specification.scoring.anchors, judgeInstructions: specification.judging.instructions,
    bundleSha256: manifest.frozenBundle.sha256,
      skillFiles: manifest.frozenBundle.files.map(file => ({ path: file.path, sha256: file.sha256, bytes: file.bytes ?? Buffer.byteLength(file.content) })) };
}

function validateTechnicalRecovery(contract) {
  const recovery = contract.technicalRecovery;
  if (!recovery) {
    requireEvidence(!contract.recordSources, 'per-record recovery provenance lacks its authorization.');
    return;
  }
  const { sha256, acceptedParentSnapshotSha256, ...original } = recovery;
  requireEvidence(recovery.version === TECHNICAL_RECOVERY_VERSION && contract.coverageExtension?.version === DECLARED_EXTENSION_VERSION
    && same(Object.keys(original), ['version', 'sourceSnapshotSha256', 'sourceManifestSha256', 'authorization',
      'replacementGenerationIds', 'replacementJudgmentIds', 'pendingGenerationIds', 'pendingJudgmentIds',
      'retainedGenerationCount', 'retainedJudgmentCount', 'purpose'])
    && hash(JSON.stringify(original)) === sha256
    && ['sourceSnapshotSha256', 'sourceManifestSha256', 'sha256', 'acceptedParentSnapshotSha256'].every(key => /^[a-f0-9]{64}$/.test(recovery[key] ?? ''))
    && recovery.sourceSnapshotSha256 !== contract.sourceSha256 && recovery.sourceManifestSha256 !== contract.manifestSha256
    && acceptedParentSnapshotSha256 === contract.coverageExtension.parentSnapshotSha256,
  'technical recovery lost its exact predecessor or authorization identity.');
  requireEvidence(Number.isFinite(Date.parse(recovery.authorization?.approvedAt))
    && same(Object.keys(recovery.authorization).sort(), ['approvedAt', 'scope', 'userInstruction'])
    && recovery.authorization.userInstruction === 'please do it'
    && recovery.authorization.scope === 'Rerun only the three skill answers affected by tool errors and their reviews; preserve all clean results and original attempts.'
    && typeof recovery.purpose === 'string' && recovery.purpose.trim(), 'technical recovery approval changed.');
  requireEvidence(same(recovery.replacementGenerationIds, RECOVERY_MODELS.map(id => slotId('generation', id, contract.task.id, 'skill')))
    && same(recovery.replacementJudgmentIds, [1, 2].map(seat => slotId('judgment', RECOVERY_MODELS[0], contract.task.id, seat))),
  'technical recovery replaced an unauthorized answer or completed review.');
  const expected = ['generation', 'judgment'].flatMap(kind => contract.configurations.flatMap(configuration =>
    (kind === 'generation' ? ['baseline', 'skill'] : [1, 2]).map(part => ({ kind,
      id: slotId(kind, configuration.id, contract.task.id, part), configurationId: configuration.id }))));
  requireEvidence(Array.isArray(contract.recordSources) && same(contract.recordSources.map(({ kind, id }) => ({ kind, id })),
    expected.map(({ kind, id }) => ({ kind, id }))), 'technical recovery record inventory changed.');
  for (const kind of ['generation', 'judgment']) {
    const replacements = recovery[kind === 'generation' ? 'replacementGenerationIds' : 'replacementJudgmentIds'];
    const pending = recovery[kind === 'generation' ? 'pendingGenerationIds' : 'pendingJudgmentIds'];
    const all = expected.filter(item => item.kind === kind), newIds = [...replacements, ...(pending ?? [])];
    requireEvidence(Array.isArray(pending) && new Set(newIds).size === newIds.length && newIds.every(id => all.some(item => item.id === id))
      && recovery[kind === 'generation' ? 'retainedGenerationCount' : 'retainedJudgmentCount'] === all.length - newIds.length,
    'technical recovery changed the retained or previously unattempted inventory.');
    for (const item of all) {
      const record = contract.recordSources.find(row => row.kind === kind && row.id === item.id);
      const disposition = replacements.includes(item.id) ? 'technical-replacement' : pending.includes(item.id) ? 'previously-unattempted' : 'retained';
      const origin = disposition === 'retained' ? cohortProvenance(contract, item.configurationId)
        : { sourceCohort: 'recovery', sourceSnapshotSha256: contract.sourceSha256, sourceManifestSha256: contract.manifestSha256 };
      requireEvidence(disposition !== 'technical-replacement' || /^[a-f0-9]{64}$/.test(record.supersedesRecordSha256 ?? ''),
        'replacement lost its immutable original attempt identity.');
      requireEvidence(same(record, { kind, id: item.id, disposition, ...origin,
        ...(disposition === 'technical-replacement' ? { supersedesRecordSha256: record.supersedesRecordSha256 } : {}) }),
      'technical recovery reclassified or relabeled original record provenance.');
    }
  }
  requireEvidence(contract.toolIsolationPolicy, 'technical recovery requires explicit new-call tool isolation.');
}

function validateContract(contract) {
  const declared = contract?.coverageExtension?.version === DECLARED_EXTENSION_VERSION;
  requireEvidence(contract?.edition === PLOT_TWISTS_PAIRED_EDITION && contract.benchmarkId === ID
    && contract.runtimeVersion === PAIRED_RUNTIME_VERSION
    && (declared || same(contract.configurations?.map(item => item.id), contract.coverageExtension ? [...MODELS, ...ADDED_MODELS] : MODELS))
    && same(contract.judges, PANEL), 'declared edition, creator roster, or panel changed.');
  if (declared) {
    requireEvidence(same(contract.configurations, contract.configurations.map(item => resolveBenchmarkConfiguration(item.id))), 'declared configuration metadata changed.');
    validateCoverageHistory(contract);
  } else requireEvidence(!contract.sourceCohorts && !contract.coverageHistory, 'historical cohort cannot claim undeclared append history.');
  if (contract.coverageExtension) {
    const extension = contract.coverageExtension;
    requireEvidence([EXTENSION_VERSION, DECLARED_EXTENSION_VERSION].includes(extension.version) && typeof extension.purpose === 'string' && extension.purpose.trim()
      && ['parentSnapshotSha256', 'parentManifestSha256'].every(key => /^[a-f0-9]{64}$/.test(extension[key] ?? ''))
      && (declared || same(extension.addedConfigurations, ADDED_MODELS) && extension.retainedConfigurationCount === MODELS.length)
      && extension.additionalGenerationCount === extension.addedConfigurations.length * CONDITIONS.length
      && extension.additionalJudgeRequestCount === extension.addedConfigurations.length * PANEL.length, 'declared coverage extension changed.');
    requireEvidence(contract.executionValidationPolicy?.version === EXECUTION_VALIDATION_VERSION
      && /^[a-f0-9]{64}$/.test(contract.executionValidationPolicy.sha256 ?? '')
      && contract.executionValidationPolicy.purpose === EXECUTION_VALIDATION_PURPOSE, 'supplemental execution validation identity changed.');
  } else requireEvidence(!contract.executionValidationPolicy, 'supplemental execution policy lacks a declared extension.');
  validateTechnicalRecovery(contract);
  if (Object.hasOwn(contract, 'toolIsolationPolicy')) requireEvidence(same(contract.toolIsolationPolicy,
    publicToolIsolationPolicy(TOOL_ISOLATION_POLICY, hash(JSON.stringify(TOOL_ISOLATION_POLICY)),
      contract.coverageExtension?.addedConfigurations ?? contract.configurations.map(item => item.id), contract.technicalRecovery)),
  'tool isolation policy or its new-call-only scope changed.');
  requireEvidence(contract.task?.id === 'scifi-outline' && contract.task.wordLimit === 550 && typeof contract.task.prompt === 'string'
    && contract.task.rubric?.length === 4 && new Set(contract.task.rubric.map(item => item.id)).size === 4, 'single-prompt task or rubric changed.');
  requireEvidence(['sourceSha256', 'manifestSha256', 'specificationSha256', 'bundleSha256'].every(key => /^[a-f0-9]{64}$/.test(contract[key] ?? '')),
    'immutable source identity is missing.');
  requireEvidence(contract.skillFiles?.length === 2 && contract.skillFiles.some(item => item.path === 'SKILL.md')
    && contract.skillFiles.some(item => item.path === 'references/twists-and-revelations.md'), 'frozen root and twists source inventory changed.');
  if (contract.runtimeValidationErratum) requireEvidence(same(Object.keys(contract.runtimeValidationErratum), ['version', 'sha256', 'purpose', 'additionalInferenceCalls'])
    && contract.runtimeValidationErratum.version === PAIRED_VALIDATION_ERRATUM_VERSION
    && /^[a-f0-9]{64}$/.test(contract.runtimeValidationErratum.sha256)
    && contract.runtimeValidationErratum.purpose === ERRATUM_PURPOSE
    && contract.runtimeValidationErratum.additionalInferenceCalls === 0, 'runtime validation correction identity changed.');
}

function buildProjection(contract, responses, judgeRequests) {
  validateContract(contract);
  const dimensions = dimensionsFor(contract), settings = contract.configurations.map(identity);
  const settingCount = settings.length, expectedResponseCount = settingCount * CONDITIONS.length;
  const expectedPairedJudgeCallCount = settingCount * PANEL.length;
  const scored = response => response.judgments.length === 2 ? mean(response.judgments.map(judge => judge.score)) : null;
  const cells = responses.map(response => {
    const pair = responses.filter(item => item.configurationId === response.configurationId);
    const complete = pair.length === 2 && pair.every(item => item.status === 'scored' && Number.isFinite(scored(item)));
    const exactScore = complete ? scored(response) : null, sampleMetrics = metrics([response]);
    return { settingId: response.settingId, configurationId: response.configurationId, benchmarkId: ID, caseId: contract.task.id,
      trialNumber: 1, condition: response.condition, category: 'writing', status: response.status,
      exactScore, score: round(exactScore), dimensions: Object.fromEntries(dimensions.map(dimension => [dimension.id,
        complete ? mean(response.judgments.map(judge => judge.dimensions[dimension.id].rating)) : null])),
      trials: 1, calibrated: false, wordCount: response.wordCount, wordLimit: contract.task.wordLimit,
      wordLimitExceeded: response.wordLimitExceeded, latencyMs: response.runtime?.durationMs ?? null,
      inputTokens: response.runtime?.usage?.inputTokens ?? null, outputTokens: response.runtime?.usage?.outputTokens ?? null,
      totalTokens: response.runtime?.usage?.totalTokens ?? null, costUsd: null, metrics: sampleMetrics,
      coverage: { expectedResponses: 1, completedResponses: response.runtime ? 1 : 0,
        expectedJudgments: 2, completedJudgments: response.judgments.length }, failureReason: response.failureReason, disagreement: response.disagreement };
  });
  const aggregates = [];
  for (const setting of settings) {
    setting.scores = {}; setting.metrics = {}; setting.coverage = {}; setting.categories = {};
    for (const condition of CONDITIONS) {
      const response = responses.find(item => item.settingId === setting.id && item.condition === condition.id);
      const cell = cells.find(item => item.settingId === setting.id && item.condition === condition.id);
      requireEvidence(response && cell, 'a declared answer slot is missing.');
      setting.scores[condition.id] = cell.score; setting.metrics[condition.id] = cell.metrics;
      setting.coverage[condition.id] = { expectedCases: 1, scoredCases: Number.isFinite(cell.exactScore) ? 1 : 0,
        expectedResponses: 1, completedResponses: cell.coverage.completedResponses, expectedJudgments: 2, completedJudgments: response.judgments.length };
      setting.categories[condition.id] = [{ category: 'writing', score: cell.score, exactScore: cell.exactScore }];
      aggregates.push({ settingId: setting.id, configurationId: setting.configurationId, benchmarkId: ID, category: 'writing',
        condition: condition.id, score: cell.score, exactScore: cell.exactScore, status: Number.isFinite(cell.exactScore) ? 'scored' : 'incomplete',
        dimensions: cell.dimensions, metrics: cell.metrics, coverage: setting.coverage[condition.id], trials: 1, calibrated: false });
    }
    const pair = aggregates.slice(-2);
    setting.deltas = { skill: pair.every(item => Number.isFinite(item.exactScore)) ? round(pair[1].exactScore - pair[0].exactScore) : null };
  }
  const entries = settings.flatMap(setting => CONDITIONS.map(condition => {
    const aggregate = aggregates.find(item => item.settingId === setting.id && item.condition === condition.id);
    return { ...identity(contract.configurations.find(item => item.id === setting.configurationId)), id: `${setting.id}-${condition.id}`,
      settingId: setting.id, condition: condition.id, conditionLabel: condition.label, score: aggregate.score, exactScore: aggregate.exactScore,
      baselineScore: setting.scores.baseline, delta: Number.isFinite(aggregate.exactScore) ? condition.id === 'baseline' ? 0 : setting.deltas.skill : null,
      rank: Number.isFinite(aggregate.exactScore) ? 1 + aggregates.filter(item => item.condition === condition.id && item.exactScore > aggregate.exactScore).length : null,
      eligibleForRank: Number.isFinite(aggregate.exactScore), categories: setting.categories[condition.id], baselineCategories: setting.categories.baseline,
      metrics: setting.metrics[condition.id], coverage: setting.coverage[condition.id], cost: null,
      latency: Number.isFinite(setting.metrics[condition.id].meanLatencyMs) ? setting.metrics[condition.id].meanLatencyMs / 1000 : null,
      tokens: setting.metrics[condition.id].meanOutputTokens };
  }));
  const pairs = settings.map(setting => ({ baseline: aggregates.find(item => item.settingId === setting.id && item.condition === 'baseline').exactScore,
    treatment: aggregates.find(item => item.settingId === setting.id && item.condition === 'skill').exactScore })).filter(pair => Number.isFinite(pair.baseline) && Number.isFinite(pair.treatment));
  const summary = { baseline: round(mean(pairs.map(pair => pair.baseline))), treatment: round(mean(pairs.map(pair => pair.treatment))),
    delta: round(mean(pairs.map(pair => pair.treatment - pair.baseline))), usablePairs: pairs.length, expectedPairs: settingCount,
    wins: pairs.filter(pair => pair.treatment > pair.baseline).length, ties: pairs.filter(pair => pair.treatment === pair.baseline).length,
    losses: pairs.filter(pair => pair.treatment < pair.baseline).length };
  const coverage = { benchmarkCount: 1, caseCount: 1, settingCount, completedSettingCount: pairs.length,
    responseCount: responses.filter(response => response.runtime).length, expectedResponseCount,
    scoredResponseCount: cells.filter(cell => Number.isFinite(cell.exactScore)).length, usablePairs: pairs.length, expectedPairs: settingCount,
    judgmentCount: responses.reduce((sum, response) => sum + response.judgments.length, 0), expectedJudgmentCount: expectedResponseCount * PANEL.length,
    pairedJudgeCallCount: judgeRequests.filter(request => request.status === 'succeeded').length, expectedPairedJudgeCallCount,
    executionComplete: pairs.length === settingCount, executionStatus: pairs.length === settingCount ? 'complete' : 'in-progress' };
  const recovery = contract.technicalRecovery;
  const limitations = [recovery
    ? 'One prompt and one selected generation per condition describe this task, not general storytelling ability or repeated-run reliability. The disclosed technical replacements are not independent repeated trials.'
    : 'One prompt and one generation per condition describe this task, not general storytelling ability or repeated-run reliability.',
    'The two model judges share a provider and overlap with creator families; no human calibration or population confidence interval is claimed.',
    'The skill condition includes the complete frozen root and twists reference once. This does not isolate their separate effects or control for added input length.',
    'All declared settings and outcomes are retained. Missing responses and reviews do not become zero or enter a comparable rank.',
    recovery
      ? `The selected results occupy ${expectedResponseCount} answer slots and ${expectedPairedJudgeCallCount} paired-review slots. Technical recovery authorizes ${recovery.replacementGenerationIds.length + recovery.pendingGenerationIds.length} creator calls and ${recovery.replacementJudgmentIds.length + recovery.pendingJudgmentIds.length} paired reviewer calls; ${recovery.replacementGenerationIds.length + recovery.replacementJudgmentIds.length} superseded original attempts remain in immutable evidence, outside current scores. These are top-level benchmark CLI calls, not a verified count of underlying provider inference requests. Host automatic retries are zero; provider-internal retries and built-in instructions are not independently verified.`
      : `The ${expectedResponseCount + expectedPairedJudgeCallCount} planned top-level benchmark CLI calls comprise ${expectedResponseCount} creator calls and ${expectedPairedJudgeCallCount} paired reviewer calls, not a verified count of underlying provider inference requests. Host automatic retries are zero; provider-internal retries and built-in instructions are not independently verified.`,
    ...(recovery ? [`User-approved technical recovery replaces only the three skill answers with recorded tool errors and the two previously completed Astra ultra paired reviews. Every clean answer and review is retained unchanged, including the Astra ultra plain answer. Previously unattempted slots complete the declared roster. The original stopped run and all superseded attempts remain byte-preserved; replacement selection is not based on scores.`]
      : contract.coverageExtension ? [contract.sourceCohorts
      ? `All ${contract.coverageExtension.retainedConfigurationCount} previously published settings are retained unchanged. ${contract.coverageExtension.addedConfigurations.length} explicitly declared settings append ${contract.coverageExtension.additionalGenerationCount} creator calls and ${contract.coverageExtension.additionalJudgeRequestCount} paired reviewer calls; no retained setting was rerun or replaced.`
      : 'The original six-setting cohort is retained unchanged. Eight declared model-and-effort settings append 16 creator calls and 16 paired reviewer calls; no original setting was rerun or replaced.'] : [])];
  const availability = { status: 'development', verification: 'unverified', code: 'development-uncalibrated', message: 'Exploratory model-judged results',
    detail: `One prompt, ${settingCount} declared GPT and Claude model-and-effort settings, one plain/skill pair each, and two blinded paired judges.`,
    blockers: [{ code: 'human-calibration-pending', message: 'Human calibration pending.' }] };
  const scoreBasis = { id: `${PLOT_TWISTS_PAIRED_EDITION}:${contract.sourceSha256}`, edition: PLOT_TWISTS_PAIRED_EDITION,
    label: 'Plot twists · single-prompt paired panel', method: 'complete-paired-single-prompt-two-judge-mean-v2', unit: 'rubric-points',
    range: { minimum: 0, maximum: 100 }, benchmarkIds: [ID], taskCount: 1, trialsPerTask: 1, judgeCount: 2, judges: PANEL,
    dimensions, weights: Object.fromEntries(dimensions.map(item => [item.id, 25])), ratingMinimum: 0, ratingMaximum: 5,
    gates: null, caps: null, aggregation: 'mean-four-ratings-times-twenty-then-mean-two-judges', batchUnit: 'matched-pair',
    calibrationStatus: 'development-uncalibrated', panelMethod: 'Each judge rates four equally weighted criteria from 0 to 5. Mean rating × 20 gives an answer total; the two original judge totals are averaged. Both arms require both reviews to rank.',
    blinding: 'Opaque A/B labels conceal creator and condition identities; the second judge receives the opposite candidate order. Style may still reveal the condition.',
    sourceSha256: contract.sourceSha256, manifestSha256: contract.manifestSha256, coverage,
    uncertainty: { status: 'descriptive-single-generation', reason: limitations[0] } };
  const benchmark = { id: ID, trackId: 'storytelling', familyId: 'writing', category: 'writing', suite: 'Storytelling', name: 'Plot twists', title: 'Plot twists',
    description: `One brief science-fiction outline with major plot twists, compared across ${settingCount} GPT and Claude settings at their declared effort levels.`,
    taskKind: 'story-outline', prompt: contract.task.prompt, judging: { panel: PANEL, synthesizer: null }, limitations,
    detailHref: `benchmark-report.html#${ID}`, reportFragment: ID, evidenceKind: 'development', resultAvailability: availability,
    measured: { ...summary, complete: coverage.scoredResponseCount, total: expectedResponseCount, treatmentLabel: 'Storytelling skill', calibration: 'Human calibration pending' } };
  const cases = [{ id: contract.task.id, benchmarkId: ID, title: contract.task.title, prompt: contract.task.prompt, wordLimit: contract.task.wordLimit,
    rubric: contract.task.rubric.map(item => ({ ...item, dimensionId: item.id, weight: 25 })) }];
  const caseSummary = { caseId: contract.task.id, benchmarkId: ID, ...summary, complete: coverage.scoredResponseCount, total: expectedResponseCount,
    detailHref: `${benchmark.detailHref}/${contract.task.id}` };
  const counts = { families: 1, tracks: 1, benchmarks: 1, categories: 1, cases: 1, conditions: 2, settings: settingCount,
    resultEntries: expectedResponseCount, responses: coverage.responseCount, developmentResultSets: 1, eligibleResultSets: 0, withheldResultSets: 0 };
  return { kind: 'vasirbenchmark-writing-projection', schemaVersion: 1, trialCount: 1, caseLabel: 'prompt', trialLabel: 'Trial',
    program: { id: 'vasirbench', title: 'VasirBench', status: 'development', evidenceStatus: 'development', verification: 'unverified' },
    meta: { release: 'Plot twists · September 2026', status: availability.message, categories: 1, benchmarks: 1, settings: settingCount, conditions: 2, trials: 1, aggregateCells: expectedResponseCount, runs: recovery ? contract.sourceCohorts.length + 1 : contract.sourceCohorts?.length ?? (contract.coverageExtension ? 2 : 1), calibration: 0 },
    scoreBasis, conditions: CONDITIONS, categories: [{ id: 'writing', name: 'Writing', title: 'Writing', short: 'WRITE', weight: 1, color: '#b65a31', trackIds: ['storytelling'] }],
    families: [{ id: 'writing', title: 'Writing', description: 'Task-specific writing benchmarks.', trackIds: ['storytelling'] }],
    tracks: [{ id: 'storytelling', familyId: 'writing', title: 'Storytelling', description: 'Understanding and creating narrative.', benchmarkIds: [ID], resultAvailability: availability }],
    benchmarks: [benchmark], results: [{ benchmarkId: ID, runId: contract.runId, status: 'development', verification: 'unverified',
      baselineScore: summary.baseline, treatmentScore: summary.treatment, delta: summary.delta, responseCount: coverage.responseCount, matchedConfigurationCount: pairs.length, coverage }],
    settings, entries, benchmarkResults: aggregates, benchmarkSummaries: [{ benchmarkId: ID, runId: contract.runId, status: 'development', verification: 'unverified', evidenceKind: 'development',
      baselineLabel: 'Plain answer', treatmentLabel: 'Storytelling skill', ...summary, complete: coverage.scoredResponseCount, total: expectedResponseCount,
      completionLabel: 'scored responses', calibration: 'Human calibration pending', detailHref: benchmark.detailHref, sourceHref: null }],
    cases, caseResults: cells, caseSummaries: [caseSummary], trialSummaries: [{ ...caseSummary, trialNumber: 1 }],
    methodology: { sourceContract: contract, corpusSha256: contract.specificationSha256, rubricSha256: hash(JSON.stringify(contract.task.rubric)),
      skillSha256: contract.bundleSha256, corpus: [{ id: contract.task.id, title: contract.task.title, sha256: hash(contract.task.prompt) }],
      skillFiles: contract.skillFiles, ratingAnchors: contract.anchors, generationContract: 'The exact prompt is shared by every declared model-and-effort setting. Plain receives no skill material; skill receives the entire frozen root and twists reference inline once. Both use fresh sessions. No tool reads or old ten-trial edition evidence are claimed.',
      blinding: scoreBasis.blinding, limitations, execution: { runnerVersion: contract.runtimeVersion, runtimeInventory: JSON.stringify(contract.runtimeInventory),
        trialCount: 1, hostAutomaticRetries: 0, deliveryMode: 'frozen-inline-once',
        ...(contract.runtimeValidationErratum ? { validationErratumVersion: contract.runtimeValidationErratum.version,
          validationErratumSha256: contract.runtimeValidationErratum.sha256, validationErratumPurpose: contract.runtimeValidationErratum.purpose,
          validationErratumAdditionalInferenceCalls: contract.runtimeValidationErratum.additionalInferenceCalls,
          ...(contract.coverageExtension ? { validationErratumCohort: 'original six-setting cohort' } : {}) } : {}),
        ...(contract.coverageExtension ? { coverageExtensionVersion: contract.coverageExtension.version,
          coverageExtensionPurpose: contract.coverageExtension.purpose, parentSnapshotSha256: contract.coverageExtension.parentSnapshotSha256,
          parentManifestSha256: contract.coverageExtension.parentManifestSha256, supplementalManifestSha256: contract.manifestSha256,
          retainedSettingCount: contract.coverageExtension.retainedConfigurationCount, additionalSettingCount: contract.coverageExtension.addedConfigurations.length,
          additionalCreatorCalls: contract.coverageExtension.additionalGenerationCount, additionalPairedReviewerCalls: contract.coverageExtension.additionalJudgeRequestCount,
          executionValidationPolicyVersion: contract.executionValidationPolicy.version, executionValidationPolicySha256: contract.executionValidationPolicy.sha256,
          executionValidationPolicyPurpose: contract.executionValidationPolicy.purpose } : {}),
        ...(contract.sourceCohorts ? { sourceCohorts: JSON.stringify(contract.sourceCohorts), coverageHistory: JSON.stringify(contract.coverageHistory) } : {}),
        ...(contract.toolIsolationPolicy ? { toolIsolationPolicyVersion: contract.toolIsolationPolicy.version,
          toolIsolationPolicySha256: contract.toolIsolationPolicy.sha256, toolIsolationPolicyPurpose: contract.toolIsolationPolicy.purpose,
          toolIsolationCodexConfig: JSON.stringify(contract.toolIsolationPolicy.codexConfig),
          ...(recovery ? { toolIsolationGenerationIds: JSON.stringify(contract.toolIsolationPolicy.generationIds),
            toolIsolationJudgmentIds: JSON.stringify(contract.toolIsolationPolicy.judgmentIds) }
            : { toolIsolationConfigurationIds: JSON.stringify(contract.toolIsolationPolicy.configurationIds) }),
          toolIsolationRejectToolRouterErrors: contract.toolIsolationPolicy.rejectToolRouterErrors,
          toolIsolationAppliesTo: contract.toolIsolationPolicy.appliesTo,
          toolIsolationHistoricalResultsReclassified: contract.toolIsolationPolicy.historicalResultsReclassified } : {}),
        ...(recovery ? { technicalRecoveryVersion: recovery.version, technicalRecoverySha256: recovery.sha256,
          technicalRecoverySourceSha256: recovery.sourceSnapshotSha256, technicalRecoverySourceManifestSha256: recovery.sourceManifestSha256,
          technicalRecoveryPurpose: recovery.purpose, technicalRecoveryApprovedAt: recovery.authorization.approvedAt,
          technicalRecoveryAuthorizationScope: recovery.authorization.scope,
          replacementGenerationIds: JSON.stringify(recovery.replacementGenerationIds), replacementJudgmentIds: JSON.stringify(recovery.replacementJudgmentIds),
          retainedGenerationCount: recovery.retainedGenerationCount, retainedJudgmentCount: recovery.retainedJudgmentCount,
          previouslyUnattemptedGenerationCount: recovery.pendingGenerationIds.length, previouslyUnattemptedJudgmentCount: recovery.pendingJudgmentIds.length,
          supersededOriginalAttemptsPreserved: true, scoreBasedReplacementSelection: false } : {}) },
      resourceAccounting: 'Generation resources belong to each answer. Each judge request assesses a pair; count requestId once when totaling judge usage. Missing usage remains unknown. Raw provider usage is retained in source artifacts; Claude receipts may include auxiliary claude-haiku-4-5 activity, which is not a scored story answer or another declared benchmark call.' },
    coverage, categoryLeaders: [], efficientFrontier: [], regressions: entries.filter(entry => entry.condition === 'skill' && entry.delta < 0),
    callouts: { overall: 'Plot twists contributes one equally weighted benchmark to the current Writing basis.', value: 'Quality, length and resources are separate outcomes.', regression: `All ${settingCount} declared settings and paired losses remain visible.`, category: 'One prompt; one plain/skill pair per declared model-and-effort setting.' },
    availability, counts };
}

export function projectPlotTwistsPairedRun({ snapshot, sourceSha256, headToHeadEvidence = null }) {
  validatePairedRunExport(snapshot);
  const contract = publicContract(snapshot, sourceSha256), dimensions = dimensionsFor(contract);
  const bundle = snapshot.manifest.frozenBundle;
  const promptFiles = [{ id: 'paired-skill-bundle', title: 'Exact frozen inline treatment', content: bundle.text, sha256: bundle.sha256, bytes: Buffer.byteLength(bundle.text) },
    ...bundle.files.map(file => ({ id: file.path === 'SKILL.md' ? 'paired-skill-root' : 'paired-skill-twists', title: file.path,
      content: file.content, sha256: file.sha256, bytes: Buffer.byteLength(file.content) }))];
  const judgeRequests = snapshot.judgments.map(judge => ({ id: judge.id, caseId: contract.task.id, trialNumber: 1,
    configurationId: judge.configurationId, judgeConfigurationId: judge.judgeConfigurationId, status: judge.status,
    ...(contract.coverageExtension ? { provenance: recordProvenance(contract, 'judgment', judge.id, judge.configurationId) } : {}),
    candidateMap: judge.candidateMap, candidateResponseHashes: judge.candidateResponseHashes,
    promptText: judge.promptText ?? null, promptSha256: judge.promptSha256 ?? null,
    outputText: judge.responseText ?? null, outputSha256: judge.outputSha256 ?? null,
    durationMs: judge.durationMs ?? null, usage: usage(judge.usage), attemptNumber: judge.attempt?.number ?? 0 }));
  const messageSets = new Map();
  const responses = snapshot.generations.map(row => {
    const setting = identity(contract.configurations.find(item => item.id === row.configurationId));
    const pairJudges = snapshot.judgments.filter(judge => judge.configurationId === row.configurationId && judge.status === 'succeeded');
    const judgments = row.status === 'succeeded' ? pairJudges.map(judge => {
      const candidateId = Object.keys(judge.candidateMap).find(label => judge.candidateMap[label] === row.condition);
      const assessment = judge.assessment[candidateId === 'A' ? 'assessmentA' : 'assessmentB'];
      const ratings = assessment.ratings;
      return { requestId: judge.id, judgeConfigurationId: judge.judgeConfigurationId, reviewerId: judge.judgeConfigurationId,
        candidateId, score: 20 * mean(ratings.map(rating => rating.score)),
        dimensions: Object.fromEntries(dimensions.map(dimension => { const rating = ratings.find(item => item.criterionId === dimension.id);
          return [dimension.id, { rating: rating.score, reason: rating.reason, evidence: rating.evidence }]; })),
        rationale: ratings.map(rating => rating.reason).join('\n'), promptSha256: judge.promptSha256, answerSha256: judge.outputSha256,
        resources: { scope: 'shared-matched-pair-batch', candidateCount: 2, durationMs: judge.durationMs ?? null, usage: usage(judge.usage) } };
    }) : [];
    const succeeded = row.status === 'succeeded', outputText = succeeded ? row.responseText : '';
    const exactMessages = row.exactMessages ?? [...(row.condition === 'skill' ? [{ role: setting.provider === 'codex' ? 'developer' : 'system', content: bundle.text }] : []), { role: 'user', content: contract.task.prompt }];
    const messages = exactMessages.map(message => message.content === bundle.text ? { role: message.role, content: 'Exact frozen inline skill material; see the shared source.', fileId: 'paired-skill-bundle' } : message);
    const messageSetId = hash(JSON.stringify(messages)); messageSets.set(messageSetId, { id: messageSetId, messages });
    const complete = succeeded && judgments.length === 2 && snapshot.generations.filter(item => item.configurationId === row.configurationId).every(item => item.status === 'succeeded');
    return { benchmarkId: ID, caseId: contract.task.id, trialNumber: 1, settingId: setting.id, configurationId: setting.configurationId,
      condition: row.condition, messageSetId, outputText, wordCount: succeeded ? words(outputText) : null, characterCount: succeeded ? Array.from(outputText).length : null,
      wordLimit: 550, wordLimitExceeded: succeeded ? words(outputText) > 550 : null,
      status: complete ? 'scored' : succeeded ? 'unscored' : row.status === 'pending' ? 'pending' : 'error',
      failureReason: succeeded || row.status === 'pending' ? null : 'The declared generation attempt failed; no replacement answer was selected.',
      judgments, score: complete ? round(mean(judgments.map(item => item.score))) : null,
      disagreement: judgments.length === 2 ? { scoreSpread: Math.abs(judgments[0].score - judgments[1].score),
        dimensionRanges: dimensions.map(item => ({ id: item.id, spread: Math.abs(judgments[0].dimensions[item.id].rating - judgments[1].dimensions[item.id].rating) })) } : null,
      provenance: { sourceSha256, manifestSha256: snapshot.manifestSha256, generationId: row.id, outputSha256: succeeded ? row.outputSha256 : null,
        ...recordProvenance(contract, 'generation', row.id, row.configurationId),
        questionSha256: hash(contract.task.prompt), skillSha256: row.condition === 'skill' ? bundle.sha256 : null,
        exactMessagesSha256: hash(JSON.stringify(exactMessages)), inputPayloadSha256: row.inputPayloadSha256 ?? null },
      runtime: succeeded ? { freshSession: true, durationMs: row.durationMs ?? null, usage: usage(row.usage), rawProviderStreamRetained: true,
        ...(contract.technicalRecovery ? { attemptNumber: row.attempt.number } : {}),
        modelVerification: row.runtimeReceipt?.terminalEvidence?.modelVerification ?? row.runtimeReceipt?.modelVerification ?? 'explicit-cli-request-only', reasoningVerification: 'explicit-cli-request-only',
        skillDelivery: row.condition === 'skill' ? 'frozen-inline-once' : null } : null };
  });
  const responseBundle = { kind: 'vasirbenchmark-writing-responses', schemaVersion: 1, benchmarkId: ID, edition: PLOT_TWISTS_PAIRED_EDITION,
    sourceContract: contract, promptFiles, messageSets: [...messageSets.values()], responses, judgeRequests };
  const projection = buildProjection(contract, responses, judgeRequests);
  if (headToHeadEvidence !== null) {
    requireEvidence(hash(JSON.stringify(headToHeadEvidence, null, 2) + '\n') === PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256,
      'head-to-head evidence artifact changed.');
    projection.headToHeads = [{ ...headToHeadEvidence.headToHead, evidenceSha256: PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256 }];
    responseBundle.headToHeads = structuredClone(projection.headToHeads);
  }
  const stub = { kind: 'vasirbenchmark-writing-summary', schemaVersion: 1, status: projection.coverage.scoredResponseCount ? 'measured' : 'unscored',
    dataHref: './writing-data.js', responsesHref: './writing-responses.js', category: { id: 'writing', name: 'Writing', short: 'WRITE' },
    benchmarkId: ID, benchmarkTitle: 'Plot twists', subsections: [{ id: 'storytelling', title: 'Storytelling', status: 'measured' }],
    coverage: projection.coverage, scoreBasisLabel: projection.scoreBasis.label, treatmentLabel: 'Storytelling skill' };
  validatePlotTwistsPairedPublication(projection, responseBundle);
  return { projection, responseBundle, stub, basisSha256: hash(JSON.stringify({ sourceSha256, manifestSha256: snapshot.manifestSha256, edition: PLOT_TWISTS_PAIRED_EDITION,
    ...(headToHeadEvidence ? { headToHeadEvidenceSha256: PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256 } : {}) })) };
}

export function validatePlotTwistsPairedPublication(projection, responseBundle) {
  const contract = projection?.methodology?.sourceContract;
  validateContract(contract);
  validateHeadToHeads(projection, responseBundle);
  const { headToHeads: _headToHeads, ...scoredProjection } = projection;
  const models = contract.configurations.map(item => item.id), answerCount = models.length * CONDITIONS.length;
  const requestCount = models.length * PANEL.length;
  requireEvidence(projection.scoreBasis?.edition === PLOT_TWISTS_PAIRED_EDITION && same(projection.scoreBasis.dimensions, dimensionsFor(contract))
    && same(projection.scoreBasis.judges, PANEL) && projection.trialCount === 1 && projection.cases.length === 1
    && same(projection.settings.map(item => item.configurationId), models) && projection.caseResults.length === answerCount, 'public task, roster, or scoring contract changed.');
  requireEvidence(projection.coverage.judgmentCount === 2 * projection.coverage.pairedJudgeCallCount,
    'completed paired reviews no longer match their two answer assessments.');
  for (const cell of projection.caseResults) {
    requireEvidence(same(Object.keys(cell.dimensions), dimensionsFor(contract).map(item => item.id))
      && Object.values(cell.dimensions).every(value => value === null || Number.isFinite(value)
        && value >= 0 && value <= 5 && Number.isInteger(value * 2)), 'public dimension means left the declared scale.');
    requireEvidence([0, 1, 2].includes(cell.coverage.completedJudgments)
      && [0, 1].includes(cell.coverage.completedResponses), 'public answer coverage changed.');
    const expected = cell.coverage.completedJudgments === 2 ? 20 * mean(Object.values(cell.dimensions)) : null;
    requireEvidence(cell.exactScore === expected && cell.score === round(expected), 'public dimension arithmetic changed.');
    const aggregate = projection.benchmarkResults.find(item => item.settingId === cell.settingId && item.condition === cell.condition);
    const entry = projection.entries.find(item => item.settingId === cell.settingId && item.condition === cell.condition);
    requireEvidence(aggregate?.exactScore === cell.exactScore && entry?.exactScore === cell.exactScore, 'public setting aggregate changed.');
  }
  if (!responseBundle) {
    // The lazy projection retains dimension means and coverage, sufficient to
    // reconstruct its displayed aggregates. Original per-judge evidence is
    // checked below whenever the response archive is available.
    const evidence = projection.caseResults.map(cell => ({ ...cell,
      runtime: cell.coverage.completedResponses ? { durationMs: cell.latencyMs,
        usage: { inputTokens: cell.inputTokens, outputTokens: cell.outputTokens, totalTokens: cell.totalTokens } } : null,
      judgments: Array.from({ length: cell.coverage.completedJudgments }, () => ({ score: cell.exactScore,
        dimensions: Object.fromEntries(Object.entries(cell.dimensions).map(([id, rating]) => [id, { rating }])) })) }));
    const requests = Array.from({ length: requestCount }, (_, index) => ({ status: index < projection.coverage.pairedJudgeCallCount ? 'succeeded' : 'pending' }));
    requireEvidence(same(scoredProjection, buildProjection(contract, evidence, requests)), 'public aggregates differ from their retained dimension means and coverage.');
    return projection;
  }
  requireEvidence(responseBundle.kind === 'vasirbenchmark-writing-responses' && responseBundle.edition === PLOT_TWISTS_PAIRED_EDITION
    && same(responseBundle.sourceContract, contract) && responseBundle.responses.length === answerCount && responseBundle.judgeRequests.length === requestCount, 'public evidence inventory changed.');
  requireEvidence(new Set(responseBundle.responses.map(item => `${item.configurationId}:${item.condition}`)).size === answerCount
    && responseBundle.responses.every(item => models.includes(item.configurationId) && ['baseline', 'skill'].includes(item.condition)
      && item.benchmarkId === ID && item.caseId === contract.task.id && item.trialNumber === 1
      && item.settingId === identity(contract.configurations.find(setting => setting.id === item.configurationId)).id), 'public answer identities changed.');
  requireEvidence(new Set(responseBundle.judgeRequests.map(item => item.id)).size === requestCount
    && new Set(responseBundle.judgeRequests.map(item => `${item.configurationId}:${item.judgeConfigurationId}`)).size === requestCount
    && responseBundle.judgeRequests.every(item => models.includes(item.configurationId) && PANEL.includes(item.judgeConfigurationId)), 'public judge inventory changed.');
  if (contract.coverageExtension) for (const request of responseBundle.judgeRequests)
    requireEvidence(same(request.provenance, recordProvenance(contract, 'judgment', request.id, request.configurationId)), 'paired review original record provenance changed.');
  if (contract.technicalRecovery) for (const request of responseBundle.judgeRequests) {
    const expectedAttempt = request.status === 'pending' ? 0 : request.provenance.recordDisposition === 'technical-replacement' ? 2 : 1;
    requireEvidence(request.attemptNumber === expectedAttempt, 'paired review technical-recovery attempt number changed.');
  }
  const files = new Map(responseBundle.promptFiles.map(file => [file.id, file]));
  requireEvidence(files.size === 3 && files.get('paired-skill-bundle')?.sha256 === contract.bundleSha256, 'inline treatment identity changed.');
  for (const file of files.values()) requireEvidence(hash(file.content) === file.sha256 && Buffer.byteLength(file.content) === file.bytes, 'frozen skill bytes changed.');
  for (const source of contract.skillFiles) {
    const file = files.get(source.path === 'SKILL.md' ? 'paired-skill-root' : 'paired-skill-twists');
    requireEvidence(file?.sha256 === source.sha256 && file.bytes === source.bytes, 'individual frozen treatment file changed.');
  }
  requireEvidence(files.get('paired-skill-bundle').content === contract.skillFiles.map(source =>
    `--- Frozen skill file: ${source.path} ---\n${files.get(source.path === 'SKILL.md' ? 'paired-skill-root' : 'paired-skill-twists').content}`).join('\n\n'), 'inline treatment no longer contains the entire frozen files once.');
  for (const setting of contract.configurations) {
    const requests = responseBundle.judgeRequests.filter(item => item.configurationId === setting.id);
    requireEvidence(requests.length === 2 && requests.every(item => same(Object.keys(item.candidateMap).sort(), ['A', 'B'])
      && same(Object.values(item.candidateMap).sort(), ['baseline', 'skill'])) && requests[0].candidateMap.A !== requests[1].candidateMap.A, 'paired candidate orders changed.');
    const generations = responseBundle.responses.filter(item => item.configurationId === setting.id).map(item => ({ condition: item.condition,
      status: item.runtime ? 'succeeded' : 'pending', responseText: item.outputText, outputSha256: item.provenance.outputSha256 }));
    for (const request of requests.filter(item => item.status === 'succeeded')) {
      requireEvidence(same(request.candidateResponseHashes, Object.fromEntries(['A', 'B'].map(label => [label,
        generations.find(item => item.condition === request.candidateMap[label]).outputSha256]))), 'review candidate answer hashes changed.');
      requireEvidence(request.promptText === buildPairedJudgePrompt({ specification: { benchmark: contract.task,
        judging: { instructions: contract.judgeInstructions }, scoring: { anchors: contract.anchors } }, candidateMap: request.candidateMap, generations }), 'original judge input differs from the exact task and answers.');
      // Public modules are also evaluated in a VM. Normalize both inputs into
      // this realm before the frozen runtime's prototype-strict comparisons.
      validatePairedAssessment(JSON.parse(request.outputText), JSON.parse(JSON.stringify(contract.task)));
    }
  }
  for (const response of responseBundle.responses) {
    const messages = responseBundle.messageSets.find(item => item.id === response.messageSetId);
    requireEvidence(messages && hash(JSON.stringify(messages.messages)) === messages.id, 'public message identity changed.');
    const originals = messages.messages.map(message => message.fileId ? { role: message.role, content: files.get(message.fileId)?.content } : message);
    requireEvidence(hash(JSON.stringify(originals)) === response.provenance.exactMessagesSha256, 'original effective input changed.');
    const configuration = contract.configurations.find(item => item.id === response.configurationId);
    const expectedMessages = [...(response.condition === 'skill' ? [{ role: configuration.provider === 'codex' ? 'developer' : 'system', content: files.get('paired-skill-bundle').content }] : []),
      { role: 'user', content: contract.task.prompt }];
    requireEvidence(same(originals, expectedMessages) && response.provenance.skillSha256 === (response.condition === 'skill' ? contract.bundleSha256 : null), 'plain or skill input contract changed.');
    requireEvidence(response.provenance.sourceSha256 === contract.sourceSha256 && response.provenance.manifestSha256 === contract.manifestSha256
      && response.provenance.questionSha256 === hash(contract.task.prompt), 'answer source identity changed.');
    if (contract.coverageExtension) for (const [key, value] of Object.entries(recordProvenance(contract, 'generation', response.provenance.generationId, response.configurationId)))
      requireEvidence(response.provenance[key] === value, 'answer original record provenance changed.');
    if (contract.technicalRecovery) {
      requireEvidence(response.provenance.generationId === slotId('generation', response.configurationId, contract.task.id, response.condition),
        'technical recovery changed an answer slot identity.');
      requireEvidence(same(Object.keys(response.provenance), ['sourceSha256', 'manifestSha256', 'generationId', 'outputSha256',
        ...Object.keys(recordProvenance(contract, 'generation', response.provenance.generationId, response.configurationId)),
        'questionSha256', 'skillSha256', 'exactMessagesSha256', 'inputPayloadSha256']), 'technical recovery answer provenance has undeclared claims.');
      if (response.runtime) requireEvidence(response.runtime.attemptNumber === (response.provenance.recordDisposition === 'technical-replacement' ? 2 : 1),
        'answer technical-recovery attempt number changed.');
    }
    if (response.runtime) requireEvidence(hash(response.outputText) === response.provenance.outputSha256 && words(response.outputText) === response.wordCount
      && Array.from(response.outputText).length === response.characterCount && response.wordLimitExceeded === (response.wordCount > 550), 'original answer bytes changed.');
    else requireEvidence(response.outputText === '' && response.score === null && response.judgments.length === 0, 'failed or pending generation became a scored answer.');
    requireEvidence(new Set(response.judgments.map(item => item.judgeConfigurationId)).size === response.judgments.length
      && response.judgments.every(item => PANEL.includes(item.judgeConfigurationId)), 'a judge seat was duplicated or replaced.');
    for (const judge of response.judgments) {
      const request = responseBundle.judgeRequests.find(item => item.id === judge.requestId);
      requireEvidence(request?.status === 'succeeded' && hash(request.promptText) === request.promptSha256 && hash(request.outputText) === request.outputSha256
        && request.configurationId === response.configurationId && request.judgeConfigurationId === judge.judgeConfigurationId
        && request.candidateMap[judge.candidateId] === response.condition, 'original paired review identity changed.');
      const original = JSON.parse(request.outputText)[judge.candidateId === 'A' ? 'assessmentA' : 'assessmentB'];
      requireEvidence(original?.ratings?.length === 4 && original.ratings.every(rating => Number.isInteger(rating.score) && rating.score >= 0 && rating.score <= 5), 'original review ratings changed.');
      requireEvidence(judge.score === 20 * mean(original.ratings.map(rating => rating.score)), 'original review total changed.');
      requireEvidence(judge.rationale === original.ratings.map(rating => rating.reason).join('\n') && judge.promptSha256 === request.promptSha256
        && judge.answerSha256 === request.outputSha256, 'original review explanation or provenance changed.');
      for (const rating of original.ratings) requireEvidence(same(judge.dimensions[rating.criterionId], { rating: rating.score, reason: rating.reason, evidence: rating.evidence }), 'original review text or dimension changed.');
    }
    requireEvidence(response.score === (response.status === 'scored' ? round(mean(response.judgments.map(item => item.score))) : null), 'public response panel total changed.');
  }
  requireEvidence(same(scoredProjection, buildProjection(contract, responseBundle.responses, responseBundle.judgeRequests)), 'public projection differs from original paired evidence.');
  return projection;
}

export function buildPlotTwistsPairedPublication({ repoRootDirectory, selection, readFileSyncImplementation = fs.readFileSync }) {
  requireEvidence(selection?.kind === PLOT_TWISTS_PAIRED_SOURCE_KIND && selection.schemaVersion === 1 && selection.edition === PLOT_TWISTS_PAIRED_EDITION,
    'unsupported paired source selection.');
  const pin = selection.snapshot;
  requireEvidence(typeof pin?.path === 'string' && !path.isAbsolute(pin.path) && !pin.path.includes('\\')
    && pin.path.split('/').every(part => part && part !== '..' && part !== '.') && /^[a-f0-9]{64}$/.test(pin.sha256 ?? ''), 'unsafe or unpinned paired source.');
  const bytes = readFileSyncImplementation(path.join(repoRootDirectory, pin.path), 'utf8');
  requireEvidence(hash(bytes) === pin.sha256, 'selected immutable paired source changed.');
  let headToHeadEvidence = null;
  if (pin.sha256 === HEAD_TO_HEAD_SOURCE_SHA256) {
    const evidenceBytes = readFileSyncImplementation(path.join(repoRootDirectory, PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_PATH), 'utf8');
    requireEvidence(hash(evidenceBytes) === PLOT_TWISTS_HEAD_TO_HEAD_EVIDENCE_SHA256, 'pinned head-to-head sidecar bytes changed.');
    headToHeadEvidence = JSON.parse(evidenceBytes);
  }
  const built = projectPlotTwistsPairedRun({ snapshot: JSON.parse(bytes), sourceSha256: pin.sha256, headToHeadEvidence });
  requireEvidence(built.projection.coverage.completedSettingCount === built.projection.settings.length,
    'the public measurement requires all declared pairs to be complete.');
  return built;
}

export function preparePlotTwistsPairedPublicationSource({ repoRootDirectory, runDirectory }) {
  const snapshot = exportPairedRun({ runDirectoryPath: runDirectory });
  validatePairedRunExport(snapshot);
  const text = `${JSON.stringify(snapshot, null, 2)}\n`, sha256 = hash(text);
  const projection = projectPlotTwistsPairedRun({ snapshot, sourceSha256: sha256 }).projection;
  requireEvidence(projection.coverage.completedSettingCount === projection.settings.length,
    'all declared pairs require their original two reviews before publication.');
  const relative = `.agents/vasir-evals/${PLOT_TWISTS_PAIRED_EDITION}/publication-snapshots/${sha256}/snapshot.json`;
  const filename = path.join(repoRootDirectory, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (fs.existsSync(filename)) assert.equal(fs.readFileSync(filename, 'utf8'), text, 'An immutable paired source already differs.');
  else fs.writeFileSync(filename, text, { flag: 'wx' });
  return { kind: PLOT_TWISTS_PAIRED_SOURCE_KIND, schemaVersion: 1, edition: PLOT_TWISTS_PAIRED_EDITION, snapshot: { path: relative, sha256 } };
}
