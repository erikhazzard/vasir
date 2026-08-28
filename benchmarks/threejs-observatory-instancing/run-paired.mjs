import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep
} from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSkillSource } from '../../cli/eval/skill-source.js';

const BENCHMARK_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
const FIXTURE_DIR = join(BENCHMARK_DIR, 'fixture');
const FIXTURE_APPROVAL_DIR = join(FIXTURE_DIR, 'captures', 'approved');
const FIXTURE_APPROVAL_PATH = join(FIXTURE_APPROVAL_DIR, 'manifest.json');
const ORACLE_DIR = join(BENCHMARK_DIR, 'oracle');
const ORACLE_APPROVAL_DIR = join(ORACLE_DIR, 'captures', 'approved');
const ORACLE_APPROVAL_PATH = join(ORACLE_APPROVAL_DIR, 'manifest.json');
const NEUTRAL_INSTRUCTION_PATH = join(BENCHMARK_DIR, 'neutral-instruction.txt');
const TASK_PATH = join(BENCHMARK_DIR, 'task.md');
const HISTORY_ROOT = join(
  REPO_ROOT,
  '.agents',
  'vasir-evals',
  'threejs-observatory-instancing'
);

const GATE_ID = 'THREEJS-OBSERVATORY__M4P__G2';
const HARNESS_VERSION = 1;
const SKILL_NAME = 'code__threejs-rapier-performance';
const MODEL = 'gpt-5.6-sol';
const REASONING = 'xhigh';
const CODEX_VERSION = 'codex-cli 0.149.1';
const AGENT_TIMEOUT_MS = 20 * 60 * 1000;
const TERMINATION_GRACE_MS = 5_000;
const PREFLIGHT_TIMEOUT_MS = 10_000;
const DIFF_TIMEOUT_MS = 30_000;
const MAX_PROCESS_STREAM_BYTES = 64 * 1024 * 1024;

const EXPECTED_BASIS = Object.freeze({
  fixture: Object.freeze({
    manifestSha256: '7390dbdcafd3fe4ffd8a8b60d472562303136033525d3f6bfff4521cc27579af',
    kind: 'threejs-observatory-uninstanced-fixture-approved',
    sourceSha256: 'b9950824c09966cb3874049af509da39a5c8abac9beb6e652cda6dc0802cef29',
    captures: Object.freeze({
      'portrait-tick-0240.png': '36cd18cf47c0c7d46571058748be74c4ab1f1dfec137f35116d2f3b50ac257cf',
      'landscape-tick-0240.png': '6c946b41f9f01600f9ab6891ac35cc248f5b7f175f56f8412f036447c4290eaf'
    })
  }),
  oracle: Object.freeze({
    manifestSha256: '99ea1a54078f1de87221a1e8a60d194f1dd58fe0cd173ae54c296c6cfa2232f5',
    kind: 'threejs-observatory-visual-oracle-approved',
    sourceSha256: 'c406d5a7af3de4b1d5be5bd077bc861194cdc59207d55744c2b9b13ad5ff7a6f',
    captures: Object.freeze({
      'portrait-tick-0240.png': '0426eced486ae20ddc3d50c7119dbab0731c2eea15ef6b90c405987e640d081d',
      'landscape-tick-0240.png': 'd29b968f754c4a0cdaa255edcbccadabf32580425901e679fd9e27d9c9994b69'
    })
  }),
  treatment: Object.freeze({
    sha256: 'f3cd57b64e207668fbfbc8fd8e2b0707d78e4ea54de6128708e3761463c7a290',
    files: Object.freeze({
      'SKILL.md': '524348e5e87696b1b47c47df644bf7af1b086d239bb4d34c1eddad8f0b2c4098',
      'references/render-topology-guard.md': '28c007f27ceed93c4bab048d03e0d44bab2274e97ed3f3af72c4916b1a23ea4b'
    })
  }),
  prompt: Object.freeze({
    neutralInstructionFileSha256: '6e2ae1500831ca4e502b9c14245433b2138280efb611b05f628dbf7a8e4ccc26',
    taskFileSha256: 'e4f5d42daf34ed5d73d274be5acac656565b3305486ad68117b81c1326f50dc0'
  })
});

const BASE_CODEX_ARGUMENTS = Object.freeze([
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
  MODEL,
  '--config',
  `model_reasoning_effort="${REASONING}"`,
  '--color',
  'never',
  '--json'
]);

let activeRunDirectory = null;
let activeRunId = null;
const activeTemporaryRoots = new Set();

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
  if (!condition) throw new Error(`Preflight failed: ${message}`);
}

function relativeToRepo(filePath) {
  return relative(REPO_ROOT, filePath).split(sep).join('/');
}

function safeManifestFile(directoryPath, relativeFilePath) {
  invariant(
    typeof relativeFilePath === 'string' &&
      relativeFilePath.length > 0 &&
      basename(relativeFilePath) === relativeFilePath &&
      !isAbsolute(relativeFilePath),
    `approval manifest contains an unsafe file path: ${relativeFilePath}`
  );
  return join(directoryPath, relativeFilePath);
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

async function pathExists(filePath) {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function readAndHash(filePath) {
  const contents = await readFile(filePath);
  return { contents, bytes: contents.length, sha256: sha256(contents) };
}

async function verifyApprovedBasis({
  label,
  directoryPath,
  manifestPath,
  sourceDirectoryPath,
  expected
}) {
  const manifestFile = await readAndHash(manifestPath);
  invariant(
    manifestFile.sha256 === expected.manifestSha256,
    `${label} approval manifest drifted: expected ${expected.manifestSha256}, got ${manifestFile.sha256}`
  );

  let manifest;
  try {
    manifest = JSON.parse(manifestFile.contents.toString('utf8'));
  } catch (error) {
    throw new Error(`Preflight failed: ${label} approval manifest is invalid JSON: ${error.message}`);
  }

  invariant(manifest.kind === expected.kind, `${label} approval kind drifted`);
  invariant(manifest.approval === 'accepted', `${label} approval is not accepted`);
  invariant(manifest.acceptance?.authority === 'user', `${label} approval authority is not the user`);
  invariant(manifest.acceptance?.verdict === 'Accepted', `${label} verdict is not Accepted`);
  invariant(manifest.objectiveVerdict === 'green', `${label} objective capture is not green`);
  invariant(manifest.captureTick === 240, `${label} capture tick is not 240`);
  invariant(manifest.source?.sha256 === expected.sourceSha256, `${label} source receipt drifted`);

  const sourcePath = safeManifestFile(sourceDirectoryPath, manifest.source.file);
  const sourceFile = await readAndHash(sourcePath);
  invariant(
    sourceFile.sha256 === expected.sourceSha256,
    `${label} source bytes drifted: expected ${expected.sourceSha256}, got ${sourceFile.sha256}`
  );

  const profileByFile = new Map(
    (Array.isArray(manifest.profiles) ? manifest.profiles : []).map((profile) => [profile.file, profile])
  );
  const captures = [];
  for (const [file, expectedHash] of Object.entries(expected.captures)) {
    const profile = profileByFile.get(file);
    invariant(profile, `${label} approval is missing ${file}`);
    invariant(profile.png?.sha256 === expectedHash, `${label} receipt for ${file} drifted`);
    invariant(profile.png?.repeatSha256 === expectedHash, `${label} repeat hash for ${file} drifted`);
    invariant(
      profile.png?.byteIdenticalFreshTargetRepeat === true,
      `${label} repeat for ${file} is not byte-identical`
    );
    const capturePath = safeManifestFile(directoryPath, file);
    const captureFile = await readAndHash(capturePath);
    invariant(captureFile.sha256 === expectedHash, `${label} capture bytes drifted for ${file}`);
    captures.push({
      file,
      bytes: captureFile.bytes,
      sha256: captureFile.sha256,
      width: profile.png.width,
      height: profile.png.height
    });
  }

  return {
    label,
    manifest,
    manifestBytes: manifestFile.contents,
    manifestSha256: manifestFile.sha256,
    sourcePath,
    sourceBytes: sourceFile.contents,
    sourceSha256: sourceFile.sha256,
    captures
  };
}

async function collectTreeEntries(rootDirectoryPath, currentDirectoryPath = rootDirectoryPath) {
  const entries = [];
  const directoryEntries = await readdir(currentDirectoryPath, { withFileTypes: true });
  directoryEntries.sort((left, right) => left.name.localeCompare(right.name));

  for (const directoryEntry of directoryEntries) {
    const entryPath = join(currentDirectoryPath, directoryEntry.name);
    const relativePath = relative(rootDirectoryPath, entryPath).split(sep).join('/');
    const entryStat = await lstat(entryPath);
    const mode = (entryStat.mode & 0o777).toString(8).padStart(3, '0');

    if (entryStat.isDirectory()) {
      entries.push({ path: relativePath, type: 'directory', mode });
      entries.push(...await collectTreeEntries(rootDirectoryPath, entryPath));
      continue;
    }

    if (entryStat.isFile()) {
      const file = await readAndHash(entryPath);
      entries.push({
        path: relativePath,
        type: 'file',
        mode,
        bytes: file.bytes,
        sha256: file.sha256
      });
      continue;
    }

    if (entryStat.isSymbolicLink()) {
      const target = await readlink(entryPath);
      entries.push({ path: relativePath, type: 'symlink', mode, target, sha256: sha256(target) });
      continue;
    }

    entries.push({ path: relativePath, type: 'unsupported', mode });
  }

  return entries;
}

async function createTreeReceipt(rootDirectoryPath) {
  const entries = await collectTreeEntries(rootDirectoryPath);
  return {
    sha256: sha256(canonicalJson(entries)),
    entryCount: entries.length,
    entries
  };
}

function captureProcess(command, argumentsList, {
  cwd = REPO_ROOT,
  environment = process.env,
  inputText = null,
  timeoutMs = PREFLIGHT_TIMEOUT_MS,
  maxStreamBytes = 1024 * 1024
} = {}) {
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
        command,
        arguments: argumentsList,
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

    const captureChunk = (chunks, chunk, currentBytes) => {
      const remaining = Math.max(0, maxStreamBytes - currentBytes);
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      if (chunk.length > remaining && !outputLimitExceeded) {
        outputLimitExceeded = true;
        child.kill('SIGTERM');
        forceKillTimer = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS);
      }
      return currentBytes + Math.min(chunk.length, remaining);
    };

    child.stdout.on('data', (chunk) => {
      stdoutBytes = captureChunk(stdoutChunks, Buffer.from(chunk), stdoutBytes);
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes = captureChunk(stderrChunks, Buffer.from(chunk), stderrBytes);
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS);
    }, timeoutMs);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolveProcess({
        command,
        arguments: argumentsList,
        startedAtMs,
        endedAtMs: Date.now(),
        exitCode: null,
        signal: null,
        timedOut,
        outputLimitExceeded,
        spawnError: error.message,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks)
      });
    });

    child.on('close', (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolveProcess({
        command,
        arguments: argumentsList,
        startedAtMs,
        endedAtMs: Date.now(),
        exitCode,
        signal,
        timedOut,
        outputLimitExceeded,
        spawnError: null,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks)
      });
    });

    child.stdin.on('error', () => {
      // A process that exits before consuming stdin is classified from its exit receipt.
    });
    child.stdin.end(inputText ?? undefined);
  });
}

function parseCodexEvents(stdoutBuffer) {
  const parsedEvents = [];
  let unparsedLineCount = 0;
  for (const rawLine of stdoutBuffer.toString('utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      parsedEvents.push(JSON.parse(line));
    } catch {
      unparsedLineCount += 1;
    }
  }

  const completedItems = parsedEvents
    .filter((event) => event?.type === 'item.completed' && typeof event?.item?.type === 'string')
    .map((event) => event.item);
  const finalMessage = completedItems
    .filter((item) => item.type === 'agent_message')
    .at(-1)?.text?.trim() ?? '';
  const threadId = parsedEvents.find((event) => event?.type === 'thread.started')?.thread_id ?? null;
  const completionEvent = parsedEvents.findLast((event) => event?.type === 'turn.completed') ?? null;
  const itemTypeCounts = completedItems.reduce((counts, item) => {
    counts[item.type] = Number(counts[item.type] ?? 0) + 1;
    return counts;
  }, {});

  return {
    eventCount: parsedEvents.length,
    unparsedLineCount,
    threadId,
    finalMessage,
    turnCompleted: Boolean(completionEvent),
    usage: completionEvent?.usage ?? null,
    itemTypeCounts,
    nonMessageItemCount: completedItems.filter((item) => !['agent_message', 'reasoning'].includes(item.type)).length
  };
}

function buildPrompt(neutralInstruction, task, treatmentText = null) {
  const treatmentBlock = treatmentText
    ? `\n\n--- Vasir Skill Guidance Start ---\n${treatmentText.trim()}\n--- Vasir Skill Guidance End ---`
    : '';
  const prompt = `${neutralInstruction}${treatmentBlock}\n\n${task}`;
  return { prompt, treatmentBlock };
}

function createCandidateId(existingIds) {
  while (true) {
    const id = `candidate-${randomBytes(5).toString('hex')}`;
    if (!existingIds.has(id)) return id;
  }
}

function normalizedCodexArguments() {
  return [...BASE_CODEX_ARGUMENTS, '--cd', '<candidate-workspace>', '-'];
}

function exactCodexArguments(workspacePath) {
  return [...BASE_CODEX_ARGUMENTS, '--cd', workspacePath, '-'];
}

function createLaunchEnvironment() {
  const environment = { ...process.env };
  const removedKeys = Object.keys(environment)
    .filter((key) =>
      key.startsWith('RATATOSK_') ||
      ['CODEX_SESSION_ID', 'CODEX_THREAD_ID', 'INIT_CWD', 'OLDPWD', 'PWD', '_'].includes(key)
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
      fixedOverrides: { CI: '1', CODEX_CI: '1', NO_COLOR: '1', TERM: 'dumb', TZ: 'UTC' },
      secretValuesRetainedForAuthenticationButNotRecorded: true
    }
  };
}

async function assertNoAmbientTargetSkill() {
  const globalCandidates = [
    join(homedir(), '.codex', 'skills', SKILL_NAME),
    join(homedir(), '.agents', 'skills', SKILL_NAME)
  ];
  for (const candidatePath of globalCandidates) {
    invariant(
      !await pathExists(candidatePath),
      `target skill is installed in an ambient global skill directory: ${candidatePath}`
    );
  }
}

async function assertOpaqueWorkspace(workspacePath) {
  const resolvedWorkspace = await realpath(workspacePath);
  const pathFromRepo = relative(REPO_ROOT, resolvedWorkspace);
  invariant(
    pathFromRepo === '..' || pathFromRepo.startsWith(`..${sep}`) || isAbsolute(pathFromRepo),
    `candidate workspace is inside the Vasir repository: ${resolvedWorkspace}`
  );

  let currentPath = resolvedWorkspace;
  while (true) {
    for (const instructionName of ['AGENTS.md', 'CLAUDE.md']) {
      invariant(
        !await pathExists(join(currentPath, instructionName)),
        `ambient ${instructionName} can contaminate the candidate at ${currentPath}`
      );
    }
    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }
}

async function resolveFrozenTreatment() {
  const source = resolveSkillSource({
    skillName: SKILL_NAME,
    currentWorkingDirectory: REPO_ROOT,
    projectRootDirectory: REPO_ROOT,
    homeDirectory: homedir(),
    repositoryUrl: 'https://github.com/erikhazzard/vasir.git',
    platform: process.platform,
    spawnSyncImplementation: spawnSync
  });

  invariant(source.sourceType === 'repo-source', `treatment source is ${source.sourceType}, not repo-source`);
  invariant(source.skillHash === EXPECTED_BASIS.treatment.sha256, 'serialized treatment snapshot drifted');
  const actualFileNames = source.promptFiles.map(({ relativeFilePath }) => relativeFilePath).sort();
  const expectedFileNames = Object.keys(EXPECTED_BASIS.treatment.files).sort();
  invariant(
    canonicalJson(actualFileNames) === canonicalJson(expectedFileNames),
    `treatment prompt files drifted: expected ${expectedFileNames.join(', ')}, got ${actualFileNames.join(', ')}`
  );

  const files = source.promptFiles.map(({ relativeFilePath, contents }) => {
    invariant(!relativeFilePath.startsWith('evals/'), `eval material leaked into treatment: ${relativeFilePath}`);
    const fileHash = sha256(contents);
    invariant(
      fileHash === EXPECTED_BASIS.treatment.files[relativeFilePath],
      `treatment file drifted: ${relativeFilePath}`
    );
    return {
      relativeFilePath,
      bytes: Buffer.byteLength(contents),
      sha256: fileHash
    };
  });

  return { ...source, files };
}

async function createWorkspace(sourceBytes) {
  const root = await mkdtemp(join(tmpdir(), 'vasir-observatory-agent-'));
  const workspace = join(root, 'workspace');
  await mkdir(workspace, { mode: 0o700 });
  const sourcePath = join(workspace, 'index.html');
  await writeFile(sourcePath, sourceBytes, { mode: 0o644, flag: 'wx' });
  await chmod(sourcePath, 0o644);
  await assertOpaqueWorkspace(workspace);
  const tree = await createTreeReceipt(workspace);
  invariant(tree.entryCount === 1, 'candidate input workspace contains more than index.html');
  invariant(tree.entries[0]?.path === 'index.html', 'candidate input workspace entry is not index.html');
  return { root, workspace, tree };
}

async function createPatch(runDirectory, candidateId) {
  const argumentsList = [
    'diff',
    '--no-index',
    '--binary',
    '--no-ext-diff',
    '--src-prefix=a/',
    '--dst-prefix=b/',
    '--',
    'basis/fixture',
    `candidates/${candidateId}/workspace`
  ];
  const result = await captureProcess('git', argumentsList, {
    cwd: runDirectory,
    timeoutMs: DIFF_TIMEOUT_MS,
    maxStreamBytes: MAX_PROCESS_STREAM_BYTES
  });
  invariant(
    !result.spawnError && !result.timedOut && !result.outputLimitExceeded && [0, 1].includes(result.exitCode),
    `could not create retained patch for ${candidateId}: ${result.spawnError ?? result.stderr.toString('utf8').trim()}`
  );
  return {
    contents: result.stdout,
    changed: result.exitCode === 1,
    stderr: result.stderr.toString('utf8').trim(),
    command: ['git', ...argumentsList]
  };
}

async function retainCandidateResult({
  runDirectory,
  candidate,
  processResult,
  fixtureSourceSha256
}) {
  const candidateDirectory = join(runDirectory, 'candidates', candidate.id);
  const eventsPath = join(candidateDirectory, 'events.jsonl');
  const stderrPath = join(candidateDirectory, 'stderr.log');
  const finalPath = join(candidateDirectory, 'final.md');
  const workspaceSnapshotPath = join(candidateDirectory, 'workspace');

  await writeAtomic(eventsPath, processResult.stdout, { mode: 0o600 });
  await writeAtomic(stderrPath, processResult.stderr, { mode: 0o600 });
  const parsed = parseCodexEvents(processResult.stdout);
  const finalContents = `${parsed.finalMessage}${parsed.finalMessage ? '\n' : ''}`;
  await writeAtomic(finalPath, finalContents, { mode: 0o600 });

  await cp(candidate.workspace, workspaceSnapshotPath, {
    recursive: true,
    dereference: false,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true
  });
  const outputTree = await createTreeReceipt(workspaceSnapshotPath);
  const outputIndexPath = join(workspaceSnapshotPath, 'index.html');
  const outputIndexIsFile = await pathExists(outputIndexPath)
    ? (await lstat(outputIndexPath)).isFile()
    : false;
  const outputWorkspaceIsSingleFile = outputTree.entryCount === 1
    && outputTree.entries[0]?.path === 'index.html'
    && outputTree.entries[0]?.type === 'file';
  const outputIndex = outputIndexIsFile ? await readAndHash(outputIndexPath) : null;
  const patch = await createPatch(runDirectory, candidate.id);
  await writeAtomic(join(candidateDirectory, 'patch.diff'), patch.contents, { mode: 0o600 });

  const runtimeStatus = processResult.timedOut
    ? 'timed-out'
    : processResult.outputLimitExceeded
      ? 'output-limit-exceeded'
      : processResult.spawnError
        ? 'spawn-error'
        : processResult.exitCode === 0 && parsed.threadId && parsed.turnCompleted && parsed.finalMessage
          ? 'complete'
          : 'agent-error';
  const outputStatus = !outputIndexIsFile
    ? 'missing-index'
    : !outputWorkspaceIsSingleFile
      ? 'unexpected-workspace-entries'
      : outputIndex.sha256 === fixtureSourceSha256
        ? 'unchanged-index'
        : 'changed-index';
  const generationComplete = runtimeStatus === 'complete' && outputStatus === 'changed-index' && patch.changed;

  const runtimeReceipt = {
    candidateId: candidate.id,
    status: runtimeStatus,
    requestedConfiguration: {
      provider: 'codex',
      model: MODEL,
      reasoning: REASONING,
      cliVersion: CODEX_VERSION
    },
    command: {
      executable: 'codex',
      normalizedArguments: normalizedCodexArguments(),
      normalizedArgumentsSha256: sha256(canonicalJson(normalizedCodexArguments()))
    },
    startedAt: new Date(processResult.startedAtMs).toISOString(),
    endedAt: new Date(processResult.endedAtMs).toISOString(),
    durationMs: processResult.endedAtMs - processResult.startedAtMs,
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    timedOut: processResult.timedOut,
    timeoutMs: AGENT_TIMEOUT_MS,
    outputLimitExceeded: processResult.outputLimitExceeded,
    maxBytesPerProcessStream: MAX_PROCESS_STREAM_BYTES,
    spawnError: processResult.spawnError,
    threadId: parsed.threadId,
    freshSession: true,
    persistedSession: false,
    turnCompleted: parsed.turnCompleted,
    usage: parsed.usage,
    itemTypeCounts: parsed.itemTypeCounts,
    nonMessageItemCount: parsed.nonMessageItemCount,
    eventCount: parsed.eventCount,
    unparsedLineCount: parsed.unparsedLineCount,
    evidence: {
      events: { path: `candidates/${candidate.id}/events.jsonl`, sha256: sha256(processResult.stdout), bytes: processResult.stdout.length },
      stderr: { path: `candidates/${candidate.id}/stderr.log`, sha256: sha256(processResult.stderr), bytes: processResult.stderr.length },
      final: { path: `candidates/${candidate.id}/final.md`, sha256: sha256(finalContents), bytes: Buffer.byteLength(finalContents) }
    }
  };
  await writeJsonAtomic(join(candidateDirectory, 'runtime-receipt.json'), runtimeReceipt, { mode: 0o600 });

  const outputReceipt = {
    candidateId: candidate.id,
    status: outputStatus,
    generationComplete,
    workspaceSingleFileContract: outputWorkspaceIsSingleFile,
    workspace: {
      path: `candidates/${candidate.id}/workspace`,
      ...outputTree
    },
    index: outputIndex
      ? { path: `candidates/${candidate.id}/workspace/index.html`, bytes: outputIndex.bytes, sha256: outputIndex.sha256 }
      : null,
    patch: {
      path: `candidates/${candidate.id}/patch.diff`,
      sha256: sha256(patch.contents),
      bytes: patch.contents.length,
      changed: patch.changed,
      command: patch.command,
      stderr: patch.stderr
    }
  };
  await writeJsonAtomic(join(candidateDirectory, 'output-tree.json'), outputReceipt, { mode: 0o600 });

  return { runtimeReceipt, outputReceipt, parsed, generationComplete };
}

async function main() {
  const startedAt = new Date();
  invariant(process.argv.length === 2, 'run-paired.mjs does not accept arguments');

  const coordinatorFile = await readAndHash(fileURLToPath(import.meta.url));

  const [fixtureBasis, oracleBasis, treatment, neutralInstructionFile, taskFile] = await Promise.all([
    verifyApprovedBasis({
      label: 'fixture',
      directoryPath: FIXTURE_APPROVAL_DIR,
      manifestPath: FIXTURE_APPROVAL_PATH,
      sourceDirectoryPath: FIXTURE_DIR,
      expected: EXPECTED_BASIS.fixture
    }),
    verifyApprovedBasis({
      label: 'oracle',
      directoryPath: ORACLE_APPROVAL_DIR,
      manifestPath: ORACLE_APPROVAL_PATH,
      sourceDirectoryPath: ORACLE_DIR,
      expected: EXPECTED_BASIS.oracle
    }),
    resolveFrozenTreatment(),
    readAndHash(NEUTRAL_INSTRUCTION_PATH),
    readAndHash(TASK_PATH)
  ]);
  await assertNoAmbientTargetSkill();
  const neutralInstruction = neutralInstructionFile.contents.toString('utf8').trimEnd();
  const task = taskFile.contents.toString('utf8').trimEnd();
  invariant(
    neutralInstructionFile.sha256 === EXPECTED_BASIS.prompt.neutralInstructionFileSha256,
    'saved neutral instruction drifted'
  );
  invariant(taskFile.sha256 === EXPECTED_BASIS.prompt.taskFileSha256, 'saved task drifted');
  invariant(neutralInstruction.length > 0, 'saved neutral instruction is empty');
  invariant(task.length > 0, 'saved task is empty');

  const codexVersionResult = await captureProcess('codex', ['--version']);
  invariant(!codexVersionResult.spawnError, `Codex CLI is unavailable: ${codexVersionResult.spawnError}`);
  invariant(!codexVersionResult.timedOut, 'Codex CLI version check timed out');
  invariant(codexVersionResult.exitCode === 0, 'Codex CLI version check failed');
  const actualCodexVersion = codexVersionResult.stdout.toString('utf8').trim();
  invariant(
    actualCodexVersion === CODEX_VERSION,
    `Codex CLI drifted: expected ${CODEX_VERSION}, got ${actualCodexVersion}`
  );

  const gitVersionResult = await captureProcess('git', ['--version']);
  invariant(!gitVersionResult.spawnError && gitVersionResult.exitCode === 0, 'git is unavailable for patch retention');
  const ignoredResult = await captureProcess(
    'git',
    ['check-ignore', '-q', '--no-index', '--', relativeToRepo(HISTORY_ROOT)],
    { cwd: REPO_ROOT }
  );
  invariant(ignoredResult.exitCode === 0, `${relativeToRepo(HISTORY_ROOT)} is not gitignored`);

  const cleanPrompt = buildPrompt(neutralInstruction, task);
  const treatedPrompt = buildPrompt(neutralInstruction, task, treatment.promptText);
  invariant(cleanPrompt.treatmentBlock === '', 'clean prompt unexpectedly contains treatment text');
  invariant(treatedPrompt.treatmentBlock.length > 0, 'treatment block is empty');
  invariant(
    treatedPrompt.prompt.split(treatedPrompt.treatmentBlock).length === 2,
    'treatment block does not occur exactly once in the treatment prompt'
  );
  invariant(
    treatedPrompt.prompt.replace(treatedPrompt.treatmentBlock, '') === cleanPrompt.prompt,
    'removing the treatment block does not recover the byte-identical clean prompt'
  );
  invariant(sha256(cleanPrompt.prompt) !== sha256(treatedPrompt.prompt), 'condition prompts have the same hash');

  const commandTemplate = normalizedCodexArguments();
  const launchEnvironment = createLaunchEnvironment();
  const generationBasis = {
    gateId: GATE_ID,
    harnessVersion: HARNESS_VERSION,
    coordinatorSha256: coordinatorFile.sha256,
    fixtureApprovalManifestSha256: fixtureBasis.manifestSha256,
    fixtureSourceSha256: fixtureBasis.sourceSha256,
    oracleApprovalManifestSha256: oracleBasis.manifestSha256,
    neutralInstructionFileSha256: neutralInstructionFile.sha256,
    neutralInstructionSegmentSha256: sha256(neutralInstruction),
    taskFileSha256: taskFile.sha256,
    taskSegmentSha256: sha256(task),
    treatmentSha256: treatment.skillHash,
    treatmentFiles: treatment.files,
    promptAssembly: 'neutral + optional exact treatment block + task',
    model: MODEL,
    reasoning: REASONING,
    codexVersion: actualCodexVersion,
    codexArgumentsSha256: sha256(canonicalJson(commandTemplate)),
    environmentBasisSha256: sha256(canonicalJson(launchEnvironment.receipt)),
    sandbox: 'workspace-write',
    approvalPolicy: 'never',
    ephemeral: true,
    persistedSession: false,
    timeoutMs: AGENT_TIMEOUT_MS,
    maxBytesPerProcessStream: MAX_PROCESS_STREAM_BYTES
  };
  const generationBasisSha256 = sha256(canonicalJson(generationBasis));
  const timestampSlug = startedAt
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z');
  const runId = `${timestampSlug}__${generationBasisSha256.slice(0, 12)}__${randomBytes(3).toString('hex')}`;
  const runDirectory = join(HISTORY_ROOT, runId);
  await mkdir(runDirectory, { recursive: false, mode: 0o700 });
  activeRunDirectory = runDirectory;
  activeRunId = runId;

  const basisDirectory = join(runDirectory, 'basis');
  const privateDirectory = join(runDirectory, 'private');
  await mkdir(join(basisDirectory, 'fixture'), { recursive: true });
  await mkdir(join(basisDirectory, 'treatment'), { recursive: true });
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  await chmod(privateDirectory, 0o700);

  await Promise.all([
    writeAtomic(join(basisDirectory, 'neutral-instruction.txt'), neutralInstructionFile.contents),
    writeAtomic(join(basisDirectory, 'task.txt'), taskFile.contents),
    writeAtomic(join(basisDirectory, 'fixture', 'index.html'), fixtureBasis.sourceBytes),
    writeAtomic(join(basisDirectory, 'fixture-approved-manifest.json'), fixtureBasis.manifestBytes),
    writeAtomic(join(basisDirectory, 'oracle-approved-manifest.json'), oracleBasis.manifestBytes),
    writeAtomic(join(basisDirectory, 'treatment', 'snapshot.md'), treatment.promptText),
    writeJsonAtomic(join(basisDirectory, 'treatment', 'files.json'), {
      skillName: SKILL_NAME,
      sourceType: treatment.sourceType,
      serializedSha256: treatment.skillHash,
      files: treatment.files
    })
  ]);

  const candidateIds = new Set();
  const candidates = Array.from({ length: 2 }, () => {
    const id = createCandidateId(candidateIds);
    candidateIds.add(id);
    return { id };
  });
  const assignmentOrder = randomBytes(1)[0] % 2 === 0
    ? ['clean', 'treatment']
    : ['treatment', 'clean'];
  const promptsByCondition = {
    clean: cleanPrompt.prompt,
    treatment: treatedPrompt.prompt
  };
  const temporaryRoots = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    candidate.condition = assignmentOrder[index];
    candidate.prompt = promptsByCondition[candidate.condition];
    candidate.promptSha256 = sha256(candidate.prompt);
    const preparedWorkspace = await createWorkspace(fixtureBasis.sourceBytes);
    temporaryRoots.push(preparedWorkspace.root);
    activeTemporaryRoots.add(preparedWorkspace.root);
    Object.assign(candidate, preparedWorkspace);
    await mkdir(join(runDirectory, 'candidates', candidate.id), { recursive: true });
    await writeAtomic(
      join(privateDirectory, 'prompts', `${candidate.id}.txt`),
      candidate.prompt,
      { mode: 0o600 }
    );
  }

  const initialTreeHashes = candidates.map((candidate) => candidate.tree.sha256);
  invariant(new Set(initialTreeHashes).size === 1, 'candidate input workspace tree hashes differ');
  const frozenFixtureTree = await createTreeReceipt(join(basisDirectory, 'fixture'));
  invariant(
    initialTreeHashes[0] === frozenFixtureTree.sha256,
    'candidate input workspace does not match the frozen fixture snapshot'
  );
  for (const candidate of candidates) {
    invariant(
      canonicalJson(exactCodexArguments(candidate.workspace).map((argument) => argument === candidate.workspace ? '<candidate-workspace>' : argument))
        === canonicalJson(commandTemplate),
      `normalized Codex arguments drifted for ${candidate.id}`
    );
    await writeJsonAtomic(join(runDirectory, 'candidates', candidate.id, 'input-receipt.json'), {
      candidateId: candidate.id,
      workspaceTree: candidate.tree,
      assignedPromptSealed: true,
      commandArgumentsSha256: sha256(canonicalJson(commandTemplate)),
      environmentBasisSha256: sha256(canonicalJson({
        ...launchEnvironment.receipt,
        platform: process.platform,
        architecture: process.arch,
        node: process.version
      }))
    }, { mode: 0o600 });
  }

  const conditionSalt = randomBytes(32).toString('hex');
  const privateMapping = candidates.map((candidate) => ({
    candidateId: candidate.id,
    condition: candidate.condition,
    exactPromptSha256: candidate.promptSha256
  }));
  const conditionCommitment = sha256(`${conditionSalt}:${canonicalJson(privateMapping)}`);
  await writeJsonAtomic(join(privateDirectory, 'condition-map.json'), {
    sealed: true,
    revealOnlyAfter: 'THREEJS-OBSERVATORY__M4P__S2 human visual receipts',
    salt: conditionSalt,
    commitment: conditionCommitment,
    mapping: privateMapping
  }, { mode: 0o600 });

  const preflightChecks = {
    s1OracleApprovalAcceptedAndHashBound: true,
    s3FixtureApprovalAcceptedAndHashBound: true,
    exactFixtureSourceCopiedOnceToBothArms: true,
    candidateInputTreeHashesEqual: true,
    candidateInputTreeMatchesFrozenBasis: true,
    targetSkillAbsentFromAmbientGlobalSkillDirectories: true,
    candidateWorkspacesOutsideRepoWithoutAmbientAgentInstructions: true,
    treatmentResolvedByExistingRepoResolver: true,
    treatmentContainsNoEvalFiles: true,
    treatmentSnapshotHashBound: true,
    treatmentRemovalRecoversByteIdenticalCleanPrompt: true,
    identicalNormalizedCodexArguments: true,
    priorConversationSessionAndRatatoskHookEnvironmentRemoved: true,
    freshEphemeralSessionsRequested: true,
    reviewEvidenceDirectoryAbsent: !existsSync(join(runDirectory, 'review')),
    historyDirectoryGitignored: true,
    codexCliVersionExact: true
  };
  invariant(Object.values(preflightChecks).every(Boolean), 'one or more recorded preflight checks failed');

  const basisManifest = {
    kind: 'threejs-observatory-instancing-paired-run-basis',
    schemaVersion: 1,
    gateId: GATE_ID,
    harnessVersion: HARNESS_VERSION,
    generationBasis,
    generationBasisSha256,
    fixture: {
      approvalManifest: { path: 'basis/fixture-approved-manifest.json', sha256: fixtureBasis.manifestSha256 },
      source: { path: 'basis/fixture/index.html', sha256: fixtureBasis.sourceSha256, bytes: fixtureBasis.sourceBytes.length },
      tree: frozenFixtureTree,
      approvedCaptures: fixtureBasis.captures
    },
    oracle: {
      approvalManifest: { path: 'basis/oracle-approved-manifest.json', sha256: oracleBasis.manifestSha256 },
      sourceSha256: oracleBasis.sourceSha256,
      approvedCaptures: oracleBasis.captures
    },
    task: {
      sourcePath: relativeToRepo(TASK_PATH),
      path: 'basis/task.txt',
      fileSha256: taskFile.sha256,
      segmentSha256: sha256(task),
      bytes: taskFile.bytes
    },
    neutralInstruction: {
      sourcePath: relativeToRepo(NEUTRAL_INSTRUCTION_PATH),
      path: 'basis/neutral-instruction.txt',
      fileSha256: neutralInstructionFile.sha256,
      segmentSha256: sha256(neutralInstruction),
      bytes: neutralInstructionFile.bytes
    },
    treatment: {
      skillName: SKILL_NAME,
      sourceType: treatment.sourceType,
      snapshotPath: 'basis/treatment/snapshot.md',
      serializedSha256: treatment.skillHash,
      files: treatment.files
    },
    promptIsolation: {
      conditionPromptHashes: [sha256(cleanPrompt.prompt), sha256(treatedPrompt.prompt)].sort(),
      treatmentBlockSha256: sha256(treatedPrompt.treatmentBlock),
      treatmentRemovalRecoversCleanPrompt: true,
      exactPromptsStoredPrivately: true
    },
    runtime: {
      codexVersion: actualCodexVersion,
      gitVersion: gitVersionResult.stdout.toString('utf8').trim(),
      model: MODEL,
      reasoning: REASONING,
      normalizedArguments: commandTemplate,
      normalizedArgumentsSha256: sha256(canonicalJson(commandTemplate)),
      concurrentCandidateCount: 2,
      timeoutMs: AGENT_TIMEOUT_MS,
      maxBytesPerProcessStream: MAX_PROCESS_STREAM_BYTES,
      environment: {
        platform: process.platform,
        architecture: process.arch,
        node: process.version,
        ...launchEnvironment.receipt
      }
    },
    preflightChecks
  };
  const basisManifestContents = `${JSON.stringify(basisManifest, null, 2)}\n`;
  await writeAtomic(join(basisDirectory, 'manifest.json'), basisManifestContents);

  const baseRunPayload = {
    kind: 'threejs-observatory-instancing-workspace-pilot',
    schemaVersion: 1,
    runId,
    gateId: GATE_ID,
    harnessVersion: HARNESS_VERSION,
    runStatus: 'ready-to-launch',
    productClaim: 'UNVERIFIED',
    startedAt: startedAt.toISOString(),
    generationBasisSha256,
    basisManifest: { path: 'basis/manifest.json', sha256: sha256(basisManifestContents) },
    conditionCommitment,
    blinded: true,
    candidates: candidates.map((candidate) => ({
      candidateId: candidate.id,
      workspacePath: `candidates/${candidate.id}/workspace/index.html`,
      inputReceiptPath: `candidates/${candidate.id}/input-receipt.json`
    })),
    nextRequiredAction: 'Run the anonymous browser contract capture before classifying G2 or revealing conditions.',
    claimBoundary: 'Controlled-input generation setup only; candidate browser contract, visual equivalence, topology, and performance are not yet proven.'
  };
  await writeJsonAtomic(join(runDirectory, 'run.json'), baseRunPayload);
  invariant(
    (await readAndHash(fileURLToPath(import.meta.url))).sha256 === coordinatorFile.sha256,
    'coordinator source changed after its generation basis was frozen'
  );

  let retainedResults;
  try {
    const launchPromises = candidates.map((candidate) => captureProcess(
      'codex',
      exactCodexArguments(candidate.workspace),
      {
        cwd: candidate.workspace,
        environment: launchEnvironment.environment,
        inputText: candidate.prompt,
        timeoutMs: AGENT_TIMEOUT_MS,
        maxStreamBytes: MAX_PROCESS_STREAM_BYTES
      }
    ));
    const processResults = await Promise.all(launchPromises);
    retainedResults = await Promise.all(candidates.map((candidate, index) => retainCandidateResult({
      runDirectory,
      candidate,
      processResult: processResults[index],
      fixtureSourceSha256: fixtureBasis.sourceSha256
    })));

    const threadIds = retainedResults.map(({ runtimeReceipt }) => runtimeReceipt.threadId).filter(Boolean);
    const distinctFreshThreads = threadIds.length === 2 && new Set(threadIds).size === 2;
    const launchTimes = retainedResults.map(({ runtimeReceipt }) => Date.parse(runtimeReceipt.startedAt));
    const launchSkewMs = Math.max(...launchTimes) - Math.min(...launchTimes);
    const generationComplete = retainedResults.every((result) => result.generationComplete) && distinctFreshThreads;
    const completedAt = new Date();
    const runStatus = generationComplete
      ? 'generation-complete-awaiting-browser-contract'
      : 'generation-incomplete';

    const finalRunPayload = {
      ...baseRunPayload,
      runStatus,
      productClaim: 'UNVERIFIED',
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      generation: {
        concurrent: true,
        launchSkewMs,
        distinctFreshThreadIds: distinctFreshThreads,
        completedCandidateCount: retainedResults.filter((result) => result.generationComplete).length,
        expectedCandidateCount: 2
      },
      candidates: retainedResults.map((result) => ({
        candidateId: result.runtimeReceipt.candidateId,
        generationStatus: result.generationComplete ? 'complete' : 'incomplete',
        workspacePath: `candidates/${result.runtimeReceipt.candidateId}/workspace/index.html`,
        inputReceiptPath: `candidates/${result.runtimeReceipt.candidateId}/input-receipt.json`,
        runtimeReceiptPath: `candidates/${result.runtimeReceipt.candidateId}/runtime-receipt.json`,
        outputReceiptPath: `candidates/${result.runtimeReceipt.candidateId}/output-tree.json`,
        patchPath: `candidates/${result.runtimeReceipt.candidateId}/patch.diff`
      })),
      nextRequiredAction: generationComplete
        ? `Run node benchmarks/threejs-observatory-instancing/capture-candidates.mjs --run-dir ${runDirectory}`
        : 'Diagnose the retained generation receipts. If rerunning, rerun both conditions under a new run ID.',
      claimBoundary: generationComplete
        ? 'Two blinded candidate artifacts and fresh-session receipts exist on matched controlled inputs. G2 remains UNVERIFIED until the separate browser contract capture completes for this same run.'
        : 'Generation did not complete for both blinded candidates. No G2, visual, topology, or performance claim is supported.'
    };
    await writeJsonAtomic(join(runDirectory, 'run.json'), finalRunPayload);

    process.stdout.write(`${JSON.stringify({
      runId,
      runDirectory,
      runStatus,
      productClaim: 'UNVERIFIED',
      blindedCandidateIds: candidates.map(({ id }) => id),
      nextRequiredAction: finalRunPayload.nextRequiredAction
    }, null, 2)}\n`);
    if (!generationComplete) process.exitCode = 1;
  } finally {
    await Promise.allSettled(temporaryRoots.map((temporaryRoot) => rm(temporaryRoot, { recursive: true, force: true })));
    for (const temporaryRoot of temporaryRoots) activeTemporaryRoots.delete(temporaryRoot);
  }
}

main().catch(async (error) => {
  if (activeRunDirectory && activeRunId) {
    try {
      let existingRun = {};
      try {
        existingRun = JSON.parse(await readFile(join(activeRunDirectory, 'run.json'), 'utf8'));
      } catch {
        // A partial artifact may not have reached its first run.json write.
      }
      await writeJsonAtomic(join(activeRunDirectory, 'run.json'), {
        ...existingRun,
        kind: 'threejs-observatory-instancing-workspace-pilot',
        schemaVersion: 1,
        runId: activeRunId,
        gateId: GATE_ID,
        harnessVersion: HARNESS_VERSION,
        runStatus: 'harness-error',
        productClaim: 'UNVERIFIED',
        failedAt: new Date().toISOString(),
        evidenceReason: error.message,
        nextRequiredAction: 'Repair the coordinator defect or controlled-input mismatch before launching another paired run.'
      });
    } catch {
      // The original error is the useful failure when even the receipt cannot be written.
    }
  }
  await Promise.allSettled(
    [...activeTemporaryRoots].map((temporaryRoot) => rm(temporaryRoot, { recursive: true, force: true }))
  );
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
