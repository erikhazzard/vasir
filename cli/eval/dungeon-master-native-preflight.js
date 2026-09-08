import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { dmDigest } from './dungeon-master-expansion-manifest.js';
import { isStorytellingRequiredSkillReadReceiptCompatible } from './storytelling-agent-runtime.js';

export const DM_NATIVE_PREFLIGHT_METHOD = 'native-sandbox-and-recorded-invocation-binding-v1';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
const events = stdout => stdout.split(/\r?\n/u).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
function relativeFile(root, relative) {
  assert.ok(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.split(/[\\/]/u).includes('..'), 'Unsafe preflight evidence path.');
  return path.join(root, relative);
}
function pin(root, relative) {
  const bytes = fs.readFileSync(relativeFile(root, relative));
  return { path: relative, bytes: bytes.length, sha256: dmDigest(bytes) };
}
function verifyPins(root, files) {
  assert.ok(files?.length, 'Missing pinned preflight artifacts.');
  for (const file of files) assert.deepEqual(pin(root, file.path), file, `Preflight artifact changed: ${file.path}`);
}
const policyKeys = ['default_permissions', 'permissions', 'approval_policy', 'features.skip_host_skill_discovery',
  'features.skill_search', 'features.plugins', 'features.apps', 'features.browser_use', 'features.computer_use',
  'features.shell_snapshot', 'project_doc_max_bytes', 'shell_environment_policy.inherit', 'shell_environment_policy.set.PATH', 'web_search'];
export function dmNativePolicyOverrides(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index++) if (args[index] === '--config') {
    const value = args[index + 1], key = value?.split('=')[0];
    if (policyKeys.includes(key)) {
      assert.ok(!values.has(key) || values.get(key) === value, 'Conflicting permission overrides.');
      values.set(key, value);
    }
  }
  assert.equal(values.size, policyKeys.length, 'Incomplete recorded sandbox policy.');
  return policyKeys.map(key => values.get(key));
}

function priorProbe(runDirectory, run) {
  const lineage = run.cohortExtension.preparationLineage;
  assert.equal(lineage?.directory, 'superseded-preparation', 'Native supplement requires a retained zero-scored-call preparation.');
  const priorDirectory = path.join(runDirectory, lineage.directory);
  verifyPins(priorDirectory, lineage.files);
  const previous = read(path.join(priorDirectory, 'run.json'));
  assert.equal(previous.expansionExecution.attempts.length, 0);
  assert.equal(previous.cohortExtension.manifestHash, lineage.manifestHash);
  const current = new Map(run.cohortExtension.implementation.files.map(file => [file.path, file.sha256]));
  for (const file of previous.cohortExtension.implementation.files) if (file.path !== 'cli/eval/expand-dungeon-master-benchmark.js') assert.equal(current.get(file.path), file.sha256, 'Provider probe transport bytes differ from new preparation.');
  assert.deepEqual(run.cohortExtension.originalImplementation, previous.cohortExtension.originalImplementation, 'Original Codex transport changed.');
  const proof = read(path.join(priorDirectory, 'preflight.json'));
  assert.equal(proof.manifestHash, lineage.manifestHash);
  assert.equal(proof.excludedFromScores, true);
  assert.equal(proof.calls.length, 4);
  assert.deepEqual(proof.calls.map(call => `${call.provider}/${call.condition}`).sort(), ['claude/baseline', 'claude/skill', 'codex/baseline', 'codex/skill']);
  for (const provider of proof.providers) verifyPins(priorDirectory, provider.files);
  return { lineage, priorDirectory, proof };
}

function invocation(workspace, overrides, target) {
  return ['sandbox', ...overrides.flatMap(value => ['--config', value]), '--permission-profile', 'dm-benchmark', '--cd', workspace, '--', '/bin/cat', target];
}

// This launches local native sandbox commands only: no model, agent session,
// provider request, task generation or judgment. It cannot activate readiness.
export async function runDungeonMasterNativePreflight({ runDirectory, run, authorization, spawnSync = childProcess.spawnSync }) {
  assert.ok(authorization?.trim(), 'Explicit native sandbox diagnostic authorization is required.');
  const lock = path.join(runDirectory, 'run.lock'), descriptor = fs.openSync(lock, 'wx', 0o600);
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, operation: 'native-sandbox-preflight', startedAt: new Date().toISOString() }));
  try {
    const { lineage, priorDirectory, proof } = priorProbe(runDirectory, run);
    const prefix = `native-preflight/${new Date().toISOString().replaceAll(':', '-')}`;
    const directory = path.join(runDirectory, prefix), workspace = path.join(directory, 'workspace');
    fs.mkdirSync(workspace, { recursive: true, mode: 0o700 });
    const insidePath = path.join(workspace, 'inside-sentinel.txt'), outsidePath = path.join(directory, 'outside-sentinel.txt');
    const insideMarker = `DM_NATIVE_INSIDE_${crypto.randomBytes(16).toString('hex')}`;
    const outsideMarker = `DM_NATIVE_OUTSIDE_${crypto.randomBytes(16).toString('hex')}`;
    fs.writeFileSync(insidePath, insideMarker, { flag: 'wx', mode: 0o600 });
    fs.writeFileSync(outsidePath, outsideMarker, { flag: 'wx', mode: 0o600 });
    const frozenRuntimePath = path.join(runDirectory, 'parent-evidence/runtime-source/cli/eval/dungeon-master-agent-runtime.js');
    const { dungeonMasterIsolationArguments } = await import(pathToFileURL(frozenRuntimePath));
    const overrides = dmNativePolicyOverrides(dungeonMasterIsolationArguments(['exec', '-'], workspace));
    const normalizedOverrides = overrides.map(value => value.replaceAll(workspace, '<fresh-workspace>'));
    for (const call of proof.calls.filter(call => call.provider === 'codex')) {
      const receipt = read(path.join(priorDirectory, call.evidenceDirectory, 'result.json')).runtimeReceipt;
      assert.deepEqual(normalizedOverrides, dmNativePolicyOverrides(receipt.cliArguments), `Native policy differs from recorded ${call.condition} invocation.`);
    }
    const environment = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SHELL', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'CODEX_HOME']
      .filter(key => typeof process.env[key] === 'string').map(key => [key, process.env[key]]));
    const checks = [];
    for (const [name, target] of [['inside', insidePath], ['outside', outsidePath]]) {
      const args = invocation(workspace, overrides, target);
      const result = spawnSync('codex', args, { cwd: workspace, env: environment, encoding: 'utf8', timeout: 30_000 });
      const stdout = result.stdout || '', stderr = result.stderr || '';
      fs.writeFileSync(path.join(directory, `${name}.stdout.txt`), stdout, { flag: 'wx', mode: 0o600 });
      fs.writeFileSync(path.join(directory, `${name}.stderr.txt`), stderr, { flag: 'wx', mode: 0o600 });
      checks.push({ name, command: 'codex', arguments: args, exitCode: result.status, signal: result.signal,
        error: result.error ? { code: result.error.code, message: result.error.message } : null,
        stdoutFile: `${prefix}/${name}.stdout.txt`, stderrFile: `${prefix}/${name}.stderr.txt` });
    }
    const supplement = { schemaVersion: 1, method: DM_NATIVE_PREFLIGHT_METHOD, excludedFromScores: true, providerCalls: 0,
      authorization, recordedAt: new Date().toISOString(), manifestHash: run.cohortExtension.manifestHash,
      previousManifestHash: lineage.manifestHash, evidenceSource: 'Native Codex sandbox enforcement plus recorded provider invocation binding; not provider-observed tool denial.',
      workspace, insidePath, outsidePath, insideMarker, outsideMarker, normalizedOverrides, configurationSha256: dmDigest(normalizedOverrides),
      originalCodexRuntimeSha256: dmDigest(fs.readFileSync(frozenRuntimePath)), checks,
      files: [`${prefix}/workspace/inside-sentinel.txt`, `${prefix}/outside-sentinel.txt`, ...checks.flatMap(check => [check.stdoutFile, check.stderrFile])].map(relative => pin(runDirectory, relative)) };
    const supplementFile = `${prefix}/supplement.json`;
    write(path.join(runDirectory, supplementFile), supplement);
    try {
      const verified = verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile });
      return { status: verified.status, supplementFile, manifestHash: supplement.manifestHash, configurationSha256: supplement.configurationSha256,
        providerCalls: 0, checks: checks.map(check => ({ name: check.name, exitCode: check.exitCode })), readinessActivated: false };
    } catch (error) {
      return { status: 'failed', supplementFile, manifestHash: supplement.manifestHash, providerCalls: 0, error: error.message, readinessActivated: false };
    }
  } finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
}

// Re-derive readiness from immutable provider artifacts, actual local exit/output
// evidence and exact configuration binding. No stored assertion grants readiness.
export function verifyDungeonMasterNativePreflight({ runDirectory, run, supplementFile }) {
  const { lineage, priorDirectory, proof } = priorProbe(runDirectory, run);
  const supplement = read(relativeFile(runDirectory, supplementFile));
  assert.equal(supplement.method, DM_NATIVE_PREFLIGHT_METHOD);
  assert.equal(supplement.manifestHash, run.cohortExtension.manifestHash);
  assert.equal(supplement.previousManifestHash, lineage.manifestHash);
  assert.equal(supplement.excludedFromScores, true);
  assert.equal(supplement.providerCalls, 0);
  assert.equal(supplement.configurationSha256, dmDigest(supplement.normalizedOverrides));
  assert.equal(supplement.originalCodexRuntimeSha256, dmDigest(fs.readFileSync(path.join(runDirectory, 'parent-evidence/runtime-source/cli/eval/dungeon-master-agent-runtime.js'))));
  verifyPins(runDirectory, supplement.files);
  assert.equal(path.dirname(supplement.insidePath), supplement.workspace);
  assert.notEqual(path.dirname(supplement.outsidePath), supplement.workspace);
  assert.ok(!supplement.outsidePath.startsWith(`${supplement.workspace}/`));
  assert.equal(fs.readFileSync(supplement.insidePath, 'utf8'), supplement.insideMarker);
  assert.equal(fs.readFileSync(supplement.outsidePath, 'utf8'), supplement.outsideMarker);
  assert.deepEqual(supplement.checks.map(check => check.name), ['inside', 'outside']);
  const overrides = supplement.normalizedOverrides.map(value => value.replaceAll('<fresh-workspace>', supplement.workspace));
  for (const check of supplement.checks) {
    assert.equal(check.command, 'codex');
    assert.deepEqual(check.arguments, invocation(supplement.workspace, overrides, check.name === 'inside' ? supplement.insidePath : supplement.outsidePath));
    assert.equal(check.signal, null); assert.equal(check.error, null);
    const stdout = fs.readFileSync(relativeFile(runDirectory, check.stdoutFile), 'utf8');
    const stderr = fs.readFileSync(relativeFile(runDirectory, check.stderrFile), 'utf8');
    if (check.name === 'inside') { assert.equal(check.exitCode, 0, 'Native sandbox could not read its allowed workspace.'); assert.equal(stdout, supplement.insideMarker); }
    else {
      assert.ok(Number.isInteger(check.exitCode) && check.exitCode !== 0, 'Native outside read was not denied.');
      assert.match(stderr, /Operation not permitted|Permission denied/iu);
      assert.equal(stdout, '', 'Denied native read unexpectedly produced output.');
      assert.ok(!stderr.includes(supplement.outsideMarker), 'Native forbidden sentinel leaked.');
    }
  }
  const providers = [];
  for (const provider of ['codex', 'claude']) {
    const calls = proof.calls.filter(call => call.provider === provider), conditions = [];
    for (const call of calls) {
      assert.equal(call.status, 'complete');
      const directory = path.join(priorDirectory, call.evidenceDirectory);
      const result = read(path.join(directory, 'result.json')), request = read(path.join(directory, 'request.json'));
      const receipt = result.runtimeReceipt, args = receipt.cliArguments || [];
      const outputText = result.outputText ?? result.text;
      const stdout = fs.readFileSync(path.join(directory, 'stdout.jsonl'), 'utf8');
      assert.equal(dmDigest(stdout), receipt.stdoutSha256);
      assert.equal(receipt.freshSession, true); assert.equal(receipt.persistedSession, false);
      assert.equal(receipt.requestedModel, request.configuration.model);
      assert.equal(receipt.requestedReasoning, request.configuration.reasoning);
      const snapshot = read(path.join(path.dirname(directory), 'probe-skill-snapshot.json'));
      const marker = snapshot.files.find(file => file.relativePath === 'SKILL.md').contents.match(/DM_ROOT_[a-f0-9]+/u)?.[0];
      assert.ok(marker);
      const forbidden = fs.readFileSync(path.join(path.dirname(directory), 'outside-sentinel.txt'), 'utf8');
      assert.ok(!outputText.includes(forbidden), 'Provider leaked the outside sentinel.');
      if (provider === 'codex') {
        assert.deepEqual(dmNativePolicyOverrides(args), supplement.normalizedOverrides, 'Recorded creator invocation differs from native sandbox policy.');
        assert.equal(receipt.isolation?.hostSkillDiscovery, false);
        assert.equal(receipt.isolation?.projectInstructions, false);
        assert.equal(receipt.isolation?.externalResources, false);
        assert.ok(args.some(arg => arg.startsWith('<disabled-global-skills:')));
        assert.ok(args.includes('--ignore-user-config') && args.includes('--ignore-rules') && args.includes('--ephemeral'));
      } else {
        assert.ok(args.includes('--safe-mode') && args.includes('--restricted') && args.includes('--strict-mcp-config'));
        assert.deepEqual(receipt.allowedTools, ['Read']);
        const raw = events(stdout), content = raw.flatMap(event => event.message?.content || []);
        const outsideCalls = new Set(content.filter(item => item.type === 'tool_use' && item.name === 'Read'
          && request.promptText.includes(item.input?.file_path) && item.input.file_path.endsWith('/outside-sentinel.txt')).map(item => item.id));
        assert.ok(content.some(item => item.type === 'tool_result' && outsideCalls.has(item.tool_use_id) && item.is_error === true), 'Claude actual denied Read event is missing.');
      }
      if (call.condition === 'skill') {
        assert.equal(receipt.skillHash, snapshot.hash); assert.ok(outputText.includes(marker));
        assert.equal(isStorytellingRequiredSkillReadReceiptCompatible({ skillSnapshot: snapshot, requiredSkillFiles: ['references/adventure-design.md'], receipt: receipt.requiredSkillReads, requireComplete: true }), true);
      } else { assert.equal(receipt.skillHash, null); assert.equal(receipt.instructionHash, null); assert.ok(!outputText.includes(marker)); }
      conditions.push({ condition: call.condition, outsideReadEvidence: provider === 'codex' ? 'native-sandbox-enforcement-and-recorded-invocation-binding' : 'provider-recorded-denied-Read-tool-result',
        requiredReferenceReadEvidence: call.condition === 'skill' ? 'retained-successful-frozen-byte-matched-tool-output' : 'not-applicable' });
    }
    const files = proof.providers.find(item => item.provider === provider).files.map(file => ({ ...file, path: `${lineage.directory}/${file.path}` }));
    if (provider === 'codex') files.push(...supplement.files, pin(runDirectory, supplementFile));
    providers.push({ provider, assertions: { freshSessions: true, outsideReadDenied: true, hostSkillCatalogAbsent: true,
      networkUnavailable: true, instructionDelivered: true, requiredReferenceFullBytesObserved: true }, conditions, files });
  }
  return { schemaVersion: 2, method: DM_NATIVE_PREFLIGHT_METHOD, status: 'passed', excludedFromScores: true,
    manifestHash: run.cohortExtension.manifestHash, supplementFile, supplementSha256: pin(runDirectory, supplementFile).sha256,
    previousManifestHash: lineage.manifestHash, previousProviderProofStatus: proof.status, configurationSha256: supplement.configurationSha256,
    evidenceSource: supplement.evidenceSource, providers };
}
