import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../site/vasirbenchmark.com/capture.mjs', import.meta.url), 'utf8');
const workflow = runtime.slice(runtime.indexOf('async function auditWorkflows('), runtime.indexOf('\nfunction guideTarget('));
const disclosure = workflow.slice(workflow.indexOf('  const disclosureNode ='), workflow.indexOf("  if (document.querySelector('.development-unavailable'))"));

function checkDisclosure(target, label, rendered = true) {
  const failures = [];
  vm.runInNewContext(disclosure, { target, failures, text: node => node?.textContent || '', visible: () => rendered,
    document: { querySelector: () => ({ textContent: label }) } });
  return failures;
}

test('clean category header still requires visible one-task/one-trial/two-judge scope', () => {
  const label = 'Work Specs v1 · 1 task × 1 trial · 2 judges';
  assert.deepEqual(checkDisclosure('workflows', label), []);
  assert.equal(checkDisclosure('workflows', label, false).length, 1);
  assert.equal(checkDisclosure('workflows', 'Work Specs v1').length, 1);
  assert.equal(checkDisclosure('workflows', '1 task × 1 trial · 1 judge').length, 1);
});

for (const target of ['workflow-report', 'workflow-inspector']) test(target + ' retains the explicit visible uncalibrated qualification', () => {
  const label = 'Work Specs v1 · 1 task × 1 trial · 2 judges · Uncalibrated development';
  assert.deepEqual(checkDisclosure(target, label), []);
  assert.equal(checkDisclosure(target, label.replace(' · Uncalibrated development', '')).length, 1);
  assert.equal(checkDisclosure(target, label, false).length, 1);
});

test('original workflow score basis must explicitly retain uncalibrated status and the pinned panel', () => {
  const code = workflow.slice(workflow.indexOf('  const weights ='), workflow.indexOf('  if (data.entries.length'));
  const check = patch => {
    const failures = [];
    const scoreBasis = { weights: { V: 25, G: 15, A: 20, D: 15, S: 15, C: 10 }, taskCount: 1, trialsPerTask: 1,
      calibrationStatus: 'development-uncalibrated', judges: ['codex:gpt-6-astra@xhigh', 'claude:claude-fable-5-1@max'], gates: null, caps: null, ...patch };
    vm.runInNewContext(code, { data: { scoreBasis }, failures });
    return failures;
  };
  assert.deepEqual(check({}), []);
  for (const patch of [{ calibrationStatus: undefined }, { calibrationStatus: 'calibrated' }, { taskCount: 2 }, { trialsPerTask: 2 }, { judges: ['codex:gpt-6-astra@xhigh'] }, { gates: {} }]) assert.equal(check(patch).length, 1);
});

const reportPath = workflow.slice(workflow.indexOf('    const initialHash = location.hash;'), workflow.indexOf("\n  }\n  [...document.querySelectorAll('button, a[href], summary, select')]"));
async function checkReportPath({ mode = 'models', href, shown = true, named = true, canOpen = true, canRestore = true } = {}) {
  const failures = [], clicks = [];
  const root = 'https://vasirbenchmark.com/releases/candidate/index.html';
  const hash = view => '#capabilities/ai-workflows' + (view === 'models' ? '' : '/' + view);
  const location = { href: root + hash(mode), hash: hash(mode) };
  let selected = mode;
  const link = { href: href || 'https://vasirbenchmark.com/releases/candidate/benchmark-report.html#work-spec-chat', textContent: named ? 'Team chat app' : '' };
  const document = {
    querySelector(selector) {
      if (selector.includes('aria-selected')) return { dataset: { capabilityMode: selected } };
      const next = selector.match(/data-capability-mode="([^"]+)"/)?.[1];
      if (!next) return null;
      return { click() { clicks.push(next); if ((next === 'benchmarks' && !canOpen) || (next !== 'benchmarks' && !canRestore)) return;
        selected = next; location.hash = hash(next); location.href = root + location.hash; } };
    },
    querySelectorAll: () => [link]
  };
  const execute = vm.runInNewContext('(async () => { let disclosureReportHref = null; ' + reportPath + '\nreturn disclosureReportHref; })', {
    mode, failures, document, location, URL, settle: async () => {}, text: node => node?.textContent || '', visible: node => !!node && shown && selected === 'benchmarks'
  });
  const disclosureReportHref = await execute();
  return { failures, clicks, disclosureReportHref, selected, hash: location.hash };
}

for (const mode of ['models', 'benchmarks', 'efficiency']) test(mode + ' exposes the same-release report through a visible Benchmark tests link and restores the initial route', async () => {
  const result = await checkReportPath({ mode });
  assert.deepEqual(result.failures, []);
  assert.equal(result.disclosureReportHref, 'https://vasirbenchmark.com/releases/candidate/benchmark-report.html#work-spec-chat');
  assert.equal(result.selected, mode);
  assert.deepEqual(result.clicks, mode === 'benchmarks' ? [] : ['benchmarks', mode]);
});

for (const [name, options] of [
  ['hidden report', { shown: false }], ['unnamed report', { named: false }], ['inaccessible Benchmark tests', { canOpen: false }],
  ['different origin', { href: 'https://example.com/releases/candidate/benchmark-report.html#work-spec-chat' }],
  ['different release', { href: 'https://vasirbenchmark.com/releases/old/benchmark-report.html#work-spec-chat' }],
  ['different benchmark', { href: 'https://vasirbenchmark.com/releases/candidate/benchmark-report.html#hyper-scale-chat' }],
  ['query substitution', { href: 'https://vasirbenchmark.com/releases/candidate/benchmark-report.html?score=other#work-spec-chat' }]
]) test('workflow disclosure rejects ' + name, async () => {
  const result = await checkReportPath(options);
  assert.ok(result.failures.some(failure => /not inspectable/.test(failure)));
  assert.equal(result.disclosureReportHref, null);
  assert.equal(result.selected, 'models');
});

test('workflow disclosure rejects failure to restore the requested capture view', async () => {
  const result = await checkReportPath({ canRestore: false });
  assert.ok(result.failures.some(failure => /did not restore/.test(failure)));
});

test('each category capture follows the actual report, runs full provenance/disclosure audit, and restores the requested page', () => {
  const runner = runtime.slice(runtime.indexOf('  if (isWorkflowCapture && !isReportCapture) {'), runtime.indexOf("  if (captureTarget === 'report' || captureTarget === 'workflow-report') {"));
  assert.match(runner, /Page\.navigate', \{ url: audit\.disclosureReportHref \}/);
  assert.match(runner, /Boolean\(window\.VASIR_RESPONSES\)/);
  assert.ok(runner.includes("auditWorkflows.toString() + ')(\"workflow-report\")'"));
  assert.match(runner, /if \(reportAudit\.failures\.length\) throw new Error/);
  assert.match(runner, /Page\.navigate', \{ url: pageUrl\.href \}/);
  assert.ok(workflow.includes('Full judge assessment or citations changed.'));
  assert.ok(workflow.includes('Effective prompt was changed, reordered, or truncated.'));
});
