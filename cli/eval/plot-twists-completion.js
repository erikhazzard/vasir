import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBenchmarkHash, createBenchmarkGenerationHash, createBenchmarkScoringHash } from './benchmark-source.js';
import { resolveBenchmarkConfigurations } from './benchmark-models.js';
import { isBenchmarkAgentRuntimeReceiptCompatible } from './agent-runtime.js';
import { createStorytellingSkillInstruction, isStorytellingRequiredSkillReadReceiptCompatible, runStorytellingAgent, validateStorytellingSkillSnapshot,
  STORYTELLING_RUNTIME_VERSION, STORYTELLING_READ_TOOL_RUNTIME_VERSION, STORYTELLING_MCP_RUNTIME_VERSION,
  STORYTELLING_READ_TOOL_POLICY_VERSION, STORYTELLING_MCP_POLICY_VERSION } from './storytelling-agent-runtime.js';
import { generateBenchmarkRows, createBenchmarkPairs, createBenchmarkSummary } from './run-benchmark-eval.js';
import { judgeBenchmarkRows } from './benchmark-judge.js';
import { identifyStorytellingJudgeQuotaExhaustion, isStorytellingGenerationOutputPolicyBlocked } from './run-storytelling-benchmark.js';

export const TWISTS_COMPLETION_VERSION = 'plot-twists-completion-v1';
export const TWISTS_PARENT_SHA256 = '97d1172df61311ca493c53ef99d193d607652de9bc0827bba2d3d6ca3fb41399';
export const TWISTS_PARENT_DIRECTORY = '.agents/vasir-evals/storytelling-plot-twists/storytelling-plot-twists-v1-2026-09-07';
export const TWISTS_COMPLETION_CONFIGURATIONS = [
  ...['gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra'].flatMap(model => ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(effort => `codex:${model}@${effort}`)),
  ...['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `codex:gpt-5.6-luna@${effort}`),
  ...['claude-fable-5-1', 'claude-opus-5'].flatMap(model => ['low', 'medium', 'high', 'xhigh', 'max'].map(effort => `claude:${model}@${effort}`))
];
const RECOVERIES = new Set([
  'codex:gpt-6-astra@ultra::scifi-outline::trial-9::skill:writing-storytelling',
  'codex:gpt-5.6-terra@ultra::scifi-outline::trial-3::skill:writing-storytelling'
]);
const REQUIRED = ['SKILL.md', 'references/twists-and-revelations.md'];
const clone = value => structuredClone(value);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const objectHash = createBenchmarkHash;
const requireThat = (condition, message) => { if (!condition) throw new Error(`Plot twists completion: ${message}`); };
const generationEvidence = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['score', 'scoreBasisHash'].includes(key)));
const batchKey = batch => `${batch.configuration.id}:${batch.promptHash}`;
const batches = judging => (judging?.judges || []).flatMap(judge => judge.batches || []);
const instructionTransport = row => row.provider === 'claude' ? 'read-tool' : 'mcp-chunks';
const transportPolicy = { 'read-tool': STORYTELLING_READ_TOOL_POLICY_VERSION, 'mcp-chunks': STORYTELLING_MCP_POLICY_VERSION };
const transportRuntime = { legacy: STORYTELLING_RUNTIME_VERSION, 'read-tool': STORYTELLING_READ_TOOL_RUNTIME_VERSION, 'mcp-chunks': STORYTELLING_MCP_RUNTIME_VERSION };
const WRITING_ISOLATION = { version: 'writing-frozen-workspace-only-v1', hostSkillDiscovery: false, projectInstructions: false, externalResources: false, fileScope: 'fresh-workspace-only' };
const SOURCE_FILES = ['plot-twists-completion.js', 'storytelling-agent-runtime.js', 'frozen-chunk-mcp-source.js', 'agent-runtime.js', 'benchmark-judge.js', 'benchmark-source.js', 'benchmark-models.js', 'run-benchmark-eval.js', 'run-storytelling-benchmark.js'];
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const runtimeSourcePins = () => SOURCE_FILES.map(name => ({ path: `cli/eval/${name}`, sha256: hash(fs.readFileSync(path.join(sourceDirectory, name))) }));

function rowPlans(run) {
  return run.configurations.flatMap(configuration => Array.from({ length: 10 }, (_, index) => run.conditions.map(condition => {
    const caseDefinition = run.benchmark.definition.cases[0];
    return { configuration, caseDefinition, condition, trialNumber: index + 1,
      rowKey: `${configuration.id}::${caseDefinition.id}::trial-${index + 1}::${condition.id}`,
      promptText: caseDefinition.task, exactMessages: [{ role: 'user', content: caseDefinition.task }],
      basisHash: hash([run.benchmark.generationHash, configuration.id, caseDefinition.id, 10, '', run.harnessVersion, condition.hash].join(':')) };
  })).flat());
}

function pendingRow(plan, predecessor = null) {
  return { rowKey: plan.rowKey, configurationId: plan.configuration.id, modelId: `${plan.configuration.provider}:${plan.configuration.model}`,
    provider: plan.configuration.provider, model: plan.configuration.model, reasoning: plan.configuration.reasoning,
    caseId: plan.caseDefinition.id, trialNumber: plan.trialNumber, conditionId: plan.condition.id,
    rowStatus: 'pending', promptText: plan.promptText, exactMessages: plan.exactMessages, basisHash: plan.basisHash,
    outputText: null, outputHash: null, usage: null, costUsd: null, durationMs: null, runtimeReceipt: null,
    score: null, scoreBasisHash: null, error: null, attempts: clone(predecessor?.attempts || []) };
}

export function createTwistsCompletion({ parentSource, snapshot, runId, frozenAt = new Date().toISOString() }) {
  requireThat(hash(parentSource) === TWISTS_PARENT_SHA256, 'parent source is not the pinned original run');
  requireThat(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId || ''), 'invalid new run ID');
  validateStorytellingSkillSnapshot(snapshot);
  const parent = JSON.parse(parentSource);
  requireThat(snapshot.hash === parent.treatment.hash, 'frozen skill differs from parent');
  const definition = clone(parent.benchmark.definition);
  definition.edition = 'storytelling-plot-twists-v1-cohort-completion-2026-09-08';
  definition.coverage = { ...definition.coverage, configurationCount: 33, generationRowCount: 660, judgeRequestCount: 660, individualAnswerAssessmentCount: 1320,
    selectionTiming: 'The expanded cohort and operational recovery policy were declared after the original four-setting run and before new dispatch.' };
  definition.preRegistration = { ...definition.preRegistration, modelSelectors: [...TWISTS_COMPLETION_CONFIGURATIONS],
    cohortExtension: { parentSourceSha256: TWISTS_PARENT_SHA256, declaration: TWISTS_COMPLETION_VERSION, originalDeclarationRetained: true } };
  definition.limitations = [...definition.limitations,
    'The 33-setting completion cohort was declared after the original four-setting run. Valid original answers and reviews are reused; only two invalid mandatory-read attempts are replaced, with their original evidence retained. New Codex contestants use a local read-only integer-indexed MCP chunk tool; new Claude contestants use a verified Read transport. These separately versioned operational instructions expose identical frozen skill bytes but differ from the original read scaffold. Both new arms use identical provider isolation settings that explicitly disable host skill discovery, project instructions and external resources. Inherited receipts retain their original isolation evidence.'];
  const run = { ...clone(parent), runId, benchmark: { ...clone(parent.benchmark), definition, hash: createBenchmarkHash(definition) },
    configurations: resolveBenchmarkConfigurations({ requestedModelArguments: TWISTS_COMPLETION_CONFIGURATIONS }),
    startedAt: frozenAt, completedAt: null, lastCheckpointAt: frozenAt, runStatus: 'incomplete',
    storytelling: { ...clone(parent.storytelling), runnerVersion: TWISTS_COMPLETION_VERSION },
    executionHistory: [], attempts: [], rows: [], pairs: [], summary: {} };
  const parentRows = new Map(parent.rows.map(row => [row.rowKey, row]));
  const origins = rowPlans(run).map(plan => {
    const prior = parentRows.get(plan.rowKey);
    if (prior) requireThat(prior.rowStatus === 'complete' || RECOVERIES.has(prior.rowKey) && prior.error?.code === 'EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE', 'unapproved parent recovery');
    run.rows.push(prior?.rowStatus === 'complete' ? clone(prior) : pendingRow(plan, prior));
    return { rowKey: plan.rowKey, kind: prior ? prior.rowStatus === 'complete' ? 'inherited' : 'recovery' : 'new',
      parentGenerationSha256: prior ? objectHash(generationEvidence(prior)) : null,
      transport: prior?.rowStatus === 'complete' ? 'legacy' : instructionTransport(plan.configuration) };
  });
  const manifest = { version: TWISTS_COMPLETION_VERSION, runId, frozenAt, parentSourceSha256: TWISTS_PARENT_SHA256,
    runtimeSources: runtimeSourcePins(),
    newCreatorIsolation: clone(WRITING_ISOLATION),
    skillHash: snapshot.hash, benchmarkHash: run.benchmark.hash, generationHash: parent.benchmark.generationHash, scoringHash: parent.benchmark.scoringHash,
    configurations: clone(run.configurations), trialCount: 10, origins,
    dispatchPolicy: 'cleanup-two-invalid-treatment-slots-first; preserve-all-valid-outputs-and-reviews; no-quality-based-retries',
    transport: { codex: transportPolicy['mcp-chunks'], claude: transportPolicy['read-tool'] } };
  run.storytelling.manifestHash = objectHash(manifest);
  run.completion = { version: TWISTS_COMPLETION_VERSION, manifest, parentSource,
    failedAttempts: parent.rows.filter(row => RECOVERIES.has(row.rowKey)).map(clone), generationDispatches: [], generationAttempts: [], judgeAttempts: [] };
  summarize(run);
  validateTwistsCompletion({ run, snapshot });
  return { run, manifest, snapshot: clone(snapshot) };
}

function summarize(run) {
  run.pairs = createBenchmarkPairs({ rows: run.rows, treatmentId: run.treatment.id });
  run.summary = createBenchmarkSummary({ rows: run.rows, pairs: run.pairs, configurations: run.configurations, treatmentId: run.treatment.id, judging: run.judging });
  run.summary.rowCounts.pending = run.rows.filter(row => ['pending', 'running'].includes(row.rowStatus)).length;
  run.summary.originalFailedAttempts = 2;
  run.summary.retainedGenerationAttemptCount = run.completion?.generationAttempts.length || 0;
  run.summary.unresolvedDispatchCount = (run.completion?.generationDispatches || []).filter(dispatch => !run.completion.generationAttempts.some(attempt => attempt.id === dispatch.id)).length;
  run.runStatus = run.rows.every(row => row.rowStatus === 'complete' && row.score) && run.judging.status === 'complete' ? 'complete' : 'incomplete';
}

export function validateTwistsCompletion({ run, snapshot }) {
  const completion = run?.completion;
  requireThat(completion?.version === TWISTS_COMPLETION_VERSION && hash(completion.parentSource || '') === TWISTS_PARENT_SHA256, 'missing or changed original source');
  const parent = JSON.parse(completion.parentSource);
  const manifest = completion.manifest;
  validateStorytellingSkillSnapshot(snapshot);
  requireThat(manifest?.version === TWISTS_COMPLETION_VERSION && manifest.trialCount === 10 && run.storytelling?.runnerVersion === TWISTS_COMPLETION_VERSION && run.storytelling.manifestHash === objectHash(manifest) && run.runId === manifest.runId, 'manifest identity changed');
  requireThat(Array.isArray(manifest.runtimeSources) && JSON.stringify(manifest.runtimeSources.map(pin => pin.path)) === JSON.stringify(SOURCE_FILES.map(name => `cli/eval/${name}`)) && manifest.runtimeSources.every(pin => /^[a-f0-9]{64}$/.test(pin.sha256)), 'frozen runtime source inventory is invalid');
  requireThat(objectHash(manifest.newCreatorIsolation) === objectHash(WRITING_ISOLATION), 'new creator isolation declaration changed');
  requireThat(manifest.parentSourceSha256 === TWISTS_PARENT_SHA256 && manifest.skillHash === snapshot.hash && snapshot.hash === parent.treatment.hash && objectHash(run.treatment) === objectHash(parent.treatment), 'treatment changed');
  requireThat(objectHash(run.conditions) === objectHash(parent.conditions) && run.generation.trialCount === 10 && run.generation.orderSeed === parent.generation.orderSeed, 'condition or trial plan changed');
  requireThat(run.benchmark.hash === createBenchmarkHash(run.benchmark.definition) && run.benchmark.hash === manifest.benchmarkHash,
    'completion benchmark definition changed');
  requireThat(createBenchmarkGenerationHash(run.benchmark.definition) === parent.benchmark.generationHash && run.benchmark.generationHash === parent.benchmark.generationHash && manifest.generationHash === parent.benchmark.generationHash,
    'frozen exact user task changed');
  requireThat(createBenchmarkScoringHash(run.benchmark.definition) === parent.benchmark.scoringHash && run.benchmark.scoringHash === parent.benchmark.scoringHash && manifest.scoringHash === parent.benchmark.scoringHash,
    'frozen rubric or judge panel changed');
  requireThat(objectHash(run.configurations) === objectHash(manifest.configurations) && objectHash(run.configurations) === objectHash(resolveBenchmarkConfigurations({ requestedModelArguments: TWISTS_COMPLETION_CONFIGURATIONS })), '33-setting inventory changed');
  requireThat(objectHash(completion.failedAttempts) === objectHash(parent.rows.filter(row => RECOVERIES.has(row.rowKey))), 'original failed attempts changed');
  const oldRows = new Map(parent.rows.map(row => [row.rowKey, row]));
  const origins = new Map(manifest.origins.map(origin => [origin.rowKey, origin]));
  const rows = new Map(run.rows.map(row => [row.rowKey, row]));
  requireThat(rows.size === 660 && run.rows.length === 660 && origins.size === 660 && manifest.origins.length === 660, 'planned logical slots changed');
  const attemptIds = new Set();
  const dispatches = new Map();
  for (const dispatch of completion.generationDispatches) {
    const { sha256, ...body } = dispatch;
    requireThat(!dispatches.has(dispatch.id) && sha256 === objectHash(body) && rows.has(dispatch.rowKey) && origins.get(dispatch.rowKey).kind !== 'inherited', 'generation dispatch lineage changed');
    dispatches.set(dispatch.id, dispatch);
  }
  for (const record of completion.generationAttempts) {
    const { sha256, ...body } = record;
    requireThat(!attemptIds.has(record.id) && sha256 === objectHash(body) && rows.has(record.rowKey), 'attempt lineage changed or duplicated');
    attemptIds.add(record.id);
    requireThat(record.generation.rowKey === record.rowKey && origins.get(record.rowKey).kind !== 'inherited', 'attempt targets an inherited valid answer');
    const dispatch = dispatches.get(record.id);
    requireThat(dispatch?.rowKey === record.rowKey && dispatch.invocationId === record.invocationId && dispatch.previousGenerationSha256 === record.previousGenerationSha256, 'attempt lacks its retained pre-dispatch record');
  }
  for (const record of completion.judgeAttempts) {
    const { sha256, ...body } = record;
    requireThat(sha256 === objectHash(body) && (record.status !== 'returned' || hash(record.result.text) === record.outputSha256), 'retained judge attempt changed');
  }
  for (const plan of rowPlans(run)) {
    const row = rows.get(plan.rowKey), origin = origins.get(plan.rowKey), prior = oldRows.get(plan.rowKey);
    requireThat(row && origin && row.configurationId === plan.configuration.id && row.provider === plan.configuration.provider && row.model === plan.configuration.model && row.reasoning === plan.configuration.reasoning && row.trialNumber === plan.trialNumber && row.conditionId === plan.condition.id && row.caseId === plan.caseDefinition.id && row.promptText === plan.promptText && objectHash(row.exactMessages) === objectHash(plan.exactMessages) && row.basisHash === plan.basisHash, `logical slot changed: ${plan.rowKey}`);
    const expectedKind = prior ? prior.rowStatus === 'complete' ? 'inherited' : 'recovery' : 'new';
    requireThat(origin.kind === expectedKind && origin.parentGenerationSha256 === (prior ? objectHash(generationEvidence(prior)) : null) && origin.transport === (expectedKind === 'inherited' ? 'legacy' : instructionTransport(plan.configuration)), 'source lineage or transport changed');
    if (origin.kind === 'inherited') {
      requireThat(objectHash(generationEvidence(row)) === origin.parentGenerationSha256, 'valid inherited answer or receipt was replaced');
      if (prior.score) requireThat(objectHash(row.score) === objectHash(prior.score) && row.scoreBasisHash === prior.scoreBasisHash, 'original valid score changed');
    }
    else {
      const records = completion.generationAttempts.filter(record => record.rowKey === row.rowKey);
      let predecessor = generationEvidence(pendingRow(plan, prior));
      for (const record of records) {
        requireThat(record.previousGenerationSha256 === objectHash(predecessor), 'generation attempt chain is broken');
        requireThat(predecessor.rowStatus !== 'complete' && !predecessor.outputText?.trim(), 'a returned answer was regenerated');
        requireThat(record.generation.attempts.length === predecessor.attempts.length + 1 && objectHash(record.generation.attempts.slice(0, -1)) === objectHash(predecessor.attempts), 'generation attempt history was rewritten');
        predecessor = record.generation;
      }
      const last = records.at(-1);
      if (last) requireThat(objectHash(generationEvidence(row)) === objectHash(last.generation), 'current generation differs from latest retained attempt');
      else requireThat(objectHash(generationEvidence(row)) === objectHash(generationEvidence(pendingRow(plan, prior))), 'unrecorded generation appeared');
      if (prior) requireThat(RECOVERIES.has(row.rowKey) && objectHash(row.attempts.slice(0, prior.attempts.length)) === objectHash(prior.attempts), 'failed predecessor history lost');
    }
    if (row.rowStatus === 'complete') {
      requireThat(typeof row.outputText === 'string' && row.outputText.trim() && hash(row.outputText) === row.outputHash && row.runtimeReceipt?.outputSha256 === row.outputHash, 'answer bytes changed');
      requireThat(isBenchmarkAgentRuntimeReceiptCompatible({ configuration: plan.configuration, runtimeReceipt: row.runtimeReceipt }) && row.runtimeReceipt.freshSession === true && row.runtimeReceipt.userPromptSha256 === hash(plan.promptText), 'fresh exact-context receipt missing');
      requireThat(row.runtimeReceipt.runtimeVersion === transportRuntime[origin.transport], 'creator runtime differs from declared transport');
      if (origin.kind !== 'inherited') {
        requireThat(row.runtimeReceipt.requiredSkillReadTransport === origin.transport && objectHash(row.runtimeReceipt.writingIsolation || {}) === objectHash(WRITING_ISOLATION), 'new creator lacks its declared isolated transport');
        if (origin.transport === 'read-tool') requireThat(JSON.stringify(row.runtimeReceipt.allowedTools) === JSON.stringify(['Read']) && row.runtimeReceipt.fileToolScope === 'restricted-working-directory', 'Claude creator tool scope changed');
        if (origin.transport === 'mcp-chunks') requireThat(row.runtimeReceipt.localReadTool === 'benchmark_reader.read_chunk' && row.runtimeReceipt.localReadToolScope === 'frozen-chunk-indices-only', 'Codex chunk tool scope changed');
      }
      const skill = plan.condition.type === 'skill';
      requireThat(row.runtimeReceipt.skillHash === (skill ? snapshot.hash : null), 'wrong treatment exposure');
      if (skill) {
        requireThat(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles: REQUIRED, receipt: row.runtimeReceipt.requiredSkillReads }), 'required read incomplete');
        const instruction = createStorytellingSkillInstruction({ skillSnapshot: snapshot, skillDirectoryPath: '<frozen-skill-directory>', requiredSkillFiles: REQUIRED,
          ...(origin.kind !== 'inherited' ? { requiredSkillReadTransport: origin.transport } : {}) });
        requireThat(row.runtimeReceipt.instructionHash === hash(instruction), 'runtime instruction changed');
        if (origin.kind !== 'inherited') requireThat(row.runtimeReceipt.requiredSkillReads.policyVersion === transportPolicy[origin.transport], 'new answer used an undeclared read transport');
      } else requireThat(row.runtimeReceipt.instructionHash === null, 'plain arm received a treatment instruction');
    }
  }
  const currentBatches = new Map(batches(run.judging).map(batch => [batchKey(batch), batch]));
  for (const oldBatch of batches(parent.judging)) requireThat(currentBatches.has(batchKey(oldBatch)) && objectHash(currentBatches.get(batchKey(oldBatch))) === objectHash(oldBatch), 'original completed judge batch changed or disappeared');
  const oldBatchKeys = new Set(batches(parent.judging).map(batchKey));
  for (const batch of currentBatches.values()) if (batch.status === 'complete' && !oldBatchKeys.has(batchKey(batch))) {
    requireThat(completion.judgeAttempts.some(attempt => attempt.status === 'returned' && attempt.configurationId === batch.configuration.id && attempt.promptSha256 === batch.promptHash && attempt.result.text === batch.outputText && objectHash(attempt.result.runtimeReceipt) === objectHash(batch.runtimeReceipt)), 'new judge batch lacks its retained provider attempt');
    requireThat(batch.runtimeReceipt?.runtimeVersion === STORYTELLING_RUNTIME_VERSION && batch.runtimeReceipt.freshSession === true && batch.runtimeReceipt.skillHash === null && batch.runtimeReceipt.instructionHash === null && batch.runtimeReceipt.nonMessageItemCount === 0 && batch.runtimeReceipt.userPromptSha256 === batch.promptHash && batch.runtimeReceipt.outputSha256 === hash(batch.outputText), 'judge no-skill runtime or evidence changed');
  }
  return { parent, manifest };
}

export function eligibleCompletionPlans(run, { stage = 'cleanup', retryFailed = false, maxRows = null } = {}) {
  requireThat(['cleanup', 'codex', 'claude', 'all'].includes(stage), 'unknown execution stage');
  const origins = new Map(run.completion.manifest.origins.map(origin => [origin.rowKey, origin]));
  const rows = new Map(run.rows.map(row => [row.rowKey, row]));
  return rowPlans(run).filter(plan => {
    const origin = origins.get(plan.rowKey), row = rows.get(plan.rowKey);
    if (origin.kind === 'inherited' || row.rowStatus === 'complete' || row.outputText?.trim()) return false;
    if (row.error?.code === 'AUTH_UNAVAILABLE' || row.error?.code === 'EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE' ||
      identifyStorytellingJudgeQuotaExhaustion({ error: row.error, configuration: plan.configuration }) ||
      isStorytellingGenerationOutputPolicyBlocked({ error: row.error, configuration: plan.configuration })) return false;
    if (run.completion.generationDispatches.some(dispatch => dispatch.rowKey === row.rowKey && !run.completion.generationAttempts.some(attempt => attempt.id === dispatch.id))) return false;
    if (stage === 'cleanup' && origin.kind !== 'recovery' || ['codex', 'claude'].includes(stage) && plan.configuration.provider !== stage) return false;
    return row.rowStatus === 'pending' || retryFailed && ['error', 'unavailable'].includes(row.rowStatus);
  }).sort((left, right) => Number(origins.get(right.rowKey).kind === 'recovery') - Number(origins.get(left.rowKey).kind === 'recovery')
    || hash(`${run.generation.orderSeed}:${left.rowKey}`).localeCompare(hash(`${run.generation.orderSeed}:${right.rowKey}`))).slice(0, maxRows ?? Infinity);
}

function preserveCompletedBatches(previous, incoming) {
  const preserved = new Map(batches(previous).filter(batch => batch.status === 'complete').map(batch => [batchKey(batch), batch]));
  for (const judge of incoming.judges || []) for (let index = 0; index < (judge.batches || []).length; index++) {
    const candidate = judge.batches[index], prior = preserved.get(batchKey(candidate));
    if (prior) {
      // The shared planner renumbers ephemeral batch positions when new pairs
      // enter the cohort. Neither that index nor its reuse flag is evidence.
      // Restore the entire original saved object after checking every other bit.
      const { reused: ignoredPrior, batchId: priorPosition, ...a } = prior, { reused: ignoredCandidate, batchId: candidatePosition, ...b } = candidate;
      requireThat(objectHash(a) === objectHash(b), `judge attempted to replace completed evidence (${Object.keys({ ...a, ...b }).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).join(', ')})`);
      judge.batches[index] = clone(prior);
      preserved.delete(batchKey(candidate));
    } else judge.batches[index] = { ...candidate, batchId: `completion-${candidate.promptHash}` };
  }
  requireThat(preserved.size === 0, 'judge checkpoint dropped completed evidence');
  return incoming;
}

export async function executeTwistsCompletion({ run, snapshot, mode = 'generation', stage = 'cleanup', concurrency = 2, maxRows = null,
  retryFailed = false, dispatch = false, agentRunnerImplementation = runStorytellingAgent, onCheckpoint = () => {}, shouldPause = () => false, now = () => new Date().toISOString() }) {
  requireThat(dispatch === true, 'execution requires an explicit dispatch decision');
  requireThat(['generation', 'judging'].includes(mode) && Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 16, 'invalid execution mode or concurrency');
  requireThat(maxRows === null || Number.isInteger(maxRows) && maxRows > 0, 'invalid maximum row count');
  requireThat(mode !== 'judging' || maxRows === null, 'maxRows limits generation only; judge mode reuses completed reviews and fills missing reviews');
  validateTwistsCompletion({ run, snapshot });
  requireThat(objectHash(run.completion.manifest.runtimeSources) === objectHash(runtimeSourcePins()), 'runtime source changed after this edition was frozen; do not silently resume under different code');
  const invocation = { id: crypto.randomUUID(), startedAt: now(), mode, stage, concurrency, retryFailed, selectedGenerationRowCount: 0, providerCalls: 0, quotaStops: [] };
  run.executionHistory.push(invocation);
  const circuits = new Set();
  const stopped = configuration => circuits.has(configuration.provider) || circuits.has(configuration.id.split('@')[0]);
  let saving = Promise.resolve();
  const save = event => {
    saving = saving.then(async () => { run.lastCheckpointAt = now(); summarize(run); run.completedAt = run.runStatus === 'complete' ? run.completedAt || run.lastCheckpointAt : null; await onCheckpoint({ run, event }); });
    return saving;
  };
  const call = async args => {
    invocation.providerCalls++;
    try { return await agentRunnerImplementation(args); }
    catch (error) {
      const quota = identifyStorytellingJudgeQuotaExhaustion({ error, configuration: args.configuration });
      if (quota) {
        const key = quota.reason === 'model-usage-limit-reached' ? args.configuration.id.split('@')[0] : args.configuration.provider;
        circuits.add(key); invocation.quotaStops.push({ key, configurationId: args.configuration.id, ...quota });
      }
      if (error.code === 'AUTH_UNAVAILABLE') {
        circuits.add(args.configuration.provider);
        invocation.quotaStops.push({ key: args.configuration.provider, configurationId: args.configuration.id, reason: 'authentication-unavailable' });
      }
      throw error;
    }
  };
  await save('started');
  if (mode === 'generation') {
    const selected = eligibleCompletionPlans(run, { stage, retryFailed, maxRows });
    invocation.selectedGenerationRowCount = selected.length;
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, async () => {
      while (next < selected.length && !shouldPause()) {
        const plan = selected[next++];
        if (stopped(plan.configuration)) continue;
        const index = run.rows.findIndex(row => row.rowKey === plan.rowKey), prior = run.rows[index];
        const startedAt = now(), id = crypto.randomUUID();
        const dispatchRecord = { id, invocationId: invocation.id, rowKey: plan.rowKey, startedAt, previousGenerationSha256: objectHash(generationEvidence(prior)) };
        run.completion.generationDispatches.push({ ...dispatchRecord, sha256: objectHash(dispatchRecord) });
        await save('generation-dispatched');
        await generateBenchmarkRows({ rowPlans: [plan], concurrency: 1, agentRunnerImplementation: args => call({ ...args,
          privateAudit: { invocationId: invocation.id, generationAttemptId: id, rowKey: plan.rowKey },
          skillSnapshot: plan.condition.type === 'skill' ? snapshot : null,
          ...(plan.condition.type === 'skill' ? { requiredSkillFiles: REQUIRED } : {}),
          requiredSkillReadTransport: instructionTransport(plan.configuration) }),
          onRowComplete: async row => {
            row.outputHash = typeof row.outputText === 'string' ? hash(row.outputText) : null;
            if (row.rowStatus === 'complete' && !row.outputText?.trim()) {
              row.rowStatus = 'error'; row.error = { code: 'EVAL_STORYTELLING_EMPTY_OUTPUT', message: 'No final answer was returned.' };
            }
            if (row.rowStatus === 'complete' && plan.condition.type === 'skill' && !isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles: REQUIRED, receipt: row.runtimeReceipt?.requiredSkillReads })) {
              row.rowStatus = 'error'; row.error = { code: 'EVAL_STORYTELLING_REQUIRED_READ_INCOMPLETE', message: 'Required frozen reads were incomplete; returned answer retained and excluded. No automatic replacement is permitted.' };
            }
            const attempt = { number: prior.attempts.length + 1, status: row.rowStatus, startedAt, completedAt: now(), error: row.error, usage: row.usage, durationMs: row.durationMs, costUsd: row.costUsd };
            row.attempts = [...clone(prior.attempts), attempt];
            const record = { id, invocationId: invocation.id, rowKey: row.rowKey, previousGenerationSha256: objectHash(generationEvidence(prior)), generation: clone(generationEvidence(row)) };
            run.completion.generationAttempts.push({ ...record, sha256: objectHash(record) });
            run.rows[index] = row;
            await save('generation-complete');
          } });
      }
    }));
  } else {
    const rows = run.rows.filter(row => row.rowStatus === 'complete' && run.rows.some(other => other.configurationId === row.configurationId && other.trialNumber === row.trialNumber && other.conditionId !== row.conditionId && other.rowStatus === 'complete'));
    const priorJudging = clone(run.judging);
    const judged = await judgeBenchmarkRows({ benchmarkDefinition: run.benchmark.definition, rows, priorJudging, judgeConcurrency: concurrency,
      agentRunnerImplementation: async args => {
        if (stopped(args.configuration) || shouldPause()) {
          const error = new Error('Execution paused or provider quota circuit is open; no request attempted.'); error.code = 'EVAL_BENCHMARK_JUDGE_DEFERRED'; throw error;
        }
        try {
          const result = await call({ ...args, privateAudit: { invocationId: invocation.id, role: 'judge' } });
          const record = { invocationId: invocation.id, configurationId: args.configuration.id, promptSha256: hash(args.promptText), outputSha256: hash(result.text), status: 'returned', result: clone(result) };
          run.completion.judgeAttempts.push({ ...record, sha256: objectHash(record) });
          return result;
        } catch (error) {
          const record = { invocationId: invocation.id, configurationId: args.configuration.id, promptSha256: hash(args.promptText), status: 'error', error: { code: error.code || null, message: error.message, context: error.context || null } };
          run.completion.judgeAttempts.push({ ...record, sha256: objectHash(record) });
          throw error;
        }
      }, judgingCheckpointImplementation: async checkpoint => {
        run.judging = preserveCompletedBatches(priorJudging, checkpoint.judging);
        await save('judging-checkpoint');
      } });
    run.judging = preserveCompletedBatches(priorJudging, judged.judging);
    for (const row of run.rows) if (judged.scoresByRowKey.has(row.rowKey)) row.score = judged.scoresByRowKey.get(row.rowKey);
  }
  invocation.completedAt = now();
  invocation.paused = shouldPause();
  validateTwistsCompletion({ run, snapshot });
  await save('finished');
  return { runId: run.runId, runStatus: run.runStatus, summary: run.summary, invocation };
}

const atomicJson = (file, value) => { const temporary = `${file}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); fs.renameSync(temporary, file); };

// Capture the real child streams before the Claude runtime's canonical-result
// adapter. These private files never enter the contestant's fresh workspace.
export function createRetainedTwistsAgentRunner({ directory, spawnImplementation = childProcess.spawn }) {
  return async args => {
    const { privateAudit = null, ...runtimeArgs } = args;
    const callId = crypto.randomUUID(), streamDirectory = path.join(directory, 'provider-streams', callId);
    fs.mkdirSync(streamDirectory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(streamDirectory, 'call.json'), JSON.stringify({ callId, privateAudit, configuration: args.configuration, promptSha256: hash(args.promptText), skillHash: args.skillSnapshot?.hash ?? null, transport: args.requiredSkillReadTransport ?? 'command', startedAt: new Date().toISOString(), runtimeSources: runtimeSourcePins() }), { flag: 'wx', mode: 0o600 });
    const files = { stdout: path.join(streamDirectory, 'stdout.jsonl'), stderr: path.join(streamDirectory, 'stderr.txt') };
    const handles = Object.fromEntries(Object.entries(files).map(([kind, file]) => [kind, fs.openSync(file, 'wx', 0o600)]));
    let result, failure;
    try {
      result = await runStorytellingAgent({ ...runtimeArgs, spawnImplementation: (command, commandArguments, options) => {
        const child = spawnImplementation(command, commandArguments, options);
        child.stdout.on('data', chunk => fs.writeSync(handles.stdout, chunk));
        child.stderr.on('data', chunk => fs.writeSync(handles.stderr, chunk));
        return child;
      } });
    } catch (error) { failure = error; }
    finally { Object.values(handles).forEach(handle => fs.closeSync(handle)); }
    const evidence = Object.fromEntries(Object.entries(files).map(([kind, file]) => [kind, { path: path.relative(directory, file).split(path.sep).join('/'), sha256: hash(fs.readFileSync(file)), bytes: fs.statSync(file).size }]));
    const rawStreams = { callId, ...evidence };
    fs.writeFileSync(path.join(streamDirectory, 'receipt.json'), JSON.stringify(rawStreams), { flag: 'wx', mode: 0o600 });
    if (failure) { failure.context = { ...failure.context, rawStreams }; throw failure; }
    requireThat(result.runtimeReceipt.streamSha256 === evidence.stdout.sha256, 'retained raw stream differs from the runtime receipt');
    return { ...result, runtimeReceipt: { ...result.runtimeReceipt, rawStreams } };
  };
}

function validateRetainedFiles(run, directory) {
  const receipts = [...run.completion.generationAttempts.map(attempt => attempt.generation.runtimeReceipt?.rawStreams || attempt.generation.error?.context?.rawStreams),
    ...run.completion.judgeAttempts.map(attempt => attempt.result?.runtimeReceipt?.rawStreams || attempt.error?.context?.rawStreams)];
  for (const receipt of receipts.filter(Boolean)) for (const stream of [receipt.stdout, receipt.stderr]) {
    requireThat(/^provider-streams\/[a-f0-9-]+\/(stdout\.jsonl|stderr\.txt)$/.test(stream.path), 'unsafe private stream path');
    const contents = fs.readFileSync(path.join(directory, stream.path));
    requireThat(contents.length === stream.bytes && hash(contents) === stream.sha256, 'retained provider stream changed');
  }
}

export function prepareTwistsCompletionDirectory({ repoRootDirectory, runId, frozenAt }) {
  const parentDirectory = path.join(repoRootDirectory, TWISTS_PARENT_DIRECTORY);
  const prepared = createTwistsCompletion({ parentSource: fs.readFileSync(path.join(parentDirectory, 'run.json'), 'utf8'), snapshot: JSON.parse(fs.readFileSync(path.join(parentDirectory, 'skill-snapshot.json'), 'utf8')), runId, frozenAt });
  const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId);
  fs.mkdirSync(directory, { recursive: false, mode: 0o700 });
  fs.mkdirSync(path.join(directory, 'frozen-runtime'), { mode: 0o700 });
  for (const pin of prepared.manifest.runtimeSources) fs.copyFileSync(path.join(repoRootDirectory, pin.path), path.join(directory, 'frozen-runtime', path.basename(pin.path)), fs.constants.COPYFILE_EXCL);
  for (const [name, content] of [['manifest.json', prepared.manifest], ['skill-snapshot.json', prepared.snapshot], ['run.json', prepared.run]]) fs.writeFileSync(path.join(directory, name), `${JSON.stringify(content, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return { directory, run: prepared.run };
}

export async function resumeTwistsCompletionDirectory({ repoRootDirectory, runId, onProgress = () => {}, ...options }) {
  requireThat(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId || ''), 'invalid resume ID');
  const directory = path.join(repoRootDirectory, '.agents/vasir-evals/storytelling-plot-twists', runId), lock = path.join(directory, 'completion.lock');
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
  try {
    const run = JSON.parse(fs.readFileSync(path.join(directory, 'run.json'), 'utf8')), snapshot = JSON.parse(fs.readFileSync(path.join(directory, 'skill-snapshot.json'), 'utf8'));
    requireThat(run.runId === runId && objectHash(run.completion.manifest) === objectHash(JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))), 'saved manifest changed');
    validateRetainedFiles(run, directory);
    return await executeTwistsCompletion({ ...options, agentRunnerImplementation: createRetainedTwistsAgentRunner({ directory }), run, snapshot, onCheckpoint: ({ run, event }) => { atomicJson(path.join(directory, 'run.json'), run); onProgress({ event, at: run.lastCheckpointAt, rowCounts: run.summary.rowCounts, unresolvedDispatches: run.summary.unresolvedDispatchCount }); } });
  } finally { fs.unlinkSync(lock); }
}
