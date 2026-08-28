#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBenchmarkConfiguration } from '../../cli/eval/benchmark-models.js';
import { resolveSkillSource } from '../../cli/eval/skill-source.js';

const BENCHMARK_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(BENCHMARK_DIRECTORY, '..', '..');
const FIXTURE_PATH = join(BENCHMARK_DIRECTORY, 'fixture', 'index.html');
const NEUTRAL_INSTRUCTION_PATH = join(BENCHMARK_DIRECTORY, 'neutral-instruction.txt');
const TASK_PATHS = Object.freeze({
  audit: join(BENCHMARK_DIRECTORY, 'task-audit.md'),
  implementation: join(BENCHMARK_DIRECTORY, 'task-optimize.md')
});
const HISTORY_ROOT = join(
  REPOSITORY_ROOT,
  '.agents',
  'vasir-evals',
  'threejs-water-ripples-performance'
);

const SKILL_NAME = 'code__threejs-rapier-performance';
const DEFAULT_MODEL_SELECTORS = Object.freeze([
  'codex:gpt-5.6-sol@max',
  'codex:gpt-5.6-terra@max',
  'codex:gpt-5.6-luna@max',
  'claude:fable@max',
  'claude:opus@max'
]);
const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY = 10;
const AGENT_TIMEOUT_MS = 30 * 60 * 1000;
const TERMINATION_GRACE_MS = 5_000;
const MAX_STREAM_BYTES = 64 * 1024 * 1024;
const AUDIT_SOURCE_MARKER = '{{SOURCE_INDEX_HTML}}';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function toPosixRelative(filePath) {
  return relative(REPOSITORY_ROOT, filePath).split(sep).join('/');
}

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pathExists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function writeAtomic(filePath, contents, { mode = 0o644 } = {}) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporaryPath, contents, { mode });
  await rename(temporaryPath, filePath);
  await chmod(filePath, mode);
}

async function writeJsonAtomic(filePath, value, options) {
  await writeAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`, options);
}

async function readReceipt(filePath) {
  const contents = await readFile(filePath);
  return {
    contents,
    bytes: contents.length,
    sha256: sha256(contents)
  };
}

async function collectTreeEntries(rootDirectory, currentDirectory = rootDirectory) {
  const names = (await readdir(currentDirectory)).sort();
  const entries = [];
  for (const name of names) {
    const filePath = join(currentDirectory, name);
    const stat = await lstat(filePath);
    const entryPath = relative(rootDirectory, filePath).split(sep).join('/');
    const mode = stat.mode & 0o777;
    if (stat.isDirectory()) {
      entries.push({ path: `${entryPath}/`, type: 'directory', mode });
      entries.push(...await collectTreeEntries(rootDirectory, filePath));
    } else if (stat.isFile()) {
      const file = await readReceipt(filePath);
      entries.push({
        path: entryPath,
        type: 'file',
        mode,
        bytes: file.bytes,
        sha256: file.sha256
      });
    } else if (stat.isSymbolicLink()) {
      const target = await readlink(filePath);
      entries.push({
        path: entryPath,
        type: 'symlink',
        mode,
        target,
        sha256: sha256(target)
      });
    } else {
      entries.push({ path: entryPath, type: 'unsupported', mode });
    }
  }
  return entries;
}

async function treeReceipt(rootDirectory) {
  const entries = await collectTreeEntries(rootDirectory);
  return {
    sha256: sha256(canonicalJson(entries)),
    entryCount: entries.length,
    entries
  };
}

async function assertIsolatedWorkspace(workspacePath) {
  const resolvedWorkspace = await realpath(workspacePath);
  const pathFromRepository = relative(REPOSITORY_ROOT, resolvedWorkspace);
  invariant(
    pathFromRepository === '..' || pathFromRepository.startsWith(`..${sep}`),
    `agent workspace must be outside the repository: ${resolvedWorkspace}`
  );
  let currentPath = resolvedWorkspace;
  while (true) {
    for (const instructionName of ['AGENTS.md', 'CLAUDE.md']) {
      invariant(
        !await pathExists(join(currentPath, instructionName)),
        `ambient ${instructionName} found above agent workspace: ${currentPath}`
      );
    }
    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    help: false,
    concurrency: DEFAULT_CONCURRENCY,
    modelSelectors: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--models') {
      const value = argv[index + 1];
      invariant(value && !value.startsWith('--'), '--models requires a comma-separated value');
      options.modelSelectors.push(...value.split(',').map((part) => part.trim()).filter(Boolean));
      index += 1;
    } else if (argument.startsWith('--models=')) {
      options.modelSelectors.push(
        ...argument.slice('--models='.length).split(',').map((part) => part.trim()).filter(Boolean)
      );
    } else if (argument === '--concurrency') {
      const value = Number(argv[index + 1]);
      invariant(Number.isInteger(value), '--concurrency requires an integer');
      options.concurrency = value;
      index += 1;
    } else if (argument.startsWith('--concurrency=')) {
      options.concurrency = Number(argument.slice('--concurrency='.length));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  invariant(
    Number.isInteger(options.concurrency)
      && options.concurrency >= 1
      && options.concurrency <= MAX_CONCURRENCY,
    `--concurrency must be an integer from 1 to ${MAX_CONCURRENCY}`
  );
  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node benchmarks/threejs-water-ripples-performance/run-agents.mjs [options]\n\n`);
  process.stdout.write(`Options:\n`);
  process.stdout.write(`  --dry-run                 Validate and print the generation plan without agent calls\n`);
  process.stdout.write(`  --models <selectors>      Comma-separated aliases or exact selectors; max reasoning only\n`);
  process.stdout.write(`  --concurrency <1-${MAX_CONCURRENCY}>  Maximum simultaneous fresh sessions (default ${DEFAULT_CONCURRENCY})\n`);
  process.stdout.write(`  -h, --help                Show this help\n\n`);
  process.stdout.write(`Default models: sol, terra, luna, fable, opus at max reasoning.\n`);
}

function normalizeModelSelector(selector) {
  const trimmed = String(selector).trim();
  invariant(trimmed.length > 0, 'model selectors cannot be empty');
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex > 0) {
    invariant(trimmed.slice(atIndex + 1) === 'max', `${trimmed}: this benchmark requires max reasoning`);
    return trimmed;
  }
  return `${trimmed}@max`;
}

function resolveConfigurations(requestedSelectors) {
  const selectors = requestedSelectors.length > 0
    ? requestedSelectors
    : DEFAULT_MODEL_SELECTORS;
  const configurations = selectors.map((selector) =>
    resolveBenchmarkConfiguration(normalizeModelSelector(selector))
  );
  const ids = configurations.map(({ id }) => id);
  invariant(new Set(ids).size === ids.length, 'model selectors contain duplicates');
  invariant(configurations.every(({ reasoning }) => reasoning === 'max'), 'all configurations must use max reasoning');
  return configurations;
}

function buildTreatmentBlock(skillPromptText) {
  return `\n\n--- Vasir Skill Guidance Start ---\n${skillPromptText.trim()}\n--- Vasir Skill Guidance End ---`;
}

function assemblePrompt({ neutralInstruction, task, skillPromptText = null }) {
  const treatmentBlock = skillPromptText ? buildTreatmentBlock(skillPromptText) : '';
  return {
    prompt: `${neutralInstruction.trimEnd()}${treatmentBlock}\n\n${task.trimEnd()}`,
    treatmentBlock
  };
}

function renderAuditTask(taskTemplate, fixtureSource) {
  const occurrences = taskTemplate.split(AUDIT_SOURCE_MARKER).length - 1;
  invariant(occurrences === 1, `task-audit.md must contain exactly one ${AUDIT_SOURCE_MARKER}`);
  invariant(!fixtureSource.includes(AUDIT_SOURCE_MARKER), 'fixture unexpectedly contains the audit source marker');
  return taskTemplate.replace(AUDIT_SOURCE_MARKER, fixtureSource);
}

function cryptoRandomIndex(limit) {
  invariant(limit > 0 && limit <= 0x1_0000_0000, 'random index limit is invalid');
  const maximum = Math.floor(0x1_0000_0000 / limit) * limit;
  while (true) {
    const value = randomBytes(4).readUInt32BE(0);
    if (value < maximum) return value % limit;
  }
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = cryptoRandomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createRows({ configurations, prompts }) {
  const pairs = [];
  const rows = [];

  for (const configuration of configurations) {
    for (const lane of ['audit', 'implementation']) {
      const pairId = `pair-${safeSlug(configuration.id)}-${lane}`;
      const conditionOrder = shuffled(['clean', 'skill']);
      const pairRows = conditionOrder.map((condition) => {
        const rowId = `row-${randomBytes(6).toString('hex')}`;
        const prompt = prompts[lane][condition];
        const row = {
          rowId,
          pairId,
          lane,
          condition,
          configuration,
          prompt,
          promptSha256: sha256(prompt)
        };
        rows.push(row);
        return row;
      });
      pairs.push({
        pairId,
        lane,
        configurationId: configuration.id,
        launchOrder: pairRows.map(({ rowId }) => rowId),
        rows: pairRows.map(({ rowId, condition }) => ({ rowId, condition }))
      });
    }
  }

  const launchRows = shuffled(rows);
  launchRows.forEach((row, launchOrdinal) => {
    row.launchOrdinal = launchOrdinal;
  });
  return { pairs, rows, launchRows };
}

function createLaunchEnvironment() {
  const environment = { ...process.env };
  const removedKeys = Object.keys(environment)
    .filter((key) =>
      key.startsWith('RATATOSK_')
      || [
        'CLAUDE_CODE_ENTRYPOINT',
        'CLAUDE_CODE_SESSION_ID',
        'CODEX_SESSION_ID',
        'CODEX_THREAD_ID',
        'INIT_CWD',
        'OLDPWD',
        'PWD',
        '_'
      ].includes(key)
    )
    .sort();
  for (const key of removedKeys) delete environment[key];
  Object.assign(environment, {
    CI: '1',
    CODEX_CI: '1',
    NO_COLOR: '1',
    TERM: 'dumb',
    TZ: 'UTC'
  });
  return {
    environment,
    receipt: {
      inheritedKeySetSha256: sha256(canonicalJson(Object.keys(environment).sort())),
      removedSessionAndHookKeys: removedKeys,
      fixedOverrides: {
        CI: '1',
        CODEX_CI: '1',
        NO_COLOR: '1',
        TERM: 'dumb',
        TZ: 'UTC'
      },
      secretValuesRetainedForAuthenticationButNotRecorded: true
    }
  };
}

function codexArguments(configuration, workspacePath, { normalized = false } = {}) {
  return [
    '--ask-for-approval',
    'never',
    '--disable',
    'multi_agent',
    '--disable',
    'plugins',
    '--disable',
    'apps',
    '--disable',
    'skill_search',
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--skip-git-repo-check',
    '--sandbox',
    'workspace-write',
    '--model',
    configuration.model,
    '--config',
    `model_reasoning_effort="${configuration.reasoning}"`,
    '--color',
    'never',
    '--json',
    '--cd',
    normalized ? '<isolated-workspace>' : workspacePath,
    '-'
  ];
}

function claudeArguments(configuration) {
  return [
    '--print',
    '--safe-mode',
    '--disable-slash-commands',
    '--tools',
    'Read,Edit,Write',
    '--permission-mode',
    'acceptEdits',
    '--model',
    configuration.model,
    '--effort',
    configuration.reasoning,
    '--no-session-persistence',
    '--no-chrome',
    '--output-format',
    'json'
  ];
}

function captureProcess(command, argumentsList, {
  cwd,
  environment,
  inputText = null,
  timeoutMs = AGENT_TIMEOUT_MS,
  maxStreamBytes = MAX_STREAM_BYTES
}) {
  return new Promise((resolveProcess) => {
    const startedAtMs = Date.now();
    let child;
    try {
      child = spawn(command, argumentsList, {
        cwd,
        env: environment,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      resolveProcess({
        startedAtMs,
        endedAtMs: Date.now(),
        exitCode: null,
        signal: null,
        timedOut: false,
        outputLimitExceeded: false,
        spawnError: error.message,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0)
      });
      return;
    }

    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputLimitExceeded = false;
    let timedOut = false;
    let settled = false;
    let forceKillTimer = null;

    const collect = (chunks, chunk, currentBytes) => {
      const remaining = Math.max(0, maxStreamBytes - currentBytes);
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      if (chunk.length > remaining && !outputLimitExceeded) {
        outputLimitExceeded = true;
        child.kill('SIGTERM');
        forceKillTimer = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS);
      }
      return currentBytes + Math.min(chunk.length, remaining);
    };

    child.stdout?.on('data', (chunk) => {
      stdoutBytes = collect(stdoutChunks, Buffer.from(chunk), stdoutBytes);
    });
    child.stderr?.on('data', (chunk) => {
      stderrBytes = collect(stderrChunks, Buffer.from(chunk), stderrBytes);
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS);
    }, timeoutMs);

    const finish = (exitCode, signal, spawnError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolveProcess({
        startedAtMs,
        endedAtMs: Date.now(),
        exitCode,
        signal,
        timedOut,
        outputLimitExceeded,
        spawnError,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks)
      });
    };
    child.on('error', (error) => finish(null, null, error.message));
    child.on('close', (exitCode, signal) => finish(exitCode, signal, null));
    child.stdin?.on('error', () => {});
    child.stdin?.end(inputText ?? undefined);
  });
}

function parseCodexOutput(stdout) {
  const events = [];
  let unparsedLineCount = 0;
  for (const rawLine of stdout.toString('utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      unparsedLineCount += 1;
    }
  }
  const completedItems = events
    .filter((event) => event?.type === 'item.completed' && event?.item)
    .map((event) => event.item);
  const finalText = completedItems
    .filter((item) => item.type === 'agent_message')
    .at(-1)?.text?.trim() ?? '';
  const completion = events.findLast((event) => event?.type === 'turn.completed') ?? null;
  return {
    finalText,
    complete: Boolean(
      events.find((event) => event?.type === 'thread.started')?.thread_id
      && completion
      && finalText
    ),
    usage: completion?.usage ?? null,
    runtime: {
      threadId: events.find((event) => event?.type === 'thread.started')?.thread_id ?? null,
      eventCount: events.length,
      unparsedLineCount,
      itemTypeCounts: completedItems.reduce((counts, item) => {
        counts[item.type] = Number(counts[item.type] ?? 0) + 1;
        return counts;
      }, {})
    }
  };
}

function parseClaudeOutput(stdout) {
  let payload = null;
  try {
    payload = JSON.parse(stdout.toString('utf8').trim());
  } catch {
    // The bounded raw output remains retained for diagnosis.
  }
  const finalText = String(payload?.result ?? '').trim();
  return {
    finalText,
    complete: Boolean(payload && payload.is_error !== true && finalText),
    usage: payload?.usage ?? null,
    costUsd: Number.isFinite(Number(payload?.total_cost_usd))
      ? Number(payload.total_cost_usd)
      : null,
    runtime: {
      sessionId: payload?.session_id ?? null,
      numTurns: Number(payload?.num_turns ?? 0),
      canonicalModels: Object.values(payload?.modelUsage ?? {})
        .map((entry) => entry?.canonicalModel)
        .filter(Boolean),
      permissionDenials: Array.isArray(payload?.permission_denials)
        ? payload.permission_denials
        : []
    }
  };
}

async function createIsolatedWorkspace(row, fixtureContents) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'vasir-water-ripples-agent-'));
  const workspacePath = join(temporaryRoot, 'workspace');
  await mkdir(workspacePath, { mode: 0o700 });
  if (row.lane === 'implementation') {
    await writeFile(join(workspacePath, 'index.html'), fixtureContents, {
      flag: 'wx',
      mode: 0o644
    });
  }
  await assertIsolatedWorkspace(workspacePath);
  return {
    temporaryRoot,
    workspacePath,
    inputTree: await treeReceipt(workspacePath)
  };
}

async function createPatch({ fixturePath, workspacePath, temporaryRoot }) {
  const baselineDirectory = join(temporaryRoot, 'baseline');
  const candidateDirectory = join(temporaryRoot, 'candidate');
  await mkdir(baselineDirectory);
  await cp(fixturePath, join(baselineDirectory, 'index.html'));
  await cp(workspacePath, candidateDirectory, { recursive: true });
  const processResult = await captureProcess('git', [
    'diff',
    '--no-index',
    '--binary',
    '--no-ext-diff',
    '--src-prefix=a/',
    '--dst-prefix=b/',
    '--',
    'baseline',
    'candidate'
  ], {
    cwd: temporaryRoot,
    environment: process.env,
    timeoutMs: 30_000,
    maxStreamBytes: MAX_STREAM_BYTES
  });
  invariant(
    !processResult.spawnError
      && !processResult.timedOut
      && !processResult.outputLimitExceeded
      && [0, 1].includes(processResult.exitCode),
    `could not retain patch: ${processResult.spawnError ?? processResult.stderr.toString('utf8').trim()}`
  );
  return processResult.stdout;
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function retainRowResult({
  row,
  runDirectory,
  fixturePath,
  fixtureHash,
  workspace,
  processResult,
  commandArguments,
  cliVersion
}) {
  const rowDirectory = join(runDirectory, 'rows', row.rowId);
  const provider = row.configuration.provider;
  const rawOutputName = provider === 'codex' ? 'events.jsonl' : 'result.json';
  const parsed = provider === 'codex'
    ? parseCodexOutput(processResult.stdout)
    : parseClaudeOutput(processResult.stdout);
  const runtimeComplete = processResult.exitCode === 0
    && !processResult.timedOut
    && !processResult.outputLimitExceeded
    && !processResult.spawnError
    && parsed.complete;
  const finalContents = `${parsed.finalText}${parsed.finalText ? '\n' : ''}`;

  await Promise.all([
    writeAtomic(join(rowDirectory, rawOutputName), processResult.stdout, { mode: 0o600 }),
    writeAtomic(join(rowDirectory, 'stderr.log'), processResult.stderr, { mode: 0o600 }),
    writeAtomic(join(rowDirectory, 'final.md'), finalContents, { mode: 0o600 })
  ]);

  let artifactStatus;
  let outputReceipt = null;
  let retainedWorkspacePath = null;
  let patchPath = null;

  if (row.lane === 'audit') {
    artifactStatus = parsed.finalText ? 'audit-response' : 'missing-audit-response';
  } else {
    const workspaceSnapshotPath = join(rowDirectory, 'workspace');
    await cp(workspace.workspacePath, workspaceSnapshotPath, {
      recursive: true,
      dereference: false,
      errorOnExist: true,
      force: false
    });
    const outputTree = await treeReceipt(workspaceSnapshotPath);
    const outputIndexPath = join(workspaceSnapshotPath, 'index.html');
    const outputIndexExists = await pathExists(outputIndexPath)
      && (await lstat(outputIndexPath)).isFile();
    const outputIndex = outputIndexExists ? await readReceipt(outputIndexPath) : null;
    const workspaceSingleFileContract = outputTree.entryCount === 1
      && outputTree.entries[0]?.path === 'index.html'
      && outputTree.entries[0]?.type === 'file';
    artifactStatus = !outputIndex
      ? 'missing-index'
      : !workspaceSingleFileContract
        ? 'unexpected-workspace-entries'
      : outputIndex.sha256 === fixtureHash
        ? 'unchanged-index'
        : 'changed-index';
    const patch = await createPatch({
      fixturePath,
      workspacePath: workspace.workspacePath,
      temporaryRoot: workspace.temporaryRoot
    });
    await writeAtomic(join(rowDirectory, 'patch.diff'), patch, { mode: 0o600 });
    outputReceipt = {
      rowId: row.rowId,
      status: artifactStatus,
      workspaceSingleFileContract,
      inputTree: workspace.inputTree,
      workspace: {
        path: `rows/${row.rowId}/workspace`,
        ...outputTree
      },
      index: outputIndex
        ? {
            path: `rows/${row.rowId}/workspace/index.html`,
            bytes: outputIndex.bytes,
            sha256: outputIndex.sha256
          }
        : null,
      patch: {
        path: `rows/${row.rowId}/patch.diff`,
        bytes: patch.length,
        sha256: sha256(patch),
        changed: patch.length > 0
      }
    };
    await writeJsonAtomic(join(rowDirectory, 'output-tree.json'), outputReceipt, { mode: 0o600 });
    retainedWorkspacePath = `rows/${row.rowId}/workspace/index.html`;
    patchPath = `rows/${row.rowId}/patch.diff`;
  }

  const rowComplete = runtimeComplete
    && (row.lane === 'audit' ? artifactStatus === 'audit-response' : artifactStatus === 'changed-index');
  const normalizedArguments = provider === 'codex'
    ? codexArguments(row.configuration, workspace.workspacePath, { normalized: true })
    : claudeArguments(row.configuration);
  const runtimeReceipt = {
    rowId: row.rowId,
    status: runtimeComplete ? 'complete' : 'agent-error',
    requestedConfiguration: {
      ...row.configuration,
      cliVersion
    },
    command: {
      executable: provider,
      normalizedArguments,
      normalizedArgumentsSha256: sha256(canonicalJson(normalizedArguments)),
      exactArgumentsSha256: sha256(canonicalJson(commandArguments))
    },
    startedAt: new Date(processResult.startedAtMs).toISOString(),
    endedAt: new Date(processResult.endedAtMs).toISOString(),
    durationMs: processResult.endedAtMs - processResult.startedAtMs,
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    timedOut: processResult.timedOut,
    timeoutMs: AGENT_TIMEOUT_MS,
    outputLimitExceeded: processResult.outputLimitExceeded,
    maxBytesPerProcessStream: MAX_STREAM_BYTES,
    spawnError: processResult.spawnError,
    freshSession: true,
    persistedSession: false,
    usage: parsed.usage,
    costUsd: parsed.costUsd ?? null,
    providerRuntime: parsed.runtime,
    evidence: {
      rawOutput: {
        path: `rows/${row.rowId}/${rawOutputName}`,
        bytes: processResult.stdout.length,
        sha256: sha256(processResult.stdout)
      },
      stderr: {
        path: `rows/${row.rowId}/stderr.log`,
        bytes: processResult.stderr.length,
        sha256: sha256(processResult.stderr)
      },
      final: {
        path: `rows/${row.rowId}/final.md`,
        bytes: Buffer.byteLength(finalContents),
        sha256: sha256(finalContents)
      }
    }
  };
  await writeJsonAtomic(join(rowDirectory, 'runtime-receipt.json'), runtimeReceipt, { mode: 0o600 });

  return {
    rowId: row.rowId,
    pairId: row.pairId,
    lane: row.lane,
    condition: row.condition,
    configuration: row.configuration,
    launchOrdinal: row.launchOrdinal,
    status: rowComplete ? 'complete' : 'incomplete',
    artifactStatus,
    prompt: {
      path: `rows/${row.rowId}/prompt.txt`,
      bytes: Buffer.byteLength(row.prompt),
      sha256: row.promptSha256
    },
    runtimeReceiptPath: `rows/${row.rowId}/runtime-receipt.json`,
    responsePath: `rows/${row.rowId}/final.md`,
    workspacePath: retainedWorkspacePath,
    outputReceiptPath: outputReceipt ? `rows/${row.rowId}/output-tree.json` : null,
    patchPath
  };
}

async function captureCliVersion(executable) {
  const result = await captureProcess(executable, ['--version'], {
    cwd: REPOSITORY_ROOT,
    environment: process.env,
    timeoutMs: 10_000,
    maxStreamBytes: 1024 * 1024
  });
  invariant(!result.spawnError, `${executable} is unavailable: ${result.spawnError}`);
  invariant(!result.timedOut && result.exitCode === 0, `${executable} --version failed`);
  return result.stdout.toString('utf8').trim();
}

async function resolveBasis(configurations) {
  const [fixtureFile, neutralFile, auditTaskFile, implementationTaskFile] = await Promise.all([
    readReceipt(FIXTURE_PATH),
    readReceipt(NEUTRAL_INSTRUCTION_PATH),
    readReceipt(TASK_PATHS.audit),
    readReceipt(TASK_PATHS.implementation)
  ]);
  const fixtureSource = fixtureFile.contents.toString('utf8');
  const neutralInstruction = neutralFile.contents.toString('utf8');
  const auditTaskTemplate = auditTaskFile.contents.toString('utf8');
  const implementationTask = implementationTaskFile.contents.toString('utf8');
  const auditTask = renderAuditTask(auditTaskTemplate, fixtureSource);
  const skill = resolveSkillSource({
    skillName: SKILL_NAME,
    currentWorkingDirectory: REPOSITORY_ROOT,
    projectRootDirectory: REPOSITORY_ROOT,
    homeDirectory: homedir(),
    repositoryUrl: 'https://github.com/erikhazzard/vasir.git',
    platform: process.platform,
    spawnSyncImplementation: spawnSync
  });
  invariant(skill.sourceType === 'repo-source', `skill source must be repo-source, got ${skill.sourceType}`);
  const skillFiles = skill.promptFiles.map(({ relativeFilePath, contents }) => {
    invariant(!relativeFilePath.startsWith('evals/'), `eval material leaked into skill prompt: ${relativeFilePath}`);
    return {
      relativeFilePath,
      bytes: Buffer.byteLength(contents),
      sha256: sha256(contents)
    };
  });
  const tasks = { audit: auditTask, implementation: implementationTask };
  const prompts = {};
  for (const lane of Object.keys(tasks)) {
    const clean = assemblePrompt({ neutralInstruction, task: tasks[lane] });
    const treated = assemblePrompt({
      neutralInstruction,
      task: tasks[lane],
      skillPromptText: skill.promptText
    });
    invariant(clean.treatmentBlock === '', `${lane}: clean treatment block is not empty`);
    invariant(treated.treatmentBlock.length > 0, `${lane}: skill treatment block is empty`);
    invariant(
      treated.prompt.replace(treated.treatmentBlock, '') === clean.prompt,
      `${lane}: removing the skill block does not recover the byte-identical clean prompt`
    );
    prompts[lane] = { clean: clean.prompt, skill: treated.prompt };
  }
  const plan = createRows({ configurations, prompts });
  return {
    files: {
      fixture: fixtureFile,
      neutral: neutralFile,
      auditTask: auditTaskFile,
      implementationTask: implementationTaskFile
    },
    fixtureSource,
    skill,
    skillFiles,
    prompts,
    ...plan
  };
}

function dryRunPayload({ configurations, basis, concurrency }) {
  return {
    kind: 'threejs-water-ripples-performance-agent-plan',
    schemaVersion: 1,
    dryRun: true,
    benchmarkId: 'threejs-water-ripples-performance',
    skill: {
      name: SKILL_NAME,
      sourceType: basis.skill.sourceType,
      serializedSha256: basis.skill.skillHash,
      files: basis.skillFiles
    },
    fixture: {
      sourcePath: toPosixRelative(FIXTURE_PATH),
      bytes: basis.files.fixture.bytes,
      sha256: basis.files.fixture.sha256
    },
    configurations,
    concurrency,
    pairCount: basis.pairs.length,
    rowCount: basis.rows.length,
    lanes: {
      audit: basis.rows.filter(({ lane }) => lane === 'audit').length,
      implementation: basis.rows.filter(({ lane }) => lane === 'implementation').length
    },
    conditions: {
      clean: basis.rows.filter(({ condition }) => condition === 'clean').length,
      skill: basis.rows.filter(({ condition }) => condition === 'skill').length
    },
    pairs: basis.pairs,
    promptHashes: basis.rows.map(({ rowId, lane, condition, configuration, promptSha256 }) => ({
      rowId,
      lane,
      condition,
      configurationId: configuration.id,
      sha256: promptSha256
    })),
    agentCallsExecuted: 0
  };
}

async function retainBasis({ runDirectory, basis, configurations, cliVersions, launchEnvironment }) {
  const basisDirectory = join(runDirectory, 'basis');
  await Promise.all([
    writeAtomic(join(basisDirectory, 'fixture', 'index.html'), basis.files.fixture.contents),
    writeAtomic(join(basisDirectory, 'neutral-instruction.txt'), basis.files.neutral.contents),
    writeAtomic(join(basisDirectory, 'task-audit.md'), basis.files.auditTask.contents),
    writeAtomic(join(basisDirectory, 'task-optimize.md'), basis.files.implementationTask.contents),
    writeAtomic(join(basisDirectory, 'skill', 'snapshot.md'), basis.skill.promptText),
    writeJsonAtomic(join(basisDirectory, 'skill', 'files.json'), {
      name: SKILL_NAME,
      sourceType: basis.skill.sourceType,
      serializedSha256: basis.skill.skillHash,
      files: basis.skillFiles
    })
  ]);
  const manifest = {
    kind: 'threejs-water-ripples-performance-agent-basis',
    schemaVersion: 1,
    benchmarkId: 'threejs-water-ripples-performance',
    fixture: {
      sourcePath: toPosixRelative(FIXTURE_PATH),
      retainedPath: 'basis/fixture/index.html',
      bytes: basis.files.fixture.bytes,
      sha256: basis.files.fixture.sha256
    },
    prompts: {
      assembly: 'neutral + optional exact serialized skill block + lane task',
      neutral: {
        sourcePath: toPosixRelative(NEUTRAL_INSTRUCTION_PATH),
        retainedPath: 'basis/neutral-instruction.txt',
        sha256: basis.files.neutral.sha256
      },
      auditTask: {
        sourcePath: toPosixRelative(TASK_PATHS.audit),
        retainedPath: 'basis/task-audit.md',
        templateSha256: basis.files.auditTask.sha256,
        renderedTaskSha256: sha256(renderAuditTask(
          basis.files.auditTask.contents.toString('utf8'),
          basis.fixtureSource
        )),
        sourceEmbeddedReadOnly: true
      },
      implementationTask: {
        sourcePath: toPosixRelative(TASK_PATHS.implementation),
        retainedPath: 'basis/task-optimize.md',
        sha256: basis.files.implementationTask.sha256
      },
      skill: {
        name: SKILL_NAME,
        sourceType: basis.skill.sourceType,
        retainedPath: 'basis/skill/snapshot.md',
        serializedSha256: basis.skill.skillHash,
        files: basis.skillFiles
      },
      cleanAndSkillDifferOnlyByExactSkillBlock: true
    },
    configurations,
    runtime: {
      cliVersions,
      maxConcurrency: MAX_CONCURRENCY,
      requestedConcurrency: launchEnvironment.concurrency,
      timeoutMs: AGENT_TIMEOUT_MS,
      maxBytesPerProcessStream: MAX_STREAM_BYTES,
      codex: {
        sandbox: 'workspace-write',
        approvalPolicy: 'never',
        ephemeral: true,
        ambientUserConfig: false,
        ambientRules: false,
        multiAgent: false,
        plugins: false,
        apps: false,
        skillSearch: false
      },
      claude: {
        safeMode: true,
        tools: ['Read', 'Edit', 'Write'],
        permissionMode: 'acceptEdits',
        sessionPersistence: false,
        slashCommandsAndSkills: false,
        chrome: false
      },
      environment: launchEnvironment.receipt
    }
  };
  const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeAtomic(join(basisDirectory, 'manifest.json'), manifestContents);
  return {
    path: 'basis/manifest.json',
    bytes: Buffer.byteLength(manifestContents),
    sha256: sha256(manifestContents)
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const configurations = resolveConfigurations(options.modelSelectors);
  const basis = await resolveBasis(configurations);
  invariant(basis.rows.length === configurations.length * 4, 'expected four sessions per model');
  invariant(basis.pairs.length === configurations.length * 2, 'expected two pairs per model');

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(dryRunPayload({
      configurations,
      basis,
      concurrency: options.concurrency
    }), null, 2)}\n`);
    return;
  }

  const startedAt = new Date();
  const [codexVersion, claudeVersion, gitVersion] = await Promise.all([
    configurations.some(({ provider }) => provider === 'codex')
      ? captureCliVersion('codex')
      : Promise.resolve(null),
    configurations.some(({ provider }) => provider === 'claude')
      ? captureCliVersion('claude')
      : Promise.resolve(null),
    captureCliVersion('git')
  ]);
  const cliVersions = { codex: codexVersion, claude: claudeVersion, git: gitVersion };
  const generationBasis = {
    fixtureSha256: basis.files.fixture.sha256,
    neutralInstructionSha256: basis.files.neutral.sha256,
    auditTaskTemplateSha256: basis.files.auditTask.sha256,
    implementationTaskSha256: basis.files.implementationTask.sha256,
    skillSha256: basis.skill.skillHash,
    configurations,
    cliVersions,
    concurrency: options.concurrency
  };
  const timestamp = startedAt.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  const runId = `${timestamp}__${sha256(canonicalJson(generationBasis)).slice(0, 12)}__${randomBytes(3).toString('hex')}`;
  const runDirectory = join(HISTORY_ROOT, runId);
  await mkdir(HISTORY_ROOT, { recursive: true, mode: 0o700 });
  await mkdir(runDirectory, { recursive: false, mode: 0o700 });

  const launchEnvironment = createLaunchEnvironment();
  launchEnvironment.concurrency = options.concurrency;
  const basisManifest = await retainBasis({
    runDirectory,
    basis,
    configurations,
    cliVersions,
    launchEnvironment
  });

  const workspaces = new Map();
  try {
    for (const row of basis.rows) {
      const rowDirectory = join(runDirectory, 'rows', row.rowId);
      await mkdir(rowDirectory, { recursive: true, mode: 0o700 });
      await writeAtomic(join(rowDirectory, 'prompt.txt'), row.prompt, { mode: 0o600 });
      const workspace = await createIsolatedWorkspace(row, basis.files.fixture.contents);
      workspaces.set(row.rowId, workspace);
      invariant(
        row.lane === 'audit'
          ? workspace.inputTree.entryCount === 0
          : workspace.inputTree.entryCount === 1
            && workspace.inputTree.entries[0]?.path === 'index.html'
            && workspace.inputTree.entries[0]?.sha256 === basis.files.fixture.sha256,
        `${row.rowId}: isolated input workspace is invalid`
      );
      await writeJsonAtomic(join(rowDirectory, 'input-receipt.json'), {
        rowId: row.rowId,
        pairId: row.pairId,
        lane: row.lane,
        condition: row.condition,
        configuration: row.configuration,
        launchOrdinal: row.launchOrdinal,
        sourceMode: row.lane === 'audit' ? 'embedded-read-only' : 'isolated-workspace-copy',
        inputTree: workspace.inputTree,
        exactPrompt: {
          path: `rows/${row.rowId}/prompt.txt`,
          bytes: Buffer.byteLength(row.prompt),
          sha256: row.promptSha256
        }
      }, { mode: 0o600 });
    }

    const initialRows = basis.rows.map((row) => ({
      rowId: row.rowId,
      pairId: row.pairId,
      lane: row.lane,
      condition: row.condition,
      configuration: row.configuration,
      launchOrdinal: row.launchOrdinal,
      status: 'ready',
      prompt: {
        path: `rows/${row.rowId}/prompt.txt`,
        bytes: Buffer.byteLength(row.prompt),
        sha256: row.promptSha256
      },
      inputReceiptPath: `rows/${row.rowId}/input-receipt.json`,
      runtimeReceiptPath: null,
      responsePath: null,
      workspacePath: null,
      outputReceiptPath: null,
      patchPath: null
    }));
    const initialRun = {
      kind: 'threejs-water-ripples-performance-agent-run',
      schemaVersion: 1,
      benchmarkId: 'threejs-water-ripples-performance',
      runId,
      runStatus: 'ready-to-launch',
      startedAt: startedAt.toISOString(),
      basis: { manifestPath: basisManifest.path, manifestSha256: basisManifest.sha256 },
      skill: { name: SKILL_NAME, serializedSha256: basis.skill.skillHash },
      models: configurations,
      pairs: basis.pairs,
      rows: initialRows,
      generation: {
        concurrent: true,
        maxConcurrency: options.concurrency,
        expectedRowCount: basis.rows.length,
        completedRowCount: 0,
        auditRowCount: basis.rows.filter(({ lane }) => lane === 'audit').length,
        implementationRowCount: basis.rows.filter(({ lane }) => lane === 'implementation').length
      },
      nextRequiredAction: 'Launch the randomized fresh-agent rows.',
      claimBoundary: 'Generation plan only. No audit quality, visual equivalence, topology, or runtime claim is established.'
    };
    await writeJsonAtomic(join(runDirectory, 'run.json'), initialRun);

    process.stdout.write(`Run ${runId}: launching ${basis.launchRows.length} fresh sessions (concurrency ${options.concurrency})\n`);
    const retainedRows = await runWithConcurrency(
      basis.launchRows,
      options.concurrency,
      async (row) => {
        const workspace = workspaces.get(row.rowId);
        try {
          const commandArguments = row.configuration.provider === 'codex'
            ? codexArguments(row.configuration, workspace.workspacePath)
            : claudeArguments(row.configuration);
          const result = await captureProcess(row.configuration.provider, commandArguments, {
            cwd: workspace.workspacePath,
            environment: launchEnvironment.environment,
            inputText: row.prompt
          });
          const retained = await retainRowResult({
            row,
            runDirectory,
            fixturePath: FIXTURE_PATH,
            fixtureHash: basis.files.fixture.sha256,
            workspace,
            processResult: result,
            commandArguments,
            cliVersion: cliVersions[row.configuration.provider]
          });
          process.stdout.write(`${row.rowId} ${row.configuration.id} ${row.lane}/${row.condition}: ${retained.status}\n`);
          return retained;
        } catch (error) {
          const errorContents = `${error.stack ?? error.message}\n`;
          await writeAtomic(
            join(runDirectory, 'rows', row.rowId, 'coordinator-error.log'),
            errorContents,
            { mode: 0o600 }
          );
          const retained = {
            rowId: row.rowId,
            pairId: row.pairId,
            lane: row.lane,
            condition: row.condition,
            configuration: row.configuration,
            launchOrdinal: row.launchOrdinal,
            status: 'incomplete',
            artifactStatus: 'coordinator-error',
            prompt: {
              path: `rows/${row.rowId}/prompt.txt`,
              bytes: Buffer.byteLength(row.prompt),
              sha256: row.promptSha256
            },
            runtimeReceiptPath: null,
            responsePath: null,
            workspacePath: null,
            outputReceiptPath: null,
            patchPath: null,
            coordinatorErrorPath: `rows/${row.rowId}/coordinator-error.log`
          };
          process.stdout.write(`${row.rowId} ${row.configuration.id} ${row.lane}/${row.condition}: coordinator-error\n`);
          return retained;
        }
      }
    );
    retainedRows.sort((left, right) => left.launchOrdinal - right.launchOrdinal);
    const completedAt = new Date();
    const completedRowCount = retainedRows.filter(({ status }) => status === 'complete').length;
    const runStatus = completedRowCount === retainedRows.length
      ? 'generation-complete'
      : 'generation-incomplete';
    const finalRun = {
      ...initialRun,
      runStatus,
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      rows: retainedRows,
      generation: {
        ...initialRun.generation,
        completedRowCount,
        incompleteRowCount: retainedRows.length - completedRowCount
      },
      nextRequiredAction: runStatus === 'generation-complete'
        ? 'Run the benchmark-local candidate verifier, then measure accepted implementation rows.'
        : 'Inspect incomplete row receipts before deciding whether to start a new run.',
      claimBoundary: 'Fresh audit responses and implementation artifacts are retained. No audit quality, visual equivalence, topology, or runtime win is established until separate checks run.'
    };
    await writeJsonAtomic(join(runDirectory, 'run.json'), finalRun);
    process.stdout.write(`${runStatus}: ${completedRowCount}/${retainedRows.length} rows retained at ${runDirectory}\n`);
    if (runStatus !== 'generation-complete') process.exitCode = 1;
  } finally {
    await Promise.all([...workspaces.values()].map(({ temporaryRoot }) =>
      rm(temporaryRoot, { recursive: true, force: true })
    ));
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
