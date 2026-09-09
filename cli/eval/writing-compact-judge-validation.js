import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBenchmarkConfiguration } from './benchmark-models.js';
import { compactDigest, compactJudgeSchema, exportCompactRun, validateCompactAssessment,
  validateCompactRunExport } from './writing-compact-runtime.js';

export const COMPACT_JUDGE_VALIDATION_VERSION = 'writing-compact-judge-diagnostic-validation-v1';
const sourcePath = fileURLToPath(import.meta.url);
const filename = 'judge-validation.json';
const warningPrefix = 'Under-development features enabled: skip_host_skill_discovery. Under-development features are incomplete and may behave unpredictably. To suppress this warning, set `suppress_unstable_features_warning = true` in ';
export const COMPACT_JUDGE_DIAGNOSTIC_POLICY = Object.freeze({
  version: COMPACT_JUDGE_VALIDATION_VERSION,
  reason: 'The CLI emitted its skip_host_skill_discovery startup warning as an error item before the model turn. The original validator counted that diagnostic as a tool call. Reclassify only that exact diagnostic and validate the complete original review without another model call.',
  allowedWarningPrefix: warningPrefix, allowedWarningCount: 1,
  warningMustPrecedeTurn: true, requireOneCompleteTurn: true, toolsAllowed: false,
  otherErrorsAllowed: false, modifiesOriginalEvidence: false, additionalInferenceCalls: 0
});

function exactWarning(item) {
  if (item?.type !== 'error' || typeof item.message !== 'string' || !item.message.startsWith(warningPrefix)) return false;
  const suffix = item.message.slice(warningPrefix.length);
  if (!suffix.endsWith('/config.toml.') || /[\r\n]/.test(suffix)) return false;
  return path.posix.isAbsolute(suffix.slice(0, -1));
}

function verifyInvocation(record, configuration) {
  const receipt = record.runtimeReceipt, args = receipt.cliArguments;
  assert.equal(configuration.provider, 'codex');
  assert.equal(configuration.reasoning, 'medium');
  assert.ok(['gpt-6-astra', 'gpt-5.6-sol'].includes(configuration.model));
  assert.equal(receipt.cli, 'codex');
  assert.equal(receipt.requestedModel, configuration.model);
  assert.equal(receipt.requestedReasoning, configuration.reasoning);
  assert.equal(receipt.freshSession, true);
  assert.equal(receipt.persistedSession, false);
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.signal, null);
  assert.equal(receipt.rawStreamsRetained, true);
  assert.ok(Array.isArray(args));
  assert.equal(args[0], 'exec');
  assert.equal(args.at(-1), '-');
  assert.equal(args[args.indexOf('--model') + 1], configuration.model);
  assert.equal(args.filter(arg => arg === '--model').length, 1);
  for (const flag of ['--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--json', '--output-schema']) assert.ok(args.includes(flag));
  assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
  assert.equal(args[args.indexOf('skip_host_skill_discovery') - 1], '--enable');
  for (const feature of ['skill_search', 'shell_tool', 'apps', 'multi_agent', 'unbounded_connection_retries',
    'plugins', 'remote_plugin', 'browser_use', 'browser_use_external', 'in_app_browser', 'image_generation', 'view_image']) {
    assert.equal(args[args.indexOf(feature) - 1], '--disable', `Judge feature must be disabled: ${feature}`);
  }
  for (const setting of ['model_reasoning_effort="medium"', 'project_doc_max_bytes=0', 'developer_instructions=""', 'web_search="disabled"']) assert.ok(args.includes(setting));
  assert.ok(!args.some(arg => arg.startsWith('model_providers.')));
}

/** Offline classification only: never launches a process or changes original records. */
export function inspectCompactJudgeOriginal({ record, rawStdout, configuration, task }) {
  assert.equal(record.status, 'failed', 'Only the original diagnostic classification failure is eligible.');
  assert.equal(record.error?.name, 'AssertionError');
  assert.equal(record.error?.code, 'ERR_ASSERTION');
  assert.equal(record.error?.message, 'Judges cannot use tools.\n\n1 !== 0\n', 'Unrelated validation failures are not eligible.');
  assert.equal(record.runtimeReceipt.terminalEvidence, null);
  assert.equal(record.globalStopReason, null);
  verifyInvocation(record, configuration);
  assert.equal(compactDigest(rawStdout), record.runtimeReceipt.rawStdoutSha256, 'Original raw stream changed.');
  assert.equal(record.outputSha256, compactDigest(record.responseText));
  assert.equal(record.runtimeReceipt.outputSha256, record.outputSha256);
  assert.equal(record.promptSha256, compactDigest(record.promptText));
  assert.equal(record.runtimeReceipt.promptSha256, record.promptSha256);
  assert.equal(record.bundleSha256, null);
  assert.equal(record.inputPayloadSha256, compactDigest({ systemAppend: null, user: record.promptText }));
  assert.equal(record.runtimeReceipt.inputPayloadSha256, record.inputPayloadSha256);

  const events = rawStdout.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  const indexes = type => events.flatMap((event, index) => event.type === type ? [index] : []);
  assert.equal(indexes('thread.started').length, 1, 'Exactly one fresh thread required.');
  assert.equal(indexes('thread.started')[0], 0);
  assert.ok(typeof events[0].thread_id === 'string' && events[0].thread_id);
  assert.equal(events[0].thread_id, record.runtimeReceipt.threadId);
  assert.equal(indexes('turn.started').length, 1, 'Exactly one started turn required.');
  assert.equal(indexes('turn.completed').length, 1, 'Exactly one completed turn required.');
  const start = indexes('turn.started')[0], finish = indexes('turn.completed')[0];
  assert.ok(start < finish);
  assert.equal(finish, events.length - 1, 'Unexpected events after turn completion.');
  let warnings = 0, messages = 0;
  const counts = {};
  for (const [index, event] of events.entries()) {
    if (['thread.started', 'turn.started', 'turn.completed'].includes(event.type)) continue;
    assert.ok(['item.started', 'item.updated', 'item.completed'].includes(event.type), 'Unexpected error or event type.');
    if (event.type === 'item.completed') counts[event.item?.type] = (counts[event.item?.type] ?? 0) + 1;
    if (exactWarning(event.item)) {
      assert.equal(event.type, 'item.completed');
      assert.ok(index > 0 && index < start, 'The diagnostic must occur before the model turn.');
      warnings++;
      continue;
    }
    assert.ok(['agent_message', 'reasoning'].includes(event.item?.type), 'Other error items and all actual tools are forbidden.');
    assert.ok(index > start && index < finish, 'Model items must occur inside the single turn.');
    if (event.type === 'item.completed' && event.item.type === 'agent_message') {
      messages++;
      assert.equal(event.item.text.trim(), record.responseText, 'Original final answer differs from the preserved review.');
    }
  }
  assert.equal(warnings, 1, 'Exactly the one known startup diagnostic is required.');
  assert.equal(messages, 1, 'Exactly one completed original review required.');
  assert.deepEqual(counts, record.runtimeReceipt.itemTypeCounts, 'Original event accounting changed.');
  assert.equal(record.runtimeReceipt.nonMessageItemCount, 1);
  const usage = events[finish].usage;
  assert.ok(Number.isInteger(usage?.output_tokens) && usage.output_tokens > 0, 'Missing final usage.');
  assert.deepEqual(record.usage, {
    inputTokens: Number(usage.input_tokens ?? 0), cachedInputTokens: Number(usage.cached_input_tokens ?? 0),
    cacheWriteInputTokens: Number(usage.cache_write_input_tokens ?? 0), outputTokens: Number(usage.output_tokens ?? 0),
    reasoningOutputTokens: Number(usage.reasoning_output_tokens ?? 0),
    totalTokens: Number(usage.input_tokens ?? 0) + Number(usage.output_tokens ?? 0)
  }, 'Original usage differs from completed raw turn.');
  const assessment = validateCompactAssessment(JSON.parse(record.responseText), task);
  return { ...assessment, validationReceipt: {
    originalNonMessageItemCount: 1, startupDiagnosticCount: 1, toolCallCount: 0,
    threadId: events[0].thread_id, completedTurns: 1, stopReason: 'turn.completed',
    outputSha256: record.outputSha256, rawStdoutSha256: record.runtimeReceipt.rawStdoutSha256,
    usage: record.usage, additionalInferenceCalls: 0
  } };
}

function verifyEntry(snapshot, entry) {
  const row = snapshot.judgments.find(record => record.id === entry.judgmentId);
  assert.ok(row, 'Unplanned judgment validation.');
  assert.equal(entry.originalRecordSha256, compactDigest(row), 'Original judgment record changed.');
  assert.equal(entry.attemptNumber, row.attempt.number);
  assert.equal(entry.status, 'succeeded');
  assert.equal(entry.rawStdoutSha256, row.runtimeReceipt.rawStdoutSha256);
  assert.equal(entry.rawStderrSha256, row.runtimeReceipt.rawStderrSha256);
  assert.equal(entry.promptSha256, row.promptSha256);
  assert.equal(entry.outputSha256, row.outputSha256);
  assert.equal(entry.inputPayloadSha256, row.inputPayloadSha256);
  const task = snapshot.manifest.specification.cases.find(task => task.id === row.caseId);
  assert.equal(entry.outputSchemaSha256, compactDigest(compactJudgeSchema(task)));
  assert.equal(entry.invocation.command, 'codex');
  assert.deepEqual(entry.invocation.arguments, row.runtimeReceipt.cliArguments);
  assert.deepEqual(entry.invocation.configuration, resolveBenchmarkConfiguration(row.judgeConfigurationId));
  assert.equal(entry.invocation.freshSession, true);
  assert.equal(entry.invocationSha256, compactDigest(entry.invocation));
  assert.deepEqual(entry.assessment, inspectCompactJudgeOriginal({ record: row, rawStdout: entry.rawStdout,
    configuration: resolveBenchmarkConfiguration(row.judgeConfigurationId), task }));
}

export function validateCompactJudgeRevalidation(snapshot, validation) {
  validateCompactRunExport(snapshot);
  assert.equal(validation.schemaVersion, 1);
  assert.equal(validation.version, COMPACT_JUDGE_VALIDATION_VERSION);
  assert.equal(validation.manifestSha256, snapshot.manifestSha256);
  assert.equal(validation.runtimeAmendmentSha256, snapshot.amendmentSha256 ?? null);
  assert.equal(validation.validatorSourceSha256, compactDigest(fs.readFileSync(sourcePath)), 'Offline validator source changed.');
  assert.deepEqual(validation.policy, COMPACT_JUDGE_DIAGNOSTIC_POLICY);
  assert.ok(Array.isArray(validation.records));
  assert.equal(new Set(validation.records.map(record => record.judgmentId)).size, validation.records.length, 'Duplicate judgment validation.');
  for (const entry of validation.records) verifyEntry(snapshot, entry);
  return validation;
}

/** Build an inspectable sidecar in memory. All completed failed reviews are checked, without score selection. */
export function buildCompactJudgeRevalidation({ runDirectoryPath, snapshot = exportCompactRun({ runDirectoryPath }),
  now = new Date().toISOString() }) {
  validateCompactRunExport(snapshot);
  const records = [], rejected = [];
  for (const row of snapshot.judgments.filter(row => row.status === 'failed' && row.responseText?.trim())) {
    try {
      const directory = path.resolve(runDirectoryPath, row.artifactDirectory);
      const rawStdout = fs.readFileSync(path.join(directory, 'stdout.txt'), 'utf8');
      const rawStderr = fs.readFileSync(path.join(directory, 'stderr.txt'), 'utf8');
      assert.equal(compactDigest(rawStderr), row.runtimeReceipt.rawStderrSha256);
      const invocation = JSON.parse(fs.readFileSync(path.join(directory, 'invocation.json'), 'utf8'));
      const outputSchema = JSON.parse(fs.readFileSync(path.join(directory, 'output-schema.json'), 'utf8'));
      const task = snapshot.manifest.specification.cases.find(task => task.id === row.caseId);
      assert.deepEqual(outputSchema, compactJudgeSchema(task));
      const assessment = inspectCompactJudgeOriginal({ record: row, rawStdout,
        configuration: resolveBenchmarkConfiguration(row.judgeConfigurationId), task });
      const entry = { judgmentId: row.id, attemptNumber: row.attempt.number, status: 'succeeded',
        originalRecordSha256: compactDigest(row), rawStdout, rawStdoutSha256: compactDigest(rawStdout),
        rawStderrSha256: compactDigest(rawStderr), promptSha256: row.promptSha256,
        outputSha256: row.outputSha256, inputPayloadSha256: row.inputPayloadSha256,
        invocation, invocationSha256: compactDigest(invocation), outputSchemaSha256: compactDigest(outputSchema), assessment };
      verifyEntry(snapshot, entry);
      records.push(entry);
    } catch (error) { rejected.push({ judgmentId: row.id, reason: error.message }); }
  }
  const validation = { schemaVersion: 1, version: COMPACT_JUDGE_VALIDATION_VERSION, createdAt: now,
    manifestSha256: snapshot.manifestSha256, runtimeAmendmentSha256: snapshot.amendmentSha256 ?? null,
    validatorSourceSha256: compactDigest(fs.readFileSync(sourcePath)), policy: COMPACT_JUDGE_DIAGNOSTIC_POLICY,
    records, rejected };
  return validateCompactJudgeRevalidation(snapshot, validation);
}

/** Explicit local publication step; original attempts and runtime pins stay untouched. */
export function writeCompactJudgeRevalidation({ runDirectoryPath }) {
  assert.ok(!fs.existsSync(path.join(runDirectoryPath, 'dispatch.lock')), 'Wait until dispatch finishes before freezing validation.');
  const snapshot = exportCompactRun({ runDirectoryPath });
  const validation = buildCompactJudgeRevalidation({ runDirectoryPath, snapshot });
  fs.writeFileSync(path.join(runDirectoryPath, filename), `${JSON.stringify(validation, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(path.join(runDirectoryPath, 'judge-validation.sha256'), `${compactDigest(validation)}\n`, { flag: 'wx' });
  return { validatedCount: validation.records.length, rejectedCount: validation.rejected.length,
    judgeValidationSha256: compactDigest(validation) };
}

export function readCompactJudgeRevalidation({ runDirectoryPath, snapshot = exportCompactRun({ runDirectoryPath }) }) {
  if (!fs.existsSync(path.join(runDirectoryPath, filename))) return null;
  const validation = JSON.parse(fs.readFileSync(path.join(runDirectoryPath, filename), 'utf8'));
  assert.equal(compactDigest(validation), fs.readFileSync(path.join(runDirectoryPath, 'judge-validation.sha256'), 'utf8').trim(),
    'Offline judge validation hash changed.');
  return validateCompactJudgeRevalidation(snapshot, validation);
}
