#!/usr/bin/env node
// Private tool-enabled candidate generation. Hidden evaluation is a separate process.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { constants, createWriteStream } from 'node:fs';
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { resolveBenchmarkConfiguration } from '../../cli/eval/benchmark-models.js';
import { listSkillPromptMarkdownFiles } from '../../cli/skill-metadata.js';

const SELF = fileURLToPath(import.meta.url);
const REPOSITORY = resolve(dirname(SELF), '../..');
const POLICY = Object.freeze({
  configurations: ['codex:gpt-6-astra@ultra', 'codex:gpt-6-astra@xhigh', 'codex:gpt-6.1-sol@xhigh', 'claude:claude-opus-5-5@xhigh'],
  conditions: ['none', 'previous', 'revised'], trials: 2, concurrency: 4,
  wallTimeLimitMs: 30 * 60 * 1000, maxStreamBytes: 64 * 1024 * 1024,
  automaticRetries: 0, delegateTools: false,
});
const QUALITY_POLICY = Object.freeze({ ...POLICY, conditions: ['none', 'revised'], cases: 3, concurrency: 8 });
const check = (value, message) => { if (!value) throw new Error(message); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
async function exists(path) { try { await lstat(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function writeJson(path, value) { await mkdir(dirname(path), { recursive: true, mode: 0o700 }); const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`; await writeFile(tmp, json(value), { mode: 0o600 }); await rename(tmp, path); }
function shuffled(items) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; } return result; }
async function tree(root, current = root) {
  const entries = [];
  for (const name of (await readdir(current)).sort()) {
    const path = join(current, name), stat = await lstat(path), key = relative(root, path).split(sep).join('/');
    if (stat.isDirectory()) entries.push(...await tree(root, path));
    else if (stat.isFile()) entries.push({ path: key, type: 'file', bytes: stat.size, sha256: sha256(await readFile(path)) });
    else if (stat.isSymbolicLink()) entries.push({ path: key, type: 'symlink', target: await readlink(path) });
    else throw new Error(`Unsupported source entry: ${key}`);
  }
  return entries;
}
async function receipt(path) { const entries = await tree(path); return { directory: path, sha256: sha256(JSON.stringify(entries)), entries }; }
function workspaceEntries(sourceEntries, dependencyDir) {
  const entries = [...sourceEntries], index = entries.findIndex(entry => entry.path > 'node_modules');
  entries.splice(index < 0 ? entries.length : index, 0, { path: 'node_modules', type: 'symlink', target: dependencyDir });
  return entries;
}
function executable(name) { const result = spawnSync('/bin/zsh', ['-f', '-c', `command -v ${name}`], { encoding: 'utf8' }); check(result.status === 0, `${name} CLI missing`); return result.stdout.trim(); }
async function checkAncestors(workspace) {
  let current = dirname(workspace);
  while (true) {
    for (const name of ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md', '.claude/CLAUDE.md']) check(!await exists(join(current, name)), `Ambient instructions outside fixture: ${join(current, name)}`);
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
}
async function approvedCalibration(fixture, calibrationPath) {
  const bytes = await readFile(calibrationPath), value = JSON.parse(bytes), config = await readJson(fixture.privateConfigPath);
  check(value.valid === true && value.reviewStatus === 'approved' && value.sourceHash === fixture.sourceHash, 'Calibration is not approved for this exact source');
  check(value.faults?.length === config.faults.length && new Set(value.faults.map(fault => fault.id)).size === config.faults.length && value.faults.every(fault => fault.calibrated === true && fault.sha256 === sha256(JSON.stringify(config.faults.find(candidate => candidate.id === fault.id)))), 'Calibration fault basis mismatch');
  return { bytes, sha256: sha256(bytes), sourceHash: value.sourceHash, faults: value.faults.map(({ id, sha256 }) => ({ id, sha256 })) };
}

function environment(row, additions = {}) {
  const env = {};
  for (const key of ['LANG', 'LC_ALL', 'LC_CTYPE', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY']) if (process.env[key]) env[key] = process.env[key];
  return { ...env, ...additions,
    PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: row.claudeAccount ? homedir() : row.home, ...(row.claudeAccount ? {USER:process.env.USER,LOGNAME:process.env.LOGNAME} : {}), CODEX_HOME: join(row.home, '.codex'), CLAUDE_CONFIG_DIR: row.claudeAccount?.configDir ?? join(row.home, '.claude'),
    XDG_CONFIG_HOME: join(row.home, '.config'), XDG_CACHE_HOME: join(row.home, '.cache'),
    TMPDIR: `${join(row.root, 'tmp')}/`, TMPPREFIX: join(row.root, 'tmp/zsh'), CLAUDE_CODE_TMPDIR: join(row.root, 'tmp/claude'),
    npm_config_cache: join(row.home, '.npm'), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ZDOTDIR: row.home,
    CI: '1', CODEX_CI: '1', NO_COLOR: '1', TERM: 'dumb', TZ: 'UTC',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1', DISABLE_AUTOUPDATER: '1',
  };
}
function sandbox(row, readRoots) {
  const writableSuite = row.submissionMode === 'suite-quality' ? `\n(deny file-write* (subpath ${JSON.stringify(row.workspace)}))\n(allow file-write* (subpath ${JSON.stringify(join(row.workspace, row.submissionPrefix))}))\n` : '';
  const accountReads = row.claudeAccount ? `(allow file-read* ${['.claude.json','.credentials.json'].map(name=>`(literal ${JSON.stringify(join(row.claudeAccount.configDir,name))})`).join(' ')} (subpath ${JSON.stringify(join(homedir(),'Library/Keychains'))}))\n` : '';
  return `(version 1)\n(allow default)\n(deny file-write*)\n(deny file-read*\n${[homedir(), '/private/tmp', '/private/var/folders', '/etc/codex', '/etc/claude-code'].map(p => `  (subpath ${JSON.stringify(p)})`).join('\n')}\n)\n(allow file-read-metadata (subpath "/"))\n(allow file-write* (literal "/dev/null") (literal "/dev/tty"))\n(allow file-read* file-write* (subpath ${JSON.stringify(row.root)}))\n(allow file-read*\n${readRoots.map(p => `  (subpath ${JSON.stringify(p)})`).join('\n')}\n)\n${accountReads}${writableSuite}`;
}
export function validateClaudeAccountStatus(account, status) {
  check(account && isAbsolute(account.configDir) && typeof account.email === 'string' && account.email.length > 0, 'Claude account context requires an absolute directory and expected email');
  check(status?.loggedIn === true && status.email === account.email, 'Claude selected-account identity does not match the requested account');
  return {provider:'claude',contextId:basename(account.configDir),email:status.email,loggedIn:true};
}
function codexArgs(row) {
  const disabled = ['multi_agent', 'multi_agent_v2', 'plugins', 'apps', 'hooks', 'memories', 'skill_search', 'image_generation', 'browser_use', 'browser_use_external', 'in_app_browser', 'computer_use'];
  return ['--ask-for-approval', 'never', ...disabled.flatMap(x => ['--disable', x]), 'exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'danger-full-access', '--model', row.configuration.model,
    '--config', `model_reasoning_effort=${JSON.stringify(row.configuration.reasoning)}`,
    '--config', 'project_doc_max_bytes=0', '--config', 'features.skip_host_skill_discovery=true',
    '--config', 'agents.max_threads=1', '--config', 'features.multi_agent_v2={max_concurrent_threads_per_session=1}',
    '--config', 'web_search="disabled"', '--config', 'shell_environment_policy.inherit="all"',
    '--config', `skills.config=[${['imagegen', 'openai-docs', 'plugin-creator', 'skill-creator', 'skill-installer'].map(name => `{path=${JSON.stringify(join(row.home, '.codex/skills/.system', name, 'SKILL.md'))},enabled=false}`).join(',')}]`,
    '--color', 'never', '--json', '--cd', row.workspace, '-'];
}
function claudeArgs(row) {
  return ['--print', '--safe-mode', '--disable-slash-commands', '--model', row.configuration.model, '--effort', row.configuration.reasoning,
    '--no-session-persistence', '--no-chrome', '--output-format', 'stream-json', '--verbose', '--setting-sources', '',
    '--settings', join(row.root, 'claude-settings.json'), '--strict-mcp-config', '--mcp-config', join(row.root, 'mcp.json'),
    '--dangerously-skip-permissions', '--disallowedTools', 'Agent,Task,Workflow,TeamCreate,TeamDelete,SendMessage', '--tools', 'Bash,Read,Edit,Write,Glob,Grep'];
}
async function authentication(row, install) {
  if (row.claudeAccount) {
    if (install) {
      const result = spawnSync(row.command, ['auth','status','--json'], {env:environment(row),encoding:'utf8',timeout:10000,maxBuffer:65536});
      check(result.status === 0, 'Claude selected-account auth status unavailable');
      let status; try { status = JSON.parse(result.stdout); } catch { throw Error('Claude selected-account auth status is not JSON'); }
      row.accountAssertion = validateClaudeAccountStatus(row.claudeAccount,status);
    }
    return;
  }
  const codexPath = join(row.home, '.codex/auth.json'), claudePath = join(row.home, '.claude/.credentials.json');
  if (!install) { await rm(codexPath, { force: true }); await rm(claudePath, { force: true }); return; }
  if (row.configuration.provider === 'codex') { await cp(join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'auth.json'), codexPath); await chmod(codexPath, 0o600); }
  else {
    const result = spawnSync('/usr/bin/security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8' });
    check(result.status === 0, 'Claude keychain authentication unavailable'); const payload = JSON.parse(result.stdout);
    check(payload.claudeAiOauth?.accessToken, 'Claude OAuth token missing'); await writeJson(claudePath, { claudeAiOauth: payload.claudeAiOauth });
    await writeJson(join(row.home, '.claude.json'), { hasCompletedOnboarding: true, autoUpdates: false });
  }
}
async function capture(command, args, { cwd, env, input, timeoutMs = 60000, stdoutPath, stderrPath } = {}) {
  return new Promise(done => {
    const start = Date.now(), child = spawn(command, args, { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = { stdout: [], stderr: [] }, bytes = { stdout: 0, stderr: 0 }, files = { stdout: stdoutPath ? createWriteStream(stdoutPath, { mode: 0o600 }) : null, stderr: stderrPath ? createWriteStream(stderrPath, { mode: 0o600 }) : null }; let timedOut = false, outputLimitExceeded = false, settled = false, force;
    const kill = signal => { try { process.kill(-child.pid, signal); } catch {} };
    const stop = () => { kill('SIGTERM'); force ??= setTimeout(() => kill('SIGKILL'), 5000); };
    const timeout = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', part => { const kept = part.subarray(0, Math.max(0, POLICY.maxStreamBytes - bytes[stream])); chunks[stream].push(kept); files[stream]?.write(kept); bytes[stream] += part.length; if (bytes[stream] > POLICY.maxStreamBytes) { outputLimitExceeded = true; stop(); } });
    const finish = async (exitCode, signal, spawnError = null) => { if (settled) return; settled = true; clearTimeout(timeout); clearTimeout(force); kill('SIGTERM'); await Promise.all(Object.values(files).filter(Boolean).map(file => new Promise(resolve => file.end(resolve)))); done({ exitCode, signal, spawnError, timedOut, outputLimitExceeded, startedAt: new Date(start).toISOString(), endedAt: new Date().toISOString(), elapsedMs: Date.now() - start, stdout: Buffer.concat(chunks.stdout).toString(), stderr: Buffer.concat(chunks.stderr).toString() }); };
    child.on('error', e => finish(null, null, e.message)); child.on('close', (code, signal) => finish(code, signal)); child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
function rpcProcess(row, args, dialect = 'codex') {
  const child = spawn('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...args], { cwd: row.workspace, env: environment(row), stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '', next = 0; const pending = new Map();
  child.stderr.on('data', value => { stderr += value; });
  child.stdout.on('data', chunk => { buffer += chunk; while (buffer.includes('\n')) { const n = buffer.indexOf('\n'), line = buffer.slice(0, n); buffer = buffer.slice(n + 1); let value; try { value = JSON.parse(line); } catch { continue; } const id = dialect === 'claude' ? value.response?.request_id : value.id, item = pending.get(id); if (item) { clearTimeout(item.timer); pending.delete(id); item.done(value); } } });
  child.on('exit', code => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error(`Native initialization exited ${code}: ${stderr.slice(-1200)}`)); } pending.clear(); }); child.stdin.on('error', () => {});
  return {
    notify: value => child.stdin.write(`${JSON.stringify(value)}\n`),
    request: (method, params) => new Promise((done, reject) => { const id = dialect === 'claude' ? `request-${++next}` : ++next; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Native ${method} timed out: ${stderr.slice(-1200)}`)); }, 60000); pending.set(id, { done, reject, timer }); child.stdin.write(`${JSON.stringify(dialect === 'claude' ? { type: 'control_request', request_id: id, request: { subtype: method, ...params } } : { id, method, params })}\n`); }),
    close: () => { child.kill('SIGTERM'); for (const item of pending.values()) clearTimeout(item.timer); },
  };
}
async function nativePreflight(rows, history, configurations = POLICY.configurations) {
  const receipts = [];
  for (const provider of ['codex', 'claude']) {
    const row = rows.find(r => r.configuration.provider === provider); if (!row) continue; await authentication(row, true); let rpc;
    try {
      if (provider === 'codex') {
        rpc = rpcProcess(row, ['app-server', '--stdio', '--config', 'project_doc_max_bytes=0']);
        const init = await rpc.request('initialize', { clientInfo: { name: 'vasir-backend-testing', version: '1' }, capabilities: { experimentalApi: true } }); check(!init.error, 'Codex native initialize failed'); rpc.notify({ method: 'initialized' });
        const listed = await rpc.request('model/list', { includeHidden: true, limit: 100 }); check(Array.isArray(listed.result?.data), 'Codex native model/list unavailable');
        for (const configuration of configurations.map(resolveBenchmarkConfiguration).filter(c => c.provider === provider)) {
          const model = listed.result.data.find(m => m.model === configuration.model); check(model, `Native catalog lacks ${configuration.model}; no substitution permitted`);
          check(model.supportedReasoningEfforts.some(e => e.reasoningEffort === configuration.reasoning), `Native catalog lacks ${configuration.id}`);
          receipts.push({ configurationId: configuration.id, model: model.model, effort: configuration.reasoning, source: 'native-model/list', accepted: true });
        }
        await writeJson(join(history, 'preflight/codex-models.json'), listed.result);
      } else {
        rpc = rpcProcess(row, [...row.arguments, '--input-format', 'stream-json'], 'claude');
        const initialized = await rpc.request('initialize', { hooks: {}, sdkMcpServers: [] }); check(initialized.response?.subtype === 'success', 'Claude native initialize failed'); const payload = initialized.response.response;
        await writeJson(join(history, 'preflight/claude-initialize.json'), payload);
        const models = payload.models ?? payload.supportedModels; check(Array.isArray(models), 'Claude initialization omitted model catalog');
        const model = models.find(m => m.resolvedModel === row.configuration.model || m.value === row.configuration.model || m.model === row.configuration.model || m.id === row.configuration.model);
        check(model, `Claude native catalog lacks ${row.configuration.model}; no substitution permitted`);
        const efforts = model.supportedEffortLevels ?? model.supportedReasoningEfforts ?? payload.supportedEffortLevels;
        check(Array.isArray(efforts) && efforts.some(e => (typeof e === 'string' ? e : e.reasoningEffort) === row.configuration.reasoning), 'Claude native catalog omitted xhigh support; inspect preflight before proceeding');
        receipts.push({ configurationId: row.configuration.id, model: row.configuration.model, effort: row.configuration.reasoning, source: 'native-initialize', accepted: true });
      }
    } finally { rpc?.close(); await authentication(row, false); }
  }
  return receipts;
}
async function promptPreflight(rows) {
  const receipts = [];
  const samples = [...new Map(rows.filter(r => r.configuration.provider === 'codex').map(row => [`${row.caseId ?? ''}/${row.condition}`, row])).values()];
  for (const row of samples) {
    const prompt = await readFile(join(row.history, 'prompt.txt'), 'utf8'), overrides = [];
    for (let i = 0; i < row.arguments.length; i++) if (['--config', '--disable'].includes(row.arguments[i])) overrides.push(row.arguments[i], row.arguments[++i]);
    await authentication(row, true);
    try {
      const result = await capture('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...overrides, '--config', 'sandbox_mode="danger-full-access"', '--config', 'approval_policy="never"', '--config', `model=${JSON.stringify(row.configuration.model)}`, '--cd', row.workspace, 'debug', 'prompt-input', prompt], { cwd: row.workspace, env: environment(row) });
      check(result.exitCode === 0, `Prompt preflight failed: ${result.stderr.slice(-1500)}`);
      const payload = JSON.parse(result.stdout);
      check(payload.at(-1)?.role === 'user' && payload.at(-1)?.content?.[0]?.text === prompt, 'Native task does not match frozen prompt');
      check(!result.stdout.includes('<skills_instructions>'), 'Unexpected automatically discovered skills in native input');
      await writeJson(join(row.history, 'native-input.json'), payload);
      receipts.push({ provider: 'codex', condition: row.condition, ...(row.caseId ? { caseId: row.caseId } : {}), renderedInputSha256: sha256(result.stdout), automaticSkillCatalog: false });
    } finally { await authentication(row, false); }
  }
  return receipts;
}
async function treatments(previousMain) {
  const directory = join(REPOSITORY, '.agents/skills/testing__enforcing-mandate');
  const files = await Promise.all(listSkillPromptMarkdownFiles(directory).map(async path => ({ path, contents: await readFile(join(directory, path), 'utf8') })));
  const arms = [['revised', files]];
  if (previousMain) { const previous = files.map(file => ({ ...file })); previous.find(file => file.path === 'SKILL.md').contents = await readFile(previousMain, 'utf8'); arms.unshift(['previous', previous]); }
  return Object.fromEntries(arms.map(([condition, entries]) => { const text = entries.map(file => `--- ${file.path} ---\n${file.contents.trim()}\n`).join('\n'); return [condition, { text, sha256: sha256(text), files: entries.map(f => ({ path: f.path, sha256: sha256(f.contents), contents: f.contents })) }]; }));
}
async function prepare(fixturePath, previousMain, calibrationPath) {
  return prepareBatch({ cases: [{ id: 'pilot', fixturePath: resolve(fixturePath), calibrationPath: resolve(calibrationPath) }], policy: POLICY, previousMain: resolve(previousMain) });
}
export async function approvedRubricFreeze(freezePath, rubricPath, cases, latestAt = new Date().toISOString()) {
  const bytes = await readFile(freezePath), value = JSON.parse(bytes);
  check(value.kind === 'backend-testing-rubric-freeze' && value.schemaVersion === 2 && value.status === 'frozen', 'Suite quality requires accepted artifact-judge calibration');
  check(Number.isFinite(Date.parse(value.frozenAt)) && Date.parse(value.frozenAt) <= Date.parse(latestAt), 'Rubric freeze must predate generation preparation');
  check(value.rubricSha256 === sha256(await readFile(rubricPath)), 'Calibrated rubric changed');
  check(value.nativeRunnerSha256 === sha256(await readFile(SELF)) && value.judgeRunnerSha256 === sha256(await readFile(join(dirname(SELF), 'judge.mjs'))), 'Native runner or artifact judge changed after rubric calibration');
  check(value.verifierSha256 === sha256(await readFile(join(dirname(SELF), 'verify.mjs'))), 'Verifier changed after rubric calibration');
  check(JSON.stringify(value.judgePanel) === JSON.stringify(['codex:gpt-6-astra@xhigh', 'claude:claude-opus-5-5@xhigh']), 'Calibrated judge panel changed');
  check(value.checks?.length > 0 && value.checks.every(item => item.status === 'pass'), 'Reference artifact calibration did not pass');
  check(value.cases?.length === cases.length && new Set(value.cases.map(item => item.caseId)).size === cases.length, 'Rubric freeze case inventory mismatch');
  for (const item of cases) check(value.cases.some(entry => entry.caseId === item.id && entry.sourceHash === item.fixture.sourceHash && /^[a-f0-9]{64}$/.test(entry.caseBasisSha256)), `Rubric freeze source mismatch: ${item.id}`);
  for (const pin of [value.calibrationPlan, value.calibrationManifest]) {
    check(pin?.path && pin?.sha256, 'Rubric freeze omitted calibration provenance');
    const content = await readFile(pin.path);
    check(content.length === pin.bytes && sha256(content) === pin.sha256, 'Frozen artifact-judge calibration input changed');
  }
  return { bytes, sha256: sha256(bytes), frozenAt: value.frozenAt };
}
async function prepareQuality(manifestPath) {
  manifestPath = resolve(manifestPath);
  const manifest = await readJson(manifestPath);
  check(manifest.schemaVersion === 2 && manifest.benchmark === 'backend-testing-suite-quality', 'Expected suite-quality manifest v2');
  check(manifest.cases?.length === QUALITY_POLICY.cases && new Set(manifest.cases.map(item => item.id)).size === QUALITY_POLICY.cases, 'Suite quality requires three unique cases');
  for (const item of manifest.cases) check(/^[a-z0-9][a-z0-9-]*$/.test(item.id), `Invalid case id: ${item.id}`);
  const fromManifest = file => resolve(dirname(manifestPath), file);
  check(manifest.rubricFreezePath, 'Suite-quality manifest requires rubricFreezePath');
  const cases = manifest.cases.map(item => ({ ...item, fixturePath: fromManifest(item.fixturePath), calibrationPath: fromManifest(item.calibrationPath) }));
  await approvedRubricFreeze(fromManifest(manifest.rubricFreezePath), fromManifest(manifest.rubricPath), await Promise.all(cases.map(async item => ({ id: item.id, fixture: await readJson(item.fixturePath) }))));
  return prepareBatch({ cases, policy: QUALITY_POLICY, manifestPath, rubricPath: fromManifest(manifest.rubricPath), rubricFreezePath: fromManifest(manifest.rubricFreezePath) });
}
async function prepareBatch({ cases, policy, previousMain, manifestPath, rubricPath, rubricFreezePath }) {
  check(process.platform === 'darwin', 'Isolation requires macOS sandbox-exec');
  const quality = policy === QUALITY_POLICY;
  const runId = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  const history = join(REPOSITORY, '.agents/vasir-evals/backend-testing', ...(quality ? ['suite-quality', 'runs'] : []), runId);
  await mkdir(history, { recursive: true, mode: 0o700 });
  const batchRoot = await realpath(await mkdtemp('/private/tmp/backend-testing-'));
  const arms = await treatments(previousMain);
  await writeJson(join(history, 'treatments.json'), arms);
  const binaries = { codex: await realpath(executable('codex')), claude: await realpath(executable('claude')) };
  const frozenCases = [], rows = [], pairs = [];
  for (const item of shuffled(cases)) {
    const fixture = await readJson(item.fixturePath);
    check(fixture.sourceDir && fixture.taskPath && fixture.dependencyDir, 'Fixture requires sourceDir, taskPath, dependencyDir');
    check(typeof fixture.submissionPrefix === 'string' && /^[^./][^\\]*\/$/.test(fixture.submissionPrefix) && !fixture.submissionPrefix.split('/').includes('..'), 'Submission prefix must be a relative directory ending in /');
    const calibration = await approvedCalibration(fixture, item.calibrationPath), source = await receipt(fixture.sourceDir);
    check(!source.entries.some(e => /(^|\/)(\.git|\.agents|\.claude|\.codex)(\/|$)/.test(e.path)), 'Fixture contains ambient configuration or skills');
    check(source.entries.every(e => e.type === 'file'), 'Frozen fixture must contain regular files only; dependencies are mounted separately');
    check(source.entries.length === Object.keys(fixture.fileHashes).length && source.entries.every(entry => fixture.fileHashes[entry.path] === entry.sha256), 'Fixture files do not match frozen manifest');
    check(sha256(JSON.stringify(fixture.fileHashes)) === fixture.sourceHash, 'Fixture sourceHash does not match file hashes');
    const caseHistory = quality ? join(history, 'cases', item.id) : history;
    await mkdir(caseHistory, { recursive: true, mode: 0o700 });
    const frozenSource = join(caseHistory, 'frozen-source');
    await cp(fixture.sourceDir, frozenSource, { recursive: true, mode: constants.COPYFILE_FICLONE });
    check((await receipt(frozenSource)).sha256 === source.sha256, 'Fixture changed while preparing source copy');
    const task = await readFile(fixture.taskPath, 'utf8');
    const taskPath = join(caseHistory, 'task.md'), fixturePath = join(caseHistory, 'fixture.json'), calibrationPath = join(caseHistory, 'calibration-approved.json');
    await writeFile(taskPath, task, { mode: 0o600 });
    await writeJson(fixturePath, { ...fixture, sourceDir: frozenSource, taskPath });
    await writeFile(calibrationPath, calibration.bytes, { mode: 0o600 });
    const repositoryInstructions = await readFile(join(frozenSource, 'AGENTS.md'), 'utf8');
    const scope = quality
      ? `You may edit, delete, retain, or add JavaScript (.js) and Markdown (.md) files inside ${fixture.submissionPrefix}. Production source, configuration, dependencies, and files outside that directory are fixed.`
      : `Only new JavaScript tests and helpers inside ${fixture.submissionPrefix} are accepted. Existing files, production source and shared harness files are fixed.`;
    const common = `Work in the provided repository snapshot. Follow the repository instructions below and read applicable nested AGENTS.md files. ${scope} Put temporary logs and scratch files under the supplied TMPDIR. Dependencies are available in node_modules. Infrastructure endpoints are supplied in the process environment. Do not seek another checkout, external source, other skills, or evaluation artifacts.\n\n--- Repository instructions ---\n${repositoryInstructions.trim()}\n--- Repository instructions end ---`;
    const dependencyDir = await realpath(fixture.dependencyDir);
    const readRoots = [resolve(dirname(process.execPath), '..'), dirname(binaries.claude), dependencyDir, ...(fixture.sandboxReadRoots ?? [])];
    const workspaceSha256 = sha256(JSON.stringify(workspaceEntries(source.entries, dependencyDir)));
    for (const configuration of shuffled(policy.configurations.map(resolveBenchmarkConfiguration))) for (let trial = 1; trial <= policy.trials; trial++) {
      const pairId = `pair-${randomBytes(5).toString('hex')}`, pairRows = [];
      for (const condition of shuffled(policy.conditions)) {
        const rowId = `row-${randomBytes(6).toString('hex')}`, root = join(batchRoot, rowId);
        const row = { rowId, pairId, trial, condition, configuration, ...(quality ? { caseId: item.id, submissionMode: 'suite-quality' } : {}), submissionPrefix: fixture.submissionPrefix, root, home: join(root, 'home'), workspace: join(root, 'workspace'), history: join(history, 'rows', rowId) };
        for (const dir of [row.home, row.history, join(root, 'tmp'), join(row.home, '.codex'), join(row.home, '.claude')]) await mkdir(dir, { recursive: true, mode: 0o700 });
        await cp(frozenSource, row.workspace, { recursive: true, mode: constants.COPYFILE_FICLONE }); await symlink(dependencyDir, join(row.workspace, 'node_modules'), 'dir');
        await checkAncestors(row.workspace);
        await mkdir(join(row.workspace, fixture.submissionPrefix), { recursive: true });
        await writeJson(join(root, 'claude-settings.json'), { permissions: { defaultMode: 'bypassPermissions' }, disableAllHooks: true, enabledPlugins: {}, autoMemoryEnabled: false }); await writeJson(join(root, 'mcp.json'), { mcpServers: {} });
        row.sandboxPath = join(root, 'isolation.sb'); await writeFile(row.sandboxPath, sandbox(row, readRoots));
        row.command = binaries[configuration.provider]; row.arguments = configuration.provider === 'codex' ? codexArgs(row) : claudeArgs(row);
        const treatment = condition === 'none' ? '' : `\n\n--- Testing skill guidance ---\n${arms[condition].text}\n--- Testing skill guidance end ---`;
        const prompt = `${common}${treatment}\n\n${task.trim()}\n`;
        row.promptSha256 = sha256(prompt); row.treatmentSha256 = arms[condition]?.sha256 ?? null;
        await writeFile(join(row.history, 'prompt.txt'), prompt, { mode: 0o600 }); row.workspaceBefore = { directory: row.workspace, sha256: workspaceSha256 }; await writeJson(join(row.history, 'launch.json'), row);
        rows.push(row); pairRows.push(rowId);
      }
      pairs.push({ pairId, ...(quality ? { caseId: item.id } : {}), configurationId: configuration.id, trial, launchOrder: pairRows });
    }
    const infrastructureModule = fixture.infrastructureModule ?? join(dirname(SELF), 'fixture.mjs');
    const basis = { sourceHash: fixture.sourceHash, dependencyLockHash: fixture.dependencyLockHash, taskSha256: sha256(task), calibrationSha256: calibration.sha256, faults: calibration.faults,
      infrastructureModuleSha256: sha256(await readFile(infrastructureModule)), runtimeConfigSha256: sha256(await readFile(fixture.privateConfigPath)) };
    frozenCases.push({ id: item.id, fixturePath, calibrationPath, source: { ...source, directory: frozenSource }, basis });
  }
  const sample = rows[0], fixture = await readJson(frozenCases.find(item => item.id === (sample.caseId ?? 'pilot')).fixturePath);
  const denied = [join(REPOSITORY, 'package.json'), join(fixture.sourceDir, 'package.json'), join(rows[1].root, 'isolation.sb'), join(history, 'treatments.json')];
  const probe = `${fixture.submissionPrefix}.probe`;
  const script = `const fs=require('fs');for(const p of ${JSON.stringify(denied)}){try{fs.readFileSync(p);throw Error('Unexpected access '+p)}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e}}fs.readFileSync('package.json');fs.readFileSync('node_modules/mocha/package.json');fs.writeFileSync(${JSON.stringify(probe)},'ok');fs.unlinkSync(${JSON.stringify(probe)});console.log('isolation-ok')`;
  const isolated = await capture('/usr/bin/sandbox-exec', ['-f', sample.sandboxPath, process.execPath, '-e', script], { cwd: sample.workspace, env: environment(sample) }); check(isolated.exitCode === 0, `Isolation probe failed: ${isolated.stderr}`);
  const providers = await nativePreflight(rows, history, policy.configurations), prompts = await promptPreflight(rows);
  const versions = Object.fromEntries(Object.entries(binaries).map(([name, binary]) => [name, spawnSync(binary, ['--version'], { encoding: 'utf8' }).stdout.trim()]));
  const basis = { ...(quality ? { cases: frozenCases.map(({ id, basis }) => ({ id, ...basis })) } : frozenCases[0].basis),
    conditions: policy.conditions.map(id => ({ id, skillSha256: arms[id]?.sha256 ?? null })), runnerSha256: sha256(await readFile(SELF)), policySha256: sha256(JSON.stringify(policy)) };
  if (quality) {
    await cp(manifestPath, join(history, 'suite-quality-manifest.json'));
    await cp(rubricPath, join(history, 'rubric.json'));
    await cp(rubricFreezePath, join(history, 'rubric-freeze.json'));
    basis.manifestSha256 = sha256(await readFile(manifestPath)); basis.rubricSha256 = sha256(await readFile(rubricPath)); basis.rubricFreezeSha256 = sha256(await readFile(rubricFreezePath)); basis.verifierSha256 = sha256(await readFile(join(dirname(SELF), 'verify.mjs')));
  }
  const plan = { schemaVersion: quality ? 2 : 1, benchmark: quality ? 'backend-testing-suite-quality' : 'backend-testing', runId, history, batchRoot, preparedAt: new Date().toISOString(), status: 'prepared-no-generation-calls', policy, basis, runnerSha256: basis.runnerSha256,
    ...(quality ? { cases: frozenCases, rubricPath: join(history, 'rubric.json'), rubricFreezePath: join(history, 'rubric-freeze.json') } : { fixturePath: frozenCases[0].fixturePath, source: frozenCases[0].source, taskSha256: frozenCases[0].basis.taskSha256 }),
    treatments: Object.fromEntries(Object.entries(arms).map(([key, value]) => [key, { sha256: value.sha256, files: value.files.map(({ contents, ...f }) => f) }])), preflight: { isolation: { status: 'pass', deniedPaths: denied }, providers, prompts, versions }, pairs, rows };
  await writeJson(join(history, 'plan.json'), plan); process.stdout.write(json({ status: plan.status, planPath: join(history, 'plan.json'), rows: rows.length, providers })); return plan;
}

export function parseResult(row, result, outputSchema = null) {
  const events = result.stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const schemaDeliveryAllowed = Boolean(outputSchema && row.configuration.provider === 'claude');
  const calls = events.flatMap(event => event.message?.content ?? []).filter(item => item.type === 'tool_use');
  const toolUse = events.some(event => ['command_execution', 'mcp_tool_call', 'web_search', 'file_change'].includes(event.item?.type))
    || calls.some(call => !schemaDeliveryAllowed || call.name !== 'StructuredOutput');
  if (row.configuration.provider === 'codex') {
    const completed = events.findLast(e => e.type === 'turn.completed'), items = events.filter(e => e.type === 'item.completed').map(e => e.item), finalText = items.filter(e => e.type === 'agent_message').at(-1)?.text ?? '';
    return { complete: Boolean(completed && finalText), finalText, toolUse, usage: completed?.usage ?? null, costUsd: null, runtime: { requestedModel: row.configuration.model, requestedReasoning: row.configuration.reasoning, modelIdentityEvidence: 'exact-native-catalog-selection-and-cli-invocation-no-fallback', threadId: events.find(e => e.type === 'thread.started')?.thread_id, eventCount: events.length } };
  }
  const final = events.findLast(e => e.type === 'result'), init = events.find(e => e.type === 'system' && e.subtype === 'init'), models = [...new Set(events.filter(e => e.type === 'assistant').map(e => e.message?.model).filter(Boolean))];
  const exact = init?.model === row.configuration.model && models.every(model => model === row.configuration.model);
  const structuredOutput = schemaDeliveryAllowed && final?.structured_output && typeof final.structured_output === 'object' && !Array.isArray(final.structured_output) ? final.structured_output : null;
  const delivered = calls.filter(call => call.name === 'StructuredOutput').at(-1);
  const structuredOutputDeliveryValid = !schemaDeliveryAllowed || Boolean(structuredOutput && delivered && isDeepStrictEqual(delivered.input, structuredOutput));
  const finalText = schemaDeliveryAllowed ? structuredOutput ? JSON.stringify(structuredOutput) : '' : final?.result ?? '';
  return { complete: Boolean(final && !final.is_error && finalText && exact && (!schemaDeliveryAllowed || final.subtype === 'success')), finalText, toolUse,
    ...(schemaDeliveryAllowed ? { structuredOutput, structuredOutputDeliveryValid } : {}),
    usage: final?.usage ?? null, costUsd: final?.total_cost_usd ?? null, runtime: { model: init?.model, assistantModels: models, exactModel: exact, requestedReasoning: row.configuration.reasoning, modelUsage: final?.modelUsage, eventCount: events.length, sessionId: final?.session_id } };
}
export function qualityEligibility(result, parsed, submission) {
  if (submission.forbiddenChanges.length) return { status: 'task-invalid', reason: 'forbidden-changes' };
  if (result.spawnError) return { status: 'unresolved', reason: 'provider-runtime-failure', evidence: 'native-launch-error' };
  if (parsed.runtime?.exactModel === false) return { status: 'unresolved', reason: 'provider-runtime-failure', evidence: 'native-model-mismatch' };
  const events = result.stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const errors = events.filter(event => event.type === 'error' || event.type === 'turn.failed' || (event.type === 'result' && event.is_error));
  const terminal = !parsed.complete && errors.at(-1), detail = terminal ? JSON.stringify(terminal) : '';
  if (terminal && !/error_max_turns|error_max_budget_usd/.test(detail)) return { status: 'unresolved',
    reason: /usage.?limit|rate.?limit|insufficient.quota|credits|quota.exceeded/i.test(detail) ? 'provider-usage-limit'
      : /authentication|unauthorized|invalid.api.key|token.expired|not.logged.in|oauth/i.test(detail) ? 'provider-authentication-failure' : 'provider-runtime-failure',
    evidence: { eventType: terminal.type, eventSha256: sha256(detail) } };
  if (result.outputLimitExceeded) return { status: 'eligible', reason: 'authored-output-limit' };
  if (result.timedOut) return { status: 'eligible', reason: 'authored-wall-limit' };
  if (terminal) return { status: 'eligible', reason: 'authored-native-budget' };
  if (result.signal || (result.exitCode !== null && result.exitCode !== 0)) return { status: 'unresolved', reason: 'provider-runtime-failure', evidence: 'native-process-failure' };
  return { status: 'eligible', reason: parsed.complete ? 'complete' : 'missing-final-response' };
}
async function collectSubmission(row, entries, originalRoot) {
  const quality = row.submissionMode === 'suite-quality';
  const before = new Map(entries.map(e => [e.path, e])), after = new Map((await tree(row.workspace)).map(e => [e.path, e]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changed = paths.filter(path => JSON.stringify(before.get(path)) !== JSON.stringify(after.get(path)));
  const inScope = path => path.startsWith(row.submissionPrefix) && (quality ? /\.(js|md)$/.test(path) : path.endsWith('.js'));
  const allowed = path => inScope(path) && (quality || !before.has(path));
  const forbiddenChanges = changed.filter(path => !allowed(path) || (after.has(path) && after.get(path).type !== 'file') || (before.has(path) && before.get(path).type !== 'file'));
  const accepted = changed.filter(path => !forbiddenChanges.includes(path));
  const directory = join(row.history, 'submission'), originalDirectory = join(row.history, 'original-suite');
  await mkdir(directory, { recursive: true });
  if (quality) { check(originalRoot, 'Suite capture requires frozen original source'); await mkdir(originalDirectory, { recursive: true }); }
  const copyEntry = async (root, destination, path) => { const target = join(destination, path); await mkdir(dirname(target), { recursive: true }); await cp(join(root, path), target); };
  // V2 submits the complete retained suite. Absence is an explicit deletion, including unchanged suites with zero new tests.
  for (const path of quality ? paths.filter(path => inScope(path) && after.get(path)?.type === 'file') : accepted) {
    if (after.get(path)?.type === 'file') await copyEntry(row.workspace, directory, path);
  }
  if (quality) for (const path of paths.filter(path => inScope(path) && before.get(path)?.type === 'file')) await copyEntry(originalRoot, originalDirectory, path);
  let addedLines = 0, deletedLines = 0, addedBytes = 0, deletedBytes = 0;
  const patches = [];
  for (const path of accepted) {
    const old = before.get(path), entry = after.get(path);
    if (old?.type === 'file') deletedBytes += old.bytes;
    if (entry?.type === 'file') addedBytes += entry.bytes;
    const diff = await capture('/usr/bin/diff', ['-u', '--label', old ? `a/${path}` : '/dev/null', '--label', entry ? `b/${path}` : '/dev/null',
      old ? join(originalRoot, path) : '/dev/null', entry ? join(directory, path) : '/dev/null'], { timeoutMs: 10000 });
    check(diff.exitCode === 0 || diff.exitCode === 1, `Unable to capture diff for ${path}: ${diff.stderr}`);
    const lines = diff.stdout.split('\n').slice(2);
    addedLines += lines.filter(line => line.startsWith('+')).length;
    deletedLines += lines.filter(line => line.startsWith('-')).length;
    patches.push(diff.stdout);
  }
  // Preserve forbidden regular-file writes privately for audit without admitting them to replay.
  for (const path of forbiddenChanges) if (after.get(path)?.type === 'file') await copyEntry(row.workspace, join(row.history, 'forbidden-changes'), path);
  const files = await tree(directory), patchPath = join(row.history, 'candidate.patch');
  await writeFile(patchPath, patches.join('\n'), { mode: 0o600 });
  const result = { directory, files, changedFiles: changed, forbiddenChanges, addedLines, deletedLines, addedBytes, deletedBytes };
  if (quality) Object.assign(result, { mode: 'suite-quality', originalDirectory, originalFiles: await tree(originalDirectory), patchPath, patchSha256: sha256(await readFile(patchPath)),
    addedFiles: accepted.filter(path => !before.has(path)), modifiedFiles: accepted.filter(path => before.has(path) && after.has(path)), deletedFiles: accepted.filter(path => !after.has(path)),
    retainedFiles: files.filter(entry => before.has(entry.path)).map(entry => entry.path), executableSpecs: files.filter(entry => entry.path.endsWith('.spec.js')).map(entry => entry.path),
    netLines: addedLines - deletedLines, netBytes: addedBytes - deletedBytes,
    byteMetric: 'full changed-file bytes; netBytes is exact final-minus-original delta' });
  return result;
}

// Packet-only judge calls share generation's exact native selection, isolation and bounded capture.
export async function executeNativeSession({ configurationId, prompt, systemInstructions = '', outputSchema = null, outputDir, timeoutMs = POLICY.wallTimeLimitMs, claudeAccount = null }) {
  check(process.platform === 'darwin', 'Native isolation requires macOS sandbox-exec');
  check(POLICY.configurations.includes(configurationId), 'Unregistered native configuration; no substitution permitted');
  check(outputSchema === null || (typeof outputSchema === 'object' && !Array.isArray(outputSchema)), 'Native judge schema must be an object');
  outputDir = resolve(outputDir);
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  check(!await exists(join(outputDir, 'started.json')), 'Native session already started; no automatic retries');
  const root = await realpath(await mkdtemp('/private/tmp/backend-testing-judge-'));
  const row = { configuration: resolveBenchmarkConfiguration(configurationId), root, home: join(root, 'home'), workspace: join(root, 'workspace'), history: outputDir };
  if (claudeAccount) {
    check(row.configuration.provider === 'claude', 'Claude account selection cannot be applied to another provider');
    check(isAbsolute(claudeAccount.configDir) && typeof claudeAccount.email === 'string' && claudeAccount.email.length > 0, 'Invalid selected Claude account context');
    row.claudeAccount = {configDir:await realpath(claudeAccount.configDir),email:claudeAccount.email};
  }
  for (const dir of [row.workspace, join(root, 'tmp'), join(row.home, '.codex'), join(row.home, '.claude')]) await mkdir(dir, { recursive: true, mode: 0o700 });
  await checkAncestors(row.workspace);
  row.command = await realpath(executable(row.configuration.provider));
  await writeJson(join(root, 'claude-settings.json'), { permissions: { defaultMode: 'bypassPermissions' }, disableAllHooks: true, enabledPlugins: {}, autoMemoryEnabled: false });
  await writeJson(join(root, 'mcp.json'), { mcpServers: {} });
  row.sandboxPath = join(root, 'isolation.sb');
  await writeFile(row.sandboxPath, sandbox(row, [resolve(dirname(process.execPath), '..'), dirname(row.command)]));
  row.arguments = row.configuration.provider === 'codex' ? codexArgs(row) : claudeArgs(row);
  if (row.configuration.provider === 'codex') row.arguments.splice(row.arguments.indexOf('exec'), 0, '--disable', 'shell_tool', '--disable', 'apply_patch_freeform', '--config', `developer_instructions=${JSON.stringify(systemInstructions)}`);
  else { row.arguments[row.arguments.indexOf('--tools') + 1] = ''; row.arguments.push('--system-prompt', systemInstructions); }
  if (outputSchema) {
    const schemaPath = join(root, 'output.schema.json'); await writeJson(schemaPath, outputSchema); await writeJson(join(outputDir, 'output.schema.json'), outputSchema);
    if (row.configuration.provider === 'codex') row.arguments.splice(row.arguments.length - 1, 0, '--output-schema', schemaPath);
    else row.arguments.push('--json-schema', JSON.stringify(outputSchema));
  }
  const preflight = await nativePreflight([row], outputDir, [configurationId]);
  await writeFile(join(outputDir, 'prompt.txt'), prompt, { mode: 0o600 });
  await writeJson(join(outputDir, 'launch.json'), { ...row, promptSha256: sha256(prompt), systemInstructionsSha256: sha256(systemInstructions), outputSchemaSha256: outputSchema ? sha256(json(outputSchema)) : null, toolsAllowed: false, preflight });
  await writeJson(join(outputDir, 'started.json'), { startedAt: new Date().toISOString() });
  let result;
  try {
    await authentication(row, true);
    result = await capture('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...row.arguments], { cwd: row.workspace, env: environment(row), input: prompt, timeoutMs,
      stdoutPath: join(outputDir, 'stdout.jsonl'), stderrPath: join(outputDir, 'stderr.log') });
  } finally { await authentication(row, false); }
  const parsed = parseResult(row, result, outputSchema), toolUse = parsed.toolUse;
  const record = { ...result, ...parsed, configuration: row.configuration, preflight, ...(row.accountAssertion?{accountAssertion:row.accountAssertion}:{}), toolsAllowed: false, toolUse,
    status: toolUse ? 'invalid-tool-use' : parsed.complete && parsed.structuredOutputDeliveryValid === false ? 'invalid-structured-output' : result.spawnError ? 'infrastructure-failure' : result.timedOut ? 'timeout' : result.exitCode === 0 && parsed.complete ? 'complete' : 'failed' };
  delete record.stdout; delete record.stderr;
  await writeFile(join(outputDir, 'final.txt'), parsed.finalText, { mode: 0o600 });
  await writeJson(join(outputDir, 'result.json'), record);
  return record;
}

async function run(planPath, selectedRows = []) {
  const plan = await readJson(resolve(planPath)), quality = plan.schemaVersion === 2;
  const policy = quality ? QUALITY_POLICY : POLICY;
  check(plan.runnerSha256 === sha256(await readFile(SELF)), 'Runner changed after preparation'); check(JSON.stringify(plan.policy) === JSON.stringify(policy), 'Generation policy changed');
  const cases = quality ? plan.cases : [{ id: 'pilot', fixturePath: plan.fixturePath, calibrationPath: join(plan.history, 'calibration-approved.json'), source: plan.source, basis: plan.basis }];
  const inputs = new Map();
  for (const item of cases) {
    check((await receipt(item.source.directory)).sha256 === item.source.sha256, 'Frozen source changed');
    const fixture = await readJson(item.fixturePath);
    check((await approvedCalibration(fixture, item.calibrationPath)).sha256 === item.basis.calibrationSha256, 'Approved calibration changed');
    const infrastructureModule = fixture.infrastructureModule ?? join(dirname(SELF), 'fixture.mjs');
    check(sha256(await readFile(infrastructureModule)) === item.basis.infrastructureModuleSha256, 'Infrastructure module changed after preparation');
    check(sha256(await readFile(fixture.privateConfigPath)) === item.basis.runtimeConfigSha256, 'Runtime or private fault basis changed after preparation');
    const infra = await import(pathToFileURL(infrastructureModule)); check(typeof infra.startServices === 'function', 'Missing startServices export');
    inputs.set(item.id, { fixture, infra, source: item.source });
  }
  if (quality) {
    check(sha256(await readFile(plan.rubricPath)) === plan.basis.rubricSha256, 'Frozen rubric changed');
    check(sha256(await readFile(join(dirname(SELF), 'verify.mjs'))) === plan.basis.verifierSha256, 'Frozen verifier changed');
    const freeze = await approvedRubricFreeze(plan.rubricFreezePath, plan.rubricPath, [...inputs.entries()].map(([id, item]) => ({ id, fixture: item.fixture })), plan.preparedAt);
    check(freeze.sha256 === plan.basis.rubricFreezeSha256, 'Rubric freeze receipt changed');
  }
  const rows = selectedRows.length ? plan.rows.filter(r => selectedRows.includes(r.rowId)) : plan.rows;
  check(rows.length && (!selectedRows.length || rows.length === selectedRows.length), 'Unknown row selection');
  for (const row of rows) check(!await exists(join(row.history, 'started.json')), `Row already started; no automatic retries: ${row.rowId}`);
  let index = 0;
  const worker = async () => { while (index < rows.length) {
    const row = rows[index++], { fixture, infra, source } = inputs.get(row.caseId ?? 'pilot'); await checkAncestors(row.workspace); check((await receipt(row.workspace)).sha256 === row.workspaceBefore.sha256, 'Workspace changed before generation');
    const prompt = await readFile(join(row.history, 'prompt.txt'), 'utf8'); check(sha256(prompt) === row.promptSha256, 'Frozen prompt changed');
    await writeJson(join(row.history, 'started.json'), { rowId: row.rowId, startedAt: new Date().toISOString() }); process.stdout.write(`${JSON.stringify({ event: 'started', rowId: row.rowId, configuration: row.configuration.id, condition: row.condition, trial: row.trial })}\n`);
    let infrastructure, result, cleanupError;
    try {
      infrastructure = await infra.startServices({ fixture, outputDir: join(row.root, 'infrastructure') }); await authentication(row, true);
      await writeJson(join(row.history, 'runtime-environment.json'), infrastructure.env);
      result = await capture('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...row.arguments], { cwd: row.workspace, env: environment(row, infrastructure.env), input: prompt, timeoutMs: policy.wallTimeLimitMs, stdoutPath: join(row.history, 'stdout.jsonl'), stderrPath: join(row.history, 'stderr.log') });
    } catch (error) { result = { exitCode: null, signal: null, spawnError: error.message, timedOut: false, outputLimitExceeded: false, elapsedMs: 0, stdout: '', stderr: error.stack }; }
    finally {
      await authentication(row, false);
      try { await infrastructure?.close?.(); }
      catch (error) {
        if (!quality) throw error;
        // Cleanup cannot erase the captured session or the complete retained suite.
        cleanupError = error.stack || error.message;
      }
    }
    await writeFile(join(row.history, 'stdout.jsonl'), result.stdout, { mode: 0o600 }); await writeFile(join(row.history, 'stderr.log'), result.stderr, { mode: 0o600 });
    const parsed = parseResult(row, result), submission = await collectSubmission(row, workspaceEntries(source.entries, await realpath(fixture.dependencyDir)), source.directory);
    const record = { schemaVersion: plan.schemaVersion, ...(quality ? { caseId: row.caseId, qualityEligibility: qualityEligibility(result, parsed, submission), cleanupStatus: cleanupError ? 'failed' : infrastructure ? 'pass' : 'not-run', cleanupError } : {}), rowId: row.rowId, pairId: row.pairId, trial: row.trial, configuration: row.configuration, condition: row.condition,
      status: submission.forbiddenChanges.length ? 'invalid-submission' : result.spawnError ? 'infrastructure-failure' : result.timedOut ? 'timeout' : result.exitCode === 0 && parsed.complete ? 'complete' : 'failed',
      startedAt: result.startedAt, endedAt: result.endedAt, elapsedMs: result.elapsedMs, exitCode: result.exitCode, signal: result.signal, timedOut: result.timedOut, outputLimitExceeded: result.outputLimitExceeded, spawnError: result.spawnError,
      usage: parsed.usage, costUsd: parsed.costUsd, runtime: parsed.runtime, submission, promptSha256: row.promptSha256, treatmentSha256: row.treatmentSha256, history: row.history };
    await writeFile(join(row.history, 'final.txt'), parsed.finalText, { mode: 0o600 }); await writeJson(join(row.history, 'result.json'), record);
    process.stdout.write(`${JSON.stringify({ event: 'finished', rowId: row.rowId, status: record.status, elapsedMs: record.elapsedMs, candidateFiles: submission.files.length })}\n`);
  } };
  await Promise.all(Array.from({ length: Math.min(policy.concurrency, rows.length) }, worker));
  const records = []; for (const row of plan.rows) if (await exists(join(row.history, 'result.json'))) records.push(await readJson(join(row.history, 'result.json')));
  const result = { schemaVersion: plan.schemaVersion, benchmark: plan.benchmark, runId: plan.runId, planPath: resolve(planPath), basis: plan.basis, configurations: policy.configurations, conditions: policy.conditions, trials: policy.trials, policy: plan.policy, rows: records }; await writeJson(join(plan.history, 'run.json'), result); process.stdout.write(json({ runPath: join(plan.history, 'run.json'), recordedRows: records.length }));
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  const args = process.argv.slice(2);
  if (args[0] === '--prepare' && args.length === 6 && args[2] === '--previous-skill' && args[4] === '--calibration') await prepare(args[1], args[3], args[5]);
  else if (['--prepare-quality', 'prepare-quality'].includes(args[0]) && args.length === 2) await prepareQuality(args[1]);
  else if (args[0] === '--run' && args[1]) await run(args[1], args[2] === '--rows' ? args[3].split(',') : []);
  else { process.stderr.write('Usage: node benchmarks/backend-testing/run.mjs --prepare <private-fixture.json> --previous-skill <old-SKILL.md> --calibration <approved-calibration.json>\n       node benchmarks/backend-testing/run.mjs --prepare-quality <suite-quality-manifest.json>\n       node benchmarks/backend-testing/run.mjs --run <plan.json> [--rows <id,...>]\n'); process.exitCode = 1; }
}
export { POLICY, QUALITY_POLICY, prepare, prepareQuality, run, collectSubmission, nativePreflight, promptPreflight, sandbox, environment, codexArgs, claudeArgs };
