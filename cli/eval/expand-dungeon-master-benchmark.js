import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createDungeonMasterRows, isTechnicalFailure } from './run-dungeon-master-benchmark.js';
import { dmPairs, dmCandidateOrder, dmJudgePrompt, dmJudgeSchema, validateDmJudgeOutput, DM_JUDGE_IDS } from './judge-dungeon-master-benchmark.js';
import { DM_EXPANSION_EDITION, DM_FIXED_JUDGE, dmDigest, validateDungeonMasterExpansion } from './dungeon-master-expansion-manifest.js';
import { runDungeonMasterNativePreflight, verifyDungeonMasterNativePreflight } from './dungeon-master-native-preflight.js';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const atomic = (file, value) => {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, file);
};
function freezeTree(repoRoot, directory, previousDirectory = null) {
  const files = [], seen = new Set();
  function visit(relative) {
    if (seen.has(relative)) return;
    seen.add(relative);
    // A controller-only supersession must not adopt concurrently edited model
    // transports. Reuse every prior dependency except the revised controller
    // and its new, provider-free readiness verifier.
    const revised = ['cli/eval/expand-dungeon-master-benchmark.js', 'cli/eval/dungeon-master-native-preflight.js'].includes(relative);
    const sourceRoot = previousDirectory && !revised ? path.join(previousDirectory, 'runtime-source') : repoRoot;
    const bytes = fs.readFileSync(path.join(sourceRoot, relative)), text = bytes.toString();
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o400 });
    files.push({ path: relative, bytes: bytes.length, sha256: dmDigest(bytes) });
    for (const match of text.matchAll(/(?:from\s+|import\s*)["'](\.\.?\/[^"']+)["']/gu)) visit(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
  }
  visit('cli/eval/expand-dungeon-master-benchmark.js');
  visit('cli/eval/dungeon-master-expansion-runtime.js');
  fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}\n', { flag: 'wx', mode: 0o400 });
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, hash: dmDigest(files), nodeVersion: process.version };
}
function retainedTree(source, destination) {
  const files = [];
  function visit(relative = '') {
    for (const entry of fs.readdirSync(path.join(source, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      assert.ok(!entry.isSymbolicLink(), 'Parent evidence must not contain symlinks.');
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) {
        assert.ok(!/\.lock$/u.test(name), 'Wait for parent run writers before preserving evidence.');
        const bytes = fs.readFileSync(path.join(source, name));
        const target = path.join(destination, name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
        files.push({ path: name, bytes: bytes.length, sha256: dmDigest(bytes) });
      }
    }
  }
  visit();
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function prepareDungeonMasterExpansion({ repoRoot, originalDirectory, runDirectory, configurations, runId, authorization, supersedesDirectory = null }) {
  assert.ok(authorization?.trim(), 'Explicit cohort expansion authorization is required.');
  assert.ok(runId && /^[a-z0-9][a-z0-9._-]+$/u.test(runId), 'Provide a unique stable expansion run ID.');
  assert.ok(!fs.existsSync(runDirectory), 'Expansion directory already exists; resume it instead.');
  let previous;
  if (supersedesDirectory) {
    assert.ok(!fs.existsSync(path.join(supersedesDirectory, 'run.lock')), 'Previous preparation is still active.');
    previous = inspectDungeonMasterExpansion(supersedesDirectory);
    assert.equal(previous.expansionExecution.attempts.length, 0, 'Only a zero-scored-call preparation can be superseded.');
    assert.equal(previous.runStatus, 'prepared');
  }
  const runText = fs.readFileSync(path.join(originalDirectory, 'run.json'), 'utf8');
  const judgesText = fs.readFileSync(path.join(originalDirectory, 'judges.json'), 'utf8');
  const original = JSON.parse(runText), originalJudges = JSON.parse(judgesText);
  const roster = configurations.map(configuration => ({ id: configuration.id || configuration.configurationId, provider: configuration.provider, model: configuration.model, reasoning: configuration.reasoning }));
  assert.equal(roster.length, 33, 'This completion edition requires the predeclared common 33-setting roster.');
  const originalIds = new Set(original.configurations.map(item => item.id));
  const run = { ...structuredClone(original), runId, startedAt: new Date().toISOString(), completedAt: null,
    runStatus: 'prepared', configurations: roster,
    generation: { ...original.generation, expectedRows: roster.length * 32, expectedPairs: roster.length * 16,
      orderSeed: crypto.randomBytes(16).toString('hex'), orderPolicy: 'sha256-seed-and-row-key', cohortExtension: DM_EXPANSION_EDITION },
    rows: [...structuredClone(original.rows), ...roster.filter(item => !originalIds.has(item.id)).flatMap(configuration => createDungeonMasterRows(original.benchmark.definition, configuration))],
    judging: structuredClone(originalJudges),
    cohortExtension: { schemaVersion: 1, edition: DM_EXPANSION_EDITION, authorization, declaredAt: new Date().toISOString(), configurations: roster,
      parent: { runText, judgesText }, judgeConfiguration: { ...DM_FIXED_JUDGE }, primaryRepetitions: 6, transferRepetitions: 2,
      policy: 'Append declared models; retain original successful and failed evidence; fixed prompts, skill, primary/transfer semantics, rubric and two counterbalanced Astra Ultra review seats. No quality or adherence rerolls.' },
    expansionExecution: { status: 'prepared', attempts: [], quotaCircuitOpen: false, operationalCircuitOpen: false, accountContexts: null } };
  validateDungeonMasterExpansion(run);
  fs.mkdirSync(runDirectory, { recursive: true, mode: 0o700 });
  const parentFiles = retainedTree(originalDirectory, path.join(runDirectory, 'parent-evidence'));
  const implementation = freezeTree(repoRoot, path.join(runDirectory, 'runtime-source'), supersedesDirectory);
  run.cohortExtension.implementation = implementation;
  run.cohortExtension.parentEvidence = { files: parentFiles, hash: dmDigest(parentFiles), directory: 'parent-evidence' };
  run.cohortExtension.originalImplementation = original.implementation;
  if (previous) {
    const files = retainedTree(supersedesDirectory, path.join(runDirectory, 'superseded-preparation'));
    run.cohortExtension.preparationLineage = { schemaVersion: 1, directory: 'superseded-preparation',
      runId: previous.runId, manifestHash: previous.cohortExtension.manifestHash, files, hash: dmDigest(files),
      supersededBeforeScoredCalls: true, reason: 'Controller concurrency ceiling 4 to 16 (default 4) and supplemental native sandbox readiness; all model transport dependencies unchanged.' };
    const current = new Map(implementation.files.map(file => [file.path, file.sha256]));
    for (const file of previous.cohortExtension.implementation.files) if (file.path !== 'cli/eval/expand-dungeon-master-benchmark.js') assert.equal(current.get(file.path), file.sha256, `Supersession changed a model transport dependency: ${file.path}`);
  }
  run.cohortExtension.manifestHash = dmDigest({ edition: DM_EXPANSION_EDITION, runId, configurations: roster, benchmarkHash: original.benchmark.hash,
    treatmentHash: original.treatment.hash, generation: run.generation, implementation, parentEvidenceHash: dmDigest(parentFiles),
    ...(run.cohortExtension.preparationLineage ? { preparationLineageHash: run.cohortExtension.preparationLineage.hash } : {}) });
  for (const name of ['skill-snapshot.json', 'judge-rubric.md', 'methodology.md']) fs.copyFileSync(path.join(originalDirectory, name), path.join(runDirectory, name));
  atomic(path.join(runDirectory, 'manifest.json'), { schemaVersion: 1, runId, edition: DM_EXPANSION_EDITION, manifestHash: run.cohortExtension.manifestHash,
    configurations: roster, expectedRows: run.rows.length, expectedPairs: run.generation.expectedPairs,
    newWriterCalls: run.rows.length - original.rows.length, newJudgeCalls: (run.generation.expectedPairs - originalJudges.pairs.length) * 2,
    benchmarkHash: original.benchmark.hash, skillHash: original.treatment.hash, implementation, originalImplementation: original.implementation,
    parentEvidence: run.cohortExtension.parentEvidence, preparationLineage: run.cohortExtension.preparationLineage,
    operationalLimits: { defaultConcurrency: 4, maximumConcurrency: 16, timeoutMs: original.generation.timeoutMs,
      maximumTechnicalRetries: 1, quotaPolicy: 'Stop dispatch on raw provider quota evidence; no account switching or automatic quota/auth/policy retries.' } });
  atomic(path.join(runDirectory, 'run.json'), run);
  return run;
}

function verifyFiles(root, files) {
  for (const file of files) {
    assert.ok(typeof file.path === 'string' && !path.isAbsolute(file.path) && !file.path.split(/[\\/]/u).includes('..'), 'Unsafe evidence path.');
    const bytes = fs.readFileSync(path.join(root, file.path));
    assert.equal(bytes.length, file.bytes, `Frozen evidence size changed: ${file.path}`);
    assert.equal(dmDigest(bytes), file.sha256, `Frozen evidence changed: ${file.path}`);
  }
}
export function inspectDungeonMasterExpansion(runDirectory) {
  const run = read(path.join(runDirectory, 'run.json'));
  validateDungeonMasterExpansion(run);
  const extension = run.cohortExtension;
  verifyFiles(path.join(runDirectory, 'runtime-source'), extension.implementation.files);
  verifyFiles(path.join(runDirectory, 'parent-evidence'), extension.parentEvidence.files);
  if (extension.preparationLineage) {
    assert.equal(extension.preparationLineage.directory, 'superseded-preparation');
    assert.equal(dmDigest(extension.preparationLineage.files), extension.preparationLineage.hash);
    verifyFiles(path.join(runDirectory, extension.preparationLineage.directory), extension.preparationLineage.files);
    const previous = read(path.join(runDirectory, extension.preparationLineage.directory, 'run.json'));
    assert.equal(previous.expansionExecution.attempts.length, 0);
    assert.equal(previous.cohortExtension.manifestHash, extension.preparationLineage.manifestHash);
    const current = new Map(extension.implementation.files.map(file => [file.path, file.sha256]));
    for (const file of previous.cohortExtension.implementation.files) if (file.path !== 'cli/eval/expand-dungeon-master-benchmark.js') assert.equal(current.get(file.path), file.sha256, 'Superseded transport changed.');
  }
  const manifest = read(path.join(runDirectory, 'manifest.json'));
  assert.equal(manifest.manifestHash, extension.manifestHash);
  assert.equal(extension.manifestHash, dmDigest({ edition: extension.edition, runId: run.runId, configurations: run.configurations,
    benchmarkHash: run.benchmark.hash, treatmentHash: run.treatment.hash, generation: run.generation,
    implementation: extension.implementation, parentEvidenceHash: dmDigest(extension.parentEvidence.files),
    ...(extension.preparationLineage ? { preparationLineageHash: extension.preparationLineage.hash } : {}) }), 'Expansion manifest changed.');
  assert.equal(read(path.join(runDirectory, 'skill-snapshot.json')).hash, run.treatment.hash);
  assert.equal(fs.readFileSync(path.join(runDirectory, 'judge-rubric.md'), 'utf8'), run.benchmark.definition.scoring.judgeInstructions, 'Frozen judge rubric file differs from the declared instructions.');
  return run;
}

export function dmExpansionDiagnostic(evidenceDirectory, error) {
  const messages = [];
  const stdout = path.join(evidenceDirectory, 'stdout.jsonl');
  if (fs.existsSync(stdout)) for (const line of fs.readFileSync(stdout, 'utf8').split(/\r?\n/u)) {
    try { const event = JSON.parse(line); if (['error', 'turn.failed'].includes(event.type) || event.type === 'result' && event.is_error) messages.push(event.message, event.error?.message, event.result); } catch { /* Unparsed artifact text is never diagnostic authority. */ }
  }
  const stderr = path.join(evidenceDirectory, 'stderr.txt');
  if (fs.existsSync(stderr)) messages.push(fs.readFileSync(stderr, 'utf8'));
  const diagnostic = messages.filter(value => typeof value === 'string').join('\n');
  const quota = /usage.?limit|usage credits|out of credits|credits (?:exhausted|depleted)|insufficient_quota|exceeded.*quota|hit your.*limit|reached your.*limit/iu.test(diagnostic);
  const operational = /authentication|oauth|not logged|invalid.api.key|permission denied|config\.toml/iu.test(diagnostic + '\n' + (error?.message || ''));
  const policy = /content.?filter|output.?filter|content.?policy|output.?policy|policy violation/iu.test(diagnostic + '\n' + (error?.message || ''));
  return { quota, operational, policy, technical: !quota && !operational && !policy && isTechnicalFailure(error || new Error('')) };
}

function accountContexts(environment) {
  return { codex: dmDigest(environment.CODEX_HOME || path.join(environment.HOME || '', '.codex')),
    claude: dmDigest(environment.CLAUDE_CONFIG_DIR || path.join(environment.HOME || '', '.claude')) };
}
export function verifyDungeonMasterExpansionPreflight(runDirectory, run, providers) {
  const proof = read(path.join(runDirectory, 'preflight.json'));
  if (proof.method === 'native-sandbox-and-recorded-invocation-binding-v1') {
    assert.deepEqual(proof, verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile: proof.supplementFile }), 'Readiness differs from independently verified supplemental evidence.');
  }
  assert.equal(proof.status, 'passed', 'Provider isolation/read preflight has not passed.');
  assert.equal(proof.manifestHash, run.cohortExtension.manifestHash, 'Preflight belongs to another frozen expansion.');
  for (const provider of providers) {
    const evidence = proof.providers?.find(item => item.provider === provider);
    assert.ok(evidence, `Missing ${provider} preflight.`);
    for (const assertion of ['freshSessions', 'outsideReadDenied', 'hostSkillCatalogAbsent', 'networkUnavailable', 'instructionDelivered', 'requiredReferenceFullBytesObserved']) assert.equal(evidence.assertions?.[assertion], true, `Preflight ${provider}/${assertion}`);
    assert.ok(evidence.files?.length >= 2, 'Retained raw preflight streams are required.');
    verifyFiles(runDirectory, evidence.files);
  }
}

function outsideDenied(stdout, outsidePath, provider) {
  const events = stdout.split(/\r?\n/u).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  if (provider === 'codex') return events.some(event => {
    const item = event.item;
    return item?.type === 'command_execution' && String(item.command).includes(outsidePath)
      && (item.exit_code !== null && Number.isInteger(item.exit_code) && item.exit_code !== 0 || item.status === 'failed');
  });
  const outsideCalls = new Set(events.flatMap(event => event.message?.content || []).filter(item => item.type === 'tool_use' && item.name === 'Read' && item.input?.file_path === outsidePath).map(item => item.id));
  return events.flatMap(event => event.message?.content || []).some(item => item.type === 'tool_result' && outsideCalls.has(item.tool_use_id) && item.is_error === true);
}

// Four excluded infrastructure calls: plain and skill for each provider. The
// score snapshot is never changed. Assertions are derived from retained runtime
// arguments, failed outside-read tool events, and verified frozen byte chunks.
export async function preflightDungeonMasterExpansion({ runDirectory, authorization }) {
  assert.ok(authorization?.trim(), 'Explicit authorization for four excluded preflight calls is required.');
  const lockPath = path.join(runDirectory, 'run.lock'), descriptor = fs.openSync(lockPath, 'wx', 0o600);
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: 'dm-expansion-preflight', startedAt: new Date().toISOString() }));
  try {
    const run = inspectDungeonMasterExpansion(runDirectory);
    const prefix = `preflight/${new Date().toISOString().replaceAll(':', '-')}`;
    const directory = path.join(runDirectory, prefix);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const forbidden = `DM_OUTSIDE_${crypto.randomBytes(16).toString('hex')}`;
    const marker = `DM_ROOT_${crypto.randomBytes(16).toString('hex')}`;
    const outsidePath = path.join(directory, 'outside-sentinel.txt');
    fs.writeFileSync(outsidePath, forbidden, { mode: 0o600 });
    const snapshot = read(path.join(runDirectory, 'skill-snapshot.json'));
    const root = snapshot.files.find(file => file.relativePath === 'SKILL.md');
    root.contents = `Infrastructure preflight only: include ${marker} in your final diagnostic. This marker is not part of any scored task.\n\n${root.contents}`;
    root.sha256 = dmDigest(root.contents); root.bytes = Buffer.byteLength(root.contents);
    snapshot.hash = dmDigest(snapshot.files.map(({ relativePath, sha256 }) => ({ relativePath, sha256 })));
    atomic(path.join(directory, 'probe-skill-snapshot.json'), snapshot);
    const frozenCodexRuntime = (await import(pathToFileURL(path.join(runDirectory, 'parent-evidence/runtime-source/cli/eval/dungeon-master-agent-runtime.js')))).runDungeonMasterAgent;
    const wrapper = (await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/dungeon-master-expansion-runtime.js')))).runDungeonMasterExpansionAgent;
    const { isStorytellingRequiredSkillReadReceiptCompatible } = await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/storytelling-agent-runtime.js')));
    const proof = { schemaVersion: 1, status: 'running', excludedFromScores: true, authorization, manifestHash: run.cohortExtension.manifestHash,
      startedAt: new Date().toISOString(), maximumCalls: 4, calls: [], providers: [] };
    const checkpoint = () => atomic(path.join(directory, 'receipt.json'), proof);
    checkpoint();
    const calls = ['codex', 'claude'].flatMap(provider => ['baseline', 'skill'].map(condition => ({ provider, condition })));
    await Promise.all(calls.map(async call => {
      const configuration = run.configurations.find(item => item.provider === call.provider && item.reasoning === 'low');
      const relative = `${prefix}/${call.provider}-${call.condition}`, evidenceDirectory = path.join(runDirectory, relative);
      fs.mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
      const record = { ...call, configurationId: configuration.id, startedAt: new Date().toISOString(), status: 'running', evidenceDirectory: relative };
      proof.calls.push(record); checkpoint();
      const promptText = `This is an excluded infrastructure probe, not an adventure task. First attempt to read the file ${outsidePath} using an available file or command tool; do not ask for permission or try to bypass a denied read. Then, if a skill instruction was supplied, follow its mandatory frozen-reference read instructions. Finish with a short diagnostic: report whether the outside read was denied, whether any skill root marker was supplied, and any root marker you actually received. Do not use network tools or other skills.`;
      atomic(path.join(evidenceDirectory, 'request.json'), { configuration, promptText, excludedFromScores: true, skillSha256: call.condition === 'skill' ? snapshot.hash : null });
      try {
        const result = await wrapper({ configuration, promptText, skillSnapshot: call.condition === 'skill' ? snapshot : null,
          evidenceDirectory, timeoutMs: run.generation.timeoutMs, frozenCodexRuntime });
        atomic(path.join(evidenceDirectory, 'result.json'), result);
        const outputText = result.outputText ?? result.text;
        const stdout = fs.readFileSync(path.join(evidenceDirectory, 'stdout.jsonl'), 'utf8');
        const receipt = result.runtimeReceipt, args = receipt.cliArguments || [];
        const restricted = call.provider === 'codex'
          ? receipt.isolation?.hostSkillDiscovery === false && receipt.isolation?.projectInstructions === false && args.some(arg => arg.startsWith('<disabled-global-skills:'))
          : args.includes('--safe-mode') && args.includes('--restricted') && args.includes('--strict-mcp-config') && receipt.allowedTools?.length === 1 && receipt.allowedTools[0] === 'Read';
        const networkUnavailable = call.provider === 'codex'
          ? receipt.isolation?.externalResources === false && args.some(arg => /network=\{ enabled=false \}/u.test(arg))
          : restricted;
        Object.assign(record, { status: 'complete', completedAt: new Date().toISOString(), assertions: {
          freshSessions: receipt.freshSession === true && receipt.persistedSession === false,
          outsideReadDenied: outsideDenied(stdout, outsidePath, call.provider) && !outputText.includes(forbidden),
          hostSkillCatalogAbsent: restricted,
          networkUnavailable,
          instructionDelivered: call.condition === 'skill' ? outputText.includes(marker) && receipt.skillHash === snapshot.hash : !outputText.includes(marker) && receipt.skillHash === null && receipt.instructionHash === null,
          requiredReferenceFullBytesObserved: call.condition === 'skill' ? isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot,
            requiredSkillFiles: ['references/adventure-design.md'], receipt: receipt.requiredSkillReads, requireComplete: true }) : true
        } });
      } catch (error) { Object.assign(record, { status: 'error', completedAt: new Date().toISOString(), error: { code: error.code || null, message: error.message }, diagnostic: dmExpansionDiagnostic(evidenceDirectory, error) }); }
      checkpoint();
      process.stdout.write(JSON.stringify({ event: 'dm-expansion-preflight', provider: call.provider, condition: call.condition, status: record.status, assertions: record.assertions, diagnostic: record.diagnostic }) + '\n');
    }));
    for (const provider of ['codex', 'claude']) {
      const records = proof.calls.filter(call => call.provider === provider);
      const assertions = Object.fromEntries(['freshSessions', 'outsideReadDenied', 'hostSkillCatalogAbsent', 'networkUnavailable', 'instructionDelivered', 'requiredReferenceFullBytesObserved'].map(key => [key, records.length === 2 && records.every(record => record.status === 'complete' && record.assertions[key] === true)]));
      const files = records.flatMap(record => ['stdout.jsonl', 'stderr.txt', 'request.json', 'result.json'].filter(name => fs.existsSync(path.join(runDirectory, record.evidenceDirectory, name))).map(name => {
        const relative = `${record.evidenceDirectory}/${name}`, bytes = fs.readFileSync(path.join(runDirectory, relative));
        return { path: relative, bytes: bytes.length, sha256: dmDigest(bytes) };
      }));
      proof.providers.push({ provider, assertions, files });
    }
    proof.completedAt = new Date().toISOString();
    proof.status = proof.providers.every(provider => Object.values(provider.assertions).every(Boolean)) ? 'passed' : 'failed';
    checkpoint(); atomic(path.join(runDirectory, 'preflight.json'), proof);
    return proof;
  } finally { fs.closeSync(descriptor); fs.unlinkSync(lockPath); }
}

export function verifyDungeonMasterExpansionResolution(runDirectory, run, resolutionFile, contexts) {
  assert.ok(resolutionFile, 'A new pinned provider-readiness resolution receipt is required after quota/auth interruption.');
  const resolution = read(resolutionFile);
  assert.equal(resolution.status, 'resolved');
  assert.equal(resolution.manifestHash, run.cohortExtension.manifestHash);
  assert.deepEqual(resolution.accountContexts, contexts, 'Recovery readiness used another account context.');
  const failed = run.expansionExecution.attempts.filter(attempt => ['quota', 'operational'].includes(attempt.failureClass));
  assert.ok(failed.length, 'No retained external-state failure to resolve.');
  assert.ok(Number.isFinite(Date.parse(resolution.verifiedAt)) && Date.parse(resolution.verifiedAt) > Math.max(...failed.map(attempt => Date.parse(attempt.completedAt))), 'Provider readiness must postdate the interrupted attempts.');
  const providers = [...new Set(failed.map(attempt => attempt.configurationId.split(':')[0]))];
  for (const provider of providers) {
    const proof = resolution.providers?.find(item => item.provider === provider);
    assert.ok(proof?.files?.length, `Missing ${provider} post-interruption readiness evidence.`);
    verifyFiles(runDirectory, proof.files);
    const events = proof.files.filter(file => file.path.endsWith('stdout.jsonl')).flatMap(file => fs.readFileSync(path.join(runDirectory, file.path), 'utf8').split(/\r?\n/u).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }));
    assert.ok(events.some(event => event.type === 'turn.completed' || event.type === 'result' && !event.is_error && event.subtype === 'success'), 'Readiness requires a retained successful provider completion.');
    assert.ok(!events.some(event => event.type === 'error' || event.type === 'turn.failed' || event.type === 'result' && event.is_error), 'Readiness still contains a terminal provider error.');
  }
  return { verifiedAt: resolution.verifiedAt, sha256: dmDigest(fs.readFileSync(resolutionFile)), providers };
}

export async function executeDungeonMasterExpansion({ runDirectory, concurrency = 4, maximumCalls = 2048,
  providers = ['codex', 'claude'], runtime = null, environmentVariables = process.env, authorization, recover = false,
  resolutionFile = null, pauseFile = path.join(runDirectory, 'PAUSE.json') }) {
  assert.ok(authorization?.trim(), 'Explicit execution authorization is required.');
  assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 16, 'Concurrency must be 1–16; default 4, increases require root allocation.');
  assert.ok(Number.isInteger(maximumCalls) && maximumCalls >= 1 && maximumCalls <= 4096, 'Set a bounded maximum of 1–4096 calls.');
  assert.ok(providers.length && new Set(providers).size === providers.length && providers.every(item => ['codex', 'claude'].includes(item)), 'Unsupported provider filter.');
  const lockPath = path.join(runDirectory, 'run.lock'), descriptor = fs.openSync(lockPath, 'wx', 0o600);
  const active = new Set();
  let pauseRequested = false;
  const pause = () => { pauseRequested = true; };
  process.on('SIGINT', pause); process.on('SIGTERM', pause);
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: 'dm-model-expansion', startedAt: new Date().toISOString() }));
  try {
    assert.ok(!fs.existsSync(path.join(runDirectory, 'judges.lock')), 'Another judge writer owns the checkpoint.');
    const run = inspectDungeonMasterExpansion(runDirectory), snapshot = read(path.join(runDirectory, 'skill-snapshot.json'));
    const extension = run.cohortExtension;
    if (!runtime) {
      verifyDungeonMasterExpansionPreflight(runDirectory, run, [...new Set([...providers, 'codex'])]);
      const currentSource = dmDigest(fs.readFileSync(fileURLToPath(import.meta.url)));
      assert.equal(currentSource, extension.implementation.files.find(file => file.path === 'cli/eval/expand-dungeon-master-benchmark.js').sha256, 'Execute the frozen controller, not changed live source.');
      const frozenCodexRuntime = (await import(pathToFileURL(path.join(runDirectory, 'parent-evidence/runtime-source/cli/eval/dungeon-master-agent-runtime.js')))).runDungeonMasterAgent;
      const wrapper = (await import(pathToFileURL(path.join(runDirectory, 'runtime-source/cli/eval/dungeon-master-expansion-runtime.js')))).runDungeonMasterExpansionAgent;
      runtime = options => wrapper({ ...options, frozenCodexRuntime, environmentVariables });
    }
    const contexts = accountContexts(environmentVariables);
    if (run.expansionExecution.accountContexts) assert.deepEqual(contexts, run.expansionExecution.accountContexts, 'Authentication context changed; do not switch accounts to bypass quota.');
    else run.expansionExecution.accountContexts = contexts;
    let resolution = null;
    if (run.expansionExecution.quotaCircuitOpen || run.expansionExecution.operationalCircuitOpen) {
      assert.ok(recover, 'Circuit is open; explicit authorized recovery after external resolution is required.');
      resolution = verifyDungeonMasterExpansionResolution(runDirectory, run, resolutionFile, contexts);
    }
    const session = { id: `execution-${new Date().toISOString().replaceAll(':', '-')}`, authorization, recover, concurrency, maximumCalls,
      providers, resolution, startedAt: new Date().toISOString(), calls: 0, status: 'running' };
    run.expansionExecution.sessions ??= [];
    run.expansionExecution.sessions.push(session);
    run.expansionExecution.quotaCircuitOpen = false;
    run.expansionExecution.operationalCircuitOpen = false;
    const originalRows = new Set(JSON.parse(extension.parent.runText).rows.map(row => row.rowKey));
    const attempted = new Set();
    function checkpoint() {
      validateDungeonMasterExpansion(run);
      run.summary = { expectedRows: run.rows.length, complete: run.rows.filter(row => row.rowStatus === 'complete').length,
        failed: run.rows.filter(row => row.rowStatus === 'error').length, pending: run.rows.filter(row => !['complete', 'error'].includes(row.rowStatus)).length };
      run.lastCheckpointAt = new Date().toISOString();
      atomic(path.join(runDirectory, 'run.json'), run);
    }
    const paused = () => pauseRequested || fs.existsSync(pauseFile);
    const terminal = () => paused() || run.expansionExecution.quotaCircuitOpen || run.expansionExecution.operationalCircuitOpen || session.calls >= maximumCalls;
    function jobs() {
      const writers = run.rows.filter(row => !originalRows.has(row.rowKey) && providers.includes(row.provider) && row.rowStatus !== 'complete' && !attempted.has(row.rowKey)
        && row.terminalFailure !== 'policy' && (recover || !['error', 'running'].includes(row.rowStatus))).map(row => ({ key: row.rowKey, kind: 'writer', row }));
      const reviewers = dmPairs(run).flatMap(pair => DM_JUDGE_IDS.map((judgeId, seat) => ({ key: `${pair.pairId}::${judgeId}`, kind: 'judge', pair, judgeId, seat })))
        .filter(job => {
          const saved = run.judging.pairs.find(pair => pair.pairId === job.pair.pairId)?.judges.find(judge => judge.judgeId === job.judgeId);
          return !attempted.has(job.key) && saved?.terminalFailure !== 'policy' && (!saved || recover && saved.status !== 'completed');
        });
      return [...writers, ...reviewers].sort((a, b) => dmDigest(run.generation.orderSeed + a.key).localeCompare(dmDigest(run.generation.orderSeed + b.key)));
    }
    async function execute(job) {
      attempted.add(job.key);
      let record, configuration, promptText, candidates;
      if (job.kind === 'writer') {
        record = job.row;
        configuration = run.configurations.find(item => item.id === record.configurationId);
        promptText = record.promptText;
      } else {
        configuration = DM_FIXED_JUDGE;
        candidates = dmCandidateOrder(job.pair, job.seat);
        promptText = dmJudgePrompt({ task: candidates[0].promptText, scoring: run.benchmark.definition.scoring, rubricText: run.benchmark.definition.scoring.judgeInstructions, candidates });
        let pair = run.judging.pairs.find(item => item.pairId === job.pair.pairId);
        if (!pair) { pair = { pairId: job.pair.pairId, caseId: job.pair.caseId, trialNumber: job.pair.trialNumber, configurationId: job.pair.configurationId, judges: [] }; run.judging.pairs.push(pair); }
        record = pair.judges.find(item => item.judgeId === job.judgeId);
        if (!record) { record = { judgeId: job.judgeId, status: 'pending', promptText, promptHash: dmDigest(promptText), candidateOrder: candidates.map(row => row.rowKey), attempts: [] }; pair.judges.push(record); }
        assert.equal(record.promptHash, dmDigest(promptText), 'Recovery judge prompt changed.');
      }
      const previous = structuredClone(record);
      for (let localAttempt = 0; localAttempt < (recover ? 1 : 2) && !terminal(); localAttempt++) {
        const attemptNumber = record.attempts.length + 1;
        const relative = `expansion-evidence/${job.kind}/${dmDigest(job.key).slice(0, 24)}/attempt-${attemptNumber}`;
        const evidenceDirectory = path.join(runDirectory, relative);
        fs.mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
        if (localAttempt === 0) atomic(path.join(evidenceDirectory, 'record-before.json'), previous);
        const attempt = { key: job.key, kind: job.kind, configurationId: configuration.id, attemptNumber, sessionId: session.id, startedAt: new Date().toISOString(), status: 'running', evidenceDirectory: relative };
        record.attempts.push(attempt); session.calls++;
        if (job.kind === 'writer') record.rowStatus = 'running'; else record.status = 'running';
        run.expansionExecution.attempts.push(attempt);
        checkpoint();
        try {
          const result = await runtime({ configuration, promptText, evidenceDirectory, timeoutMs: run.generation.timeoutMs,
            skillSnapshot: job.kind === 'writer' && record.conditionId !== 'clean' ? snapshot : null,
            outputSchema: job.kind === 'judge' ? dmJudgeSchema(run.benchmark.definition.scoring) : null });
          const outputText = result.outputText ?? result.text;
          assert.ok(typeof outputText === 'string' && outputText.trim(), 'No completed final answer.');
          fs.writeFileSync(path.join(evidenceDirectory, job.kind === 'writer' ? 'answer.md' : 'answer.json'), outputText, { mode: 0o600 });
          Object.assign(attempt, { receivedOutputHash: dmDigest(outputText), runtimeReceipt: result.runtimeReceipt,
            usage: result.usage ?? null, durationMs: result.durationMs ?? null });
          const raw = dmExpansionDiagnostic(evidenceDirectory);
          if (raw.quota || raw.operational || raw.policy) throw new Error('Terminal provider diagnostic accompanies output; inspect retained raw evidence.');
          const values = { outputText, outputHash: dmDigest(outputText), usage: result.usage ?? null, durationMs: result.durationMs ?? null, costUsd: result.costUsd ?? null, runtimeReceipt: result.runtimeReceipt, error: null };
          if (job.kind === 'writer') Object.assign(record, values, { rowStatus: 'complete', wordCount: outputText.trim().split(/\s+/u).length, characterCount: [...outputText].length });
          else Object.assign(record, values, validateDmJudgeOutput(outputText, run.benchmark.definition.scoring, candidates), { status: 'completed' });
          Object.assign(attempt, { status: 'complete', completedAt: new Date().toISOString(), outputHash: values.outputHash, usage: values.usage, durationMs: values.durationMs });
          checkpoint(); break;
        } catch (error) {
          const diagnostic = dmExpansionDiagnostic(evidenceDirectory, error);
          run.expansionExecution.quotaCircuitOpen ||= diagnostic.quota;
          run.expansionExecution.operationalCircuitOpen ||= diagnostic.operational;
          const failure = { code: error.code ?? null, message: error.message, context: error.context ?? null };
          Object.assign(attempt, { status: 'error', completedAt: new Date().toISOString(), error: failure,
            failureClass: diagnostic.quota ? 'quota' : diagnostic.operational ? 'operational' : diagnostic.policy ? 'policy' : diagnostic.technical ? 'technical' : 'invalid-result' });
          if (diagnostic.policy) record.terminalFailure = 'policy';
          if (job.kind === 'writer') Object.assign(record, { rowStatus: 'error', error: failure }); else Object.assign(record, { status: 'failed', error: failure });
          checkpoint();
          if (!diagnostic.technical || recover) break;
        }
      }
      process.stdout.write(JSON.stringify({ event: 'dm-expansion-unit', kind: job.kind, key: job.key, status: record.rowStatus || record.status, calls: session.calls, quotaCircuitOpen: run.expansionExecution.quotaCircuitOpen }) + '\n');
    }
    checkpoint();
    while (true) {
      for (const job of jobs()) {
        if (terminal() || active.size >= concurrency) break;
        const promise = execute(job).finally(() => active.delete(promise)); active.add(promise);
      }
      if (!active.size) break;
      await Promise.race(active);
    }
    const complete = run.rows.every(row => row.rowStatus === 'complete') && run.judging.pairs.length === run.generation.expectedPairs && run.judging.pairs.every(pair => pair.judges.length === 2 && pair.judges.every(judge => judge.status === 'completed'));
    session.completedAt = new Date().toISOString();
    session.status = complete ? 'complete' : run.expansionExecution.quotaCircuitOpen ? 'quota-paused' : run.expansionExecution.operationalCircuitOpen ? 'operational-paused' : paused() ? 'operator-paused' : 'checkpointed-incomplete';
    run.runStatus = session.status; run.expansionExecution.status = session.status;
    run.judging.status = complete ? 'completed' : 'incomplete';
    if (complete) run.completedAt = session.completedAt;
    checkpoint(); return run;
  } finally {
    // Never release the sole checkpoint-writer lock while a provider call can
    // still append evidence or complete a checkpoint after another call failed.
    await Promise.allSettled([...active]);
    process.removeListener('SIGINT', pause); process.removeListener('SIGTERM', pause);
    fs.closeSync(descriptor); fs.unlinkSync(lockPath);
  }
}

async function main() {
  const { values } = parseArgs({ options: { prepare: { type: 'boolean' }, execute: { type: 'boolean' }, preflight: { type: 'boolean' }, 'native-preflight': { type: 'boolean' }, 'verify-native-preflight': { type: 'boolean' }, 'activate-native-preflight': { type: 'boolean' }, 'supplement-file': { type: 'string' }, inspect: { type: 'boolean' }, recover: { type: 'boolean' }, pause: { type: 'boolean' }, 'clear-pause': { type: 'boolean' },
    'run-directory': { type: 'string' }, 'original-directory': { type: 'string' }, 'project-root': { type: 'string', default: process.cwd() },
    'configuration-file': { type: 'string' }, 'run-id': { type: 'string' }, 'supersedes-directory': { type: 'string' }, authorization: { type: 'string' }, concurrency: { type: 'string', default: '4' },
    'maximum-calls': { type: 'string', default: '2048' }, providers: { type: 'string', default: 'codex,claude' }, 'resolution-file': { type: 'string' }, 'pause-file': { type: 'string' } } });
  assert.ok(values['run-directory'], '--run-directory is required.');
  const runDirectory = path.resolve(values['run-directory']);
  const pauseFile = values['pause-file'] ? path.resolve(values['pause-file']) : path.join(runDirectory, 'PAUSE.json');
  if (values.pause) { atomic(pauseFile, { requestedAt: new Date().toISOString(), reason: values.authorization || 'Operator pause; drain active calls.' }); return; }
  if (values['clear-pause']) { const archive = path.join(runDirectory, 'operator-controls'); fs.mkdirSync(archive, { recursive: true }); fs.renameSync(pauseFile, path.join(archive, `pause-${Date.now()}.json`)); return; }
  if (values['native-preflight'] || values['verify-native-preflight'] || values['activate-native-preflight']) {
    const run = inspectDungeonMasterExpansion(runDirectory);
    if (values['native-preflight']) {
      const proof = await runDungeonMasterNativePreflight({ runDirectory, run, authorization: values.authorization });
      process.stdout.write(JSON.stringify(proof) + '\n'); return;
    }
    const proof = verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile: values['supplement-file'] });
    if (values['activate-native-preflight']) {
      assert.ok(values.authorization?.trim(), 'Explicit supplemental readiness activation authorization is required.');
      assert.ok(!fs.existsSync(path.join(runDirectory, 'run.lock')) && !fs.existsSync(path.join(runDirectory, 'preflight.json')), 'Do not replace an existing active/preflight record.');
      atomic(path.join(runDirectory, 'preflight.json'), proof);
    }
    process.stdout.write(JSON.stringify(proof) + '\n'); return;
  }
  if (values.preflight) { const proof = await preflightDungeonMasterExpansion({ runDirectory, authorization: values.authorization }); process.stdout.write(JSON.stringify({ status: proof.status, manifestHash: proof.manifestHash, calls: proof.calls.length }) + '\n'); return; }
  let run;
  if (values.prepare) run = prepareDungeonMasterExpansion({ repoRoot: path.resolve(values['project-root']), originalDirectory: path.resolve(values['original-directory']),
    runDirectory, configurations: read(values['configuration-file']), runId: values['run-id'], authorization: values.authorization,
    supersedesDirectory: values['supersedes-directory'] ? path.resolve(values['supersedes-directory']) : null });
  if (values.execute) run = await executeDungeonMasterExpansion({ runDirectory, concurrency: Number(values.concurrency), maximumCalls: Number(values['maximum-calls']),
    providers: values.providers.split(','), authorization: values.authorization, recover: values.recover, resolutionFile: values['resolution-file'], pauseFile });
  if (values.inspect) run = inspectDungeonMasterExpansion(runDirectory);
  assert.ok(run, 'Choose --prepare, --execute or --inspect.');
  process.stdout.write(JSON.stringify({ runId: run.runId, status: run.runStatus, settings: run.configurations.length, expectedRows: run.rows.length,
    completeRows: run.rows.filter(row => row.rowStatus === 'complete').length, expectedPairs: run.generation.expectedPairs,
    completeReviews: run.judging.pairs.flatMap(pair => pair.judges).filter(judge => judge.status === 'completed').length,
    manifestHash: run.cohortExtension.manifestHash }) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
