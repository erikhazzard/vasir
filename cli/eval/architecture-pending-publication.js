import crypto from 'node:crypto';
import path from 'node:path';
import { VasirCliError } from '../cli-error.js';

const CONFIGURATION_ID = 'codex:gpt-6.1-sol@xhigh';
const SETTING_ID = 'codex-gpt-6-1-sol-xhigh';
const PANEL = ['codex:gpt-6-astra@xhigh', 'claude:claude-fable-5-1@max'];
const HASH = /^[a-f0-9]{64}$/;
const digest = content => crypto.createHash('sha256').update(content).digest('hex');
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const conditions = { clean: 'baseline', 'skill:plan__question-spec-architecture': 'skill' };

function requireEvidence(condition, message) {
  if (!condition) throw new VasirCliError({ code: 'BENCHMARK_PUBLISH_EVIDENCE_INELIGIBLE',
    message: `Pending architecture evidence: ${message}`, suggestion: 'Use the pinned incomplete checkpoints without changing the original scored selections.' });
}

function requireFields(record, fields) {
  requireEvidence(record && typeof record === 'object' && !Array.isArray(record) && equal(Object.keys(record).sort(), [...fields].sort()), 'the public appendix contains unsupported or missing fields.');
}

function validateFreshCodexReceipt(receipt) {
  requireEvidence(receipt?.cli === 'codex' && receipt.freshSession === true && receipt.persistedSession === false && receipt.nonMessageItemCount === 0,
    'a saved response or review lacks its fresh, tool-free native receipt.');
}

export function validatePendingArchitectureSelections(selections, selectedRuns) {
  requireEvidence(Array.isArray(selections) && selections.length === 3 && new Set(selections.map(selection => selection.benchmarkId)).size === 3,
    'select one pending checkpoint for each architecture task.');
  for (const selection of selections) {
    requireEvidence(equal(Object.keys(selection).sort(), ['benchmarkId', 'runPath', 'sha256']) && selectedRuns.some(parent => parent.benchmarkId === selection.benchmarkId), 'a pending selection has an unknown task or field.');
    requireEvidence(typeof selection.runPath === 'string' && selection.runPath.startsWith('.agents/vasir-evals/') && selection.runPath.endsWith('/run.json') && !selection.runPath.split('/').some(part => !part || part === '..' || part === '.') && !selection.runPath.includes('\\') && HASH.test(selection.sha256),
      'a checkpoint path or digest is invalid.');
  }
}

// This is a response appendix. It never creates scored cells or supplies inputs
// to the Engineering/Overall aggregators, and cannot replace the fixed panel.
export function buildPendingArchitecturePublication({ selections, selectedRuns, runRecords, repoRootDirectory, readFileSyncImplementation, projectJudgment, validateMessages, validateJudgment, containsPrivatePath }) {
  if (!selections) return null;
  validatePendingArchitectureSelections(selections, selectedRuns);
  const tasks = [], responses = [], messageSets = new Map();
  for (const selection of selections) {
    const checkpointText = readFileSyncImplementation(path.join(repoRootDirectory, selection.runPath), 'utf8');
    requireEvidence(digest(checkpointText) === selection.sha256, 'a pending checkpoint no longer matches its immutable digest.');
    const checkpoint = JSON.parse(checkpointText);
    const parent = runRecords.get(selection.benchmarkId)?.run;
    const parentSelection = selectedRuns.find(candidate => candidate.benchmarkId === selection.benchmarkId);
    requireEvidence(parent && checkpoint.benchmark?.definition?.id === selection.benchmarkId && checkpoint.runStatus === 'incomplete' && checkpoint.judging?.status !== 'complete', 'a pending checkpoint is missing, complete, or misidentified.');
    requireEvidence(equal(checkpoint.benchmark, parent.benchmark) && equal(checkpoint.treatment, parent.treatment) && equal(checkpoint.conditions, parent.conditions) && checkpoint.scorerVersion === parent.scorerVersion,
      'the frozen task, treatment, condition, or scorer changed.');
    requireEvidence(checkpoint.harnessVersion === parent.harnessVersion && ['trialCount', 'neutralHarnessInstruction', 'freshAgentSessions', 'promptModeOverrides'].every(field => equal(checkpoint.generation[field], parent.generation[field])) && ['strategy', 'freshContext', 'blinded', 'calibrationStatus'].every(field => equal(checkpoint.judging[field], parent.judging[field])), 'the generation or independent-panel contract changed.');
    requireEvidence(checkpoint.extension?.sourceRunId === parent.runId && checkpoint.extension.sourceRowCount === parent.rows.length && equal(checkpoint.extension.extendedConfigurationIds, [CONFIGURATION_ID]), 'the checkpoint does not extend its selected parent with the requested model.');
    requireEvidence(parent.rows.length === 104 && checkpoint.rows.length === 106 && equal(checkpoint.rows.slice(0, 104), parent.rows) && equal(checkpoint.configurations.slice(0, parent.configurations.length), parent.configurations), 'incumbent responses or configurations changed.');
    requireEvidence(equal(checkpoint.configurations.at(-1), { id: CONFIGURATION_ID, provider: 'codex', model: 'gpt-6.1-sol', reasoning: 'xhigh' }) && checkpoint.configurations.length === parent.configurations.length + 1, 'the appended model identity changed.');
    const addedRows = checkpoint.rows.slice(104);
    requireEvidence(equal(addedRows.map(row => row.conditionId).sort(), Object.keys(conditions).sort()), 'the saved pair is missing or duplicated.');
    const judges = checkpoint.judging.judges;
    requireEvidence(equal(judges.map(judge => judge.configuration.id), PANEL) && equal(checkpoint.judging.judgeConfigurations.map(judge => judge.id), PANEL) && checkpoint.judging.synthesizerConfiguration === null,
      'the original independent panel changed.');
    const [astra, fable] = judges;
    requireEvidence(astra.status === 'complete' && astra.batches.length === 1 && fable.status !== 'complete' && !(fable.evaluations?.length) && (fable.batches ?? []).every(batch => batch.status !== 'complete' && !batch.evaluations?.length), 'the pending panel must retain exactly one completed paired review.');
    const batch = astra.batches[0];
    validateFreshCodexReceipt(batch.runtimeReceipt);
    requireEvidence(batch.status === 'complete' && equal(batch.configuration, astra.configuration) && digest(batch.promptText) === batch.promptHash && digest(JSON.stringify(batch.evaluations)) === batch.evaluationHash && equal(batch.evaluations, astra.evaluations) && batch.evaluations.length === 2,
      'the original Astra review or its hashes changed.');
    const nativeReview = JSON.parse(batch.outputText.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    requireEvidence(nativeReview.evaluations?.length === 2 && new Set(nativeReview.evaluations.map(evaluation => evaluation.candidateId)).size === 2, 'the native paired review is incomplete or duplicated.');
    for (const row of addedRows) {
      requireEvidence(row.configurationId === CONFIGURATION_ID && row.provider === 'codex' && row.model === 'gpt-6.1-sol' && row.reasoning === 'xhigh' && row.rowStatus === 'complete' && row.trialNumber === 1 && row.score === null && row.scoreBasisHash === null && HASH.test(row.basisHash), 'a pending answer changed identity, completion state, or final score.');
      validateFreshCodexReceipt(row.runtimeReceipt);
      const frozenReference = parent.rows.find(candidate => candidate.configurationId === PANEL[0] && candidate.conditionId === row.conditionId && candidate.caseId === row.caseId && candidate.trialNumber === row.trialNumber);
      requireEvidence(frozenReference && equal(row.exactMessages, frozenReference.exactMessages) && row.promptText === frozenReference.promptText, 'an answer did not use the original frozen prompt.');
      validateMessages(row.exactMessages, `${selection.benchmarkId}.pending.messages`);
      requireEvidence(typeof row.outputText === 'string' && row.outputText.trim() && !containsPrivatePath(row.outputText), 'an answer is empty or exposes private provenance.');
      const evaluation = batch.evaluations.find(candidate => candidate.rowKey === row.rowKey);
      const nativeEvaluation = nativeReview.evaluations.find(candidate => candidate.candidateId === evaluation?.candidateId);
      const { evaluationHash, ...evaluationBody } = evaluation ?? {};
      requireEvidence(evaluation && nativeEvaluation && digest(JSON.stringify(evaluationBody)) === evaluationHash && batch.candidateIds.includes(evaluation.candidateId) && checkpoint.judging.candidateOrder.some(candidate => candidate.rowKey === row.rowKey && candidate.candidateId === evaluation.candidateId), 'an answer lost its original review identity.');
      requireEvidence(equal(evaluation.gates.map(({ id, status }) => ({ id, status })), nativeEvaluation.gates.map(({ id, status }) => ({ id, status }))) && equal(evaluation.dimensions.map(({ id, rating }) => ({ id, rating })), nativeEvaluation.dimensions.map(({ id, rating }) => ({ id, rating }))) && evaluation.reason === nativeEvaluation.reason.trim(), 'a normalized judgment differs from the native review.');
      const task = checkpoint.benchmark.definition.cases.find(candidate => candidate.id === row.caseId);
      requireEvidence(batch.promptText.includes(`<candidate id="${evaluation.candidateId}" case="${row.caseId}">\n<task>${task.task}</task>\n<answer>${row.outputText}</answer>\n</candidate>`), 'the review did not receive this exact saved answer.');
      const messages = row.exactMessages.map(({ role, content }) => ({ role, content }));
      const messageSetId = digest(JSON.stringify(messages));
      messageSets.set(messageSetId, { id: messageSetId, messages });
      responses.push({ benchmarkId: selection.benchmarkId, settingId: SETTING_ID, configurationId: CONFIGURATION_ID,
        condition: conditions[row.conditionId], trialNumber: 1, messageSetId, outputText: row.outputText,
        judgments: [projectJudgment({ evaluation, benchmarkId: selection.benchmarkId, rowKey: row.rowKey, judgeConfigurationId: PANEL[0] })],
        status: 'unscored', score: null, coverage: { completedJudgments: 1, expectedJudgments: 2 },
        provenance: { sourceSha256: selection.sha256, outputSha256: digest(row.outputText), promptSha256: digest(row.promptText) } });
    }
    tasks.push({ benchmarkId: selection.benchmarkId, sourceSha256: selection.sha256, parentSourceSha256: parentSelection.sha256,
      completedResponses: 2, expectedResponses: 2, completedReviewRequests: 1, expectedReviewRequests: 2, completedJudgments: 2, expectedJudgments: 4 });
  }
  const responseBundle = { kind: 'vasirbenchmark-architecture-pending-responses', status: 'pending-review', messageSets: [...messageSets.values()], responses };
  const projection = { kind: 'vasirbenchmark-architecture-pending', status: 'pending-review', configurationId: CONFIGURATION_ID,
    settingId: SETTING_ID, label: 'GPT-6.1 Sol · xhigh', benchmarkIds: tasks.map(task => task.benchmarkId),
    expectedJudgeConfigurationIds: PANEL, pendingJudgeConfigurationIds: [PANEL[1]],
    sourceSha256: digest(JSON.stringify(tasks.map(({ benchmarkId, sourceSha256 }) => ({ benchmarkId, sourceSha256 })))),
    responsesSha256: digest(JSON.stringify(responseBundle)), tasks,
    counts: { responses: 6, completedReviewRequests: 3, expectedReviewRequests: 6, pendingReviewRequests: 3, completedJudgments: 6, expectedJudgments: 12 } };
  validatePendingArchitecturePublication(projection, responseBundle, { validateMessages, validateJudgment, containsPrivatePath });
  return { projection, responseBundle, basisSha256: projection.sourceSha256 };
}

export function validatePendingArchitecturePublication(projection, responseBundle, { validateMessages, validateJudgment, containsPrivatePath } = {}) {
  requireFields(projection, ['kind', 'status', 'configurationId', 'settingId', 'label', 'benchmarkIds', 'expectedJudgeConfigurationIds', 'pendingJudgeConfigurationIds', 'sourceSha256', 'responsesSha256', 'tasks', 'counts']);
  requireEvidence(projection?.kind === 'vasirbenchmark-architecture-pending' && projection.status === 'pending-review' && projection.configurationId === CONFIGURATION_ID && projection.settingId === SETTING_ID && equal(projection.expectedJudgeConfigurationIds, PANEL) && equal(projection.pendingJudgeConfigurationIds, [PANEL[1]]) && projection.tasks?.length === 3 && new Set(projection.benchmarkIds).size === 3 && equal(projection.benchmarkIds, projection.tasks.map(task => task.benchmarkId)) && HASH.test(projection.responsesSha256), 'the public pending descriptor is invalid.');
  requireEvidence(equal(projection.counts, { responses: 6, completedReviewRequests: 3, expectedReviewRequests: 6, pendingReviewRequests: 3, completedJudgments: 6, expectedJudgments: 12 }) && projection.tasks.every(task => HASH.test(task.sourceSha256) && HASH.test(task.parentSourceSha256) && task.completedResponses === 2 && task.expectedResponses === 2 && task.completedReviewRequests === 1 && task.expectedReviewRequests === 2 && task.completedJudgments === 2 && task.expectedJudgments === 4) && projection.sourceSha256 === digest(JSON.stringify(projection.tasks.map(({ benchmarkId, sourceSha256 }) => ({ benchmarkId, sourceSha256 })))), 'pending coverage or immutable source identity changed.');
  for (const task of projection.tasks) requireFields(task, ['benchmarkId', 'sourceSha256', 'parentSourceSha256', 'completedResponses', 'expectedResponses', 'completedReviewRequests', 'expectedReviewRequests', 'completedJudgments', 'expectedJudgments']);
  if (!responseBundle) return projection;
  requireFields(responseBundle, ['kind', 'status', 'messageSets', 'responses']);
  requireEvidence(responseBundle.kind === 'vasirbenchmark-architecture-pending-responses' && responseBundle.status === 'pending-review' && digest(JSON.stringify(responseBundle)) === projection.responsesSha256 && responseBundle.responses?.length === 6, 'the pending answer appendix changed.');
  const identities = new Set();
  requireEvidence(Array.isArray(responseBundle.messageSets) && new Set(responseBundle.messageSets.map(messageSet => messageSet.id)).size === responseBundle.messageSets.length, 'message sets are missing or duplicated.');
  for (const messageSet of responseBundle.messageSets) {
    requireFields(messageSet, ['id', 'messages']);
    validateMessages(messageSet.messages, 'architecturePending.messages');
    requireEvidence(digest(JSON.stringify(messageSet.messages)) === messageSet.id && responseBundle.responses.some(response => response.messageSetId === messageSet.id), 'a pending message set changed or is unreferenced.');
  }
  for (const response of responseBundle.responses) {
    requireFields(response, ['benchmarkId', 'settingId', 'configurationId', 'condition', 'trialNumber', 'messageSetId', 'outputText', 'judgments', 'status', 'score', 'coverage', 'provenance']);
    requireFields(response.provenance, ['sourceSha256', 'outputSha256', 'promptSha256']);
    const identity = `${response.benchmarkId}:${response.condition}`;
    const task = projection.tasks.find(candidate => candidate.benchmarkId === response.benchmarkId);
    const messageSet = responseBundle.messageSets.find(candidate => candidate.id === response.messageSetId);
    requireEvidence(task && !identities.has(identity) && ['baseline', 'skill'].includes(response.condition) && response.configurationId === CONFIGURATION_ID && response.settingId === SETTING_ID && response.trialNumber === 1 && response.score === null && response.status === 'unscored' && equal(response.coverage, { completedJudgments: 1, expectedJudgments: 2 }) && response.judgments.length === 1 && response.judgments[0].judgeConfigurationId === PANEL[0], 'a pending response became scored, duplicated, or misidentified.');
    requireEvidence(messageSet && digest(JSON.stringify(messageSet.messages)) === response.messageSetId && digest(response.outputText) === response.provenance.outputSha256 && response.provenance.sourceSha256 === task.sourceSha256 && HASH.test(response.provenance.promptSha256), 'public pending output, messages, or source hashes changed.');
    requireEvidence(typeof response.outputText === 'string' && response.outputText.trim() && !containsPrivatePath(response.outputText), 'a public answer exposes private provenance or is empty.');
    validateJudgment(response.judgments[0], 'architecturePending.judgments');
    identities.add(identity);
  }
  return projection;
}
