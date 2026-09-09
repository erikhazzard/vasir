import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../site/vasirbenchmark.com/app.js', import.meta.url), 'utf8');
const start = app.indexOf('  const syncWritingControls = ');
const source = app.slice(start, app.indexOf('\n  const ', start + 1));

function fixture(isWriting = true) {
  const score = { value: 'storytelling-magic-discovery' }, model = { value: 'wrong-model' };
  const context = { isWriting, data: { writingCategory: { selection: { id: 'all-writing' } }, entries: [{ id: 'selected-skill', settingId: 'selected', condition: 'skill' }] },
    TREATMENT_CONDITION_ID: 'skill', selectedEntry: () => ({ settingId: 'selected' }),
    document: { querySelector: selector => selector === '#writing-score-selection' ? score : model } };
  const sync = vm.runInNewContext(source + '\nsyncWritingControls', context);
  return { score, model, sync, context };
}

test('restored score control matches the actual projection without reviving a benchmark model selector', () => {
  const f = fixture(); f.sync();
  assert.equal(f.score.value, 'all-writing');
  assert.equal(f.model.value, 'wrong-model', 'The removed model selector is not referenced.');
  assert.doesNotMatch(source, /writing-benchmark-model/);
  f.context.data.writingCategory.selection.id = 'storytelling'; f.sync();
  assert.equal(f.score.value, 'storytelling');
});

test('history control reconciliation does not affect other capabilities or require mounted controls', () => {
  const f = fixture(false); f.sync();
  assert.equal(f.score.value, 'storytelling-magic-discovery');
  assert.equal(f.model.value, 'wrong-model');
  const absent = fixture(); absent.context.document.querySelector = () => null;
  assert.doesNotThrow(absent.sync);
});

test('pageshow reconciliation runs after native form restoration rather than navigating or changing score data', () => {
  const binding = app.match(/window\.addEventListener\('pageshow', [^\n]+/)[0];
  let onShow, scheduled;
  const f = fixture();
  vm.runInNewContext(binding, { syncWritingControls: f.sync,
    window: { addEventListener: (event, fn) => { assert.equal(event, 'pageshow'); onShow = fn; } },
    setTimeout: (fn, delay) => { assert.equal(delay, 0); scheduled = fn; } });
  onShow(); f.score.value = 'browser-restored-stale-value'; scheduled();
  assert.equal(f.score.value, 'all-writing');
  assert.equal(f.context.data.writingCategory.selection.id, 'all-writing');
});

test('Writing tab changes rebuild conditional controls and footnotes for both entry directions', () => {
  const start = app.indexOf('  const updateCapabilityMode = ');
  const source = app.slice(start, app.indexOf('\n  const ', start + 1));
  const state = { capabilityCategory: 'writing', capabilityMode: 'models' };
  const modes = [];
  const update = vm.runInNewContext(source + '\nupdateCapabilityMode', {
    isWriting: true, state,
    renderCapabilities: options => modes.push({ mode: state.capabilityMode, ...options }),
  });
  for (const mode of ['benchmarks', 'models', 'benchmarks', 'efficiency']) {
    state.capabilityMode = mode;
    update({ skipMotion: true });
  }
  assert.deepEqual(modes.map(item => item.mode), ['benchmarks', 'models', 'benchmarks', 'efficiency']);
  assert.ok(modes.every(item => item.skipMotion === true));
});
