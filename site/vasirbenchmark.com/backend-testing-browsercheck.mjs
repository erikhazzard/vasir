import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, startVariantServer } from '../../benchmarks/threejs-water-ripples-performance/lib/browser.mjs';
import { validateBackendTestingPublication } from '../../cli/eval/backend-testing-publication.js';
import { validateBackendTestingCompactRound, validateBackendTestingCompactPublication, validateBackendTestingCompactFiles } from '../../cli/eval/backend-testing-compact-publication.js';
import { validateTestAuthoringRound, validateTestAuthoringPublication, validateTestAuthoringFiles } from '../../cli/eval/test-authoring-publication.js';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), args[index + 1]]);
  return pairs;
}, []));
assert.ok(options.url && options['output-dir'], 'Usage: backend-testing-browsercheck.mjs --url URL --output-dir DIR [--width 1440 --height 1000]');
const benchmarkId = options.benchmark || 'backend-testing';
assert.ok(['backend-testing', 'test-authoring'].includes(benchmarkId));
const authoring = benchmarkId === 'test-authoring';
const reportLink = authoring ? '[data-test-authoring-report-link]' : '[data-testing-report-link]';
const publicationKey = authoring ? 'testAuthoring' : 'executableTesting';
const requestedUrl = new URL(options.url);
assert.ok(['https:', 'file:'].includes(requestedUrl.protocol) || (requestedUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(requestedUrl.hostname)), 'Use HTTPS, a file preview, or local HTTP.');
// Serve file previews over loopback so fonts retain the site's normal HTTP behavior.
const previewRoot = requestedUrl.protocol === 'file:' ? dirname(fileURLToPath(requestedUrl)) : null;
const previewServer = previewRoot ? await startVariantServer([['preview', previewRoot]]) : null;
const baseUrl = previewServer ? new URL(previewServer.urlFor('preview')) : requestedUrl;
const previewState = previewRoot ? await readFile(resolve(previewRoot, 'preview-state.json'), 'utf8').then(JSON.parse).catch(() => null) : null;
const width = Number(options.width || 1440), height = Number(options.height || 1000);
assert.ok(Number.isInteger(width) && width >= 320 && Number.isInteger(height) && height >= 400);
const output = resolve(options['output-dir']);
await mkdir(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const harnessSha256 = sha256(await readFile(new URL(import.meta.url)));
const checks = [], screenshots = [], failures = [], runtimeErrors = [], networkErrors = [], overflow = [];
const responses = new Map(), requests = new Map(), captures = [];
const delay = ms => new Promise(done => setTimeout(done, ms));
const browser = await launchChrome({ viewport: { width, height, dpr: 1 } });
const { client } = browser;
const evaluate = expression => client.evaluate(expression, { timeoutMs: 30000 });
const inspect = (fn, argument) => evaluate(`(${fn})(${JSON.stringify(argument ?? null)})`);
const check = (id, passed, evidence) => {
  checks.push({ id, passed: Boolean(passed), evidence });
  assert.ok(passed, `${id}: ${JSON.stringify(evidence)}`);
};
const waitFor = async (predicate, label) => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await predicate().catch(() => false)) return;
    await delay(80);
  }
  throw new Error(`Timed out: ${label}`);
};
const pageUrl = (file, hash = '') => { const url = new URL(file, baseUrl); url.hash = hash; return url.href; };
const sourcePath = value => { const pathname = new URL(value).pathname, release = pathname.match(/\/releases\/[^/]+\/(.+)$/); return release ? release[1] : pathname.slice(new URL('./', baseUrl).pathname.length); };
const drain = async () => { let size; do { size = captures.length; await Promise.all(captures); } while (size !== captures.length); };
const settled = () => evaluate('(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));})()');
const readMissedBugMarkers = () => inspect(() => [...document.querySelectorAll('[data-testing-taste-setting]')].map(row => {
  const summary = row.querySelector('.model-preview__row'), plot = summary.querySelector('.model-preview__plot');
  return {configurationId: row.dataset.testingTasteSetting, description: plot.getAttribute('aria-label'), markers: [...plot.querySelectorAll('[data-testing-missed-bugs]')].map(marker => {
    const condition = marker.dataset.testingMissedBugs, dot = plot.querySelector(`.model-preview__mark--${condition === 'none' ? 'baseline' : 'treatment'}`), note = summary.querySelector(`[data-testing-missed-bug-note="${condition}"]`);
    const rectangle = marker.getBoundingClientRect(), target = dot.getBoundingClientRect(), color = getComputedStyle(marker).color;
    const [red, green, blue] = color.match(/[\d.]+/g).map(Number);
    return {condition, count:Number(marker.dataset.missedCount), title:marker.title, label:note?.textContent.trim(), visible:rectangle.width > 0 && rectangle.height > 0 && note?.getBoundingClientRect().height > 0, red:red > green && red > blue, sameLabelColor:note && getComputedStyle(note).color === color, horizontalOffset:rectangle.x + rectangle.width / 2 - target.x - target.width / 2, verticalOffset:rectangle.y + rectangle.height / 2 - target.y - target.height / 2};
  })};
}));
const missedBugMarkersMatch = (readings, expected) => readings.every(row => {
  const markers = expected.filter(item => item.configurationId === row.configurationId);
  return row.markers.length === markers.length && markers.every(item => {
    const marker = row.markers.find(value => value.condition === item.condition), label = `${item.count} bug${item.count === 1 ? '' : 's'} missed`, description = `${item.condition === 'none' ? 'Minimal' : 'Skill'}: ${label}`;
    return marker && marker.count === item.count && marker.title === description && marker.label === label && marker.visible && marker.red && marker.sameLabelColor && Math.abs(marker.horizontalOffset) < 1 && Math.abs(marker.verticalOffset) < 48 && (item.condition === 'none' ? marker.verticalOffset > 0 : marker.verticalOffset < 0) && row.description.includes(description);
  });
}) && expected.every(item => readings.some(row => row.configurationId === item.configurationId));
const checkMissedBugScenarios = async publication => {
  const [first,second] = publication.overall.summaries.map(row=>row.configurationId);
  const expected = [{configurationId:first,condition:'none',count:2},{configurationId:first,condition:'current',count:1},{configurationId:second,condition:'none',count:1}];
  const script = await client.send('Page.addScriptToEvaluateOnNewDocument', {source:`(()=>{let responses;Object.defineProperty(window,'VASIR_RESPONSES',{configurable:true,get(){return responses},set(value){responses=value;const round=value.testAuthoringRound;if(!round)return;for(const row of round.rows){const unresolved=row.configurationId===${JSON.stringify(second)}&&row.condition==='current',count=unresolved?1:${JSON.stringify(expected)}.find(item=>item.configurationId===row.configurationId&&item.condition===row.condition)?.count||0;row.objective.faultDetection=unresolved?null:(6-count)/6;row.objective.faults.forEach((fault,index)=>fault.status=index<count?'survived':'detected');}}});})()`});
  try {
    await navigate(pageUrl('benchmark-report.html', 'test-authoring'), 'document.querySelectorAll("[data-testing-taste-setting]").length === 4 && document.querySelectorAll("[data-testing-missed-bugs]").length === 3');
    const readings = await readMissedBugMarkers();
    assert.ok(missedBugMarkersMatch(readings,expected),`Synthetic missed-bug marker mismatch: ${JSON.stringify({expected,readings})}`);
    checks.find(check=>check.id==='taste-comparison').evidence.missedBugScenarios = {case:'Both conditions, Minimal-only and unresolved execution',browserMemoryOnly:true,expected,readings};
  } finally { await client.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier}); }
};
const stableTarget = selector => inspect(async selector => {
  const deadline = performance.now() + 15000;
  let previous = null, stableFrames = 0;
  while (performance.now() < deadline) {
    await new Promise(done => requestAnimationFrame(done));
    const node = document.querySelector(selector), rect = node.getBoundingClientRect();
    const current = [scrollX, scrollY, rect.x, rect.y, rect.width, rect.height];
    stableFrames = previous && current.every((value, index) => Math.abs(value - previous[index]) < 0.1) ? stableFrames + 1 : 0;
    previous = current;
    if (stableFrames >= 4) {
      const points = [rect, ...node.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(box => {
        const x = box.x + box.width / 2, y = box.y + box.height / 2, hit = document.elementFromPoint(x, y);
        return { x, y, actionable: hit === node || node.contains(hit), hit: hit ? {tag:hit.tagName,id:hit.id,className:hit.className} : null };
      });
      return { ...(points.find(point => point.actionable) || points[0] || { actionable: false }), rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height} };
    }
  }
  throw new Error(`Target did not stop moving: ${selector}`);
}, selector);
const navigate = async (url, predicate) => {
  await drain();
  await client.send('Page.navigate', { url });
  await waitFor(() => evaluate(`document.readyState==='complete' && (${predicate})`), url);
  await settled();
};
const click = async selector => {
  await inspect(selector => document.querySelector(selector).scrollIntoView({ block: 'center', behavior: 'instant' }), selector);
  await settled();
  const target = await stableTarget(selector), { x, y, actionable } = target;
  assert.ok(actionable, `Click target is covered or outside the viewport: ${selector}: ${JSON.stringify(target)}`);
  const point = { x, y };
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
};
const key = async (key, code, windowsVirtualKeyCode) => {
  for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode, ...(type === 'keyDown' && key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
};
const capture = async name => {
  await settled();
  const result = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(result.data, 'base64'), path = `${name}-${width}.png`;
  await writeFile(resolve(output, path), bytes);
  screenshots.push({ path, bytes: bytes.length, sha256: sha256(bytes), width, height });
};
const measureOverflow = async scope => {
  const evidence = await evaluate('({viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth})');
  overflow.push({ scope, ...evidence });
  assert.ok(evidence.scrollWidth <= evidence.viewport + 1, `${scope}: root overflow ${JSON.stringify(evidence)}`);
};
client.on('Runtime.exceptionThrown', event => runtimeErrors.push({ kind: 'exception', detail: event.exceptionDetails.exception?.description || event.exceptionDetails.text }));
client.on('Runtime.consoleAPICalled', event => { if (event.type === 'error') runtimeErrors.push({ kind: 'console', detail: event.args.map(arg => arg.value || arg.description).join(' ') }); });
client.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') runtimeErrors.push({ kind: 'log', detail: entry.text, url: entry.url }); });
client.on('Network.requestWillBeSent', ({ requestId, request }) => requests.set(requestId, request.url));
client.on('Network.responseReceived', ({ requestId, response }) => {
  if (response.status >= 400) networkErrors.push({ url: response.url, status: response.status });
  if (/\.(?:m?js|css)(?:$|\?)/.test(response.url)) responses.set(requestId, response);
});
client.on('Network.loadingFailed', event => networkErrors.push({ url: requests.get(event.requestId), detail: event.errorText, canceled: event.canceled || false }));
client.on('Network.loadingFinished', ({ requestId }) => {
  const response = responses.get(requestId);
  if (!response) return;
  captures.push(client.send('Network.getResponseBody', { requestId }).then(result => {
    const bytes = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
    return { path: sourcePath(response.url), bytes: bytes.length, sha256: sha256(bytes), url: response.url };
  }).catch(error => { networkErrors.push({ url: response.url, detail: `Loaded body unavailable: ${error.message}` }); return null; }));
});

const checkCurrentReport = async publication => {
  validateBackendTestingPublication(publication);
  assert.ok([3, 4].includes(publication.schemaVersion));
  const compact = publication.schemaVersion === 4;
  const paired = await evaluate(compact ? 'window.VASIR_RESPONSES.backendTestingCurrentRound' : 'window.VASIR_RESPONSES.backendTestingPairedRepair');
  const taste = compact ? paired : await evaluate('window.VASIR_RESPONSES.backendTestingTaste || null');
  const combined = publication.overall, testFiles = await evaluate('window.VASIR_RESPONSES.backendTestingFiles');
  assert.equal(combined.schemaVersion,2);
  assert.equal(testFiles.kind,'backend-testing-files');
  assert.equal(testFiles.schemaVersion,1);
  backendTestingOverallSha256=sha256(JSON.stringify(combined));
  backendTestingFilesSha256=sha256(JSON.stringify(testFiles));
  assert.equal(paired.kind, compact ? 'backend-testing-current-round' : 'backend-testing-paired-repair-check');
  if (compact) { validateBackendTestingCompactRound(paired); validateBackendTestingCompactPublication(publication, paired); validateBackendTestingCompactFiles(testFiles, paired); currentRoundSha256=sha256(JSON.stringify(paired)); }
  assert.equal(paired.schemaVersion, 1);
  assert.equal(paired.rows.length, 8);
  assert.equal(paired.summaries.length, 4);
  if (!compact) pairedRepairSha256 = sha256(JSON.stringify(paired));
  const expectedScore = row => row.status === 'invalid' ? 0 : row.status === 'scored' && row.judgments.length === 2 && row.judgments.every(judge => Number.isFinite(judge.score)) ? row.judgments.reduce((sum, judge) => sum + judge.score, 0) / 2 : null;
  const expected = paired.summaries.map(summary => {
    const rows = paired.rows.filter(row => row.configurationId === summary.configurationId);
    const baseline = expectedScore(rows.find(row => row.condition === 'none')), treatment = expectedScore(rows.find(row => row.condition === 'repaired'));
    return { configurationId: summary.configurationId, baseline, treatment, delta: Number.isFinite(baseline) && Number.isFinite(treatment) ? treatment - baseline : null };
  });
  const mean = key => expected.every(summary => Number.isFinite(summary[key])) ? expected.reduce((sum, summary) => sum + summary[key], 0) / expected.length : null;
  const close = (actual, expected) => actual === expected || Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9;
  assert.ok(expected.every(summary => ['baseline', 'treatment', 'delta'].every(key => close(paired.summaries.find(item => item.configurationId === summary.configurationId)[key], summary[key]))));
  const dom = await inspect(() => ({
    context: document.querySelector('.report-context').textContent,
    text: document.getElementById('report-view').textContent,
    heroCount: document.querySelectorAll('.evidence-hero,[data-testing-taste-condition],[data-testing-taste-mean-delta]').length,
    technicalScoreNodes: document.querySelectorAll('[data-testing-technical-setting],[data-testing-paired-row-score],[data-testing-paired-judges],[data-testing-judge-flags]').length,
    methodClosed: !!document.querySelector('#method details') && !document.querySelector('#method details').open,
    oldNodes: document.querySelectorAll('[data-testing-fault-pilot],[data-testing-repair-check],[data-testing-quality-row],#historical-overview,#limitations,#repair-check').length,
    oldSourceKeys: ['suiteQuality', 'faultDetectionPilot', 'repairCheck'].filter(key => key in window.VASIR_DATA.executableTesting).concat(['backendTesting', 'backendTestingRepair', ...(window.VASIR_DATA.executableTesting.schemaVersion === 4 ? ['backendTestingPairedRepair','backendTestingTaste'] : [])].filter(key => key in window.VASIR_RESPONSES)),
    navigation: [...document.querySelectorAll('.report-mast__nav [data-report-section]')].map(node => ({section:node.dataset.reportSection, text:node.textContent, hash:new URL(node.href).hash, visible:!!node.getBoundingClientRect().height})),
    misplacedComparisonLinks: [...document.querySelectorAll('[data-report-section="paired-check"]')].filter(node => !node.closest('.report-mast__nav')).length,
    settings: [...document.querySelectorAll('[data-testing-paired-setting]')].map(node => ({id:node.dataset.testingPairedSetting,closed:!node.querySelector(':scope > details').open})),
    rows: [...document.querySelectorAll('[data-testing-paired-row]')].map(node => ({id:node.dataset.testingPairedRow,execution:node.querySelector('[data-testing-paired-execution]').textContent,protection:node.querySelector('[data-testing-paired-protection]').textContent})),
    outcomes:document.querySelector('[data-testing-paired-outcomes]').textContent,
    mechanism:document.querySelector('[data-testing-paired-mechanism]').textContent,
    cleanup:document.querySelector('[data-testing-paired-cleanup]').textContent,
    evidence:document.querySelector('[data-testing-paired-resources-evidence]').textContent
  }));
  const navigationSections = ['paired-check', 'method'];
  check('paired-repair-comparison', dom.context.includes('Backend testing') && !dom.heroCount && !dom.technicalScoreNodes && dom.methodClosed && !dom.oldNodes && !dom.oldSourceKeys.length && !/Earlier skill|Earlier purchases|fault-detection pilot|original paired study|Technical score|Technical judge ratings/i.test(dom.text) && dom.misplacedComparisonLinks === 0 && dom.navigation.length === 2 && dom.navigation.every((item,index) => item.section === navigationSections[index] && item.hash === `#backend-testing/${item.section}` && item.visible) && dom.settings.length === 4 && dom.settings.every(item=>item.closed) && (compact || ['baseline','treatment','delta'].every(key => close(publication.technical[key], mean(key)))) && close(paired.meanPairedDifference,mean('delta')), {pairedRepairSha256,caseId:paired.caseId,status:paired.status,currentOnly:true,tableOnly:true,technicalScoreNodes:dom.technicalScoreNodes,navigation:dom.navigation,settings:dom.settings,sourceScoresRetained:true});
  const rowsMatch = dom.rows.length === 8 && paired.rows.every(row => {
    const rendered = dom.rows.find(item => item.id === row.id);
    return rendered?.execution === `Behavioral tests: ${row.testStatus} · server shutdown: ${row.cleanupStatus}.` && rendered.protection === `Existing test coverage: ${row.protection} (reviewer assessment).`;
  });
  const removed=paired.rows.filter(row=>row.condition==='none' && row.protection==='lost').length, retained=paired.rows.filter(row=>row.condition==='repaired' && row.protection==='retained').length;
  check('paired-repair-evidence', rowsMatch && dom.outcomes.includes(`${paired.rows.filter(row => row.testStatus === 'pass').length}/8`) && /behavioral assertions/i.test(dom.outcomes) && dom.mechanism.includes(`${removed}/4 Minimal`) && dom.mechanism.includes(`${retained}/4 Skill`) && (compact ? /existing protection/i.test(dom.mechanism) && /reason and cited source/i.test(dom.mechanism) : /separate test for loading an existing save/i.test(dom.mechanism) && /coverage finding from code review/i.test(dom.mechanism)) && dom.cleanup.includes(`${paired.rows.filter(row=>row.cleanupStatus==='failed').length}/8`) && (compact ? /does not by itself establish missing runnable coverage/i.test(dom.cleanup) : /shared websocket shutdown diagnostic/i.test(dom.cleanup) && /separate from the storage cleanup behavior/i.test(dom.cleanup)) && dom.evidence.includes(`${publication.nativeSessions} native sessions`) && dom.evidence.includes(`${publication.knownTokens.toLocaleString('en-US')} recorded tokens`) && dom.evidence.includes(`${publication.usageMissingSessions} sessions lack usage`) && dom.evidence.includes(paired.sourceSha256) && dom.evidence.includes(paired.skillSha256), {pairedRepairSha256,rows:dom.rows,outcomes:dom.outcomes,mechanism:dom.mechanism,cleanup:dom.cleanup,nativeSessions:publication.nativeSessions,knownTokens:publication.knownTokens,usageMissingSessions:publication.usageMissingSessions,sourceSha256:paired.sourceSha256,skillSha256:paired.skillSha256});
  if (taste) {
    assert.equal(taste.kind,compact ? 'backend-testing-current-round' : 'backend-testing-taste-review');
    assert.equal(taste.schemaVersion,compact ? 1 : 2);
    assert.equal(taste.rows.length,8);
    if (!compact) tasteSha256 = sha256(JSON.stringify(taste));
    const selected = JSON.parse(await readFile(new URL('../../benchmarks/backend-testing/publication.json',import.meta.url),'utf8'));
    const rubric = JSON.parse(await readFile(resolve(fileURLToPath(new URL('../../',import.meta.url)),selected.rubric.path),'utf8'));
    assert.deepEqual(taste.scoreBasis.dimensions,rubric.dimensions);
    assert.equal(taste.scoreBasis.namingZeroRule,rubric.namingZeroRule);
    assert.equal(taste.scoreBasis.aggregation,rubric.aggregation);
    const dimensions = rubric.dimensions;
    assert.equal(dimensions.length,7);
    assert.equal(dimensions.reduce((sum,dimension)=>sum+dimension.weight,0),100);
    const format = value => Number.isFinite(value) ? value.toFixed(3) : 'Unscored';
    const original = value => Number.isFinite(value) ? value.toFixed(2) : 'Unscored';
    const difference = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(3)}` : 'Unscored';
    const scoreFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const quality = value => Number.isFinite(value) ? scoreFormatter.format(value) : 'Unscored';
    const points = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${scoreFormatter.format(value)} pts` : 'Unscored';
    const weighted = readings => readings.length === 7 && dimensions.every(dimension=>Number.isFinite(readings.find(item=>item.id===dimension.id)?.score))
      ? dimensions.reduce((sum,dimension)=>sum+readings.find(item=>item.id===dimension.id).score*dimension.weight,0)/100 : null;
    const rawRatingsValid = readings => readings.every(reading=>reading.score === null || Number.isFinite(reading.score) && reading.score >= 0 && reading.score <= 1 && Math.abs(reading.score*100-Math.round(reading.score*100)) < 1e-8);
    const panel = ratings => ratings.length === 2 && ratings.every(Number.isFinite) ? {score:ratings.reduce((sum,rating)=>sum+rating,0)/2,range:{minimum:Math.min(...ratings),maximum:Math.max(...ratings)}} : {score:null,range:null};
    const rangeMatches = (actual,expected) => expected === null ? actual === null || actual?.minimum === null && actual?.maximum === null : close(actual?.minimum,expected.minimum) && close(actual?.maximum,expected.maximum);
    const tasteExpected = taste.rows.map(row => {
      for (const judge of row.judgments) {
        assert.ok(rawRatingsValid(judge.dimensions),'Suite dimension ratings must retain the raw 0.01 resolution.');
        assert.ok(close(judge.score,weighted(judge.dimensions)),'Judge suite total must equal the fixed weighted dimensions.');
        for (const file of judge.files || []) {
          assert.ok(rawRatingsValid(file.dimensions),'File dimension ratings must retain the raw 0.01 resolution.');
          assert.ok(close(file.score,weighted(file.dimensions)),'File total must equal its own fixed weighted dimensions.');
        }
      }
      const overall = panel(row.judgments.map(judge=>judge.score));
      assert.ok(close(row.score,overall.score) && rangeMatches(row.range,overall.range));
      const profile = dimensions.map(dimension=>({id:dimension.id,...panel(row.judgments.map(judge=>judge.dimensions.find(item=>item.id===dimension.id)?.score))}));
      assert.equal(row.dimensions.length,7);
      assert.ok(profile.every(dimension=>{const reading=row.dimensions.find(item=>item.id===dimension.id);return close(reading?.score,dimension.score)&&rangeMatches(reading?.range,dimension.range);}));
      return {id:row.id,configurationId:row.configurationId,condition:row.condition,score:overall.score,dimensions:profile};
    });
    const expectedSummaries = taste.summaries.map(summary => {
      const rows = tasteExpected.filter(row=>row.configurationId===summary.configurationId), baselineRow=rows.find(row=>row.condition==='none'),treatmentRow=rows.find(row=>row.condition==='repaired');
      const pairedReading = (baseline,treatment)=>({baseline,treatment,delta:Number.isFinite(baseline)&&Number.isFinite(treatment)?treatment-baseline:null});
      const profile = dimensions.map(dimension=>({id:dimension.id,...pairedReading(baselineRow.dimensions.find(item=>item.id===dimension.id).score,treatmentRow.dimensions.find(item=>item.id===dimension.id).score)}));
      assert.equal(summary.dimensions.length,7);
      assert.ok(profile.every(dimension=>['baseline','treatment','delta'].every(key=>close(summary.dimensions.find(item=>item.id===dimension.id)?.[key],dimension[key]))));
      return {configurationId:summary.configurationId,...pairedReading(baselineRow.score,treatmentRow.score),dimensions:profile};
    });
    const tasteMean = key => expectedSummaries.every(summary=>Number.isFinite(summary[key])) ? expectedSummaries.reduce((sum,summary)=>sum+summary[key],0)/4 : null;
    assert.ok(expectedSummaries.every(summary=>['baseline','treatment','delta'].every(key=>close(taste.summaries.find(item=>item.configurationId===summary.configurationId)[key],summary[key]))));
    assert.ok(close(taste.baselineMean,tasteMean('baseline')) && close(taste.treatmentMean,tasteMean('treatment')) && close(taste.meanPairedDifference,tasteMean('delta')));
    assert.equal(taste.dimensionSummaries.length,7);
    for (const dimension of dimensions) for (const field of ['baseline','treatment','delta']) {
      const ratings = expectedSummaries.map(summary=>summary.dimensions.find(item=>item.id===dimension.id)[field]);
      const expected = ratings.every(Number.isFinite) ? ratings.reduce((sum,value)=>sum+value,0)/4 : null;
      assert.ok(close(taste.dimensionSummaries.find(item=>item.id===dimension.id)?.[field],expected));
    }
    assert.equal(combined.scoreBasis.maximum,100);
    assert.equal(combined.scoreBasis.adoption,'user-requested-after-reviews');
    assert.equal(combined.scoreBasis.protectionLossMaximum,undefined);
    assert.equal(combined.scoreBasis.zeroCoverageScore,undefined);
    const criteria=combined.scoreBasis.criteria;
    assert.deepEqual(criteria.map(({id,weight,source})=>({id,weight,source})),[
      {id:'preservation',weight:25,source:'protection'},
      {id:'behavioral_coverage',weight:20,source:'dimension'},
      {id:'assertion_quality',weight:15,source:'dimension'},
      {id:'boundary_fidelity',weight:10,source:'dimension'},
      {id:'semantic_naming',weight:10,source:'dimension'},
      {id:'domain_structure',weight:5,source:'dimension'},
      {id:'clarity',weight:5,source:'dimension'},
      {id:'maintenance_economy',weight:5,source:'dimension'},
      {id:'runnable_coverage',weight:5,source:'coverage'}
    ]);
    const combinedExpected=taste.rows.map(row=>{
      const judgments=row.judgments.map(judge=>{
        const contributions=criteria.map(criterion=>{
          const finding=criterion.source==='dimension' ? judge.dimensions.find(item=>item.id===criterion.id) : judge[criterion.source];
          const observed=criterion.source==='dimension' ? finding.score : criterion.source==='protection' ? finding.status==='retained'?1:finding.status==='lost'?0:null : finding.status==='yes'?1:finding.status==='no'?0:null;
          const score=judge.status==='complete' && finding.evidence.length>0 && Number.isFinite(observed) ? observed : null;
          return {id:criterion.id,score,weight:criterion.weight,points:score===null?null:Number((score*criterion.weight).toFixed(2))};
        });
        const score=contributions.every(item=>Number.isFinite(item.points)) ? Number(contributions.reduce((sum,item)=>sum+item.points,0).toFixed(2)) : null;
        const actual=combined.rows.find(item=>item.id===row.id)?.judgments.find(item=>item.judgeConfigurationId===judge.judgeConfigurationId);
        assert.deepEqual(actual.contributions,contributions);
        assert.ok(close(actual.score,score));
        assert.equal(actual.qualityScore,undefined);assert.equal(actual.maximum,undefined);
        assert.equal(actual.qualityReviewSha256,judge.reviewSha256);
        assert.equal(actual.protectionReviewSha256,judge.reviewSha256);
        assert.equal(actual.protectionStatus,judge.status);
        assert.equal(actual.protection,judge.protection.status);
        assert.equal(actual.coverage,judge.coverage.status);
        return {judgeConfigurationId:judge.judgeConfigurationId,contributions,score};
      });
      const score=panel(judgments.map(judge=>judge.score)).score;
      assert.ok(close(combined.rows.find(item=>item.id===row.id)?.score,score));
      const criterionMeans=criteria.map(criterion=>({id:criterion.id,...panel(judgments.map(judge=>judge.contributions.find(item=>item.id===criterion.id).score))}));
      return {id:row.id,configurationId:row.configurationId,condition:row.condition,score,judgments,dimensions:criterionMeans};
    });
    const combinedSummaries=expectedSummaries.map(summary=>{
      const rows=combinedExpected.filter(row=>row.configurationId===summary.configurationId),baselineRow=rows.find(row=>row.condition==='none'),treatmentRow=rows.find(row=>row.condition==='repaired');
      const baseline=baselineRow.score,treatment=treatmentRow.score;
      const profile=criteria.map(criterion=>{
        const baseline=baselineRow.dimensions.find(item=>item.id===criterion.id).score,treatment=treatmentRow.dimensions.find(item=>item.id===criterion.id).score;
        return {id:criterion.id,baseline,treatment,delta:Number.isFinite(baseline)&&Number.isFinite(treatment)?treatment-baseline:null};
      });
      const result={configurationId:summary.configurationId,baseline,treatment,delta:Number.isFinite(baseline)&&Number.isFinite(treatment)?treatment-baseline:null,dimensions:profile};
      assert.ok(['baseline','treatment','delta'].every(key=>close(combined.summaries.find(item=>item.configurationId===summary.configurationId)?.[key],result[key])));
      return result;
    });
    for(const [field,key] of [['baselineMean','baseline'],['treatmentMean','treatment'],['meanPairedDifference','delta']]) {
      const scores=combinedSummaries.map(item=>item[key]),mean=scores.every(Number.isFinite)?scores.reduce((sum,score)=>sum+score,0)/scores.length:null;
      assert.ok(close(combined[field],mean));
    }
    const tasteDom = await inspect(() => {
      const citations = node => [...node.querySelectorAll('[data-testing-taste-citation]')].map(item=>({file:item.dataset.file,version:item.dataset.version,startLine:Number(item.dataset.startLine),endLine:Number(item.dataset.endLine)}));
      const nativeFinding = (judge, name) => { const node=judge.querySelector(`[data-testing-${name}-finding]`); return node ? {status:node.querySelector('h4').textContent.split(': ')[1],reason:node.querySelector(`[data-testing-${name}-reason]`).textContent,evidence:citations(node.querySelector(`[data-testing-${name}-evidence]`))} : null; };
      return {
        title:document.querySelector('#report-title').textContent,
        completion:document.querySelector('[data-testing-taste-completion]').textContent,
        settings:[...document.querySelectorAll('[data-testing-taste-setting]')].map(node=>({id:node.dataset.testingTasteSetting,rank:node.querySelector('.model-preview__identity small').textContent,action:node.querySelector('.model-preview__action').textContent.trim(),scores:[node.querySelector('[data-testing-score-baseline]').textContent,node.querySelector('[data-testing-score-treatment]').textContent],coverageLost:node.querySelector('[data-testing-coverage-loss]')?.textContent || null,delta:node.querySelector('[data-testing-taste-delta]').textContent,plot:node.querySelector('.model-preview__plot')?{baseline:parseFloat(node.querySelector('.model-preview__plot').style.getPropertyValue('--preview-baseline')),treatment:parseFloat(node.querySelector('.model-preview__plot').style.getPropertyValue('--preview-treatment'))}:null,dimensions:[...node.querySelectorAll('[data-testing-taste-profile-dimension]')].map(item=>({id:item.dataset.testingTasteProfileDimension,baseline:item.querySelector('[data-testing-taste-dimension-baseline]').textContent,treatment:item.querySelector('[data-testing-taste-dimension-treatment]').textContent,delta:item.querySelector('[data-testing-taste-dimension-delta]').textContent}))})),
        files:[...document.querySelectorAll('[data-testing-files-row]')].map(row=>({id:row.dataset.testingFilesRow,files:[...row.querySelectorAll('[data-testing-file]')].map(file=>({path:file.dataset.testingFile,sha256:file.dataset.sha256,content:file.querySelector('[data-testing-file-content] code').textContent,open:file.open}))})),
        calculations:[...document.querySelectorAll('[data-testing-score-calculation]')].map(row=>({id:row.dataset.testingScoreCalculation,closed:!row.open,judgments:[...row.querySelectorAll('[data-testing-score-calculation-judge]')].map(judge=>({id:judge.dataset.testingScoreCalculationJudge,final:judge.querySelector('[data-testing-score-final]').textContent,contributions:[...judge.querySelectorAll('[data-testing-score-contribution]')].map(item=>({id:item.dataset.testingScoreContribution,weight:item.querySelector('[data-testing-score-weight]').textContent,score:item.querySelector('[data-testing-score-rating]').textContent,points:item.querySelector('[data-testing-score-points]').textContent}))}))})),
        adoption:document.querySelector('[data-testing-score-adoption]').textContent,
        definition:document.querySelector('[data-testing-score-definition]').textContent,
        closedReviews:[...document.querySelectorAll('[data-testing-taste-reviews]')].map(node=>!node.open),
        rows:[...document.querySelectorAll('[data-testing-taste-row]')].map(node=>({id:node.dataset.testingTasteRow,score:node.querySelector('[data-testing-taste-row-score]').textContent,range:node.querySelector('[data-testing-taste-range]').textContent,rangeExplanation:node.querySelector('.model-run__aggregation-note').textContent,dimensions:[...node.querySelectorAll('[data-testing-taste-row-dimension]')].map(item=>({id:item.dataset.testingTasteRowDimension,score:item.querySelector('[data-testing-taste-dimension-score]').textContent,range:item.querySelector('[data-testing-taste-dimension-range]').textContent})),judges:[...node.querySelectorAll('[data-testing-taste-judge]')].map(judge=>({id:judge.dataset.testingTasteJudge,reviewSha256:judge.dataset.reviewSha256,status:judge.dataset.status,failure:judge.dataset.failure || null,coverage:nativeFinding(judge,'coverage'),protection:nativeFinding(judge,'protection'),reviewStatus:judge.querySelector('[data-testing-taste-review-status]').textContent,score:judge.querySelector('[data-testing-taste-judge-score]').textContent,dimensions:[...judge.querySelectorAll('[data-testing-taste-judge-dimension]')].map(item=>({id:item.dataset.testingTasteJudgeDimension,score:item.querySelector('[data-testing-taste-dimension-score]').textContent,reason:item.querySelector('[data-testing-taste-dimension-reason]').textContent,evidence:citations(item.querySelector('[data-testing-taste-dimension-evidence]')),qualifications:[...item.querySelectorAll('[data-testing-taste-qualification]')].map(qualification=>({finding:qualification.querySelector('[data-testing-taste-qualification-finding]').textContent,evidence:citations(qualification)}))})),files:[...judge.querySelectorAll('[data-testing-taste-file]')].map(file=>({file:file.dataset.testingTasteFile,score:file.querySelector('[data-testing-taste-file-score]').textContent,reason:file.querySelector('[data-testing-taste-file-reason]').textContent,evidence:citations(file.querySelector('[data-testing-taste-file-evidence]')),dimensions:[...file.querySelectorAll('[data-testing-taste-file-dimension]')].map(item=>({id:item.dataset.testingTasteFileDimension,score:item.querySelector('[data-testing-taste-dimension-score]').textContent}))}))}))})),
        method:document.querySelector('[data-testing-taste-method]').textContent,
        namingRule:document.querySelector('[data-testing-taste-naming-rule]').textContent,
        namingDisagreement:document.querySelector('[data-testing-naming-disagreement]')?.textContent || null,
        retry:document.querySelector('[data-testing-taste-retry]') ? {text:document.querySelector('[data-testing-taste-retry]').textContent,attempts:Number(document.querySelector('[data-testing-taste-retry]').dataset.reviewAttempts),seats:Number(document.querySelector('[data-testing-taste-retry]').dataset.reviewerSeats)} : null,
        sourceEvidence:document.querySelector('[data-testing-paired-resources-evidence]').textContent,
        baselineReuse:document.querySelector('[data-testing-baseline-reuse]')?.textContent || null,
        rubric:[...document.querySelectorAll('[data-testing-taste-rubric-dimension]')].map(row=>({id:row.dataset.testingTasteRubricDimension,label:row.querySelector('th').childNodes[0].textContent,weight:row.querySelector('[data-testing-taste-rubric-weight]').textContent,description:row.querySelector('[data-testing-taste-rubric-description]').textContent,anchors:Object.fromEntries([...row.querySelectorAll('[data-testing-taste-rubric-anchor]')].map(item=>[item.dataset.testingTasteRubricAnchor,item.querySelector('span').textContent]))}))
      };
    });
    const ranked=combinedSummaries.slice().sort((a,b)=>(b.treatment ?? -Infinity)-(a.treatment ?? -Infinity));
    check('taste-comparison', tasteDom.title==='Model comparison' && tasteDom.completion.includes('Score /100') && tasteDom.settings.length===4 && ranked.every((summary,index)=>{
      const rendered=tasteDom.settings[index];
      return rendered?.id===summary.configurationId && rendered.rank===`Testing skill rank #${index+1} of 4` && rendered.action==='Inspect run ↓' && rendered.scores[0]===quality(summary.baseline) && rendered.scores[1]===quality(summary.treatment) && rendered.coverageLost===(combined.rows.find(row=>row.configurationId===summary.configurationId&&row.condition==='none').protection==='lost'?'Coverage lost':null) && rendered.delta===points(summary.delta) && (summary.baseline===null ? rendered.plot===null : close(rendered.plot?.baseline,summary.baseline)&&close(rendered.plot?.treatment,summary.treatment)) && rendered.dimensions.length===9 && summary.dimensions.every(dimension=>{
        const reading=rendered.dimensions.find(item=>item.id===dimension.id);
        return reading?.baseline===format(dimension.baseline) && reading.treatment===format(dimension.treatment) && reading.delta===difference(dimension.delta);
      });
    }) && (compact || ['baseline','treatment','delta'].every(key=>close(publication.taste[key],tasteMean(key))) && publication.taste.scoreMaximum===1), {tasteSha256,status:taste.status,displayScale:100,sourceScale:100,backendTestingOverallSha256,weights:criteria.map(({id,weight})=>({id,weight})),settings:tasteDom.settings,expected:ranked});
    const jsonEqual=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
    const evidenceMatch=tasteDom.rows.length===8 && taste.rows.every(row=>{
      const rendered=tasteDom.rows.find(item=>item.id===row.id);
      const final=combinedExpected.find(item=>item.id===row.id),range=panel(final.judgments.map(judge=>judge.score)).range;
      return rendered?.score===quality(final.score) && rendered.range===(range ? `${quality(range.minimum)}–${quality(range.maximum)}` : 'Unscored') && rendered.rangeExplanation.includes(range ? 'This range describes reviewer disagreement' : 'The final score is unscored because both reviews are required') && rendered.dimensions.length===9 && final.dimensions.every(dimension=>{
        const reading=rendered.dimensions.find(item=>item.id===dimension.id);
        return reading?.score===format(dimension.score) && reading.range===(Number.isFinite(dimension.range?.minimum)&&Number.isFinite(dimension.range?.maximum) ? `${original(dimension.range.minimum)}–${original(dimension.range.maximum)}` : 'Unscored');
      }) && rendered.judges.length===row.judgments.length && row.judgments.every(judge=>{
        const reading=rendered.judges.find(item=>item.id===judge.judgeConfigurationId),hasRatings=judge.dimensions.some(item=>Number.isFinite(item.score));
        return reading?.score===quality(final.judgments.find(item=>item.judgeConfigurationId===judge.judgeConfigurationId).score) && reading.reviewSha256===(judge.reviewSha256 || '') && reading.status===judge.status && reading.failure===(judge.failure || null) && reading.reviewStatus===(judge.failure==='timeout' ? 'Review timed out; no ratings returned.' : `Review: ${judge.status}.${judge.score===null ? ' No complete score returned.' : ''}`) && reading.dimensions.length===(hasRatings ? 7 : 0) && (hasRatings ? judge.dimensions : []).every(dimension=>{
          const finding=reading.dimensions.find(item=>item.id===dimension.id);
          return finding?.score===original(dimension.score) && finding.reason===(dimension.reason || 'No rating returned.') && jsonEqual(finding.evidence,dimension.evidence) && jsonEqual(finding.qualifications,dimension.qualifications || []);
        }) && (!compact || (hasRatings ? jsonEqual(reading.coverage,judge.coverage) && jsonEqual(reading.protection,judge.protection) : reading.coverage===null && reading.protection===null)) && reading.files.length===(judge.files || []).length && (judge.files || []).every(file=>{
          const publicFile=reading.files.find(item=>item.file===file.file);
          return publicFile?.score===format(file.score) && publicFile.reason===file.reason && jsonEqual(publicFile.evidence,file.evidence) && publicFile.dimensions.length===7 && file.dimensions.every(dimension=>publicFile.dimensions.find(item=>item.id===dimension.id)?.score===original(dimension.score));
        });
      });
    });
    const rubricMatch=tasteDom.rubric.length===9 && criteria.every(criterion=>{
      const native=dimensions.find(dimension=>dimension.id===criterion.id),rendered=tasteDom.rubric.find(item=>item.id===criterion.id);
      return rendered?.label===criterion.label && rendered.weight===`${criterion.weight}%` && (native ? rendered.description===native.description && jsonEqual(rendered.anchors,native.anchors) : Object.keys(rendered.anchors).sort().join(',')==='0,1' && rendered.description.length>0);
    });
    const filesMatch=tasteDom.files.length===8 && testFiles.rows.length===8 && testFiles.rows.every(row=>{
      const rendered=tasteDom.files.find(item=>item.id===row.id);
      const siblings=testFiles.rows.filter(item=>item.configurationId===row.configurationId);
      const common=siblings.find(item=>item.condition==='none').files.find(file=>siblings.every(item=>item.files.some(other=>other.path===file.path)))?.path;
      const expectedFiles=[...row.files].sort((first,second)=>Number(second.path===common)-Number(first.path===common));
      return rendered?.files.length===row.files.length && expectedFiles.every((file,index)=>{
        const actual=rendered.files[index];
        assert.equal(sha256(Buffer.from(file.content,'utf8')),file.sha256,'Public file digest must match exact source bytes.');
        return actual?.path===file.path && actual.sha256===file.sha256 && actual.content===file.content && actual.open===(index===0);
      });
    });
    const calculationsMatch=tasteDom.calculations.length===8 && combinedExpected.every(row=>{
      const rendered=tasteDom.calculations.find(item=>item.id===row.id);
      return rendered?.closed && rendered.judgments.length===2 && row.judgments.every(judge=>{
        const actual=rendered.judgments.find(item=>item.id===judge.judgeConfigurationId);
        return actual?.final===quality(judge.score) && actual.contributions.length===9 && judge.contributions.every(contribution=>{const observed=actual.contributions.find(item=>item.id===contribution.id);return observed?.weight===`${contribution.weight}%` && observed.score===original(contribution.score) && observed.points===format(contribution.points);});
      });
    });
    let retryMatches=tasteDom.retry===null;
    if(taste.retry) {
      assert.equal(taste.retry.authorization,'user-requested-after-timeout');
      assert.equal(taste.retry.priorStatus,'timeout');
      assert.equal(taste.retry.automaticRetries,0);
      assert.equal(taste.nativeSessions,3);
      assert.equal(new Set(taste.rows.flatMap(row=>row.judgments.map(judge=>judge.judgeConfigurationId))).size,2);
      assert.ok(taste.rows.every(row=>row.judgments.length===2 && row.judgments.some(judge=>judge.judgeConfigurationId===taste.retry.judgeConfigurationId)));
      assert.ok(taste.retry.priorTokens!==null || taste.usageMissingSessions>=1,'Original unknown usage must remain counted.');
      retryMatches=tasteDom.retry?.attempts===3 && tasteDom.retry.seats===2 && tasteDom.retry.text.includes('3 native review attempts fill 2 reviewer seats') && tasteDom.retry.text.includes('retried at the user’s request after a timeout') && tasteDom.retry.text.includes(`${taste.retry.timeoutMs/60000}-minute limit`) && tasteDom.retry.text.includes(`Selected retry: ${taste.retry.status} · 0 automatic retries`) && tasteDom.retry.text.includes('selected two reviews determine the panel; the timeout receipt remains retained') && [taste.retry.amendmentSha256,taste.retry.priorReviewSha256,taste.retry.reviewSha256].every(digest=>tasteDom.sourceEvidence.includes(digest));
    }
    const expectedNamingDisagreement = compact ? `Suite-owned helpers are in scope. Semantic naming ratings differ: ${taste.rows[0].judgments.map(judge => `${judge.judgeConfigurationId.startsWith('codex:') ? 'Astra' : 'Opus'} rated ${taste.rows.filter(row => row.judgments.find(item => item.judgeConfigurationId === judge.judgeConfigurationId).dimensions.find(item => item.id === 'semantic_naming').score === 0).length}/${taste.rows.length} suites 0`).join('; ')}. Both reviewers’ original grades remain in the panel.` : null;
    const namingMatches = tasteDom.namingDisagreement === expectedNamingDisagreement;
    const reuseMatches = !compact || tasteDom.baselineReuse?.includes('4 new Skill author attempts · 4 unchanged Minimal artifacts · 2 new blind reviewers') && tasteDom.baselineReuse.includes('Usage below counts the six new native sessions');
    check('taste-evidence', tasteDom.definition===combined.scoreBasis.aggregation && namingMatches && reuseMatches && retryMatches && evidenceMatch && rubricMatch && filesMatch && calculationsMatch && tasteDom.closedReviews.length===8 && tasteDom.closedReviews.every(Boolean) && tasteDom.method.includes('nine weighted criteria on a 0–100 scale') && tasteDom.method.includes('preservation carrying 25%') && tasteDom.method.includes('Average both reviewer scores') && tasteDom.method.includes('neither imposes a ceiling on the total') && tasteDom.adoption.includes('user requested these final weights after the reviews') && tasteDom.adoption.includes('no new grading was performed') && tasteDom.method.includes('uplift is Skill minus Minimal') && tasteDom.sourceEvidence.includes('Original scores, reviewer reasons and cited file evidence are retained') && tasteDom.namingRule===rubric.namingZeroRule && tasteDom.sourceEvidence.includes(taste.sourceSha256), {tasteSha256,currentRoundSha256,backendTestingOverallSha256,backendTestingFilesSha256,sourceSha256:taste.sourceSha256,files:testFiles.rows.map(row=>({id:row.id,files:row.files.map(file=>({path:file.path,sha256:file.sha256,bytes:Buffer.byteLength(file.content,'utf8')}))})),calculations:tasteDom.calculations,rows:tasteDom.rows,rubric:tasteDom.rubric,namingRule:tasteDom.namingRule,retry:taste.retry || null,retryDisclosure:tasteDom.retry,scope:taste.scope});
  } else assert.equal(publication.taste,null);
  await evaluate('window.scrollTo(0,0)');
  await measureOverflow('Current quality overview');
  await capture('backend-testing-quality-overview');
  const sections=[];
  for (const section of navigationSections) {
    await click(`.report-mast__nav [data-report-section="${section}"]`);
    await waitFor(()=>evaluate(`location.hash===${JSON.stringify(`#backend-testing/${section}`)}`),section);
    await waitFor(()=>inspect(section=>{const top=document.getElementById(section).getBoundingClientRect().top;return top>=-1&&top<innerHeight;},section),`${section} scrolls into view`);
    await stableTarget(`#${section}`);
    sections.push(await inspect(section=>({section,hash:location.hash,top:document.getElementById(section).getBoundingClientRect().top}),section));
    await measureOverflow(`Current ${section}`);
    if (section==='paired-check') await capture('backend-testing-paired-check');
    if (section==='method') {
      assert.ok(await evaluate('document.querySelector("[data-testing-method]").open'));
      await capture('backend-testing-method');
    }
  }
  check('report-section-links',sections.every(item=>item.hash===`#backend-testing/${item.section}`&&item.top<height),sections);
  if(taste?.retry){await click('[data-testing-paired-resources-evidence] > summary');await inspect(()=>document.querySelector('[data-testing-taste-retry]').scrollIntoView({block:'center',behavior:'instant'}));await measureOverflow('Dimension review retry disclosure');await capture('backend-testing-review-retry');await click('[data-testing-paired-resources-evidence] > summary');}
  await click('[data-testing-rubric] > summary');
  await measureOverflow('Frozen quality rubric');
  await capture('backend-testing-rubric');
  await click('[data-testing-rubric] > summary');
  await click('[data-testing-execution] > summary');
  await measureOverflow('Behavioral execution and coverage findings');
  await capture('backend-testing-execution');
  await click('[data-testing-execution] > summary');
  const model='#paired-check .model-run',reviews=`${model} [data-testing-taste-reviews]`;
  await inspect(selector=>{const summary=document.querySelector(`${selector} > summary`);summary.scrollIntoView({block:'center',behavior:'instant'});summary.focus();},model);
  await key('Enter','Enter',13);
  await waitFor(()=>inspect(selector=>document.querySelector(selector).open,model),'Current setting opens with Enter');
  const fileSelector=`${model} [data-testing-file]`,firstFile=await inspect(selector=>{const file=document.querySelector(selector);return {path:file.dataset.testingFile,row:file.closest('[data-testing-files-row]').dataset.testingFilesRow,open:file.open};},fileSelector);
  assert.ok(firstFile.open,'The first test file must be open when inspecting a run.');
  await inspect(selector=>document.querySelector(selector).scrollIntoView({block:'start',behavior:'instant'}),fileSelector);
  await measureOverflow('Exact test-file source');
  await capture('backend-testing-test-files');
  await client.send('Browser.grantPermissions',{origin:new URL(await evaluate('location.href')).origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await click(`${fileSelector} [data-testing-copy-file]`);
  await waitFor(()=>inspect(selector=>document.querySelector(`${selector} [data-testing-copy-file]`).textContent==='Copied',fileSelector),'Test file copied');
  const copied=await evaluate('navigator.clipboard.readText()');
  assert.equal(copied,testFiles.rows.find(row=>row.id===firstFile.row).files.find(file=>file.path===firstFile.path).content,'Copy preserves exact test-file source.');
  const copiedFileSha256=sha256(Buffer.from(copied,'utf8'));
  await click(`${model} [data-testing-score-calculation] > summary`);
  await measureOverflow('Final combined-score calculation');
  await capture('backend-testing-score-calculation');
  await click(`${model} [data-testing-score-calculation] > summary`);
  if (taste) {
    await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-profile]`).scrollIntoView({block:'start',behavior:'instant'}),model);
    await measureOverflow('Seven-dimension model profile');
    await capture('backend-testing-dimension-profile');
    await click(`${model} [data-testing-taste-row-dimensions] > summary`);
    await waitFor(()=>inspect(selector=>document.querySelector(selector).open,`${model} [data-testing-taste-row-dimensions]`),'Dimension means and ranges open');
    await measureOverflow('Dimension reviewer ranges');
    await capture('backend-testing-dimension-ranges');
    await inspect(selector=>{const summary=document.querySelector(`${selector} > summary`);summary.scrollIntoView({block:'center',behavior:'instant'});summary.focus({preventScroll:true});},reviews);
    await key('Enter','Enter',13);
    await waitFor(()=>inspect(selector=>document.querySelector(selector).open,reviews),'Quality judge reviews open with Enter');
    await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-judge][data-status="complete"]`).scrollIntoView({block:'start',behavior:'instant'}),model);
    await measureOverflow('Dimension reviewer reasons');
    await capture('backend-testing-taste-reasons');
    await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-judge][data-status="complete"] [data-testing-taste-judge-dimension="semantic_naming"]`).scrollIntoView({block:'start',behavior:'instant'}),model);
    await measureOverflow('Semantic variable naming rating and evidence');
    await capture('backend-testing-semantic-naming');
    const qualifiedSetting=await inspect(()=>{const qualification=document.querySelector('[data-testing-taste-qualification]');return qualification?.closest('[data-testing-taste-setting]')?.dataset.testingTasteSetting || null;});
    if(qualifiedSetting) {
      const selector=`[data-testing-taste-setting="${qualifiedSetting}"]`;
      const wasOpen=await inspect(selector=>document.querySelector(`${selector} > details`).open,selector);
      if(!wasOpen) await click(`${selector} > details > summary`);
      const disclosure=await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-qualification]`).closest('[data-testing-taste-reviews]').open,selector);
      if(!disclosure) await click(`${selector} [data-testing-taste-reviews] > summary`);
      await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-qualification]`).scrollIntoView({block:'center',behavior:'instant'}),selector);
      await measureOverflow('Source-backed evidence qualification');
      await capture('backend-testing-evidence-qualification');
      if(!wasOpen) await click(`${selector} > details > summary`);
    }
    if (!compact) {
    await click(`${model} [data-testing-taste-file-dimensions] > summary`);
    await waitFor(()=>inspect(selector=>document.querySelector(selector).open,`${model} [data-testing-taste-file-dimensions]`),'File dimension ratings open');
    await inspect(selector=>document.querySelector(`${selector} [data-testing-taste-file]`).scrollIntoView({block:'start',behavior:'instant'}),model);
    await measureOverflow('File dimension ratings and evidence');
    await capture('backend-testing-taste-files');
    } else { await inspect(selector=>document.querySelector(`${selector} [data-testing-coverage-finding]`).scrollIntoView({block:'start',behavior:'instant'}),model); await measureOverflow('Runnable coverage and retained protection evidence'); await capture('backend-testing-coverage-evidence'); }
  }
  // Cancel the page's smooth focus scroll before collapsing a tall review panel.
  await inspect(selector=>{const summary=document.querySelector(`${selector} > summary`);summary.scrollIntoView({block:'center',behavior:'instant'});summary.focus({preventScroll:true});},model);
  await key('Enter','Enter',13);
  await waitFor(()=>inspect(selector=>!document.querySelector(selector).open,model),'Current setting closes with Enter');
  await stableTarget(`${model} > summary`);
  await click('[data-testing-paired-resources-evidence] > summary');
  await waitFor(()=>evaluate('document.querySelector("[data-testing-paired-resources-evidence]").open'),'Current usage evidence opens');
  await measureOverflow('Current method evidence');
  await capture('backend-testing-paired-evidence');
  await click('[data-testing-paired-resources-evidence] > summary');
  check('native-details-keyboard',true,{openedWithEnter:['current setting','quality judge reviews'],closedSettingWithEnter:true,rubricExecutionAndUsageOpenedByClick:true,criterionRangesAndReviewsOpenedByClick:Boolean(taste),dimensionReasonsVisibleAfterDisclosure:Boolean(taste),firstTestFileVisible:true,copiedFile:{path:firstFile.path,sha256:copiedFileSha256}});
};

const checkAuthoringReport = async publication => {
  const round = await evaluate('window.VASIR_RESPONSES.testAuthoringRound');
  const files = await evaluate('window.VASIR_RESPONSES.testAuthoringFiles');
  validateTestAuthoringRound(round); validateTestAuthoringPublication(publication, round); validateTestAuthoringFiles(files, round);
  currentRoundSha256 = sha256(JSON.stringify(round));
  testAuthoringOverallSha256 = sha256(JSON.stringify(publication.overall));
  testAuthoringFilesSha256 = sha256(JSON.stringify(files));
  const incumbent = await evaluate('({executableTesting:window.VASIR_DATA.executableTesting,responses:Object.fromEntries(Object.entries(window.VASIR_RESPONSES).filter(([key])=>key.startsWith("backendTesting")))})');
  const pinned = JSON.parse(await readFile(resolve(options['incumbent-pins'] || '.agents/vasir-evals/test-authoring/round-2026-10-10/incumbent-pins.json'), 'utf8'));
  incumbentBackendSha256 = sha256(JSON.stringify(incumbent.executableTesting));
  assert.equal(incumbentBackendSha256, pinned.executableTesting);
  assert.deepEqual(Object.fromEntries(Object.entries(incumbent.responses).map(([key, value]) => [key, sha256(JSON.stringify(value))])), pinned.responses, 'Incumbent backend evidence must remain exact.');
  const expectedWeights = { fault_detection: 25, behavioral_coverage: 20, assertion_quality: 15, boundary_fidelity: 10, semantic_naming: 10, domain_structure: 5, clarity: 5, maintenance_economy: 5, runnable: 5 };
  assert.deepEqual(Object.fromEntries(publication.overall.scoreBasis.criteria.map(item => [item.id, item.weight])), expectedWeights);
  for (const row of round.rows) for (const judge of row.judgments) {
    const values = Object.entries(expectedWeights).map(([id, weight]) => {
      if (id === 'fault_detection') return row.objective.faultDetection === null ? null : weight * row.objective.faultDetection;
      if (id === 'runnable') return row.objective.runnable === null ? null : weight * row.objective.runnable;
      const finding = judge.dimensions.find(item => item.id === id);
      return judge.status === 'complete' && finding.evidence.length && Number.isFinite(finding.score) ? weight * finding.score : null;
    });
    const expected = values.every(Number.isFinite) ? values.reduce((sum, value) => sum + value, 0) : null;
    const selected = publication.overall.rows.find(item => item.id === row.id).judgments.find(item => item.judgeConfigurationId === judge.judgeConfigurationId);
    assert.ok(selected.score === expected || Number.isFinite(expected) && Math.abs(selected.score - expected) < 1e-9, 'Independent authoring score arithmetic differs.');
  }
  const dom = await inspect(() => {
    const citations = node => [...node.querySelectorAll('[data-testing-taste-citation]')].map(item => ({ file: item.dataset.file, version: item.dataset.version, startLine: Number(item.dataset.startLine), endLine: Number(item.dataset.endLine) }));
    return {
      title: document.querySelector('#report-title').textContent,
      purpose: document.querySelector('[data-testing-taste-completion]').textContent,
      hero: document.querySelectorAll('.evidence-hero,[data-testing-taste-condition],[data-testing-taste-mean-delta]').length,
      protection: document.querySelectorAll('[data-testing-paired-protection],[data-testing-protection-finding],[data-testing-coverage-loss]').length,
      methodClosed: !document.querySelector('[data-testing-method]').open,
      reviewBasis: document.querySelector('[data-testing-review-basis]') ? {text:document.querySelector('[data-testing-review-basis]').textContent,visible:document.querySelector('[data-testing-review-basis]').getBoundingClientRect().height > 0} : null,
      nav: [...document.querySelectorAll('.report-mast__nav [data-report-section]')].map(node => node.dataset.reportSection),
      adoption: document.querySelector('[data-testing-score-adoption]').textContent,
      usage: document.querySelector('[data-testing-paired-resources-evidence]').textContent,
      definition: document.querySelector('[data-testing-score-definition]').textContent,
      sourcePolicy: document.querySelector('[data-testing-source-policy]')?.textContent ?? null,
      detectionCorrection: document.querySelector('[data-testing-detection-correction]')?.textContent ?? null,
      detectionMethod: document.querySelector('[data-testing-taste-method]').textContent,
      namingRule: document.querySelector('[data-testing-taste-naming-rule]').textContent,
      faultCreditRules: [...document.querySelectorAll('[data-testing-fault-credit-rule]')].map(node=>node.textContent),
      faultLabels: [...document.querySelectorAll('[data-testing-objective-fault]')].map(node=>({id:node.dataset.testingObjectiveFault,status:node.dataset.status,heading:node.querySelector('h4').textContent})),
      settings: [...document.querySelectorAll('[data-testing-taste-setting]')].map(node => ({ id: node.dataset.testingTasteSetting, baseline: node.querySelector('[data-testing-score-baseline]').textContent, treatment: node.querySelector('[data-testing-score-treatment]').textContent, delta: node.querySelector('[data-testing-taste-delta]').textContent, closed: !node.querySelector('.model-run').open, profiles: [...node.querySelectorAll('[data-testing-taste-profile-dimension]')].map(item => ({ id: item.dataset.testingTasteProfileDimension, baseline: item.querySelector('[data-testing-taste-dimension-baseline]').textContent, treatment: item.querySelector('[data-testing-taste-dimension-treatment]').textContent, delta: item.querySelector('[data-testing-taste-dimension-delta]').textContent })) })),
      rows: [...document.querySelectorAll('[data-testing-paired-row]')].map(node => ({ id: node.dataset.testingPairedRow, sizeViolation:node.querySelector('[data-testing-file-size-violation]')?.textContent ?? null, objective: [...node.querySelectorAll('[data-testing-objective-fault]')].map(item => ({ id: item.dataset.testingObjectiveFault, status: item.dataset.status, reason: item.querySelector('p').textContent, evidence: citations(item) })), files: [...node.querySelectorAll('[data-testing-file]')].map(item => ({ path: item.dataset.testingFile, sha256: item.dataset.sha256, content: item.querySelector('code').textContent, open: item.open })), reviewsClosed: !node.querySelector('[data-testing-taste-reviews]').open, judges: [...node.querySelectorAll('[data-testing-taste-judge]')].map(judge => ({ id: judge.dataset.testingTasteJudge, sha256: judge.dataset.reviewSha256, status: judge.dataset.status, dimensions: [...judge.querySelectorAll('[data-testing-taste-judge-dimension]')].map(item => ({ id: item.dataset.testingTasteJudgeDimension, score: item.querySelector('[data-testing-taste-dimension-score]').textContent, reason: item.querySelector('[data-testing-taste-dimension-reason]').textContent, evidence: citations(item.querySelector('[data-testing-taste-dimension-evidence]')) })) })) })),
      rubric: [...document.querySelectorAll('[data-testing-taste-rubric-dimension]')].map(item => ({ id: item.dataset.testingTasteRubricDimension, weight: item.querySelector('[data-testing-taste-rubric-weight]').textContent, description: item.querySelector('[data-testing-taste-rubric-description]').textContent })),
      calculations: [...document.querySelectorAll('[data-testing-score-calculation]')].map(node => ({ id: node.dataset.testingScoreCalculation, closed: !node.open, judges: [...node.querySelectorAll('[data-testing-score-calculation-judge]')].map(judge => ({ id: judge.dataset.testingScoreCalculationJudge, contributions: [...judge.querySelectorAll('[data-testing-score-contribution]')].map(item => ({ id: item.dataset.testingScoreContribution, score: item.querySelector('[data-testing-score-rating]').textContent, points: item.querySelector('[data-testing-score-points]').textContent })) })) })),
    };
  });
  check('paired-repair-comparison', dom.title === 'Writing new tests' && dom.purpose === publication.benchmark.description && dom.hero === 0 && dom.protection === 0 && dom.methodClosed && dom.settings.length === publication.configurations.length && dom.settings.every(item => item.closed) && (publication.schemaVersion === 2 ? dom.reviewBasis?.visible && dom.reviewBasis.text === 'Astra judge only; Opus pending · provisional scores' : dom.reviewBasis === null) && JSON.stringify(dom.nav) === JSON.stringify(['paired-check', 'method']), { title: dom.title, purpose: dom.purpose, nav: dom.nav, oneScoreScale: 100 });
  const expandedSourceDisclosure = publication.sourcePolicy ? dom.sourcePolicy === 'Analysis limit expanded from 24 to 64 KiB after authoring began; original prompts and files unchanged.' : dom.sourcePolicy === null;
  const detectionCorrectionDisclosure = publication.detectionCorrection ? dom.detectionCorrection === 'Detection rule corrected after the round; original runs and reviewer ratings retained.' && dom.detectionMethod.includes('causal test failures of any error type') && dom.detectionMethod.includes('Infrastructure, process timeouts, hook, setup, cleanup and unrelated failures are excluded.') : dom.detectionCorrection === null;
  check('paired-repair-evidence', dom.adoption.includes('frozen before authors') && dom.usage.includes(`${publication.provenance.freshAuthorSessions} fresh author attempts`) && dom.usage.includes(publication.knownTokens.toLocaleString('en-US')) && dom.definition === publication.overall.scoreBasis.aggregation && expandedSourceDisclosure && detectionCorrectionDisclosure && dom.rows.every(row => JSON.stringify(row.objective) === JSON.stringify(round.rows.find(item => item.id === row.id).objective.faults)), { incumbentBackendSha256, sourceSha256: round.sourceSha256, nativeSessions: publication.nativeSessions, measuredFaults: round.rows.length * 6, expandedSourceDisclosure, detectionCorrectionDisclosure });
  const format = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) : 'Unscored';
  const profile = value => Number.isFinite(value) ? value.toFixed(3) : 'Unscored';
  const difference = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(3)}` : 'Unscored';
  const ranked = [...publication.overall.summaries].sort((a, b) => (b.treatment ?? -Infinity) - (a.treatment ?? -Infinity));
  const missedBugMarkers = await readMissedBugMarkers();
  const expectedMissedBugs = round.rows.flatMap(row => {
    const count = Number.isFinite(row.objective.faultDetection) ? row.objective.faults.filter(fault => ['survived','not-run'].includes(fault.status)).length : 0;
    return count ? [{configurationId:row.configurationId,condition:row.condition,count}] : [];
  });
  const criterionMean = (configurationId, condition, id) => {
    const scores = publication.overall.rows.find(row => row.configurationId === configurationId && row.condition === condition).judgments.map(judge => judge.contributions.find(item => item.id === id).score);
    return scores.every(Number.isFinite) ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  };
  check('taste-comparison', missedBugMarkersMatch(missedBugMarkers,expectedMissedBugs) && ranked.every((summary, index) => {
    const row = dom.settings[index];
    return row.id === summary.configurationId && row.baseline === format(summary.baseline) && row.treatment === format(summary.treatment) && row.delta === (summary.delta === null ? 'Unscored' : `${summary.delta > 0 ? '+' : ''}${format(summary.delta)} pts`) && row.profiles.length === 9 && row.profiles.every(item => {
      const baseline = criterionMean(row.id, 'none', item.id), treatment = criterionMean(row.id, 'current', item.id);
      return item.baseline === profile(baseline) && item.treatment === profile(treatment) && item.delta === difference(baseline === null || treatment === null ? null : treatment - baseline);
    });
  }), { settings: dom.settings, expected: ranked, criteria: expectedWeights, missedBugMarkers, expectedMissedBugs });
  const evidenceMatches = round.rows.every(row => {
    const rendered = dom.rows.find(item => item.id === row.id), source = files.rows.find(item => item.id === row.id);
    const sizeDisclosure = row.acceptance ? rendered.sizeViolation === `Original 24 KiB limit exceeded: ${row.acceptance.sourceBytes.toLocaleString('en-US')} bytes. Exact source evaluated under the selected 64 KiB analysis limit.` : rendered.sizeViolation === null;
    return sizeDisclosure && rendered.reviewsClosed && JSON.stringify(rendered.files.map(({ open, ...file }) => file)) === JSON.stringify(source.files) && rendered.files.every((file, index) => file.open === (index === 0)) && row.judgments.every(judge => {
      const reading = rendered.judges.find(item => item.id === judge.judgeConfigurationId);
      return reading.sha256 === judge.reviewSha256 && reading.status === judge.status && JSON.stringify(reading.dimensions) === JSON.stringify(judge.dimensions.filter(item => Number.isFinite(item.score)).map(item => ({ ...item, score: item.score.toFixed(2) })));
    });
  });
  const calculationMatches = publication.overall.rows.every(row => {
    const reading = dom.calculations.find(item => item.id === row.id);
    return reading.closed && row.judgments.every(judge => JSON.stringify(reading.judges.find(item => item.id === judge.judgeConfigurationId).contributions) === JSON.stringify(judge.contributions.map(item => ({ id: item.id, score: item.score === null ? 'Unscored' : item.score.toFixed(2), points: profile(item.points) }))));
  });
  const causalFailureDisplay = dom.faultCreditRules.length === round.rows.length && dom.faultCreditRules.every(text=>text === 'Fault credit requires a source-adjudicated causal test failure of any error type in a case passing both healthy controls. Infrastructure, process timeouts, hook, setup, cleanup and unrelated failures are excluded.') && dom.faultLabels.every(fault=>fault.heading === `${fault.id} · ${fault.status}`);
  check('taste-evidence', causalFailureDisplay && evidenceMatches && calculationMatches && dom.namingRule === round.scoreBasis.namingZeroRule && dom.rubric.length === 9 && [...round.scoreBasis.dimensions, ...round.scoreBasis.objectiveDimensions].every(item => { const rendered = dom.rubric.find(value => value.id === item.id); return rendered.description === item.description && rendered.weight === `${item.weight}%`; }), { nativeFindings: round.rows.reduce((sum, row) => sum + row.judgments.reduce((count, judge) => count + judge.dimensions.filter(item => item.score !== null).length, 0), 0), exactFiles: files.rows.reduce((sum, row) => sum + row.files.length, 0), evidenceMatches, calculationMatches, causalFailureDisplay });
  await measureOverflow('Writing new tests comparison'); await capture('test-authoring-overview');
  const sections = [];
  for (const section of ['paired-check', 'method']) {
    await click(`[data-report-section="${section}"]`);
    await waitFor(() => evaluate(`location.hash === ${JSON.stringify(`#test-authoring/${section}`)}`), `Authoring ${section} hash navigation`);
    // Complete the hash handler's smooth scroll before positioning the next link.
    await settled(); await stableTarget(`#${section}`);
    const value = await inspect(id => ({ section: id, hash: location.hash, top: document.getElementById(id).getBoundingClientRect().top }), section); sections.push(value);
  }
  check('report-section-links', sections.every(item => item.hash === `#test-authoring/${item.section}` && item.top < height), sections);
  await inspect(()=>document.querySelector('[data-testing-taste-method]').scrollIntoView({block:'start',behavior:'instant'}));
  await measureOverflow('Detection method'); await capture('test-authoring-detection-method');
  await click('[data-testing-rubric] > summary'); await measureOverflow('Test authoring rubric'); await capture('test-authoring-rubric'); await click('[data-testing-rubric] > summary');
  const model = '#paired-check .model-run';
  await inspect(selector => { const summary = document.querySelector(`${selector} > summary`); summary.scrollIntoView({ block: 'center', behavior: 'instant' }); summary.focus({ preventScroll: true }); }, model);
  await key('Enter', 'Enter', 13); await waitFor(() => inspect(selector => document.querySelector(selector).open, model), 'Authoring setting opens with Enter');
  const firstFile = await inspect(selector => { const node = document.querySelector(`${selector} [data-testing-file]`); return node ? { path: node.dataset.testingFile, row: node.closest('[data-testing-files-row]').dataset.testingFilesRow } : null; }, model);
  if (firstFile) {
    await inspect(selector => document.querySelector(`${selector} [data-testing-file]`).scrollIntoView({ block: 'start', behavior: 'instant' }), model);
    await measureOverflow('Exact authored JavaScript'); await capture('test-authoring-test-files');
    await client.send('Browser.grantPermissions', { origin: new URL(await evaluate('location.href')).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
    await click(`${model} [data-testing-copy-file]`); await waitFor(() => inspect(selector => document.querySelector(`${selector} [data-testing-copy-file]`).textContent === 'Copied', model), 'Authored file copied');
    assert.equal(await evaluate('navigator.clipboard.readText()'), files.rows.find(row => row.id === firstFile.row).files[0].content);
  }
  await click(`${model} [data-testing-score-calculation] > summary`); await measureOverflow('Authoring score calculation'); await capture('test-authoring-score-calculation'); await click(`${model} [data-testing-score-calculation] > summary`);
  await click(`${model} [data-testing-objective] > summary`); await measureOverflow('Adjudicated fault evidence'); await capture('test-authoring-fault-evidence'); await click(`${model} [data-testing-objective] > summary`);
  await inspect(selector => document.querySelector(`${selector} [data-testing-taste-profile]`).scrollIntoView({ block: 'start', behavior: 'instant' }), model); await measureOverflow('Authoring nine-criterion profile'); await capture('test-authoring-dimension-profile');
  await click(`${model} [data-testing-taste-reviews] > summary`); await inspect(selector => document.querySelector(`${selector} [data-testing-taste-judge]`).scrollIntoView({ block: 'start', behavior: 'instant' }), model); await measureOverflow('Original blind authoring review'); await capture('test-authoring-review-reasons');
  await inspect(selector => { const summary = document.querySelector(`${selector} > summary`); summary.scrollIntoView({ block: 'center', behavior: 'instant' }); summary.focus({ preventScroll: true }); }, model);
  await key('Enter', 'Enter', 13); await waitFor(() => inspect(selector => !document.querySelector(selector).open, model), 'Authoring setting closes with Enter'); await stableTarget(`${model} > summary`);
  check('native-details-keyboard', true, { openedAndClosedWithEnter: true, rawFileCopied: firstFile, reviewAndCalculationDisclosures: true });
  const survivor = round.rows.find(row=>row.objective.faults.some(fault=>fault.status==='survived'));
  if(survivor){
    const setting = `[data-testing-taste-setting="${survivor.configurationId}"] .model-run`, condition = `[data-testing-paired-row="${survivor.id}"]`;
    await click(`${setting} > summary`); await click(`${condition} [data-testing-objective] > summary`);
    await inspect(selector=>document.querySelector(`${selector} [data-testing-fault-credit-rule]`).scrollIntoView({block:'start',behavior:'instant'}),condition);
    await measureOverflow('Survived fault evidence'); await capture('test-authoring-survived-fault');
    await click(`${setting} > summary`);
  }
};

const readAggregateMainRows = selector => inspect(selector => [...document.querySelectorAll(selector)].map(row=>({configurationId:row.dataset.configurationId,count:Number(row.dataset.completedTaskCount),expected:Number(row.dataset.expectedTaskCount),complete:row.dataset.coverageComplete,label:row.querySelector('.benchmark-coverage')?.textContent,visible:row.getBoundingClientRect().height>0})),selector);
const assertAggregateMainRows = (rows,aggregate) => {
  assert.equal(rows.length,aggregate.settings.length);assert.equal(new Set(rows.map(row=>row.configurationId)).size,aggregate.settings.length);
  for(const row of rows){const setting=aggregate.settings.find(item=>item.configurationId===row.configurationId);assert.ok(setting);assert.equal(row.count,setting.completedTaskCount);assert.equal(row.expected,setting.expectedTaskCount);assert.equal(row.complete,String(setting.complete));assert.ok(row.visible&&row.label.includes(`${row.count}/${row.expected} tests`));}
};
const checkAvailableEngineeringUI = async integration => {
  const engineering=await evaluate('window.VASIR_DATA.engineering'),mainRows=await readAggregateMainRows('#capability-ranking .capability-rank-row');assertAggregateMainRows(mainRows,engineering);
  const solId='codex:gpt-6.1-sol@xhigh',sol=`#capability-ranking [data-configuration-id="${solId}"]`;
  const initialInspection=()=>evaluate('({strips:document.querySelectorAll("[data-engineering-score-details]").length,selectedRows:document.querySelectorAll("#capability-ranking .capability-rank-row.is-selected").length,pressedRows:document.querySelectorAll("#capability-ranking .capability-rank-row__select[aria-pressed=true]").length})');
  const plain=await initialInspection();assert.deepEqual(plain,{strips:0,selectedRows:0,pressedRows:0});await capture('engineering-default-ranking');
  const selectedUrl=new URL(pageUrl('index.html','capabilities/engineering'));selectedUrl.searchParams.set('setting',solId);selectedUrl.searchParams.set('inspect','1');
  await navigate(selectedUrl.href,'document.querySelectorAll("#capability-ranking .capability-rank-row").length===53');
  const query=await initialInspection();assert.deepEqual(query,{strips:0,selectedRows:0,pressedRows:0});await capture('engineering-default-selected-url');
  await click(`${sol} > button`);await waitFor(()=>evaluate(`document.querySelector('[data-engineering-score-details]')?.dataset.configurationId === ${JSON.stringify(solId)}`),'Sol main-row selection exposes its own calculation');await capture('engineering-sol-main-ranking');
  const detail='[data-engineering-score-details]';const closedAfterSelection=await evaluate('document.querySelector("[data-engineering-score-details]").open===false');assert.equal(closedAfterSelection,true);integration.manualInspection={plain,query,closedAfterSelection,userClickRevealed:true};await click(`${detail} > summary`);
  const calculation=await inspect(()=>{const detail=document.querySelector('[data-engineering-score-details]'),number=value=>value==='null'||value===undefined||value===''?null:Number(value);return {configurationId:detail.dataset.configurationId,rows:[...detail.querySelectorAll('[data-engineering-component]')].map(row=>({id:row.dataset.engineeringComponent,baseline:number(row.dataset.exactBaseline),skill:number(row.dataset.exactSkill),weight:Number(row.dataset.weight),pendingReview:row.hasAttribute('data-architecture-pending-review'),text:row.textContent,href:row.querySelector('a').href})),baseline:Number(detail.querySelector('[data-engineering-exact-baseline]').dataset.engineeringExactBaseline),skill:Number(detail.querySelector('[data-engineering-exact-skill]').dataset.engineeringExactSkill),caption:detail.querySelector('caption').textContent};});
  assert.equal(calculation.configurationId,solId);assert.deepEqual(calculation.rows.map(row=>row.id),integration.engineeringTaskIds);const paired=calculation.rows.filter(row=>row.weight>0);assert.equal(paired.length,integration.solCompletedTaskCount);assert.ok(paired.every(row=>row.weight===1/paired.length));assert.ok(calculation.rows.filter(row=>row.weight===0).every(row=>row.baseline===null&&row.skill===null&&(integration.pendingArchitecture?row.pendingReview&&row.text.includes('Awaiting review'):/N\/A|Not run/.test(row.text))));for(const condition of ['baseline','skill'])assert.ok(Math.abs(calculation[condition]-paired.reduce((sum,row)=>sum+row[condition],0)/paired.length)<1e-9);assert.ok(calculation.caption.includes(`${paired.length}/5`));
  await inspect(()=>document.querySelector('[data-engineering-score-details] table').scrollIntoView({block:'center',behavior:'instant'}));await measureOverflow('Sol available-pair calculation');await capture('engineering-score-breakdown');await click(`${detail} > summary`);
  const old=engineering.entries.find(row=>row.condition==='skill'&&row.completedTaskCount===3&&Number.isFinite(row.latency)&&row.latency>0);assert.ok(old,'An original architecture model retains measured runtime.');await click(`#capability-ranking [data-configuration-id="${old.configurationId}"] > button`);await click('#capability-mode-efficiency');await settled();
  const resource=await evaluate('({pointIds:[...document.querySelectorAll("#capability-efficiency .plot-point[data-entry-id]")].map(row=>row.dataset.entryId),unavailable:document.querySelector("#capability-efficiency").textContent.includes("Resource comparison unavailable")})');assert.ok(!resource.unavailable&&resource.pointIds.length>0);assert.ok(resource.pointIds.every(id=>{const entry=engineering.entries.find(row=>row.id===id);return entry&&Number.isFinite(entry.latency)&&entry.latency>0;}));await measureOverflow('Measured architecture resource comparison');await capture('engineering-available-resource-comparison');
  await click('#capability-mode-models');await settled();await click(`${sol} > button`);await click('#capability-mode-efficiency');await settled();const fallback=await evaluate('({text:document.querySelector("#capability-efficiency").textContent,points:document.querySelectorAll("#capability-efficiency .plot-point").length})');assert.ok(fallback.text.includes('Resource comparison unavailable'));assert.equal(fallback.points,0);await capture('engineering-resource-unavailable');
  Object.assign(integration,{mainRows,calculation,coverage:{count:engineering.coverage.incompleteSettings,label:mainRows.find(row=>row.configurationId===solId).label},efficiency:{resource,fallback}});
};
const assertAvailableAggregateArithmetic = (root, expectedEngineering) => {
  const close=(actual,expected)=>Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<1e-9;
  const engineering=root.engineering,overall=root.overall,key=cell=>`${cell.configurationId}|${cell.condition}|${cell.benchmarkId}`,architectureAppended=root.settings.some(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh'),solTaskCount=architectureAppended?5:2;
  const sources=new Map([...expectedEngineering,...[...(root.writing.overallSource?.benchmarkResults||[]),...root.aiWorkflows.benchmarkResults].map(cell=>[key(cell),cell.exactScore])]);
  assert.equal(overall.scoreBasis.edition,'overall-v5');
  for(const [aggregate,total,complete,cells,tasks]of [[engineering,53,architectureAppended?4:3,architectureAppended?334:328,5],[overall,56,2,[...sources.values()].filter(Number.isFinite).length,9]]){
    assert.deepEqual([aggregate.settings.length,aggregate.coverage.totalSettings,aggregate.coverage.completeSettings,aggregate.coverage.rankedSettings,aggregate.coverage.unrankedSettings,aggregate.benchmarkResults.length,aggregate.scoreBasis.taskCount],[total,total,complete,total,0,cells,tasks]);
    for(const cell of aggregate.benchmarkResults)assert.equal(cell.exactScore,sources.get(key(cell)),'Original task score differs from available-coverage aggregate.');
    for(const record of aggregate.coverage.records){
      const ids=aggregate.scoreBasis.benchmarkIds.filter(id=>['baseline','skill'].every(condition=>Number.isFinite(sources.get(`${record.configurationId}|${condition}|${id}`))));
      assert.ok(ids.length>0);assert.equal(record.eligible,true);assert.equal(record.complete,ids.length===tasks);assert.equal(record.completedTaskCount,ids.length);assert.equal(record.expectedTaskCount,tasks);assert.deepEqual(record.availableBenchmarkIds,ids);
      for(const condition of ['baseline','skill']){
        const entry=aggregate.entries.find(row=>row.configurationId===record.configurationId&&row.condition===condition);
        assert.ok(entry);assert.equal(entry.eligibleForRank,true);assert.equal(entry.complete,record.complete);assert.equal(entry.completedTaskCount,ids.length);assert.equal(entry.expectedTaskCount,tasks);assert.deepEqual(entry.availableBenchmarkIds,ids);
        const categories=aggregate===engineering?[{id:'engineering',weight:1}]:[{id:'engineering',weight:0.5},{id:'writing',weight:0.25},{id:'ai-workflows',weight:0.25}];
        const parts=categories.map(category=>({...category,ids:ids.filter(id=>aggregate===engineering||aggregate.scoreBasis.benchmarkWeights.find(weight=>weight.benchmarkId===id).familyId===category.id)}));
        const totalWeight=parts.filter(part=>part.ids.length).reduce((sum,part)=>sum+part.weight,0);let expected=0;
        for(const part of parts){const weight=part.ids.length?part.weight/totalWeight:0,values=part.ids.map(id=>sources.get(`${record.configurationId}|${condition}|${id}`)),mean=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;if(mean!==null)expected+=mean*weight;const actual=entry.categories.find(item=>item.category===part.id);assert.ok(actual);assert.equal(actual.weight,weight);if(mean===null){assert.equal(actual.exactScore,null);assert.equal(actual.exactContribution,null);}else{assert.ok(close(actual.exactScore,mean));assert.ok(close(actual.exactContribution,mean*weight));}for(const id of part.ids)assert.ok(close(entry.benchmarkWeights.find(item=>item.benchmarkId===id).weight,weight/part.ids.length));}
        assert.ok(close(entry.exactScore,expected));assert.ok(Number.isFinite(record.exactScores[condition]));assert.ok(Number.isInteger(record.ranks[condition]));
      }
    }
  }
  const sol=engineering.coverage.records.find(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh');assert.equal(sol.completedTaskCount,solTaskCount);assert.deepEqual(sol.availableBenchmarkIds,architectureAppended?engineering.scoreBasis.benchmarkIds:['test-authoring','backend-testing']);
  assert.ok(root.settings.every(old=>engineering.settings.some(row=>row.configurationId===old.configurationId)));
  const overallSol=overall.coverage.records.find(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh');
  return {availableCoverage:true,engineeringSha256:sha256(JSON.stringify(engineering)),engineeringSettings:53,engineeringObservedSettings:53,overallSettings:56,overallObservedSettings:56,engineeringTaskIds:engineering.scoreBasis.benchmarkIds,solCoverage:`${solTaskCount}/5`,solCompletedTaskCount:solTaskCount,solOverallTaskCount:overallSol.completedTaskCount,architectureAppended,...(root.architecturePending?{pendingArchitecture:{descriptorSha256:sha256(JSON.stringify(root.architecturePending)),...root.architecturePending}}:{}),sourceTaskScoresVerified:true,pairedCoverageVerified:true,equalAvailableTaskMeanVerified:true,categoryRenormalizationVerified:true};
};
const assertAggregateArithmetic = root => {
  if (!root.engineering) return null;
  const engineering = root.engineering, overall = root.overall, taskIds = ['hyper-scale-chat','personalized-home-feed','device-telemetry','test-authoring','backend-testing'];
  const scores = [...root.benchmarkResults.map(cell=>({...cell,exactScore:cell.score})), ...[[root.testAuthoring,'current'],[root.executableTesting,'repaired']].flatMap(([publication,skill])=>publication.overall.rows.map(row=>({configurationId:row.configurationId,condition:row.condition==='none'?'baseline':row.condition===skill?'skill':null,benchmarkId:publication.benchmark.id,exactScore:row.score})))];
  const key = cell=>`${cell.configurationId}|${cell.condition}|${cell.benchmarkId}`, expected = new Map(scores.map(cell=>[key(cell),cell.exactScore]));
  if(engineering.scoreBasis.edition==='engineering-available-pairs-v2')return assertAvailableAggregateArithmetic(root,expected);
  assert.deepEqual(engineering.scoreBasis.benchmarkIds,taskIds); assert.equal(engineering.scoreBasis.edition,'engineering-all-tasks-v1'); assert.equal(overall.scoreBasis.edition,'overall-v4');
  for(const [aggregate,counts]of [[engineering,[3,53,50,328,5]],[overall,[2,56,54,578,9]]]){
    assert.deepEqual([aggregate.settings.length,aggregate.coverage.totalSettings,aggregate.coverage.incompleteSettings,aggregate.benchmarkResults.length,aggregate.scoreBasis.taskCount],counts);
    for(const record of aggregate.coverage.records){
      const complete=['baseline','skill'].every(condition=>aggregate.scoreBasis.benchmarkIds.every(id=>aggregate.benchmarkResults.some(cell=>cell.configurationId===record.configurationId&&cell.condition===condition&&cell.benchmarkId===id&&Number.isFinite(aggregate===engineering?expected.get(key(cell)):cell.exactScore))));
      assert.equal(record.eligible,complete);
      if(!complete){assert.deepEqual(record.exactScores,{baseline:null,skill:null});assert.deepEqual(record.ranks,{baseline:null,skill:null});}
    }
  }
  for(const cell of engineering.benchmarkResults) assert.equal(cell.exactScore,expected.get(key(cell)),'Every integrated task score must equal its authoritative source.');
  for(const entry of engineering.entries){const values=taskIds.map(id=>expected.get(`${entry.configurationId}|${entry.condition}|${id}`));assert.ok(values.every(Number.isFinite));assert.ok(Math.abs(entry.exactScore-values.reduce((sum,value)=>sum+value,0)/5)<1e-9);}
  assert.deepEqual(overall.categories.map(({id,weight})=>({id,weight})),[{id:'engineering',weight:0.5},{id:'writing',weight:0.25},{id:'ai-workflows',weight:0.25}]);
  for(const entry of overall.entries){
    for(const part of entry.categories){assert.equal(part.weight,{engineering:0.5,writing:0.25,'ai-workflows':0.25}[part.category]);if(part.category==='engineering')assert.equal(part.exactScore,engineering.entries.find(row=>row.configurationId===entry.configurationId&&row.condition===entry.condition).exactScore);}
    assert.ok(Math.abs(entry.exactScore-entry.categories.reduce((sum,part)=>sum+part.exactScore*part.weight,0))<1e-9);
  }
  const sol=engineering.coverage.records.find(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh');
  assert.equal(sol.eligible,false);for(const condition of ['baseline','skill']){assert.equal(sol.conditions[condition].assessableTaskCount,2);assert.deepEqual(sol.conditions[condition].missingTaskIds,taskIds.slice(0,3));}
  return {engineeringSha256:sha256(JSON.stringify(engineering)),engineeringSettings:3,engineeringObservedSettings:53,overallSettings:2,overallObservedSettings:56,engineeringTaskIds:taskIds,solCoverage:'2/5',weights:{engineering:0.5,writing:0.25,'ai-workflows':0.25},sourceTaskScoresVerified:true,fullPairEligibilityVerified:true,equalTaskMeanVerified:true};
};
let aggregateIntegration;
let publicationSha256, overallSha256, publicationSchemaVersion, pairedRepairSha256, tasteSha256, currentRoundSha256, backendTestingOverallSha256, backendTestingFilesSha256, testAuthoringOverallSha256, testAuthoringFilesSha256, incumbentBackendSha256;
try {
  await client.send('Network.enable', { maxTotalBufferSize: 256 * 1024 * 1024, maxResourceBufferSize: 64 * 1024 * 1024, enableDurableMessages: true });
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await navigate(pageUrl('index.html', 'capabilities/engineering/benchmarks'), `document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector(${JSON.stringify(reportLink)})`);
  aggregateIntegration=assertAggregateArithmetic(await evaluate('window.VASIR_DATA'));
  const integrated=Boolean(aggregateIntegration);
  if(integrated) assert.doesNotMatch(await evaluate('document.querySelector("#capability-field-panel").textContent'), /excluded from (?:the )?(?:Engineering|Architecture)|architecture-only|Architecture leaderboard/i);
  const initial = await inspect(({reportLink,publicationKey}) => ({overall:JSON.stringify(window.VASIR_DATA.overall),engineeringRows:document.querySelectorAll('#capability-ranking .capability-rank-row').length,href:document.querySelector(reportLink).href,ledgerLabel:document.querySelector(`${reportLink} .benchmark-ledger__identity small`).textContent,cohort:document.querySelector(`${reportLink} .benchmark-ledger__evidence strong`).textContent,schema:window.VASIR_DATA[publicationKey].schemaVersion,expectedCohort:`${window.VASIR_DATA[publicationKey].configurations.length} settings · ${window.VASIR_DATA[publicationKey].trials} trial per arm`,visible:!!document.querySelector(reportLink).getBoundingClientRect().height}),{reportLink,publicationKey});
  const testingHierarchy = await inspect(()=>{
    const tracks=[...document.querySelectorAll('[data-testing-ledger-track]')],track=tracks[0];
    return {tracks:tracks.length,title:track?.querySelector('.benchmark-ledger__track-header h4')?.textContent,note:track?.querySelector('.benchmark-ledger__track-header p')?.textContent,count:track?.querySelector('.benchmark-ledger__track-header > strong')?.textContent,benchmarks:[...(track?.querySelectorAll('[data-testing-ledger-benchmark]')||[])].map(section=>({id:section.dataset.testingLedgerBenchmark,title:section.querySelector('.benchmark-ledger__identity h5')?.textContent,number:section.querySelector('.benchmark-ledger__identity > span')?.textContent,nestedHeader:!!section.querySelector('.benchmark-ledger__track-header'),lightAxis:!!section.querySelector('.capability-ranking__axis--nested'),duplicateScore:section.querySelector('.benchmark-ledger__evidence strong')?.textContent.startsWith('Score ')})),testCount:Number(document.querySelector('.capability-canvas__reading--measured')?.dataset.count),modelCount:document.querySelector('.capability-canvas__reading--audit dd')?.childNodes[0]?.textContent,modelCohort:document.querySelector('.capability-canvas__reading--audit small')?.textContent,modelTab:document.querySelector('#capability-mode-models strong')?.textContent,benchmarkTab:document.querySelector('#capability-mode-benchmarks > span')?.textContent};
  });
  const testingHierarchyMatches=testingHierarchy.tracks===1&&testingHierarchy.title==='Testing'&&testingHierarchy.note===(aggregateIntegration?.availableCoverage?'Included in Engineering; completed benchmarks share equal weight.':integrated?'Each benchmark contributes 20% of the Engineering score.':'Shown separately; excluded from the Architecture and Overall rankings.')&&testingHierarchy.count==='2 tests · 2 scored'&&testingHierarchy.testCount===5&&(integrated||testingHierarchy.modelCount==='52'&&testingHierarchy.modelCohort==='architecture · 4 testing'&&testingHierarchy.modelTab==='Architecture leaderboard')&&testingHierarchy.benchmarkTab==='2 tracks · 5 tests'&&JSON.stringify(testingHierarchy.benchmarks)===JSON.stringify([{id:'backend-testing',title:'Backend test-suite quality',number:'01 / TESTING',nestedHeader:false,lightAxis:true,duplicateScore:false},{id:'test-authoring',title:'Writing new tests',number:'02 / TESTING',nestedHeader:false,lightAxis:true,duplicateScore:false}]);
  const ledgerCharts = await inspect(() => ['backend-testing','test-authoring'].filter(id=>window.VASIR_DATA[id==='test-authoring'?'testAuthoring':'executableTesting']).map(id=>{
    const publication=window.VASIR_DATA[id==='test-authoring'?'testAuthoring':'executableTesting'],chart=document.querySelector(`[data-testing-ledger-chart="${id}"]`);
    const expected=[...publication.overall.summaries].sort((first,second)=>second.treatment-first.treatment);
    const readings=[...(chart?.querySelectorAll('[data-testing-ledger-setting]')||[])].map(row=>{
      const track=row.querySelector('.capability-rank-row__track'),rect=track?.getBoundingClientRect();
      const position=condition=>{const marker=row.querySelector(`.capability-rank-row__marker--${condition}`),mark=marker?.getBoundingClientRect();return rect?.width&&mark?((mark.left+mark.width/2-rect.left)/rect.width)*100:null;};
      return {id:row.dataset.testingLedgerSetting,baseline:Number(row.dataset.baselineScore),skill:Number(row.dataset.skillScore),baselineText:row.querySelector('.capability-rank-row__reading--baseline strong')?.textContent,skillText:row.querySelector('.capability-rank-row__reading--full strong')?.textContent,delta:row.querySelector('.capability-rank-row__delta')?.childNodes[0]?.textContent,baselinePosition:position('baseline'),skillPosition:position('full'),ariaLabel:track?.getAttribute('aria-label'),href:row.querySelector('a')?.getAttribute('href'),visible:!!rect?.width&&!!rect?.height};
    });
    return {id,expected,readings,conditions:[...(chart?.querySelectorAll('.capability-ranking__condition-heading')||[])].map(node=>node.textContent.trim()),scale:[...(chart?.querySelectorAll('.capability-ranking__scale-values i')||[])].map(node=>node.textContent),visible:!!chart?.getBoundingClientRect().height};
  }));
  const ledgerScore=value=>(Math.round((value+2*Number.EPSILON*Math.max(1,Math.abs(value)))*10)/10).toFixed(1);
  const ledgerDelta=value=>{const rounded=Number(ledgerScore(value));return rounded>0?`+${rounded.toFixed(1)}`:rounded<0?`−${Math.abs(rounded).toFixed(1)}`:'±0.0';};
  const ledgerChartsMatch=ledgerCharts.length===2&&ledgerCharts.every(chart=>chart.visible&&JSON.stringify(chart.conditions)===JSON.stringify(['Minimal','Skill'])&&JSON.stringify(chart.scale)===JSON.stringify(['0','25','50','75','100'])&&chart.readings.length===chart.expected.length&&chart.readings.length===4&&chart.expected.every((expected,index)=>{
    const reading=chart.readings[index];
    return reading.id===expected.configurationId&&reading.baseline===expected.baseline&&reading.skill===expected.treatment&&reading.baselineText===ledgerScore(expected.baseline)&&reading.skillText===ledgerScore(expected.treatment)&&reading.delta===ledgerDelta(expected.delta)&&reading.visible&&Math.abs(reading.baselinePosition-expected.baseline)<0.15&&Math.abs(reading.skillPosition-expected.treatment)<0.15&&reading.ariaLabel===`Minimal circle at ${ledgerScore(expected.baseline)}; Skill square at ${ledgerScore(expected.treatment)} on a 0–100 scale.`&&reading.href===`./benchmark-report.html#${chart.id}`;
  }));
  overallSha256 = sha256(initial.overall);
  check(integrated?'engineering-all-benchmarks':'engineering-52-settings', initial.engineeringRows === (aggregateIntegration?.availableCoverage?53:integrated?3:52) && ledgerChartsMatch && testingHierarchyMatches, { rows: initial.engineeringRows, ledgerLabel: initial.ledgerLabel, ledgerChartsMatch, ledgerCharts, testingHierarchyMatches, testingHierarchy,...(integrated?{aggregateIntegration}:{}) });
  assert.ok(authoring ? [1,2].includes(initial.schema) : [3,4].includes(initial.schema));
  assert.equal(initial.ledgerLabel,authoring?'Write new tests from production code.':'Improve an existing test suite.','The Engineering link must describe the selected testing task.');
  assert.equal(initial.cohort,initial.expectedCohort,'The Engineering link must describe the current cohort and trial count.');
  assert.ok(initial.visible && new URL(initial.href).hash === `#${benchmarkId}`, 'Visible Engineering ledger report link missing.');
  await measureOverflow('Engineering ledger');
  await inspect(()=>document.querySelector('[data-testing-ledger-track]').scrollIntoView({block:'start',behavior:'instant'}));
  await capture('testing-ledger-track');
  for(const chart of ledgerCharts){
    await inspect(id=>document.querySelector(`[data-testing-ledger-benchmark="${id}"]`).scrollIntoView({block:'start',behavior:'instant'}),chart.id);
    await capture(`${chart.id}-ledger-chart`);
  }
  await inspect(selector => document.querySelector(selector).scrollIntoView({ block: 'center', behavior: 'instant' }),reportLink);
  await capture(`${benchmarkId}-engineering-ledger`);
  if(integrated){
    await click('#capability-mode-models');await settled();
    await inspect(()=>document.querySelector('#capability-ranking').scrollIntoView({block:'start',behavior:'instant'}));
    await measureOverflow('Combined Engineering leaderboard');await capture('engineering-combined-leaderboard');
    if(aggregateIntegration.availableCoverage){await checkAvailableEngineeringUI(aggregateIntegration);}else{
    const breakdown='[data-engineering-score-details]';
    await click(`${breakdown} > summary`);
    const calculation=await inspect(()=>{const detail=document.querySelector('[data-engineering-score-details]');return {configurationId:detail.dataset.configurationId,open:detail.open,rows:[...detail.querySelectorAll('[data-engineering-component]')].map(row=>({id:row.dataset.engineeringComponent,baseline:Number(row.dataset.exactBaseline),skill:Number(row.dataset.exactSkill),weight:Number(row.dataset.weight),href:row.querySelector('a').getAttribute('href')})),baseline:Number(detail.querySelector('[data-engineering-exact-baseline]').dataset.engineeringExactBaseline),skill:Number(detail.querySelector('[data-engineering-exact-skill]').dataset.engineeringExactSkill)};});
    assert.equal(calculation.open,true);assert.deepEqual(calculation.rows.map(row=>row.id),aggregateIntegration.engineeringTaskIds);assert.ok(calculation.rows.every(row=>row.weight===0.2&&Number.isFinite(row.baseline)&&Number.isFinite(row.skill)&&row.href.includes(row.id)));for(const condition of ['baseline','skill'])assert.ok(Math.abs(calculation[condition]-calculation.rows.reduce((sum,row)=>sum+row[condition],0)/5)<1e-9);
    await inspect(()=>document.querySelector('[data-engineering-score-details] table').scrollIntoView({block:'center',behavior:'instant'}));
    const tableVisibility=await evaluate('(()=>{const table=document.querySelector("[data-engineering-score-details] table"),rect=table.getBoundingClientRect();return {top:rect.top,bottom:rect.bottom,viewport:innerHeight,color:getComputedStyle(table).color}})()');assert.ok(tableVisibility.top>=0&&tableVisibility.bottom<=tableVisibility.viewport);assert.notEqual(tableVisibility.color,'rgb(255, 255, 255)');calculation.tableVisibility=tableVisibility;
    await measureOverflow('Engineering exact score breakdown');await capture('engineering-score-breakdown');await click(`${breakdown} > summary`);
    await click('[data-overall-coverage-display] > summary');
    const coverage=await inspect(()=>{const root=window.VASIR_DATA.engineering,sol=root.coverage.records.find(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh'),row=document.querySelector(`[data-incomplete-setting-id="${sol.id}"]`);row.scrollIntoView({block:'start',behavior:'instant'});return {count:Number(document.querySelector('[data-overall-coverage-display]').dataset.incompleteCount),label:row.querySelector('.overall-coverage__identity').textContent,benchmarks:[...row.querySelectorAll('[data-engineering-coverage-benchmark]')].map(node=>({id:node.dataset.engineeringCoverageBenchmark,complete:node.dataset.benchmarkComplete,text:node.textContent,href:node.getAttribute('href')}))};});
    assert.equal(coverage.count,50);assert.ok(coverage.label.includes('2/5 tests · unranked'));assert.deepEqual(coverage.benchmarks.map(row=>row.id),aggregateIntegration.engineeringTaskIds);assert.equal(coverage.benchmarks.filter(row=>row.complete==='true').length,2);assert.ok(coverage.benchmarks.filter(row=>row.complete==='false').every(row=>row.text.includes('Not run')));
    await measureOverflow('Engineering missing coverage');await capture('engineering-sol-partial-coverage');await click('[data-overall-coverage-display] > summary');
    await click('#capability-mode-efficiency');await settled();
    const efficiency=await evaluate('({text:document.querySelector("#capability-efficiency").textContent,points:document.querySelectorAll("#capability-efficiency .efficiency-point").length})');assert.ok(efficiency.text.includes('Resource comparison unavailable'));assert.equal(efficiency.points,0);await measureOverflow('Engineering missing resource comparison');await capture('engineering-resource-unavailable');
    Object.assign(aggregateIntegration,{calculation,coverage,efficiency});
    }
    await click('#capability-mode-benchmarks');await settled();
    await inspect(selector=>document.querySelector(selector).scrollIntoView({block:'center',behavior:'instant'}),reportLink);
  }
  await click(reportLink);
  await waitFor(() => evaluate(`document.querySelector("#report-page")?.dataset.executableBenchmark === ${JSON.stringify(benchmarkId)}`), 'Backend report from Engineering ledger');
  await settled();
  const data = await evaluate(`window.VASIR_DATA[${JSON.stringify(publicationKey)}]`);
  publicationSha256 = sha256(JSON.stringify(data));
  publicationSchemaVersion = data.schemaVersion;
  if (authoring) await checkAuthoringReport(data); else await checkCurrentReport(data);
  if(integrated){
    const inclusion=await evaluate('({footer:document.querySelector(".report-footer > span").textContent,method:document.querySelector(".method-grid").textContent})');
    assert.ok(inclusion.footer.includes('Included in Engineering and Overall'));assert.ok((aggregateIntegration.availableCoverage?inclusion.method.includes('completed')&&inclusion.method.includes('Engineering'):inclusion.method.includes('This benchmark contributes 20% of Engineering, which contributes 50% of the current Overall score.')));assert.doesNotMatch(inclusion.method,/excluded from (?:the )?(?:Engineering|Overall|Architecture)|architecture-only/i);aggregateIntegration.reportInclusion={[benchmarkId]:inclusion};
  }

  await click('.report-context__back');
  await waitFor(() => evaluate(`document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector(${JSON.stringify(reportLink)})`), 'Report backlink returns to Engineering');
  check('ledger-navigation', true, { from: initial.href, returnedTo: await evaluate('location.href') });
  const history = await client.send('Page.getNavigationHistory');
  await client.send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
  await waitFor(() => evaluate(`document.querySelector("#report-page")?.dataset.executableBenchmark === ${JSON.stringify(benchmarkId)}`), 'Browser back restores executable report');
  check('browser-history', true, { restoredUrl: await evaluate('location.href'), dataset: await evaluate('document.querySelector("#report-page").dataset.executableBenchmark') });
  if(integrated){
    const other=authoring?'backend-testing':'test-authoring';
    await navigate(pageUrl('benchmark-report.html',other),`document.querySelector("#report-page")?.dataset.executableBenchmark === ${JSON.stringify(other)}`);
    const inclusion=await evaluate('({footer:document.querySelector(".report-footer > span").textContent,method:document.querySelector(".method-grid").textContent})');
    assert.ok(inclusion.footer.includes('Included in Engineering and Overall'));assert.ok((aggregateIntegration.availableCoverage?inclusion.method.includes('completed')&&inclusion.method.includes('Engineering'):inclusion.method.includes('This benchmark contributes 20% of Engineering, which contributes 50% of the current Overall score.')));assert.doesNotMatch(inclusion.method,/excluded from (?:the )?(?:Engineering|Overall|Architecture)|architecture-only/i);aggregateIntegration.reportInclusion[other]=inclusion;
  }
  await navigate(pageUrl('index.html', 'capabilities/overall'), 'document.querySelector("#capability-category-overall[aria-selected=true]")');
  if(integrated){await click('#capability-mode-models');await settled();}
  const overall = await evaluate('({serialized:JSON.stringify(window.VASIR_DATA.overall),backendScore:["backend-testing","test-authoring"].every(id=>window.VASIR_DATA.overall.scoreBasis.benchmarkIds.includes(id)),backendRows:document.querySelectorAll("#capability-ranking [data-testing-row],#capability-ranking [data-testing-summary]").length,rankedRows:document.querySelectorAll("#capability-ranking .setting-row").length,incomplete:Number(document.querySelector("[data-overall-coverage-display]")?.dataset.incompleteCount)})');
  const {serialized:overallSource,...overallEvidence}=overall;
  check(integrated?'overall-includes-testing':'overall-excludes-backend-testing', (integrated?overall.backendScore&&overall.rankedRows===(aggregateIntegration.availableCoverage?56:2)&&overall.incomplete===54:!overall.backendScore&&overall.backendRows===0) && sha256(overallSource) === overallSha256, { sourceSha256: overallSha256, afterSha256: sha256(overallSource), ...overallEvidence });
  await measureOverflow('Overall');
  if(integrated && aggregateIntegration.availableCoverage){
    const overallData=await evaluate('window.VASIR_DATA.overall'),mainRows=await readAggregateMainRows('#capability-ranking .setting-row');assertAggregateMainRows(mainRows,overallData);aggregateIntegration.overallMainRows=mainRows;aggregateIntegration.overallSolCoverage=mainRows.find(row=>row.configurationId==='codex:gpt-6.1-sol@xhigh');assert.equal(aggregateIntegration.overallSolCoverage.count,aggregateIntegration.solOverallTaskCount);assert.ok(aggregateIntegration.overallSolCoverage.label.includes(`${aggregateIntegration.solOverallTaskCount}/9 tests`));
    const weightingCopy=await evaluate('({legend:document.querySelector("#capability-ranking .capability-legend").textContent,method:document.querySelector("[data-overall-method]").textContent})');assert.doesNotMatch(weightingCopy.legend,/%/);assert.ok(weightingCopy.method.startsWith('Base weights:'));aggregateIntegration.overallWeightingCopy=weightingCopy;
    await inspect(()=>document.querySelector('#capability-ranking').scrollIntoView({block:'start',behavior:'instant'}));await capture('overall-combined-engineering');
    const solId='codex:gpt-6.1-sol@xhigh',sol=`#capability-ranking .setting-row[data-configuration-id="${solId}"]`;
    await click(`${sol} .setting-row__select`);await settled();assert.ok(await evaluate(`document.querySelector('${sol}').classList.contains('is-selected')`));await capture('overall-sol-available-profile');
    const segments=await inspect(selector=>[...document.querySelector(selector).querySelectorAll('.capability-composition__segment')].map(node=>({category:node.dataset.categoryId,weight:Number(node.dataset.weight),label:node.getAttribute('aria-label')})),sol),parts=overallData.entries.find(row=>row.configurationId===solId&&row.condition==='skill').categories.filter(row=>row.available);assert.equal(segments.length,parts.length*2);for(const part of parts){const matches=segments.filter(segment=>segment.category===part.category);assert.equal(matches.length,2);assert.ok(matches.every(segment=>segment.weight===part.weight));}aggregateIntegration.overallSolSegments=segments;
    if(parts.some(part=>part.category==='writing')){
      const overallUrl=await evaluate('location.href');await click(`${sol} .capability-composition__segment[data-category-id="writing"]`);await waitFor(()=>evaluate('document.querySelector("#capability-category-writing[aria-selected=true]") && document.querySelector("[data-writing-selected-setting]")'),'Overall Writing link opens Sol scores');
      const writingUrl=await evaluate('location.href'),selector='[data-writing-selected-setting]';await click(`${selector} > summary`);
      const calculation=await inspect(()=>{const detail=document.querySelector('[data-writing-selected-setting]'),score=detail.querySelector('[data-writing-exact-aggregate]');return {settingId:detail.dataset.writingSelectedSetting,completedWritingTasks:Number(score.dataset.sourceCount),baseline:Number(score.dataset.exactBaseline),skill:Number(score.dataset.exactSkill),components:[...detail.querySelectorAll('[data-writing-component]')].map(row=>({benchmarkId:row.dataset.writingComponent,baseline:Number(row.dataset.exactBaseline),skill:Number(row.dataset.exactSkill),weight:Number(row.dataset.weight)}))};});
      const ids=['storytelling-core-idea','storytelling-plot-twists','storytelling-magic-discovery'];assert.equal(calculation.completedWritingTasks,3);assert.deepEqual(calculation.components.map(row=>row.benchmarkId),ids);assert.ok(calculation.components.every(row=>row.weight===1/3));for(const condition of ['baseline','skill'])assert.ok(Math.abs(calculation[condition]-calculation.components.reduce((sum,row)=>sum+row[condition],0)/3)<1e-9);await measureOverflow('Sol complete Writing scores');await capture('writing-sol-complete-scores');
      const reports=[];
      for(const [index,benchmark]of ids.entries()){
        if(index){await navigate(writingUrl,'document.querySelector("[data-writing-selected-setting]")');await click(`${selector} > summary`);}
        await click(`[data-writing-component="${benchmark}"] a`);const row=`[data-report-setting-id="${calculation.settingId}"] > .model-run`;await waitFor(()=>inspect(selector=>document.querySelector(selector)?.open,row),'Writing link opens exact Sol answers');await settled();
        const scope=benchmark==='storytelling-magic-discovery'?`${row} [data-report-trial="1"]`:row;
        if(benchmark==='storytelling-magic-discovery')await click(`${scope} > summary`);
        for(const condition of ['baseline','skill'])await click(`${scope} [data-condition="${condition}"] .model-run__judging > summary`);
        const source=await evaluate(`window.VASIR_WRITING_RESPONSES.responses.filter(response=>response.configurationId===${JSON.stringify(solId)}&&response.caseId===document.querySelector('#report-page').dataset.activeWritingCase&&(response.trialNumber||1)===1)`),readings=await inspect(selector=>[...document.querySelector(selector).querySelectorAll('[data-condition]')].map(node=>({condition:node.dataset.condition,output:node.querySelector('[data-output-text]').textContent,reasons:[...node.querySelectorAll('[data-judge-rationale]')].map(judge=>judge.textContent)})),scope);
        assert.equal(source.length,2);assert.equal(readings.length,2);for(const reading of readings){const response=source.find(item=>item.condition===reading.condition);assert.equal(reading.output,response.outputText);assert.equal(response.judgments.length,[1,2,4][index]);assert.deepEqual(reading.reasons,response.judgments.map(judge=>judge.rationale));}
        await measureOverflow(`Sol ${benchmark} answers`);await capture(`writing-sol-${benchmark}-answers`);
        const copy=`${scope} [data-condition="baseline"] .model-run__section [data-copy-id]`;await click(copy);await waitFor(()=>inspect(selector=>document.querySelector(selector).textContent==='Copied',copy),'Writing answer copied');assert.equal(await evaluate('navigator.clipboard.readText()'),source.find(response=>response.condition==='baseline').outputText);
        reports.push({benchmarkId:benchmark,answers:2,judgments:[2,4,8][index],exactSourceMatches:true,deepLinkOpened:true,copyMatches:true});
      }
      aggregateIntegration.writingAppend={...calculation,reports,sourceMatches:true};await navigate(overallUrl,'document.querySelector("#capability-category-overall[aria-selected=true]")');await click(`${sol} .setting-row__select`);await settled();
    }
    await click(`${sol} .capability-composition__segment[data-category-id="engineering"]`);
    await waitFor(()=>evaluate(`document.querySelector('#capability-category-engineering[aria-selected=true]') && document.querySelector('#capability-ranking [data-configuration-id="${solId}"]')`),'Overall chart category link retains the requested Sol model');
    const initialBreakdownAbsent=await evaluate('document.querySelector("[data-engineering-score-details]")===null');assert.equal(initialBreakdownAbsent,true);await click(`#capability-ranking [data-configuration-id="${solId}"] > button`);
    const focused=await evaluate('(()=>{const row=document.querySelector("#capability-ranking .capability-rank-row.is-selected");return {configurationId:row.dataset.configurationId,label:row.querySelector(".benchmark-coverage").textContent,links:row.querySelectorAll("[data-engineering-component] a").length}})()');assert.equal(focused.configurationId,solId);assert.ok(focused.label.includes(`${aggregateIntegration.solCompletedTaskCount}/5 tests`));assert.equal(focused.links,5);aggregateIntegration.overallPartialLink={...focused,initialBreakdownAbsent};await capture('overall-to-engineering-sol-coverage');
  }else if(integrated){
    await inspect(()=>document.querySelector('#capability-ranking').scrollIntoView({block:'start',behavior:'instant'}));await capture('overall-combined-engineering');await click('#capability-mode-efficiency');await settled();assert.ok((await evaluate('document.querySelector("#capability-efficiency").textContent')).includes('Resource comparison unavailable'));await capture('overall-resource-unavailable');
    await click('#capability-mode-models');await settled();await click('[data-overall-coverage-display] > summary');
    const sol='[data-incomplete-setting-id="'+await evaluate('window.VASIR_DATA.overall.coverage.records.find(row=>row.configurationId==="codex:gpt-6.1-sol@xhigh").id')+'"]';
    const link=`${sol} [data-overall-category="engineering"]`;await click(link);
    await waitFor(()=>evaluate('document.querySelector("[data-overall-coverage-display]")?.open && document.activeElement?.dataset.incompleteSettingId === window.VASIR_DATA.engineering.coverage.records.find(row=>row.configurationId==="codex:gpt-6.1-sol@xhigh").id'),'Overall category link reveals requested partial Engineering setting');
    const focused=await evaluate('({configuration:location.search,label:document.activeElement.querySelector(".overall-coverage__identity").textContent,links:document.activeElement.querySelectorAll("[data-engineering-coverage-benchmark]").length})');assert.ok(focused.label.includes('2/5 tests · unranked'));assert.equal(focused.links,5);aggregateIntegration.overallPartialLink=focused;await capture('overall-to-engineering-sol-coverage');
  }
  await navigate(pageUrl('benchmark-report.html', 'hyper-scale-chat'), 'document.querySelector("#report-title") && document.querySelectorAll(".model-run").length > 0');
  const smoke = await evaluate('({title:document.querySelector("#report-title").textContent,modelRuns:document.querySelectorAll(".model-run").length,unavailable:!!document.querySelector("[data-report-unavailable]"),executable:document.querySelector("#report-page").dataset.executableBenchmark||null})');
  check('hyper-scale-chat-report', smoke.title.toLowerCase().includes('chat') && smoke.modelRuns === (aggregateIntegration?.pendingArchitecture||aggregateIntegration?.architectureAppended?53:52) && !smoke.unavailable && !smoke.executable, smoke);
  await measureOverflow('Hyper-scale chat');
  await capture('backend-testing-hyper-scale-chat');
  if(aggregateIntegration?.architectureAppended){
    const solId='codex:gpt-6.1-sol@xhigh',settingId=await evaluate('window.VASIR_DATA.settings.find(row=>row.configurationId==="codex:gpt-6.1-sol@xhigh").id'),reports=[];
    assert.equal(await evaluate('window.VASIR_DATA.architecturePending ?? null'),null);assert.equal(await evaluate('window.VASIR_RESPONSES.architecturePending ?? null'),null);
    for(const benchmark of aggregateIntegration.engineeringTaskIds.slice(0,3)){
      await navigate(pageUrl('index.html','capabilities/engineering'),'document.querySelectorAll("#capability-ranking .capability-rank-row").length===53');
      await click(`#capability-ranking [data-configuration-id="${solId}"] > button`);await click('[data-engineering-score-details] > summary');await click(`[data-engineering-component="${benchmark}"] a`);
      const selector=`[data-report-setting-id="${settingId}"] > .model-run`;
      await waitFor(()=>inspect(selector=>document.querySelector(selector)?.open,selector),'Engineering link opens complete Sol task pair');await settled();
      assert.equal(await evaluate('document.querySelectorAll(".model-run").length'),53);assert.equal(await evaluate('document.querySelectorAll("[data-architecture-pending-setting]").length'),0);await capture(`sol-architecture-${benchmark}-row`);
      for(const condition of ['baseline','skill'])await click(`${selector} [data-condition="${condition}"] .model-run__judging > summary`);
      const readings=await inspect(selector=>[...document.querySelector(selector).querySelectorAll('[data-condition]')].map(node=>({condition:node.dataset.condition,score:Number(node.querySelector('.model-run__condition-score').childNodes[0].textContent),output:node.querySelector('[data-output-text]').textContent,reasons:[...node.querySelectorAll('[data-judge-rationale]')].map(judge=>judge.textContent),scores:[...node.querySelectorAll('[data-judge-score]')].map(judge=>Number(judge.textContent))})),selector);
      const source=await evaluate(`window.VASIR_RESPONSES.responses.filter(row=>row.configurationId===${JSON.stringify(solId)}&&row.benchmarkId===${JSON.stringify(benchmark)})`),cells=await evaluate(`window.VASIR_DATA.benchmarkResults.filter(row=>row.configurationId===${JSON.stringify(solId)}&&row.benchmarkId===${JSON.stringify(benchmark)})`);
      assert.equal(readings.length,2);assert.equal(source.length,2);
      for(const reading of readings){const response=source.find(row=>row.condition===reading.condition);assert.equal(reading.score,Number(cells.find(row=>row.condition===reading.condition).score.toFixed(1)));assert.equal(reading.output,response.outputText);assert.deepEqual(reading.reasons,response.judgments.map(judge=>judge.rationale));assert.deepEqual(reading.scores,response.judgments.map(judge=>Number(judge.score.toFixed(1))));assert.equal(reading.scores.length,2);}
      await inspect(selector=>document.querySelector(`${selector} [data-output-text]`).scrollIntoView({block:'start',behavior:'instant'}),selector);await measureOverflow(`Sol ${benchmark} exact source`);await capture(`sol-architecture-${benchmark}-answer`);
      const copy=`${selector} [data-condition="baseline"] .model-run__section [data-copy-id]`;await click(copy);await waitFor(()=>inspect(selector=>document.querySelector(selector).textContent==='Copied',copy),'Final scored answer copied');assert.equal(await evaluate('navigator.clipboard.readText()'),source.find(row=>row.condition==='baseline').outputText);
      await inspect(selector=>document.querySelector(`${selector} .model-run__judging`).scrollIntoView({block:'start',behavior:'instant'}),selector);await capture(`sol-architecture-${benchmark}-judges`);
      reports.push({benchmarkId:benchmark,answers:2,judgments:4,exactSourceMatches:true,deepLinkOpened:true,copyMatches:true});
    }
    aggregateIntegration.architectureReports=reports;
  }
  if(aggregateIntegration?.pendingArchitecture){
    const pending=aggregateIntegration.pendingArchitecture,appendix=await evaluate('window.VASIR_RESPONSES.architecturePending'),reports=[];
    assert.equal(pending.status,'pending-review');assert.equal(appendix.status,'pending-review');assert.equal(appendix.responses.length,6);assert.ok(appendix.responses.every(row=>row.score===null&&row.judgments.length===1));
    for(const benchmark of pending.benchmarkIds){
      await navigate(pageUrl('index.html','capabilities/engineering'),'document.querySelectorAll("#capability-ranking .capability-rank-row").length===53');
      const sol=`#capability-ranking [data-configuration-id="${pending.configurationId}"]`;
      await click(`${sol} > button`);await click('[data-engineering-score-details] > summary');
      const link=`[data-engineering-component="${benchmark}"] a`;await click(link);
      await waitFor(()=>evaluate('document.querySelector("[data-architecture-pending-setting] > .model-run")?.open'),'Engineering link opens saved Sol answers');await settled();
      const selector='[data-architecture-pending-setting] > .model-run';
      const summary=await inspect(()=>({rows:document.querySelectorAll('#ranking .model-preview__item').length,scored:document.querySelectorAll('#ranking .model-preview__item:not([data-architecture-pending-setting])').length,setting:document.querySelector('[data-architecture-pending-setting]').dataset.reportSettingId,summary:document.querySelector('[data-architecture-pending-setting] > .model-run > summary').textContent,marks:document.querySelector('[data-architecture-pending-setting]').querySelectorAll('.model-preview__mark').length,header:document.querySelector('#ranking .preview-disclosure__summary').textContent}));
      assert.equal(summary.rows,53);assert.equal(summary.scored,52);assert.equal(summary.setting,pending.settingId);assert.ok(summary.summary.includes('Awaiting Fable review'));assert.equal(summary.marks,0);assert.ok(summary.header.includes('52 scored settings · 1 awaiting review'));await measureOverflow(`Pending ${benchmark} row`);await capture(`sol-pending-${benchmark}-row`);
      for(const condition of ['baseline','skill']){await click(`${selector} [data-condition="${condition}"] .model-run__prompt > summary`);await click(`${selector} [data-condition="${condition}"] .model-run__judging > summary`);}
      const readings=await inspect(selector=>[...document.querySelector(selector).querySelectorAll('[data-condition]')].map(node=>({condition:node.dataset.condition,score:node.querySelector('.model-run__condition-score').textContent,output:node.querySelector('[data-output-text]').textContent,messages:[...node.querySelectorAll('[data-message-content]')].map(message=>message.textContent),reasons:[...node.querySelectorAll('[data-judge-rationale]')].map(judge=>judge.textContent),scores:[...node.querySelectorAll('[data-judge-score]')].map(judge=>Number(judge.textContent)),reviewStatus:node.querySelector('[data-architecture-review-status]').textContent,judgeStatus:node.querySelector('.model-run__judging-meta').textContent})),selector);
      assert.equal(readings.length,2);
      for(const reading of readings){const response=appendix.responses.find(row=>row.benchmarkId===benchmark&&row.condition===reading.condition);assert.equal(reading.score,'—');assert.equal(reading.output,response.outputText);assert.deepEqual(reading.messages,appendix.messageSets.find(messages=>messages.id===response.messageSetId).messages.map(message=>message.content));assert.deepEqual(reading.reasons,response.judgments.map(judge=>judge.rationale));assert.deepEqual(reading.scores,response.judgments.map(judge=>Number(judge.score.toFixed(1))));assert.ok(reading.reviewStatus.includes('Awaiting Fable review'));assert.equal(reading.judgeStatus,'1/2 judges · Fable pending');}
      await inspect(selector=>document.querySelector(`${selector} [data-output-text]`).scrollIntoView({block:'start',behavior:'instant'}),selector);await measureOverflow(`Pending ${benchmark} exact answer`);await capture(`sol-pending-${benchmark}-answer`);
      const copy=`${selector} [data-condition="baseline"] .model-run__section [data-copy-id]`;await click(copy);await waitFor(()=>inspect(selector=>document.querySelector(selector).textContent==='Copied',copy),'Saved pending answer copied');assert.equal(await evaluate('navigator.clipboard.readText()'),appendix.responses.find(row=>row.benchmarkId===benchmark&&row.condition==='baseline').outputText);
      await inspect(selector=>document.querySelector(`${selector} .model-run__judging`).scrollIntoView({block:'start',behavior:'instant'}),selector);await capture(`sol-pending-${benchmark}-astra-review`);
      reports.push({benchmarkId:benchmark,answers:2,judgments:2,finalScores:null,exactSourceMatches:true,exactPromptsMatch:true,copyMatches:true,deepLinkOpened:true});
    }
    aggregateIntegration.pendingArchitectureReports=reports;aggregateIntegration.pendingArchitectureResponsesSha256=sha256(JSON.stringify(appendix));
  }
  if(authoring && options['missed-bug-scenarios'] === 'true') await checkMissedBugScenarios(data);
  check('no-root-overflow', overflow.every(item => item.scrollWidth <= item.viewport + 1), overflow);
  await drain();
  assert.deepEqual(runtimeErrors, [], 'Runtime errors observed.');
  assert.deepEqual(networkErrors, [], 'Network errors observed.');
} catch (error) {
  failures.push({ message: error.message, stack: error.stack });
  await capture('backend-testing-failure').catch(() => {});
} finally {
  await drain();
  const loadedFiles = (await Promise.all(captures)).filter(Boolean);
  const pins = new Map();
  for (const file of loadedFiles) {
    if (pins.has(file.path) && pins.get(file.path).sha256 !== file.sha256) failures.push({ message: `Resource changed during run: ${file.path}` });
    pins.set(file.path, { path: file.path, bytes: file.bytes, sha256: file.sha256 });
  }
  for (const path of ['data.js', 'app.js', 'benchmark-report.js', 'benchmark-report.css', 'style.css', ...([1,3,4].includes(publicationSchemaVersion) ? ['responses.js'] : [])]) if (!pins.has(path)) failures.push({ message: `Required loaded source pin missing: ${path}` });
  const status = failures.length || runtimeErrors.length || networkErrors.length ? 'failed' : 'passed';
  const receipt = { kind: 'vasirbenchmark-backend-testing-browser-proof', schemaVersion: 1, benchmarkId, status, url: requestedUrl.href, loadedUrl: baseUrl.href, ...(previewState ? { notAcceptanceEvidence: true, previewState } : {}), width, height, harnessSha256, publicationSchemaVersion, publicationSha256, overallSha256, ...(aggregateIntegration ? { aggregateIntegration, engineeringSha256: aggregateIntegration.engineeringSha256 } : {}), ...(pairedRepairSha256 ? { pairedRepairSha256 } : {}), ...(tasteSha256 ? { tasteSha256 } : {}), ...(currentRoundSha256 ? { currentRoundSha256 } : {}), ...(backendTestingOverallSha256 ? {backendTestingOverallSha256} : {}), ...(backendTestingFilesSha256 ? {backendTestingFilesSha256} : {}), ...(testAuthoringOverallSha256 ? {testAuthoringOverallSha256,testAuthoringFilesSha256,testAuthoringRoundSha256:currentRoundSha256,incumbentBackendSha256} : {}), sourcePins: [...pins.values()].sort((a, b) => a.path.localeCompare(b.path)), loadedFiles, checks, screenshots, failures, runtimeErrors, networkErrors, completedAt: new Date().toISOString() };
  const path = resolve(output, 'backend-testing-browsercheck.json');
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`);
  await browser.close();
  await previewServer?.close();
  process.stdout.write(`${JSON.stringify({ status, checks: checks.length, failures, runtimeErrors, networkErrors, receipt: path })}\n`);
  if (status !== 'passed') process.exitCode = 1;
}
