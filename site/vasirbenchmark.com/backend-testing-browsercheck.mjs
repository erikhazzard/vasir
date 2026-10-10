import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, startVariantServer } from '../../benchmarks/threejs-water-ripples-performance/lib/browser.mjs';
import { validateBackendTestingPublication } from '../../cli/eval/backend-testing-publication.js';
import { validateBackendTestingCompactRound, validateBackendTestingCompactPublication, validateBackendTestingCompactFiles } from '../../cli/eval/backend-testing-compact-publication.js';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), args[index + 1]]);
  return pairs;
}, []));
assert.ok(options.url && options['output-dir'], 'Usage: backend-testing-browsercheck.mjs --url URL --output-dir DIR [--width 1440 --height 1000]');
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
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2, hit = document.elementFromPoint(x, y);
      return { x, y, actionable: rect.width > 0 && rect.height > 0 && (hit === node || node.contains(hit)) };
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
  const { x, y, actionable } = await stableTarget(selector);
  assert.ok(actionable, `Click target is covered or outside the viewport: ${selector}`);
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

let publicationSha256, overallSha256, publicationSchemaVersion, pairedRepairSha256, tasteSha256, currentRoundSha256, backendTestingOverallSha256, backendTestingFilesSha256;
try {
  await client.send('Network.enable', { maxTotalBufferSize: 256 * 1024 * 1024, maxResourceBufferSize: 64 * 1024 * 1024, enableDurableMessages: true });
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await navigate(pageUrl('index.html', 'capabilities/engineering/benchmarks'), 'document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector("[data-testing-report-link]")');
  const initial = await evaluate('({overall:JSON.stringify(window.VASIR_DATA.overall),engineeringRows:document.querySelectorAll("#capability-ranking .capability-rank-row").length,href:document.querySelector("[data-testing-report-link]").href,ledgerLabel:document.querySelector("[data-testing-report-link] .benchmark-ledger__identity small").textContent,schema:window.VASIR_DATA.executableTesting.schemaVersion,visible:!!document.querySelector("[data-testing-report-link]").getBoundingClientRect().height})');
  overallSha256 = sha256(initial.overall);
  check('engineering-52-settings', initial.engineeringRows === 52, { rows: initial.engineeringRows, ledgerLabel: initial.ledgerLabel });
  assert.ok([3,4].includes(initial.schema));
  assert.equal(initial.ledgerLabel,'Minimal · Skill','The Engineering link must describe the current skill comparison.');
  assert.ok(initial.visible && new URL(initial.href).hash === '#backend-testing', 'Visible Engineering ledger report link missing.');
  await measureOverflow('Engineering ledger');
  await inspect(() => document.querySelector('[data-testing-report-link]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await capture('backend-testing-engineering-ledger');
  await click('[data-testing-report-link]');
  await waitFor(() => evaluate('document.querySelector("#report-page")?.dataset.executableBenchmark === "backend-testing"'), 'Backend report from Engineering ledger');
  await settled();
  const data = await evaluate('window.VASIR_DATA.executableTesting');
  publicationSha256 = sha256(JSON.stringify(data));
  publicationSchemaVersion = data.schemaVersion;
  await checkCurrentReport(data);

  await click('.report-context__back');
  await waitFor(() => evaluate('document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector("[data-testing-report-link]")'), 'Report backlink returns to Engineering');
  check('ledger-navigation', true, { from: initial.href, returnedTo: await evaluate('location.href') });
  const history = await client.send('Page.getNavigationHistory');
  await client.send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
  await waitFor(() => evaluate('document.querySelector("#report-page")?.dataset.executableBenchmark === "backend-testing"'), 'Browser back restores executable report');
  check('browser-history', true, { restoredUrl: await evaluate('location.href'), dataset: await evaluate('document.querySelector("#report-page").dataset.executableBenchmark') });
  await navigate(pageUrl('index.html', 'capabilities/overall'), 'document.querySelector("#capability-category-overall[aria-selected=true]")');
  const overall = await evaluate('({serialized:JSON.stringify(window.VASIR_DATA.overall),backendScore:JSON.stringify(window.VASIR_DATA.overall).includes("backend-testing"),backendRows:document.querySelectorAll("#capability-ranking [data-testing-row],#capability-ranking [data-testing-summary]").length})');
  check('overall-excludes-backend-testing', !overall.backendScore && overall.backendRows === 0 && sha256(overall.serialized) === overallSha256, { sourceSha256: overallSha256, afterSha256: sha256(overall.serialized), backendScore: overall.backendScore, backendRows: overall.backendRows });
  await measureOverflow('Overall');
  await navigate(pageUrl('benchmark-report.html', 'hyper-scale-chat'), 'document.querySelector("#report-title") && document.querySelectorAll(".model-run").length > 0');
  const smoke = await evaluate('({title:document.querySelector("#report-title").textContent,modelRuns:document.querySelectorAll(".model-run").length,unavailable:!!document.querySelector("[data-report-unavailable]"),executable:document.querySelector("#report-page").dataset.executableBenchmark||null})');
  check('hyper-scale-chat-report', smoke.title.toLowerCase().includes('chat') && smoke.modelRuns === 52 && !smoke.unavailable && !smoke.executable, smoke);
  await measureOverflow('Hyper-scale chat');
  await capture('backend-testing-hyper-scale-chat');
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
  for (const path of ['data.js', 'app.js', 'benchmark-report.js', 'benchmark-report.css', 'style.css', ...(publicationSchemaVersion === 3 ? ['responses.js'] : [])]) if (!pins.has(path)) failures.push({ message: `Required loaded source pin missing: ${path}` });
  const status = failures.length || runtimeErrors.length || networkErrors.length ? 'failed' : 'passed';
  const receipt = { kind: 'vasirbenchmark-backend-testing-browser-proof', schemaVersion: 1, status, url: requestedUrl.href, loadedUrl: baseUrl.href, ...(previewState ? { notAcceptanceEvidence: true, previewState } : {}), width, height, harnessSha256, publicationSchemaVersion, publicationSha256, overallSha256, ...(pairedRepairSha256 ? { pairedRepairSha256 } : {}), ...(tasteSha256 ? { tasteSha256 } : {}), ...(currentRoundSha256 ? { currentRoundSha256 } : {}), ...(backendTestingOverallSha256 ? {backendTestingOverallSha256} : {}), ...(backendTestingFilesSha256 ? {backendTestingFilesSha256} : {}), sourcePins: [...pins.values()].sort((a, b) => a.path.localeCompare(b.path)), loadedFiles, checks, screenshots, failures, runtimeErrors, networkErrors, completedAt: new Date().toISOString() };
  const path = resolve(output, 'backend-testing-browsercheck.json');
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`);
  await browser.close();
  await previewServer?.close();
  process.stdout.write(`${JSON.stringify({ status, checks: checks.length, failures, runtimeErrors, networkErrors, receipt: path })}\n`);
  if (status !== 'passed') process.exitCode = 1;
}
