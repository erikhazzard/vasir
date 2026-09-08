#!/usr/bin/env node

// Browser evidence uses the actual selected projection, never synthetic scores or answers.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, argument, index, all) => {
  if (argument.startsWith('--')) pairs.push([argument.slice(2), all[index + 1]]);
  return pairs;
}, []));
assert.ok(options.url && options['output-dir'], 'Usage: writing-browsercheck.mjs --url URL --output-dir PATH [--width 1440 --height 1000] [--require-scored]');
const requireScored = Object.hasOwn(options, 'require-scored');
const baseUrl = new URL(options.url);
assert.ok(baseUrl.protocol === 'https:' || (baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseUrl.hostname)), 'Use HTTPS or a local HTTP server.');
const width = Number(options.width || 1440);
const height = Number(options.height || 1000);
assert.ok(Number.isInteger(width) && width >= 320 && Number.isInteger(height) && height >= 400);
const output = path.resolve(options['output-dir']);
fs.mkdirSync(output, { recursive: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const harnessSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
const chromePath = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(file => fs.existsSync(file));
assert.ok(chromePath, 'Chrome must be installed or CHROME_BIN set.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vasir-writing-browsercheck-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const deadline = Date.now() + 180000;
const checks = [];
const screenshots = [];
const failureScreenshots = [];
const progressEvidence = [];
const errors = [];
const requests = [];
const responses = new Map();
const loadedFilePromises = [];
const pending = new Map();
let socket;
let nextId = 1;
let coverage;
let overallSha256;

async function waitFor(check, label, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout && Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const check = (name, condition, detail) => {
  assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`);
  checks.push(name);
};
const click = selector => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw Error('Control missing'); element.scrollIntoView({block:'center',behavior:'instant'}); element.click(); })()`);
const pageUrl = (name, fragment = '') => {
  const url = new URL(name, baseUrl);
  url.hash = fragment;
  return url.href;
};
const navigate = async (url, predicate) => {
  await send('Page.navigate', { url });
  await waitFor(() => evaluate(`document.readyState === 'complete' && (${predicate})`).catch(() => false), url);
  await evaluate('document.fonts.ready');
};
const capture = async (name, collection = screenshots, evidence = {}) => {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(result.data, 'base64');
  fs.writeFileSync(path.join(output, name), bytes);
  collection.push({ path: name, bytes: bytes.length, sha256: sha256(bytes), width, height, ...evidence });
};
const noOverflow = async name => {
  const result = await evaluate('({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})');
  check(`${name}: no horizontal page overflow`, result.scroll <= result.viewport + 1, JSON.stringify(result));
};
const verifyWritingProgress = async scope => {
  const proof = await evaluate(`(() => {
    const data=window.VASIR_WRITING, coverage=data.coverage, element=document.querySelector('[data-writing-progress]');
    const inProgress=coverage.judgmentCount<coverage.expectedJudgmentCount || coverage.completedSettingCount<coverage.settingCount;
    const expected={answers:coverage.responseCount+'/'+coverage.expectedResponseCount+' final answers',reviews:coverage.judgmentCount+'/'+coverage.expectedJudgmentCount+' planned judge reviews',panels:coverage.scoredResponseCount+'/'+coverage.expectedResponseCount+' complete '+data.scoreBasis.judgeCount+'-judge answer panels'};
    const counts=Object.fromEntries(Object.keys(expected).map(key=>[key,element?.querySelector('[data-writing-progress-count="'+key+'"]')?.textContent]));
    const status=element?.querySelector('[data-writing-progress-status]')?.textContent;
    const disclosure=element?.querySelector('[data-writing-progress-disclosure]')?.textContent || '';
    const failures=data.caseResults.filter(cell=>['error','unavailable'].includes(cell.status)).length;
    const browse=element?.querySelector('[data-writing-browse-answers]');
    const rect=browse?.getBoundingClientRect();
    const mismatches=[];
    if(status!==(inProgress?'IN PROGRESS':'COMPLETE SNAPSHOT')) mismatches.push('progress-status');
    if(Object.keys(expected).some(key=>counts[key]!==expected[key])) mismatches.push('progress-counts');
    if(inProgress && !disclosure.includes('Judging incomplete; available answers and reviews are published.')) mismatches.push('incomplete-disclosure');
    if(!disclosure.includes('Incomplete configurations are not ranked.') || !disclosure.includes('Case scores require the full judge panel.')) mismatches.push('ranking-disclosure');
    if(failures && !disclosure.includes(failures+' failed generations are retained; planned totals include unavailable slots.')) mismatches.push('failed-slot-disclosure');
    if(!rect || rect.width<=0 || rect.height<44 || !browse.textContent.includes('Browse answers')) mismatches.push('browse-answers-link');
    if(coverage.responseCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedResponses,0) || coverage.judgmentCount!==data.caseResults.reduce((sum,cell)=>sum+cell.coverage.completedJudgments,0) || coverage.scoredResponseCount!==data.caseResults.filter(cell=>Number.isFinite(cell.score)).length) mismatches.push('source-coverage-counts');
    if(location.pathname.endsWith('benchmark-report.html') ? browse?.getAttribute('data-report-section')!=='ranking' : !browse?.href.includes('benchmark-report.html#'+data.benchmarks[0].id)) mismatches.push('browse-answers-destination');
    return {inProgress,status,counts,failedGenerations:failures,browseHref:browse?.href || null,mismatches};
  })()`);
  check(`Writing ${scope}: source-derived progress, planned coverage and direct answer access`, proof.mismatches.length === 0, JSON.stringify(proof));
  progressEvidence.push({scope,...proof});
};
const layout = () => evaluate(`(() => {
  const row = document.querySelector('.capability-rank-row');
  const text = row?.querySelector('.capability-rank-row__model strong');
  const track = row?.querySelector('.capability-rank-row__track');
  if (!row || !text) return null;
  return {rowHeight:row.getBoundingClientRect().height,font:getComputedStyle(text).font,fontSize:getComputedStyle(text).fontSize,trackWidth:track?.getBoundingClientRect().width};
})()`);

try {
  const port = await waitFor(() => {
    try { return fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { return null; }
  }, 'Chrome debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push({ kind: 'runtime', detail: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, type: message.params.type });
    if (message.method === 'Network.responseReceived') responses.set(message.params.requestId, message.params.response);
    if (message.method === 'Network.loadingFinished') {
      const requestId = message.params.requestId;
      const response = responses.get(requestId);
      if (response && /\/(?:app|benchmark-report|writing-data|writing-responses)\.js$/.test(new URL(response.url).pathname)) {
        loadedFilePromises.push(send('Network.getResponseBody', { requestId }).then(result => {
          const bytes = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
          return { url:response.url, bytes:bytes.length, sha256:sha256(bytes) };
        }).catch(error => { errors.push({kind:'loaded-byte-evidence',url:response.url,detail:error.message}); return null; }));
      }
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) errors.push({ kind: 'network', detail: message.params.errorText });
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 }), send('Emulation.setTouchEmulationEnabled', { enabled: width < 700 })]);
  await send('Network.setCacheDisabled', { cacheDisabled:true });

  await navigate(pageUrl('index.html', 'capabilities/overall'), 'document.querySelector("#capability-category-overall[aria-selected=true]") && window.VASIR_DATA?.writing');
  const initial = await evaluate('({overall:JSON.stringify(window.VASIR_DATA.overall),summary:window.VASIR_DATA.writing,lazy:!!window.VASIR_WRITING,available:!document.querySelector("#capability-category-writing").disabled,categoryProgress:document.querySelector("[data-writing-category-progress]")?.textContent})');
  overallSha256 = sha256(initial.overall);
  check('Writing appears in capability navigation', initial.available);
  check('Overall loads without Writing data or response bundles', !initial.lazy && !requests.some(request => /\/writing-(?:data|responses)\.js(?:\?|$)/.test(new URL(request.url).pathname)));
  check('Writing remains excluded from Overall', !JSON.parse(initial.overall).categories.some(category => category.id === 'writing'));
  const inProgress = initial.summary.coverage.judgmentCount < initial.summary.coverage.expectedJudgmentCount || initial.summary.coverage.completedSettingCount < initial.summary.coverage.settingCount;
  check('Writing category identifies in-progress coverage without loading answer bundles', !inProgress || initial.categoryProgress === 'IN PROGRESS');

  await click('#capability-category-engineering');
  await waitFor(() => evaluate('document.querySelector("#capability-category-engineering[aria-selected=true]") && document.querySelector(".capability-rank-row")').catch(() => false), 'Engineering comparison layout');
  const engineeringLayout = await layout();
  await click('#capability-category-writing');
  await waitFor(() => evaluate('window.VASIR_WRITING && document.querySelector("#capability-category-writing[aria-selected=true]") && document.querySelector("[data-writing-coverage]") && document.activeElement?.id === "capability-category-writing"').catch(() => false), 'Writing loaded with selector focus');
  const writing = await evaluate(`(() => {
    const data = window.VASIR_WRITING;
    const rows = [...document.querySelectorAll('.capability-rank-row')];
    const dimensionCount = data.scoreBasis.dimensions.length;
    return {overall:JSON.stringify(window.VASIR_DATA.overall),benchmarks:data.benchmarks.map(benchmark => benchmark.id),cases:data.cases.map(story => ({id:story.id,title:story.title})),settings:data.settings.map(setting => setting.id),conditions:data.conditions.length,dimensions:dimensionCount,coverage:data.coverage,hash:location.hash,rowCount:rows.length,scoresMatch:rows.every(row => {
      const baseline = data.entries.find(entry => entry.id === row.dataset.baselineEntryId);
      const skill = data.entries.find(entry => entry.id === row.dataset.fullEntryId);
      const format = score => Number.isFinite(score) ? score.toFixed(1) : '—';
      return row.dataset.baselineScore === format(baseline.score) && row.dataset.fullScore === format(skill.score) && row.dataset.delta === format(skill.delta);
    }),subsections:[...document.querySelectorAll('[data-writing-subsection]')].map(item => ({id:item.dataset.writingSubsection,disabled:item.getAttribute('aria-disabled'),text:item.textContent})),coverageText:document.querySelector('[data-writing-coverage]').textContent,reportBundleLoaded:!!window.VASIR_WRITING_RESPONSES,focused:document.activeElement?.id};
  })()`);
  coverage = writing.coverage;
  check('Writing corpus does not change Overall projection', sha256(writing.overall) === overallSha256);
  check('Canonical Writing / Storytelling route preserves selector focus', writing.hash === '#capabilities/writing/storytelling' && writing.focused === 'capability-category-writing');
  check('Core idea is one benchmark with separate story cases', writing.benchmarks.length === 1 && writing.cases.length === initial.summary.coverage.caseCount);
  check('Writing leaderboard shows every declared setting and actual scores', writing.rowCount === writing.settings.length && writing.scoresMatch);
  const scoredCollection = await evaluate(`(() => {
    const data=window.VASIR_WRITING;
    const close=(actual,expected)=>expected===null?actual===null:Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8;
    const round=value=>value===null?null:Math.round((value+Number.EPSILON)*10)/10;
    const expectedEntries=[];
    const mismatches=[];
    let completeSettings=0;
    for (const setting of data.settings) {
      const cells=data.caseResults.filter(cell=>cell.settingId===setting.id);
      const complete=cells.length===data.cases.length*data.conditions.length && cells.every(cell=>Number.isFinite(cell.exactScore));
      if(complete) completeSettings++;
      const means=Object.fromEntries(data.conditions.map(condition=>{ const arm=cells.filter(cell=>cell.condition===condition.id);return [condition.id,complete?arm.reduce((sum,cell)=>sum+cell.exactScore,0)/data.cases.length:null]; }));
      for (const condition of data.conditions) {
        const entry=data.entries.find(entry=>entry.settingId===setting.id && entry.condition===condition.id);
        const exactScore=means[condition.id];
        const delta=complete?round(condition.id==='baseline'?0:means.skill-means.baseline):null;
        if(!entry || !close(entry.exactScore,exactScore) || !close(entry.score,round(exactScore)) || !close(entry.delta,delta)) mismatches.push('complete-corpus-arithmetic:'+setting.id+':'+condition.id);
        expectedEntries.push({id:entry?.id,settingId:setting.id,condition:condition.id,exactScore,score:round(exactScore),delta});
      }
    }
    const rank=entry=>Number.isFinite(entry.exactScore)?1+expectedEntries.filter(other=>other.condition===entry.condition && Number.isFinite(other.exactScore) && other.exactScore>entry.exactScore).length:null;
    const rows=[...document.querySelectorAll('.capability-rank-row')];
    let previous=Infinity;
    for (const row of rows) {
      const baseline=expectedEntries.find(entry=>entry.id===row.dataset.baselineEntryId);
      const skill=expectedEntries.find(entry=>entry.id===row.dataset.fullEntryId);
      if(row.dataset.baselineRank!==String(rank(baseline)) || row.dataset.fullRank!==String(rank(skill))) mismatches.push('condition-rank:'+row.dataset.settingId);
      if(row.classList.contains('is-regression')!==(skill.delta<0)) mismatches.push('regression-class:'+row.dataset.settingId);
      const score=skill.exactScore??-1;
      if(score>previous) mismatches.push('leaderboard-order');
      previous=score;
    }
    for (const entry of expectedEntries) if(data.entries.find(candidate=>candidate.id===entry.id)?.rank!==rank(entry)) mismatches.push('projected-rank:'+entry.id);
    for (const condition of data.conditions) {
      const leaders=expectedEntries.filter(entry=>entry.condition===condition.id && rank(entry)===1);
      const element=document.querySelector('[data-leader-condition="'+condition.id+'"]');
      const shown=[...element.querySelectorAll('[data-leader-entry-id]')].map(item=>item.dataset.leaderEntryId).sort();
      if(Number(element.dataset.leaderCount)!==leaders.length || JSON.stringify(shown)!==JSON.stringify(leaders.map(entry=>entry.id).sort()) || element.dataset.score!==(leaders.length?leaders[0].score.toFixed(1):'—')) mismatches.push('co-leaders:'+condition.id);
    }
    if(data.coverage.completedSettingCount!==completeSettings) mismatches.push('complete-setting-coverage');
    return {completeSettings,unscoredSettings:data.settings.length-completeSettings,regressionSettings:expectedEntries.filter(entry=>entry.condition==='skill' && entry.delta<0).length,tiedRankEntries:expectedEntries.filter(entry=>Number.isFinite(entry.exactScore) && expectedEntries.some(other=>other.id!==entry.id && other.condition===entry.condition && other.exactScore===entry.exactScore)).length,mismatches};
  })()`);
  check('Writing complete-corpus means, exact-score ranks, co-leaders and regressions match the visible leaderboard', scoredCollection.mismatches.length === 0, JSON.stringify(scoredCollection));
  if (requireScored) check('Scored QA has a complete paired configuration across the whole corpus', scoredCollection.completeSettings > 0, JSON.stringify(scoredCollection));
  check('Prose and Poetry have no scores or active routes', ['prose', 'poetry'].every(id => writing.subsections.some(item => item.id === id && item.disabled === 'true' && /Unscored/.test(item.text))));
  check('Storytelling identifies its in-progress benchmark without changing future subsections', !inProgress || writing.subsections.find(item => item.id === 'storytelling').text.includes('IN PROGRESS'));
  check('Writing states complete corpus coverage and Overall exclusion', /fully scored pairs/.test(writing.coverageText) && /Excluded from Overall/.test(writing.coverageText));
  check('Writing answers remain lazy on the leaderboard', !writing.reportBundleLoaded);
  const writingLayout = await layout();
  check('Writing reuses Engineering model typography', writingLayout.font === engineeringLayout.font && writingLayout.fontSize === engineeringLayout.fontSize);
  check('Writing reuses Engineering row spacing', Math.abs(writingLayout.rowHeight - engineeringLayout.rowHeight) <= 1, JSON.stringify({ engineeringLayout, writingLayout }));
  await verifyWritingProgress('models');
  await noOverflow('Writing leaderboard');
  await capture('writing-models.png');
  const chosenSettingId = writing.settings.at(-1);
  await click(`.capability-rank-row[data-setting-id="${chosenSettingId}"] .capability-rank-row__select`);
  check('Selecting a model exposes every story answer', await evaluate(`document.querySelector('[data-writing-selected-setting]').dataset.writingSelectedSetting === ${JSON.stringify(chosenSettingId)} && document.querySelectorAll('[data-writing-case-link]').length === ${writing.cases.length}`));
  const selectedReportUrl = await evaluate('document.querySelector("[data-writing-case-link]").href');

  await click('[data-capability-mode=benchmarks]');
  check('Benchmark collection counts Core idea once', await evaluate(`document.querySelectorAll('#capability-benchmarks .benchmark-ledger__row').length === 1 && document.querySelector('#capability-benchmarks .benchmark-ledger__row').dataset.benchmarkId === ${JSON.stringify(writing.benchmarks[0])}`));
  await verifyWritingProgress('benchmarks');
  await noOverflow('Writing benchmarks');
  await capture('writing-benchmarks.png');

  await click('[data-capability-mode=efficiency]');
  await waitFor(() => evaluate('!document.querySelector("#capability-efficiency").hidden && !!document.querySelector("#efficiency-view").textContent'), 'Writing efficiency');
  await evaluate(`(() => { const entry=window.VASIR_WRITING.entries.find(entry=>Number.isFinite(entry.score) && Number.isFinite(entry.latency) && entry.latency>0); if(entry){ const select=document.querySelector('#efficiency-entry');select.value=entry.id;select.dispatchEvent(new Event('change',{bubbles:true})); } })()`);
  check('Efficiency plots exactly the complete scores with recorded resources', await evaluate(`(() => { const data = window.VASIR_WRITING; const expected=data.entries.filter(entry=>Number.isFinite(entry.score) && Number.isFinite(entry.latency) && entry.latency>0); const points=[...document.querySelectorAll('[data-plot-point]')]; return points.length===expected.length && points.every(point=>expected.some(entry=>entry.id===point.dataset.entryId)); })()`));
  await verifyWritingProgress('efficiency');
  await noOverflow('Writing efficiency');
  await capture('writing-efficiency.png');
  const efficiencyEvidence = [];
  for (const metric of ['latency', 'tokens']) {
    await evaluate(`(() => { const axis=document.querySelector('#resource-axis');axis.value=${JSON.stringify(metric)};axis.dispatchEvent(new Event('change',{bubbles:true}));const entry=window.VASIR_WRITING.entries.find(entry=>Number.isFinite(entry.score) && Number.isFinite(entry[${JSON.stringify(metric)}]) && entry[${JSON.stringify(metric)}]>0);if(entry){const select=document.querySelector('#efficiency-entry');select.value=entry.id;select.dispatchEvent(new Event('change',{bubbles:true}));} })()`);
    const proof = await evaluate(`(() => {
      const metric=${JSON.stringify(metric)}, data=window.VASIR_WRITING;
      const eligible=data.entries.filter(entry=>Number.isFinite(entry.score) && Number.isFinite(entry[metric]) && entry[metric]>0);
      const frontier=eligible.filter(entry=>!eligible.some(other=>other.score>=entry.score && other[metric]<=entry[metric] && (other.score>entry.score || other[metric]<entry[metric])));
      const points=[...document.querySelectorAll('[data-plot-point]')];
      const mismatches=[];
      if(points.length!==eligible.length) mismatches.push('point-count');
      for (const point of points) {
        const entry=eligible.find(entry=>entry.id===point.dataset.entryId);
        if(!entry || point.dataset.score!==entry.score.toFixed(1) || Number(point.dataset.resource)!==entry[metric] || point.dataset.frontier!==String(frontier.some(candidate=>candidate.id===entry.id))) mismatches.push('point-evidence');
        if(!['plotX','plotY'].every(key=>Number.isFinite(Number(point.dataset[key])) && Number(point.dataset[key])>=0 && Number(point.dataset[key])<=100)) mismatches.push('point-geometry');
      }
      const shown=(document.querySelector('.efficiency-plane__plot')?.dataset.frontierIds || '').split(',').filter(Boolean).sort();
      if(JSON.stringify(shown)!==JSON.stringify(frontier.map(entry=>entry.id).sort())) mismatches.push('frontier-membership');
      return {metric,eligiblePoints:eligible.length,frontierPoints:frontier.length,selectedEntry:document.querySelector('.efficiency-plane__canvas')?.dataset.selectedId || null,mismatches};
    })()`);
    check(`Writing ${metric} efficiency uses only finite recorded resources and the source-derived frontier`, proof.mismatches.length === 0, JSON.stringify(proof));
    if (proof.eligiblePoints) {
      const entryId = await evaluate('document.querySelector("[data-plot-point]:last-child").dataset.entryId');
      await click(`[data-plot-point][data-entry-id="${entryId}"]`);
      check(`Writing ${metric} chart selection opens that configuration's case links`, await evaluate(`(() => { const entry=window.VASIR_WRITING.entries.find(entry=>entry.id===${JSON.stringify(entryId)});return document.querySelector('.efficiency-plane__canvas').dataset.selectedId===entry.id && document.querySelector('[data-writing-selected-setting]').dataset.writingSelectedSetting===entry.settingId && document.querySelectorAll('[data-writing-case-link]').length===window.VASIR_WRITING.cases.length; })()`));
    }
    await noOverflow(`Writing ${metric} efficiency`);
    if (metric === 'tokens') await capture('writing-efficiency-tokens.png');
    efficiencyEvidence.push(proof);
  }

  await navigate(selectedReportUrl, 'window.VASIR_WRITING_RESPONSES && document.querySelector("[data-writing-case]") && document.querySelector("[data-writing-rubric]")');
  check('Selected model opens directly in the report', await evaluate(`document.querySelector('[data-report-setting-id="${chosenSettingId}"] .model-run').open`));
  check('Writing report does not load unrelated response bundles', await evaluate('!window.VASIR_RESPONSES'));
  await verifyWritingProgress('report');
  check('Writing case metadata and answer archive share the same pinned source', await evaluate(`(() => { const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;return evidence.responses.filter(response=>response.outputText.length).length===data.coverage.responseCount && evidence.responses.every(response=>{ const cell=data.caseResults.find(cell=>cell.caseId===response.caseId && cell.settingId===response.settingId && cell.condition===response.condition);return response.provenance.sourceSha256===data.scoreBasis.sourceSha256 && cell?.status===response.status && cell.score===response.score && cell.wordCount===response.wordCount && cell.failureReason===response.failureReason;}); })()`));
  const verifyCase = async caseId => {
    const proof = await evaluate(`(() => {
      const data=window.VASIR_WRITING, evidence=window.VASIR_WRITING_RESPONSES;
      const caseId=${JSON.stringify(caseId)};
      const story=data.cases.find(story=>story.id===caseId);
      const source=evidence.responses.filter(response=>response.caseId===caseId);
      const rows=[...document.querySelectorAll('[data-report-setting-id]')];
      const mismatches=[];
      const failures=[];
      const terminalJudgmentLabels=[];
      const round=value=>Math.round((value+Number.EPSILON)*10)/10;
      const format=value=>Number.isFinite(value)?value.toFixed(1):'—';
      const signed=value=>Number.isFinite(value)?(value>0?'+':'')+value.toFixed(1):'—';
      const close=(actual,expected)=>expected===null?actual===null:Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8;
      const caseCells=data.caseResults.filter(cell=>cell.caseId===caseId);
      for (const row of rows) for (const condition of data.conditions) {
        const response=source.find(response=>response.settingId===row.dataset.reportSettingId && response.condition===condition.id);
        const panel=row.querySelector('[data-condition="'+condition.id+'"]');
        const output=panel.querySelector('[data-output-text]')?.textContent || '';
        if(output !== (response?.outputText || '')) mismatches.push('output:'+row.dataset.reportSettingId+':'+condition.id);
        if(!output && panel.querySelector('.writing-answer-status')?.textContent!==(response?.failureReason || response?.status || 'No completed answer recorded')) mismatches.push('failure-reason:'+row.dataset.reportSettingId+':'+condition.id);
        if(response && ['error','unavailable'].includes(response.status)) {
          const paired=source.find(other=>other.settingId===response.settingId && other.condition!==response.condition);
          if(output || response.score!==null || response.judgments.length) mismatches.push('failed-response-scored');
          failures.push({caseId,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,failureReason:response.failureReason,renderedFailureReason:panel.querySelector('.writing-answer-status')?.textContent || '',score:response.score,judgments:response.judgments.length,pairedResponse:paired?{condition:paired.condition,status:paired.status,hasOutput:Boolean(paired.outputText),wordCount:paired.wordCount,score:paired.score,judgments:paired.judgments.length}:null});
        }
        const messages=evidence.messageSets.find(set=>set.id===response?.messageSetId)?.messages || [];
        const renderedMessages=[...panel.querySelectorAll('[data-message-content]')];
        if(messages.length!==renderedMessages.length || renderedMessages.some((element,index)=>element.textContent!==(messages[index].content || ''))) mismatches.push('exact-input-messages');
        const fileReferences=[...panel.querySelectorAll('.model-run__prompt [data-open-prompt-file]')].map(element=>element.dataset.openPromptFile);
        if(JSON.stringify(fileReferences)!==JSON.stringify(messages.filter(message=>message.fileId).map(message=>message.fileId))) mismatches.push('prompt-file-reference');
        const verifyFields=(element,source,keys,attribute)=>{
          const expected=keys.filter(key=>source && Object.hasOwn(source,key));
          const rendered=[...element.querySelectorAll('['+attribute+']')];
          if(rendered.length!==expected.length || rendered.some(field=>field.textContent!==(source[field.getAttribute(attribute)]===null?'Not reported':String(source[field.getAttribute(attribute)])))) mismatches.push(attribute);
        };
        const usageKeys=['inputTokens','cachedInputTokens','cacheWriteInputTokens','cacheCreationInputTokens','cacheReadInputTokens','outputTokens','reasoningOutputTokens','totalTokens'];
        const execution=panel.querySelector('[data-writing-execution]');
        if(Boolean(execution)!==Boolean(response?.runtime)) mismatches.push('runtime-presence');
        if(execution) {
          verifyFields(execution,response.runtime,['freshSession','executionMode','modelVerification','reasoningVerification','observedCollaborationEvents','rawProviderStreamRetained','durationMs'],'data-runtime-field');
          verifyFields(execution,response,['characterCount'],'data-response-field');
          verifyFields(execution,response.runtime.usage,usageKeys,'data-resource-usage');
          if(response.runtime.usage && !execution.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('usage-normalization-disclosure');
          if(response.characterCount!==undefined && response.characterCount!==Array.from(output).length) mismatches.push('unicode-character-count');
          const references=[...execution.querySelectorAll('[data-reference-path]')].map(element=>element.textContent);
          if(JSON.stringify(references)!==JSON.stringify(response.runtime.referenceFilesRead || [])) mismatches.push('runtime-reference-files');
          for (const button of execution.querySelectorAll('[data-open-prompt-file]')) {
            const reference=button.querySelector('[data-reference-path]').textContent;
            const file=evidence.promptFiles.find(file=>file.id===button.dataset.openPromptFile);
            if(!file || (reference==='SKILL.md'?file.id!=='frozen-skill-root':!file.title.startsWith(reference+' · '))) mismatches.push('runtime-reference-archive-link');
          }
        }
        const words=output.trim()?output.trim().split(/\\s+/u).length:0;
        if(Number(panel.querySelector('[data-output-word-count]').dataset.outputWordCount)!==words) mismatches.push('word-count');
        const aggregate=panel.querySelector('.model-run__condition-score').textContent.trim();
        if(aggregate!==(Number.isFinite(response?.score)?response.score.toFixed(1)+'/100':'—')) mismatches.push('aggregate-score');
        const judgments=response?.judgments || [];
        const pairedResponse=source.find(other=>other.settingId===response?.settingId && other.condition!==condition.id);
        const terminalFailure=candidate=>['error','unavailable'].includes(candidate?.status);
        const terminalUnscored=judgments.length===0 && (terminalFailure(response) || (Boolean(output) && terminalFailure(pairedResponse)));
        const expectedJudgingLabel=judgments.length?'Saved judge reviews':terminalUnscored?'Not scored':'Judgments pending';
        const renderedJudgingLabel=panel.querySelector('.model-run__judging-title')?.textContent;
        if(renderedJudgingLabel!==expectedJudgingLabel) mismatches.push('judgment-status-label:'+row.dataset.reportSettingId+':'+condition.id);
        if(terminalUnscored) terminalJudgmentLabels.push({caseId,settingId:response.settingId,configurationId:response.configurationId,condition:response.condition,status:response.status,reason:terminalFailure(response)?'terminal-generation-failure':'completed-answer-with-terminally-failed-counterpart',expectedLabel:expectedJudgingLabel,renderedLabel:renderedJudgingLabel});
        const completePanel=judgments.length===data.scoreBasis.judgeCount && judgments.every(judgment=>Number.isFinite(judgment.score));
        const exactScore=completePanel?judgments.reduce((sum,judgment)=>sum+judgment.score,0)/judgments.length:null;
        const cell=caseCells.find(cell=>cell.settingId===row.dataset.reportSettingId && cell.condition===condition.id);
        if(!close(cell.exactScore,exactScore) || !close(response.score,exactScore===null?null:round(exactScore))) mismatches.push('panel-mean-arithmetic');
        const judgeCoverage=panel.querySelector('[data-judge-coverage]').textContent;
        if(completePanel) {
          const spread=Math.max(...judgments.map(judgment=>judgment.score))-Math.min(...judgments.map(judgment=>judgment.score));
          if(!judgeCoverage.includes('Score disagreement: '+spread.toFixed(1)+' rubric points.')) mismatches.push('complete-panel-disagreement');
        } else if(!judgeCoverage.includes('A complete score requires the full panel.')) mismatches.push('incomplete-panel-disclosure');
        const rendered=[...panel.querySelectorAll('[data-judge-review]')];
        if(rendered.length!==judgments.length) mismatches.push('judge-count');
        rendered.forEach((element,index)=>{
          const judgment=judgments[index];
          if(Number.isFinite(judgment.score)) {
            const derived=data.scoreBasis.dimensions.reduce((sum,dimension)=>sum+judgment.dimensions[dimension.id].rating*dimension.weight/data.scoreBasis.ratingMaximum,0);
            if(!close(judgment.score,derived)) mismatches.push('judge-dimension-arithmetic');
          }
          if(element.querySelector('[data-judge-score]').textContent.trim()!==(Number.isFinite(judgment.score)?judgment.score.toFixed(1):'—')) mismatches.push('individual-judge-score');
          const dimensions=[...element.querySelectorAll('[data-dimension-id]')];
          if(dimensions.length!==10) mismatches.push('dimension-count');
          dimensions.forEach(dimension=>{
            const reading=judgment.dimensions?.[dimension.dataset.dimensionId];
            const cells=dimension.querySelectorAll('td');
            if(reading && (cells[0].textContent!==String(reading.rating) || cells[1].textContent!==(reading.reason || '—'))) mismatches.push('dimension-evidence');
          });
          if(element.querySelector('[data-judge-rationale]').textContent!==judgment.rationale) mismatches.push('judge-rationale');
          const resources=element.querySelector('[data-judge-resources]');
          if(Boolean(resources)!==Boolean(judgment.resources)) mismatches.push('judge-resource-presence');
          if(resources) {
            verifyFields(resources,{...judgment.resources,promptSha256:judgment.promptSha256},['scope','candidateCount','durationMs','promptSha256'],'data-judge-resource');
            verifyFields(resources,judgment.resources.usage,usageKeys,'data-resource-usage');
            if(judgment.resources.usage && !resources.textContent.includes('a saved zero does not prove the provider reported zero')) mismatches.push('judge-usage-normalization-disclosure');
            if(!resources.textContent.includes('count each judge and prompt SHA-256 once')) mismatches.push('judge-batch-deduplication-disclosure');
          }
        });
      }
      const pairs=data.settings.map(setting=>({settingId:setting.id,baseline:caseCells.find(cell=>cell.settingId===setting.id && cell.condition==='baseline')?.exactScore??null,skill:caseCells.find(cell=>cell.settingId===setting.id && cell.condition==='skill')?.exactScore??null}));
      const paired=pairs.filter(pair=>Number.isFinite(pair.baseline) && Number.isFinite(pair.skill));
      for(const row of rows) {
        const pair=pairs.find(pair=>pair.settingId===row.dataset.reportSettingId);
        const rank=Number.isFinite(pair.skill)?1+pairs.filter(other=>Number.isFinite(other.skill)&&other.skill>pair.skill).length:null;
        const delta=Number.isFinite(pair.baseline)&&Number.isFinite(pair.skill)?round(pair.skill-pair.baseline):null;
        const summary=row.querySelector('.model-preview__row');
        if(summary.querySelector('.model-preview__identity small').textContent!==(rank?'Storytelling skill rank #'+rank+' of '+data.settings.length:'Panel total not assessable')) mismatches.push('story-rank');
        if(summary.querySelector('.model-preview__delta').textContent!==signed(delta)+' pts' || summary.classList.contains('is-regression')!==(delta<0)) mismatches.push('story-paired-delta');
      }
      const means={baseline:paired.length?round(paired.reduce((sum,pair)=>sum+pair.baseline,0)/paired.length):null,skill:paired.length?round(paired.reduce((sum,pair)=>sum+pair.skill,0)/paired.length):null,delta:paired.length?round(paired.reduce((sum,pair)=>sum+pair.skill-pair.baseline,0)/paired.length):null};
      if(document.querySelector('.matched-result__condition--baseline strong').textContent!==format(means.baseline) || document.querySelector('.matched-result__condition--treatment strong').textContent!==format(means.skill) || document.querySelector('.matched-result__delta dd').textContent!==signed(means.delta)+' pts') mismatches.push('story-paired-field-means');
      return {caseId,selected:document.querySelector('[data-writing-case]').value,title:document.querySelector('[data-writing-case-title]').textContent,prompt:document.querySelector('[data-exact-question]').textContent.endsWith(story.prompt || data.benchmarks[0].prompt),rows:rows.length,sourceResponses:source.length,outputCount:source.filter(response=>response.outputText.length).length,runtimeCount:source.filter(response=>response.runtime).length,judgments:source.reduce((total,response)=>total+response.judgments.length,0),singleJudgeResponses:source.filter(response=>response.judgments.length===1).length,completePanelResponses:source.filter(response=>response.judgments.length===data.scoreBasis.judgeCount && response.judgments.every(judgment=>Number.isFinite(judgment.score))).length,scoredPairs:paired.length,regressionPairs:paired.filter(pair=>pair.skill<pair.baseline).length,tiedPairs:paired.filter(pair=>pair.skill===pair.baseline).length,failures,terminalJudgmentLabels,mismatches};
    })()`);
    check(`Story ${caseId}: exact case, question, answers, failure labels, word counts and judge evidence`, proof.selected === caseId && proof.title === writing.cases.find(story => story.id === caseId).title && proof.prompt && proof.rows === writing.settings.length && proof.mismatches.length === 0, JSON.stringify(proof));
    return proof;
  };
  const caseEvidence = [];
  for (const story of writing.cases) {
    if (await evaluate('document.querySelector("[data-writing-case]").value') !== story.id) {
      await evaluate(`(() => { const select=document.querySelector('[data-writing-case]'); select.value=${JSON.stringify(story.id)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(story.id)} && document.querySelector('[data-writing-case]')?.value===${JSON.stringify(story.id)} && location.hash.includes(${JSON.stringify(story.id)})`).catch(() => false), `Story ${story.id}`).catch(async error => {
        error.message += `: ${JSON.stringify(await evaluate('({hash:location.hash,rendered:document.querySelector("#report-page")?.dataset.activeWritingCase,selected:document.querySelector("[data-writing-case]")?.value,title:document.querySelector("[data-writing-case-title]")?.textContent})'))}`;
        throw error;
      });
    }
    caseEvidence.push(await verifyCase(story.id));
  }
  check('All ten rubric descriptions are present', await evaluate('document.querySelectorAll("[data-rubric-dimension]").length===10'));
  check('Every rubric description and published 1/5/10 anchor matches the source', await evaluate(`window.VASIR_WRITING.scoreBasis.dimensions.every(dimension=>{ const element=document.querySelector('[data-rubric-dimension="'+dimension.id+'"]');return element.querySelector('[data-rubric-description]').textContent===(dimension.description || '') && ['1','5','10'].every(rating=>element.querySelector('[data-rubric-anchor="'+rating+'"]')?.textContent===dimension.anchors?.[rating]); })`));
  check('Execution methodology and resource-accounting text match the source', await evaluate(`(() => { const method=window.VASIR_WRITING.methodology;const element=document.querySelector('[data-method-execution]');const expected=method.execution || {};return Boolean(element)===Boolean(method.execution || method.resourceAccounting) && (!method.resourceAccounting || element.querySelector('[data-resource-accounting]').textContent===method.resourceAccounting) && Object.entries(expected).every(([key,value])=>element.querySelector('[data-method-execution-field="'+key+'"]')?.textContent===(value===null?'Not reported':String(value))); })()`));
  check('Shared prompt files render once with exact source text', await evaluate(`(() => { const files=window.VASIR_WRITING_RESPONSES.promptFiles || []; const elements=[...document.querySelectorAll('[data-prompt-file]')]; return elements.length===files.length && elements.every(element=>element.querySelector('[data-prompt-file-content]').textContent===files.find(file=>file.id===element.dataset.promptFile).content); })()`));
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await noOverflow('Writing report');
  await capture('writing-report.png');
  await click('[data-report-section=method]');
  await noOverflow('Writing method');
  await capture('writing-method.png');
  const rubricDimensions = await evaluate('window.VASIR_WRITING.scoreBasis.dimensions.map(dimension=>dimension.id)');
  for (const dimensionId of rubricDimensions) {
    const selector = `[data-rubric-anchors="${dimensionId}"]`;
    await click(`${selector} > summary`);
    check(`Rubric ${dimensionId}: rating anchors open without overflow`, await evaluate(`document.querySelector(${JSON.stringify(selector)}).open && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`));
    if (dimensionId === rubricDimensions[0]) await capture('writing-rubric-anchors.png');
    await click(`${selector} > summary`);
  }
  if (await evaluate('!!document.querySelector("[data-method-execution]")')) {
    await click('[data-method-execution] > summary');
    await noOverflow('Writing execution methodology');
    await capture('writing-method-execution.png');
    await click('[data-method-execution] > summary');
  }
  const promptReference = await evaluate('!!document.querySelector("[data-open-prompt-file]")');
  if (promptReference) {
    await click('[data-open-prompt-file]');
    check('Input transcript opens the shared frozen prompt file', await evaluate('!!document.querySelector("[data-prompt-file][open]")'));
    await noOverflow('Shared Writing prompt');
  }
  const promptArchive = await evaluate(`window.VASIR_WRITING_RESPONSES.promptFiles.map(file=>({id:file.id,title:file.title,characters:file.content.length}))`);
  for (const file of promptArchive) {
    const selector = `[data-prompt-file="${file.id}"]`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).open=false`);
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: opens its exact archived content`, await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); const source=window.VASIR_WRITING_RESPONSES.promptFiles.find(file=>file.id===${JSON.stringify(file.id)}); return element.open && element.querySelector('[data-prompt-file-content]').textContent===source.content && document.documentElement.scrollWidth<=document.documentElement.clientWidth+1; })()`));
    if (file.characters === Math.max(...promptArchive.map(item=>item.characters))) await capture('writing-reference.png');
    await click(`${selector} > summary`);
    check(`Frozen file ${file.id}: closes after inspection`, await evaluate(`!document.querySelector(${JSON.stringify(selector)}).open`));
  }
  const savedAnswer = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses; const answer=responses.find(response=>response.outputText.length && Number.isFinite(response.score)) || responses.find(response=>response.outputText.length && response.judgments.length) || responses.find(response=>response.outputText.length); return answer ? {caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,judgments:answer.judgments.length} : null; })()`);
  if (savedAnswer) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(savedAnswer.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedAnswer.caseId)}`), 'Saved answer story');
    await evaluate(`(() => { const row=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"]');row.querySelector('.model-run').open=true;const condition=row.querySelector('[data-condition="${savedAnswer.condition}"]');condition.scrollIntoView({block:'start',behavior:'instant'}); })()`);
    await noOverflow('Saved Writing answer');
    await capture('writing-answer.png');
    if (savedAnswer.judgments) {
      await evaluate(`(() => { const judge=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"] .model-run__judging');judge.open=true;judge.scrollIntoView({block:'start',behavior:'instant'}); })()`);
      await noOverflow('Writing judge dimensions');
      check('Sparse Writing judgments remain visibly separate from aggregate scores', await evaluate(`(() => { const panel=document.querySelector('[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"]');const response=window.VASIR_WRITING_RESPONSES.responses.find(response=>response.caseId===${JSON.stringify(savedAnswer.caseId)} && response.settingId===${JSON.stringify(savedAnswer.settingId)} && response.condition===${JSON.stringify(savedAnswer.condition)});return response.judgments.length===window.VASIR_WRITING.scoreBasis.judgeCount || (panel.querySelector('.model-run__condition-score').textContent.trim()==='—' && panel.querySelector('.model-run__judging-meta').textContent.includes('Panel incomplete') && panel.querySelector('[data-judge-coverage]').textContent.includes('A complete score requires the full panel.'));})()`));
      await capture('writing-judgments.png');
      const judgeResources = `[data-report-setting-id="${savedAnswer.settingId}"] [data-condition="${savedAnswer.condition}"] [data-judge-resources]`;
      if (await evaluate(`!!document.querySelector(${JSON.stringify(judgeResources)})`)) {
        await click(`${judgeResources} > summary`);
        await noOverflow('Writing shared judge-batch resources');
        await capture('writing-judge-resources.png');
      }
    }
  }
  const savedExecution = await evaluate(`(() => { const responses=window.VASIR_WRITING_RESPONSES.responses;const answer=responses.find(response=>response.runtime?.observedCollaborationEvents>0 && response.runtime.referenceFilesRead?.length) || responses.find(response=>response.runtime);return answer ? {caseId:answer.caseId,settingId:answer.settingId,condition:answer.condition,runtime:answer.runtime} : null; })()`);
  if (savedExecution) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(savedExecution.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(savedExecution.caseId)}`), 'Saved execution story');
    const selector = `[data-report-setting-id="${savedExecution.settingId}"] [data-condition="${savedExecution.condition}"] [data-writing-execution]`;
    await evaluate(`document.querySelector('[data-report-setting-id="${savedExecution.settingId}"] .model-run').open=true`);
    await click(`${selector} > summary`);
    check('Recorded execution opens with literal labels and no inferred agent count', await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)});return element.open && element.textContent.includes('do not establish the number of underlying agents'); })()`));
    await noOverflow('Writing recorded execution');
    await capture('writing-execution.png');
    const reference = await evaluate(`document.querySelector(${JSON.stringify(`${selector} [data-open-prompt-file]`)})?.dataset.openPromptFile`);
    if (reference) {
      await click(`${selector} [data-open-prompt-file]`);
      check('Recorded reference-file read opens its shared archive', await evaluate(`document.querySelector('[data-prompt-file="${reference}"]').open`));
      await noOverflow('Writing recorded reference');
    }
  }

  // Supplementary evidence only: keep the canonical 13 presentation captures stable.
  for (const failure of caseEvidence.flatMap(story => story.failures)) {
    await evaluate(`(() => { const select=document.querySelector('[data-writing-case]');select.value=${JSON.stringify(failure.caseId)};select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(() => evaluate(`document.querySelector('#report-page')?.dataset.activeWritingCase===${JSON.stringify(failure.caseId)}`), 'Failed answer story');
    const states = [{ condition:failure.condition, view:'failed-response' }];
    if (failure.pairedResponse?.hasOutput) states.push({ condition:failure.pairedResponse.condition, view:'retained-paired-response' });
    for (const state of states) {
      const selector = `[data-report-setting-id="${failure.settingId}"] [data-condition="${state.condition}"]`;
      await evaluate(`(() => {document.querySelector('[data-report-setting-id="${failure.settingId}"] .model-run').open=true;document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'});})()`);
      await noOverflow(`Writing ${failure.configurationId} ${failure.caseId} ${state.view}`);
      const name = `writing-failure-${failure.caseId}-${failure.settingId}-${state.condition}-${state.view}.png`.replace(/[^a-zA-Z0-9._-]/g, '-');
      await capture(name, failureScreenshots, {caseId:failure.caseId,settingId:failure.settingId,configurationId:failure.configurationId,condition:state.condition,view:state.view});
    }
  }

  const loadedFiles = (await Promise.all(loadedFilePromises)).filter(Boolean);
  check('Writing lazy data bytes stay identical between explorer and report', new Set(loadedFiles.filter(file=>new URL(file.url).pathname.endsWith('/writing-data.js')).map(file=>file.sha256)).size===1);
  check('No browser runtime or network failures', errors.length === 0, JSON.stringify(errors));
  check('No failed HTTP responses', [...responses.values()].every(response => response.status < 400), JSON.stringify([...responses.values()].filter(response => response.status >= 400).map(response => ({url:response.url,status:response.status}))));
  const scoredBranchCoverage = {required:requireScored,completeSettings:scoredCollection.completeSettings,unscoredSettings:scoredCollection.unscoredSettings,tiedRankEntries:scoredCollection.tiedRankEntries,regressionSettings:scoredCollection.regressionSettings,completePanels:caseEvidence.reduce((sum,story)=>sum+story.completePanelResponses,0),singleJudgeResponses:caseEvidence.reduce((sum,story)=>sum+story.singleJudgeResponses,0),scoredPairs:caseEvidence.reduce((sum,story)=>sum+story.scoredPairs,0),regressionPairs:caseEvidence.reduce((sum,story)=>sum+story.regressionPairs,0),tiedPairs:caseEvidence.reduce((sum,story)=>sum+story.tiedPairs,0),efficiency:efficiencyEvidence};
  if (requireScored) check('Scored QA exercised complete panels and populated latency/token frontiers', scoredBranchCoverage.completePanels > 0 && efficiencyEvidence.every(proof => proof.eligiblePoints > 0 && proof.frontierPoints > 0), JSON.stringify(scoredBranchCoverage));
  const receipt = { kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'passed',url:baseUrl.href,width,height,harnessSha256,overallSha256,coverage,checks,caseEvidence,scoredBranchCoverage,progressEvidence,promptArchive,savedAnswer,savedExecution,loadedFiles,screenshots,failureScreenshots,errors,completedAt:new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify(receipt,null,2)}\n`);
  process.stdout.write(`${JSON.stringify({status:'passed',checks:checks.length,cases:caseEvidence.length,width,height,receipt:path.join(output,'writing-browsercheck.json')})}\n`);
} catch (error) {
  fs.writeFileSync(path.join(output, 'writing-browsercheck.json'), `${JSON.stringify({kind:'vasirbenchmark-writing-browsercheck',schemaVersion:1,status:'failed',url:baseUrl.href,width,height,harnessSha256,checks,screenshots,failureScreenshots,errors,error:error.stack},null,2)}\n`);
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(2000)]);
  if (chrome.exitCode === null) chrome.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
}
