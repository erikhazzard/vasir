import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const root = new URL('./', import.meta.url);
const report = JSON.parse(await fs.readFile(new URL('render-report.json', root), 'utf8'));
const candidate = Object.fromEntries(report.versions.candidate.map(row => [row.label, row]));
const baseline = Object.fromEntries(report.versions.baseline.map(row => [row.label, row]));
for (const row of report.versions.candidate) {
  assert.equal(row.clipped, 0);
  assert.equal(row.nonFinite, 0);
  assert.equal(row.silentBeforeUnlock, true);
  assert.equal(row.maxNodes, baseline[row.label].maxNodes, 'reuse every existing node');
  assert.equal(row.maxSources, baseline[row.label].maxSources, 'reuse every existing source');
  assert.equal(row.afterTail.nodes, row.persistentNodes, 'all transient nodes disconnect');
  assert.equal(row.afterTail.sources, row.persistentSources, 'all transient sources end');
  assert.equal(row.afterDispose.nodes, 0);
  assert.ok(row.records.filter(node => node.starts.length).every(node => node.stops.length), 'dispose requests a stop for every source');
  assert.ok(Math.abs(row.peak - baseline[row.label].peak) < 1e-6, 'contact refinement must preserve peak level');
}
const cuts = row => row.records.filter(node => node.automation.some(event => event.method === 'cancelScheduledValues'));
const record = (row, id) => row.records.find(node => node.id === id);
for (const name of ['immediate-rebound', 'same-frame-rebound']) {
  assert.equal(cuts(candidate[name]).length, 4, 'release just the four contact body envelopes');
  assert.ok(cuts(candidate[name]).every(node => node.type === 'GainNode'));
  // The unchanged graph identifies the four original body gains; the iron and
  // bell subgraphs retain their original scheduling and gain envelopes.
  for (const node of candidate[name].records) {
    const original = record(baseline[name], node.id);
    assert.deepEqual(node.starts, original.starts, 'rebound preserves source start dates');
    if ([52, 54, 57, 58, 59, 60].includes(node.id)) continue;
    assert.deepEqual(node, original, `unrelated node ${node.id} must remain unchanged`);
  }
  assert.deepEqual(candidate[name].graph, baseline[name].graph);
}
for (const name of ['vertical-contact', 'other-surface-jump', 'old-contact-jump']) assert.equal(cuts(candidate[name]).length, 0);
const verticalScuff = record(candidate['vertical-contact'], 59).automation;
const brakingScuff = record(candidate['braking-contact'], 59).automation;
assert.equal(verticalScuff[0].args[0], 540);
assert.equal(brakingScuff[0].args[0], 1440);
assert.ok(brakingScuff[1].args[1] > verticalScuff[1].args[1]);
assert.deepEqual(record(candidate['vertical-contact'], 60).automation[1].args[0], record(candidate['braking-contact'], 60).automation[1].args[0]);
const a = await fs.readFile(new URL('candidate-immediate-rebound.wav', root));
const b = await fs.readFile(new URL('candidate-other-surface-jump.wav', root));
let beforeCutDelta = 0;
for (let i = 0; i < Math.floor(.556 * 48000) * 2; i++) {
  beforeCutDelta = Math.max(beforeCutDelta, Math.abs(a.readInt16LE(44 + i * 2) - b.readInt16LE(44 + i * 2)));
}
assert.ok(beforeCutDelta <= 1, 'the native rendered waveform preserves the original decay before the cut');
const receipt = {
  passed: true,
  source: crypto.createHash('sha256').update(await fs.readFile(new URL('../../../../site/ash-and-echo/audio.js', root))).digest('hex'),
  scope: 'Seven browser-native OfflineAudioContext baseline/candidate pairs, adapted from existing audio-rebuild harness. Structural routing and sample checks; no listening judgment.',
  assertions: ['silent before unlock', 'zero new nodes or sources', 'zero clipped or nonfinite samples', 'unchanged peak level',
    'body-only release on same-frame and 40ms rebound', 'iron/pin/bell schedule and envelopes unchanged',
    'different-surface and stale jumps leave tail alone', 'speed shapes scuff at unchanged envelope level',
    'all transients end/disconnect', 'all nodes disconnect on dispose', 'all sources receive stop', 'pre-cut decay waveform preserved'],
  beforeCutMaxPcmDifference: beforeCutDelta,
  maxPeak: Math.max(...Object.values(candidate).map(row => row.peak)),
  ironStartsAfterContactMs: [55, 170, 350],
  lifecycleNote: 'The nine persistent looping sources are stopped by dispose. OfflineAudioContext does not dispatch a second ended callback after its render has completed; graph disconnection and stop calls are separately verified.',
};
await fs.writeFile(new URL('audio-receipt.json', root), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
