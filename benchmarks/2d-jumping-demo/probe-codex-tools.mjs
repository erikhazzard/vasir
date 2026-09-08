#!/usr/bin/env node
// Observe the native CLI's first request using a loopback endpoint that rejects it.
// No request is forwarded to a model provider and no model completion is generated.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { gunzipSync, zstdDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const planPath = resolve(process.argv[2]);
const attemptSpawn = process.argv.includes('--attempt-spawn');
const inspectTools = process.argv.includes('--inspect-tools');
const inspectBrowser = process.argv.includes('--inspect-browser');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const row = plan.rows.find((candidate) => process.env.JUMP_PROBE_ROW_ID ? candidate.rowId === process.env.JUMP_PROBE_ROW_ID : candidate.configuration.provider === 'codex' && candidate.condition === 'bare');
if (!row) throw new Error('No matching probe row.');
try { await access(join(row.history, 'started.json')); throw new Error('Cannot probe a started contestant row.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const environment = {
  PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  HOME: row.home, CODEX_HOME: join(row.home, '.codex'), TMPDIR: `${join(row.root, 'tmp')}/`,
  XDG_CONFIG_HOME: join(row.home, '.config'), XDG_CACHE_HOME: join(row.home, '.cache'),
  ZDOTDIR: row.home, CI: '1', CODEX_CI: '1', NO_COLOR: '1', TERM: 'dumb', TZ: 'UTC'
};
let requestBody = null;
const observedRequests = [];
let resolveObserved;
const observed = new Promise((done) => { resolveObserved = done; });
const server = createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  let body = Buffer.concat(chunks);
  if (request.headers['content-encoding'] === 'gzip') body = gunzipSync(body);
  if (request.headers['content-encoding'] === 'zstd') body = zstdDecompressSync(body);
  if (request.url?.endsWith('/responses')) {
    requestBody = JSON.parse(body.toString());
    observedRequests.push(requestBody);
    if ((attemptSpawn || inspectTools || inspectBrowser) && observedRequests.length === 1) {
      const item = inspectTools || inspectBrowser
        ? { type: 'custom_tool_call', id: 'fc_probe', call_id: 'call_probe', namespace: 'functions', name: 'exec', input: inspectBrowser ? 'text(await tools.mcp__browser__browser_navigate({url:"about:blank"})); const shot=await tools.mcp__browser__browser_take_screenshot({type:"png"}); for(const item of shot.content??[]) {if(item.type==="image") image(item); else if(item.type==="text") text(item.text);} text(await tools.mcp__browser__browser_close({}));' : 'text(ALL_TOOLS.map(({name}) => name));' }
        : { type: 'function_call', id: 'fc_probe', call_id: 'call_probe', namespace: 'collaboration', name: 'spawn_agent', arguments: JSON.stringify({ task_name: 'boundary_probe', message: 'No work; native tool-boundary preflight.', fork_turns: 'none' }) };
      const events = [
        { type: 'response.created', response: { id: 'resp_probe', status: 'in_progress', output: [] } },
        { type: 'response.output_item.added', output_index: 0, item: inspectTools || inspectBrowser ? { ...item, input: '' } : { ...item, arguments: '' } },
        inspectTools || inspectBrowser ? { type: 'response.custom_tool_call_input.delta', item_id: item.id, output_index: 0, delta: item.input } : { type: 'response.function_call_arguments.delta', item_id: item.id, output_index: 0, delta: item.arguments },
        { type: 'response.output_item.done', output_index: 0, item },
        { type: 'response.completed', response: { id: 'resp_probe', status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }
      ];
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      for (const event of events) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      response.end();
      return;
    }
    resolveObserved();
  }
  response.writeHead(400, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: { message: 'Local preflight: request observed, no model inference performed.', type: 'invalid_request_error' } }));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const args = [...row.arguments];
const extraConfiguration = process.argv.slice(3).filter((value) => !['--attempt-spawn', '--inspect-tools', '--inspect-browser'].includes(value));
args.splice(args.length - 1, 0,
  '--config', 'model_provider="request_probe"',
  '--config', `model_providers.request_probe={name="Local request inspector",base_url="http://127.0.0.1:${server.address().port}/v1",wire_api="responses",requires_openai_auth=false,supports_websockets=false,request_max_retries=0}`,
  ...extraConfiguration.flatMap((value) => ['--config', value]));
const probeSandboxPath = join(row.root, 'probe-loopback-only.sb');
await writeFile(probeSandboxPath, `${await readFile(row.sandboxPath, 'utf8')}\n(deny network-outbound)\n(allow network-outbound (remote ip "localhost:*"))\n`);
const child = spawn('/usr/bin/sandbox-exec', ['-f', probeSandboxPath, row.command, ...args], { cwd: row.workspace, env: environment, stdio: ['pipe', 'pipe', 'pipe'] });
let stdout = ''; let stderr = '';
child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
child.stdin.on('error', () => {}); child.stdin.end(plan.prompt);
let timer;
try {
  await Promise.race([observed, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No native request observed: ${stderr.slice(-1800)} ${stdout.slice(-800)}`)), 60000);
    child.on('exit', (code) => { if (!requestBody) reject(new Error(`CLI exited ${code} before request: ${stderr.slice(-1800)} ${stdout.slice(-800)}`)); });
  })]);
  if (attemptSpawn || inspectTools || inspectBrowser) {
    const receipt = { schemaVersion: 1, proof: `${inspectBrowser ? 'Mocked native functions.exec calls browser navigation, screenshot and close tools' : inspectTools ? 'Mocked native functions.exec inspects the actual available tool registry' : 'Mocked native spawn_agent tests the thread limit'}; all process-tree outbound traffic restricted to loopback by OS sandbox`, planPath, rowId: row.rowId, extraConfiguration, requestCount: observedRequests.length, responses: observedRequests.slice(1).map((request) => ({ model: request.model, input: request.input })), stdout, stderr };
    await writeFile(join(plan.history, inspectBrowser ? 'preflight-codex-browser-boundary.json' : inspectTools ? 'preflight-codex-tools-boundary.json' : 'preflight-codex-spawn-boundary.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    process.stdout.write(`${JSON.stringify({ proof: receipt.proof, requestCount: observedRequests.length, ...(inspectBrowser ? { eventShapes: stdout.trim().split('\n').flatMap((line) => {try {const event=JSON.parse(line);return [{type:event.type,itemType:event.item?.type,itemKeys:Object.keys(event.item??{})}]} catch{return []}}) } : {stdoutTail: stdout.slice(-2500), outputItems: observedRequests.slice(1).flatMap((request) => request.input ?? []).filter((item) => /output/.test(item.type))}) }, null, 2)}\n`);
    process.exitCode = 0;
  } else {
  const names = [];
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.name === 'string') names.push(value.name);
    for (const childValue of Object.values(value)) if (Array.isArray(childValue)) childValue.forEach(walk); else if (typeof childValue === 'object') walk(childValue);
  };
  const toolDeclarations = [...(requestBody.tools ?? []), ...(requestBody.input ?? []).filter((item) => item.type === 'additional_tools').flatMap((item) => item.tools ?? [])];
  toolDeclarations.forEach(walk);
  if (names.length === 0) throw new Error('Request contained no identifiable tool declarations; cannot prove tool policy.');
  const helpers = /spawn_agent|followup_task|send_message|wait_agent|list_agents|interrupt_agent|collaboration|agent_team/gi;
  const helperTools = [...new Set(JSON.stringify(toolDeclarations).match(helpers) ?? [])];
  const receipt = { schemaVersion: 1, proof: 'Native codex exec first request intercepted and rejected on loopback; no inference', planPath, rowId: row.rowId, model: requestBody.model, reasoning: requestBody.reasoning, toolNames: names, helperTools, singleAgentToolPolicy: helperTools.length === 0, requestSha256: createHash('sha256').update(JSON.stringify(requestBody)).digest('hex'), transportDifference: 'Only provider endpoint/auth changed to unauthenticated loopback inspector; same model, task, coding feature flags, skills, MCP configuration and workspace.', retainedHeaders: false };
  await writeFile(join(plan.history, 'preflight-codex-tool-request.json'), `${JSON.stringify(requestBody, null, 2)}\n`, { mode: 0o600 });
  await writeFile(join(plan.history, 'preflight-codex-tools.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (helperTools.length) process.exitCode = 1;
  }
} finally { clearTimeout(timer); child.kill('SIGTERM'); server.closeAllConnections(); await new Promise((done) => server.close(done)); }
