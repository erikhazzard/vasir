#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBenchmarkConfiguration } from '../../cli/eval/benchmark-models.js';

const DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = resolve(DIRECTORY, '../..');
const HISTORY = join(REPOSITORY, '.agents/vasir-evals/2d-jumping-demo');
const TOOLKIT = '/private/tmp/vasir-jump-toolkit';
const POLICY = JSON.parse(await readFile(join(DIRECTORY, 'generation-policy.json'), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const BASE_POLICY_SHA256 = sha256(JSON.stringify(POLICY));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const check = (condition, message) => { if (!condition) throw new Error(message); };

async function exists(path) { try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
async function writeJson(path, value) { const temporaryPath = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`; await mkdir(dirname(path), { recursive: true }); await writeFile(temporaryPath, json(value), { mode: 0o600 }); await rename(temporaryPath, path); }
async function tree(root, current = root) {
  const entries = [];
  for (const name of (await readdir(current)).sort()) {
    const path = join(current, name);
    const stat = await lstat(path);
    const relativePath = relative(root, path).split(sep).join('/');
    if (stat.isDirectory()) entries.push(...await tree(root, path));
    else if (stat.isFile()) entries.push({ path: relativePath, type: 'file', bytes: stat.size, sha256: sha256(await readFile(path)) });
    else if (stat.isSymbolicLink()) entries.push({ path: relativePath, type: 'symlink', target: await readlink(path) });
    else throw new Error(`Unsupported source file: ${relativePath}`);
  }
  return entries;
}
async function treeReceipt(root) { const entries = await tree(root); return { directory: root, sha256: sha256(JSON.stringify(entries)), entries }; }
function executable(name) { const result = spawnSync('/bin/zsh', ['-f', '-c', `command -v ${name}`], { encoding: 'utf8' }); check(result.status === 0, `${name} CLI is missing`); return result.stdout.trim(); }

function sandboxProfile({ batchRoot, rowRoot, binaryRoots }) {
  return `(version 1)\n(allow default)\n(deny file-read* file-write*\n  (subpath ${JSON.stringify(homedir())})\n  (subpath "/private/tmp")\n  (subpath "/private/var/folders")\n  (subpath "/etc/codex")\n  (subpath "/etc/claude-code")\n)\n(allow file-read-metadata (subpath "/"))\n(allow file-read* file-write* (subpath ${JSON.stringify(rowRoot)}))\n(allow file-read*\n  (subpath ${JSON.stringify(TOOLKIT)})\n${binaryRoots.map((path) => `  (subpath ${JSON.stringify(path)})`).join('\n')}\n)\n`;
}

function launchEnvironment(row) {
  const environment = {};
  for (const key of ['LANG', 'LC_ALL', 'LC_CTYPE', 'SSL_CERT_FILE', 'SSL_CERT_DIR', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY']) {
    if (process.env[key]) environment[key] = process.env[key];
  }
  Object.assign(environment, {
    PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: row.home,
    CODEX_HOME: join(row.home, '.codex'),
    CLAUDE_CONFIG_DIR: join(row.home, '.claude'),
    XDG_CONFIG_HOME: join(row.home, '.config'),
    XDG_CACHE_HOME: join(row.home, '.cache'),
    TMPDIR: `${join(row.root, 'tmp')}/`,
    // zsh heredocs use TMPPREFIX independently of TMPDIR.
    TMPPREFIX: join(row.root, 'tmp/zsh'),
    CLAUDE_CODE_TMPDIR: join(row.root, 'tmp/claude'),
    npm_config_cache: join(row.home, '.npm'),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    ZDOTDIR: row.home,
    CI: '1', CODEX_CI: '1', NO_COLOR: '1', TERM: 'dumb', TZ: 'UTC',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1',
    DISABLE_AUTOUPDATER: '1'
  });
  return environment;
}

function browserArgs(row) {
  return [join(TOOLKIT, 'node_modules/@playwright/mcp/cli.js'), '--headless', '--executable-path', join(TOOLKIT, 'browsers/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'), '--isolated', '--no-sandbox', '--caps', 'vision', '--viewport-size', POLICY.browser.viewport, '--output-dir', join(row.root, 'browser-output')];
}

function codexArgs(row) {
  const disabled = ['multi_agent', 'multi_agent_v2', 'plugins', 'apps', 'hooks', 'memories', 'image_generation', 'browser_use', 'browser_use_external', 'in_app_browser', 'computer_use'];
  return ['--ask-for-approval', 'never', ...disabled.flatMap((name) => ['--disable', name]), 'exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'danger-full-access', '--model', row.configuration.model,
    '--config', `model_reasoning_effort=${JSON.stringify(row.configuration.reasoning)}`,
    '--config', 'project_doc_max_bytes=0',
    '--config', 'agents.max_threads=1',
    '--config', 'features.multi_agent_v2={max_concurrent_threads_per_session=1}',
    '--config', 'web_search="live"',
    '--config', 'skills.max_context_tokens=10000',
    '--config', 'shell_environment_policy.inherit="all"',
    '--config', `mcp_servers.browser.command=${JSON.stringify(process.execPath)}`,
    '--config', `mcp_servers.browser.args=${JSON.stringify(browserArgs(row))}`,
    '--config', 'mcp_servers.browser.startup_timeout_sec=60',
    '--config', `mcp_servers.images.command=${JSON.stringify(process.execPath)}`,
    '--config', `mcp_servers.images.args=${JSON.stringify([join(row.root, 'tools/image-bridge.mjs'), row.workspace, row.imageQueue])}`,
    '--config', 'mcp_servers.images.tool_timeout_sec=1200',
    '--config', `skills.config=[${['imagegen', 'openai-docs', 'plugin-creator', 'skill-creator', 'skill-installer'].map((name) => `{path=${JSON.stringify(join(row.home, '.codex/skills/.system', name, 'SKILL.md'))},enabled=false}`).join(',')}]`,
    '--color', 'never', '--json', '--cd', row.workspace, '-'];
}

function claudeArgs(row) {
  return ['--print', '--model', row.configuration.model, '--effort', row.configuration.reasoning, '--no-session-persistence', '--no-chrome', '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'user', '--settings', join(row.root, 'claude-settings.json'), '--strict-mcp-config', '--mcp-config', join(row.root, 'mcp.json'),
    '--dangerously-skip-permissions', '--disallowedTools', 'Agent,Task,Workflow,TeamCreate,TeamDelete,SendMessage', '--tools', 'Bash,Read,Edit,Write,Glob,Grep,WebFetch,WebSearch,NotebookEdit,Skill,TodoWrite'];
}

async function assertNoAmbientInstructions(workspace) {
  let path = workspace;
  while (true) {
    for (const name of ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md', '.claude/CLAUDE.md']) check(!await exists(join(path, name)), `Ambient instruction above workspace: ${join(path, name)}`);
    const parent = dirname(path); if (path === parent) break; path = parent;
  }
}

async function capture(command, args, { cwd, environment, input, timeoutMs = 30000, stdoutPath, stderrPath } = {}) {
  return new Promise((done) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { cwd, env: environment, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = { stdout: [], stderr: [] }; const bytes = { stdout: 0, stderr: 0 };
    const files = { stdout: stdoutPath ? createWriteStream(stdoutPath, { mode: 0o600 }) : null, stderr: stderrPath ? createWriteStream(stderrPath, { mode: 0o600 }) : null };
    let timedOut = false; let outputLimitExceeded = false; let forceTimer;
    const killGroup = (signal) => { try { process.kill(-child.pid, signal); } catch {} };
    const stop = () => { killGroup('SIGTERM'); forceTimer ??= setTimeout(() => killGroup('SIGKILL'), 5000); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', (value) => {
      const remaining = POLICY.maxStreamBytes - bytes[stream];
      const kept = value.subarray(0, Math.max(0, remaining));
      chunks[stream].push(kept); files[stream]?.write(kept); bytes[stream] += value.length;
      if (bytes[stream] > POLICY.maxStreamBytes) { outputLimitExceeded = true; stop(); }
    });
    let settled = false;
    const finish = async (exitCode, signal, spawnError = null) => {
      if (settled) return; settled = true; clearTimeout(timer); clearTimeout(forceTimer); killGroup('SIGTERM');
      const stdout = Buffer.concat(chunks.stdout); const stderr = Buffer.concat(chunks.stderr);
      await Promise.all(Object.values(files).filter(Boolean).map((file) => new Promise((resolveStream) => file.end(resolveStream))));
      done({ exitCode, signal, spawnError, startedAt: new Date(startedAt).toISOString(), endedAt: new Date().toISOString(), elapsedMs: Date.now() - startedAt, timedOut, outputLimitExceeded, stdout: stdout.toString(), stderr: stderr.toString() });
    };
    child.on('error', (error) => void finish(null, null, error.message));
    child.on('close', (code, signal) => void finish(code, signal));
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}

async function probeMcp(command, args, options, browser = false) {
  const child = spawn(command, args, { cwd: options.cwd, env: options.environment, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = ''; let stderr = ''; let nextId = 0; const pending = new Map();
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      try { const value = JSON.parse(line); const item = pending.get(value.id); if (item) { pending.delete(value.id); clearTimeout(item.timer); item.done(value); } } catch {}
    }
  });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.on('error', () => {});
  const request = (method, params) => new Promise((done, reject) => {
    const id = ++nextId; const timer = setTimeout(() => reject(new Error(`MCP ${method} timed out: ${stderr.slice(-800)}`)), 60000);
    pending.set(id, { done, timer }); child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  try {
    const initialized = await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'tool-preflight', version: '1.0' } });
    check(!initialized.error, 'MCP initialization failed');
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    const listed = await request('tools/list', {}); check(Array.isArray(listed.result?.tools), 'MCP tools/list failed');
    let browserProbe = null;
    if (browser) {
      const navigation = await request('tools/call', { name: 'browser_navigate', arguments: { url: 'about:blank' } });
      check(!navigation.result?.isError && !navigation.error, `Browser launch failed: ${JSON.stringify(navigation).slice(-2500)}`);
      const evaluated = await request('tools/call', { name: 'browser_evaluate', arguments: { function: '() => ({width: innerWidth, height: innerHeight, url: location.href})' } });
      check(!evaluated.result?.isError, 'Browser evaluation failed');
      browserProbe = evaluated.result;
      await request('tools/call', { name: 'browser_close', arguments: {} });
    }
    return { server: initialized.result.serverInfo, tools: listed.result.tools, toolsSha256: sha256(JSON.stringify(listed.result.tools)), browserProbe };
  } finally { child.kill('SIGTERM'); for (const item of pending.values()) clearTimeout(item.timer); }
}

async function probeClaudeInitialization(row) {
  const child = spawn('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...row.arguments, '--input-format', 'stream-json'], { cwd: row.workspace, env: launchEnvironment(row), stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = ''; let stderr = '';
  try {
    return await new Promise((done, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Claude initialization timed out: ${stderr.slice(-800)}`)), 60000);
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('exit', (code) => { clearTimeout(timeout); reject(new Error(`Claude initialization exited ${code}: ${stderr.slice(-1200)}`)); });
      child.stdout.on('data', (chunk) => {
        buffer += chunk;
        while (buffer.includes('\n')) {
          const index = buffer.indexOf('\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
          let value; try { value = JSON.parse(line); } catch { continue; }
          if (value.type === 'control_response' && value.response?.request_id === 'preflight-initialize') {
            clearTimeout(timeout);
            if (value.response.subtype !== 'success') reject(new Error(`Claude initialization error: ${JSON.stringify(value.response)}`));
            else done(value.response.response);
          }
        }
      });
      child.stdin.on('error', () => {});
      child.stdin.write(`${JSON.stringify({ type: 'control_request', request_id: 'preflight-initialize', request: { subtype: 'initialize', hooks: {}, sdkMcpServers: [] } })}\n`);
    });
  } finally { child.kill('SIGTERM'); }
}

async function prepare(extension = null) {
  check(process.platform === 'darwin', 'This isolation policy requires macOS sandbox-exec.');
  let originalPlan = null;
  let extensionOf = null;
  if (extension) {
    const sourcePath = resolve(extension.planPath);
    const sourceBytes = await readFile(sourcePath);
    originalPlan = JSON.parse(sourceBytes);
    check(originalPlan.policySha256 === BASE_POLICY_SHA256, 'Extension must retain the original generation resource policy.');
    check(POLICY.conditions.includes(extension.condition), 'Unknown generation condition.');
    POLICY.configurations = [resolveBenchmarkConfiguration(extension.configuration).id];
    POLICY.conditions = [extension.condition];
    extensionOf = { path: sourcePath, sha256: sha256(sourceBytes), batchId: originalPlan.batchId };
  }
  const batchId = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}`;
  const history = join(HISTORY, batchId); await mkdir(history, { recursive: true, mode: 0o700 });
  const batchRoot = await realpath(await mkdtemp('/private/tmp/jump-'));
  const binaries = { codex: await realpath(executable('codex')), claude: await realpath(executable('claude')) };
  const binaryRoots = [resolve(dirname(process.execPath), '..'), dirname(await realpath(binaries.claude))];
  const catalog = join(history, 'frozen-catalog'); await cp(originalPlan?.catalog.directory ?? join(REPOSITORY, POLICY.catalog), catalog, { recursive: true, dereference: true });
  const catalogReceipt = await treeReceipt(catalog);
  if (originalPlan) check(catalogReceipt.sha256 === originalPlan.catalog.sha256, 'Frozen extension catalog differs from the original cohort.');
  const rows = [];
  for (const selector of POLICY.configurations) for (const condition of POLICY.conditions) {
    const rowId = `row-${randomBytes(6).toString('hex')}`; const root = join(batchRoot, rowId); const home = join(root, 'home'); const workspace = join(root, 'workspace');
    const row = { rowId, configuration: resolveBenchmarkConfiguration(selector), condition, root, home, workspace, imageQueue: join(root, 'image-queue'), history: join(history, 'rows', rowId), promptSha256: sha256(POLICY.prompt) };
    for (const directory of [home, workspace, join(root, 'tmp'), join(root, 'tools'), row.imageQueue, row.history, join(home, '.codex/skills'), join(home, '.claude/skills'), join(home, '.agents/skills')]) await mkdir(directory, { recursive: true, mode: 0o700 });
    await assertNoAmbientInstructions(workspace);
    if (condition === 'vasir') await cp(catalog, join(home, row.configuration.provider === 'codex' ? '.agents/skills' : '.claude/skills'), { recursive: true });
    await cp(join(DIRECTORY, 'image-bridge.mjs'), join(root, 'tools/image-bridge.mjs'));
    await writeJson(join(root, 'claude-settings.json'), { permissions: { defaultMode: 'bypassPermissions' }, disableAllHooks: true, enabledPlugins: {}, autoMemoryEnabled: false });
    await writeJson(join(root, 'mcp.json'), { mcpServers: { browser: { command: process.execPath, args: browserArgs(row) }, images: { command: process.execPath, args: [join(root, 'tools/image-bridge.mjs'), workspace, row.imageQueue] } } });
    row.sandboxPath = join(root, 'isolation.sb'); await writeFile(row.sandboxPath, sandboxProfile({ batchRoot, rowRoot: root, binaryRoots }));
    row.command = binaries[row.configuration.provider]; row.arguments = row.configuration.provider === 'codex' ? codexArgs(row) : claudeArgs(row);
    row.environmentKeys = Object.keys(launchEnvironment(row)).sort();
    row.workspaceBefore = await treeReceipt(workspace); check(row.workspaceBefore.entries.length === 0, 'Starting workspace must be empty.');
    row.catalog = condition === 'vasir' ? { sha256: catalogReceipt.sha256, fileCount: catalogReceipt.entries.length, installedPath: join(home, row.configuration.provider === 'codex' ? '.agents/skills' : '.claude/skills') } : null;
    await writeFile(join(row.history, 'prompt.txt'), POLICY.prompt); await writeJson(join(row.history, 'launch.json'), row);
    rows.push(row);
  }
  const sample = rows[0]; const environment = launchEnvironment(sample);
  const siblingProbe = rows[1] ? join(rows[1].root, 'isolation.sb') : join(batchRoot, 'sibling-isolation-probe.txt');
  if (!rows[1]) await writeFile(siblingProbe, 'Sibling isolation probe; no contestant input.');
  const isolationScript = `const fs=require('fs');const denied=${JSON.stringify([join(REPOSITORY, 'package.json'), join(homedir(), '.codex/auth.json'), siblingProbe])};for(const p of denied){try{fs.readFileSync(p);throw Error('read unexpectedly allowed: '+p)}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e}}fs.writeFileSync('isolation-probe.tmp','ok');fs.unlinkSync('isolation-probe.tmp');console.log(JSON.stringify({deniedReadCount:denied.length,workspaceWrite:true}))`;
  const isolation = await capture('/usr/bin/sandbox-exec', ['-f', sample.sandboxPath, process.execPath, '-e', isolationScript], { cwd: sample.workspace, environment });
  check(isolation.exitCode === 0, `Isolation probe failed: ${isolation.stderr}`);
  const browser = await probeMcp('/usr/bin/sandbox-exec', ['-f', sample.sandboxPath, process.execPath, ...browserArgs(sample)], { cwd: sample.workspace, environment }, true);
  const images = await probeMcp('/usr/bin/sandbox-exec', ['-f', sample.sandboxPath, process.execPath, join(sample.root, 'tools/image-bridge.mjs'), sample.workspace, sample.imageQueue], { cwd: sample.workspace, environment });
  const providerPreflight = [];
  const preflightRows = rows.filter((row, index) => rows.findIndex(candidate => candidate.configuration.provider === row.configuration.provider && candidate.condition === row.condition) === index);
  for (const row of preflightRows) {
    await installAuthentication(row);
    try {
      let args;
      if (row.configuration.provider === 'claude') args = ['--setting-sources', '', 'auth', 'status', '--json'];
      else {
        args = [];
        for (let index = 0; index < row.arguments.length; index += 1) if (['--config', '--disable'].includes(row.arguments[index])) args.push(row.arguments[index], row.arguments[++index]);
        args.push('--config', 'sandbox_mode="danger-full-access"', '--config', 'approval_policy="never"', '--config', `model=${JSON.stringify(row.configuration.model)}`, '--cd', row.workspace, 'debug', 'prompt-input', POLICY.prompt);
      }
      const output = await capture('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...args], { cwd: row.workspace, environment: launchEnvironment(row), timeoutMs: 60000 });
      await writeFile(join(row.history, 'provider-preflight.stderr.log'), output.stderr);
      check(output.exitCode === 0, `${row.configuration.provider} preflight failed: ${output.stderr.slice(-1500)}`);
      const payload = JSON.parse(output.stdout);
      if (row.configuration.provider === 'claude') {
        check(payload.loggedIn === true, 'Claude auth status does not report loggedIn.');
        const initialized = await probeClaudeInitialization(row);
        await writeJson(join(row.history, 'native-initialize.json'), initialized);
        const hasVasirCatalog = JSON.stringify(initialized).includes('game__orchestrating-playable-build');
        check(hasVasirCatalog === (row.condition === 'vasir'), `${row.condition}: native Claude Vasir catalog discovery mismatch.`);
        providerPreflight.push({ provider: 'claude', condition: row.condition, authentication: 'logged-in', authMethod: payload.authMethod ?? null, initializedWithoutUserMessage: true, hasVasirCatalog, initializationPath: join(row.history, 'native-initialize.json') });
      } else {
        await writeFile(join(row.history, 'rendered-input.json'), json(payload));
        const serialized = JSON.stringify(payload);
        const hasVasirCatalog = serialized.includes('game__orchestrating-playable-build');
        check(hasVasirCatalog === (row.condition === 'vasir'), `${row.condition}: native Codex Vasir catalog discovery mismatch.`);
        check(!serialized.includes(REPOSITORY), 'Original repository path contaminated initial input.');
        check(payload.at(-1)?.role === 'user' && payload.at(-1)?.content?.[0]?.text === POLICY.prompt, 'Native Codex user prompt differs from exact task.');
        check(payload.filter((item) => item.role === 'user').every((item) => item.content?.[0]?.text === POLICY.prompt || item.content?.[0]?.text?.startsWith('<environment_context>')), 'Unexpected user message in native Codex input.');
        providerPreflight.push({ provider: 'codex', condition: row.condition, renderedInputSha256: sha256(output.stdout), hasVasirCatalog, renderedInputPath: join(row.history, 'rendered-input.json') });
      }
    } finally { await rm(join(row.home, '.codex/auth.json'), { force: true }); await rm(join(row.home, '.claude/.credentials.json'), { force: true }); }
  }
  const versions = Object.fromEntries(Object.entries(binaries).map(([name, binary]) => [name, spawnSync(binary, ['--version'], { encoding: 'utf8' }).stdout.trim()]));
  if (originalPlan) check(JSON.stringify(versions) === JSON.stringify(originalPlan.versions), 'Native CLI versions changed from the original cohort.');
  const plan = { schemaVersion: 1, benchmark: POLICY.benchmark, batchId, history, batchRoot, preparedAt: new Date().toISOString(), status: 'prepared-no-model-calls', policy: POLICY, prompt: POLICY.prompt, promptSha256: sha256(POLICY.prompt), policySha256: sha256(JSON.stringify(POLICY)), runnerSha256: sha256(await readFile(fileURLToPath(import.meta.url))), bridgeSha256: sha256(await readFile(join(DIRECTORY, 'image-bridge.mjs'))), catalog: catalogReceipt, versions, preflight: { isolation: JSON.parse(isolation.stdout), browser, images, providers: providerPreflight }, rows };
  if (extensionOf) Object.assign(plan, { extensionOf, basePolicySha256: BASE_POLICY_SHA256 });
  await writeJson(join(history, 'plan.json'), plan); await writeJson(extensionOf ? join(history, 'generation-dry-run.json') : join(DIRECTORY, 'generation-dry-run.json'), { planPath: join(history, 'plan.json'), batchId, prompt: plan.prompt, promptSha256: plan.promptSha256, policy: POLICY, versions, catalog: { sha256: catalogReceipt.sha256, fileCount: catalogReceipt.entries.length }, isolation: plan.preflight.isolation, browserTools: browser.tools.map((tool) => tool.name), imageTools: images.tools, rows: rows.map(({ rowId, configuration, condition, arguments: args, environmentKeys, catalog: installed }) => ({ rowId, configuration, condition, arguments: args, environmentKeys, catalog: installed })) });
  process.stdout.write(json({ status: plan.status, planPath: join(history, 'plan.json'), batchId, rows: rows.length, promptSha256: plan.promptSha256, catalogSha256: catalogReceipt.sha256, browserTools: browser.tools.length }));
}

async function installAuthentication(row) {
  if (row.configuration.provider === 'codex') {
    await cp(join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'auth.json'), join(row.home, '.codex/auth.json'));
    await chmod(join(row.home, '.codex/auth.json'), 0o600);
  } else {
    const result = spawnSync('/usr/bin/security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf8' });
    check(result.status === 0, 'Claude keychain authentication unavailable.');
    const payload = JSON.parse(result.stdout); check(payload.claudeAiOauth?.accessToken, 'Claude OAuth token missing.');
    await writeJson(join(row.home, '.claude/.credentials.json'), { claudeAiOauth: payload.claudeAiOauth });
    await writeJson(join(row.home, '.claude.json'), { hasCompletedOnboarding: true, autoUpdates: false });
  }
}

function parseResult(row, processResult) {
  const events = processResult.stdout.split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
  if (row.configuration.provider === 'codex') {
    const completed = events.findLast((event) => event.type === 'turn.completed');
    const items = events.filter((event) => event.type === 'item.completed').map((event) => event.item);
    const finalText = items.filter((item) => item.type === 'agent_message').at(-1)?.text ?? '';
    return { complete: Boolean(completed && finalText), finalText, usage: completed?.usage ?? null, costUsd: null, runtime: { threadId: events.find((event) => event.type === 'thread.started')?.thread_id, requestedModel: row.configuration.model, requestedReasoning: row.configuration.reasoning, itemTypeCounts: items.reduce((counts, item) => ({ ...counts, [item.type]: (counts[item.type] ?? 0) + 1 }), {}), eventCount: events.length } };
  }
  const result = events.findLast((event) => event.type === 'result'); const initialized = events.find((event) => event.type === 'system' && event.subtype === 'init');
  return { complete: Boolean(result && !result.is_error && result.result), finalText: result?.result ?? '', usage: result?.usage ?? null, costUsd: result?.total_cost_usd ?? null, runtime: { sessionId: result?.session_id, model: initialized?.model, requestedReasoning: row.configuration.reasoning, modelUsage: result?.modelUsage, tools: initialized?.tools, skills: initialized?.skills, permissionDenials: result?.permission_denials ?? [], turns: result?.num_turns, eventCount: events.length } };
}

async function run(planPath, selectedRows) {
  const plan = JSON.parse(await readFile(resolve(planPath), 'utf8'));
  if (plan.extensionOf) {
    check(plan.basePolicySha256 === BASE_POLICY_SHA256, 'Original resource policy changed after extension preparation.');
    check(plan.policy.configurations.length === 1 && plan.policy.conditions.length === 1 && POLICY.conditions.includes(plan.policy.conditions[0]), 'Extension must select one configuration and condition.');
    POLICY.configurations = [resolveBenchmarkConfiguration(plan.policy.configurations[0]).id];
    POLICY.conditions = plan.policy.conditions;
  }
  check(plan.runnerSha256 === sha256(await readFile(fileURLToPath(import.meta.url))), 'Runner changed after preparation; prepare a new reviewed plan.');
  check(plan.policySha256 === sha256(JSON.stringify(POLICY)), 'Policy changed after preparation.');
  check(plan.prompt === POLICY.prompt && plan.promptSha256 === sha256(POLICY.prompt), 'Prompt mismatch.');
  const rows = selectedRows.length ? plan.rows.filter((row) => selectedRows.includes(row.rowId)) : plan.rows;
  check(rows.length > 0 && (!selectedRows.length || rows.length === selectedRows.length), 'Unknown row selection.');
  for (const row of rows) check(!await exists(join(row.history, 'started.json')), `${row.rowId} already started; no automatic retry or continuation is permitted.`);
  let index = 0;
  let reservations = 0;
  let allocation = Promise.resolve();
  const claimAvailableRow = () => {
    const claim = allocation.then(async () => {
      const active = await Promise.all(plan.rows.map(async (candidate) => await exists(join(candidate.history, 'started.json')) && !await exists(join(candidate.history, 'result.json'))));
      if (active.filter(Boolean).length + reservations >= POLICY.concurrency || index >= rows.length) return null;
      reservations += 1;
      return rows[index++];
    });
    allocation = claim.catch(() => {});
    return claim;
  };
  const worker = async () => {
    while (index < rows.length) {
      const row = await claimAvailableRow();
      if (!row) { await new Promise((done) => setTimeout(done, 1000)); continue; }
      await assertNoAmbientInstructions(row.workspace); check((await tree(row.workspace)).length === 0, 'Workspace changed before launch.');
      check(sha256(await readFile(join(row.root, 'tools/image-bridge.mjs'))) === plan.bridgeSha256, 'Image bridge changed after preparation.');
      if (row.catalog) check((await treeReceipt(row.catalog.installedPath)).sha256 === plan.catalog.sha256, 'Installed catalog changed after preparation.');
      await installAuthentication(row);
      await writeJson(join(row.history, 'started.json'), { startedAt: new Date().toISOString(), rowId: row.rowId });
      reservations -= 1;
      process.stdout.write(`${json({ event: 'started', rowId: row.rowId, configuration: row.configuration.id, condition: row.condition }).trim()}\n`);
      let processResult;
      try {
        processResult = await capture('/usr/bin/sandbox-exec', ['-f', row.sandboxPath, row.command, ...row.arguments], { cwd: row.workspace, environment: launchEnvironment(row), input: POLICY.prompt, timeoutMs: POLICY.wallTimeLimitMs, stdoutPath: join(row.history, 'stdout.jsonl'), stderrPath: join(row.history, 'stderr.log') });
      } finally {
        await rm(join(row.home, '.codex/auth.json'), { force: true }); await rm(join(row.home, '.claude/.credentials.json'), { force: true });
      }
      const parsed = parseResult(row, processResult);
      const sourcePath = join(row.history, 'source'); await cp(row.workspace, sourcePath, { recursive: true });
      const source = await treeReceipt(sourcePath);
      const result = { schemaVersion: 1, rowId: row.rowId, configuration: row.configuration, condition: row.condition, status: processResult.timedOut ? 'timeout' : processResult.exitCode === 0 && parsed.complete ? 'complete' : 'failed', startedAt: processResult.startedAt, endedAt: processResult.endedAt, elapsedMs: processResult.elapsedMs, exitCode: processResult.exitCode, signal: processResult.signal, timedOut: processResult.timedOut, outputLimitExceeded: processResult.outputLimitExceeded, spawnError: processResult.spawnError, promptSha256: row.promptSha256, source, usage: parsed.usage, costUsd: parsed.costUsd, runtime: parsed.runtime, history: row.history };
      await writeFile(join(row.history, 'final.txt'), parsed.finalText); await writeJson(join(row.history, 'result.json'), result);
      await cp(row.imageQueue, join(row.history, 'image-queue'), { recursive: true });
      process.stdout.write(`${json({ event: 'finished', rowId: row.rowId, status: result.status, elapsedMs: result.elapsedMs, files: source.entries.length }).trim()}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(POLICY.concurrency, rows.length) }, worker));
  const results = [];
  for (const row of plan.rows) if (await exists(join(row.history, 'result.json'))) results.push(JSON.parse(await readFile(join(row.history, 'result.json'), 'utf8')));
  await writeJson(join(plan.history, 'run.json'), { schemaVersion: 1, benchmark: POLICY.benchmark, batchId: plan.batchId, prompt: POLICY.prompt, promptSha256: plan.promptSha256, policy: POLICY, catalogSha256: plan.catalog.sha256, planPath: resolve(planPath), rows: results });
  process.stdout.write(json({ runPath: join(plan.history, 'run.json'), completedRows: results.length }));
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--dry-run') await prepare();
else if (args[0] === '--extend' && args.length === 6 && args[2] === '--configuration' && args[4] === '--condition') await prepare({ planPath: args[1], configuration: args[3], condition: args[5] });
else if (args[0] === '--run' && args[1]) await run(args[1], args[2] === '--rows' ? (args[3] ?? '').split(',').filter(Boolean) : []);
else { process.stderr.write('Usage: node benchmarks/2d-jumping-demo/run-agents.mjs --dry-run\n       node benchmarks/2d-jumping-demo/run-agents.mjs --extend <original-plan.json> --configuration <provider:model@effort> --condition <bare|vasir>\n       node benchmarks/2d-jumping-demo/run-agents.mjs --run <plan.json> [--rows <row-id,...>]\n'); process.exitCode = 1; }
