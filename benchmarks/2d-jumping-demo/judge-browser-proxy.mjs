#!/usr/bin/env node
// Preserve MCP tool inputs and image receipts; contain unbounded reviewer code.
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { pathToFileURL } from 'node:url';

export function runBrowserProxy({ auditPath, command, args, codeTimeoutMs = 30000 }) {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const pending = new Map(), children = new Set(), waiting = [];
  let child, initialize, initialized, replayId, replayTimer, generation = 0, auditBytes = 0, closing = false;
  const append = entry => {
    const line = `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`;
    auditBytes += Buffer.byteLength(line);
    if (auditBytes > 16 * 1024 * 1024) throw new Error('Browser audit exceeded its 16 MiB bound');
    appendFileSync(auditPath, line, { mode: 0o600 });
  };
  const send = (stream, message) => stream.write(`${JSON.stringify(message)}\n`);
  const readLines = onMessage => {
    let buffer = '';
    const decoder = new StringDecoder('utf8');
    return chunk => {
      buffer += decoder.write(chunk);
      if (Buffer.byteLength(buffer) > 32 * 1024 * 1024) throw new Error('Browser MCP message exceeded its 32 MiB bound');
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        if (line.trim()) onMessage(JSON.parse(line));
      }
    };
  };
  const result = message => {
    const item = pending.get(message.id);
    if (item) {
      pending.delete(message.id); clearTimeout(item.timer);
      append({ type: 'result', id: message.id, name: item.name, isError: Boolean(message.error || message.result?.isError), content: (message.result?.content ?? []).map(content => content.type === 'image'
        ? { type: 'image', mimeType: content.mimeType, sha256: hash(Buffer.from(content.data, 'base64')) }
        : { type: content.type, sha256: hash(JSON.stringify(content)), bytes: Buffer.byteLength(JSON.stringify(content)) }) });
    }
    send(process.stdout, message);
  };
  const retire = backend => {
    backend.kill('SIGTERM');
    const timer = setTimeout(() => backend.kill('SIGKILL'), 2000);
    timer.unref(); backend.once('close', () => clearTimeout(timer));
  };
  const stop = (code = 0) => {
    if (closing) return;
    closing = true; process.exitCode = code;
    clearTimeout(replayTimer);
    for (const item of pending.values()) clearTimeout(item.timer);
    for (const backend of children) retire(backend);
    process.stdin.pause(); process.stdin.destroy();
  };
  const fail = error => { process.stderr.write(`${error.message}\n`); stop(1); };
  const forward = message => {
    if (message.method === 'tools/call') {
      const name = message.params?.name;
      append({ type: 'call', id: message.id, name, arguments: message.params?.arguments });
      const timer = ['browser_run_code_unsafe', 'browser_evaluate'].includes(name) ? setTimeout(() => reset(message.id), codeTimeoutMs) : null;
      pending.set(message.id, { name, timer });
    }
    send(child.stdin, message);
  };
  const launch = replay => {
    const backend = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    child = backend; children.add(backend);
    backend.stdin.on('error', () => {});
    backend.stderr.pipe(process.stderr, { end: false });
    backend.stdout.on('data', readLines(message => {
      if (backend !== child || closing) return;
      if (replayId && message.id === replayId) {
        if (message.error) return fail(new Error('Browser reinitialization failed'));
        clearTimeout(replayTimer); replayId = null;
        send(backend.stdin, initialized ?? { jsonrpc: '2.0', method: 'notifications/initialized' });
        for (const queued of waiting.splice(0)) forward(queued);
      } else result(message);
    }));
    backend.on('error', fail);
    backend.on('close', code => {
      children.delete(backend);
      if (backend === child && !closing) stop(code ?? 1);
    });
    if (replay) {
      replayId = `review-proxy-initialize-${++generation}`;
      replayTimer = setTimeout(() => fail(new Error('Browser reinitialization timed out')), 30000);
      send(backend.stdin, { ...initialize, id: replayId });
    }
  };
  const reset = id => {
    if (closing || !pending.has(id)) return;
    // MCP action timeouts do not cover either direct page evaluation or promises
    // awaited inside unsafe code.
    // Kill that owned backend before accepting further actions; a Promise.race
    // alone would leave the old evaluation alive and contaminate later evidence.
    append({ type: 'timeout', id, name: pending.get(id).name, timeoutMs: codeTimeoutMs, recovery: 'fresh-isolated-browser' });
    const previous = child;
    if (!initialize) return fail(new Error('Browser timed out before initialization'));
    launch(true); retire(previous);
    for (const requestId of [...pending.keys()]) result({ jsonrpc: '2.0', id: requestId, result: { isError: true, content: [{ type: 'text', text: requestId === id
      ? `Browser code timed out after ${codeTimeoutMs}ms. Its browser session was closed. The next browser call uses a fresh isolated session.`
      : 'Browser operation canceled because another browser code call timed out. The next browser call uses a fresh isolated session.' }] } });
  };
  process.stdin.on('data', readLines(message => {
    if (closing) return;
    if (message.method === 'initialize') initialize = message;
    if (message.method === 'notifications/initialized') initialized = message;
    // Backend requests (e.g. roots/list) can need client replies during startup.
    if (replayId && message.method) {
      if (waiting.length >= 64) throw new Error('Browser recovery queue exceeded its bound');
      waiting.push(message);
    } else forward(message);
  }));
  process.stdin.on('end', () => stop());
  process.on('SIGTERM', () => stop()); process.on('SIGINT', () => stop());
  process.on('uncaughtException', fail);
  launch(false);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [auditPath, command, ...args] = process.argv.slice(2);
  if (!auditPath || !command) throw new Error('Usage: judge-browser-proxy.mjs <audit-path> <command> [args...]');
  runBrowserProxy({ auditPath, command, args });
}
