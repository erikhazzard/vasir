import { createHash, randomBytes } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  stat,
  writeFile
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERIFIER_PATH = fileURLToPath(import.meta.url);
const BENCHMARK_DIR = dirname(VERIFIER_PATH);
const REPO_ROOT = resolve(BENCHMARK_DIR, '..', '..');
const RUNS_ROOT = join(REPO_ROOT, '.agents', 'vasir-evals', 'threejs-observatory-instancing');
const COORDINATOR_PATH = join(BENCHMARK_DIR, 'run-paired.mjs');
const CAPTURE_HARNESS_PATH = join(BENCHMARK_DIR, 'capture-candidates.mjs');

const GATE_ID = 'THREEJS-OBSERVATORY__M4P__G2';
const HARNESS_VERSION = 1;
const MODEL = 'gpt-5.6-sol';
const REASONING = 'xhigh';
const CODEX_VERSION = 'codex-cli 0.149.1';
const CAPTURE_TICK = 240;
const MAX_LAUNCH_SKEW_MS = 5;
const PUBLIC_RECEIPT_PATH = 'review/g2-receipt.json';

const EXPECTED = Object.freeze({
  coordinatorSha256: '9e6b8d3cc296dc8a70edc2a5338336ec3fcdc878e0856f4cd38b44eaec737352',
  captureHarnessSha256: '6236b0202065f79d92bc156170ae5c9758cfb3d1d79fc09eddf6c406a31219c2',
  fixtureApprovalManifestSha256: '7390dbdcafd3fe4ffd8a8b60d472562303136033525d3f6bfff4521cc27579af',
  fixtureSourceSha256: 'b9950824c09966cb3874049af509da39a5c8abac9beb6e652cda6dc0802cef29',
  fixtureBytes: 39747,
  fixtureTreeSha256: '5b95bc1235c438ee88c3073fddee20fe372f027f543e9541ba6a8e338d2c9fd6',
  oracleApprovalManifestSha256: '99ea1a54078f1de87221a1e8a60d194f1dd58fe0cd173ae54c296c6cfa2232f5',
  neutralFileSha256: '6e2ae1500831ca4e502b9c14245433b2138280efb611b05f628dbf7a8e4ccc26',
  neutralSegmentSha256: '67fa7d9be03629c1616509a6c77b8e2f1fc18e63a0f0e76ae5e601d7c1e95dfe',
  taskFileSha256: 'e4f5d42daf34ed5d73d274be5acac656565b3305486ad68117b81c1326f50dc0',
  taskSegmentSha256: '6c30959e399fffc586ed5ce820642ce0a1745b49e31d026d5b3de844dd0ad4f2',
  serializedGuidanceSha256: 'f3cd57b64e207668fbfbc8fd8e2b0707d78e4ea54de6128708e3761463c7a290',
  guidanceBlockSha256: 'bd91a8f779b5a2f957da32fd0731494e9f8559ccdb54b34a616aa860675035bb',
  guidanceFiles: Object.freeze([
    Object.freeze({
      relativeFilePath: 'SKILL.md',
      bytes: 29282,
      sha256: '524348e5e87696b1b47c47df644bf7af1b086d239bb4d34c1eddad8f0b2c4098'
    }),
    Object.freeze({
      relativeFilePath: 'references/render-topology-guard.md',
      bytes: 11747,
      sha256: '28c007f27ceed93c4bab048d03e0d44bab2274e97ed3f3af72c4916b1a23ea4b'
    })
  ]),
  promptHashes: Object.freeze([
    '077d388e5368dd631643c2c745bba4c7a8503d9b988eb890f5fc81944f41b773',
    'cfb772455d272dfc04bbf28f2e8bf7f518e23a67f157d250d19c415c5077f6a3'
  ]),
  normalizedArgumentsSha256: '129596648305af8762169b1deac1b1f4138ceb55cbb5e4658389c36f6e9fd086'
});

const EXPECTED_PROFILES = Object.freeze([
  Object.freeze({ id: 'portrait', width: 900, height: 1600, dpr: 1 }),
  Object.freeze({ id: 'landscape', width: 1600, height: 900, dpr: 1 })
]);

const EXPECTED_ARGUMENTS = Object.freeze([
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
  '--json',
  '--cd',
  '<candidate-workspace>',
  '-'
]);

const ALLOWED_EVENT_TYPES = new Set([
  'thread.started',
  'turn.started',
  'item.started',
  'item.updated',
  'item.completed',
  'turn.completed'
]);
const ALLOWED_ITEM_TYPES = new Set([
  'agent_message',
  'reasoning',
  'todo_list',
  'command_execution',
  'file_change'
]);

class VerificationFailure extends Error {
  constructor(classification, message) {
    super(message);
    this.name = 'VerificationFailure';
    this.classification = classification;
  }
}

function usage() {
  return [
    'Usage:',
    '  node benchmarks/threejs-observatory-instancing/verify-paired-run.mjs --run-id <opaque-run-id>',
    '  node benchmarks/threejs-observatory-instancing/verify-paired-run.mjs --run-dir <exact-run-directory>',
    '',
    `Run directories must be direct children of ${RUNS_ROOT}.`
  ].join('\n');
}

function parseArguments(args) {
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) return { help: true };
  if (args.length !== 2 || !['--run-id', '--run-dir'].includes(args[0]) || !args[1]) {
    throw new Error(usage());
  }
  if (args[0] === '--run-id') {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(args[1]) || ['.', '..'].includes(args[1])) {
      throw new Error('Run ID must be one opaque path-safe segment.');
    }
    return { help: false, requestedRunDirectory: join(RUNS_ROOT, args[1]) };
  }
  return {
    help: false,
    requestedRunDirectory: isAbsolute(args[1]) ? args[1] : resolve(process.cwd(), args[1])
  };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function equalCanonical(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function failUnverified(message) {
  throw new VerificationFailure('UNVERIFIED', message);
}

function failRed(message) {
  throw new VerificationFailure('RED', message);
}

function requireUnverified(condition, message) {
  if (!condition) failUnverified(message);
}

function requireRed(condition, message) {
  if (!condition) failRed(message);
}

function isPathInside(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== ''
    && pathFromRoot !== '..'
    && !pathFromRoot.startsWith(`..${sep}`)
    && !isAbsolute(pathFromRoot);
}

async function resolveRunDirectory(requestedRunDirectory) {
  const [runsRoot, runDirectory] = await Promise.all([
    realpath(RUNS_ROOT),
    realpath(requestedRunDirectory)
  ]);
  const runStat = await stat(runDirectory);
  if (!runStat.isDirectory()) throw new Error('Run path is not a directory.');
  if (!isPathInside(runsRoot, runDirectory) || dirname(runDirectory) !== runsRoot) {
    throw new Error(`Run directory must be one direct child of ${runsRoot}.`);
  }
  return { runDirectory, runId: basename(runDirectory) };
}

function validateRelativePath(relativePath, label) {
  requireUnverified(
    typeof relativePath === 'string'
      && relativePath.length > 0
      && !isAbsolute(relativePath)
      && !relativePath.includes('\\')
      && relativePath.split('/').every((part) => part && !['.', '..'].includes(part)),
    `${label} has an unsafe retained path.`
  );
}

async function readRunFile(runDirectory, relativePath, label, { mode = null } = {}) {
  validateRelativePath(relativePath, label);
  const filePath = join(runDirectory, relativePath);
  let fileStat;
  try {
    fileStat = await lstat(filePath);
  } catch {
    failUnverified(`${label} is missing.`);
  }
  requireUnverified(fileStat.isFile() && !fileStat.isSymbolicLink(), `${label} is not a regular retained file.`);
  if (mode !== null) {
    requireUnverified((fileStat.mode & 0o777) === mode, `${label} has an unexpected privacy mode.`);
  }
  const resolvedFile = await realpath(filePath);
  requireUnverified(isPathInside(runDirectory, resolvedFile), `${label} resolves outside the exact run directory.`);
  const contents = await readFile(resolvedFile);
  return { contents, bytes: contents.length, sha256: sha256(contents), stat: fileStat, path: resolvedFile };
}

async function readRunJson(runDirectory, relativePath, label, options) {
  const file = await readRunFile(runDirectory, relativePath, label, options);
  try {
    return { ...file, value: JSON.parse(file.contents.toString('utf8')) };
  } catch {
    failUnverified(`${label} is not valid JSON.`);
  }
}

async function readLocalFile(filePath, label) {
  let contents;
  try {
    contents = await readFile(filePath);
  } catch {
    failUnverified(`${label} is unavailable.`);
  }
  return { contents, bytes: contents.length, sha256: sha256(contents) };
}

async function writeAtomic(filePath, contents) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temporaryPath, contents, { mode: 0o644 });
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o644);
}

async function writeJsonAtomic(filePath, value) {
  await writeAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function collectTreeEntries(rootDirectory, currentDirectory = rootDirectory) {
  const entries = [];
  let directoryEntries;
  try {
    directoryEntries = await readdir(currentDirectory, { withFileTypes: true });
  } catch {
    failUnverified('A retained workspace tree could not be read.');
  }
  directoryEntries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of directoryEntries) {
    const entryPath = join(currentDirectory, entry.name);
    const entryStat = await lstat(entryPath);
    const path = relative(rootDirectory, entryPath).split(sep).join('/');
    const mode = (entryStat.mode & 0o777).toString(8).padStart(3, '0');
    if (entryStat.isDirectory()) {
      entries.push({ path, type: 'directory', mode });
      entries.push(...await collectTreeEntries(rootDirectory, entryPath));
    } else if (entryStat.isFile()) {
      const contents = await readFile(entryPath);
      entries.push({ path, type: 'file', mode, bytes: contents.length, sha256: sha256(contents) });
    } else if (entryStat.isSymbolicLink()) {
      const target = await readlink(entryPath);
      entries.push({ path, type: 'symlink', mode, target, sha256: sha256(target) });
    } else {
      entries.push({ path, type: 'unsupported', mode });
    }
  }
  return entries;
}

async function createTreeReceipt(rootDirectory) {
  const entries = await collectTreeEntries(rootDirectory);
  return { sha256: sha256(canonicalJson(entries)), entryCount: entries.length, entries };
}

function parseEvents(buffer, candidateId) {
  const events = [];
  let unparsedLineCount = 0;
  for (const rawLine of buffer.toString('utf8').split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    try {
      events.push(JSON.parse(rawLine));
    } catch {
      unparsedLineCount += 1;
    }
  }
  requireUnverified(unparsedLineCount === 0, `Anonymous candidate ${candidateId} has an unparsable tool transcript.`);
  return events;
}

function summarizeEvents(events) {
  const completedItems = events
    .filter((event) => event?.type === 'item.completed' && typeof event?.item?.type === 'string')
    .map((event) => event.item);
  const itemTypeCounts = completedItems.reduce((counts, item) => {
    counts[item.type] = Number(counts[item.type] ?? 0) + 1;
    return counts;
  }, {});
  const finalMessage = completedItems
    .filter((item) => item.type === 'agent_message')
    .at(-1)?.text?.trim() ?? '';
  return {
    eventCount: events.length,
    unparsedLineCount: 0,
    threadId: events.find((event) => event?.type === 'thread.started')?.thread_id ?? null,
    turnCompleted: events.some((event) => event?.type === 'turn.completed'),
    finalMessage,
    itemTypeCounts,
    nonMessageItemCount: completedItems.filter((item) => !['agent_message', 'reasoning'].includes(item.type)).length
  };
}

function buildPrompt(neutralInstruction, task, guidanceText = null) {
  const guidanceBlock = guidanceText
    ? `\n\n--- Vasir Skill Guidance Start ---\n${guidanceText.trim()}\n--- Vasir Skill Guidance End ---`
    : '';
  return { prompt: `${neutralInstruction}${guidanceBlock}\n\n${task}`, guidanceBlock };
}

function pngSize(buffer) {
  requireUnverified(
    buffer.length >= 24 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
    'An anonymous browser capture is not a valid PNG.'
  );
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function expectedWorldBuffer(profile) {
  return `${Math.max(1, Math.round(profile.width * 0.67))}x${Math.max(1, Math.round(profile.height * 0.67))}`;
}

function candidateIdsFromRun(run) {
  requireUnverified(Array.isArray(run.candidates) && run.candidates.length === 2, 'Run receipt does not name exactly two anonymous candidates.');
  const ids = run.candidates.map(({ candidateId }) => candidateId);
  requireUnverified(
    ids.every((id) => /^candidate-[a-f0-9]{10}$/.test(id)) && new Set(ids).size === 2,
    'Run receipt contains invalid or duplicate anonymous candidate IDs.'
  );
  return ids;
}

async function assertCandidateDirectorySet(runDirectory, candidateIds) {
  const candidatesRoot = join(runDirectory, 'candidates');
  const entries = await readdir(candidatesRoot, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name).sort();
  requireUnverified(
    equalCanonical(directories, [...candidateIds].sort()) && entries.length === 2,
    'Retained candidate directories do not match the two anonymous run receipts.'
  );
}

async function verifyBasis(context) {
  const { runDirectory, runId, run, candidateIds } = context;
  requireUnverified(run.kind === 'threejs-observatory-instancing-workspace-pilot', 'Run kind is not the frozen paired-run kind.');
  requireUnverified(run.schemaVersion === 1 && run.gateId === GATE_ID && run.harnessVersion === HARNESS_VERSION, 'Run schema or G2 identity drifted.');
  requireUnverified(run.runId === runId && run.blinded === true, 'Run identity or blinded-state receipt drifted.');
  requireUnverified(run.productClaim !== undefined, 'Run receipt is missing its prior claim state.');
  await assertCandidateDirectorySet(runDirectory, candidateIds);

  requireUnverified(run.basisManifest?.path === 'basis/manifest.json', 'Run basis-manifest path drifted.');
  const basisFile = await readRunJson(runDirectory, 'basis/manifest.json', 'Frozen basis manifest');
  requireUnverified(run.basisManifest.sha256 === basisFile.sha256, 'Run basis-manifest hash does not match retained bytes.');
  const basis = basisFile.value;
  requireUnverified(basis.kind === 'threejs-observatory-instancing-paired-run-basis', 'Frozen basis kind drifted.');
  requireUnverified(basis.schemaVersion === 1 && basis.gateId === GATE_ID && basis.harnessVersion === HARNESS_VERSION, 'Frozen basis schema or G2 identity drifted.');
  requireUnverified(basis.generationBasisSha256 === sha256(canonicalJson(basis.generationBasis)), 'Generation-basis digest does not match its retained object.');
  requireUnverified(run.generationBasisSha256 === basis.generationBasisSha256, 'Run and basis generation digests differ.');
  requireUnverified(runId.includes(`__${basis.generationBasisSha256.slice(0, 12)}__`), 'Opaque run ID is not bound to the generation basis.');

  const generation = basis.generationBasis;
  const coordinator = await readLocalFile(COORDINATOR_PATH, 'Frozen paired-run coordinator');
  requireUnverified(coordinator.sha256 === EXPECTED.coordinatorSha256 && generation.coordinatorSha256 === EXPECTED.coordinatorSha256, 'Paired-run coordinator hash drifted from the frozen value.');
  requireUnverified(generation.fixtureApprovalManifestSha256 === EXPECTED.fixtureApprovalManifestSha256, 'Fixture approval hash drifted.');
  requireUnverified(generation.fixtureSourceSha256 === EXPECTED.fixtureSourceSha256, 'Fixture source hash drifted.');
  requireUnverified(generation.oracleApprovalManifestSha256 === EXPECTED.oracleApprovalManifestSha256, 'Oracle approval hash drifted.');
  requireUnverified(generation.neutralInstructionFileSha256 === EXPECTED.neutralFileSha256 && generation.neutralInstructionSegmentSha256 === EXPECTED.neutralSegmentSha256, 'Neutral instruction hashes drifted.');
  requireUnverified(generation.taskFileSha256 === EXPECTED.taskFileSha256 && generation.taskSegmentSha256 === EXPECTED.taskSegmentSha256, 'Task hashes drifted.');
  requireUnverified(generation.treatmentSha256 === EXPECTED.serializedGuidanceSha256 && equalCanonical(generation.treatmentFiles, EXPECTED.guidanceFiles), 'Frozen guidance snapshot receipt drifted.');
  requireUnverified(generation.promptAssembly === 'neutral + optional exact treatment block + task', 'Prompt assembly contract drifted.');
  requireUnverified(generation.model === MODEL && generation.reasoning === REASONING && generation.codexVersion === CODEX_VERSION, 'Requested model, reasoning, or CLI version drifted.');
  requireUnverified(generation.codexArgumentsSha256 === EXPECTED.normalizedArgumentsSha256, 'Generation command digest drifted.');
  requireUnverified(generation.sandbox === 'workspace-write' && generation.approvalPolicy === 'never' && generation.ephemeral === true && generation.persistedSession === false, 'Fresh-session launch policy drifted.');

  requireUnverified(basis.runtime?.model === MODEL && basis.runtime?.reasoning === REASONING && basis.runtime?.codexVersion === CODEX_VERSION, 'Runtime basis configuration drifted.');
  requireUnverified(equalCanonical(basis.runtime.normalizedArguments, EXPECTED_ARGUMENTS), 'Normalized runtime arguments drifted.');
  requireUnverified(basis.runtime.normalizedArgumentsSha256 === EXPECTED.normalizedArgumentsSha256 && sha256(canonicalJson(basis.runtime.normalizedArguments)) === EXPECTED.normalizedArgumentsSha256, 'Normalized runtime argument digest is invalid.');
  requireUnverified(basis.runtime.concurrentCandidateCount === 2, 'Runtime basis does not require exactly two concurrent candidates.');
  const { platform, architecture, node, ...launchEnvironmentReceipt } = basis.runtime.environment ?? {};
  requireUnverified(Boolean(platform && architecture && node), 'Runtime environment receipt is incomplete.');
  requireUnverified(generation.environmentBasisSha256 === sha256(canonicalJson(launchEnvironmentReceipt)), 'Launch-environment basis digest is invalid.');

  const retainedEnvironmentSha256 = sha256(canonicalJson(basis.runtime.environment));
  context.retainedEnvironmentSha256 = retainedEnvironmentSha256;
  context.basis = basis;
  context.basisFileSha256 = basisFile.sha256;

  const [fixture, fixtureApproval, oracleApproval, neutral, task, guidance, guidanceFiles] = await Promise.all([
    readRunFile(runDirectory, 'basis/fixture/index.html', 'Frozen fixture source'),
    readRunFile(runDirectory, 'basis/fixture-approved-manifest.json', 'Frozen fixture approval'),
    readRunFile(runDirectory, 'basis/oracle-approved-manifest.json', 'Frozen oracle approval'),
    readRunFile(runDirectory, 'basis/neutral-instruction.txt', 'Frozen neutral instruction'),
    readRunFile(runDirectory, 'basis/task.txt', 'Frozen task'),
    readRunFile(runDirectory, 'basis/treatment/snapshot.md', 'Frozen guidance snapshot'),
    readRunJson(runDirectory, 'basis/treatment/files.json', 'Frozen guidance file receipt')
  ]);
  requireUnverified(fixture.sha256 === EXPECTED.fixtureSourceSha256 && fixture.bytes === EXPECTED.fixtureBytes, 'Retained fixture bytes drifted.');
  requireUnverified(fixtureApproval.sha256 === EXPECTED.fixtureApprovalManifestSha256 && oracleApproval.sha256 === EXPECTED.oracleApprovalManifestSha256, 'Retained approval bytes drifted.');
  requireUnverified(neutral.sha256 === EXPECTED.neutralFileSha256 && task.sha256 === EXPECTED.taskFileSha256, 'Retained prompt segment bytes drifted.');
  requireUnverified(guidance.sha256 === EXPECTED.serializedGuidanceSha256, 'Retained guidance bytes drifted.');
  requireUnverified(guidanceFiles.value.serializedSha256 === EXPECTED.serializedGuidanceSha256 && equalCanonical(guidanceFiles.value.files, EXPECTED.guidanceFiles), 'Retained guidance file receipt drifted.');

  const fixtureTree = await createTreeReceipt(join(runDirectory, 'basis', 'fixture'));
  requireUnverified(fixtureTree.sha256 === EXPECTED.fixtureTreeSha256 && equalCanonical(fixtureTree, basis.fixture.tree), 'Frozen fixture tree receipt drifted.');
  requireUnverified(basis.fixture.source.sha256 === fixture.sha256 && basis.fixture.source.bytes === fixture.bytes, 'Basis fixture source receipt is inconsistent.');
  requireUnverified(basis.fixture.approvalManifest.sha256 === fixtureApproval.sha256, 'Basis fixture approval receipt is inconsistent.');
  requireUnverified(basis.oracle.approvalManifest.sha256 === oracleApproval.sha256, 'Basis oracle approval receipt is inconsistent.');
  requireUnverified(basis.neutralInstruction.fileSha256 === neutral.sha256 && basis.neutralInstruction.segmentSha256 === sha256(neutral.contents.toString('utf8').trimEnd()), 'Basis neutral-instruction receipt is inconsistent.');
  requireUnverified(basis.task.fileSha256 === task.sha256 && basis.task.segmentSha256 === sha256(task.contents.toString('utf8').trimEnd()), 'Basis task receipt is inconsistent.');
  requireUnverified(basis.treatment.serializedSha256 === guidance.sha256 && equalCanonical(basis.treatment.files, EXPECTED.guidanceFiles), 'Basis guidance receipt is inconsistent.');
  requireUnverified(equalCanonical(basis.promptIsolation.conditionPromptHashes, EXPECTED.promptHashes), 'Frozen prompt-pair hashes drifted.');
  requireUnverified(basis.promptIsolation.treatmentBlockSha256 === EXPECTED.guidanceBlockSha256 && basis.promptIsolation.treatmentRemovalRecoversCleanPrompt === true && basis.promptIsolation.exactPromptsStoredPrivately === true, 'Prompt isolation basis drifted.');
  requireUnverified(Object.values(basis.preflightChecks ?? {}).length > 0 && Object.values(basis.preflightChecks).every((value) => value === true), 'Recorded paired-run preflight was not fully green.');
}

async function verifySealedPromptPair(context) {
  const { runDirectory, run, candidateIds, basis } = context;
  requireUnverified(Boolean(basis), 'Frozen basis was unavailable for sealed-prompt verification.');
  const privateDirectoryStat = await lstat(join(runDirectory, 'private'));
  requireUnverified(privateDirectoryStat.isDirectory() && (privateDirectoryStat.mode & 0o777) === 0o700, 'Sealed assignment directory is not private.');
  const privateEntries = (await readdir(join(runDirectory, 'private'), { withFileTypes: true }))
    .map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other' }))
    .sort((left, right) => left.name.localeCompare(right.name));
  requireUnverified(equalCanonical(privateEntries, [
    { name: 'condition-map.json', type: 'file' },
    { name: 'prompts', type: 'directory' }
  ]), 'Sealed assignment directory contains unexpected entries.');

  const assignmentFile = await readRunJson(runDirectory, 'private/condition-map.json', 'Sealed assignment commitment', { mode: 0o600 });
  const assignment = assignmentFile.value;
  requireUnverified(assignment.sealed === true && assignment.revealOnlyAfter === 'THREEJS-OBSERVATORY__M4P__S2 human visual receipts', 'Sealed assignment policy drifted.');
  requireUnverified(typeof assignment.salt === 'string' && /^[a-f0-9]{64}$/.test(assignment.salt), 'Sealed assignment salt is invalid.');
  requireUnverified(Array.isArray(assignment.mapping) && assignment.mapping.length === 2, 'Sealed assignment does not contain exactly two entries.');
  const computedCommitment = sha256(`${assignment.salt}:${canonicalJson(assignment.mapping)}`);
  requireUnverified(computedCommitment === assignment.commitment && computedCommitment === run.conditionCommitment, 'Sealed assignment commitment does not match the retained run commitment.');

  const assignmentIds = assignment.mapping.map(({ candidateId }) => candidateId);
  requireUnverified(equalCanonical([...assignmentIds].sort(), [...candidateIds].sort()) && new Set(assignmentIds).size === 2, 'Sealed assignment IDs do not match the anonymous candidates.');
  const labels = assignment.mapping.map(({ condition }) => condition).sort();
  requireUnverified(equalCanonical(labels, ['clean', 'treatment']), 'Sealed assignment does not contain the exact permitted pair.');

  const neutralFile = await readRunFile(runDirectory, 'basis/neutral-instruction.txt', 'Frozen neutral instruction');
  const taskFile = await readRunFile(runDirectory, 'basis/task.txt', 'Frozen task');
  const guidanceFile = await readRunFile(runDirectory, 'basis/treatment/snapshot.md', 'Frozen guidance snapshot');
  const neutral = neutralFile.contents.toString('utf8').trimEnd();
  const task = taskFile.contents.toString('utf8').trimEnd();
  const baselinePrompt = buildPrompt(neutral, task);
  const augmentedPrompt = buildPrompt(neutral, task, guidanceFile.contents.toString('utf8'));
  requireUnverified(baselinePrompt.guidanceBlock === '' && augmentedPrompt.guidanceBlock.length > 0, 'Prompt-pair assembly failed.');
  requireUnverified(augmentedPrompt.prompt.split(augmentedPrompt.guidanceBlock).length === 2, 'Permitted prompt delta does not occur exactly once.');
  requireUnverified(augmentedPrompt.prompt.replace(augmentedPrompt.guidanceBlock, '') === baselinePrompt.prompt, 'Removing the permitted prompt delta does not recover byte-identical baseline bytes.');
  requireUnverified(sha256(augmentedPrompt.guidanceBlock) === EXPECTED.guidanceBlockSha256, 'Permitted prompt-delta hash drifted.');
  const expectedPrompts = { clean: baselinePrompt.prompt, treatment: augmentedPrompt.prompt };
  requireUnverified(equalCanonical(Object.values(expectedPrompts).map(sha256).sort(), EXPECTED.promptHashes), 'Reassembled prompt-pair hashes drifted.');

  const rawPromptEntries = await readdir(join(runDirectory, 'private', 'prompts'), { withFileTypes: true });
  requireUnverified(rawPromptEntries.every((entry) => entry.isFile()), 'Sealed prompt directory contains a non-file entry.');
  const promptEntries = rawPromptEntries.map(({ name }) => name).sort();
  requireUnverified(equalCanonical(promptEntries, candidateIds.map((id) => `${id}.txt`).sort()), 'Sealed prompt directory does not contain exactly one prompt per candidate.');

  for (const entry of assignment.mapping) {
    requireUnverified(Object.keys(entry).sort().join(',') === 'candidateId,condition,exactPromptSha256', 'A sealed assignment entry has unexpected fields.');
    const promptFile = await readRunFile(runDirectory, `private/prompts/${entry.candidateId}.txt`, `Sealed prompt for anonymous candidate ${entry.candidateId}`, { mode: 0o600 });
    requireUnverified(promptFile.sha256 === entry.exactPromptSha256, `Anonymous candidate ${entry.candidateId} prompt hash does not match its sealed assignment.`);
    requireUnverified(promptFile.contents.toString('utf8') === expectedPrompts[entry.condition], `Anonymous candidate ${entry.candidateId} prompt bytes do not match its sealed assignment.`);
  }

  const earliestLaunch = Math.min(...await Promise.all(candidateIds.map(async (candidateId) => {
    const receipt = await readRunJson(runDirectory, `candidates/${candidateId}/runtime-receipt.json`, `Runtime receipt for anonymous candidate ${candidateId}`);
    return Date.parse(receipt.value.startedAt);
  })));
  requireUnverified(Number.isFinite(earliestLaunch) && assignmentFile.stat.mtimeMs <= earliestLaunch, 'Sealed assignment commitment was not retained before candidate launch.');
}

async function verifyMatchedInputs(context) {
  const { runDirectory, run, candidateIds, basis, retainedEnvironmentSha256 } = context;
  requireUnverified(Boolean(basis && retainedEnvironmentSha256), 'Frozen basis was unavailable for input matching.');
  const inputReceipts = [];
  for (const candidateId of candidateIds) {
    const runCandidate = run.candidates.find((candidate) => candidate.candidateId === candidateId);
    requireUnverified(runCandidate.inputReceiptPath === `candidates/${candidateId}/input-receipt.json`, `Anonymous candidate ${candidateId} input-receipt path drifted.`);
    const receipt = (await readRunJson(runDirectory, runCandidate.inputReceiptPath, `Input receipt for anonymous candidate ${candidateId}`)).value;
    requireUnverified(receipt.candidateId === candidateId && receipt.assignedPromptSealed === true, `Anonymous candidate ${candidateId} input identity or sealing receipt drifted.`);
    requireUnverified(equalCanonical(receipt.workspaceTree, basis.fixture.tree), `Anonymous candidate ${candidateId} did not receive the byte-identical frozen input tree.`);
    requireUnverified(receipt.commandArgumentsSha256 === basis.runtime.normalizedArgumentsSha256 && receipt.commandArgumentsSha256 === EXPECTED.normalizedArgumentsSha256, `Anonymous candidate ${candidateId} command receipt drifted.`);
    requireUnverified(receipt.environmentBasisSha256 === retainedEnvironmentSha256, `Anonymous candidate ${candidateId} environment receipt drifted.`);
    inputReceipts.push(receipt);
  }
  requireUnverified(equalCanonical(inputReceipts[0].workspaceTree, inputReceipts[1].workspaceTree), 'Anonymous candidates did not receive byte-identical input trees.');
  requireUnverified(inputReceipts[0].commandArgumentsSha256 === inputReceipts[1].commandArgumentsSha256, 'Anonymous candidate commands were not identical.');
  requireUnverified(inputReceipts[0].environmentBasisSha256 === inputReceipts[1].environmentBasisSha256, 'Anonymous candidate environments were not identical.');
}

async function verifySessions(context) {
  const { runDirectory, run, candidateIds, basis } = context;
  requireUnverified(Boolean(basis), 'Frozen basis was unavailable for session verification.');
  const sessions = [];
  for (const candidateId of candidateIds) {
    const runCandidate = run.candidates.find((candidate) => candidate.candidateId === candidateId);
    requireUnverified(runCandidate.runtimeReceiptPath === `candidates/${candidateId}/runtime-receipt.json`, `Anonymous candidate ${candidateId} runtime-receipt path drifted.`);
    const runtime = (await readRunJson(runDirectory, runCandidate.runtimeReceiptPath, `Runtime receipt for anonymous candidate ${candidateId}`)).value;
    requireUnverified(runtime.candidateId === candidateId, `Anonymous candidate ${candidateId} runtime identity drifted.`);
    requireRed(runtime.status === 'complete' && runtime.exitCode === 0 && runtime.signal === null && runtime.timedOut === false && runtime.outputLimitExceeded === false && runtime.spawnError === null && runtime.turnCompleted === true, `Anonymous candidate ${candidateId} did not complete a successful generation session.`);
    requireRed(runtime.freshSession === true && runtime.persistedSession === false, `Anonymous candidate ${candidateId} did not use a fresh ephemeral session.`);
    requireRed(runtime.requestedConfiguration?.provider === 'codex' && runtime.requestedConfiguration?.model === MODEL && runtime.requestedConfiguration?.reasoning === REASONING && runtime.requestedConfiguration?.cliVersion === CODEX_VERSION, `Anonymous candidate ${candidateId} did not run with the frozen Sol-xhigh configuration.`);
    requireUnverified(runtime.command?.executable === 'codex' && equalCanonical(runtime.command.normalizedArguments, EXPECTED_ARGUMENTS), `Anonymous candidate ${candidateId} retained command drifted.`);
    requireUnverified(runtime.command.normalizedArgumentsSha256 === EXPECTED.normalizedArgumentsSha256 && sha256(canonicalJson(runtime.command.normalizedArguments)) === EXPECTED.normalizedArgumentsSha256, `Anonymous candidate ${candidateId} retained command digest is invalid.`);

    const evidence = {};
    for (const name of ['events', 'stderr', 'final']) {
      const expectedPath = `candidates/${candidateId}/${name === 'events' ? 'events.jsonl' : name === 'stderr' ? 'stderr.log' : 'final.md'}`;
      requireUnverified(runtime.evidence?.[name]?.path === expectedPath, `Anonymous candidate ${candidateId} ${name} evidence path drifted.`);
      const file = await readRunFile(runDirectory, expectedPath, `${name} evidence for anonymous candidate ${candidateId}`);
      requireUnverified(file.sha256 === runtime.evidence[name].sha256 && file.bytes === runtime.evidence[name].bytes, `Anonymous candidate ${candidateId} ${name} evidence digest drifted.`);
      evidence[name] = file;
    }
    const events = parseEvents(evidence.events.contents, candidateId);
    const summary = summarizeEvents(events);
    requireUnverified(summary.threadId === runtime.threadId && summary.turnCompleted === true && summary.eventCount === runtime.eventCount && summary.unparsedLineCount === runtime.unparsedLineCount, `Anonymous candidate ${candidateId} event summary drifted.`);
    requireUnverified(equalCanonical(summary.itemTypeCounts, runtime.itemTypeCounts) && summary.nonMessageItemCount === runtime.nonMessageItemCount, `Anonymous candidate ${candidateId} item-count receipt drifted.`);
    requireUnverified(summary.finalMessage.length > 0 && evidence.final.contents.toString('utf8') === `${summary.finalMessage}\n`, `Anonymous candidate ${candidateId} final-message receipt drifted.`);
    const startedAt = Date.parse(runtime.startedAt);
    const endedAt = Date.parse(runtime.endedAt);
    requireUnverified(Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt >= startedAt && endedAt - startedAt === runtime.durationMs, `Anonymous candidate ${candidateId} runtime timestamps are inconsistent.`);
    sessions.push({ candidateId, runtime, events, startedAt });
  }

  const threadIds = sessions.map(({ runtime }) => runtime.threadId);
  requireRed(threadIds.every(Boolean) && new Set(threadIds).size === 2, 'The paired generation did not retain two distinct fresh thread IDs.');
  const launchSkewMs = Math.max(...sessions.map(({ startedAt }) => startedAt)) - Math.min(...sessions.map(({ startedAt }) => startedAt));
  requireRed(run.generation?.concurrent === true && run.generation?.distinctFreshThreadIds === true, 'Paired generation was not recorded as concurrent with distinct sessions.');
  requireRed(Number.isFinite(launchSkewMs) && launchSkewMs <= MAX_LAUNCH_SKEW_MS, `Concurrent launch skew exceeded ${MAX_LAUNCH_SKEW_MS} ms.`);
  requireUnverified(run.generation.launchSkewMs === launchSkewMs, 'Concurrent launch-skew receipt does not match runtime timestamps.');
  requireRed(run.generation.completedCandidateCount === 2 && run.generation.expectedCandidateCount === 2 && run.candidates.every(({ generationStatus }) => generationStatus === 'complete'), 'Paired generation did not complete both anonymous candidates.');
  context.sessions = sessions;
  context.launchSkewMs = launchSkewMs;
}

async function verifyOutputs(context) {
  const { runDirectory, run, candidateIds, basis } = context;
  requireUnverified(Boolean(basis), 'Frozen basis was unavailable for output verification.');
  const outputs = new Map();
  for (const candidateId of candidateIds) {
    const runCandidate = run.candidates.find((candidate) => candidate.candidateId === candidateId);
    const expectedOutputPath = `candidates/${candidateId}/output-tree.json`;
    const expectedPatchPath = `candidates/${candidateId}/patch.diff`;
    requireUnverified(runCandidate.workspacePath === `candidates/${candidateId}/workspace/index.html` && runCandidate.outputReceiptPath === expectedOutputPath && runCandidate.patchPath === expectedPatchPath, `Anonymous candidate ${candidateId} retained output paths drifted.`);
    const output = (await readRunJson(runDirectory, expectedOutputPath, `Output receipt for anonymous candidate ${candidateId}`)).value;
    requireUnverified(output.candidateId === candidateId, `Anonymous candidate ${candidateId} output identity drifted.`);
    requireRed(output.status === 'changed-index' && output.generationComplete === true && output.workspaceSingleFileContract === true, `Anonymous candidate ${candidateId} did not satisfy the changed-index output contract.`);

    const workspaceDirectory = join(runDirectory, 'candidates', candidateId, 'workspace');
    const workspaceTree = await createTreeReceipt(workspaceDirectory);
    requireRed(workspaceTree.entryCount === 1 && workspaceTree.entries[0]?.path === 'index.html' && workspaceTree.entries[0]?.type === 'file', `Anonymous candidate ${candidateId} changed files outside index.html.`);
    requireUnverified(equalCanonical(workspaceTree, {
      sha256: output.workspace.sha256,
      entryCount: output.workspace.entryCount,
      entries: output.workspace.entries
    }), `Anonymous candidate ${candidateId} workspace receipt does not match retained bytes.`);
    requireUnverified(output.workspace.path === `candidates/${candidateId}/workspace`, `Anonymous candidate ${candidateId} workspace path receipt drifted.`);
    const indexEntry = workspaceTree.entries[0];
    requireUnverified(output.index?.path === `candidates/${candidateId}/workspace/index.html` && output.index?.sha256 === indexEntry.sha256 && output.index?.bytes === indexEntry.bytes, `Anonymous candidate ${candidateId} index receipt is inconsistent.`);
    requireRed(indexEntry.sha256 !== basis.fixture.source.sha256, `Anonymous candidate ${candidateId} left index.html unchanged.`);

    const patchFile = await readRunFile(runDirectory, expectedPatchPath, `Patch for anonymous candidate ${candidateId}`);
    requireUnverified(output.patch?.path === expectedPatchPath && output.patch?.sha256 === patchFile.sha256 && output.patch?.bytes === patchFile.bytes && output.patch?.changed === true && output.patch?.stderr === '', `Anonymous candidate ${candidateId} patch receipt is inconsistent.`);
    const expectedPatchCommand = [
      'git', 'diff', '--no-index', '--binary', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', '--',
      'basis/fixture', `candidates/${candidateId}/workspace`
    ];
    requireUnverified(equalCanonical(output.patch.command, expectedPatchCommand), `Anonymous candidate ${candidateId} patch command drifted.`);
    const patchText = patchFile.contents.toString('utf8');
    const diffHeaders = patchText.split(/\r?\n/).filter((line) => line.startsWith('diff --git '));
    requireUnverified(diffHeaders.length === 1 && diffHeaders[0] === `diff --git a/basis/fixture/index.html b/candidates/${candidateId}/workspace/index.html`, `Anonymous candidate ${candidateId} patch is not limited to index.html.`);
    outputs.set(candidateId, { output, workspaceTree, indexEntry });
  }
  context.outputs = outputs;
}

function normalizeTemporaryPath(value) {
  return value.replace(/^\/private\/var\//, '/var/');
}

function transcriptCommandViolation(command) {
  if (typeof command !== 'string' || !command.startsWith('/bin/zsh -lc ')) return 'used an unexpected command wrapper';
  if (/(?:^|[\s"'`])\.\.(?:[\\/\s"'`]|$)/.test(command)) return 'used parent-directory traversal';
  if (/(?:^|[\s"'`])~(?:[\\/\s"'`]|$)|\$(?:\{)?(?:HOME|OLDPWD)(?:\})?\b/.test(command)) return 'used a home or prior-directory expansion';
  if (/(?:^|[\s"'`(=])\/(?:Users|private|var|tmp|Volumes|home|etc|System|Library|Applications|opt)(?:[\\/\s"'`]|$)/.test(command)) return 'used an absolute path outside the command wrapper';
  if (/(?:^|[;&|()\n]\s*)\b(?:cd|pushd|popd)\b/.test(command)) return 'changed the candidate working directory';
  if (/\bgit\s+(?:-[A-Za-z]*C|--git-dir|--work-tree)\b/.test(command)) return 'redirected git outside the candidate workspace';
  if (/\b(?:dirname|realpath|readlink)\b|process\.env\.(?:HOME|OLDPWD)|\b__dirname\b|import\.meta\.url/.test(command)) return 'attempted to derive an enclosing filesystem path';
  if (/(?:^|[;&|]\s*)\b(?:curl|wget|ssh|scp|sftp|nc|ncat|rsync)\b|https?:\/\//.test(command)) return 'attempted external or network access';
  if (/(?:^|[\\/])(?:\.agents|\.codex|skills|benchmarks|private|candidates)(?:[\\/]|$)|SKILL\.md|render-topology-guard\.md/.test(command)) return 'named evaluation or guidance material';
  return null;
}

async function verifyTranscriptIsolation(context) {
  const { candidateIds, sessions } = context;
  requireUnverified(Array.isArray(sessions) && sessions.length === 2, 'Session transcripts were unavailable for isolation verification.');
  for (const candidateId of candidateIds) {
    const session = sessions.find((candidate) => candidate.candidateId === candidateId);
    const commands = new Map();
    const changedPaths = [];
    for (let eventIndex = 0; eventIndex < session.events.length; eventIndex += 1) {
      const event = session.events[eventIndex];
      requireRed(ALLOWED_EVENT_TYPES.has(event?.type), `Anonymous candidate ${candidateId} transcript event ${eventIndex + 1} used a non-workspace tool type.`);
      if (!event.item) continue;
      requireRed(ALLOWED_ITEM_TYPES.has(event.item.type), `Anonymous candidate ${candidateId} transcript event ${eventIndex + 1} used a non-workspace item type.`);
      if (event.item.type === 'command_execution') {
        const priorCommand = commands.get(event.item.id);
        requireUnverified(!priorCommand || priorCommand === event.item.command, `Anonymous candidate ${candidateId} transcript command identity drifted.`);
        commands.set(event.item.id, event.item.command);
      }
      if (event.item.type === 'file_change') {
        requireRed(Array.isArray(event.item.changes) && event.item.changes.length > 0, `Anonymous candidate ${candidateId} reported an empty file-change operation.`);
        for (const change of event.item.changes) {
          requireRed(change.kind === 'update' && typeof change.path === 'string', `Anonymous candidate ${candidateId} used a non-update file operation.`);
          changedPaths.push(normalizeTemporaryPath(change.path));
        }
      }
    }
    requireRed(commands.size > 0, `Anonymous candidate ${candidateId} retained no auditable workspace commands.`);
    for (const command of commands.values()) {
      const violation = transcriptCommandViolation(command);
      requireRed(!violation, `Anonymous candidate ${candidateId} ${violation}.`);
    }
    const uniqueChangedPaths = [...new Set(changedPaths)];
    requireRed(uniqueChangedPaths.length === 1 && uniqueChangedPaths[0].endsWith('/workspace/index.html'), `Anonymous candidate ${candidateId} tool transcript changed a path other than its workspace index.html.`);
    const temporaryWorkspace = dirname(uniqueChangedPaths[0]);
    requireRed(/\/vasir-observatory-agent-[A-Za-z0-9_-]+\/workspace$/.test(temporaryWorkspace), `Anonymous candidate ${candidateId} file-change receipt was not confined to its opaque temporary workspace.`);

    const forbiddenOutputFragments = [
      REPO_ROOT,
      context.runDirectory,
      '/.agents/',
      '/.codex/',
      '/SKILL.md',
      '/render-topology-guard.md'
    ];
    for (const event of session.events) {
      if (event?.item?.type !== 'command_execution' || typeof event.item.aggregated_output !== 'string') continue;
      requireRed(
        forbiddenOutputFragments.every((fragment) => !event.item.aggregated_output.includes(fragment)),
        `Anonymous candidate ${candidateId} command output contains evidence of an out-of-workspace read.`
      );
    }
  }
}

function verifyWorkloadObservation(observation, profile, candidateId) {
  requireRed(observation?.ready === 'true' && observation?.captureTick === String(CAPTURE_TICK), `Anonymous candidate ${candidateId} did not reach the frozen capture tick.`);
  requireRed(observation.innerWidth === profile.width && observation.innerHeight === profile.height && observation.devicePixelRatio === profile.dpr, `Anonymous candidate ${candidateId} viewport contract drifted for ${profile.id}.`);
  requireRed(observation.canvasCount === 1 && observation.displayedCanvasCount === 1 && observation.expectedCanvasPresent === true, `Anonymous candidate ${candidateId} did not expose exactly one required canvas for ${profile.id}.`);
  requireRed(observation.canvasBuffer?.width === profile.width && observation.canvasBuffer?.height === profile.height, `Anonymous candidate ${candidateId} canvas buffer drifted for ${profile.id}.`);
  requireRed(observation.datasets?.outputBuffer === `${profile.width}x${profile.height}` && observation.datasets?.worldBuffer === expectedWorldBuffer(profile), `Anonymous candidate ${candidateId} render-size receipt drifted for ${profile.id}.`);
  const workload = observation.workload;
  requireRed(workload?.seed === 424242 && workload?.totalMarkers === 1200 && workload?.markersPerFamily === 240 && workload?.familyCount === 5 && workload?.rippleCount === 64 && workload?.fixedHz === 60 && workload?.worldRenderScale === 0.67, `Anonymous candidate ${candidateId} declared workload drifted for ${profile.id}.`);
  requireRed(workload.markerRenderableCount === 5 && workload.instancedMarkerRenderableCount === 5 && Array.isArray(workload.markerInstanceCounts) && workload.markerInstanceCounts.length === 5 && workload.markerInstanceCounts.every((count) => count === 240), `Anonymous candidate ${candidateId} does not expose exactly five InstancedMesh groups of 240 for ${profile.id}.`);
  requireRed(workload.markerLogicalCount === 1200 && workload.observedFamilyCount === 5, `Anonymous candidate ${candidateId} observable marker workload drifted for ${profile.id}.`);
}

async function verifyBrowserContract(context) {
  const { runDirectory, runId, candidateIds, outputs } = context;
  requireUnverified(outputs instanceof Map && outputs.size === 2, 'Retained outputs were unavailable for browser-contract verification.');
  const captureHarness = await readLocalFile(CAPTURE_HARNESS_PATH, 'Anonymous capture harness');
  requireUnverified(captureHarness.sha256 === EXPECTED.captureHarnessSha256, 'Anonymous capture harness hash drifted from the frozen value.');
  const manifest = (await readRunJson(runDirectory, 'review/manifest.json', 'Anonymous capture review manifest')).value;
  requireUnverified(manifest.kind === 'threejs-observatory-anonymous-candidate-review' && manifest.runId === runId && manifest.captureTick === CAPTURE_TICK, 'Anonymous capture manifest identity drifted.');
  requireUnverified(manifest.harness?.file === 'benchmarks/threejs-observatory-instancing/capture-candidates.mjs' && manifest.harness?.sha256 === captureHarness.sha256, 'Anonymous capture manifest is not bound to the frozen harness.');
  requireUnverified(manifest.anonymity?.conditionMappingRead === false && manifest.anonymity?.conditionIdentityPublished === false, 'Anonymous capture did not preserve blinded condition identity.');
  requireUnverified(equalCanonical([...manifest.anonymity.candidateIds].sort(), [...candidateIds].sort()), 'Anonymous capture candidate IDs drifted.');
  requireUnverified(equalCanonical(manifest.profiles, EXPECTED_PROFILES), 'Anonymous capture profiles drifted.');
  requireRed(manifest.objectiveVerdict === 'green', 'Anonymous capture review manifest is objectively red.');
  requireUnverified(Array.isArray(manifest.candidates) && manifest.candidates.length === 2, 'Anonymous capture manifest does not contain exactly two candidates.');

  for (const candidateId of candidateIds) {
    const candidate = manifest.candidates.find(({ id }) => id === candidateId);
    requireUnverified(Boolean(candidate), `Anonymous capture is missing candidate ${candidateId}.`);
    const retainedIndex = outputs.get(candidateId).indexEntry;
    requireUnverified(candidate.source?.file === `candidates/${candidateId}/workspace/index.html` && candidate.source?.sha256 === retainedIndex.sha256 && candidate.source?.bytes === retainedIndex.bytes, `Anonymous candidate ${candidateId} capture source does not match retained index.html bytes.`);
    requireRed(candidate.objectiveVerdict === 'green' && Array.isArray(candidate.failures) && candidate.failures.length === 0, `Anonymous candidate ${candidateId} browser capture is objectively red.`);
    requireUnverified(candidate.health === `${candidateId}/health.json`, `Anonymous candidate ${candidateId} health-receipt path drifted.`);
    const health = (await readRunJson(runDirectory, `review/${candidate.health}`, `Browser health receipt for anonymous candidate ${candidateId}`)).value;
    requireUnverified(health.kind === 'threejs-observatory-anonymous-candidate-health' && health.runId === runId && health.candidateId === candidateId && health.captureTick === CAPTURE_TICK, `Anonymous candidate ${candidateId} health-receipt identity drifted.`);
    requireUnverified(equalCanonical(health.source, candidate.source) && equalCanonical(health.browser, manifest.browser), `Anonymous candidate ${candidateId} health-receipt source or browser drifted.`);
    requireRed(health.objectiveVerdict === 'green' && Array.isArray(health.failures) && health.failures.length === 0, `Anonymous candidate ${candidateId} browser health is objectively red.`);
    requireUnverified(Array.isArray(health.profiles) && health.profiles.length === 2, `Anonymous candidate ${candidateId} health receipt does not contain both profiles.`);

    for (const profile of EXPECTED_PROFILES) {
      const profileReceipt = health.profiles.find(({ id }) => id === profile.id);
      requireUnverified(Boolean(profileReceipt) && equalCanonical(profileReceipt.requested, profile), `Anonymous candidate ${candidateId} ${profile.id} health profile drifted.`);
      requireRed(Array.isArray(profileReceipt.failures) && profileReceipt.failures.length === 0 && profileReceipt.repeatFailure === null, `Anonymous candidate ${candidateId} ${profile.id} browser capture reported a failure.`);
      requireRed(Array.isArray(profileReceipt.diagnostics?.runtimeExceptions) && profileReceipt.diagnostics.runtimeExceptions.length === 0 && Array.isArray(profileReceipt.diagnostics?.consoleMessages) && !profileReceipt.diagnostics.consoleMessages.some(({ type }) => ['error', 'assert'].includes(type)) && Array.isArray(profileReceipt.diagnostics?.logEntries) && !profileReceipt.diagnostics.logEntries.some(({ level }) => level === 'error'), `Anonymous candidate ${candidateId} ${profile.id} browser diagnostics are not clean.`);
      verifyWorkloadObservation(profileReceipt.observation, profile, candidateId);

      requireUnverified(profileReceipt.file === `${profile.id}.png`, `Anonymous candidate ${candidateId} ${profile.id} capture path drifted.`);
      const png = await readRunFile(runDirectory, `review/${candidateId}/${profileReceipt.file}`, `PNG capture for anonymous candidate ${candidateId} ${profile.id}`);
      const dimensions = pngSize(png.contents);
      requireUnverified(profileReceipt.png?.sha256 === png.sha256 && profileReceipt.png?.bytes === png.bytes && profileReceipt.png?.width === dimensions.width && profileReceipt.png?.height === dimensions.height, `Anonymous candidate ${candidateId} ${profile.id} PNG receipt does not match retained bytes.`);
      requireRed(dimensions.width === profile.width && dimensions.height === profile.height && profileReceipt.png.repeatSha256 === png.sha256 && profileReceipt.png.byteIdenticalFreshTargetRepeat === true, `Anonymous candidate ${candidateId} ${profile.id} fresh-target repeat was not byte-identical.`);
      const manifestCapture = candidate.captures?.[profile.id];
      requireUnverified(manifestCapture?.file === `${candidateId}/${profile.id}.png` && manifestCapture?.sha256 === png.sha256 && manifestCapture?.repeatStable === true, `Anonymous candidate ${candidateId} ${profile.id} manifest capture receipt drifted.`);
    }
  }
}

async function main() {
  const parsedArguments = parseArguments(process.argv.slice(2));
  if (parsedArguments.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const { runDirectory, runId } = await resolveRunDirectory(parsedArguments.requestedRunDirectory);
  const runFile = await readRunJson(runDirectory, 'run.json', 'Run receipt');
  const run = runFile.value;
  const candidateIds = candidateIdsFromRun(run);
  const context = { runDirectory, runId, run, candidateIds };
  const checks = [];

  const runCheck = async (id, verify) => {
    try {
      await verify(context);
      checks.push({ id, status: 'pass' });
    } catch (error) {
      const classification = error instanceof VerificationFailure ? error.classification : 'UNVERIFIED';
      const reason = error instanceof VerificationFailure ? error.message : `${id} verifier failed unexpectedly.`;
      checks.push({ id, status: 'fail', classification, reason });
    }
  };

  await runCheck('frozen-basis-integrity', verifyBasis);
  await runCheck('sealed-prompt-pair-isolation', verifySealedPromptPair);
  await runCheck('matched-inputs-commands-environment', verifyMatchedInputs);
  await runCheck('fresh-concurrent-sol-xhigh-sessions', verifySessions);
  await runCheck('index-only-output-contract', verifyOutputs);
  await runCheck('candidate-workspace-transcript-isolation', verifyTranscriptIsolation);
  await runCheck('anonymous-browser-workload-contract', verifyBrowserContract);

  const failures = checks.filter(({ status }) => status === 'fail');
  const productClaim = failures.some(({ classification }) => classification === 'UNVERIFIED')
    ? 'UNVERIFIED'
    : failures.length
      ? 'RED'
      : 'GREEN';
  const runStatus = productClaim === 'GREEN' ? 'Objectively Green' : productClaim;
  const verifiedAt = new Date().toISOString();
  const verifier = await readLocalFile(VERIFIER_PATH, 'G2 verifier');
  const receipt = {
    kind: 'threejs-observatory-paired-run-g2-verification',
    schemaVersion: 1,
    runId,
    gateId: GATE_ID,
    harnessVersion: HARNESS_VERSION,
    verifiedAt,
    verifier: {
      file: 'benchmarks/threejs-observatory-instancing/verify-paired-run.mjs',
      sha256: verifier.sha256
    },
    blinded: {
      anonymousCandidateIds: candidateIds,
      sealedAssignmentReadInternally: true,
      assignmentIdentityPublished: false
    },
    checks,
    objectiveVerdict: productClaim === 'GREEN' ? 'green' : productClaim === 'RED' ? 'red' : 'unverified',
    productClaim,
    publicEvidence: {
      candidateCount: candidateIds.length,
      frozenBasisManifestSha256: context.basisFileSha256 ?? null,
      matchedInputTreeSha256: productClaim === 'GREEN' ? context.basis.fixture.tree.sha256 : null,
      runtime: {
        model: MODEL,
        reasoning: REASONING,
        freshDistinctSessionCount: context.sessions?.length ?? 0,
        launchSkewMs: context.launchSkewMs ?? null
      },
      outputContract: 'Each anonymous workspace contains only a changed index.html.',
      browserContract: 'Each anonymous candidate exposed exactly five InstancedMesh marker groups with 240 instances per group at both frozen capture profiles.'
    },
    exclusions: {
      s2Aesthetics: 'Not evaluated by G2; visual quality and equivalence require the separate blinded human S2 review.',
      g3TopologyAndPerformance: 'Not evaluated by G2; render topology, pass/target ownership, default-framebuffer writes, and measured performance require the separate G3 review.'
    },
    failures: failures.map(({ id, classification, reason }) => ({ check: id, classification, reason })),
    claimBoundary: 'G2 verifies paired-run isolation, matched inputs, fresh concurrent generation, index-only output shape, transcript confinement, and the anonymous five-by-240 browser workload contract. It does not judge aesthetics, render topology, or performance.'
  };

  const receiptContents = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeAtomic(join(runDirectory, PUBLIC_RECEIPT_PATH), receiptContents);
  const receiptSha256 = sha256(receiptContents);
  const nextRequiredAction = productClaim === 'GREEN'
    ? 'Conduct the separate blinded S2 human visual review. Keep the sealed assignment private until both S2 receipts exist; run G3 topology/performance review separately.'
    : productClaim === 'RED'
      ? 'Treat G2 as red, keep the sealed assignment private, and rerun both anonymous candidates under a new run ID after repairing the reported contract failure.'
      : 'Treat G2 as unverified, keep the sealed assignment private, and repair or recapture the missing or inconsistent proof before drawing a comparison.';
  const updatedRun = {
    ...run,
    runStatus,
    productClaim,
    g2VerifiedAt: verifiedAt,
    g2Receipt: { path: PUBLIC_RECEIPT_PATH, sha256: receiptSha256 },
    nextRequiredAction,
    claimBoundary: receipt.claimBoundary
  };
  await writeJsonAtomic(join(runDirectory, 'run.json'), updatedRun);

  process.stdout.write(`${JSON.stringify({
    runId,
    runStatus,
    productClaim,
    receipt: PUBLIC_RECEIPT_PATH,
    failureCount: failures.length,
    failures: receipt.failures
  }, null, 2)}\n`);
  if (productClaim !== 'GREEN') process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
