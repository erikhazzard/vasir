import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { launchChrome, startVariantServer } from '../threejs-water-ripples-performance/lib/browser.mjs';

// Focused evidence for Core Idea refresh. Reuse the shared browser and report
// surfaces; no model requests, independent scores, or alternate presentation.
const { values } = parseArgs({ options: { url: { type: 'string' }, site: { type: 'string' }, output: { type: 'string' } } });
assert.ok(values.output && Boolean(values.url) !== Boolean(values.site), 'Use --output and exactly one of --url or --site.');
const output = path.resolve(values.output); fs.mkdirSync(output, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const server = values.site ? await startVariantServer(new Map([['candidate', path.resolve(values.site)]])) : null;
const baseUrl = values.url || server.urlFor('candidate');
const benchmarkIds = ['storytelling-core-idea-refresh'];
const evidence = { kind: 'writing-refresh-browser-evidence', schemaVersion: 1, baseUrl, status: 'running', checks: [], captures: [], loadedFiles: [] };

function inspectReport() {
  const data = window.VASIR_WRITING, archive = window.VASIR_WRITING_RESPONSES;
  const selectedCase = document.querySelector('[data-writing-case]')?.value || data.cases[0].id;
  const failures = [], rows = [...document.querySelectorAll('[data-report-setting-id]')];
  const numericText = node => Number(node?.textContent.replace(/[^0-9.-]/g, ''));
  if (rows.length !== data.settings.length) failures.push('model-count');
  for (const row of rows) for (const condition of ['baseline', 'skill']) {
    const cell = data.caseResults.find(cell => cell.settingId === row.dataset.reportSettingId && cell.caseId === selectedCase && cell.condition === condition);
    const answer = archive.responses.find(answer => answer.settingId === cell?.settingId && answer.caseId === selectedCase && answer.condition === condition);
    const scope = row.querySelector(`[data-condition="${condition}"]`);
    const displayed = row.querySelector(condition === 'skill' ? '.model-preview__score--treatment' : '.model-preview__score');
    if (!cell || !answer || numericText(displayed) !== cell.score) failures.push(`score:${row.dataset.reportSettingId}:${condition}`);
    if (scope?.querySelector('[data-output-text] code')?.textContent !== answer?.outputText) failures.push(`answer:${row.dataset.reportSettingId}:${condition}`);
    const reviews = [...scope?.querySelectorAll('[data-judge-review]') || []];
    if (reviews.length !== 2) failures.push(`judge-count:${condition}`);
    for (const [index, review] of reviews.entries()) {
      const source = answer.judgments[index];
      if (numericText(review.querySelector('[data-judge-score]')) !== Number(source.score.toFixed(1))) failures.push(`judge-score:${index}`);
      for (const dimension of data.scoreBasis.dimensions) {
        const rating = review.querySelector(`[data-dimension-id="${dimension.id}"] td`);
        if (Number(rating?.textContent) !== source.dimensions[dimension.id].rating) failures.push(`dimension:${dimension.id}`);
        if (review.querySelector(`[data-dimension-id="${dimension.id}"] [data-dimension-reason]`)?.textContent !== source.dimensions[dimension.id].reason) failures.push(`reason:${dimension.id}`);
      }
      if (review.textContent.includes('Separate dimension reasons were not recorded')) failures.push('missing-reasons-notice');
    }
  }
  const openInspection = [...document.querySelectorAll('details[open]')].filter(node => !node.classList.contains('preview-disclosure'));
  if (openInspection.length) failures.push('initial-inspection-open');
  if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('horizontal-overflow');
  return { benchmarkId: data.benchmarks[0].id, selectedCase, rowCount: rows.length, failures };
}

try {
  for (const viewport of [{ width: 1440, height: 1000, dpr: 1 }, { width: 390, height: 844, dpr: 1 }]) {
    const browser = await launchChrome({ viewport }), client = browser.client;
    const errors = [], networkResponses = new Map(), loaded = [];
    client.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
    await client.send('Network.enable', { maxTotalBufferSize: 64 * 1024 * 1024, maxResourceBufferSize: 32 * 1024 * 1024, enableDurableMessages: true });
    client.on('Network.responseReceived', event => {
      if (/\/(?:app|benchmark-report|data|writing-data|writing-responses)\.js(?:\?|$)/.test(event.response.url)) networkResponses.set(event.requestId, event.response.url);
    });
    client.on('Network.loadingFinished', event => {
      if (!networkResponses.has(event.requestId)) return;
      const url = networkResponses.get(event.requestId);
      loaded.push(client.send('Network.getResponseBody', { requestId: event.requestId }).then(response => {
        const bytes = Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
        return { url, bytes: bytes.length, sha256: hash(bytes) };
      }));
    });
    const navigate = async (filename, fragment, ready) => {
      const url = new URL(filename, baseUrl); url.hash = fragment;
      await client.send('Page.navigate', { url: url.href });
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if (await client.evaluate(`document.readyState === 'complete' && (${ready})`).catch(() => false)) { await client.evaluate('document.fonts.ready'); return; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`Report did not become ready: ${url}`);
    };
    const capture = async name => {
      const result = await client.send('Page.captureScreenshot', { format: 'png' });
      const bytes = Buffer.from(result.data, 'base64'), filename = `${viewport.width}-${name}.png`;
      fs.writeFileSync(path.join(output, filename), bytes);
      evidence.captures.push({ path: filename, width: viewport.width, height: viewport.height, bytes: bytes.length, sha256: hash(bytes) });
    };
    try {
      for (const benchmarkId of benchmarkIds) {
        await navigate('benchmark-report.html', benchmarkId, `window.VASIR_WRITING?.benchmarks?.[0]?.id === ${JSON.stringify(benchmarkId)} && document.querySelector('[data-report-setting-id]')`);
        const cases = await client.evaluate('window.VASIR_WRITING.cases.map(task => task.id)');
        for (const caseId of cases) {
          await client.evaluate(`(() => { const picker = document.querySelector('[data-writing-case]'); if (picker) { picker.value = ${JSON.stringify(caseId)}; picker.dispatchEvent(new Event('change', { bubbles: true })); } })()`);
          const checked = await client.evaluate(`(${inspectReport.toString()})()`);
          assert.deepEqual(checked.failures, [], JSON.stringify(checked));
          evidence.checks.push({ width: viewport.width, ...checked });
        }
        await client.evaluate(`(() => { const picker = document.querySelector('[data-writing-case]'); if (picker) { picker.value = ${JSON.stringify(cases[0])}; picker.dispatchEvent(new Event('change', { bubbles: true })); } })()`);
        await capture(benchmarkId);
        await client.evaluate(`document.querySelector('details.model-run > summary').click()`);
        await client.evaluate(`document.querySelector('.model-run[open] .model-run__judging > summary').click()`);
        const inspection = await client.evaluate(`(() => { const run = document.querySelector('.model-run[open]'); return { outputVisible: run.querySelector('[data-output-text]').getBoundingClientRect().height > 0, judgeVisible: run.querySelector('[data-judge-review]').getBoundingClientRect().height > 0, promptClosed: !run.querySelector('.model-run__prompt').open }; })()`);
        assert.deepEqual(inspection, { outputVisible: true, judgeVisible: true, promptClosed: true });
        await client.evaluate(`document.querySelector('.model-run[open] [data-creation-judge-evidence] > summary').click()`);
        await client.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
        assert.equal(await client.evaluate(`(() => { const node = document.querySelector('.model-run[open] [data-creation-judge-evidence]'); const request = window.VASIR_WRITING_RESPONSES.judgeRequests.find(request => request.id === node.dataset.creationJudgeEvidence); return node.querySelector('[data-creation-original-review] code')?.textContent === request.outputText; })()`), true);
        evidence.checks.push({ width: viewport.width, benchmarkId, inspection, originalReviewExact: true });
        await client.evaluate(`document.querySelector('details.model-run[open]').scrollIntoView({ behavior: 'instant', block: 'start' })`);
        await capture(`${benchmarkId}-inspection`);
      }
      await navigate('index.html', 'capabilities/writing/benchmarks', `window.VASIR_WRITING_CATEGORY && document.querySelector('#capability-benchmarks:not([hidden]) .benchmark-ledger__row')`);
      const catalog = await client.evaluate(`({ ids: [...document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row')].map(row => row.dataset.benchmarkId), aggregateIds: window.VASIR_WRITING_CATEGORY.writingCategory.activeBenchmarkIds, overflow: document.documentElement.scrollWidth > innerWidth + 1 })`);
      assert.deepEqual(catalog.ids, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery', ...benchmarkIds]);
      assert.deepEqual(catalog.aggregateIds, ['storytelling-core-idea', 'storytelling-plot-twists', 'storytelling-magic-discovery']);
      assert.equal(await client.evaluate(`JSON.stringify(window.VASIR_WRITING_CATEGORY).includes('storytelling-mmorpg-narrative')`), false);
      assert.equal(catalog.overflow, false); assert.deepEqual(errors, []);
      evidence.checks.push({ width: viewport.width, catalog }); await capture('writing-catalog');
      evidence.loadedFiles.push(...await Promise.all(loaded));
    } finally { await browser.close(); }
  }
  evidence.status = 'passed';
} catch (error) {
  evidence.status = 'failed'; evidence.error = error.stack;
  throw error;
} finally {
  fs.writeFileSync(path.join(output, 'browser-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await server?.close();
}
process.stdout.write(JSON.stringify({ status: evidence.status, checks: evidence.checks.length, captures: evidence.captures.length }) + '\n');
