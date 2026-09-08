import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The real MCP/browser reproduction is retained with the completion protocol.
// This protocol fixture keeps the timeout -> ordinary error -> usable next call
// contract cheap to run, including the initialization replay needed for recovery.
test('timed-out browser code cannot poison the next reviewer browser call', { timeout: 10000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'review-browser-deadline-'));
  const auditPath = join(directory, 'audit.jsonl');
  await writeFile(join(directory, 'backend.mjs'), `
    import readline from 'node:readline';
    let initialized = false;
    const send = value => process.stdout.write(JSON.stringify(value) + '\\n');
    readline.createInterface({input:process.stdin}).on('line', line => {
      const m = JSON.parse(line);
      if(m.method==='initialize') send({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2024-11-05',capabilities:{},serverInfo:{name:'fixture',version:'1'}}});
      else if(m.method==='notifications/initialized') initialized=true;
      else if(m.method==='tools/call' && !['browser_run_code_unsafe','browser_evaluate'].includes(m.params.name)) send({jsonrpc:'2.0',id:m.id,result:{isError:!initialized,content:[{type:'text',text:JSON.stringify({initialized,args:m.params.arguments})}]}});
    });
  `);
  const proxy = pathToFileURL(resolve('benchmarks/2d-jumping-demo/judge-browser-proxy.mjs')).href;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import {runBrowserProxy} from ${JSON.stringify(proxy)};runBrowserProxy(${JSON.stringify({ auditPath, command: process.execPath, args: [join(directory, 'backend.mjs')], codeTimeoutMs: 80 })});`], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', nextId = 0; const pending = new Map();
  child.stderr.resume(); child.stdin.on('error', () => {});
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stdout.on('data', bytes => {
    buffer += bytes;
    while(buffer.includes('\n')) {
      const index=buffer.indexOf('\n'),message=JSON.parse(buffer.slice(0,index));buffer=buffer.slice(index+1);
      const item=pending.get(message.id);
      if(item) {pending.delete(message.id);clearTimeout(item.timer);item.done(message);}
    }
  });
  const request = (method, params) => new Promise((done, reject) => {
    const id = ++nextId, timer = setTimeout(() => {pending.delete(id);reject(new Error(`No response to ${method}`));}, 3000);
    pending.set(id,{done,timer});child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id,method,params})}\n`);
  });
  try {
    await request('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1'}});
    child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})}\n`);
    const originalCode='async(page)=>await page.evaluate(()=>new Promise(()=>{}))';
    const timeout=await request('tools/call',{name:'browser_run_code_unsafe',arguments:{code:originalCode}});
    assert.equal(timeout.result.isError,true);assert.match(timeout.result.content[0].text,/timed out after 80ms/);
    const next=await request('tools/call',{name:'browser_navigate',arguments:{url:'http://frozen-evidence.invalid/A/'}});
    assert.equal(next.result.isError,false);
    assert.deepEqual(JSON.parse(next.result.content[0].text),{initialized:true,args:{url:'http://frozen-evidence.invalid/A/'}});
    const directTimeout=await request('tools/call',{name:'browser_evaluate',arguments:{function:'()=>new Promise(()=>{})'}});
    assert.equal(directTimeout.result.isError,true);
    const afterDirect=await request('tools/call',{name:'browser_navigate',arguments:{url:'http://frozen-evidence.invalid/B/'}});
    assert.equal(afterDirect.result.isError,false);
    const audit=(await readFile(auditPath,'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(audit.find(item=>item.type==='call').arguments.code,originalCode);
    assert.equal(audit.filter(item=>item.type==='timeout').length,2);
    assert.equal(audit.filter(item=>item.type==='result'&&item.isError).length,2);
  } finally {
    child.kill('SIGTERM');for(const item of pending.values())clearTimeout(item.timer);await closed;await rm(directory,{recursive:true,force:true});
  }
});
