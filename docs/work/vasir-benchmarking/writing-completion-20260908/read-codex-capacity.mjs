import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only account metadata. Never starts a thread/turn, changes authentication,
// buys credits, consumes reset credits, or prints account identifiers/secrets.
const directory = path.dirname(fileURLToPath(import.meta.url));
const child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
const replies = new Map();
let buffer = '', bytes = 0, initialized = false;
const send = message => child.stdin.write(JSON.stringify(message) + '\n');
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Read-only capacity check timed out.')), 25_000);
    const finish = error => {
      clearTimeout(timeout);
      if (error) reject(error); else resolve();
    };
    child.once('error', () => finish(new Error('Could not start the current Codex app-server.')));
    child.once('exit', code => {
      if (!replies.has(2) || !replies.has(3)) finish(new Error(`App-server exited before completing metadata reads (code ${code}).`));
    });
    child.stderr.resume();
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 2_000_000) return finish(new Error('Unexpectedly large metadata response.'));
      buffer += chunk.toString();
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n');
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!line.trim()) continue;
        let message;
        try { message = JSON.parse(line); } catch { return finish(new Error('Invalid app-server metadata response.')); }
        if (![1, 2, 3].includes(message.id)) continue;
        if (message.error) return finish(new Error(`Metadata request ${message.id} failed (code ${message.error.code ?? 'unknown'}).`));
        if (message.id === 1 && !initialized) {
          initialized = true;
          send({ method: 'initialized' });
          send({ id: 2, method: 'account/rateLimits/read', params: {} });
          send({ id: 3, method: 'account/read', params: { refreshToken: false } });
        } else replies.set(message.id, message.result);
        if (replies.has(2) && replies.has(3)) finish();
      }
    });
    send({ id: 1, method: 'initialize', params: {
      clientInfo: { name: 'writing-benchmark-quota-audit', version: '1.0.0' },
      capabilities: { experimentalApi: true }
    } });
  });
  const status = replies.get(3), limits = replies.get(2).rateLimits;
  assert.ok(limits && status, 'Account metadata is incomplete.');
  const checkedAt = new Date().toISOString();
  const receipt = {
    schemaVersion: 1, kind: 'sanitized-read-only-capacity-receipt', checkedAt,
    source: 'Directly parsed codex app-server account/rateLimits/read and account/read results; account ID and all credentials omitted.',
    authenticationContextDirectory: process.env.CODEX_HOME ?? null,
    account: { type: status.account?.type ?? null, planType: status.account?.planType ?? null, requiresOpenaiAuth: status.requiresOpenaiAuth },
    rateLimits: limits,
    scope: 'Current unchanged account only; no generation, account switch, purchase, or reset-credit consumption. Advertised capacity is not a guarantee of later model-call success; stop on new explicit quota failures.'
  };
  const filename = path.join(directory, 'codex-capacity-' + checkedAt.replaceAll(/[^0-9TZ]/g, '') + '.json');
  fs.writeFileSync(filename, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ receiptPath: filename, ...receipt }, null, 2));
} finally {
  child.kill('SIGTERM');
}
