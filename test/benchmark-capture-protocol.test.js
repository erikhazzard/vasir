import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../site/vasirbenchmark.com/capture.mjs', import.meta.url), 'utf8');
const protocolSource = source.slice(source.indexOf('function createProtocol(socket) {'), source.indexOf('\nasync function connect(port)'));
function fixture() {
  let id = 0, handler;
  const timers = new Map(), cleared = [], maps = [];
  class ObservedMap extends Map { constructor(...args) { super(...args); maps.push(this); } }
  const context = vm.createContext({ Map: ObservedMap, setTimeout(fn, ms) { const key = ++id; timers.set(key, { fn, ms }); return key; }, clearTimeout(key) { cleared.push(key); timers.delete(key); } });
  const createProtocol = vm.runInContext(protocolSource + '\ncreateProtocol', context);
  const protocol = createProtocol({ addEventListener(type, fn) { assert.equal(type, 'message'); handler = fn; }, send() {} });
  return { protocol, timers, cleared, waiters: maps[1], emit(method, params = {}) { handler({ data: JSON.stringify({ method, params }) }); }, expire(key) { const timer = timers.get(key); assert.ok(timer); timers.delete(key); timer.fn(); } };
}

test('Successful protocol event clears timeout and removes its waiter', async () => {
  const f = fixture(), completed = f.protocol.once('Page.loadEventFired');
  assert.equal(f.timers.get(1).ms, 15000); assert.equal(f.waiters.get('Page.loadEventFired').length, 1);
  f.emit('Page.loadEventFired', { timestamp: 123 });
  assert.equal((await completed).timestamp, 123);
  assert.equal(f.timers.size, 0); assert.equal(f.waiters.size, 0); assert.deepEqual(f.cleared, [1]);
});

test('Timed out event rejects and removes only its expired waiter', async () => {
  const f = fixture(), first = f.protocol.once('Page.loadEventFired'), second = f.protocol.once('Page.loadEventFired', 30000);
  const rejection = assert.rejects(first, /Timed out waiting for Page\.loadEventFired/);
  f.expire(1); await rejection;
  assert.equal(f.waiters.get('Page.loadEventFired').length, 1); assert.equal(f.timers.size, 1);
  f.emit('Page.loadEventFired', { timestamp: 456 });
  assert.equal((await second).timestamp, 456); assert.equal(f.waiters.size, 0); assert.equal(f.timers.size, 0);
});

test('A later same-method waiter remains usable after timeout cleanup', async () => {
  const f = fixture(), first = f.protocol.once('Page.loadEventFired');
  const rejection = assert.rejects(first, /Timed out waiting/); f.expire(1); await rejection;
  assert.equal(f.waiters.size, 0);
  const later = f.protocol.once('Page.loadEventFired', 30000);
  f.emit('Page.loadEventFired', { timestamp: 789 });
  assert.equal((await later).timestamp, 789); assert.equal(f.waiters.size, 0); assert.equal(f.timers.size, 0);
});

test('Navigation subscribes before every command and retains a bounded 30-second event wait', async () => {
  assert.match(source, /const NAVIGATION_LOAD_TIMEOUT_MS = 30_000;/);
  const navigation = [...source.matchAll(/const (\w+) = protocol\.once\('Page\.loadEventFired', NAVIGATION_LOAD_TIMEOUT_MS\);\s*await protocol\.send\('Page\.navigate', \{ url: ([^}]+) \}\);\s*await \1;/g)];
  assert.equal(navigation.length, 3); assert.equal([...source.matchAll(/protocol\.send\('Page\.navigate'/g)].length, 3);
  const f = fixture(), waited = f.protocol.once('Page.loadEventFired', 30000);
  assert.equal(f.timers.get(1).ms, 30000);
  const rejection = assert.rejects(waited, /Timed out waiting for Page\.loadEventFired/); f.expire(1); await rejection;
  assert.equal(f.waiters.size, 0);
  assert.match(source, /await loaded;[\s\S]*document\.readyState === 'complete'[\s\S]*document\.fonts\.status === 'loaded'/);
});

test('Navigation failure still reports the error and accumulated page diagnostics', () => {
  assert.match(source, /const pageErrors = \[\];\s*try/);
  assert.match(source, /catch \(error\) \{\s*console\.error\('Capture failed: ' \+ error\.message\);\s*if \(pageErrors\.length\) console\.error\('Observed page errors: '/);
  assert.match(source, /process\.exitCode = 1/);
});
