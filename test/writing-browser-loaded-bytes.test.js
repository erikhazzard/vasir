import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/writing-browsercheck.mjs', import.meta.url), 'utf8');
const start = runtime.indexOf('const networkCaptureOptions = ');
const end = runtime.indexOf('\nasync function waitFor(', start);
assert.ok(start >= 0 && end > start);
const helpers = runtime.slice(start, end);
const declaration = name => {
  const from = runtime.indexOf(`const ${name} = `);
  assert.ok(from >= 0);
  return runtime.slice(from, runtime.indexOf('\nconst ', from + 1));
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(send) {
  const context = vm.createContext({ Buffer, sha256, send, loadedFilePromises: [], errors: [] });
  vm.runInContext(helpers, context);
  return { context, run: expression => vm.runInContext(expression, context) };
}

test('CDP capture explicitly retains expanded archive bodies across renderer navigation', () => {
  const f = fixture(() => { throw Error('No protocol call expected.'); });
  const options = JSON.parse(f.run('JSON.stringify(networkCaptureOptions)'));
  assert.deepEqual(options, { maxTotalBufferSize: 134217728, maxResourceBufferSize: 33554432, enableDurableMessages: true });
  assert.match(runtime, /send\('Network\.enable', networkCaptureOptions\)/);
  assert.ok(options.maxResourceBufferSize > 15138707, 'The actual expanded DM archive fits.');
  assert.ok(options.maxTotalBufferSize > 75956909, 'The observed full proof body inventory fits.');
});

test('captured hashes use the original request body, in UTF-8 or base64, without a second request', async () => {
  const bytes = Buffer.from('Original archive Ω.\n\nExact whitespace.\n');
  for (const base64Encoded of [false, true]) {
    const calls = [], f = fixture(async (method, params) => {
      calls.push({ method, ...params });
      return { body: bytes.toString(base64Encoded ? 'base64' : 'utf8'), base64Encoded };
    });
    f.run("recordLoadedFile('loaded-request-42', {url:'https://example.test/releases/frozen/writing-dungeon-master-responses.js'})");
    const files = JSON.parse(JSON.stringify(await f.run('drainLoadedFiles()')));
    assert.deepEqual(calls, [{ method: 'Network.getResponseBody', requestId: 'loaded-request-42' }]);
    assert.deepEqual(files, [{ url: 'https://example.test/releases/frozen/writing-dungeon-master-responses.js', bytes: bytes.length, sha256: sha256(bytes) }]);
    assert.equal(f.context.errors.length, 0);
  }
});

test('a body capture failure remains mandatory evidence failure with its original request identity', async () => {
  const calls = [], f = fixture(async (method, params) => {
    calls.push({ method, ...params });
    throw Error('No data found for resource with given identifier');
  });
  f.run("recordLoadedFile('failed-request', {url:'https://example.test/writing-data.js'})");
  assert.equal((await f.run('drainLoadedFiles()')).length, 0);
  assert.deepEqual(calls, [{ method: 'Network.getResponseBody', requestId: 'failed-request' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(f.context.errors)), [{ kind: 'loaded-byte-evidence', requestId: 'failed-request', url: 'https://example.test/writing-data.js', detail: 'No data found for resource with given identifier' }]);
  assert.match(runtime, /check\('Dungeon Master has no browser runtime or network failures', errors.length === 0/);
  assert.match(runtime, /check\('No browser runtime or network failures', errors.length === 0/);
  assert.doesNotMatch(helpers, /fetch\(|loadNetworkResource|Page\.getResourceContent/);
});

test('drain includes additional body captures registered while an earlier capture is pending', async () => {
  const resolvers = [], f = fixture(() => new Promise(resolve => resolvers.push(resolve)));
  f.run("recordLoadedFile('first', {url:'https://example.test/writing-data.js'})");
  let settled = false;
  const draining = f.run('drainLoadedFiles()').then(value => { settled = true; return value; });
  f.run("recordLoadedFile('second', {url:'https://example.test/writing-responses.js'})");
  resolvers[0]({ body: 'first', base64Encoded: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  resolvers[1]({ body: 'second', base64Encoded: false });
  assert.equal((await draining).length, 2);
});

test('explicit navigation drains before leaving and after loading; link clicks drain before activation', async () => {
  const order = [], context = vm.createContext({
    drainLoadedFiles: async () => { order.push('drain'); },
    send: async method => { order.push(method); },
    waitFor: async check => { order.push('wait'); await check(); },
    evaluate: async expression => { order.push(expression.includes('document.fonts.ready') ? 'fonts' : expression.includes('element.click()') ? 'click' : 'ready'); return true; }
  });
  vm.runInContext(declaration('navigate') + '\n' + declaration('click'), context);
  await vm.runInContext("navigate('https://example.test/report', 'true')", context);
  assert.deepEqual(order, ['drain', 'Page.navigate', 'wait', 'ready', 'fonts', 'drain']);
  order.length = 0;
  await vm.runInContext("click('.report-context__back')", context);
  assert.deepEqual(order, ['drain', 'click']);
});
