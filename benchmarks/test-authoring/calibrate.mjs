/** @fileoverview Qualifies the frozen Redis test-authoring instrument with positive and negative controls. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, sha256, writeJson } from '../backend-testing/fixture.mjs';
import { evaluateSubmission, runTests } from '../backend-testing/verify.mjs';
import { CASE_ID, TEST_PATH } from './prepare.mjs';

const caseRoot = path.dirname(fileURLToPath(import.meta.url));
const weakSource = `import assert from 'node:assert/strict';
import { createQueue } from '../../../../../src/adapters/queue.js';
import { createQueueTestContext } from '../../../../benchmark-support/queue-runtime.js';
describe('uninformative queue control', function () {
  let context;
  before(async () => { context = await createQueueTestContext('weak-control'); });
  beforeEach(async () => { await context.reset(); });
  after(async () => { await context?.close(); });
  it('only checks that a queue object exists and a fixture equals itself', async () => {
    const queue = await createQueue({ env: context.env, redis: context.redis, redisVisibilityTimeoutSeconds: 120 });
    const fixture = { jobId: 'circular-expectation' };
    assert.ok(queue); assert.deepEqual(fixture, fixture);
  });
});
`;
const hookSource = `import assert from 'node:assert/strict';
describe('hook failure negative control', function () {
  before(() => { assert.fail('intentional setup assertion, not behavioral detection'); });
  it('never reaches the queue', () => { assert.equal(1, 1); });
});
`;

export async function calibrate(roundRoot) {
  roundRoot = path.resolve(roundRoot);
  const fixture = await readJson(path.join(roundRoot, 'fixture/manifest.json'));
  const config = await readJson(fixture.privateConfigPath);
  const outputRoot = path.join(roundRoot, 'calibration');
  const references = [
    ['reference', await fs.readFile(path.join(caseRoot, 'reference.spec.js'), 'utf8')],
    ['tautological', weakSource], ['hook-failure', hookSource],
  ];
  const results = {};
  for (const [name, source] of references) {
    const submissionDir = path.join(outputRoot, `${name}-submission`);
    await fs.mkdir(path.dirname(path.join(submissionDir, TEST_PATH)), { recursive: true });
    await fs.writeFile(path.join(submissionDir, TEST_PATH), source);
    results[name] = await evaluateSubmission({ fixture, submissionDir, outputDir: path.join(outputRoot, name), rowId: `calibration-${name}` });
  }
  const reference = results.reference;
  const restored = await runTests({ fixture, workspace: path.join(outputRoot, 'reference/workspace'),
    testFiles: [TEST_PATH], outputDir: path.join(outputRoot, 'restored') });
  const executionsValid = reference.status === 'valid' && reference.controlRuns.every(run => run.status === 'pass' && run.cleanupStatus === 'pass')
    && restored.status === 'pass' && reference.faultRuns.length === config.faults.length
    && reference.faultRuns.every(run => run.status === 'candidate-detection' && run.assertions.length > 0);
  const negativeControlsValid = results.tautological.status === 'valid'
    && results.tautological.faultRuns.length === config.faults.length
    && results.tautological.faultRuns.every(run => run.status === 'survived')
    && results['hook-failure'].status === 'invalid' && results['hook-failure'].faultRuns.length === 0
    && results['hook-failure'].controlRuns.every(run => run.assertions.length === 0 && run.status === 'execution-failure');
  const isolation = await readJson(path.join(outputRoot, 'reference/control-1/isolation.json'));
  const calibration = {
    schemaVersion: 1, caseId: CASE_ID, sourceHash: fixture.sourceHash, createdAt: new Date().toISOString(),
    valid: executionsValid && negativeControlsValid && isolation.status === 'pass',
    reviewStatus: 'pending', executionsValid, negativeControlsValid,
    reference, restored, negativeControls: { tautological: results.tautological, hookFailure: results['hook-failure'] }, isolation,
    faults: config.faults.map(fault => ({ id: fault.id, label: fault.label, calibrated: reference.faultRuns.some(run => run.faultId === fault.id && run.status === 'candidate-detection'),
      reviewStatus: 'pending', sha256: sha256(JSON.stringify(fault)) })),
    claimBoundary: 'Real standalone Redis queue service boundary; finite surgical faults, no SQS, cluster execution or full application journey claim.',
  };
  await writeJson(path.join(outputRoot, 'calibration.json'), calibration);
  return calibration;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await calibrate(process.argv[2]);
  console.log(JSON.stringify({ valid: result.valid, reviewStatus: result.reviewStatus,
    referenceControls: result.reference.controlRuns.map(run => run.status),
    faults: result.reference.faultRuns.map(run => ({ id: run.faultId, status: run.status })),
    negativeControlsValid: result.negativeControlsValid, isolation: result.isolation.status }));
  if (!result.valid) process.exitCode = 1;
}
